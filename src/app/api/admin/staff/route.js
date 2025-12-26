import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { USER_ROLES } from '@/lib/constants';
import { handleApiError, validateObjectId, sanitizeInput } from '@/lib/apiErrorHandler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';

    const skip = (page - 1) * limit;

    // Build query for staff (librarians and admins)
    const query = {
      role: { $in: [USER_ROLES.LIBRARIAN, USER_ROLES.ADMIN] },
    };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Role filter
    if (role !== 'all') {
      query.role = role;
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get staff
    const staff = await User.find(query)
      .select('name email profilePhoto role phone isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get stats
    const totalStaff = await User.countDocuments({
      role: { $in: [USER_ROLES.LIBRARIAN, USER_ROLES.ADMIN] },
    });
    const administrators = await User.countDocuments({
      role: USER_ROLES.ADMIN,
    });
    const activeToday = await User.countDocuments({
      role: { $in: [USER_ROLES.LIBRARIAN, USER_ROLES.ADMIN] },
      isActive: true,
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    return NextResponse.json({
      staff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalStaff,
        administrators,
        activeToday,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/staff] Error:', error);
    return handleApiError(error, 'fetch staff');
  }
}

export async function POST(request) {
  try {
    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { name, email, phone, role, password } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!role || !['librarian', 'admin', 'support'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (librarian, admin, or support)' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Note: In a real application, you would create the Firebase user here
    // For now, we'll create a placeholder firebaseUid
    // You'll need to integrate Firebase Admin SDK to create users server-side
    const firebaseUid = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Map 'support' role to 'librarian' for now, or add it to USER_ROLES
    const userRole = role === 'support' ? USER_ROLES.LIBRARIAN : role;

    // Create user in database
    const user = new User({
      firebaseUid,
      email: email.trim().toLowerCase(),
      name: sanitizeInput(name.trim(), 200),
      phone: phone ? sanitizeInput(phone.trim(), 20) : undefined,
      role: userRole,
      isActive: true,
    });

    await user.save();

    // Return user without sensitive data
    const userResponse = user.toObject();
    delete userResponse.firebaseUid;

    return NextResponse.json(
      {
        message: 'Staff member created successfully',
        user: userResponse,
        // Include password in response for now (in production, send via email)
        tempPassword: password,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/admin/staff] Error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    return handleApiError(error, 'create staff');
  }
}

export async function PATCH(request) {
  try {
    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const idError = validateObjectId(userId, 'User ID');
    if (idError) {
      return idError;
    }

    const updateQuery = { $set: {} };

    if (updates.name !== undefined && updates.name !== null) {
      const trimmedName = sanitizeInput(updates.name.trim(), 200);
      if (!trimmedName) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateQuery.$set.name = trimmedName;
    }

    if (updates.phone !== undefined) {
      updateQuery.$set.phone = updates.phone && updates.phone.trim() !== '' 
        ? sanitizeInput(updates.phone.trim(), 20) 
        : null;
    }

    if (updates.role !== undefined) {
      if (!['librarian', 'admin', 'support'].includes(updates.role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be librarian, admin, or support' },
          { status: 400 }
        );
      }
      const userRole = updates.role === 'support' ? USER_ROLES.LIBRARIAN : updates.role;
      updateQuery.$set.role = userRole;
    }

    if (updates.isActive !== undefined) {
      updateQuery.$set.isActive = Boolean(updates.isActive);
    }

    if (Object.keys(updateQuery.$set).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateQuery,
      { new: true, runValidators: true }
    )
      .select('-__v -firebaseUid')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[PATCH /api/admin/staff] Error:', error);
    return handleApiError(error, 'update staff');
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

    const idError = validateObjectId(userId, 'User ID');
    if (idError) {
      return idError;
    }

    // Soft delete - set isActive to false instead of deleting
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Staff member deactivated successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/staff] Error:', error);
    return handleApiError(error, 'delete staff');
  }
}

