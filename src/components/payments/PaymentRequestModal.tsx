import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { solicitarPago, subirArchivoComprobante, verificarNumeroCasaUsuario } from '../../services/bookService';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    referencia: '',
    descripcion: '',
    nombre: '',
    numeroCasa: '',
    monto: '',
    comprobante: null as File | null,
  });
  const [viviendaInfo, setViviendaInfo] = useState<{id: number, numero: string} | null>(null);

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        referencia: '',
        descripcion: '',
        nombre: '',
        numeroCasa: '',
        monto: '',
        comprobante: null,
      });
      setViviendaInfo(null);
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
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!formData.numeroCasa.trim()) {
      setError('El número de casa es requerido para realizar el pago');
      return;
    }

    if (!formData.comprobante) {
      setError('El comprobante de pago es obligatorio');
      return;
    }

    if (!formData.descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    try {
      setLoading(true);

      // 1. Verificar que el número de casa proporcionado pertenece al usuario
      const vivienda_id = await verificarNumeroCasaUsuario(user.id, formData.numeroCasa.trim());
      
      if (!vivienda_id) {
        throw new Error('El número de casa proporcionado no está asociado a tu cuenta. Verifica el número e intenta nuevamente.');
      }

      // 2. Subir comprobante (obligatorio)
      let archivo_comprobante_id: number | null = null;
      if (formData.comprobante) {
        try {
          archivo_comprobante_id = await subirArchivoComprobante(formData.comprobante, user.id);
          if (!archivo_comprobante_id) {
            throw new Error('No se pudo subir el comprobante. Por favor, verifica el archivo e intenta nuevamente.');
          }
        } catch (uploadError: any) {
          // Proporcionar mensaje de error más específico
          const errorMessage = uploadError.message || 'Error desconocido al subir el archivo';
          throw new Error(`Error al subir el comprobante: ${errorMessage}. Por favor, verifica que el archivo sea válido (JPG, PNG o PDF, máximo 10MB) e intenta nuevamente.`);
        }
      } else {
        throw new Error('El comprobante de pago es obligatorio');
      }

      // 3. Crear la solicitud de pago
      // Parsear el monto si se proporcionó, de lo contrario usar 0
      const montoPago = formData.monto.trim() ? parseFloat(formData.monto.trim()) : 0;
      
      // Validar que el monto sea un número válido y positivo si se proporcionó
      if (formData.monto.trim() && (isNaN(montoPago) || montoPago < 0)) {
        setError('El monto debe ser un número válido y mayor o igual a 0');
        setLoading(false);
        return;
      }

      await solicitarPago({
        usuario_id: user.id,
        vivienda_id: vivienda_id,
        concepto: `Pago - ${formData.nombre} - ${new Date().toLocaleDateString()}`,
        monto: montoPago,
        tipo: 'mantenimiento',
        archivo_comprobante_id: archivo_comprobante_id || undefined,
        observaciones: formData.descripcion,
        referencia: formData.referencia || undefined,
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
            {/* Nombre y Número de Casa - Juntos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tu nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Casa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.numeroCasa}
                  onChange={async (e) => {
                    const numero = e.target.value;
                    setFormData({ ...formData, numeroCasa: numero });
                    
                    // Verificar en tiempo real si el número de casa es válido
                    if (numero.trim() && user) {
                      try {
                        const vivienda_id = await verificarNumeroCasaUsuario(user.id, numero.trim());
                        if (vivienda_id) {
                          // Obtener información de la vivienda
                          const { data: vivienda } = await supabase
                            .from('viviendas')
                            .select('id, numero_apartamento')
                            .eq('id', vivienda_id)
                            .single();
                          
                          if (vivienda) {
                            setViviendaInfo({ id: vivienda.id, numero: vivienda.numero_apartamento });
                            setError(null);
                          }
                        } else {
                          setViviendaInfo(null);
                        }
                      } catch (err) {
                        setViviendaInfo(null);
                      }
                    } else {
                      setViviendaInfo(null);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: A-101, Casa 5, etc."
                  required
                />
                {viviendaInfo && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Casa verificada: {viviendaInfo.numero}
                  </p>
                )}
              </div>
            </div>
            {!viviendaInfo && formData.numeroCasa.trim() && (
              <p className="text-xs text-gray-500 -mt-3">
                Ingresa el número de casa que registraste. Se verificará que pertenece a tu cuenta.
              </p>
            )}

            {/* Comprobante - Obligatorio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprobante de Pago <span className="text-red-500">*</span>
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
                    setError(null);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {formData.comprobante && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Archivo seleccionado: {formData.comprobante.name} ({(formData.comprobante.size / 1024).toFixed(2)} KB)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Sube el comprobante de pago (PDF, JPG, PNG). Máximo 10MB.
              </p>
            </div>

            {/* Descripción - Obligatoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Describe los detalles del pago realizado..."
                required
              />
            </div>

            {/* Monto - Opcional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto del Pago (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monto}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permitir solo números y punto decimal
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setFormData({ ...formData, monto: value });
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 100.00 (dejar vacío si no conoces el monto)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si conoces el monto del pago, ingrésalo aquí. Si no, déjalo vacío y el administrador lo ajustará.
              </p>
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: REF-2025-001234"
              />
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



