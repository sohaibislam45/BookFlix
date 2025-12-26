import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { handleApiError } from '@/lib/apiErrorHandler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent staff activities (created, updated, deleted)
    // For now, we'll track activities based on user updates
    // In a real system, you'd have a separate ActivityLog model
    
    // Get recently created staff
    const recentCreated = await User.find({
      role: { $in: ['librarian', 'admin'] },
    })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get recently updated staff
    const recentUpdated = await User.find({
      role: { $in: ['librarian', 'admin'] },
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    })
      .select('name email role updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    // Format activities
    const activities = [
      ...recentCreated.map(user => ({
        type: 'created',
        message: `New ${user.role} "${user.name}" was added to the system`,
        timestamp: user.createdAt,
        user: user.name,
      })),
      ...recentUpdated
        .filter(user => {
          // Only include if updated recently (not just created)
          const daysSinceUpdate = (Date.now() - new Date(user.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          const daysSinceCreate = (Date.now() - new Date(user.createdAt || user.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate < daysSinceCreate - 1; // Updated at least 1 day after creation
        })
        .map(user => ({
          type: 'updated',
          message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} "${user.name}" profile was updated`,
          timestamp: user.updatedAt,
          user: user.name,
        })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp).toISOString(),
        timeAgo: getTimeAgo(new Date(activity.timestamp)),
      }));

    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/admin/staff/activity] Error:', error);
    return handleApiError(error, 'fetch activity log');
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

