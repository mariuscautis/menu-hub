import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#6262bd',
    paddingBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
    alignSelf: 'center',
    objectFit: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6262bd',
    marginBottom: 10,
    textAlign: 'center',
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressBlock: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6262bd',
    color: 'white',
    padding: 10,
    fontWeight: 'bold',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  col1: { width: '45%' },
  col2: { width: '15%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: '50%',
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10,
    color: '#6b7280',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#6262bd',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6262bd',
  },
  paymentStatus: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#d1fae5',
    borderRadius: 4,
    textAlign: 'center',
  },
  paymentStatusText: {
    fontSize: 9,
    color: '#059669',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  metadata: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    fontSize: 9,
    color: '#6b7280',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metadataLabel: {
    fontWeight: 'bold',
    width: '40%',
  },
  metadataValue: {
    width: '60%',
  },
});

const ClassicTemplate = ({ invoice, restaurant }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {restaurant.logo_url && (
            <Image src={restaurant.logo_url} style={styles.logo} />
          )}
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.invoiceInfo}>
            <View>
              <Text>Invoice #: {invoice.invoice_number}</Text>
              <Text>Date: {formatDate(invoice.invoice_date)}</Text>
            </View>
            {invoice.due_date && (
              <View>
                <Text>Due Date: {formatDate(invoice.due_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Business and Customer Info */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
          {/* From (Business) */}
          <View style={{ width: '48%' }}>
            <Text style={styles.sectionTitle}>From</Text>
            <View style={styles.addressBlock}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{invoice.business_name}</Text>
              {invoice.business_address && <Text>{invoice.business_address}</Text>}
              {invoice.business_city && (
                <Text>{invoice.business_city}{invoice.business_postal_code && `, ${invoice.business_postal_code}`}</Text>
              )}
              {invoice.business_country && <Text>{invoice.business_country}</Text>}
              {invoice.business_phone && <Text>Tel: {invoice.business_phone}</Text>}
              {invoice.business_email && <Text>Email: {invoice.business_email}</Text>}
              {invoice.business_vat_number && (
                <Text style={{ marginTop: 6, fontWeight: 'bold' }}>
                  VAT: {invoice.business_vat_number}
                </Text>
              )}
              {invoice.business_tax_id && (
                <Text style={{ fontWeight: 'bold' }}>Tax ID: {invoice.business_tax_id}</Text>
              )}
            </View>
          </View>

          {/* To (Customer) */}
          {invoice.customer_name && (
            <View style={{ width: '48%' }}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <View style={styles.addressBlock}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{invoice.customer_name}</Text>
                {invoice.customer_company && (
                  <Text style={{ fontWeight: 'bold' }}>{invoice.customer_company}</Text>
                )}
                {invoice.customer_address && <Text>{invoice.customer_address}</Text>}
                {invoice.customer_city && (
                  <Text>{invoice.customer_city}{invoice.customer_postal_code && `, ${invoice.customer_postal_code}`}</Text>
                )}
                {invoice.customer_country && <Text>{invoice.customer_country}</Text>}
                {invoice.customer_email && <Text>Email: {invoice.customer_email}</Text>}
                {invoice.customer_vat_number && (
                  <Text style={{ marginTop: 6, fontWeight: 'bold' }}>
                    VAT: {invoice.customer_vat_number}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Unit Price</Text>
            <Text style={styles.col4}>Total</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <View style={styles.col1}>
                <Text>{item.description}</Text>
                {item.tax_rate > 0 && (
                  <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>
                    {invoice.tax_name || 'Tax'}: {item.tax_rate}%
                  </Text>
                )}
              </View>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>
                {formatCurrency(item.unit_price)} {invoice.currency}
              </Text>
              <Text style={styles.col4}>
                {formatCurrency(item.line_total)} {invoice.currency}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.subtotalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(invoice.subtotal)} {invoice.currency}</Text>
            </View>
            <View style={styles.subtotalRow}>
              <Text>{invoice.tax_name || 'Tax'}:</Text>
              <Text>{formatCurrency(invoice.total_tax)} {invoice.currency}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(invoice.total)} {invoice.currency}</Text>
            </View>
            {invoice.payment_status === 'paid' && (
              <View style={styles.paymentStatus}>
                <Text style={styles.paymentStatusText}>PAID</Text>
              </View>
            )}
          </View>
        </View>

        {/* Metadata */}
        {(invoice.table_number || invoice.payment_method) && (
          <View style={styles.metadata}>
            {invoice.table_number && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Table:</Text>
                <Text style={styles.metadataValue}>{invoice.table_number}</Text>
              </View>
            )}
            {invoice.payment_method && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Payment Method:</Text>
                <Text style={styles.metadataValue}>{invoice.payment_method}</Text>
              </View>
            )}
            {invoice.paid_at && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Paid On:</Text>
                <Text style={styles.metadataValue}>{formatDate(invoice.paid_at)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        {invoice.footer_text && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{invoice.footer_text}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ClassicTemplate;
