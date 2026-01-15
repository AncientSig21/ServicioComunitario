/**
 * Script para eliminar el condominio "San Martín" y todas sus viviendas asociadas
 * 
 * Este script:
 * 1. Busca el condominio "San Martín"
 * 2. Encuentra todas las viviendas asociadas
 * 3. Elimina las relaciones usuario_vivienda
 * 4. Elimina los pagos asociados a las viviendas
 * 5. Elimina las viviendas
 * 6. Actualiza usuarios para remover la referencia al condominio
 * 7. Elimina el condominio
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
        if (key === 'VITE_SUPABASE_URL' || key === 'VITE_PROJECT_URL_SUPABASE') {
          supabaseUrl = value;
        } else if (key === 'VITE_SUPABASE_ANON_KEY') {
          supabaseAnonKey = value;
        }
      }
    }
  });
} catch (error) {
  console.log('⚠️  No se pudo cargar .env, usando valores por defecto\n');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function eliminarSanMartin() {
  try {
    console.log('🔍 Buscando condominio "San Martín"...\n');

    // 1. Buscar el condominio "San Martín"
    const { data: condominio, error: errorCondominio } = await supabase
      .from('condominios')
      .select('id, nombre')
      .ilike('nombre', 'San Martín')
      .single();

    if (errorCondominio || !condominio) {
      console.log('ℹ️  No se encontró el condominio "San Martín" en la base de datos.');
      console.log('   Puede que ya haya sido eliminado o no exista.\n');
      return;
    }

    console.log(`✅ Condominio encontrado: ID=${condominio.id}, Nombre="${condominio.nombre}"\n`);

    const condominioId = condominio.id;

    // 2. Buscar todas las viviendas asociadas
    console.log('🔍 Buscando viviendas asociadas...');
    const { data: viviendas, error: errorViviendas } = await supabase
      .from('viviendas')
      .select('id, numero_apartamento')
      .eq('condominio_id', condominioId);

    if (errorViviendas) {
      throw new Error(`Error al buscar viviendas: ${errorViviendas.message}`);
    }

    const viviendaIds = viviendas?.map(v => v.id) || [];
    console.log(`✅ Encontradas ${viviendaIds.length} viviendas asociadas\n`);

    if (viviendaIds.length > 0) {
      // 3. Buscar relaciones usuario_vivienda
      console.log('🔍 Buscando relaciones usuario_vivienda...');
      const { data: relaciones, error: errorRelaciones } = await supabase
        .from('usuario_vivienda')
        .select('id, usuario_id, vivienda_id')
        .in('vivienda_id', viviendaIds);

      if (errorRelaciones) {
        throw new Error(`Error al buscar relaciones: ${errorRelaciones.message}`);
      }

      console.log(`✅ Encontradas ${relaciones?.length || 0} relaciones usuario_vivienda\n`);

      // 4. Buscar pagos asociados a las viviendas
      console.log('🔍 Buscando pagos asociados...');
      const { data: pagos, error: errorPagos } = await supabase
        .from('pagos')
        .select('id')
        .in('vivienda_id', viviendaIds);

      if (errorPagos) {
        throw new Error(`Error al buscar pagos: ${errorPagos.message}`);
      }

      console.log(`✅ Encontrados ${pagos?.length || 0} pagos asociados\n`);

      // 5. Eliminar pagos (si existen)
      if (pagos.length > 0) {
        const pagoIds = pagos.map(p => p.id);
        
        // Primero eliminar historial_pagos asociados
        console.log('🗑️  Eliminando historial de pagos...');
        const { error: errorDeleteHistorial } = await supabase
          .from('historial_pagos')
          .delete()
          .in('pago_id', pagoIds);

        if (errorDeleteHistorial) {
          throw new Error(`Error al eliminar historial de pagos: ${errorDeleteHistorial.message}`);
        }
        console.log(`✅ Historial de pagos eliminado\n`);

        // Luego eliminar los pagos
        console.log('🗑️  Eliminando pagos...');
        const { error: errorDeletePagos } = await supabase
          .from('pagos')
          .delete()
          .in('vivienda_id', viviendaIds);

        if (errorDeletePagos) {
          throw new Error(`Error al eliminar pagos: ${errorDeletePagos.message}`);
        }
        console.log(`✅ ${pagos.length} pagos eliminados\n`);
      }

      // 6. Eliminar relaciones usuario_vivienda
      if (relaciones.length > 0) {
        console.log('🗑️  Eliminando relaciones usuario_vivienda...');
        const { error: errorDeleteRelaciones } = await supabase
          .from('usuario_vivienda')
          .delete()
          .in('vivienda_id', viviendaIds);

        if (errorDeleteRelaciones) {
          throw new Error(`Error al eliminar relaciones: ${errorDeleteRelaciones.message}`);
        }
        console.log(`✅ ${relaciones.length} relaciones eliminadas\n`);
      }

      // 7. Eliminar viviendas
      console.log('🗑️  Eliminando viviendas...');
      const { error: errorDeleteViviendas } = await supabase
        .from('viviendas')
        .delete()
        .eq('condominio_id', condominioId);

      if (errorDeleteViviendas) {
        throw new Error(`Error al eliminar viviendas: ${errorDeleteViviendas.message}`);
      }
      console.log(`✅ ${viviendaIds.length} viviendas eliminadas\n`);
    }

    // 8. Actualizar usuarios para remover referencia al condominio
    console.log('🔍 Buscando usuarios asociados al condominio...');
    const { data: usuariosData, error: errorUsuarios } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('condominio_id', condominioId);

    if (errorUsuarios) {
      throw new Error(`Error al buscar usuarios: ${errorUsuarios.message}`);
    }

    const usuarios = usuariosData || [];
    if (usuarios.length > 0) {
      console.log(`✅ Encontrados ${usuarios.length} usuarios asociados\n`);
      console.log('🔄 Actualizando usuarios para remover referencia al condominio...');
      
      const { error: errorUpdateUsuarios } = await supabase
        .from('usuarios')
        .update({ condominio_id: null })
        .eq('condominio_id', condominioId);

      if (errorUpdateUsuarios) {
        throw new Error(`Error al actualizar usuarios: ${errorUpdateUsuarios.message}`);
      }
      console.log(`✅ ${usuarios.length} usuarios actualizados (condominio_id = null)\n`);
    }

    // 9. Eliminar el condominio
    console.log('🗑️  Eliminando condominio "San Martín"...');
    const { error: errorDeleteCondominio } = await supabase
      .from('condominios')
      .delete()
      .eq('id', condominioId);

    if (errorDeleteCondominio) {
      throw new Error(`Error al eliminar condominio: ${errorDeleteCondominio.message}`);
    }

    console.log('✅ Condominio "San Martín" eliminado exitosamente\n');

    // Resumen
    console.log('📊 RESUMEN DE ELIMINACIÓN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   • Condominio eliminado: 1`);
    console.log(`   • Viviendas eliminadas: ${viviendaIds.length}`);
    
    // Obtener conteos para el resumen
    const relacionesCount = relaciones.length || 0;
    const pagosCount = pagos.length || 0;
    const usuariosCount = usuarios.length || 0;
    
    console.log(`   • Relaciones eliminadas: ${relacionesCount}`);
    console.log(`   • Pagos eliminados: ${pagosCount}`);
    console.log(`   • Usuarios actualizados: ${usuariosCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error durante la eliminación:');
    console.error(`   ${error.message}\n`);
    console.error('⚠️  Si el error es por RLS (Row Level Security),');
    console.error('   necesitarás ejecutar esto desde el SQL Editor de Supabase\n');
    process.exit(1);
  }
}

// Ejecutar el script
eliminarSanMartin();

