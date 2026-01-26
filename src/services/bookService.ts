import { supabase } from '../supabase/client';
import type { Database } from '../supabase/supabase';

// ==================== TYPE ALIASES DE ENUMS REALES ====================
// Type aliases para los enums reales de la BD desde supabase.ts
// Nota: Usamos valores literales porque TypeScript tiene problemas de inferencia con Database['public']['Enums']
// Estos valores coinciden exactamente con Database['public']['Enums'] en supabase.ts
type RoleUsuario = "admin" | "propietario" | "residente" | "conserje" | "invitado";
type EstadoEnum = "pendiente" | "aprobado" | "rechazado" | "completado" | "cancelado" | "activo" | "inactivo" | "vencido" | "pagado" | "parcial";
type TipoPagoEnum = "mantenimiento" | "multa" | "reserva" | "otros";
type PrioridadEnum = "baja" | "media" | "alta" | "urgente";

// Tipos para tablas específicas
type Tables = Database['public']['Tables'];
type UsuarioRow = Tables['usuarios']['Row'];
type PagoRow = Tables['pagos']['Row'];
type SolicitudMantenimientoRow = Tables['solicitudes_mantenimiento']['Row'];
type ReservaEspacioRow = Tables['reservas_espacios']['Row'];

// ==================== FUNCIONES DE MAPEO PARA COMPATIBILIDAD ====================
// Helper para mapear roles antiguos a nuevos
const mapearRol = (rolAntiguo: string): RoleUsuario => {
  const mapeo: Record<string, RoleUsuario> = {
    'mantenimiento': 'conserje',    // Mapear a conserje
    'contador': 'admin',            // Mapear a admin
    'visitante': 'invitado',        // Mapear a invitado
  };
  return mapeo[rolAntiguo] || rolAntiguo as RoleUsuario;
};

// Helper para mapear tipos de pago
const mapearTipoPago = (tipoAntiguo: string): TipoPagoEnum => {
  if (tipoAntiguo === 'extraordinario') return 'otros';
  return tipoAntiguo as TipoPagoEnum;
};

// ==================== FUNCIÓN AUXILIAR DE FECHA ====================
const getCurrentLocalISOString = (): string => {
  return new Date().toISOString();
};

// ==================== TIPOS ACTUALIZADOS SEGÚN SUPABASE.TS ====================

