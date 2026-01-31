import { supabase } from '../supabase/client';
import type { Database } from '../supabase/supabase';
import { getTasaParaCalculo, actualizarTasaYDetectarCambio, fetchTasaEnTiempoReal } from './exchangeRateService';

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

/** Parsea el monto de excedente desde observaciones. Acepta: "Pago completo con excedente: 150,00" o "Excedente (abono...): 150,00". */
export const parsearExcedenteDeObservaciones = (observaciones: string | null | undefined): number => {
  if (!observaciones || typeof observaciones !== 'string') return 0;
  const matchNuevo = observaciones.match(/Pago completo con excedente\s*:\s*(?:Bs\.?\s*)?([\d.,]+)/i);
  if (matchNuevo?.[1]) {
    const n = parseFloat(matchNuevo[1].replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  const match = observaciones.match(/Excedente\s*\(abono para otras cuotas\)\s*:\s*(?:Bs\.?\s*)?([\d.,]+)/i);
  if (!match || !match[1]) return 0;
  const numStr = match[1].replace(',', '.');
  const n = parseFloat(numStr);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
  condominio_id: number | null; // Condominio al que pertenece el usuario donde se creó el pago
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
  excedente?: number | null; // Excedente del pago (cuando el usuario pagó más); se guarda en columna excedente
  created_at: string | null;
  updated_at: string | null;
  usuario?: Usuario;
  vivienda?: Vivienda;
  archivo?: Archivo;
  // Propiedades calculadas/virtuales para compatibilidad
  monto_pagado?: number; // Alias de abono para compatibilidad con código existente
  creado_por_admin?: boolean; // Indica si el pago fue creado por un administrador
  monto_usd?: number | null; // Si está definido, el monto en Bs se calcula con la tasa actual (API Venezuela)
  monto_pagado_usd?: number | null; // Monto pagado por el usuario en USD (cuando ingresa en dólares)
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

    // Actualizar el estado del usuario (columna en BD: Estado, con mayúscula)
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
  codigo_recuperacion?: string | null;
}) => {
  try {
    // Si el rol es null, dejarlo como null (usuario pendiente de aprobación)
    // Si es string, mapear rol antiguo a nuevo si es necesario
    const rolMapeado = userData.rol === null ? null : (typeof userData.rol === 'string' ? mapearRol(userData.rol) : userData.rol);
    
    // 1. Crear usuario
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
    
    if (userData.auth_uid) {
      insertData.auth_uid = userData.auth_uid;
    }

    if (userData.codigo_recuperacion != null && String(userData.codigo_recuperacion).trim() !== '') {
      insertData.codigo_recuperacion = String(userData.codigo_recuperacion).trim();
    }

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
  condominio_id?: number;
  estado?: EstadoEnum;
  tipo?: TipoPagoEnum;
}) => {
  try {
    // Condominio se obtiene vía usuarios.condominios; no usar condominios(*) directo
    // para evitar error "Could not find a relationship between 'pagos' and 'condominios'"
    // si la FK pagos.condominio_id no está en la caché del schema de Supabase
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
    if (filters?.condominio_id != null) query = query.eq('condominio_id', filters.condominio_id);
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

/** Obtiene un pago por ID (datos actuales de la BD, incl. abono). Útil al validar para no usar datos obsoletos. */
export const fetchPagoById = async (pago_id: number) => {
  try {
    const { data, error } = await supabase
      .from('pagos')
      .select(`
        *,
        usuarios(*),
        viviendas(*),
        archivos!pagos_comprobante_archivo_id_fkey(*)
      `)
      .eq('id', pago_id)
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    console.warn('fetchPagoById:', e);
    return null;
  }
};

/** Obtiene la tasa Bs/USD actual para cálculo de montos (desde API Venezuela o BD). */
export const getTasaParaPagos = getTasaParaCalculo;

/**
 * Monto efectivo en Bs para mostrar en estado de pago.
 * Si el pago tiene monto_usd, devuelve monto_usd * tasa; si no, devuelve monto.
 * @param pago - Pago con monto y opcional monto_usd
 * @param tasa - Tasa Bs/USD (si no se pasa, se usa 0 y se devuelve monto fijo cuando no hay monto_usd)
 */
export const getMontoDisplay = (pago: { monto: number; monto_usd?: number | null }, tasa?: number): number => {
  const montoUsd = pago.monto_usd ?? null;
  if (montoUsd != null && montoUsd > 0 && typeof tasa === 'number' && tasa > 0) {
    return Math.round(montoUsd * tasa * 100) / 100;
  }
  return Number(pago.monto) || 0;
};

/** Formatea monto en USD para mostrar junto al monto en Bs (ej. $20 o $20.50). */
export const formatMontoUsd = (montoUsd: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(montoUsd);

export const solicitarPago = async ({ 
  usuario_id, 
  vivienda_id,
  concepto, 
  monto, 
  monto_usd,
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
  monto_usd?: number | null,
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

    // Obtener condominio_id del usuario (referencia al condominio donde se crea el pago)
    let condominio_id: number | null = null;
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('condominio_id')
      .eq('id', usuario_id)
      .single();
    if (usuarioData?.condominio_id != null) {
      condominio_id = usuarioData.condominio_id;
    }

    // Si hay monto_usd, obtener tasa actual y usar monto = monto_usd * tasa (mismo criterio que admin)
    let montoFinal = monto;
    let montoUsdInsert: number | null = null;
    if (monto_usd != null && monto_usd > 0) {
      try {
        const tasa = await getTasaParaCalculo();
        montoFinal = Math.round(monto_usd * tasa * 100) / 100;
        montoUsdInsert = monto_usd;
      } catch (e) {
        console.warn('solicitarPago: no se pudo obtener tasa, usando monto fijo', e);
      }
    }

    // 3. Crear el pago
    // Nota: El schema de la BD incluye estos campos en la tabla pagos:
    // id, usuario_id, vivienda_id, condominio_id, concepto, monto, tipo, estado, fecha_vencimiento, fecha_pago,
    // referencia, metodo_pago, comprobante_archivo_id, observaciones, abono, created_at, updated_at
    const pagoObj: any = {
      usuario_id,
      vivienda_id: vivienda_id || null, // El schema incluye vivienda_id
      condominio_id, // Condominio al que pertenece el usuario donde se creó el pago
      concepto,
      monto: montoFinal,
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
    if (montoUsdInsert != null) pagoObj.monto_usd = montoUsdInsert;
    
    // Intentar insertar el pago
    let { data, error } = await supabase
      .from('pagos')
      .insert([pagoObj])
      .select(`
        *,
        usuarios(*)
      `);
    
    // Si hay error, puede ser por columnas que no existen en tu BD, intentar con menos campos
    if (error) {
      console.warn('Error creando pago con campos completos, intentando sin campos opcionales:', error);
      const pagoObjBasico: any = {
        usuario_id,
        vivienda_id: vivienda_id || null,
        condominio_id,
        concepto,
        monto: montoFinal,
        tipo: tipoMapeado,
        estado: 'pendiente' as EstadoEnum,
        fecha_vencimiento: fecha_vencimiento || null,
        observaciones: observaciones || null,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      };
      if (montoUsdInsert != null) pagoObjBasico.monto_usd = montoUsdInsert;

      let { data: data2, error: error2 } = await supabase
        .from('pagos')
        .insert([pagoObjBasico])
        .select(`*, usuarios(*)`);

      if (error2) {
        console.warn('Error con pagoObjBasico, intentando solo campos mínimos:', error2);
        // Último intento: solo columnas que suelen existir en cualquier tabla pagos
        const pagoMinimo: any = {
          usuario_id,
          vivienda_id: vivienda_id || null,
          concepto,
          monto: montoFinal,
          tipo: tipoMapeado,
          estado: 'pendiente',
          fecha_vencimiento: fecha_vencimiento || null,
          observaciones: observaciones || null,
          created_at: getCurrentLocalISOString(),
          updated_at: getCurrentLocalISOString()
        };
        if (montoUsdInsert != null) pagoMinimo.monto_usd = montoUsdInsert;
        const res = await supabase.from('pagos').insert([pagoMinimo]).select(`*, usuarios(*)`);
        error2 = res.error;
        data2 = res.data;
      }

      if (error2) {
        const msg = (error2 as any)?.message || error2?.message || String(error2);
        const details = (error2 as any)?.details || '';
        console.error('Error creando pago:', error2);
        throw new Error(`Error al crear la solicitud de pago. ${msg} ${details}`.trim());
      }

      data = data2;
    }
    
    // El abono disponible ya no se aplica automáticamente: el usuario elige usarlo al enviar comprobante.
    
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
    // 1. Obtener el pago actual (incl. abono para no sobrescribir el monto que el usuario registró)
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
      // Monto ya pagado: abono o monto_pagado (el usuario puede haber enviado comprobante y ya tener abono)
      const raw = pago as Record<string, unknown>;
      const abonoActual = raw.abono != null ? parseFloat(String(raw.abono)) : (raw.monto_pagado != null ? parseFloat(String(raw.monto_pagado)) : 0);
      // Regla: si el usuario ya registró un monto (abono > 0), ese es el que queda. El admin solo confirma; no se sobrescribe con el valor del formulario.
      if (abonoActual > 0) {
        nuevo_abono = Math.min(abonoActual, monto_total > 0 ? monto_total : abonoActual);
      } else {
        // Sin comprobante previo: el admin ingresa el monto aprobado (incremento o total a registrar)
        const incremento = (monto_aprobado !== undefined && monto_aprobado >= 0) ? monto_aprobado : 0;
        nuevo_abono = Math.min(incremento, monto_total > 0 ? monto_total : incremento);
      }
      // Nunca superar el monto total de la cuota
      if (monto_total > 0 && nuevo_abono > monto_total) {
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
    // IMPORTANTE: Al validar, NUNCA sobrescribir la columna abono: el monto lo registró el usuario al enviar el comprobante.
    // Solo actualizamos estado, observaciones, fecha_pago, metodo_pago, referencia. Así el "total pagado" sigue siendo el del usuario.
    const updateData: any = {
      estado: estado_final,
      observaciones: observaciones || null,
      updated_at: getCurrentLocalISOString()
    };
    // No actualizar abono al validar: evita que un valor distinto (ej. monto_pagado o lectura incorrecta) reemplace el pago del usuario.

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

    // 4. Recalcular y actualizar usuarios.total_pagado con la suma real (abono + excedente) de todos los pagos validados del usuario.
    // Así la columna total_pagado en la BD deja de quedar null y refleja el total realmente pagado.
    if (pago.usuario_id && nuevo_estado !== 'rechazado') {
      try {
        const totalDesdePagos = await obtenerTotalPagadoDesdePagos(pago.usuario_id);
        if (totalDesdePagos !== null) {
          await supabase
            .from('usuarios')
            .update({
              total_pagado: Math.round(totalDesdePagos * 100) / 100,
              updated_at: getCurrentLocalISOString()
            })
            .eq('id', pago.usuario_id);
        }
      } catch (errTotal) {
        console.warn('Error actualizando usuarios.total_pagado (no crítico):', errTotal);
      }
    }

    // 4a. Si este pago es un "Restante" (pago parcial del usuario), actualizar el pago padre
    const parentPagoId = parsearPagoIdRestante(pago.observaciones);
    if (estado_final === 'pagado' && parentPagoId != null) {
      try {
        const { data: parentPago, error: parentErr } = await supabase
          .from('pagos')
          .select('id, monto, abono, estado')
          .eq('id', parentPagoId)
          .single();
        if (!parentErr && parentPago) {
          const parentRaw = parentPago as unknown as Record<string, unknown>;
          const abonoParent = parentRaw.abono != null ? parseFloat(String(parentRaw.abono)) : 0;
          const montoRestanteAprobado = parseFloat((pago.monto || 0).toString());
          const nuevoAbonoParent = abonoParent + montoRestanteAprobado;
          const parentUpdate: any = {
            abono: nuevoAbonoParent,
            estado: 'pagado' as EstadoEnum,
            fecha_pago: getCurrentLocalISOString(),
            updated_at: getCurrentLocalISOString()
          };
          await supabase.from('pagos').update(parentUpdate).eq('id', parentPagoId);
        }
      } catch (parentErr) {
        console.warn('Error actualizando pago padre (Restante):', parentErr);
      }
    }

    // 4b. No registrar excedente en un "fondo" ni aplicar abonos a otros pagos al validar.
    // El excedente (si existe) queda solo en ese pago; no se aplica automáticamente a otras cuotas.

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

    // 7. Si el pago quedó pagado, re-evaluar estado moroso del usuario: si ya no tiene pagos vencidos, poner Activo
    if (estado_final === 'pagado' && pago.usuario_id) {
      try {
        const { data: pagosVencidosRestantes } = await supabase
          .from('pagos')
          .select('id')
          .eq('usuario_id', pago.usuario_id)
          .eq('estado', 'vencido')
          .limit(1);
        if (!pagosVencidosRestantes || pagosVencidosRestantes.length === 0) {
          const { error: updateUserError } = await supabase
            .from('usuarios')
            .update({
              Estado: 'Activo',
              updated_at: getCurrentLocalISOString()
            })
            .eq('id', pago.usuario_id);
          if (updateUserError) {
            console.warn('Error actualizando estado del usuario a Activo:', updateUserError);
          } else {
            console.log(`Usuario ${pago.usuario_id} actualizado a Activo (sin pagos vencidos).`);
          }
        }
      } catch (err: any) {
        console.warn('Error re-evaluando estado moroso del usuario (no crítico):', err);
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

// Actualizar un pago existente (creado por admin) con los datos del usuario (referencia, comprobante, etc.)
// No crea un pago nuevo: evita duplicados. El admin validará este mismo pago (pagado/rechazado).
// abono = solo el monto que cubre la cuota (hasta monto); excedente = lo que sobra, en columna excedente (no en abono).
export const actualizarPagoConComprobante = async ({
  pago_id,
  usuario_id,
  referencia,
  metodo_pago,
  comprobante_archivo_id,
  observaciones,
  abono,
  monto_usd: monto_usd_pagado,
  excedente
}: {
  pago_id: number;
  usuario_id: number;
  referencia?: string | null;
  metodo_pago?: string | null;
  comprobante_archivo_id?: number | null;
  observaciones?: string | null;
  abono?: number; // Solo el monto que cubre la cuota (hasta monto); no incluir excedente
  monto_usd?: number | null;
  excedente?: number | null; // Excedente del pago (cuando el usuario paga más); se guarda en columna excedente
}) => {
  try {
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', pago_id)
      .eq('usuario_id', usuario_id)
      .single();

    if (pagoError || !pago) {
      throw new Error('Pago no encontrado o no pertenece al usuario');
    }

    if (pago.estado !== 'pendiente') {
      throw new Error('Solo se puede adjuntar comprobante a pagos pendientes');
    }

    // Mantener estado = pendiente hasta que el administrador valide. abono = solo lo que cubre la cuota; excedente en su columna.
    const updateData: any = {
      estado: 'pendiente',
      updated_at: getCurrentLocalISOString()
    };
    if (referencia !== undefined) updateData.referencia = referencia ?? null;
    if (metodo_pago !== undefined) updateData.metodo_pago = metodo_pago ?? null;
    if (comprobante_archivo_id !== undefined) updateData.comprobante_archivo_id = comprobante_archivo_id ?? null;
    if (observaciones !== undefined) updateData.observaciones = observaciones ?? null;
    if (abono !== undefined) updateData.abono = abono;
    if (monto_usd_pagado !== undefined) updateData.monto_usd = monto_usd_pagado;
    if (excedente !== undefined && excedente !== null) updateData.excedente = Math.max(0, excedente);

    const { error: updateError } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', pago_id);

    if (updateError) throw updateError;

    if (comprobante_archivo_id) {
      await supabase
        .from('archivos')
        .update({ entidad: 'pagos', entidad_id: pago_id })
        .eq('id', comprobante_archivo_id);
    }

    await supabase
      .from('historial_pagos')
      .insert([{
        pago_id,
        evento: 'comprobante_adjuntado',
        usuario_actor_id: usuario_id,
        datos: { accion: 'usuario_adjunto_comprobante', referencia: referencia ?? null },
        fecha_evento: getCurrentLocalISOString()
      }]);

    const { data: updated } = await supabase
      .from('pagos')
      .select('*, usuarios(*)')
      .eq('id', pago_id)
      .single();

    return updated;
  } catch (error) {
    console.error('Error en actualizarPagoConComprobante:', error);
    throw error;
  }
};

/** Parsea pago_id del padre desde observaciones de un pago "Restante". Ej: "Restante de pago_id 123. ..." */
export const parsearPagoIdRestante = (observaciones: string | null | undefined): number | null => {
  if (!observaciones || typeof observaciones !== 'string') return null;
  const match = observaciones.match(/Restante de pago_id\s*(\d+)/i);
  if (!match || !match[1]) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * Crear un pago "Restante" cuando el usuario hace un pago parcial.
 * Así aparece un ítem por el monto que falta para que el usuario envíe comprobante y se valide.
 * Si la cuota original era en USD, se puede pasar monto_usd_restante para que el restante se muestre en USD y Bs.
 */
export const crearPagoRestante = async ({
  usuario_id,
  vivienda_id,
  parent_pago_id,
  concepto_base,
  monto_restante,
  monto_total_original,
  monto_usd_restante,
  monto_total_original_usd,
  abono_ya_aplicado,
  tipo,
  fecha_vencimiento
}: {
  usuario_id: number;
  vivienda_id: number;
  parent_pago_id: number;
  concepto_base: string;
  monto_restante: number;
  monto_total_original: number;
  monto_usd_restante?: number | null;
  monto_total_original_usd?: number | null;
  abono_ya_aplicado: number;
  tipo: string;
  fecha_vencimiento: string;
}): Promise<unknown> => {
  if (monto_restante <= 0) return null;
  // Evitar duplicados: si ya existe un Restante para este pago padre, no crear otro
  const { data: existente } = await supabase
    .from('pagos')
    .select('id')
    .eq('usuario_id', usuario_id)
    .like('concepto', '%Restante%')
    .like('observaciones', `%Restante de pago_id ${parent_pago_id}%`)
    .in('estado', ['pendiente', 'vencido'])
    .limit(1);
  if (existente && existente.length > 0) return existente[0];

  const conceptoRestante = `${concepto_base} - Restante`;
  const observacionesUsd = (monto_total_original_usd != null && monto_total_original_usd > 0 && monto_usd_restante != null && monto_usd_restante > 0)
    ? ` Restante en USD: ${monto_usd_restante.toFixed(2)} (equivalente en Bs según tasa actual). Monto total original: ${monto_total_original.toFixed(2)} Bs (${monto_total_original_usd.toFixed(2)} USD).`
    : '';
  const observaciones = `Restante de pago_id ${parent_pago_id}. Monto total original: ${monto_total_original.toFixed(2)} Bs, ya pagado/en validación: ${abono_ya_aplicado.toFixed(2)} Bs.${observacionesUsd}`;
  return solicitarPago({
    usuario_id,
    vivienda_id,
    concepto: conceptoRestante,
    monto: monto_restante,
    monto_usd: monto_usd_restante ?? undefined,
    tipo,
    fecha_vencimiento,
    observaciones
  });
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
  monto_usd,
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
  monto_usd?: number | null; // Si se define, el monto en Bs se calcula con la tasa actual (Venezuela)
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
      // Obtener todos los usuarios (excepto admins). Intentar con estado=Activo; si falla, sin filtro estado
      let dataTodos: { id: number }[] | null = null;
      const { data: conEstado, error: errEstado } = await supabase
        .from('usuarios')
        .select('id')
        .neq('rol', 'admin')
        .eq('Estado', 'Activo');

      if (!errEstado && conEstado?.length !== undefined) {
        dataTodos = conEstado;
      }
      if (!dataTodos || dataTodos.length === 0) {
        const { data: sinEstado, error: errSinEstado } = await supabase
          .from('usuarios')
          .select('id')
          .neq('rol', 'admin');
        if (errSinEstado) {
          console.error('Error obteniendo usuarios:', errSinEstado);
          throw new Error('No se pudieron cargar los usuarios. Verifique la conexión y la tabla usuarios.');
        }
        dataTodos = sinEstado || [];
      }
      usuariosObjetivo = (dataTodos || []).filter(u => u && u.id != null).map(u => Number(u.id));
      console.log('Usuarios a procesar (aplicar_a_todos):', usuariosObjetivo.length);
    } else if (aplicar_a_todos_condominios) {
      // Obtener todos los usuarios que pertenezcan a algún condominio (excepto admins)
      // Primero intentar con filtro estado=Activo; si falla (ej. columna no existe), usar sin filtro estado
      let usuariosCondominios: { id: number }[] | null = null;
      const { data: conEstado, error: condError } = await supabase
        .from('usuarios')
        .select('id')
        .neq('rol', 'admin')
        .not('condominio_id', 'is', null)
        .eq('Estado', 'Activo');

      if (!condError && conEstado?.length !== undefined) {
        usuariosCondominios = conEstado;
        console.log('Usuarios con condominio y estado Activo:', usuariosCondominios.length);
      }

      if (!usuariosCondominios || usuariosCondominios.length === 0) {
        const { data: sinEstado, error: condErrorSinEstado } = await supabase
          .from('usuarios')
          .select('id')
          .neq('rol', 'admin')
          .not('condominio_id', 'is', null);

        if (condErrorSinEstado) {
          console.error('Error obteniendo usuarios de condominios:', condErrorSinEstado);
          throw new Error('No se pudieron cargar los usuarios. Compruebe que la tabla usuarios tenga la columna condominio_id y que existan usuarios con condominio asignado.');
        }
        usuariosCondominios = sinEstado || [];
        console.log('Usuarios con condominio (sin filtro estado):', usuariosCondominios.length);
      }

      usuariosObjetivo = usuariosCondominios.map(u => u.id);
    } else if (condominio_id) {
      // Obtener usuarios del condominio específico (intentar con estado; si falla, sin filtro estado)
      let dataCond: { id: number }[] | null = null;
      const { data: conEstado, error: condError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('condominio_id', condominio_id)
        .neq('rol', 'admin')
        .eq('Estado', 'Activo');

      if (!condError && conEstado?.length !== undefined) {
        dataCond = conEstado;
      }
      if (!dataCond || dataCond.length === 0) {
        const { data: sinEstado, error: errSin } = await supabase
          .from('usuarios')
          .select('id')
          .eq('condominio_id', condominio_id)
          .neq('rol', 'admin');
        if (errSin) {
          console.error('Error obteniendo usuarios del condominio:', errSin);
          throw new Error('No se pudieron cargar los usuarios del condominio. Verifique que existan usuarios con ese condominio.');
        }
        dataCond = sinEstado || [];
      }
      usuariosObjetivo = dataCond?.map(u => u.id) || [];
      console.log('Usuarios del condominio a procesar:', usuariosObjetivo.length);
    } else if (usuario_ids && usuario_ids.length > 0) {
      usuariosObjetivo = usuario_ids;
    } else {
      throw new Error('Debe especificar usuarios, condominio, todos los condominios o aplicar a todos');
    }

    console.log('Debug - usuariosObjetivo antes de verificar:', usuariosObjetivo);
    console.log('Debug - usuariosObjetivo.length:', usuariosObjetivo.length);
    
    if (usuariosObjetivo.length === 0) {
      let mensaje = 'No se encontraron usuarios para crear los pagos.';
      if (aplicar_a_todos_condominios) {
        mensaje += ' Para "Todos los condominios" cada usuario debe tener un condominio asignado (campo condominio_id). Asigne condominios en Residentes o use "Todos los usuarios activos".';
      } else if (condominio_id) {
        mensaje += ' No hay usuarios en ese condominio o no tienen rol distinto de admin.';
      } else {
        mensaje += ' Verifique que existan usuarios que cumplan los criterios seleccionados.';
      }
      throw new Error(mensaje);
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

    // Obtener condominio_id de cada usuario para asignar al pago
    const { data: usuariosCondominioData } = await supabase
      .from('usuarios')
      .select('id, condominio_id')
      .in('id', usuariosObjetivo);
    const condominioMap = new Map<number, number | null>();
    usuariosCondominioData?.forEach((u: any) => {
      condominioMap.set(u.id, u.condominio_id ?? null);
    });

    // Mapear tipo de pago
    const tipoMapeado = typeof tipo === 'string' ? mapearTipoPago(tipo) : tipo;

    // Si hay monto_usd, obtener tasa actual y usar monto = monto_usd * tasa (snapshot)
    let montoFinal = monto;
    let montoUsdInsert: number | null = null;
    if (monto_usd != null && monto_usd > 0) {
      try {
        const tasa = await getTasaParaCalculo();
        montoFinal = Math.round(monto_usd * tasa * 100) / 100;
        montoUsdInsert = monto_usd;
      } catch (e) {
        console.warn('crearPagosMasivos: no se pudo obtener tasa, usando monto fijo', e);
      }
    }

    // Crear pagos para cada usuario (incluye condominio_id del usuario)
    const pagosACrear = usuariosObjetivo.map(usuario_id => {
      const obj: any = {
        usuario_id,
        vivienda_id: viviendaMap.get(usuario_id) ?? null,
        condominio_id: condominioMap.get(usuario_id) ?? null,
        concepto,
        monto: montoFinal,
        tipo: tipoMapeado,
        estado: 'pendiente' as EstadoEnum,
        fecha_vencimiento: fecha_vencimiento || null,
        fecha_pago: null,
        referencia: null,
        metodo_pago: null,
        observaciones: `Pago creado masivamente por administrador`,
        abono: 0,
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      };
      if (montoUsdInsert != null) obj.monto_usd = montoUsdInsert;
      return obj;
    });

    // Insertar pagos en lote (cast: tipos generados pueden no incluir condominio_id/abono hasta regenerar)
    let pagosCreados: { id: number; usuario_id: number | null }[] = [];
    let insertError: any = null;
    const { data: dataInsert, error: errInsert } = await supabase
      .from('pagos')
      .insert(pagosACrear as any)
      .select('id, usuario_id');

    if (!errInsert) {
      pagosCreados = dataInsert ?? [];
    } else {
      insertError = errInsert;
    }

    // Si falla (ej. columnas condominio_id/abono/vivienda_id no existen), reintentar solo con campos básicos
    if ((!pagosCreados || pagosCreados.length === 0) && insertError) {
      console.warn('Insert con todos los campos falló, reintentando sin condominio_id/vivienda_id/abono:', insertError.message);
      const pagosMinimos: any[] = usuariosObjetivo.map(usuario_id => ({
        usuario_id,
        concepto,
        monto: montoFinal,
        tipo: tipoMapeado,
        estado: 'pendiente' as const,
        fecha_vencimiento: fecha_vencimiento || null,
        observaciones: 'Pago creado masivamente por administrador',
        created_at: getCurrentLocalISOString(),
        updated_at: getCurrentLocalISOString()
      }));
      if (montoUsdInsert != null) pagosMinimos.forEach(p => { p.monto_usd = montoUsdInsert; });
      const { data: dataRetry, error: errRetry } = await supabase
        .from('pagos')
        .insert(pagosMinimos as any)
        .select('id, usuario_id');
      if (errRetry) {
        console.error('Error creando pagos masivos (reintento):', errRetry);
        throw new Error('Error al crear los pagos masivos. ' + (errRetry.message || ''));
      }
      pagosCreados = (dataRetry || []) as { id: number; usuario_id: number | null }[];
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
          monto: montoFinal,
          monto_usd: montoUsdInsert ?? undefined,
          total_usuarios: usuariosObjetivo.length
        },
        fecha_evento: getCurrentLocalISOString()
      }));

      await supabase
        .from('historial_pagos')
        .insert(historiales);

      // El abono ya no se aplica automáticamente: el usuario elige usarlo al enviar comprobante.
    }

    // Notificar a los usuarios afectados
    const montoTexto = montoUsdInsert != null ? `${monto_usd} USD (≈ ${montoFinal} Bs)` : `${montoFinal} Bs.`;
    for (const usuario_id of usuariosObjetivo) {
      await crearNotificacion(
        usuario_id,
        'pago_creado',
        `Se ha creado un nuevo pago: ${concepto} - ${montoTexto}`,
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
  monto_usd,
  tipo,
  fecha_vencimiento,
  estado,
  observaciones
}: {
  pago_id: number;
  admin_id: number;
  concepto?: string;
  monto?: number;
  monto_usd?: number | null; // Si se define, el monto en Bs se recalcula con la tasa actual
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
    if (monto_usd != null && monto_usd > 0) {
      try {
        const { tasa } = await fetchTasaEnTiempoReal({ guardarEnBD: true });
        updateData.monto = Math.round(monto_usd * tasa * 100) / 100;
        updateData.monto_usd = monto_usd;
      } catch (e) {
        console.warn('actualizarPago: no se pudo obtener tasa API, usando BD', e);
        const tasa = await getTasaParaCalculo();
        updateData.monto = Math.round(monto_usd * tasa * 100) / 100;
        updateData.monto_usd = monto_usd;
      }
    } else if (monto !== undefined) {
      updateData.monto = monto;
      updateData.monto_usd = null; // Quitar vinculación a USD si se pasa monto fijo
    }
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
    imagen_url?: string | null;
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
  estado = 'pendiente' as EstadoEnum,
  tipo = 'mantenimiento' as 'mantenimiento' | 'servicio'
}: {
  condominio_id?: number;
  usuario_solicitante_id: number;
  titulo: string;
  descripcion: string;
  prioridad?: PrioridadEnum;
  ubicacion?: string;
  estado?: EstadoEnum;
  tipo?: 'mantenimiento' | 'servicio';
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

    const payload: Record<string, unknown> = {
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
      updated_at: getCurrentLocalISOString(),
      tipo: tipo || 'mantenimiento',
    };
    const { data, error } = await supabase
      .from('solicitudes_mantenimiento')
      .insert([payload])
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

const BUCKET_AVANCES = 'condominio-files';
const EXPIRACION_URL_FIRMADA_SEG = 3600; // 1 hora

/**
 * Obtiene una URL válida para que el admin pueda ver el comprobante.
 * Si la URL es de Supabase Storage (público o privado), devuelve una URL firmada para evitar 403.
 * Si ya es data: o tiene token=, la devuelve tal cual.
 */
export const obtenerUrlComprobanteParaVisualizar = async (url: string | null | undefined): Promise<string | null> => {
  if (!url || !url.trim()) return null;
  try {
    if (url.startsWith('data:')) return url;
    if (url.includes('token=')) return url;
    let bucket = '';
    let path: string | null = null;
    if (url.includes('condominio-files')) {
      bucket = 'condominio-files';
      const match = url.match(/condominio-files\/(.+?)(?:\?|$)/);
      path = match ? decodeURIComponent(match[1].trim()) : null;
    } else if (url.includes('/comprobantes/') || url.match(/\/storage\/v1\/object\/public\/comprobantes\//)) {
      bucket = 'comprobantes';
      const match = url.match(/comprobantes\/(.+?)(?:\?|$)/);
      path = match ? decodeURIComponent(match[1].trim()) : null;
    }
    if (!path || !bucket) return url;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, EXPIRACION_URL_FIRMADA_SEG);
    if (error) {
      console.warn('Error creando URL firmada para comprobante:', error);
      return url;
    }
    return data?.signedUrl ?? url;
  } catch {
    return url;
  }
};

/** Obtiene una URL firmada para mostrar la imagen (funciona con bucket público o privado) */
const obtenerUrlFirmadaParaFoto = async (fotoUrl: string | null): Promise<string | null> => {
  if (!fotoUrl || !fotoUrl.trim()) return null;
  try {
    // Si ya es una URL firmada (contiene 'token='), devolverla
    if (fotoUrl.includes('token=')) return fotoUrl;
    let path: string | null = null;
    // Si es una URL completa, extraer path: .../object/public/condominio-files/PATH
    if (fotoUrl.includes('condominio-files')) {
      const match = fotoUrl.match(/condominio-files\/(.+?)(?:\?|$)/);
      path = match ? match[1].trim() : null;
    }
    // Si no tiene http, asumir que es el path directo (ej: mantenimiento/1/xxx.jpg)
    if (!path && !fotoUrl.startsWith('http')) path = fotoUrl.split('?')[0].trim();
    if (!path) return fotoUrl;
    const { data, error } = await supabase.storage
      .from(BUCKET_AVANCES)
      .createSignedUrl(path, EXPIRACION_URL_FIRMADA_SEG);
    if (error) {
      console.warn('Error creando URL firmada para avance:', error);
      return fotoUrl;
    }
    return data?.signedUrl ?? fotoUrl;
  } catch {
    return fotoUrl;
  }
};

// Obtener avances de una solicitud de mantenimiento (con URLs firmadas para las fotos)
export const fetchAvancesMantenimiento = async (solicitud_id: number) => {
  try {
    const { data: avances, error } = await supabase
      .from('avances_mantenimiento')
      .select(`
        *,
        creado_por:usuarios(nombre, correo)
      `)
      .eq('solicitud_id', solicitud_id)
      .order('fecha', { ascending: false });

    if (error) {
      console.warn('Error obteniendo avances (la tabla puede no existir aún):', error);
      return [];
    }

    if (!avances || avances.length === 0) return [];

    // Preferir foto_base64 (guardada en BDD) para acceso directo; si no hay, usar URL firmada de foto_url (bucket legacy)
    // hasPhotoInDb: true when a photo was uploaded (so admin can delete it even if it doesn't display)
    const avancesConFoto = await Promise.all(
      avances.map(async (avance: any) => {
        const hasPhotoInDb = !!(avance.foto_base64 && String(avance.foto_base64).trim()) ||
          !!(avance.foto_url && String(avance.foto_url).trim());
        const tieneBase64 = avance.foto_base64 && String(avance.foto_base64).trim().startsWith('data:image');
        const urlParaMostrar = tieneBase64
          ? avance.foto_base64
          : await obtenerUrlFirmadaParaFoto(avance.foto_url ?? null);
        return {
          ...avance,
          foto_url: urlParaMostrar,
          hasPhotoInDb,
        };
      })
    );
    return avancesConFoto;
  } catch (error) {
    console.error('Error en fetchAvancesMantenimiento:', error);
    return [];
  }
};

/** Convierte un File a data URL (base64) para guardar en la BDD */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo debe ser una imagen'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

// Agregar avance a una solicitud de mantenimiento (foto se guarda en BDD como base64, no en bucket)
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
    let foto_base64: string | null = null;

    // Guardar foto en la BDD como base64 (data URL) para acceso directo sin bucket
    if (foto_file) {
      if (foto_file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no debe superar 5 MB');
      }
      foto_base64 = await fileToDataUrl(foto_file);
    }

    // Insertar avance: foto en columna foto_base64 (no se usa bucket)
    const payload: Record<string, unknown> = {
      solicitud_id,
      descripcion,
      creado_por,
      fecha: getCurrentLocalISOString(),
      foto_url: null,
      foto_base64: foto_base64 ?? null,
    };

    const { data, error } = await supabase
      .from('avances_mantenimiento')
      .insert([payload])
      .select(`
        *,
        creado_por:usuarios(nombre, correo)
      `)
      .single();

    if (error) {
      if (error.code === '42P01') {
        throw new Error('La tabla de avances de mantenimiento no está configurada en la base de datos. Contacta al administrador.');
      }
      // Columna foto_base64 no existe: hay que ejecutar la migración en Supabase
      const msg = String(error.message || '');
      if (msg.includes('foto_base64') || msg.includes('schema cache')) {
        throw new Error(
          'Falta la columna foto_base64 en la tabla avances_mantenimiento. ' +
          'En Supabase: SQL Editor → ejecuta: ALTER TABLE avances_mantenimiento ADD COLUMN IF NOT EXISTS foto_base64 TEXT;'
        );
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error en agregarAvanceMantenimiento:', error);
    throw error;
  }
};

/** Elimina la foto de un avance (solo quita la imagen; el avance sigue existiendo). Para uso del administrador. */
export const eliminarFotoAvance = async (avance_id: number) => {
  const { error } = await supabase
    .from('avances_mantenimiento')
    .update({ foto_url: null, foto_base64: null })
    .eq('id', avance_id);

  if (error) {
    console.error('Error en eliminarFotoAvance:', error);
    throw error;
  }
};

/** Elimina un avance completo (descripción + foto). Para uso del administrador. */
export const eliminarAvance = async (avance_id: number) => {
  const { error } = await supabase
    .from('avances_mantenimiento')
    .delete()
    .eq('id', avance_id);

  if (error) {
    console.error('Error en eliminarAvance:', error);
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

/** Actualizar datos editables de una solicitud de mantenimiento (titulo, descripcion, ubicacion, prioridad, observaciones). */
export const actualizarSolicitudMantenimiento = async ({
  solicitud_id,
  titulo,
  descripcion,
  ubicacion,
  prioridad,
  observaciones
}: {
  solicitud_id: number;
  titulo?: string;
  descripcion?: string;
  ubicacion?: string | null;
  prioridad?: PrioridadEnum;
  observaciones?: string | null;
}) => {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: getCurrentLocalISOString()
    };
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
    if (prioridad !== undefined) updateData.prioridad = prioridad;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const { error } = await supabase
      .from('solicitudes_mantenimiento')
      .update(updateData)
      .eq('id', solicitud_id);

    if (error) throw error;
    return { success: true, solicitud_id };
  } catch (error) {
    console.error('Error en actualizarSolicitudMantenimiento:', error);
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

// ==================== GESTIÓN DE ABONOS ====================

/**
 * Consumir (restar) abono disponible de los pagos que tienen excedente (columna excedente > 0).
 * Resta de la columna excedente para que el recuadro "Abono disponible" refleje lo que queda.
 */
const consumirAbonoDisponible = async (usuario_id: number, montoAConsumir: number): Promise<void> => {
  if (montoAConsumir <= 0) return;
  try {
    const { data: pagosConExcedente, error } = await supabase
      .from('pagos')
      .select('id, excedente')
      .eq('usuario_id', usuario_id)
      .eq('estado', 'pagado')
      .gt('excedente', 0)
      .order('fecha_pago', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true });

    if (error || !pagosConExcedente || pagosConExcedente.length === 0) return;

    let restantePorConsumir = montoAConsumir;

    type PagoExcedente = { id: number; excedente?: number | null };
    for (const pago of pagosConExcedente as unknown as PagoExcedente[]) {
      if (restantePorConsumir <= 0) break;
      const excedenteActual = parseFloat(String(pago.excedente ?? 0));
      if (excedenteActual <= 0) continue;

      const aRestar = Math.min(restantePorConsumir, excedenteActual);
      const nuevoExcedente = Math.max(0, excedenteActual - aRestar);

      await supabase
        .from('pagos')
        .update({
          excedente: Math.round(nuevoExcedente * 100) / 100,
          updated_at: getCurrentLocalISOString()
        })
        .eq('id', pago.id);

      restantePorConsumir -= aRestar;
    }
  } catch (err) {
    console.error('Error consumiendo abono disponible:', err);
  }
};

/**
 * Aplicar abono disponible a un pago específico (al enviar comprobante el usuario puede elegir usar su abono).
 * Consume el abono de los pagos con excedente y suma ese monto al pago indicado.
 */
export const aplicarAbonoAPagoEspecifico = async (
  usuario_id: number,
  pago_id: number,
  monto_abono: number
): Promise<void> => {
  if (monto_abono <= 0) return;
  try {
    await consumirAbonoDisponible(usuario_id, monto_abono);
    const { data: pago, error: fetchErr } = await supabase
      .from('pagos')
      .select('abono')
      .eq('id', pago_id)
      .eq('usuario_id', usuario_id)
      .single();
    if (fetchErr || !pago) return;
    const abonoActual = parseFloat((pago.abono || 0).toString());
    await supabase
      .from('pagos')
      .update({
        abono: abonoActual + monto_abono,
        updated_at: getCurrentLocalISOString()
      })
      .eq('id', pago_id);
  } catch (err) {
    console.error('Error en aplicarAbonoAPagoEspecifico:', err);
    throw err;
  }
};

/**
 * Obtiene el total pagado del usuario desde la BD: suma de (abono + excedente)
 * solo de pagos ya VALIDADOS por el administrador (estado = 'pagado').
 * Así "Total pagado" refleja el monto total realmente pagado (incluye excedentes).
 * Los pagos pendientes de validación no cuentan.
 * Retorna null si falla para que la UI use el total calculado.
 */
export const obtenerTotalPagadoDesdePagos = async (usuario_id: number): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('pagos')
      .select('abono, estado, excedente')
      .eq('usuario_id', usuario_id);
    if (error) {
      if (error.message?.includes('excedente') || error.message?.includes('column')) {
        const fallback = await supabase.from('pagos').select('abono, estado').eq('usuario_id', usuario_id);
        if (fallback.error || !fallback.data || !Array.isArray(fallback.data)) return null;
        let total = 0;
        for (const row of fallback.data) {
          const raw = row as Record<string, unknown>;
          if ((String(raw?.estado || '')).toLowerCase() !== 'pagado') continue;
          const abonoVal = raw?.abono ?? raw?.monto_pagado;
          const abono = abonoVal != null ? parseFloat(String(abonoVal)) : 0;
          if (Number.isFinite(abono) && abono > 0) total += abono;
        }
        return Math.round(total * 100) / 100;
      }
      if (error.code === 'PGRST204' || error.message?.includes('abono')) return null;
      console.warn('Error obteniendo total pagado desde pagos:', error);
      return null;
    }
    if (!data || !Array.isArray(data)) return 0;
    let total = 0;
    for (const row of data) {
      const raw = row as Record<string, unknown>;
      const estado = (raw?.estado != null ? String(raw.estado) : '').toLowerCase();
      if (estado !== 'pagado') continue;
      const abonoVal = raw?.abono ?? raw?.monto_pagado;
      const abono = abonoVal != null ? parseFloat(String(abonoVal)) : 0;
      const excedente = raw?.excedente != null ? parseFloat(String(raw.excedente)) : 0;
      if (Number.isFinite(abono) && abono > 0) total += abono;
      if (Number.isFinite(excedente) && excedente > 0) total += excedente;
    }
    return Math.round(total * 100) / 100;
  } catch (e) {
    console.warn('obtenerTotalPagadoDesdePagos:', e);
    return null;
  }
};

/**
 * @deprecated Usar obtenerTotalPagadoDesdePagos (suma de abono en pagos).
 * Obtiene el total pagado del usuario desde la columna usuarios.total_pagado.
 */
export const obtenerTotalPagadoUsuario = async (usuario_id: number): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('total_pagado')
      .eq('id', usuario_id)
      .single();
    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('total_pagado') || error.message?.includes('column')) return null;
      console.warn('Error obteniendo total_pagado:', error);
      return null;
    }
    const row = data as unknown as Record<string, unknown> | null;
    if (row?.total_pagado != null) return parseFloat(String(row.total_pagado)) || 0;
    return 0;
  } catch (e) {
    console.warn('obtenerTotalPagadoUsuario:', e);
    return null;
  }
};

/**
 * Obtener "abono disponible" para mostrar en la caja "Abono disponible".
 * Origen: suma de la columna excedente de todos los pagos del usuario con estado = 'pagado' y excedente > 0.
 * Cuando el admin valida un pago con excedente, ese excedente pasa a contar aquí.
 */
export const obtenerAbonosDisponibles = async (usuario_id: number): Promise<number> => {
  try {
    const { data: pagosPagados, error } = await supabase
      .from('pagos')
      .select('id, excedente')
      .eq('usuario_id', usuario_id)
      .eq('estado', 'pagado')
      .gt('excedente', 0);

    if (error) {
      if (error.message?.includes('excedente') || error.message?.includes('column')) return 0;
      console.warn('Error en obtenerAbonosDisponibles:', error);
      return 0;
    }
    if (!pagosPagados || pagosPagados.length === 0) return 0;
    let total = 0;
    for (const pago of pagosPagados) {
      const exc = (pago as { excedente?: number | null }).excedente;
      if (exc != null && Number(exc) > 0) total += Number(exc);
    }
    return Math.round(total * 100) / 100;
  } catch (error) {
    console.error('Error en obtenerAbonosDisponibles:', error);
    return 0;
  }
};

// Aplicar abonos disponibles a pagos pendientes del usuario
export const aplicarAbonosAPagosPendientes = async (usuario_id: number): Promise<number> => {
  try {
    // Obtener abonos disponibles
    let abonosDisponibles = await obtenerAbonosDisponibles(usuario_id);
    
    if (abonosDisponibles <= 0) {
      return 0; // No hay abonos para aplicar
    }

    // Obtener pagos pendientes del usuario ordenados por fecha de vencimiento (incluir concepto para observaciones y notificación)
    const { data: pagosPendientes, error } = await supabase
      .from('pagos')
      .select('id, monto, abono, estado, fecha_vencimiento, concepto, observaciones')
      .eq('usuario_id', usuario_id)
      .in('estado', ['pendiente', 'vencido'])
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (error || !pagosPendientes || pagosPendientes.length === 0) {
      return 0; // No hay pagos pendientes
    }

    let abonosAplicados = 0;

    // Aplicar abonos a cada pago pendiente hasta agotar los abonos disponibles.
    // No aplicar a pagos "Restante": el restante solo se valida cuando el usuario envía comprobante para ese pago y el admin lo aprueba.
    for (const pago of pagosPendientes) {
      if (abonosDisponibles <= 0) break;

      const concepto = (pago.concepto && String(pago.concepto)) || '';
      const observaciones = (pago.observaciones && String(pago.observaciones)) || '';
      const esRestante = concepto.includes('Restante') || observaciones.includes('Restante de pago_id');
      if (esRestante) continue;

      const montoTotal = parseFloat((pago.monto || 0).toString());
      const abonoActual = parseFloat((pago.abono || 0).toString());
      const montoPendiente = montoTotal - abonoActual;

      if (montoPendiente > 0) {
        // Aplicar abono al pago pendiente
        const abonoAAplicar = Math.min(abonosDisponibles, montoPendiente);
        const nuevoAbono = abonoActual + abonoAAplicar;
        
        // Determinar el nuevo estado
        let nuevoEstado = pago.estado;
        if (nuevoAbono >= montoTotal) {
          nuevoEstado = 'pagado' as EstadoEnum;
        }

        // Actualizar el pago
        const updateData: any = {
          abono: nuevoAbono,
          estado: nuevoEstado,
          updated_at: getCurrentLocalISOString()
        };

        if (nuevoEstado === 'pagado') {
          updateData.fecha_pago = getCurrentLocalISOString();
          // Marcar motivo/descripción para que el administrador sepa que la cuota se canceló por abono (excedente)
          const motivoAbono = `Cancelado por abono (excedente de pago anterior). Monto aplicado: ${abonoAAplicar.toFixed(2)} Bs.`;
          updateData.observaciones = (pago.observaciones && String(pago.observaciones).trim() ? `${String(pago.observaciones).trim()}\n\n${motivoAbono}` : motivoAbono);
        }

        await supabase
          .from('pagos')
          .update(updateData)
          .eq('id', pago.id);

        // Restar el abono aplicado de los pagos con excedente (para que el recuadro "Abono disponible" se actualice)
        await consumirAbonoDisponible(usuario_id, abonoAAplicar);

        // Notificar a los administradores cuando una cuota se cancela por abono
        if (nuevoEstado === 'pagado') {
          try {
            const { data: usuarioData } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', usuario_id)
              .single();
            const nombreResidente = usuarioData?.nombre || 'Residente';
            const conceptoPago = pago.concepto || 'Cuota';
            const mensaje = `El pago "${conceptoPago}" del residente ${nombreResidente} fue cancelado automáticamente por abono (excedente de pago anterior). Monto aplicado: ${abonoAAplicar.toFixed(2)} Bs. Al validar o consultar este pago verá el motivo "abono".`;
            await notificarAdministradores(usuario_id, 'pago_cancelado_por_abono', mensaje, pago.id, 'pagos');
          } catch (notifErr) {
            console.warn('Error notificando a administradores (pago cancelado por abono):', notifErr);
          }
        }

        abonosDisponibles -= abonoAAplicar;
        abonosAplicados += abonoAAplicar;
      }
    }

    return abonosAplicados;
  } catch (error) {
    console.error('Error en aplicarAbonosAPagosPendientes:', error);
    return 0;
  }
};

// Aplicar abonos a un nuevo pago cuando se crea
export const aplicarAbonosANuevoPago = async (
  usuario_id: number,
  nuevoPagoId: number,
  montoCuota: number
): Promise<{ abonoAplicado: number; montoRestante: number }> => {
  try {
    // Obtener abonos disponibles
    let abonosDisponibles = await obtenerAbonosDisponibles(usuario_id);
    
    if (abonosDisponibles <= 0) {
      return { abonoAplicado: 0, montoRestante: montoCuota };
    }

    // Aplicar abono al nuevo pago
    const abonoAAplicar = Math.min(abonosDisponibles, montoCuota);
    const montoRestante = montoCuota - abonoAAplicar;

    // Determinar el estado inicial
    let estadoInicial: EstadoEnum = 'pendiente';
    if (abonoAAplicar >= montoCuota) {
      estadoInicial = 'pagado';
    }

    // Actualizar el nuevo pago
    const updateData: any = {
      abono: abonoAAplicar,
      estado: estadoInicial,
      updated_at: getCurrentLocalISOString()
    };

    if (estadoInicial === 'pagado') {
      updateData.fecha_pago = getCurrentLocalISOString();
      // Marcar motivo/descripción para que el administrador sepa que la cuota se canceló por abono (excedente)
      updateData.observaciones = `Cancelado por abono (excedente de pago anterior). Monto aplicado: ${abonoAAplicar.toFixed(2)} Bs.`;
    }

    await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', nuevoPagoId);

    // Restar el abono aplicado de los pagos con excedente (para que el recuadro "Abono disponible" se actualice)
    await consumirAbonoDisponible(usuario_id, abonoAAplicar);

    // Notificar a los administradores cuando el nuevo pago se cancela íntegramente por abono
    if (estadoInicial === 'pagado') {
      try {
        const { data: pagoData } = await supabase
          .from('pagos')
          .select('concepto')
          .eq('id', nuevoPagoId)
          .single();
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', usuario_id)
          .single();
        const nombreResidente = usuarioData?.nombre || 'Residente';
        const conceptoPago = pagoData?.concepto || 'Cuota';
        const mensaje = `El pago "${conceptoPago}" del residente ${nombreResidente} fue cancelado automáticamente por abono (excedente de pago anterior). Monto aplicado: ${abonoAAplicar.toFixed(2)} Bs. Al validar o consultar este pago verá el motivo "abono".`;
        await notificarAdministradores(usuario_id, 'pago_cancelado_por_abono', mensaje, nuevoPagoId, 'pagos');
      } catch (notifErr) {
        console.warn('Error notificando a administradores (nuevo pago cancelado por abono):', notifErr);
      }
    }

    return { abonoAplicado: abonoAAplicar, montoRestante };
  } catch (error) {
    console.error('Error en aplicarAbonosANuevoPago:', error);
    return { abonoAplicado: 0, montoRestante: montoCuota };
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

/**
 * Actualiza la tasa BCV/DolarApi y notifica a todos los administradores cuando la tasa cambia.
 * Debe llamarse al cargar la sección de pagos del admin o de forma periódica.
 */
export const actualizarTasaBCVYNotificarAdmins = async (): Promise<{ tasa: number; notificado: boolean }> => {
  try {
    const { tasa, huboCambio, fuente } = await actualizarTasaYDetectarCambio();
    if (huboCambio) {
      const mensaje = `Tasa de cambio actualizada: ${tasa.toFixed(2)} Bs/USD (${fuente}). Los montos en USD de los pagos se muestran con esta tasa. Revise el estado de los pagos.`;
      await notificarAdministradores(0, 'tasa_bcv_actualizada', mensaje, undefined, 'pagos');
      return { tasa, notificado: true };
    }
    return { tasa, notificado: false };
  } catch (e) {
    console.warn('actualizarTasaBCVYNotificarAdmins:', e);
    const tasa = await getTasaParaCalculo();
    return { tasa, notificado: false };
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