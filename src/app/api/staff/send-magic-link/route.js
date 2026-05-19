export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmailTranslations, t, formatDateForLocale } from '@/lib/email-translations';
import { sendEmail } from '@/lib/services/email-edge';

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

    // Fetch restaurant details including email_language
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name, logo_url, email_language')
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

    // Get translations for the restaurant's configured language
    const locale = restaurant.email_language || 'en';
    const tr = getEmailTranslations(locale);
    const expiryDate = formatDateForLocale(expiresAt.toISOString(), locale);

    const subject = t(tr.magicLinkSubject, { restaurantName: restaurant.name });

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
      <h1>${tr.magicLinkTitle}</h1>
      <p>${restaurant.name}</p>
    </div>
    <div class="content">
      <p>${t(tr.magicLinkGreeting, { staffName: staff.name })}</p>
      <p>${tr.magicLinkIntro}</p>
      <a href="${magicLink}" class="button">${tr.magicLinkCta}</a>
      <div class="info-box">
        <strong>${tr.magicLinkImportant}</strong> ${t(tr.magicLinkValidUntil, { expiryDate })}
      </div>
      <hr class="divider" />
      <p style="font-size:13px;color:#64748b;">${tr.magicLinkFallback}</p>
      <p class="link-box">${magicLink}</p>
    </div>
    <div class="footer">
      ${t(tr.magicLinkFooter, { restaurantName: restaurant.name })}
    </div>
  </div>
</body>
</html>`;

    const result = await sendEmail({
      to: staff.email,
      subject,
      htmlContent: emailHtml,
      fromName: restaurant.name,
    });

    if (!result.success) {
      console.error('sendEmail failed:', result.error);
      return NextResponse.json(
        {
          error: result.error || 'Failed to send email',
          magic_link: magicLink,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email_sent_to: staff.email,
      email_id: result.messageId,
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