export interface Usuario {
  id: number;
  auth_uid: string | null;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  cedula: string | null;
  rol: RoleUsuario | null;
  contraseña: string | null;
  condominio_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Vivienda {
  id: number;
  condominio_id: number | null;
  propietario_id: number | null;
  numero_apartamento: string;
  piso: string | null;
  tipo_residencia_id: number | null;
  numero_escritura: string | null;
  fecha_adquisicion: string | null;
  activo: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UsuarioVivienda {
  id: number;
  usuario_id: number;
  vivienda_id: number;
  rol_en_vivienda: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean | null;
  created_at: string | null;
}

export interface Pago {
  id: number;
  usuario_id: number | null;
  vivienda_id: number | null;
  concepto: string;
  monto: number;
  tipo: TipoPagoEnum | null;
  estado: EstadoEnum | null;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  comprobante_archivo_id: number | null;
  observaciones: string | null;
  abono: number | null; // Campo real en la BD (no monto_pagado)
  created_at: string | null;
  updated_at: string | null;
  usuario?: Usuario;
  vivienda?: Vivienda;
  archivo?: Archivo;
  // Propiedades calculadas/virtuales para compatibilidad
  monto_pagado?: number; // Alias de abono para compatibilidad con código existente
  creado_por_admin?: boolean; // Indica si el pago fue creado por un administrador
}

export interface Archivo {
  id: number;
  usuario_id: number | null;
  entidad: string | null;
  entidad_id: number | null;
  url: string;
  nombre_original: string | null;
  tipo_mime: string | null;
  created_at: string | null;
}

export interface Anuncio {
  id: number;
  condominio_id: number | null;
  autor_usuario_id: number | null;
  titulo: string;
  contenido: string | null;
  categoria: string | null;
  fecha_publicacion: string | null;
  fecha_expiracion: string | null;
  activo: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  autor?: Usuario;
}

export interface ReservaEspacio {
  id: number;
  espacio_id: number | null;
  usuario_id: number | null;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  estado: EstadoEnum | null;
  numero_personas: number | null;
  motivo_rechazo: string | null;
  created_at: string | null;
  updated_at: string | null;
  espacio?: any;
  usuario?: Usuario;
}

export interface SolicitudMantenimiento {
  id: number;
  condominio_id: number | null;
  usuario_solicitante_id: number | null;
  titulo: string;
  descripcion: string | null;
  prioridad: PrioridadEnum | null;
  estado: EstadoEnum | null;
  fecha_solicitud: string | null;
  fecha_inicio: string | null;
  fecha_completado: string | null;
  responsable_id: number | null;
  ubicacion: string | null;
  observaciones: string | null;
  created_at: string | null;
  updated_at: string | null;
  vivienda?: Vivienda;
  usuario?: Usuario;
  tecnico?: Usuario;
}

// ==================== FUNCIONES CRUD COMPLETAS ====================

// 1. USUARIOS Y VIVIENDAS
export const fetchResidentes = async (condominioId?: number) => {
  try {
    let query = supabase
      .from('usuarios')
      .select(`
        *,
        condominios(*),
        usuario_vivienda!usuario_vivienda_usuario_id_fkey(
          *,
          viviendas(*)
        )
      `);

    if (condominioId) {
      query = query.eq('condominio_id', condominioId);
    }

    const { data, error } = await query.order('nombre');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchResidentes:', error);
    throw error;
  }
};

// Función para actualizar el estado de un usuario
export const actualizarEstadoUsuario = async ({
  usuario_id,
  estado,
  admin_id
}: {
  usuario_id: number;
  estado: 'Activo' | 'Moroso' | 'Inactivo';
  admin_id: number;
}) => {
  try {
    // Verificar que el usuario que hace la actualización es administrador
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', admin_id)
      .single();
    
    if (adminError || !admin || admin.rol?.toLowerCase() !== 'admin') {
      throw new Error('Solo los administradores pueden actualizar el estado de los usuarios');
    }

    // Actualizar el estado del usuario
    const { data: usuarioActualizado, error: updateError } = await supabase
      .from('usuarios')
      .update({ 
        Estado: estado,
        updated_at: getCurrentLocalISOString()
      })
      .eq('id', usuario_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando estado del usuario:', updateError);
      throw new Error('Error al actualizar el estado del usuario');
    }

    return {
      success: true,
      message: `Estado del usuario actualizado a ${estado}`,
      usuario: usuarioActualizado
    };
  } catch (error) {
    console.error('Error en actualizarEstadoUsuario:', error);
    throw error;
  }
};

export const registerResidente = async (userData: {
  nombre: string;
  correo: string;
  telefono?: string;
  cedula?: string;
  rol: RoleUsuario | string | null; // Acepta string, null para compatibilidad, se mapea internamente
  contraseña: string;
  auth_uid?: string; // Opcional: se genera automáticamente en la BD si no se proporciona
  condominio_id: number | null;
  vivienda_id: number;
  rol_en_vivienda: string;
  preguntas_seguridad?: any; // JSONB con preguntas de seguridad
}) => {
  try {
    // Si el rol es null, dejarlo como null (usuario pendiente de aprobación)
    // Si es string, mapear rol antiguo a nuevo si es necesario
    const rolMapeado = userData.rol === null ? null : (typeof userData.rol === 'string' ? mapearRol(userData.rol) : userData.rol);
    
    // 1. Crear usuario
    // IMPORTANTE: Solo insertar campos que existen en la tabla usuarios según el esquema SQL
    // Campos válidos: nombre, correo, telefono, cedula, rol, contraseña, condominio_id, estado
    // auth_uid, created_at, updated_at se generan automáticamente
    // preguntas_seguridad NO existe en la tabla usuarios
    const insertData: any = {
      nombre: userData.nombre,
      correo: userData.correo,
      telefono: userData.telefono || null,
      cedula: userData.cedula || null,
      rol: rolMapeado,
      contraseña: userData.contraseña,
      condominio_id: userData.condominio_id || null,
      Estado: 'Activo' // Asegurar que usuarios nuevos estén activos (sin deudas)
    };
    
    // Solo incluir auth_uid si se proporciona (si no, la BD lo genera automáticamente)
    if (userData.auth_uid) {
      insertData.auth_uid = userData.auth_uid;
    }

    // NOTA: preguntas_seguridad NO existe en la tabla usuarios según el esquema SQL
    // Si se necesita almacenar preguntas de seguridad, debe hacerse en otra tabla
    
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .insert([insertData])
      .select()
      .single();

    if (userError) throw userError;

    // Asegurar que no se crean pagos automáticamente para usuarios nuevos
    // Los pagos solo deben ser creados por administradores

    // 2. Asignar vivienda
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

    return usuario;
  } catch (error) {
    console.error('Error registrando residente:', error);
    throw error;
  }
};

// 2. PAGOS
export const fetchPagos = async (filters?: {
  usuario_id?: number;
  vivienda_id?: number;
  estado?: EstadoEnum;
  tipo?: TipoPagoEnum;
}) => {
  try {
    let query = supabase
      .from('pagos')
      .select(`
        *,
        usuarios(
          *,
          condominios(*)
        ),
        viviendas(*),
        archivos!pagos_comprobante_archivo_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    // Nota: Los pagos eliminados se marcan como "cancelado" con marca especial en observaciones
    // El filtrado se hace después de obtener los datos para evitar problemas con el enum

    if (filters?.usuario_id) query = query.eq('usuario_id', filters.usuario_id);
    if (filters?.vivienda_id) query = query.eq('vivienda_id', filters.vivienda_id);
    if (filters?.estado) query = query.eq('estado', filters.estado);
    if (filters?.tipo) query = query.eq('tipo', filters.tipo);

    const { data, error } = await query;

    if (error) {
      console.error('Error en fetchPagos query:', error);
      throw error;
    }
    
    // Asegurar que siempre retornamos un array
    if (!data) {
      console.warn('fetchPagos: data es null o undefined');
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.warn('fetchPagos: data no es un array:', data);
      return [];
    }
    
    // Filtrar pagos eliminados (soft delete) después de obtener los datos
    // Los pagos eliminados están marcados con "PAGO_INHABILITADO_POR_ADMIN" en observaciones
    const pagosFiltrados = data.filter((pago: any) => {
      const observaciones = pago.observaciones || '';
      return !observaciones.includes('PAGO_INHABILITADO_POR_ADMIN');
    });
    
    return pagosFiltrados;
  } catch (error) {
    console.error('Error en fetchPagos:', error);
    // Retornar array vacío en lugar de lanzar error para evitar que la UI se rompa
    // El componente manejará el error mostrándolo al usuario
    throw error;
  }
};

export const solicitarPago = async ({ 
  usuario_id, 
  vivienda_id,
  concepto, 
  monto, 
  tipo,
  fecha_vencimiento,
  archivo_comprobante_id,
  referencia,
  metodo_pago,
  observaciones
}: { 
  usuario_id: number, 
  vivienda_id: number,
  concepto: string, 
  monto: number, 
  tipo: TipoPagoEnum | string, // Acepta string para compatibilidad, se mapea internamente
  fecha_vencimiento?: string,
  archivo_comprobante_id?: number,
  referencia?: string,
  metodo_pago?: string,
  observaciones?: string
}) => {
  try {
    // 1. Verificar que el usuario existe y tiene acceso a la vivienda
    const { data: usuarioVivienda, error: uvError } = await supabase
      .from('usuario_vivienda')
      .select('*')
      .eq('usuario_id', usuario_id)
      .eq('vivienda_id', vivienda_id)
      .eq('activo', true)
      .single();
      
    if (uvError || !usuarioVivienda) {
      throw new Error('No tiene permisos para solicitar pagos para esta vivienda');
    }

    // 2. Permitir múltiples pagos pendientes (comentado para permitir solicitar nuevos pagos)
    // Los usuarios pueden solicitar nuevos pagos incluso si tienen pagos pendientes
    // const mesActual = new Date().toISOString().slice(0, 7);
    // const { data: pagoExistente, error: pagoError } = await supabase
    //   .from('pagos')
    //   .select('id, estado')
    //   .eq('usuario_id', usuario_id)
    //   .eq('vivienda_id', vivienda_id)
    //   .eq('concepto', concepto)
    //   .eq('estado', 'pendiente')
    //   .gte('created_at', `${mesActual}-01`)
    //   .lte('created_at', `${mesActual}-31`);
    //   
    // if (pagoError) {
    //   console.error('Error verificando pagos existentes:', pagoError);
    // }
    // 
    // if (pagoExistente && pagoExistente.length > 0) {
    //   throw new Error(`Ya tiene un pago pendiente para "${concepto}" este mes. Espere a que sea procesado.`);
    // }

    // Mapear tipo de pago antiguo a nuevo si es necesario
    const tipoMapeado = typeof tipo === 'string' ? mapearTipoPago(tipo) : tipo;

    // 3. Crear el pago
    // Nota: El schema de la BD incluye estos campos en la tabla pagos:
    // id, usuario_id, vivienda_id, concepto, monto, tipo, estado, fecha_vencimiento, fecha_pago,
    // referencia, metodo_pago, comprobante_archivo_id, observaciones, abono, created_at, updated_at
    const pagoObj: any = {
      usuario_id,
      vivienda_id: vivienda_id || null, // El schema incluye vivienda_id
      concepto,
      monto,
      tipo: tipoMapeado,
      estado: 'pendiente' as EstadoEnum,
      fecha_vencimiento: fecha_vencimiento || null,
      fecha_pago: null,
      referencia: referencia || null,
      metodo_pago: metodo_pago || null,
      comprobante_archivo_id: archivo_comprobante_id || null, // El schema incluye comprobante_archivo_id
      observaciones: observaciones || null,
      abono: 0, // Inicializar abono en 0
      created_at: getCurrentLocalISOString(),
      updated_at: getCurrentLocalISOString()
    };
    
    // Intentar insertar el pago
    let { data, error } = await supabase
      .from('pagos')
      .insert([pagoObj])
      .select(`
        *,
        usuarios(*)
      `);
    
    // Si hay error, puede ser por campos que no existen, intentar sin campos opcionales
    if (error) {
      console.warn('Error creando pago con campos completos, intentando sin campos opcionales:', error);
      const pagoObjBasico: any = {
        usuario_id,
        concepto,
        monto,
        tipo: tipoMapeado,
        estado: 'pendiente' as EstadoEnum,
        fecha_vencimiento: fecha_vencimiento || null,
        observaciones: observaciones || null,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      };
      
      const { data: data2, error: error2 } = await supabase
        .from('pagos')
        .insert([pagoObjBasico])
        .select(`
          *,
          usuarios(*)
        `);
      
      if (error2) {
        console.error('Error creando pago:', error2);
        throw new Error('Error al crear la solicitud de pago');
      }
      
      data = data2;
    }
    
    // Asociar el archivo del comprobante con el pago mediante la tabla archivos
    if (archivo_comprobante_id && data && data[0]) {
      await supabase
        .from('archivos')
        .update({ 
          entidad: 'pagos',
          entidad_id: data[0].id 
        })
        .eq('id', archivo_comprobante_id);
    }

    // 4. Crear registro en historial
    await supabase
      .from('historial_pagos')
      .insert([{
        pago_id: data[0].id,
        evento: 'creado',
        usuario_actor_id: usuario_id,
        datos: { accion: 'solicitud_pago', concepto, monto },
        fecha_evento: getCurrentLocalISOString()
      }]);

    // 5. Notificar administradores
    await notificarAdministradores(
      usuario_id,
      'nueva_solicitud_pago',
      `Nueva solicitud de pago: ${concepto} - $${monto}`,
      data[0].id
    );
    
    return data[0];
    
  } catch (error) {
    console.error('Error en solicitarPago:', error);
    throw error;
  }
};

export const validarPago = async ({
  pago_id,
  admin_id,
  nuevo_estado,
  observaciones,
  metodo_pago,
  referencia,
  monto_aprobado
}: {
  pago_id: number;
  admin_id: number;
  nuevo_estado: EstadoEnum;
  observaciones?: string;
  metodo_pago?: string;
  referencia?: string;
  monto_aprobado?: number; // Monto aprobado (puede ser menor al monto total para abonos)
}) => {
  try {
    // 1. Obtener el pago actual
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .single();
      
    if (pagoError) throw new Error('Pago no encontrado');

    // 2. Calcular abono solo si no se está rechazando
    let nuevo_abono = 0;
    const monto_total = parseFloat(pago.monto?.toString() || '0');
    let estado_final = nuevo_estado;
    
    // Solo calcular abono si no se está rechazando el pago
    if (nuevo_estado !== 'rechazado') {
      // Usar 'abono' que es el campo real en la BD
      nuevo_abono = parseFloat((pago.abono || 0).toString());
      if (monto_aprobado !== undefined && monto_aprobado > 0) {
        nuevo_abono += monto_aprobado;
      } else if (nuevo_estado === 'pagado') {
        // Si se aprueba completamente sin monto_aprobado, usar el monto total
        nuevo_abono = monto_total;
      }

      // 3. Determinar estado final basado en abono (solo si no es rechazado)
      // Nota: El enum estado_enum no incluye "parcial", usar "pendiente" si no está completo
      if (nuevo_abono >= monto_total && monto_total > 0) {
        estado_final = 'pagado' as EstadoEnum;
      } else if (nuevo_abono > 0 && nuevo_abono < monto_total) {
        // Si el enum no soporta "parcial", usar "pendiente" y el abono indicará el pago parcial
        estado_final = 'pendiente' as EstadoEnum; // Usar pendiente ya que parcial no existe en el enum
      }
    }

    // 4. Actualizar el pago
    // IMPORTANTE: El estado se determina SOLO por el abono acumulado, no por el nuevo_estado pasado
    // Si el abono < monto_total, debe permanecer como "pendiente" (pago parcial)
    // Solo se marca como "pagado" cuando abono >= monto_total
    const updateData: any = {
      estado: estado_final, // Ya calculado correctamente arriba basado en abono
      observaciones: observaciones || null,
      updated_at: getCurrentLocalISOString()
    };
    
    // Incluir abono si no se está rechazando (el campo existe en la BD)
    if (nuevo_estado !== 'rechazado' && nuevo_abono !== undefined) {
      updateData.abono = nuevo_abono;
    }

    // Si se marca como pagado o hay abono, registrar fecha y método
    if (estado_final === 'pagado' || (nuevo_abono > 0 && monto_aprobado && monto_aprobado > 0)) {
      // Solo registrar fecha_pago si es el primer pago o si se completa el pago
      if (estado_final === 'pagado' || !pago.fecha_pago) {
        updateData.fecha_pago = getCurrentLocalISOString();
      }
      updateData.metodo_pago = metodo_pago || pago.metodo_pago || null;
      updateData.referencia = referencia || pago.referencia || null;
    }

    // Actualizar el pago
    const { error: updateError } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', pago_id);

    if (updateError) throw updateError;

    // 5. Registrar en historial
    await supabase
      .from('historial_pagos')
      .insert([{
        pago_id,
        evento: estado_final,
        usuario_actor_id: admin_id,
        datos: { 
          estado_anterior: pago.estado,
          estado_nuevo: estado_final,
          monto_aprobado: monto_aprobado || monto_total,
          abono_acumulado: nuevo_abono,
          metodo_pago,
          referencia,
          observaciones 
        },
        fecha_evento: getCurrentLocalISOString()
      }]);

    // 6. Notificar al usuario
    if (pago.usuario_id) {
      let mensaje = '';
      // Mensaje diferente para pagos parciales vs completos
      if (estado_final === 'pagado') {
        mensaje = `Su pago "${pago.concepto}" ha sido completado exitosamente.`;
      } else if (nuevo_abono > 0 && nuevo_abono < monto_total) {
        // Pago parcial
        mensaje = `Se registró un abono de ${monto_aprobado?.toFixed(2) || nuevo_abono.toFixed(2)} Bs. para su pago "${pago.concepto}". `;
        mensaje += `Total pagado: ${nuevo_abono.toFixed(2)} Bs. de ${monto_total.toFixed(2)} Bs. `;
        mensaje += `Pendiente: ${(monto_total - nuevo_abono).toFixed(2)} Bs.`;
      } else if (estado_final === 'rechazado' && observaciones) {
        mensaje = `Su pago "${pago.concepto}" ha sido rechazado. Motivo: ${observaciones}`;
      } else {
        mensaje = `Su pago "${pago.concepto}" ha sido ${estado_final}`;
      }
      
      try {
        await crearNotificacion(
          pago.usuario_id,
          estado_final === 'rechazado' ? 'pago_rechazado' : 'pago_procesado',
          mensaje,
          'pagos',
          pago_id,
          estado_final === 'rechazado' ? 'Pago Rechazado' : 'Pago Aprobado' // Título específico
        );
        console.log(`Notificación de ${estado_final} enviada al usuario ${pago.usuario_id} para el pago ${pago_id}`);
      } catch (notifError: any) {
        console.error('Error creando notificación de pago:', notifError);
        // No lanzar el error para que el proceso continúe, pero registrar el problema
      }
    }

      return { 
        success: true, 
        message: `Pago ${estado_final} exitosamente`,
        pago_id,
        abono: nuevo_abono
      };
  } catch (error) {
    console.error('Error en validarPago:', error);
    throw error;
  }
};

// Función para editar un pago pendiente
export const editarPago = async ({
  pago_id,
  usuario_id,
  concepto,
  monto,
  tipo,
  fecha_vencimiento,
  archivo_comprobante_id
}: {
  pago_id: number;
  usuario_id: number;
  concepto?: string;
  monto?: number;
  tipo?: TipoPagoEnum | string;
  fecha_vencimiento?: string;
  archivo_comprobante_id?: number;
}) => {
  try {
    // 1. Verificar que el pago existe y pertenece al usuario
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .eq('usuario_id', usuario_id)
      .eq('estado', 'pendiente')
      .single();
      
    if (pagoError || !pago) {
      throw new Error('Pago no encontrado o no se puede editar');
    }

    // 2. Preparar datos de actualización
    const updateData: any = {
      updated_at: getCurrentLocalISOString()
    };

    if (concepto !== undefined) updateData.concepto = concepto;
    if (monto !== undefined) updateData.monto = monto;
    if (tipo !== undefined) {
      const tipoMapeado = typeof tipo === 'string' ? mapearTipoPago(tipo) : tipo;
      updateData.tipo = tipoMapeado;
    }
    if (fecha_vencimiento !== undefined) updateData.fecha_vencimiento = fecha_vencimiento || null;
    if (archivo_comprobante_id !== undefined) updateData.comprobante_archivo_id = archivo_comprobante_id || null;

    // 3. Actualizar el pago
    const { error: updateError } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', pago_id);

    if (updateError) throw updateError;

    // 4. Registrar en historial
    await supabase
      .from('historial_pagos')
      .insert([{
        pago_id,
        evento: 'editado',
        usuario_actor_id: usuario_id,
        datos: { 
          accion: 'edicion_pago',
          cambios: updateData
        },
        fecha_evento: getCurrentLocalISOString()
      }]);

    return { 
      success: true, 
      message: 'Pago actualizado exitosamente',
      pago_id 
    };
  } catch (error) {
    console.error('Error en editarPago:', error);
    throw error;
  }
};

// Función para crear pagos masivos (solo para administradores)
export const crearPagosMasivos = async ({
  admin_id,
  concepto,
  monto,
  tipo,
  fecha_vencimiento,
  condominio_id,
  usuario_ids,
  aplicar_a_todos,
  aplicar_a_todos_condominios
}: {
  admin_id: number;
  concepto: string;
  monto: number;
  tipo: TipoPagoEnum | string;
  fecha_vencimiento?: string;
  condominio_id?: number; // Si se especifica, crear para todos los usuarios del condominio
  usuario_ids?: number[]; // IDs específicos de usuarios
  aplicar_a_todos?: boolean; // Si es true, crear para todos los usuarios activos
  aplicar_a_todos_condominios?: boolean; // Si es true, crear para todos los usuarios de todos los condominios
}) => {
  try {
    // Verificar que el usuario es administrador
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', admin_id)
      .single();
    
    if (adminError || !admin || admin.rol?.toLowerCase() !== 'admin') {
      throw new Error('Solo los administradores pueden crear pagos masivos');
    }

    // Obtener lista de usuarios objetivo
    let usuariosObjetivo: number[] = [];

    if (aplicar_a_todos) {
      // Obtener todos los usuarios activos (excepto admins)
      // Primero intentar sin filtro de estado para ver qué usuarios hay
      console.log('DEBUG - Obteniendo usuarios sin filtro primero para debug...');
      const { data: debugTodos, error: debugError } = await supabase
        .from('usuarios')
        .select('id, nombre, rol, Estado')
        .neq('rol', 'admin')
        .limit(10);
      
      console.log('DEBUG - Usuarios sin filtro de estado:', debugTodos);
      console.log('DEBUG - Error (si hay):', debugError);
      
      // Ahora intentar con filtro de Estado
      const { data: todosUsuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id')
        .neq('rol', 'admin')
        .eq('Estado', 'Activo');
      
      if (usuariosError) {
        console.error('Error obteniendo usuarios con Estado=Activo:', usuariosError);
        // Si hay error con Estado, intentar sin filtro de estado
        console.log('Intentando sin filtro de Estado...');
        const { data: todosUsuariosSinEstado, error: usuariosErrorSinEstado } = await supabase
          .from('usuarios')
          .select('id')
          .neq('rol', 'admin');
        
        if (usuariosErrorSinEstado) {
          console.error('Error obteniendo usuarios sin filtro de estado:', usuariosErrorSinEstado);
          throw usuariosErrorSinEstado;
        }
        
        usuariosObjetivo = (todosUsuariosSinEstado || []).filter(u => u && u.id != null).map(u => Number(u.id));
        console.log('Usuarios encontrados sin filtro de estado (aplicar_a_todos):', usuariosObjetivo.length);
      } else {
        console.log('DEBUG - todosUsuarios raw:', todosUsuarios);
        console.log('DEBUG - todosUsuarios length:', todosUsuarios?.length);
        
        usuariosObjetivo = (todosUsuarios || []).filter(u => u && u.id != null).map(u => Number(u.id));
        
        console.log('Usuarios encontrados con Estado=Activo (aplicar_a_todos):', usuariosObjetivo.length);
        console.log('DEBUG - usuariosObjetivo después del map:', usuariosObjetivo);
        
        // Si no se encontraron usuarios activos, obtener todos los no-admin (sin filtro de estado)
        if (usuariosObjetivo.length === 0) {
          console.log('No se encontraron usuarios con Estado=Activo, obteniendo todos los no-admin...');
          const { data: todosUsuariosSinEstado, error: usuariosErrorSinEstado } = await supabase
            .from('usuarios')
            .select('id, nombre, rol, Estado')
            .neq('rol', 'admin');
          
          if (usuariosErrorSinEstado) {
            console.error('Error obteniendo usuarios sin filtro de estado:', usuariosErrorSinEstado);
            throw usuariosErrorSinEstado;
          }
          
          console.log('DEBUG - todosUsuariosSinEstado raw:', todosUsuariosSinEstado);
          console.log('DEBUG - todosUsuariosSinEstado length:', todosUsuariosSinEstado?.length);
          
          usuariosObjetivo = (todosUsuariosSinEstado || []).filter(u => u && u.id != null).map(u => Number(u.id));
          
          console.log('Usuarios encontrados sin filtro de estado (aplicar_a_todos):', usuariosObjetivo.length);
          console.log('DEBUG - usuariosObjetivo después del map (sin estado):', usuariosObjetivo);
        }
      }
    } else if (aplicar_a_todos_condominios) {
      // Obtener todos los usuarios activos que pertenezcan a algún condominio (excepto admins)
      const { data: usuariosCondominios, error: condError } = await supabase
        .from('usuarios')
        .select('id')
        .neq('rol', 'admin')
        .not('condominio_id', 'is', null)
        .eq('Estado', 'Activo');
      
      if (condError) {
        console.error('Error obteniendo usuarios de condominios:', condError);
        throw condError;
      }
      
      usuariosObjetivo = usuariosCondominios?.map(u => u.id) || [];
      console.log('Usuarios encontrados con Estado=Activo (aplicar_a_todos_condominios):', usuariosObjetivo.length);
      
      // Si no se encontraron usuarios activos, obtener todos los no-admin con condominio (sin filtro de estado)
      if (usuariosObjetivo.length === 0) {
        console.log('No se encontraron usuarios con Estado=Activo, obteniendo todos los no-admin con condominio...');
        const { data: usuariosCondominiosSinEstado, error: condErrorSinEstado } = await supabase
          .from('usuarios')
          .select('id')
          .neq('rol', 'admin')
          .not('condominio_id', 'is', null);
        
        if (condErrorSinEstado) {
          console.error('Error obteniendo usuarios sin filtro de estado:', condErrorSinEstado);
          throw condErrorSinEstado;
        }
        
        usuariosObjetivo = usuariosCondominiosSinEstado?.map(u => u.id) || [];
        console.log('Usuarios encontrados sin filtro de estado (aplicar_a_todos_condominios):', usuariosObjetivo.length);
      }
    } else if (condominio_id) {
      // Obtener usuarios del condominio específico
      const { data: usuariosCondominio, error: condError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('condominio_id', condominio_id)
        .neq('rol', 'admin')
        .eq('Estado', 'Activo');
      
      if (condError) {
        console.error('Error obteniendo usuarios del condominio:', condError);
        throw condError;
      }
      
      usuariosObjetivo = usuariosCondominio?.map(u => u.id) || [];
      console.log('Usuarios encontrados con Estado=Activo (condominio_id):', usuariosObjetivo.length);
      
      // Si no se encontraron usuarios activos, obtener todos los no-admin del condominio (sin filtro de estado)
      if (usuariosObjetivo.length === 0) {
        console.log('No se encontraron usuarios con Estado=Activo, obteniendo todos los no-admin del condominio...');
        const { data: usuariosCondominioSinEstado, error: condErrorSinEstado } = await supabase
          .from('usuarios')
          .select('id')
          .eq('condominio_id', condominio_id)
          .neq('rol', 'admin');
        
        if (condErrorSinEstado) {
          console.error('Error obteniendo usuarios sin filtro de estado:', condErrorSinEstado);
          throw condErrorSinEstado;
        }
        
        usuariosObjetivo = usuariosCondominioSinEstado?.map(u => u.id) || [];
        console.log('Usuarios encontrados sin filtro de estado (condominio_id):', usuariosObjetivo.length);
      }
    } else if (usuario_ids && usuario_ids.length > 0) {
      usuariosObjetivo = usuario_ids;
    } else {
      throw new Error('Debe especificar usuarios, condominio, todos los condominios o aplicar a todos');
    }

    console.log('Debug - usuariosObjetivo antes de verificar:', usuariosObjetivo);
    console.log('Debug - usuariosObjetivo.length:', usuariosObjetivo.length);
    
    if (usuariosObjetivo.length === 0) {
      // Obtener información de debug
      const { data: debugUsuarios, error: debugError } = await supabase
        .from('usuarios')
        .select('id, nombre, rol')
        .limit(5);
      
      console.error('Debug - Usuarios encontrados (sin filtros):', debugUsuarios);
      console.error('Debug - Error:', debugError);
      console.error('Debug - Tipo de aplicación:', aplicar_a_todos ? 'todos' : aplicar_a_todos_condominios ? 'todos_condominios' : condominio_id ? 'condominio' : usuario_ids ? 'usuarios' : 'ninguno');
      
      throw new Error('No se encontraron usuarios para crear los pagos. Verifique que existan usuarios en la plataforma y que cumplan los criterios seleccionados.');
    }
    
    console.log('Debug - usuariosObjetivo final:', usuariosObjetivo);
    console.log('Debug - Total usuarios a procesar:', usuariosObjetivo.length);

    // Obtener viviendas de los usuarios
    const { data: viviendasUsuarios, error: viviendasError } = await supabase
      .from('usuario_vivienda')
      .select('usuario_id, vivienda_id')
      .eq('activo', true)
      .in('usuario_id', usuariosObjetivo);

    if (viviendasError) {
      console.warn('Error obteniendo viviendas, continuando sin ellas:', viviendasError);
    }

    // Crear mapa de usuario_id -> vivienda_id
    const viviendaMap = new Map<number, number>();
    viviendasUsuarios?.forEach((uv: any) => {
      if (!viviendaMap.has(uv.usuario_id)) {
        viviendaMap.set(uv.usuario_id, uv.vivienda_id);
      }
    });

    // Mapear tipo de pago
    const tipoMapeado = typeof tipo === 'string' ? mapearTipoPago(tipo) : tipo;

    // Crear pagos para cada usuario
    // Nota: El schema de la BD no incluye vivienda_id ni comprobante_archivo_id en la tabla pagos
    const pagosACrear = usuariosObjetivo.map(usuario_id => {
      return {
        usuario_id,
        concepto,
        monto,
        tipo: tipoMapeado,
        estado: 'pendiente' as EstadoEnum,
        fecha_vencimiento: fecha_vencimiento || null,
        fecha_pago: null,
        referencia: null,
        metodo_pago: null,
        observaciones: `Pago creado masivamente por administrador`,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      };
    });

    // Insertar pagos en lote
    const { data: pagosCreados, error: insertError } = await supabase
      .from('pagos')
      .insert(pagosACrear)
      .select('id, usuario_id');

    if (insertError) {
      console.error('Error creando pagos masivos:', insertError);
      throw new Error('Error al crear los pagos masivos');
    }

    // Crear registros en historial para cada pago
    if (pagosCreados && pagosCreados.length > 0) {
      const historiales = pagosCreados.map((pago: any) => ({
        pago_id: pago.id,
        evento: 'creado',
        usuario_actor_id: admin_id,
        datos: { 
          accion: 'pago_masivo_creado', 
          concepto, 
          monto,
          total_usuarios: usuariosObjetivo.length
        },
        fecha_evento: getCurrentLocalISOString()
      }));

      await supabase
        .from('historial_pagos')
        .insert(historiales);
    }

    // Notificar a los usuarios afectados
    for (const usuario_id of usuariosObjetivo) {
      await crearNotificacion(
        usuario_id,
        'pago_creado',
        `Se ha creado un nuevo pago: ${concepto} - ${monto} Bs.`,
        'pagos',
        null
      );
    }

    return {
      success: true,
      message: `Se crearon ${pagosCreados?.length || 0} pagos exitosamente`,
      total_creados: pagosCreados?.length || 0,
      pagos_ids: pagosCreados?.map((p: any) => p.id) || []
    };
  } catch (error) {
    console.error('Error en crearPagosMasivos:', error);
    throw error;
  }
};

// Función para actualizar un pago (solo para administradores)
export const actualizarPago = async ({
  pago_id,
  admin_id,
  concepto,
  monto,
  tipo,
  fecha_vencimiento,
  estado,
  observaciones
}: {
  pago_id: number;
  admin_id: number;
  concepto?: string;
  monto?: number;
  tipo?: TipoPagoEnum | string;
  fecha_vencimiento?: string;
  estado?: EstadoEnum;
  observaciones?: string;
}) => {
  try {
    // Verificar que el usuario es administrador
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', admin_id)
      .single();
    
    if (adminError || !admin || admin.rol?.toLowerCase() !== 'admin') {
      throw new Error('Solo los administradores pueden actualizar pagos');
    }

    // Obtener el pago actual
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .single();
      
    if (pagoError || !pago) {
      throw new Error('Pago no encontrado');
    }

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: getCurrentLocalISOString()
    };

    if (concepto !== undefined) updateData.concepto = concepto;
    if (monto !== undefined) updateData.monto = monto;
    if (tipo !== undefined) {
      const tipoMapeado = typeof tipo === 'string' ? mapearTipoPago(tipo) : tipo;
      updateData.tipo = tipoMapeado;
    }
    if (fecha_vencimiento !== undefined) updateData.fecha_vencimiento = fecha_vencimiento || null;
    if (estado !== undefined) updateData.estado = estado;
    if (observaciones !== undefined) updateData.observaciones = observaciones || null;

    // Actualizar el pago
    const { error: updateError } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', pago_id);

    if (updateError) throw updateError;

    // Registrar en historial
    await supabase
      .from('historial_pagos')
      .insert([{
        pago_id,
        evento: 'editado',
        usuario_actor_id: admin_id,
        datos: { 
          accion: 'pago_actualizado',
          cambios: updateData,
          estado_anterior: pago.estado
        },
        fecha_evento: getCurrentLocalISOString()
      }]);

    // Notificar al usuario si el pago tiene usuario asociado
    if (pago.usuario_id) {
      await crearNotificacion(
        pago.usuario_id,
        'pago_actualizado',
        `Su pago "${pago.concepto}" ha sido actualizado por el administrador`,
        'pagos',
        pago_id
      );
    }

    return { 
      success: true, 
      message: 'Pago actualizado exitosamente',
      pago_id 
    };
  } catch (error) {
    console.error('Error en actualizarPago:', error);
    throw error;
  }
};

// Función para eliminar un pago (solo para administradores)
export const eliminarPago = async ({
  pago_id,
  admin_id
}: {
  pago_id: number;
  admin_id: number;
}) => {
  try {
    // Verificar que el usuario es administrador
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', admin_id)
      .single();
    
    if (adminError || !admin || admin.rol?.toLowerCase() !== 'admin') {
      throw new Error('Solo los administradores pueden eliminar pagos');
    }

    // Obtener el pago antes de eliminarlo
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .single();
      
    if (pagoError || !pago) {
      throw new Error('Pago no encontrado');
    }

    // En lugar de eliminar físicamente, marcar como cancelado con marca especial en observaciones (soft delete)
    // Esto evita problemas con el historial de pagos y mantiene la integridad referencial
    // Usamos "cancelado" que existe en el enum y agregamos una marca especial en observaciones
    const marcaEliminado = `[PAGO_INHABILITADO_POR_ADMIN:${getCurrentLocalISOString()}]`;
    const observacionesActualizadas = pago.observaciones 
      ? `${pago.observaciones}\n${marcaEliminado}`
      : marcaEliminado;
    
    const { error: updateError } = await supabase
      .from('pagos')
      .update({
        estado: 'cancelado' as EstadoEnum,
        observaciones: observacionesActualizadas,
        updated_at: getCurrentLocalISOString()
      })
      .eq('id', pago_id);

    if (updateError) throw updateError;

    // Registrar en historial
    try {
      await supabase
        .from('historial_pagos')
        .insert([{
          pago_id,
          evento: 'eliminado',
          usuario_actor_id: admin_id,
          datos: { 
            accion: 'pago_inhabilitado',
            concepto: pago.concepto,
            monto: pago.monto,
            estado_anterior: pago.estado,
            motivo: 'Pago inhabilitado por administrador'
          },
          fecha_evento: getCurrentLocalISOString()
        }]);
    } catch (histError) {
      console.warn('No se pudo registrar en historial:', histError);
    }

    // Notificar al usuario si el pago tiene usuario asociado
    if (pago.usuario_id) {
      await crearNotificacion(
        pago.usuario_id,
        'pago_eliminado',
        `El pago "${pago.concepto}" ha sido inhabilitado por el administrador`,
        'pagos',
        pago_id
      );
    }

    return { 
      success: true, 
      message: 'Pago inhabilitado exitosamente',
      pago_id 
    };
  } catch (error) {
    console.error('Error en eliminarPago:', error);
    throw error;
  }
};

// 3. ANUNCIOS
export const fetchAnuncios = async (condominioId?: number, categoria?: string) => {
  try {
    let query = supabase
      .from('anuncios')
      .select(`
        *,
        autor_usuario:usuarios!anuncios_autor_usuario_id_fkey(nombre, correo, rol)
      `)
      .eq('activo', true)
      .order('fecha_publicacion', { ascending: false });

    if (condominioId) {
      query = query.eq('condominio_id', condominioId);
    }
    
    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchAnuncios:', error);
    throw error;
  }
};

export const crearAnuncio = async ({
  condominio_id,
  autor_usuario_id,
  titulo,
  contenido,
  categoria
}: {
  condominio_id?: number;
  autor_usuario_id: number;
  titulo: string;
  contenido: string;
  categoria?: string | null;
}) => {
  try {
    const { data, error } = await supabase
      .from('anuncios')
      .insert([{
        condominio_id: condominio_id || null,
        autor_usuario_id,
        titulo,
        contenido,
        categoria: categoria || null,
        fecha_publicacion: getCurrentLocalISOString(),
        fecha_expiracion: null,
        activo: true,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }])
      .select(`
        *,
        autor_usuario:usuarios!anuncios_autor_usuario_id_fkey(nombre, correo, rol)
      `);

    if (error) throw error;

    // Notificar a todos los residentes del condominio si hay condominio_id
    if (condominio_id) {
      await notificarResidentesCondominio(
        condominio_id,
        'nuevo_anuncio',
        `Nuevo anuncio: ${titulo}`,
        'anuncios',
        data[0].id
      );
    }

    return data[0];
  } catch (error) {
    console.error('Error en crearAnuncio:', error);
    throw error;
  }
};

// 4. ARCHIVOS (CORREGIDO)
export const subirArchivo = async (
  file: File,
  usuario_id: number,
  entidad?: string,
  entidad_id?: number
): Promise<number> => {
  try {
    // 1. Subir a Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${usuario_id}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `archivos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('condominio-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('condominio-files')
      .getPublicUrl(filePath);

    // 3. Crear registro en tabla archivos
    const { data, error } = await supabase
      .from('archivos')
      .insert([{
        usuario_id,
        entidad: entidad || null,
        entidad_id: entidad_id || null,
        url: publicUrl,
        nombre_original: file.name,
        tipo_mime: file.type,
        created_at: getCurrentLocalISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    throw new Error('Error al subir el archivo');
  }
};

export const subirComprobantePago = async (
  file: File,
  usuario_id: number,
  pago_id?: number
): Promise<number> => {
  return subirArchivo(file, usuario_id, 'pagos', pago_id);
};

// 5. ESPACIOS COMUNES Y RESERVACIONES
export const fetchEspaciosComunes = async (condominioId?: number, soloAprobados: boolean = true) => {
  try {
    let query = supabase
      .from('espacios_comunes')
      .select('*')
      .order('nombre');

    if (soloAprobados) {
      // Solo mostrar espacios activos (aprobados)
      // Usamos 'activo' ya que 'estado' puede no existir
      query = query.eq('activo', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchEspaciosComunes:', error);
    throw error;
  }
};

// Obtener espacios pendientes de validación
export const fetchEspaciosPendientes = async () => {
  try {
    // Buscamos espacios donde activo es false o null (pendientes de aprobación)
    // Excluimos los que tienen estado 'rechazado' para que no aparezcan después de ser rechazados
    // Usamos una consulta que maneja NULL correctamente
    let query = supabase
      .from('espacios_comunes')
      .select('*')
      .or('activo.is.null,activo.eq.false')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    
    // Los espacios rechazados ya no existen en la BD (se eliminan al rechazar)
    // Solo retornamos los que están pendientes (activo = false o null)
    return data || [];
  } catch (error) {
    console.error('Error en fetchEspaciosPendientes:', error);
    throw error;
  }
};

// Crear espacio común (usuarios crean con estado pendiente, admins con activo)
export const crearEspacioComun = async ({
  nombre,
  descripcion,
  capacidad,
  horarios,
  equipamiento,
  usuario_creador_id,
  es_admin = false
}: {
  nombre: string;
  descripcion?: string;
  capacidad?: number;
  horarios?: string;
  equipamiento?: string[];
  usuario_creador_id: number;
  es_admin?: boolean;
}) => {
  try {
    // Verificar que el usuario existe
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', usuario_creador_id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Usuario no encontrado');
    }
    
    // Si es admin, activo = true, si no activo = false (pendiente)
    const activoFinal = (es_admin || usuario.rol === 'admin') ? true : false;

    const { data, error } = await supabase
      .from('espacios_comunes')
      .insert([{
        nombre,
        descripcion: descripcion || null,
        capacidad: capacidad || null,
        horarios: horarios || null,
        equipamiento: equipamiento || null,
        activo: activoFinal, // No usamos 'estado' ya que puede no existir
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }])
      .select('*');

    if (error) throw error;

    // Si fue creado por usuario (pendiente), notificar a administradores
    if (!activoFinal) {
      await notificarAdministradores(
        usuario_creador_id,
        'nuevo_espacio_comun',
        `Nuevo espacio común propuesto: ${nombre}`,
        data[0].id,
        'espacios'
      );
      
      // Guardar una notificación especial para rastrear al creador del espacio
      // Esto nos permitirá notificar al usuario cuando se apruebe o rechace
      // IMPORTANTE: Esta notificación DEBE crearse para poder notificar al usuario después
      let notificacionCreadaExitosamente = false;
      
      try {
        console.log(`📝 Creando notificación inicial para espacio:`);
        console.log(`   - Usuario creador: ${usuario_creador_id}`);
        console.log(`   - Espacio ID: ${data[0].id}`);
        console.log(`   - Nombre: ${nombre}`);
        
        const notificacionCreada = await crearNotificacion(
          usuario_creador_id,
          'espacio_creado_pendiente',
          `Tu propuesta de espacio común "${nombre}" está pendiente de validación por el administrador.`,
          'espacios',
          data[0].id
        );
        
        if (notificacionCreada && notificacionCreada.id) {
          notificacionCreadaExitosamente = true;
          console.log(`✅ Notificación de espacio pendiente creada exitosamente:`);
          console.log(`   - Notificación ID: ${notificacionCreada.id}`);
          console.log(`   - Usuario: ${usuario_creador_id}`);
          console.log(`   - Espacio ID: ${data[0].id}`);
          console.log(`   - Tipo: espacio_creado_pendiente`);
          console.log(`   - Relacion tipo: espacios`);
        } else {
          console.error('❌ La notificación se creó pero no se retornó correctamente');
        }
      } catch (notifError: any) {
        console.error('❌ Error creando notificación inicial del espacio:', notifError);
        console.error('   Detalles del error:', JSON.stringify(notifError, null, 2));
        
        // Intentar crear la notificación directamente como último recurso
        try {
          console.log('🔄 Intentando crear notificación directamente...');
          const { data: notifDirecta, error: errorDirecto } = await supabase
            .from('notificaciones')
            .insert([{
              usuario_id: usuario_creador_id,
              tipo: 'espacio_creado_pendiente',
              titulo: 'Solicitud Pendiente',
              mensaje: `Tu propuesta de espacio común "${nombre}" está pendiente de validación por el administrador.`,
              relacion_entidad: 'espacios',
              relacion_id: data[0].id,
              estado: 'pendiente',
              leida: false,
              accion_requerida: null,
              fecha_creacion: getCurrentLocalISOString(),
              fecha_lectura: null,
              created_at: getCurrentLocalISOString(),
              updated_at: getCurrentLocalISOString()
            }])
            .select()
            .single();
            
          if (errorDirecto) {
            console.error('❌ Error en creación directa de notificación:', errorDirecto);
          } else if (notifDirecta) {
            notificacionCreadaExitosamente = true;
            console.log(`✅ Notificación creada directamente (fallback): ID ${notifDirecta.id}`);
          }
        } catch (fallbackError: any) {
          console.error('❌ Error en fallback de creación de notificación:', fallbackError);
        }
      }
      
      if (!notificacionCreadaExitosamente) {
        console.error(`⚠️ ADVERTENCIA: No se pudo crear la notificación inicial para el espacio ${data[0].id}`);
        console.error(`   Esto puede causar problemas al intentar notificar al usuario cuando se apruebe/rechace el espacio.`);
      }
    }

    return data[0];
  } catch (error) {
    console.error('Error en crearEspacioComun:', error);
    throw error;
  }
};

// Validar espacio común (aprobar o rechazar)
export const validarEspacioComun = async ({
  espacio_id,
  admin_id,
  nuevo_estado,
  motivo_rechazo
}: {
  espacio_id: number;
  admin_id: number;
  nuevo_estado: 'activo' | 'rechazado';
  motivo_rechazo?: string;
}) => {
  try {
    const { data: espacio, error: espacioError } = await supabase
      .from('espacios_comunes')
      .select('*')
      .eq('id', espacio_id)
      .single();

    if (espacioError) throw new Error('Espacio no encontrado');

    // Buscar la notificación que identifica al usuario creador del espacio ANTES de eliminar
    // Buscamos la notificación con tipo 'espacio_creado_pendiente' que guardamos al crear
    let usuarioCreadorId: number | null = null;
    
    console.log(`🔍 Buscando usuario creador para espacio ${espacio_id}...`);
    
    try {
      const { data: notificacionCreador, error: notifError } = await supabase
        .from('notificaciones')
        .select('usuario_id, tipo, relacion_entidad, relacion_id, id')
        .eq('relacion_entidad', 'espacios')
        .eq('relacion_id', espacio_id)
        .eq('tipo', 'espacio_creado_pendiente')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (notifError) {
        console.warn('❌ Error buscando notificación del creador:', notifError);
        console.warn('   Detalles:', JSON.stringify(notifError, null, 2));
      } else if (notificacionCreador) {
        usuarioCreadorId = notificacionCreador.usuario_id || null;
        console.log(`✅ Notificación encontrada:`, notificacionCreador);
        console.log(`   - Usuario ID: ${usuarioCreadorId}`);
      } else {
        console.warn(`⚠️ No se encontró notificación con tipo 'espacio_creado_pendiente' para espacio ${espacio_id}`);
      }
    } catch (error) {
      console.warn('❌ Error al buscar notificación del creador:', error);
    }

    // Si no encontramos la notificación, intentar buscar por otras notificaciones relacionadas
    if (!usuarioCreadorId) {
      try {
        console.log(`Buscando usuario creador alternativo para espacio ${espacio_id}...`);
        const { data: notificacionesAlternativas, error: altError } = await supabase
          .from('notificaciones')
          .select('usuario_id')
          .eq('relacion_entidad', 'espacios')
          .eq('relacion_id', espacio_id)
          .not('usuario_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (altError) {
          console.warn('Error en búsqueda alternativa:', altError);
        } else if (notificacionesAlternativas?.usuario_id) {
          usuarioCreadorId = notificacionesAlternativas.usuario_id;
          console.log(`✅ Usuario creador encontrado mediante búsqueda alternativa: ${usuarioCreadorId}`);
        } else {
          console.warn(`⚠️ No se encontró usuario creador para el espacio ${espacio_id} en ninguna notificación`);
        }
      } catch (error) {
        console.warn('Error en búsqueda alternativa:', error);
      }
    } else {
      console.log(`✅ Usuario creador encontrado: ${usuarioCreadorId} para espacio ${espacio_id}`);
    }

    // Si aún no encontramos el usuario, intentar una última búsqueda más amplia
    // Buscar cualquier notificación relacionada con este espacio que tenga un usuario_id
    if (!usuarioCreadorId) {
      try {
        console.log(`🔍 Búsqueda final: buscando cualquier notificación para espacio ${espacio_id}...`);
        const { data: todasLasNotificaciones, error: errorFinal } = await supabase
          .from('notificaciones')
          .select('usuario_id, tipo, relacion_entidad, relacion_id')
          .eq('relacion_id', espacio_id)
          .not('usuario_id', 'is', null)
          .order('created_at', { ascending: false });

        if (errorFinal) {
          console.warn('Error en búsqueda final:', errorFinal);
        } else {
          console.log(`📋 Notificaciones encontradas para espacio ${espacio_id}:`, todasLasNotificaciones);
          
          if (todasLasNotificaciones && todasLasNotificaciones.length > 0) {
            // Tomar el primer usuario_id que encontremos
            usuarioCreadorId = todasLasNotificaciones[0].usuario_id;
            console.log(`✅ Usuario creador encontrado en búsqueda final: ${usuarioCreadorId}`);
          } else {
            console.error(`❌ No se encontró ninguna notificación con usuario_id para el espacio ${espacio_id}`);
          }
        }
      } catch (error) {
        console.error('Error en búsqueda final:', error);
      }
    }

    // Si se rechaza, eliminar el espacio de la base de datos
    // No tiene sentido mantener espacios rechazados, el usuario ya recibirá la notificación
    if (nuevo_estado === 'rechazado') {
      // Notificar al usuario ANTES de eliminar el espacio
      if (usuarioCreadorId) {
        let mensajeRechazo = `Tu propuesta de espacio común "${espacio.nombre}" ha sido rechazada.`;
        if (motivo_rechazo) {
          mensajeRechazo += ` Motivo: ${motivo_rechazo}`;
        }
        
        try {
          // Crear notificación con título descriptivo
          await crearNotificacion(
            usuarioCreadorId,
            'creacion_espacio_rechazada',
            mensajeRechazo,
            'espacios',
            espacio_id,
            'Creación de Nuevo Espacio Rechazada' // Título específico y descriptivo
          );
          console.log(`Notificación de rechazo enviada al usuario ${usuarioCreadorId} para el espacio ${espacio_id}`);
        } catch (notifError: any) {
          console.error('Error creando notificación de rechazo:', notifError);
          // No lanzar el error para que el proceso continúe, pero registrar el problema
        }
      } else {
        console.error(`❌ No se pudo encontrar el usuario creador del espacio ${espacio_id}.`);
        
        // Último intento: buscar en las notificaciones de administradores
        // Cuando se crea un espacio, también se notifica a los administradores con el usuario_creador_id
        try {
          console.log(`🔍 Último intento: buscando en notificaciones de administradores...`);
          const { data: notifAdmin } = await supabase
            .from('notificaciones')
            .select('mensaje, usuario_id')
            .eq('relacion_entidad', 'espacios')
            .eq('relacion_id', espacio_id)
            .eq('tipo', 'nuevo_espacio_comun')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (notifAdmin?.mensaje) {
            // El mensaje contiene información sobre el usuario creador
            // Ejemplo: "Nuevo espacio común propuesto: [nombre]"
            // Pero necesitamos el usuario_id, así que busquemos de otra forma
            console.log('Notificación de admin encontrada:', notifAdmin);
          }

          // Buscar cualquier notificación que mencione este espacio y tenga un usuario_id válido
          // Ordenar por created_at ASC para obtener la más antigua primero (debería ser la del creador)
          const { data: todasNotifs, error: errorTodas } = await supabase
            .from('notificaciones')
            .select('usuario_id, tipo, relacion_entidad, relacion_id, mensaje, created_at')
            .eq('relacion_id', espacio_id)
            .not('usuario_id', 'is', null)
            .order('created_at', { ascending: true }) // La más antigua primero (la inicial del creador)
            .limit(20);

          if (errorTodas) {
            console.error('Error buscando todas las notificaciones:', errorTodas);
          } else if (todasNotifs && todasNotifs.length > 0) {
            console.log(`📋 Todas las notificaciones para espacio ${espacio_id}:`, todasNotifs);
            
            // Buscar primero la notificación del creador (tipo 'espacio_creado_pendiente')
            const notifCreador = todasNotifs.find(n => n.tipo === 'espacio_creado_pendiente');
            if (notifCreador) {
              usuarioCreadorId = notifCreador.usuario_id;
              console.log(`✅ Usuario creador encontrado en notificación 'espacio_creado_pendiente': ${usuarioCreadorId}`);
            } else {
              // Si no encontramos la del creador, tomar la primera (más antigua)
              usuarioCreadorId = todasNotifs[0].usuario_id;
              console.log(`✅ Usuario creador encontrado en primera notificación (más antigua): ${usuarioCreadorId}`);
            }
            
            // Ahora sí podemos notificar
            if (usuarioCreadorId) {
              let mensajeRechazo = `Tu propuesta de espacio común "${espacio.nombre}" ha sido rechazada.`;
              if (motivo_rechazo) {
                mensajeRechazo += ` Motivo: ${motivo_rechazo}`;
              }
              
              try {
                const notifEnviada = await crearNotificacion(
                  usuarioCreadorId,
                  'creacion_espacio_rechazada',
                  mensajeRechazo,
                  'espacios',
                  espacio_id,
                  'Creación de Nuevo Espacio Rechazada'
                );
                if (notifEnviada) {
                  console.log(`✅ Notificación de rechazo enviada exitosamente al usuario ${usuarioCreadorId} (encontrado en última búsqueda)`);
                  console.log(`   - Notificación ID: ${notifEnviada.id}`);
                } else {
                  console.error('❌ La notificación se creó pero no se retornó');
                }
              } catch (notifError: any) {
                console.error('❌ Error creando notificación de rechazo (último intento):', notifError);
                console.error('   Detalles:', JSON.stringify(notifError, null, 2));
                
                // Intentar crear directamente como último recurso
                try {
                  const { data: notifDirecta, error: errorDirecto } = await supabase
                    .from('notificaciones')
                    .insert([{
                      usuario_id: usuarioCreadorId,
                      tipo: 'creacion_espacio_rechazada',
                      titulo: 'Creación de Nuevo Espacio Rechazada',
                      mensaje: mensajeRechazo,
                      relacion_entidad: 'espacios',
                      relacion_id: espacio_id,
                      estado: 'pendiente',
                      leida: false,
                      accion_requerida: null,
                      fecha_creacion: getCurrentLocalISOString(),
                      fecha_lectura: null,
                      created_at: getCurrentLocalISOString(),
                      updated_at: getCurrentLocalISOString()
                    }])
                    .select()
                    .single();
                    
                  if (errorDirecto) {
                    console.error('❌ Error en creación directa de notificación:', errorDirecto);
                  } else if (notifDirecta) {
                    console.log(`✅ Notificación creada directamente (fallback): ID ${notifDirecta.id}`);
                  }
                } catch (fallbackError: any) {
                  console.error('❌ Error en fallback de creación de notificación:', fallbackError);
                }
              }
            }
          } else {
            console.error(`❌ No se encontró ninguna notificación con usuario_id para el espacio ${espacio_id}`);
            console.error(`   La notificación NO se enviará al usuario creador.`);
            console.error(`   Esto puede ocurrir si la notificación inicial no se creó correctamente.`);
            console.error(`   Espacio: ${espacio.nombre} (ID: ${espacio_id})`);
          }
        } catch (error) {
          console.error('Error en último intento de búsqueda:', error);
        }
      }

      // Eliminar el espacio rechazado
      const { error: deleteError } = await supabase
        .from('espacios_comunes')
        .delete()
        .eq('id', espacio_id);

      if (deleteError) throw deleteError;
    } else {
      // Si se aprueba, activar el espacio
      const updateData: any = {
        activo: true,
        updated_at: getCurrentLocalISOString()
      };

      const { error: updateError } = await supabase
        .from('espacios_comunes')
        .update(updateData)
        .eq('id', espacio_id);

      if (updateError) throw updateError;

      // Notificar al usuario que se aprobó
      if (usuarioCreadorId) {
        try {
          const notifEnviada = await crearNotificacion(
            usuarioCreadorId,
            'creacion_espacio_aprobada',
            `Tu propuesta de espacio común "${espacio.nombre}" ha sido aprobada y ahora está disponible para reservas.`,
            'espacios',
            espacio_id,
            'Creación de Nuevo Espacio Aprobada' // Título específico y descriptivo
          );
          if (notifEnviada) {
            console.log(`✅ Notificación de aprobación enviada exitosamente al usuario ${usuarioCreadorId} para el espacio ${espacio_id}`);
            console.log(`   - Notificación ID: ${notifEnviada.id}`);
          } else {
            console.error('❌ La notificación se creó pero no se retornó');
          }
        } catch (notifError: any) {
          console.error('❌ Error creando notificación de aprobación:', notifError);
          console.error('   Detalles:', JSON.stringify(notifError, null, 2));
          
          // Intentar crear directamente como último recurso
          try {
            const { data: notifDirecta, error: errorDirecto } = await supabase
              .from('notificaciones')
              .insert([{
                usuario_id: usuarioCreadorId,
                tipo: 'creacion_espacio_aprobada',
                titulo: 'Creación de Nuevo Espacio Aprobada',
                mensaje: `Tu propuesta de espacio común "${espacio.nombre}" ha sido aprobada y ahora está disponible para reservas.`,
                relacion_entidad: 'espacios',
                relacion_id: espacio_id,
                estado: 'pendiente',
                leida: false,
                accion_requerida: null,
                fecha_creacion: getCurrentLocalISOString(),
                fecha_lectura: null,
                created_at: getCurrentLocalISOString(),
                updated_at: getCurrentLocalISOString()
              }])
              .select()
              .single();
              
            if (errorDirecto) {
              console.error('❌ Error en creación directa de notificación:', errorDirecto);
            } else if (notifDirecta) {
              console.log(`✅ Notificación creada directamente (fallback): ID ${notifDirecta.id}`);
            }
          } catch (fallbackError: any) {
            console.error('❌ Error en fallback de creación de notificación:', fallbackError);
          }
        }
      } else {
        console.error(`❌ No se pudo encontrar el usuario creador del espacio ${espacio_id}. La notificación no se enviará.`);
        console.error(`   Espacio: ${espacio.nombre} (ID: ${espacio_id})`);
        
        // Intentar buscar de nuevo antes de dar por perdido
        try {
          const { data: todasNotifs } = await supabase
            .from('notificaciones')
            .select('usuario_id, tipo, relacion_entidad, relacion_id')
            .eq('relacion_id', espacio_id)
            .not('usuario_id', 'is', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
            
          if (todasNotifs?.usuario_id) {
            const usuarioIdEncontrado = todasNotifs.usuario_id;
            console.log(`✅ Usuario encontrado en búsqueda final de aprobación: ${usuarioIdEncontrado}`);
            
            try {
              await crearNotificacion(
                usuarioIdEncontrado,
                'creacion_espacio_aprobada',
                `Tu propuesta de espacio común "${espacio.nombre}" ha sido aprobada y ahora está disponible para reservas.`,
                'espacios',
                espacio_id,
                'Creación de Nuevo Espacio Aprobada'
              );
              console.log(`✅ Notificación de aprobación enviada al usuario ${usuarioIdEncontrado}`);
            } catch (err: any) {
              console.error('❌ Error enviando notificación en búsqueda final:', err);
            }
          }
        } catch (error) {
          console.error('❌ Error en búsqueda final de aprobación:', error);
        }
      }
    }

    return {
      success: true,
      message: `Espacio ${nuevo_estado === 'activo' ? 'aprobado' : 'rechazado'} exitosamente`,
      espacio_id
    };
  } catch (error) {
    console.error('Error en validarEspacioComun:', error);
    throw error;
  }
};

// Eliminar espacio común (solo para administradores)
// Actualizar espacio común
export const actualizarEspacioComun = async (
  espacio_id: number,
  admin_id: number,
  datos: {
    nombre?: string;
    descripcion?: string | null;
    capacidad?: number | null;
    horarios?: string | null;
    equipamiento?: string[] | null;
  }
) => {
  try {
    // Verificar que el usuario es administrador
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', admin_id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Usuario no encontrado');
    }

    if (usuario.rol !== 'admin') {
      throw new Error('Solo los administradores pueden actualizar espacios comunes');
    }

    // Actualizar el espacio
    const { data, error } = await supabase
      .from('espacios_comunes')
      .update({
        ...datos,
        updated_at: getCurrentLocalISOString(),
      })
      .eq('id', espacio_id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data, message: 'Espacio común actualizado exitosamente' };
  } catch (error) {
    console.error('Error en actualizarEspacioComun:', error);
    throw error;
  }
};

export const eliminarEspacioComun = async (espacio_id: number, admin_id: number) => {
  try {
    // Verificar que el usuario es administrador
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', admin_id)
      .single();

    if (usuarioError || !usuario) {
      throw new Error('Usuario no encontrado');
    }

    if (usuario.rol !== 'admin') {
      throw new Error('Solo los administradores pueden eliminar espacios comunes');
    }

    // Verificar que el espacio existe
    const { data: espacio, error: espacioError } = await supabase
      .from('espacios_comunes')
      .select('*')
      .eq('id', espacio_id)
      .single();

    if (espacioError || !espacio) {
      throw new Error('Espacio no encontrado');
    }

    // Buscar el usuario creador para notificarle (si existe)
    let usuarioCreadorId: number | null = null;
    try {
      const { data: notificacionCreador } = await supabase
        .from('notificaciones')
        .select('usuario_id')
        .eq('relacion_entidad', 'espacios')
        .eq('relacion_id', espacio_id)
        .eq('tipo', 'espacio_creado_pendiente')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (notificacionCreador) {
        usuarioCreadorId = notificacionCreador.usuario_id;
      }
    } catch (error) {
      console.error('Error buscando usuario creador:', error);
    }

    // Eliminar el espacio
    const { error: deleteError } = await supabase
      .from('espacios_comunes')
      .delete()
      .eq('id', espacio_id);

    if (deleteError) throw deleteError;

    // Notificar al usuario creador si existe
    if (usuarioCreadorId) {
      try {
        await crearNotificacion(
          usuarioCreadorId,
          'espacio_eliminado',
          `El espacio común "${espacio.nombre}" ha sido eliminado por el administrador.`,
          'espacios',
          espacio_id,
          'Espacio Eliminado'
        );
      } catch (notifError) {
        console.error('Error enviando notificación de eliminación:', notifError);
      }
    }

    return { success: true, message: 'Espacio eliminado exitosamente' };
  } catch (error) {
    console.error('Error en eliminarEspacioComun:', error);
    throw error;
  }
};

export const fetchReservasEspacios = async (filters?: {
  usuario_id?: number;
  espacio_id?: number;
  estado?: EstadoEnum;
  fecha_desde?: string;
  fecha_hasta?: string;
}) => {
  try {
    let query = supabase
      .from('reservas_espacios')
      .select(`
        *,
        espacios_comunes(*),
        usuarios(nombre, correo, telefono)
      `)
      .order('fecha_reserva', { ascending: false })
      .order('hora_inicio', { ascending: true });

    if (filters?.usuario_id) query = query.eq('usuario_id', filters.usuario_id);
    if (filters?.espacio_id) query = query.eq('espacio_id', filters.espacio_id);
    if (filters?.estado) query = query.eq('estado', filters.estado);
    if (filters?.fecha_desde) query = query.gte('fecha_reserva', filters.fecha_desde);
    if (filters?.fecha_hasta) query = query.lte('fecha_reserva', filters.fecha_hasta);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchReservasEspacios:', error);
    throw error;
  }
};

export const crearReservaEspacio = async ({
  espacio_id,
  usuario_id,
  fecha_reserva,
  hora_inicio,
  hora_fin,
  motivo,
  numero_personas
}: {
  espacio_id: number;
  usuario_id: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  numero_personas: number;
}) => {
  try {
    // 1. Verificar disponibilidad
    const { data: reservasExistentes, error: reservasError } = await supabase
      .from('reservas_espacios')
      .select('*')
      .eq('espacio_id', espacio_id)
      .eq('fecha_reserva', fecha_reserva)
      .eq('estado', 'aprobado')
      .or(`hora_inicio.lte.${hora_fin},hora_fin.gte.${hora_inicio}`);

    if (reservasError) throw reservasError;

    if (reservasExistentes && reservasExistentes.length > 0) {
      throw new Error('El espacio ya está reservado en ese horario');
    }

    // 2. Verificar capacidad
    const { data: espacio, error: espacioError } = await supabase
      .from('espacios_comunes')
      .select('capacidad, nombre')
      .eq('id', espacio_id)
      .single();

    if (espacioError) throw espacioError;

    if (espacio.capacidad && numero_personas > espacio.capacidad) {
      throw new Error(`La capacidad máxima es ${espacio.capacidad} personas`);
    }

    // 3. Crear la reserva
    const { data, error } = await supabase
      .from('reservas_espacios')
      .insert([{
        espacio_id,
        usuario_id,
        fecha_reserva,
        hora_inicio,
        hora_fin,
        motivo,
        numero_personas,
        estado: 'pendiente',
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }])
      .select(`
        *,
        espacios_comunes(*),
        usuarios(nombre, correo)
      `);

    if (error) throw error;

    // 4. Notificar administradores
    await notificarAdministradores(
      usuario_id,
      'nueva_reserva_espacio',
      `Nueva solicitud de reserva para ${espacio.nombre} el ${fecha_reserva}`,
      data[0].id
    );

    return data[0];
  } catch (error) {
    console.error('Error en crearReservaEspacio:', error);
    throw error;
  }
};

export const validarReservaEspacio = async ({
  reserva_id,
  admin_id,
  nuevo_estado,
  motivo_rechazo
}: {
  reserva_id: number;
  admin_id: number;
  nuevo_estado: 'aprobado' | 'rechazado';
  motivo_rechazo?: string;
}) => {
  try {
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas_espacios')
      .select('*, usuarios(*), espacios_comunes(*)')
      .eq('id', reserva_id)
      .single();

    if (reservaError) throw new Error('Reserva no encontrada');

    const updateData: any = {
      estado: nuevo_estado,
      updated_at: getCurrentLocalISOString()
    };

    if (nuevo_estado === 'rechazado' && motivo_rechazo) {
      updateData.motivo_rechazo = motivo_rechazo;
    }

    const { error: updateError } = await supabase
      .from('reservas_espacios')
      .update(updateData)
      .eq('id', reserva_id);

    if (updateError) throw updateError;

    const estadoTexto = nuevo_estado === 'aprobado' ? 'aprobada' : 'rechazada';
    if (reserva.usuario_id) {
      await crearNotificacion(
        reserva.usuario_id,
        'reserva_procesada',
        `Su reserva para ${reserva.espacios_comunes?.nombre} ha sido ${estadoTexto}`,
        'reservas',
        reserva_id
      );
    }

    return {
      success: true,
      message: `Reserva ${estadoTexto} exitosamente`,
      reserva_id
    };
  } catch (error) {
    console.error('Error en validarReservaEspacio:', error);
    throw error;
  }
};

export const cancelarReservaEspacio = async (reserva_id: number, usuario_id: number) => {
  try {
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas_espacios')
      .select('usuario_id, estado')
      .eq('id', reserva_id)
      .single();

    if (reservaError) throw new Error('Reserva no encontrada');

    if (reserva.usuario_id !== usuario_id) {
      throw new Error('No tiene permisos para cancelar esta reserva');
    }

    if (reserva.estado === 'cancelado') {
      throw new Error('La reserva ya está cancelada');
    }

    const { error: updateError } = await supabase
      .from('reservas_espacios')
      .update({
        estado: 'cancelado',
        updated_at: getCurrentLocalISOString()
      })
      .eq('id', reserva_id);

    if (updateError) throw updateError;

    await notificarAdministradores(
      usuario_id,
      'reserva_cancelada',
      `Reserva #${reserva_id} ha sido cancelada`,
      reserva_id
    );

    return { success: true, message: 'Reserva cancelada exitosamente' };
  } catch (error) {
    console.error('Error en cancelarReservaEspacio:', error);
    throw error;
  }
};

export const verificarDisponibilidadEspacio = async (
  espacio_id: number,
  fecha: string,
  hora_inicio: string,
  hora_fin: string
) => {
  try {
    const { data: reservas, error } = await supabase
      .from('reservas_espacios')
      .select('hora_inicio, hora_fin')
      .eq('espacio_id', espacio_id)
      .eq('fecha_reserva', fecha)
      .eq('estado', 'aprobado')
      .or(`hora_inicio.lt.${hora_fin},hora_fin.gt.${hora_inicio}`);

    if (error) throw error;

    return {
      disponible: !reservas || reservas.length === 0,
      conflicto: reservas ? reservas[0] : null
    };
  } catch (error) {
    console.error('Error en verificarDisponibilidadEspacio:', error);
    throw error;
  }
};

// 6. SOLICITUDES DE MANTENIMIENTO
export const fetchSolicitudesMantenimiento = async (filters?: {
  usuario_solicitante_id?: number;
  condominio_id?: number;
  estado?: EstadoEnum;
  prioridad?: PrioridadEnum;
  responsable_id?: number;
}) => {
  try {
    let query = supabase
      .from('solicitudes_mantenimiento')
      .select(`
        *,
        usuarios!solicitudes_mantenimiento_usuario_solicitante_id_fkey(nombre, correo, telefono),
        responsable:usuarios!solicitudes_mantenimiento_responsable_id_fkey(nombre, correo, telefono)
      `)
      .order('fecha_solicitud', { ascending: false });

    if (filters?.usuario_solicitante_id) query = query.eq('usuario_solicitante_id', filters.usuario_solicitante_id);
    if (filters?.condominio_id) query = query.eq('condominio_id', filters.condominio_id);
    if (filters?.estado) query = query.eq('estado', filters.estado);
    if (filters?.prioridad) query = query.eq('prioridad', filters.prioridad);
    if (filters?.responsable_id) query = query.eq('responsable_id', filters.responsable_id);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchSolicitudesMantenimiento:', error);
    throw error;
  }
};

export const crearSolicitudMantenimiento = async ({
  condominio_id,
  usuario_solicitante_id,
  titulo,
  descripcion,
  prioridad = 'media' as PrioridadEnum,
  ubicacion,
  estado = 'pendiente' as EstadoEnum
}: {
  condominio_id?: number;
  usuario_solicitante_id: number;
  titulo: string;
  descripcion: string;
  prioridad?: PrioridadEnum;
  ubicacion?: string;
  estado?: EstadoEnum;
}) => {
  try {
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
        prioridad: prioridad || ('media' as PrioridadEnum),
        ubicacion: ubicacion || null,
        estado: estado || ('pendiente' as EstadoEnum),
        fecha_solicitud: getCurrentLocalISOString(),
        fecha_inicio: null,
        fecha_completado: null,
        responsable_id: null,
        observaciones: null,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }])
      .select(`
        *,
        usuarios!solicitudes_mantenimiento_usuario_solicitante_id_fkey(nombre, correo)
      `);

    if (error) throw error;

    await notificarAdministradores(
      usuario_solicitante_id,
      'nueva_solicitud_mantenimiento',
      `Nueva solicitud de mantenimiento: ${titulo} - Prioridad: ${prioridad}`,
      data[0].id,
      'mantenimiento'
    );

    await notificarTecnicosMantenimiento(
      usuario_solicitante_id,
      'nueva_solicitud_mantenimiento',
      `Nueva solicitud de mantenimiento: ${titulo}`,
      data[0].id
    );

    return data[0];
  } catch (error) {
    console.error('Error en crearSolicitudMantenimiento:', error);
    throw error;
  }
};

// ==================== GESTIÓN DE AVANCES DE MANTENIMIENTO ====================

// Obtener avances de una solicitud de mantenimiento
export const fetchAvancesMantenimiento = async (solicitud_id: number) => {
  try {
    // Intentar obtener desde tabla avances_mantenimiento
    const { data: avances, error } = await supabase
      .from('avances_mantenimiento')
      .select(`
        *,
        creado_por:usuarios(nombre, correo)
      `)
      .eq('solicitud_id', solicitud_id)
      .order('fecha', { ascending: false });

    if (error) {
      // Si no existe la tabla, retornar array vacío
      console.warn('Error obteniendo avances (la tabla puede no existir aún):', error);
      return [];
    }

    return avances || [];
  } catch (error) {
    console.error('Error en fetchAvancesMantenimiento:', error);
    return [];
  }
};

// Agregar avance a una solicitud de mantenimiento
export const agregarAvanceMantenimiento = async ({
  solicitud_id,
  descripcion,
  foto_file,
  creado_por
}: {
  solicitud_id: number;
  descripcion: string;
  foto_file?: File;
  creado_por: number;
}) => {
  try {
    let foto_url: string | null = null;

    // Subir foto si existe
    if (foto_file) {
      const fileExt = foto_file.name.split('.').pop();
      const fileName = `mantenimiento/${solicitud_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('condominio-files')
        .upload(filePath, foto_file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('condominio-files')
          .getPublicUrl(filePath);
        foto_url = publicUrl;
      } else {
        console.warn('Error subiendo foto de avance:', uploadError);
      }
    }

    // Insertar avance en la tabla
    const { data, error } = await supabase
      .from('avances_mantenimiento')
      .insert([{
        solicitud_id,
        descripcion,
        foto_url,
        creado_por,
        fecha: getCurrentLocalISOString(),
        created_at: getCurrentLocalISOString()
      }])
      .select(`
        *,
        creado_por:usuarios(nombre, correo)
      `)
      .single();

    if (error) {
      // Si la tabla no existe, lanzar error informativo
      if (error.code === '42P01') {
        throw new Error('La tabla de avances de mantenimiento no está configurada en la base de datos. Contacta al administrador.');
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error en agregarAvanceMantenimiento:', error);
    throw error;
  }
};

export const actualizarEstadoSolicitud = async ({
  solicitud_id,
  usuario_id,
  nuevo_estado,
  observaciones,
  responsable_id,
  motivo_rechazo
}: {
  solicitud_id: number;
  usuario_id: number;
  nuevo_estado: EstadoEnum;
  observaciones?: string;
  responsable_id?: number;
  motivo_rechazo?: string;
}) => {
  try {
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_mantenimiento')
      .select('*, usuarios!solicitudes_mantenimiento_usuario_solicitante_id_fkey(*)')
      .eq('id', solicitud_id)
      .single();

    if (solicitudError) throw new Error('Solicitud no encontrada');

    const updateData: any = {
      estado: nuevo_estado,
      updated_at: getCurrentLocalISOString()
    };

    if (observaciones) updateData.observaciones = observaciones;
    if (responsable_id) updateData.responsable_id = responsable_id;
    
    // Actualizar fechas según el estado
    if (nuevo_estado === 'aprobado' || nuevo_estado === 'completado') {
      updateData.fecha_inicio = getCurrentLocalISOString();
    }
    if (nuevo_estado === 'completado') {
      updateData.fecha_completado = getCurrentLocalISOString();
    }

    const { error: updateError } = await supabase
      .from('solicitudes_mantenimiento')
      .update(updateData)
      .eq('id', solicitud_id);

    if (updateError) throw updateError;

    const estadoTexto: Record<EstadoEnum, string> = {
      'pendiente': 'pendiente',
      'aprobado': 'aprobada',
      'rechazado': 'rechazada',
      'completado': 'completada',
      'cancelado': 'cancelada',
      'activo': 'activa',
      'inactivo': 'inactiva',
      'vencido': 'vencida',
      'pagado': 'pagada'
    };
    
    const textoEstado = estadoTexto[nuevo_estado] || nuevo_estado;

    // Notificar al usuario
    if (solicitud.usuario_solicitante_id) {
      let mensajeNotificacion = `Su solicitud "${solicitud.titulo}" ha sido ${textoEstado}`;
      
      // Si fue rechazada, incluir el motivo
      if (nuevo_estado === 'rechazado' && motivo_rechazo) {
        mensajeNotificacion += `. Motivo: ${motivo_rechazo}`;
      }
      
      try {
        await crearNotificacion(
          solicitud.usuario_solicitante_id,
          nuevo_estado === 'aprobado' ? 'mantenimiento_aprobado' : nuevo_estado === 'rechazado' ? 'mantenimiento_rechazado' : 'mantenimiento_actualizado',
          mensajeNotificacion,
          'mantenimiento',
          solicitud_id,
          nuevo_estado === 'aprobado' ? 'Solicitud Aprobada' : nuevo_estado === 'rechazado' ? 'Solicitud Rechazada' : 'Actualización de Solicitud' // Títulos específicos
        );
        console.log(`Notificación de ${nuevo_estado} enviada al usuario ${solicitud.usuario_solicitante_id} para la solicitud ${solicitud_id}`);
      } catch (notifError: any) {
        console.error('Error creando notificación de solicitud:', notifError);
        // No lanzar el error para que el proceso continúe, pero registrar el problema
      }
    }

    return {
      success: true,
      message: `Solicitud ${textoEstado} exitosamente`,
      solicitud_id
    };
  } catch (error) {
    console.error('Error en actualizarEstadoSolicitud:', error);
    throw error;
  }
};

// 7. DASHBOARD Y ESTADO DE CUENTA
export const getEstadoCuentaUsuario = async (usuario_id: number) => {
  try {
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select(`
        *,
        condominios(*),
        usuario_vivienda!usuario_vivienda_usuario_id_fkey(
          *,
          viviendas(*)
        ),
        pagos(*)
      `)
      .eq('id', usuario_id)
      .single();

    if (userError) throw userError;

    const pagosPendientes = usuario.pagos?.filter((p: any) => 
      p.estado === 'pendiente'
    ) || [];

    const pagosPagados = usuario.pagos?.filter((p: any) => 
      p.estado === 'pagado'
    ) || [];

    const totalPendiente = pagosPendientes.reduce((sum: number, p: any) => sum + p.monto, 0);
    const totalPagado = pagosPagados.reduce((sum: number, p: any) => sum + p.monto, 0);

    const anunciosRecientes = usuario.condominio_id ? 
      await fetchAnuncios(usuario.condominio_id) : [];

    return {
      usuario,
      resumen: {
        totalPendiente,
        totalPagado,
        pagosPendientes: pagosPendientes.length,
        pagosPagados: pagosPagados.length
      },
      anunciosRecientes: anunciosRecientes.slice(0, 5),
      viviendas: usuario.usuario_vivienda?.map((uv: any) => uv.viviendas) || []
    };
  } catch (error) {
    console.error('Error en getEstadoCuentaUsuario:', error);
    throw error;
  }
};

// ==================== FUNCIONES AUXILIARES ====================

const notificarAdministradores = async (
  usuario_id: number,
  tipo: string,
  mensaje: string,
  relacion_id?: number,
  relacion_entidad?: string
) => {
  try {
    console.log(`📢 Notificando administradores - Usuario creador: ${usuario_id}, Tipo: ${tipo}, Relacion ID: ${relacion_id}`);
    const { data: administradores } = await supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'admin');

    if (!administradores || administradores.length === 0) {
      console.warn('⚠️ No se encontraron administradores para notificar');
      return;
    }

    const relacionEntidadFinal = relacion_entidad || 'pagos';
    console.log(`   - Administradores encontrados: ${administradores.length}`);
    console.log(`   - Relacion entidad: ${relacionEntidadFinal}`);

    const notificaciones = administradores.map(admin => ({
      usuario_id: admin.id,
      tipo,
      titulo: 'Nueva acción requerida',
      mensaje,
      relacion_entidad: relacionEntidadFinal, // Usar relacion_entidad que es el campo que existe en la BD
      relacion_id: relacion_id || 0,
      estado: 'pendiente',
      leida: false,
      accion_requerida: true,
      fecha_creacion: getCurrentLocalISOString(),
      fecha_lectura: null,
      created_at: getCurrentLocalISOString(),
      updated_at: getCurrentLocalISOString()
    }));

    const { data: notifsInsertadas, error } = await supabase
      .from('notificaciones')
      .insert(notificaciones)
      .select();

    if (error) {
      console.error('❌ Error insertando notificaciones de administradores:', error);
      throw error;
    } else {
      console.log(`✅ ${notifsInsertadas?.length || 0} notificaciones enviadas a administradores`);
    }
  } catch (error) {
    console.error('❌ Error notificando administradores:', error);
  }
};

const notificarResidentesCondominio = async (
  condominio_id: number,
  tipo: string,
  mensaje: string,
  relacion_entidad: string,
  relacion_id: number
) => {
  try {
    const { data: residentes } = await supabase
      .from('usuarios')
      .select('id')
      .eq('condominio_id', condominio_id)
      .neq('rol', 'admin');

    if (!residentes) return;

    const notificaciones = residentes.map(residente => ({
      usuario_id: residente.id,
      tipo,
      titulo: 'Nuevo anuncio',
      mensaje,
      relacion_entidad,
      relacion_id: relacion_id || 0,
      leida: false,
      accion_requerida: null,
      fecha_creacion: getCurrentLocalISOString(),
      fecha_lectura: null,
      created_at: getCurrentLocalISOString(),
      updated_at: getCurrentLocalISOString()
    }));

    await supabase
      .from('notificaciones')
      .insert(notificaciones);
  } catch (error) {
    console.error('Error notificando residentes:', error);
  }
};

export const crearNotificacion = async (
  usuario_id: number,
  tipo: string,
  mensaje: string,
  relacion_entidad?: string,
  relacion_id?: number,
  titulo?: string
) => {
  try {
    // Asegurar valores por defecto
    const relacionEntidadFinal = relacion_entidad || 'pago';
    const relacionIdFinal = relacion_id || 0;
    
    // Generar título basado en el tipo si no se proporciona
    let tituloFinal = titulo;
    if (!tituloFinal) {
      const tipoLower = tipo.toLowerCase();
      const relacionLower = relacionEntidadFinal.toLowerCase();
      
      if (tipoLower.includes('rechazado') || tipoLower.includes('rechazo')) {
        // Determinar el tipo de rechazo basado en el tipo y la entidad relacionada
        if (tipoLower.includes('creacion_espacio') || (tipoLower.includes('espacio') && tipoLower.includes('creacion'))) {
          tituloFinal = 'Creación de Nuevo Espacio Rechazada';
        } else if (tipoLower.includes('pago') || relacionLower === 'pagos' || relacionLower === 'pago') {
          tituloFinal = 'Pago Rechazado';
        } else if (tipoLower.includes('espacio') || relacionLower === 'espacios' || relacionLower === 'espacio') {
          tituloFinal = 'Espacio Rechazado';
        } else if (tipoLower.includes('evento') || relacionLower === 'evento' || relacionLower === 'eventos') {
          tituloFinal = 'Evento Rechazado';
        } else if (tipoLower.includes('mantenimiento') || relacionLower === 'mantenimiento' || relacionLower === 'solicitudes') {
          tituloFinal = 'Solicitud Rechazada';
        } else if (tipoLower.includes('solicitud')) {
          tituloFinal = 'Solicitud Rechazada';
        } else {
          tituloFinal = 'Solicitud Rechazada';
        }
      } else if (tipoLower.includes('aprobado') || tipoLower.includes('aprobacion')) {
        if (tipoLower.includes('creacion_espacio') || (tipoLower.includes('espacio') && tipoLower.includes('creacion'))) {
          tituloFinal = 'Creación de Nuevo Espacio Aprobada';
        } else if (tipoLower.includes('pago') || relacionLower === 'pagos' || relacionLower === 'pago') {
          tituloFinal = 'Pago Aprobado';
        } else if (tipoLower.includes('espacio') || relacionLower === 'espacios' || relacionLower === 'espacio') {
          tituloFinal = 'Espacio Aprobado';
        } else if (tipoLower.includes('evento') || relacionLower === 'evento' || relacionLower === 'eventos') {
          tituloFinal = 'Evento Aprobado';
        } else if (tipoLower.includes('mantenimiento') || relacionLower === 'mantenimiento' || relacionLower === 'solicitudes') {
          tituloFinal = 'Solicitud Aprobada';
        } else if (tipoLower.includes('solicitud')) {
          tituloFinal = 'Solicitud Aprobada';
        } else {
          tituloFinal = 'Solicitud Aprobada';
        }
      } else if (tipoLower.includes('pago')) {
        tituloFinal = 'Actualización de Pago';
      } else if (tipoLower.includes('espacio')) {
        tituloFinal = 'Actualización de Espacio';
      } else if (tipoLower.includes('evento')) {
        tituloFinal = 'Actualización de Evento';
      } else if (tipoLower.includes('mantenimiento')) {
        tituloFinal = 'Actualización de Solicitud';
      } else if (tipoLower.includes('pendiente')) {
        tituloFinal = 'Solicitud Pendiente';
      } else {
        tituloFinal = 'Notificación';
      }
    }
    
    const { data, error } = await supabase
      .from('notificaciones')
      .insert([{
        usuario_id,
        tipo,
        titulo: tituloFinal,
        mensaje,
        relacion_entidad: relacionEntidadFinal, // Usar relacion_entidad que es el campo que existe en la BD
        relacion_id: relacionIdFinal,
        estado: 'pendiente', // Campo requerido en la BD
        leida: false,
        accion_requerida: null,
        fecha_creacion: getCurrentLocalISOString(),
        fecha_lectura: null,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }])
      .select();

    if (error) {
      console.error('Error creando notificación:', error);
      throw error; // Lanzar el error para que se pueda manejar arriba
    }

    return data?.[0];
  } catch (error) {
    console.error('Error creando notificación:', error);
    throw error; // Lanzar el error para que se pueda manejar arriba
  }
};

const notificarTecnicosMantenimiento = async (
  usuario_id: number,
  tipo: string,
  mensaje: string,
  relacion_id?: number
) => {
  try {
    const { data: tecnicos } = await supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'conserje'); // 'mantenimiento' se mapea a 'conserje'

    if (!tecnicos) return;

    const notificaciones = tecnicos.map(tecnico => ({
      usuario_id: tecnico.id,
      tipo,
      titulo: 'Nueva solicitud de mantenimiento',
      mensaje,
      relacion_entidad: 'mantenimiento',
      relacion_id: relacion_id || 0,
      leida: false,
      accion_requerida: null,
      fecha_creacion: getCurrentLocalISOString(),
      fecha_lectura: null,
      created_at: getCurrentLocalISOString(),
      updated_at: getCurrentLocalISOString()
    }));

    await supabase
      .from('notificaciones')
      .insert(notificaciones);
  } catch (error) {
    console.error('Error notificando técnicos:', error);
  }
};

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

export const loginUsuario = async (correo: string, contraseña: string) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', correo)
      .eq('contraseña', contraseña)
      .single();

    if (error) throw new Error('Credenciales incorrectas');
    
    return data;
  } catch (error) {
    throw new Error('Error en el inicio de sesión');
  }
};

// Función para obtener todos los condominios
// Obtener condominios con conteo de viviendas
export const fetchCondominios = async () => {
  try {
    const { data: condominios, error } = await supabase
      .from('condominios')
      .select('*')
      .order('nombre');

    if (error) throw error;

    // Para cada condominio, contar las viviendas asociadas
    const condominiosConViviendas = await Promise.all(
      (condominios || []).map(async (condominio) => {
        const { count, error: countError } = await supabase
          .from('viviendas')
          .select('*', { count: 'exact', head: true })
          .eq('condominio_id', condominio.id);

        if (countError) {
          console.warn(`Error contando viviendas para condominio ${condominio.id}:`, countError);
          return { ...condominio, numero_viviendas: 0 };
        }

        return { ...condominio, numero_viviendas: count || 0 };
      })
    );

    return condominiosConViviendas;
  } catch (error) {
    console.error('Error en fetchCondominios:', error);
    throw error;
  }
};

// Buscar condominio por nombre (case-insensitive) o crearlo si no existe
export const buscarOCrearCondominio = async (nombreCondominio: string): Promise<number> => {
  try {
    if (!nombreCondominio || !nombreCondominio.trim()) {
      throw new Error('El nombre del condominio es requerido');
    }

    const nombreLimpio = nombreCondominio.trim();

    // Buscar condominio existente por nombre (case-insensitive)
    const { data: condominioExistente, error: searchError } = await supabase
      .from('condominios')
      .select('id, nombre')
      .ilike('nombre', nombreLimpio) // Case-insensitive search
      .maybeSingle();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw searchError;
    }

    // Si existe, retornar su ID
    if (condominioExistente) {
      console.log(`✅ Condominio encontrado: "${condominioExistente.nombre}" (ID: ${condominioExistente.id})`);
      return condominioExistente.id;
    }

    // Si no existe, crear uno nuevo
    console.log(`📝 Creando nuevo condominio: "${nombreLimpio}"`);
    const { data: nuevoCondominio, error: createError } = await supabase
      .from('condominios')
      .insert([{
        nombre: nombreLimpio,
        direccion: null,
        estado: 'Activo',
        telefono: null
      }])
      .select('id')
      .single();

    if (createError) throw createError;
    if (!nuevoCondominio) throw new Error('No se pudo crear el condominio');

    console.log(`✅ Condominio creado: "${nombreLimpio}" (ID: ${nuevoCondominio.id})`);
    return nuevoCondominio.id;
  } catch (error) {
    console.error('Error en buscarOCrearCondominio:', error);
    throw error;
  }
};

// ==================== CRUD DE CONDOMINIOS ====================

// Crear nuevo condominio
// IMPORTANTE: Solo incluir campos que existen en el esquema de la BD
// Campos según esquema: id (auto), nombre (requerido), direccion (opcional), 
// estado (opcional), telefono (opcional), created_at (auto), updated_at (auto)
// NO incluir created_at ni updated_at - se generan automáticamente por la BD
export const crearCondominio = async (data: {
  nombre: string;
  direccion?: string | null;
  estado?: string | null;
  telefono?: string | null;
}) => {
  try {
    // Solo insertar los campos que el usuario puede proporcionar
    // created_at y updated_at se generan automáticamente por la BD con DEFAULT CURRENT_TIMESTAMP
    const { data: condominio, error } = await supabase
      .from('condominios')
      .insert([{
        nombre: data.nombre,
        direccion: data.direccion || null,
        estado: data.estado || null,
        telefono: data.telefono || null
        // NO incluir created_at ni updated_at - la BD los genera automáticamente
      }])
      .select()
      .single();

    if (error) throw error;
    return condominio;
  } catch (error) {
    console.error('Error en crearCondominio:', error);
    throw error;
  }
};

// Editar condominio
// IMPORTANTE: Solo actualizar campos que existen en el esquema
// updated_at se actualiza automáticamente por el trigger de la BD
export const editarCondominio = async (
  id: number,
  data: {
    nombre?: string;
    direccion?: string | null;
    estado?: string | null;
    telefono?: string | null;
  }
) => {
  try {
    // Construir objeto de actualización solo con campos permitidos
    const updateData: any = {};
    
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.direccion !== undefined) updateData.direccion = data.direccion;
    if (data.estado !== undefined) updateData.estado = data.estado;
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    
    // NO incluir updated_at manualmente - el trigger de la BD lo actualiza automáticamente

    const { data: condominio, error } = await supabase
      .from('condominios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return condominio;
  } catch (error) {
    console.error('Error en editarCondominio:', error);
    throw error;
  }
};

// Eliminar condominio
export const eliminarCondominio = async (id: number) => {
  try {
    // Verificar si hay viviendas asociadas
    const { data: viviendas, error: viviendasError } = await supabase
      .from('viviendas')
      .select('id')
      .eq('condominio_id', id)
      .limit(1);

    if (viviendasError) throw viviendasError;

    if (viviendas && viviendas.length > 0) {
      throw new Error('No se puede eliminar el condominio porque tiene viviendas asociadas. Primero elimine o mueva las viviendas.');
    }

    // Verificar si hay usuarios asociados
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('condominio_id', id)
      .limit(1);

    if (usuariosError) throw usuariosError;

    if (usuarios && usuarios.length > 0) {
      throw new Error('No se puede eliminar el condominio porque tiene usuarios asociados. Primero actualice o elimine los usuarios.');
    }

    // Si no hay referencias, eliminar
    const { error } = await supabase
      .from('condominios')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error en eliminarCondominio:', error);
    throw error;
  }
};

// Función para obtener viviendas por condominio
export const fetchViviendas = async (condominioId?: number) => {
  try {
    let query = supabase
      .from('viviendas')
      .select('*')
      .eq('activo', true)
      .order('numero_apartamento');

    if (condominioId) {
      query = query.eq('condominio_id', condominioId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchViviendas:', error);
    throw error;
  }
};

// Función para obtener la vivienda activa de un usuario
export const obtenerViviendaUsuario = async (usuario_id: number) => {
  try {
    const { data, error } = await supabase
      .from('usuario_vivienda')
      .select('vivienda_id, viviendas(*)')
      .eq('usuario_id', usuario_id)
      .eq('activo', true)
      .single();

    if (error) throw error;
    return data?.vivienda_id || null;
  } catch (error) {
    console.error('Error obteniendo vivienda del usuario:', error);
    return null;
  }
};

// Función para convertir archivo a base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Función para subir archivo a Supabase Storage y obtener archivo_id
// Con fallback a base64 si los buckets no están disponibles
export const subirArchivoComprobante = async (
  file: File,
  usuario_id: number
): Promise<number | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${usuario_id}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    let publicUrl: string | null = null;
    let base64Data: string | null = null;

    // 1. Intentar subir a bucket principal "condominio-files"
    try {
      const filePath1 = `comprobantes/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('condominio-files')
        .upload(filePath1, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('condominio-files')
          .getPublicUrl(filePath1);
        publicUrl = urlData?.publicUrl || null;
      } else {
        throw uploadError;
      }
    } catch (error1) {
      console.warn('Error subiendo a condominio-files, intentando comprobantes:', error1);
      
      // 2. Intentar con bucket alternativo "comprobantes" (sin path duplicado)
      try {
        // Usar solo el fileName sin "comprobantes/" para evitar path duplicado
        const { error: uploadError2 } = await supabase.storage
          .from('comprobantes')
          .upload(fileName, file);

        if (!uploadError2) {
          const { data: urlData2 } = supabase.storage
            .from('comprobantes')
            .getPublicUrl(fileName);
          publicUrl = urlData2?.publicUrl || null;
        } else {
          throw uploadError2;
        }
      } catch (error2) {
        console.warn('Error subiendo a comprobantes, usando base64 como fallback:', error2);
        
        // 3. Fallback: convertir a base64 y almacenar en base de datos
        try {
          base64Data = await fileToBase64(file);
        } catch (error3) {
          console.error('Error convirtiendo archivo a base64:', error3);
          return null;
        }
      }
    }

    // 4. Crear registro en tabla archivos
    const archivoData: any = {
      usuario_id,
      entidad: 'pagos',
      entidad_id: null, // Se actualizará cuando se cree el pago
      nombre_original: file.name,
      tipo_mime: file.type,
      created_at: getCurrentLocalISOString()
    };

    if (publicUrl) {
      archivoData.url = publicUrl;
    } else if (base64Data) {
      // Almacenar base64 en un campo de texto (asumiendo que existe un campo para esto)
      // Si no existe, podemos usar el campo url para almacenar el prefijo "data:"
      archivoData.url = base64Data; // Almacenar base64 completo en url
    } else {
      return null;
    }

    const { data: archivoInsert, error: archivoError } = await supabase
      .from('archivos')
      .insert([archivoData])
      .select('id')
      .single();

    if (archivoError) {
      console.error('Error creando registro de archivo:', archivoError);
      return null;
    }

    return archivoInsert?.id || null;
  } catch (error) {
    console.error('Error en subirArchivoComprobante:', error);
    return null;
  }
};

// Función para obtener tipos de residencia
export const fetchTiposResidencia = async () => {
  try {
    const { data, error } = await supabase
      .from('tipos_residencia')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchTiposResidencia:', error);
    throw error;
  }
};

// Función para obtener estadísticas del dashboard
export const getEstadisticasDashboard = async (condominio_id?: number) => {
  try {
    // Construir queries base
    let usuariosQuery = supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true });
    
    let pagosQuery = supabase
      .from('pagos')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    
    let solicitudesQuery = supabase
      .from('solicitudes_mantenimiento')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    
    // Aplicar filtro de condominio si se proporciona
    if (condominio_id !== undefined) {
      usuariosQuery = usuariosQuery.eq('condominio_id', condominio_id);
      solicitudesQuery = solicitudesQuery.eq('condominio_id', condominio_id);
      // Nota: pagos no tiene condominio_id directo, se filtra por vivienda
    }
    
    const [
      { count: totalUsuarios },
      { count: pagosPendientes },
      { count: reservasPendientes },
      { count: solicitudesPendientes }
    ] = await Promise.all([
      usuariosQuery,
      pagosQuery,
      supabase
        .from('reservas_espacios')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente'),
      solicitudesQuery
    ]);

    return {
      totalUsuarios: totalUsuarios || 0,
      pagosPendientes: pagosPendientes || 0,
      reservasPendientes: reservasPendientes || 0,
      solicitudesPendientes: solicitudesPendientes || 0
    };
  } catch (error) {
    console.error('Error en getEstadisticasDashboard:', error);
    throw error;
  }
};

// Obtener notificaciones del usuario
export const fetchNotificacionesUsuario = async (usuario_id: number, leidas?: boolean) => {
  try {
    let query = supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('created_at', { ascending: false });

    if (leidas !== undefined) {
      query = query.eq('leida', leidas);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchNotificacionesUsuario:', error);
    throw error;
  }
};

// Marcar notificación como leída
export const marcarNotificacionLeida = async (notificacion_id: number) => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({
        leida: true,
        fecha_lectura: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      })
      .eq('id', notificacion_id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error en marcarNotificacionLeida:', error);
    throw error;
  }
};

// Eliminar notificación
export const eliminarNotificacion = async (notificacion_id: number) => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', notificacion_id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error en eliminarNotificacion:', error);
    throw error;
  }
};

