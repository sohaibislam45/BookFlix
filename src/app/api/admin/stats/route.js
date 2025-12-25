import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import Borrowing from '@/models/Borrowing';
import Fine from '@/models/Fine';
import Payment from '@/models/Payment';
import Subscription from '@/models/Subscription';
import { USER_ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    // Get total revenue from payments
    const totalRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Get revenue from last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: lastMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    const lastMonthRevenue = lastMonthRevenueResult[0]?.total || 0;
    const revenueGrowth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    // Get active members count
    const activeMembers = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      isActive: true,
    });

    // Get new members this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const newMembersThisMonth = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      createdAt: { $gte: thisMonth },
    });

    // Get premium users count
    const premiumUsers = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      'subscription.type': { $in: ['monthly', 'yearly'] },
      'subscription.status': 'active',
    });

    // Get system uptime (mock - in production, this would come from monitoring)
    const systemUptime = 99.99;
    const lastOutage = new Date();
    lastOutage.setDate(lastOutage.getDate() - 42);

    // Get server load (mock - in production, this would come from monitoring)
    const serverLoad = 42;

    // Get total books
    const totalBooks = await Book.countDocuments();

    // Get total book copies
    const totalCopies = await BookCopy.countDocuments();
    const borrowedCopies = await BookCopy.countDocuments({ status: 'borrowed' });
    const availableCopies = totalCopies - borrowedCopies;

    // Get recent activity (system events)
    const recentBorrowings = await Borrowing.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('bookCopyId', 'bookId')
      .populate('memberId', 'name email')
      .populate({
        path: 'bookCopyId',
        populate: {
          path: 'bookId',
          select: 'title isbn coverImage',
        },
      })
      .lean();

    const recentActivity = recentBorrowings.map((borrowing) => ({
      _id: borrowing._id,
      type: 'borrowing',
      member: borrowing.memberId?.name || 'Unknown',
      book: borrowing.bookCopyId?.bookId?.title || 'Unknown',
      status: borrowing.status,
      createdAt: borrowing.createdAt,
    }));

    // Get revenue trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Get revenue sources breakdown
    const revenueSources = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalRevenueForBreakdown = revenueSources.reduce((sum, source) => sum + source.total, 0);
    const revenueBreakdown = revenueSources.map((source) => ({
      type: source._id || 'other',
      amount: source.total,
      percentage: totalRevenueForBreakdown > 0 ? (source.total / totalRevenueForBreakdown) * 100 : 0,
    }));

    return NextResponse.json({
      totalRevenue,
      revenueGrowth: revenueGrowth.toFixed(1),
      activeMembers,
      newMembersThisMonth,
      premiumUsers,
      premiumPercentage: activeMembers > 0 ? ((premiumUsers / activeMembers) * 100).toFixed(1) : 0,
      systemUptime,
      lastOutage,
      serverLoad,
      totalBooks,
      totalCopies,
      borrowedCopies,
      availableCopies,
      monthlyRevenue,
      revenueBreakdown,
      recentActivity,
    });
  } catch (error) {
    console.error('[GET /api/admin/stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats', details: error.message },
      { status: 500 }
    );
  }
}

