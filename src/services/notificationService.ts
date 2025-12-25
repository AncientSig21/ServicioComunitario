import { supabase } from '../supabase/client';

export interface Notificacion {
  id: number;
  tipo: 'reserva' | 'pago' | 'mantenimiento' | 'evento';
  titulo: string;
  mensaje: string;
  usuario_id: number | null;
  relacion_id: number;
  relacion_tipo: string; // 'reserva_espacio', 'pago', 'evento', etc.
  estado: 'pendiente' | 'vista' | 'resuelta';
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  accion_requerida: boolean;
  datos_adicionales?: string; // JSON string con información adicional (comprobante_url, descripcion, etc.)
  created_at: string;
  updated_at: string;
}

const MOCK_DB_KEY = 'mockDatabase_condominio';

const getMockDatabase = () => {
  try {
    const stored = localStorage.getItem(MOCK_DB_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error al cargar base de datos desde localStorage:', error);
  }
  return { usuarios: [], notificaciones: [] };
};

const saveMockDatabase = (db: any) => {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error al guardar base de datos en localStorage:', error);
  }
};

export const notificationService = {
  // Crear una notificación
  async createNotification(notificacion: Omit<Notificacion, 'id' | 'created_at' | 'updated_at' | 'fecha_lectura' | 'fecha_creacion'>): Promise<Notificacion> {
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      // Modo simulado
      const db = getMockDatabase();
      if (!db.notificaciones) {
        db.notificaciones = [];
      }
      
      const nuevaNotificacion: Notificacion = {
        id: db.notificaciones.length > 0 
          ? Math.max(...db.notificaciones.map((n: any) => n.id)) + 1 
          : 1,
        ...notificacion,
        fecha_creacion: new Date().toISOString(),
        fecha_lectura: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      db.notificaciones.push(nuevaNotificacion);
      saveMockDatabase(db);
      
      return nuevaNotificacion;
    }

    // Supabase
    const { data, error } = await (supabase as any)
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
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      // Modo simulado
      const db = getMockDatabase();
      const notificaciones = (db.notificaciones || []).filter(
        (n: any) => n.estado === 'pendiente' && n.accion_requerida
      );
      return notificaciones.sort((a: any, b: any) => 
        new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
      );
    }

    const { data, error } = await (supabase as any)
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
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      // Modo simulado
      const db = getMockDatabase();
      const notificacion = db.notificaciones.find((n: any) => n.id === id);
      if (notificacion) {
        notificacion.leida = true;
        notificacion.estado = 'vista';
        notificacion.fecha_lectura = new Date().toISOString();
        notificacion.updated_at = new Date().toISOString();
        saveMockDatabase(db);
      }
      return;
    }

    await (supabase as any)
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
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      // Modo simulado
      const db = getMockDatabase();
      const notificacion = db.notificaciones.find((n: any) => n.id === id);
      if (notificacion) {
        notificacion.estado = 'resuelta';
        notificacion.accion_requerida = false;
        notificacion.updated_at = new Date().toISOString();
        saveMockDatabase(db);
      }
      return;
    }

    await (supabase as any)
      .from('notificaciones')
      .update({
        estado: 'resuelta',
        accion_requerida: false,
      })
      .eq('id', id);
  },

  // Contar notificaciones pendientes
  async countPendingNotifications(): Promise<number> {
    const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
    const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
    
    if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
      // Modo simulado
      const db = getMockDatabase();
      return (db.notificaciones || []).filter(
        (n: any) => n.estado === 'pendiente' && n.accion_requerida
      ).length;
    }

    const { count, error } = await (supabase as any)
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

