-- Tipo de solicitud: mantenimiento o servicio
-- Ejecutar en Supabase SQL Editor si quieres diferenciar solicitudes por tipo.

ALTER TABLE solicitudes_mantenimiento
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) NOT NULL DEFAULT 'mantenimiento';

COMMENT ON COLUMN solicitudes_mantenimiento.tipo IS 'Tipo de solicitud: mantenimiento o servicio';
