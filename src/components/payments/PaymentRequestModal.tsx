import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { solicitarPago, obtenerViviendaUsuario, subirArchivoComprobante } from '../../services/bookService';
import { useAuth } from '../../hooks/useAuth';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const tiposPago = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'multa', label: 'Multa' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'otros', label: 'Otros' },
];

export const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    tipo: 'mantenimiento' as string,
    fecha_vencimiento: '',
    referencia: '',
    descripcion: '',
    comprobante: null as File | null,
  });

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        concepto: '',
        monto: '',
        tipo: 'mantenimiento',
        fecha_vencimiento: '',
        referencia: '',
        descripcion: '',
        comprobante: null,
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Debes iniciar sesión para solicitar un pago');
      return;
    }

    // Validaciones
    if (!formData.concepto.trim()) {
      setError('El concepto es requerido');
      return;
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);

      // 1. Obtener vivienda_id del usuario
      const vivienda_id = await obtenerViviendaUsuario(user.id);
      
      if (!vivienda_id) {
        throw new Error('No se encontró una vivienda asociada a tu cuenta. Por favor, contacta a la administración.');
      }

      // 2. Subir comprobante si existe
      let archivo_comprobante_id: number | null = null;
      if (formData.comprobante) {
        archivo_comprobante_id = await subirArchivoComprobante(formData.comprobante, user.id);
        if (!archivo_comprobante_id) {
          console.warn('No se pudo subir el comprobante, continuando sin él');
        }
      }

      // 3. Crear la solicitud de pago
      await solicitarPago({
        usuario_id: user.id,
        vivienda_id: vivienda_id,
        concepto: formData.concepto,
        monto: parseFloat(formData.monto),
        tipo: formData.tipo,
        fecha_vencimiento: formData.fecha_vencimiento || undefined,
        archivo_comprobante_id: archivo_comprobante_id || undefined,
      });

      // 4. Éxito - cerrar modal y notificar
      alert('✅ Solicitud de pago enviada exitosamente. El administrador la revisará.');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err: any) {
      console.error('Error al solicitar pago:', err);
      setError(err.message || 'Error al enviar la solicitud de pago. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Solicitar Nuevo Pago
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Concepto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Cuota de Mantenimiento - Enero 2025"
                required
              />
            </div>

            {/* Monto y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {tiposPago.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia (Opcional)
              </label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: REF-2025-001234"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción / Observaciones (Opcional)
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Agrega cualquier información adicional sobre este pago..."
              />
            </div>

            {/* Comprobante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprobante (Opcional)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validar tamaño (max 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                      setError('El archivo es demasiado grande. Máximo 10MB');
                      return;
                    }
                    setFormData({ ...formData, comprobante: file });
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.comprobante && (
                <p className="text-sm text-gray-600 mt-1">
                  Archivo seleccionado: {formData.comprobante.name} ({(formData.comprobante.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};



