import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import User from '@/models/User';
import Borrowing from '@/models/Borrowing';
import { RESERVATION_STATUS, BOOK_STATUS, BORROWING_STATUS, RESERVATION_EXPIRY_DAYS } from '@/lib/constants';
import { handleApiError, validatePaginationParams, normalizePaginationParams, validateObjectId, validateEnumValue, validateRequiredFields } from '@/lib/apiErrorHandler';

// GET - List reservations (with filters)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const bookId = searchParams.get('bookId');
    const status = searchParams.get('status');

    // Validate and normalize pagination
    const pagination = normalizePaginationParams(searchParams, { page: 1, limit: 20 });
    const paginationError = validatePaginationParams(pagination, 100);
    if (paginationError) {
      return paginationError;
    }
    const { page, limit } = pagination;

    const query = {};
    
    // Validate memberId if provided
    if (memberId) {
      const memberIdError = validateObjectId(memberId, 'Member ID');
      if (memberIdError) {
        return memberIdError;
      }
      query.member = memberId;
    }
    
    // Validate bookId if provided
    if (bookId) {
      const bookIdError = validateObjectId(bookId, 'Book ID');
      if (bookIdError) {
        return bookIdError;
      }
      query.book = bookId;
    }
    
    // Validate status if provided
    if (status) {
      const statusError = validateEnumValue(status, RESERVATION_STATUS, 'Status');
      if (statusError) {
        return statusError;
      }
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const reservations = await Reservation.find(query)
      .populate('member', 'name email')
      .populate('book', 'title author coverImage')
      .sort({ reservedDate: 1 })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    const total = await Reservation.countDocuments(query);

    return NextResponse.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'fetch reservations');
  }
}

// POST - Create new reservation
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

    // Validate book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check if member already has an active reservation for this book
    const existingReservation = await Reservation.findOne({
      member: memberId,
      book: bookId,
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
    });

    if (existingReservation) {
      return NextResponse.json(
        { error: 'You already have an active reservation for this book' },
        { status: 409 }
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

    // Check if book has available copies (if yes, suggest borrowing instead)
    const availableCopy = await BookCopy.findOne({
      book: bookId,
      status: BOOK_STATUS.AVAILABLE,
      isActive: true,
    });

    if (availableCopy) {
      return NextResponse.json(
        { 
          error: 'This book is currently available. You can borrow it directly.',
          available: true,
        },
        { status: 400 }
      );
    }

    // Calculate expiry date (3 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + RESERVATION_EXPIRY_DAYS);

    // Calculate queue position
    const reservedDate = new Date();
    const queuePosition = await Reservation.calculateQueuePosition(bookId, reservedDate);

    // Create reservation
    const reservation = new Reservation({
      member: memberId,
      book: bookId,
      reservedDate,
      expiryDate,
      status: RESERVATION_STATUS.PENDING,
      queuePosition,
    });

    await reservation.save();

    // Update queue positions for all pending reservations of this book
    await Reservation.updateQueuePositions(bookId);

    // Populate relationships
    await reservation.populate('member', 'name email');
    await reservation.populate('book', 'title author coverImage');

    return NextResponse.json(
      {
        message: 'Reservation created successfully',
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'create reservation');
  }
}

