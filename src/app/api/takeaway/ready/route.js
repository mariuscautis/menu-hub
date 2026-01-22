export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { getEmailTranslations, t } from '@/lib/email-translations'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return Response.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          name,
          quantity,
          price_at_time
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return Response.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify this is a takeaway order
    if (order.order_type !== 'takeaway') {
      return Response.json(
        { error: 'This is not a takeaway order' },
        { status: 400 }
      )
    }

    // Check if already notified
    if (order.ready_for_pickup && order.pickup_notified_at) {
      return Response.json(
        { error: 'Customer has already been notified' },
        { status: 400 }
      )
    }

    // Fetch restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', order.restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return Response.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        ready_for_pickup: true,
        pickup_notified_at: new Date().toISOString(),
        status: 'ready'
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return Response.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      )
    }

    // Get translations for the order's locale
    const locale = order.locale || 'en'
    const tr = getEmailTranslations(locale)

    // Build email content with translations
    const itemsList = order.order_items.map(item =>
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">£${(item.price_at_time * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .pickup-code { background-color: white; border: 3px solid #16a34a; border-radius: 15px; padding: 30px; text-align: center; margin: 25px 0; }
            .pickup-code-label { font-size: 14px; color: #64748b; margin-bottom: 10px; }
            .pickup-code-value { font-size: 48px; font-weight: bold; color: #16a34a; letter-spacing: 8px; }
            .order-details { background-color: white; border-radius: 10px; padding: 20px; margin: 20px 0; }
            .order-table { width: 100%; border-collapse: collapse; }
            .order-table th { padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .total-row { font-weight: bold; font-size: 18px; }
            .ready-banner { background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 ${tr.orderReady}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">${t(tr.orderReadyGreeting, { customerName: order.customer_name })}</p>
            </div>
            <div class="content">
              <div class="ready-banner">
                <p style="margin: 0; font-size: 18px; color: #166534; font-weight: bold;">
                  ✅ ${tr.orderReadyBanner}
                </p>
              </div>

              <div class="pickup-code">
                <div class="pickup-code-label">${tr.yourPickupCode}</div>
                <div class="pickup-code-value">${order.pickup_code}</div>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 14px;">${tr.showCodeToCollect}</p>
              </div>

              <div class="order-details">
                <h3 style="margin-top: 0; color: #334155;">${tr.yourOrder}</h3>
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>${tr.item}</th>
                      <th style="text-align: center;">${tr.qty}</th>
                      <th style="text-align: right;">${tr.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                    <tr class="total-row">
                      <td colspan="2" style="padding: 15px 8px 8px 8px;">${tr.totalCash}</td>
                      <td style="padding: 15px 8px 8px 8px; text-align: right;">£${order.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="order-details">
                <h4 style="margin-top: 0; color: #334155;">📍 ${tr.pickupLocation}</h4>
                <p style="margin: 0; font-weight: bold; color: #334155; font-size: 16px;">${restaurant.name}</p>
                ${restaurant.address ? `<p style="margin: 5px 0 0 0; color: #64748b;">${restaurant.address}</p>` : ''}
                ${restaurant.phone ? `<p style="margin: 5px 0 0 0; color: #64748b;">${tr.phone}: ${restaurant.phone}</p>` : ''}
              </div>

              <div class="footer">
                <p>${restaurant.name} - ${tr.takeawayOrder}</p>
                <p>${tr.automatedMessage}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
🎉 ${tr.orderReady.toUpperCase()}

${t(tr.orderReadyGreeting, { customerName: order.customer_name })}

${tr.orderReadyBanner}

${tr.yourPickupCode.toUpperCase()}: ${order.pickup_code}
(${tr.showCodeToCollect})

${tr.yourOrder.toUpperCase()}
${order.order_items.map(item => `${item.quantity}x ${item.name} - £${(item.price_at_time * item.quantity).toFixed(2)}`).join('\n')}

${tr.totalCash}: £${order.total.toFixed(2)}

${tr.pickupLocation.toUpperCase()}
${restaurant.name}
${restaurant.address || ''}
${restaurant.phone ? `${tr.phone}: ${restaurant.phone}` : ''}

---
${tr.automatedMessage}
    `

    // Send email using Brevo
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: restaurant.name,
          email: process.env.EMAIL_FROM || 'noreply@menuhub.app'
        },
        to: [{ email: order.customer_email, name: order.customer_name }],
        subject: `🎉 ${tr.orderReady} - ${restaurant.name}`,
        htmlContent,
        textContent
      })
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('Brevo API error:', errorData)
      // Don't fail - the order is still marked ready
      return Response.json({
        success: true,
        emailSent: false,
        message: 'Order marked ready but email failed to send',
        pickupCode: order.pickup_code
      })
    }

    return Response.json({
      success: true,
      emailSent: true,
      message: 'Order ready notification sent',
      pickupCode: order.pickup_code
    })

  } catch (error) {
    console.error('Ready for pickup API error:', error)
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
