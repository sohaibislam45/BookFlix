import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    await connectDB();

    // In Next.js 16, params might be a promise
    const resolvedParams = params instanceof Promise ? await params : params;
    const { uid } = resolvedParams;
    
    console.log('[GET /api/users/[uid]] Fetching user with firebaseUid:', uid);
    
    const user = await User.findOne({ firebaseUid: uid }).select('-__v');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    // In Next.js 16, params might be a promise
    const resolvedParams = params instanceof Promise ? await params : params;
    const { uid } = resolvedParams;
    
    console.log('[PATCH /api/users/[uid]] Updating user with firebaseUid:', uid);
    
    const body = await request.json();
    console.log('[PATCH /api/users/[uid]] Update data:', Object.keys(body));

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: body },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!user) {
      console.log('[PATCH /api/users/[uid]] User not found with firebaseUid:', uid);
      // Try to find if user exists with different query
      const existingUser = await User.findOne({ firebaseUid: uid });
      console.log('[PATCH /api/users/[uid]] User exists check:', !!existingUser);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Convert to plain object
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.__v;

    return NextResponse.json(userObj, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}

