import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import { BORROWING_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

// GET - Get member's borrowings with stats
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { memberId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      );
    }

    const query = { member: memberId };
    if (status) {
      query.status = status;
    }

    const borrowings = await Borrowing.find(query)
      .populate('book', 'title author coverImage')
      .populate('bookCopy', 'copyNumber barcode')
      .sort({ borrowedDate: -1 })
      .select('-__v')
      .lean();

    // Get stats
    const activeCount = await Borrowing.countDocuments({
      member: memberId,
      status: BORROWING_STATUS.ACTIVE,
    });

    const overdueCount = await Borrowing.countDocuments({
      member: memberId,
      status: BORROWING_STATUS.OVERDUE,
    });

    const returnedCount = await Borrowing.countDocuments({
      member: memberId,
      status: BORROWING_STATUS.RETURNED,
    });

    // Calculate days remaining for active borrowings
    const borrowingsWithDays = borrowings.map((borrowing) => {
      let daysRemaining = 0;
      let daysOverdue = 0;

      if (borrowing.status === BORROWING_STATUS.ACTIVE && borrowing.dueDate) {
        const now = new Date();
        const dueDate = new Date(borrowing.dueDate);
        const diffTime = dueDate - now;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) daysRemaining = 0;
      }

      if (borrowing.status === BORROWING_STATUS.OVERDUE && borrowing.dueDate) {
        const now = new Date();
        const dueDate = new Date(borrowing.dueDate);
        const diffTime = now - dueDate;
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...borrowing,
        daysRemaining,
        daysOverdue,
      };
    });

    return NextResponse.json({
      borrowings: borrowingsWithDays,
      stats: {
        active: activeCount,
        overdue: overdueCount,
        returned: returnedCount,
        total: borrowings.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member borrowings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member borrowings', details: error.message },
      { status: 500 }
    );
  }
}

