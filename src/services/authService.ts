import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/supabase";
import mockDatabase from "../data/mockDatabase.json";

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
  
  // Verificar que todos los usuarios necesarios estén presentes
  const usuariosNecesarios = [
    { correo: 'admin@condominio.com', tipoResidencia: 'Propietario' },
    { correo: 'juan@condominio.com', tipoResidencia: 'Inquilino' },
    { correo: 'maria@condominio.com', tipoResidencia: 'Propietario' }
  ];
  
  let necesitaActualizar = false;
  
  // Si no hay usuarios o hay menos de 3, restaurar los iniciales
  if (!db.usuarios || db.usuarios.length < 3) {
    console.log('🔄 Restaurando usuarios iniciales (menos de 3 usuarios)');
    saveMockDatabase(mockDatabase);
    return mockDatabase;
  }
  
  // Verificar que cada usuario necesario exista con su tipoResidencia correcto
  usuariosNecesarios.forEach((usuarioNecesario) => {
    const usuarioExistente = db.usuarios.find((u: any) => 
      u.correo && u.correo.toLowerCase().trim() === usuarioNecesario.correo.toLowerCase().trim()
    );
    
    if (!usuarioExistente) {
      console.log(`🔄 Usuario ${usuarioNecesario.correo} no encontrado, restaurando base de datos`);
      necesitaActualizar = true;
    } else if (!usuarioExistente.tipoResidencia) {
      console.log(`🔧 Agregando tipoResidencia a usuario ${usuarioNecesario.correo}`);
      usuarioExistente.tipoResidencia = usuarioNecesario.tipoResidencia;
      necesitaActualizar = true;
    }
  });
  
  // Si falta algún usuario, restaurar desde mockDatabase
  if (necesitaActualizar) {
    console.log('🔄 Restaurando base de datos completa');
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
  
  // Asegurar que todos los usuarios tengan tipoResidencia
  db.usuarios.forEach((usuario: any) => {
    if (!usuario.tipoResidencia) {
      // Intentar asignar un tipoResidencia por defecto basado en el usuario
      if (usuario.correo === 'admin@condominio.com') {
        usuario.tipoResidencia = 'Propietario';
      } else if (usuario.correo === 'juan@condominio.com') {
        usuario.tipoResidencia = 'Inquilino';
      } else if (usuario.correo === 'maria@condominio.com') {
        usuario.tipoResidencia = 'Propietario';
      } else {
        usuario.tipoResidencia = 'Propietario'; // Por defecto
      }
      necesitaActualizar = true;
    }
  });
  
  // Asegurar que el usuario moroso (María) tenga el estado correcto
  const usuarioMoroso = db.usuarios.find((u: any) => u.correo === 'maria@condominio.com');
  if (usuarioMoroso) {
    if (usuarioMoroso.estado !== 'Moroso') {
      console.log('🔧 Estableciendo estado Moroso para usuario maria@condominio.com');
      usuarioMoroso.estado = 'Moroso';
      necesitaActualizar = true;
    }
    // Asegurar que tenga todos los campos necesarios
    if (!usuarioMoroso.nombre) {
      usuarioMoroso.nombre = 'María González';
      necesitaActualizar = true;
    }
    if (!usuarioMoroso.telefono) {
      usuarioMoroso.telefono = '+58 424-5551234';
      necesitaActualizar = true;
    }
    if (!usuarioMoroso.cedula) {
      usuarioMoroso.cedula = '11223344';
      necesitaActualizar = true;
    }
    if (!usuarioMoroso.numeroApartamento) {
      usuarioMoroso.numeroApartamento = 'Apto 302';
      necesitaActualizar = true;
    }
    if (!usuarioMoroso.condominio) {
      usuarioMoroso.condominio = 'San Juan';
      necesitaActualizar = true;
    }
    if (!usuarioMoroso.tipoResidencia) {
      usuarioMoroso.tipoResidencia = 'Propietario';
      necesitaActualizar = true;
    }
    if (!usuarioMoroso.rol) {
      usuarioMoroso.rol = 'Usuario';
      necesitaActualizar = true;
    }
  } else {
    // Si no existe el usuario moroso, agregarlo
    console.log('➕ Agregando usuario moroso (María González)');
    const nuevoId = db.usuarios.length > 0 
      ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
      : 3;
    db.usuarios.push({
      id: nuevoId,
      nombre: 'María González',
      correo: 'maria@condominio.com',
      contraseña: 'maria123',
      telefono: '+58 424-5551234',
      cedula: '11223344',
      numeroApartamento: 'Apto 302',
      condominio: 'San Juan',
      tipoResidencia: 'Propietario',
      rol: 'Usuario',
      estado: 'Moroso'
    });
    necesitaActualizar = true;
  }
  
  if (necesitaActualizar) {
    saveMockDatabase(db);
  }
  
  return db;
};

