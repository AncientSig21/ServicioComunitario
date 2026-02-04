# Verificación del esquema de base de datos

Este documento describe el esquema esperado por la aplicación para las tablas **pagos** y **usuarios** (pagos, total pagado, abono, excedente) y cómo se relaciona con los scripts SQL del repositorio.

---

## 1. Tabla `pagos`

### 1.1 Definición base (`database_schema.sql`)

| Columna           | Tipo            | Descripción                          |
|-------------------|-----------------|--------------------------------------|
| id                | SERIAL PRIMARY KEY | |
| usuario_id        | INTEGER NOT NULL    | FK usuarios(id) |
| concepto          | VARCHAR(500) NOT NULL | |
| monto             | DECIMAL(10,2) NOT NULL | Monto de la cuota (Bs o snapshot) |
| tipo              | VARCHAR(50) NOT NULL | |
| estado            | VARCHAR(50) DEFAULT 'pendiente' | pendiente, pagado, vencido, rechazado, etc. |
| fecha_vencimiento | DATE NOT NULL   | |
| fecha_pago        | TIMESTAMP       | |
| referencia        | VARCHAR(100)    | |
| metodo_pago       | VARCHAR(50)    | |
| **monto_pagado**  | DECIMAL(10,2) DEFAULT 0 | En el schema base: monto pagado/abonado |
| observaciones     | TEXT            | |
| created_at        | TIMESTAMP       | |
| updated_at        | TIMESTAMP       | |

El schema base **no** incluye: `abono`, `excedente`, `monto_usd`, `monto_pagado_usd`, `condominio_id`, `vivienda_id`, `comprobante_archivo_id`.

### 1.2 Columnas añadidas por scripts en `sql/`

| Script | Columna / efecto |
|--------|-------------------|
| `agregar_excedente_pagos.sql` | **excedente** (DECIMAL 10,2, default 0) – excedente del pago cuando el usuario paga más de la cuota |
| `agregar_monto_pagado_usd_pagos.sql` | **monto_pagado_usd** (DECIMAL 10,2, NULL) – monto pagado en USD |
| `tasa_cambio_y_monto_usd.sql` | **monto_usd** (DECIMAL 10,2, NULL) – monto de la cuota en USD (conversión con tasa) |
| `agregar_condominio_id_pagos.sql` | **condominio_id** (INTEGER NULL, FK condominios) |

### 1.3 Columna `abono` (esperada por la aplicación)

- La aplicación y `actualizar_total_pagado_desde_pagos.sql` usan la columna **`abono`** en la tabla **`pagos`** (monto abonado/pagado por el usuario en esa cuota).
- En el repositorio **no** hay ningún script que cree la columna **`abono`**; el schema base solo tiene **`monto_pagado`**.
- Si en tu base de datos la tabla `pagos` ya tiene la columna **`abono`**, el esquema real está alineado con lo que espera la app.
- Para que el esquema quede documentado y reproducible, se recomienda ejecutar el script **`sql/agregar_columna_abono_pagos.sql`** (ver más abajo) en entornos donde aún no exista `abono`.

Resumen: la aplicación espera en **pagos** al menos:

- **abono** – monto pagado/abonado en esa cuota (obligatorio para total pagado y validación).
- **excedente** – si existe; si no, el código tiene fallback.
- **monto**, **estado**, **usuario_id** – ya en schema base.

---

## 2. Tabla `usuarios`

### 2.1 Definición base

El `database_schema.sql` **no** define la columna **`total_pagado`** en `usuarios`.

### 2.2 Scripts que afectan a `usuarios`

| Script | Efecto |
|--------|--------|
| `actualizar_total_pagado_desde_pagos.sql` | Crea **total_pagado** (DECIMAL 14,2) en `usuarios` si no existe y la rellena con la suma de `abono + excedente` de pagos del usuario (según estado). |

La aplicación espera en **usuarios**:

- **total_pagado** – suma de (abono + excedente) de los pagos del usuario; se actualiza al validar un pago y se usa para mostrar “Total Pagado”.

---

## 3. Tabla `tasa_cambio`

Definida en `sql/tasa_cambio_y_monto_usd.sql`:

- **tasa_bs_usd** – tasa Bs/USD.
- **fecha_actualizacion**, **fuente**, **created_at**, **updated_at**.

Usada por el servicio de tasa (API en tiempo real y fallback).

---

## 4. Resumen: qué debe tener la BD para que “Total Pagado” y validación funcionen

1. **pagos**
   - Columna **abono** (monto pagado por cuota). Si no existe, añadirla con `sql/agregar_columna_abono_pagos.sql`.
   - Columna **excedente** (opcional pero recomendada): `sql/agregar_excedente_pagos.sql`.
   - Resto según schema base y demás scripts (monto, estado, usuario_id, monto_usd, etc.).

2. **usuarios**
   - Columna **total_pagado**: creada y actualizada por `sql/actualizar_total_pagado_desde_pagos.sql`.

3. **Orden sugerido de ejecución de scripts**
   - Schema base (`database_schema.sql` o equivalente).
   - `tasa_cambio_y_monto_usd.sql`
   - `agregar_excedente_pagos.sql`
   - **`agregar_columna_abono_pagos.sql`** (nuevo, ver abajo) si la tabla `pagos` no tiene aún `abono`.
   - `agregar_total_pagado_usuarios.sql` (si existe y no está vacío) o la parte de `actualizar_total_pagado_desde_pagos.sql` que crea `usuarios.total_pagado`.
   - `actualizar_total_pagado_desde_pagos.sql` (para rellenar/actualizar `usuarios.total_pagado`).

---

## 5. Conclusión

- **Base de datos actual**: si en la tabla **pagos** existe la columna **abono** y en **usuarios** la columna **total_pagado**, el esquema cumple lo que la aplicación necesita para el flujo de pagos y “Total Pagado”.
- **Repositorio**: el esquema base y los scripts no definían la columna **abono** en **pagos**; para que el esquema quede verificado y completo en el repo, se añade el script `sql/agregar_columna_abono_pagos.sql` (ver siguiente sección).
