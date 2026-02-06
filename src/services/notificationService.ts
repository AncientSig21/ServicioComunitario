import { supabase } from '../supabase/client';

export interface Notificacion {
  id: number;
  tipo: 'reserva' | 'pago' | 'mantenimiento' | 'evento';
  titulo: string;
  mensaje: string;
  usuario_id: number | null;
  relacion_id: number;
  relacion_tipo: string;
  estado: 'pendiente' | 'vista' | 'resuelta';
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  accion_requerida: boolean;
  datos_adicionales?: string;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  // Crear una notificación
  async createNotification(notificacion: Omit<Notificacion, 'id' | 'created_at' | 'updated_at' | 'fecha_lectura' | 'fecha_creacion'>): Promise<Notificacion> {
    const { data, error } = await supabase
      .from('notificaciones')
      .insert([{ ...notificacion, fecha_creacion: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Notificacion;
  },

  // Obtener todas las notificaciones pendientes
  async getPendingNotifications(): Promise<Notificacion[]> {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('estado', 'pendiente')
      .eq('accion_requerida', true)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as Notificacion[];
  },

  // Marcar notificación como vista
  async markAsRead(id: number): Promise<void> {
    await supabase
      .from('notificaciones')
      .update({
        leida: true,
        estado: 'vista',
        fecha_lectura: new Date().toISOString(),
      })
      .eq('id', id);
  },

  // Resolver notificación
  async resolveNotification(id: number): Promise<void> {
    await supabase
      .from('notificaciones')
      .update({
        estado: 'resuelta',
        accion_requerida: false,
      })
      .eq('id', id);
  },

  // Contar notificaciones pendientes
  async countPendingNotifications(): Promise<number> {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .eq('accion_requerida', true);

    if (error) {
      throw error;
    }

    return count || 0;
  },
};
