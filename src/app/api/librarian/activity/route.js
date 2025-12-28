import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import { BORROWING_STATUS } from '@/lib/constants';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const librarianId = searchParams.get('librarianId');

    // Get recent borrowing activities that were processed by librarians
    const query = {};
    
    // If librarianId is provided, filter by processedBy (if field exists)
    // For now, we'll get all recent activities and format them
    const borrowings = await Borrowing.find(query)
      .populate('member', 'name email')
      .populate('book', 'title author coverImage isbn')
      .populate('bookCopy', 'copyNumber barcode')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    // Format activities
    const activities = borrowings.map((borrowing) => {
      let action = 'Processed';
      let type = 'checkout';
      let description = '';

      if (borrowing.status === BORROWING_STATUS.RETURNED) {
        action = 'Book Returned';
        type = 'return';
        description = `Returned "${borrowing.book?.title || 'Unknown Book'}" for ${borrowing.member?.name || 'Unknown Member'}`;
      } else if (borrowing.status === BORROWING_STATUS.ACTIVE) {
        action = 'Book Checked Out';
        type = 'checkout';
        description = `Checked out "${borrowing.book?.title || 'Unknown Book'}" to ${borrowing.member?.name || 'Unknown Member'}`;
      } else if (borrowing.status === BORROWING_STATUS.OVERDUE) {
        action = 'Overdue Notice';
        type = 'overdue';
        description = `Overdue book: "${borrowing.book?.title || 'Unknown Book'}" for ${borrowing.member?.name || 'Unknown Member'}`;
      }

      return {
        _id: borrowing._id,
        action,
        type,
        description,
        member: borrowing.member,
        book: borrowing.book,
        timestamp: borrowing.returnedDate || borrowing.borrowedDate || borrowing.updatedAt,
        status: borrowing.status,
      };
    });

    return NextResponse.json({
      activities,
      total: activities.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching librarian activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs', details: error.message },
      { status: 500 }
    );
  }
}

