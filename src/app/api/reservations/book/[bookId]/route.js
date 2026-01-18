import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import { RESERVATION_STATUS } from '@/lib/constants';

// GET - Get all reservations for a book (queue)
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { bookId } = await params;

    const reservations = await Reservation.find({
      book: bookId,
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
    })
      .populate('member', 'name email')
      .populate('book', 'title author coverImage')
      .sort({ queuePosition: 1, reservedDate: 1 })
      .select('-__v')
      .lean();

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching book reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: error.message },
      { status: 500 }
    );
  }
}

