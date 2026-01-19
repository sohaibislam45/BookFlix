import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id: bookId } = params;

    const reviews = await Review.find({ book: bookId })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
