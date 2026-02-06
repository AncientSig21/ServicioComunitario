import { useState, useEffect, useCallback } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { fetchAnuncios, crearAnuncio, subirImagenAnuncio } from '../services/bookService';
import type { User } from '@supabase/supabase-js';
import { FaImage, FaTimes, FaCalendarAlt, FaMapMarkerAlt, FaUser } from 'react-icons/fa';

interface Anuncio {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  categoria: 'general' | 'importante' | 'mantenimiento' | 'evento' | 'foro';
  autor?: string;
  imagen_url?: string | null;
  fecha_evento?: string | null;
  lugar?: string | null;
}

// Datos de ejemplo - en producción vendrían de Supabase
const anunciosEjemplo: Anuncio[] = [
  {
    id: 1,
    titulo: 'Bienvenida a los Nuevos Residentes',
    contenido: 'Damos la bienvenida a todos los nuevos residentes de Ciudad Colonial. Les recordamos que pueden acceder a todos los servicios a través de este portal.',
    fecha: '2025-01-15',
    categoria: 'general',
    autor: 'Administración',
  },
  {
    id: 2,
    titulo: 'Mantenimiento Programado del Ascensor',
    contenido: 'Se informa que el próximo viernes 20 de enero se realizará mantenimiento preventivo del ascensor principal. El servicio estará suspendido de 8:00 AM a 12:00 PM. Agradecemos su comprensión.',
    fecha: '2025-01-14',
    categoria: 'mantenimiento',
    autor: 'Administración',
  },
  {
    id: 3,
    titulo: 'Asamblea General de Residentes',
    contenido: 'Se convoca a todos los residentes a la Asamblea General que se realizará el próximo mes. Se tratarán temas importantes sobre el funcionamiento del condominio. Fecha y hora por confirmar.',
    fecha: '2025-01-12',
    categoria: 'evento',
    autor: 'Junta Directiva',
  },
  {
    id: 4,
    titulo: 'Recordatorio: Pago de Cuotas de Mantenimiento',
    contenido: 'Recordamos a todos los residentes que el pago de las cuotas de mantenimiento del mes de enero vence el día 10. Pueden realizar el pago a través del portal o en la administración.',
    fecha: '2025-01-10',
    categoria: 'importante',
    autor: 'Administración',
  },
  {
    id: 5,
    titulo: 'Nuevas Áreas Comunes Disponibles',
    contenido: 'Les informamos que las nuevas áreas comunes ya están disponibles para reserva. Incluyen sala de eventos, gimnasio y área de juegos infantiles. Pueden hacer sus reservas a través del portal.',
    fecha: '2025-01-08',
    categoria: 'general',
    autor: 'Administración',
  },
  {
    id: 6,
    titulo: 'Foro de Discusión - Mejoras del Condominio',
    contenido: 'Invitamos a todos los residentes a participar en nuestro foro de discusión donde pueden compartir ideas, sugerencias y opiniones sobre mejoras para el condominio. Tu voz es importante para construir una mejor comunidad.',
    fecha: '2025-01-13',
    categoria: 'foro',
    autor: 'Comunidad',
  },
];

const categoriaColors = {
  general: 'bg-blue-100 text-blue-800 border-blue-300',
  importante: 'bg-red-100 text-red-800 border-red-300',
  mantenimiento: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  evento: 'bg-green-100 text-green-800 border-green-300',
  foro: 'bg-purple-100 text-purple-800 border-purple-300',
};

const categoriaLabels = {
  general: 'General',
  importante: 'Importante',
  mantenimiento: 'Mantenimiento',
  evento: 'Evento',
  foro: 'Foro',
};

