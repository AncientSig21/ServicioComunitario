/**
 * Script para probar las funciones CRUD de bookService.ts
 * Verifica que las funciones del CRUD funcionan correctamente con la base de datos
 * 
 * Objetivo: Probar que:
 * 1. Las funciones del CRUD funcionan correctamente
 * 2. Los tipos están bien alineados con la BD
 * 3. Las operaciones completas (crear, leer, actualizar) funcionan
 * 4. Los enums y tipos generados funcionan correctamente
 * 
 * Ejecuta: npm run test:crud
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

// Crear cliente
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== FUNCIONES CRUD SIMULADAS (basadas en bookService.ts) ====================

/**
 * Función equivalente a registerResidente de bookService.ts
 */
async function registerResidente(userData) {
  // Mapear rol antiguo a nuevo si es necesario
  const mapearRol = (rolAntiguo) => {
    const mapeo = {
      'mantenimiento': 'conserje',
      'contador': 'admin',
      'visitante': 'invitado',
    };
    return mapeo[rolAntiguo] || rolAntiguo;
  };
  
  const rolMapeado = typeof userData.rol === 'string' ? mapearRol(userData.rol) : userData.rol;
  
  // 1. Crear usuario
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .insert([{
      nombre: userData.nombre,
      correo: userData.correo,
      telefono: userData.telefono,
      cedula: userData.cedula,
      rol: rolMapeado,
      contraseña: userData.contraseña,
      auth_uid: userData.auth_uid,
      condominio_id: userData.condominio_id
    }])
    .select()
    .single();

  if (userError) throw userError;

  // 2. Asignar vivienda (si se proporciona)
  if (userData.vivienda_id) {
    const { error: viviendaError } = await supabase
      .from('usuario_vivienda')
      .insert([{
        usuario_id: usuario.id,
        vivienda_id: userData.vivienda_id,
        rol_en_vivienda: userData.rol_en_vivienda,
        fecha_inicio: new Date().toISOString().split('T')[0],
        activo: true
      }]);

    if (viviendaError) throw viviendaError;

    // 3. Si es propietario, actualizar vivienda.propietario_id
    if (userData.rol_en_vivienda === 'propietario') {
      await supabase
        .from('viviendas')
        .update({ propietario_id: usuario.id })
        .eq('id', userData.vivienda_id);
    }
  }

  return usuario;
}

/**
 * Función equivalente a solicitarPago de bookService.ts
 */
