import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#374151',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 50,
    paddingBottom: 30,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: 'normal',
    color: '#1f2937',
    marginBottom: 20,
    letterSpacing: 2,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9ca3af',
  },
  infoLabel: {
    color: '#9ca3af',
    marginBottom: 3,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#374151',
    fontSize: 9,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'normal',
    marginBottom: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressBlock: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#374151',
  },
  addressName: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 10,
    color: '#1f2937',
  },
  table: {
    marginTop: 40,
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    marginBottom: 15,
  },
  tableHeaderText: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.25,
    borderBottomColor: '#f3f4f6',
  },
  col1: { width: '45%' },
  col2: { width: '15%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  itemDescription: {
    color: '#374151',
    fontSize: 9,
  },
  itemTax: {
    fontSize: 7,
    color: '#9ca3af',
    marginTop: 3,
  },
  totalsSection: {
    marginTop: 30,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: '45%',
    paddingTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    fontSize: 9,
    color: '#6b7280',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 15,
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  paymentStatus: {
    marginTop: 15,
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#059669',
    borderRadius: 2,
    textAlign: 'center',
  },
  paymentStatusText: {
    fontSize: 8,
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    paddingTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#f3f4f6',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  metadata: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#f3f4f6',
    fontSize: 8,
    color: '#9ca3af',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metadataLabel: {
    width: '35%',
    color: '#9ca3af',
  },
  metadataValue: {
    width: '65%',
    color: '#6b7280',
  },
});

const ModernMinimalTemplate = ({ invoice, restaurant }) => {
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
            <View style={styles.logoContainer}>
              <Image src={restaurant.logo_url} style={styles.logo} />
            </View>
          )}
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.invoiceInfo}>
            <View>
              <Text style={styles.infoLabel}>Invoice Number</Text>
              <Text style={styles.infoValue}>{invoice.invoice_number}</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Invoice Date</Text>
              <Text style={styles.infoValue}>{formatDate(invoice.invoice_date)}</Text>
            </View>
            {invoice.due_date && (
              <View>
                <Text style={styles.infoLabel}>Due Date</Text>
                <Text style={styles.infoValue}>{formatDate(invoice.due_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Business and Customer Info */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 }}>
          {/* From (Business) */}
          <View style={{ width: '48%' }}>
            <Text style={styles.sectionTitle}>From</Text>
            <View style={styles.addressBlock}>
              <Text style={styles.addressName}>{invoice.business_name}</Text>
              {invoice.business_address && <Text>{invoice.business_address}</Text>}
              {invoice.business_city && (
                <Text>{invoice.business_city}{invoice.business_postal_code && `, ${invoice.business_postal_code}`}</Text>
              )}
              {invoice.business_country && <Text>{invoice.business_country}</Text>}
              {invoice.business_phone && <Text>{invoice.business_phone}</Text>}
              {invoice.business_email && <Text>{invoice.business_email}</Text>}
              {invoice.business_vat_number && (
                <Text style={{ marginTop: 8, fontSize: 8, color: '#6b7280' }}>
                  VAT: {invoice.business_vat_number}
                </Text>
              )}
              {invoice.business_tax_id && (
                <Text style={{ fontSize: 8, color: '#6b7280' }}>Tax ID: {invoice.business_tax_id}</Text>
              )}
            </View>
          </View>

          {/* To (Customer) */}
          {invoice.customer_name && (
            <View style={{ width: '48%' }}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <View style={styles.addressBlock}>
                <Text style={styles.addressName}>{invoice.customer_name}</Text>
                {invoice.customer_company && <Text>{invoice.customer_company}</Text>}
                {invoice.customer_address && <Text>{invoice.customer_address}</Text>}
                {invoice.customer_city && (
                  <Text>{invoice.customer_city}{invoice.customer_postal_code && `, ${invoice.customer_postal_code}`}</Text>
                )}
                {invoice.customer_country && <Text>{invoice.customer_country}</Text>}
                {invoice.customer_email && <Text>{invoice.customer_email}</Text>}
                {invoice.customer_vat_number && (
                  <Text style={{ marginTop: 8, fontSize: 8, color: '#6b7280' }}>
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
            <Text style={[styles.tableHeaderText, styles.col1]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Total</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.col1}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                {item.tax_rate > 0 && (
                  <Text style={styles.itemTax}>{invoice.tax_name || 'Tax'}: {item.tax_rate}%</Text>
                )}
              </View>
              <Text style={[styles.col2, styles.itemDescription]}>{item.quantity}</Text>
              <Text style={[styles.col3, styles.itemDescription]}>
                {formatCurrency(item.unit_price)} {invoice.currency}
              </Text>
              <Text style={[styles.col4, styles.itemDescription]}>
                {formatCurrency(item.line_total)} {invoice.currency}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(invoice.subtotal)} {invoice.currency}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>{invoice.tax_name || 'Tax'}</Text>
              <Text>{formatCurrency(invoice.total_tax)} {invoice.currency}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>Total</Text>
              <Text>{formatCurrency(invoice.total)} {invoice.currency}</Text>
            </View>
            {invoice.payment_status === 'paid' && (
              <View style={styles.paymentStatus}>
                <Text style={styles.paymentStatusText}>Paid</Text>
              </View>
            )}
          </View>
        </View>

        {/* Metadata */}
        {(invoice.table_number || invoice.payment_method) && (
          <View style={styles.metadata}>
            {invoice.table_number && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Table</Text>
                <Text style={styles.metadataValue}>{invoice.table_number}</Text>
              </View>
            )}
            {invoice.payment_method && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Payment Method</Text>
                <Text style={styles.metadataValue}>{invoice.payment_method}</Text>
              </View>
            )}
            {invoice.paid_at && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Paid On</Text>
                <Text style={styles.metadataValue}>{formatDate(invoice.paid_at)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginTop: 25 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.5 }}>{invoice.notes}</Text>
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

export default ModernMinimalTemplate;
