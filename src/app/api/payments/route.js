import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import { PAYMENT_STATUS, FINE_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// GET - List payments (with filters)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const fineId = searchParams.get('fineId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const query = {};
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      query.member = memberId;
    }
    if (fineId && mongoose.Types.ObjectId.isValid(fineId)) {
      query.fine = fineId;
    }
    if (status && Object.values(PAYMENT_STATUS).includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('member', 'name email')
      .populate('fine')
      .populate({
        path: 'fine',
        populate: {
          path: 'borrowing',
          populate: {
            path: 'book',
            select: 'title author',
          },
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create payment intent
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { fineId, memberId } = body;

    if (!fineId || !memberId) {
      return NextResponse.json(
        { error: 'Missing required fields: fineId, memberId' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(fineId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: 'Invalid fineId or memberId' },
        { status: 400 }
      );
    }

    // Find the fine
    const fine = await Fine.findById(fineId)
      .populate('member', 'email name');

    if (!fine) {
      return NextResponse.json(
        { error: 'Fine not found' },
        { status: 404 }
      );
    }

    // Verify member matches
    if (fine.member._id.toString() !== memberId && fine.member.toString() !== memberId) {
      return NextResponse.json(
        { error: 'Unauthorized: Fine does not belong to this member' },
        { status: 403 }
      );
    }

    // Check if fine is already paid
    if (fine.status === FINE_STATUS.PAID) {
      return NextResponse.json(
        { error: 'Fine has already been paid' },
        { status: 400 }
      );
    }

    // Check if fine is waived
    if (fine.status === FINE_STATUS.WAIVED) {
      return NextResponse.json(
        { error: 'Fine has been waived' },
        { status: 400 }
      );
    }

    // Check for existing pending payment
    const existingPayment = await Payment.findOne({
      fine: fineId,
      status: PAYMENT_STATUS.PENDING,
    });

    if (existingPayment) {
      return NextResponse.json({
        message: 'Payment intent already exists',
        payment: existingPayment,
      }, { status: 200 });
    }

    // Create payment record (will be updated when Stripe payment completes)
    const payment = new Payment({
      member: memberId,
      fine: fineId,
      amount: fine.amount,
      status: PAYMENT_STATUS.PENDING,
      paymentMethod: 'stripe',
      metadata: {
        fineId: fineId.toString(),
        memberId: memberId.toString(),
      },
    });

    await payment.save();

    return NextResponse.json({
      message: 'Payment created successfully',
      payment,
      // Note: Stripe payment intent will be created in the /api/payments/[id]/create-intent route
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    );
  }
}

