import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import { handleApiError, validateRequiredFields, sanitizeInput } from '@/lib/apiErrorHandler';

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
    const slug = nameLower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
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
    const category = new Category({
      name: nameLower,
      slug: slug,
      description: description ? sanitizeInput(description, 500) : undefined,
      icon: icon ? sanitizeInput(icon, 50) : 'menu_book',
    });

    await category.save();

    return NextResponse.json(
      { message: 'Category created successfully', category },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'create category');
  }
}

