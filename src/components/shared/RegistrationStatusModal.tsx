import { useState, useEffect } from 'react';
import { marcarNotificacionLeida } from '../../services/bookService';
import { supabase } from '../../supabase/client';
import { FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

interface RegistrationStatusModalProps {
  userId: number;
  onClose: () => void;
}

export const RegistrationStatusModal = ({ userId, onClose }: RegistrationStatusModalProps) => {
  const [notificacion, setNotificacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarNotificaciones = async () => {
      try {
        // Buscar notificaciones de aprobación o rechazo no leídas
        const { data: notificaciones, error } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', userId)
          .in('tipo', ['aprobacion_registro', 'rechazo_registro'])
          .eq('leida', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error obteniendo notificaciones:', error);
          setLoading(false);
          return;
        }

        if (notificaciones && notificaciones.length > 0) {
          setNotificacion(notificaciones[0]);
          // Marcar como leída
          await marcarNotificacionLeida(notificaciones[0].id);
        }
      } catch (err) {
        console.error('Error verificando notificaciones:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      verificarNotificaciones();
    }
  }, [userId]);

  if (loading) {
    return null;
  }

  if (!notificacion) {
    return null;
  }

  const isAprobado = notificacion.tipo === 'aprobacion_registro';
  const isRechazado = notificacion.tipo === 'rechazo_registro';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative ${
        isAprobado ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <FaTimes size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${
            isAprobado ? 'text-green-500' : 'text-red-500'
          }`}>
            {isAprobado ? (
              <FaCheckCircle size={48} />
            ) : (
              <FaTimesCircle size={48} />
            )}
          </div>

          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-2 ${
              isAprobado ? 'text-green-700' : 'text-red-700'
            }`}>
              {isAprobado ? 'Registro Aprobado' : 'Registro Rechazado'}
            </h3>

            <p className="text-gray-700 mb-4">
              {notificacion.mensaje || notificacion.titulo}
            </p>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded font-medium transition ${
                  isAprobado
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

