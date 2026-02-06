-- Permitir fotos de espacios comunes en base64 (la columna imagen_url pasa a TEXT para soportar data URLs largas).
-- Ejecutar en el SQL Editor de Supabase si las fotos se guardan como base64 desde la app.

ALTER TABLE espacios_comunes
  ALTER COLUMN imagen_url TYPE TEXT;

COMMENT ON COLUMN espacios_comunes.imagen_url IS 'URL de la imagen del espacio (puede ser URL externa o data URL base64 para fotos subidas por el admin).';
