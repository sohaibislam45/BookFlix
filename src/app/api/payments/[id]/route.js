import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { PAYMENT_STATUS } from '@/lib/constants';
import { handleApiError, validateObjectId } from '@/lib/apiErrorHandler';
import mongoose from 'mongoose';

// GET - Get single payment by ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Payment ID');
    if (idError) {
      return idError;
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
    return handleApiError(error, 'fetch payment');
  }
}

