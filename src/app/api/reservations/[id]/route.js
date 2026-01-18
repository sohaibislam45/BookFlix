import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reservation from '@/models/Reservation';
import BookCopy from '@/models/BookCopy';
import Borrowing from '@/models/Borrowing';
import { RESERVATION_STATUS, BOOK_STATUS, BORROWING_STATUS, BORROWING_RULES, NOTIFICATION_TYPES } from '@/lib/constants';
import { notifyUser } from '@/lib/notifications';
import { handleApiError, validateObjectId, validateRequiredFields } from '@/lib/apiErrorHandler';

// GET - Get a specific reservation
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const idError = validateObjectId(id, 'Reservation ID');
    if (idError) {
      return idError;
    }

    const reservation = await Reservation.findById(id)
      .populate('member', 'name email profilePhoto')
      .populate('book', 'title author coverImage')
      .select('-__v')
      .lean();

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'fetch reservation');
  }
}

// PATCH - Update reservation (cancel, mark ready, complete)
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    
    const idError = validateObjectId(id, 'Reservation ID');
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

    const { action, bookCopyId, returnedBy } = body;

    // Validate required action field
    const validation = validateRequiredFields(body, ['action']);
    if (validation) {
      return validation;
    }

    // Validate action value
    if (!['cancel', 'markReady', 'complete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "cancel", "markReady", or "complete"' },
        { status: 400 }
      );
    }

    // Validate bookCopyId ObjectId if provided
    if (bookCopyId) {
      const bookCopyIdError = validateObjectId(bookCopyId, 'Book Copy ID');
      if (bookCopyIdError) {
        return bookCopyIdError;
      }
    }

    // Validate returnedBy ObjectId if provided
    if (returnedBy) {
      const returnedByError = validateObjectId(returnedBy, 'Returned By User ID');
      if (returnedByError) {
        return returnedByError;
      }
    }

    const reservation = await Reservation.findById(id)
      .populate('member', 'name email subscription')
      .populate('book', 'title author coverImage');

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'cancel': {
        if (reservation.status === RESERVATION_STATUS.COMPLETED) {
          return NextResponse.json(
            { error: 'Cannot cancel a completed reservation' },
            { status: 400 }
          );
        }

        reservation.status = RESERVATION_STATUS.CANCELLED;
        reservation.cancelledDate = new Date();
        if (returnedBy) {
          reservation.cancelledBy = returnedBy;
        }
        await reservation.save();

        return NextResponse.json(
          { message: 'Reservation cancelled successfully', reservation },
          { status: 200 }
        );
      }

      case 'markReady': {
        if (reservation.status !== RESERVATION_STATUS.PENDING) {
          return NextResponse.json(
            { error: 'Only pending reservations can be marked as ready' },
            { status: 400 }
          );
        }

        // Find an available book copy
        let bookCopy;
        if (bookCopyId) {
          bookCopy = await BookCopy.findById(bookCopyId);
          if (!bookCopy || bookCopy.book.toString() !== reservation.book._id.toString()) {
            return NextResponse.json(
              { error: 'Invalid book copy' },
              { status: 400 }
            );
          }
        } else {
          // Auto-find an available copy
          bookCopy = await BookCopy.findOne({
            book: reservation.book._id,
            status: BOOK_STATUS.AVAILABLE,
            isActive: true,
          });
        }

        if (!bookCopy) {
          return NextResponse.json(
            { error: 'No available copy found for this book' },
            { status: 404 }
          );
        }

        if (bookCopy.status !== BOOK_STATUS.AVAILABLE) {
          return NextResponse.json(
            { error: 'Book copy is not available' },
            { status: 400 }
          );
        }

        // Mark book copy as reserved
        bookCopy.status = BOOK_STATUS.RESERVED;
        await bookCopy.save();

        // Update reservation
        reservation.status = RESERVATION_STATUS.READY;
        reservation.readyDate = new Date();
        // Extend expiry date by 3 days from ready date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3);
        reservation.expiryDate = expiryDate;
        await reservation.save();

        // Send reservation ready notification
        notifyUser(
          reservation.member._id || reservation.member,
          NOTIFICATION_TYPES.RESERVATION_READY,
          'Book Ready for Pickup',
          `Your reserved book "${reservation.book.title}" by ${reservation.book.author} is now ready for pickup. You have 3 days to pick it up before the reservation expires.`,
          {
            reservation: reservation._id,
            book: reservation.book._id,
            data: {
              expiryDate: expiryDate,
              bookTitle: reservation.book.title,
              bookAuthor: reservation.book.author,
            },
          },
          true // Send email
        ).catch(err => console.error('Error sending reservation ready notification:', err));

        return NextResponse.json(
          { message: 'Reservation marked as ready', reservation },
          { status: 200 }
        );
      }

      case 'complete': {
        if (reservation.status !== RESERVATION_STATUS.READY) {
          return NextResponse.json(
            { error: 'Only ready reservations can be completed' },
            { status: 400 }
          );
        }

        // Find the reserved book copy
        const bookCopy = await BookCopy.findOne({
          book: reservation.book._id,
          status: BOOK_STATUS.RESERVED,
        });

        if (!bookCopy) {
          return NextResponse.json(
            { error: 'Reserved book copy not found' },
            { status: 404 }
          );
        }

        // Check if member can borrow more books
        const subscriptionType = reservation.member.subscription?.type || 'free';
        const rules = subscriptionType === 'monthly' || subscriptionType === 'yearly' 
          ? BORROWING_RULES.PREMIUM 
          : BORROWING_RULES.GENERAL;
        
        const activeBorrowings = await Borrowing.countDocuments({
          member: reservation.member._id,
          status: BORROWING_STATUS.ACTIVE,
        });

        if (activeBorrowings >= rules.MAX_BOOKS) {
          return NextResponse.json(
            {
              error: `Borrowing limit reached. You can borrow up to ${rules.MAX_BOOKS} book(s) at a time.`,
              limit: rules.MAX_BOOKS,
            },
            { status: 403 }
          );
        }

        // Calculate due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + rules.MAX_DAYS);

        // Create borrowing
        const borrowing = new Borrowing({
          member: reservation.member._id,
          bookCopy: bookCopy._id,
          book: reservation.book._id,
          borrowedDate: new Date(),
          dueDate,
          status: BORROWING_STATUS.ACTIVE,
        });

        await borrowing.save();

        // Update book copy status
        bookCopy.status = BOOK_STATUS.BORROWED;
        await bookCopy.save();

        // Mark reservation as completed
        reservation.status = RESERVATION_STATUS.COMPLETED;
        reservation.completedDate = new Date();
        await reservation.save();

        // Populate borrowing for response
        await borrowing.populate('member', 'name email profilePhoto');
        await borrowing.populate('book', 'title author coverImage');
        await borrowing.populate('bookCopy', 'copyNumber barcode');

        return NextResponse.json(
          {
            message: 'Reservation completed and book borrowed successfully',
            reservation,
            borrowing,
          },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cancel, markReady, or complete' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error, 'update reservation');
  }
}

