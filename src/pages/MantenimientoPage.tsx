import { useState, useEffect } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion } from 'framer-motion';
import { fetchSolicitudesMantenimiento } from '../services/bookService';
import { ProgressModal } from '../components/maintenance/ProgressModal';
import { useAuth } from '../hooks/useAuth';

interface SolicitudMantenimiento {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_solicitud: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'completado' | 'cancelado' | 'activo' | 'inactivo';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  ubicacion?: string | null;
  responsable?: {
    nombre: string;
  } | null;
  usuarios?: {
    nombre: string;
  } | null;
}

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  aprobado: 'bg-blue-100 text-blue-800 border-blue-300',
  completado: 'bg-green-100 text-green-800 border-green-300',
  cancelado: 'bg-red-100 text-red-800 border-red-300',
  rechazado: 'bg-red-100 text-red-800 border-red-300',
  activo: 'bg-blue-100 text-blue-800 border-blue-300',
  inactivo: 'bg-gray-100 text-gray-800 border-gray-300',
};

const estadoLabels = {
  pendiente: 'Pendiente',
  aprobado: 'En Proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
  activo: 'Activo',
  inactivo: 'Inactivo',
};

const prioridadColors = {
  baja: 'bg-gray-100 text-gray-800',
  media: 'bg-blue-100 text-blue-800',
  alta: 'bg-orange-100 text-orange-800',
  urgente: 'bg-red-100 text-red-800',
};

const prioridadLabels = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const MantenimientoPage = () => {
  const { user } = useAuth();
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [solicitudes, setSolicitudes] = useState<SolicitudMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(null);
  const [selectedSolicitudTitulo, setSelectedSolicitudTitulo] = useState<string>('');
  const [showProgressModal, setShowProgressModal] = useState(false);

  const estados = ['todos', 'pendiente', 'aprobado', 'completado', 'cancelado', 'rechazado'];

  // Cargar solicitudes desde la base de datos
  useEffect(() => {
    const cargarSolicitudes = async () => {
      try {
        setLoading(true);
        setError(null);
        const filters: any = {};
        
        // Si el usuario no es admin, solo mostrar sus solicitudes
        if (user && user.rol !== 'admin') {
          filters.usuario_solicitante_id = user.id;
        }

        const data = await fetchSolicitudesMantenimiento(filters);
        setSolicitudes(data || []);
      } catch (err: any) {
        console.error('Error cargando solicitudes:', err);
        setError(err.message || 'Error al cargar las solicitudes de mantenimiento');
      } finally {
        setLoading(false);
      }
    };

    cargarSolicitudes();
  }, [user]);

  const filteredSolicitudes = selectedEstado === 'todos'
    ? solicitudes
    : solicitudes.filter(solicitud => solicitud.estado === selectedEstado);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleVerAvances = (solicitud: SolicitudMantenimiento) => {
    setSelectedSolicitudId(solicitud.id);
    setSelectedSolicitudTitulo(solicitud.titulo);
    setShowProgressModal(true);
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
              🔧 Mantenimiento y Reparaciones
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Consulta el estado de las solicitudes de mantenimiento y reparaciones del condominio
            </p>
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
              {estado === 'todos' 
                ? 'Todos' 
                : estadoLabels[estado as keyof typeof estadoLabels] || estado}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Lista de solicitudes */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 text-lg mt-4">Cargando solicitudes...</p>
          </div>
        ) : filteredSolicitudes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">No hay solicitudes en este estado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSolicitudes.map((solicitud, index) => (
              <motion.div
                key={solicitud.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
                style={{
                  borderLeftColor:
                    solicitud.estado === 'pendiente'
                      ? '#eab308'
                      : solicitud.estado === 'aprobado'
                      ? '#3b82f6'
                      : solicitud.estado === 'completado'
                      ? '#22c55e'
                      : '#ef4444',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          estadoColors[solicitud.estado]
                        }`}
                      >
                        {estadoLabels[solicitud.estado]}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          prioridadColors[solicitud.prioridad]
                        }`}
                      >
                        {prioridadLabels[solicitud.prioridad]} Prioridad
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {solicitud.titulo}
                    </h2>
                  </div>
                </div>

                {solicitud.descripcion && (
                  <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-line">
                    {solicitud.descripcion}
                  </p>
                )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-2 sm:mb-0">
                    <span className="flex items-center gap-1">
                      📅 {formatFecha(solicitud.fecha_solicitud)}
                    </span>
                    {solicitud.ubicacion && (
                      <span className="flex items-center gap-1">
                        📍 {solicitud.ubicacion}
                      </span>
                    )}
                    {solicitud.responsable && (
                      <span className="flex items-center gap-1">
                        👤 {solicitud.responsable.nombre}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleVerAvances(solicitud)}
                    className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Ver Avances
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 ¿Necesitas reportar un problema?
          </h3>
          <p className="text-blue-800 text-sm">
            Si encuentras algún problema que requiera mantenimiento o reparación, puedes contactar a la administración
            a través del portal o llamando directamente a las oficinas administrativas.
          </p>
        </div>
      </div>

      {/* Modal de avances */}
      {selectedSolicitudId && (
        <ProgressModal
          isOpen={showProgressModal}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedSolicitudId(null);
            setSelectedSolicitudTitulo('');
          }}
          solicitudId={selectedSolicitudId}
          solicitudTitulo={selectedSolicitudTitulo}
        />
      )}
    </div>
  );
};

