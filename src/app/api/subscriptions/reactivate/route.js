import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import { stripe } from '@/lib/stripe';
import mongoose from 'mongoose';

// POST - Reactivate subscription
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

    // Get subscription
    const subscription = await Subscription.findOne({ user: userId });
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Reactivate subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    // Update subscription in database
    subscription.cancelAtPeriodEnd = false;
    subscription.status = stripeSubscription.status;
    await subscription.save();

    // Update user subscription
    if (user.subscription) {
      user.subscription.status = 'active';
      await user.save();
    }

    return NextResponse.json({
      message: 'Subscription reactivated successfully',
      subscription: {
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription', details: error.message },
      { status: 500 }
    );
  }
}

