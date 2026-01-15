// =====================================================
// SCRIPT DE PRUEBA: SUBIDA DE COMPROBANTES
// =====================================================
// Este script verifica que la funcionalidad de subida
// de comprobantes funciona correctamente con Supabase Storage
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar rutas para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== CONFIGURACIÓN ====================

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== FUNCIONES DE PRUEBA ====================

async function verificarBucket(bucketName) {
  console.log(`\n📦 VERIFICANDO BUCKET: ${bucketName}...\n`);
  
  try {
    // Intentar listar archivos en el bucket (esto verifica que existe y tenemos acceso)
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1
      });
    
    if (error) {
      // Si el error es "Bucket not found", el bucket no existe
      if (error.message.includes('not found') || error.message.includes('Bucket')) {
        console.log(`   ❌ El bucket '${bucketName}' no existe o no tienes acceso`);
        return { success: false, exists: false, error };
      } else {
        console.log(`   ⚠️  Error verificando bucket: ${error.message}`);
        // Podría existir pero tener problemas de permisos
        return { success: false, exists: null, error };
      }
    }
    
    console.log(`   ✅ El bucket '${bucketName}' existe y es accesible`);
    if (files) {
      console.log(`   📁 Archivos en el bucket: ${files.length}`);
    }
    
    return { success: true, exists: true };
  } catch (error) {
    console.log(`   ❌ Error verificando bucket: ${error.message}`);
    return { success: false, exists: null, error };
  }
}

async function crearArchivoPrueba() {
  console.log('\n📄 CREANDO ARCHIVO DE PRUEBA...\n');
  
  try {
    // Crear un archivo de prueba simple (imagen PNG pequeña en base64)
    // Esto es un PNG de 1x1 pixel transparente
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngBase64, 'base64');
    
    // Guardar temporalmente
    const tempPath = join(__dirname, 'temp_comprobante_test.png');
    writeFileSync(tempPath, buffer);
    
    console.log('   ✅ Archivo de prueba creado:', tempPath);
    console.log(`   📊 Tamaño: ${buffer.length} bytes`);
    
    return { success: true, filePath: tempPath, buffer };
  } catch (error) {
    console.log('   ❌ Error creando archivo de prueba:', error.message);
    return { success: false, error };
  }
}

