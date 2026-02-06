-- =====================================================
-- SCRIPT PARA HABILITAR REALTIME EN LA TABLA PAGOS
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Habilitar la replicación para la tabla pagos
-- Esto permite que Supabase Realtime detecte cambios en tiempo real

ALTER PUBLICATION supabase_realtime ADD TABLE pagos;

-- Verificar que la tabla está incluida en la publicación
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- =====================================================
-- NOTA: Si el comando anterior da error porque la tabla
-- ya está en la publicación, puede ignorarlo.
-- 
-- También puede habilitar Realtime desde el Dashboard:
-- 1. Ir a Database > Replication
-- 2. Encontrar la tabla "pagos"
-- 3. Activar el toggle de Realtime
-- =====================================================
