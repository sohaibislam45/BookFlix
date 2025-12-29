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

    // Debug: Log the query being used
    console.log(`[Payments API] Query:`, JSON.stringify(query));
    console.log(`[Payments API] Query member field type:`, typeof query.member, query.member);

    // Find payments - don't filter by fine to include subscription payments
    // This includes both fine payments (with fine field) and subscription payments (fine: null)
    const payments = await Payment.find(query)
      .populate('member', 'name email')
      .populate({
        path: 'fine',
        options: { strictPopulate: false }, // Allow null fines (for subscription payments)
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
      .select('-__v');
    
    console.log(`[Payments API] Found ${payments.length} payments for query:`, JSON.stringify(query));
    
    // Debug: Log payment details
    if (payments.length > 0) {
      console.log(`[Payments API] Sample payment:`, {
        id: payments[0]._id,
        member: payments[0].member?._id || payments[0].member,
        fine: payments[0].fine,
        amount: payments[0].amount,
        hasMetadata: !!payments[0].metadata,
      });
    } else {
      // If no payments found, check if there are any payments for this member at all
      const allPaymentsForMember = await Payment.find({ member: query.member }).countDocuments();
      console.log(`[Payments API] Total payments for member ${query.member}: ${allPaymentsForMember}`);
    }
    
    // Convert to plain objects and handle metadata Map
    const paymentsWithMetadata = payments.map(payment => {
      const paymentObj = payment.toObject ? payment.toObject() : payment;
      
      // Convert metadata Map to plain object if needed
      if (paymentObj.metadata) {
        if (paymentObj.metadata instanceof Map) {
          paymentObj.metadata = Object.fromEntries(paymentObj.metadata);
        } else if (paymentObj.metadata.constructor && paymentObj.metadata.constructor.name === 'Object') {
          // Already a plain object, no conversion needed
        } else {
          // Handle Mongoose Map-like object - convert to plain object
          const metadataObj = {};
          if (paymentObj.metadata.get && typeof paymentObj.metadata.get === 'function') {
            // It's a Map-like object with get method
            if (paymentObj.metadata.keys && typeof paymentObj.metadata.keys === 'function') {
              for (const key of paymentObj.metadata.keys()) {
                metadataObj[key] = paymentObj.metadata.get(key);
              }
            }
          } else {
            // Try to convert directly - iterate over properties
            for (const key in paymentObj.metadata) {
              if (paymentObj.metadata.hasOwnProperty(key)) {
                metadataObj[key] = paymentObj.metadata[key];
              }
            }
          }
          paymentObj.metadata = metadataObj;
        }
      }
      
      return paymentObj;
    });
    
    console.log(`[Payments API] Returning ${paymentsWithMetadata.length} payments for member ${memberId || 'all'}`);
    
    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      payments: paymentsWithMetadata,
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

