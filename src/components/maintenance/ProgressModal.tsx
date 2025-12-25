import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAvancesMantenimiento, agregarAvanceMantenimiento } from '../../services/bookService';
import { useAuth } from '../../hooks/useAuth';

interface AvanceMantenimiento {
  id: number;
  solicitud_id: number;
  descripcion: string;
  foto_url: string | null;
  fecha: string;
  creado_por?: {
    nombre: string;
    correo: string;
  } | null;
}

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitudId: number;
  solicitudTitulo: string;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  onClose,
  solicitudId,
  solicitudTitulo,
}) => {
  const { user } = useAuth();
  const [avances, setAvances] = useState<AvanceMantenimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '',
    foto: null as File | null,
  });

  const isAdmin = user?.rol === 'admin';

  // Cargar avances al abrir el modal
  useEffect(() => {
    if (isOpen && solicitudId) {
      cargarAvances();
    }
  }, [isOpen, solicitudId]);

  const cargarAvances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvancesMantenimiento(solicitudId);
      setAvances(data);
    } catch (err: any) {
      console.error('Error cargando avances:', err);
      setError(err.message || 'Error al cargar los avances');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.descripcion.trim()) {
      setError('La descripción es requerida');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await agregarAvanceMantenimiento({
        solicitud_id: solicitudId,
        descripcion: formData.descripcion,
        foto_file: formData.foto || undefined,
        creado_por: user.id,
      });

      // Recargar avances
      await cargarAvances();

      // Limpiar formulario
      setFormData({ descripcion: '', foto: null });
      setShowAddForm(false);

      alert('✅ Avance agregado exitosamente');
    } catch (err: any) {
      console.error('Error agregando avance:', err);
      setError(err.message || 'Error al agregar el avance');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Avances de Mantenimiento
                </h2>
                <p className="text-sm text-gray-600 mt-1">{solicitudTitulo}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Botón para agregar avance (solo admin) */}
            {isAdmin && (
              <div className="mb-4">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    + Agregar Avance
                  </button>
                ) : (
                  <form onSubmit={handleSubmitAvance} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Nuevo Avance</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Describe el avance del trabajo de mantenimiento..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Foto (Opcional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                setError('El archivo es demasiado grande. Máximo 10MB');
                                return;
                              }
                              setFormData({ ...formData, foto: file });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {formData.foto && (
                          <p className="text-sm text-gray-600 mt-1">
                            Archivo seleccionado: {formData.foto.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {submitting ? 'Guardando...' : 'Guardar Avance'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setFormData({ descripcion: '', foto: null });
                            setError(null);
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Lista de avances */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando avances...</p>
              </div>
            ) : avances.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay avances registrados para esta solicitud.</p>
                {!isAdmin && (
                  <p className="text-sm text-gray-400 mt-2">Los avances serán agregados por el administrador.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {avances.map((avance) => (
                  <motion.div
                    key={avance.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{avance.descripcion}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatFecha(avance.fecha)}
                          {avance.creado_por && ` • Por: ${avance.creado_por.nombre}`}
                        </p>
                      </div>
                    </div>
                    {avance.foto_url && (
                      <div className="mt-3">
                        <img
                          src={avance.foto_url}
                          alt="Avance de mantenimiento"
                          className="max-w-full h-auto rounded-lg border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


