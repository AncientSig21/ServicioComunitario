/**
 * Script de prueba de políticas RLS desde Node.js
 * Este script simula consultas como diferentes usuarios
 * 
 * USO:
 * node scripts/test-rls.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_PROJECT_URL_SUPABASE || 'https://vsyunsvlrvbbvgiwcxnt.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_API_KEY;

if (!supabaseAnonKey) {
  console.error('❌ Error: VITE_SUPABASE_API_KEY no está configurada en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Verificar estructura de políticas RLS
 */
async function verificarPoliticasRLS() {
  console.log('\n📋 Verificando políticas RLS...\n');

  const tablas = [
    'usuarios', 'condominios', 'viviendas', 'usuario_vivienda',
    'pagos', 'historial_pagos', 'anuncios', 'espacios_comunes',
    'reservas_espacios', 'solicitudes_mantenimiento', 'archivos',
    'notificaciones', 'ordenes', 'tipos_residencia'
  ];

  for (const tabla of tablas) {
    try {
      // Intentar leer la tabla (sin autenticación, debería fallar o retornar vacío si RLS está activo)
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('row-level security')) {
          console.log(`✅ ${tabla}: RLS está activo (consulta bloqueada sin autenticación)`);
        } else {
          console.log(`⚠️  ${tabla}: Error al verificar - ${error.message}`);
        }
      } else {
        console.log(`⚠️  ${tabla}: RLS puede no estar activo (consulta exitosa sin autenticación)`);
      }
    } catch (err) {
      console.log(`❌ ${tabla}: Error - ${err.message}`);
    }
  }
}

/**
 * Probar acceso como usuario autenticado
 */
async function probarComoUsuarioAutenticado(email, password, nombreTest) {
  console.log(`\n🔐 Probando como: ${nombreTest} (${email})\n`);

  // Autenticar
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (authError) {
    console.log(`❌ Error al autenticar: ${authError.message}`);
    return;
  }

  console.log(`✅ Autenticado exitosamente`);

  // Obtener usuario de la tabla usuarios
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select('id, nombre, correo, rol')
    .eq('auth_uid', authData.user.id)
    .single();

  if (userError || !usuario) {
    console.log(`⚠️  Usuario no encontrado en tabla usuarios con auth_uid: ${authData.user.id}`);
    console.log(`   Esto significa que auth_uid no está vinculado correctamente`);
    return;
  }

  console.log(`✅ Usuario encontrado: ${usuario.nombre} (Rol: ${usuario.rol || 'Pendiente'})`);

  // Probar lectura de pagos
  console.log(`\n📄 Probando acceso a pagos...`);
  const { data: pagos, error: pagosError } = await supabase
    .from('pagos')
    .select('id, concepto, monto, estado');

  if (pagosError) {
    console.log(`❌ Error al leer pagos: ${pagosError.message}`);
  } else {
    console.log(`✅ Pagos accesibles: ${pagos?.length || 0} registros`);
    if (usuario.rol === 'admin') {
      console.log(`   (Admin debería ver todos los pagos)`);
    } else {
      console.log(`   (Usuario debería ver solo sus propios pagos)`);
    }
  }

  // Probar lectura de notificaciones
  console.log(`\n🔔 Probando acceso a notificaciones...`);
  const { data: notificaciones, error: notifError } = await supabase
    .from('notificaciones')
    .select('id, titulo, mensaje, leida');

  if (notifError) {
    console.log(`❌ Error al leer notificaciones: ${notifError.message}`);
  } else {
    console.log(`✅ Notificaciones accesibles: ${notificaciones?.length || 0} registros`);
    console.log(`   (Usuario debería ver solo sus propias notificaciones)`);
  }

  // Cerrar sesión
  await supabase.auth.signOut();
  console.log(`\n👋 Sesión cerrada\n`);
}

/**
 * Función principal
 */
async function main() {
  console.log('========================================');
  console.log('PRUEBAS DE POLÍTICAS RLS');
  console.log('Sistema Gestión Condominial');
  console.log('========================================');

  // Verificar políticas
  await verificarPoliticasRLS();

  // Probar con usuarios (si tienes credenciales de prueba)
  const usuariosPrueba = [
    // Agrega usuarios de prueba aquí
    // { email: 'admin@ejemplo.com', password: 'admin123', nombre: 'Administrador' },
    // { email: 'usuario@ejemplo.com', password: 'usuario123', nombre: 'Usuario Normal' },
  ];

  if (usuariosPrueba.length > 0) {
    console.log('\n========================================');
    console.log('PRUEBAS CON USUARIOS REALES');
    console.log('========================================');

    for (const usuario of usuariosPrueba) {
      await probarComoUsuarioAutenticado(
        usuario.email,
        usuario.password,
        usuario.nombre
      );
    }
  } else {
    console.log('\n💡 Para probar con usuarios reales:');
    console.log('   1. Agrega credenciales en el array usuariosPrueba');
    console.log('   2. Asegúrate de que los usuarios existan y tengan auth_uid vinculado');
    console.log('   3. Ejecuta el script nuevamente\n');
  }

  console.log('========================================');
  console.log('VERIFICACIÓN COMPLETA');
  console.log('========================================');
  console.log('\n✅ Para probar completamente:');
  console.log('   1. Asegúrate de tener usuarios con auth_uid vinculado');
  console.log('   2. Prueba desde tu aplicación frontend');
  console.log('   3. Verifica que cada usuario solo ve sus propios datos\n');
}

// Ejecutar
main().catch(console.error);