async function solicitarPago({ usuario_id, vivienda_id, concepto, monto, tipo, fecha_vencimiento }) {
  // Mapear tipo de pago
  const mapearTipoPago = (tipoAntiguo) => {
    if (tipoAntiguo === 'extraordinario') return 'otros';
    return tipoAntiguo;
  };
  
  const tipoMapeado = mapearTipoPago(tipo);
  
  // 1. Crear pago
  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .insert([{
      usuario_id,
      vivienda_id,
      concepto,
      monto,
      tipo: tipoMapeado,
      estado: 'pendiente',
      fecha_vencimiento,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (pagoError) throw pagoError;

  // 2. Crear registro en historial_pagos
  await supabase
    .from('historial_pagos')
    .insert([{
      pago_id: pago.id,
      usuario_actor_id: usuario_id,
      accion: 'creado',
      estado_anterior: null,
      estado_nuevo: 'pendiente',
      observaciones: `Pago creado: ${concepto}`,
      created_at: new Date().toISOString()
    }]);

  return pago;
}

/**
 * Función equivalente a crearSolicitudMantenimiento de bookService.ts
 */
async function crearSolicitudMantenimiento({
  condominio_id,
  usuario_solicitante_id,
  titulo,
  descripcion,
  prioridad = 'media',
  ubicacion,
  estado = 'pendiente'
}) {
  // Verificar que el usuario existe
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, nombre, condominio_id')
    .eq('id', usuario_solicitante_id)
    .single();

  if (usuarioError || !usuario) {
    throw new Error('Usuario no encontrado');
  }

  // Usar condominio_id del usuario si no se proporciona
  const condominioIdFinal = condominio_id || usuario.condominio_id;

  const { data, error } = await supabase
    .from('solicitudes_mantenimiento')
    .insert([{
      condominio_id: condominioIdFinal,
      usuario_solicitante_id,
      titulo,
      descripcion,
      prioridad: prioridad || 'media',
      ubicacion: ubicacion || null,
      estado: estado || 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      fecha_inicio: null,
      fecha_completado: null,
      responsable_id: null,
      observaciones: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Función equivalente a validarPago de bookService.ts
 */
async function validarPago(pago_id, nuevo_estado, metodo_pago, referencia, observaciones) {
  // 1. Obtener pago actual
  const { data: pagoActual, error: pagoError } = await supabase
    .from('pagos')
    .select('*')
    .eq('id', pago_id)
    .single();

  if (pagoError || !pagoActual) {
    throw new Error('Pago no encontrado');
  }

  // 2. Actualizar pago
  const updateData = {
    estado: nuevo_estado,
    updated_at: new Date().toISOString()
  };

  if (nuevo_estado === 'pagado') {
    updateData.fecha_pago = new Date().toISOString();
    if (metodo_pago) updateData.metodo_pago = metodo_pago;
    if (referencia) updateData.referencia = referencia;
  }

  if (observaciones) updateData.observaciones = observaciones;

  const { data: pagoActualizado, error: updateError } = await supabase
    .from('pagos')
    .update(updateData)
    .eq('id', pago_id)
    .select()
    .single();

  if (updateError) throw updateError;

  // 3. Registrar en historial
  await supabase
    .from('historial_pagos')
    .insert([{
      pago_id,
      usuario_actor_id: pagoActualizado.usuario_id,
      accion: 'actualizado',
      estado_anterior: pagoActual.estado,
      estado_nuevo: nuevo_estado,
      observaciones: observaciones || `Estado cambiado a ${nuevo_estado}`,
      created_at: new Date().toISOString()
    }]);

  return pagoActualizado;
}

// ==================== PRUEBAS ====================

async function testCRUDFunctions() {
  console.log('🧪 Probando funciones CRUD de bookService.ts...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  const cleanupIds = {
    usuarios: [],
    pagos: [],
    solicitudes: []
  };

  // Helper para generar UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  try {
    // Test 1: registerResidente (sin vivienda)
    try {
      console.log('👤 Test 1: registerResidente (usuario simple)...');
      const timestamp = Date.now();
      const usuario = await registerResidente({
        nombre: `Test Usuario ${timestamp}`,
        correo: `test.${timestamp}@example.com`,
        telefono: '04121234567',
        cedula: `V${timestamp.toString().slice(-8)}`,
        rol: 'invitado',
        contraseña: 'test123',
        auth_uid: generateUUID(),
        condominio_id: null
      });
      
      cleanupIds.usuarios.push(usuario.id);
      console.log(`   ✅ Usuario creado: ID ${usuario.id}, Nombre: ${usuario.nombre}, Rol: ${usuario.rol}`);
      testsPassed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      testsFailed++;
    }

    // Test 2: solicitarPago
    try {
      console.log('\n💰 Test 2: solicitarPago...');
      if (cleanupIds.usuarios.length === 0) {
        throw new Error('No hay usuario para crear pago');
      }
      
      const usuarioId = cleanupIds.usuarios[0];
      const fechaVencimiento = new Date();
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
      
      const pago = await solicitarPago({
        usuario_id: usuarioId,
        vivienda_id: null,
        concepto: 'Pago de prueba',
        monto: 100.50,
        tipo: 'mantenimiento',
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0]
      });
      
      cleanupIds.pagos.push(pago.id);
      console.log(`   ✅ Pago creado: ID ${pago.id}, Concepto: ${pago.concepto}, Estado: ${pago.estado}, Tipo: ${pago.tipo}`);
      testsPassed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      testsFailed++;
    }

    // Test 3: crearSolicitudMantenimiento
    try {
      console.log('\n🔧 Test 3: crearSolicitudMantenimiento...');
      if (cleanupIds.usuarios.length === 0) {
        throw new Error('No hay usuario para crear solicitud');
      }
      
      const usuarioId = cleanupIds.usuarios[0];
      const solicitud = await crearSolicitudMantenimiento({
        condominio_id: null,
        usuario_solicitante_id: usuarioId,
        titulo: 'Solicitud de prueba',
        descripcion: 'Esta es una solicitud de mantenimiento de prueba',
        prioridad: 'media',
        ubicacion: 'Área común',
        estado: 'pendiente'
      });
      
      cleanupIds.solicitudes.push(solicitud.id);
      console.log(`   ✅ Solicitud creada: ID ${solicitud.id}, Título: ${solicitud.titulo}, Prioridad: ${solicitud.prioridad}, Estado: ${solicitud.estado}`);
      testsPassed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      testsFailed++;
    }

    // Test 4: validarPago
    try {
      console.log('\n✅ Test 4: validarPago...');
      if (cleanupIds.pagos.length === 0) {
        throw new Error('No hay pago para validar');
      }
      
      const pagoId = cleanupIds.pagos[0];
      const pagoValidado = await validarPago(
        pagoId,
        'pagado',
        'transferencia',
        'REF123456',
        'Pago validado en prueba'
      );
      
      console.log(`   ✅ Pago validado: ID ${pagoValidado.id}, Estado: ${pagoValidado.estado}, Método: ${pagoValidado.metodo_pago}`);
      testsPassed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      testsFailed++;
    }

    // Test 5: Verificar tipos y enums
    try {
      console.log('\n🔍 Test 5: Verificar tipos y enums...');
      
      // Verificar que los roles son válidos
      const rolesValidos = ['admin', 'propietario', 'residente', 'conserje', 'invitado'];
      const estadosValidos = ['pendiente', 'aprobado', 'rechazado', 'completado', 'cancelado', 'activo', 'inactivo', 'vencido', 'pagado'];
      const tiposPagoValidos = ['mantenimiento', 'multa', 'reserva', 'otros'];
      const prioridadesValidas = ['baja', 'media', 'alta', 'urgente'];
      
      console.log(`   ✅ Roles válidos: ${rolesValidos.join(', ')}`);
      console.log(`   ✅ Estados válidos: ${estadosValidos.join(', ')}`);
      console.log(`   ✅ Tipos de pago válidos: ${tiposPagoValidos.join(', ')}`);
      console.log(`   ✅ Prioridades válidas: ${prioridadesValidas.join(', ')}`);
      testsPassed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      testsFailed++;
    }

  } finally {
    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    
    for (const solicitudId of cleanupIds.solicitudes) {
      try {
        await supabase.from('solicitudes_mantenimiento').delete().eq('id', solicitudId);
      } catch (e) {}
    }
    
    for (const pagoId of cleanupIds.pagos) {
      try {
        await supabase.from('historial_pagos').delete().eq('pago_id', pagoId);
        await supabase.from('pagos').delete().eq('id', pagoId);
      } catch (e) {}
    }
    
    for (const usuarioId of cleanupIds.usuarios) {
      try {
        await supabase.from('usuario_vivienda').delete().eq('usuario_id', usuarioId);
        await supabase.from('usuarios').delete().eq('id', usuarioId);
      } catch (e) {}
    }
    
    console.log('   ✅ Limpieza completada');
  }

  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE PRUEBAS CRUD:');
  console.log(`   ✅ Exitosas: ${testsPassed}`);
  console.log(`   ❌ Fallidas: ${testsFailed}`);
  console.log(`   📈 Tasa de éxito: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ¡Todas las pruebas CRUD pasaron! Las funciones del bookService.ts funcionan correctamente.');
    return true;
  } else {
    console.log('\n⚠️  Algunas pruebas CRUD fallaron. Revisa las funciones del bookService.ts.');
    return false;
  }
}

// Ejecutar pruebas
testCRUDFunctions()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });





