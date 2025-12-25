import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';

// GET - Get all reservations for a member
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { memberId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const query = { member: memberId };
    if (status) {
      query.status = status;
    }

    const reservations = await Reservation.find(query)
      .populate('book', 'title author coverImage')
      .sort({ reservedDate: -1 })
      .select('-__v')
      .lean();

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: error.message },
      { status: 500 }
    );
  }
}