async function probarSubidaArchivo(bucketName, filePath, buffer) {
  console.log(`\n📤 PROBANDO SUBIDA A BUCKET: ${bucketName}...\n`);
  
  try {
    const fileName = `test_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const filePathStorage = `comprobantes/${fileName}`;
    
    // Leer el archivo
    const fileBuffer = readFileSync(filePath);
    // Crear un Blob desde el buffer
    const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: 'image/png' });
    
    // Intentar subir
    console.log(`   📤 Subiendo archivo: ${filePathStorage}`);
    console.log(`   📊 Tamaño del archivo: ${fileBlob.size} bytes`);
    console.log(`   📋 Tipo MIME: image/png`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePathStorage, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png'
      });
    
    if (uploadError) {
      console.log(`   ❌ Error subiendo archivo:`, uploadError.message);
      console.log(`   📋 Código de estado: ${uploadError.statusCode || 'N/A'}`);
      console.log(`   📋 Detalles del error:`, JSON.stringify(uploadError, null, 2));
      
      // Proporcionar sugerencias según el tipo de error
      if (uploadError.statusCode === '404' || uploadError.message.includes('not found')) {
        console.log(`\n   💡 SUGERENCIA: El bucket existe pero puede tener problemas de permisos.`);
        console.log(`      Verifica en Supabase Dashboard > Storage > ${bucketName} > Policies:`);
        console.log(`      - Debe haber una política INSERT para usuarios autenticados`);
        console.log(`      - O una política que permita subir archivos al bucket`);
      } else if (uploadError.statusCode === '403' || uploadError.message.includes('permission')) {
        console.log(`\n   💡 SUGERENCIA: Problema de permisos. Verifica las políticas RLS del bucket.`);
      }
      
      return { success: false, error: uploadError };
    }
    
    console.log('   ✅ Archivo subido exitosamente');
    console.log(`   📁 Ruta: ${filePathStorage}`);
    
    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePathStorage);
    
    console.log(`   🔗 URL pública: ${publicUrl}`);
    
    // Verificar que el archivo existe
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('comprobantes', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (!listError && files) {
      const archivoEncontrado = files.find(f => f.name === fileName);
      if (archivoEncontrado) {
        console.log('   ✅ Archivo verificado en el bucket');
        console.log(`   📊 Tamaño en storage: ${archivoEncontrado.metadata?.size || 'N/A'} bytes`);
      }
    }
    
    return { 
      success: true, 
      filePath: filePathStorage, 
      publicUrl,
      fileName 
    };
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error };
  }
}

async function probarRegistroArchivo(publicUrl, fileName) {
  console.log('\n💾 PROBANDO REGISTRO EN TABLA ARCHIVOS...\n');
  
  try {
    // Necesitamos un usuario_id de prueba
    // Intentar obtener el primer usuario de la BD
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1)
      .single();
    
    if (userError || !usuarios) {
      console.log('   ⚠️  No se pudo obtener un usuario de prueba');
      console.log('   ℹ️  Esto es normal si RLS está activo');
      return { success: false, skip: true };
    }
    
    const usuario_id = usuarios.id;
    console.log(`   👤 Usando usuario_id: ${usuario_id}`);
    
    // Crear registro en tabla archivos
    const { data: archivoData, error: archivoError } = await supabase
      .from('archivos')
      .insert([{
        usuario_id: usuario_id,
        entidad: 'pagos',
        entidad_id: null,
        url: publicUrl,
        nombre_original: fileName,
        tipo_mime: 'image/png',
        created_at: new Date().toISOString()
      }])
      .select('id')
      .single();
    
    if (archivoError) {
      console.log('   ❌ Error creando registro:', archivoError.message);
      console.log('   📋 Detalles:', JSON.stringify(archivoError, null, 2));
      return { success: false, error: archivoError };
    }
    
    console.log('   ✅ Registro creado exitosamente');
    console.log(`   🆔 ID del archivo: ${archivoData.id}`);
    
    return { success: true, archivoId: archivoData.id };
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error };
  }
}

async function limpiarArchivoPrueba(bucketName, filePath) {
  console.log(`\n🧹 LIMPIANDO ARCHIVO DE PRUEBA...\n`);
  
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.log('   ⚠️  Error eliminando archivo:', error.message);
      return { success: false, error };
    }
    
    console.log('   ✅ Archivo eliminado exitosamente');
    return { success: true };
  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
    return { success: false, error };
  }
}

async function limpiarArchivoTemporal(filePath) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log('   ✅ Archivo temporal eliminado');
    }
  } catch (error) {
    console.log('   ⚠️  Error eliminando archivo temporal:', error.message);
  }
}

// ==================== EJECUTAR PRUEBAS ====================

async function ejecutarPruebas() {
  console.log('='.repeat(60));
  console.log('🧪 PRUEBA DE FUNCIONALIDAD DE SUBIDA DE COMPROBANTES');
  console.log('='.repeat(60));
  
  let archivoPrueba = null;
  let archivoSubido = null;
  let bucketUsado = null;
  
  try {
    // 1. Verificar buckets disponibles (intentar cada uno)
    const bucketsToTry = ['condominio-files', 'comprobantes', 'pagos'];
    let bucketDisponible = null;
    
    console.log('\n📦 Verificando buckets disponibles...\n');
    
    for (const bucketName of bucketsToTry) {
      const resultado = await verificarBucket(bucketName);
      if (resultado.success || resultado.exists === true) {
        bucketDisponible = bucketName;
        console.log(`\n✅ Bucket disponible encontrado: ${bucketName}`);
        break;
      }
    }
    
    if (!bucketDisponible) {
      console.log('\n⚠️  No se encontró ningún bucket accesible.');
      console.log('   Intentando subir directamente a "condominio-files"...');
      bucketDisponible = 'condominio-files'; // Intentar de todas formas
    }
    
    bucketUsado = bucketDisponible;
    console.log(`\n🔧 Usando bucket: ${bucketUsado}`);
    
    // 2. Crear archivo de prueba
    const archivoResult = await crearArchivoPrueba();
    if (!archivoResult.success) {
      console.log('\n❌ No se pudo crear el archivo de prueba. Abortando.');
      return;
    }
    archivoPrueba = archivoResult;
    
    // 3. Probar subida
    const subidaResult = await probarSubidaArchivo(
      bucketUsado,
      archivoResult.filePath,
      archivoResult.buffer
    );
    
    if (!subidaResult.success) {
      console.log('\n❌ No se pudo subir el archivo. Verifica las políticas RLS del bucket.');
      limpiarArchivoTemporal(archivoResult.filePath);
      return;
    }
    archivoSubido = subidaResult;
    
    // 4. Probar registro en BD
    const registroResult = await probarRegistroArchivo(
      subidaResult.publicUrl,
      subidaResult.fileName
    );
    
    if (!registroResult.success && !registroResult.skip) {
      console.log('\n⚠️  No se pudo crear el registro en la BD. Esto puede ser por RLS.');
    }
    
    // 5. Limpiar
    if (archivoSubido) {
      await limpiarArchivoPrueba(bucketUsado, archivoSubido.filePath);
    }
    limpiarArchivoTemporal(archivoResult.filePath);
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    console.log(`   ✅ Verificación de buckets: ${bucketsResult.success ? 'OK' : 'FALLÓ'}`);
    console.log(`   ✅ Creación de archivo de prueba: ${archivoResult.success ? 'OK' : 'FALLÓ'}`);
    console.log(`   ${subidaResult.success ? '✅' : '❌'} Subida a storage: ${subidaResult.success ? 'OK' : 'FALLÓ'}`);
    console.log(`   ${registroResult.success ? '✅' : '⚠️ '} Registro en BD: ${registroResult.success ? 'OK' : (registroResult.skip ? 'OMITIDO' : 'FALLÓ')}`);
    
    if (subidaResult.success) {
      console.log('\n✅ ¡La funcionalidad de subida de comprobantes está funcionando correctamente!');
    } else {
      console.log('\n❌ La funcionalidad de subida necesita configuración adicional.');
      console.log('   Verifica las políticas RLS del bucket en Supabase Dashboard.');
    }
    
  } catch (error) {
    console.log('\n❌ Error general:', error.message);
    console.log(error.stack);
    
    // Limpiar en caso de error
    if (archivoSubido && bucketUsado) {
      await limpiarArchivoPrueba(bucketUsado, archivoSubido.filePath);
    }
    if (archivoPrueba) {
      limpiarArchivoTemporal(archivoPrueba.filePath);
    }
  }
}

// Ejecutar
ejecutarPruebas().catch(console.error);

