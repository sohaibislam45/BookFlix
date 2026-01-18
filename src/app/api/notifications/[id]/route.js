import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';

// PATCH - Mark notification as read
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    await notification.markAsRead();

    return NextResponse.json(
      {
        message: 'Notification marked as read',
        notification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Notification deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error.message },
      { status: 500 }
    );
  }
}

