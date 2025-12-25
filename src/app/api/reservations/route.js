import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import User from '@/models/User';
import Borrowing from '@/models/Borrowing';
import { RESERVATION_STATUS, BOOK_STATUS, BORROWING_STATUS, RESERVATION_EXPIRY_DAYS } from '@/lib/constants';

// GET - List reservations (with filters)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const bookId = searchParams.get('bookId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const query = {};
    if (memberId) {
      query.member = memberId;
    }
    if (bookId) {
      query.book = bookId;
    }
    if (status) {
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
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new reservation
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
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation', details: error.message },
      { status: 500 }
    );
  }
}

