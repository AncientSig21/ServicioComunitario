import { useState } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';

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
}

// Datos de ejemplo - en producción vendrían de Supabase
const pagosEjemplo: Pago[] = [
  {
    id: 1,
    concepto: 'Cuota de Mantenimiento - Enero 2025',
    monto: 150.00,
    fechaVencimiento: '2025-01-10',
    fechaPago: '2025-01-08',
    estado: 'pagado',
    tipo: 'mantenimiento',
    referencia: 'REF-2025-001',
  },
  {
    id: 2,
    concepto: 'Cuota de Mantenimiento - Febrero 2025',
    monto: 150.00,
    fechaVencimiento: '2025-02-10',
    estado: 'pendiente',
    tipo: 'mantenimiento',
    referencia: 'REF-2025-002',
  },
  {
    id: 3,
    concepto: 'Servicios Comunes - Diciembre 2024',
    monto: 45.50,
    fechaVencimiento: '2024-12-15',
    fechaPago: '2024-12-14',
    estado: 'pagado',
    tipo: 'servicios',
    referencia: 'REF-2024-125',
  },
  {
    id: 4,
    concepto: 'Multa por Ruido Excesivo',
    monto: 25.00,
    fechaVencimiento: '2025-01-05',
    estado: 'vencido',
    tipo: 'multa',
    referencia: 'REF-2025-M001',
  },
  {
    id: 5,
    concepto: 'Servicios Comunes - Enero 2025',
    monto: 48.75,
    fechaVencimiento: '2025-01-20',
    estado: 'pendiente',
    tipo: 'servicios',
    referencia: 'REF-2025-003',
  },
  {
    id: 6,
    concepto: 'Cuota de Mantenimiento - Diciembre 2024',
    monto: 150.00,
    fechaVencimiento: '2024-12-10',
    fechaPago: '2024-12-12',
    estado: 'pagado',
    tipo: 'mantenimiento',
    referencia: 'REF-2024-120',
  },
];

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
  const [pagos, setPagos] = useState<Pago[]>(pagosEjemplo);
  const [loadingPago, setLoadingPago] = useState<number | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [formPago, setFormPago] = useState({
    referencia: '',
    descripcion: '',
    comprobante: null as File | null,
  });

  const estados = ['todos', 'pendiente', 'pagado', 'vencido', 'parcial'];

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

  // Función para subir comprobante a Supabase Storage
  const uploadComprobante = async (file: File): Promise<string | null> => {
    try {
      const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
      const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
      
      if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
        // Modo simulado: convertir a base64
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      // Subir a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `comprobantes/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error al subir comprobante:', uploadError);
        // Fallback a base64
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      // Obtener URL pública
      const { data } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error al subir comprobante:', error);
      // Fallback a base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAbrirModalPago = (pago: Pago) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar un pago');
      return;
    }
    setPagoSeleccionado(pago);
    setFormPago({ referencia: '', descripcion: '', comprobante: null });
    setShowPagoModal(true);
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
      
      // Subir comprobante
      const comprobanteUrl = await uploadComprobante(formPago.comprobante);
      if (!comprobanteUrl) {
        throw new Error('Error al subir el comprobante');
      }

      // Crear registro de pago
      const MOCK_DB_KEY = 'mockDatabase_condominio';
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"pagos": [], "historial_pagos": []}');
      if (!db.pagos) {
        db.pagos = [];
      }
      if (!db.historial_pagos) {
        db.historial_pagos = [];
      }

      const nuevoPago = {
        ...pagoSeleccionado,
        id: db.pagos.length > 0 
          ? Math.max(...db.pagos.map((p: any) => p.id)) + 1 
          : pagoSeleccionado.id,
        usuario_id: user.id,
        fecha_pago: new Date().toISOString(),
        estado: 'pendiente' as const,
        metodo_pago: 'transferencia',
        referencia: formPago.referencia,
        comprobante_url: comprobanteUrl,
        descripcion: formPago.descripcion,
      };

      db.pagos.push(nuevoPago);
      
      // Agregar al historial
      const historialEntry = {
        id: db.historial_pagos.length > 0 
          ? Math.max(...db.historial_pagos.map((h: any) => h.id)) + 1 
          : 1,
        pago_id: nuevoPago.id,
        usuario_id: user.id,
        monto: nuevoPago.monto,
        concepto: nuevoPago.concepto,
        referencia: nuevoPago.referencia,
        comprobante_url: comprobanteUrl,
        descripcion: formPago.descripcion,
        estado: 'pendiente',
        fecha_creacion: new Date().toISOString(),
      };
      db.historial_pagos.push(historialEntry);
      
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

      // Actualizar el estado del pago en la lista
      setPagos(pagos.map(p => 
        p.id === pagoSeleccionado.id ? { ...p, estado: 'pendiente', fechaPago: new Date().toISOString() } : p
      ));

      // Cerrar modal y limpiar formulario
      setShowPagoModal(false);
      setPagoSeleccionado(null);
      setFormPago({ referencia: '', descripcion: '', comprobante: null });

      alert('✅ Pago registrado exitosamente. El administrador verificará tu pago.');
    } catch (error) {
      console.error('Error al realizar pago:', error);
      alert('Error al registrar el pago. Por favor, intenta de nuevo.');
    } finally {
      setLoadingPago(null);
    }
  };

  const totalPendiente = pagos
    .filter(p => p.estado === 'pendiente' || p.estado === 'vencido')
    .reduce((sum, p) => sum + p.monto, 0);

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
        {filteredPagos.length === 0 ? (
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

                {pago.estado === 'pendiente' || pago.estado === 'vencido' ? (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => handleAbrirModalPago(pago)}
                      disabled={loadingPago === pago.id}
                      className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingPago === pago.id ? 'Procesando...' : 'Realizar Pago'}
                    </button>
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
    </div>
  );
};

