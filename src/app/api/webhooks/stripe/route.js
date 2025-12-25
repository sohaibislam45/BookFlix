import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import { PAYMENT_STATUS, FINE_STATUS } from '@/lib/constants';

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
        console.log(`Unhandled event type: ${event.type}`);
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
  console.log('Checkout session completed:', session.id);
  
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
        const fine = await Fine.findById(payment.fine);
        if (fine && fine.status === FINE_STATUS.PENDING) {
          fine.status = FINE_STATUS.PAID;
          fine.paidDate = new Date();
          await fine.save();
        }

        console.log(`Fine payment completed via checkout: Payment ${paymentId}, Fine ${payment.fine}`);
      }
    } catch (error) {
      console.error('Error handling checkout session completed for fine payment:', error);
      throw error;
    }
    return;
  }
  
  // TODO: Handle subscription checkout sessions here (Phase 6)
  // const userId = metadata?.userId;
  // if (userId) {
  //   await updateUserSubscription(userId, session.subscription);
  // }
}

async function handleSubscriptionUpdate(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  // TODO: Update user subscription in database
  // Example:
  // const customerId = subscription.customer;
  // const status = subscription.status;
  // await updateUserSubscriptionStatus(customerId, status);
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  // TODO: Remove premium status from user
  // Example:
  // const customerId = subscription.customer;
  // await removeUserPremiumStatus(customerId);
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  const metadata = paymentIntent.metadata;
  const paymentId = metadata?.paymentId;
  
  if (!paymentId) {
    console.log('No paymentId in metadata, skipping fine payment handling');
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
      const fine = await Fine.findById(payment.fine);
      if (fine && fine.status === FINE_STATUS.PENDING) {
        fine.status = FINE_STATUS.PAID;
        fine.paidDate = new Date();
        await fine.save();
      }

      console.log(`Fine payment completed: Payment ${paymentId}, Fine ${payment.fine}`);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  const metadata = paymentIntent.metadata;
  const paymentId = metadata?.paymentId;
  
  if (!paymentId) {
    console.log('No paymentId in metadata, skipping fine payment failure handling');
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

    console.log(`Fine payment failed: Payment ${paymentId}`);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // TODO: Handle successful invoice payment (e.g., renew subscription)
  // Example:
  // const subscriptionId = invoice.subscription;
  // await renewUserSubscription(subscriptionId);
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  // TODO: Handle failed invoice payment
  // Example:
  // const subscriptionId = invoice.subscription;
  // await handleSubscriptionPaymentFailure(subscriptionId);
}

