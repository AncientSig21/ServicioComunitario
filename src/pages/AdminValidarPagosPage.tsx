import { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaEye, FaFileImage, FaUser, FaHome, FaCalendar, FaDollarSign } from 'react-icons/fa';
import { fetchPagos, validarPago, obtenerComprobantePago } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface PagoPendiente {
  id: number;
  concepto: string;
  monto: number;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  created_at: string;
  observaciones: string | null;
  comprobante_archivo_id: number | null;
  usuarios: {
    id: number;
    nombre: string;
    correo: string;
    telefono: string | null;
  };
  viviendas: {
    id: number;
    numero_apartamento: string;
    condominio_id: number | null;
  };
}

export default function AdminValidarPagosPage() {
  const { user } = useAuth();
  const [pagos, setPagos] = useState<PagoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoPendiente | null>(null);
  const [mostrarComprobante, setMostrarComprobante] = useState(false);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [cargandoComprobante, setCargandoComprobante] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [pagoRechazoId, setPagoRechazoId] = useState<number | null>(null);

  useEffect(() => {
    cargarPagosPendientes();
  }, []);

  const cargarPagosPendientes = async () => {
    try {
      setLoading(true);
      setError(null);
      // Obtener pagos pendientes que tienen comprobante (enviados por usuarios)
      const pagosData = await fetchPagos({ estado: 'pendiente' });
      
      // Filtrar solo los que tienen comprobante (enviados por usuarios)
      const pagosConComprobante = pagosData.filter((pago: any) => pago.comprobante_archivo_id !== null);
      
      setPagos(pagosConComprobante as PagoPendiente[]);
    } catch (err: any) {
      console.error('Error cargando pagos pendientes:', err);
      setError(err.message || 'Error al cargar los pagos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleVerComprobante = async (pago: PagoPendiente) => {
    try {
      setCargandoComprobante(true);
      setPagoSeleccionado(pago);
      
      const resultado = await obtenerComprobantePago(pago.id);
      
      if (resultado.success && resultado.url) {
        setComprobanteUrl(resultado.url);
        setMostrarComprobante(true);
      } else {
        alert('No se pudo cargar el comprobante. ' + (resultado.message || ''));
      }
    } catch (err: any) {
      console.error('Error obteniendo comprobante:', err);
      alert('Error al cargar el comprobante: ' + err.message);
    } finally {
      setCargandoComprobante(false);
    }
  };

  const handleAprobar = async (pagoId: number) => {
    if (!user) {
      alert('Debes estar autenticado');
      return;
    }

    try {
      setProcesandoId(pagoId);
      await validarPago({
        pago_id: pagoId,
        admin_id: user.id,
        nuevo_estado: 'aprobado',
        observaciones: 'Pago aprobado por administrador'
      });
      
      alert('✅ Pago aprobado exitosamente');
      cargarPagosPendientes();
    } catch (err: any) {
      console.error('Error aprobando pago:', err);
      alert('Error al aprobar el pago: ' + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = (pagoId: number) => {
    setPagoRechazoId(pagoId);
    setMotivoRechazo('');
    setMostrarModalRechazo(true);
  };

  const confirmarRechazo = async () => {
    if (!user || !pagoRechazoId) {
      return;
    }

    try {
      setProcesandoId(pagoRechazoId);
      await validarPago({
        pago_id: pagoRechazoId,
        admin_id: user.id,
        nuevo_estado: 'rechazado',
        motivo_rechazo: motivoRechazo.trim() || undefined,
        observaciones: motivoRechazo.trim() || 'Pago rechazado por administrador'
      });
      
      alert('✅ Pago rechazado. El usuario recibirá una notificación.');
      setMostrarModalRechazo(false);
      setPagoRechazoId(null);
      setMotivoRechazo('');
      cargarPagosPendientes();
    } catch (err: any) {
      console.error('Error rechazando pago:', err);
      alert('Error al rechazar el pago: ' + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD'
    }).format(monto);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pagos pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3 break-words">
            <FaCheckCircle className="text-blue-600 flex-shrink-0" />
            <span className="break-words">Validar Pagos de Usuarios</span>
          </h1>
          <p className="text-gray-600 break-words">
            Revisa y valida los pagos enviados por los usuarios. Cada pago incluye un comprobante que debes verificar.
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Lista de pagos */}
        {pagos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaCheckCircle className="text-gray-400 text-6xl mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay pagos pendientes de validación</p>
            <p className="text-gray-500 text-sm mt-2">Todos los pagos han sido procesados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {pagos.map((pago) => (
                <motion.div
                  key={pago.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow min-w-0"
                >
                  {/* Header del pago */}
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1 break-words">{pago.concepto}</h3>
                      <p className="text-2xl font-bold text-blue-600 break-words">{formatearMonto(pago.monto)}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0">
                      Pendiente
                    </span>
                  </div>

                  {/* Información del usuario */}
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-gray-700 min-w-0">
                      <FaUser className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium break-words min-w-0">{pago.usuarios?.nombre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm min-w-0">
                      <FaHome className="text-gray-400 flex-shrink-0" />
                      <span className="break-words min-w-0">Casa: {pago.viviendas?.numero_apartamento || 'N/A'}</span>
                    </div>
                    {pago.fecha_vencimiento && (
                      <div className="flex items-center gap-2 text-gray-600 text-sm min-w-0">
                        <FaCalendar className="text-gray-400 flex-shrink-0" />
                        <span className="break-words min-w-0">Vencimiento: {formatearFecha(pago.fecha_vencimiento)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 text-sm min-w-0">
                      <FaDollarSign className="text-gray-400 flex-shrink-0" />
                      <span className="break-words min-w-0">Tipo: {pago.tipo || 'N/A'}</span>
                    </div>
                    {pago.observaciones && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 break-words">
                        <strong>Observaciones:</strong> <span className="break-words">{pago.observaciones}</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleVerComprobante(pago)}
                      disabled={procesandoId === pago.id || cargandoComprobante}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <FaEye className="flex-shrink-0" />
                      <span className="whitespace-nowrap">Ver Comprobante</span>
                    </button>
                    <button
                      onClick={() => handleAprobar(pago.id)}
                      disabled={procesandoId === pago.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <FaCheckCircle className="flex-shrink-0" />
                      <span className="whitespace-nowrap">Aprobar</span>
                    </button>
                    <button
                      onClick={() => handleRechazar(pago.id)}
                      disabled={procesandoId === pago.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <FaTimesCircle className="flex-shrink-0" />
                      <span className="whitespace-nowrap">Rechazar</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal de comprobante */}
        {mostrarComprobante && comprobanteUrl && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMostrarComprobante(false);
                setComprobanteUrl(null);
                setPagoSeleccionado(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center gap-3 z-10">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 break-words min-w-0 flex-1">
                  Comprobante de Pago - <span className="break-words">{pagoSeleccionado?.concepto || 'N/A'}</span>
                </h2>
                <button
                  onClick={() => {
                    setMostrarComprobante(false);
                    setComprobanteUrl(null);
                    setPagoSeleccionado(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl font-bold flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {cargandoComprobante ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando comprobante...</p>
                  </div>
                ) : (
                  <div className="flex justify-center items-center">
                    {comprobanteUrl.startsWith('data:') ? (
                      <img
                        src={comprobanteUrl}
                        alt="Comprobante de pago"
                        className="max-w-full h-auto rounded-lg shadow-lg"
                      />
                    ) : (
                      <img
                        src={comprobanteUrl}
                        alt="Comprobante de pago"
                        className="max-w-full h-auto rounded-lg shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.error-message')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error-message text-center py-12 text-gray-600 px-4';
                            errorDiv.textContent = 'No se pudo cargar la imagen del comprobante';
                            parent.appendChild(errorDiv);
                          }
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de rechazo */}
        {mostrarModalRechazo && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMostrarModalRechazo(false);
                setPagoRechazoId(null);
                setMotivoRechazo('');
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 break-words">Rechazar Pago</h2>
              <p className="text-gray-600 mb-4 break-words">
                ¿Estás seguro de que deseas rechazar este pago? El usuario recibirá una notificación con el motivo.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del rechazo (opcional):
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Ej: Comprobante ilegible, monto incorrecto, etc."
                  className="w-full bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[120px] resize-y break-words"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-2">{motivoRechazo.length}/500 caracteres</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setMostrarModalRechazo(false);
                    setPagoRechazoId(null);
                    setMotivoRechazo('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRechazo}
                  disabled={procesandoId !== null}
                  className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {procesandoId ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}


