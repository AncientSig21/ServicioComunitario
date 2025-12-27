/**
 * Script de verificación de políticas RLS usando la API de Supabase
 * Este script verifica el estado de las políticas RLS ejecutando consultas
 * 
 * USO:
 * node scripts/verificar-rls.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar credenciales
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
  console.log('⚠️  Usando valores por defecto del código\n');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('========================================');
console.log('VERIFICACIÓN DE POLÍTICAS RLS');
console.log('Sistema Gestión Condominial');
console.log('========================================\n');

// Tablas principales
const tablas = [
  'usuarios', 'condominios', 'viviendas', 'usuario_vivienda',
  'pagos', 'historial_pagos', 'anuncios', 'espacios_comunes',
  'reservas_espacios', 'solicitudes_mantenimiento', 'archivos',
  'notificaciones', 'ordenes', 'tipos_residencia'
];

async function verificarTabla(tabla) {
  try {
    // Intentar leer la tabla sin autenticación
    // Si RLS está activo, debería fallar o retornar vacío
    const { data, error, count } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Error de permisos significa que RLS está funcionando
      if (error.code === '42501' || 
          error.message.includes('permission denied') || 
          error.message.includes('row-level security') ||
          error.message.includes('RLS')) {
        return { estado: 'protegida', mensaje: 'RLS activo (consulta bloqueada)' };
      } else {
        return { estado: 'error', mensaje: error.message };
      }
    } else {
      // Si retorna datos sin error, RLS puede no estar activo
      return { estado: 'advertencia', mensaje: `Consulta exitosa (verifica RLS manualmente)` };
    }
  } catch (err) {
    return { estado: 'error', mensaje: err.message };
  }
}

async function verificarEstructura() {
  console.log('1. Verificando estructura de tablas...\n');

  const resultados = {};
  let protegidas = 0;
  let errores = 0;
  let advertencias = 0;

  for (const tabla of tablas) {
    const resultado = await verificarTabla(tabla);
    resultados[tabla] = resultado;

    switch (resultado.estado) {
      case 'protegida':
        console.log(`✅ ${tabla.padEnd(30)} - ${resultado.mensaje}`);
        protegidas++;
        break;
      case 'advertencia':
        console.log(`⚠️  ${tabla.padEnd(30)} - ${resultado.mensaje}`);
        advertencias++;
        break;
      case 'error':
        console.log(`❌ ${tabla.padEnd(30)} - ${resultado.mensaje}`);
        errores++;
        break;
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   ✅ Tablas protegidas: ${protegidas}`);
  console.log(`   ⚠️  Advertencias: ${advertencias}`);
  console.log(`   ❌ Errores: ${errores}`);
  console.log('');

  return { protegidas, advertencias, errores, resultados };
}

async function verificarDatos() {
  console.log('2. Verificando datos de usuarios...\n');

  try {
    // Intentar contar usuarios (esto puede fallar si RLS está activo y no estamos autenticados)
    const { count, error } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42501' || error.message.includes('permission')) {
        console.log('✅ RLS está bloqueando acceso a usuarios (correcto)');
        console.log('   Para ver datos, necesitas autenticarte primero\n');
      } else {
        console.log(`❌ Error: ${error.message}\n`);
      }
    } else {
      console.log(`ℹ️  Total de usuarios: ${count || 0}`);
      console.log('   (Si ves este mensaje, RLS puede no estar completamente activo)\n');
    }
  } catch (err) {
    console.log(`❌ Error al verificar usuarios: ${err.message}\n`);
  }
}

async function verificarAutenticacion() {
  console.log('3. Verificando autenticación...\n');

  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    console.log('✅ Hay una sesión activa');
    console.log(`   Usuario: ${session.user.email}`);
    console.log('');

    // Intentar leer datos como usuario autenticado
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol')
      .limit(5);

    if (error) {
      console.log(`⚠️  Error al leer usuarios: ${error.message}`);
    } else {
      console.log(`✅ Usuarios accesibles: ${usuarios?.length || 0}`);
      if (usuarios && usuarios.length > 0) {
        console.log('   Primeros usuarios:');
        usuarios.forEach(u => {
          console.log(`      - ${u.nombre} (${u.correo}) - Rol: ${u.rol || 'Pendiente'}`);
        });
      }
    }
  } else {
    console.log('ℹ️  No hay sesión activa');
    console.log('   Para probar completamente, necesitas autenticarte\n');
  }

  console.log('');
}

async function main() {
  try {
    // Verificar estructura
    const estructura = await verificarEstructura();

    // Verificar datos
    await verificarDatos();

    // Verificar autenticación
    await verificarAutenticacion();

    // Resumen final
    console.log('========================================');
    console.log('RESUMEN FINAL');
    console.log('========================================\n');

    if (estructura.protegidas >= 10) {
      console.log('✅ La mayoría de las tablas tienen RLS habilitado');
    } else {
      console.log('⚠️  Pocas tablas muestran protección RLS');
      console.log('   Esto puede significar:');
      console.log('   1. RLS no está habilitado en todas las tablas');
      console.log('   2. Las políticas permiten acceso anónimo');
      console.log('   3. Necesitas verificar desde Supabase Dashboard\n');
    }

    console.log('📝 Próximos pasos:');
    console.log('   1. Ve a Supabase Dashboard → SQL Editor');
    console.log('   2. Ejecuta el script: sql/verificar_rls_policies.sql');
    console.log('   3. Revisa los resultados detallados\n');

    console.log('💡 Nota:');
    console.log('   Las políticas RLS solo funcionan completamente cuando:');
    console.log('   - Estás autenticado con Supabase Auth');
    console.log('   - El campo auth_uid está vinculado correctamente');
    console.log('   - Las funciones auxiliares están creadas\n');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

main();

