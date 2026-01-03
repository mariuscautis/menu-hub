export const runtime = 'edge';

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

    console.log('Generating invoice for order:', orderId);

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

    // Fetch FRESH restaurant data to get current tax rate (order.restaurants might be stale)
    const { data: freshRestaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', order.restaurant_id)
      .single();

    if (restaurantError || !freshRestaurant) {
      console.error('Failed to fetch fresh restaurant data:', restaurantError);
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const restaurant = freshRestaurant;
    console.log('Fresh restaurant data loaded:', {
      id: restaurant.id,
      name: restaurant.name,
      menu_sales_tax_rate: restaurant.menu_sales_tax_rate,
      menu_sales_tax_name: restaurant.menu_sales_tax_name
    });

    // Check if invoice settings are enabled
    if (!restaurant.invoice_settings?.enabled) {
      return NextResponse.json(
        { error: 'Invoices are not enabled for this restaurant' },
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

      // Get sales tax rate from restaurant settings
      console.log('Restaurant menu_sales_tax_rate from DB:', restaurant.menu_sales_tax_rate);
      const taxRate = parseFloat(restaurant.menu_sales_tax_rate) || 20;
      console.log('Final tax rate being used:', taxRate);

      // Calculate line items with TAX-INCLUSIVE pricing
      // Menu prices already include tax - we calculate backwards to show the breakdown
      const items = order.order_items.map(item => {
        const priceIncludingTax = parseFloat(item.price_at_time || item.price || 0);
        const quantity = item.quantity || 0;
        const lineTotal = priceIncludingTax * quantity; // This is what customer actually pays

        // Calculate tax backwards from the inclusive price
        // If price is £5.00 with 21% tax:
        // netAmount = £5.00 / 1.21 = £4.13
        // taxAmount = £5.00 - £4.13 = £0.87
        const taxMultiplier = 1 + (taxRate / 100);
        const netAmount = lineTotal / taxMultiplier;
        const taxAmount = lineTotal - netAmount;
        const unitPriceNet = netAmount / quantity;

        return {
          description: item.menu_items?.name || 'Item',
          quantity: quantity,
          unit_price: unitPriceNet, // Net price per unit (excluding tax)
          tax_rate: taxRate,
          tax_amount: taxAmount,
          line_total: lineTotal // Total including tax (what customer pays)
        };
      });

      // Calculate totals
      const total = items.reduce((sum, item) => sum + item.line_total, 0); // Total paid by customer
      const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
      const subtotal = total - totalTax; // Net amount before tax

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
        tax_name: restaurant.menu_sales_tax_name || 'VAT',
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

      console.log('Creating invoice with tax_name:', invoiceData.tax_name);
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
    console.log('Invoice object tax_name:', invoice.tax_name);

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

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`
      }
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice: ' + error.message },
      { status: 500 }
    );
  }
}
