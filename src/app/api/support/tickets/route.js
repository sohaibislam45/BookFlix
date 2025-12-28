import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { handleApiError, validateRequiredFields, sanitizeInput } from '@/lib/apiErrorHandler';

// In a real application, you would have a SupportTicket model
// For now, we'll just log and return success
// You can implement email sending or database storage later

export async function POST(request) {
  try {
    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { subject, category, priority, message, userRole } = body;

    // Validate required fields
    const validation = validateRequiredFields(body, ['subject', 'category', 'message']);
    if (validation) {
      return validation;
    }

    // Sanitize inputs
    const sanitizedSubject = sanitizeInput(subject, 200);
    const sanitizedMessage = sanitizeInput(message, 2000);
    const sanitizedCategory = sanitizeInput(category, 50);
    const sanitizedPriority = sanitizeInput(priority, 20);

    // In a production system, you would:
    // 1. Save to a SupportTicket model in the database
    // 2. Send an email notification to support team
    // 3. Create a ticket in a support system (e.g., Zendesk, Jira)
    
    // For now, we'll just log it
    console.log('Support Ticket Received:', {
      subject: sanitizedSubject,
      category: sanitizedCategory,
      priority: sanitizedPriority,
      message: sanitizedMessage,
      userRole: userRole || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement actual ticket storage and email notification
    // Example:
    // const ticket = new SupportTicket({
    //   subject: sanitizedSubject,
    //   category: sanitizedCategory,
    //   priority: sanitizedPriority,
    //   message: sanitizedMessage,
    //   userRole,
    //   status: 'open',
    // });
    // await ticket.save();
    // await sendSupportEmail(ticket);

    return NextResponse.json(
      {
        message: 'Support ticket submitted successfully',
        ticketId: `TICKET-${Date.now()}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting support ticket:', error);
    return handleApiError(error, 'submit support ticket');
  }
}

