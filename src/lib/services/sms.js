/**
 * SMS Service using Brevo
 * Handles transactional SMS for the Menu Hub application
 */

import * as brevo from '@getbrevo/brevo'

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalSMSApi()
apiInstance.setApiKey(
  brevo.TransactionalSMSApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
)

/**
 * Send a transactional SMS using Brevo
 * @param {Object} options - SMS options
 * @param {string} options.to - Recipient phone number (E.164 format: +1234567890)
 * @param {string} options.message - SMS message content (max 160 characters for single SMS)
 * @param {string} [options.sender] - Sender name (max 11 characters, alphanumeric)
 * @returns {Promise<Object>} - Response from Brevo API
 */
export async function sendSMS({ to, message, sender = 'MenuHub' }) {
  try {
    // Validate phone number format (should be E.164 format)
    if (!to.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +1234567890)')
    }

    // Prepare SMS data
    const sendTransacSms = new brevo.SendTransacSms()
    sendTransacSms.sender = sender
    sendTransacSms.recipient = to
    sendTransacSms.content = message
    sendTransacSms.type = 'transactional'

    // Send the SMS
    const response = await apiInstance.sendTransacSms(sendTransacSms)

    console.log('SMS sent successfully:', {
      reference: response.reference,
      to: to
    })

    return {
      success: true,
      reference: response.reference,
      response
    }
  } catch (error) {
    console.error('Failed to send SMS:', error)

    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    }
  }
}

/**
 * Send order ready notification via SMS
 * @param {string} phone - Customer phone number
 * @param {string} orderNumber - Order number
 * @returns {Promise<Object>}
 */
export async function sendOrderReadySMS(phone, orderNumber) {
  const message = `Your order #${orderNumber} is ready for pickup! - Menu Hub`

  return sendSMS({
    to: phone,
    message
  })
}

/**
 * Send table ready notification via SMS
 * @param {string} phone - Customer phone number
 * @param {string} tableNumber - Table number
 * @returns {Promise<Object>}
 */
export async function sendTableReadySMS(phone, tableNumber) {
  const message = `Your table #${tableNumber} is now ready. Please proceed to the host stand. - Menu Hub`

  return sendSMS({
    to: phone,
    message
  })
}

/**
 * Send reservation confirmation via SMS
 * @param {string} phone - Customer phone number
 * @param {Object} reservationDetails - Reservation information
 * @returns {Promise<Object>}
 */
export async function sendReservationConfirmationSMS(phone, reservationDetails) {
  const { date, time, partySize, restaurantName } = reservationDetails

  const message = `Reservation confirmed at ${restaurantName} for ${partySize} on ${date} at ${time}. See you then! - Menu Hub`

  return sendSMS({
    to: phone,
    message
  })
}

/**
 * Send reservation reminder via SMS
 * @param {string} phone - Customer phone number
 * @param {Object} reservationDetails - Reservation information
 * @returns {Promise<Object>}
 */
export async function sendReservationReminderSMS(phone, reservationDetails) {
  const { time, restaurantName } = reservationDetails

  const message = `Reminder: Your reservation at ${restaurantName} is today at ${time}. We look forward to seeing you! - Menu Hub`

  return sendSMS({
    to: phone,
    message
  })
}

/**
 * Send staff shift reminder via SMS
 * @param {string} phone - Staff phone number
 * @param {Object} shiftDetails - Shift information
 * @returns {Promise<Object>}
 */
export async function sendShiftReminderSMS(phone, shiftDetails) {
  const { date, startTime, position } = shiftDetails

  const message = `Shift reminder: ${position} shift tomorrow ${date} at ${startTime}. - Menu Hub`

  return sendSMS({
    to: phone,
    message
  })
}
