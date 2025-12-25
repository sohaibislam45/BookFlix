import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { stripe } from '@/lib/stripe';
import mongoose from 'mongoose';

// POST - Create Stripe Checkout session for subscription
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, plan } = body;

    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, plan' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly"' },
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

    // Check if user already has an active subscription
    if (user.subscription?.status === 'active' && (user.subscription?.type === 'monthly' || user.subscription?.type === 'yearly')) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Get Stripe Price ID from environment variables
    const priceId = plan === 'monthly' 
      ? process.env.STRIPE_MONTHLY_PRICE_ID 
      : process.env.STRIPE_YEARLY_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price ID not configured for ${plan} plan` },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.subscription?.stripeCustomerId;
    
    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          firebaseUid: user.firebaseUid,
        },
      });
      customerId = customer.id;

      // Save customer ID to user
      if (!user.subscription) {
        user.subscription = {};
      }
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    // Get the base URL from request
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe Checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/member/billing?subscription_success=true&plan=${plan}`,
      cancel_url: `${origin}/member/billing?subscription_cancelled=true`,
      metadata: {
        userId: user._id.toString(),
        plan: plan,
        firebaseUid: user.firebaseUid,
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          plan: plan,
          firebaseUid: user.firebaseUid,
        },
      },
    });

    return NextResponse.json({
      message: 'Checkout session created successfully',
      sessionId: session.id,
      url: session.url,
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating subscription checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}

