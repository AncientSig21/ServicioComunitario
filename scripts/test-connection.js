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
  
  // Test 4: Registrar usuario de prueba
  try {
    console.log('\n👤 Test 4: Registrar usuario de prueba...');
    
    // Generar UUID v4 válido
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const testUser = {
      nombre: `Usuario Test ${Date.now()}`,
      correo: `test.${Date.now()}@example.com`,
      telefono: '04121234567',
      cedula: `V${Date.now().toString().slice(-8)}`,
      rol: 'invitado',
      contraseña: 'test123',
      auth_uid: generateUUID(),
      condominio_id: null
    };
    
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert([testUser])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`   ✅ Usuario de prueba creado exitosamente!`);
    console.log(`      ID: ${usuario.id}`);
    console.log(`      Nombre: ${usuario.nombre}`);
    console.log(`      Correo: ${usuario.correo}`);
    console.log(`      Rol: ${usuario.rol}`);
    
    // Limpiar: eliminar usuario de prueba
    await supabase
      .from('usuarios')
      .delete()
      .eq('id', usuario.id);
    
    console.log(`   🧹 Usuario de prueba eliminado`);
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

