import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch shift requests with filtering
export async function GET(request) {
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
        ),
        approver:approved_by (
          id,
          name
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
      swap_shift_id
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

    // Check for overlapping time-off requests
    if (request_type === 'time_off') {
      const { data: existing } = await supabase
        .from('shift_requests')
        .select('id')
        .eq('staff_id', staff_id)
        .eq('request_type', 'time_off')
        .in('status', ['pending', 'approved'])
        .or(`date_from.lte.${date_to},date_to.gte.${date_from}`);

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'Overlapping time-off request already exists' },
          { status: 409 }
        );
      }
    }

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
  try {
    const body = await request.json();
    const {
      id,
      status,
      approved_by,
      rejection_reason
    } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    if (!['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
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
      status,
      updated_at: new Date().toISOString()
    };

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
        ),
        approver:approved_by (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    // Create notifications when request is approved or rejected
    if (status === 'approved') {
      const requestTypeLabel = existingRequest.request_type === 'time_off' ? 'time-off' :
                                existingRequest.request_type === 'swap' ? 'shift swap' :
                                'shift cover';

      await supabase.from('notifications').insert({
        user_id: existingRequest.staff_id,
        type: 'request_approved',
        title: 'Request approved',
        message: `Your ${requestTypeLabel} request has been approved`,
        metadata: {
          request_id: shiftRequest.id,
          request_type: existingRequest.request_type,
          approved_by
        },
        read: false
      });
    } else if (status === 'rejected') {
      const requestTypeLabel = existingRequest.request_type === 'time_off' ? 'time-off' :
                                existingRequest.request_type === 'swap' ? 'shift swap' :
                                'shift cover';

      await supabase.from('notifications').insert({
        user_id: existingRequest.staff_id,
        type: 'request_rejected',
        title: 'Request declined',
        message: `Your ${requestTypeLabel} request was declined${rejection_reason ? ': ' + rejection_reason : ''}`,
        metadata: {
          request_id: shiftRequest.id,
          request_type: existingRequest.request_type,
          rejection_reason
        },
        read: false
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
