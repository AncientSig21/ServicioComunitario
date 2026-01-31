# Total pagado en BD y valor 365 en monto

## 1. Por qué `usuarios.total_pagado` aparece null

- La columna **`usuarios.total_pagado`** no se estaba actualizando al validar pagos (se deshabilitó para no tocar el monto del usuario).
- **Cambio aplicado:** al validar un pago, ahora se recalcula y se guarda en `usuarios.total_pagado` la suma de (abono + excedente) de todos los pagos con `estado = 'pagado'` de ese usuario.
- **Para datos ya existentes:** ejecutar en Supabase SQL Editor el script:
  - **`sql/actualizar_total_pagado_desde_pagos.sql`**
  Así se rellena `total_pagado` para todos los usuarios según sus pagos validados.

## 2. Por qué aparece 365 en “monto”

- En el código **no** hay ningún valor fijo 365 para montos de pagos.
- Si en la app o en la BD ves **365** en un monto, suele ser por:
  1. **Dato en la BD:** algún registro en `pagos` tiene `monto = 365` (carga manual o migración).
  2. **Columna equivocada:** otra columna (por ejemplo “días” o similar) con valor 365 está mostrándose o guardándose como monto.

**Qué revisar en Supabase:**

1. En la tabla **`pagos`**, ejecutar:
   ```sql
   SELECT id, usuario_id, concepto, monto, abono, excedente, estado
   FROM public.pagos
   WHERE monto = 365;
   ```
2. Si hay filas con `monto = 365` y no debería ser así, corregir el valor en el editor de la tabla o con un `UPDATE` por `id`.
3. Revisar que en `pagos` la columna que usas para el monto de la cuota sea **`monto`** y no otra (por ejemplo algo tipo “días” o “salt”).

## 3. Resumen

| Problema | Solución |
|----------|----------|
| `usuarios.total_pagado` null | Ejecutar `sql/actualizar_total_pagado_desde_pagos.sql`. A partir de ahora también se actualiza al validar un pago. |
| Valor 365 en monto | Revisar en `pagos` las filas con `monto = 365` y corregir el dato o la columna que se está usando como monto. |
