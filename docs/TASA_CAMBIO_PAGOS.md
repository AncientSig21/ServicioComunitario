# Monto de pagos según tasa de cambio (Venezuela)

El monto de los pagos creados por el administrador puede vincularse a la tasa del dólar (Bs/USD) de Venezuela. Así el valor en bolívares se actualiza según la tasa cuando se consulta el estado del pago.

## Qué hace el sistema

1. **Tasa de cambio**: La tasa Bs/USD se obtiene **desde la página del Banco de Venezuela** (https://www.bancodevenezuela.com/index.html), sección "Mesa de cambio (USD-EUR)", mediante el script **`scripts/actualizar-tasa-bcv.js`**, que debe ejecutarse **una vez al día** (por ejemplo con cron o el Programador de tareas). Si en esa página la tasa se carga por JavaScript y no aparece en el HTML, el script usa como respaldo la página oficial del BCV. El script guarda la tasa en la tabla `tasa_cambio` y, si cambió, notifica a todos los administradores.
2. **Pagos en USD**: Al crear o editar pagos masivos (o un pago individual desde admin), puedes marcar **“Monto en USD (se actualiza con la tasa BCV/Venezuela)”** e indicar el monto en dólares. El sistema guarda ese monto en USD y, cada vez que se muestra el pago (listado admin, validación de pagos, página de pagos del residente), el monto en Bs se calcula como **monto_usd × tasa actual** (la última tasa guardada por el script).
3. **Notificación al administrador**: Cuando el script detecta un cambio en la tasa respecto a la última guardada, inserta una notificación para cada administrador indicando la nueva tasa y que revisen el estado de los pagos.

## Cómo usarlo

### Como administrador

1. Ir a **Pagos** (sección de administración). La tasa que ves es la última guardada por el script del BCV.
2. Para que la tasa se actualice cada día, programa la ejecución del script (ver más abajo).
3. **Crear pagos masivos**:
   - En el modal “Crear Pagos Masivos”, activa la opción **“Monto en USD (se actualiza con la tasa BCV/Venezuela)”**.
   - Ingresa el monto en dólares (ej.: 50).
   - Verás el **equivalente aproximado en Bs** según la tasa actual.
   - El listado de pagos mostrará el monto en Bs calculado con la tasa actual y un indicador “USD” en los que están en dólares.
4. **Editar un pago**: En edición también puedes activar “Monto en USD” y cambiar el valor en USD; el monto en Bs se recalcula con la tasa actual.

### Como residente

- En **Pagos**, los montos que el admin definió en USD se muestran en Bs usando la tasa actual. No hace falta hacer nada adicional.

### Validación de pagos (admin)

- En la pantalla de validación de pagos, el monto mostrado para cada pago (incluidos los que están en USD) usa la tasa actual para el cálculo en Bs.

## Requisitos

- Haber ejecutado el SQL **`sql/tasa_cambio_y_monto_usd.sql`** en Supabase (tabla `tasa_cambio` y columna `pagos.monto_usd`).
- Ejecutar **una vez al día** el script que obtiene la tasa del BCV (ver siguiente sección).

## Actualizar la tasa una vez al día

La tasa del dólar se lee desde la **página del Banco de Venezuela**:  
https://www.bancodevenezuela.com/index.html  
(sección "Mesa de cambio (USD-EUR)"). Si no se encuentra ahí (p. ej. porque se carga por JavaScript), el script usa como respaldo la página del BCV.

- **Ejecución manual**: desde la raíz del proyecto, `npm run tasa:bcv` o `node scripts/actualizar-tasa-bcv.js`.
- **Programar una vez al día** (ejemplos):
  - **Windows (Programador de tareas)**: Crear una tarea que ejecute `node scripts/actualizar-tasa-bcv.js` en la carpeta del proyecto, una vez al día a la hora que elijas.
  - **Linux/Mac (cron)**: `0 8 * * * cd /ruta/al/proyecto && node scripts/actualizar-tasa-bcv.js` (todos los días a las 8:00).

El script necesita las variables `VITE_PROJECT_URL_SUPABASE` y `VITE_SUPABASE_API_KEY` en el archivo `.env` del proyecto.

## Archivos relevantes

- **Script que obtiene la tasa del BCV**: `scripts/actualizar-tasa-bcv.js`
- **Servicio de tasa (solo lee de BD)**: `src/services/exchangeRateService.ts`
- **Lógica de pagos**: `src/services/bookService.ts` (`getMontoDisplay`, `getTasaParaPagos`, `actualizarTasaBCVYNotificarAdmins`, `crearPagosMasivos`, `actualizarPago`)
- **UI admin**: `src/pages/AdminPagosPage.tsx`
- **UI residente**: `src/pages/PagosPage.tsx`
- **Validación**: `src/pages/AdminValidacionPagosPage.tsx`
