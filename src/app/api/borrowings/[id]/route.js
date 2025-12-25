import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import BookCopy from '@/models/BookCopy';
import { BORROWING_STATUS, BOOK_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// GET - Get single borrowing
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid borrowing ID' },
        { status: 400 }
      );
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
    console.error('Error fetching borrowing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrowing', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update borrowing (renew, return)
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { action, returnedBy } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid borrowing ID' },
        { status: 400 }
      );
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
    console.error('Error updating borrowing:', error);
    return NextResponse.json(
      { error: 'Failed to update borrowing', details: error.message },
      { status: 500 }
    );
  }
}

