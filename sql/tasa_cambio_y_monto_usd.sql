-- =====================================================
-- Tasa de cambio (BCV/Venezuela) y monto en USD para pagos
-- Ejecutar en Supabase SQL Editor antes de usar la API de tipo de cambio
-- =====================================================

-- 1. Tabla para almacenar la tasa de cambio actual (Bs/USD)
CREATE TABLE IF NOT EXISTS tasa_cambio (
  id SERIAL PRIMARY KEY,
  tasa_bs_usd DECIMAL(18, 4) NOT NULL,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fuente VARCHAR(100) DEFAULT 'BCV',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para obtener la última tasa rápidamente
CREATE INDEX IF NOT EXISTS idx_tasa_cambio_fecha ON tasa_cambio(fecha_actualizacion DESC);

-- Insertar una fila inicial (Banco de Venezuela; actualizar con script actualizar-tasa-bcv.js)
INSERT INTO tasa_cambio (tasa_bs_usd, fuente)
SELECT 367.30, 'Banco de Venezuela'
WHERE NOT EXISTS (SELECT 1 FROM tasa_cambio LIMIT 1);

-- 2. Columna opcional en pagos: monto en USD (cuando está definido, el monto en Bs se calcula con la tasa actual)
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(10, 2) NULL;

COMMENT ON COLUMN pagos.monto_usd IS 'Si no es NULL, el monto efectivo en Bs se calcula como monto_usd * tasa_cambio actual. El monto en columna monto puede ser un snapshot al crear.';
