-- =====================================================
-- Agregar columna abono a la tabla pagos
-- La aplicación y actualizar_total_pagado_desde_pagos.sql
-- usan esta columna para el monto pagado/abonado por cuota.
-- Si ya existe monto_pagado, abono es el nombre preferido en el código.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'abono'
  ) THEN
    ALTER TABLE public.pagos
    ADD COLUMN abono DECIMAL(10, 2) DEFAULT 0;
    COMMENT ON COLUMN public.pagos.abono IS 'Monto pagado/abonado en esta cuota (registrado al enviar comprobante o validar). Usado para Total Pagado.';
  END IF;
END $$;
