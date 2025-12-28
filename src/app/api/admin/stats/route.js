import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Payment from '@/models/Payment';
import Fine from '@/models/Fine';
import Borrowing from '@/models/Borrowing';
import Reservation from '@/models/Reservation';
import BookCopy from '@/models/BookCopy';
import Book from '@/models/Book';
import { handleApiError } from '@/lib/apiErrorHandler';
import { USER_ROLES, PAYMENT_STATUS, SUBSCRIPTION_PRICE, BOOK_STATUS, BORROWING_STATUS, RESERVATION_STATUS, FINE_STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    // Calculate Total Revenue
    // Revenue from completed payments (fines)
    const fineRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const fineRevenue = fineRevenueResult.length > 0 ? fineRevenueResult[0].total : 0;

    // Revenue from active subscriptions (monthly recurring)
    const activeSubscriptions = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      'subscription.type': { $in: ['monthly', 'yearly'] },
      'subscription.status': 'active',
    });

    // Calculate subscription revenue (monthly subscriptions * price)
    // For yearly subscriptions, divide by 12 to get monthly equivalent
    const monthlySubscriptions = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      'subscription.type': 'monthly',
      'subscription.status': 'active',
    });

    const yearlySubscriptions = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      'subscription.type': 'yearly',
      'subscription.status': 'active',
    });

    // Yearly subscription price is typically 12 * monthly, so monthly equivalent is yearly price / 12
    const subscriptionRevenue = (monthlySubscriptions * SUBSCRIPTION_PRICE) + 
                                (yearlySubscriptions * (SUBSCRIPTION_PRICE * 12) / 12);

    const totalRevenue = fineRevenue + subscriptionRevenue;

    // Calculate revenue growth (compare this month vs last month)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthRevenue = await Payment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.COMPLETED,
          completedDate: { $gte: thisMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const lastMonthRevenue = await Payment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.COMPLETED,
          completedDate: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const thisMonthTotal = (thisMonthRevenue.length > 0 ? thisMonthRevenue[0].total : 0) + subscriptionRevenue;
    const lastMonthTotal = (lastMonthRevenue.length > 0 ? lastMonthRevenue[0].total : 0) + subscriptionRevenue;

    const revenueGrowth = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    // Active Members (members who are active and not suspended)
    const activeMembers = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      isActive: true,
      $or: [
        { suspendedUntil: null },
        { suspendedUntil: { $lt: new Date() } },
      ],
    });

    // New Members This Month
    const newMembersThisMonth = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      createdAt: { $gte: thisMonthStart },
    });

    // Premium Users
    const premiumUsers = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      'subscription.type': { $in: ['monthly', 'yearly'] },
      'subscription.status': 'active',
    });

    const premiumPercentage = activeMembers > 0 
      ? (premiumUsers / activeMembers) * 100 
      : 0;

    // Book Statistics
    // Count unique books (titles) for total inventory
    const totalUniqueBooks = await Book.countDocuments({ isActive: true });
    // Count total copies for reference
    const totalBookCopies = await BookCopy.countDocuments({ isActive: true });
    
    // Count unique books that have borrowed copies
    const borrowedBooksResult = await BookCopy.aggregate([
      {
        $match: {
          isActive: true,
          status: BOOK_STATUS.BORROWED,
        },
      },
      {
        $group: {
          _id: '$book',
        },
      },
      {
        $count: 'count',
      },
    ]);
    const borrowedBooks = borrowedBooksResult.length > 0 ? borrowedBooksResult[0].count : 0;
    
    // Count unique books that have available copies
    const availableBooksResult = await BookCopy.aggregate([
      {
        $match: {
          isActive: true,
          status: BOOK_STATUS.AVAILABLE,
        },
      },
      {
        $group: {
          _id: '$book',
        },
      },
      {
        $count: 'count',
      },
    ]);
    const availableBooks = availableBooksResult.length > 0 ? availableBooksResult[0].count : 0;
    
    // Count books with low stock (3 or fewer available copies)
    // Use aggregation to count available copies per book and filter for low stock
    const lowStockBooksResult = await BookCopy.aggregate([
      {
        $match: {
          isActive: true,
          status: BOOK_STATUS.AVAILABLE,
        },
      },
      {
        $group: {
          _id: '$book',
          availableCount: { $sum: 1 },
        },
      },
      {
        $match: {
          availableCount: { $lte: 3, $gt: 0 },
        },
      },
      {
        $count: 'count',
      },
    ]);
    const lowStockBooks = lowStockBooksResult.length > 0 ? lowStockBooksResult[0].count : 0;

    // Count unique books with overdue borrowings
    const overdueBooksResult = await Borrowing.aggregate([
      {
        $match: {
          status: BORROWING_STATUS.OVERDUE,
        },
      },
      {
        $group: {
          _id: '$book',
        },
      },
      {
        $count: 'count',
      },
    ]);
    const overdueBooks = overdueBooksResult.length > 0 ? overdueBooksResult[0].count : 0;

    // Active Borrowings (currently borrowed books that are not overdue)
    const activeBorrowings = await Borrowing.countDocuments({
      status: BORROWING_STATUS.ACTIVE,
    });

    // Books Due Today (only active borrowings, as overdue books have past due dates)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const booksDueToday = await Borrowing.countDocuments({
      dueDate: { $gte: todayStart, $lte: todayEnd },
      status: BORROWING_STATUS.ACTIVE,
    });

    // Count unique books with pending reservations
    const pendingReservationsResult = await Reservation.aggregate([
      {
        $match: {
          status: { $in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] },
        },
      },
      {
        $group: {
          _id: '$book',
        },
      },
      {
        $count: 'count',
      },
    ]);
    const pendingReservations = pendingReservationsResult.length > 0 ? pendingReservationsResult[0].count : 0;

    // Pending Fines (unpaid fines)
    const pendingFines = await Fine.countDocuments({
      status: FINE_STATUS.PENDING,
    });

    // Monthly Revenue (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthPayments = await Payment.aggregate([
        {
          $match: {
            status: PAYMENT_STATUS.COMPLETED,
            completedDate: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const monthTotal = (monthPayments.length > 0 ? monthPayments[0].total : 0) + subscriptionRevenue;
      
      monthlyRevenue.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        total: monthTotal,
      });
    }

    // Revenue Breakdown
    const revenueBreakdown = [
      {
        type: 'subscription',
        percentage: totalRevenue > 0 ? (subscriptionRevenue / totalRevenue) * 100 : 0,
      },
      {
        type: 'fine',
        percentage: totalRevenue > 0 ? (fineRevenue / totalRevenue) * 100 : 0,
      },
    ];

    // Recent Activity - Fetch multiple activity types
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Fetch recent borrowings
    const recentBorrowings = await Borrowing.find({
      borrowedDate: { $gte: sevenDaysAgo },
    })
      .populate('member', 'name email profilePhoto')
      .populate('book', 'title')
      .sort({ borrowedDate: -1 })
      .limit(20)
      .lean()
      .then(borrowings => borrowings.map(b => ({
        _id: b._id,
        type: 'borrowing',
        member: b.member?.name || 'Unknown',
        memberEmail: b.member?.email || '',
        memberPhoto: b.member?.profilePhoto || null,
        bookTitle: b.book?.title || 'Unknown Book',
        status: b.status,
        createdAt: b.borrowedDate || b.createdAt,
        dueDate: b.dueDate,
        returnedDate: b.returnedDate,
      })));

    // Fetch recent payments
    const recentPayments = await Payment.find({
      createdAt: { $gte: sevenDaysAgo },
    })
      .populate('member', 'name email profilePhoto')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .then(payments => payments.map(p => ({
        _id: p._id,
        type: 'payment',
        member: p.member?.name || 'Unknown',
        memberEmail: p.member?.email || '',
        memberPhoto: p.member?.profilePhoto || null,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt,
        completedDate: p.completedDate,
      })));

    // Fetch recent reservations
    const recentReservations = await Reservation.find({
      reservedDate: { $gte: sevenDaysAgo },
    })
      .populate('member', 'name email profilePhoto')
      .populate('book', 'title')
      .sort({ reservedDate: -1 })
      .limit(20)
      .lean()
      .then(reservations => reservations.map(r => ({
        _id: r._id,
        type: 'reservation',
        member: r.member?.name || 'Unknown',
        memberEmail: r.member?.email || '',
        memberPhoto: r.member?.profilePhoto || null,
        bookTitle: r.book?.title || 'Unknown Book',
        status: r.status,
        createdAt: r.reservedDate || r.createdAt,
        readyDate: r.readyDate,
        completedDate: r.completedDate,
      })));

    // Fetch new members
    const newMembers = await User.find({
      role: USER_ROLES.MEMBER,
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name email profilePhoto createdAt')
      .lean()
      .then(members => members.map(m => ({
        _id: m._id,
        type: 'new_member',
        member: m.name || 'Unknown',
        memberEmail: m.email || '',
        memberPhoto: m.profilePhoto || null,
        status: 'completed',
        createdAt: m.createdAt,
      })));

    // Combine all activities and sort by date
    const allActivities = [
      ...recentBorrowings,
      ...recentPayments,
      ...recentReservations,
      ...newMembers,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      activeMembers,
      newMembersThisMonth,
      premiumUsers,
      premiumPercentage: Math.round(premiumPercentage * 100) / 100,
      activeBorrowings,
      booksDueToday,
      totalBooks: totalUniqueBooks,
      totalCopies: totalUniqueBooks, // Total inventory should show unique books, not total copies
      totalBookCopies, // Keep total copies count for reference if needed
      borrowedCopies: borrowedBooks, // Count of unique books with borrowed copies
      availableCopies: availableBooks, // Count of unique books with available copies
      lowStock: lowStockBooks, // Count of unique books with low stock (3 or fewer available)
      overdueBooks, // Count of unique books with overdue borrowings
      pendingReservations, // Count of unique books with pending reservations
      pendingFines,
      monthlyRevenue,
      revenueBreakdown,
      recentActivity: allActivities,
    }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/admin/stats] Error:', error);
    return handleApiError(error, 'fetch admin stats');
  }
}
