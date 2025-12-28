import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Borrowing from '@/models/Borrowing';
import Fine from '@/models/Fine';
import Book from '@/models/Book';
import Category from '@/models/Category';
import { BORROWING_STATUS, FINE_STATUS } from '@/lib/constants';
import mongoose from 'mongoose';
import { handleApiError, validateObjectId } from '@/lib/apiErrorHandler';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    // Validate memberId
    const idValidation = validateObjectId(memberId, 'Member ID');
    if (idValidation) {
      return idValidation;
    }

    // Get active borrowings
    const activeBorrowings = await Borrowing.find({
      member: memberId,
      status: BORROWING_STATUS.ACTIVE,
    })
      .populate('book', 'title author coverImage')
      .populate('bookCopy', 'copyNumber')
      .sort({ dueDate: 1 })
      .lean();

    // Get overdue borrowings
    const overdueBorrowings = await Borrowing.find({
      member: memberId,
      status: BORROWING_STATUS.OVERDUE,
    })
      .populate('book', 'title author coverImage')
      .populate('bookCopy', 'copyNumber')
      .sort({ dueDate: 1 })
      .lean();

    // Get returned borrowings for yearly goal
    const thisYear = new Date();
    thisYear.setMonth(0);
    thisYear.setDate(1);
    thisYear.setHours(0, 0, 0, 0);

    const returnedThisYear = await Borrowing.countDocuments({
      member: memberId,
      status: BORROWING_STATUS.RETURNED,
      returnedDate: { $gte: thisYear },
    });

    // Calculate outstanding fines (sum of all pending fines)
    const pendingFines = await Fine.find({
      member: memberId,
      status: FINE_STATUS.PENDING,
    }).lean();
    
    const outstandingFines = pendingFines.reduce((sum, fine) => sum + fine.amount, 0);

    // Calculate days remaining for active borrowings
    const activeWithDays = activeBorrowings.map((borrowing) => {
      const now = new Date();
      const dueDate = new Date(borrowing.dueDate);
      const diffTime = dueDate - now;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...borrowing,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      };
    });

    // Calculate days overdue for overdue borrowings
    const overdueWithDays = overdueBorrowings.map((borrowing) => {
      const now = new Date();
      const dueDate = new Date(borrowing.dueDate);
      const diffTime = now - dueDate;
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...borrowing,
        daysOverdue,
      };
    });

    // Calculate yearly goal percentage (assuming goal of 25 books)
    const yearlyGoal = 25;
    const goalPercentage = Math.round((returnedThisYear / yearlyGoal) * 100);

    // Get monthly borrowing data (last 6 months)
    const now = new Date();
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const count = await Borrowing.countDocuments({
        member: memberId,
        status: BORROWING_STATUS.RETURNED,
        returnedDate: {
          $gte: date,
          $lt: nextMonth,
        },
      });
      
      monthlyData.push({
        month: monthNames[date.getMonth()],
        count,
      });
    }

    // Get favorite genre (most borrowed category)
    const returnedBorrowings = await Borrowing.find({
      member: memberId,
      status: BORROWING_STATUS.RETURNED,
      returnedDate: { $gte: new Date(now.getFullYear(), 0, 1) }, // This year
    })
      .populate({
        path: 'book',
        select: 'category',
        populate: {
          path: 'category',
          select: 'name',
        },
      })
      .lean();

    const categoryCounts = {};
    returnedBorrowings.forEach(borrowing => {
      if (borrowing.book?.category) {
        const category = borrowing.book.category;
        const catId = category._id?.toString() || category.toString();
        categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
      }
    });

    let favoriteGenre = null;
    let favoriteGenrePercentage = 0;
    if (Object.keys(categoryCounts).length > 0) {
      const maxCategoryId = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b
      );
      const maxCount = categoryCounts[maxCategoryId];
      const totalReturned = returnedBorrowings.length;
      
      if (totalReturned > 0) {
        favoriteGenrePercentage = Math.round((maxCount / totalReturned) * 100);
        // Find the category name from the returned borrowings
        const borrowingWithCategory = returnedBorrowings.find(b => {
          const catId = b.book?.category?._id?.toString() || b.book?.category?.toString();
          return catId === maxCategoryId;
        });
        if (borrowingWithCategory?.book?.category?.name) {
          favoriteGenre = borrowingWithCategory.book.category.name;
        } else {
          const category = await Category.findById(maxCategoryId).lean();
          if (category) {
            favoriteGenre = category.name;
          }
        }
      }
    }

    // Calculate average reading time (days per book)
    let avgReadingTime = 0;
    const borrowingsWithDuration = returnedBorrowings.filter(b => 
      b.borrowedDate && b.returnedDate
    );
    
    if (borrowingsWithDuration.length > 0) {
      const totalDays = borrowingsWithDuration.reduce((sum, b) => {
        const days = Math.ceil((new Date(b.returnedDate) - new Date(b.borrowedDate)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgReadingTime = Math.round((totalDays / borrowingsWithDuration.length) * 10) / 10; // Round to 1 decimal
    }

    // Get upcoming due dates (combine active and overdue, sort by due date, take first 3)
    const allDueBorrowings = [
      ...activeWithDays.map(b => ({ ...b, daysRemaining: b.daysRemaining })),
      ...overdueWithDays.map(b => ({ ...b, daysRemaining: -b.daysOverdue })),
    ]
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3)
      .map(borrowing => ({
        _id: borrowing._id,
        book: borrowing.book,
        dueDate: borrowing.dueDate,
        daysRemaining: borrowing.daysRemaining,
      }));

    return NextResponse.json({
      activeLoans: activeBorrowings.length,
      overdueLoans: overdueBorrowings.length,
      outstandingFines,
      booksReadThisYear: returnedThisYear,
      yearlyGoal,
      goalPercentage,
      activeBorrowings: activeWithDays,
      overdueBorrowings: overdueWithDays,
      monthlyBorrowingData: monthlyData,
      favoriteGenre: favoriteGenre || 'N/A',
      favoriteGenrePercentage,
      averageReadingTime: avgReadingTime,
      upcomingDue: allDueBorrowings,
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'fetch member statistics');
  }
}

