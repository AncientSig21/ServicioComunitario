import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Estilos del reporte
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #4F46E5',
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  logoSubtitle: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  reportSubtitle: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  periodoContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 4,
  },
  periodoText: {
    fontSize: 9,
    color: '#4F46E5',
    textAlign: 'center',
  },
  // Resumen Ejecutivo
  resumenContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resumenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resumenCard: {
    width: '23%',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    border: '1px solid #E5E7EB',
  },
  resumenCardHighlight: {
    width: '23%',
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    border: '1px solid #10B981',
  },
  resumenLabel: {
    fontSize: 7,
    color: '#6B7280',
    marginBottom: 2,
  },
  resumenValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resumenValueGreen: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  // Gastos Fijos
  gastosFijosContainer: {
    marginBottom: 20,
  },
  gastoFijoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 4,
    marginBottom: 4,
  },
  gastoFijoNombre: {
    fontSize: 9,
    color: '#7C3AED',
    width: '35%',
    fontWeight: 'bold',
  },
  gastoFijoMeta: {
    fontSize: 8,
    color: '#6B7280',
    width: '20%',
  },
  gastoFijoRecaudado: {
    fontSize: 8,
    color: '#059669',
    width: '20%',
  },
  gastoFijoPorcentaje: {
    fontSize: 8,
    color: '#4F46E5',
    width: '15%',
    fontWeight: 'bold',
  },
  gastoFijoEstado: {
    fontSize: 7,
    width: '10%',
    textAlign: 'right',
  },
  // Tabla de pagos
  tableContainer: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: '0.5px solid #E5E7EB',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: '#F9FAFB',
    borderBottom: '0.5px solid #E5E7EB',
  },
  tableCell: {
    fontSize: 7,
    color: '#374151',
  },
  tableCellBold: {
    fontSize: 7,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  // Columnas de la tabla
  colUsuario: { width: '18%' },
  colApartamento: { width: '10%' },
  colConcepto: { width: '20%' },
  colFecha: { width: '12%' },
  colReferencia: { width: '15%' },
  colMonto: { width: '13%', textAlign: 'right' },
  colEstado: { width: '12%', textAlign: 'center' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 2,
  },
  pageNumber: {
    fontSize: 7,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  // Sin datos
  noDataText: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});

// Interfaces
export interface PagoReporte {
  id: number;
  usuario_nombre: string;
  apartamento: string;
  condominio: string;
  concepto: string;
  monto: number;
  monto_usd?: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  estado: string;
}

export interface GastoFijoReporte {
  nombre: string;
  montoMeta: number;
  montoRecaudado: number;
  porcentaje: number;
  cantidadUsuarios: number;
  usuariosPagados: number;
}

export interface DatosReporte {
  // Información del reporte
  nombre_condominio: string;
  fecha_generacion: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  generado_por: string;
  
  // Resumen ejecutivo
  total_recaudado: number;
  total_recaudado_usd: number | null;
  cantidad_pagos: number;
  promedio_pago: number;
  pagos_pendientes_validacion: number;
  
  // Gastos fijos
  gastos_fijos: GastoFijoReporte[];
  total_metas: number;
  total_recaudado_gastos_fijos: number;
  
  // Lista de pagos validados
  pagos: PagoReporte[];
  
  // Lista de pagos pendientes (usuarios que no han pagado)
  pagos_pendientes: PagoReporte[];
  total_pendiente: number;
  total_pendiente_usd: number | null;
}

