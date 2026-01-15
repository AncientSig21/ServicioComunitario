import { useState, useEffect } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';

interface Anuncio {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  categoria: 'general' | 'importante' | 'mantenimiento' | 'evento' | 'foro';
  autor?: string;
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
  const location = useLocation();
  const isForoPage = location.pathname === '/foro';
  
  // Si viene desde /foro, establecer categoría 'foro' por defecto
  const [selectedCategoria, setSelectedCategoria] = useState<string>(isForoPage ? 'foro' : 'todas');
  const [anuncios, setAnuncios] = useState<Anuncio[]>(anunciosEjemplo);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    contenido: '',
    categoria: 'evento' as const,
  });
  const [loading, setLoading] = useState(false);

  const categorias = ['todas', 'general', 'importante', 'mantenimiento', 'evento', 'foro'];

  // Actualizar categoría si cambia la URL
  useEffect(() => {
    if (isForoPage) {
      setSelectedCategoria('foro');
    }
  }, [isForoPage]);

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

  const handleCrearEvento = async () => {
    if (!user) {
      alert('Debes iniciar sesión para crear un evento');
      return;
    }

    if (!nuevoEvento.titulo.trim() || !nuevoEvento.contenido.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);

      // Crear el evento (simulado)
      const MOCK_DB_KEY = 'mockDatabase_condominio';
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      if (!db.anuncios) {
        db.anuncios = [];
      }

      const nuevoAnuncio: Anuncio = {
        id: db.anuncios.length > 0 
          ? Math.max(...db.anuncios.map((a: any) => a.id)) + 1 
          : 1,
        titulo: nuevoEvento.titulo,
        contenido: nuevoEvento.contenido,
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'evento',
        autor: user.nombre,
      };

      db.anuncios.push(nuevoAnuncio);
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

      // Agregar a la lista local (pero con estado pendiente)
      setAnuncios([...anuncios, { ...nuevoAnuncio, autor: 'Pendiente de aprobación' }]);
      
      // Limpiar formulario
      setNuevoEvento({ titulo: '', contenido: '', categoria: 'evento' });
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
              {isForoPage ? '💬 Foro de la Comunidad' : '📢 Anuncios y Noticias'}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              {isForoPage 
                ? 'Participa en las discusiones y comparte ideas con la comunidad de Ciudad Colonial'
                : 'Mantente informado sobre las últimas noticias y avisos de Ciudad Colonial'}
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
        {filteredAnuncios.length === 0 ? (
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
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
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
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2 sm:mb-0">
                    <span className="flex items-center gap-1">
                      📅 {formatFecha(anuncio.fecha)}
                    </span>
                    {anuncio.autor && (
                      <span className="flex items-center gap-1">
                        👤 {anuncio.autor}
                      </span>
                    )}
                  </div>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
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
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe el evento, fecha, hora, lugar, etc."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCrearEvento}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Evento'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNuevoEvento({ titulo: '', contenido: '', categoria: 'evento' });
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

