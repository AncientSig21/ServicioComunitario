import { supabase } from '../supabase/client';

// ==================== FUNCIÓN AUXILIAR DE FECHA ====================
const getCurrentLocalISOString = (): string => {
  return new Date().toISOString();
};

// ==================== TIPOS ACTUALIZADOS SEGÚN SUPABASE.TS ====================

export interface Usuario {
  id: number;
  auth_uid: string | null;
  nombre: string;
  correo: string;
  telefono: string | null;
  cedula: string | null;
  rol: 'admin' | 'residente' | 'propietario' | 'conserje' | 'mantenimiento' | 'contador' | 'visitante';
  contraseña: string | null;
  condominio_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Vivienda {
  id: number;
  condominio_id: number;
  propietario_id: number | null;
  numero_apartamento: string;
  piso: string | null;
  tipo_residencia_id: number | null;
  numero_escritura: string | null;
  fecha_adquisicion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioVivienda {
  id: number;
  usuario_id: number;
  vivienda_id: number;
  rol_en_vivienda: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  created_at: string;
}

export interface Pago {
  id: number;
  usuario_id: number;
  vivienda_id: number;
  concepto: string;
  monto: number;
  tipo: 'mantenimiento' | 'extraordinario' | 'multa' | 'otros';
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'pagado' | 'vencido';
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  comprobante_archivo_id: number | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
}

export interface Anuncio {
  id: number;
  condominio_id: number | null;
  autor_usuario_id: number;
  titulo: string;
  contenido: string | null;
  categoria: string | null;
  fecha_publicacion: string;
  fecha_expiracion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  autor?: Usuario;
}

// ==================== FUNCIONES CRUD CORREGIDAS ====================

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
  rol: 'residente' | 'propietario' | 'admin' | 'conserje' | 'mantenimiento' | 'contador' | 'visitante';
  contraseña: string;
  auth_uid: string;
  condominio_id: number | null; // ✅ CORREGIDO: number | null
  vivienda_id: number;
  rol_en_vivienda: string;
}) => {
  try {
    // 1. Crear usuario
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .insert([{
        nombre: userData.nombre,
        correo: userData.correo,
        telefono: userData.telefono,
        cedula: userData.cedula,
        rol: userData.rol,
        contraseña: userData.contraseña,
        auth_uid: userData.auth_uid,
        condominio_id: userData.condominio_id
      }])
      .select()
      .single();

    if (userError) throw userError;

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
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'pagado' | 'vencido';
  tipo?: 'mantenimiento' | 'extraordinario' | 'multa' | 'otros';
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
  tipo: 'mantenimiento' | 'extraordinario' | 'multa' | 'otros',
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

    // 3. Crear el pago
    const pagoObj = {
      usuario_id,
      vivienda_id,
      concepto,
      monto,
      tipo,
      estado: 'pendiente' as const,
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
        usuario_id: usuario_id,
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

// 3. VALIDACIÓN DE PAGOS POR ADMIN
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
  nuevo_estado: 'aprobado' | 'rechazado' | 'pagado';
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
        usuario_id: admin_id,
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
    await crearNotificacion(
      pago.usuario_id,
      'pago_procesado',
      `Su pago "${pago.concepto}" ha sido ${nuevo_estado}`,
      'pagos',
      pago_id
    );

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

// 4. FORO/ANUNCIOS
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
  categoria?: string | null; // ✅ CORREGIDO: string | null
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

// 5. SUBIDA DE ARCHIVOS
export const registerBookReservation = async ({ 
  usuario_id,
  file,
  pago_id
}: { 
  libro_id: number, 
  usuario_id: number,
  file: File,
  pago_id?: number
}) => {
  try {
    // 1. Subir a Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${usuario_id}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `comprobantes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('condominio-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Obtener URL pública
    const { data: { publicUrl } } = await supabase.storage
      .from('condominio-files')
      .getPublicUrl(filePath);

    // 3. Crear registro en tabla archivos
    const { data, error } = await supabase
      .from('archivos')
      .insert([{
        usuario_id,
        entidad: pago_id ? 'pagos' : null,
        entidad_id: pago_id || null,
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
    console.error('Error subiendo comprobante:', error);
    throw new Error('Error al subir el comprobante');
  }
};

// 6. DASHBOARD/ESTADO DE CUENTA
export const getEstadoCuentaUsuario = async (usuario_id: number) => {
  try {
    // Obtener usuario con sus viviendas y pagos
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

    // Calcular resumen financiero
    const pagosPendientes = usuario.pagos?.filter((p: any) => 
      p.estado === 'pendiente'
    ) || [];

    const pagosPagados = usuario.pagos?.filter((p: any) => 
      p.estado === 'pagado'
    ) || [];

    const totalPendiente = pagosPendientes.reduce((sum: number, p: any) => sum + p.monto, 0);
    const totalPagado = pagosPagados.reduce((sum: number, p: any) => sum + p.monto, 0);

    // Obtener anuncios recientes del condominio
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
      relacion_id: relacion_id || 0,  // ✅ CORREGIDO: Valor por defecto
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
      relacion_id: relacion_id || 0,  // ✅ CORREGIDO: Asegurar valor
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
        relacion_entidad: relacionEntidadFinal,  // ✅ Usar variable segura
        relacion_id: relacionIdFinal,            // ✅ Usar variable segura
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
export const fetchCondominios = async () => {
  try {
    const { data, error } = await supabase
      .from('condominios')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en fetchCondominios:', error);
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