export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
};

export async function POST(request) {
  const supabase = getSupabase()
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

    // Generate magic link token (using Web Crypto API)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

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

    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f8; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background-color: #6262bd; color: white; padding: 36px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; }
    .header p { margin: 8px 0 0; opacity: 0.85; font-size: 15px; }
    .content { padding: 32px 30px; }
    .button { display: block; width: fit-content; margin: 28px auto; padding: 14px 32px; background-color: #6262bd; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
    .info-box { background-color: #f1f5f9; border-left: 4px solid #6262bd; padding: 16px 20px; border-radius: 6px; margin: 24px 0; font-size: 14px; color: #475569; }
    .link-box { word-break: break-all; color: #6262bd; font-size: 13px; background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 12px 0; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .footer { background: #f9f9fb; padding: 18px 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" alt="${restaurant.name}" style="max-width:120px;max-height:60px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">` : ''}
      <h1>Staff Dashboard Access</h1>
      <p>${restaurant.name}</p>
    </div>
    <div class="content">
      <p>Hi ${staff.name},</p>
      <p>Your manager has sent you a login link for your staff dashboard. Click the button below to access your rota, shifts, and time-off requests.</p>
      <a href="${magicLink}" class="button">Access My Dashboard →</a>
      <div class="info-box">
        <strong>Important:</strong> This link is valid until <strong>${expiryDate}</strong> and can only be used once. Contact your manager if you need a new one.
      </div>
      <hr class="divider" />
      <p style="font-size:13px;color:#64748b;">If the button above doesn't work, copy and paste this link into your browser:</p>
      <p class="link-box">${magicLink}</p>
    </div>
    <div class="footer">
      Sent by ${restaurant.name} via Veno App.<br>
      If you weren't expecting this, you can safely ignore it.
    </div>
  </div>
</body>
</html>`;

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || 'Veno App',
          email: process.env.EMAIL_FROM || 'noreply@venoapp.com',
        },
        to: [{ email: staff.email, name: staff.name || staff.email }],
        subject: `Your staff dashboard access — ${restaurant.name}`,
        htmlContent: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json();
      console.error('Brevo send failed:', { status: emailResponse.status, error: emailError });
      return NextResponse.json(
        {
          error: `Failed to send email: ${emailError.message || emailResponse.statusText}`,
          magic_link: magicLink,
        },
        { status: 500 }
      );
    }

    const emailResult = await emailResponse.json();

    return NextResponse.json({
      success: true,
      email_sent_to: staff.email,
      email_id: emailResult.messageId,
      expires_at: expiresAt.toISOString(),
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
