/**
 * Script para corregir estados de usuarios existentes
 * Ejecuta el mantenimiento de usuarios para actualizar estados según pagos
 * 
 * Uso: node scripts/corregir-estados-usuarios.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_PROJECT_URL_SUPABASE;
const supabaseKey = process.env.VITE_SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'undefined' || supabaseKey === 'undefined') {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('Por favor, configura VITE_PROJECT_URL_SUPABASE y VITE_SUPABASE_API_KEY en tu archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corregirEstadosUsuarios() {
  try {
    console.log('🔄 Iniciando corrección de estados de usuarios...\n');

    const detalles = [];
    let actualizados = 0;
    let errores = 0;

    // 1. Obtener todos los usuarios (excepto administradores)
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nombre, estado, rol')
      .neq('rol', 'admin')
      .neq('rol', 'Administrador');

    if (usuariosError) {
      throw new Error(`Error obteniendo usuarios: ${usuariosError.message}`);
    }

    if (!usuarios || usuarios.length === 0) {
      console.log('ℹ️  No hay usuarios para procesar');
      return {
        total: 0,
        actualizados: 0,
        errores: 0,
        detalles: []
      };
    }

    console.log(`📊 Procesando ${usuarios.length} usuarios...\n`);

    // 2. Para cada usuario, verificar sus pagos
    for (const usuario of usuarios) {
      try {
        // Verificar si tiene pagos vencidos (estos determinan si es moroso)
        const { data: pagosVencidos } = await supabase
          .from('pagos')
          .select('id')
          .eq('usuario_id', usuario.id)
          .eq('estado', 'vencido')
          .limit(1);

        // Si tiene pagos vencidos, debe ser 'Moroso'
        // Si no tiene pagos vencidos, debe ser 'Activo' (aunque tenga pagos pendientes, aún no son deudas)
        const estadoCorrecto = (pagosVencidos && pagosVencidos.length > 0) ? 'Moroso' : 'Activo';
        const estadoAnterior = usuario.estado || 'Activo';

        // Solo actualizar si el estado es diferente
        if (estadoAnterior !== estadoCorrecto) {
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ 
              estado: estadoCorrecto,
              updated_at: new Date().toISOString()
            })
            .eq('id', usuario.id);

          if (updateError) {
            console.error(`❌ Error actualizando usuario ${usuario.id}:`, updateError.message);
            errores++;
          } else {
            console.log(`✅ Usuario ${usuario.nombre} (ID: ${usuario.id}): ${estadoAnterior} → ${estadoCorrecto}`);
            detalles.push({
              usuario_id: usuario.id,
              nombre: usuario.nombre,
              estado_anterior: estadoAnterior,
              estado_nuevo: estadoCorrecto
            });
            actualizados++;
          }
        } else {
          console.log(`✓ Usuario ${usuario.nombre} (ID: ${usuario.id}): estado correcto (${estadoAnterior})`);
        }
      } catch (error) {
        console.error(`❌ Error procesando usuario ${usuario.id}:`, error.message);
        errores++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));
    console.log(`Total de usuarios procesados: ${usuarios.length}`);
    console.log(`Usuarios actualizados: ${actualizados}`);
    console.log(`Errores: ${errores}`);
    console.log('='.repeat(60) + '\n');

    return {
      total: usuarios.length,
      actualizados,
      errores,
      detalles
    };
  } catch (error) {
    console.error('❌ Error en corregirEstadosUsuarios:', error.message);
    throw error;
  }
}

// Ejecutar
corregirEstadosUsuarios()
  .then(() => {
    console.log('✅ Corrección completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });


