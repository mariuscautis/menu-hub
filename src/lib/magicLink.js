import { supabase } from './supabase'
import crypto from 'crypto'

/**
 * Generate a magic link for staff member
 * @param {string} staffId - Staff member's ID
 * @param {string} email - Staff member's email
 * @returns {Promise<string>} - The magic link URL
 */
export async function generateStaffMagicLink(staffId, email) {
  // Generate a secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // Valid for 7 days

  // Store token in database
  const { error } = await supabase
    .from('staff_magic_links')
    .insert({
      staff_id: staffId,
      token: token,
      expires_at: expiresAt.toISOString(),
      used: false
    })

  if (error) {
    console.error('Error creating magic link:', error)
    throw error
  }

  // Generate the magic link URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLink = `${baseUrl}/staff-magic-login?token=${token}`

  return magicLink
}

/**
 * Verify and consume a magic link token
 * @param {string} token - The magic link token
 * @returns {Promise<object|null>} - Staff session data or null if invalid
 */
export async function verifyMagicLink(token) {
  // Fetch the magic link record
  const { data: linkData, error: linkError } = await supabase
    .from('staff_magic_links')
    .select(`
      *,
      staff:staff_id (
        id,
        name,
        email,
        restaurant_id,
        department,
        role,
        status,
        restaurants(name)
      )
    `)
    .eq('token', token)
    .eq('used', false)
    .maybeSingle()

  if (linkError || !linkData) {
    return null
  }

  // Check if token has expired
  const now = new Date()
  const expiresAt = new Date(linkData.expires_at)

  if (now > expiresAt) {
    return null
  }

  // Check if staff is still active
  if (linkData.staff.status !== 'active') {
    return null
  }

  // Mark token as used
  await supabase
    .from('staff_magic_links')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('token', token)

  // Return staff session data
  return {
    staff_id: linkData.staff.id,
    name: linkData.staff.name,
    email: linkData.staff.email,
    restaurant_id: linkData.staff.restaurant_id,
    restaurant_name: linkData.staff.restaurants?.name,
    department: linkData.staff.department,
    role: linkData.staff.role,
    logged_in_at: new Date().toISOString()
  }
}
