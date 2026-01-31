-- =====================================================
-- Agregar columna total_pagado a usuarios
-- Almacena la suma de todos los pagos validados (abono) del usuario.
-- Se actualiza cuando el administrador valida un pago.
-- =====================================================

-- 1. Agregar columna total_pagado si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'total_pagado'
  ) THEN
    ALTER TABLE public.usuarios
    ADD COLUMN total_pagado DECIMAL(14, 2) NOT NULL DEFAULT 0;
    COMMENT ON COLUMN public.usuarios.total_pagado IS 'Suma de todos los pagos validados por el administrador (abono) para este usuario.';
  END IF;
END $$;

-- 2. (Opcional) Rellenar con la suma actual de abonos de pagos del usuario
-- Ejecutar una sola vez después de agregar la columna para datos existentes
UPDATE public.usuarios u
SET total_pagado = COALESCE(
  (SELECT SUM(COALESCE(p.abono, 0)) FROM public.pagos p WHERE p.usuario_id = u.id AND COALESCE(p.abono, 0) > 0),
  0
)
WHERE EXISTS (SELECT 1 FROM public.pagos p WHERE p.usuario_id = u.id);
