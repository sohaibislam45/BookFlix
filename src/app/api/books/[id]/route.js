import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import Category from '@/models/Category';
import { handleApiError, validateObjectId, sanitizeInput } from '@/lib/apiErrorHandler';
import { isValidISBN, isValidDate } from '@/lib/validation';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    const book = await Book.findById(id)
      .populate('category', 'name slug icon')
      .select('-__v')
      .lean();

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Get copy counts
    const availableCopies = await BookCopy.countDocuments({
      book: id,
      status: 'available',
      isActive: true,
    });
    const totalCopies = await BookCopy.countDocuments({
      book: id,
      isActive: true,
    });

    return NextResponse.json({
      ...book,
      availableCopies,
      totalCopies,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    
    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const book = await Book.findById(id);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Validate and sanitize update fields
    const allowedFields = ['title', 'author', 'isbn', 'description', 'coverImage', 'category', 'publishedDate', 'publisher', 'bookLanguage', 'pages', 'rating', 'ratingCount', 'tags', 'isActive'];
    const updateData = {};

    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key) || key === '_id' || key === '__v') {
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Validate specific fields
      if (key === 'title') {
        const sanitized = sanitizeInput(value, 500);
        if (!sanitized || sanitized.length < 1) {
          return NextResponse.json(
            { error: 'Title must be at least 1 character' },
            { status: 400 }
          );
        }
        updateData[key] = sanitized;
      } else if (key === 'author') {
        const sanitized = sanitizeInput(value, 200);
        if (!sanitized || sanitized.length < 1) {
          return NextResponse.json(
            { error: 'Author must be at least 1 character' },
            { status: 400 }
          );
        }
        updateData[key] = sanitized;
      } else if (key === 'isbn') {
        const sanitized = sanitizeInput(value, 20);
        if (sanitized && !isValidISBN(sanitized)) {
          return NextResponse.json(
            { error: 'Invalid ISBN format. Must be 10 or 13 digits' },
            { status: 400 }
          );
        }
        // Check if ISBN is already used by another book
        if (sanitized) {
          const existingBook = await Book.findOne({ isbn: sanitized, _id: { $ne: id } });
          if (existingBook) {
            return NextResponse.json(
              { error: 'ISBN already exists for another book' },
              { status: 409 }
            );
          }
        }
        updateData[key] = sanitized || undefined;
      } else if (key === 'category') {
        const categoryError = validateObjectId(value, 'Category');
        if (categoryError) {
          return categoryError;
        }
        // Verify category exists
        const categoryExists = await Category.findById(value);
        if (!categoryExists) {
          return NextResponse.json(
            { error: 'Category not found' },
            { status: 404 }
          );
        }
        updateData[key] = value;
      } else if (key === 'publishedDate') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: 'Invalid published date format' },
            { status: 400 }
          );
        }
        if (date > new Date()) {
          return NextResponse.json(
            { error: 'Published date cannot be in the future' },
            { status: 400 }
          );
        }
        updateData[key] = date;
      } else if (key === 'pages') {
        const pagesNum = Number(value);
        if (isNaN(pagesNum) || pagesNum < 0 || !Number.isInteger(pagesNum)) {
          return NextResponse.json(
            { error: 'Pages must be a non-negative integer' },
            { status: 400 }
          );
        }
        updateData[key] = pagesNum;
      } else if (key === 'rating') {
        const ratingNum = Number(value);
        if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 0 and 5' },
            { status: 400 }
          );
        }
        updateData[key] = ratingNum;
      } else if (key === 'ratingCount') {
        const countNum = Number(value);
        if (isNaN(countNum) || countNum < 0 || !Number.isInteger(countNum)) {
          return NextResponse.json(
            { error: 'Rating count must be a non-negative integer' },
            { status: 400 }
          );
        }
        updateData[key] = countNum;
      } else if (key === 'coverImage') {
        try {
          new URL(value);
        } catch {
          return NextResponse.json(
            { error: 'Invalid cover image URL' },
            { status: 400 }
          );
        }
        updateData[key] = value;
      } else if (key === 'description') {
        if (value.length > 5000) {
          return NextResponse.json(
            { error: 'Description must be no more than 5000 characters' },
            { status: 400 }
          );
        }
        updateData[key] = sanitizeInput(value, 5000);
      } else if (key === 'publisher') {
        if (value.length > 200) {
          return NextResponse.json(
            { error: 'Publisher must be no more than 200 characters' },
            { status: 400 }
          );
        }
        updateData[key] = sanitizeInput(value, 200);
      } else if (key === 'tags') {
        if (!Array.isArray(value)) {
          return NextResponse.json(
            { error: 'Tags must be an array' },
            { status: 400 }
          );
        }
        if (value.length > 20) {
          return NextResponse.json(
            { error: 'Maximum 20 tags allowed' },
            { status: 400 }
          );
        }
        updateData[key] = value.slice(0, 20).map(tag => sanitizeInput(String(tag), 50).toLowerCase());
      } else if (key === 'isActive') {
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { error: 'isActive must be a boolean' },
            { status: 400 }
          );
        }
        updateData[key] = value;
      } else if (key === 'bookLanguage') {
        // Validate language code - only allow 'en' or 'bn'
        const validLanguages = ['en', 'bn'];
        if (!validLanguages.includes(value)) {
          return NextResponse.json(
            { error: `Language must be one of: ${validLanguages.join(', ')}` },
            { status: 400 }
          );
        }
        updateData[key] = value;
      } else {
        updateData[key] = value;
      }
    }

    // Update all fields including bookLanguage (no longer need special handling since field is renamed)
    if (Object.keys(updateData).length > 0) {
      await Book.updateOne(
        { _id: id },
        { $set: updateData },
        { runValidators: true }
      );
    }

    // Fetch the updated book
    const updatedBook = await Book.findById(id)
      .populate('category', 'name slug icon');

    return NextResponse.json(
      { message: 'Book updated successfully', book: updatedBook },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'update book');
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    const book = await Book.findById(id);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Soft delete - set isActive to false
    book.isActive = false;
    await book.save();

    // Also soft delete all copies
    await BookCopy.updateMany(
      { book: id },
      { isActive: false }
    );

    return NextResponse.json(
      { message: 'Book deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'delete book');
  }
}

