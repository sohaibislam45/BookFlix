import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';

// GET - List notifications for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const query = { user: userId };
    if (unreadOnly) {
      query.read = false;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .populate('metadata.borrowing', 'book dueDate status')
      .populate('metadata.reservation', 'book status expiryDate')
      .populate('metadata.fine', 'amount status')
      .populate('metadata.payment', 'amount status')
      .populate('metadata.book', 'title author coverImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a notification (admin/librarian only, or system)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, type, title, message, metadata } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      metadata: metadata || {},
    });

    await notification.save();

    await notification.populate('metadata.borrowing', 'book dueDate status');
    await notification.populate('metadata.reservation', 'book status expiryDate');
    await notification.populate('metadata.fine', 'amount status');
    await notification.populate('metadata.payment', 'amount status');
    await notification.populate('metadata.book', 'title author coverImage');

    return NextResponse.json(
      {
        message: 'Notification created successfully',
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification', details: error.message },
      { status: 500 }
    );
  }
}

