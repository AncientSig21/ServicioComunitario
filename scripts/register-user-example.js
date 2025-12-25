/**
 * Script de ejemplo para registrar usuarios
 * Modifica los datos y ejecuta: node scripts/register-user-example.js
 */

import { supabase } from '../src/supabase/client.js';
import { registerResidente } from '../src/services/bookService.js';

// ==================== CONFIGURACIÓN ====================
// Modifica estos datos según tus necesidades

const USUARIO_EJEMPLO = {
  nombre: 'Usuario de Prueba',
  correo: 'usuario.prueba@email.com',
  telefono: '04121234567',
  cedula: 'V12345678',
  rol: 'residente', // 'admin' | 'propietario' | 'residente' | 'conserje' | 'invitado'
  contraseña: 'password123',
  condominio_id: 1, // null si no tiene condominio
  vivienda_id: 1, // ID de la vivienda (debe existir)
  rol_en_vivienda: 'propietario' // 'propietario' | 'inquilino' | 'arrendatario' | 'familiar'
};

// ==================== FUNCIONES ====================

/**
 * Registrar usuario simple (sin vivienda)
 */
async function registrarUsuarioSimple(datos) {
  try {
    const auth_uid = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert([{
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono || null,
        cedula: datos.cedula || null,
        rol: datos.rol,
        contraseña: datos.contraseña,
        auth_uid: auth_uid,
        condominio_id: datos.condominio_id || null
      }])
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ Usuario registrado exitosamente:');
    console.log('  ID:', usuario.id);
    console.log('  Nombre:', usuario.nombre);
    console.log('  Correo:', usuario.correo);
    console.log('  Rol:', usuario.rol);
    
    return usuario;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Registrar residente completo (con vivienda)
 */
async function registrarResidenteCompleto(datos) {
  try {
    const auth_uid = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const usuario = await registerResidente({
      ...datos,
      auth_uid
    });
    
    console.log('✅ Residente registrado exitosamente:');
    console.log('  ID:', usuario.id);
    console.log('  Nombre:', usuario.nombre);
    console.log('  Correo:', usuario.correo);
    console.log('  Rol:', usuario.rol);
    console.log('  Vivienda ID:', datos.vivienda_id);
    
    return usuario;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Obtener lista de viviendas disponibles
 */
async function listarViviendas(condominio_id) {
  try {
    let query = supabase
      .from('viviendas')
      .select('id, numero_apartamento, condominio_id')
      .eq('activo', true);
    
    if (condominio_id) {
      query = query.eq('condominio_id', condominio_id);
    }
    
    const { data, error } = await query.order('numero_apartamento');
    
    if (error) throw error;
    
    console.log('\n📦 Viviendas disponibles:');
    data.forEach(v => {
      console.log(`  ID: ${v.id} - Apartamento: ${v.numero_apartamento} (Condominio: ${v.condominio_id})`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Error al listar viviendas:', error.message);
    return [];
  }
}

/**
 * Obtener lista de condominios
 */
async function listarCondominios() {
  try {
    const { data, error } = await supabase
      .from('condominios')
      .select('id, nombre')
      .order('nombre');
    
    if (error) throw error;
    
    console.log('\n🏢 Condominios disponibles:');
    data.forEach(c => {
      console.log(`  ID: ${c.id} - ${c.nombre}`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Error al listar condominios:', error.message);
    return [];
  }
}

// ==================== EJECUCIÓN ====================

async function main() {
  console.log('🚀 Script de Registro de Usuarios\n');
  
  try {
    // Opción 1: Listar condominios y viviendas disponibles
    console.log('📋 Consultando datos disponibles...\n');
    await listarCondominios();
    await listarViviendas(USUARIO_EJEMPLO.condominio_id);
    
    console.log('\n' + '='.repeat(50));
    console.log('📝 Registrando usuario de ejemplo...\n');
    
    // Opción 2: Registrar usuario simple (sin vivienda)
    // Descomenta para usar:
    // await registrarUsuarioSimple({
    //   nombre: 'Admin Test',
    //   correo: 'admin.test@email.com',
    //   rol: 'admin',
    //   contraseña: 'admin123',
    //   condominio_id: null
    // });
    
    // Opción 3: Registrar residente completo (con vivienda)
    // Asegúrate de que vivienda_id existe antes de ejecutar
    if (USUARIO_EJEMPLO.vivienda_id) {
      await registrarResidenteCompleto(USUARIO_EJEMPLO);
    } else {
      console.log('⚠️  vivienda_id no especificado. Usando registro simple...');
      await registrarUsuarioSimple(USUARIO_EJEMPLO);
    }
    
    console.log('\n✅ Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('register-user-example')) {
  main();
}

export { registrarUsuarioSimple, registrarResidenteCompleto, listarViviendas, listarCondominios };




