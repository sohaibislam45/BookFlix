import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Config from '@/models/Config';
import { handleApiError, sanitizeInput } from '@/lib/apiErrorHandler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await connectDB();

    // Get or create config
    const config = await Config.getConfig();

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error('[GET /api/admin/config] Error:', error);
    return handleApiError(error, 'fetch config');
  }
}

export async function PATCH(request) {
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

    // Get or create config
    let config = await Config.getConfig();

    // Update allowed fields
    const allowedFields = [
      'timezone',
      'maintenanceMode',
      'supportEmail',
      'standardLoanDays',
      'premiumLoanDays',
      'maxConcurrentLoans',
      'gracePeriod',
      'dailyFine',
      'maxFineCap',
      'autoChargeFines',
      'deliveryService',
      'deliveryRadius',
      'droneBeta',
      'vipPriority',
    ];

    const updateData = {};

    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key)) {
        continue;
      }

      // Validate and sanitize based on field type
      if (key === 'timezone') {
        const validTimezones = ['UTC', 'EST', 'PST', 'GMT'];
        if (validTimezones.includes(value)) {
          updateData[key] = value;
        }
      } else if (key === 'supportEmail') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(value)) {
          updateData[key] = sanitizeInput(value.trim(), 200);
        }
      } else if (typeof value === 'boolean') {
        updateData[key] = value;
      } else if (typeof value === 'number') {
        // Validate number ranges based on field
        if (key === 'standardLoanDays' || key === 'premiumLoanDays') {
          if (value >= 1 && value <= 365) {
            updateData[key] = Math.round(value);
          }
        } else if (key === 'maxConcurrentLoans') {
          if (value >= 1 && value <= 20) {
            updateData[key] = Math.round(value);
          }
        } else if (key === 'gracePeriod') {
          if (value >= 0 && value <= 30) {
            updateData[key] = Math.round(value);
          }
        } else if (key === 'dailyFine') {
          if (value >= 0 && value <= 100) {
            updateData[key] = parseFloat(value.toFixed(2));
          }
        } else if (key === 'maxFineCap') {
          if (value >= 0 && value <= 1000) {
            updateData[key] = parseFloat(value.toFixed(2));
          }
        } else if (key === 'deliveryRadius') {
          if (value >= 0 && value <= 100) {
            updateData[key] = Math.round(value);
          }
        }
      }
    }

    // Apply updates
    Object.keys(updateData).forEach((key) => {
      config[key] = updateData[key];
    });

    await config.save();

    return NextResponse.json(
      { message: 'Configuration updated successfully', config },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PATCH /api/admin/config] Error:', error);
    return handleApiError(error, 'update config');
  }
}

