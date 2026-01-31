-- =====================================================
-- Agregar columna monto_pagado_usd a pagos
-- Almacena el monto pagado por el usuario en USD cuando
-- ingresa el monto en dólares (D. Make a payment).
-- El equivalente en Bs se guarda en la columna abono.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'monto_pagado_usd'
  ) THEN
    ALTER TABLE public.pagos
    ADD COLUMN monto_pagado_usd DECIMAL(10, 2) NULL;
    COMMENT ON COLUMN public.pagos.monto_pagado_usd IS 'Monto pagado por el usuario en USD cuando ingresa en dólares; el equivalente en Bs va en abono.';
  END IF;
END $$;

-- Nota: Para mostrar "total pagado" por usuario (suma de abonos y pagos completos),
-- puede usarse la columna total_pagado en usuarios (ver sql/agregar_total_pagado_usuarios.sql)
-- o calcular en la app con: SUM(abono) de pagos del usuario.
