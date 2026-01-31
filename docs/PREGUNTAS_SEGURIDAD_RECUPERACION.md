# Preguntas de seguridad para recuperación de contraseña

## Resumen

- **Registro:** Las preguntas de seguridad del formulario de registro **ahora se guardan** en la base de datos (columna `preguntas_seguridad` de la tabla `usuarios`).
- **Recuperación:** La página "¿Olvidaste tu contraseña?" ya usa esas preguntas para recuperar la contraseña **sin enviar correo**.

## Qué había antes vs qué hay ahora

| Aspecto | Antes | Ahora |
|--------|--------|--------|
| **Base de datos** | Columna `preguntas_seguridad` no existía o no se usaba | Se usa la columna `preguntas_seguridad` (JSONB) si existe |
| **Registro** | El formulario mostraba preguntas pero **no se guardaban** | Si el usuario completa al menos una pregunta y respuesta, se guardan (respuestas hasheadas) |
| **Recuperar contraseña** | `authService.getSecurityQuestions` y `resetPasswordWithSecurityQuestions` ya existían pero no había datos | Con preguntas guardadas en el registro, el flujo "Olvidé mi contraseña" funciona con preguntas |

## Qué debes hacer en la base de datos

1. **Ejecutar la migración** (si aún no lo has hecho):
   - En el **SQL Editor de Supabase**, ejecuta el archivo:
   - **`sql/add_preguntas_seguridad.sql`**
   - Eso agrega la columna `preguntas_seguridad` (JSONB) a la tabla `usuarios`.

2. **Usuarios ya registrados:** Los que se registraron antes de este cambio **no tienen preguntas guardadas**. Para ellos, "¿Olvidaste tu contraseña?" seguirá mostrando el mensaje de que no tienen preguntas configuradas. Solo los **nuevos registros** (o un futuro flujo de "configurar preguntas" en perfil) tendrán preguntas y podrán recuperar la contraseña por este medio.

## Cambios realizados en el código

1. **RegisterPage.tsx**
   - Importa `hashAnswer` de `securityUtils`.
   - Al enviar el formulario, construye un objeto `preguntas_seguridad` con las preguntas completadas (texto de la pregunta + hash de la respuesta).
   - Lo envía tanto en el registro **simple** (sin vivienda) como en **registerResidente** (con vivienda).
   - Texto en la UI actualizado: se indica que las preguntas se guardan para recuperar la contraseña sin depender del correo.

2. **bookService.ts (registerResidente)**
   - Si en `userData` viene `preguntas_seguridad`, se incluye en el `insert` a `usuarios`.

3. **authService.ts y ForgotPasswordPage.tsx**
   - No se modificaron: ya leían `preguntas_seguridad` y validaban respuestas para recuperar la contraseña.

## Flujo de recuperación de contraseña (sin email)

1. Usuario entra a "¿Olvidaste tu contraseña?".
2. Ingresa su correo.
3. Se cargan sus preguntas de seguridad desde `usuarios.preguntas_seguridad`.
4. Responde las preguntas.
5. Si las respuestas coinciden con los hashes guardados, puede establecer una nueva contraseña.

Si la columna no existe o el usuario no tiene preguntas, se muestra el mensaje correspondiente (por ejemplo, contactar al administrador).
