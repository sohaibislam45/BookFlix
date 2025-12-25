import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { PAYMENT_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// GET - Get single payment by ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(id)
      .populate('member', 'name email')
      .populate('fine')
      .populate({
        path: 'fine',
        populate: {
          path: 'borrowing',
          populate: {
            path: 'book',
            select: 'title author coverImage',
          },
        },
      })
      .lean();

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment }, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment', details: error.message },
      { status: 500 }
    );
  }
}

