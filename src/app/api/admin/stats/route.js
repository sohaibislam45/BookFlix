import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BookCopy from '@/models/BookCopy';
import { handleApiError } from '@/lib/apiErrorHandler';
import { BOOK_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    // Get total inventory (all active copies)
    const totalCopies = await BookCopy.countDocuments({
      isActive: true,
    });

    // Get borrowed copies (copies with status 'borrowed')
    const borrowedCopies = await BookCopy.countDocuments({
      isActive: true,
      status: BOOK_STATUS.BORROWED,
    });

    // Get available copies (copies with status 'available')
    const availableCopies = await BookCopy.countDocuments({
      isActive: true,
      status: BOOK_STATUS.AVAILABLE,
    });

    // Get low stock books (books with 3 or fewer available copies)
    // Use aggregation to count available copies per book more efficiently
    const lowStockBooks = await BookCopy.aggregate([
      {
        $match: {
          isActive: true,
          status: BOOK_STATUS.AVAILABLE,
        },
      },
      {
        $group: {
          _id: '$book',
          availableCount: { $sum: 1 },
        },
      },
      {
        $match: {
          availableCount: { $gt: 0, $lte: 3 },
        },
      },
      {
        $count: 'lowStockCount',
      },
    ]);

    const lowStockCount = lowStockBooks.length > 0 ? lowStockBooks[0].lowStockCount : 0;

    return NextResponse.json({
      totalCopies,
      borrowedCopies,
      availableCopies,
      lowStock: lowStockCount,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return handleApiError(error, 'fetch admin stats');
  }
}
