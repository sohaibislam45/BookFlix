import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import { PAYMENT_STATUS, FINE_STATUS } from '@/lib/constants';
import { handleApiError, validatePaginationParams, normalizePaginationParams, validateObjectId, validateEnumValue, validateRequiredFields } from '@/lib/apiErrorHandler';
import mongoose from 'mongoose';

// GET - List payments (with filters)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const fineId = searchParams.get('fineId');
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
    
    // Validate fineId if provided
    if (fineId) {
      const fineIdError = validateObjectId(fineId, 'Fine ID');
      if (fineIdError) {
        return fineIdError;
      }
      query.fine = fineId;
    }
    
    // Validate status if provided
    if (status) {
      const statusError = validateEnumValue(status, PAYMENT_STATUS, 'Status');
      if (statusError) {
        return statusError;
      }
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
    return handleApiError(error, 'fetch payments');
  }
}

// POST - Create payment intent
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

    const { fineId, memberId } = body;

    // Validate required fields
    const validation = validateRequiredFields(body, ['fineId', 'memberId']);
    if (validation) {
      return validation;
    }

    // Validate ObjectIds
    const fineIdError = validateObjectId(fineId, 'Fine ID');
    if (fineIdError) {
      return fineIdError;
    }

    const memberIdError = validateObjectId(memberId, 'Member ID');
    if (memberIdError) {
      return memberIdError;
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
    return handleApiError(error, 'create payment');
  }
}

