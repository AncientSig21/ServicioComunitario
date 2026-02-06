-- =====================================================
-- Actualizar usuarios.total_pagado desde la tabla pagos
-- Suma (abono + excedente) de todos los pagos con estado = 'pagado'.
-- Ejecutar si total_pagado aparece null en la BD o para corregir valores.
-- Requiere: columna excedente en pagos (sql/agregar_excedente_pagos.sql).
-- =====================================================

-- 1. Asegurar que la columna total_pagado existe y acepta valores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'total_pagado'
  ) THEN
    ALTER TABLE public.usuarios
    ADD COLUMN total_pagado DECIMAL(14, 2) DEFAULT 0;
    COMMENT ON COLUMN public.usuarios.total_pagado IS 'Suma de pagos validados (abono + excedente) del usuario.';
  END IF;
END $$;

-- 2. Rellenar total_pagado con la suma real (abono + excedente si existe) de pagos validados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'excedente'
  ) THEN
    UPDATE public.usuarios u
    SET total_pagado = COALESCE(
      (SELECT SUM(COALESCE(p.abono, 0) + COALESCE(p.excedente, 0))
       FROM public.pagos p WHERE p.usuario_id = u.id AND p.estado = 'pagado'),
      0
    );
  ELSE
    UPDATE public.usuarios u
    SET total_pagado = COALESCE(
      (SELECT SUM(COALESCE(p.abono, 0))
       FROM public.pagos p WHERE p.usuario_id = u.id AND p.estado = 'pagado'),
      0
    );
  END IF;
END $$;

-- 3. (Opcional) Verificar filas donde monto = 365 por si fue un error de datos
-- SELECT id, usuario_id, concepto, monto, abono, excedente, estado
-- FROM public.pagos WHERE monto = 365;
