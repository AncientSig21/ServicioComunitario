import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/supabase";
import mockDatabase from "../data/mockDatabase.json";
// Importar función de notificación (si está disponible)
// Si no está exportada, usaremos una función local

// Clave para almacenar la base de datos en localStorage
const MOCK_DB_KEY = 'mockDatabase_condominio';

// Función para obtener la base de datos desde localStorage o usar la inicial
const getMockDatabase = () => {
  try {
    const stored = localStorage.getItem(MOCK_DB_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Asegurarse de que tenga la estructura correcta
      if (parsed && parsed.usuarios && Array.isArray(parsed.usuarios)) {
        console.log('📦 Base de datos cargada desde localStorage con', parsed.usuarios.length, 'usuarios');
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Error al cargar base de datos desde localStorage:', error);
  }
  // Si no hay datos guardados o hay error, usar los datos iniciales y guardarlos
  console.log('🔄 Inicializando base de datos con datos por defecto');
  saveMockDatabase(mockDatabase);
  return mockDatabase;
};

// Función para guardar la base de datos en localStorage
const saveMockDatabase = (db: any) => {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
    console.log('💾 Base de datos guardada en localStorage');
  } catch (error) {
    console.error('Error al guardar base de datos en localStorage:', error);
  }
};

// Inicializar la base de datos al cargar el módulo
// Esto asegura que siempre haya usuarios disponibles
const initializeDatabase = () => {
  const db = getMockDatabase();
  // Si no hay usuarios o hay menos de 2, restaurar los iniciales
  if (!db.usuarios || db.usuarios.length < 2) {
    console.log('🔄 Restaurando usuarios iniciales');
    saveMockDatabase(mockDatabase);
    return mockDatabase;
  }
  
  // Asegurar que el usuario admin tenga el rol correcto
  const adminUser = db.usuarios.find((u: any) => u.correo === 'admin@condominio.com');
  if (adminUser && adminUser.rol !== 'admin' && adminUser.rol !== 'Administrador') {
    console.log('🔧 Corrigiendo rol del usuario admin');
    adminUser.rol = 'admin';
    saveMockDatabase(db);
  } else if (adminUser && adminUser.rol === 'Administrador') {
    // Normalizar a minúsculas
    adminUser.rol = 'admin';
    saveMockDatabase(db);
  }
  
  return db;
};

// Inicializar inmediatamente
initializeDatabase();

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
  estado?: string | null; // Activo, Moroso, etc.
}

