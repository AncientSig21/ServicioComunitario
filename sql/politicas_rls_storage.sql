-- =====================================================
-- POLÍTICAS RLS PARA STORAGE BUCKET: condominio-files
-- =====================================================
-- 
-- Este script crea las políticas RLS necesarias para que
-- los usuarios autenticados puedan subir y leer archivos
-- en el bucket 'condominio-files'
--
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase Dashboard
-- =====================================================

-- =====================================================
-- POLÍTICA 1: Permitir a usuarios autenticados subir archivos
-- =====================================================

CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'condominio-files'::text
);

-- =====================================================
-- POLÍTICA 2: Permitir a usuarios autenticados leer sus propios archivos
-- =====================================================

CREATE POLICY "Allow authenticated users to read their files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'condominio-files'::text
);

-- =====================================================
-- POLÍTICA 3: Permitir a administradores leer todos los archivos
-- =====================================================

CREATE POLICY "Allow admins to read all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'condominio-files'::text AND
  EXISTS (
    SELECT 1 
    FROM public.usuarios 
    WHERE id::text = (storage.foldername(name))[1]::text 
    AND rol = 'admin'
  )
);

-- =====================================================
-- POLÍTICA 4: Permitir a usuarios autenticados actualizar sus propios archivos
-- =====================================================

CREATE POLICY "Allow authenticated users to update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'condominio-files'::text
)
WITH CHECK (
  bucket_id = 'condominio-files'::text
);

-- =====================================================
-- POLÍTICA 5: Permitir a usuarios autenticados eliminar sus propios archivos
-- =====================================================

CREATE POLICY "Allow authenticated users to delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'condominio-files'::text
);

-- =====================================================
-- VERIFICAR POLÍTICAS CREADAS
-- =====================================================

-- Para verificar que las políticas se crearon correctamente:
SELECT 
  policyname as "Nombre de Política",
  cmd as "Operación",
  roles as "Roles",
  qual as "Condición USING",
  with_check as "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%condominio-files%'
ORDER BY policyname;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 
-- 1. Si las políticas ya existen, obtendrás un error.
--    En ese caso, elimina las políticas existentes primero:
--
--    DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
--    DROP POLICY IF EXISTS "Allow authenticated users to read their files" ON storage.objects;
--    DROP POLICY IF EXISTS "Allow admins to read all files" ON storage.objects;
--    DROP POLICY IF EXISTS "Allow authenticated users to update their files" ON storage.objects;
--    DROP POLICY IF EXISTS "Allow authenticated users to delete their files" ON storage.objects;
--
-- 2. Las políticas anteriores son permisivas. Para mayor seguridad,
--    puedes restringirlas según tus necesidades específicas.
--
-- 3. Si el bucket es público, algunas políticas pueden no ser necesarias,
--    pero es recomendable mantenerlas para control de acceso.
--
-- =====================================================


