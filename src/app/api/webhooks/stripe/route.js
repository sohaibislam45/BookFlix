import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import { PAYMENT_STATUS, FINE_STATUS, NOTIFICATION_TYPES } from '@/lib/constants';
import { notifyUser } from '@/lib/notifications';
import mongoose from 'mongoose';

// Configure runtime for Node.js (required for raw body access)
export const runtime = 'nodejs';

// Disable body parsing by using dynamic route config
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Get raw body as text for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentIntentFailed(failedPayment);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleInvoicePaymentSucceeded(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handleInvoicePaymentFailed(failedInvoice);
        break;

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handler functions for different event types
async function handleCheckoutSessionCompleted(session) {
  const metadata = session.metadata;
  const paymentId = metadata?.paymentId;
  
  // Handle fine payment
  if (paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        console.error(`Payment not found: ${paymentId}`);
        return;
      }

      // Update payment status
      if (payment.status !== PAYMENT_STATUS.COMPLETED) {
        payment.status = PAYMENT_STATUS.COMPLETED;
        payment.completedDate = new Date();
        payment.stripePaymentIntentId = session.payment_intent || session.id;
        await payment.save();

        // Update fine status to paid
        const fine = await Fine.findById(payment.fine)
          .populate({
            path: 'borrowing',
            populate: { path: 'book', select: 'title author' },
          });
        if (fine && fine.status === FINE_STATUS.PENDING) {
          fine.status = FINE_STATUS.PAID;
          fine.paidDate = new Date();
          await fine.save();

          // Send payment received notification
          const bookTitle = fine.borrowing?.book?.title || 'Unknown Book';
          notifyUser(
            payment.member._id || payment.member,
            NOTIFICATION_TYPES.PAYMENT_RECEIVED,
            'Payment Received',
            `Thank you! We've received your payment of $${payment.amount.toFixed(2)}. Your fine has been paid in full.`,
            {
              payment: payment._id,
              fine: fine._id,
              data: {
                amount: payment.amount,
                fineAmount: fine.amount,
                bookTitle,
              },
            },
            true // Send email
          ).catch(err => console.error('Error sending payment notification:', err));
        }

      }
    } catch (error) {
      console.error('Error handling checkout session completed for fine payment:', error);
      throw error;
    }
    return;
  }
  
  // Handle subscription checkout sessions
  const userId = metadata?.userId;
  const plan = metadata?.plan;
  
  if (userId && plan && session.subscription) {
    try {
      console.log(`[Webhook] Processing subscription checkout for userId: ${userId}, plan: ${plan}, subscriptionId: ${session.subscription}`);
      await handleSubscriptionCheckoutCompleted(userId, session.subscription, plan);
      console.log(`[Webhook] Successfully processed subscription checkout for userId: ${userId}`);
    } catch (error) {
      console.error('Error handling subscription checkout session completed:', error);
      throw error;
    }
  } else {
    // Log if subscription checkout session is missing required data
    if (session.mode === 'subscription') {
      console.warn('[Webhook] Subscription checkout session missing required data:', {
        hasUserId: !!userId,
        hasPlan: !!plan,
        hasSubscription: !!session.subscription,
        metadata: metadata
      });
    }
  }
}

