import { supabase } from '../supabase/client';
import type { Database } from '../supabase/supabase';

// ==================== TYPE ALIASES DE ENUMS REALES ====================
// Type aliases para los enums reales de la BD desde supabase.ts
// Nota: Usamos valores literales porque TypeScript tiene problemas de inferencia con Database['public']['Enums']
// Estos valores coinciden exactamente con Database['public']['Enums'] en supabase.ts
type RoleUsuario = "admin" | "propietario" | "residente" | "conserje" | "invitado";
type EstadoEnum = "pendiente" | "aprobado" | "rechazado" | "completado" | "cancelado" | "activo" | "inactivo" | "vencido" | "pagado";
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
  created_at: string | null;
  updated_at: string | null;
  usuario?: Usuario;
  vivienda?: Vivienda;
  archivo?: Archivo;
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
      estado: 'Activo' // Asegurar que usuarios nuevos estén activos (sin deudas)
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
        usuarios(*),
        viviendas(*),
        archivos(*)
      `)
      .order('fecha_vencimiento', { ascending: true });

    if (filters?.usuario_id) query = query.eq('usuario_id', filters.usuario_id);
    if (filters?.vivienda_id) query = query.eq('vivienda_id', filters.vivienda_id);
    if (filters?.estado) query = query.eq('estado', filters.estado);
    if (filters?.tipo) query = query.eq('tipo', filters.tipo);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchPagos:', error);
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
  archivo_comprobante_id
}: { 
  usuario_id: number, 
  vivienda_id: number,
  concepto: string, 
  monto: number, 
  tipo: TipoPagoEnum | string, // Acepta string para compatibilidad, se mapea internamente
  fecha_vencimiento?: string,
  archivo_comprobante_id?: number
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

    // 2. Verificar si ya tiene un pago pendiente para el mismo concepto este mes
    const mesActual = new Date().toISOString().slice(0, 7);
    const { data: pagoExistente, error: pagoError } = await supabase
      .from('pagos')
      .select('id, estado')
      .eq('usuario_id', usuario_id)
      .eq('vivienda_id', vivienda_id)
      .eq('concepto', concepto)
      .eq('estado', 'pendiente')
      .gte('created_at', `${mesActual}-01`)
      .lte('created_at', `${mesActual}-31`);
      
    if (pagoError) {
      console.error('Error verificando pagos existentes:', pagoError);
    }
    
    if (pagoExistente && pagoExistente.length > 0) {
      throw new Error(`Ya tiene un pago pendiente para "${concepto}" este mes. Espere a que sea procesado.`);
    }

    // Mapear tipo de pago antiguo a nuevo si es necesario
    const tipoMapeado = typeof tipo === 'string' ? mapearTipoPago(tipo) : tipo;

    // 3. Crear el pago
    const pagoObj = {
      usuario_id,
      vivienda_id,
      concepto,
      monto,
      tipo: tipoMapeado,
      estado: 'pendiente' as EstadoEnum,
      fecha_vencimiento: fecha_vencimiento || null,
      fecha_pago: null,
      referencia: null,
      metodo_pago: null,
      comprobante_archivo_id: archivo_comprobante_id || null,
      observaciones: null,
      created_at: getCurrentLocalISOString(),
      updated_at: getCurrentLocalISOString()
    };
    
    const { data, error } = await supabase
      .from('pagos')
      .insert([pagoObj])
      .select(`
        *,
        usuarios(*),
        viviendas(*)
      `);
    
    if (error) {
      console.error('Error creando pago:', error);
      throw new Error('Error al crear la solicitud de pago');
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
  referencia
}: {
  pago_id: number;
  admin_id: number;
  nuevo_estado: EstadoEnum;
  observaciones?: string;
  metodo_pago?: string;
  referencia?: string;
}) => {
  try {
    // 1. Obtener el pago actual
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .single();
      
    if (pagoError) throw new Error('Pago no encontrado');

    // 2. Actualizar el pago
    const updateData: any = {
      estado: nuevo_estado,
      observaciones: observaciones || null,
      updated_at: getCurrentLocalISOString()
    };

    // Si se marca como pagado, registrar fecha y método
    if (nuevo_estado === 'pagado') {
      updateData.fecha_pago = getCurrentLocalISOString();
      updateData.metodo_pago = metodo_pago || null;
      updateData.referencia = referencia || null;
    }

    const { error: updateError } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', pago_id);

    if (updateError) throw updateError;

    // 3. Registrar en historial
    await supabase
      .from('historial_pagos')
      .insert([{
        pago_id,
        evento: nuevo_estado,
        usuario_actor_id: admin_id,
        datos: { 
          estado_anterior: pago.estado,
          estado_nuevo: nuevo_estado,
          metodo_pago,
          referencia,
          observaciones 
        },
        fecha_evento: getCurrentLocalISOString()
      }]);

    // 4. Notificar al usuario
    if (pago.usuario_id) {
      await crearNotificacion(
        pago.usuario_id,
        'pago_procesado',
        `Su pago "${pago.concepto}" ha sido ${nuevo_estado}`,
        'pagos',
        pago_id
      );
    }

    return { 
      success: true, 
      message: `Pago ${nuevo_estado} exitosamente`,
      pago_id 
    };
  } catch (error) {
    console.error('Error en validarPago:', error);
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
export const fetchEspaciosComunes = async (condominioId?: number) => {
  try {
    let query = supabase
      .from('espacios_comunes')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre');

    if (condominioId) {
      query = query.eq('condominio_id', condominioId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchEspaciosComunes:', error);
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
      data[0].id
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
  responsable_id
}: {
  solicitud_id: number;
  usuario_id: number;
  nuevo_estado: EstadoEnum;
  observaciones?: string;
  responsable_id?: number;
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

    if (solicitud.usuario_solicitante_id) {
      await crearNotificacion(
        solicitud.usuario_solicitante_id,
        'mantenimiento_actualizado',
        `Su solicitud "${solicitud.titulo}" ha sido ${textoEstado}`,
        'mantenimiento',
        solicitud_id
      );
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
  relacion_id?: number
) => {
  try {
    console.log(`Notificación generada por el usuario: ${usuario_id}`);
    const { data: administradores } = await supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'admin');

    if (!administradores) return;

    const notificaciones = administradores.map(admin => ({
      usuario_id: admin.id,
      tipo,
      titulo: 'Nueva acción requerida',
      mensaje,
      relacion_entidad: 'pagos',
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
    console.error('Error notificando administradores:', error);
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

const crearNotificacion = async (
  usuario_id: number,
  tipo: string,
  mensaje: string,
  relacion_entidad?: string,
  relacion_id?: number
) => {
  try {
    // Asegurar valores por defecto
    const relacionEntidadFinal = relacion_entidad || 'pago';
    const relacionIdFinal = relacion_id || 0;
    
    await supabase
      .from('notificaciones')
      .insert([{
        usuario_id,
        tipo,
        titulo: 'Actualización de pago',
        mensaje,
        relacion_entidad: relacionEntidadFinal,
        relacion_id: relacionIdFinal,
        leida: false,
        accion_requerida: null,
        fecha_creacion: getCurrentLocalISOString(),
        fecha_lectura: null,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }]);
  } catch (error) {
    console.error('Error creando notificación:', error);
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

// Función para subir archivo a Supabase Storage y obtener archivo_id
export const subirArchivoComprobante = async (
  file: File,
  usuario_id: number
): Promise<number | null> => {
  try {
    // 1. Subir a Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${usuario_id}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `comprobantes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('condominio-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      // Intentar con otro bucket si existe
      const { error: uploadError2 } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file);
      if (uploadError2) throw uploadError2;
    }

    // 2. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('condominio-files')
      .getPublicUrl(filePath);

    // 3. Crear registro en tabla archivos
    const { data: archivoData, error: archivoError } = await supabase
      .from('archivos')
      .insert([{
        usuario_id,
        entidad: 'pagos',
        entidad_id: null, // Se actualizará cuando se cree el pago
        url: publicUrl,
        nombre_original: file.name,
        tipo_mime: file.type,
        created_at: getCurrentLocalISOString()
      }])
      .select('id')
      .single();

    if (archivoError) {
      console.error('Error creando registro de archivo:', archivoError);
      // Si falla, intentar sin crear registro y retornar null
      return null;
    }

    return archivoData?.id || null;
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
        estado: 'Activo', // Asegurar que usuarios aprobados estén activos (sin deudas)
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