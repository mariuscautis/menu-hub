import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Roboto',
    color: '#1f2937',
  },
  header: {
    backgroundColor: '#6262bd',
    padding: 40,
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: 'contain',
    marginLeft: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#ffffff',
  },
  invoiceInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 6,
  },
  invoiceInfoLabel: {
    color: '#e0e7ff',
    fontSize: 8,
    marginBottom: 3,
  },
  invoiceInfoValue: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  content: {
    padding: 40,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#6262bd',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#6262bd',
  },
  addressBlock: {
    fontSize: 10,
    lineHeight: 1.6,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6262bd',
  },
  addressName: {
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 11,
    color: '#1f2937',
  },
  table: {
    marginTop: 25,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: 12,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 12,
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  col1: { width: '45%' },
  col2: { width: '15%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  itemDescription: {
    color: '#1f2937',
    fontWeight: 'bold',
  },
  itemTax: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 3,
    backgroundColor: '#fef3c7',
    padding: 2,
    borderRadius: 2,
  },
  totalsSection: {
    marginTop: 25,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: '55%',
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    fontSize: 10,
    color: '#6b7280',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 15,
    borderTopWidth: 3,
    borderTopColor: '#6262bd',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6262bd',
  },
  paymentStatus: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#10b981',
    borderRadius: 6,
    textAlign: 'center',
  },
  paymentStatusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#6262bd',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  metadata: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6262bd',
    fontSize: 9,
    color: '#6b7280',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  metadataLabel: {
    fontWeight: 'bold',
    width: '40%',
    color: '#4f46e5',
  },
  metadataValue: {
    width: '60%',
    color: '#1f2937',
  },
  divider: {
    height: 3,
    backgroundColor: '#6262bd',
    marginVertical: 20,
    borderRadius: 2,
  },
});

const BoldColorfulTemplate = ({ invoice, restaurant, t }) => {
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t.invoice}</Text>
            <View style={styles.invoiceInfo}>
            <View style={styles.invoiceInfoBox}>
              <Text style={styles.invoiceInfoLabel}>{t.invoiceNumberAlt}</Text>
              <Text style={styles.invoiceInfoValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.invoiceInfoBox}>
              <Text style={styles.invoiceInfoLabel}>{t.dateAlt}</Text>
              <Text style={styles.invoiceInfoValue}>{formatDate(invoice.invoice_date)}</Text>
            </View>
            {invoice.due_date && (
              <View style={styles.invoiceInfoBox}>
                <Text style={styles.invoiceInfoLabel}>{t.dueDateAlt}</Text>
                <Text style={styles.invoiceInfoValue}>{formatDate(invoice.due_date)}</Text>
              </View>
            )}
            </View>
          </View>
          {restaurant.logo_url && (
            <Image src={restaurant.logo_url} style={styles.logo} />
          )}
        </View>

        <View style={styles.content}>
          {/* Business and Customer Info */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
            {/* From (Business) */}
            <View style={{ width: '48%' }}>
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
                  <Text style={{ marginTop: 8, fontSize: 9, color: '#4f46e5', fontWeight: 'bold' }}>
                    {t.vat} {invoice.business_vat_number}
                  </Text>
                )}
                {invoice.business_tax_id && (
                  <Text style={{ fontSize: 9, color: '#4f46e5', fontWeight: 'bold' }}>
                    {t.taxId} {invoice.business_tax_id}
                  </Text>
                )}
              </View>
            </View>

            {/* To (Customer) */}
            {invoice.customer_name && (
              <View style={{ width: '48%' }}>
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
                    <Text style={{ marginTop: 8, fontSize: 9, color: '#4f46e5', fontWeight: 'bold' }}>
                      {t.vat} {invoice.customer_vat_number}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

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
                <Text style={[styles.col4, { fontWeight: 'bold' }]}>
                  {formatCurrency(item.line_total)} {invoice.currency}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
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
              {invoice.payment_status === 'paid' && (
                <View style={styles.paymentStatus}>
                  <Text style={styles.paymentStatusText}>{t.paidInFull}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Metadata */}
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
                  <Text style={styles.metadataLabel}>{t.paymentMethod}</Text>
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

          {/* Notes */}
          {invoice.notes && (
            <View style={{ marginTop: 25 }}>
              <Text style={styles.sectionTitle}>{t.notes}</Text>
              <Text style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.5 }}>{invoice.notes}</Text>
            </View>
          )}
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

export default BoldColorfulTemplate;
