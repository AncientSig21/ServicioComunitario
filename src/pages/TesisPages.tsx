import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { useAuth } from '../hooks/useAuth';
import { fetchSolicitudesMantenimiento, fetchEspaciosComunes } from '../services/bookService';
import { motion } from 'framer-motion';

interface SolicitudResumen {
  id: number;
  titulo: string;
  estado: string;
  fecha_solicitud: string;
  tipo?: string;
}

interface EspacioResumen {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: string;
  activo: boolean;
}

const estadoSolicitudLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
  todos: 'Todos',
};

const estadoSolicitudColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-blue-100 text-blue-800',
  completado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  rechazado: 'bg-red-100 text-red-800',
};

export const TesisPages = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[]>([]);
  const [espacios, setEspacios] = useState<EspacioResumen[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [loadingEspacios, setLoadingEspacios] = useState(true);

  useEffect(() => {
    const cargarSolicitudes = async () => {
      try {
        setLoadingSolicitudes(true);
        const filters: Record<string, unknown> = {};
        if (user && user.rol !== 'admin') {
          filters.usuario_solicitante_id = user.id;
        }
        const data = await fetchSolicitudesMantenimiento(filters);
        setSolicitudes((data || []).map((s: any) => ({
          id: s.id,
          titulo: s.titulo,
          estado: s.estado || 'pendiente',
          fecha_solicitud: s.fecha_solicitud,
          tipo: s.tipo || 'mantenimiento',
        })));
      } catch {
        setSolicitudes([]);
      } finally {
        setLoadingSolicitudes(false);
      }
    };
    cargarSolicitudes();
  }, [user]);

  useEffect(() => {
    const cargarEspacios = async () => {
      try {
        setLoadingEspacios(true);
        const data = await fetchEspaciosComunes(user?.condominio_id, true);
        setEspacios((data || []).map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          descripcion: e.descripcion,
          estado: e.estado || 'disponible',
          activo: e.activo !== false,
        })));
      } catch {
        setEspacios([]);
      } finally {
        setLoadingEspacios(false);
      }
    };
    cargarEspacios();
  }, [user]);

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackToHome />
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-6 mb-2 text-center">
          Servicios de Ciudad Colonial
        </h2>
        <p className="text-center text-gray-600 text-lg mb-10">
          Solicitudes de mantenimiento y servicios, y espacios comunes.
        </p>

        {/* Sección: Solicitudes de mantenimiento y servicios */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">
                Solicitudes de mantenimiento y servicios
              </h3>
              <Link
                to="/mantenimiento"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {user ? 'Ver todas / Nueva solicitud' : 'Ver solicitudes'}
              </Link>
            </div>
            <div className="p-6">
              {loadingSolicitudes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : solicitudes.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  No hay solicitudes. Puedes crear una en Mantenimiento y Servicios.
                </p>
              ) : (
                <ul className="space-y-3">
                  {solicitudes.slice(0, 10).map((sol) => (
                    <li
                      key={sol.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900">{sol.titulo}</span>
                        {sol.tipo && sol.tipo !== 'mantenimiento' && (
                          <span className="ml-2 text-xs text-gray-500">(Servicio)</span>
                        )}
                        <span className="block text-sm text-gray-500">
                          {formatFecha(sol.fecha_solicitud)}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          estadoSolicitudColors[sol.estado] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {estadoSolicitudLabels[sol.estado] || sol.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {solicitudes.length > 10 && (
                <div className="mt-4 text-center">
                  <Link to="/mantenimiento" className="text-blue-600 hover:underline font-medium">
                    Ver todas las solicitudes ({solicitudes.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Sección: Espacios comunes */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">
                Espacios comunes
              </h3>
              <Link
                to="/reservas"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Ver espacios
              </Link>
            </div>
            <div className="p-6">
              {loadingEspacios ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : espacios.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  No hay espacios comunes disponibles en este momento.
                </p>
              ) : (
                <ul className="space-y-3">
                  {espacios.slice(0, 10).map((esp) => (
                    <li
                      key={esp.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900">{esp.nombre}</span>
                        {esp.descripcion && (
                          <span className="block text-sm text-gray-500 line-clamp-1">
                            {esp.descripcion}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          esp.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {esp.activo ? 'Disponible' : 'No disponible'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {espacios.length > 10 && (
                <div className="mt-4 text-center">
                  <Link to="/reservas" className="text-indigo-600 hover:underline font-medium">
                    Ver todos los espacios ({espacios.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <div className="mt-10 text-center text-gray-500 text-sm">
          <Link to="/mantenimiento" className="text-blue-600 hover:underline mr-4">
            Mantenimiento y servicios
          </Link>
          <Link to="/reservas" className="text-indigo-600 hover:underline">
            Espacios comunes
          </Link>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
};
