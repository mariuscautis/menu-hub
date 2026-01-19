'use client';

import { pdf, Font } from '@react-pdf/renderer';
import ClassicTemplate from '@/components/invoices/templates/ClassicTemplate';
import ModernMinimalTemplate from '@/components/invoices/templates/ModernMinimalTemplate';
import BoldColorfulTemplate from '@/components/invoices/templates/BoldColorfulTemplate';
import CompactDetailedTemplate from '@/components/invoices/templates/CompactDetailedTemplate';

// Register Roboto font for Unicode/diacritics support
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 'bold',
    },
  ],
});

// Translation messages for PDF invoices
const invoicePdfMessages = {
  en: {
    invoice: "INVOICE",
    invoiceNumber: "Invoice #:",
    invoiceNumberAlt: "Invoice Number",
    date: "Date:",
    dateAlt: "Invoice Date",
    dueDate: "Due Date:",
    dueDateAlt: "Due Date",
    from: "From",
    billTo: "Bill To",
    tel: "Tel:",
    email: "Email:",
    vat: "VAT:",
    taxId: "Tax ID:",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit Price",
    total: "Total",
    subtotal: "Subtotal:",
    subtotalAlt: "Subtotal",
    grandTotal: "TOTAL:",
    totalAlt: "Total",
    paid: "PAID",
    paidInFull: "PAID IN FULL",
    table: "Table:",
    tableAlt: "Table",
    paymentMethod: "Payment Method:",
    paymentMethodAlt: "Payment Method",
    payment: "Payment:",
    paidOn: "Paid On:",
    paidOnAlt: "Paid On",
    notes: "Notes",
    no: "No:"
  },
  ro: {
    invoice: "FACTURA",
    invoiceNumber: "Factura #:",
    invoiceNumberAlt: "Numar Factura",
    date: "Data:",
    dateAlt: "Data Facturii",
    dueDate: "Scadenta:",
    dueDateAlt: "Data Scadenta",
    from: "De la",
    billTo: "Catre",
    tel: "Tel:",
    email: "Email:",
    vat: "TVA:",
    taxId: "CUI:",
    description: "Descriere",
    qty: "Cant.",
    unitPrice: "Pret Unitar",
    total: "Total",
    subtotal: "Subtotal:",
    subtotalAlt: "Subtotal",
    grandTotal: "TOTAL:",
    totalAlt: "Total",
    paid: "PLATIT",
    paidInFull: "PLATIT INTEGRAL",
    table: "Masa:",
    tableAlt: "Masa",
    paymentMethod: "Metoda de Plata:",
    paymentMethodAlt: "Metoda de Plata",
    payment: "Plata:",
    paidOn: "Platit la:",
    paidOnAlt: "Platit la",
    notes: "Note",
    no: "Nr:"
  },
  es: {
    invoice: "FACTURA",
    invoiceNumber: "Factura #:",
    invoiceNumberAlt: "Numero de Factura",
    date: "Fecha:",
    dateAlt: "Fecha de Factura",
    dueDate: "Vencimiento:",
    dueDateAlt: "Fecha de Vencimiento",
    from: "De",
    billTo: "Facturar a",
    tel: "Tel:",
    email: "Email:",
    vat: "IVA:",
    taxId: "NIF:",
    description: "Descripcion",
    qty: "Cant.",
    unitPrice: "Precio Unitario",
    total: "Total",
    subtotal: "Subtotal:",
    subtotalAlt: "Subtotal",
    grandTotal: "TOTAL:",
    totalAlt: "Total",
    paid: "PAGADO",
    paidInFull: "PAGADO EN SU TOTALIDAD",
    table: "Mesa:",
    tableAlt: "Mesa",
    paymentMethod: "Metodo de Pago:",
    paymentMethodAlt: "Metodo de Pago",
    payment: "Pago:",
    paidOn: "Pagado el:",
    paidOnAlt: "Pagado el",
    notes: "Notas",
    no: "No:"
  },
  fr: {
    invoice: "FACTURE",
    invoiceNumber: "Facture #:",
    invoiceNumberAlt: "Numero de Facture",
    date: "Date:",
    dateAlt: "Date de Facture",
    dueDate: "Echeance:",
    dueDateAlt: "Date d'Echeance",
    from: "De",
    billTo: "Facturer a",
    tel: "Tel:",
    email: "Email:",
    vat: "TVA:",
    taxId: "SIRET:",
    description: "Description",
    qty: "Qte",
    unitPrice: "Prix Unitaire",
    total: "Total",
    subtotal: "Sous-total:",
    subtotalAlt: "Sous-total",
    grandTotal: "TOTAL:",
    totalAlt: "Total",
    paid: "PAYE",
    paidInFull: "PAYE EN TOTALITE",
    table: "Table:",
    tableAlt: "Table",
    paymentMethod: "Mode de Paiement:",
    paymentMethodAlt: "Mode de Paiement",
    payment: "Paiement:",
    paidOn: "Paye le:",
    paidOnAlt: "Paye le",
    notes: "Notes",
    no: "No:"
  },
  it: {
    invoice: "FATTURA",
    invoiceNumber: "Fattura #:",
    invoiceNumberAlt: "Numero Fattura",
    date: "Data:",
    dateAlt: "Data Fattura",
    dueDate: "Scadenza:",
    dueDateAlt: "Data di Scadenza",
    from: "Da",
    billTo: "Fattura a",
    tel: "Tel:",
    email: "Email:",
    vat: "IVA:",
    taxId: "P.IVA:",
    description: "Descrizione",
    qty: "Qta",
    unitPrice: "Prezzo Unitario",
    total: "Totale",
    subtotal: "Subtotale:",
    subtotalAlt: "Subtotale",
    grandTotal: "TOTALE:",
    totalAlt: "Totale",
    paid: "PAGATO",
    paidInFull: "PAGATO PER INTERO",
    table: "Tavolo:",
    tableAlt: "Tavolo",
    paymentMethod: "Metodo di Pagamento:",
    paymentMethodAlt: "Metodo di Pagamento",
    payment: "Pagamento:",
    paidOn: "Pagato il:",
    paidOnAlt: "Pagato il",
    notes: "Note",
    no: "N.:"
  }
};

