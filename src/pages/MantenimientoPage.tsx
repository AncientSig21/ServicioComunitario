import { useState } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion } from 'framer-motion';

interface SolicitudMantenimiento {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: 'pendiente' | 'en-proceso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  ubicacion?: string;
  responsable?: string;
}

// Datos de ejemplo - en producción vendrían de Supabase
const solicitudesEjemplo: SolicitudMantenimiento[] = [
  {
    id: 1,
    titulo: 'Reparación de Fuga en Tubería del Piso 3',
    descripcion: 'Se ha detectado una fuga de agua en la tubería principal del piso 3. Se requiere atención inmediata para evitar daños mayores.',
    fecha: '2025-01-15',
    estado: 'en-proceso',
    prioridad: 'urgente',
    ubicacion: 'Piso 3 - Área común',
    responsable: 'Equipo de Mantenimiento',
  },
  {
    id: 2,
    titulo: 'Mantenimiento Preventivo de Ascensores',
    descripcion: 'Mantenimiento programado de los ascensores del edificio. Se realizará revisión completa de sistemas eléctricos y mecánicos.',
    fecha: '2025-01-20',
    estado: 'pendiente',
    prioridad: 'alta',
    ubicacion: 'Todos los ascensores',
    responsable: 'Empresa de Mantenimiento Externa',
  },
  {
    id: 3,
    titulo: 'Pintura de Áreas Comunes',
    descripcion: 'Se realizará pintura de las áreas comunes del edificio. Se trabajará por sectores para minimizar molestias a los residentes.',
    fecha: '2025-01-18',
    estado: 'pendiente',
    prioridad: 'media',
    ubicacion: 'Pasillos y áreas comunes',
    responsable: 'Equipo de Mantenimiento',
  },
  {
    id: 4,
    titulo: 'Reparación de Iluminación en Estacionamiento',
    descripcion: 'Se han reportado varias lámparas fundidas en el estacionamiento. Se procederá a reemplazar todas las lámparas defectuosas.',
    fecha: '2025-01-12',
    estado: 'completado',
    prioridad: 'media',
    ubicacion: 'Estacionamiento - Nivel 1 y 2',
    responsable: 'Equipo de Mantenimiento',
  },
  {
    id: 5,
    titulo: 'Limpieza de Canaletas y Desagües',
    descripcion: 'Limpieza general de canaletas y desagües del edificio para prevenir obstrucciones durante la temporada de lluvias.',
    fecha: '2025-01-10',
    estado: 'completado',
    prioridad: 'alta',
    ubicacion: 'Techo y áreas exteriores',
    responsable: 'Equipo de Mantenimiento',
  },
];

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'en-proceso': 'bg-blue-100 text-blue-800 border-blue-300',
  completado: 'bg-green-100 text-green-800 border-green-300',
  cancelado: 'bg-red-100 text-red-800 border-red-300',
};

const estadoLabels = {
  pendiente: 'Pendiente',
  'en-proceso': 'En Proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
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
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [solicitudes] = useState<SolicitudMantenimiento[]>(solicitudesEjemplo);

  const estados = ['todos', 'pendiente', 'en-proceso', 'completado', 'cancelado'];

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
              {estado === 'todos' ? 'Todos' : estadoLabels[estado as keyof typeof estadoLabels]}
            </button>
          ))}
        </div>

        {/* Lista de solicitudes */}
        {filteredSolicitudes.length === 0 ? (
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
                      : solicitud.estado === 'en-proceso'
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

                <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-line">
                  {solicitud.descripcion}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-2 sm:mb-0">
                    <span className="flex items-center gap-1">
                      📅 {formatFecha(solicitud.fecha)}
                    </span>
                    {solicitud.ubicacion && (
                      <span className="flex items-center gap-1">
                        📍 {solicitud.ubicacion}
                      </span>
                    )}
                    {solicitud.responsable && (
                      <span className="flex items-center gap-1">
                        👤 {solicitud.responsable}
                      </span>
                    )}
                  </div>
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
    </div>
  );
};

