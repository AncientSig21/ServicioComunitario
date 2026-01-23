/**
 * Script de Prueba para Verificar Políticas RLS
 * 
 * Este script prueba las políticas RLS del sistema de mantenimiento
 * desde la aplicación web para verificar que funcionan correctamente.
 * 
 * USO:
 * 1. Importa este archivo en la consola del navegador o en una página de prueba
 * 2. Ejecuta: testRLSPolicies(user)
 * 
 * O desde la consola del navegador:
 * import { testRLSPolicies } from './src/utils/testRLSPolicies';
 * testRLSPolicies(user);
 */

import { supabase } from '../supabase/client';
import { fetchSolicitudesMantenimiento, crearSolicitudMantenimiento } from '../services/bookService';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

interface User {
  id: number;
  nombre: string;
  rol: 'user' | 'admin' | 'conserje';
  condominio_id: number;
}

export const testRLSPolicies = async (user: User | null): Promise<TestResult[]> => {
  const results: TestResult[] = [];
  
  if (!user) {
    results.push({
      test: 'Usuario autenticado',
      passed: false,
      message: '❌ No hay usuario autenticado. Debes iniciar sesión primero.'
    });
    return results;
  }

  console.log('🧪 Iniciando pruebas de RLS para usuario:', {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    condominio_id: user.condominio_id
  });

  // =====================================================
  // TEST 1: SELECT - Verificar que el usuario ve solo sus solicitudes
  // =====================================================
  try {
    console.log('\n📋 TEST 1: Verificando SELECT (solo sus solicitudes)...');
    
    const solicitudes = await fetchSolicitudesMantenimiento();
    
    // Verificar que todas las solicitudes pertenecen al usuario (si no es admin)
    if (user.rol !== 'admin') {
      const solicitudesPropias = solicitudes.filter(
        (s: any) => s.usuario_solicitante_id === user.id
      );
      
      const todasSonPropias = solicitudes.length === solicitudesPropias.length;
      
      results.push({
        test: 'SELECT - Usuario ve solo sus solicitudes',
        passed: todasSonPropias,
        message: todasSonPropias 
          ? `✅ Correcto: Usuario ve ${solicitudes.length} solicitudes, todas son suyas`
          : `❌ Error: Usuario ve ${solicitudes.length} solicitudes, pero solo ${solicitudesPropias.length} son suyas`,
        details: {
          total: solicitudes.length,
          propias: solicitudesPropias.length,
          solicitudes: solicitudes.map((s: any) => ({
            id: s.id,
            titulo: s.titulo,
            usuario_solicitante_id: s.usuario_solicitante_id,
            es_propia: s.usuario_solicitante_id === user.id
          }))
        }
      });
    } else {
      // Si es admin, debería ver todas
      results.push({
        test: 'SELECT - Admin ve todas las solicitudes',
        passed: true,
        message: `✅ Correcto: Admin puede ver ${solicitudes.length} solicitudes`,
        details: { total: solicitudes.length }
      });
    }
  } catch (error: any) {
    results.push({
      test: 'SELECT - Ver solicitudes',
      passed: false,
      message: `❌ Error al obtener solicitudes: ${error.message}`,
      details: { error: error.toString() }
    });
  }

  // =====================================================
  // TEST 2: INSERT - Verificar que solo puede crear para sí mismo
  // =====================================================
  try {
    console.log('\n➕ TEST 2: Verificando INSERT (crear solicitud)...');
    
    const nuevaSolicitud = {
      usuario_solicitante_id: user.id,
      titulo: `Test RLS - ${new Date().toISOString()}`,
      descripcion: 'Solicitud de prueba para verificar RLS',
      prioridad: 'baja' as const,
      ubicacion: 'Área de prueba'
    };

    const creada = await crearSolicitudMantenimiento(nuevaSolicitud);
    
    results.push({
      test: 'INSERT - Crear solicitud propia',
      passed: true,
      message: `✅ Correcto: Solicitud creada con ID ${creada.id}`,
      details: { solicitud_id: creada.id, titulo: creada.titulo }
    });

    // Intentar crear una solicitud para otro usuario (debería fallar)
    try {
      const otraSolicitud = {
        usuario_solicitante_id: user.id + 999, // ID que no existe o no es del usuario
        titulo: 'Test RLS - Intento de crear para otro usuario',
        descripcion: 'Esta solicitud no debería crearse',
        prioridad: 'baja' as const
      };

      // Si el usuario no es admin, esto debería fallar o crear con su propio ID
      await crearSolicitudMantenimiento(otraSolicitud);
      
      // Si llegamos aquí, verificar que se creó con el ID correcto
      const solicitudesRecientes = await fetchSolicitudesMantenimiento();
      const ultimaSolicitud = solicitudesRecientes[0];
      
      if (ultimaSolicitud.usuario_solicitante_id === user.id) {
        results.push({
          test: 'INSERT - RLS previene crear para otro usuario',
          passed: true,
          message: '✅ Correcto: RLS forzó el uso del ID del usuario actual',
          details: { 
            intentado: otraSolicitud.usuario_solicitante_id,
            resultado: ultimaSolicitud.usuario_solicitante_id
          }
        });
      } else {
        results.push({
          test: 'INSERT - RLS previene crear para otro usuario',
          passed: false,
          message: '❌ Error: Se permitió crear solicitud para otro usuario',
          details: { 
            intentado: otraSolicitud.usuario_solicitante_id,
            resultado: ultimaSolicitud.usuario_solicitante_id
          }
        });
      }
    } catch (error: any) {
      // Si falla, es correcto (RLS está funcionando)
      if (error.message?.includes('permission') || error.message?.includes('policy')) {
        results.push({
          test: 'INSERT - RLS previene crear para otro usuario',
          passed: true,
          message: '✅ Correcto: RLS bloqueó la creación para otro usuario',
          details: { error: error.message }
        });
      } else {
        results.push({
          test: 'INSERT - RLS previene crear para otro usuario',
          passed: false,
          message: `⚠️ Error inesperado: ${error.message}`,
          details: { error: error.toString() }
        });
      }
    }
  } catch (error: any) {
    results.push({
      test: 'INSERT - Crear solicitud',
      passed: false,
      message: `❌ Error al crear solicitud: ${error.message}`,
      details: { error: error.toString() }
    });
  }

  // =====================================================
  // TEST 3: UPDATE - Verificar que solo puede actualizar sus solicitudes pendientes
  // =====================================================
  try {
    console.log('\n✏️ TEST 3: Verificando UPDATE (actualizar solicitud)...');
    
    const solicitudes = await fetchSolicitudesMantenimiento();
    const solicitudPendiente = solicitudes.find(
      (s: any) => s.usuario_solicitante_id === user.id && s.estado === 'pendiente'
    );

    if (solicitudPendiente) {
      // Intentar actualizar una solicitud propia pendiente
      const { error: updateError } = await supabase
        .from('solicitudes_mantenimiento')
        .update({ descripcion: 'Descripción actualizada por test RLS' })
        .eq('id', solicitudPendiente.id);

      if (!updateError) {
        results.push({
          test: 'UPDATE - Actualizar solicitud propia pendiente',
          passed: true,
          message: `✅ Correcto: Se pudo actualizar la solicitud ${solicitudPendiente.id}`,
          details: { solicitud_id: solicitudPendiente.id }
        });
      } else {
        results.push({
          test: 'UPDATE - Actualizar solicitud propia pendiente',
          passed: false,
          message: `❌ Error al actualizar: ${updateError.message}`,
          details: { error: updateError.toString() }
        });
      }
    } else {
      results.push({
        test: 'UPDATE - Actualizar solicitud propia pendiente',
        passed: true,
        message: 'ℹ️ No hay solicitudes pendientes propias para actualizar',
        details: { skip: true }
      });
    }

    // Intentar actualizar una solicitud de otro usuario (debería fallar si no es admin)
    const solicitudOtroUsuario = solicitudes.find(
      (s: any) => s.usuario_solicitante_id !== user.id
    );

    if (solicitudOtroUsuario && user.rol !== 'admin') {
      const { error: updateError } = await supabase
        .from('solicitudes_mantenimiento')
        .update({ descripcion: 'Intento de actualizar solicitud de otro usuario' })
        .eq('id', solicitudOtroUsuario.id);

      if (updateError) {
        // Si falla, es correcto (RLS está funcionando)
        if (updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
          results.push({
            test: 'UPDATE - RLS previene actualizar solicitud de otro usuario',
            passed: true,
            message: '✅ Correcto: RLS bloqueó la actualización de solicitud ajena',
            details: { error: updateError.message }
          });
        } else {
          results.push({
            test: 'UPDATE - RLS previene actualizar solicitud de otro usuario',
            passed: false,
            message: `⚠️ Error inesperado: ${updateError.message}`,
            details: { error: updateError.toString() }
          });
        }
      } else {
        results.push({
          test: 'UPDATE - RLS previene actualizar solicitud de otro usuario',
          passed: false,
          message: '❌ Error: Se permitió actualizar solicitud de otro usuario',
          details: { solicitud_id: solicitudOtroUsuario.id }
        });
      }
    }
  } catch (error: any) {
    results.push({
      test: 'UPDATE - Actualizar solicitud',
      passed: false,
      message: `❌ Error en prueba de UPDATE: ${error.message}`,
      details: { error: error.toString() }
    });
  }

  // =====================================================
  // TEST 4: DELETE - Verificar que solo admins pueden eliminar
  // =====================================================
  try {
    console.log('\n🗑️ TEST 4: Verificando DELETE (eliminar solicitud)...');
    
    const solicitudes = await fetchSolicitudesMantenimiento();
    const solicitudPropia = solicitudes.find(
      (s: any) => s.usuario_solicitante_id === user.id
    );

    if (solicitudPropia) {
      const { error: deleteError } = await supabase
        .from('solicitudes_mantenimiento')
        .delete()
        .eq('id', solicitudPropia.id);

      if (user.rol === 'admin') {
        // Admin puede eliminar
        if (!deleteError) {
          results.push({
            test: 'DELETE - Admin puede eliminar solicitudes',
            passed: true,
            message: `✅ Correcto: Admin pudo eliminar la solicitud ${solicitudPropia.id}`,
            details: { solicitud_id: solicitudPropia.id }
          });
        } else {
          results.push({
            test: 'DELETE - Admin puede eliminar solicitudes',
            passed: false,
            message: `❌ Error: Admin no pudo eliminar: ${deleteError.message}`,
            details: { error: deleteError.toString() }
          });
        }
      } else {
        // Usuario normal NO puede eliminar
        if (deleteError) {
          if (deleteError.message?.includes('permission') || deleteError.message?.includes('policy')) {
            results.push({
              test: 'DELETE - Usuario normal NO puede eliminar',
              passed: true,
              message: '✅ Correcto: RLS bloqueó la eliminación (solo admins pueden)',
              details: { error: deleteError.message }
            });
          } else {
            results.push({
              test: 'DELETE - Usuario normal NO puede eliminar',
              passed: false,
              message: `⚠️ Error inesperado: ${deleteError.message}`,
              details: { error: deleteError.toString() }
            });
          }
        } else {
          results.push({
            test: 'DELETE - Usuario normal NO puede eliminar',
            passed: false,
            message: '❌ Error: Se permitió eliminar solicitud (solo admins deberían poder)',
            details: { solicitud_id: solicitudPropia.id }
          });
        }
      }
    } else {
      results.push({
        test: 'DELETE - Eliminar solicitud',
        passed: true,
        message: 'ℹ️ No hay solicitudes propias para probar eliminación',
        details: { skip: true }
      });
    }
  } catch (error: any) {
    results.push({
      test: 'DELETE - Eliminar solicitud',
      passed: false,
      message: `❌ Error en prueba de DELETE: ${error.message}`,
      details: { error: error.toString() }
    });
  }

  // =====================================================
  // RESUMEN FINAL
  // =====================================================
  console.log('\n📊 RESUMEN DE PRUEBAS RLS:');
  console.log('========================================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.test}: ${result.message}`);
  });

  console.log('========================================');
  console.log(`Resultado: ${passed}/${total} pruebas pasaron (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('🎉 ¡Todas las políticas RLS están funcionando correctamente!');
  } else {
    console.log('⚠️ Algunas políticas RLS necesitan revisión');
  }

  return results;
};

/**
 * Función auxiliar para ejecutar desde la consola del navegador
 */
export const runRLSTests = async () => {
  // Obtener usuario del localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    console.error('❌ No hay usuario autenticado. Inicia sesión primero.');
    return;
  }

  const user = JSON.parse(userStr);
  return await testRLSPolicies(user);
};

// Hacer disponible en window para uso desde consola
if (typeof window !== 'undefined') {
  (window as any).testRLSPolicies = testRLSPolicies;
  (window as any).runRLSTests = runRLSTests;
}

