/**
 * Cloudflare Worker: Email Proxy
 *
 * This worker acts as a secure proxy for Brevo API calls.
 * The BREVO_API_KEY is stored as a Worker secret, not in code.
 */

export default {
  async fetch(request, env) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // CORS headers for your domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://www.venoapp.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Parse the incoming request
      const emailData = await request.json()

      // Validate required fields
      if (!emailData.to || !emailData.subject || !emailData.htmlContent) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: to, subject, htmlContent'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Prepare recipient list
      const recipients = Array.isArray(emailData.to)
        ? emailData.to.map(email => ({ email }))
        : [{ email: emailData.to }]

      // Prepare request body for Brevo
      const brevoBody = {
        sender: {
          email: emailData.from || env.EMAIL_FROM || 'noreply@venoapp.com',
          name: emailData.fromName || env.EMAIL_FROM_NAME || 'Menu Hub'
        },
        to: recipients,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent
      }

      // Add plain text version if provided
      if (emailData.textContent) {
        brevoBody.textContent = emailData.textContent
      }

      // Add reply-to if provided
      if (emailData.replyTo) {
        brevoBody.replyTo = { email: emailData.replyTo }
      }

      // Call Brevo API with the secret API key
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY, // This comes from Worker secrets
          'content-type': 'application/json'
        },
        body: JSON.stringify(brevoBody)
      })

      const brevoData = await brevoResponse.json()

      if (!brevoResponse.ok) {
        console.error('Brevo API error:', brevoData)
        return new Response(JSON.stringify({
          success: false,
          error: brevoData.message || 'Failed to send email'
        }), {
          status: brevoResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Return success response
      return new Response(JSON.stringify({
        success: true,
        messageId: brevoData.messageId,
        response: brevoData
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Worker error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }
}
