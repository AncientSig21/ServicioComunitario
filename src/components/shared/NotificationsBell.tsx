import { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { fetchNotificacionesUsuario, marcarNotificacionLeida, eliminarNotificacion, eliminarNotificacionesLeidas } from '../../services/bookService';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationsPanel } from './NotificationsPanel';

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

export const NotificationsBell = () => {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState<Notificacion[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones
  const cargarNotificaciones = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const todas = await fetchNotificacionesUsuario(user.id);
      setNotificaciones(todas || []);
      setNotificacionesNoLeidas((todas || []).filter(n => !n.leida));
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      cargarNotificaciones();
      // Recargar notificaciones cada 30 segundos
      const interval = setInterval(cargarNotificaciones, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    if (!showPanel) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  // Marcar notificación como leída
  const handleMarcarLeida = async (notificacionId: number) => {
    try {
      await marcarNotificacionLeida(notificacionId);
      await cargarNotificaciones();
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  // Marcar todas como leídas
  const handleMarcarTodasLeidas = async () => {
    if (!user?.id) return;

    try {
      const promesas = notificacionesNoLeidas.map(n => marcarNotificacionLeida(n.id));
      await Promise.all(promesas);
      await cargarNotificaciones();
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  // Eliminar notificación
  const handleEliminarNotificacion = async (notificacionId: number) => {
    try {
      await eliminarNotificacion(notificacionId);
      await cargarNotificaciones();
    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  };

  // Eliminar todas las notificaciones leídas
  const handleEliminarTodasLeidas = async () => {
    if (!user?.id) return;

    if (!confirm('¿Estás seguro de que deseas eliminar todas las notificaciones leídas?')) {
      return;
    }

    try {
      await eliminarNotificacionesLeidas(user.id);
      await cargarNotificaciones();
    } catch (error) {
      console.error('Error eliminando notificaciones leídas:', error);
      alert('Error al eliminar las notificaciones');
    }
  };

  if (!user) return null;

  const countNoLeidas = notificacionesNoLeidas.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-full hover:bg-secondary hover:bg-opacity-20 transition-colors text-white"
        title="Notificaciones"
      >
        <FaBell size={22} className="text-secondary" />
        {countNoLeidas > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {countNoLeidas > 9 ? '9+' : countNoLeidas}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <NotificationsPanel
            notificaciones={notificaciones}
            notificacionesNoLeidas={notificacionesNoLeidas}
            onMarcarLeida={handleMarcarLeida}
            onMarcarTodasLeidas={handleMarcarTodasLeidas}
            onEliminarNotificacion={handleEliminarNotificacion}
            onEliminarTodasLeidas={handleEliminarTodasLeidas}
            onClose={() => setShowPanel(false)}
            loading={loading}
            onRefresh={cargarNotificaciones}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

