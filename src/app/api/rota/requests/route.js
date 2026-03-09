export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/services/email-edge';
import { getEmailTranslations, t, formatDateForLocale } from '@/lib/email-translations';

// Lazy initialization of Supabase client to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
};

// --- Email helpers ---

const LEAVE_TYPE_LABELS = {
  annual: { en: 'Annual Leave', ro: 'Concediu Anual', fr: 'Congé Annuel', it: 'Ferie Annuali', es: 'Vacaciones Anuales' },
  sick: { en: 'Sick Leave', ro: 'Concediu Medical', fr: 'Congé Maladie', it: 'Congedo per Malattia', es: 'Baja por Enfermedad' },
  emergency: { en: 'Emergency Leave', ro: 'Concediu de Urgență', fr: 'Congé d\'Urgence', it: 'Congedo di Emergenza', es: 'Permiso de Emergencia' },
  unpaid: { en: 'Unpaid Leave', ro: 'Concediu Fără Plată', fr: 'Congé Sans Solde', it: 'Congedo Non Retribuito', es: 'Permiso Sin Sueldo' },
  other: { en: 'Other', ro: 'Altele', fr: 'Autre', it: 'Altro', es: 'Otro' }
}

function generateTimeOffRequestEmail(tr, locale, { staffName, restaurantName, dashboardUrl, dateFrom, dateTo, daysRequested, leaveType, reason }) {
  const leaveTypeLabel = (LEAVE_TYPE_LABELS[leaveType] || LEAVE_TYPE_LABELS.other)[locale] || leaveType || '—'
  const formattedFrom = formatDateForLocale(dateFrom, locale)
  const formattedTo = dateTo && dateTo !== dateFrom ? formatDateForLocale(dateTo, locale) : null
  const dateRange = formattedTo ? `${formattedFrom} – ${formattedTo}` : formattedFrom

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t(tr.timeOffRequestSubject, { staffName, restaurantName })}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:40px 32px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:1px;text-transform:uppercase;">${restaurantName}</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">🌴 ${tr.timeOffRequestTitle}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">${tr.timeOffRequestGreeting}</p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">${tr.timeOffRequestIntro}</p>

            <!-- Details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:10px;border:1px solid #fde68a;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:18px 20px;border-bottom:1px solid #fde68a;">
                  <span style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;">${tr.timeOffRequestFrom}</span>
                  <p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#92400e;">${staffName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #fde68a;">
                  <span style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;">${tr.timeOffRequestType}</span>
                  <p style="margin:4px 0 0 0;font-size:15px;color:#374151;">${leaveTypeLabel}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #fde68a;">
                  <span style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;">${tr.timeOffRequestDates}</span>
                  <p style="margin:4px 0 0 0;font-size:15px;color:#374151;">${dateRange}</p>
                </td>
              </tr>
              ${daysRequested ? `
              <tr>
                <td style="padding:14px 20px;${reason ? 'border-bottom:1px solid #fde68a;' : ''}">
                  <span style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;">${tr.timeOffRequestDays}</span>
                  <p style="margin:4px 0 0 0;font-size:15px;color:#374151;">${daysRequested} ${tr.timeOffRequestDaysUnit}</p>
                </td>
              </tr>` : ''}
              ${reason ? `
              <tr>
                <td style="padding:14px 20px;">
                  <span style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;">${tr.timeOffRequestReason}</span>
                  <p style="margin:4px 0 0 0;font-size:15px;color:#374151;font-style:italic;">"${reason}"</p>
                </td>
              </tr>` : ''}
            </table>

            <!-- CTA button -->
            <div style="text-align:center;margin:8px 0 32px 0;">
              <a href="${dashboardUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">${tr.timeOffRequestCta} →</a>
            </div>

            <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">${tr.timeOffRequestOutro}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">${t(tr.timeOffRequestFooter, { restaurantName })}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendTimeOffRequestEmail(supabase, { restaurantId, staffName, dateFrom, dateTo, daysRequested, leaveType, reason }) {
  try {
    // Fetch restaurant: contact email, name, email_language, owner_id for fallback
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, email_language, email, owner_id')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) return

    const restaurantName = restaurant.name || 'Restaurant'
    const locale = restaurant.email_language || 'en'

    // Use restaurant's contact email; fall back to owner's auth email via RPC
    let managerEmail = restaurant.email
    if (!managerEmail && restaurant.owner_id) {
      const { data: ownerEmail } = await supabase
        .rpc('get_owner_email', { owner_id: restaurant.owner_id })
      managerEmail = ownerEmail
    }

    if (!managerEmail) return // nowhere to send, skip

    const tr = getEmailTranslations(locale)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const dashboardUrl = `${baseUrl}/dashboard/time-off-requests`

    const subject = t(tr.timeOffRequestSubject, { staffName, restaurantName })
    const html = generateTimeOffRequestEmail(tr, locale, {
      staffName,
      restaurantName,
      dashboardUrl,
      dateFrom,
      dateTo,
      daysRequested,
      leaveType,
      reason
    })

    await sendEmail({ to: managerEmail, subject, htmlContent: html, fromName: restaurantName })
  } catch (err) {
    console.error('Failed to send time-off request email:', err)
  }
}

