import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';

// GET - Get unread notification count for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const unreadCount = await Notification.getUnreadCount(userId);

    return NextResponse.json(
      {
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count', details: error.message },
      { status: 500 }
    );
  }
}

