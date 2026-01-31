/**
 * Servicio de tasa de cambio Venezuela.
 * - En tiempo real: fetchTasaEnTiempoReal() llama a una API pública (DolarApi) y devuelve la tasa actual.
 * - Persistida: el script actualizar-tasa-bcv.js guarda en BD; getTasaFromDB / getTasaParaCalculo leen de ahí.
 */
import { supabase } from '../supabase/client';

const TASA_CAMBIO_TABLE = 'tasa_cambio';

/** API oficial DolarApi Venezuela - tasa en tiempo real. Sin API key. */
const DOLAR_API_OFICIAL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const DOLAR_API_ALT = 'https://dolarapi.com/v1/dolares/bolivar';

export interface TasaCambioRow {
  id: number;
  tasa_bs_usd: number;
  fecha_actualizacion: string;
  fuente: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Obtiene la última tasa guardada en la base de datos.
 * La tasa se actualiza con el script actualizar-tasa-bcv.js desde la página oficial del BCV.
 */
export const getTasaFromDB = async (): Promise<TasaCambioRow | null> => {
  try {
    const { data, error } = await supabase
      .from(TASA_CAMBIO_TABLE)
      .select('*')
      .order('fecha_actualizacion', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('exchangeRateService: error reading tasa_cambio', error);
      return null;
    }
    return data as TasaCambioRow | null;
  } catch (e) {
    console.warn('exchangeRateService: getTasaFromDB error', e);
    return null;
  }
};

/**
 * Guarda una nueva tasa en la tabla tasa_cambio.
 * Usado normalmente por el script actualizar-tasa-bcv.js; el front puede usarlo como respaldo.
 */
export const saveTasaToDB = async (
  tasa_bs_usd: number,
  fuente: string = 'BCV'
): Promise<{ id: number } | null> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TASA_CAMBIO_TABLE)
      .insert({
        tasa_bs_usd,
        fecha_actualizacion: now,
        fuente,
        updated_at: now,
      })
      .select('id')
      .single();
    if (error) {
      console.error('exchangeRateService: error saving tasa', error);
      return null;
    }
    return data as { id: number };
  } catch (e) {
    console.error('exchangeRateService: saveTasaToDB error', e);
    return null;
  }
};

/**
 * Devuelve la tasa actual (solo desde BD; no llama a APIs externas).
 * La actualización diaria la hace el script actualizar-tasa-bcv.js.
 */
export const getTasaActual = async (): Promise<number> => {
  const fromDb = await getTasaFromDB();
  if (fromDb && fromDb.tasa_bs_usd > 0) return Number(fromDb.tasa_bs_usd);
  return 367.30;
};

/**
 * Para compatibilidad con bookService: devuelve la tasa desde BD y huboCambio=false
 * (el cambio y la notificación a admins los hace el script al ejecutarse).
 */
export const actualizarTasaYDetectarCambio = async (): Promise<{
  tasa: number;
  huboCambio: boolean;
  fuente: string;
}> => {
  const fromDb = await getTasaFromDB();
  const tasa = fromDb && fromDb.tasa_bs_usd > 0 ? Number(fromDb.tasa_bs_usd) : 367.30;
  const fuente = fromDb?.fuente ?? 'BCV';
  return { tasa, huboCambio: false, fuente };
};

/**
 * Tasa para mostrar/calcular montos en Bs desde monto_usd.
 * Lee de la BD; si no hay, usa fallback 367.30.
 */
export const getTasaParaCalculo = async (): Promise<number> => {
  const fromDb = await getTasaFromDB();
  if (fromDb && fromDb.tasa_bs_usd > 0) return Number(fromDb.tasa_bs_usd);
  return 367.30;
};

/**
 * Obtiene la tasa del dólar en tiempo real desde una API pública (DolarApi Venezuela).
 * Úsala cuando necesites mostrar el precio actual sin depender de la BD.
 * Si la API falla, devuelve la última tasa en BD o 367.30.
 */
export const fetchTasaEnTiempoReal = async (options?: {
  guardarEnBD?: boolean;
}): Promise<{ tasa: number; fuente: string; esEnVivo: boolean; fecha?: string | null }> => {
  const tryUrl = async (url: string): Promise<{ tasa: number; fuente: string; esDirecto: boolean } | null> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const data = await res.json();
      // Preferir tasa directa del banco (compra/venta); solo usar promedio si no hay compra/venta
      const venta = typeof data.venta === 'number' && data.venta > 0 ? data.venta : null;
      const compra = typeof data.compra === 'number' && data.compra > 0 ? data.compra : null;
      const promedio = typeof data.promedio === 'number' && data.promedio > 0 ? data.promedio : null;
      const tasa = venta ?? compra ?? promedio ?? data.precio;
      if (typeof tasa !== 'number' || tasa <= 0) return null;
      const esDirecto = venta != null || compra != null;
      return { tasa, fuente: data.nombre ?? data.fuente ?? 'DolarApi', esDirecto };
    } catch {
      return null;
    }
  };

  let result = await tryUrl(DOLAR_API_OFICIAL);
  if (!result) result = await tryUrl(DOLAR_API_ALT);

  if (result && result.tasa > 0) {
    // Si la API solo devolvió promedio (no compra/venta) y tenemos tasa en BD tipo Banco de Venezuela (~367), preferirla
    const fromDb = await getTasaFromDB();
    const tasaDb = fromDb?.tasa_bs_usd ? Number(fromDb.tasa_bs_usd) : 0;
    const usarBd =
      !result.esDirecto && tasaDb >= 300 && tasaDb <= 400;
    const tasaFinal = usarBd ? tasaDb : result.tasa;
    const fuenteFinal = usarBd ? (fromDb?.fuente ?? 'Banco de Venezuela') : result.fuente;
    if (options?.guardarEnBD && !usarBd) {
      await saveTasaToDB(result.tasa, result.fuente);
    }
    return {
      tasa: tasaFinal,
      fuente: fuenteFinal,
      esEnVivo: true,
      fecha: usarBd && fromDb?.fecha_actualizacion ? fromDb.fecha_actualizacion : undefined,
    };
  }

  const fromDb = await getTasaFromDB();
  const tasa = fromDb && fromDb.tasa_bs_usd > 0 ? Number(fromDb.tasa_bs_usd) : 367.30;
  const fuente = fromDb?.fuente ?? 'Última guardada';
  return { tasa, fuente, esEnVivo: false, fecha: fromDb?.fecha_actualizacion ?? null };
};
