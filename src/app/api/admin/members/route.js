import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { USER_ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const tier = searchParams.get('tier') || 'all';

    const skip = (page - 1) * limit;

    // Build query
    const query = {
      role: USER_ROLES.MEMBER,
    };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'suspended') {
        query.isActive = false;
        // You might want to add a suspended field to the User model
      }
    }

    // Tier filter
    if (tier !== 'all') {
      if (tier === 'premium') {
        query['subscription.type'] = { $in: ['monthly', 'yearly'] };
        query['subscription.status'] = 'active';
      } else if (tier === 'standard') {
        query['subscription.type'] = 'free';
      }
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get members
    const members = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get stats
    const totalMembers = await User.countDocuments({ role: USER_ROLES.MEMBER });
    const premiumUsers = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      'subscription.type': { $in: ['monthly', 'yearly'] },
      'subscription.status': 'active',
    });
    const activeNow = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      isActive: true,
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Active in last 24 hours
    });

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalMembers,
        premiumUsers,
        activeNow,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/members] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json(
        { error: 'userId and updates are required' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('-__v');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[PATCH /api/admin/members] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update member', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Soft delete - set isActive to false
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    ).select('-__v');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Member deactivated successfully', user });
  } catch (error) {
    console.error('[DELETE /api/admin/members] Error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate member', details: error.message },
      { status: 500 }
    );
  }
}

