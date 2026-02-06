import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimesCircle, FaTrash, FaHistory, FaBell } from 'react-icons/fa';

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  usuario_id: number | null;
  relacion_id: number | null;
  relacion_tipo: string | null;
  relacion_entidad?: string | null;
  estado: string;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  accion_requerida: boolean | null;
  created_at: string;
  updated_at: string;
}

interface NotificationsPanelProps {
  notificaciones: Notificacion[];
  notificacionesNoLeidas: Notificacion[];
  onMarcarLeida: (id: number) => void;
  onMarcarTodasLeidas: () => void;
  onEliminarNotificacion: (id: number) => void;
  onEliminarTodasLeidas: () => void;
  onClose: () => void;
  loading: boolean;
  onRefresh: () => void;
  userId?: number | null;
  onBorrarHistorial?: () => void;
}

export const NotificationsPanel = ({
  notificaciones,
  notificacionesNoLeidas,
  onMarcarLeida,
  onMarcarTodasLeidas,
  onEliminarNotificacion,
  onEliminarTodasLeidas,
  onClose,
  loading,
  onRefresh,
  userId,
  onBorrarHistorial
}: NotificationsPanelProps) => {
  const [activeTab, setActiveTab] = useState<'nuevas' | 'historial'>('nuevas');
  const [showBorrarHistorialModal, setShowBorrarHistorialModal] = useState(false);

  // Separar notificaciones leídas y no leídas
  const notificacionesLeidas = notificaciones.filter(n => n.leida);
  const notificacionesAMostrar = activeTab === 'nuevas' ? notificacionesNoLeidas : notificacionesLeidas;
  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIconoPorTipo = (tipo: string) => {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('rechazado') || tipoLower.includes('rechazo')) {
      return <FaTimesCircle className="text-red-500" />;
    }
    if (tipoLower.includes('aprobado') || tipoLower.includes('aprobacion')) {
      return <FaCheckCircle className="text-green-500" />;
    }
    if (tipoLower.includes('pendiente')) {
      return <FaExclamationTriangle className="text-yellow-500" />;
    }
    return <FaInfoCircle className="text-blue-500" />;
  };

  const getColorPorTipo = (tipo: string, leida: boolean) => {
    const tipoLower = tipo.toLowerCase();
    if (leida) {
      return 'bg-gray-50 border-gray-200';
    }
    if (tipoLower.includes('rechazado') || tipoLower.includes('rechazo')) {
      return 'bg-red-50 border-red-200';
    }
    if (tipoLower.includes('aprobado') || tipoLower.includes('aprobacion')) {
      return 'bg-green-50 border-green-200';
    }
    if (tipoLower.includes('pendiente')) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 mt-2 w-96 bg-white border-2 border-secondary rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-primary text-white rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">Notificaciones</h3>
            {notificacionesNoLeidas.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {notificacionesNoLeidas.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white border-opacity-20">
          <button
            onClick={() => setActiveTab('nuevas')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-t transition-colors ${
              activeTab === 'nuevas'
                ? 'bg-white bg-opacity-20 text-white'
                : 'text-white text-opacity-70 hover:text-opacity-100'
            }`}
          >
            Nuevas
            {notificacionesNoLeidas.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {notificacionesNoLeidas.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-t transition-colors ${
              activeTab === 'historial'
                ? 'bg-white bg-opacity-20 text-white'
                : 'text-white text-opacity-70 hover:text-opacity-100'
            }`}
          >
            <FaHistory className="inline mr-1" />
            Historial
            {notificacionesLeidas.length > 0 && (
              <span className="ml-2 bg-gray-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {notificacionesLeidas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">Cargando notificaciones...</p>
          </div>
        ) : notificacionesAMostrar.length === 0 ? (
          <div className="p-8 text-center">
            <FaBell className="text-gray-300 text-4xl mx-auto mb-2" />
            <p className="text-gray-500">
              {activeTab === 'nuevas' 
                ? 'No tienes notificaciones nuevas' 
                : 'No hay notificaciones en el historial'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {notificacionesAMostrar.map((notificacion) => (
                <motion.div
                  key={notificacion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                    getColorPorTipo(notificacion.tipo, notificacion.leida)
                  } ${!notificacion.leida ? 'font-semibold' : ''}`}
                  onClick={() => {
                    if (!notificacion.leida) {
                      onMarcarLeida(notificacion.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {getIconoPorTipo(notificacion.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm ${!notificacion.leida ? 'font-bold' : 'font-medium'} text-gray-900`}>
                          {notificacion.titulo || notificacion.tipo}
                        </h4>
                        {!notificacion.leida && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                        {notificacion.mensaje}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatFecha(notificacion.fecha_creacion || notificacion.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          {!notificacion.leida && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarcarLeida(notificacion.id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              title="Marcar como leída"
                            >
                              <FaCheck className="text-xs" />
                              Leída
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Eliminar esta notificación?')) {
                                onEliminarNotificacion(notificacion.id);
                              }
                            }}
                            className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                            title="Eliminar notificación"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onRefresh}
          className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
        >
          Actualizar
        </button>
        {userId != null && onBorrarHistorial && (
          <button
            type="button"
            onClick={() => setShowBorrarHistorialModal(true)}
            className="text-xs text-gray-600 hover:text-gray-800 transition-colors underline"
          >
            Borrar historial
          </button>
        )}
        {activeTab === 'historial' && notificacionesLeidas.length > 0 && (
          <button
            onClick={() => {
              if (confirm(`¿Eliminar todas las ${notificacionesLeidas.length} notificaciones del historial?`)) {
                onEliminarTodasLeidas();
              }
            }}
            className="text-xs text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
            title="Eliminar todas las notificaciones leídas"
          >
            <FaTrash className="text-xs" />
            Eliminar Historial
          </button>
        )}
        {activeTab === 'nuevas' && notificacionesNoLeidas.length > 0 && (
          <button
            onClick={onMarcarTodasLeidas}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            title="Marcar todas como leídas"
          >
            <FaCheck className="text-xs" />
            Marcar todas
          </button>
        )}
      </div>

      {/* Modal Borrar historial de notificaciones */}
      {showBorrarHistorialModal && userId != null && onBorrarHistorial && (
        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center z-10 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 border border-gray-200"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-2">Borrar historial</h3>
            <p className="text-xs text-gray-600 mb-3">
              Mostrar solo notificaciones desde la fecha elegida. Las anteriores quedarán ocultas (no se eliminan).
            </p>
            <div className="space-y-1">
              {[
                { label: 'Todo (mostrar todo)', days: undefined as number | undefined },
                { label: 'Últimos 7 días', days: 7 },
                { label: 'Últimos 30 días', days: 30 },
                { label: 'Último año', days: 365 },
                { label: 'Reiniciar (solo desde hoy)', days: 0 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    if (typeof window === 'undefined') return;
                    if (opt.days === undefined) {
                      localStorage.removeItem(`notificaciones_cutoff_${userId}`);
                    } else {
                      const d = new Date();
                      if (opt.days === 0) {
                        d.setDate(d.getDate() + 1);
                        d.setHours(0, 0, 0, 0);
                      } else {
                        d.setDate(d.getDate() - opt.days);
                      }
                      localStorage.setItem(`notificaciones_cutoff_${userId}`, d.toISOString());
                    }
                    onBorrarHistorial();
                    setShowBorrarHistorialModal(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-800"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowBorrarHistorialModal(false)}
              className="mt-3 w-full px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

