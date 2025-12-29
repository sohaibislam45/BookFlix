import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import { stripe } from '@/lib/stripe';
import { PAYMENT_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// POST - Manually create payment for subscription (for testing/debugging)
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

    // Check if user has subscription
    const subscriptionRecord = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscriptionRecord) {
      return NextResponse.json(
        { error: 'No active subscription found for user' },
        { status: 404 }
      );
    }

    // Check if payment already exists
    const existingPayments = await Payment.find({ member: userId }).lean();
    let hasPaymentForSubscription = false;

    for (const pay of existingPayments) {
      if (pay.metadata) {
        let metadataObj = pay.metadata;
        if (metadataObj instanceof Map) {
          metadataObj = Object.fromEntries(metadataObj);
        } else if (metadataObj.get && typeof metadataObj.get === 'function') {
          const tempObj = {};
          if (metadataObj.keys && typeof metadataObj.keys === 'function') {
            for (const key of metadataObj.keys()) {
              tempObj[key] = metadataObj.get(key);
            }
          }
          metadataObj = tempObj;
        }
        
        if (metadataObj.subscriptionId === subscriptionRecord.stripeSubscriptionId) {
          hasPaymentForSubscription = true;
          break;
        }
      }
    }

    if (hasPaymentForSubscription) {
      return NextResponse.json({
        message: 'Payment already exists for this subscription',
        existingPayments: existingPayments.length
      }, { status: 200 });
    }

    // Get invoice from Stripe
    let amount = 0;
    let paymentIntentId = subscriptionRecord.stripeSubscriptionId;
    let completedDate = new Date();
    let invoiceId = null;

    try {
      const invoices = await stripe.invoices.list({
        subscription: subscriptionRecord.stripeSubscriptionId,
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const invoice = invoices.data[0];
        amount = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
        paymentIntentId = invoice.payment_intent || subscriptionRecord.stripeSubscriptionId;
        completedDate = new Date(invoice.created * 1000);
        invoiceId = invoice.id;
        console.log(`[Create Payment] Found invoice: ${invoice.id}, amount: ${amount}`);
      } else {
        // Use estimated amount
        amount = subscriptionRecord.plan === 'yearly' ? 2000 : 200;
        console.log(`[Create Payment] No invoice found, using estimated amount: ${amount}`);
      }
    } catch (stripeError) {
      console.error('[Create Payment] Error fetching invoice:', stripeError);
      amount = subscriptionRecord.plan === 'yearly' ? 2000 : 200;
    }

    // Create payment
    const metadataMap = new Map();
    metadataMap.set('subscriptionType', subscriptionRecord.plan);
    metadataMap.set('subscriptionId', subscriptionRecord.stripeSubscriptionId);
    if (invoiceId) {
      metadataMap.set('invoiceId', invoiceId);
    }

    const payment = new Payment({
      member: userId,
      fine: null,
      amount: amount,
      status: PAYMENT_STATUS.COMPLETED,
      paymentMethod: 'stripe',
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId: subscriptionRecord.stripeCustomerId,
      completedDate: completedDate,
      metadata: metadataMap,
    });

    await payment.save();

    return NextResponse.json({
      message: 'Payment created successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        subscriptionId: subscriptionRecord.stripeSubscriptionId,
        plan: subscriptionRecord.plan,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    );
  }
}

