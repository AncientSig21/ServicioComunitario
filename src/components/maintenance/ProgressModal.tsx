import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAvancesMantenimiento, agregarAvanceMantenimiento, eliminarFotoAvance, eliminarAvance } from '../../services/bookService';
import { useAuth } from '../../hooks/useAuth';

interface AvanceMantenimiento {
  id: number;
  solicitud_id: number;
  descripcion: string;
  foto_url: string | null;
  hasPhotoInDb?: boolean;
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
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);
  const [imagenesFallidas, setImagenesFallidas] = useState<Set<number>>(new Set());
  const [eliminandoFotoId, setEliminandoFotoId] = useState<number | null>(null);
  const [eliminandoAvanceId, setEliminandoAvanceId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    descripcion: '',
    foto: null as File | null,
  });

  const isAdmin = user?.rol === 'admin';

  // Cargar avances al abrir el modal y limpiar estado de imágenes fallidas
  useEffect(() => {
    if (isOpen && solicitudId) {
      setImagenesFallidas(new Set());
      cargarAvances();
    }
  }, [isOpen, solicitudId]);

  const cargarAvances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvancesMantenimiento(solicitudId);
      // Filtrar y mapear avances; preservar foto_url (puede venir como foto_url o en anidado)
      const avancesFiltrados: AvanceMantenimiento[] = (data || [])
        .filter((avance: any) => 
          avance && 
          avance.id && 
          typeof avance.solicitud_id === 'number' && 
          typeof avance.fecha === 'string' && 
          avance.fecha.length > 0
        )
        .map((avance: any): AvanceMantenimiento => {
          const url = avance.foto_url ?? (avance as any).foto_url;
          const fotoUrl = (url && typeof url === 'string' && url.trim()) ? url.trim() : null;
          return {
            id: avance.id,
            solicitud_id: avance.solicitud_id as number,
            descripcion: avance.descripcion || '',
            foto_url: fotoUrl,
            hasPhotoInDb: !!avance.hasPhotoInDb,
            fecha: avance.fecha as string,
            creado_por: avance.creado_por ? {
              nombre: avance.creado_por.nombre || '',
              correo: avance.creado_por.correo || '',
            } : null,
          };
        });
      // Ordenar avances por fecha (más recientes primero)
      const avancesOrdenados = [...avancesFiltrados].sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();
        const fechaB = new Date(b.fecha).getTime();
        return fechaB - fechaA; // Orden descendente (más reciente primero)
      });
      setAvances(avancesOrdenados);
    } catch (err: any) {
      console.error('Error cargando avances:', err);
      setError(err.message || 'Error al cargar los avances');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB');
        return;
      }
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona solo archivos de imagen');
        return;
      }

      setFormData({ ...formData, foto: file });
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
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
      setFotoPreview(null);
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

  const handleEliminarFoto = async (avanceId: number) => {
    if (!isAdmin) return;
    if (!window.confirm('¿Quieres quitar la foto de este avance? El avance seguirá visible, solo se eliminará la imagen.')) return;
    try {
      setEliminandoFotoId(avanceId);
      setError(null);
      await eliminarFotoAvance(avanceId);
      await cargarAvances();
      setImagenesFallidas((prev) => {
        const next = new Set(prev);
        next.delete(avanceId);
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la foto');
    } finally {
      setEliminandoFotoId(null);
    }
  };

  const handleEliminarAvance = async (avanceId: number) => {
    if (!isAdmin) return;
    if (!window.confirm('¿Eliminar este avance por completo? Se borrará la descripción y la foto. Esta acción no se puede deshacer.')) return;
    try {
      setEliminandoAvanceId(avanceId);
      setError(null);
      await eliminarAvance(avanceId);
      await cargarAvances();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el avance');
    } finally {
      setEliminandoAvanceId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div key="progress-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              <div className="mb-6">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Avance con Fotos
                  </button>
                ) : (
                  <form onSubmit={handleSubmitAvance} className="bg-gradient-to-br from-blue-50 to-gray-50 p-6 rounded-lg border-2 border-blue-200 shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-xl font-semibold text-gray-900">Nuevo Avance de Mantenimiento</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción del Avance <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="Describe el avance del trabajo de mantenimiento realizado..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📸 Fotos del Avance <span className="text-gray-500 text-xs">(Opcional - Máx. 10MB)</span>
                        </label>
                        <div className="space-y-3">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-center">
                                <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs text-gray-500">Haz clic para seleccionar una foto</p>
                              </div>
                            </div>
                          </div>
                          {fotoPreview && (
                            <div className="relative bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Vista Previa:
                              </p>
                              <div className="relative inline-block">
                                <img
                                  src={fotoPreview}
                                  alt="Preview"
                                  className="max-w-full max-h-64 rounded-lg border border-gray-300 shadow-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, foto: null });
                                    setFotoPreview(null);
                                  }}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                  title="Eliminar foto"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              {formData.foto && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Archivo: {formData.foto.name} ({(formData.foto.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Guardar Avance</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setFormData({ descripcion: '', foto: null });
                            setFotoPreview(null);
                            setError(null);
                          }}
                          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
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
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium">{avance.descripcion}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatFecha(avance.fecha)}
                          {avance.creado_por && ` • Por: ${avance.creado_por.nombre}`}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleEliminarAvance(avance.id)}
                          disabled={eliminandoAvanceId === avance.id}
                          className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar este avance por completo"
                        >
                          {eliminandoAvanceId === avance.id ? (
                            <span className="animate-spin inline-block w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full" />
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          <span className="sr-only">Eliminar avance</span>
                        </button>
                      )}
                    </div>
                    {/* Sección de foto: siempre visible para que el usuario pueda ver o abrir la imagen */}
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Foto del avance
                      </p>
                      {avance.foto_url ? (
                        <>
                          {imagenesFallidas.has(avance.id) ? (
                            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-center">
                              <p className="text-amber-800 font-medium mb-2">No se pudo cargar la imagen en la página</p>
                              <p className="text-sm text-amber-700 mb-3">Usa el botón para abrir la imagen en otra pestaña.</p>
                              <div className="flex flex-wrap justify-center gap-2">
                                <a
                                  href={avance.foto_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Abrir imagen en nueva pestaña
                                </a>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarFoto(avance.id)}
                                    disabled={eliminandoFotoId === avance.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                                    title="Quitar la foto de este avance"
                                  >
                                    {eliminandoFotoId === avance.id ? 'Eliminando...' : 'Eliminar foto'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="relative group">
                                <img
                                  src={avance.foto_url}
                                  alt="Avance de mantenimiento"
                                  className="w-full h-auto rounded-lg border-2 border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow max-h-96 object-contain bg-white"
                                  onClick={() => setImagenAmpliada(avance.foto_url || null)}
                                  onError={() => {
                                    setImagenesFallidas((prev) => new Set(prev).add(avance.id));
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white bg-opacity-90 rounded-full p-2">
                                      <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <p className="text-xs text-gray-500">Haz clic en la imagen para ampliarla</p>
                                <a
                                  href={avance.foto_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Abrir imagen en nueva pestaña
                                </a>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarFoto(avance.id)}
                                    disabled={eliminandoFotoId === avance.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Quitar la foto de este avance"
                                  >
                                    {eliminandoFotoId === avance.id ? (
                                      <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                                        Eliminando...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Eliminar foto
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : avance.hasPhotoInDb ? (
                        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-center">
                          <p className="text-amber-800 font-medium mb-2">Imagen no disponible (guardada pero no se puede mostrar)</p>
                          <p className="text-sm text-amber-700 mb-3">Puedes quitar la foto de este avance o eliminar el avance completo.</p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleEliminarFoto(avance.id)}
                              disabled={eliminandoFotoId === avance.id}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                              title="Quitar la foto de este avance"
                            >
                              {eliminandoFotoId === avance.id ? 'Eliminando...' : 'Eliminar foto'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Este avance no incluye imagen.</p>
                      )}
                    </div>
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

      {/* Modal para imagen ampliada */}
      <React.Fragment key="imagen-ampliada-container">
        <AnimatePresence>
          {imagenAmpliada && (
          <motion.div
            key={imagenAmpliada}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
            onClick={() => setImagenAmpliada(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imagenAmpliada}
                alt="Avance ampliado"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setImagenAmpliada(null)}
                className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-colors"
                title="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </React.Fragment>
    </AnimatePresence>
  );
};



