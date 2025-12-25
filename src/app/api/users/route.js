import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { USER_ROLES } from '@/lib/constants';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { firebaseUid, email, name, phone, profilePhoto, address } = body;

    if (!firebaseUid || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields', received: { firebaseUid: !!firebaseUid, email: !!email, name: !!name } },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ firebaseUid }, { email }] 
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Clean address object - remove empty strings
    const cleanAddress = address ? {
      division: address.division || undefined,
      city: address.city || undefined,
      area: address.area || undefined,
      landmark: address.landmark || undefined,
    } : undefined;

    // Create new user
    const user = new User({
      firebaseUid,
      email,
      name,
      phone: phone || undefined,
      profilePhoto: profilePhoto || undefined,
      address: cleanAddress,
      role: USER_ROLES.MEMBER,
      subscription: {
        type: 'free',
        status: 'active',
      },
    });

    await user.save();

    return NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');
    const email = searchParams.get('email');

    if (!firebaseUid && !email) {
      return NextResponse.json(
        { error: 'firebaseUid or email is required' },
        { status: 400 }
      );
    }

    const user = await User.findOne(
      firebaseUid ? { firebaseUid } : { email }
    ).select('-__v');

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

