import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import Book from '@/models/Book';

export async function POST(request) {
  try {
    await dbConnect();
    const { bookId, userId, rating, comment } = await request.json();

    if (!bookId || !userId || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the review
    const review = await Review.create({
      book: bookId,
      user: userId,
      rating,
      comment,
    });

    // Update book rating
    const book = await Book.findById(bookId);
    if (book) {
      const currentRatingTotal = book.rating * book.ratingCount;
      const newRatingCount = book.ratingCount + 1;
      const newRating = (currentRatingTotal + rating) / newRatingCount;

      book.rating = newRating;
      book.ratingCount = newRatingCount;
      await book.save();
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
