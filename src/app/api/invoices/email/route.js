import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoiceTemplate from '@/components/invoices/InvoiceTemplate';
import ClassicTemplate from '@/components/invoices/templates/ClassicTemplate';
import ModernMinimalTemplate from '@/components/invoices/templates/ModernMinimalTemplate';
import BoldColorfulTemplate from '@/components/invoices/templates/BoldColorfulTemplate';
import CompactDetailedTemplate from '@/components/invoices/templates/CompactDetailedTemplate';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  try {
    const { orderId, clientId, clientData, splitBillData } = await request.json();

    console.log('Generating and emailing invoice for order:', orderId);

    // Fetch order details with all related data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, restaurants(*), tables(table_number), order_items(*, menu_items(*))')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If split bill data is provided, filter order items to only include those in the split bill
    if (splitBillData && splitBillData.items) {
      const splitBillItemIds = new Set(splitBillData.items.map(item => item.id));
      order.order_items = order.order_items.filter(item => splitBillItemIds.has(item.id));

      // Update quantities for split items
      order.order_items = order.order_items.map(orderItem => {
        const splitItem = splitBillData.items.find(item => item.id === orderItem.id);
        if (splitItem && splitItem.quantity !== orderItem.quantity) {
          return { ...orderItem, quantity: splitItem.quantity };
        }
        return orderItem;
      });
    }

    const restaurant = order.restaurants;

    // Check if invoice settings are enabled
    if (!restaurant.invoice_settings?.enabled) {
      return NextResponse.json(
        { error: 'Invoices are not enabled for this restaurant' },
        { status: 400 }
      );
    }

    // Validate client email
    if (!clientData.email) {
      return NextResponse.json(
        { error: 'Client email is required for email delivery' },
        { status: 400 }
      );
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    let invoice;

    if (existingInvoice) {
      console.log('Invoice already exists, using existing invoice:', existingInvoice.invoice_number);
      invoice = existingInvoice;
    } else {
      // Generate next invoice number
      const { data: invoiceNumber, error: numberError } = await supabaseAdmin
        .rpc('get_next_invoice_number', { p_restaurant_id: restaurant.id });

      if (numberError || !invoiceNumber) {
        console.error('Failed to generate invoice number:', numberError);
        return NextResponse.json(
          { error: 'Failed to generate invoice number' },
          { status: 500 }
        );
      }

      console.log('Generated invoice number:', invoiceNumber);

      // Validate order has items
      if (!order.order_items || order.order_items.length === 0) {
        console.error('Order has no items');
        return NextResponse.json(
          { error: 'Order has no items to invoice' },
          { status: 400 }
        );
      }

      // Get default tax rate from settings
      const defaultTaxRate = restaurant.invoice_settings.tax_rates?.find(r => r.is_default)
        || restaurant.invoice_settings.tax_rates?.[0]
        || { rate: 0 };

      // Calculate line items with tax
      const items = order.order_items.map(item => {
        const unitPrice = parseFloat(item.price_at_time || item.price || 0);
        const quantity = item.quantity || 0;
        const taxRate = defaultTaxRate.rate || 0;
        const subtotal = unitPrice * quantity;
        const taxAmount = subtotal * (taxRate / 100);
        const lineTotal = subtotal + taxAmount;

        return {
          description: item.menu_items?.name || 'Item',
          quantity: quantity,
          unit_price: unitPrice,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          line_total: lineTotal
        };
      });

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
      const total = subtotal + totalTax;

      console.log('Invoice totals:', { subtotal, totalTax, total, itemCount: items.length });

      // Create invoice record
      const invoiceData = {
        restaurant_id: restaurant.id,
        order_id: orderId,
        client_id: clientId || null,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0], // Immediate for restaurants

        // Business info (from restaurant)
        business_name: restaurant.name,
        business_address: restaurant.address || '',
        business_city: restaurant.city || '',
        business_postal_code: restaurant.postal_code || '',
        business_country: restaurant.country || '',
        business_phone: restaurant.phone || '',
        business_email: restaurant.email || '',
        business_vat_number: restaurant.invoice_settings.vat_number || null,
        business_tax_id: restaurant.invoice_settings.tax_id || null,
        business_company_registration: restaurant.invoice_settings.company_registration || null,

        // Customer info (from client data)
        customer_name: clientData?.name || null,
        customer_company: clientData?.company || null,
        customer_address: clientData?.address || null,
        customer_city: clientData?.city || null,
        customer_postal_code: clientData?.postal_code || null,
        customer_country: clientData?.country || null,
        customer_phone: clientData?.phone || null,
        customer_email: clientData?.email || null,
        customer_vat_number: clientData?.vat_number || null,
        customer_tax_id: clientData?.tax_id || null,

        // Financial data
        items: items,
        subtotal: subtotal,
        total_tax: totalTax,
        total: total,
        currency: restaurant.invoice_settings.currency || 'EUR',

        // Payment info
        payment_method: order.payment_method || 'Cash',
        payment_status: order.status === 'completed' ? 'paid' : 'unpaid',
        paid_at: order.status === 'completed' ? new Date().toISOString() : null,

        // Metadata
        table_number: order.tables?.table_number || null,
        notes: clientData?.notes || null,
        footer_text: restaurant.invoice_settings.footer_text || ''
      };

      console.log('Creating invoice record...');

      // Insert invoice into database
      const { data: newInvoice, error: insertError } = await supabaseAdmin
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating invoice:', insertError);
        return NextResponse.json(
          { error: 'Failed to create invoice: ' + insertError.message },
          { status: 500 }
        );
      }

      console.log('Invoice created:', newInvoice.id);

      // Link invoice to order
      await supabaseAdmin
        .from('orders')
        .update({ invoice_id: newInvoice.id })
        .eq('id', orderId);

      invoice = newInvoice;
    }

    // Generate PDF with selected template
    console.log('Generating PDF...');

    // Get selected template (default to classic)
    const selectedTemplate = restaurant.invoice_settings?.template || 'classic';
    console.log('Using template:', selectedTemplate);

    // Map template ID to component
    const templateComponents = {
      'classic': ClassicTemplate,
      'modern-minimal': ModernMinimalTemplate,
      'bold-colorful': BoldColorfulTemplate,
      'compact-detailed': CompactDetailedTemplate
    };

    const TemplateComponent = templateComponents[selectedTemplate] || ClassicTemplate;

    const pdfBuffer = await renderToBuffer(
      <TemplateComponent invoice={invoice} restaurant={restaurant} />
    );

    console.log('PDF generated successfully');

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'invoices@yourdomain.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    console.log('Sending email to:', clientData.email);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailFrom,
        to: clientData.email,
        subject: `Invoice ${invoice.invoice_number} from ${restaurant.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invoice from ${restaurant.name}</h2>
            <p>Dear ${clientData.name},</p>
            <p>Thank you for your business! Please find your invoice attached.</p>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ${invoice.currency} ${invoice.total.toFixed(2)}</p>
              ${invoice.table_number ? `<p><strong>Table:</strong> ${invoice.table_number}</p>` : ''}
            </div>

            <p>If you have any questions about this invoice, please contact us:</p>
            <p>
              ${restaurant.name}<br/>
              ${restaurant.email || ''}<br/>
              ${restaurant.phone || ''}
            </p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This invoice was generated automatically by ${restaurant.name}.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `${invoice.invoice_number}.pdf`,
            content: pdfBuffer.toString('base64')
          }
        ]
      })
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json();
      console.error('Failed to send email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email: ' + (emailError.message || 'Unknown error') },
        { status: 500 }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return NextResponse.json({
      success: true,
      invoice_number: invoice.invoice_number,
      email_sent_to: clientData.email,
      email_id: emailResult.id
    });

  } catch (error) {
    console.error('Invoice email error:', error);
    return NextResponse.json(
      { error: 'Failed to email invoice: ' + error.message },
      { status: 500 }
    );
  }
}