// Map template ID to component
const templateComponents = {
  'classic': ClassicTemplate,
  'modern-minimal': ModernMinimalTemplate,
  'bold-colorful': BoldColorfulTemplate,
  'compact-detailed': CompactDetailedTemplate
};

/**
 * Generate PDF blob from invoice data (client-side)
 * @param {Object} invoice - The invoice data object
 * @param {Object} restaurant - The restaurant data with invoice_settings
 * @returns {Promise<Blob>} - PDF blob
 */
export async function generateInvoicePdfBlob(invoice, restaurant) {
  // Get selected template (default to classic)
  const selectedTemplate = restaurant.invoice_settings?.template || 'classic';

  // Get language from locale (e.g., 'en-GB' -> 'en', 'ro-RO' -> 'ro')
  const locale = restaurant.invoice_settings?.locale || 'en-GB';
  const lang = locale.split('-')[0];
  const t = invoicePdfMessages[lang] || invoicePdfMessages.en;

  const TemplateComponent = templateComponents[selectedTemplate] || ClassicTemplate;

  // Generate PDF blob using browser-compatible API
  const blob = await pdf(<TemplateComponent invoice={invoice} restaurant={restaurant} t={t} />).toBlob();

  return blob;
}

/**
 * Generate PDF as base64 string from invoice data (client-side)
 * @param {Object} invoice - The invoice data object
 * @param {Object} restaurant - The restaurant data with invoice_settings
 * @returns {Promise<string>} - Base64 encoded PDF string
 */
export async function generateInvoicePdfBase64(invoice, restaurant) {
  const blob = await generateInvoicePdfBlob(invoice, restaurant);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Remove data URL prefix to get just base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download invoice PDF (client-side)
 * @param {Object} invoice - The invoice data object
 * @param {Object} restaurant - The restaurant data with invoice_settings
 */
export async function downloadInvoicePdf(invoice, restaurant) {
  const blob = await generateInvoicePdfBlob(invoice, restaurant);

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
