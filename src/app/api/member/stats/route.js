import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Fine from '@/models/Fine';
import { BORROWING_STATUS, FINE_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: 'Valid memberId is required' },
        { status: 400 }
      );
    }

    // Get active borrowings
    const activeBorrowings = await Borrowing.find({
      member: memberId,
      status: BORROWING_STATUS.ACTIVE,
    })
      .populate('book', 'title author coverImage')
      .populate('bookCopy', 'copyNumber')
      .sort({ dueDate: 1 })
      .lean();

    // Get overdue borrowings
    const overdueBorrowings = await Borrowing.find({
      member: memberId,
      status: BORROWING_STATUS.OVERDUE,
    })
      .populate('book', 'title author coverImage')
      .populate('bookCopy', 'copyNumber')
      .sort({ dueDate: 1 })
      .lean();

    // Get returned borrowings for yearly goal
    const thisYear = new Date();
    thisYear.setMonth(0);
    thisYear.setDate(1);
    thisYear.setHours(0, 0, 0, 0);

    const returnedThisYear = await Borrowing.countDocuments({
      member: memberId,
      status: BORROWING_STATUS.RETURNED,
      returnedDate: { $gte: thisYear },
    });

    // Calculate outstanding fines (sum of all pending fines)
    const pendingFines = await Fine.find({
      member: memberId,
      status: FINE_STATUS.PENDING,
    }).lean();
    
    const outstandingFines = pendingFines.reduce((sum, fine) => sum + fine.amount, 0);

    // Calculate days remaining for active borrowings
    const activeWithDays = activeBorrowings.map((borrowing) => {
      const now = new Date();
      const dueDate = new Date(borrowing.dueDate);
      const diffTime = dueDate - now;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...borrowing,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      };
    });

    // Calculate days overdue for overdue borrowings
    const overdueWithDays = overdueBorrowings.map((borrowing) => {
      const now = new Date();
      const dueDate = new Date(borrowing.dueDate);
      const diffTime = now - dueDate;
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...borrowing,
        daysOverdue,
      };
    });

    // Calculate yearly goal percentage (assuming goal of 25 books)
    const yearlyGoal = 25;
    const goalPercentage = Math.round((returnedThisYear / yearlyGoal) * 100);

    return NextResponse.json({
      activeLoans: activeBorrowings.length,
      overdueLoans: overdueBorrowings.length,
      outstandingFines,
      booksReadThisYear: returnedThisYear,
      yearlyGoal,
      goalPercentage,
      activeBorrowings: activeWithDays,
      overdueBorrowings: overdueWithDays,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member stats', details: error.message },
      { status: 500 }
    );
  }
}

