import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Estilos del recibo
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #4F46E5',
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  logoSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  reciboTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  reciboNumber: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  // Sello de validación
  selloContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    border: '1px solid #10B981',
  },
  selloText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
  },
  selloFecha: {
    fontSize: 9,
    color: '#047857',
    textAlign: 'center',
    marginTop: 4,
  },
  // Secciones
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Filas de datos
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 4,
  },
  rowAlt: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    width: '40%',
  },
  value: {
    fontSize: 10,
    color: '#1F2937',
    fontWeight: 'bold',
    width: '60%',
  },
  // Monto destacado
  montoContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    border: '1px solid #4F46E5',
  },
  montoLabel: {
    fontSize: 10,
    color: '#4F46E5',
    textAlign: 'center',
  },
  montoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
    marginTop: 4,
  },
  montoUsd: {
    fontSize: 12,
    color: '#6366F1',
    textAlign: 'center',
    marginTop: 2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerWarning: {
    fontSize: 7,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // QR placeholder / ID
  idContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    alignItems: 'center',
  },
  idLabel: {
    fontSize: 8,
    color: '#6B7280',
  },
  idValue: {
    fontSize: 8,
    color: '#4B5563',
    fontFamily: 'Courier',
    marginTop: 2,
  },
});

// Interfaz para los datos del recibo
export interface DatosRecibo {
  // Identificación única
  id_transaccion: string;
  numero_recibo: string;
  
  // Fechas
  fecha_validacion: string;
  fecha_pago_original: string | null;
  
  // Datos del residente
  residente_nombre: string;
  residente_apartamento: string;
  residente_condominio: string;
  
  // Detalles del pago
  concepto: string;
  monto_bs: number;
  monto_usd: number | null;
  referencia_usuario: string | null;
  metodo_pago: string | null;
  
  // Tasa del dólar al momento de la validación
  tasa_dolar: number | null;
  
  // Validación
  validado_por: string;
  observaciones: string | null;
}

// Componente del documento PDF
const ReciboOficialDocument = ({ datos }: { datos: DatosRecibo }) => {
  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto) + ' Bs';
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.logo}>Ciudad Colonial</Text>
              <Text style={styles.logoSubtitle}>Sistema de Gestión de Condominios</Text>
            </View>
            <View>
              <Text style={styles.reciboTitle}>RECIBO OFICIAL</Text>
              <Text style={styles.reciboNumber}>N° {datos.numero_recibo}</Text>
            </View>
          </View>
          
          {/* Sello de validación */}
          <View style={styles.selloContainer}>
            <Text style={styles.selloText}>✓ VALIDADO POR ADMINISTRACIÓN</Text>
            <Text style={styles.selloFecha}>
              Fecha de validación: {formatFecha(datos.fecha_validacion)}
            </Text>
          </View>
        </View>

        {/* Datos del Residente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Residente</Text>
          <View style={styles.rowAlt}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{datos.residente_nombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Apartamento:</Text>
            <Text style={styles.value}>{datos.residente_apartamento}</Text>
          </View>
          <View style={styles.rowAlt}>
            <Text style={styles.label}>Condominio:</Text>
            <Text style={styles.value}>{datos.residente_condominio}</Text>
          </View>
        </View>

        {/* Detalles del Pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Pago</Text>
          <View style={styles.rowAlt}>
            <Text style={styles.label}>Concepto:</Text>
            <Text style={styles.value}>{datos.concepto}</Text>
          </View>
          {datos.referencia_usuario && (
            <View style={styles.row}>
              <Text style={styles.label}>Referencia:</Text>
              <Text style={styles.value}>{datos.referencia_usuario}</Text>
            </View>
          )}
          {datos.metodo_pago && (
            <View style={styles.rowAlt}>
              <Text style={styles.label}>Método de pago:</Text>
              <Text style={styles.value}>{datos.metodo_pago}</Text>
            </View>
          )}
          {datos.fecha_pago_original && (
            <View style={styles.row}>
              <Text style={styles.label}>Fecha de pago:</Text>
              <Text style={styles.value}>{formatFecha(datos.fecha_pago_original)}</Text>
            </View>
          )}
        </View>

        {/* Monto */}
        <View style={styles.montoContainer}>
          <Text style={styles.montoLabel}>MONTO PAGADO</Text>
          <Text style={styles.montoValue}>{formatMonto(datos.monto_bs)}</Text>
          {datos.monto_usd && datos.monto_usd > 0 && (
            <Text style={styles.montoUsd}>(${datos.monto_usd.toFixed(2)} USD)</Text>
          )}
        </View>

        {/* Información Cambiaria */}
        {datos.tasa_dolar && datos.tasa_dolar > 0 && (
          <View style={{ 
            marginTop: 10, 
            padding: 10, 
            backgroundColor: '#FEF3C7', 
            borderRadius: 6, 
            border: '1px solid #F59E0B' 
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 8, color: '#92400E' }}>Tasa del dólar al momento de validación:</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#D97706', marginTop: 2 }}>
                  1 USD = {datos.tasa_dolar.toFixed(2)} Bs
                </Text>
              </View>
              {datos.monto_usd && datos.monto_usd > 0 && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 8, color: '#92400E' }}>Equivalente en USD:</Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#D97706', marginTop: 2 }}>
                    ${datos.monto_usd.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Observaciones */}
        {datos.observaciones && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <View style={styles.rowAlt}>
              <Text style={{ fontSize: 10, color: '#4B5563' }}>{datos.observaciones}</Text>
            </View>
          </View>
        )}

        {/* ID de transacción */}
        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>ID de Transacción (verificación)</Text>
          <Text style={styles.idValue}>{datos.id_transaccion}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este recibo es un comprobante oficial de pago validado por la administración del condominio.
          </Text>
          <Text style={styles.footerWarning}>
            Documento generado electrónicamente. Para verificar su autenticidad, contacte a la administración con el ID de transacción.
          </Text>
          <Text style={styles.footerText}>
            Validado por: {datos.validado_por}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Función para generar y descargar el PDF
export const descargarReciboOficial = async (datos: DatosRecibo): Promise<void> => {
  try {
    const blob = await pdf(<ReciboOficialDocument datos={datos} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Recibo_${datos.numero_recibo}_${datos.residente_nombre.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generando recibo PDF:', error);
    throw new Error('No se pudo generar el recibo. Intente nuevamente.');
  }
};

// Función para obtener el Blob del PDF (para guardar en Storage)
export const generarReciboPDFBlob = async (datos: DatosRecibo): Promise<Blob> => {
  return await pdf(<ReciboOficialDocument datos={datos} />).toBlob();
};

export default ReciboOficialDocument;