// Componente del documento PDF
const ReporteRecaudacionDocument = ({ datos }: { datos: DatosReporte }) => {
  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto) + ' Bs';
  };

  const formatMontoCorto = (monto: number) => {
    if (monto >= 1000000) {
      return (monto / 1000000).toFixed(2) + 'M Bs';
    } else if (monto >= 1000) {
      return (monto / 1000).toFixed(1) + 'K Bs';
    }
    return monto.toFixed(2) + ' Bs';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFechaLarga = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPeriodoTexto = () => {
    if (datos.periodo_inicio && datos.periodo_fin) {
      return `Período: ${formatFecha(datos.periodo_inicio)} - ${formatFecha(datos.periodo_fin)}`;
    } else if (datos.periodo_inicio) {
      return `Desde: ${formatFecha(datos.periodo_inicio)}`;
    } else if (datos.periodo_fin) {
      return `Hasta: ${formatFecha(datos.periodo_fin)}`;
    }
    return 'Período: Todos los registros';
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pagado':
      case 'aprobado':
        return '✓ Validado';
      case 'pendiente':
        return '⏳ Pendiente';
      case 'rechazado':
        return '✗ Rechazado';
      default:
        return estado;
    }
  };

  // Dividir pagos validados en páginas (máximo 18 por página)
  const pagosPerPage = 18;
  const totalPaginasPagados = Math.ceil(datos.pagos.length / pagosPerPage);
  const paginasDePagos = [];
  
  for (let i = 0; i < totalPaginasPagados; i++) {
    paginasDePagos.push(
      datos.pagos.slice(i * pagosPerPage, (i + 1) * pagosPerPage)
    );
  }

  // Dividir pagos pendientes en páginas
  const totalPaginasPendientes = Math.ceil(datos.pagos_pendientes.length / pagosPerPage);
  const paginasDePagosPendientes = [];
  
  for (let i = 0; i < totalPaginasPendientes; i++) {
    paginasDePagosPendientes.push(
      datos.pagos_pendientes.slice(i * pagosPerPage, (i + 1) * pagosPerPage)
    );
  }

  // Total de páginas: 1 (resumen) + pagados + pendientes + 1 (resumen final)
  const totalPaginasGeneral = 1 + totalPaginasPagados + totalPaginasPendientes + 1;

  return (
    <Document>
      {/* Página 1: Resumen */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.logo}>{datos.nombre_condominio}</Text>
              <Text style={styles.logoSubtitle}>Sistema de Gestión de Condominios</Text>
            </View>
            <View>
              <Text style={styles.reportTitle}>REPORTE DE RECAUDACIÓN</Text>
              <Text style={styles.reportSubtitle}>
                Generado: {formatFechaLarga(datos.fecha_generacion)}
              </Text>
            </View>
          </View>
          
          <View style={styles.periodoContainer}>
            <Text style={styles.periodoText}>{getPeriodoTexto()}</Text>
          </View>
        </View>

        {/* Resumen Ejecutivo */}
        <View style={styles.resumenContainer}>
          <Text style={styles.sectionTitle}>Resumen Ejecutivo</Text>
          <View style={styles.resumenGrid}>
            <View style={styles.resumenCardHighlight}>
              <Text style={styles.resumenLabel}>Total Recaudado</Text>
              <Text style={styles.resumenValueGreen}>{formatMontoCorto(datos.total_recaudado)}</Text>
              {datos.total_recaudado_usd && datos.total_recaudado_usd > 0 && (
                <Text style={{ fontSize: 7, color: '#059669' }}>
                  (${datos.total_recaudado_usd.toFixed(2)} USD)
                </Text>
              )}
            </View>
            <View style={styles.resumenCard}>
              <Text style={styles.resumenLabel}>Pagos Validados</Text>
              <Text style={styles.resumenValue}>{datos.cantidad_pagos}</Text>
            </View>
            <View style={styles.resumenCard}>
              <Text style={styles.resumenLabel}>Promedio por Pago</Text>
              <Text style={styles.resumenValue}>{formatMontoCorto(datos.promedio_pago)}</Text>
            </View>
            <View style={{ ...styles.resumenCard, backgroundColor: '#FEF2F2', border: '1px solid #EF4444' }}>
              <Text style={styles.resumenLabel}>Pagos Pendientes</Text>
              <Text style={{ ...styles.resumenValue, color: '#DC2626' }}>{datos.pagos_pendientes.length}</Text>
            </View>
          </View>
          
          {/* Segunda fila de resumen */}
          <View style={{ ...styles.resumenGrid, marginTop: 8 }}>
            <View style={{ ...styles.resumenCard, width: '31%' }}>
              <Text style={styles.resumenLabel}>Monto Pendiente por Cobrar</Text>
              <Text style={{ ...styles.resumenValue, color: '#DC2626' }}>{formatMontoCorto(datos.total_pendiente)}</Text>
              {datos.total_pendiente_usd && datos.total_pendiente_usd > 0 && (
                <Text style={{ fontSize: 7, color: '#DC2626' }}>
                  (${datos.total_pendiente_usd.toFixed(2)} USD)
                </Text>
              )}
            </View>
            <View style={{ ...styles.resumenCard, width: '31%' }}>
              <Text style={styles.resumenLabel}>Total Esperado</Text>
              <Text style={styles.resumenValue}>{formatMontoCorto(datos.total_recaudado + datos.total_pendiente)}</Text>
            </View>
            <View style={{ ...styles.resumenCard, width: '31%' }}>
              <Text style={styles.resumenLabel}>% Recaudación</Text>
              <Text style={{ 
                ...styles.resumenValue, 
                color: (datos.total_recaudado / (datos.total_recaudado + datos.total_pendiente)) * 100 >= 70 ? '#059669' : '#D97706'
              }}>
                {datos.total_recaudado + datos.total_pendiente > 0 
                  ? ((datos.total_recaudado / (datos.total_recaudado + datos.total_pendiente)) * 100).toFixed(1) 
                  : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Gastos Fijos */}
        {datos.gastos_fijos.length > 0 && (
          <View style={styles.gastosFijosContainer}>
            <Text style={styles.sectionTitle}>Gastos Fijos Distribuidos</Text>
            
            {/* Header de la mini-tabla */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 }}>
              <Text style={{ ...styles.gastoFijoNombre, fontSize: 7, color: '#6B7280' }}>Concepto</Text>
              <Text style={{ ...styles.gastoFijoMeta, fontSize: 7, color: '#6B7280' }}>Meta</Text>
              <Text style={{ ...styles.gastoFijoRecaudado, fontSize: 7, color: '#6B7280' }}>Recaudado</Text>
              <Text style={{ ...styles.gastoFijoPorcentaje, fontSize: 7, color: '#6B7280' }}>Progreso</Text>
              <Text style={{ ...styles.gastoFijoEstado, fontSize: 7, color: '#6B7280' }}>Estado</Text>
            </View>
            
            {datos.gastos_fijos.map((gasto, index) => (
              <View key={index} style={styles.gastoFijoRow}>
                <Text style={styles.gastoFijoNombre}>{gasto.nombre}</Text>
                <Text style={styles.gastoFijoMeta}>{formatMontoCorto(gasto.montoMeta)}</Text>
                <Text style={styles.gastoFijoRecaudado}>{formatMontoCorto(gasto.montoRecaudado)}</Text>
                <Text style={styles.gastoFijoPorcentaje}>{gasto.porcentaje.toFixed(1)}%</Text>
                <Text style={{
                  ...styles.gastoFijoEstado,
                  color: gasto.porcentaje >= 100 ? '#059669' : gasto.porcentaje >= 50 ? '#D97706' : '#DC2626'
                }}>
                  {gasto.porcentaje >= 100 ? '✓' : `${gasto.usuariosPagados}/${gasto.cantidadUsuarios}`}
                </Text>
              </View>
            ))}
            
            {/* Totales de gastos fijos */}
            <View style={{ flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
              <View style={{ width: '50%' }}>
                <Text style={{ fontSize: 8, color: '#6B7280' }}>Total Metas:</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#7C3AED' }}>
                  {formatMonto(datos.total_metas)}
                </Text>
              </View>
              <View style={{ width: '50%' }}>
                <Text style={{ fontSize: 8, color: '#6B7280' }}>Total Recaudado (Gastos Fijos):</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#059669' }}>
                  {formatMonto(datos.total_recaudado_gastos_fijos)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Si no hay gastos fijos */}
        {datos.gastos_fijos.length === 0 && (
          <View style={styles.gastosFijosContainer}>
            <Text style={styles.sectionTitle}>Gastos Fijos Distribuidos</Text>
            <Text style={styles.noDataText}>No hay gastos fijos registrados en este período</Text>
          </View>
        )}

        {/* Footer de la primera página */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Reporte generado por: {datos.generado_por}
          </Text>
          <Text style={styles.footerText}>
            Este documento es un informe oficial del sistema de gestión del condominio.
          </Text>
          <Text style={styles.pageNumber}>Página 1 de {totalPaginasGeneral}</Text>
        </View>
      </Page>

      {/* Páginas de detalle de pagos */}
      {paginasDePagos.map((pagosPagina, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header simplificado */}
          <View style={{ marginBottom: 15, borderBottom: '1px solid #E5E7EB', paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4F46E5' }}>
                {datos.nombre_condominio} - Detalle de Pagos
              </Text>
              <Text style={{ fontSize: 9, color: '#6B7280' }}>
                {getPeriodoTexto()}
              </Text>
            </View>
          </View>

          {/* Tabla de pagos */}
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>
              Detalle de Pagos Validados {pageIndex > 0 ? `(continuación)` : ''}
            </Text>
            
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderText, ...styles.colUsuario }}>Usuario</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colApartamento }}>Apto.</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colConcepto }}>Concepto</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colFecha }}>Fecha</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colReferencia }}>Referencia</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colMonto }}>Monto</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colEstado }}>Estado</Text>
            </View>
            
            {/* Filas de datos */}
            {pagosPagina.map((pago, index) => (
              <View key={pago.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={{ ...styles.tableCellBold, ...styles.colUsuario }}>
                  {pago.usuario_nombre.length > 18 ? pago.usuario_nombre.substring(0, 18) + '...' : pago.usuario_nombre}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colApartamento }}>
                  {pago.apartamento || 'N/A'}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colConcepto }}>
                  {pago.concepto.length > 22 ? pago.concepto.substring(0, 22) + '...' : pago.concepto}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colFecha }}>
                  {formatFecha(pago.fecha_pago)}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colReferencia }}>
                  {pago.referencia || 'N/A'}
                </Text>
                <Text style={{ ...styles.tableCellBold, ...styles.colMonto }}>
                  {formatMontoCorto(pago.monto)}
                </Text>
                <Text style={{ 
                  ...styles.tableCell, 
                  ...styles.colEstado,
                  color: pago.estado === 'aprobado' || pago.estado === 'pagado' ? '#059669' : '#D97706',
                  fontSize: 6,
                }}>
                  {getEstadoTexto(pago.estado)}
                </Text>
              </View>
            ))}
            
            {/* Subtotal de la página */}
            <View style={{ 
              flexDirection: 'row', 
              marginTop: 10, 
              paddingTop: 8, 
              borderTop: '1px solid #4F46E5',
              backgroundColor: '#EEF2FF',
              padding: 8,
              borderRadius: 4,
            }}>
              <Text style={{ fontSize: 8, color: '#4F46E5', width: '70%' }}>
                Subtotal página ({pagosPagina.length} pagos):
              </Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#4F46E5', width: '30%', textAlign: 'right' }}>
                {formatMonto(pagosPagina.reduce((sum, p) => sum + p.monto, 0))}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {datos.nombre_condominio} - Reporte de Recaudación (Pagos Validados)
            </Text>
            <Text style={styles.pageNumber}>Página {pageIndex + 2} de {totalPaginasGeneral}</Text>
          </View>
        </Page>
      ))}

      {/* Páginas de detalle de pagos PENDIENTES */}
      {paginasDePagosPendientes.map((pagosPagina, pageIndex) => (
        <Page key={`pendiente-${pageIndex}`} size="A4" style={styles.page}>
          {/* Header con indicador de PENDIENTES */}
          <View style={{ marginBottom: 15, borderBottom: '2px solid #DC2626', paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#DC2626' }}>
                  {datos.nombre_condominio} - PAGOS PENDIENTES
                </Text>
                <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>
                  Usuarios que aún no han realizado el pago
                </Text>
              </View>
              <View style={{ backgroundColor: '#FEF2F2', padding: 6, borderRadius: 4, border: '1px solid #DC2626' }}>
                <Text style={{ fontSize: 8, color: '#DC2626', fontWeight: 'bold' }}>
                  {datos.pagos_pendientes.length} PENDIENTES
                </Text>
              </View>
            </View>
          </View>

          {/* Tabla de pagos pendientes */}
          <View style={styles.tableContainer}>
            <Text style={{ ...styles.sectionTitle, color: '#DC2626' }}>
              Detalle de Pagos Pendientes {pageIndex > 0 ? `(continuación)` : ''}
            </Text>
            
            {/* Header de la tabla */}
            <View style={{ ...styles.tableHeader, backgroundColor: '#DC2626' }}>
              <Text style={{ ...styles.tableHeaderText, ...styles.colUsuario }}>Usuario</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colApartamento }}>Apto.</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colConcepto }}>Concepto</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colFecha }}>F. Venc.</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colReferencia }}>Referencia</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colMonto }}>Monto</Text>
              <Text style={{ ...styles.tableHeaderText, ...styles.colEstado }}>Estado</Text>
            </View>
            
            {/* Filas de datos */}
            {pagosPagina.map((pago, index) => (
              <View key={pago.id} style={index % 2 === 0 ? styles.tableRow : { ...styles.tableRowAlt, backgroundColor: '#FEF2F2' }}>
                <Text style={{ ...styles.tableCellBold, ...styles.colUsuario }}>
                  {pago.usuario_nombre.length > 18 ? pago.usuario_nombre.substring(0, 18) + '...' : pago.usuario_nombre}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colApartamento }}>
                  {pago.apartamento || 'N/A'}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colConcepto }}>
                  {pago.concepto.length > 22 ? pago.concepto.substring(0, 22) + '...' : pago.concepto}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colFecha }}>
                  {formatFecha(pago.fecha_pago)}
                </Text>
                <Text style={{ ...styles.tableCell, ...styles.colReferencia }}>
                  {pago.referencia || 'N/A'}
                </Text>
                <Text style={{ ...styles.tableCellBold, ...styles.colMonto, color: '#DC2626' }}>
                  {formatMontoCorto(pago.monto)}
                </Text>
                <Text style={{ 
                  ...styles.tableCell, 
                  ...styles.colEstado,
                  color: '#DC2626',
                  fontSize: 6,
                }}>
                  ⏳ Pendiente
                </Text>
              </View>
            ))}
            
            {/* Subtotal de la página */}
            <View style={{ 
              flexDirection: 'row', 
              marginTop: 10, 
              paddingTop: 8, 
              borderTop: '1px solid #DC2626',
              backgroundColor: '#FEF2F2',
              padding: 8,
              borderRadius: 4,
            }}>
              <Text style={{ fontSize: 8, color: '#DC2626', width: '70%' }}>
                Subtotal pendiente en esta página ({pagosPagina.length} pagos):
              </Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#DC2626', width: '30%', textAlign: 'right' }}>
                {formatMonto(pagosPagina.reduce((sum, p) => sum + p.monto, 0))}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {datos.nombre_condominio} - Reporte de Recaudación (Pagos Pendientes)
            </Text>
            <Text style={styles.pageNumber}>Página {1 + totalPaginasPagados + pageIndex + 1} de {totalPaginasGeneral}</Text>
          </View>
        </Page>
      ))}

      {/* Página final con totales */}
      {(datos.pagos.length > 0 || datos.pagos_pendientes.length > 0) && (
        <Page size="A4" style={styles.page}>
          <View style={{ marginBottom: 20, borderBottom: '2px solid #4F46E5', paddingBottom: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4F46E5', textAlign: 'center' }}>
              RESUMEN TOTAL DEL REPORTE
            </Text>
            <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
              {datos.nombre_condominio} - {getPeriodoTexto()}
            </Text>
          </View>

          {/* Comparativa Recaudado vs Pendiente */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {/* Total Recaudado */}
            <View style={{ 
              width: '48%',
              padding: 15, 
              backgroundColor: '#ECFDF5', 
              borderRadius: 8, 
              border: '2px solid #10B981',
            }}>
              <Text style={{ fontSize: 10, color: '#059669', textAlign: 'center' }}>
                TOTAL RECAUDADO
              </Text>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#059669', textAlign: 'center', marginTop: 4 }}>
                {formatMonto(datos.total_recaudado)}
              </Text>
              <Text style={{ fontSize: 9, color: '#047857', textAlign: 'center', marginTop: 4 }}>
                {datos.cantidad_pagos} pagos validados
              </Text>
            </View>
            
            {/* Total Pendiente */}
            <View style={{ 
              width: '48%',
              padding: 15, 
              backgroundColor: '#FEF2F2', 
              borderRadius: 8, 
              border: '2px solid #DC2626',
            }}>
              <Text style={{ fontSize: 10, color: '#DC2626', textAlign: 'center' }}>
                TOTAL PENDIENTE
              </Text>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#DC2626', textAlign: 'center', marginTop: 4 }}>
                {formatMonto(datos.total_pendiente)}
              </Text>
              <Text style={{ fontSize: 9, color: '#991B1B', textAlign: 'center', marginTop: 4 }}>
                {datos.pagos_pendientes.length} pagos por cobrar
              </Text>
            </View>
          </View>

          {/* Total Esperado y Porcentaje */}
          <View style={{ 
            padding: 15, 
            backgroundColor: '#EEF2FF', 
            borderRadius: 8, 
            border: '1px solid #4F46E5',
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>Total Esperado:</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4F46E5' }}>
                  {formatMonto(datos.total_recaudado + datos.total_pendiente)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>Porcentaje Recaudado:</Text>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: 'bold', 
                  color: (datos.total_recaudado / (datos.total_recaudado + datos.total_pendiente || 1)) * 100 >= 70 ? '#059669' : '#D97706'
                }}>
                  {((datos.total_recaudado / (datos.total_recaudado + datos.total_pendiente || 1)) * 100).toFixed(1)}%
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>Promedio por Pago:</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4F46E5' }}>
                  {formatMontoCorto(datos.promedio_pago)}
                </Text>
              </View>
            </View>
          </View>

          {/* Info de gastos fijos */}
          {datos.gastos_fijos.length > 0 && (
            <View style={{ padding: 15, backgroundColor: '#F3E8FF', borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 10, color: '#7C3AED', marginBottom: 8 }}>Gastos Fijos Distribuidos</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 8, color: '#6B7280' }}>Meta Total:</Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#7C3AED' }}>
                    {formatMonto(datos.total_metas)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 8, color: '#6B7280' }}>Recaudado:</Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669' }}>
                    {formatMonto(datos.total_recaudado_gastos_fijos)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 8, color: '#6B7280' }}>Progreso:</Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4F46E5' }}>
                    {datos.total_metas > 0 
                      ? ((datos.total_recaudado_gastos_fijos / datos.total_metas) * 100).toFixed(1) 
                      : 0}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Firma */}
          <View style={{ marginTop: 20, paddingTop: 20, borderTop: '1px dashed #9CA3AF' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '45%' }}>
                <View style={{ borderBottom: '1px solid #374151', marginBottom: 4, height: 40 }} />
                <Text style={{ fontSize: 8, color: '#6B7280', textAlign: 'center' }}>
                  Firma del Administrador
                </Text>
              </View>
              <View style={{ width: '45%' }}>
                <View style={{ borderBottom: '1px solid #374151', marginBottom: 4, height: 40 }} />
                <Text style={{ fontSize: 8, color: '#6B7280', textAlign: 'center' }}>
                  Sello del Condominio
                </Text>
              </View>
            </View>
          </View>

          {/* Footer final */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Documento generado automáticamente por el Sistema de Gestión de Condominios
            </Text>
            <Text style={styles.footerText}>
              Generado por: {datos.generado_por} | Fecha: {formatFechaLarga(datos.fecha_generacion)}
            </Text>
            <Text style={{ ...styles.footerText, marginTop: 4, fontStyle: 'italic' }}>
              Este reporte es válido como comprobante oficial de las operaciones realizadas en el período indicado.
            </Text>
            <Text style={styles.pageNumber}>Página {totalPaginasGeneral} de {totalPaginasGeneral}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

// Función para generar y descargar el PDF
export const descargarReporteRecaudacion = async (datos: DatosReporte): Promise<void> => {
  try {
    const blob = await pdf(<ReporteRecaudacionDocument datos={datos} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nombre del archivo con fecha
    const fechaArchivo = new Date().toISOString().split('T')[0];
    link.download = `Reporte_Recaudacion_${datos.nombre_condominio.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generando reporte PDF:', error);
    throw new Error('No se pudo generar el reporte. Intente nuevamente.');
  }
};

export default ReporteRecaudacionDocument;
