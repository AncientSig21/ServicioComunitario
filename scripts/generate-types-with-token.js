/**
 * Script para generar tipos usando access token
 * Uso: node scripts/generate-types-with-token.js
 * O: SUPABASE_ACCESS_TOKEN=tu_token node scripts/generate-types-with-token.js
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'vsyunsvlrvbbvgiwcxnt';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!ACCESS_TOKEN) {
  console.log('❌ Access token requerido');
  console.log('\n📋 Opciones:');
  console.log('1. Obtén tu access token desde: https://supabase.com/dashboard/account/tokens');
  console.log('2. Ejecuta: $env:SUPABASE_ACCESS_TOKEN="tu_token"; npm run types:generate:npx');
  console.log('3. O usa el método del Dashboard (más fácil)');
  process.exit(1);
}

try {
  console.log('🔄 Generando tipos con access token...');
  
  // Establecer el access token como variable de entorno
  process.env.SUPABASE_ACCESS_TOKEN = ACCESS_TOKEN;
  
  // Ejecutar el comando de generación
  const types = execSync(
    `npx supabase gen types typescript --project-id ${PROJECT_ID}`,
    { 
      encoding: 'utf-8',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN }
    }
  );
  
  const outputPath = join(__dirname, '../src/supabase/supabase.ts');
  writeFileSync(outputPath, types);
  
  console.log(`✅ Tipos generados exitosamente en: ${outputPath}`);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Alternativa: Usa el Dashboard de Supabase para generar los tipos manualmente');
  process.exit(1);
}




