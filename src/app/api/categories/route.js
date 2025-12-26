import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { handleApiError, validateRequiredFields, sanitizeInput } from '@/lib/apiErrorHandler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const query = {};
    if (isActive !== null && isActive !== undefined) {
      // Validate boolean string
      if (isActive !== 'true' && isActive !== 'false') {
        return NextResponse.json(
          { error: 'isActive must be "true" or "false"' },
          { status: 400 }
        );
      }
      query.isActive = isActive === 'true';
    }

    const categories = await Category.find(query)
      .sort({ name: 1 })
      .select('-__v');

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'fetch categories');
  }
}

export async function POST(request) {
  try {
    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { name, description, icon } = body;

    // Validate required fields
    const validation = validateRequiredFields(body, ['name']);
    if (validation) {
      return validation;
    }

    // Validate and sanitize name
    const nameSanitized = sanitizeInput(name, 100);
    if (!nameSanitized || nameSanitized.length < 1) {
      return NextResponse.json(
        { error: 'Name is required and must be at least 1 character' },
        { status: 400 }
      );
    }

    if (nameSanitized.length > 100) {
      return NextResponse.json(
        { error: 'Name must be no more than 100 characters' },
        { status: 400 }
      );
    }

    // Validate description length if provided
    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be no more than 500 characters' },
        { status: 400 }
      );
    }

    // Validate icon length if provided
    if (icon && icon.length > 50) {
      return NextResponse.json(
        { error: 'Icon must be no more than 50 characters' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const nameLower = nameSanitized.toLowerCase();
    
    // Generate slug from name
    let slug = nameLower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Ensure slug is not empty - fallback to a default slug
    if (!slug || slug.length === 0) {
      slug = 'category-' + Date.now().toString(36);
    }
    
    // Check for existing category by name or slug
    const existingCategory = await Category.findOne({ 
      $or: [
        { name: nameLower },
        { slug: slug }
      ]
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      );
    }

    // Create new category
    try {
      const category = new Category({
        name: nameLower,
        slug: slug,
        description: description ? sanitizeInput(description, 500) : undefined,
        icon: icon ? sanitizeInput(icon, 50) : 'menu_book',
      });

      await category.save();

      // Return the saved category
      return NextResponse.json(
        { message: 'Category created successfully', category },
        { status: 201 }
      );
    } catch (saveError) {
      console.error('Error saving category:', saveError);
      // Re-throw to be caught by outer catch block
      throw saveError;
    }
  } catch (error) {
    console.error('Category creation error:', error);
    
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        errors: error.errors,
      });
    }
    
    // Handle duplicate key error (MongoDB error code 11000)
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      return NextResponse.json(
        { error: `Category with this ${duplicateField} already exists` },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors.join(', ') },
        { status: 422 }
      );
    }
    
    // Handle database connection errors
    if (error.message && error.message.includes('connection')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }
    
    // Use handleApiError for all other errors
    return handleApiError(error, 'create category');
  }
}

export async function DELETE(request) {
  try {
    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'Category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Category deletion error:', error);
    return handleApiError(error, 'delete category');
  }
}

