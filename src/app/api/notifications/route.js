export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// GET - Fetch notifications for a user
export async function GET(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new notification
export async function POST(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const { user_id, type, title, message, metadata } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json(
        { error: 'user_id, type, and title are required' },
        { status: 400 }
      );
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        metadata,
        read: false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update notification (mark as read)
export async function PUT(request) {
  const supabase = getSupabase()
  try {
    const body = await request.json();
    const { id, ids, user_id, read } = body;

    if (id) {
      // Update single notification
      const { data: notification, error } = await supabase
        .from('notifications')
        .update({ read: read !== undefined ? read : true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ notification });
    } else if (ids && Array.isArray(ids)) {
      // Update multiple notifications
      const { error } = await supabase
        .from('notifications')
        .update({ read: read !== undefined ? read : true })
        .in('id', ids);

      if (error) throw error;
      return NextResponse.json({ success: true });
    } else if (user_id) {
      // Mark all as read for a user
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user_id)
        .eq('read', false);

      if (error) throw error;
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'id, ids, or user_id is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete notification
export async function DELETE(request) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
