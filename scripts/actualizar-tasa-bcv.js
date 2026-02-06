/**
 * Script para obtener la tasa del dólar (Bs/USD) desde la página del Banco de Venezuela
 * https://www.bancodevenezuela.com/index.html
 * y guardarla en Supabase.
 *
 * La página muestra "Mesa de cambio (USD-EUR)" con tasas BCV y BDV; si los valores
 * se cargan por JavaScript y no están en el HTML, se usa como respaldo la página oficial del BCV.
 *
 * Uso: node scripts/actualizar-tasa-bcv.js
 *
 * Programar una vez al día (ej. cron en Linux/Mac o Programador de tareas en Windows):
 *   0 8 * * * cd /ruta/al/proyecto && node scripts/actualizar-tasa-bcv.js
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BDV_URL = 'https://www.bancodevenezuela.com/index.html';
const BCV_URL_FALLBACK = 'https://www.bcv.org.ve/seccionportal/tipo-de-cambio-oficial-del-bcv';

let supabaseUrl = process.env.VITE_PROJECT_URL_SUPABASE || '';
let supabaseKey = process.env.VITE_SUPABASE_API_KEY || '';

try {
  const envPath = join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'VITE_PROJECT_URL_SUPABASE') supabaseUrl = value;
        else if (key === 'VITE_SUPABASE_API_KEY') supabaseKey = value;
      }
    }
  });
} catch (_) {
  console.warn('⚠️  No se encontró .env, usando variables de entorno');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan VITE_PROJECT_URL_SUPABASE o VITE_SUPABASE_API_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fetchOptions = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  },
  signal: AbortSignal.timeout(15000),
};

/**
 * Extrae solo la tasa del DÓLAR (Bs/USD) de la sección "Mesa de cambio (USD-EUR)".
 * En la página aparece "BCV: $ [precio dólar] / € [precio euro]"; nos interesa solo el precio del dólar (el primero).
 * Si los valores se cargan por JavaScript, no estarán en el HTML y retornará null.
 */
function extraerTasaDeHTMLBancoDeVenezuela(html) {
  const lower = html.toLowerCase();
  // Buscar la sección "Mesa de cambio (USD-EUR)" y luego "BCV:" para tomar el primer número (dólar)
  const mesaIndex = lower.indexOf('mesa de cambio (usd-eur)');
  if (mesaIndex !== -1) {
    const desdeMesa = html.slice(mesaIndex, mesaIndex + 600);
    const bcvIndex = desdeMesa.toLowerCase().indexOf('bcv');
    if (bcvIndex !== -1) {
      const despuesBCV = desdeMesa.slice(bcvIndex, bcvIndex + 200);
      // Primer número con coma o punto (dólar Bs/USD): ej. 367.30 o 367,30
      const match = despuesBCV.match(/(\d{2,4}[,.]\d{2,})/);
      if (match) {
        const str = match[1].replace(',', '.');
        const tasa = parseFloat(str);
        if (Number.isFinite(tasa) && tasa >= 1 && tasa < 100000) return tasa;
      }
    }
  }

  // Fallback: buscar "BCV:" en todo el HTML y el primer número después (dólar)
  const bcvGlobal = lower.indexOf('bcv:');
  if (bcvGlobal !== -1) {
    const slice = html.slice(bcvGlobal, bcvGlobal + 250);
    const match = slice.match(/(\d{2,4}[,.]\d{2,})/);
    if (match) {
      const tasa = parseFloat(match[1].replace(',', '.'));
      if (Number.isFinite(tasa) && tasa >= 100 && tasa <= 10000) return tasa;
    }
  }

  return null;
}

/**
 * Busca en bloques <script> del HTML datos que puedan contener la tasa del dólar (BCV/BDV, ej. 367.30).
 */
function extraerTasaDeScripts(html) {
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  if (!scriptMatches) return null;
  for (const block of scriptMatches) {
    const inner = block.replace(/<script[^>]*>|<\/script>/gi, '');
    // Números que parezcan tasa Bs/USD (ej. 367.30, 367,30) en rango 100-10000
    const nums = inner.match(/\b(\d{3,4}[,.]\d{2,})\b/g);
    if (nums) {
      for (const s of nums) {
        const tasa = parseFloat(s.replace(',', '.'));
        if (Number.isFinite(tasa) && tasa >= 100 && tasa <= 10000) return tasa;
      }
    }
  }
  return null;
}

/**
 * Obtiene la tasa desde la página del Banco de Venezuela (https://www.bancodevenezuela.com/index.html).
 * Si no se encuentra en el HTML (p. ej. porque se carga por JavaScript), intenta la página del BCV como respaldo.
 */
