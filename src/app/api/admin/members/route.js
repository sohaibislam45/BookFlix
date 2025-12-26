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
        .select('name email profilePhoto role subscription isActive suspendedUntil createdAt updatedAt phone address')
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
      .select('name email profilePhoto role subscription isActive suspendedUntil createdAt updatedAt phone address')
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

    // Build update query properly handling nested objects
    const updateQuery = { $set: {} };

    // Handle top-level fields
    if (updates.name !== undefined && updates.name !== null) {
      const trimmedName = updates.name.trim();
      if (trimmedName === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateQuery.$set.name = trimmedName;
    }
    if (updates.phone !== undefined) {
      updateQuery.$set.phone = updates.phone && updates.phone.trim() !== '' ? updates.phone.trim() : null;
    }
    if (updates.profilePhoto !== undefined) {
      updateQuery.$set.profilePhoto = updates.profilePhoto && updates.profilePhoto.trim() !== '' ? updates.profilePhoto.trim() : null;
    }
    if (updates.isActive !== undefined) {
      updateQuery.$set.isActive = Boolean(updates.isActive);
    }

    // Handle suspension with duration
    if (updates.suspendedUntil !== undefined) {
      if (updates.suspendedUntil === null) {
        // Activate user - remove suspension
        updateQuery.$set.isActive = true;
        updateQuery.$set.suspendedUntil = null;
      } else {
        // Suspend user
        updateQuery.$set.isActive = false;
        if (updates.suspendedUntil === 'forever') {
          // Permanent suspension - set to a far future date
          updateQuery.$set.suspendedUntil = new Date('2099-12-31');
        } else if (typeof updates.suspendedUntil === 'number') {
          // Duration in days
          const suspendedUntil = new Date();
          suspendedUntil.setDate(suspendedUntil.getDate() + updates.suspendedUntil);
          updateQuery.$set.suspendedUntil = suspendedUntil;
        } else if (typeof updates.suspendedUntil === 'string') {
          // Date was serialized as string from JSON - convert back to Date
          updateQuery.$set.suspendedUntil = new Date(updates.suspendedUntil);
        } else if (updates.suspendedUntil instanceof Date) {
          updateQuery.$set.suspendedUntil = updates.suspendedUntil;
        }
      }
    }

    // Handle nested subscription object - validate enum values
    if (updates.subscription !== undefined && updates.subscription !== null && typeof updates.subscription === 'object') {
      const subscription = updates.subscription;
      if (subscription.type !== undefined && subscription.type !== null && subscription.type !== '') {
        const validTypes = ['free', 'monthly', 'yearly'];
        if (!validTypes.includes(subscription.type)) {
          return NextResponse.json(
            { error: `Invalid subscription type: ${subscription.type}. Must be one of: ${validTypes.join(', ')}` },
            { status: 400 }
          );
        }
        updateQuery.$set['subscription.type'] = subscription.type;
      }
      if (subscription.status !== undefined && subscription.status !== null && subscription.status !== '') {
        const validStatuses = ['active', 'cancelled', 'expired'];
        if (!validStatuses.includes(subscription.status)) {
          return NextResponse.json(
            { error: `Invalid subscription status: ${subscription.status}. Must be one of: ${validStatuses.join(', ')}` },
            { status: 400 }
          );
        }
        updateQuery.$set['subscription.status'] = subscription.status;
      }
      if (subscription.startDate !== undefined) {
        updateQuery.$set['subscription.startDate'] = subscription.startDate ? new Date(subscription.startDate) : null;
      }
      if (subscription.endDate !== undefined) {
        updateQuery.$set['subscription.endDate'] = subscription.endDate ? new Date(subscription.endDate) : null;
      }
      if (subscription.stripeSubscriptionId !== undefined) {
        updateQuery.$set['subscription.stripeSubscriptionId'] = subscription.stripeSubscriptionId || null;
      }
    }

    // Handle nested address object
    if (updates.address !== undefined && updates.address !== null && typeof updates.address === 'object') {
      const address = updates.address;
      if (address.division !== undefined) {
        updateQuery.$set['address.division'] = address.division && address.division.trim() !== '' ? address.division.trim() : null;
      }
      if (address.city !== undefined) {
        updateQuery.$set['address.city'] = address.city && address.city.trim() !== '' ? address.city.trim() : null;
      }
      if (address.area !== undefined) {
        updateQuery.$set['address.area'] = address.area && address.area.trim() !== '' ? address.area.trim() : null;
      }
      if (address.landmark !== undefined) {
        updateQuery.$set['address.landmark'] = address.landmark && address.landmark.trim() !== '' ? address.landmark.trim() : null;
      }
    }

    // Check if there are any updates to apply
    if (Object.keys(updateQuery.$set).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    console.log('[PATCH /api/admin/members] Update query:', JSON.stringify(updateQuery, null, 2));
    console.log('[PATCH /api/admin/members] UserId:', userId);

    // Perform the update
    const updateResult = await User.findByIdAndUpdate(
      userId,
      updateQuery,
      { new: true, runValidators: true }
    ).select('-__v').lean();
    
    console.log('[PATCH /api/admin/members] Update result (lean):', {
      hasResult: !!updateResult,
      suspendedUntil: updateResult?.suspendedUntil,
      isActive: updateResult?.isActive,
      allKeys: updateResult ? Object.keys(updateResult) : []
    });
    
    let user = updateResult;
    
    // If suspendedUntil is missing, try without lean() to get the full document
    if (!updateResult?.suspendedUntil && updateQuery.$set.suspendedUntil) {
      console.log('[PATCH /api/admin/members] Retrying without lean() to get full document...');
      const userDoc = await User.findByIdAndUpdate(
        userId,
        updateQuery,
        { new: true, runValidators: true }
      ).select('-__v');
      
      if (userDoc) {
        user = userDoc.toObject ? userDoc.toObject() : userDoc;
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
    console.error('[PATCH /api/admin/members] Error stack:', error.stack);
    console.error('[PATCH /api/admin/members] Error name:', error.name);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors || {}).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.message,
          validationErrors 
        },
        { status: 400 }
      );
    }
    
    // Check if it's a CastError (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return NextResponse.json(
        { 
          error: 'Invalid data format', 
          details: error.message 
        },
        { status: 400 }
      );
    }
    
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

