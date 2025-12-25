import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Reservation from '@/models/Reservation';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import { BORROWING_STATUS, RESERVATION_STATUS } from '@/lib/constants';

export async function GET(request) {
  try {
    await connectDB();

    // Get today's date range (start and end of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's Activities (check-ins & check-outs)
    const todayCheckouts = await Borrowing.countDocuments({
      borrowedDate: { $gte: today, $lt: tomorrow },
    });

    const todayReturns = await Borrowing.countDocuments({
      returnedDate: { $gte: today, $lt: tomorrow },
    });

    const todayActivities = todayCheckouts + todayReturns;

    // Pending Returns (due today or in the future)
    const pendingReturns = await Borrowing.countDocuments({
      status: BORROWING_STATUS.ACTIVE,
      dueDate: { $gte: today },
    });

    // Returns due today
    const returnsDueToday = await Borrowing.countDocuments({
      status: BORROWING_STATUS.ACTIVE,
      dueDate: { $gte: today, $lt: tomorrow },
    });

    // Overdue Books
    const overdueBooks = await Borrowing.countDocuments({
      status: BORROWING_STATUS.OVERDUE,
    });

    // Get recently overdue (last 24 hours)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const recentlyOverdue = await Borrowing.countDocuments({
      status: BORROWING_STATUS.OVERDUE,
      dueDate: { $gte: yesterday, $lt: today },
    });

    // Recent Reservations (pending and ready)
    const recentReservations = await Reservation.countDocuments({
      status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
    });

    const reservationsAwaitingPickup = await Reservation.countDocuments({
      status: RESERVATION_STATUS.READY,
    });

    // Total catalog count
    const totalCatalog = await Book.countDocuments({ isActive: true });

    // Get recent circulation activity (last 10)
    const recentActivity = await Borrowing.find()
      .populate('member', 'name email')
      .populate('book', 'title author coverImage isbn')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    // Format activity for display
    const formattedActivity = recentActivity.map((activity) => {
      const isReturned = activity.status === BORROWING_STATUS.RETURNED;
      const isOverdue = activity.status === BORROWING_STATUS.OVERDUE;
      
      let statusText = 'Checked Out';
      let statusColor = 'emerald';
      
      if (isReturned) {
        statusText = 'Returned';
        statusColor = 'blue';
      } else if (isOverdue) {
        statusText = 'Overdue Notice';
        statusColor = 'red';
      }

      return {
        _id: activity._id,
        book: activity.book,
        member: activity.member,
        status: statusText,
        statusColor,
        processedAt: activity.returnedDate || activity.borrowedDate,
      };
    });

    // Get new members (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { default: User } = await import('@/models/User');
    const newMembers = await User.find({
      createdAt: { $gte: sevenDaysAgo },
      role: 'member',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email profilePhoto createdAt')
      .lean();

    return NextResponse.json({
      todayActivities,
      pendingReturns,
      returnsDueToday,
      overdueBooks,
      recentlyOverdue,
      recentReservations,
      reservationsAwaitingPickup,
      totalCatalog,
      recentActivity: formattedActivity,
      newMembers,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching librarian stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}

