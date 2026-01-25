import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Borrowing from '@/models/Borrowing';
import Category from '@/models/Category';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET(request) {
  try {
    console.log('[API] /api/books/top-borrowed - Request received');
    await connectDB();
    console.log('[API] Database connected');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    console.log('[API] Query params:', { limit });

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Calculate date 7 days ago (this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Aggregate borrowings from the last week
    const topBorrowed = await Borrowing.aggregate([
      {
        $match: {
          borrowedDate: { $gte: oneWeekAgo },
        },
      },
      {
        $group: {
          _id: '$book',
          borrowCount: { $sum: 1 },
        },
      },
      {
        $sort: { borrowCount: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    // Get book IDs
    const bookIds = topBorrowed.map((item) => item._id);

    // Fetch book details
    const books = await Book.find({
      _id: { $in: bookIds },
      isActive: true,
    })
      .populate('category', 'name slug icon')
      .select('-__v')
      .lean();

    // Create a map of book ID to borrow count
    const borrowCountMap = {};
    topBorrowed.forEach((item) => {
      borrowCountMap[item._id.toString()] = item.borrowCount;
    });

    // Add borrow count to books and maintain order
    const booksWithCounts = bookIds
      .map((bookId) => {
        const book = books.find(
          (b) => b._id.toString() === bookId.toString()
        );
        if (!book) return null;
        return {
          ...book,
          borrowCount: borrowCountMap[bookId.toString()] || 0,
        };
      })
      .filter(Boolean);

    console.log('[API] Successfully fetched', booksWithCounts.length, 'top borrowed books');
    return NextResponse.json(
      {
        books: booksWithCounts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error in /api/books/top-borrowed:', error);
    return handleApiError(error, 'fetch top borrowed books');
  }
}

