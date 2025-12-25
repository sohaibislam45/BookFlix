import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Fine from '@/models/Fine';
import { FINE_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// GET - Get single fine by ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid fine ID' },
        { status: 400 }
      );
    }

    const fine = await Fine.findById(id)
      .populate('member', 'name email')
      .populate('borrowing')
      .populate({
        path: 'borrowing',
        populate: {
          path: 'book',
          select: 'title author coverImage',
        },
      })
      .populate({
        path: 'borrowing',
        populate: {
          path: 'bookCopy',
          select: 'copyNumber barcode',
        },
      })
      .lean();

    if (!fine) {
      return NextResponse.json(
        { error: 'Fine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ fine }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fine:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fine', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update fine (e.g., waive fine)
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid fine ID' },
        { status: 400 }
      );
    }

    const fine = await Fine.findById(id);

    if (!fine) {
      return NextResponse.json(
        { error: 'Fine not found' },
        { status: 404 }
      );
    }

    // Only allow updating status to waived
    if (body.status === FINE_STATUS.WAIVED && fine.status === FINE_STATUS.PENDING) {
      fine.status = FINE_STATUS.WAIVED;
      fine.waivedDate = new Date();
      if (body.waivedBy) {
        fine.waivedBy = body.waivedBy;
      }
      if (body.notes) {
        fine.notes = body.notes;
      }
      await fine.save();

      await fine.populate('member', 'name email');
      await fine.populate('borrowing');

      return NextResponse.json({
        message: 'Fine waived successfully',
        fine,
      }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Invalid update operation' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating fine:', error);
    return NextResponse.json(
      { error: 'Failed to update fine', details: error.message },
      { status: 500 }
    );
  }
}

