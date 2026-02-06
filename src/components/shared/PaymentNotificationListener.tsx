/**
 * Componente que escucha pagos en tiempo real y muestra notificaciones
 * Solo se activa para administradores
 */

import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMoneyBillWave, FaTimes, FaEye, FaBell } from 'react-icons/fa';
import { usePaymentNotifications } from '../../hooks/usePaymentNotifications';
import { useNavigate } from 'react-router-dom';

interface PagoNotificacion {
  id: number;
  usuario_id: number;
  concepto: string;
  monto: number;
  estado: string;
  created_at: string;
  usuarios?: {
    nombre: string;
    correo: string;
  };
}

interface NotificacionPago {
  id: string;
  pago: PagoNotificacion;
  timestamp: Date;
}

export const PaymentNotificationListener = () => {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState<NotificacionPago[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Reproducir sonido de notificación
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Crear un sonido simple usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Silenciar errores de audio
    }
  }, [soundEnabled]);

  // Callback cuando llega un nuevo pago
  const handleNuevoPago = useCallback((pago: PagoNotificacion) => {
    const nuevaNotificacion: NotificacionPago = {
      id: `pago-${pago.id}-${Date.now()}`,
      pago,
      timestamp: new Date()
    };

    setNotificaciones(prev => [nuevaNotificacion, ...prev].slice(0, 5)); // Máximo 5 notificaciones
    playNotificationSound();

    // Auto-remover después de 10 segundos
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== nuevaNotificacion.id));
    }, 10000);
  }, [playNotificationSound]);

  // Usar el hook de notificaciones
  const { isListening, isAdmin, realtimeConnected } = usePaymentNotifications({
    onNuevoPago: handleNuevoPago,
    enabled: true,
    pollingInterval: 15000 // 15 segundos
  });

  // Remover una notificación manualmente
  const removeNotificacion = useCallback((id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }, []);

  // Ir a validación de pagos
  const irAValidacion = useCallback(() => {
    navigate('/admin/validacion');
  }, [navigate]);

  // Formatear monto
  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(monto);
  };

  // No renderizar si no es admin
  if (!isAdmin) return null;

  return (
    <>
      {/* Indicador de escucha activa (solo visible para admin) */}
      {isListening && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className={`flex items-center gap-2 ${realtimeConnected ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} px-3 py-1.5 rounded-full text-xs shadow-md`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${realtimeConnected ? 'bg-green-400' : 'bg-blue-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${realtimeConnected ? 'bg-green-500' : 'bg-blue-500'}`}></span>
            </span>
            <span>{realtimeConnected ? 'Escuchando pagos' : 'Verificando pagos'}</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`ml-1 ${realtimeConnected ? 'hover:text-green-900' : 'hover:text-blue-900'}`}
              title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>
          </div>
        </div>
      )}

      {/* Notificaciones flotantes */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notificaciones.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="pointer-events-auto"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-2xl overflow-hidden">
                {/* Header con icono animado */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="relative">
                    <div className="bg-white/20 rounded-full p-2">
                      <FaMoneyBillWave className="text-xl" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: 3, duration: 0.5 }}
                      className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1"
                    >
                      <FaBell className="text-xs text-yellow-800" />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">¡Nuevo Pago Recibido!</h4>
                    <p className="text-xs text-blue-100">Pendiente de validación</p>
                  </div>
                  <button
                    onClick={() => removeNotificacion(notif.id)}
                    className="text-white/70 hover:text-white transition-colors p-1"
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* Contenido */}
                <div className="px-4 pb-3">
                  <div className="bg-white/10 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-100">Residente:</span>
                      <span className="font-semibold text-sm">
                        {notif.pago.usuarios?.nombre || `Usuario #${notif.pago.usuario_id}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-100">Concepto:</span>
                      <span className="text-sm truncate max-w-[150px]" title={notif.pago.concepto}>
                        {notif.pago.concepto.length > 20 
                          ? notif.pago.concepto.substring(0, 20) + '...' 
                          : notif.pago.concepto}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-100">Monto:</span>
                      <span className="font-bold text-lg text-yellow-300">
                        Bs. {formatMonto(notif.pago.monto)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de acción */}
                <button
                  onClick={() => {
                    removeNotificacion(notif.id);
                    irAValidacion();
                  }}
                  className="w-full bg-white/20 hover:bg-white/30 transition-colors py-3 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <FaEye />
                  Ver en Validación de Pagos
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PaymentNotificationListener;
