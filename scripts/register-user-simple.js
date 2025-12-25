/**
 * Script simple para registrar usuarios en la base de datos
 * Usa el CRUD corregido (bookService.ts) y los tipos de supabase.ts
 * 
 * Uso:
 *   node scripts/register-user-simple.js
 *   o
 *   npm run register-user
 */

import { supabase } from '../src/supabase/client.js';

/**
 * Registrar un usuario simple (sin vivienda)
 * Útil para usuarios admin o que no requieren vivienda
 */
async function registerUsuarioSimple(userData) {
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
  } catch (error) {
    console.error('❌ Error al registrar usuario:', error.message);
    throw error;
  }
}

/**
 * Registrar un residente completo (con vivienda)
 */
async function registerResidenteCompleto(userData) {
  try {
    const { registerResidente } = await import('../src/services/bookService.js');
    
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
  } catch (error) {
    console.error('❌ Error al registrar residente:', error.message);
    throw error;
  }
}

/**
 * Obtener o crear una vivienda
 */
async function obtenerOCrearVivienda(numeroApartamento, condominio_id) {
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
  } catch (error) {
    if (error.code === 'PGRST116') {
      // No se encontró vivienda, crear una nueva
      return null;
    }
    throw error;
  }
}

// ==================== EJEMPLOS DE USO ====================

/**
 * Ejemplo: Registrar un usuario admin
 */
async function ejemploRegistrarAdmin() {
  try {
    await registerUsuarioSimple({
      nombre: 'Administrador Principal',
      correo: 'admin@condominio.com',
      telefono: '04121234567',
      cedula: 'V12345678',
      rol: 'admin',
      contraseña: 'admin123',
      condominio_id: null
    });
  } catch (error) {
    console.error('Error en ejemplo:', error);
  }
}

/**
 * Ejemplo: Registrar un residente con vivienda
 */
async function ejemploRegistrarResidente() {
  try {
    const { registerResidente } = await import('../src/services/bookService.js');
    
    // Primero obtener o crear la vivienda
    const vivienda_id = await obtenerOCrearVivienda('A-101', 1) || 1;
    
    await registerResidente({
      nombre: 'Juan Pérez',
      correo: 'juan.perez@email.com',
      telefono: '04121234568',
      cedula: 'V87654321',
      rol: 'residente',
      contraseña: 'password123',
      auth_uid: `auth_${Date.now()}`,
      condominio_id: 1,
      vivienda_id: vivienda_id,
      rol_en_vivienda: 'propietario'
    });
    
    console.log('✅ Residente registrado exitosamente');
  } catch (error) {
    console.error('Error en ejemplo:', error);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('🚀 Iniciando registro de usuarios...\n');
    
    // Descomentar el ejemplo que quieras usar:
    // await ejemploRegistrarAdmin();
    // await ejemploRegistrarResidente();
    
    console.log('\n✅ Script completado');
  })().catch(console.error);
}

export { registerUsuarioSimple, registerResidenteCompleto, obtenerOCrearVivienda };




