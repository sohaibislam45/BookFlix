import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import { BOOK_STATUS } from '@/lib/constants';

export async function GET(request) {
  try {
    await connectDB();

    // Get all active books
    const allBooks = await Book.find({ isActive: true }).select('_id').lean();
    const bookIds = allBooks.map(book => book._id);

    // Get copy counts for all books in one aggregation
    const copyCounts = await BookCopy.aggregate([
      {
        $match: {
          book: { $in: bookIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$book',
          totalCopies: { $sum: 1 },
          availableCopies: {
            $sum: {
              $cond: [{ $eq: ['$status', BOOK_STATUS.AVAILABLE] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Create a map for quick lookup
    const countsMap = new Map();
    copyCounts.forEach((item) => {
      countsMap.set(item._id.toString(), {
        total: item.totalCopies,
        available: item.availableCopies,
      });
    });

    // Calculate stats
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const book of allBooks) {
      const bookIdStr = book._id.toString();
      const counts = countsMap.get(bookIdStr) || { total: 0, available: 0 };

      if (counts.total === 0 || counts.available === 0) {
        outOfStockCount++;
      } else if (counts.available <= 2) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    return NextResponse.json({
      inStock: inStockCount,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory stats', details: error.message },
      { status: 500 }
    );
  }
}

