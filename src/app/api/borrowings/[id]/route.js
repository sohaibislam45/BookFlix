import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import BookCopy from '@/models/BookCopy';
import { BORROWING_STATUS, BOOK_STATUS } from '@/lib/constants';
import { handleApiError, validateObjectId, validateRequiredFields } from '@/lib/apiErrorHandler';
import mongoose from 'mongoose';

// GET - Get single borrowing
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    const idError = validateObjectId(id, 'Borrowing ID');
    if (idError) {
      return idError;
    }

    const borrowing = await Borrowing.findById(id)
      .populate('member', 'name email')
      .populate('book', 'title author coverImage')
      .populate('bookCopy', 'copyNumber barcode')
      .select('-__v');

    if (!borrowing) {
      return NextResponse.json(
        { error: 'Borrowing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(borrowing, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'fetch borrowing');
  }
}

// PATCH - Update borrowing (renew, return)
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    
    const idError = validateObjectId(id, 'Borrowing ID');
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

    const { action, returnedBy } = body;

    // Validate required action field
    const validation = validateRequiredFields(body, ['action']);
    if (validation) {
      return validation;
    }

    // Validate action value
    if (!['renew', 'return'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "renew" or "return"' },
        { status: 400 }
      );
    }

    // Validate returnedBy ObjectId if provided
    if (returnedBy) {
      const returnedByError = validateObjectId(returnedBy, 'Returned By User ID');
      if (returnedByError) {
        return returnedByError;
      }
    }

    const borrowing = await Borrowing.findById(id);

    if (!borrowing) {
      return NextResponse.json(
        { error: 'Borrowing not found' },
        { status: 404 }
      );
    }

    if (action === 'renew') {
      // Check if already renewed maximum times
      if (borrowing.renewalCount >= 2) {
        return NextResponse.json(
          { error: 'Maximum renewal limit reached (2 renewals)' },
          { status: 403 }
        );
      }

      // Check if overdue
      if (borrowing.status === BORROWING_STATUS.OVERDUE) {
        return NextResponse.json(
          { error: 'Cannot renew overdue book. Please return it first.' },
          { status: 403 }
        );
      }

      // Get member subscription to calculate new due date
      const member = await mongoose.model('User').findById(borrowing.member);
      const subscriptionType = member?.subscription?.type || 'free';
      const rules = subscriptionType === 'monthly' || subscriptionType === 'yearly'
        ? { MAX_DAYS: 20 }
        : { MAX_DAYS: 7 };

      // Calculate new due date (extend by same period)
      const newDueDate = new Date(borrowing.dueDate);
      newDueDate.setDate(newDueDate.getDate() + rules.MAX_DAYS);

      borrowing.dueDate = newDueDate;
      borrowing.renewed = true;
      borrowing.renewalCount += 1;

      await borrowing.save();
      await borrowing.populate('member', 'name email');
      await borrowing.populate('book', 'title author coverImage');
      await borrowing.populate('bookCopy', 'copyNumber barcode');

      return NextResponse.json(
        {
          message: 'Book renewed successfully',
          borrowing,
        },
        { status: 200 }
      );
    }

    if (action === 'return') {
      if (borrowing.status === BORROWING_STATUS.RETURNED) {
        return NextResponse.json(
          { error: 'Book already returned' },
          { status: 400 }
        );
      }

      // Update borrowing
      borrowing.status = BORROWING_STATUS.RETURNED;
      borrowing.returnedDate = new Date();
      if (returnedBy) {
        borrowing.returnedBy = returnedBy;
      }

      await borrowing.save();

      // Update book copy status
      const bookCopy = await BookCopy.findById(borrowing.bookCopy);
      if (bookCopy) {
        bookCopy.status = BOOK_STATUS.AVAILABLE;
        await bookCopy.save();
      }

      await borrowing.populate('member', 'name email');
      await borrowing.populate('book', 'title author coverImage');
      await borrowing.populate('bookCopy', 'copyNumber barcode');

      return NextResponse.json(
        {
          message: 'Book returned successfully',
          borrowing,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "renew" or "return"' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, 'update borrowing');
  }
}

