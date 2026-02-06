import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/shared/Pagination';
import { FaDollarSign, FaCalendarAlt, FaClock, FaEye, FaSearch, FaFileInvoiceDollar, FaTools, FaChartLine, FaFilePdf, FaSpinner } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { descargarReporteRecaudacion, DatosReporte, PagoReporte, GastoFijoReporte } from '../components/reportes/ReporteRecaudacion';

interface PagoRecaudacion {
  id: number;
  usuario_id: number;
  vivienda_id: number | null;
  concepto: string;
  monto: number;
  monto_usd?: number | null;
  abono?: number | null;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  observaciones: string | null;
  created_at: string;
  // Campos para gastos fijos distribuidos
  es_pago_fijo?: boolean;
  gasto_fijo_grupo_id?: string | null;
  monto_total_distribuido?: number | null;
  monto_usd_total_distribuido?: number | null;
  cantidad_usuarios_distribucion?: number | null;
  usuarios?: {
    id: number;
    nombre: string;
    correo: string | null;
  };
  viviendas?: {
    numero_apartamento: string;
  };
  archivos?: {
    url: string;
    nombre_original: string | null;
  };
}

// Interfaz para gastos fijos automáticos (cargados desde BD)
interface GastoFijoAutomatico {
  grupoId: string;
  concepto: string;
  montoTotalMeta: number;
  montoUsdTotalMeta: number | null;
  cantidadUsuarios: number;
  montoPorPersona: number;
  fechaCreacion: Date;
  pagos: PagoRecaudacion[];
  pagosPagados: number;
  montoRecaudado: number;
  porcentaje: number;
  montoRestante: number;
}

