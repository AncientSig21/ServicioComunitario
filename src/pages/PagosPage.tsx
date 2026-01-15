import { useState, useEffect } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { fetchPagos, solicitarPago, obtenerViviendaUsuario, subirArchivoComprobante } from '../services/bookService';
import { supabase } from '../supabase/client';
import { PaymentRequestModal } from '../components/payments/PaymentRequestModal';

interface Pago {
  id: number;
  concepto: string;
  monto: number;
  fechaVencimiento: string;
  fechaPago?: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'parcial' | 'rechazado';
  tipo: 'mantenimiento' | 'servicios' | 'multa' | 'otros';
  referencia?: string;
  comprobante_url?: string;
  descripcion?: string;
  motivo_rechazo?: string;
  comprobante_archivo_id?: number | null;
  created_at?: string;
}

// Función para mapear pagos de la BD al formato del componente
const mapearPagoDesdeBD = (pagoBD: any): Pago => {
  if (!pagoBD) {
    console.warn('⚠️ Intento de mapear pago nulo o indefinido');
    return null as any;
  }
  
  const pagoMapeado = {
    id: pagoBD.id,
    concepto: pagoBD.concepto || 'Sin concepto',
    monto: parseFloat(pagoBD.monto || 0),
    fechaVencimiento: pagoBD.fecha_vencimiento || '',
    fechaPago: pagoBD.fecha_pago || undefined,
    estado: pagoBD.estado === 'pagado' ? 'pagado' : 
            pagoBD.estado === 'aprobado' ? 'pagado' : // Aprobado se muestra como pagado
            // Si tiene observaciones con "RECHAZADO:", mostrar como rechazado aunque el estado sea pendiente
            (pagoBD.observaciones?.includes('RECHAZADO:') || pagoBD.observaciones?.startsWith('RECHAZADO:')) ? 'rechazado' :
            pagoBD.estado === 'pendiente' ? 'pendiente' :
            pagoBD.estado === 'vencido' ? 'vencido' :
            pagoBD.estado === 'rechazado' ? 'rechazado' : 'parcial',
    tipo: pagoBD.tipo === 'mantenimiento' ? 'mantenimiento' :
          pagoBD.tipo === 'multa' ? 'multa' :
          pagoBD.tipo === 'reserva' ? 'servicios' : 'otros',
    referencia: pagoBD.referencia || undefined,
    comprobante_url: pagoBD.archivos?.url || undefined,
    descripcion: pagoBD.observaciones || undefined,
    motivo_rechazo: pagoBD.observaciones?.includes('RECHAZADO:') ? pagoBD.observaciones.replace('RECHAZADO: ', '') : 
                     pagoBD.estado === 'rechazado' ? pagoBD.observaciones : undefined,
    comprobante_archivo_id: pagoBD.comprobante_archivo_id || null,
    created_at: pagoBD.created_at || undefined,
  };
  
  console.log('📋 Pago mapeado:', pagoMapeado.id, pagoMapeado.concepto, pagoMapeado.estado);
  return pagoMapeado;
};

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  pagado: 'bg-green-100 text-green-800 border-green-300',
  vencido: 'bg-red-100 text-red-800 border-red-300',
  parcial: 'bg-orange-100 text-orange-800 border-orange-300',
  rechazado: 'bg-red-200 text-red-900 border-red-400',
};

const estadoLabels = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  vencido: 'Vencido',
  parcial: 'Pago Parcial',
  rechazado: 'Rechazado',
};

const tipoLabels = {
  mantenimiento: 'Mantenimiento',
  servicios: 'Servicios Comunes',
  multa: 'Multa',
  otros: 'Otros',
};

