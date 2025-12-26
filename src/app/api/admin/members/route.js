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
      
      // Convert dates to ISO strings for proper JSON serialization
      if (member.suspendedUntil) {
        member.suspendedUntil = new Date(member.suspendedUntil).toISOString();
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

    // Convert dates to ISO strings for proper JSON serialization
    const membersWithDates = members.map(member => {
      if (member.suspendedUntil) {
        return {
          ...member,
          suspendedUntil: new Date(member.suspendedUntil).toISOString(),
        };
      }
      return member;
    });

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
      members: membersWithDates,
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
        } else if (typeof updates.suspendedUntil === 'string') {
          // Date was serialized as string from JSON - convert back to Date
          updates.suspendedUntil = new Date(updates.suspendedUntil);
        } else if (updates.suspendedUntil instanceof Date) {
          // Already a Date object - keep it
          // No conversion needed
        }
      }
    } else if (updates.isActive === false && !updates.suspendedUntil) {
      // If isActive is being set to false but no suspendedUntil is provided,
      // this might be an old suspension - we should still set a date
      // But we'll leave it as is for now to avoid breaking existing suspensions
    }

    // Debug logging - log the raw updates
    console.log('[PATCH /api/admin/members] Raw updates object:', JSON.stringify(updates, null, 2));
    console.log('[PATCH /api/admin/members] suspendedUntil in updates:', updates.suspendedUntil);
    console.log('[PATCH /api/admin/members] suspendedUntil type:', typeof updates.suspendedUntil);
    console.log('[PATCH /api/admin/members] suspendedUntil instanceof Date:', updates.suspendedUntil instanceof Date);
    
    // Ensure we're setting the field correctly
    // Create a clean update object to avoid any serialization issues
    const cleanUpdates = { ...updates };
    if (cleanUpdates.suspendedUntil instanceof Date) {
      // Keep as Date object - Mongoose will handle it
      console.log('[PATCH /api/admin/members] Keeping suspendedUntil as Date object:', cleanUpdates.suspendedUntil.toISOString());
    }
    
    const updateQuery = { $set: cleanUpdates };
    console.log('[PATCH /api/admin/members] Update query keys:', Object.keys(updateQuery.$set));
    console.log('[PATCH /api/admin/members] Update query suspendedUntil:', updateQuery.$set.suspendedUntil);

    // Perform the update - explicitly include suspendedUntil in select
    const updateResult = await User.findByIdAndUpdate(
      userId,
      updateQuery,
      { new: true, runValidators: true }
    ).select('+suspendedUntil -__v').lean();
    
    console.log('[PATCH /api/admin/members] Update result (lean):', {
      hasResult: !!updateResult,
      suspendedUntil: updateResult?.suspendedUntil,
      isActive: updateResult?.isActive,
      allKeys: updateResult ? Object.keys(updateResult) : []
    });
    
    let user = updateResult;
    
    // If suspendedUntil is missing, try without lean() to get the full document
    if (!updateResult?.suspendedUntil && updates.suspendedUntil) {
      console.log('[PATCH /api/admin/members] Retrying without lean() to get full document...');
      const userDoc = await User.findByIdAndUpdate(
        userId,
        updateQuery,
        { new: true, runValidators: true }
      ).select('-__v');
      
      if (userDoc) {
        user = userDoc.toObject ? userDoc.toObject() : userDoc;
        console.log('[PATCH /api/admin/members] Retry result (toObject):', {
          suspendedUntil: user?.suspendedUntil,
          suspendedUntilType: typeof user?.suspendedUntil,
          allKeys: Object.keys(user)
        });
      }
    }
    
    console.log('[PATCH /api/admin/members] Final user object:', {
      _id: user?._id,
      isActive: user?.isActive,
      suspendedUntil: user?.suspendedUntil,
      suspendedUntilType: typeof user?.suspendedUntil,
      suspendedUntilValue: user?.suspendedUntil ? new Date(user.suspendedUntil).toISOString() : 'null/undefined'
    });

    // If suspendedUntil is still undefined after update, try a direct query
    if (updates.suspendedUntil && !user.suspendedUntil) {
      console.error('[PATCH /api/admin/members] WARNING: suspendedUntil was not saved!');
      console.error('[PATCH /api/admin/members] Updates that were sent:', updates);
      // Try to fetch the user directly to see what's in the DB
      const directUser = await User.findById(userId).select('+suspendedUntil isActive').lean();
      console.error('[PATCH /api/admin/members] Direct DB query result:', directUser);
      
      // The field is not being saved - try using updateOne directly with proper Date conversion
      console.error('[PATCH /api/admin/members] Attempting direct MongoDB updateOne...');
      const dateToSave = updates.suspendedUntil instanceof Date 
        ? updates.suspendedUntil 
        : new Date(updates.suspendedUntil);
      
      const directUpdate = await User.updateOne(
        { _id: userId },
        { $set: { suspendedUntil: dateToSave } }
      );
      console.error('[PATCH /api/admin/members] Direct updateOne result:', directUpdate);
      
      // Fetch again to verify
      const verifyUser = await User.findById(userId).select('+suspendedUntil isActive').lean();
      console.error('[PATCH /api/admin/members] After direct updateOne:', verifyUser);
      
      if (verifyUser?.suspendedUntil) {
        user = verifyUser;
        console.error('[PATCH /api/admin/members] Successfully saved suspendedUntil via updateOne!');
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Convert dates to ISO strings for proper JSON serialization
    if (user.suspendedUntil) {
      user.suspendedUntil = new Date(user.suspendedUntil).toISOString();
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

