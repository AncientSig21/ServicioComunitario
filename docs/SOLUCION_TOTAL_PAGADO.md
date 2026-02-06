# Solución: Total pagado no se actualiza al validar un pago

## Problema
Al validar un pago como administrador, el "Total Pagado" del residente no se actualizaba porque RLS impedía que el admin actualice la fila de otro usuario en `usuarios.total_pagado`.

---

## Qué hacer para que se refleje todo correctamente para el usuario (Estado de pagos)

Sigue estos pasos **en orden** para que el total pagado y el estado de pagos del usuario se vean bien siempre.

| Paso | Acción | Dónde |
|------|--------|--------|
| **1** | Asegurar columna `excedente` en `pagos` | Ejecutar `sql/agregar_excedente_pagos.sql` en Supabase (solo si aún no existe). |
| **2** | Crear función que actualiza el total en BD | Ejecutar `sql/func_actualizar_total_pagado_usuario.sql` en Supabase (SQL Editor). |
| **3** | Corregir totales ya guardados (una vez) | Ejecutar `sql/sincronizar_total_pagado_todos_usuarios.sql` en Supabase. Así todos los usuarios quedan con `total_pagado` = suma real de sus pagos. |
| **4** | (Opcional) RLS con Supabase Auth | Si usas RLS, aplicar `sql/rls_policies_supabase_auth.sql` y tener `auth_uid` en `usuarios` para que el admin quede bien identificado. |

**Para el usuario (residente):**

- Al entrar en **Estado de pagos** (`/pagos`), la app carga sus pagos y calcula el total como **máximo(usuarios.total_pagado, suma de abono+excedente de la lista)**. Así siempre ve al menos el total correcto.
- Si acaba de enviar un comprobante o el admin acaba de validar, que **recargue la página** (F5 o volver a entrar en Estado de pagos) para ver el total actualizado.

---

## Qué se implementó

### 1. Función en base de datos (obligatorio)
**Archivo:** `sql/func_actualizar_total_pagado_usuario.sql`

- Función `actualizar_total_pagado_usuario(usuario_id)` con **SECURITY DEFINER**.
- Calcula la suma de `abono + excedente` de todos los pagos del usuario y actualiza `usuarios.total_pagado`.
- Al ejecutarse como DEFINER, no está sujeta a RLS, por lo que el admin puede “actualizar” el total del residente llamando esta función.

**Qué hacer:** Ejecutar el script en tu proyecto Supabase (SQL Editor o migración):

```bash
# Contenido: sql/func_actualizar_total_pagado_usuario.sql
```

Si la columna `excedente` no existe en `pagos`, ejecutar antes:
`sql/agregar_excedente_pagos.sql`

### 2. App: validar pago usa la función
**Archivo:** `src/services/bookService.ts` (función `validarPago`)

- Tras actualizar el pago, se llama `supabase.rpc('actualizar_total_pagado_usuario', { usuario_id: pago.usuario_id })`.
- Si el RPC falla (por ejemplo, función no creada aún), se hace el fallback anterior: calcular total con `obtenerTotalPagadoDesdePagos` e intentar `UPDATE usuarios` (puede seguir fallando por RLS).

### 3. App: Total mostrado nunca menor al calculado
**Archivo:** `src/pages/PagosPage.tsx`

- El "Total Pagado" mostrado es: **máximo(usuarios.total_pagado, suma de abono+excedente de la lista de pagos)**.
- Así, si `usuarios.total_pagado` no se actualizó (RLS o error), el residente sigue viendo el total correcto a partir de la lista de pagos.

## Resumen de pasos

| Paso | Acción |
|------|--------|
| 1 | Ejecutar `sql/agregar_excedente_pagos.sql` si la tabla `pagos` no tiene columna `excedente`. |
| 2 | Ejecutar `sql/func_actualizar_total_pagado_usuario.sql` en Supabase. |
| 3 | (Opcional) Usar políticas RLS con Supabase Auth (`sql/rls_policies_supabase_auth.sql`) y tener `auth_uid` en `usuarios` para que el admin quede bien identificado en otras operaciones. |

Con esto, al validar un pago:
1. Se actualiza el pago en `pagos`.
2. Se llama a `actualizar_total_pagado_usuario(residente_id)` y se actualiza `usuarios.total_pagado`.
3. En Pagos del residente, el total mostrado es al menos la suma de la lista (por si la BD quedó desactualizada).
