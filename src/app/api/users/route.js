import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { USER_ROLES } from '@/lib/constants';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let body = null;
  
  try {
    // Connect to database
    await connectDB();

    // Parse request body
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

    console.log('[POST /api/users] Creating user with data:', { firebaseUid, email, name: !!name });

    if (!firebaseUid || !email || !name) {
      console.log('[POST /api/users] Missing required fields');
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
      console.log('[POST /api/users] User already exists, returning existing user');
      // Convert to plain object and remove sensitive/internal fields
      const userObj = existingUser.toObject();
      delete userObj.__v;
      // Return the existing user instead of error
      return NextResponse.json(
        { message: 'User already exists', user: userObj },
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

    // Create new user using new User() and save() method
    // This is more reliable than User.create() in some Next.js configurations
    console.log('[POST /api/users] Creating user in database...');
    let user;
    try {
      user = new User(userData);
      await user.save();
      console.log('[POST /api/users] User created successfully:', user._id);
    } catch (createError) {
      console.error('[POST /api/users] Error during user creation:', createError);
      console.error('[POST /api/users] Create error name:', createError?.name);
      console.error('[POST /api/users] Create error message:', createError?.message);
      console.error('[POST /api/users] Create error stack:', createError?.stack);
      // Re-throw to be caught by outer catch block
      throw createError;
    }

    // Convert to plain object and remove sensitive/internal fields
    let userObj;
    try {
      userObj = user.toObject();
      delete userObj.__v;
    } catch (toObjectError) {
      console.error('[POST /api/users] Error converting user to object:', toObjectError);
      // If toObject fails, try JSON serialization
      userObj = JSON.parse(JSON.stringify(user));
      delete userObj.__v;
    }

    return NextResponse.json(
      { message: 'User created successfully', user: userObj },
      { status: 201 }
    );
  } catch (error) {
    // Log full error details for debugging
    console.error('[POST /api/users] Error creating user:', error);
    console.error('[POST /api/users] Error type:', typeof error);
    console.error('[POST /api/users] Error name:', error?.name);
    console.error('[POST /api/users] Error code:', error?.code);
    console.error('[POST /api/users] Error message:', error?.message);
    console.error('[POST /api/users] Error stack:', error?.stack);
    
    // Handle Mongoose validation errors
    if (error?.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error?.code === 11000) {
      // Try to find the existing user and return it
      if (body && (body.firebaseUid || body.email)) {
        try {
          const existingUser = await User.findOne({ 
            $or: [
              { firebaseUid: body.firebaseUid }, 
              { email: body.email?.toLowerCase()?.trim() }
            ] 
          });
          if (existingUser) {
            const userObj = existingUser.toObject();
            delete userObj.__v;
            return NextResponse.json(
              { message: 'User already exists', user: userObj },
              { status: 200 }
            );
          }
        } catch (findError) {
          console.error('[POST /api/users] Error finding existing user:', findError);
          // Fall through to generic error
        }
      }
      
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      );
    }

    // For any other error, return a safe error message
    // Don't expose internal error details in production
    const errorMessage = error?.message || String(error) || 'Unknown error occurred';
    console.error('[POST /api/users] Returning error response:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to create user', details: errorMessage },
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

    console.log('[GET /api/users] Request params:', { firebaseUid, email });

    if (!firebaseUid && !email) {
      console.log('[GET /api/users] Missing required params');
      return NextResponse.json(
        { error: 'firebaseUid or email is required' },
        { status: 400 }
      );
    }

    const query = firebaseUid ? { firebaseUid } : { email };
    console.log('[GET /api/users] Query:', query);

    const user = await User.findOne(query).select('-__v');

    if (!user) {
      console.log('[GET /api/users] User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[GET /api/users] User found:', { id: user._id, email: user.email, role: user.role });
    // Convert to plain object and remove sensitive/internal fields
    const userObj = user.toObject();
    delete userObj.__v;
    return NextResponse.json(userObj, { status: 200 });
  } catch (error) {
    console.error('[GET /api/users] Error:', error);
    console.error('[GET /api/users] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