// Inicializar inmediatamente
initializeDatabase();

export interface LoginData {
  correo: string;
  contraseña: string;
  tipoResidencia?: string;
}

export interface RegisterData {
  nombre: string;
  correo: string;
  contraseña: string;
  telefono?: string;
  cedula?: string;
  condominio?: string;
  tipoResidencia?: string;
}

export interface User {
  id: number;
  nombre: string;
  correo: string;
  numeroApartamento?: string;
  condominio?: string;
  role?: string; // Cambiado de 'rol' a 'role' para compatibilidad con nuevo esquema
  rol?: string; // Mantenido para compatibilidad hacia atrás
  estado?: string | null; // Activo, Moroso, etc.
  tipoResidencia?: string;
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
const isSupabaseConfigured = () => {
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
        .maybeSingle();

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
      
      // Crear nuevo usuario con todos los datos
      const nuevoId = db.usuarios.length > 0 
        ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
        : 1;
      
      const nuevoUsuario: any = {
        id: nuevoId,
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña,
        telefono: userData.telefono || '',
        cedula: userData.cedula || '',
        condominio: userData.condominio || '',
        tipoResidencia: userData.tipoResidencia || '',
        rol: 'Usuario',
        estado: 'Activo',
      };
      
      db.usuarios.push(nuevoUsuario);
      saveMockDatabase(db);
      
      const userResponse: User = {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        condominio: nuevoUsuario.condominio,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado,
        tipoResidencia: nuevoUsuario.tipoResidencia || undefined
      };
      
      console.log('✅ Usuario registrado y guardado en localStorage:', userResponse);
      return { data: userResponse, error: null };
    }

    try {
      // Si Supabase no está disponible o hay un error, usar modo simulado
      if (!supabase) {
        console.warn('Supabase no disponible, usando modo simulado para registro');
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
          telefono: userData.telefono || '',
          cedula: userData.cedula || '',
          condominio: userData.condominio || '',
          tipoResidencia: userData.tipoResidencia || '',
          rol: 'Usuario',
          estado: 'Activo',
        };
        
        db.usuarios.push(nuevoUsuario);
        saveMockDatabase(db);
        
        const userResponse: User = {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          condominio: nuevoUsuario.condominio,
          rol: nuevoUsuario.rol,
          estado: nuevoUsuario.estado,
          tipoResidencia: nuevoUsuario.tipoResidencia || undefined
        };
        
        return { data: userResponse, error: null };
      }

      // Incluir todos los campos que existen en la base de datos
      const userDataForSupabase: any = {
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña,
        telefono: userData.telefono || null,
        cedula: userData.cedula || null,
        condominio: userData.condominio || null,
        tipoResidencia: userData.tipoResidencia || null,
        role: 'Usuario',
        estado: 'Activo'
      };

      console.log('💾 Guardando usuario en Supabase...', {
        nombre: userData.nombre,
        correo: userData.correo,
        condominio: userData.condominio,
      });

      const { data, error } = await supabase
        .from('usuarios')
        .insert([userDataForSupabase])
        .select('id, nombre, correo, condominio, role, estado, telefono, cedula, tipoResidencia')
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
        
        const nuevoUsuario: any = {
          id: nuevoId,
          nombre: userData.nombre,
          correo: userData.correo,
          contraseña: userData.contraseña,
          telefono: userData.telefono || '',
          cedula: userData.cedula || '',
          condominio: userData.condominio || '',
          tipoResidencia: userData.tipoResidencia || '',
          rol: 'Usuario',
          estado: 'Activo',
        };
        
        db.usuarios.push(nuevoUsuario);
        saveMockDatabase(db);
        
