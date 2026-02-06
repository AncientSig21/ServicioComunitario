/**
 * Servicio de tasa de cambio Venezuela.
 * - En tiempo real: fetchTasaEnTiempoReal() llama a una API pública (DolarApi) y devuelve la tasa actual.
 * - Persistida: el script actualizar-tasa-bcv.js guarda en BD; getTasaFromDB / getTasaParaCalculo leen de ahí.
 * - Modo Demo: devuelve tasa desde mockDatabase local.
 */
import { supabase, isInDemoMode } from '../supabase/client';
import { getMockDatabase } from '../supabase/mockSupabaseClient';

const TASA_CAMBIO_TABLE = 'tasa_cambio';

/** API oficial DolarApi Venezuela - tasa en tiempo real. Sin API key. */
const DOLAR_API_OFICIAL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const DOLAR_API_ALT = 'https://dolarapi.com/v1/dolares/bolivar';

/** Tasa fallback cuando la API y la BD no devuelven una válida (precio dólar actual aprox. en Bs). No se usa tasa 10 ni valores bajos. */
const TASA_FALLBACK_BS_USD = 37.50;

/** Mínimo razonable para tasa Bs/USD; tasas menores (ej. 10) se ignoran y se usa TASA_FALLBACK_BS_USD. */
const TASA_MINIMA_VALIDA = 20;

/** Obtiene la tasa del mock database en modo demo */
const getTasaFromMock = (): number => {
  try {
    const db = getMockDatabase();
    const tasaRow = db.tasa_cambio?.[0];
    if (tasaRow?.tasa && tasaRow.tasa >= TASA_MINIMA_VALIDA) {
      return tasaRow.tasa;
    }
  } catch (e) {
    console.warn('Error obteniendo tasa de mock:', e);
  }
  return TASA_FALLBACK_BS_USD;
};

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
  // En modo demo, retornar tasa del mock
  if (isInDemoMode) {
    const tasa = getTasaFromMock();
    return {
      id: 1,
      tasa_bs_usd: tasa,
      fecha_actualizacion: new Date().toISOString(),
      fuente: 'Demo Mode'
    };
  }

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
  const tasaDb = fromDb?.tasa_bs_usd ? Number(fromDb.tasa_bs_usd) : 0;
  if (tasaDb >= TASA_MINIMA_VALIDA) return tasaDb;
  return TASA_FALLBACK_BS_USD;
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
  const tasaDb = fromDb?.tasa_bs_usd ? Number(fromDb.tasa_bs_usd) : 0;
  const tasa = tasaDb >= TASA_MINIMA_VALIDA ? tasaDb : TASA_FALLBACK_BS_USD;
  const fuente = fromDb?.fuente ?? 'BCV';
  return { tasa, huboCambio: false, fuente };
};

/**
 * Tasa para mostrar/calcular montos en Bs desde monto_usd.
 * Solo usa tasa razonable (>= TASA_MINIMA_VALIDA); si en BD hay 10 u otra baja, usa TASA_FALLBACK_BS_USD (370.25).
 */
export const getTasaParaCalculo = async (): Promise<number> => {
  const fromDb = await getTasaFromDB();
  const tasaDb = fromDb?.tasa_bs_usd ? Number(fromDb.tasa_bs_usd) : 0;
  if (tasaDb >= TASA_MINIMA_VALIDA) return tasaDb;
  return TASA_FALLBACK_BS_USD;
};

/**
 * Obtiene la tasa del dólar en tiempo real desde una API pública (DolarApi Venezuela).
 * Solo se usa tasa en tiempo real (API) o fallback 370.25 Bs; no se usa tasa 10 ni valores bajos de BD.
 */
export const fetchTasaEnTiempoReal = async (options?: {
  guardarEnBD?: boolean;
}): Promise<{ tasa: number; fuente: string; esEnVivo: boolean; fecha?: string | null }> => {
  const tryUrl = async (url: string): Promise<{ tasa: number; fuente: string; esDirecto: boolean } | null> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const data = await res.json();
      const venta = typeof data.venta === 'number' && data.venta > 0 ? data.venta : null;
      const compra = typeof data.compra === 'number' && data.compra > 0 ? data.compra : null;
      const promedio = typeof data.promedio === 'number' && data.promedio > 0 ? data.promedio : null;
      const tasa = venta ?? compra ?? promedio ?? data.precio;
      if (typeof tasa !== 'number' || tasa <= 0 || tasa < TASA_MINIMA_VALIDA) return null;
      const esDirecto = venta != null || compra != null;
      return { tasa, fuente: data.nombre ?? data.fuente ?? 'DolarApi', esDirecto };
    } catch {
      return null;
    }
  };

  let result = await tryUrl(DOLAR_API_OFICIAL);
  if (!result) result = await tryUrl(DOLAR_API_ALT);

  if (result && result.tasa >= TASA_MINIMA_VALIDA) {
    if (options?.guardarEnBD) {
      await saveTasaToDB(result.tasa, result.fuente);
    }
    return {
      tasa: result.tasa,
      fuente: result.fuente,
      esEnVivo: true,
      fecha: undefined,
    };
  }

  const fromDb = await getTasaFromDB();
  const tasaDb = fromDb?.tasa_bs_usd ? Number(fromDb.tasa_bs_usd) : 0;
  const tasa = tasaDb >= TASA_MINIMA_VALIDA ? tasaDb : TASA_FALLBACK_BS_USD;
  const fuente = tasaDb >= TASA_MINIMA_VALIDA ? (fromDb?.fuente ?? 'Última guardada') : 'Tasa fallback (370,25 Bs)';
  return { tasa, fuente, esEnVivo: false, fecha: fromDb?.fecha_actualizacion ?? null };
};
