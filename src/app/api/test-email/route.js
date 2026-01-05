import { sendEmail, sendWelcomeEmail } from '@/lib/services/email'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get('email') || 'test@example.com'
    const type = searchParams.get('type') || 'basic'

    let result

    if (type === 'welcome') {
      // Test welcome email
      result = await sendWelcomeEmail(testEmail, 'Test User')
    } else {
      // Test basic email
      result = await sendEmail({
        to: testEmail,
        subject: 'Test Email from Menu Hub',
        htmlContent: `
          <h1>Hello from Menu Hub!</h1>
          <p>This is a test email to verify that Brevo email integration is working correctly.</p>
          <p>If you're reading this, it means emails are being sent successfully!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        `,
        textContent: `
Hello from Menu Hub!

This is a test email to verify that Brevo email integration is working correctly.

If you're reading this, it means emails are being sent successfully!

---
Sent at: ${new Date().toISOString()}
        `
      })
    }

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Email sent successfully!',
        messageId: result.messageId,
        to: testEmail,
        timestamp: new Date().toISOString()
      })
    } else {
      return Response.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Test email error:', error)
    return Response.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
