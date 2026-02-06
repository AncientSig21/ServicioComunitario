import { useEffect, useState, useRef } from 'react';
import { fetchPagos, crearPagosMasivos, actualizarPago, eliminarPago, fetchCondominios, fetchResidentes, getTasaParaPagos, getMontoDisplay, formatMontoUsd, fetchPagoById, obtenerUrlComprobanteParaVisualizar } from '../services/bookService';
import { fetchTasaEnTiempoReal } from '../services/exchangeRateService';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/shared/Pagination';
import { FaPlus, FaEdit, FaTrash, FaEye, FaUsers, FaBuilding, FaGlobe, FaCity, FaDivide, FaThumbtack } from 'react-icons/fa';

interface Pago {
  id: number;
  usuario_id: number;
  vivienda_id: number | null;
  condominio_id?: number | null;
  concepto: string;
  monto: number;
  monto_usd?: number | null;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  observaciones: string | null;
  created_at: string;
  usuarios?: {
    nombre: string;
    correo: string;
    condominio_id?: number | null;
    condominios?: {
      id: number;
      nombre: string;
    } | null;
  };
  viviendas?: {
    numero_apartamento: string;
  };
}

const AdminPagosPage = () => {
  const { user } = useAuth();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [pagoDetallesId, setPagoDetallesId] = useState<number | null>(null);
  const [pagoDetalles, setPagoDetalles] = useState<any>(null);
  const [detallesComprobanteUrl, setDetallesComprobanteUrl] = useState<string | null>(null);
  const [detallesComprobanteMime, setDetallesComprobanteMime] = useState<string | null>(null);
  const detallesComprobanteBlobRef = useRef<string | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [condominios, setCondominios] = useState<any[]>([]);
  const [residentes, setResidentes] = useState<any[]>([]);
  const [selectedResidentes, setSelectedResidentes] = useState<number[]>([]);
  const [busquedaUsuariosModal, setBusquedaUsuariosModal] = useState('');

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroCondominioId, setFiltroCondominioId] = useState<string>('');

  // Tasa Bs/USD actual (para montos en USD y notificación al admin cuando cambia)
  const [tasaActual, setTasaActual] = useState<number>(0);

  // Estados para formulario de creación masiva
  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    montoUsd: '',
    useMontoUsd: false,
    tipo: 'mantenimiento' as string,
    fecha_vencimiento: '',
    tipoAplicacion: 'condominio' as 'condominio' | 'usuarios' | 'todos' | 'todos_condominios',
    condominio_id: '',
    aplicar_a_todos: false,
    // Nuevas opciones para Pago General Distribuido
    distribuirMonto: false,    // Si true, divide el monto total entre los usuarios
    esPagoFijo: false,         // Si true, marca como gasto fijo
  });

  // Estados para formulario de edición
  const [editFormData, setEditFormData] = useState({
    concepto: '',
    monto: '',
    montoUsd: '',
    useMontoUsd: false,
    tipo: 'mantenimiento' as string,
    fecha_vencimiento: '',
    estado: 'pendiente' as string,
    observaciones: '',
  });

  const abortRef = useRef(false);
  useEffect(() => {
    abortRef.current = false;
    if (user?.id) {
      cargarDatos(abortRef);
    }
    return () => {
      abortRef.current = true;
    };
  }, [user?.id, filtroCondominioId]);

  useEffect(() => {
    if (!showDetallesModal || !pagoDetallesId) return;
    let cancelled = false;
    fetchPagoById(pagoDetallesId).then((full) => {
      if (!cancelled) setPagoDetalles(full);
    });
    return () => { cancelled = true; setPagoDetalles(null); };
  }, [showDetallesModal, pagoDetallesId]);

  useEffect(() => {
    const url = pagoDetalles?.archivos?.url;
    if (detallesComprobanteBlobRef.current) {
      URL.revokeObjectURL(detallesComprobanteBlobRef.current);
      detallesComprobanteBlobRef.current = null;
    }
    setDetallesComprobanteMime(null);
    if (!url) {
      setDetallesComprobanteUrl(null);
      return;
    }
    if (url.startsWith('data:')) {
      try {
        const mime = (url.match(/^data:([^;]+);/)?.[1]) || 'image/jpeg';
        const base64 = url.split(',')[1];
        if (base64) {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          detallesComprobanteBlobRef.current = blobUrl;
          setDetallesComprobanteUrl(blobUrl);
          setDetallesComprobanteMime(mime);
        } else {
          setDetallesComprobanteUrl(url);
          setDetallesComprobanteMime(mime);
        }
      } catch {
        setDetallesComprobanteUrl(url);
      }
      return;
    }
    let cancelled = false;
    obtenerUrlComprobanteParaVisualizar(url).then((resolved) => {
      if (!cancelled) setDetallesComprobanteUrl(resolved);
    });
    return () => { cancelled = true; setDetallesComprobanteUrl(null); };
  }, [pagoDetalles?.id, pagoDetalles?.archivos?.url]);

  const cargarDatos = async (abortRef?: React.MutableRefObject<boolean>) => {
    const ref = abortRef ?? { current: false };
    try {
      setLoading(true);
      setError(null);

      const [condominiosData, residentesData, pagosData, tasa] = await Promise.all([
        fetchCondominios(),
        fetchResidentes(),
        fetchPagos(filtroCondominioId ? { condominio_id: Number(filtroCondominioId) } : undefined),
        fetchTasaEnTiempoReal({ guardarEnBD: false }).then(r => r.tasa).catch(() => getTasaParaPagos()),
      ]);
      if (ref.current) return;
      setCondominios(condominiosData || []);
      setResidentes(residentesData || []);
      setPagos((pagosData || []) as Pago[]);
      setTasaActual(tasa);
    } catch (err: any) {
      if (!ref.current) {
        console.error('Error cargando datos:', err);
        setError(err.message || 'Error al cargar los datos');
      }
    } finally {
      if (!ref.current) setLoading(false);
    }
  };

  // Aplicar filtros y búsqueda
  const pagosFiltrados = pagos.filter(pago => {
    if (filtroEstado && pago.estado !== filtroEstado) return false;
    if (filtroTipo && pago.tipo !== filtroTipo) return false;
    if (filtroCondominioId) {
      const pagoCondominioId = pago.condominio_id ?? pago.usuarios?.condominio_id;
      if (Number(pagoCondominioId) !== Number(filtroCondominioId)) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        pago.concepto?.toLowerCase().includes(query) ||
        pago.usuarios?.nombre?.toLowerCase().includes(query) ||
        pago.usuarios?.correo?.toLowerCase().includes(query) ||
        pago.viviendas?.numero_apartamento?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(pagosFiltrados.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPagos = pagosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  /**
   * Calcula el monto por persona según el modo de distribución.
   * 
   * @param montoTotal - El monto total ingresado por el admin
   * @param cantidadUsuarios - Número de usuarios a los que se aplicará el pago
   * @param distribuir - Si es true, divide el monto entre los usuarios; si es false, cada uno paga el total
   * @returns El monto que corresponde a cada usuario
   * 
   * Ejemplo:
   * - distribuir=false, monto=200, usuarios=100 → cada uno paga 200 (total recaudado: 20,000)
   * - distribuir=true, monto=200, usuarios=100 → cada uno paga 2 (total recaudado: 200)
   */
  const calcularMontoPorPersona = (montoTotal: number, cantidadUsuarios: number, distribuir: boolean): number => {
    if (cantidadUsuarios <= 0) return 0;
    if (distribuir) {
      // Modo distribuido: el monto total se divide entre todos
      return Math.round((montoTotal / cantidadUsuarios) * 100) / 100; // Redondear a 2 decimales
    }
    // Modo normal: cada usuario paga el monto completo
    return montoTotal;
  };

  const handleCrearPagosMasivos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Error: No se pudo identificar al administrador');
      return;
    }

    if (!formData.concepto.trim()) {
      alert('El concepto es requerido');
      return;
    }

    const useUsd = formData.useMontoUsd && formData.montoUsd.trim() !== '';
    const montoValue = useUsd ? 0 : parseFloat(formData.monto);
    const montoUsdValue = useUsd && formData.montoUsd ? parseFloat(formData.montoUsd) : undefined;
    if (!useUsd && (!formData.monto || montoValue <= 0)) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    if (useUsd && (!formData.montoUsd || (montoUsdValue ?? 0) <= 0)) {
      alert('El monto en USD debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      
      const tipoMapeado = typeof formData.tipo === 'string' ? formData.tipo : formData.tipo;
      
      // Construir concepto con indicador de gasto fijo si aplica
      let conceptoFinal = formData.concepto;
      if (formData.esPagoFijo) {
        conceptoFinal = `[GASTO FIJO] ${formData.concepto}`;
      }
      
      const payload = {
        admin_id: user.id,
        concepto: conceptoFinal,
        monto: useUsd ? 0 : montoValue,
        ...(useUsd && montoUsdValue != null ? { monto_usd: montoUsdValue } : {}),
        tipo: tipoMapeado,
        fecha_vencimiento: formData.fecha_vencimiento || undefined,
        // Nuevos parámetros para distribución y gasto fijo
        distribuir_monto: formData.distribuirMonto,
        es_pago_fijo: formData.esPagoFijo,
      };

      let resultado;
      
      if (formData.tipoAplicacion === 'todos' || formData.aplicar_a_todos) {
        resultado = await crearPagosMasivos({ ...payload, aplicar_a_todos: true });
      } else if (formData.tipoAplicacion === 'todos_condominios') {
        resultado = await crearPagosMasivos({ ...payload, aplicar_a_todos_condominios: true });
      } else if (formData.tipoAplicacion === 'condominio' && formData.condominio_id) {
        resultado = await crearPagosMasivos({ ...payload, condominio_id: parseInt(formData.condominio_id) });
      } else if (formData.tipoAplicacion === 'usuarios' && selectedResidentes.length > 0) {
        resultado = await crearPagosMasivos({ ...payload, usuario_ids: selectedResidentes });
      } else {
        alert('Debe seleccionar usuarios, un condominio, todos los condominios o aplicar a todos');
        return;
      }

      // Mostrar mensaje con información adicional si se distribuyó
      let mensajeFinal = resultado.message;
      if (formData.distribuirMonto && resultado.cantidad_usuarios) {
        const montoOriginal = useUsd ? montoUsdValue : montoValue;
        const montoPorPersona = calcularMontoPorPersona(montoOriginal || 0, resultado.cantidad_usuarios, true);
        mensajeFinal += `\n\n💡 Monto distribuido: ${useUsd ? `$${montoPorPersona} USD` : formatMonto(montoPorPersona)} por persona`;
      }
      if (formData.esPagoFijo) {
        mensajeFinal += '\n📌 Marcado como Gasto Fijo';
      }

      alert(`✅ ${mensajeFinal}`);
      setShowCreateModal(false);
      setFormData({
        concepto: '',
        monto: '',
        montoUsd: '',
        useMontoUsd: false,
        tipo: 'mantenimiento',
        fecha_vencimiento: '',
        tipoAplicacion: 'condominio',
        condominio_id: '',
        aplicar_a_todos: false,
        distribuirMonto: false,
        esPagoFijo: false,
      });
      setSelectedResidentes([]);
      setBusquedaUsuariosModal('');
      await cargarDatos();
    } catch (err: any) {
      console.error('Error creando pagos masivos:', err);
      alert(err.message || 'Error al crear los pagos masivos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetallesPago = (pago: Pago) => {
    setPagoDetallesId(pago.id);
    setShowDetallesModal(true);
    setPagoDetalles(null);
    setDetallesComprobanteUrl(null);
  };

  const handleEditarPago = (pago: Pago) => {
    setPagoSeleccionado(pago);
    const useUsd = pago.monto_usd != null && pago.monto_usd > 0;
    setEditFormData({
      concepto: pago.concepto,
      monto: useUsd ? '' : pago.monto.toString(),
      montoUsd: useUsd ? String(pago.monto_usd) : '',
      useMontoUsd: useUsd,
      tipo: pago.tipo,
      fecha_vencimiento: pago.fecha_vencimiento || '',
      estado: pago.estado,
      observaciones: pago.observaciones || '',
    });
    setShowEditModal(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !pagoSeleccionado) return;

    try {
      setLoading(true);
      const useUsd = editFormData.useMontoUsd && editFormData.montoUsd.trim() !== '';
      const montoUsdVal = useUsd && editFormData.montoUsd ? parseFloat(editFormData.montoUsd) : undefined;
      await actualizarPago({
        pago_id: pagoSeleccionado.id,
        admin_id: user.id,
        concepto: editFormData.concepto || undefined,
        monto: useUsd ? undefined : (editFormData.monto ? parseFloat(editFormData.monto) : undefined),
        monto_usd: montoUsdVal,
        tipo: editFormData.tipo || undefined,
        fecha_vencimiento: editFormData.fecha_vencimiento || undefined,
        estado: editFormData.estado as any,
        observaciones: editFormData.observaciones || undefined,
      });

      alert('✅ Pago actualizado exitosamente');
      setShowEditModal(false);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error actualizando pago:', err);
      alert(err.message || 'Error al actualizar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPago = async () => {
    if (!user?.id || !pagoSeleccionado) return;

    try {
      setLoading(true);
      await eliminarPago({
        pago_id: pagoSeleccionado.id,
        admin_id: user.id
      });

      alert('✅ Pago inhabilitado exitosamente. El pago ya no será visible para los usuarios pero permanecerá en el historial.');
      setShowDeleteConfirm(false);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error eliminando pago:', err);
      alert(err.message || 'Error al eliminar el pago');
    } finally {
      setLoading(false);
    }
  };

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'pendiente': 'bg-yellow-400 text-white',
      'pagado': 'bg-green-500 text-white',
      'vencido': 'bg-red-500 text-white',
      'parcial': 'bg-orange-500 text-white',
      'rechazado': 'bg-gray-400 text-white',
    };
    return badges[estado] || 'bg-gray-400 text-white';
  };

  const getTipoBadge = (tipo: string) => {
    const badges: { [key: string]: string } = {
      'mantenimiento': 'bg-blue-500 text-white',
      'multa': 'bg-red-500 text-white',
      'reserva': 'bg-purple-500 text-white',
      'otros': 'bg-gray-500 text-white',
    };
    return badges[tipo] || 'bg-gray-400 text-white';
  };

  if (loading && pagos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando pagos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            Gestión de Cuotas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de todos los pagos existentes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaPlus />
          Crear Cuotas Masivas
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Buscar por concepto, usuario o apartamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filtroCondominioId}
              onChange={(e) => setFiltroCondominioId(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los condominios</option>
              {condominios.map(cond => (
                <option key={cond.id} value={cond.id}>{cond.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
              <option value="parcial">Parcial</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="multa">Multa</option>
              <option value="reserva">Reserva</option>
              <option value="otros">Otros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condominio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPagos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroEstado || filtroTipo || filtroCondominioId ? 'No se encontraron pagos con los filtros aplicados' : 'No hay pagos registrados'}
                  </td>
                </tr>
              ) : (
                currentPagos.map((pago) => {
                // Detectar si es Pago Fijo / Distribuido
                const esPagoFijo = (pago as any).es_pago_fijo === true || 
                  (pago.observaciones || '').includes('GASTO FIJO');
                const esDistribuido = (pago.observaciones || '').includes('DISTRIBUIDO');
                const esGastoFijoDistribuido = esPagoFijo && esDistribuido;
                
                return (
                  <tr key={pago.id} className={`hover:bg-gray-50 ${esGastoFijoDistribuido ? 'bg-purple-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{pago.concepto}</span>
                        {/* Etiquetas visuales para Pago Fijo / Distribuido */}
                        {(esPagoFijo || esDistribuido) && (
                          <div className="flex flex-wrap gap-1">
                            {esGastoFijoDistribuido ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                Pago Fijo / Distribuido
                              </span>
                            ) : (
                              <>
                                {esPagoFijo && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Gasto Fijo
                                  </span>
                                )}
                                {esDistribuido && !esPagoFijo && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Distribuido
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{pago.usuarios?.nombre || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{pago.usuarios?.correo || ''}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                        {pago.usuarios?.condominios?.nombre || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pago.viviendas?.numero_apartamento || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      {formatMonto(getMontoDisplay(pago, tasaActual))}
                      {pago.monto_usd != null && pago.monto_usd > 0 ? (
                        <span className="ml-1.5 text-sm font-normal text-indigo-600" title="Monto fijado en dólares">({formatMontoUsd(pago.monto_usd)})</span>
                      ) : tasaActual > 0 && pago.monto != null && Number(pago.monto) > 0 ? (
                        <span className="ml-1.5 text-sm font-normal text-indigo-600" title="Equivalente en dólares (tasa actual)">({formatMontoUsd(Math.round((Number(pago.monto) / tasaActual) * 100) / 100)})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getTipoBadge(pago.tipo)}`}>
                        {pago.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(pago.estado)}`}>
                        {pago.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {pago.fecha_vencimiento 
                        ? new Date(pago.fecha_vencimiento).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleVerDetallesPago(pago)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                          title="Ver detalles del pago"
                        >
                          <FaEye />
                          Ver detalles
                        </button>
                        <button
                          onClick={() => handleEditarPago(pago)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors flex items-center gap-1"
                          title="Editar pago"
                        >
                          <FaEdit />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setPagoSeleccionado(pago);
                            setShowDeleteConfirm(true);
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                          title="Eliminar pago"
                        >
                          <FaTrash />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t">
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

      {/* Modal de creación masiva */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Cuotas Masivas</h2>
            
            <form onSubmit={handleCrearPagosMasivos} className="space-y-4">
              {/* Concepto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Cuota de Mantenimiento - Enero 2025"
                  required
                />
              </div>

              {/* Tasa actual (información) */}
              {tasaActual > 0 && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  Tasa actual: <strong>{tasaActual.toFixed(2)} Bs/USD</strong> (el monto en Bs se actualiza con la tasa Venezuela)
                </p>
              )}

              {/* Monto en USD o Monto fijo en Bs */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={formData.useMontoUsd}
                    onChange={(e) => setFormData({ ...formData, useMontoUsd: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Monto en USD (se actualiza con la tasa BCV/Venezuela)</span>
                </label>
                {formData.useMontoUsd ? (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.montoUsd}
                      onChange={(e) => setFormData({ ...formData, montoUsd: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Monto en USD (ej. 50)"
                      required={formData.useMontoUsd}
                    />
                    {tasaActual > 0 && formData.montoUsd && parseFloat(formData.montoUsd) > 0 && (
                      <p className="mt-1 text-sm text-indigo-600">
                        Equivalente aproximado: <strong>{formatMonto(parseFloat(formData.montoUsd) * tasaActual)}</strong> (según tasa actual)
                      </p>
                    )}
                  </>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Monto en Bs (fijo)"
                    required={!formData.useMontoUsd}
                  />
                )}
              </div>

              {/* ===== NUEVA SECCIÓN: Pago General Distribuido ===== */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaDivide className="text-purple-600" />
                  <h3 className="font-semibold text-purple-800">Opciones de Distribución</h3>
                </div>

                {/* Toggle: Distribuir monto entre seleccionados */}
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="distribuirMonto"
                      checked={formData.distribuirMonto}
                      onChange={(e) => setFormData({ ...formData, distribuirMonto: e.target.checked })}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor="distribuirMonto"
                      className="flex items-center cursor-pointer"
                    >
                      <div className="w-11 h-6 bg-gray-300 peer-checked:bg-purple-600 rounded-full transition-colors relative">
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.distribuirMonto ? 'translate-x-5' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="distribuirMonto" className="font-medium text-gray-800 cursor-pointer">
                      Distribuir monto total entre seleccionados
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      {formData.distribuirMonto 
                        ? '✅ El monto ingresado se dividirá entre todos los usuarios seleccionados.'
                        : '⬜ Cada usuario pagará el monto completo ingresado.'
                      }
                    </p>
                  </div>
                </div>

                {/* Ejemplo visual de cálculo */}
                {formData.distribuirMonto && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <p className="text-sm text-purple-800 font-medium mb-2">
                      📊 Vista previa de distribución:
                    </p>
                    <div className="text-sm text-gray-700">
                      {(() => {
                        const montoTotal = formData.useMontoUsd 
                          ? parseFloat(formData.montoUsd) || 0 
                          : parseFloat(formData.monto) || 0;
                        
                        // Calcular cantidad de usuarios según tipoAplicacion
                        let cantidadUsuarios = 0;
                        if (formData.tipoAplicacion === 'usuarios') {
                          cantidadUsuarios = selectedResidentes.length;
                        } else if (formData.tipoAplicacion === 'condominio' && formData.condominio_id) {
                          cantidadUsuarios = residentes.filter(r => r.condominio_id === parseInt(formData.condominio_id)).length;
                        } else if (formData.tipoAplicacion === 'todos' || formData.tipoAplicacion === 'todos_condominios') {
                          cantidadUsuarios = formData.tipoAplicacion === 'todos' 
                            ? residentes.length 
                            : residentes.filter(r => r.condominio_id).length;
                        }
                        
                        if (montoTotal > 0 && cantidadUsuarios > 0) {
                          const montoPorPersona = Math.round((montoTotal / cantidadUsuarios) * 100) / 100;
                          const monedaSymbol = formData.useMontoUsd ? '$' : 'Bs';
                          return (
                            <>
                              <div className="flex justify-between py-1 border-b border-gray-100">
                                <span>Monto total:</span>
                                <span className="font-semibold">{monedaSymbol} {montoTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-gray-100">
                                <span>Usuarios seleccionados:</span>
                                <span className="font-semibold">{cantidadUsuarios}</span>
                              </div>
                              <div className="flex justify-between py-1 text-purple-700 font-bold">
                                <span>Monto por persona:</span>
                                <span>{monedaSymbol} {montoPorPersona.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        }
                        return <span className="text-gray-500 italic">Ingresa un monto y selecciona usuarios para ver la distribución</span>;
                      })()}
                    </div>
                  </div>
                )}

                {/* Checkbox: Marcar como Gasto Fijo */}
                <div className="flex items-start gap-3 pt-2 border-t border-purple-200">
                  <input
                    type="checkbox"
                    id="esPagoFijo"
                    checked={formData.esPagoFijo}
                    onChange={(e) => setFormData({ ...formData, esPagoFijo: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="esPagoFijo" className="font-medium text-gray-800 cursor-pointer flex items-center gap-2">
                      <FaThumbtack className="text-indigo-500" />
                      Marcar como Gasto Fijo
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Los gastos fijos aparecerán en el Centro de Recaudación para seguimiento de metas (ej: mantenimiento de bomba, electricidad, limpieza).
                    </p>
                  </div>
                </div>
              </div>

              {/* Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="multa">Multa</option>
                    <option value="reserva">Reserva</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento (Opcional)
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tipo de aplicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aplicar a <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="todos"
                      checked={formData.tipoAplicacion === 'todos'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'todos' as any, aplicar_a_todos: true })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaGlobe className="text-blue-600" />
                    <span className="text-gray-900">Todos los usuarios activos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="todos_condominios"
                      checked={formData.tipoAplicacion === 'todos_condominios'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'todos_condominios' as any, aplicar_a_todos: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaCity className="text-indigo-600" />
                    <span className="text-gray-900">Todos los condominios</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="condominio"
                      checked={formData.tipoAplicacion === 'condominio'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'condominio' as any, aplicar_a_todos: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaBuilding className="text-green-600" />
                    <span className="text-gray-900">Condominio específico</span>
                  </label>
                  {formData.tipoAplicacion === 'condominio' && (
                    <select
                      value={formData.condominio_id}
                      onChange={(e) => setFormData({ ...formData, condominio_id: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ml-6"
                      required={formData.tipoAplicacion === 'condominio'}
                    >
                      <option value="">Selecciona un condominio</option>
                      {condominios.map(cond => (
                        <option key={cond.id} value={cond.id}>{cond.nombre}</option>
                      ))}
                    </select>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="usuarios"
                      checked={formData.tipoAplicacion === 'usuarios'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'usuarios' as any, aplicar_a_todos: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaUsers className="text-purple-600" />
                    <span className="text-gray-900">Usuarios específicos</span>
                  </label>
                  {formData.tipoAplicacion === 'usuarios' && (
                    <div className="ml-6 space-y-2">
                      <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        value={busquedaUsuariosModal}
                        onChange={(e) => setBusquedaUsuariosModal(e.target.value)}
                        className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {(busquedaUsuariosModal.trim()
                          ? residentes.filter(r =>
                              (r.nombre || '').toLowerCase().includes(busquedaUsuariosModal.trim().toLowerCase()) ||
                              (r.correo || '').toLowerCase().includes(busquedaUsuariosModal.trim().toLowerCase())
                            )
                          : residentes
                        ).map(residente => (
                        <label key={residente.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedResidentes.includes(residente.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResidentes([...selectedResidentes, residente.id]);
                              } else {
                                setSelectedResidentes(selectedResidentes.filter(id => id !== residente.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-900 text-sm">{residente.nombre} ({residente.correo})</span>
                        </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando...' : 'Crear Pagos'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      concepto: '',
                      monto: '',
                      montoUsd: '',
                      useMontoUsd: false,
                      tipo: 'mantenimiento',
                      fecha_vencimiento: '',
                      tipoAplicacion: 'condominio',
                      condominio_id: '',
                      aplicar_a_todos: false,
                      distribuirMonto: false,
                      esPagoFijo: false,
                    });
                    setSelectedResidentes([]);
                    setBusquedaUsuariosModal('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && pagoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Pago</h2>
            
            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              {tasaActual > 0 && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  Tasa actual: <strong>{tasaActual.toFixed(2)} Bs/USD</strong>
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.concepto}
                  onChange={(e) => setEditFormData({ ...editFormData, concepto: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={editFormData.useMontoUsd}
                    onChange={(e) => setEditFormData({ ...editFormData, useMontoUsd: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Monto en USD (se actualiza con tasa)</span>
                </label>
                {editFormData.useMontoUsd ? (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editFormData.montoUsd}
                      onChange={(e) => setEditFormData({ ...editFormData, montoUsd: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Monto en USD"
                      required={editFormData.useMontoUsd}
                    />
                    {tasaActual > 0 && editFormData.montoUsd && parseFloat(editFormData.montoUsd) > 0 && (
                      <p className="mt-1 text-sm text-indigo-600">
                        Equivalente aproximado: <strong>{formatMonto(parseFloat(editFormData.montoUsd) * tasaActual)}</strong> (según tasa actual)
                      </p>
                    )}
                  </>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.monto}
                    onChange={(e) => setEditFormData({ ...editFormData, monto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Monto en Bs (fijo)"
                    required={!editFormData.useMontoUsd}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.tipo}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="multa">Multa</option>
                    <option value="reserva">Reserva</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.estado}
                    onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                    <option value="parcial">Parcial</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={editFormData.fecha_vencimiento}
                  onChange={(e) => setEditFormData({ ...editFormData, fecha_vencimiento: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={editFormData.observaciones}
                  onChange={(e) => setEditFormData({ ...editFormData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setPagoSeleccionado(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {/* Modal Detalles del pago */}
      {showDetallesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detalles del pago</h2>
            {!pagoDetalles ? (
              <p className="text-gray-600">Cargando...</p>
            ) : (
              <div className="space-y-4">
                <div><span className="font-medium text-gray-700">Concepto:</span> {pagoDetalles.concepto}</div>
                <div><span className="font-medium text-gray-700">Monto:</span> {formatMonto(getMontoDisplay(pagoDetalles, tasaActual))}</div>
                <div><span className="font-medium text-gray-700">Tipo:</span> {pagoDetalles.tipo}</div>
                <div><span className="font-medium text-gray-700">Estado:</span> {pagoDetalles.estado}</div>
                <div><span className="font-medium text-gray-700">Fecha vencimiento:</span> {pagoDetalles.fecha_vencimiento ? new Date(pagoDetalles.fecha_vencimiento).toLocaleDateString('es-ES') : 'N/A'}</div>
                <div><span className="font-medium text-gray-700">Fecha pago:</span> {pagoDetalles.fecha_pago ? new Date(pagoDetalles.fecha_pago).toLocaleDateString('es-ES') : 'N/A'}</div>
                {pagoDetalles.usuarios && (
                  <div><span className="font-medium text-gray-700">Usuario:</span> {pagoDetalles.usuarios.nombre} ({pagoDetalles.usuarios.correo})</div>
                )}
                {pagoDetalles.observaciones && (
                  <div><span className="font-medium text-gray-700">Observaciones:</span> {pagoDetalles.observaciones}</div>
                )}
                {pagoDetalles.archivos?.url && (
                  <div>
                    <span className="font-medium text-gray-700 block mb-1">Comprobante:</span>
                    {detallesComprobanteUrl ? (
                      detallesComprobanteMime && detallesComprobanteMime.toLowerCase().includes('pdf') ? (
                        <iframe
                          src={detallesComprobanteUrl}
                          title="Comprobante"
                          className="w-full max-h-[70vh] min-h-[300px] rounded-lg border border-gray-200"
                        />
                      ) : (
                        <img
                          src={detallesComprobanteUrl}
                          alt="Comprobante"
                          className="max-w-full max-h-[70vh] rounded-lg border border-gray-200 object-contain"
                        />
                      )
                    ) : (
                      <span className="text-gray-500 text-sm">Preparando comprobante...</span>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDetallesModal(false);
                  setPagoDetallesId(null);
                  setPagoDetalles(null);
                  setDetallesComprobanteUrl(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && pagoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmar Inhabilitación</h2>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas inhabilitar el pago "{pagoSeleccionado.concepto}" de {pagoSeleccionado.usuarios?.nombre || 'este usuario'}?
            </p>
            <p className="text-sm text-orange-600 mb-2">
              El pago será marcado como eliminado y dejará de ser visible para los usuarios.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              El pago permanecerá en la base de datos y en el historial para mantener la integridad de los registros.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPagoSeleccionado(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarPago}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Inhabilitando...' : 'Inhabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPagosPage;

