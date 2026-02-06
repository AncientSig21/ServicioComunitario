# Tasa de cambio (Venezuela) y monto en USD para pagos

## Qué hace

- **Tabla `tasa_cambio`**: guarda la tasa Bs/USD actual (actualizada por la API DolarApi Venezuela).
- **Columna `pagos.monto_usd`**: si el administrador crea un pago con "Monto en USD", aquí se guarda ese valor y el monto en Bs se calcula en tiempo real con la tasa actual.

## Pasos en Supabase

1. Abre el **SQL Editor** de tu proyecto Supabase.
2. Ejecuta el contenido del archivo **`tasa_cambio_y_monto_usd.sql`** (en esta misma carpeta `sql/`).
3. Comprueba que existan:
   - La tabla `tasa_cambio` con al menos una fila.
   - La columna `monto_usd` en la tabla `pagos`.

## Uso en la aplicación

- En **Gestión de pagos** (admin): al crear o editar pagos puedes marcar "Monto en USD" e indicar el monto en dólares; el sistema mostrará el equivalente en Bs con la tasa actual.
- La tasa se actualiza al cargar la sección de pagos del admin; si cambia, se notifica a todos los administradores.
- En **Pagos** (residente) y **Validación de pagos** (admin) el monto mostrado en el estado del pago usa la tasa actual cuando el pago tiene `monto_usd`.

## API de tasa

Se usa **DolarApi** (Venezuela). Si la API no responde, se usa la última tasa guardada en `tasa_cambio` o un valor por defecto.