const AdminCentroRecaudacionPage = () => {
  const { user } = useAuth();
  
  // Estados de datos
  const [pagos, setPagos] = useState<PagoRecaudacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de resumen
  const [totalRecaudadoHistorico, setTotalRecaudadoHistorico] = useState(0);
  const [recaudacionMes, setRecaudacionMes] = useState(0);
  const [pendientesValidacion, setPendientesValidacion] = useState(0);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  
  // Estados del modal de comprobante
  const [showComprobanteModal, setShowComprobanteModal] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoRecaudacion | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);

  // Estados para Gastos Fijos Automáticos (cargados desde BD cuando se crean con "Pago General Distribuido")
  const [pagosGastosFijos, setPagosGastosFijos] = useState<PagoRecaudacion[]>([]);
  const [loadingGastosFijos, setLoadingGastosFijos] = useState(false);

  // Estado para generación de reporte
  const [generandoReporte, setGenerandoReporte] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user?.id) {
      cargarDatos();
    }
  }, [user?.id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar pagos validados/aprobados (pagado, aprobado)
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select(`
          *,
          usuarios(id, nombre, correo),
          viviendas(numero_apartamento),
          archivos!pagos_comprobante_archivo_id_fkey(url, nombre_original)
        `)
        .in('estado', ['pagado', 'aprobado'])
        .order('fecha_pago', { ascending: false });

      if (pagosError) throw pagosError;

      // Filtrar pagos inhabilitados
      const pagosFiltrados = (pagosData || []).filter((pago: any) => {
        const observaciones = pago.observaciones || '';
        return !observaciones.includes('PAGO_INHABILITADO_POR_ADMIN');
      });

      setPagos(pagosFiltrados);

      // Calcular total recaudado histórico
      const totalHistorico = pagosFiltrados.reduce((sum: number, pago: any) => {
        const montoPagado = pago.abono ?? pago.monto ?? 0;
        return sum + montoPagado;
      }, 0);
      setTotalRecaudadoHistorico(totalHistorico);

      // Calcular recaudación del mes actual
      const ahora = new Date();
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const recaudacionEsteMes = pagosFiltrados
        .filter((pago: any) => {
          if (!pago.fecha_pago) return false;
          const fechaPago = new Date(pago.fecha_pago);
          return fechaPago >= primerDiaMes;
        })
        .reduce((sum: number, pago: any) => {
          const montoPagado = pago.abono ?? pago.monto ?? 0;
          return sum + montoPagado;
        }, 0);
      setRecaudacionMes(recaudacionEsteMes);

      // Contar pagos pendientes de validación
      const { count: pendientesCount, error: pendientesError } = await supabase
        .from('pagos')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      if (!pendientesError) {
        setPendientesValidacion(pendientesCount || 0);
      }

      // =====================================================================
      // CARGAR GASTOS FIJOS AUTOMÁTICOS: Pagos creados con es_pago_fijo = true
      // =====================================================================
      setLoadingGastosFijos(true);
      try {
        const { data: pagosGastosFijosData, error: errorGastosFijos } = await supabase
          .from('pagos')
          .select(`
            *,
            usuarios(id, nombre, correo),
            viviendas(numero_apartamento)
          `)
          .eq('es_pago_fijo', true)
          .not('gasto_fijo_grupo_id', 'is', null)
          .order('created_at', { ascending: false });

        if (!errorGastosFijos && pagosGastosFijosData) {
          setPagosGastosFijos(pagosGastosFijosData);
          console.log('Gastos fijos automáticos cargados:', pagosGastosFijosData.length);
        } else if (errorGastosFijos) {
          // Si falla (ej. columnas no existen aún), intentar sin filtros específicos
          console.warn('Error cargando gastos fijos con filtros específicos, intentando fallback:', errorGastosFijos.message);
          const { data: fallbackData } = await supabase
            .from('pagos')
            .select(`
              *,
              usuarios(id, nombre, correo),
              viviendas(numero_apartamento)
            `)
            .ilike('observaciones', '%GASTO FIJO%')
            .order('created_at', { ascending: false });
          
          if (fallbackData) {
            setPagosGastosFijos(fallbackData);
            console.log('Gastos fijos cargados via fallback (observaciones):', fallbackData.length);
          }
        }
      } catch (gfError) {
        console.warn('Error cargando gastos fijos:', gfError);
      } finally {
        setLoadingGastosFijos(false);
      }

    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos de recaudación');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pagos según búsqueda y fechas
  const pagosFiltrados = pagos.filter(pago => {
    // Filtro por nombre
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nombreMatch = pago.usuarios?.nombre?.toLowerCase().includes(query);
      const correoMatch = pago.usuarios?.correo?.toLowerCase().includes(query);
      const conceptoMatch = pago.concepto?.toLowerCase().includes(query);
      const aptoMatch = pago.viviendas?.numero_apartamento?.toLowerCase().includes(query);
      
      if (!nombreMatch && !correoMatch && !conceptoMatch && !aptoMatch) {
        return false;
      }
    }

    // Filtro por rango de fechas
    if (fechaInicio || fechaFin) {
      const fechaPago = pago.fecha_pago ? new Date(pago.fecha_pago) : null;
      
      if (!fechaPago) return false;
      
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        inicio.setHours(0, 0, 0, 0);
        if (fechaPago < inicio) return false;
      }
      
      if (fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
        if (fechaPago > fin) return false;
      }
    }

    return true;
  });

  // Paginación
  const totalPages = Math.ceil(pagosFiltrados.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPagos = pagosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  // Formatear montos
  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  // Formatear fechas
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Abrir modal de comprobante
  const handleVerComprobante = async (pago: PagoRecaudacion) => {
    setPagoSeleccionado(pago);
    
    const url = pago.archivos?.url;
    if (url) {
      // Si es una URL de data (base64), convertirla a blob URL
      if (url.startsWith('data:')) {
        try {
          const mime = (url.match(/^data:([^;]+);/)?.[1]) || 'application/pdf';
          const base64 = url.split(',')[1];
          if (base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            setComprobanteUrl(blobUrl);
          } else {
            setComprobanteUrl(url);
          }
        } catch {
          setComprobanteUrl(url);
        }
      } else {
        setComprobanteUrl(url);
      }
    } else {
      setComprobanteUrl(null);
    }
    
    setShowComprobanteModal(true);
  };

  // Cerrar modal
  const handleCerrarModal = () => {
    setShowComprobanteModal(false);
    setPagoSeleccionado(null);
    if (comprobanteUrl && comprobanteUrl.startsWith('blob:')) {
      URL.revokeObjectURL(comprobanteUrl);
    }
    setComprobanteUrl(null);
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setSearchQuery('');
    setFechaInicio('');
    setFechaFin('');
    setCurrentPage(1);
  };

  // Generar reporte de recaudación
  const handleGenerarReporte = async () => {
    try {
      setGenerandoReporte(true);

      // Preparar datos de pagos validados para el reporte (usar los filtrados)
      const pagosReporte: PagoReporte[] = pagosFiltrados.map(pago => ({
        id: pago.id,
        usuario_nombre: pago.usuarios?.nombre || 'Usuario desconocido',
        apartamento: pago.viviendas?.numero_apartamento || 'N/A',
        condominio: 'Ciudad Colonial',
        concepto: pago.concepto || 'Sin concepto',
        monto: pago.abono ?? pago.monto ?? 0,
        monto_usd: pago.monto_usd || null,
        fecha_pago: pago.fecha_pago,
        referencia: pago.referencia,
        metodo_pago: pago.metodo_pago,
        estado: pago.estado,
      }));

      // Cargar pagos pendientes desde la base de datos
      const { data: pagosPendientesData, error: errorPendientes } = await supabase
        .from('pagos')
        .select(`
          *,
          usuarios(id, nombre, correo),
          viviendas(numero_apartamento)
        `)
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true });

      if (errorPendientes) {
        console.warn('Error cargando pagos pendientes:', errorPendientes);
      }

      // Preparar datos de pagos pendientes para el reporte
      const pagosPendientesReporte: PagoReporte[] = (pagosPendientesData || []).map((pago: any) => ({
        id: pago.id,
        usuario_nombre: pago.usuarios?.nombre || 'Usuario desconocido',
        apartamento: pago.viviendas?.numero_apartamento || 'N/A',
        condominio: 'Ciudad Colonial',
        concepto: pago.concepto || 'Sin concepto',
        monto: pago.monto ?? 0,
        monto_usd: pago.monto_usd || null,
        fecha_pago: pago.fecha_vencimiento, // Usar fecha de vencimiento para pendientes
        referencia: pago.referencia || 'Sin referencia',
        metodo_pago: pago.metodo_pago,
        estado: pago.estado,
      }));

      // Calcular total pendiente
      const totalPendiente = pagosPendientesReporte.reduce((sum, pago) => sum + pago.monto, 0);
      const totalPendienteUsd = (pagosPendientesData || []).reduce((sum: number, pago: any) => {
        return sum + (pago.monto_usd || 0);
      }, 0);

      // Preparar datos de gastos fijos
      const gastosFijosReporte: GastoFijoReporte[] = gastosAutomaticos.map(gasto => ({
        nombre: gasto.concepto,
        montoMeta: gasto.montoTotalMeta,
        montoRecaudado: gasto.montoRecaudado,
        porcentaje: gasto.porcentaje,
        cantidadUsuarios: gasto.cantidadUsuarios,
        usuariosPagados: gasto.pagosPagados,
      }));

      // Calcular totales
      const totalRecaudadoUsd = pagosFiltrados.reduce((sum, pago) => {
        return sum + (pago.monto_usd || 0);
      }, 0);

      const totalMetas = gastosAutomaticos.reduce((sum, g) => sum + g.montoTotalMeta, 0);
      const totalRecaudadoGastosFijos = gastosAutomaticos.reduce((sum, g) => sum + g.montoRecaudado, 0);

      // Obtener nombre del usuario actual
      const { data: userData } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', user?.id)
        .single();

      // Preparar datos completos del reporte
      const datosReporte: DatosReporte = {
        nombre_condominio: 'Ciudad Colonial',
        fecha_generacion: new Date().toISOString(),
        periodo_inicio: fechaInicio || null,
        periodo_fin: fechaFin || null,
        generado_por: userData?.nombre || 'Administrador',
        
        total_recaudado: totalFiltrado,
        total_recaudado_usd: totalRecaudadoUsd > 0 ? totalRecaudadoUsd : null,
        cantidad_pagos: pagosFiltrados.length,
        promedio_pago: pagosFiltrados.length > 0 ? totalFiltrado / pagosFiltrados.length : 0,
        pagos_pendientes_validacion: pendientesValidacion,
        
        gastos_fijos: gastosFijosReporte,
        total_metas: totalMetas,
        total_recaudado_gastos_fijos: totalRecaudadoGastosFijos,
        
        pagos: pagosReporte,
        
        // Nuevos campos para pagos pendientes
        pagos_pendientes: pagosPendientesReporte,
        total_pendiente: totalPendiente,
        total_pendiente_usd: totalPendienteUsd > 0 ? totalPendienteUsd : null,
      };

      // Generar y descargar el reporte
      await descargarReporteRecaudacion(datosReporte);

    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte. Por favor, intente nuevamente.');
    } finally {
      setGenerandoReporte(false);
    }
  };

  // Calcular total filtrado
  const totalFiltrado = pagosFiltrados.reduce((sum, pago) => {
    const montoPagado = pago.abono ?? pago.monto ?? 0;
    return sum + montoPagado;
  }, 0);

  // =====================================================================
  // GASTOS FIJOS AUTOMÁTICOS: Agrupar pagos por gasto_fijo_grupo_id
  // La meta es DINÁMICA: se calcula desde el monto_total_distribuido real
  // El progreso llega al 100% solo cuando todos los usuarios han pagado su parte
  // =====================================================================
  const gastosAutomaticos = useMemo<GastoFijoAutomatico[]>(() => {
    if (pagosGastosFijos.length === 0) return [];

    // Agrupar pagos por gasto_fijo_grupo_id
    const grupos = new Map<string, PagoRecaudacion[]>();
    
    pagosGastosFijos.forEach(pago => {
      const grupoId = pago.gasto_fijo_grupo_id;
      if (!grupoId) return;
      
      if (!grupos.has(grupoId)) {
        grupos.set(grupoId, []);
      }
      grupos.get(grupoId)!.push(pago);
    });

    // Convertir a array de GastoFijoAutomatico con cálculos de progreso
    const gastosArray: GastoFijoAutomatico[] = [];
    
    grupos.forEach((pagosList, grupoId) => {
      if (pagosList.length === 0) return;
      
      // Usar el primer pago para obtener datos del grupo
      const primerPago = pagosList[0];
      
      // META DINÁMICA: El monto total original que se distribuyó
      // Este valor viene de monto_total_distribuido guardado en cada pago
      const montoTotalMeta = primerPago.monto_total_distribuido ?? 
        (primerPago.monto * pagosList.length); // Fallback: reconstruir desde pagos
      
      const montoUsdTotalMeta = primerPago.monto_usd_total_distribuido ?? null;
      const cantidadUsuarios = primerPago.cantidad_usuarios_distribucion ?? pagosList.length;
      const montoPorPersona = primerPago.monto;
      
      // Calcular cuántos han pagado (estado = 'pagado' o 'aprobado')
      const pagosPagados = pagosList.filter(p => 
        p.estado === 'pagado' || p.estado === 'aprobado'
      );
      
      // COHERENCIA: El monto recaudado es la suma de lo que realmente han pagado
      // Solo se suma el monto de los pagos completados
      const montoRecaudado = pagosPagados.reduce((sum, p) => {
        return sum + (p.abono ?? p.monto ?? 0);
      }, 0);
      
      // PORCENTAJE: Basado en el monto total original, no en cantidad de usuarios
      // Esto asegura que llegue a 100% solo cuando se recaude todo el monto
      const porcentaje = montoTotalMeta > 0 
        ? Math.min((montoRecaudado / montoTotalMeta) * 100, 100)
        : 0;
      
      const montoRestante = Math.max(montoTotalMeta - montoRecaudado, 0);
      
      // Extraer concepto limpio (sin el prefijo [GASTO FIJO])
      const conceptoLimpio = (primerPago.concepto || 'Gasto Fijo')
        .replace(/^\[GASTO FIJO\]\s*/i, '');
      
      gastosArray.push({
        grupoId,
        concepto: conceptoLimpio,
        montoTotalMeta,
        montoUsdTotalMeta,
        cantidadUsuarios,
        montoPorPersona,
        fechaCreacion: new Date(primerPago.created_at),
        pagos: pagosList,
        pagosPagados: pagosPagados.length,
        montoRecaudado,
        porcentaje,
        montoRestante
      });
    });

    // Ordenar por fecha de creación (más recientes primero)
    gastosArray.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
    
    return gastosArray;
  }, [pagosGastosFijos]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-lg text-gray-600">Cargando datos de recaudación...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaFileInvoiceDollar className="text-green-600" />
            Centro de Recaudación
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión y seguimiento de pagos validados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerarReporte}
            disabled={generandoReporte || pagosFiltrados.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={pagosFiltrados.length === 0 ? 'No hay pagos para generar reporte' : 'Generar reporte PDF'}
          >
            {generandoReporte ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaFilePdf />
            )}
            {generandoReporte ? 'Generando...' : 'Generar Reporte'}
          </button>
          <button
            onClick={cargarDatos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaSearch />
            Actualizar
          </button>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
        {/* Total Recaudado Histórico */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Total Recaudado Histórico</p>
              <p className="text-3xl font-bold">{formatMonto(totalRecaudadoHistorico)}</p>
              <p className="text-green-200 text-xs mt-2">{pagos.length} pagos validados</p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <FaDollarSign className="text-3xl" />
            </div>
          </div>
        </div>

        {/* Recaudación del Mes */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Recaudación del Mes</p>
              <p className="text-3xl font-bold">{formatMonto(recaudacionMes)}</p>
              <p className="text-blue-200 text-xs mt-2">
                {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <FaCalendarAlt className="text-3xl" />
            </div>
          </div>
        </div>

        {/* Pendientes de Validación */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">Pendientes de Validación</p>
              <p className="text-3xl font-bold">{pendientesValidacion}</p>
              <p className="text-amber-200 text-xs mt-2">Requieren revisión</p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <FaClock className="text-3xl" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* ========== SUBSECCIÓN: Control de Gastos Fijos y Mantenimiento ========== */}
      <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header de la subsección */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FaTools className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Control de Gastos Fijos</h2>
                <p className="text-indigo-100 text-sm">
                  Seguimiento de gastos fijos creados desde cuotas masivas
                </p>
              </div>
            </div>
            {loadingGastosFijos && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span className="text-white text-sm">Cargando...</span>
              </div>
            )}
          </div>
        </div>

        {/* Contenido de los gastos fijos */}
        <div className="p-6">
          {gastosAutomaticos.length === 0 ? (
            <div className="text-center py-8">
              <FaChartLine className="text-5xl text-indigo-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No hay gastos fijos registrados</p>
              <p className="text-sm text-gray-400">
                Los gastos fijos se crean automáticamente al generar cuotas masivas con la opción "Gasto Fijo" activada
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <FaFileInvoiceDollar className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-800">Gastos Fijos Distribuidos</h3>
                  <p className="text-xs text-purple-600">Metas dinámicas creadas automáticamente desde cuotas masivas</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gastosAutomaticos.map((gasto) => (
                  <motion.div
                    key={gasto.grupoId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Header de la card con etiqueta "AUTOMÁTICO" */}
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 border-b border-purple-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-purple-800 truncate" title={gasto.concepto}>
                              {gasto.concepto}
                            </h3>
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full whitespace-nowrap">
                              AUTOMÁTICO
                            </span>
                          </div>
                          <p className="text-xs text-purple-600 mt-0.5">
                            Creado: {gasto.fechaCreacion.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo de la card */}
                    <div className="p-4">
                      {/* Barra de progreso */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-600">Progreso de Recaudación</span>
                          <span className={`text-sm font-bold ${
                            gasto.porcentaje >= 100 ? 'text-green-600' : 
                            gasto.porcentaje >= 70 ? 'text-blue-600' : 
                            gasto.porcentaje >= 40 ? 'text-yellow-600' : 'text-red-500'
                          }`}>
                            {gasto.porcentaje.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${gasto.porcentaje}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              gasto.porcentaje >= 100 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                              gasto.porcentaje >= 70 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 
                              gasto.porcentaje >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                              'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Información de usuarios pagados */}
                      <div className="mb-3 px-3 py-2 bg-purple-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Usuarios que han pagado</span>
                          <span className="font-bold text-purple-600">
                            {gasto.pagosPagados} / {gasto.cantidadUsuarios}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-purple-500">
                          Cuota por persona: {formatMonto(gasto.montoPorPersona)}
                        </div>
                      </div>

                      {/* Montos - META DINÁMICA */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                          <span className="text-sm text-green-700">Recaudado</span>
                          <span className="font-bold text-green-600">{formatMonto(gasto.montoRecaudado)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div>
                            <span className="text-sm text-purple-700">Meta Total</span>
                            <span className="ml-2 px-1.5 py-0.5 bg-purple-200 text-purple-700 text-xs rounded">DINÁMICA</span>
                          </div>
                          <span className="font-bold text-purple-600">{formatMonto(gasto.montoTotalMeta)}</span>
                        </div>
                        <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                          gasto.montoRestante === 0 ? 'bg-green-100' : 'bg-amber-50'
                        }`}>
                          <span className={`text-sm ${gasto.montoRestante === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                            {gasto.montoRestante === 0 ? '¡Gasto cubierto al 100%!' : 'Falta recaudar'}
                          </span>
                          <span className={`font-bold ${gasto.montoRestante === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                            {gasto.montoRestante === 0 ? '✓' : formatMonto(gasto.montoRestante)}
                          </span>
                        </div>
                      </div>

                      {/* Info adicional */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                            Gasto Fijo Distribuido
                          </span>
                          {gasto.montoUsdTotalMeta && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                              ${gasto.montoUsdTotalMeta.toFixed(2)} USD
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Resumen de Gastos Fijos Automáticos */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-purple-600 mb-1">Total Gastos Fijos</p>
                    <p className="text-lg font-bold text-purple-700">{gastosAutomaticos.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 mb-1">Recaudado</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatMonto(gastosAutomaticos.reduce((sum, g) => sum + g.montoRecaudado, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 mb-1">Meta Total</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatMonto(gastosAutomaticos.reduce((sum, g) => sum + g.montoTotalMeta, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 mb-1">Pendiente</p>
                    <p className="text-lg font-bold text-amber-600">
                      {formatMonto(gastosAutomaticos.reduce((sum, g) => sum + g.montoRestante, 0))}
                    </p>
                  </div>
                </div>
              </div>
          </>
          )}
        </div>
      </div>

      {/* Filtros Avanzados */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          Filtros Avanzados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Buscador por nombre */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por nombre, correo, concepto o apartamento
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: Juan Pérez, Apto 101..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Botón limpiar filtros y resumen */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-200 gap-3">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-800">{pagosFiltrados.length}</span> de{' '}
            <span className="font-semibold text-gray-800">{pagos.length}</span> registros
            {(searchQuery || fechaInicio || fechaFin) && (
              <span className="ml-2 text-green-600 font-medium">
                | Total filtrado: {formatMonto(totalFiltrado)}
              </span>
            )}
          </div>
          {(searchQuery || fechaInicio || fechaFin) && (
            <button
              onClick={limpiarFiltros}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Residente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apartamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Concepto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comprobante
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPagos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FaFileInvoiceDollar className="text-5xl text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg">
                        {searchQuery || fechaInicio || fechaFin
                          ? 'No se encontraron pagos con los filtros aplicados'
                          : 'No hay pagos validados registrados'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatFecha(pago.fecha_pago)}
                      </div>
                      {pago.created_at && (
                        <div className="text-xs text-gray-500">
                          Creado: {formatFecha(pago.created_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {pago.usuarios?.nombre || 'N/A'}
                      </div>
                      {pago.usuarios?.correo && (
                        <div className="text-xs text-gray-500">{pago.usuarios.correo}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {pago.viviendas?.numero_apartamento || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={pago.concepto}>
                        {pago.concepto}
                      </div>
                      {pago.tipo && (
                        <div className="text-xs text-gray-500 capitalize">{pago.tipo}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {formatMonto(pago.abono ?? pago.monto ?? 0)}
                      </div>
                      {pago.monto_usd && pago.monto_usd > 0 && (
                        <div className="text-xs text-indigo-600">
                          (${pago.monto_usd.toFixed(2)} USD)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {pago.archivos?.url ? (
                        <button
                          onClick={() => handleVerComprobante(pago)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <FaEye />
                          Ver
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Sin comprobante</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={pagosFiltrados.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal de Comprobante */}
      <AnimatePresence>
        {showComprobanteModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Comprobante de Pago</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {pagoSeleccionado.usuarios?.nombre} - {pagoSeleccionado.concepto}
                  </p>
                </div>
                <button
                  onClick={handleCerrarModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-200 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información del pago */}
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Monto:</span>
                    <p className="font-semibold text-green-600">
                      {formatMonto(pagoSeleccionado.abono ?? pagoSeleccionado.monto ?? 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha:</span>
                    <p className="font-semibold text-gray-900">
                      {formatFecha(pagoSeleccionado.fecha_pago)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Referencia:</span>
                    <p className="font-semibold text-gray-900 font-mono">
                      {pagoSeleccionado.referencia || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Método:</span>
                    <p className="font-semibold text-gray-900 capitalize">
                      {pagoSeleccionado.metodo_pago || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido del comprobante */}
              <div className="flex-1 overflow-auto p-4 bg-gray-100">
                {comprobanteUrl ? (
                  comprobanteUrl.toLowerCase().includes('.pdf') || 
                  comprobanteUrl.startsWith('blob:') && pagoSeleccionado.archivos?.url?.includes('pdf') ? (
                    <iframe
                      src={comprobanteUrl}
                      title="Comprobante PDF"
                      className="w-full h-[60vh] rounded-lg border border-gray-300 bg-white"
                    />
                  ) : (
                    <div className="flex justify-center">
                      <img
                        src={comprobanteUrl}
                        alt="Comprobante de pago"
                        className="max-w-full max-h-[60vh] rounded-lg shadow-md object-contain bg-white"
                      />
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">No hay comprobante disponible</p>
                  </div>
                )}
              </div>

              {/* Footer del modal */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={handleCerrarModal}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCentroRecaudacionPage;
