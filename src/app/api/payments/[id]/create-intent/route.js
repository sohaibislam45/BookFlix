import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import { stripe } from '@/lib/stripe';
import { PAYMENT_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// POST - Create Stripe payment intent
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
      .populate('member', 'email');

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

    // Check if payment intent already exists
    if (payment.stripePaymentIntentId) {
      // Retrieve existing payment intent
      const existingIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      
      return NextResponse.json({
        message: 'Payment intent already exists',
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
      }, { status: 200 });
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(payment.amount * 100);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        paymentId: payment._id.toString(),
        fineId: payment.fine._id.toString(),
        memberId: payment.member._id.toString(),
      },
      description: `Fine payment for ${payment.fine.borrowing?.book?.title || 'book'}`,
    });

    // Update payment with Stripe payment intent ID
    payment.stripePaymentIntentId = paymentIntent.id;
    if (paymentIntent.customer) {
      payment.stripeCustomerId = paymentIntent.customer;
    }
    await payment.save();

    return NextResponse.json({
      message: 'Payment intent created successfully',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent', details: error.message },
      { status: 500 }
    );
  }
}

