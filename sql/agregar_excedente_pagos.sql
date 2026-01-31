-- =====================================================
-- Agregar columna excedente a pagos
-- Almacena el excedente de un pago cuando el usuario paga
-- más del monto de la cuota. El "abono" solo guarda el
-- monto que cubre la cuota (hasta monto); el excedente
-- va en esta columna (pago completo con excedente).
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'excedente'
  ) THEN
    ALTER TABLE public.pagos
    ADD COLUMN excedente DECIMAL(10, 2) NOT NULL DEFAULT 0;
    COMMENT ON COLUMN public.pagos.excedente IS 'Excedente del pago cuando el usuario pagó más del monto de la cuota. No se guarda en abono; abono solo cubre hasta monto.';
  END IF;
END $$;
