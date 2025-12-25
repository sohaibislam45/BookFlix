import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import { stripe } from '@/lib/stripe';
import { PAYMENT_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// POST - Create Stripe Checkout session for payment
export async function POST(request, { params }) {
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
      .populate('fine')
      .populate({
        path: 'fine',
        populate: {
          path: 'borrowing',
          populate: {
            path: 'book',
            select: 'title',
          },
        },
      })
      .populate('member', 'email name');

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if payment is already completed
    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return NextResponse.json(
        { error: 'Payment has already been completed' },
        { status: 400 }
      );
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(payment.amount * 100);

    // Get the base URL from request
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Fine Payment - ${payment.fine.borrowing?.book?.title || 'Library Fine'}`,
              description: `Fine payment for overdue book`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/member/billing?payment_success=true&payment_id=${payment._id}`,
      cancel_url: `${origin}/member/billing?payment_cancelled=true`,
      metadata: {
        paymentId: payment._id.toString(),
        fineId: payment.fine._id.toString(),
        memberId: payment.member._id.toString(),
      },
      customer_email: payment.member.email,
    });

    // Update payment with Stripe session ID
    payment.stripePaymentIntentId = session.id; // Reusing this field for session ID
    await payment.save();

    return NextResponse.json({
      message: 'Checkout session created successfully',
      sessionId: session.id,
      url: session.url,
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}

