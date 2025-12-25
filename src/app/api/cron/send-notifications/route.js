import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Reservation from '@/models/Reservation';
import { BORROWING_STATUS, RESERVATION_STATUS, NOTIFICATION_TYPES } from '@/lib/constants';
import { notifyUser } from '@/lib/notifications';

// This route can be called by cron services (Vercel Cron, GitHub Actions, etc.)
// Sends due date reminders (3 days before) and checks for expired reservations
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
      dueRemindersSent: 0,
      reservationExpired: 0,
      errors: 0,
    };

    // Find borrowings due in 3 days (for reminders)
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of day

    const borrowingsDueSoon = await Borrowing.find({
      status: BORROWING_STATUS.ACTIVE,
      dueDate: {
        $gte: new Date(threeDaysFromNow.getTime() - 24 * 60 * 60 * 1000), // Start of day
        $lte: threeDaysFromNow,
      },
      returnedDate: null,
    })
      .populate('member', 'name email')
      .populate('book', 'title author')
      .lean();

    // Send due date reminders
    for (const borrowing of borrowingsDueSoon) {
      try {
        const dueDate = new Date(borrowing.dueDate);
        const diffTime = dueDate - now;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Only send if exactly 3 days or less remaining
        if (daysRemaining <= 3 && daysRemaining > 0) {
          await notifyUser(
            borrowing.member._id || borrowing.member,
            NOTIFICATION_TYPES.BORROWING_DUE,
            'Book Due Soon',
            `Your borrowed book "${borrowing.book?.title}" by ${borrowing.book?.author} is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please return it on time to avoid late fees.`,
            {
              borrowing: borrowing._id,
              book: borrowing.book?._id,
              data: {
                daysRemaining,
                dueDate: borrowing.dueDate,
                bookTitle: borrowing.book?.title,
                bookAuthor: borrowing.book?.author,
              },
            },
            true // Send email
          );
          stats.dueRemindersSent++;
        }
      } catch (error) {
        console.error(`Error sending due reminder for borrowing ${borrowing._id}:`, error);
        stats.errors++;
      }
    }

    // Find expired reservations
    const expiredReservations = await Reservation.find({
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
      expiryDate: { $lt: now },
    })
      .populate('member', 'name email')
      .populate('book', 'title author')
      .lean();

    // Mark expired and send notifications
    for (const reservation of expiredReservations) {
      try {
        // Update reservation status
        await Reservation.findByIdAndUpdate(reservation._id, {
          status: RESERVATION_STATUS.EXPIRED,
        });

        // Send expiration notification
        await notifyUser(
          reservation.member._id || reservation.member,
          NOTIFICATION_TYPES.RESERVATION_EXPIRED,
          'Reservation Expired',
          `Your reservation for "${reservation.book?.title}" by ${reservation.book?.author} has expired. The book has been made available to the next person in the queue.`,
          {
            reservation: reservation._id,
            book: reservation.book?._id,
            data: {
              bookTitle: reservation.book?.title,
              bookAuthor: reservation.book?.author,
            },
          },
          true // Send email
        );

        // Update queue positions for the book
        await Reservation.updateQueuePositions(reservation.book?._id);

        stats.reservationExpired++;
      } catch (error) {
        console.error(`Error processing expired reservation ${reservation._id}:`, error);
        stats.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification cron completed',
      stats,
      timestamp: now.toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Error in notification cron:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}

