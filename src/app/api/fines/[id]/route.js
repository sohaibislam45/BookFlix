import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Fine from '@/models/Fine';
import { FINE_STATUS } from '@/lib/constants';
import { handleApiError, validateObjectId, validateEnumValue, sanitizeInput } from '@/lib/apiErrorHandler';
import mongoose from 'mongoose';

// GET - Get single fine by ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    const idError = validateObjectId(id, 'Fine ID');
    if (idError) {
      return idError;
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
    return handleApiError(error, 'fetch fine');
  }
}

// PATCH - Update fine (e.g., waive fine)
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    
    const idError = validateObjectId(id, 'Fine ID');
    if (idError) {
      return idError;
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
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

    // Validate status if provided
    if (body.status) {
      const statusError = validateEnumValue(body.status, FINE_STATUS, 'Status');
      if (statusError) {
        return statusError;
      }
    }

    // Only allow updating status to waived
    if (body.status === FINE_STATUS.WAIVED && fine.status === FINE_STATUS.PENDING) {
      fine.status = FINE_STATUS.WAIVED;
      fine.waivedDate = new Date();
      
      // Validate waivedBy ObjectId if provided
      if (body.waivedBy) {
        const waivedByError = validateObjectId(body.waivedBy, 'Waived By User ID');
        if (waivedByError) {
          return waivedByError;
        }
        fine.waivedBy = body.waivedBy;
      }
      
      // Validate and sanitize notes if provided
      if (body.notes) {
        if (typeof body.notes !== 'string' || body.notes.length > 500) {
          return NextResponse.json(
            { error: 'Notes must be a string with maximum 500 characters' },
            { status: 400 }
          );
        }
        fine.notes = sanitizeInput(body.notes, 500);
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
      { error: 'Invalid update operation. Only status can be updated to "waived" for pending fines.' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, 'update fine');
  }
}

