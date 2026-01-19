import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import { handleApiError, validatePaginationParams, normalizePaginationParams } from '@/lib/apiErrorHandler';

export async function GET(request) {
  try {
    console.log('[API] /api/books/by-language - Request received');
    await connectDB();
    console.log('[API] Database connected');

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    console.log('[API] Query params:', { language, limit });

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
    let searchLanguageVariants = [];

    // Find all variants for the requested language
    for (const [code, variants] of Object.entries(languageMap)) {
      if (variants.includes(normalizedLanguage)) {
        searchLanguageVariants = variants;
        break;
      }
    }

    // If not found in map, use the provided language as-is
    if (searchLanguageVariants.length === 0) {
      searchLanguageVariants = [normalizedLanguage];
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Fetch books by language - search for all variants (case-insensitive)
    // Escape special regex characters in variants
    const escapedVariants = searchLanguageVariants.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const languageRegex = new RegExp(`^(${escapedVariants.join('|')})$`, 'i');
    const books = await Book.find({
      bookLanguage: { $regex: languageRegex },
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

    console.log('[API] Successfully fetched', booksWithCounts.length, 'books');
    return NextResponse.json(
      {
        books: booksWithCounts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error in /api/books/by-language:', error);
    return handleApiError(error, 'fetch books by language');
  }
}

