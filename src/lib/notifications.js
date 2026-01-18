import { resend } from './resend';
import connectDB from './db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { NOTIFICATION_TYPES } from './constants';

/**
 * Get email template for notification type
 */
function getEmailTemplate(type, data) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const templates = {
    [NOTIFICATION_TYPES.BORROWING_DUE]: {
      subject: `📚 Book Due Soon: ${data.bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #aa1fef;">Book Due Soon</h2>
          <p>Hi ${data.userName},</p>
          <p>This is a reminder that your borrowed book <strong>"${data.bookTitle}"</strong> by ${data.bookAuthor} is due in ${data.daysRemaining} day(s).</p>
          <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p>Please return the book on time to avoid late fees.</p>
          <a href="${baseUrl}/member/shelf" style="display: inline-block; background-color: #aa1fef; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View My Shelf</a>
        </div>
      `,
    },
    [NOTIFICATION_TYPES.BORROWING_OVERDUE]: {
      subject: `⚠️ Overdue Book: ${data.bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Book Overdue</h2>
          <p>Hi ${data.userName},</p>
          <p>Your borrowed book <strong>"${data.bookTitle}"</strong> by ${data.bookAuthor} is now overdue.</p>
          <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
          <p>Please return the book as soon as possible. Late fees may apply.</p>
          <a href="${baseUrl}/member/shelf" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Return Book</a>
        </div>
      `,
    },
    [NOTIFICATION_TYPES.RESERVATION_READY]: {
      subject: `✅ Your Reserved Book is Ready: ${data.bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Book Ready for Pickup</h2>
          <p>Hi ${data.userName},</p>
          <p>Great news! Your reserved book <strong>"${data.bookTitle}"</strong> by ${data.bookAuthor} is now ready for pickup.</p>
          <p>You have 3 days to pick up the book before the reservation expires.</p>
          <p><strong>Expiry Date:</strong> ${new Date(data.expiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <a href="${baseUrl}/member/reservations" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Reservations</a>
        </div>
      `,
    },
    [NOTIFICATION_TYPES.RESERVATION_EXPIRED]: {
      subject: `⏰ Reservation Expired: ${data.bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Reservation Expired</h2>
          <p>Hi ${data.userName},</p>
          <p>Your reservation for <strong>"${data.bookTitle}"</strong> by ${data.bookAuthor} has expired.</p>
          <p>The book has been made available to the next person in the queue.</p>
          <a href="${baseUrl}/member/explore" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Browse Books</a>
        </div>
      `,
    },
    [NOTIFICATION_TYPES.FINE_ISSUED]: {
      subject: `💰 Fine Issued: $${data.amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Fine Issued</h2>
          <p>Hi ${data.userName},</p>
          <p>A fine of <strong>$${data.amount.toFixed(2)}</strong> has been issued for the overdue book <strong>"${data.bookTitle}"</strong>.</p>
          <p><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
          <p>Please pay the fine to continue borrowing books.</p>
          <a href="${baseUrl}/member/billing" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Pay Fine</a>
        </div>
      `,
    },
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
      subject: `✅ Payment Received: $${data.amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Payment Received</h2>
          <p>Hi ${data.userName},</p>
          <p>Thank you! We've received your payment of <strong>$${data.amount.toFixed(2)}</strong>.</p>
          ${data.fineAmount ? `<p>Your fine has been paid in full.</p>` : ''}
          <a href="${baseUrl}/member/billing" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Billing</a>
        </div>
      `,
    },
    [NOTIFICATION_TYPES.BOOK_AVAILABLE]: {
      subject: `📖 Book Available: ${data.bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Book Available</h2>
          <p>Hi ${data.userName},</p>
          <p>The book <strong>"${data.bookTitle}"</strong> by ${data.bookAuthor} is now available for borrowing.</p>
          <a href="${baseUrl}/member/explore?book=${data.bookId}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Borrow Now</a>
        </div>
      `,
    },
  };

  return templates[type] || {
    subject: 'Notification from BookFlix',
    html: `<p>${data.message || 'You have a new notification from BookFlix.'}</p>`,
  };
}

/**
 * Send email notification via Resend
 */
export async function sendEmailNotification(userId, type, data) {
  try {
    await connectDB();
    
    const user = await User.findById(userId);
    if (!user || !user.email) {
      console.error(`User ${userId} not found or has no email`);
      return false;
    }

    const template = getEmailTemplate(type, { ...data, userName: user.name });
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'BookFlix <notifications@bookflix.com>',
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    if (result.error) {
      console.error('Error sending email:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendEmailNotification:', error);
    return false;
  }
}

/**
 * Create an in-app notification
 */
export async function createNotification(userId, type, title, message, metadata = {}) {
  try {
    await connectDB();

    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      metadata,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification and send email (if enabled)
 */
export async function notifyUser(userId, type, title, message, metadata = {}, sendEmail = true) {
  try {
    // Create in-app notification
    const notification = await createNotification(userId, type, title, message, metadata);

    // Send email if requested
    if (sendEmail) {
      const emailSent = await sendEmailNotification(userId, type, {
        ...metadata,
        message,
        bookTitle: metadata.book?.title || metadata.data?.bookTitle,
        bookAuthor: metadata.book?.author || metadata.data?.bookAuthor,
        bookId: metadata.book?._id || metadata.data?.bookId,
      });

      if (emailSent) {
        notification.emailSent = true;
        notification.emailSentAt = new Date();
        await notification.save();
      }
    }

    return notification;
  } catch (error) {
    console.error('Error in notifyUser:', error);
    throw error;
  }
}