async function sendRequestStatusEmail(supabase, { requestId, status, rejectionReason }) {
  try {
    // Fetch full request with staff + restaurant in one go
    const { data: req } = await supabase
      .from('shift_requests')
      .select('*, staff:staff_id(name, email), restaurant:restaurant_id(name, email_language)')
      .eq('id', requestId)
      .single()

    if (!req || !req.staff?.email) return

    const staffEmail = req.staff.email
    const staffName = req.staff.name || 'Team Member'
    const restaurantName = req.restaurant?.name || 'Your Restaurant'
    const locale = req.restaurant?.email_language || 'en'
    const tr = getEmailTranslations(locale)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const rotaUrl = `${baseUrl}/staff-login`

    const isApproved = status === 'approved'
    const headerBg = isApproved ? '#15803d' : '#b91c1c'
    const icon = isApproved ? '✅' : '❌'
    const dateFrom = formatDateForLocale(req.date_from, locale)
    const dateTo = formatDateForLocale(req.date_to, locale)

    const heading = isApproved ? tr.requestApprovedTitle : tr.requestRejectedTitle
    const greeting = t(isApproved ? tr.requestApprovedGreeting : tr.requestRejectedGreeting, { staffName })
    const body = t(isApproved ? tr.requestApprovedBody : tr.requestRejectedBody, { dateFrom, dateTo })
    const reasonLabel = isApproved ? '' : (tr.requestRejectedReason || 'Reason')
    const ctaLabel = isApproved ? tr.requestApprovedCta : tr.requestRejectedCta
    const footer = t(isApproved ? tr.requestApprovedFooter : tr.requestRejectedFooter, { restaurantName })

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr>
          <td style="background-color:${headerBg};padding:40px 32px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:1px;text-transform:uppercase;">${restaurantName}</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">${icon} ${heading}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;background-color:#ffffff;">
            <p style="margin:0 0 16px 0;font-size:16px;color:#1f2937;">${greeting}</p>
            <p style="margin:0 0 24px 0;font-size:15px;color:#4b5563;line-height:1.6;">${body}</p>
            ${!isApproved && rejectionReason ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;">${reasonLabel}</p>
              <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${rejectionReason}"</p>
            </div>` : ''}
            <div style="text-align:center;margin:8px 0 32px 0;">
              <a href="${rotaUrl}" style="display:inline-block;padding:14px 32px;background-color:#6262bd;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${ctaLabel} →</a>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;">${footer}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const subject = t(isApproved ? tr.requestApprovedSubject : tr.requestRejectedSubject, { restaurantName })

    await sendEmail({ to: staffEmail, subject, htmlContent: html, fromName: restaurantName })
  } catch (err) {
    console.error('Failed to send request status email:', err)
  }
}

// --- End email helpers ---

// GET - Fetch shift requests with filtering
export async function GET(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const staffId = searchParams.get('staff_id');
    const status = searchParams.get('status');
    const requestType = searchParams.get('request_type');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('shift_requests')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role
        ),
        shift:shift_id (
          id,
          date,
          shift_start,
          shift_end,
          role_required
        ),
        swap_with_staff:swap_with_staff_id (
          id,
          name,
          role
        ),
        swap_shift:swap_shift_id (
          id,
          date,
          shift_start,
          shift_end
        )
      `)
      .eq('restaurant_id', restaurantId);

    // Apply filters
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (requestType) {
      query = query.eq('request_type', requestType);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ requests: data });
  } catch (error) {
    console.error('Error fetching shift requests:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new shift request
export async function POST(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const {
      restaurant_id,
      staff_id,
      request_type,
      date_from,
      date_to,
      reason,
      shift_id,
      swap_with_staff_id,
      swap_shift_id,
      leave_type,
      days_requested,
      medical_certificate_provided
    } = body;

    // Validation
    if (!restaurant_id || !staff_id || !request_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate request_type
    const validRequestTypes = ['time_off', 'swap', 'cover'];
    if (!validRequestTypes.includes(request_type)) {
      return NextResponse.json(
        { error: `Invalid request type. Must be one of: ${validRequestTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (request_type === 'time_off' && (!date_from || !date_to)) {
      return NextResponse.json(
        { error: 'Time-off requests require date_from and date_to' },
        { status: 400 }
      );
    }

    // Validate date range
    if (request_type === 'time_off' && date_from > date_to) {
      return NextResponse.json(
        { error: 'date_to must be on or after date_from' },
        { status: 400 }
      );
    }

    if (request_type === 'swap' && !shift_id) {
      return NextResponse.json(
        { error: 'Swap requests require shift_id' },
        { status: 400 }
      );
    }

    if (request_type === 'cover' && !shift_id) {
      return NextResponse.json(
        { error: 'Cover requests require shift_id' },
        { status: 400 }
      );
    }

    // Note: We allow multiple time-off requests to enable advance planning
    // Staff can submit multiple requests for different periods throughout the year

    // Create request
    const { data: shiftRequest, error } = await supabase
      .from('shift_requests')
      .insert({
        restaurant_id,
        staff_id,
        request_type,
        date_from,
        date_to,
        reason,
        shift_id,
        swap_with_staff_id,
        swap_shift_id,
        leave_type,
        days_requested,
        medical_certificate_provided,
        status: 'pending'
      })
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role
        ),
        shift:shift_id (
          id,
          date,
          shift_start,
          shift_end,
          role_required
        ),
        swap_with_staff:swap_with_staff_id (
          id,
          name,
          role
        ),
        swap_shift:swap_shift_id (
          id,
          date,
          shift_start,
          shift_end
        )
      `)
      .single();

    if (error) throw error;

    // Create notification for restaurant owner/manager (non-blocking)
    try {
      // Get restaurant owner
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('owner_id')
        .eq('id', restaurant_id)
        .single();

      if (restaurant?.owner_id) {
        const requestTypeLabel = request_type === 'time_off' ? 'time-off' :
                                  request_type === 'swap' ? 'shift swap' :
                                  'shift cover';

        await supabase.from('notifications').insert({
          user_id: restaurant.owner_id,
          type: 'new_request',
          title: 'New staff request',
          message: `${shiftRequest.staff.name} submitted a ${requestTypeLabel} request`,
          metadata: {
            request_id: shiftRequest.id,
            request_type: request_type,
            staff_id: staff_id,
            staff_name: shiftRequest.staff.name
          },
          read: false
        });
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error('Failed to create notification:', notificationError);
    }

    // Send email to manager for time-off requests
    if (request_type === 'time_off') {
      await sendTimeOffRequestEmail(supabase, {
        restaurantId: restaurant_id,
        staffName: shiftRequest.staff.name,
        dateFrom: date_from,
        dateTo: date_to,
        daysRequested: days_requested,
        leaveType: leave_type,
        reason
      });
    }

    return NextResponse.json({ request: shiftRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift request:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update shift request (approve/reject)
export async function PUT(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const {
      id,
      status,
      approved_by,
      rejection_reason,
      date_from,
      date_to,
      reason,
      leave_type
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (status && !['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get existing request
    const { data: existingRequest } = await supabase
      .from('shift_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Prevent staff from approving their own requests
    if (status === 'approved' && approved_by === existingRequest.staff_id) {
      return NextResponse.json(
        { error: 'Staff cannot approve their own requests' },
        { status: 403 }
      );
    }

    // Validate rejection reason is provided when rejecting
    if (status === 'rejected' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a request' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (status) updateData.status = status;
    if (date_from) updateData.date_from = date_from;
    if (date_to) updateData.date_to = date_to;
    if (reason !== undefined) updateData.reason = reason;
    if (leave_type) updateData.leave_type = leave_type;
    if (rejection_reason !== undefined) updateData.rejection_reason = rejection_reason;

    if (status === 'approved') {
      updateData.approved_by = approved_by;
      updateData.approved_at = new Date().toISOString();

      // Handle approved requests
      if (existingRequest.request_type === 'swap' && existingRequest.swap_with_staff_id) {
        // Execute the swap
        const { error: swapError1 } = await supabase
          .from('shifts')
          .update({ staff_id: existingRequest.swap_with_staff_id })
          .eq('id', existingRequest.shift_id);

        if (existingRequest.swap_shift_id) {
          const { error: swapError2 } = await supabase
            .from('shifts')
            .update({ staff_id: existingRequest.staff_id })
            .eq('id', existingRequest.swap_shift_id);

          if (swapError1 || swapError2) {
            throw new Error('Failed to execute shift swap');
          }
        }
      } else if (existingRequest.request_type === 'cover') {
        // Unassign staff from shift (make it available)
        await supabase
          .from('shifts')
          .update({ staff_id: null })
          .eq('id', existingRequest.shift_id);
      }
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason;
    }

    const { data: shiftRequest, error } = await supabase
      .from('shift_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role
        ),
        shift:shift_id (
          id,
          date,
          shift_start,
          shift_end,
          role_required
        ),
        swap_with_staff:swap_with_staff_id (
          id,
          name,
          role
        ),
        swap_shift:swap_shift_id (
          id,
          date,
          shift_start,
          shift_end
        )
      `)
      .single();

    if (error) {
      console.error('Database error updating shift request:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        existingRequest
      });
      throw error;
    }

    // Send email to staff when their request is approved or rejected
    if (status === 'approved' || status === 'rejected') {
      await sendRequestStatusEmail(supabase, {
        requestId: id,
        status,
        rejectionReason: rejection_reason
      });
    }

    return NextResponse.json({ request: shiftRequest });
  } catch (error) {
    console.error('Error updating shift request:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete shift request
export async function DELETE(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shift_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shift request:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
