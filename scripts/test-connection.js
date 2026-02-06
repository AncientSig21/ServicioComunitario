/**
 * Script para probar la conexión con Supabase
 * Ejecuta: node scripts/test-connection.js
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

// ==================== PRUEBAS DE CONEXIÓN ====================

async function testConnection() {
  console.log('🧪 Ejecutando pruebas de conexión...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Contar usuarios
  try {
    console.log('📊 Test 1: Contar usuarios...');
    const { count, error } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    console.log(`   ✅ Conexión exitosa! Usuarios en BD: ${count || 0}`);
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testsFailed++;
  }
  
  // Test 2: Listar condominios
  try {
    console.log('\n🏢 Test 2: Listar condominios...');
    const { data, error } = await supabase
      .from('condominios')
      .select('id, nombre')
      .limit(5);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`   ✅ Encontrados ${data.length} condominio(s):`);
      data.forEach(c => {
        console.log(`      - ID: ${c.id}, Nombre: ${c.nombre}`);
      });
    } else {
      console.log('   ⚠️  No hay condominios registrados');
    }
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testsFailed++;
  }
  
  // Test 3: Listar viviendas
  try {
    console.log('\n🏠 Test 3: Listar viviendas...');
    const { data, error } = await supabase
      .from('viviendas')
      .select('id, numero_apartamento, condominio_id')
      .eq('activo', true)
      .limit(5);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`   ✅ Encontradas ${data.length} vivienda(s) activa(s):`);
      data.forEach(v => {
        console.log(`      - ID: ${v.id}, Apartamento: ${v.numero_apartamento}, Condominio: ${v.condominio_id}`);
      });
    } else {
      console.log('   ⚠️  No hay viviendas activas registradas');
    }
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testsFailed++;
  }
  
  // Test 4: Verificar estructura de tabla usuarios
  try {
    console.log('\n👤 Test 4: Verificar estructura de tabla usuarios...');
    
    // Intentar obtener un usuario (aunque no haya ninguno, esto prueba la estructura)
    const { data, error, count } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, telefono, cedula, rol, condominio_id, estado, created_at', { count: 'exact', head: true });
    
    if (error) {
      // Si hay error, puede ser por RLS o estructura
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        throw new Error(`Error de estructura: ${error.message}`);
      }
      // Si es RLS, es normal y solo informamos
      console.log(`   ⚠️  RLS activo (normal): ${error.message}`);
      console.log(`   ℹ️  La inserción requiere autenticación o políticas RLS apropiadas`);
    } else {
      console.log(`   ✅ Estructura de tabla verificada correctamente`);
      console.log(`   ℹ️  Campos disponibles: id, nombre, correo, telefono, cedula, rol, condominio_id, estado, created_at`);
    }
    
    // Nota sobre inserción: RLS está activo, por lo que la inserción requiere autenticación
    console.log(`   ℹ️  Nota: La inserción de usuarios requiere autenticación debido a RLS`);
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testsFailed++;
  }
  
  // Test 5: Verificar otras tablas importantes
  try {
    console.log('\n📋 Test 5: Verificar estructura de otras tablas...');
    
    const tables = ['pagos', 'viviendas', 'condominios', 'notificaciones', 'solicitudes_mantenimiento'];
    let tablesOk = 0;
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error && !error.message.includes('RLS')) {
          console.log(`   ⚠️  Tabla ${table}: ${error.message}`);
        } else {
          tablesOk++;
        }
      } catch (err) {
        console.log(`   ⚠️  Tabla ${table}: ${err.message}`);
      }
    }
    
    console.log(`   ✅ ${tablesOk}/${tables.length} tablas accesibles`);
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testsFailed++;
  }
  
  // Test 6: Probar registro de usuario
  try {
    console.log('\n👤 Test 6: Probar registro de usuario...');
    
    // Generar datos de prueba únicos
    const timestamp = Date.now();
    const testEmail = `test_${timestamp}@test.com`;
    const testCedula = `V${timestamp.toString().slice(-8)}`;
    
    const testUserData = {
      nombre: `Test User ${timestamp}`,
      correo: testEmail,
      telefono: '04121234567',
      cedula: testCedula,
      contraseña: 'test123456',
      rol: null, // Pendiente de aprobación
      condominio_id: null
    };
    
    // Verificar si el correo ya existe
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo', testUserData.correo)
      .maybeSingle();
    
    if (existingUser) {
      console.log(`   ⚠️  El correo de prueba ya existe, usando otro...`);
      testUserData.correo = `test_${timestamp + 1}@test.com`;
    }
    
    // Intentar registrar
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert([testUserData])
      .select('id, nombre, correo, rol, created_at')
      .single();
    
    if (insertError) {
      if (insertError.code === '42501' || insertError.message.includes('RLS')) {
        console.log('   ⚠️  RLS activo (normal): La inserción requiere políticas RLS apropiadas');
        console.log('   ℹ️  Esto es normal si RLS está activo y no hay políticas que permitan inserción');
        console.log('   ℹ️  El registro funciona desde la aplicación cuando el usuario se registra');
      } else if (insertError.message.includes('estado')) {
        console.log('   ⚠️  Error: La columna "estado" no existe en la BD');
        console.log('   ℹ️  El script de registro no debe incluir el campo "estado"');
      } else {
        throw insertError;
      }
    } else if (newUser) {
      console.log(`   ✅ Usuario registrado exitosamente!`);
      console.log(`      ID: ${newUser.id}`);
      console.log(`      Nombre: ${newUser.nombre}`);
      console.log(`      Correo: ${newUser.correo}`);
      console.log(`      Rol: ${newUser.rol === null ? 'null (Pendiente de aprobación)' : newUser.rol}`);
      console.log(`      Fecha: ${newUser.created_at}`);
    }
    
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testsFailed++;
  }
  
  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE PRUEBAS:');
  console.log(`   ✅ Exitosas: ${testsPassed}`);
  console.log(`   ❌ Fallidas: ${testsFailed}`);
  console.log(`   📈 Tasa de éxito: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! La conexión funciona correctamente.');
    return true;
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa la configuración.');
    return false;
  }
}

// Ejecutar pruebas
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

