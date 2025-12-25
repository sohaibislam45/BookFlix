import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { USER_ROLES } from '@/lib/constants';

export async function POST(request) {
  try {
    // Connect to database
    await connectDB();

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[POST /api/users] Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError.message },
        { status: 400 }
      );
    }

    const { firebaseUid, email, name, phone, profilePhoto, address, role, subscription } = body;

    if (!firebaseUid || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields', received: { firebaseUid: !!firebaseUid, email: !!email, name: !!name } },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ firebaseUid }, { email: email.toLowerCase().trim() }] 
    });

    if (existingUser) {
      // Return the existing user instead of error
      return NextResponse.json(
        { message: 'User already exists', user: existingUser },
        { status: 200 }
      );
    }

    // Clean address object - remove empty strings
    const cleanAddress = address ? {
      division: address.division || undefined,
      city: address.city || undefined,
      area: address.area || undefined,
      landmark: address.landmark || undefined,
    } : undefined;

    // Prepare user data
    const userData = {
      firebaseUid,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      phone: phone ? phone.trim() : undefined,
      profilePhoto: profilePhoto || undefined,
      address: cleanAddress,
      role: role || USER_ROLES.MEMBER,
      subscription: subscription || {
        type: 'free',
        status: 'active',
      },
    };

    // Create new user using create() method
    const user = await User.create(userData);

    // Convert to plain object and remove sensitive/internal fields
    const userObj = user.toObject();
    delete userObj.__v;

    return NextResponse.json(
      { message: 'User created successfully', user: userObj },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/users] Error creating user:', error);
    console.error('[POST /api/users] Error name:', error.name);
    console.error('[POST /api/users] Error code:', error.code);
    console.error('[POST /api/users] Error message:', error.message);
    console.error('[POST /api/users] Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      // Try to find the existing user and return it
      try {
        const existingUser = await User.findOne({ 
          $or: [{ firebaseUid: body?.firebaseUid }, { email: body?.email?.toLowerCase()?.trim() }] 
        });
        if (existingUser) {
          return NextResponse.json(
            { message: 'User already exists', user: existingUser },
            { status: 200 }
          );
        }
      } catch (findError) {
        // Fall through to generic error
      }
      
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
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

    const query = firebaseUid ? { firebaseUid } : { email };

    const user = await User.findOne(query).select('-__v');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('[GET /api/users] Error:', error);
    console.error('[GET /api/users] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

