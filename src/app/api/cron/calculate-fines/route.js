import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Fine from '@/models/Fine';
import { BORROWING_STATUS, FINE_STATUS, FINE_RATE, NOTIFICATION_TYPES } from '@/lib/constants';
import { notifyUser } from '@/lib/notifications';

// This route can be called by cron services (Vercel Cron, GitHub Actions, etc.)
// or can be triggered manually for testing
export async function GET(request) {
  try {
    // Optional: Add API key protection for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const now = new Date();
    const stats = {
      processed: 0,
      finesCreated: 0,
      finesUpdated: 0,
      errors: 0,
    };

    // Find all overdue borrowings
    const overdueBorrowings = await Borrowing.find({
      status: BORROWING_STATUS.OVERDUE,
      returnedDate: null, // Only for borrowings that haven't been returned
    })
      .populate('member')
      .lean();

    for (const borrowing of overdueBorrowings) {
      try {
        stats.processed++;

        // Calculate days overdue
        const dueDate = new Date(borrowing.dueDate);
        const diffTime = now - dueDate;
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
          continue; // Skip if not actually overdue
        }

        // Calculate fine amount (FINE_RATE per day)
        const fineAmount = daysOverdue * FINE_RATE;

        // Check if fine already exists for this borrowing
        const existingFine = await Fine.findOne({
          borrowing: borrowing._id,
          status: { $in: [FINE_STATUS.PENDING] },
        });

        if (existingFine) {
          // Update existing fine if amount or days have changed
          if (existingFine.amount !== fineAmount || existingFine.daysOverdue !== daysOverdue) {
            existingFine.amount = fineAmount;
            existingFine.daysOverdue = daysOverdue;
            await existingFine.save();
            stats.finesUpdated++;
          }
        } else {
          // Create new fine
          const fine = new Fine({
            member: borrowing.member._id || borrowing.member,
            borrowing: borrowing._id,
            amount: fineAmount,
            daysOverdue,
            status: FINE_STATUS.PENDING,
            issuedDate: now,
          });

          await fine.save();
          stats.finesCreated++;

          // Populate borrowing to get book info for notification
          await fine.populate({
            path: 'borrowing',
            populate: { path: 'book', select: 'title author' },
          });

          // Send fine issued notification
          const bookTitle = fine.borrowing?.book?.title || 'Unknown Book';
          const bookAuthor = fine.borrowing?.book?.author || 'Unknown Author';
          
          notifyUser(
            fine.member._id || fine.member,
            NOTIFICATION_TYPES.FINE_ISSUED,
            'Fine Issued',
            `A fine of $${fineAmount.toFixed(2)} has been issued for the overdue book "${bookTitle}" (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue).`,
            {
              fine: fine._id,
              borrowing: borrowing._id,
              data: {
                amount: fineAmount,
                daysOverdue,
                bookTitle,
                bookAuthor,
              },
            },
            true // Send email
          ).catch(err => console.error('Error sending fine notification:', err));
        }

        // Send overdue notification (even if fine already exists)
        await borrowing.populate('book', 'title author');
        const bookTitle = borrowing.book?.title || 'Unknown Book';
        const bookAuthor = borrowing.book?.author || 'Unknown Author';
        
        notifyUser(
          borrowing.member._id || borrowing.member,
          NOTIFICATION_TYPES.BORROWING_OVERDUE,
          'Book Overdue',
          `Your borrowed book "${bookTitle}" by ${bookAuthor} is now ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Please return it as soon as possible.`,
          {
            borrowing: borrowing._id,
            book: borrowing.book?._id,
            data: {
              daysOverdue,
              dueDate: borrowing.dueDate,
              bookTitle,
              bookAuthor,
            },
          },
          true // Send email
        ).catch(err => console.error('Error sending overdue notification:', err));
      } catch (error) {
        console.error(`Error processing borrowing ${borrowing._id}:`, error);
        stats.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Fine calculation completed',
      stats,
      timestamp: now.toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Error in fine calculation cron:', error);
    return NextResponse.json(
      { error: 'Failed to calculate fines', details: error.message },
      { status: 500 }
    );
  }
}