        const userResponse: User = {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          condominio: nuevoUsuario.condominio,
          rol: nuevoUsuario.rol,
          estado: nuevoUsuario.estado,
          tipoResidencia: nuevoUsuario.tipoResidencia || undefined
        };
        
        return { data: userResponse, error: null };
      }

      if (data) {
        console.log('✅ Usuario registrado exitosamente en Supabase:', data);
        // Mapear 'role' a 'rol' para compatibilidad
        const userData: User = {
          ...data,
          rol: (data as any).role || (data as any).rol || 'Usuario',
          tipoResidencia: (data as any).tipoResidencia || undefined
        };
        return { data: userData as User | null, error: null };
      } else {
        console.error('❌ No se recibieron datos después del registro');
        return { 
          data: null, 
          error: { message: 'No se pudo crear el usuario. Intenta nuevamente.' } 
        };
      }
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
      
      const nuevoUsuario: any = {
        id: nuevoId,
        nombre: userData.nombre,
        correo: userData.correo,
        contraseña: userData.contraseña,
        telefono: userData.telefono || '',
        cedula: userData.cedula || '',
        condominio: userData.condominio || '',
        tipoResidencia: userData.tipoResidencia || '',
        rol: 'Usuario',
        estado: 'Activo',
      };
      
      db.usuarios.push(nuevoUsuario);
      saveMockDatabase(db);
      
      const userResponse: User = {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        condominio: nuevoUsuario.condominio,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado,
        tipoResidencia: nuevoUsuario.tipoResidencia || undefined
      };
      
      return { data: userResponse, error: null };
    }
  },

  // Autenticar usuario
  async loginUser(loginData: LoginData): Promise<{ data: User | null; error: any }> {
    if (!isSupabaseConfigured()) {
      console.log('📚 Usando base de datos temporal para autenticar usuario');
      console.log('🔍 Buscando usuario con correo:', loginData.correo);
      
      // Forzar reinicialización para asegurar que todos los usuarios estén presentes
      initializeDatabase();
      
      const db = getMockDatabase();
      console.log('📊 Total de usuarios en BD:', db.usuarios?.length || 0);
      console.log('👥 Usuarios disponibles:', db.usuarios?.map((u: any) => `${u.correo} (${u.tipoResidencia || 'sin tipo'})`) || []);
      
      // Buscar usuario por correo primero
      const usuarioPorCorreo = db.usuarios?.find(
        (u: any) => u.correo && u.correo.toLowerCase().trim() === loginData.correo.toLowerCase().trim()
      );
      
      console.log('🔎 Usuario encontrado por correo:', usuarioPorCorreo ? usuarioPorCorreo.correo : 'No encontrado');
      if (usuarioPorCorreo) {
        console.log('📋 Tipo de residencia del usuario:', usuarioPorCorreo.tipoResidencia || 'No definido');
      }
      if (loginData.tipoResidencia) {
        console.log('🔍 Filtrando por tipoResidencia:', loginData.tipoResidencia);
      }
      
      if (!usuarioPorCorreo) {
        console.warn('❌ Usuario no encontrado con correo:', loginData.correo);
        return { data: null, error: { message: 'Usuario no encontrado' } };
      }
      
      // Verificar tipo de residencia si se proporcionó
      if (loginData.tipoResidencia && usuarioPorCorreo.tipoResidencia !== loginData.tipoResidencia) {
        console.warn('❌ Tipo de residencia no coincide:', {
          esperado: loginData.tipoResidencia,
          actual: usuarioPorCorreo.tipoResidencia
        });
        // Si el usuario no tiene tipoResidencia, intentar restaurar la base de datos
        if (!usuarioPorCorreo.tipoResidencia) {
          console.log('🔄 Usuario sin tipoResidencia, restaurando base de datos');
          saveMockDatabase(mockDatabase);
          // Intentar buscar de nuevo
          const dbActualizado = getMockDatabase();
          const usuarioActualizado = dbActualizado.usuarios?.find(
            (u: any) => u.correo && u.correo.toLowerCase().trim() === loginData.correo.toLowerCase().trim()
          );
          if (usuarioActualizado && usuarioActualizado.tipoResidencia === loginData.tipoResidencia) {
            // Continuar con el usuario actualizado
            const usuario = usuarioActualizado;
            // Verificar contraseña
            if (usuario.contraseña !== loginData.contraseña) {
              console.warn('❌ Contraseña incorrecta para usuario:', loginData.correo);
              return { data: null, error: { message: 'Contraseña incorrecta' } };
            }
            
            const userData: User = {
              id: usuario.id,
              nombre: usuario.nombre,
              correo: usuario.correo,
              numeroApartamento: usuario.numeroApartamento || undefined,
              condominio: usuario.condominio || undefined,
              rol: usuario.rol || 'Usuario',
              estado: usuario.estado || 'Activo',
              tipoResidencia: usuario.tipoResidencia || undefined
            };
            
            console.log('✅ Usuario autenticado desde localStorage (después de actualización):', userData);
            return { data: userData, error: null };
          }
        }
        return { 
          data: null, 
          error: { 
            message: `Tipo de residencia incorrecto. El usuario es ${usuarioPorCorreo.tipoResidencia || 'no definido'}, pero se seleccionó ${loginData.tipoResidencia}. Por favor, selecciona el tipo correcto: ${usuarioPorCorreo.tipoResidencia || 'Propietario'}` 
          } 
        };
      }
      
      const usuario = usuarioPorCorreo;
      
      // Verificar contraseña
      if (usuario.contraseña !== loginData.contraseña) {
        console.warn('❌ Contraseña incorrecta para usuario:', loginData.correo);
        return { data: null, error: { message: 'Contraseña incorrecta' } };
      }
      
      const userData: User = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        numeroApartamento: usuario.numeroApartamento || undefined,
        condominio: usuario.condominio || undefined,
        rol: usuario.rol || 'Usuario',
        estado: usuario.estado || 'Activo',
        tipoResidencia: usuario.tipoResidencia || undefined
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
      
      console.log('🔍 Verificando credenciales en Supabase...', { correo: loginData.correo, tipoResidencia: loginData.tipoResidencia });

      let query = supabase
        .from('usuarios')
        .select('id, nombre, correo, condominio, role, estado, telefono, cedula, tipoResidencia')
        .eq('correo', loginData.correo)
        .eq('contraseña', loginData.contraseña);
      
      if (loginData.tipoResidencia) {
        query = query.eq('tipoResidencia', loginData.tipoResidencia);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) {
        console.warn('Error en Supabase, usando modo simulado:', error);
        // Fallback al modo simulado
        const db = getMockDatabase();
        const usuario = db.usuarios?.find(
          (u: any) => {
            const correoMatch = u.correo && u.correo.toLowerCase().trim() === loginData.correo.toLowerCase().trim();
            const passwordMatch = u.contraseña === loginData.contraseña;
            const tipoMatch = !loginData.tipoResidencia || u.tipoResidencia === loginData.tipoResidencia;
            return correoMatch && passwordMatch && tipoMatch;
          }
        );
        
        if (!usuario) {
          if (loginData.tipoResidencia) {
            return { data: null, error: { message: `Credenciales incorrectas o tipo de residencia incorrecto. Debe ser ${loginData.tipoResidencia}` } };
          }
          return { data: null, error: { message: 'Credenciales incorrectas' } };
        }
        
        const userData: User = {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          numeroApartamento: usuario.numeroApartamento || undefined,
          condominio: usuario.condominio || undefined,
          rol: usuario.rol || 'Usuario',
          estado: usuario.estado || 'Activo',
          tipoResidencia: usuario.tipoResidencia || undefined
        };
        
        return { data: userData, error: null };
      }

      if (!data) {
        // Si no hay datos en Supabase, intentar en modo simulado
        const db = getMockDatabase();
        const usuario = db.usuarios?.find(
          (u: any) => {
            const correoMatch = u.correo && u.correo.toLowerCase().trim() === loginData.correo.toLowerCase().trim();
            const passwordMatch = u.contraseña === loginData.contraseña;
            const tipoMatch = !loginData.tipoResidencia || u.tipoResidencia === loginData.tipoResidencia;
            return correoMatch && passwordMatch && tipoMatch;
          }
        );
        
        if (usuario) {
          const userData: User = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            numeroApartamento: usuario.numeroApartamento || undefined,
            condominio: usuario.condominio || undefined,
            rol: usuario.rol || 'Usuario',
            estado: usuario.estado || 'Activo',
            tipoResidencia: usuario.tipoResidencia || undefined
          };
          return { data: userData, error: null };
        }
      }

      console.log('✅ Usuario autenticado exitosamente desde Supabase:', data);
      // Mapear 'role' a 'rol' para compatibilidad
      const userData: User = {
        ...data,
        rol: (data as any).role || (data as any).rol || 'Usuario',
        tipoResidencia: (data as any).tipoResidencia || undefined
      };
      return { data: userData as User | null, error: null };
    } catch (error: any) {
      console.warn('Error al autenticar, usando modo simulado:', error);
      // Fallback al modo simulado
      const db = getMockDatabase();
      const usuario = db.usuarios?.find(
        (u: any) => {
          const correoMatch = u.correo && u.correo.toLowerCase().trim() === loginData.correo.toLowerCase().trim();
          const passwordMatch = u.contraseña === loginData.contraseña;
          const tipoMatch = !loginData.tipoResidencia || u.tipoResidencia === loginData.tipoResidencia;
          return correoMatch && passwordMatch && tipoMatch;
        }
      );
      
      if (!usuario) {
        if (loginData.tipoResidencia) {
          return { data: null, error: { message: `Credenciales incorrectas o tipo de residencia incorrecto. Debe ser ${loginData.tipoResidencia}` } };
        }
        return { data: null, error: { message: 'Credenciales incorrectas' } };
      }
      
      const userData: User = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        numeroApartamento: usuario.numeroApartamento || undefined,
        condominio: usuario.condominio || undefined,
        rol: usuario.rol || 'Usuario',
        estado: usuario.estado || 'Activo',
        tipoResidencia: usuario.tipoResidencia || undefined
      };
      
      return { data: userData, error: null };
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

  // Función para forzar la actualización del usuario moroso
  forceUpdateMorosoUser(): void {
    console.log('🔄 Forzando actualización del usuario moroso...');
    const db = getMockDatabase();
    
    // Buscar o crear usuario moroso
    let usuarioMoroso = db.usuarios.find((u: any) => u.correo === 'maria@condominio.com');
    
    if (!usuarioMoroso) {
      // Crear usuario moroso si no existe
      const nuevoId = db.usuarios.length > 0 
        ? Math.max(...db.usuarios.map((u: any) => u.id)) + 1 
        : 3;
      usuarioMoroso = {
        id: nuevoId,
        nombre: 'María González',
        correo: 'maria@condominio.com',
        contraseña: 'maria123',
        telefono: '+58 424-5551234',
        cedula: '11223344',
        numeroApartamento: 'Apto 302',
        condominio: 'San Juan',
        tipoResidencia: 'Propietario',
        rol: 'Usuario',
        estado: 'Moroso'
      };
      db.usuarios.push(usuarioMoroso);
      console.log('✅ Usuario moroso creado');
    } else {
      // Actualizar usuario moroso existente
      usuarioMoroso.nombre = 'María González';
      usuarioMoroso.contraseña = 'maria123';
      usuarioMoroso.telefono = '+58 424-5551234';
      usuarioMoroso.cedula = '11223344';
      usuarioMoroso.numeroApartamento = 'Apto 302';
      usuarioMoroso.condominio = 'San Juan';
      usuarioMoroso.tipoResidencia = 'Propietario';
      usuarioMoroso.rol = 'Usuario';
      usuarioMoroso.estado = 'Moroso';
      console.log('✅ Usuario moroso actualizado');
    }
    
    saveMockDatabase(db);
    console.log('💾 Base de datos guardada con usuario moroso configurado');
  }
};

// También forzar actualización del usuario moroso al cargar (después de que authService esté definido)
if (typeof window !== 'undefined') {
  // Ejecutar después de que la página cargue
  setTimeout(() => {
    const db = getMockDatabase();
    const maria = db.usuarios?.find((u: any) => u.correo === 'maria@condominio.com');
    if (!maria || maria.estado !== 'Moroso') {
      console.log('🔧 Asegurando que el usuario moroso esté configurado...');
      authService.forceUpdateMorosoUser();
    }
  }, 1000);
}
