import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import mongoose from 'mongoose';

// GET - Get user's subscription
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get user with subscription
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get subscription from Subscription collection
    const subscription = await Subscription.findOne({ user: userId });

    // Return subscription info
    const subscriptionInfo = {
      type: user.subscription?.type || 'free',
      status: user.subscription?.status || 'active',
      startDate: user.subscription?.startDate || null,
      endDate: user.subscription?.endDate || null,
      stripeSubscriptionId: user.subscription?.stripeSubscriptionId || null,
      stripeCustomerId: user.subscription?.stripeCustomerId || null,
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        isActive: subscription.isActive,
        isExpired: subscription.isExpired,
      } : null,
    };

    return NextResponse.json({
      subscription: subscriptionInfo,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription', details: error.message },
      { status: 500 }
    );
  }
}

