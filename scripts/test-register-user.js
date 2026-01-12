/**
 * Script para probar el registro de usuarios en Supabase
 * Ejecuta: node scripts/test-register-user.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar rutas para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno manualmente
let supabaseUrl = "https://vsyunsvlrvbbvgiwcxnt.supabase.co";
let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeXVuc3ZscnZiYnZnaXdjeG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjUxNzEsImV4cCI6MjA4MTkwMTE3MX0.bACD3Ls_hBHx1bbfkr1tGXWqHIrLTCj0CB0vDOU3oyE";

try {
  const envPath = join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'VITE_PROJECT_URL_SUPABASE') {
          supabaseUrl = value;
        } else if (key === 'VITE_SUPABASE_API_KEY') {
          supabaseAnonKey = value;
        }
      }
    }
  });
} catch (error) {
  console.log('⚠️  No se encontró archivo .env, usando valores por defecto');
}

console.log('🔌 Inicializando cliente de Supabase...');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseAnonKey.substring(0, 20) + '...\n');

// Crear cliente
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== FUNCIÓN DE REGISTRO ====================

async function registerTestUser() {
  console.log('🧪 Iniciando prueba de registro de usuario...\n');
  
  // Generar datos de prueba únicos usando timestamp
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@test.com`;
  const testCedula = `V${timestamp.toString().slice(-8)}`;
  
  const userData = {
    nombre: `Usuario de Prueba ${timestamp}`,
    correo: testEmail,
    telefono: '04121234567',
    cedula: testCedula,
    contraseña: 'test123456',
    rol: null, // null = pendiente de aprobación (como en el registro normal)
    // estado: 'Activo', // NOTA: La columna 'estado' no existe en la BD según el error
    condominio_id: null // Opcional, puede ser null
  };

  console.log('📝 Datos del usuario a registrar:');
  console.log('   Nombre:', userData.nombre);
  console.log('   Correo:', userData.correo);
  console.log('   Teléfono:', userData.telefono);
  console.log('   Cédula:', userData.cedula);
  console.log('   Rol:', userData.rol === null ? 'null (Pendiente de aprobación)' : userData.rol);
  console.log('   Condominio ID:', userData.condominio_id || 'null');
  console.log('');

  try {
    // Verificar si el correo ya existe
    console.log('🔍 Verificando si el correo ya existe...');
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('id, correo')
      .eq('correo', userData.correo)
      .maybeSingle();

    if (checkError && !checkError.message.includes('RLS')) {
      console.log(`   ⚠️  Error al verificar correo: ${checkError.message}`);
    } else if (existingUser) {
      console.log(`   ⚠️  El correo ${userData.correo} ya existe en la base de datos`);
      console.log(`   ℹ️  Usuario existente - ID: ${existingUser.id}`);
      return { success: false, error: 'El correo ya existe', user: existingUser };
    } else {
      console.log('   ✅ El correo no existe, procediendo con el registro...');
    }

    // Intentar registrar el usuario
    // NOTA: Solo incluir campos que existen en la BD según el esquema
    // Campos disponibles: id, nombre, correo, telefono, cedula, rol, contraseña, condominio_id, auth_uid, created_at, updated_at
    console.log('\n📤 Insertando usuario en la base de datos...');
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert([userData])
      .select('id, nombre, correo, telefono, cedula, rol, condominio_id, created_at')
      .single();

    if (insertError) {
      console.log(`   ❌ Error al insertar usuario: ${insertError.message}`);
      console.log(`   📋 Código de error: ${insertError.code || 'N/A'}`);
      console.log(`   📋 Detalles: ${insertError.details || 'N/A'}`);
      console.log(`   📋 Hint: ${insertError.hint || 'N/A'}`);
      
      // Si es error de RLS, informar
      if (insertError.code === '42501' || insertError.message.includes('RLS') || insertError.message.includes('row-level security')) {
        console.log('\n   ⚠️  NOTA: Error de Row Level Security (RLS)');
        console.log('   ℹ️  Esto es normal si RLS está activo y no hay políticas que permitan inserción');
        console.log('   ℹ️  Opciones:');
        console.log('      1. Crear una política RLS que permita inserción de usuarios');
        console.log('      2. Usar un usuario autenticado con permisos apropiados');
        console.log('      3. Desactivar temporalmente RLS para pruebas (NO recomendado en producción)');
      }
      
      return { success: false, error: insertError };
    }

    if (!newUser) {
      console.log('   ❌ No se recibió respuesta del servidor');
      return { success: false, error: 'No se recibió respuesta del servidor' };
    }

    console.log('   ✅ Usuario registrado exitosamente!');
    console.log('\n📋 Datos del usuario registrado:');
    console.log('   ID:', newUser.id);
    console.log('   Nombre:', newUser.nombre);
    console.log('   Correo:', newUser.correo);
    console.log('   Teléfono:', newUser.telefono || 'N/A');
    console.log('   Cédula:', newUser.cedula || 'N/A');
    console.log('   Rol:', newUser.rol === null ? 'null (Pendiente de aprobación)' : newUser.rol);
    console.log('   Condominio ID:', newUser.condominio_id || 'null');
    console.log('   Fecha de creación:', newUser.created_at || 'N/A');

    // Verificar que el usuario se puede consultar
    console.log('\n🔍 Verificando que el usuario se puede consultar...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .eq('id', newUser.id)
      .single();

    if (verifyError) {
      console.log(`   ⚠️  Error al verificar usuario: ${verifyError.message}`);
      if (verifyError.code === '42501' || verifyError.message.includes('RLS')) {
        console.log('   ℹ️  Esto puede ser normal si RLS está activo y no hay políticas de lectura');
      }
    } else if (verifyUser) {
      console.log('   ✅ Usuario verificado correctamente');
      console.log(`   📧 Correo verificado: ${verifyUser.correo}`);
    }

    return { success: true, user: newUser };
  } catch (error) {
    console.log(`\n❌ Error inesperado: ${error.message}`);
    console.log(error);
    return { success: false, error: error };
  }
}

// ==================== EJECUTAR PRUEBA ====================

console.log('='.repeat(60));
console.log('🧪 PRUEBA DE REGISTRO DE USUARIO');
console.log('='.repeat(60));
console.log('');

registerTestUser()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('✅ PRUEBA EXITOSA');
      console.log(`   Usuario ID: ${result.user.id}`);
      console.log(`   Correo: ${result.user.correo}`);
      console.log('\n💡 El usuario fue registrado correctamente en la base de datos.');
      console.log('💡 El usuario está pendiente de aprobación (rol = null).');
      console.log('💡 Un administrador debe aprobar el usuario para que pueda iniciar sesión.');
      process.exit(0);
    } else {
      console.log('❌ PRUEBA FALLIDA');
      if (result.error) {
        console.log(`   Error: ${result.error.message || result.error}`);
      }
      console.log('\n💡 Revisa los mensajes anteriores para más detalles.');
      console.log('💡 Si el error es de RLS, necesitas configurar políticas apropiadas.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

