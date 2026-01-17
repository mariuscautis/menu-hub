import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 8,
    fontFamily: 'Roboto',
    color: '#1f2937',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
    marginLeft: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#6b7280',
  },
  infoGroup: {
    flexDirection: 'row',
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 3,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  addressBlock: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#374151',
  },
  addressName: {
    fontWeight: 'bold',
    marginBottom: 3,
    fontSize: 9,
  },
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    color: 'white',
    padding: 6,
    fontWeight: 'bold',
    fontSize: 7,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: 6,
    backgroundColor: '#ffffff',
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: 6,
    backgroundColor: '#f9fafb',
    fontSize: 8,
  },
  col1: { width: '45%' },
  col2: { width: '12%', textAlign: 'right' },
  col3: { width: '18%', textAlign: 'right' },
  col4: { width: '25%', textAlign: 'right' },
  itemDescription: {
    color: '#1f2937',
    fontSize: 8,
  },
  itemTax: {
    fontSize: 6,
    color: '#6b7280',
    marginTop: 1,
  },
  totalsSection: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalsBox: {
    width: '40%',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 8,
    color: '#6b7280',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#1f2937',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  paymentStatus: {
    marginTop: 8,
    padding: 5,
    backgroundColor: '#d1fae5',
    textAlign: 'center',
  },
  paymentStatusText: {
    fontSize: 7,
    color: '#059669',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  summaryBox: {
    width: '55%',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 6,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  metadata: {
    marginTop: 15,
    padding: 8,
    backgroundColor: '#f3f4f6',
    fontSize: 7,
    color: '#6b7280',
    borderWidth: 0.5,
    borderColor: '#d1d5db',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metadataLabel: {
    fontWeight: 'bold',
    width: '30%',
    color: '#374151',
  },
  metadataValue: {
    width: '70%',
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  column: {
    width: '48%',
  },
});

const CompactDetailedTemplate = ({ invoice, restaurant, t }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t.invoice}</Text>
            <View style={styles.invoiceInfo}>
            <View style={styles.infoGroup}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t.no}</Text>
                <Text>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t.date}</Text>
                <Text>{formatDate(invoice.invoice_date)}</Text>
              </View>
              {invoice.due_date && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t.dueDate}</Text>
                  <Text>{formatDate(invoice.due_date)}</Text>
                </View>
              )}
            </View>
            {invoice.payment_status === 'paid' && (
              <View style={styles.infoItem}>
                <Text style={{ color: '#059669', fontWeight: 'bold' }}>{t.paid}</Text>
              </View>
            )}
            </View>
          </View>
          {restaurant.logo_url && (
            <Image src={restaurant.logo_url} style={styles.logo} />
          )}
        </View>

        {/* Business and Customer Info - Two Column */}
        <View style={styles.twoColumn}>
          {/* From (Business) */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>{t.from}</Text>
            <View style={styles.addressBlock}>
              <Text style={styles.addressName}>{invoice.business_name}</Text>
              {invoice.business_address && <Text>{invoice.business_address}</Text>}
              {invoice.business_city && (
                <Text>{invoice.business_city}{invoice.business_postal_code && `, ${invoice.business_postal_code}`}</Text>
              )}
              {invoice.business_country && <Text>{invoice.business_country}</Text>}
              {invoice.business_phone && <Text>{t.tel} {invoice.business_phone}</Text>}
              {invoice.business_email && <Text>{t.email} {invoice.business_email}</Text>}
              {invoice.business_vat_number && (
                <Text style={{ marginTop: 4, fontSize: 7, fontWeight: 'bold' }}>
                  {t.vat} {invoice.business_vat_number}
                </Text>
              )}
              {invoice.business_tax_id && (
                <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{t.taxId} {invoice.business_tax_id}</Text>
              )}
            </View>
          </View>

          {/* To (Customer) */}
          {invoice.customer_name && (
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>{t.billTo}</Text>
              <View style={styles.addressBlock}>
                <Text style={styles.addressName}>{invoice.customer_name}</Text>
                {invoice.customer_company && (
                  <Text style={{ fontWeight: 'bold' }}>{invoice.customer_company}</Text>
                )}
                {invoice.customer_address && <Text>{invoice.customer_address}</Text>}
                {invoice.customer_city && (
                  <Text>{invoice.customer_city}{invoice.customer_postal_code && `, ${invoice.customer_postal_code}`}</Text>
                )}
                {invoice.customer_country && <Text>{invoice.customer_country}</Text>}
                {invoice.customer_email && <Text>{t.email} {invoice.customer_email}</Text>}
                {invoice.customer_vat_number && (
                  <Text style={{ marginTop: 4, fontSize: 7, fontWeight: 'bold' }}>
                    {t.vat} {invoice.customer_vat_number}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>{t.description}</Text>
            <Text style={styles.col2}>{t.qty}</Text>
            <Text style={styles.col3}>{t.unitPrice}</Text>
            <Text style={styles.col4}>{t.total}</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <View style={styles.col1}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                {item.tax_rate > 0 && (
                  <Text style={styles.itemTax}>{invoice.tax_name || 'Tax'}: {item.tax_rate}%</Text>
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

        {/* Totals and Summary */}
        <View style={styles.totalsSection}>
          {/* Left side - Metadata/Summary */}
          <View style={styles.summaryBox}>
            {(invoice.table_number || invoice.payment_method) && (
              <View style={styles.metadata}>
                {invoice.table_number && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>{t.table}</Text>
                    <Text style={styles.metadataValue}>{invoice.table_number}</Text>
                  </View>
                )}
                {invoice.payment_method && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>{t.payment}</Text>
                    <Text style={styles.metadataValue}>{invoice.payment_method}</Text>
                  </View>
                )}
                {invoice.paid_at && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>{t.paidOn}</Text>
                    <Text style={styles.metadataValue}>{formatDate(invoice.paid_at)}</Text>
                  </View>
                )}
              </View>
            )}

            {invoice.notes && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.sectionTitle}>{t.notes}</Text>
                <Text style={{ fontSize: 7, color: '#6b7280', lineHeight: 1.4 }}>{invoice.notes}</Text>
              </View>
            )}
          </View>

          {/* Right side - Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>{t.subtotal}</Text>
              <Text>{formatCurrency(invoice.subtotal)} {invoice.currency}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>{invoice.tax_name || 'Tax'}:</Text>
              <Text>{formatCurrency(invoice.total_tax)} {invoice.currency}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>{t.grandTotal}</Text>
              <Text>{formatCurrency(invoice.total)} {invoice.currency}</Text>
            </View>
          </View>
        </View>

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

export default CompactDetailedTemplate;
