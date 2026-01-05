// Debug route to check Brevo configuration
export const runtime = 'edge'

export async function GET(request) {
  return Response.json({
    apiKeyPresent: !!process.env.BREVO_API_KEY,
    apiKeyLength: process.env.BREVO_API_KEY?.length || 0,
    apiKeyPrefix: process.env.BREVO_API_KEY?.substring(0, 15) || 'NOT_FOUND',
    emailFrom: process.env.EMAIL_FROM,
    emailFromName: process.env.EMAIL_FROM_NAME,
    nodeEnv: process.env.NODE_ENV
  })
}
