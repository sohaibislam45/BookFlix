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
    const userId = searchParams.get('userId');
    
    // If userId is provided, return single member
    if (userId) {
      const member = await User.findOne({ _id: userId, role: USER_ROLES.MEMBER })
        .select('-__v')
        .lean();
      
      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ member });
    }

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

    // Handle suspension with duration
    if (updates.suspendedUntil !== undefined) {
      if (updates.suspendedUntil === null) {
        // Activate user - remove suspension
        updates.isActive = true;
        updates.suspendedUntil = null;
      } else {
        // Suspend user
        updates.isActive = false;
        if (updates.suspendedUntil === 'forever') {
          // Permanent suspension - set to a far future date
          updates.suspendedUntil = new Date('2099-12-31');
        } else if (typeof updates.suspendedUntil === 'number') {
          // Duration in days
          const suspendedUntil = new Date();
          suspendedUntil.setDate(suspendedUntil.getDate() + updates.suspendedUntil);
          updates.suspendedUntil = suspendedUntil;
        }
      }
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

    // Permanently delete user from database
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/members] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete member', details: error.message },
      { status: 500 }
    );
  }
}

