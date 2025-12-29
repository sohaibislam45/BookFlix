import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import Payment from '@/models/Payment';
import { stripe } from '@/lib/stripe';
import { PAYMENT_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// POST - Manually sync subscription from Stripe (fallback if webhook fails)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has Stripe customer ID
    let customerId = user.subscription?.stripeCustomerId;
    
    // If no customer ID, try to find it by email in Stripe
    if (!customerId) {
      console.log(`[Sync] No customer ID found for user ${userId}, searching Stripe by email: ${user.email}`);
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          console.log(`[Sync] Found customer ID in Stripe: ${customerId}`);
          
          // Save customer ID to user
          if (!user.subscription) {
            user.subscription = {};
          }
          user.subscription.stripeCustomerId = customerId;
          await user.save();
          console.log(`[Sync] Saved customer ID to user ${userId}`);
        } else {
          console.log(`[Sync] No Stripe customer found for email: ${user.email}`);
          return NextResponse.json(
            { 
              error: 'User does not have a Stripe customer ID and no customer found in Stripe',
              message: 'Please complete a subscription checkout first'
            },
            { status: 400 }
          );
        }
      } catch (stripeError) {
        console.error('[Sync] Error searching Stripe for customer:', stripeError);
        return NextResponse.json(
          { error: 'Failed to search Stripe for customer', details: stripeError.message },
          { status: 500 }
        );
      }
    }

    // Get all active subscriptions from Stripe for this customer
    let stripeSubscriptions;
    try {
      stripeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 10,
      });
      console.log(`[Sync] Found ${stripeSubscriptions.data.length} subscriptions for customer ${customerId}`);
    } catch (stripeError) {
      console.error(`[Sync] Error fetching subscriptions from Stripe:`, stripeError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions from Stripe', details: stripeError.message },
        { status: 500 }
      );
    }

    if (stripeSubscriptions.data.length === 0) {
      // No subscriptions found, user is on free plan
      if (user.subscription?.type !== 'free') {
        user.subscription = {
          type: 'free',
          status: 'active',
          startDate: null,
          endDate: null,
          stripeSubscriptionId: null,
          stripeCustomerId: customerId,
        };
        await user.save();
        console.log(`[Sync] Updated user ${userId} to free plan`);
      }
      
      return NextResponse.json({
        message: 'No active subscriptions found',
        subscription: {
          type: 'free',
          status: 'active',
        },
      }, { status: 200 });
    }

    // Get the most recent active subscription
    const activeSubscription = stripeSubscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    ) || stripeSubscriptions.data[0];

    if (!activeSubscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    console.log(`[Sync] Processing subscription ${activeSubscription.id} with status ${activeSubscription.status}`);

    // Determine plan type from subscription
    const interval = activeSubscription.items?.data[0]?.price?.recurring?.interval;
    const plan = interval === 'year' ? 'yearly' : 'monthly';

    // Create or update subscription record
    let subscriptionRecord = await Subscription.findOne({
      stripeSubscriptionId: activeSubscription.id,
    });

    if (!subscriptionRecord) {
      subscriptionRecord = new Subscription({
        user: user._id,
        stripeSubscriptionId: activeSubscription.id,
        stripeCustomerId: customerId,
        plan: plan,
        status: activeSubscription.status,
        currentPeriodStart: new Date(activeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
        trialStart: activeSubscription.trial_start ? new Date(activeSubscription.trial_start * 1000) : null,
        trialEnd: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000) : null,
      });
      console.log(`[Sync] Creating new subscription record for user ${userId}`);
    } else {
      subscriptionRecord.status = activeSubscription.status;
      subscriptionRecord.currentPeriodStart = new Date(activeSubscription.current_period_start * 1000);
      subscriptionRecord.currentPeriodEnd = new Date(activeSubscription.current_period_end * 1000);
      subscriptionRecord.cancelAtPeriodEnd = activeSubscription.cancel_at_period_end || false;
      console.log(`[Sync] Updating existing subscription record for user ${userId}`);
    }

    await subscriptionRecord.save();

    // Update user subscription
    if (!user.subscription) {
      user.subscription = {};
    }

    user.subscription.type = plan;
    user.subscription.status = (activeSubscription.status === 'active' || activeSubscription.status === 'trialing') ? 'active' : 'cancelled';
    user.subscription.startDate = subscriptionRecord.currentPeriodStart;
    user.subscription.endDate = subscriptionRecord.currentPeriodEnd;
    user.subscription.stripeSubscriptionId = activeSubscription.id;
    user.subscription.stripeCustomerId = customerId;

    await user.save();
    console.log(`[Sync] Updated user ${userId} subscription: type=${plan}, status=${user.subscription.status}`);

    // Check if payment record exists for this subscription
    // We need to check metadata for subscriptionId since that's how webhook stores it
    let existingPayment = null;
    try {
      // First, get all payments for this user
      const allUserPayments = await Payment.find({ member: userId }).lean();
      console.log(`[Sync] Checking ${allUserPayments.length} existing payments for user ${userId}`);
      
      // Check each payment's metadata for the subscription ID
      for (const pay of allUserPayments) {
        if (pay.metadata) {
          let metadataObj = pay.metadata;
          
          // Convert Map to object if needed
          if (metadataObj instanceof Map) {
            metadataObj = Object.fromEntries(metadataObj);
          } else if (metadataObj.constructor && metadataObj.constructor.name === 'Object') {
            // Already an object
          } else if (metadataObj.get && typeof metadataObj.get === 'function') {
            // Mongoose Map-like object
            const tempObj = {};
            if (metadataObj.keys && typeof metadataObj.keys === 'function') {
              for (const key of metadataObj.keys()) {
                tempObj[key] = metadataObj.get(key);
              }
            }
            metadataObj = tempObj;
          }
          
          // Check if this payment is for our subscription
          if (metadataObj.subscriptionId === activeSubscription.id) {
            existingPayment = pay;
            console.log(`[Sync] Found existing payment ${pay._id} for subscription ${activeSubscription.id}`);
            break;
          }
        }
        
        // Also check if payment intent or customer ID matches (fallback)
        if (!existingPayment && (
          pay.stripePaymentIntentId === activeSubscription.id ||
          pay.stripeCustomerId === customerId
        )) {
          // Only use this as fallback if it's a subscription payment (no fine)
          if (!pay.fine) {
            existingPayment = pay;
            console.log(`[Sync] Found existing payment ${pay._id} by payment intent/customer ID match`);
            break;
          }
        }
      }
      
      if (!existingPayment) {
        console.log(`[Sync] No existing payment found for subscription ${activeSubscription.id}`);
      }
    } catch (queryError) {
      console.error('[Sync] Error querying for existing payment:', queryError);
    }

    // Always create payment if it doesn't exist (regardless of subscription status)
    if (!existingPayment) {
      console.log(`[Sync] No payment found for subscription ${activeSubscription.id}, creating payment record...`);
      try {
        const latestInvoice = await stripe.invoices.list({
          subscription: activeSubscription.id,
          limit: 1,
        });

        let amount = 0;
        let paymentIntentId = activeSubscription.id;
        let completedDate = new Date();

        if (latestInvoice.data.length > 0) {
          const invoice = latestInvoice.data[0];
          amount = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
          paymentIntentId = invoice.payment_intent || activeSubscription.id;
          completedDate = new Date(invoice.created * 1000);
          console.log(`[Sync] Found invoice: ${invoice.id}, amount: ${amount}`);
        } else {
          // Use estimated amount if no invoice found
          amount = plan === 'yearly' ? 2000 : 200;
          console.log(`[Sync] No invoice found, using estimated amount: ${amount}`);
        }

        // Create metadata Map for subscription payment
        const metadataMap = new Map();
        metadataMap.set('subscriptionType', plan);
        metadataMap.set('subscriptionId', activeSubscription.id);
        if (latestInvoice.data.length > 0) {
          metadataMap.set('invoiceId', latestInvoice.data[0].id);
        }
        
        const payment = new Payment({
          member: userId,
          fine: null,
          amount: amount,
          status: PAYMENT_STATUS.COMPLETED,
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: customerId,
          completedDate: completedDate,
          metadata: metadataMap,
        });
        await payment.save();
        console.log(`[Sync] Successfully created payment record: ${payment._id}, amount: ${amount}, plan: ${plan}`);
      } catch (paymentError) {
        console.error('[Sync] Error creating payment record:', paymentError);
        // Don't fail the sync if payment record creation fails
      }
    } else {
      console.log(`[Sync] Payment record already exists: ${existingPayment._id || 'found'}`);
    }

    return NextResponse.json({
      message: 'Subscription synced successfully',
      subscription: {
        type: plan,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
        stripeSubscriptionId: activeSubscription.id,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscription', details: error.message },
      { status: 500 }
    );
  }
}