export const PagosPage = () => {
  const { user } = useAuth();
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPago, setLoadingPago] = useState<number | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [pagoParaPagar, setPagoParaPagar] = useState<Pago | null>(null);
  const [pagoPendienteVer, setPagoPendienteVer] = useState<Pago | null>(null);
  const [showVerPagoModal, setShowVerPagoModal] = useState(false);
  const [showEditarPagoModal, setShowEditarPagoModal] = useState(false);
  const [pagoAEditar, setPagoAEditar] = useState<Pago | null>(null);
  const [formPago, setFormPago] = useState({
    referencia: '',
    descripcion: '',
    comprobante: null as File | null,
  });
  const [formEditarPago, setFormEditarPago] = useState({
    monto: '',
    descripcion: '',
    referencia: '',
    comprobante: null as File | null,
  });

  const estados = ['todos', 'pendiente', 'pagado', 'vencido', 'parcial', 'rechazado'];

  // Cargar pagos desde la base de datos
  useEffect(() => {
    const cargarPagos = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Cargando pagos para usuario:', user.id);
        const pagosBD = await fetchPagos({ usuario_id: user.id });
        console.log('📦 Pagos obtenidos de BD:', pagosBD.length, pagosBD);
        const pagosMapeados = pagosBD.map(mapearPagoDesdeBD);
        console.log('✅ Pagos mapeados:', pagosMapeados.length, pagosMapeados);
        setPagos(pagosMapeados);
      } catch (error) {
        console.error('❌ Error cargando pagos:', error);
        setPagos([]);
      } finally {
        setLoading(false);
      }
    };

    cargarPagos();
    // Recargar cada 30 segundos para actualizar estados (incluyendo nuevos pagos creados por admin)
    const interval = setInterval(cargarPagos, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const filteredPagos = selectedEstado === 'todos'
    ? pagos
    : pagos.filter(pago => pago.estado === selectedEstado);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const handleAbrirModalPago = (pago: Pago) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar un pago');
      return;
    }
    // Abrir el modal de solicitar pago con la información del pago seleccionado
    setPagoParaPagar(pago);
    setShowPaymentRequestModal(true);
  };

  const handleRealizarPago = async () => {
    if (!user || !pagoSeleccionado) return;

    if (!formPago.referencia.trim()) {
      alert('Por favor ingresa la referencia del pago');
      return;
    }

    if (!formPago.comprobante) {
      alert('Por favor adjunta el comprobante de pago');
      return;
    }

    try {
      setLoadingPago(pagoSeleccionado.id);
      
      // 1. Obtener vivienda_id del usuario
      const vivienda_id = await obtenerViviendaUsuario(user.id);
      
      if (!vivienda_id) {
        throw new Error('No se encontró una vivienda asociada a tu cuenta. Por favor, contacta a la administración.');
      }

      // 2. Subir comprobante
      let archivo_comprobante_id: number | null = null;
      if (formPago.comprobante) {
        archivo_comprobante_id = await subirArchivoComprobante(formPago.comprobante, user.id);
        if (!archivo_comprobante_id) {
          console.warn('No se pudo subir el comprobante, continuando sin él');
        }
      }

      // 3. Crear la solicitud de pago usando solicitarPago
      // Nota: El concepto y monto vienen del pago seleccionado
      await solicitarPago({
        usuario_id: user.id,
        vivienda_id: vivienda_id,
        concepto: pagoSeleccionado.concepto,
        monto: pagoSeleccionado.monto,
        tipo: pagoSeleccionado.tipo,
        fecha_vencimiento: pagoSeleccionado.fechaVencimiento,
        archivo_comprobante_id: archivo_comprobante_id || undefined,
      });

      // 4. Actualizar el estado del pago en la lista local
      setPagos(pagos.map(p => 
        p.id === pagoSeleccionado.id ? { ...p, estado: 'pendiente', fechaPago: new Date().toISOString() } : p
      ));

      // 5. Cerrar modal y limpiar formulario
      setShowPagoModal(false);
      setPagoSeleccionado(null);
      setFormPago({ referencia: '', descripcion: '', comprobante: null });

      alert('✅ Pago registrado exitosamente. El administrador verificará tu pago.');
    } catch (error: any) {
      console.error('Error al realizar pago:', error);
      alert(error.message || 'Error al registrar el pago. Por favor, intenta de nuevo.');
    } finally {
      setLoadingPago(null);
    }
  };

  // Obtener pago pendiente con comprobante (enviado por el usuario)
  const pagoPendienteConComprobante = pagos.find(
    p => p.estado === 'pendiente' && p.comprobante_archivo_id !== null && p.comprobante_archivo_id !== undefined
  );

  // Calcular total pendiente excluyendo el pago que ya tiene comprobante (ya fue enviado)
  const totalPendiente = pagos
    .filter(p => {
      const esPendienteOVencido = p.estado === 'pendiente' || p.estado === 'vencido';
      // Excluir el pago que ya tiene comprobante (ya fue enviado y está esperando aprobación)
      const noEsPagoEnviado = !pagoPendienteConComprobante || p.id !== pagoPendienteConComprobante.id;
      return esPendienteOVencido && noEsPagoEnviado;
    })
    .reduce((sum, p) => sum + p.monto, 0);

  // Calcular total pagado (incluye pagos aprobados)
  const totalPagado = pagos
    .filter(p => p.estado === 'pagado')
    .reduce((sum, p) => sum + p.monto, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToHome />
          <div className="mt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              💰 Estado de Pagos
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Consulta el estado de tus cuotas y pagos de Ciudad Colonial
            </p>
          </div>
        </div>

        {/* Resumen de pagos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pagado</p>
                <p className="text-2xl font-bold text-green-600">{formatMonto(totalPagado)}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pendiente</p>
                <p className="text-2xl font-bold text-red-600">{formatMonto(totalPendiente)}</p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Filtros de estado */}
        <div className="mb-8 flex flex-wrap gap-3">
          {estados.map((estado) => (
            <button
              key={estado}
              onClick={() => setSelectedEstado(estado)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedEstado === estado
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {estado === 'todos' ? 'Todos' : estadoLabels[estado as keyof typeof estadoLabels]}
            </button>
          ))}
        </div>

        {/* Lista de pagos */}
        {loading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-500 text-lg">Cargando pagos...</p>
          </div>
        ) : filteredPagos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">No hay pagos en este estado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPagos.map((pago, index) => (
              <motion.div
                key={pago.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
                style={{
                  borderLeftColor:
                    pago.estado === 'pendiente'
                      ? '#eab308'
                      : pago.estado === 'pagado'
                      ? '#22c55e'
                      : pago.estado === 'vencido'
                      ? '#ef4444'
                      : pago.estado === 'rechazado'
                      ? '#dc2626'
                      : '#f97316',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          estadoColors[pago.estado]
                        }`}
                      >
                        {estadoLabels[pago.estado]}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {tipoLabels[pago.tipo]}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {pago.concepto}
                    </h2>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatMonto(pago.monto)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">📅 Fecha de Vencimiento:</span>
                      <span>{formatFecha(pago.fechaVencimiento)}</span>
                    </div>
                    {pago.fechaPago && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold">✅ Fecha de Pago:</span>
                        <span className="text-green-600">{formatFecha(pago.fechaPago)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {pago.referencia && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold">🔖 Referencia:</span>
                        <span className="font-mono">{pago.referencia}</span>
                      </div>
                    )}
                    {pago.motivo_rechazo && (
                      <div className="flex items-start gap-2 text-sm mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="font-semibold text-red-800">❌ Motivo de Rechazo:</span>
                        <span className="text-red-700">{pago.motivo_rechazo}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(pago.estado === 'pendiente' || pago.estado === 'vencido' || pago.estado === 'rechazado') ? (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {/* Si este pago tiene comprobante (fue enviado por el usuario), mostrar "Ver Pago" */}
                    {pago.comprobante_archivo_id !== null && pago.comprobante_archivo_id !== undefined ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-yellow-800 font-medium">
                            ⏳ Este pago está pendiente de revisión por el administrador
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button 
                            onClick={() => {
                              setPagoPendienteVer(pago);
                              setShowVerPagoModal(true);
                            }}
                            className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Ver Pago
                          </button>
                          <button 
                            onClick={() => {
                              setPagoAEditar(pago);
                              setFormEditarPago({
                                monto: pago.monto.toString(),
                                descripcion: pago.descripcion || '',
                                referencia: pago.referencia || '',
                                comprobante: null,
                              });
                              setShowEditarPagoModal(true);
                            }}
                            className="flex-1 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                          >
                            Editar Pago
                          </button>
                          <button 
                            onClick={() => handleAbrirModalPago(pago)}
                            disabled={loadingPago === pago.id}
                            className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingPago === pago.id ? 'Procesando...' : 'Solicitar Otro Pago'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Si no tiene comprobante, mostrar "Solicitar Pago" */
                      <button 
                        onClick={() => handleAbrirModalPago(pago)}
                        disabled={loadingPago === pago.id}
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingPago === pago.id ? 'Procesando...' : 'Solicitar Pago'}
                      </button>
                    )}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Información sobre Pagos
          </h3>
          <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
            <li>Los pagos pueden realizarse a través del portal, transferencia bancaria o en las oficinas administrativas.</li>
            <li>Las cuotas de mantenimiento vencen el día 10 de cada mes.</li>
            <li>Los pagos vencidos pueden generar intereses y multas según el reglamento del condominio.</li>
            <li>Para consultas sobre tu estado de cuenta, contacta a la administración.</li>
          </ul>
        </div>
      </div>

      {/* Modal para realizar pago */}
      <AnimatePresence>
        {showPagoModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Registrar Pago
              </h2>
              
              {/* Información del pago */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">Concepto:</p>
                <p className="font-semibold text-gray-900">{pagoSeleccionado.concepto}</p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Monto:</p>
                <p className="text-2xl font-bold text-blue-600">{formatMonto(pagoSeleccionado.monto)}</p>
              </div>

              <div className="space-y-4">
                {/* Campo de referencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia del Pago *
                  </label>
                  <input
                    type="text"
                    value={formPago.referencia}
                    onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: REF-2025-001234"
                    required
                  />
                </div>

                {/* Campo de descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción / Argumento del Pago *
                  </label>
                  <textarea
                    value={formPago.descripcion}
                    onChange={(e) => setFormPago({ ...formPago, descripcion: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explica el motivo y detalles de tu pago..."
                    required
                  />
                </div>

                {/* Campo de comprobante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comprobante de Pago * (PDF, JPG, PNG)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validar tamaño (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          alert('El archivo es demasiado grande. Máximo 10MB');
                          return;
                        }
                        setFormPago({ ...formPago, comprobante: file });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {formPago.comprobante && (
                    <p className="text-sm text-gray-600 mt-1">
                      Archivo seleccionado: {formPago.comprobante.name} ({(formPago.comprobante.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRealizarPago}
                  disabled={loadingPago === pagoSeleccionado.id || !formPago.referencia || !formPago.comprobante || !formPago.descripcion}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPago === pagoSeleccionado.id ? 'Enviando...' : 'Enviar Pago'}
                </button>
                <button
                  onClick={() => {
                    setShowPagoModal(false);
                    setPagoSeleccionado(null);
                    setFormPago({ referencia: '', descripcion: '', comprobante: null });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de solicitar pago - Siempre disponible */}
      {showPaymentRequestModal && (
        <PaymentRequestModal
          isOpen={showPaymentRequestModal}
          onClose={() => {
            setShowPaymentRequestModal(false);
            setPagoParaPagar(null);
          }}
          onSuccess={() => {
            // Recargar pagos después de enviar la solicitud
            const cargarPagos = async () => {
              if (!user) return;
              try {
                const pagosBD = await fetchPagos({ usuario_id: user.id });
                const pagosMapeados = pagosBD.map(mapearPagoDesdeBD);
                setPagos(pagosMapeados);
              } catch (error) {
                console.error('Error recargando pagos:', error);
              }
            };
            cargarPagos();
          }}
        />
      )}

      {/* Modal para ver pago pendiente */}
      {showVerPagoModal && pagoPendienteVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Detalles del Pago Pendiente
            </h2>
            
            {/* Información del pago */}
            <div className="space-y-4 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⏳ Estado: Pendiente de Revisión
                </p>
                <p className="text-xs text-yellow-700">
                  Tu pago está siendo revisado por el administrador. Recibirás una notificación cuando sea procesado.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Concepto:</p>
                <p className="font-semibold text-gray-900 text-lg">{pagoPendienteVer.concepto}</p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Monto:</p>
                <p className="text-2xl font-bold text-blue-600">{formatMonto(pagoPendienteVer.monto)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha de Vencimiento:</p>
                  <p className="font-medium text-gray-900">{formatFecha(pagoPendienteVer.fechaVencimiento)}</p>
                </div>
                {pagoPendienteVer.created_at && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fecha de Envío:</p>
                    <p className="font-medium text-gray-900">{formatFecha(pagoPendienteVer.created_at)}</p>
                  </div>
                )}
                {pagoPendienteVer.referencia && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Referencia:</p>
                    <p className="font-mono text-sm text-gray-900">{pagoPendienteVer.referencia}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tipo:</p>
                  <p className="font-medium text-gray-900">{tipoLabels[pagoPendienteVer.tipo]}</p>
                </div>
              </div>

              {pagoPendienteVer.descripcion && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Descripción:</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg break-words">{pagoPendienteVer.descripcion}</p>
                </div>
              )}

              {pagoPendienteVer.motivo_rechazo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Motivo de Rechazo:</p>
                  <p className="text-sm text-red-700 break-words">{pagoPendienteVer.motivo_rechazo}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (pagoPendienteVer) {
                    setPagoAEditar(pagoPendienteVer);
                    setFormEditarPago({
                      monto: pagoPendienteVer.monto.toString(),
                      descripcion: pagoPendienteVer.descripcion || '',
                      referencia: pagoPendienteVer.referencia || '',
                      comprobante: null,
                    });
                    setShowVerPagoModal(false);
                    setShowEditarPagoModal(true);
                  }
                }}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Editar Pago
              </button>
              <button
                onClick={() => {
                  setShowVerPagoModal(false);
                  setPagoPendienteVer(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal para editar pago pendiente */}
      {showEditarPagoModal && pagoAEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Editar Pago Pendiente
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Concepto:</p>
                <p className="font-semibold text-gray-900">{pagoAEditar.concepto}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto del Pago *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formEditarPago.monto}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormEditarPago({ ...formEditarPago, monto: value });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia (Opcional)
                </label>
                <input
                  type="text"
                  value={formEditarPago.referencia}
                  onChange={(e) => setFormEditarPago({ ...formEditarPago, referencia: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: REF-2025-001234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  value={formEditarPago.descripcion}
                  onChange={(e) => setFormEditarPago({ ...formEditarPago, descripcion: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                  placeholder="Describe los detalles del pago..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Comprobante (Opcional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert('El archivo es demasiado grande. Máximo 10MB');
                        return;
                      }
                      setFormEditarPago({ ...formEditarPago, comprobante: file });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si subes un nuevo comprobante, reemplazará el anterior
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  if (!user || !pagoAEditar) return;
                  
                  try {
                    setLoadingPago(pagoAEditar.id);
                    
                    // Validar campos requeridos
                    if (!formEditarPago.monto.trim() || !formEditarPago.descripcion.trim()) {
                      alert('Por favor completa todos los campos requeridos');
                      setLoadingPago(null);
                      return;
                    }

                    const monto = parseFloat(formEditarPago.monto);
                    if (isNaN(monto) || monto < 0) {
                      alert('El monto debe ser un número válido y mayor o igual a 0');
                      setLoadingPago(null);
                      return;
                    }

                    // Subir nuevo comprobante si se proporcionó
                    let nuevoComprobanteId = pagoAEditar.comprobante_archivo_id || null;
                    if (formEditarPago.comprobante) {
                      nuevoComprobanteId = await subirArchivoComprobante(formEditarPago.comprobante, user.id);
                    }

                    // Actualizar el pago
                    const { error } = await supabase
                      .from('pagos')
                      .update({
                        monto: monto,
                        observaciones: formEditarPago.descripcion,
                        referencia: formEditarPago.referencia || null,
                        comprobante_archivo_id: nuevoComprobanteId,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', pagoAEditar.id);

                    if (error) throw error;

                    alert('✅ Pago actualizado exitosamente');
                    setShowEditarPagoModal(false);
                    setPagoAEditar(null);
                    setFormEditarPago({ monto: '', descripcion: '', referencia: '', comprobante: null });
                    
                    // Recargar pagos
                    const pagosBD = await fetchPagos({ usuario_id: user.id });
                    const pagosMapeados = pagosBD.map(mapearPagoDesdeBD);
                    setPagos(pagosMapeados);
                  } catch (error: any) {
                    console.error('Error actualizando pago:', error);
                    alert('Error al actualizar el pago: ' + (error.message || 'Error desconocido'));
                  } finally {
                    setLoadingPago(null);
                  }
                }}
                disabled={loadingPago === pagoAEditar.id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPago === pagoAEditar.id ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                onClick={() => {
                  setShowEditarPagoModal(false);
                  setPagoAEditar(null);
                  setFormEditarPago({ monto: '', descripcion: '', referencia: '', comprobante: null });
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

