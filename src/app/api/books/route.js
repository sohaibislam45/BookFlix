import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Book from "@/models/Book";
import BookCopy from "@/models/BookCopy";
import Category from "@/models/Category";
import {
  handleApiError,
  validateRequiredFields,
  validatePaginationParams,
  normalizePaginationParams,
  validateObjectId,
  sanitizeInput,
} from "@/lib/apiErrorHandler";
import { isValidISBN, validateStringLength } from "@/lib/validation";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // Validate and normalize pagination
    const pagination = normalizePaginationParams(searchParams, {
      page: 1,
      limit: 12,
    });
    const paginationError = validatePaginationParams(pagination, 100);
    if (paginationError) {
      return paginationError;
    }

    const { page, limit } = pagination;
    const search = sanitizeInput(searchParams.get("search") || "", 200);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const availability = searchParams.get("availability") || "all";
    const language = searchParams.get("language") || "all";

    // Validate sort field
    const allowedSortFields = [
      "createdAt",
      "title",
      "author",
      "rating",
      "publishedDate",
    ];
    if (!allowedSortFields.includes(sort)) {
      return NextResponse.json(
        {
          error: `Invalid sort field. Must be one of: ${allowedSortFields.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate order
    if (!["asc", "desc"].includes(order)) {
      return NextResponse.json(
        { error: 'Invalid order. Must be "asc" or "desc"' },
        { status: 400 },
      );
    }

    // Validate category ObjectId if provided
    if (category) {
      const categoryError = validateObjectId(category, "Category");
      if (categoryError) {
        return categoryError;
      }
    }

    const query = { isActive: true };

    // Search query
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Language filter
    if (language && language !== "all") {
      query.bookLanguage = language;
    }

    // Build sort object
    const sortObj = {};
    if (sort === "rating") {
      sortObj.rating = order === "asc" ? 1 : -1;
      sortObj.ratingCount = -1; // Secondary sort by rating count
    } else {
      sortObj[sort] = order === "asc" ? 1 : -1;
    }

    // Get all books matching the query (without pagination) to filter by availability
    const allBooks = await Book.find(query)
      .populate("category", "name slug icon")
      .sort(sortObj)
      .select("-__v")
      .lean();

    // Get counts for each book
    const booksWithCounts = await Promise.all(
      allBooks.map(async (book) => {
        const availableCopies = await BookCopy.countDocuments({
          book: book._id,
          status: "available",
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
      }),
    );

    // Filter by availability if specified
    let filteredBooks = booksWithCounts;
    if (availability === "available") {
      filteredBooks = booksWithCounts.filter(
        (book) => book.availableCopies > 0,
      );
    } else if (availability === "waitlist") {
      filteredBooks = booksWithCounts.filter(
        (book) => book.availableCopies === 0,
      );
    }

    // Get total count after availability filter
    const total = filteredBooks.length;

    // Apply pagination to filtered results
    const skip = (page - 1) * limit;
    const paginatedBooks = filteredBooks.slice(skip, skip + limit);

    return NextResponse.json(
      {
        books: paginatedBooks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error, "fetch books");
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
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

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
      bookLanguage,
      pages,
      tags,
      copies = 1, // Number of copies to create
    } = body;

    // Validate required fields
    const validation = validateRequiredFields(body, [
      "title",
      "author",
      "coverImage",
      "category",
    ]);
    if (validation) {
      return validation;
    }

    // Validate and sanitize title
    const titleSanitized = sanitizeInput(title, 500);
    if (!titleSanitized || titleSanitized.length < 1) {
      return NextResponse.json(
        { error: "Title is required and must be at least 1 character" },
        { status: 400 },
      );
    }

    // Validate and sanitize author
    const authorSanitized = sanitizeInput(author, 200);
    if (!authorSanitized || authorSanitized.length < 1) {
      return NextResponse.json(
        { error: "Author is required and must be at least 1 character" },
        { status: 400 },
      );
    }

    // Validate category ObjectId
    const categoryError = validateObjectId(category, "Category");
    if (categoryError) {
      return categoryError;
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Validate ISBN format if provided
    if (isbn) {
      const isbnSanitized = sanitizeInput(isbn, 20);
      if (!isValidISBN(isbnSanitized)) {
        return NextResponse.json(
          { error: "Invalid ISBN format. Must be 10 or 13 digits" },
          { status: 400 },
        );
      }

      // Check if book with same ISBN already exists
      const existingBook = await Book.findOne({ isbn: isbnSanitized });
      if (existingBook) {
        return NextResponse.json(
          { error: "Book with this ISBN already exists" },
          { status: 409 },
        );
      }
    }

    // Validate coverImage URL
    if (coverImage) {
      try {
        new URL(coverImage);
      } catch {
        return NextResponse.json(
          { error: "Invalid cover image URL" },
          { status: 400 },
        );
      }
    }

    // Validate publishedDate if provided
    if (publishedDate) {
      const date = new Date(publishedDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid published date format" },
          { status: 400 },
        );
      }
      // Check if date is not in the future
      if (date > new Date()) {
        return NextResponse.json(
          { error: "Published date cannot be in the future" },
          { status: 400 },
        );
      }
    }

    // Validate pages if provided
    if (pages !== undefined && pages !== null) {
      const pagesNum = Number(pages);
      if (isNaN(pagesNum) || pagesNum < 0 || !Number.isInteger(pagesNum)) {
        return NextResponse.json(
          { error: "Pages must be a non-negative integer" },
          { status: 400 },
        );
      }
    }

    // Validate copies
    const copiesNum = Number(copies);
    if (
      isNaN(copiesNum) ||
      copiesNum < 1 ||
      !Number.isInteger(copiesNum) ||
      copiesNum > 100
    ) {
      return NextResponse.json(
        { error: "Copies must be a positive integer between 1 and 100" },
        { status: 400 },
      );
    }

    // Validate language if provided
    if (language && typeof language !== "string") {
      return NextResponse.json(
        { error: "Language must be a string" },
        { status: 400 },
      );
    }

    // Validate tags if provided
    if (tags && !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Tags must be an array" },
        { status: 400 },
      );
    }
    if (tags && tags.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 tags allowed" },
        { status: 400 },
      );
    }

    // Validate description length
    if (description && description.length > 5000) {
      return NextResponse.json(
        { error: "Description must be no more than 5000 characters" },
        { status: 400 },
      );
    }

    // Validate publisher length
    if (publisher && publisher.length > 200) {
      return NextResponse.json(
        { error: "Publisher must be no more than 200 characters" },
        { status: 400 },
      );
    }

    // Create new book
    const book = new Book({
      title: titleSanitized,
      author: authorSanitized,
      isbn: isbn ? sanitizeInput(isbn, 20) : undefined,
      description: description ? sanitizeInput(description, 5000) : undefined,
      coverImage,
      category,
      publishedDate: publishedDate ? new Date(publishedDate) : undefined,
      publisher: publisher ? sanitizeInput(publisher, 200) : undefined,
      bookLanguage: bookLanguage || language || "en",
      pages: pages !== undefined && pages !== null ? Number(pages) : undefined,
      tags: tags
        ? tags
            .slice(0, 20)
            .map((tag) => sanitizeInput(String(tag), 50).toLowerCase())
        : [],
    });

    await book.save();

    // Create book copies
    const bookCopies = [];
    for (let i = 1; i <= copies; i++) {
      const copy = new BookCopy({
        book: book._id,
        copyNumber: `${book._id}-${i}`,
        barcode: isbn ? `${isbn}-${i}` : `${book._id}-${i}`,
        status: "available",
      });
      await copy.save();
      bookCopies.push(copy);
    }

    // Populate category in response
    await book.populate("category", "name slug icon");

    return NextResponse.json(
      {
        message: "Book created successfully",
        book,
        copies: bookCopies.length,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "create book");
  }
}
