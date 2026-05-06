/**
 * Returns all active printers that should receive a job for the given trigger.
 * @param {Array} printers - rows from the Supabase printers table
 * @param {string} trigger - 'receipt' | department name e.g. 'kitchen', 'bar'
 * @returns {Array} matching active printers
 */
export function getReceivingPrinters(printers, trigger) {
  if (!Array.isArray(printers) || !trigger) return []
  return printers.filter(p =>
    p.is_active &&
    Array.isArray(p.departments) &&
    p.departments.includes(trigger)
  )
}