// Eliminar todas las notificaciones leídas del usuario
export const eliminarNotificacionesLeidas = async (usuario_id: number) => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('leida', true);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error en eliminarNotificacionesLeidas:', error);
    throw error;
  }
};

// ==================== GESTIÓN DE APROBACIÓN DE USUARIOS ====================

// Notificar a administradores sobre nuevo registro de usuario
export const notificarRegistroUsuario = async (
  usuario_id: number,
  nombre: string,
  correo: string,
  rol_solicitado: string
) => {
  try {
    // Obtener todos los administradores
    const { data: administradores } = await supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'admin');

    if (!administradores || administradores.length === 0) return;

    const notificaciones = administradores.map(admin => ({
      usuario_id: admin.id,
      tipo: 'solicitud_registro',
      titulo: 'Nueva solicitud de registro',
      mensaje: `El usuario ${nombre} (${correo}) ha solicitado registrarse con el rol de ${rol_solicitado}. Por favor, revisa y aprueba o rechaza la solicitud.`,
      relacion_entidad: 'usuarios',
      relacion_id: usuario_id,
      leida: false,
      accion_requerida: true,
      estado: 'pendiente' as EstadoEnum,
      fecha_creacion: getCurrentLocalISOString(),
      fecha_lectura: null,
      created_at: getCurrentLocalISOString(),
      updated_at: getCurrentLocalISOString()
    }));

    const { error } = await supabase
      .from('notificaciones')
      .insert(notificaciones);

    if (error) throw error;
  } catch (error) {
    console.error('Error notificando administradores sobre registro:', error);
    throw error;
  }
};

