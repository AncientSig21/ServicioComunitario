-- =====================================================
-- SCRIPT PARA ACTIVAR POLÍTICAS RLS
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Copia TODO este archivo
-- 3. Pégalo en el SQL Editor
-- 4. Haz clic en "Run" o presiona Ctrl+Enter
--
-- IMPORTANTE: Este script creará todas las políticas RLS
-- Asegúrate de tener backup de tu base de datos antes de ejecutar
-- =====================================================

-- PRIMERO: Verificar que auth_uid es UUID (si no, esto fallará)
-- Si falla, ejecuta primero:
-- ALTER TABLE usuarios ALTER COLUMN auth_uid TYPE UUID USING auth_uid::uuid;

-- Copia el contenido completo de rls_policies_supabase_auth.sql aquí
-- O ejecuta directamente: sql/rls_policies_supabase_auth.sql

-- Después de ejecutar, avísame para que ejecute el script de verificación