const createSupabaseClient = () => {
  const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
  const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;

  // Verificar que las variables estén definidas y no sean 'undefined' (string)
  if (!supabaseKey || !supabaseUrl || 
      supabaseKey === 'undefined' || supabaseUrl === 'undefined' ||
      supabaseKey.trim() === '' || supabaseUrl.trim() === '') {
    console.warn('Variables de entorno de Supabase no configuradas. Usando modo simulado.');
    return null;
  }

  try {
    const client = createClient<Database>(supabaseUrl, supabaseKey);
    // Verificar que el cliente se creó correctamente
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

// Función auxiliar para verificar si Supabase está realmente configurado
// Esta función debe ser muy estricta para evitar intentar usar Supabase cuando no está disponible
export const isSupabaseConfigured = () => {
  const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
  const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
  
  // Verificar que las variables estén definidas correctamente
  if (!supabaseKey || !supabaseUrl || 
      supabaseKey === 'undefined' || supabaseUrl === 'undefined' ||
      supabaseKey.trim() === '' || supabaseUrl.trim() === '') {
    return false;
  }
  
  // Verificar que el cliente de Supabase esté disponible
  if (!supabase) {
    return false;
  }
  
  return true;
};

export const authService = {
  // Verificar si un email ya existe
  async checkEmailExists(email: string): Promise<{ exists: boolean; error: any }> {
    if (!isSupabaseConfigured()) {
      console.log('📚 Usando base de datos temporal para verificar email');
      const db = getMockDatabase();
      const usuario = db.usuarios.find((u: any) => u.correo === email);
      return { exists: !!usuario, error: null };
    }

    try {
      if (!supabase) {
        // Fallback al modo simulado si supabase es null
        const db = getMockDatabase();
        const usuario = db.usuarios.find((u: any) => u.correo === email);
        return { exists: !!usuario, error: null };
      }
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('correo')
        .eq('correo', email)
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores

      if (error) {
        console.warn('Error al verificar email en Supabase, usando modo simulado:', error);
        const db = getMockDatabase();
        const usuario = db.usuarios.find((u: any) => u.correo === email);
        return { exists: !!usuario, error: null };
      }

      return { exists: !!data, error: null };
    } catch (error: any) {
      console.warn('Error al verificar email, usando modo simulado:', error);
      const db = getMockDatabase();
      const usuario = db.usuarios.find((u: any) => u.correo === email);
      return { exists: !!usuario, error: null };
    }
  },

  // Registrar un nuevo usuario
  async registerUser(userData: RegisterData): Promise<{ data: User | null; error: any }> {
    if (!isSupabaseConfigured()) {
      console.log('📚 Usando base de datos temporal para registrar usuario');
      
      const db = getMockDatabase();
      
      // Verificar si el email ya existe
      const emailExists = db.usuarios.some((u: any) => u.correo === userData.correo);
      if (emailExists) {
        return { data: null, error: { message: 'El correo electrónico ya está registrado' } };
      }
      
      // IMPORTANTE: Nuevos usuarios NO deben tener pagos automáticos
      // El estado se establece como 'Activo' y los pagos deben ser creados solo por administradores
      // Crear nuevo usuario con todos los datos
      const nuevoId = db.usuarios.length > 0 
        ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
        : 1;
      
      const nuevoUsuario: any = {
        id: nuevoId,
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña,
        escuela: userData.escuela,
        telefono: userData.telefono || '',
        cedula: userData.cedula || '',
        numeroApartamento: userData.numeroApartamento || '',
        tipoResidencia: userData.tipoResidencia || '',
        rol: 'Usuario',
        estado: 'Activo', // Estado inicial: Activo (sin deudas, sin pagos pendientes)
        // Campos adicionales según tipo de residencia
        ...(userData.tipoResidencia === 'Propietario' && {
          fechaAdquisicion: userData.fechaAdquisicion || '',
          numeroEscritura: userData.numeroEscritura || '',
        }),
        ...((userData.tipoResidencia === 'Inquilino' || userData.tipoResidencia === 'Arrendatario') && {
          nombrePropietario: userData.nombrePropietario || '',
          cedulaPropietario: userData.cedulaPropietario || '',
          telefonoPropietario: userData.telefonoPropietario || '',
          fechaInicioContrato: userData.fechaInicioContrato || '',
          fechaFinContrato: userData.fechaFinContrato || '',
        }),
        ...(userData.tipoResidencia === 'Familiar del Propietario' && {
          nombrePropietarioRelacionado: userData.nombrePropietarioRelacionado || '',
          cedulaPropietarioRelacionado: userData.cedulaPropietarioRelacionado || '',
          parentesco: userData.parentesco || '',
        }),
      };
      
      db.usuarios.push(nuevoUsuario);
      saveMockDatabase(db);
      
      const userResponse: User = {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        escuela: nuevoUsuario.escuela,
        numeroApartamento: nuevoUsuario.numeroApartamento,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado
      };
      
      console.log('✅ Usuario registrado y guardado en localStorage:', userResponse);
      return { data: userResponse, error: null };
    }

    try {
      // Si Supabase no está disponible o hay un error, usar modo simulado
      if (!supabase) {
        console.warn('Supabase no disponible, usando modo simulado para registro');
        // Llamar recursivamente pero esto no debería pasar ya que isSupabaseConfigured debería detectarlo
        // Mejor hacer fallback directo
        const db = getMockDatabase();
        
        const emailExists = db.usuarios.some((u: any) => u.correo === userData.correo);
        if (emailExists) {
          return { data: null, error: { message: 'El correo electrónico ya está registrado' } };
        }
        
        const nuevoId = db.usuarios.length > 0 
          ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
          : 1;
        
        const nuevoUsuario: any = {
          id: nuevoId,
          nombre: userData.nombre,
          correo: userData.correo,
          contraseña: userData.contraseña,
          escuela: userData.escuela,
          telefono: userData.telefono || '',
          cedula: userData.cedula || '',
          numeroApartamento: userData.numeroApartamento || '',
          tipoResidencia: userData.tipoResidencia || '',
          rol: 'Usuario',
          estado: 'Activo',
          ...(userData.tipoResidencia === 'Propietario' && {
            fechaAdquisicion: userData.fechaAdquisicion || '',
            numeroEscritura: userData.numeroEscritura || '',
          }),
          ...((userData.tipoResidencia === 'Inquilino' || userData.tipoResidencia === 'Arrendatario') && {
            nombrePropietario: userData.nombrePropietario || '',
            cedulaPropietario: userData.cedulaPropietario || '',
            telefonoPropietario: userData.telefonoPropietario || '',
            fechaInicioContrato: userData.fechaInicioContrato || '',
            fechaFinContrato: userData.fechaFinContrato || '',
          }),
          ...(userData.tipoResidencia === 'Familiar del Propietario' && {
            nombrePropietarioRelacionado: userData.nombrePropietarioRelacionado || '',
            cedulaPropietarioRelacionado: userData.cedulaPropietarioRelacionado || '',
            parentesco: userData.parentesco || '',
          }),
        };
        
        db.usuarios.push(nuevoUsuario);
        saveMockDatabase(db);
        
        const userResponse: User = {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          escuela: nuevoUsuario.escuela,
          rol: nuevoUsuario.rol,
          estado: nuevoUsuario.estado
        };
        
        return { data: userResponse, error: null };
      }

      // Solo incluir campos que existen realmente en Supabase según los tipos
      // Columnas disponibles: id, nombre, correo, rol, contraseña, cedula, telefono, condominio_id, auth_uid, created_at, updated_at
      // NOTA: La columna 'estado' NO existe en la BD real
      // IMPORTANTE: Nuevos usuarios NO deben tener pagos automáticos
      // Los pagos deben ser creados solo por administradores
      const userDataForSupabase = {
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña
        // No incluir 'estado' porque no existe en la BD real
      };

      const { data, error } = await supabase
        .from('usuarios')
        .insert([userDataForSupabase])
        .select('id, nombre, correo, rol')
        .maybeSingle();

      if (error) {
        console.warn('Error al registrar en Supabase, usando modo simulado:', error);
        // Fallback al modo simulado
        const db = getMockDatabase();
        
        const emailExists = db.usuarios.some((u: any) => u.correo === userData.correo);
        if (emailExists) {
          return { data: null, error: { message: 'El correo electrónico ya está registrado' } };
        }
        
        const nuevoId = db.usuarios.length > 0 
          ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
          : 1;
        
        // IMPORTANTE: Nuevos usuarios NO deben tener pagos automáticos
        // El estado se establece como 'Activo' y los pagos deben ser creados solo por administradores
        const nuevoUsuario: any = {
          id: nuevoId,
          nombre: userData.nombre,
          correo: userData.correo,
          contraseña: userData.contraseña,
          escuela: userData.escuela,
          telefono: userData.telefono || '',
          cedula: userData.cedula || '',
          numeroApartamento: userData.numeroApartamento || '',
          tipoResidencia: userData.tipoResidencia || '',
          rol: 'Usuario',
          estado: 'Activo', // Estado inicial: Activo (sin deudas, sin pagos pendientes)
          ...(userData.tipoResidencia === 'Propietario' && {
            fechaAdquisicion: userData.fechaAdquisicion || '',
            numeroEscritura: userData.numeroEscritura || '',
          }),
          ...((userData.tipoResidencia === 'Inquilino' || userData.tipoResidencia === 'Arrendatario') && {
            nombrePropietario: userData.nombrePropietario || '',
            cedulaPropietario: userData.cedulaPropietario || '',
            telefonoPropietario: userData.telefonoPropietario || '',
            fechaInicioContrato: userData.fechaInicioContrato || '',
            fechaFinContrato: userData.fechaFinContrato || '',
          }),
          ...(userData.tipoResidencia === 'Familiar del Propietario' && {
            nombrePropietarioRelacionado: userData.nombrePropietarioRelacionado || '',
            cedulaPropietarioRelacionado: userData.cedulaPropietarioRelacionado || '',
            parentesco: userData.parentesco || '',
          }),
        };
        
        db.usuarios.push(nuevoUsuario);
        saveMockDatabase(db);
        
        const userResponse: User = {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          escuela: nuevoUsuario.escuela,
          rol: nuevoUsuario.rol,
          estado: nuevoUsuario.estado
        };
        
        return { data: userResponse, error: null };
      }

      // Construir objeto User correctamente (la columna estado no existe en la BD)
      const userResponse: User = {
        id: data.id,
        nombre: data.nombre,
        correo: data.correo,
        escuela: null,
        rol: data.rol || 'Usuario',
        estado: 'Activo' // Valor por defecto ya que la columna estado no existe en la BD
      };
      
      return { data: userResponse, error: null };
    } catch (error: any) {
      console.warn('Error al registrar, usando modo simulado:', error);
      // Fallback al modo simulado
      const db = getMockDatabase();
      
      const emailExists = db.usuarios.some((u: any) => u.correo === userData.correo);
      if (emailExists) {
        return { data: null, error: { message: 'El correo electrónico ya está registrado' } };
      }
      
      const nuevoId = db.usuarios.length > 0 
        ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
        : 1;
      
      // IMPORTANTE: Nuevos usuarios NO deben tener pagos automáticos
      // El estado se establece como 'Activo' y los pagos deben ser creados solo por administradores
      const nuevoUsuario: any = {
        id: nuevoId,
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña,
        escuela: userData.escuela,
        telefono: userData.telefono || '',
        cedula: userData.cedula || '',
        numeroApartamento: userData.numeroApartamento || '',
        tipoResidencia: userData.tipoResidencia || '',
        rol: 'Usuario',
        estado: 'Activo', // Estado inicial: Activo (sin deudas, sin pagos pendientes)
        ...(userData.tipoResidencia === 'Propietario' && {
          fechaAdquisicion: userData.fechaAdquisicion || '',
          numeroEscritura: userData.numeroEscritura || '',
        }),
        ...((userData.tipoResidencia === 'Inquilino' || userData.tipoResidencia === 'Arrendatario') && {
          nombrePropietario: userData.nombrePropietario || '',
          cedulaPropietario: userData.cedulaPropietario || '',
          telefonoPropietario: userData.telefonoPropietario || '',
          fechaInicioContrato: userData.fechaInicioContrato || '',
          fechaFinContrato: userData.fechaFinContrato || '',
        }),
        ...(userData.tipoResidencia === 'Familiar del Propietario' && {
          nombrePropietarioRelacionado: userData.nombrePropietarioRelacionado || '',
          cedulaPropietarioRelacionado: userData.cedulaPropietarioRelacionado || '',
          parentesco: userData.parentesco || '',
        }),
      };
      
      db.usuarios.push(nuevoUsuario);
      saveMockDatabase(db);
      
      const userResponse: User = {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        escuela: nuevoUsuario.escuela,
        numeroApartamento: nuevoUsuario.numeroApartamento,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado
      };
      
      return { data: userResponse, error: null };
    }
  },

  // Autenticar usuario
  async loginUser(loginData: LoginData): Promise<{ data: User | null; error: any }> {
    if (!isSupabaseConfigured()) {
      console.log('📚 Usando base de datos temporal para autenticar usuario');
      console.log('🔍 Buscando usuario con correo:', loginData.correo);
      
      const db = getMockDatabase();
      console.log('📊 Total de usuarios en BD:', db.usuarios?.length || 0);
      console.log('👥 Usuarios disponibles:', db.usuarios?.map((u: any) => u.correo) || []);
      
      // Buscar usuario por correo primero
      const usuario = db.usuarios?.find(
        (u: any) => u.correo && u.correo.toLowerCase().trim() === loginData.correo.toLowerCase().trim()
      );
      
      console.log('🔎 Usuario encontrado por correo:', usuario ? usuario.correo : 'No encontrado');
      
      if (!usuario) {
        console.warn('❌ Usuario no encontrado con correo:', loginData.correo);
        return { data: null, error: { message: 'Usuario no encontrado' } };
      }
      
      // Verificar contraseña
      if (usuario.contraseña !== loginData.contraseña) {
        console.warn('❌ Contraseña incorrecta para usuario:', loginData.correo);
        return { data: null, error: { message: 'Contraseña incorrecta' } };
      }
      
      // Verificar si el usuario está pendiente de aprobación (rol null)
      if (!usuario.rol || usuario.rol === null) {
        console.warn('⏳ Usuario pendiente de aprobación:', loginData.correo);
        return { data: null, error: { message: 'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando sea aprobada.' } };
      }
      
      const userData: User = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        escuela: usuario.escuela || null,
        numeroApartamento: usuario.numeroApartamento || undefined,
        rol: usuario.rol || 'Usuario',
        estado: usuario.Estado ?? usuario.estado ?? 'Activo',
        codigo_recuperacion: usuario.codigo_recuperacion ?? null
      };
      
      console.log('✅ Usuario autenticado desde localStorage:', userData);
      return { data: userData, error: null };
    }

    try {
      // Si llegamos aquí, Supabase está configurado, intentar usarlo
      if (!supabase) {
        // Si supabase es null, usar modo simulado
        return await this.loginUser(loginData); // Recursión controlada - esto no debería pasar
      }
      
      // Buscar usuario por correo Y contraseña en una sola consulta
      // Incluir estado (Activo/Moroso) para bloquear morosos hasta que envíen comprobante
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, Estado')
        .eq('correo', loginData.correo.trim())
        .eq('contraseña', loginData.contraseña)
        .maybeSingle();

      if (errorUsuario) {
        console.warn('Error en Supabase buscando usuario:', errorUsuario);
        return { data: null, error: { message: 'Error de autenticación. Verifica tus credenciales.' } };
      }

      // Si no se encontró el usuario, las credenciales son incorrectas
      if (!usuario) {
        return { data: null, error: { message: 'Credenciales incorrectas' } };
      }

      // Verificar si el usuario está pendiente de aprobación (rol null)
      if (!usuario.rol || usuario.rol === null) {
        return { data: null, error: { message: 'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando sea aprobada.' } };
      }

      // Construir objeto User correctamente; estado (Activo/Moroso) viene de la BD
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
    try {
      if (!isSupabaseConfigured() || !supabase) {
        const db = getMockDatabase();
        const usuario = db.usuarios.find((u: any) => u.correo && u.correo.toLowerCase().trim() === email.toLowerCase().trim());
        if (!usuario) return { success: false, error: { message: 'Usuario no encontrado' } };
        if (!usuario.codigo_recuperacion || String(usuario.codigo_recuperacion).trim() !== String(codigo).trim()) {
          return { success: false, error: { message: 'Código de recuperación incorrecto.' } };
        }
        usuario.contraseña = nuevaContraseña;
        saveMockDatabase(db);
        return { success: true, error: null };
      }

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

      try {
        if (supabase) {
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
        }
      } catch (_) {}

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en resetPasswordWithCode:', error);
      return { success: false, error: { message: error.message || 'Error al recuperar contraseña' } };
    }
  }
}; 