async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer;
    const status = subscription.status;
    const plan = subscription.items?.data[0]?.price?.recurring?.interval || 'monthly';
    
    // Find user by Stripe customer ID
    const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
    
    if (!user) {
      console.error(`User not found for customer ID: ${customerId}`);
      return;
    }

    // Update or create subscription record
    let subscriptionRecord = await Subscription.findOne({ 
      stripeSubscriptionId: subscription.id 
    });

    if (!subscriptionRecord) {
      subscriptionRecord = new Subscription({
        user: user._id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        plan: plan === 'year' ? 'yearly' : 'monthly',
        status: status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      });
    } else {
      subscriptionRecord.status = status;
      subscriptionRecord.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      subscriptionRecord.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      subscriptionRecord.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      subscriptionRecord.canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null;
    }

    await subscriptionRecord.save();

    // Update user subscription
    if (!user.subscription) {
      user.subscription = {};
    }
    
    user.subscription.type = plan === 'year' ? 'yearly' : 'monthly';
    user.subscription.status = (status === 'active' || status === 'trialing') ? 'active' : 'cancelled';
    user.subscription.startDate = subscriptionRecord.currentPeriodStart;
    user.subscription.endDate = subscriptionRecord.currentPeriodEnd;
    user.subscription.stripeSubscriptionId = subscription.id;
    user.subscription.stripeCustomerId = customerId;
    
    await user.save();
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
    
    if (!user) {
      console.error(`User not found for customer ID: ${customerId}`);
      return;
    }

    // Update subscription record
    const subscriptionRecord = await Subscription.findOne({ 
      stripeSubscriptionId: subscription.id 
    });

    if (subscriptionRecord) {
      subscriptionRecord.status = 'canceled';
      subscriptionRecord.canceledAt = new Date();
      await subscriptionRecord.save();
    }

    // Update user subscription to free
    if (user.subscription) {
      user.subscription.type = 'free';
      user.subscription.status = 'expired';
      user.subscription.endDate = new Date();
      await user.save();
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  const metadata = paymentIntent.metadata;
  const paymentId = metadata?.paymentId;
  
  if (!paymentId) {
    return;
  }

  try {
    // Find the payment record
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return;
    }

    // Update payment status
    if (payment.status !== PAYMENT_STATUS.COMPLETED) {
      payment.status = PAYMENT_STATUS.COMPLETED;
      payment.completedDate = new Date();
      await payment.save();

      // Update fine status to paid
      const fine = await Fine.findById(payment.fine)
        .populate({
          path: 'borrowing',
          populate: { path: 'book', select: 'title author' },
        });
      if (fine && fine.status === FINE_STATUS.PENDING) {
        fine.status = FINE_STATUS.PAID;
        fine.paidDate = new Date();
        await fine.save();

        // Send payment received notification
        const bookTitle = fine.borrowing?.book?.title || 'Unknown Book';
        notifyUser(
          payment.member._id || payment.member,
          NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          'Payment Received',
          `Thank you! We've received your payment of $${payment.amount.toFixed(2)}. Your fine has been paid in full.`,
          {
            payment: payment._id,
            fine: fine._id,
            data: {
              amount: payment.amount,
              fineAmount: fine.amount,
              bookTitle,
            },
          },
          true // Send email
        ).catch(err => console.error('Error sending payment notification:', err));
      }
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  const metadata = paymentIntent.metadata;
  const paymentId = metadata?.paymentId;
  
  if (!paymentId) {
    return;
  }

  try {
    // Find the payment record
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return;
    }

    // Update payment status to failed
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    await payment.save();
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) {
      return;
    }

    // Get subscription from Stripe to update our records
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(stripeSubscription);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) {
      return;
    }

    // Get subscription from Stripe to update status
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(stripeSubscription);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

// Handle subscription checkout session completed
async function handleSubscriptionCheckoutCompleted(userId, subscriptionId, plan) {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`[Webhook] Invalid user ID: ${userId}`);
      return;
    }

    // Normalize plan value
    const normalizedPlan = plan === 'yearly' ? 'yearly' : 'monthly';
    console.log(`[Webhook] Processing subscription for user ${userId}, plan: ${normalizedPlan}, subscriptionId: ${subscriptionId}`);

    // Get subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[Webhook] User not found: ${userId}`);
      return;
    }

    const customerId = stripeSubscription.customer;
    const status = stripeSubscription.status;

    // Create or update subscription record
    let subscriptionRecord = await Subscription.findOne({ 
      stripeSubscriptionId: subscriptionId 
    });

    if (!subscriptionRecord) {
      subscriptionRecord = new Subscription({
        user: user._id,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        plan: normalizedPlan,
        status: status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      });
      console.log(`[Webhook] Creating new subscription record for user ${userId}`);
    } else {
      subscriptionRecord.status = status;
      subscriptionRecord.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscriptionRecord.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscriptionRecord.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false;
      console.log(`[Webhook] Updating existing subscription record for user ${userId}`);
    }

    await subscriptionRecord.save();
    console.log(`[Webhook] Subscription record saved for user ${userId}`);

    // Update user subscription
    if (!user.subscription) {
      user.subscription = {};
    }
    
    user.subscription.type = normalizedPlan;
    user.subscription.status = (status === 'active' || status === 'trialing') ? 'active' : 'cancelled';
    user.subscription.startDate = subscriptionRecord.currentPeriodStart;
    user.subscription.endDate = subscriptionRecord.currentPeriodEnd;
    user.subscription.stripeSubscriptionId = subscriptionId;
    user.subscription.stripeCustomerId = customerId;
    
    await user.save();
    console.log(`[Webhook] User subscription updated successfully for user ${userId}: type=${normalizedPlan}, status=${user.subscription.status}`);
  } catch (error) {
    console.error('[Webhook] Error handling subscription checkout completed:', error);
    throw error;
  }
}

