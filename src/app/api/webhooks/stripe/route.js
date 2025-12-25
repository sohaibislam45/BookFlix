import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/db';

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
    await dbConnect();

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
  
  // TODO: Update user subscription status based on session metadata
  // Example:
  // const userId = session.metadata?.userId;
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
  
  // TODO: Handle successful payment (e.g., update fine payment status)
  // Example:
  // const metadata = paymentIntent.metadata;
  // if (metadata.fineId) {
  //   await updateFinePaymentStatus(metadata.fineId, 'paid');
  // }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  // TODO: Handle failed payment
  // Example:
  // const metadata = paymentIntent.metadata;
  // if (metadata.fineId) {
  //   await logPaymentFailure(metadata.fineId);
  // }
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

