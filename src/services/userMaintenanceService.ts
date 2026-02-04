/**
 * Servicio para mantenimiento y limpieza de datos de usuarios
 * Asegura que los usuarios existentes tengan el estado correcto según sus pagos
 */

import { supabase } from '../supabase/client';
import { isSupabaseConfigured } from './authService';
import { ejecutarActualizarUsuariosMorosos } from './bookService';

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
    // El enum role_enum solo admite: admin, propietario, residente, conserje, invitado (no "Administrador")
    const { data: usuariosRaw, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nombre, Estado, rol')
      .neq('rol', 'admin');

    if (usuariosError) {
      throw new Error(`Error obteniendo usuarios: ${usuariosError.message}`);
    }

    // Excluir también rol legacy "Administrador" si viniera como texto (filtrar en JS)
    const usuarios = (usuariosRaw || []).filter(
      (u: { rol?: string | null }) => (u.rol || '').toLowerCase() !== 'administrador'
    );

    if (!usuarios || usuarios.length === 0) {
      return {
        total: 0,
        actualizados: 0,
        errores: 0,
        detalles: []
      };
    }

    console.log(`🔍 Procesando ${usuarios.length} usuarios...`);

    // Fecha de hoy en YYYY-MM-DD (fecha local, no UTC) para comparar con fecha_vencimiento
    const now = new Date();
    const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 2. Para cada usuario, verificar sus pagos
    for (const usuario of usuarios) {
      try {
        // Traer pagos pendientes o vencidos del usuario y filtrar en JS por fecha vencida
        const { data: pagosPendientesVencidos, error: errorPagos } = await supabase
          .from('pagos')
          .select('id, fecha_vencimiento')
          .eq('usuario_id', usuario.id)
          .in('estado', ['pendiente', 'vencido']);

        if (errorPagos) {
          console.warn(`⚠️ Error obteniendo pagos del usuario ${usuario.id}:`, errorPagos.message);
        }

        const tieneCuotaVencida = (pagosPendientesVencidos || []).some((p: { fecha_vencimiento?: string | null }) => {
          const fv = p.fecha_vencimiento;
          if (!fv) return false;
          const fvStr = typeof fv === 'string' ? fv.split('T')[0] : fv;
          return fvStr < hoy;
        });

        const estadoCorrecto = tieneCuotaVencida ? 'Moroso' : 'Activo';
        const u = usuario as { Estado?: string; estado?: string };
        const estadoAnterior = u.Estado ?? u.estado ?? 'Activo';

        if (estadoAnterior !== estadoCorrecto) {
          // Actualizar la columna que exista en la BD (Estado o estado)
          const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (u.Estado !== undefined) updatePayload.Estado = estadoCorrecto;
          else updatePayload.estado = estadoCorrecto;

          const { error: updateError } = await supabase
            .from('usuarios')
            .update(updatePayload)
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

  // 1. Llamar primero a la función de BD que marca morosos (no depende de RLS en la app)
  try {
    await ejecutarActualizarUsuariosMorosos();
    console.log('   ✓ Función de BD actualizar_usuarios_morosos() ejecutada (cuotas vencidas → Moroso)');
  } catch (e) {
    console.warn('   ⚠ No se pudo ejecutar actualizar_usuarios_morosos (¿función creada en la BD?):', e);
  }

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

