-- Guardar fotos de avances de mantenimiento en la base de datos (base64)
-- OBLIGATORIO: Ejecutar este script en el SQL Editor de Supabase antes de subir fotos desde la app.
-- Las imágenes se guardan en la columna foto_base64 (no en Storage) para acceso directo sin bucket.

ALTER TABLE avances_mantenimiento
ADD COLUMN IF NOT EXISTS foto_base64 TEXT;

COMMENT ON COLUMN avances_mantenimiento.foto_base64 IS 'Imagen del avance en base64 (data URL: data:image/...;base64,...). Se usa en lugar del bucket para acceso directo.';
