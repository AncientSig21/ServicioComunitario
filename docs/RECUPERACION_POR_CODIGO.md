# Recuperación de contraseña por código (sin preguntas de seguridad)

## Resumen

- **Preguntas de seguridad:** Eliminadas de la base de datos y del código. La recuperación de contraseña ya no usa preguntas.
- **Código de recuperación:** Al registrarse por primera vez, se genera un código y se guarda en `usuarios.codigo_recuperacion`. El usuario debe guardarlo para poder restablecer la contraseña en "¿Olvidaste tu contraseña?". El administrador puede ver este código en **Admin → Residentes** (columna "Código recuperación" y en el modal al editar estado).

## SQL a ejecutar en Supabase

### 1. Eliminar todo lo de preguntas de seguridad

En **Supabase → SQL Editor**, ejecuta:

**`sql/eliminar_preguntas_seguridad.sql`**

Ese script:
- Elimina las funciones RPC `get_preguntas_seguridad_por_correo` y `reset_password_con_preguntas`.
- Elimina el índice y la columna `preguntas_seguridad` de la tabla `usuarios`.

No modifica otras tablas ni columnas.

### 2. Tener columna y RPC del código de recuperación

Si aún no lo has hecho, ejecuta en el mismo SQL Editor:

**`sql/agregar_codigo_recuperacion.sql`**

Eso agrega la columna `codigo_recuperacion` a `usuarios` y la función RPC `reset_password_con_codigo` para restablecer la contraseña con correo + código.

## Cambios en el código (ya aplicados)

1. **RegisterPage**
   - Se eliminó todo lo relacionado con preguntas de seguridad (import de `hashAnswer`, constantes de preguntas, payload de preguntas).
   - En cada registro (con o sin vivienda) se genera un código de 8 caracteres alfanuméricos y se guarda en `codigo_recuperacion`.
   - Tras el registro exitoso se muestra un `alert` con el código para que el usuario lo guarde.

2. **authService**
   - `getSecurityQuestions` y `resetPasswordWithSecurityQuestions` quedaron como stubs que devuelven un mensaje indicando que debe usarse el código de recuperación.
   - La recuperación real se hace con `resetPasswordWithCode` (correo + código + nueva contraseña), que ya existía y usa la RPC `reset_password_con_codigo`.

3. **AdminResidentesPage**
   - Nueva columna **"Código recuperación"** en la tabla de residentes (muestra el valor o "—" si no hay).
   - En el modal "Cambiar Estado del Residente" se muestra también el **Código de recuperación** para que el admin pueda copiarlo y darlo al residente si lo perdió.

4. **ForgotPasswordPage**
   - Sin cambios: ya usaba el flujo de correo → código de recuperación → nueva contraseña.

## Flujo para el usuario

1. **Registro:** Se registra y recibe un mensaje con su código de recuperación. Debe guardarlo.
2. **Olvidó contraseña:** Entra a "¿Olvidaste tu contraseña?", ingresa correo, luego el código de recuperación y la nueva contraseña.
3. **Perdió el código:** El administrador entra a **Residentes**, localiza al usuario y puede ver/copiar el código en la columna "Código recuperación" o al abrir "Cambiar Estado" del residente.

## Usuarios ya existentes sin código

Los usuarios creados antes de este cambio no tendrán `codigo_recuperacion`. Puedes:
- Asignarles un código manualmente en Supabase (Table Editor → `usuarios` → editar la fila y poner un valor en `codigo_recuperacion`), o
- Crear una función/script que genere y actualice códigos para esos usuarios.
