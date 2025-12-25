/**
 * Script para generar tipos de TypeScript desde Supabase
 * Uso: node scripts/generate-types.js
 * 
 * Requiere las variables de entorno:
 * - VITE_PROJECT_URL_SUPABASE
 * - VITE_SUPABASE_API_KEY (anon key)
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_PROJECT_URL_SUPABASE || 'https://vsyunsvlrvbbvgiwcxnt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeXVuc3ZscnZiYnZnaXdjeG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjUxNzEsImV4cCI6MjA4MTkwMTE3MX0.bACD3Ls_hBHx1bbfkr1tGXWqHIrLTCj0CB0vDOU3oyE';

async function generateTypes() {
  try {
    console.log('🔄 Generando tipos desde Supabase...');
    console.log(`📡 URL: ${supabaseUrl.replace('https://', '').split('.')[0]}`);

    // Usar la API de Supabase para obtener el schema
    const response = await fetch(
      `${supabaseUrl}/rest/v1/`, 
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error al conectar con Supabase: ${response.statusText}`);
    }

    // Usar el CLI de Supabase si está disponible, o mostrar instrucciones
    console.log('\n✅ Para generar tipos automáticamente, usa uno de estos métodos:\n');
    console.log('📦 Método 1: Usando Supabase CLI (Recomendado)');
    console.log('   1. Instala Supabase CLI: npm install -g supabase');
    console.log('   2. Ejecuta: npm run types:generate\n');
    console.log('📦 Método 2: Usando npx (sin instalar)');
    console.log('   npx supabase gen types typescript --project-id vsyunsvlrvbbvgiwcxnt > src/supabase/supabase.ts\n');
    console.log('📦 Método 3: Desde el Dashboard de Supabase');
    console.log('   1. Ve a: https://supabase.com/dashboard/project/vsyunsvlrvbbvgiwcxnt');
    console.log('   2. Settings > API > Generate TypeScript types');
    console.log('   3. Copia el contenido a src/supabase/supabase.ts\n');

    // Intentar usar el CLI si está disponible
    const { execSync } = await import('child_process');
    try {
      console.log('🔄 Intentando generar tipos con Supabase CLI...');
      const types = execSync(
        `npx supabase gen types typescript --project-id vsyunsvlrvbbvgiwcxnt`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const outputPath = join(__dirname, '../src/supabase/supabase.ts');
      writeFileSync(outputPath, types);
      console.log(`✅ Tipos generados exitosamente en: ${outputPath}`);
    } catch (error) {
      console.log('⚠️  Supabase CLI no disponible. Usa uno de los métodos mencionados arriba.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternativa: Genera los tipos manualmente desde el Dashboard de Supabase');
    process.exit(1);
  }
}

generateTypes();