export const AnunciosPage = () => {
  const { user } = useAuth();
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [anuncios, setAnuncios] = useState<Anuncio[]>(anunciosEjemplo);
  const [anunciosLoading, setAnunciosLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    contenido: '',
    categoria: 'evento' as const,
    fecha_evento: '',
    lugar: '',
  });
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [modalAnuncio, setModalAnuncio] = useState<Anuncio | null>(null);

  const condominioId = user && 'condominio_id' in user ? (user as { condominio_id?: number }).condominio_id : undefined;

  const loadAnuncios = useCallback(async () => {
    setAnunciosLoading(true);
    try {
      const rows = await fetchAnuncios(condominioId ?? undefined, undefined, false);
      setAnuncios(rows.map((r: any) => ({
        id: r.id,
        titulo: r.titulo || '',
        contenido: r.contenido || '',
        fecha: r.fecha_publicacion ? new Date(r.fecha_publicacion).toISOString().split('T')[0] : '',
        categoria: (r.categoria || 'general') as Anuncio['categoria'],
        autor: r.autor_usuario?.nombre || 'Administración',
        imagen_url: r.archivo_imagen?.url || r.imagen_url || null,
        fecha_evento: r.fecha_evento || null,
        lugar: r.lugar || null,
      })));
    } catch (e) {
      console.warn('Error cargando anuncios:', e);
      setAnuncios(anunciosEjemplo);
    } finally {
      setAnunciosLoading(false);
    }
  }, [condominioId]);

  const formatFechaCompleta = (fecha: string | null) => {
    if (!fecha) return null;
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    loadAnuncios();
  }, [loadAnuncios]);

  const categorias = ['todas', 'general', 'importante', 'mantenimiento', 'evento', 'foro'];

  const filteredAnuncios = selectedCategoria === 'todas'
    ? anuncios
    : anuncios.filter(anuncio => anuncio.categoria === selectedCategoria);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      setImagenFile(file);
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImagen = () => {
    setImagenFile(null);
    setImagenPreview(null);
  };

  const handleCrearEvento = async () => {
    if (!user) {
      alert('Debes iniciar sesión para crear un evento');
      return;
    }

    if (!nuevoEvento.titulo.trim() || !nuevoEvento.contenido.trim()) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      
      // Subir imagen si existe (usando tabla archivos con base64)
      let archivoImagenId: number | null = null;
      if (imagenFile) {
        setUploadingImage(true);
        try {
          archivoImagenId = await subirImagenAnuncio(imagenFile, user.id);
        } catch (imgError) {
          console.error('Error subiendo imagen:', imgError);
          alert('Error al subir la imagen. El evento se creará sin imagen.');
        } finally {
          setUploadingImage(false);
        }
      }

      await crearAnuncio({
        condominio_id: condominioId ?? undefined,
        autor_usuario_id: user.id,
        titulo: nuevoEvento.titulo.trim(),
        contenido: nuevoEvento.contenido.trim(),
        categoria: 'evento',
        activo: false,
        archivo_imagen_id: archivoImagenId,
        fecha_evento: nuevoEvento.fecha_evento || null,
        lugar: nuevoEvento.lugar.trim() || null,
      });
      
      // Limpiar formulario
      setNuevoEvento({ titulo: '', contenido: '', categoria: 'evento', fecha_evento: '', lugar: '' });
      setImagenFile(null);
      setImagenPreview(null);
      setShowCreateModal(false);
      alert('✅ Evento creado exitosamente. El administrador revisará tu propuesta.');
    } catch (error) {
      console.error('Error al crear evento:', error);
      alert('Error al crear el evento. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToHome />
          <div className="mt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              📢 Anuncios y Noticias
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Mantente informado sobre las últimas noticias y avisos de Ciudad Colonial
            </p>
          </div>
        </div>

        {/* Filtros de categoría */}
        <div className="mb-8 flex flex-wrap gap-3">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setSelectedCategoria(categoria)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategoria === categoria
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {categoria === 'todas' ? 'Todas' : categoriaLabels[categoria as keyof typeof categoriaLabels]}
            </button>
          ))}
        </div>

        {/* Lista de anuncios */}
        {anunciosLoading ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Cargando anuncios...</p>
          </div>
        ) : filteredAnuncios.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">No hay anuncios en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAnuncios.map((anuncio, index) => (
              <motion.div
                key={anuncio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border-l-4"
                style={{
                  borderLeftColor:
                    anuncio.categoria === 'general'
                      ? '#3b82f6'
                      : anuncio.categoria === 'importante'
                      ? '#ef4444'
                      : anuncio.categoria === 'mantenimiento'
                      ? '#eab308'
                      : anuncio.categoria === 'foro'
                      ? '#a855f7'
                      : '#22c55e',
                }}
              >
                <div className={`flex ${anuncio.imagen_url ? 'flex-col sm:flex-row' : ''}`}>
                  {/* Contenido del anuncio */}
                  <div className={`p-6 ${anuncio.imagen_url ? 'sm:flex-1' : 'w-full'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              categoriaColors[anuncio.categoria]
                            }`}
                          >
                            {categoriaLabels[anuncio.categoria]}
                          </span>
                          {anuncio.categoria === 'importante' && (
                            <span className="text-red-500 font-bold text-sm">⚠️ IMPORTANTE</span>
                          )}
                          {anuncio.imagen_url && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                              <FaImage className="w-3 h-3" /> Con imagen
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                          {anuncio.titulo}
                        </h2>
                      </div>
                    </div>

                    <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-line">
                      {anuncio.contenido}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2 sm:mb-0 flex-wrap">
                        <span className="flex items-center gap-1">
                          📅 {formatFecha(anuncio.fecha)}
                        </span>
                        {anuncio.fecha_evento && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            🎉 Evento: {formatFecha(anuncio.fecha_evento)}
                          </span>
                        )}
                        {anuncio.lugar && (
                          <span className="flex items-center gap-1">
                            📍 {anuncio.lugar}
                          </span>
                        )}
                        {anuncio.autor && (
                          <span className="flex items-center gap-1">
                            👤 {anuncio.autor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Imagen del anuncio - Solo si tiene */}
                  {anuncio.imagen_url && (
                    <div 
                      className="sm:w-48 md:w-56 lg:w-64 flex-shrink-0 cursor-pointer group relative"
                      onClick={() => setModalAnuncio(anuncio)}
                    >
                      <div className="h-48 sm:h-full">
                        <img
                          src={anuncio.imagen_url}
                          alt={anuncio.titulo}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <FaImage className="w-4 h-4" />
                            Ver imagen
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Botón para crear evento (solo usuarios autenticados) */}
        {user && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
            >
              ➕ Crear Nuevo Evento
            </button>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 ¿Necesitas más información?
          </h3>
          <p className="text-blue-800 text-sm">
            Si tienes preguntas sobre algún anuncio o necesitas más detalles, puedes contactar a la administración
            a través del portal o visitando las oficinas administrativas.
          </p>
        </div>
      </div>

      {/* Modal para crear evento */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Crear Nuevo Evento
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título del Evento *
                  </label>
                  <input
                    type="text"
                    value={nuevoEvento.titulo}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Fiesta de Fin de Año"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción del Evento *
                  </label>
                  <textarea
                    value={nuevoEvento.contenido}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, contenido: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe el evento, horarios, actividades, etc."
                  />
                </div>

                {/* Campos opcionales en grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha del Evento (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={nuevoEvento.fecha_evento}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha_evento: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lugar (opcional)
                    </label>
                    <input
                      type="text"
                      value={nuevoEvento.lugar}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, lugar: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Salón de eventos"
                    />
                  </div>
                </div>

                {/* Subir imagen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imagen del Evento (opcional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Sube una imagen representativa del evento. Máximo 5MB.
                  </p>
                  
                  {!imagenPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FaImage className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-blue-600">Haz clic para subir</span> o arrastra una imagen
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF hasta 5MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImagenChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagenPreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImagen}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                        title="Eliminar imagen"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCrearEvento}
                  disabled={loading || uploadingImage}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {uploadingImage ? 'Subiendo imagen...' : loading ? 'Creando...' : 'Crear Evento'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNuevoEvento({ titulo: '', contenido: '', categoria: 'evento', fecha_evento: '', lugar: '' });
                    setImagenFile(null);
                    setImagenPreview(null);
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

      {/* Modal para ver imagen y detalles del anuncio */}
      <AnimatePresence>
        {modalAnuncio && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setModalAnuncio(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => setModalAnuncio(null)}
                className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>

              {/* Imagen */}
              {modalAnuncio.imagen_url && (
                <div className="w-full h-44 sm:h-52 bg-gray-200 flex-shrink-0">
                  <img
                    src={modalAnuncio.imagen_url}
                    alt={modalAnuncio.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Contenido con scroll */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* Badge */}
                <div className="flex items-start gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 border ${categoriaColors[modalAnuncio.categoria]}`}>
                    {categoriaLabels[modalAnuncio.categoria]}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {modalAnuncio.titulo}
                </h3>

                {/* Información en formato compacto */}
                <div className="space-y-2 mb-3">
                  {modalAnuncio.fecha && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaCalendarAlt className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        Publicado: {formatFechaCompleta(modalAnuncio.fecha)}
                      </span>
                    </div>
                  )}

                  {modalAnuncio.fecha_evento && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-500 flex-shrink-0">🎉</span>
                      <span className="text-gray-700 font-medium">
                        Evento: {formatFechaCompleta(modalAnuncio.fecha_evento)}
                      </span>
                    </div>
                  )}

                  {modalAnuncio.lugar && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaMapMarkerAlt className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-gray-700">{modalAnuncio.lugar}</span>
                    </div>
                  )}

                  {modalAnuncio.autor && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaUser className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{modalAnuncio.autor}</span>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                {modalAnuncio.contenido && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {modalAnuncio.contenido}
                    </p>
                  </div>
                )}

                {/* Botón cerrar */}
                <button
                  onClick={() => setModalAnuncio(null)}
                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
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

