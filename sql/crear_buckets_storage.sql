-- =====================================================
-- CREAR BUCKETS DE STORAGE PARA COMPROBANTES
-- =====================================================
-- 
-- Este script crea los buckets necesarios en Supabase Storage
-- para almacenar los comprobantes de pago.
--
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase Dashboard
-- =====================================================

-- 1. Crear bucket 'condominio-files' (bucket principal)
-- Nota: Los buckets se crean desde el Dashboard de Supabase Storage
-- o usando la API de Storage. Este script es solo para referencia.

-- Para crear buckets desde SQL, necesitas usar la extensión storage:
-- (Esto generalmente se hace desde el Dashboard de Supabase)

-- =====================================================
-- INSTRUCCIONES PARA CREAR BUCKETS DESDE EL DASHBOARD:
-- =====================================================
-- 
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Navega a "Storage" en el menú lateral
-- 3. Haz clic en "New bucket"
-- 4. Crea los siguientes buckets:
--
--    Bucket 1:
--    - Nombre: condominio-files
--    - Public: No (privado)
--    - File size limit: 10 MB
--    - Allowed MIME types: image/jpeg, image/png, application/pdf
--
--    Bucket 2 (alternativo):
--    - Nombre: comprobantes
--    - Public: No (privado)
--    - File size limit: 10 MB
--    - Allowed MIME types: image/jpeg, image/png, application/pdf
--
-- 5. Configura las políticas RLS para los buckets:
--    - Los usuarios autenticados pueden subir archivos
--    - Los administradores pueden leer todos los archivos
--    - Los usuarios solo pueden leer sus propios archivos
--
-- =====================================================
-- POLÍTICAS RLS PARA STORAGE (ejecutar después de crear buckets)
-- =====================================================

-- Política para permitir que usuarios autenticados suban archivos
-- (Esto se configura desde el Dashboard de Storage > Policies)

-- Ejemplo de política (desde Dashboard):
-- Policy name: "Users can upload their own files"
-- Target roles: authenticated
-- Operation: INSERT
-- Policy definition: 
--   (bucket_id = 'condominio-files'::text) AND 
--   ((auth.uid())::text = (storage.foldername(name))[1])

-- Policy name: "Users can read their own files"
-- Target roles: authenticated
-- Operation: SELECT
-- Policy definition:
--   (bucket_id = 'condominio-files'::text) AND 
--   ((auth.uid())::text = (storage.foldername(name))[1])

-- Policy name: "Admins can read all files"
-- Target roles: authenticated
-- Operation: SELECT
-- Policy definition:
--   (bucket_id = 'condominio-files'::text) AND 
--   (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'))

-- =====================================================
-- VERIFICAR BUCKETS EXISTENTES
-- =====================================================

-- Para verificar si los buckets existen, ejecuta en SQL Editor:
SELECT name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('condominio-files', 'comprobantes', 'pagos');

-- Si no aparecen resultados, los buckets no existen y necesitas crearlos
-- desde el Dashboard de Supabase Storage.


