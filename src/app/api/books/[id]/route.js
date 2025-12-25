import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid book ID' },
        { status: 400 }
      );
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

    const { id } = params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid book ID' },
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

    // Update fields
    Object.keys(body).forEach((key) => {
      if (body[key] !== undefined && key !== '_id' && key !== '__v') {
        book[key] = body[key];
      }
    });

    await book.save();
    await book.populate('category', 'name slug icon');

    return NextResponse.json(
      { message: 'Book updated successfully', book },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid book ID' },
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
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book', details: error.message },
      { status: 500 }
    );
  }
}

