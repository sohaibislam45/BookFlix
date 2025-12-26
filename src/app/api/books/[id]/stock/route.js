import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import { handleApiError, validateObjectId } from '@/lib/apiErrorHandler';
import { BOOK_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Book ID');
    if (idError) {
      return idError;
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { copies } = body;

    if (copies === undefined || copies === null) {
      return NextResponse.json(
        { error: 'Copies count is required' },
        { status: 400 }
      );
    }

    const copiesNum = Number(copies);
    if (isNaN(copiesNum) || copiesNum < 0 || !Number.isInteger(copiesNum) || copiesNum > 1000) {
      return NextResponse.json(
        { error: 'Copies must be a non-negative integer between 0 and 1000' },
        { status: 400 }
      );
    }

    // Check if book exists
    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Get current active copies count
    const currentCopies = await BookCopy.countDocuments({
      book: id,
      isActive: true,
    });

    const difference = copiesNum - currentCopies;

    if (difference > 0) {
      // Need to add copies
      const bookData = await Book.findById(id).lean();
      const newCopies = [];
      
      for (let i = 1; i <= difference; i++) {
        const copyNumber = `${book._id}-${currentCopies + i}`;
        const barcode = bookData.isbn ? `${bookData.isbn}-${currentCopies + i}` : `${book._id}-${currentCopies + i}`;
        
        const copy = new BookCopy({
          book: id,
          copyNumber,
          barcode,
          status: BOOK_STATUS.AVAILABLE,
          isActive: true,
        });
        await copy.save();
        newCopies.push(copy);
      }
    } else if (difference < 0) {
      // Need to remove copies (soft delete)
      const copiesToRemove = Math.abs(difference);
      const copiesToDeactivate = await BookCopy.find({
        book: id,
        isActive: true,
        status: BOOK_STATUS.AVAILABLE, // Only remove available copies
      })
        .limit(copiesToRemove)
        .sort({ createdAt: 1 }); // Remove oldest copies first

      if (copiesToDeactivate.length < copiesToRemove) {
        return NextResponse.json(
          { error: `Cannot remove ${copiesToRemove} copies. Only ${copiesToDeactivate.length} available copies can be removed.` },
          { status: 400 }
        );
      }

      await BookCopy.updateMany(
        { _id: { $in: copiesToDeactivate.map(c => c._id) } },
        { isActive: false }
      );
    }

    // Get updated counts
    const availableCopies = await BookCopy.countDocuments({
      book: id,
      status: BOOK_STATUS.AVAILABLE,
      isActive: true,
    });
    const totalCopies = await BookCopy.countDocuments({
      book: id,
      isActive: true,
    });

    return NextResponse.json(
      {
        message: 'Stock updated successfully',
        totalCopies,
        availableCopies,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating stock:', error);
    return handleApiError(error, 'update stock');
  }
}

