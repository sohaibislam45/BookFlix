import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Fine from '@/models/Fine';
import { FINE_STATUS } from '@/lib/constants';
import { handleApiError, validatePaginationParams, normalizePaginationParams, validateObjectId, validateEnumValue } from '@/lib/apiErrorHandler';
import mongoose from 'mongoose';

// GET - List fines (with filters)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
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
    
    // Validate status if provided
    if (status) {
      const statusError = validateEnumValue(status, FINE_STATUS, 'Status');
      if (statusError) {
        return statusError;
      }
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
    return handleApiError(error, 'fetch fines');
  }
}

