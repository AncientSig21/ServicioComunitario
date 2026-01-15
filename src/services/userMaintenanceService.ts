/**
 * Servicio para mantenimiento y limpieza de datos de usuarios
 * Asegura que los usuarios existentes tengan el estado correcto según sus pagos
 */

import { supabase } from '../supabase/client';

/**
 * Corrige el estado de todos los usuarios existentes basándose en sus pagos
 * - Si no tienen pagos pendientes/vencidos: estado = 'Activo'
 * - Si tienen pagos vencidos: estado = 'Moroso'
 * - Si solo tienen pagos pendientes: estado = 'Activo' (aún no vencidos)
 */
export const corregirEstadosUsuarios = async (): Promise<{
  total: number;
  actualizados: number;
  errores: number;
  detalles: Array<{ usuario_id: number; nombre: string; estado_anterior: string; estado_nuevo: string }>;
}> => {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase no está configurado. No se puede ejecutar el mantenimiento.');
    }

    const detalles: Array<{ usuario_id: number; nombre: string; estado_anterior: string; estado_nuevo: string }> = [];
    let actualizados = 0;
    let errores = 0;

    // 1. Obtener todos los usuarios (excepto administradores)
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nombre, Estado, rol')
      .neq('rol', 'admin')
      .neq('rol', 'Administrador');

    if (usuariosError) {
      throw new Error(`Error obteniendo usuarios: ${usuariosError.message}`);
    }

    if (!usuarios || usuarios.length === 0) {
      return {
        total: 0,
        actualizados: 0,
        errores: 0,
        detalles: []
      };
    }

    console.log(`🔍 Procesando ${usuarios.length} usuarios...`);

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
        const estadoAnterior = usuario.Estado || 'Activo';

        // Solo actualizar si el estado es diferente
        if (estadoAnterior !== estadoCorrecto) {
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ 
              Estado: estadoCorrecto,
              updated_at: new Date().toISOString()
            })
            .eq('id', usuario.id);

          if (updateError) {
            console.error(`❌ Error actualizando usuario ${usuario.id}:`, updateError);
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
      } catch (error: any) {
        console.error(`❌ Error procesando usuario ${usuario.id}:`, error);
        errores++;
      }
    }

    return {
      total: usuarios.length,
      actualizados,
      errores,
      detalles
    };
  } catch (error: any) {
    console.error('Error en corregirEstadosUsuarios:', error);
    throw error;
  }
};

/**
 * Elimina pagos automáticos o duplicados de usuarios nuevos
 * Los pagos deben ser creados solo por administradores
 */
export const limpiarPagosAutomaticos = async (): Promise<{
  eliminados: number;
  errores: number;
}> => {
  try {
    // Esta función podría implementarse para eliminar pagos creados automáticamente
    // Por ahora, solo retornamos un objeto vacío ya que no hay lógica para identificar pagos automáticos
    // En el futuro, podría agregarse un campo 'creado_automaticamente' o similar
    
    console.log('⚠️ Limpieza de pagos automáticos: No implementada (no hay pagos automáticos actualmente)');
    
    return {
      eliminados: 0,
      errores: 0
    };
  } catch (error: any) {
    console.error('Error en limpiarPagosAutomaticos:', error);
    throw error;
  }
};

/**
 * Función principal para ejecutar todas las correcciones
 */
export const ejecutarMantenimientoUsuarios = async (): Promise<{
  estados: Awaited<ReturnType<typeof corregirEstadosUsuarios>>;
  pagos: Awaited<ReturnType<typeof limpiarPagosAutomaticos>>;
}> => {
  console.log('🔄 Iniciando mantenimiento de usuarios...');
  
  const estados = await corregirEstadosUsuarios();
  const pagos = await limpiarPagosAutomaticos();
  
  console.log('✅ Mantenimiento completado');
  console.log(`   - Estados corregidos: ${estados.actualizados}/${estados.total}`);
  console.log(`   - Errores: ${estados.errores}`);
  
  return {
    estados,
    pagos
  };
};

