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
    // Determine subscription type - prioritize Subscription collection, then User model
    const subscriptionType = subscription?.plan || user.subscription?.type || 'free';
    
    // Determine status - if type is free, status should be 'active' (free is always active)
    // Otherwise, use the actual status from subscription or user model
    let subscriptionStatus;
    if (subscriptionType === 'free') {
      subscriptionStatus = 'active'; // Free plan is always active
    } else {
      // For premium plans, check actual status
      subscriptionStatus = subscription?.status || user.subscription?.status;
      // If no status found for premium plan, default to inactive
      if (!subscriptionStatus) {
        subscriptionStatus = 'inactive';
      }
    }
    
    const subscriptionInfo = {
      type: subscriptionType,
      status: subscriptionStatus,
      startDate: user.subscription?.startDate || subscription?.currentPeriodStart || null,
      endDate: user.subscription?.endDate || subscription?.currentPeriodEnd || null,
      stripeSubscriptionId: user.subscription?.stripeSubscriptionId || subscription?.stripeSubscriptionId || null,
      stripeCustomerId: user.subscription?.stripeCustomerId || subscription?.stripeCustomerId || null,
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
    
    console.log(`[Subscription API] Returning subscription info for user ${userId}:`, {
      type: subscriptionInfo.type,
      status: subscriptionInfo.status,
      hasSubscriptionRecord: !!subscription,
      userSubscriptionType: user.subscription?.type,
      userSubscriptionStatus: user.subscription?.status,
    });

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

