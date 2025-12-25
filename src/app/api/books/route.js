import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import Category from '@/models/Category';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const query = { isActive: true };

    // Search query
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Build sort object
    const sortObj = {};
    if (sort === 'rating') {
      sortObj.rating = order === 'asc' ? 1 : -1;
      sortObj.ratingCount = -1; // Secondary sort by rating count
    } else {
      sortObj[sort] = order === 'asc' ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    // Get books with pagination
    const books = await Book.find(query)
      .populate('category', 'name slug icon')
      .sort(sortObj)
      .skip(skip)
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

    // Get total count for pagination
    const total = await Book.countDocuments(query);

    return NextResponse.json({
      books: booksWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      title,
      author,
      isbn,
      description,
      coverImage,
      category,
      publishedDate,
      publisher,
      language,
      pages,
      tags,
      copies = 1, // Number of copies to create
    } = body;

    if (!title || !author || !coverImage || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, author, coverImage, category' },
        { status: 400 }
      );
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if book with same ISBN already exists
    if (isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook) {
        return NextResponse.json(
          { error: 'Book with this ISBN already exists' },
          { status: 409 }
        );
      }
    }

    // Create new book
    const book = new Book({
      title,
      author,
      isbn,
      description,
      coverImage,
      category,
      publishedDate: publishedDate ? new Date(publishedDate) : undefined,
      publisher,
      language: language || 'en',
      pages,
      tags: tags || [],
    });

    await book.save();

    // Create book copies
    const bookCopies = [];
    for (let i = 1; i <= copies; i++) {
      const copy = new BookCopy({
        book: book._id,
        copyNumber: `${book._id}-${i}`,
        barcode: isbn ? `${isbn}-${i}` : `${book._id}-${i}`,
        status: 'available',
      });
      await copy.save();
      bookCopies.push(copy);
    }

    // Populate category in response
    await book.populate('category', 'name slug icon');

    return NextResponse.json(
      {
        message: 'Book created successfully',
        book,
        copies: bookCopies.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book', details: error.message },
      { status: 500 }
    );
  }
}

