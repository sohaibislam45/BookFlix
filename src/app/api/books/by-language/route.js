import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import { handleApiError, validatePaginationParams, normalizePaginationParams } from '@/lib/apiErrorHandler';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    // Validate language parameter
    if (!language) {
      return NextResponse.json(
        { error: 'Language parameter is required' },
        { status: 400 }
      );
    }

    // Normalize language codes (support common variations)
    const languageMap = {
      'en': ['en', 'english', 'eng'],
      'bn': ['bn', 'bangla', 'bengali', 'ben'],
    };

    let normalizedLanguage = language.toLowerCase().trim();
    let searchLanguage = null;

    // Find the normalized language code
    for (const [code, variants] of Object.entries(languageMap)) {
      if (variants.includes(normalizedLanguage)) {
        searchLanguage = code;
        break;
      }
    }

    // If not found in map, use the provided language as-is
    if (!searchLanguage) {
      searchLanguage = normalizedLanguage;
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Fetch books by language
    const books = await Book.find({
      language: searchLanguage,
      isActive: true,
    })
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    // Get counts for each book
    const booksWithCounts = await Promise.all(
      books.map(async (book) => {
        const availableCopies = await BookCopy.countDocuments({
          book: book._id,
          status: 'available',
          isActive: true,
        });
        const totalCopies = await BookCopy.countDocuments({
          book: book._id,
          isActive: true,
        });

        return {
          ...book,
          availableCopies,
          totalCopies,
        };
      })
    );

    return NextResponse.json(
      {
        books: booksWithCounts,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'fetch books by language');
  }
}