// Obtener usuarios pendientes de aprobación (rol = null)
export const fetchUsuariosPendientes = async () => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        condominios (
          id,
          nombre
        )
      `)
      .is('rol', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchUsuariosPendientes:', error);
    throw error;
  }
};

// Aprobar usuario (asignar rol)
// IMPORTANTE: Al aprobar usuarios, NO se crean pagos automáticamente
// Los pagos deben ser creados exclusivamente por administradores cuando sea necesario
export const aprobarUsuario = async (
  usuario_id: number,
  rol: RoleUsuario,
  admin_id: number
) => {
  try {
    // Actualizar el rol del usuario
    // Mantener el estado como 'Activo' (usuarios nuevos no tienen deudas)
    const { data: usuario, error: updateError } = await supabase
      .from('usuarios')
      .update({
        rol: rol,
        Estado: 'Activo', // Asegurar que usuarios aprobados estén activos (sin deudas)
        updated_at: getCurrentLocalISOString()
      })
      .eq('id', usuario_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notificar al usuario que fue aprobado
    const { error: notifError } = await supabase
      .from('notificaciones')
      .insert([{
        usuario_id: usuario_id,
        tipo: 'aprobacion_registro',
        titulo: 'Registro aprobado',
        mensaje: `Tu solicitud de registro ha sido aprobada. Ahora puedes iniciar sesión con tu cuenta.`,
        relacion_entidad: 'usuarios',
        relacion_id: usuario_id,
        leida: false,
        accion_requerida: false,
        estado: 'aprobado' as EstadoEnum,
        fecha_creacion: getCurrentLocalISOString(),
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }]);

    if (notifError) console.error('Error creando notificación de aprobación:', notifError);

    // Marcar como leída la notificación de solicitud para el admin
    await supabase
      .from('notificaciones')
      .update({
        leida: true,
        fecha_lectura: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      })
      .eq('relacion_entidad', 'usuarios')
      .eq('relacion_id', usuario_id)
      .eq('tipo', 'solicitud_registro')
      .eq('usuario_id', admin_id);

    return usuario;
  } catch (error) {
    console.error('Error en aprobarUsuario:', error);
    throw error;
  }
};

// Rechazar usuario (eliminar o marcar como rechazado)
export const rechazarUsuario = async (
  usuario_id: number,
  motivo: string,
  admin_id: number
) => {
  try {
    // Obtener información del usuario antes de eliminarlo
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('correo, nombre')
      .eq('id', usuario_id)
      .single();

    if (usuarioError) throw new Error('Usuario no encontrado');

    // Crear notificación de rechazo antes de eliminar (usaremos el correo como referencia)
    // Guardamos en notificaciones con el correo en el mensaje para referencia futura
    const mensajeRechazo = `Tu solicitud de registro ha sido rechazada. Motivo: ${motivo || 'No especificado'}. Puedes contactar a la administración si tienes preguntas.`;

    // Intentar crear notificación (aunque el usuario será eliminado, guardamos el registro)
    try {
      await supabase
        .from('notificaciones')
        .insert([{
          usuario_id: null, // Usuario eliminado, no podemos referenciarlo
          tipo: 'rechazo_registro',
          titulo: 'Solicitud de registro rechazada',
          mensaje: mensajeRechazo,
          relacion_entidad: 'usuarios',
          relacion_id: usuario_id,
          leida: false,
          accion_requerida: false,
          estado: 'completado' as EstadoEnum,
          fecha_creacion: getCurrentLocalISOString(),
          created_at: getCurrentLocalISOString(),
          updated_at: getCurrentLocalISOString()
        }]);
    } catch (notifError) {
      console.warn('No se pudo crear notificación de rechazo (usuario será eliminado):', notifError);
      // Continuar con la eliminación aunque falle la notificación
    }

    // Eliminar el usuario
    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', usuario_id);

    if (deleteError) throw deleteError;

    // Marcar como leída la notificación de solicitud para el admin
    await supabase
      .from('notificaciones')
      .update({
        leida: true,
        fecha_lectura: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      })
      .eq('relacion_entidad', 'usuarios')
      .eq('relacion_id', usuario_id)
      .eq('tipo', 'solicitud_registro')
      .eq('usuario_id', admin_id);

    return { success: true, mensaje: mensajeRechazo, correoUsuario: usuario.correo };
  } catch (error) {
    console.error('Error en rechazarUsuario:', error);
    throw error;
  }
};