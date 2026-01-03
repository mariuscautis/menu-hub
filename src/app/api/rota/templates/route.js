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

// GET - Fetch shift templates
export async function GET(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const dayOfWeek = searchParams.get('day_of_week');
    const department = searchParams.get('department');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('shift_templates')
      .select('*')
      .eq('restaurant_id', restaurantId);

    // Apply filters
    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      query = query.eq('day_of_week', parseInt(dayOfWeek));
    }
    if (department) {
      query = query.eq('department', department);
    }

    query = query.order('day_of_week', { ascending: true, nullsFirst: false })
                 .order('shift_start', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ templates: data });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create shift template or apply template to create shifts
export async function POST(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const {
      action, // 'create' or 'apply'
      restaurant_id,
      name,
      description,
      day_of_week,
      shift_start,
      shift_end,
      break_duration,
      role_required,
      department,
      staff_count,
      // For apply action
      template_id,
      apply_from_date,
      apply_to_date,
      staff_ids
    } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    if (action === 'apply') {
      // Apply template to create shifts
      if (!template_id || !apply_from_date || !apply_to_date) {
        return NextResponse.json(
          { error: 'Template ID, from date, and to date are required for apply action' },
          { status: 400 }
        );
      }

      // Get template
      const { data: template } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Generate shifts for date range
      const startDate = new Date(apply_from_date);
      const endDate = new Date(apply_to_date);
      const shiftsToCreate = [];

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();

        // If template has specific day_of_week, only create on that day
        if (template.day_of_week !== null && dayOfWeek !== template.day_of_week) {
          continue;
        }

        // Create shifts based on staff_count
        const shiftsForDay = template.staff_count || 1;
        for (let i = 0; i < shiftsForDay; i++) {
          shiftsToCreate.push({
            restaurant_id: template.restaurant_id,
            staff_id: staff_ids && staff_ids[i] ? staff_ids[i] : null,
            date: date.toISOString().split('T')[0],
            shift_start: template.shift_start,
            shift_end: template.shift_end,
            break_duration: template.break_duration || 30,
            role_required: template.role_required,
            department: template.department,
            notes: `Created from template: ${template.name}`,
            status: 'draft'
          });
        }
      }

      if (shiftsToCreate.length === 0) {
        return NextResponse.json(
          { error: 'No shifts created. Check template day_of_week matches dates in range.' },
          { status: 400 }
        );
      }

      const { data: createdShifts, error: createError } = await supabase
        .from('shifts')
        .insert(shiftsToCreate)
        .select();

      if (createError) throw createError;

      return NextResponse.json({
        message: `${createdShifts.length} shifts created from template`,
        shifts: createdShifts
      }, { status: 201 });
    } else {
      // Create new template
      if (!name || !shift_start || !shift_end || !role_required) {
        return NextResponse.json(
          { error: 'Missing required fields for template creation' },
          { status: 400 }
        );
      }

      const { data: template, error } = await supabase
        .from('shift_templates')
        .insert({
          restaurant_id,
          name,
          description,
          day_of_week,
          shift_start,
          shift_end,
          break_duration: break_duration || 30,
          role_required,
          department,
          staff_count: staff_count || 1
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ template }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in template operation:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update shift template
export async function PUT(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      day_of_week,
      shift_start,
      shift_end,
      break_duration,
      role_required,
      department,
      staff_count
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (day_of_week !== undefined) updateData.day_of_week = day_of_week;
    if (shift_start !== undefined) updateData.shift_start = shift_start;
    if (shift_end !== undefined) updateData.shift_end = shift_end;
    if (break_duration !== undefined) updateData.break_duration = break_duration;
    if (role_required !== undefined) updateData.role_required = role_required;
    if (department !== undefined) updateData.department = department;
    if (staff_count !== undefined) updateData.staff_count = staff_count;

    const { data: template, error } = await supabase
      .from('shift_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete shift template
export async function DELETE(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shift_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
