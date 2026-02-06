-- =====================================================
-- Agregar campo condominio_id a la tabla pagos
-- Referencia al condominio al que pertenece el usuario donde se creó el pago
-- =====================================================

-- Verificar si la tabla condominios existe (requerida para la FK)
-- Si tu esquema usa otra tabla de condominios, ajusta el nombre.

-- Agregar columna condominio_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'condominio_id'
  ) THEN
    ALTER TABLE pagos ADD COLUMN condominio_id INTEGER NULL;
    COMMENT ON COLUMN pagos.condominio_id IS 'Condominio al que pertenece el usuario donde se creó el pago';
  END IF;
END $$;

-- Agregar FK a condominios si la tabla existe y la columna fue creada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'condominios')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos' AND column_name = 'condominio_id')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = 'pagos' AND constraint_name = 'pagos_condominio_id_fkey'
     ) THEN
    ALTER TABLE pagos
    ADD CONSTRAINT pagos_condominio_id_fkey
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índice para filtrar pagos por condominio
CREATE INDEX IF NOT EXISTS idx_pagos_condominio_id ON pagos(condominio_id);

-- Opcional: actualizar pagos existentes con el condominio_id del usuario
UPDATE pagos p
SET condominio_id = u.condominio_id
FROM usuarios u
WHERE p.usuario_id = u.id
  AND p.condominio_id IS NULL
  AND u.condominio_id IS NOT NULL;
