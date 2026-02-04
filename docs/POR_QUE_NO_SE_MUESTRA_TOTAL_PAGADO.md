# Por qué antes se mostraba el Total Pagado y ahora no

## Opción usada de nuevo (la de antes)

Se ha vuelto a usar la **opción anterior**:

1. **Fuente principal:** se lee **`usuarios.total_pagado`** (columna en la tabla `usuarios`).
2. **Respaldo:** si es null o no existe, se usa la suma de `abono` + `excedente` desde la tabla `pagos` o desde la lista ya cargada.
3. En pantalla se muestra ese valor (BD o calculado).

Así el total solo depende de que exista y sea legible la columna **`usuarios.total_pagado`**. No hace falta que en `pagos` existan `abono`/`excedente` para que se muestre el total (solo para el respaldo).

---

## Qué había cambiado (y por qué fallaba)

En un momento la lógica se invirtió:

1. Se intentaba primero la suma desde **`pagos`** (`abono` + `excedente`).
2. Si fallaba (p. ej. columnas inexistentes), se usaba **`usuarios.total_pagado`** como respaldo.

Si en tu BD **no existen** `abono` o `excedente` en `pagos`, la suma fallaba; si además `usuarios.total_pagado` no existía o no se podía leer, el total no se mostraba. Por eso se ha vuelto a la opción anterior: **`usuarios.total_pagado` primero**.

## Por qué puede dejar de mostrarse (o verse en 0)

El total solo se ve bien si **al menos una** de estas tres cosas funciona:

| Fuente | Dónde | Cuándo falla |
|--------|--------|----------------|
| **1. Suma desde `pagos`** | `obtenerTotalPagadoDesdePagos` hace `SELECT abono, estado, excedente FROM pagos WHERE usuario_id = ?` | Falla si en tu base de datos **no existen** las columnas `abono` o `excedente` en la tabla `pagos`. Entonces la consulta da error y esta fuente no se usa. |
| **2. Columna en `usuarios`** | `obtenerTotalPagadoUsuario` lee `usuarios.total_pagado` | Falla si la columna **`usuarios.total_pagado`** no existe, o si RLS impide leerla. Entonces esta fuente tampoco se usa. |
| **3. Total desde la lista** | En la página se suma `abono` + `excedente` de cada pago ya cargado (`pagosCompletos`) | Vale 0 si la lista de pagos está vacía, o si los registros que devuelve `pagos` no traen `abono` / `monto_pagado` / `excedente` (por ejemplo, porque esas columnas no existen en tu BD). |

Si **las tres fallan o dan 0**:

- La suma desde `pagos` falla (columnas faltantes).
- La lectura de `usuarios.total_pagado` falla (columna faltante o RLS).
- La lista no tiene abonos/excedentes (mismo problema de columnas o lista vacía).

entonces en pantalla solo puede mostrarse **0** o quedar como si “no se mostrara” el total.

En resumen: **antes** seguramente solo usabas **`usuarios.total_pagado`** (o la lista con `monto_pagado`). **Ahora** la app intenta usar primero **`pagos.abono`** y **`pagos.excedente`**. Si tu base de datos **no tiene** esas columnas (ni `usuarios.total_pagado`), el total deja de mostrarse correctamente.

## Qué hacer para que se vuelva a mostrar

1. **Tener en la BD las columnas y datos que la app espera**
   - En **`pagos`**: columnas **`abono`** y **`excedente`** (aunque sea con 0).
   - En **`usuarios`**: columna **`total_pagado`**.
   - Scripts sugeridos (en Supabase, en este orden):
     - `sql/agregar_columna_abono_pagos.sql`
     - `sql/agregar_excedente_pagos.sql`
     - `sql/func_actualizar_total_pagado_usuario.sql` (crea también `usuarios.total_pagado` si no existe)

2. **Rellenar el total de todos los usuarios (una vez)**
   - Ejecutar: `sql/sincronizar_total_pagado_todos_usuarios.sql`
   - Así **`usuarios.total_pagado`** tendrá el valor correcto para cada usuario y la app puede mostrarlo aunque falle la suma directa desde `pagos`.

3. **Comprobar en la app**
   - Que el usuario tenga al menos un pago en Estado de pagos.
   - Que esos pagos tengan `abono` o `monto_pagado` (y opcionalmente `excedente`) en la BD para que tanto la suma desde `pagos` como el total calculado desde la lista tengan valor.

Con eso, al menos una de las tres fuentes (suma desde `pagos`, `usuarios.total_pagado`, o total desde la lista) tendrá datos y el **Total Pagado** volverá a mostrarse como antes.
