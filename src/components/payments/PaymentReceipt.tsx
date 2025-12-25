import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Payment } from '../../interfaces';

// Estilos para el PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    width: '40%',
  },
  value: {
    fontSize: 12,
    color: '#111827',
    width: '60%',
    textAlign: 'right',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    margin: '20px 0',
    textAlign: 'right',
  },
  status: {
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  logo: {
    width: 120,
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
});

// Mapeo de estados a colores
const statusColors = {
  Pendiente: '#f59e0b',
  Aprobado: '#3b82f6',
  Rechazado: '#ef4444',
  Vencido: '#ef4444',
  Pagado: '#10b981',
};

interface PaymentReceiptProps {
  payment: Payment;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ payment }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logo o nombre del condominio */}
        <View style={styles.header}>
          <Text style={styles.title}>Comprobante de Pago</Text>
          <Text style={styles.subtitle}>Condominio Ejemplo</Text>
        </View>

        {/* Detalles del pago */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Número de referencia:</Text>
            <Text style={styles.value}>{payment.reference || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de emisión:</Text>
            <Text style={styles.value}>{formatDate(payment.createdAt)}</Text>
          </View>
          {payment.paymentDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Fecha de pago:</Text>
              <Text style={styles.value}>{formatDate(payment.paymentDate)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Estado:</Text>
            <Text 
              style={[
                styles.value, 
                { 
                  color: statusColors[payment.status as keyof typeof statusColors] || '#6b7280',
                  fontWeight: 'bold',
                }
              ]}
            >
              {payment.status}
            </Text>
          </View>
        </View>

        {/* Concepto y monto */}
        <View style={styles.section}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Detalles del pago</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Concepto:</Text>
            <Text style={styles.value}>{payment.concept}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Categoría:</Text>
            <Text style={styles.value}>{payment.category}</Text>
          </View>
          <View style={[styles.row, { marginTop: 10 }]}>
            <Text style={[styles.label, { fontWeight: 'bold' }]}>Monto total:</Text>
            <Text style={[styles.amount, { color: '#10b981' }]}>
              ${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.section}>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 30 }}>
            Este es un comprobante generado automáticamente. Para cualquier consulta, por favor contacte a la administración.
          </Text>
        </View>

        {/* Pie de página */}
        <View style={styles.footer}>
          <Text>Condominio Ejemplo • {new Date().getFullYear()}</Text>
          <Text>Teléfono: (123) 456-7890 • Email: info@condominioejemplo.com</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PaymentReceipt;
