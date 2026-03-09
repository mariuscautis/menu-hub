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

function generateShiftEmail(tr, { staffName, restaurantName, rotaUrl, shifts }) {
  const shiftRows = shifts.map(s => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#374151;">${s.date}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#374151;">${s.time}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#374151;">${s.role}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#374151;">${s.breakDuration} ${tr.shiftPublishedMinutes}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t(tr.shiftPublishedSubject, { restaurantName })}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6262bd 0%,#4f4fa3 100%);padding:40px 32px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">${restaurantName}</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">📅 ${tr.shiftPublishedTitle}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">${t(tr.shiftPublishedGreeting, { staffName })}</p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">${t(tr.shiftPublishedIntro, { restaurantName })}</p>

            <!-- Shift table -->
            <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#6262bd;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedDetails}</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:#6262bd;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedDate}</th>
                  <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:#6262bd;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedTime}</th>
                  <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:#6262bd;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedRole}</th>
                  <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:#6262bd;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedBreak}</th>
                </tr>
              </thead>
              <tbody>${shiftRows}</tbody>
            </table>

            <!-- CTA button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${rotaUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6262bd 0%,#4f4fa3 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">${tr.shiftPublishedCta} →</a>
            </div>

            <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">${tr.shiftPublishedOutro}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">${t(tr.shiftPublishedFooter, { restaurantName })}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendShiftPublishedEmail(supabase, { staffId, restaurantId, shift }) {
  try {
    // Fetch staff email + restaurant email_language in parallel
    const [staffResult, restaurantResult] = await Promise.all([
      supabase.from('staff').select('name, email').eq('id', staffId).single(),
      supabase.from('restaurants').select('name, email_language').eq('id', restaurantId).single()
    ])

    const staffEmail = staffResult.data?.email
    const staffName = staffResult.data?.name || 'Team Member'
    const restaurantName = restaurantResult.data?.name || 'Your Restaurant'
    const locale = restaurantResult.data?.email_language || 'en'

    if (!staffEmail) return // no email on file, skip silently

    const tr = getEmailTranslations(locale)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const rotaUrl = `${baseUrl}/staff-login`

    const formattedDate = formatDateForLocale(shift.date, locale)
    const time = `${shift.shift_start?.substring(0, 5)} – ${shift.shift_end?.substring(0, 5)}`
    const breakDuration = shift.break_duration ?? 30

    const subject = t(tr.shiftPublishedSubject, { restaurantName })
    const html = generateShiftEmail(tr, {
      staffName,
      restaurantName,
      rotaUrl,
      shifts: [{ date: formattedDate, time, role: shift.role_required || '', breakDuration }]
    })

    await sendEmail({ to: staffEmail, subject, htmlContent: html, fromName: restaurantName })
  } catch (err) {
    console.error('Failed to send shift published email:', err)
  }
}

// --- End email helpers ---

// GET - Fetch shifts with filtering
export async function GET(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const staffId = searchParams.get('staff_id');
    const status = searchParams.get('status');
    const department = searchParams.get('department');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('shifts')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role,
          department
        )
      `)
      .eq('restaurant_id', restaurantId);

    // Apply filters
    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date', dateTo);
    }
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (department) {
      query = query.eq('department', department);
    }

    query = query.order('date', { ascending: true })
                 .order('shift_start', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ shifts: data });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new shift with conflict checking
export async function POST(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const {
      restaurant_id,
      staff_id,
      date,
      shift_start,
      shift_end,
      break_duration,
      role_required,
      department,
      notes,
      status = 'draft'
    } = body;

    // Validation
    if (!restaurant_id || !date || !shift_start || !shift_end || !role_required) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate shift times
    if (shift_start >= shift_end) {
      return NextResponse.json(
        { error: 'Shift end time must be after start time' },
        { status: 400 }
      );
    }

    // Validate break duration
    if (break_duration !== undefined && (break_duration < 0 || break_duration > 180)) {
      return NextResponse.json(
        { error: 'Break duration must be between 0 and 180 minutes' },
        { status: 400 }
      );
    }

    // Department validation removed - departments are now dynamic from department_permissions table

    // Validate status
    const validStatuses = ['draft', 'published', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // If staff is assigned, check for conflicts
    if (staff_id) {
      const { data: conflicts } = await supabase
        .rpc('check_shift_conflicts', {
          p_staff_id: staff_id,
          p_date: date,
          p_shift_start: shift_start,
          p_shift_end: shift_end
        });

      if (conflicts && conflicts.length > 0 && conflicts[0].has_conflict) {
        return NextResponse.json(
          {
            error: 'Shift conflict detected',
            conflict: {
              type: conflicts[0].conflict_type,
              message: conflicts[0].conflict_message
            }
          },
          { status: 409 }
        );
      }
    }

    // Create shift
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        restaurant_id,
        staff_id,
        date,
        shift_start,
        shift_end,
        break_duration: break_duration || 30,
        role_required,
        department,
        notes,
        status
      })
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role,
          department
        )
      `)
      .single();

    if (error) throw error;

    // If shift is being created with completed status, create attendance record
    if (status === 'completed' && staff_id) {
      await supabase.from('attendance').insert({
        restaurant_id,
        staff_id,
        shift_id: shift.id,
        scheduled_start: shift_start,
        scheduled_end: shift_end,
        status: 'completed'
      });
    }

    // Create notification + send email if shift is published and staff is assigned
    if (status === 'published' && staff_id) {
      const formattedDate = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      await supabase.from('notifications').insert({
        user_id: staff_id,
        type: 'shift_published',
        title: 'New shift published',
        message: `You have a new shift on ${formattedDate} from ${shift_start} to ${shift_end}`,
        metadata: {
          shift_id: shift.id,
          date,
          shift_start,
          shift_end
        },
        read: false
      });

      // Send email notification (non-blocking)
      sendShiftPublishedEmail(supabase, { staffId: staff_id, restaurantId: restaurant_id, shift });
    }

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing shift
export async function PUT(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const {
      id,
      staff_id,
      date,
      shift_start,
      shift_end,
      break_duration,
      role_required,
      department,
      notes,
      status
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    // Get existing shift
    const { data: existingShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingShift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Validate shift times if provided
    const finalShiftStart = shift_start || existingShift.shift_start;
    const finalShiftEnd = shift_end || existingShift.shift_end;
    if (finalShiftStart >= finalShiftEnd) {
      return NextResponse.json(
        { error: 'Shift end time must be after start time' },
        { status: 400 }
      );
    }

    // Validate break duration
    if (break_duration !== undefined && (break_duration < 0 || break_duration > 180)) {
      return NextResponse.json(
        { error: 'Break duration must be between 0 and 180 minutes' },
        { status: 400 }
      );
    }

    // Department validation removed - departments are now dynamic from department_permissions table

    // Validate status
    const validStatuses = ['draft', 'published', 'completed', 'cancelled'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // If staff assignment changed or time changed, check for conflicts
    if (staff_id && (
      staff_id !== existingShift.staff_id ||
      date !== existingShift.date ||
      shift_start !== existingShift.shift_start ||
      shift_end !== existingShift.shift_end
    )) {
      const { data: conflicts } = await supabase
        .rpc('check_shift_conflicts', {
          p_staff_id: staff_id,
          p_date: date || existingShift.date,
          p_shift_start: shift_start || existingShift.shift_start,
          p_shift_end: shift_end || existingShift.shift_end,
          p_shift_id: id
        });

      if (conflicts && conflicts.length > 0 && conflicts[0].has_conflict) {
        return NextResponse.json(
          {
            error: 'Shift conflict detected',
            conflict: {
              type: conflicts[0].conflict_type,
              message: conflicts[0].conflict_message
            }
          },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (staff_id !== undefined) updateData.staff_id = staff_id;
    if (date !== undefined) updateData.date = date;
    if (shift_start !== undefined) updateData.shift_start = shift_start;
    if (shift_end !== undefined) updateData.shift_end = shift_end;
    if (break_duration !== undefined) updateData.break_duration = break_duration;
    if (role_required !== undefined) updateData.role_required = role_required;
    if (department !== undefined) updateData.department = department;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const { data: shift, error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role,
          department
        )
      `)
      .single();

    if (error) throw error;

    // Create notifications based on shift changes
    const statusChangedToPublished = status === 'published' && existingShift.status !== 'published';
    const staffAssigned = staff_id && staff_id !== existingShift.staff_id;

    if (statusChangedToPublished && shift.staff_id) {
      // Notify staff when shift is published
      const formattedDate = new Date(shift.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      await supabase.from('notifications').insert({
        user_id: shift.staff_id,
        type: 'shift_published',
        title: 'Your shift has been published',
        message: `You have a new shift on ${formattedDate} from ${shift.shift_start} to ${shift.shift_end}`,
        metadata: {
          shift_id: shift.id,
          date: shift.date,
          shift_start: shift.shift_start,
          shift_end: shift.shift_end
        },
        read: false
      });

      // Send email notification (non-blocking)
      sendShiftPublishedEmail(supabase, { staffId: shift.staff_id, restaurantId: existingShift.restaurant_id, shift });
    } else if (staffAssigned && shift.status === 'published') {
      // Notify staff when assigned to an already published shift
      const formattedDate = new Date(shift.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      await supabase.from('notifications').insert({
        user_id: staff_id,
        type: 'shift_assigned',
        title: "You've been assigned to a shift",
        message: `New shift on ${formattedDate} from ${shift.shift_start} to ${shift.shift_end} as ${shift.role_required}`,
        metadata: {
          shift_id: shift.id,
          date: shift.date,
          shift_start: shift.shift_start,
          shift_end: shift.shift_end,
          role: shift.role_required
        },
        read: false
      });

      // Send email notification (non-blocking)
      sendShiftPublishedEmail(supabase, { staffId: staff_id, restaurantId: existingShift.restaurant_id, shift });
    }

    // If shift status changed to completed and attendance doesn't exist, create it
    if (status === 'completed' && staff_id) {
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('shift_id', id)
        .maybeSingle();

      if (!existingAttendance) {
        await supabase.from('attendance').insert({
          restaurant_id: existingShift.restaurant_id,
          staff_id,
          shift_id: id,
          scheduled_start: shift.shift_start,
          scheduled_end: shift.shift_end,
          status: 'completed'
        });
      }
    }

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete/cancel shift
export async function DELETE(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const softDelete = searchParams.get('soft_delete') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    if (softDelete) {
      // Soft delete - mark as cancelled
      const { data: shift, error } = await supabase
        .from('shifts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        message: 'Shift cancelled successfully',
        shift
      });
    } else {
      // Hard delete - remove from database
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({
        message: 'Shift deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
