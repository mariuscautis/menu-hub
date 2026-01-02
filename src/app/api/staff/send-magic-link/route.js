import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log('=== Magic Link API Called ===');
    const { staff_id, restaurant_id } = await request.json();
    console.log('Request payload:', { staff_id, restaurant_id });

    if (!staff_id || !restaurant_id) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch staff member details
    console.log('Fetching staff member...');
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email')
      .eq('id', staff_id)
      .eq('status', 'active')
      .single();

    console.log('Staff fetch result:', { staff, error: staffError });

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    if (!staff.email) {
      return NextResponse.json(
        { error: 'Staff member has no email address' },
        { status: 400 }
      );
    }

    // Fetch restaurant details
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name, logo_url')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Generate magic link token (using Node.js crypto)
    const token = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    // Store token in database
    const { error: tokenError } = await supabase
      .from('staff_magic_links')
      .insert({
        staff_id: staff.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) throw tokenError;

    // Generate magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/staff-magic-login?token=${token}`;

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

    console.log('Email configuration:', {
      hasApiKey: !!resendApiKey,
      emailFrom,
      staffEmail: staff.email,
      restaurantName: restaurant.name
    });

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        {
          error: 'Email service not configured - Missing RESEND_API_KEY',
          magic_link: magicLink // Return link for manual sending
        },
        { status: 500 }
      );
    }

    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Weekly Rota Access</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #6262bd 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                    ${restaurant.logo_url ? `
                      <img src="${restaurant.logo_url}" alt="${restaurant.name}" style="max-width: 120px; max-height: 80px; margin-bottom: 20px;">
                    ` : ''}
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Your Weekly Rota</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">${restaurant.name}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #1e293b; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">Hi ${staff.name},</p>

                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Access your personal staff dashboard to view your weekly rota, upcoming shifts, and manage your time-off requests.
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #6262bd 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(98, 98, 189, 0.3);">
                            Access Your Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info Box -->
                    <div style="background-color: #f1f5f9; border-left: 4px solid #6262bd; padding: 16px 20px; border-radius: 6px; margin: 24px 0;">
                      <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong style="color: #1e293b;">Important:</strong> This link is valid until <strong>${expiryDate}</strong> and can only be used once. If you need a new link, please contact your manager.
                      </p>
                    </div>

                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                      If the button above doesn't work, you can copy and paste this link into your browser:
                    </p>
                    <p style="word-break: break-all; color: #6262bd; font-size: 13px; background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 12px 0;">
                      ${magicLink}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                      This email was sent by ${restaurant.name}.<br>
                      If you didn't request this link, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 20px 0 0 0; max-width: 600px;">
                For security reasons, never share this link with anyone. This link provides direct access to your personal staff dashboard.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailPayload = {
      from: emailFrom,
      to: staff.email,
      subject: `Your Weekly Rota - ${restaurant.name}`,
      html: emailHtml
    };

    console.log('Sending email with payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json();
      console.error('Failed to send email:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: emailError
      });

      // Special handling for Resend testing email restriction
      if (emailResponse.status === 403 && emailError.message?.includes('testing emails')) {
        return NextResponse.json(
          {
            error: 'Email service is in test mode',
            message: 'Resend requires domain verification to send to external addresses. Please verify a domain at resend.com/domains or send the link manually.',
            magic_link: magicLink // Return link for manual sending
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to send email: ${emailError.message || emailResponse.statusText}`,
          details: emailError,
          magic_link: magicLink // Return link for manual sending
        },
        { status: 500 }
      );
    }

    const emailResult = await emailResponse.json();

    return NextResponse.json({
      success: true,
      email_sent_to: staff.email,
      email_id: emailResult.id,
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error sending magic link:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      {
        error: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
