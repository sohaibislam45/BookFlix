import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import BookCopy from '@/models/BookCopy';
import Book from '@/models/Book';
import User from '@/models/User';
import { BORROWING_RULES, BORROWING_STATUS, BOOK_STATUS, NOTIFICATION_TYPES } from '@/lib/constants';
import { notifyUser } from '@/lib/notifications';
import { handleApiError, validateRequiredFields, validateObjectId } from '@/lib/apiErrorHandler';

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

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { memberId, bookId } = body;

    // Validate required fields
    const validation = validateRequiredFields(body, ['memberId', 'bookId']);
    if (validation) {
      return validation;
    }

    // Validate ObjectIds
    const memberIdError = validateObjectId(memberId, 'Member ID');
    if (memberIdError) {
      return memberIdError;
    }

    const bookIdError = validateObjectId(bookId, 'Book ID');
    if (bookIdError) {
      return bookIdError;
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

    // Send notification (async, don't wait)
    notifyUser(
      memberId,
      NOTIFICATION_TYPES.BOOK_AVAILABLE,
      'Book Borrowed Successfully',
      `You have successfully borrowed "${borrowing.book.title}" by ${borrowing.book.author}. Due date: ${dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      {
        borrowing: borrowing._id,
        book: borrowing.book._id,
      },
      false // Don't send email for successful borrow
    ).catch(err => console.error('Error sending borrow notification:', err));

    return NextResponse.json(
      {
        message: 'Book borrowed successfully',
        borrowing,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'create borrowing');
  }
}

