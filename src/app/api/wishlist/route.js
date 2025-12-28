import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Wishlist from '@/models/Wishlist';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import User from '@/models/User';
import { handleApiError, validateObjectId, validateRequiredFields } from '@/lib/apiErrorHandler';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const idError = validateObjectId(userId, 'User ID');
    if (idError) {
      return idError;
    }

    const wishlists = await Wishlist.find({ user: userId })
      .populate({
        path: 'book',
        select: 'title author coverImage rating ratingCount isbn pages description category tags publishedDate',
        populate: {
          path: 'category',
          select: 'name slug icon'
        }
      })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    // Filter out wishlist items where book is null (book might have been deleted)
    const validWishlists = wishlists.filter(item => item.book && item.book._id);

    // Get availability counts for each book
    const wishlistsWithAvailability = await Promise.all(
      validWishlists.map(async (item) => {
        if (!item.book || !item.book._id) {
          // If book is missing, delete the wishlist entry
          await Wishlist.findByIdAndDelete(item._id);
          return null;
        }

        try {
          const availableCopies = await BookCopy.countDocuments({
            book: item.book._id,
            status: 'available',
            isActive: true,
          });
          const totalCopies = await BookCopy.countDocuments({
            book: item.book._id,
            isActive: true,
          });

          return {
            ...item,
            book: {
              ...item.book,
              availableCopies,
              totalCopies,
            },
          };
        } catch (error) {
          console.error('Error getting availability for book:', item.book._id, error);
          // Return item with default availability
          return {
            ...item,
            book: {
              ...item.book,
              availableCopies: 0,
              totalCopies: 0,
            },
          };
        }
      })
    );

    // Filter out any null items
    const filteredWishlists = wishlistsWithAvailability.filter(item => item !== null);

    return NextResponse.json({ wishlists: filteredWishlists }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'fetch wishlist');
  }
}

export async function POST(request) {
  try {
    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userId, bookId } = body;

    const validation = validateRequiredFields(body, ['userId', 'bookId']);
    if (validation) {
      return validation;
    }

    const userIdError = validateObjectId(userId, 'User ID');
    if (userIdError) {
      return userIdError;
    }

    const bookIdError = validateObjectId(bookId, 'Book ID');
    if (bookIdError) {
      return bookIdError;
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check if already in wishlist
    const existingWishlist = await Wishlist.findOne({
      user: userId,
      book: bookId,
    });

    if (existingWishlist) {
      return NextResponse.json(
        { error: 'Book already in wishlist' },
        { status: 409 }
      );
    }

    // Add to wishlist
    const wishlist = new Wishlist({
      user: userId,
      book: bookId,
    });

    await wishlist.save();
    await wishlist.populate('book', '-__v');

    return NextResponse.json(
      { message: 'Book added to wishlist', wishlist },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Book already in wishlist' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'add to wishlist');
  }
}

export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const bookId = searchParams.get('bookId');

    if (!userId || !bookId) {
      return NextResponse.json(
        { error: 'User ID and Book ID are required' },
        { status: 400 }
      );
    }

    const userIdError = validateObjectId(userId, 'User ID');
    if (userIdError) {
      return userIdError;
    }

    const bookIdError = validateObjectId(bookId, 'Book ID');
    if (bookIdError) {
      return bookIdError;
    }

    const wishlist = await Wishlist.findOneAndDelete({
      user: userId,
      book: bookId,
    });

    if (!wishlist) {
      return NextResponse.json(
        { error: 'Book not found in wishlist' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Book removed from wishlist' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'remove from wishlist');
  }
}

