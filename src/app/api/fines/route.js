import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Fine from '@/models/Fine';
import { FINE_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// GET - List fines (with filters)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const query = {};
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      query.member = memberId;
    }
    if (status && Object.values(FINE_STATUS).includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const fines = await Fine.find(query)
      .populate('member', 'name email')
      .populate('borrowing')
      .populate({
        path: 'borrowing',
        populate: {
          path: 'book',
          select: 'title author coverImage',
        },
      })
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    const total = await Fine.countDocuments(query);

    return NextResponse.json({
      fines,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fines', details: error.message },
      { status: 500 }
    );
  }
}

