/**
 * Script para registrar usuarios en la base de datos
 * Usa el CRUD corregido (bookService.ts) y los tipos de supabase.ts
 * 
 * Uso:
 *   npx tsx scripts/register-user.ts
 *   o
 *   npm run register-user
 */

import { registerResidente } from '../src/services/bookService';
import { supabase } from '../src/supabase/client';

// Tipo para los datos del usuario
interface UserRegistrationData {
  nombre: string;
  correo: string;
  telefono?: string;
  cedula?: string;
  rol: 'admin' | 'propietario' | 'residente' | 'conserje' | 'invitado';
  contraseña: string;
  condominio_id?: number | null;
  vivienda_id: number;
  rol_en_vivienda: string;
}

/**
 * Función para registrar un usuario simple (sin vivienda)
 * Útil para usuarios admin o que no requieren vivienda
 */
export const registerUsuarioSimple = async (userData: {
  nombre: string;
  correo: string;
  telefono?: string;
  cedula?: string;
  rol: 'admin' | 'propietario' | 'residente' | 'conserje' | 'invitado';
  contraseña: string;
  condominio_id?: number | null;
  auth_uid?: string;
}) => {
  try {
    // Generar auth_uid si no se proporciona
    const auth_uid = userData.auth_uid || `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert([{
        nombre: userData.nombre,
        correo: userData.correo,
        telefono: userData.telefono || null,
        cedula: userData.cedula || null,
        rol: userData.rol,
        contraseña: userData.contraseña,
        auth_uid: auth_uid,
        condominio_id: userData.condominio_id || null
      }])
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ Usuario registrado exitosamente:', {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    });
    
    return usuario;
  } catch (error: any) {
    console.error('❌ Error al registrar usuario:', error.message);
    throw error;
  }
};

/**
 * Función para registrar un residente completo (con vivienda)
 */
export const registerResidenteCompleto = async (userData: UserRegistrationData) => {
  try {
    // Generar auth_uid
    const auth_uid = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const usuario = await registerResidente({
      ...userData,
      auth_uid
    });
    
    console.log('✅ Residente registrado exitosamente:', {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      vivienda_id: userData.vivienda_id
    });
    
    return usuario;
  } catch (error: any) {
    console.error('❌ Error al registrar residente:', error.message);
    throw error;
  }
};

/**
 * Función helper para obtener o crear una vivienda
 */
export const obtenerOCrearVivienda = async (numeroApartamento: string, condominio_id?: number) => {
  try {
    // Buscar vivienda existente
    let query = supabase
      .from('viviendas')
      .select('id')
      .eq('numero_apartamento', numeroApartamento);
    
    if (condominio_id) {
      query = query.eq('condominio_id', condominio_id);
    }
    
    const { data: viviendaExistente, error: searchError } = await query.single();
    
    if (!searchError && viviendaExistente) {
      console.log(`📦 Vivienda encontrada: ${numeroApartamento} (ID: ${viviendaExistente.id})`);
      return viviendaExistente.id;
    }
    
    // Crear nueva vivienda si no existe
    if (!condominio_id) {
      throw new Error('condominio_id es requerido para crear una nueva vivienda');
    }
    
    const { data: nuevaVivienda, error: createError } = await supabase
      .from('viviendas')
      .insert([{
        condominio_id,
        numero_apartamento: numeroApartamento,
        activo: true
      }])
      .select('id')
      .single();
    
    if (createError) throw createError;
    
    console.log(`✅ Nueva vivienda creada: ${numeroApartamento} (ID: ${nuevaVivienda.id})`);
    return nuevaVivienda.id;
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      // No se encontró vivienda, crear una nueva
      return null;
    }
    throw error;
  }
};

// ==================== EJEMPLOS DE USO ====================

/**
 * Ejemplo 1: Registrar un usuario admin (sin vivienda)
 */
export const ejemploRegistrarAdmin = async () => {
  try {
    await registerUsuarioSimple({
      nombre: 'Administrador Principal',
      correo: 'admin@condominio.com',
      telefono: '04121234567',
      cedula: 'V12345678',
      rol: 'admin',
      contraseña: 'admin123',
      condominio_id: null // Admin puede no tener condominio específico
    });
  } catch (error) {
    console.error('Error en ejemplo:', error);
  }
};

/**
 * Ejemplo 2: Registrar un residente con vivienda
 */
export const ejemploRegistrarResidente = async () => {
  try {
    // Primero obtener o crear la vivienda
    const vivienda_id = await obtenerOCrearVivienda('A-101', 1) || 1;
    
    await registerResidenteCompleto({
      nombre: 'Juan Pérez',
      correo: 'juan.perez@email.com',
      telefono: '04121234568',
      cedula: 'V87654321',
      rol: 'residente',
      contraseña: 'password123',
      condominio_id: 1,
      vivienda_id: vivienda_id,
      rol_en_vivienda: 'propietario'
    });
  } catch (error) {
    console.error('Error en ejemplo:', error);
  }
};

/**
 * Ejemplo 3: Registrar múltiples usuarios desde un array
 */
export const ejemploRegistrarMultiples = async () => {
  const usuarios = [
    {
      nombre: 'María González',
      correo: 'maria.gonzalez@email.com',
      telefono: '04121234569',
      cedula: 'V11223344',
      rol: 'propietario' as const,
      contraseña: 'password123',
      condominio_id: 1,
      numeroApartamento: 'A-102',
      rol_en_vivienda: 'propietario'
    },
    {
      nombre: 'Carlos Rodríguez',
      correo: 'carlos.rodriguez@email.com',
      telefono: '04121234570',
      cedula: 'V55667788',
      rol: 'residente' as const,
      contraseña: 'password123',
      condominio_id: 1,
      numeroApartamento: 'A-103',
      rol_en_vivienda: 'inquilino'
    }
  ];
  
  for (const userData of usuarios) {
    try {
      const { numeroApartamento, rol_en_vivienda, ...userInfo } = userData;
      const vivienda_id = await obtenerOCrearVivienda(numeroApartamento, userData.condominio_id || undefined) || 1;
      
      await registerResidenteCompleto({
        ...userInfo,
        vivienda_id,
        rol_en_vivienda
      });
      
      console.log(`✅ Usuario ${userData.nombre} registrado exitosamente`);
    } catch (error: any) {
      console.error(`❌ Error al registrar ${userData.nombre}:`, error.message);
    }
  }
};

// ==================== EJECUCIÓN DIRECTA ====================

// Si se ejecuta directamente desde la línea de comandos
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('register-user')) {
  (async () => {
    console.log('🚀 Iniciando registro de usuarios...\n');
    
    // Descomentar el ejemplo que quieras usar:
    
    // Ejemplo 1: Registrar admin
    // await ejemploRegistrarAdmin();
    
    // Ejemplo 2: Registrar residente
    // await ejemploRegistrarResidente();
    
    // Ejemplo 3: Registrar múltiples usuarios
    // await ejemploRegistrarMultiples();
    
    console.log('\n✅ Script completado');
  })().catch(console.error);
}





