import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { USER_ROLES } from '@/lib/constants';
import { handleApiError, validateRequiredFields, validateObjectId, validateEnumValue, sanitizeInput } from '@/lib/apiErrorHandler';
import { isValidEmail, isValidPhone } from '@/lib/validation';

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

    // Validate required fields
    const validation = validateRequiredFields(body, ['firebaseUid', 'email', 'name']);
    if (validation) {
      return validation;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate and sanitize name
    const nameSanitized = sanitizeInput(name, 200);
    if (!nameSanitized || nameSanitized.length < 1) {
      return NextResponse.json(
        { error: 'Name is required and must be at least 1 character' },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role) {
      const roleError = validateEnumValue(role, USER_ROLES, 'Role');
      if (roleError) {
        return roleError;
      }
    }

    // Validate subscription type if provided
    if (subscription && subscription.type) {
      if (!['free', 'monthly', 'yearly'].includes(subscription.type)) {
        return NextResponse.json(
          { error: 'Invalid subscription type. Must be "free", "monthly", or "yearly"' },
          { status: 400 }
        );
      }
    }

    // Validate profilePhoto URL if provided
    if (profilePhoto) {
      try {
        new URL(profilePhoto);
      } catch {
        return NextResponse.json(
          { error: 'Invalid profile photo URL' },
          { status: 400 }
        );
      }
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

    // Clean and sanitize address object
    const cleanAddress = address ? {
      division: address.division ? sanitizeInput(address.division, 100) : undefined,
      city: address.city ? sanitizeInput(address.city, 100) : undefined,
      area: address.area ? sanitizeInput(address.area, 100) : undefined,
      landmark: address.landmark ? sanitizeInput(address.landmark, 200) : undefined,
    } : undefined;

    // Prepare user data
    const userData = {
      firebaseUid: sanitizeInput(firebaseUid, 200),
      email: email.toLowerCase().trim(),
      name: nameSanitized,
      phone: phone ? sanitizeInput(phone, 20) : undefined,
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
    // Handle Mongoose validation errors
    if (error?.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message);
      return handleApiError(new Error(validationErrors.join(', ')), 'create user');
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

    // For any other error, use handleApiError
    return handleApiError(error, 'create user');
  }
}

export async function GET(request) {
  console.log('[GET /api/users] Route handler called');
  console.log('[GET /api/users] Request URL:', request.url);
  
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

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
    return handleApiError(error, 'fetch user');
  }
}

