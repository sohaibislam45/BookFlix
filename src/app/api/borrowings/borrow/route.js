import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import BookCopy from '@/models/BookCopy';
import Book from '@/models/Book';
import User from '@/models/User';
import { BORROWING_RULES, BORROWING_STATUS, BOOK_STATUS } from '@/lib/constants';

/**
 * Get user's borrowing rules based on subscription
 */
function getUserBorrowingRules(subscriptionType, subscriptionStatus) {
  // Check if subscription is active premium
  if ((subscriptionType === 'monthly' || subscriptionType === 'yearly') && subscriptionStatus === 'active') {
    return BORROWING_RULES.PREMIUM;
  }
  return BORROWING_RULES.GENERAL;
}

/**
 * Check if user can borrow more books
 */
async function canBorrow(userId, subscriptionType, subscriptionStatus) {
  const rules = getUserBorrowingRules(subscriptionType, subscriptionStatus);
  const activeBorrowings = await Borrowing.countDocuments({
    member: userId,
    status: BORROWING_STATUS.ACTIVE,
  });
  return activeBorrowings < rules.MAX_BOOKS;
}

/**
 * Calculate due date based on subscription
 */
function calculateDueDate(subscriptionType, subscriptionStatus) {
  const rules = getUserBorrowingRules(subscriptionType, subscriptionStatus);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + rules.MAX_DAYS);
  return dueDate;
}

// POST - Borrow a book (for members)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { memberId, bookId } = body;

    if (!memberId || !bookId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, bookId' },
        { status: 400 }
      );
    }

    // Validate member exists
    const member = await User.findById(memberId);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if user can borrow more books
    const subscriptionType = member.subscription?.type || 'free';
    const subscriptionStatus = member.subscription?.status || 'active';
    if (!(await canBorrow(memberId, subscriptionType, subscriptionStatus))) {
      const rules = getUserBorrowingRules(subscriptionType, subscriptionStatus);
      return NextResponse.json(
        {
          error: `Borrowing limit reached. You can borrow up to ${rules.MAX_BOOKS} book(s) at a time.`,
          limit: rules.MAX_BOOKS,
        },
        { status: 403 }
      );
    }

    // Find an available copy of the book
    const availableCopy = await BookCopy.findOne({
      book: bookId,
      status: BOOK_STATUS.AVAILABLE,
      isActive: true,
    });

    if (!availableCopy) {
      return NextResponse.json(
        { error: 'No available copies of this book' },
        { status: 404 }
      );
    }

    // Check if member already has this book borrowed
    const existingBorrowing = await Borrowing.findOne({
      member: memberId,
      book: bookId,
      status: BORROWING_STATUS.ACTIVE,
    });

    if (existingBorrowing) {
      return NextResponse.json(
        { error: 'You already have this book borrowed' },
        { status: 409 }
      );
    }

    // Calculate due date
    const dueDate = calculateDueDate(subscriptionType, subscriptionStatus);

    // Create borrowing
    const borrowing = new Borrowing({
      member: memberId,
      bookCopy: availableCopy._id,
      book: bookId,
      borrowedDate: new Date(),
      dueDate,
      status: BORROWING_STATUS.ACTIVE,
    });

    await borrowing.save();

    // Update book copy status
    availableCopy.status = BOOK_STATUS.BORROWED;
    await availableCopy.save();

    // Populate relationships
    await borrowing.populate('member', 'name email');
    await borrowing.populate('book', 'title author coverImage');
    await borrowing.populate('bookCopy', 'copyNumber barcode');

    return NextResponse.json(
      {
        message: 'Book borrowed successfully',
        borrowing,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating borrowing:', error);
    return NextResponse.json(
      { error: 'Failed to create borrowing', details: error.message },
      { status: 500 }
    );
  }
}

