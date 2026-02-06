import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/supabase";

export interface LoginData {
  correo: string;
  contraseña: string;
}

export interface RegisterData {
  nombre: string;
  correo: string;
  contraseña: string;
  escuela: string | null;
  telefono?: string;
  cedula?: string;
  numeroApartamento?: string;
  tipoResidencia?: string;
  // Campos para Propietario
  fechaAdquisicion?: string;
  numeroEscritura?: string;
  // Campos para Inquilino/Arrendatario
  nombrePropietario?: string;
  cedulaPropietario?: string;
  telefonoPropietario?: string;
  fechaInicioContrato?: string;
  fechaFinContrato?: string;
  // Campos para Familiar del Propietario
  nombrePropietarioRelacionado?: string;
  cedulaPropietarioRelacionado?: string;
  parentesco?: string;
}

export interface User {
  id: number;
  nombre: string;
  correo: string;
  escuela: string | null;
  numeroApartamento?: string;
  rol?: string;
  estado?: string | null;
  codigo_recuperacion?: string | null;
}

const createSupabaseClient = () => {
  const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
  const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;

  if (!supabaseKey || !supabaseUrl || 
      supabaseKey === 'undefined' || supabaseUrl === 'undefined' ||
      supabaseKey.trim() === '' || supabaseUrl.trim() === '') {
    console.error('Variables de entorno de Supabase no configuradas.');
    return null;
  }

  try {
    const client = createClient<Database>(supabaseUrl, supabaseKey);
    if (!client) {
      return null;
    }
    return client;
  } catch (error) {
    console.error('Error al crear cliente de Supabase:', error);
    return null;
  }
};

const supabase = createSupabaseClient();

export const isSupabaseConfigured = () => {
  const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
  const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
  
  if (!supabaseKey || !supabaseUrl || 
      supabaseKey === 'undefined' || supabaseUrl === 'undefined' ||
      supabaseKey.trim() === '' || supabaseUrl.trim() === '') {
    return false;
  }
  
  if (!supabase) {
    return false;
  }
  
  return true;
};

export const authService = {
  // Verificar si un email ya existe
  async checkEmailExists(email: string): Promise<{ exists: boolean; error: any }> {
    if (!supabase) {
      return { exists: false, error: { message: 'Supabase no configurado' } };
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('correo')
        .eq('correo', email)
        .maybeSingle();

      if (error) {
        console.warn('Error al verificar email:', error);
        return { exists: false, error };
      }

      return { exists: !!data, error: null };
    } catch (error: any) {
      console.error('Error al verificar email:', error);
      return { exists: false, error };
    }
  },

  // Registrar un nuevo usuario
  async registerUser(userData: RegisterData): Promise<{ data: User | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase no configurado' } };
    }

    try {
      const userDataForSupabase = {
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña
      };

      const { data, error } = await supabase
        .from('usuarios')
        .insert([userDataForSupabase])
        .select('id, nombre, correo, rol')
        .maybeSingle();

      if (error) {
        console.error('Error al registrar usuario:', error);
        return { data: null, error };
      }

      const userResponse: User = {
        id: data.id,
        nombre: data.nombre,
        correo: data.correo,
        escuela: null,
        rol: data.rol || 'Usuario',
        estado: 'Activo'
      };
      
      return { data: userResponse, error: null };
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      return { data: null, error: { message: error.message || 'Error al registrar usuario' } };
    }
  },

  // Autenticar usuario
  async loginUser(loginData: LoginData): Promise<{ data: User | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase no configurado' } };
    }

    try {
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, Estado, codigo_recuperacion')
        .eq('correo', loginData.correo.trim())
        .eq('contraseña', loginData.contraseña)
        .maybeSingle();

      if (errorUsuario) {
        console.warn('Error en Supabase buscando usuario:', errorUsuario);
        return { data: null, error: { message: 'Error de autenticación. Verifica tus credenciales.' } };
      }

      if (!usuario) {
        return { data: null, error: { message: 'Credenciales incorrectas' } };
      }

      // Verificar si el usuario está pendiente de aprobación (rol null)
      if (!usuario.rol || usuario.rol === null) {
        return { data: null, error: { message: 'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando sea aprobada.' } };
      }

      const userResponse: User = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        escuela: null,
        rol: usuario.rol || 'Usuario',
        estado: usuario.Estado ?? 'Activo',
        codigo_recuperacion: usuario.codigo_recuperacion ?? null
      };

      return { data: userResponse, error: null };
    } catch (error: any) {
      console.error('Error al autenticar usuario:', error);
      return { data: null, error: { message: error.message || 'Error al iniciar sesión. Intenta nuevamente.' } };
    }
  },

  // Cerrar sesión
  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  },

  // Obtener usuario actual desde localStorage
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Guardar usuario en localStorage
  setCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Verificar si Supabase está configurado
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  /** Obsoleto: recuperación por preguntas deshabilitada. Usar código de recuperación. */
  async getSecurityQuestions(_email: string): Promise<{ data: any[] | null; error: any }> {
    return {
      data: null,
      error: { message: 'La recuperación por preguntas de seguridad ya no está disponible. Usa tu código de recuperación en "¿Olvidaste tu contraseña?". Si no lo tienes, el administrador puede verlo en la sección Residentes.' }
    };
  },

  /** Obsoleto: recuperación por preguntas deshabilitada. Usar resetPasswordWithCode. */
  async resetPasswordWithSecurityQuestions(_args: {
    email: string;
    respuestas: { pregunta: string; respuesta: string }[];
    nuevaContraseña: string;
  }): Promise<{ success: boolean; error: any }> {
    return {
      success: false,
      error: { message: 'La recuperación por preguntas ya no está disponible. Usa tu código de recuperación en "¿Olvidaste tu contraseña?".' }
    };
  },

  /** Recuperar contraseña con código de recuperación (correo + código). */
  async resetPasswordWithCode({
    email,
    codigo,
    nuevaContraseña
  }: {
    email: string;
    codigo: string;
    nuevaContraseña: string;
  }): Promise<{ success: boolean; error: any }> {
    if (!supabase) {
      return { success: false, error: { message: 'Supabase no configurado' } };
    }

    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('reset_password_con_codigo', {
        p_correo: email,
        p_codigo: codigo,
        p_nueva_contraseña: nuevaContraseña
      });

      if (rpcError) {
        return { success: false, error: { message: rpcError.message || 'Error al restablecer la contraseña' } };
      }

      const success = rpcResult?.success === true;
      if (!success) {
        return { success: false, error: { message: rpcResult?.error || 'Error al restablecer la contraseña' } };
      }

      // Notificar a los administradores
      try {
        const { data: admins } = await supabase.from('usuarios').select('id').eq('rol', 'admin');
        if (admins?.length) {
          await supabase.from('notificaciones').insert(admins.map((admin: { id: number }) => ({
            tipo: 'recuperacion_contraseña',
            mensaje: `El usuario ${rpcResult?.nombre ?? ''} (${email}) ha recuperado su contraseña con el código de recuperación.`,
            usuario_id: admin.id,
            relacion_id: null,
            relacion_tipo: 'recuperacion_contraseña',
            estado: 'pendiente',
            leida: false,
            accion_requerida: false,
            fecha_creacion: new Date().toISOString()
          })));
        }
      } catch (_) {
        // Ignorar errores de notificación
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en resetPasswordWithCode:', error);
      return { success: false, error: { message: error.message || 'Error al recuperar contraseña' } };
    }
  }
};