async function obtenerTasaBancoDeVenezuela() {
  let res;
  try {
    res = await fetch(BDV_URL, fetchOptions);
  } catch (fetchErr) {
    const msg = fetchErr?.cause?.code === 'ENOTFOUND'
      ? 'No se pudo conectar al servidor (revisa tu conexión a internet).'
      : fetchErr?.message || String(fetchErr);
    throw new Error(`Error al obtener la página del Banco de Venezuela: ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`Banco de Venezuela respondió con ${res.status}`);
  }

  const html = await res.text();

  let tasa = extraerTasaDeHTMLBancoDeVenezuela(html) ?? extraerTasaDeScripts(html);

  if (tasa != null && tasa > 0) {
    return { tasa, fecha: new Date().toISOString(), fuente: 'Banco de Venezuela' };
  }

  // Respaldo: página oficial del BCV (aquí la tasa suele estar en el HTML estático)
  console.log('   No se encontró tasa en la página del Banco de Venezuela (puede cargarse por JavaScript).');
  console.log('   Intentando respaldo: página oficial del BCV...\n');
  return await obtenerTasaBCVFallback();
}

/**
 * Respaldo: obtiene la tasa desde la página oficial del BCV.
 */
async function obtenerTasaBCVFallback() {
  let res;
  try {
    res = await fetch(BCV_URL_FALLBACK, fetchOptions);
  } catch (e) {
    throw new Error(`No se pudo obtener la tasa desde Banco de Venezuela ni desde el BCV: ${e?.message || e}`);
  }

  if (!res.ok) {
    throw new Error(`BCV respondió con ${res.status}`);
  }

  const html = await res.text();
  const usdIndex = html.toLowerCase().indexOf('usd');
  if (usdIndex === -1) throw new Error('No se encontró "USD" en la página del BCV');

  const afterUsd = html.slice(usdIndex, usdIndex + 500);
  // Aceptar formato 352,70630000 o 367.30 (3-4 dígitos + decimales)
  const match = afterUsd.match(/(\d{2,4}(?:[,.]\d+)+)/);
  if (!match || !match[1]) throw new Error('No se pudo extraer el valor del dólar en la página del BCV');

  const tasaStr = match[1].replace(',', '.');
  const tasa = parseFloat(tasaStr);
  if (!Number.isFinite(tasa) || tasa <= 0) throw new Error(`Valor de tasa inválido: ${match[1]}`);

  return { tasa, fecha: new Date().toISOString(), fuente: 'BCV (respaldo)' };
}

/**
 * Guarda la tasa en la tabla tasa_cambio y, si cambió, notifica a los administradores.
 */
async function guardarTasaYNotificar(tasa, fuente) {
  const now = new Date().toISOString();

  const { data: anterior } = await supabase
    .from('tasa_cambio')
    .select('tasa_bs_usd')
    .order('fecha_actualizacion', { ascending: false })
    .limit(1)
    .maybeSingle();

  const tasaAnterior = anterior?.tasa_bs_usd ?? 0;
  const huboCambio = Math.abs(tasa - tasaAnterior) > 0.01;

  const { data: insertada, error: errInsert } = await supabase
    .from('tasa_cambio')
    .insert({
      tasa_bs_usd: tasa,
      fecha_actualizacion: now,
      fuente,
      updated_at: now,
    })
    .select('id')
    .single();

  if (errInsert) {
    throw new Error(`Error guardando tasa: ${errInsert.message}`);
  }

  if (huboCambio) {
    const { data: admins } = await supabase.from('usuarios').select('id').eq('rol', 'admin');
    if (admins && admins.length > 0) {
      const notificaciones = admins.map((a) => ({
        usuario_id: a.id,
        tipo: 'tasa_bcv_actualizada',
        titulo: 'Tasa de cambio actualizada',
        mensaje: `Tasa actualizada: ${tasa.toFixed(2)} Bs/USD (${fuente}). Los montos en USD de los pagos se muestran con esta tasa. Revise el estado de los pagos.`,
        relacion_entidad: 'pagos',
        relacion_id: 0,
        estado: 'pendiente',
        leida: false,
        accion_requerida: true,
        fecha_creacion: now,
        fecha_lectura: null,
        created_at: now,
        updated_at: now,
      }));
      await supabase.from('notificaciones').insert(notificaciones);
      console.log(`   ✅ Notificación enviada a ${admins.length} administrador(es).`);
    }
  }

  return { id: insertada?.id, huboCambio };
}

async function main() {
  console.log('🔄 Actualizando tasa del dólar desde Banco de Venezuela (bancodevenezuela.com)...\n');

  try {
    const { tasa, fecha, fuente } = await obtenerTasaBancoDeVenezuela();
    console.log(`   Tasa obtenida: ${tasa.toFixed(2)} Bs/USD (${fuente})`);
    console.log(`   Fecha: ${fecha}\n`);

    const { huboCambio } = await guardarTasaYNotificar(tasa, fuente);
    console.log(`   Tasa guardada en la base de datos.`);
    if (huboCambio) {
      console.log(`   La tasa cambió respecto a la anterior; se notificó a los administradores.`);
    } else {
      console.log(`   Sin cambio significativo; no se enviaron notificaciones.`);
    }

    console.log('\n✅ Script finalizado correctamente.');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
