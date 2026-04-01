export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
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
};

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { orderId, clientId, clientData, splitBillData } = await request.json();

    console.log('Generating invoice data for order:', orderId);

    // Fetch order details with all related data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, restaurants(*), tables(table_number), order_items(*, menu_items(id, name))')
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

    // Fetch FRESH restaurant data
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

    // Fetch menu sales tax categories for this restaurant
    const { data: taxCategories } = await supabaseAdmin
      .from('menu_sales_tax_categories')
      .select('id, name, rate')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true);

    // Fetch sales_tax_category_id for each menu item separately.
    // We cannot use a join because sales_tax_category_id was added via migration
    // and is not in Supabase's schema cache, so joins always return null for it.
    const menuItemIds = (order.order_items || [])
      .map(oi => oi.menu_item_id)
      .filter(Boolean);
    let menuItemTaxMap = {};
    if (menuItemIds.length > 0) {
      const { data: menuItemRows } = await supabaseAdmin
        .from('menu_items')
        .select('id, sales_tax_category_id')
        .in('id', menuItemIds);
      for (const row of (menuItemRows || [])) {
        menuItemTaxMap[row.id] = row.sales_tax_category_id;
      }
    }

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

      // Build a lookup map for tax categories
      const taxCategoryMap = {};
      for (const cat of (taxCategories || [])) {
        taxCategoryMap[cat.id] = cat;
      }

      // Calculate line items with TAX-INCLUSIVE pricing.
      // Each item uses its own assigned sales_tax_category_id rate.
      // If no category is assigned, the item is treated as 0% tax (price is the net price).
      const items = order.order_items.map(item => {
        const priceIncludingTax = parseFloat(item.price_at_time || item.price || 0);
        const quantity = item.quantity || 0;
        const lineTotal = priceIncludingTax * quantity;

        const menuItem = item.menu_items || {};
        const salesTaxCategoryId = menuItemTaxMap[item.menu_item_id];
        const taxCat = salesTaxCategoryId
          ? taxCategoryMap[salesTaxCategoryId]
          : null;
        const taxRate = taxCat ? parseFloat(taxCat.rate) : 0;
        const taxName = taxCat ? taxCat.name : null;

        // Back-calculate net from tax-inclusive price
        const taxMultiplier = 1 + (taxRate / 100);
        const netAmount = lineTotal / taxMultiplier;
        const taxAmount = lineTotal - netAmount;
        const unitPriceNet = quantity > 0 ? netAmount / quantity : 0;

        return {
          description: menuItem.name || 'Item',
          quantity,
          unit_price: unitPriceNet,
          tax_rate: taxRate,
          tax_name: taxName,
          tax_amount: taxAmount,
          line_total: lineTotal
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
        tax_name: 'Tax',
        currency: restaurant.invoice_settings.currency || 'EUR',

        // Payment info
        payment_method: order.payment_method || 'Cash',
        payment_status: order.status === 'completed' ? 'paid' : 'unpaid',
        paid_at: order.status === 'completed' ? new Date().toISOString() : null,

        // Metadata
        table_number: order.tables?.table_number || null,
        notes: [clientData?.notes, order.payment_reference ? `Ref: ${order.payment_reference}` : null].filter(Boolean).join('\n') || null,
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

    // Return invoice data and restaurant info for client-side PDF generation
    // PDF generation happens on the client using @react-pdf/renderer's browser API
    return NextResponse.json({
      success: true,
      invoice: invoice,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        logo_url: restaurant.logo_url,
        invoice_settings: restaurant.invoice_settings
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
