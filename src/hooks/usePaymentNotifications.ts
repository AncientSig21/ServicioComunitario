/**
 * Hook para escuchar notificaciones de pagos en tiempo real
 * Usa Supabase Realtime para detectar nuevos pagos
 * Incluye fallback con polling si Realtime no está disponible
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

interface NuevoPago {
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

interface UsePaymentNotificationsOptions {
  onNuevoPago?: (pago: NuevoPago) => void;
  enabled?: boolean;
  pollingInterval?: number; // Intervalo de polling en ms (fallback)
}

export const usePaymentNotifications = (options: UsePaymentNotificationsOptions = {}) => {
  const { onNuevoPago, enabled = true, pollingInterval = 15000 } = options;
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const lastPaymentIdRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<string>(new Date().toISOString());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const notifiedIdsRef = useRef<Set<number>>(new Set());

  // Solo activar para administradores
  const isAdmin = user?.rol === 'admin' || user?.rol === 'Administrador';

  // Procesar un nuevo pago
  const procesarNuevoPago = useCallback(async (nuevoPago: NuevoPago) => {
    // Evitar duplicados usando Set
    if (notifiedIdsRef.current.has(nuevoPago.id)) return;
    notifiedIdsRef.current.add(nuevoPago.id);
    
    // Limpiar IDs antiguos (mantener últimos 50)
    if (notifiedIdsRef.current.size > 50) {
      const idsArray = Array.from(notifiedIdsRef.current);
      notifiedIdsRef.current = new Set(idsArray.slice(-50));
    }

    // Solo notificar pagos pendientes (enviados por usuarios)
    if (nuevoPago.estado !== 'pendiente') return;

    // Obtener datos del usuario que envió el pago
    try {
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('nombre, correo')
        .eq('id', nuevoPago.usuario_id)
        .single();

      const pagoConUsuario = {
        ...nuevoPago,
        usuarios: usuarioData || undefined
      };

      if (onNuevoPago) {
        onNuevoPago(pagoConUsuario);
      }
    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      if (onNuevoPago) {
        onNuevoPago(nuevoPago);
      }
    }
  }, [onNuevoPago]);

  // Handler para eventos de Realtime
  const handleRealtimeEvent = useCallback(async (payload: any) => {
    const nuevoPago = payload.new as NuevoPago;
    await procesarNuevoPago(nuevoPago);
  }, [procesarNuevoPago]);

  // Polling fallback - buscar pagos nuevos
  const checkNuevosPagos = useCallback(async () => {
    if (!isAdmin || realtimeConnected) return;

    try {
      const { data: nuevosPagos, error } = await supabase
        .from('pagos')
        .select('id, usuario_id, concepto, monto, estado, created_at')
        .eq('estado', 'pendiente')
        .gt('created_at', lastCheckTimeRef.current)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error en polling de pagos:', error);
        return;
      }

      if (nuevosPagos && nuevosPagos.length > 0) {
        for (const pago of nuevosPagos) {
          await procesarNuevoPago(pago as NuevoPago);
        }
        // Actualizar el timestamp de la última verificación
        lastCheckTimeRef.current = nuevosPagos[nuevosPagos.length - 1].created_at;
      }
    } catch (error) {
      console.error('Error en polling:', error);
    }
  }, [isAdmin, realtimeConnected, procesarNuevoPago]);

  // Configurar Realtime
  useEffect(() => {
    if (!enabled || !isAdmin) return;

    // Inicializar el timestamp de última verificación
    lastCheckTimeRef.current = new Date().toISOString();

    // Crear canal de suscripción a la tabla pagos
    const channel = supabase
      .channel('pagos-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pagos'
        },
        handleRealtimeEvent
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Notificaciones de pagos: Realtime conectado');
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ Notificaciones de pagos: Realtime no disponible, usando polling');
          setRealtimeConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, isAdmin, handleRealtimeEvent]);

  // Polling fallback
  useEffect(() => {
    if (!enabled || !isAdmin) return;
    
    // Siempre hacer polling como respaldo, pero menos frecuente si realtime está conectado
    const interval = realtimeConnected ? pollingInterval * 2 : pollingInterval;
    
    const pollInterval = setInterval(checkNuevosPagos, interval);
    
    // Hacer una verificación inicial
    const initialCheck = setTimeout(checkNuevosPagos, 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialCheck);
    };
  }, [enabled, isAdmin, realtimeConnected, pollingInterval, checkNuevosPagos]);

  return {
    isListening: enabled && isAdmin,
    isAdmin,
    realtimeConnected
  };
};

export default usePaymentNotifications;
