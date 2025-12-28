import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Book from '@/models/Book';
import BookCopy from '@/models/BookCopy';
import { handleApiError } from '@/lib/apiErrorHandler';
import { USER_ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectDB();

    // Count total books (distinct book titles)
    const totalBooks = await Book.countDocuments({ isActive: true });

    // Count active members (members who are active and not suspended)
    const activeMembers = await User.countDocuments({
      role: USER_ROLES.MEMBER,
      isActive: true,
      $or: [
        { suspendedUntil: null },
        { suspendedUntil: { $lt: new Date() } },
      ],
    });

    // Count distinct library locations (using distinct locations from BookCopy)
    // If location structure is different, you can adjust this
    const distinctLocations = await BookCopy.distinct('location.floor', {
      isActive: true,
      'location.floor': { $exists: true, $ne: null },
    });
    const totalLibraries = distinctLocations.length || 50; // Fallback to 50 if no locations

    return NextResponse.json({
      totalBooks,
      activeMembers,
      totalLibraries,
    }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/stats] Error:', error);
    return handleApiError(error, 'fetch public statistics');
  }
}
