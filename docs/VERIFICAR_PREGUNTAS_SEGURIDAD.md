# Cómo verificar el funcionamiento de las preguntas de seguridad

## 0. RPC para recuperación con RLS activo (obligatorio)

Si en tu proyecto está activo **Row Level Security (RLS)** en la tabla `usuarios`, las consultas directas a `usuarios` desde la app (usuario no autenticado) no devolverán filas. Para que "¿Olvidaste tu contraseña?" funcione, hay que usar funciones RPC que se ejecutan con privilegios elevados y evitan RLS:

1. Abre **Supabase** → **SQL Editor**.
2. Ejecuta el script **`sql/rpc_preguntas_seguridad.sql`**.
3. Ese script crea:
   - `get_preguntas_seguridad_por_correo(p_correo)` — para obtener preguntas por correo sin estar logueado.
   - `reset_password_con_preguntas(p_correo, p_nueva_contraseña, p_respuestas)` — para validar respuestas y actualizar la contraseña.

Sin ejecutar este script, en "Olvidé mi contraseña" seguirá apareciendo que el usuario no tiene preguntas de seguridad aunque sí estén guardadas en la base de datos.

---

## 1. Asegurar que la base de datos tenga la columna

1. Abre **Supabase** → **SQL Editor**.
2. Ejecuta el script **`sql/add_preguntas_seguridad.sql`** (si aún no lo has ejecutado).
3. Opcional: comprobar que la columna existe:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'preguntas_seguridad';
   ```
   Debe devolver una fila con `preguntas_seguridad` y tipo `jsonb`.

---

## 2. Verificar el registro (guardado de preguntas)

1. En la app, ve a **Registro** (página de crear cuenta).
2. Completa todos los campos obligatorios (nombre, correo, contraseña, etc.).
3. En **Preguntas de Seguridad**, completa **al menos una**:
   - Elige una pregunta (por ejemplo "¿Cuál es el nombre de tu primera mascota?").
   - Escribe una respuesta (por ejemplo "Firulais").
4. Envía el formulario y espera el mensaje de registro exitoso.
5. En **Supabase** → **Table Editor** → tabla **`usuarios`**, abre el usuario que acabas de crear.
6. Revisa la columna **`preguntas_seguridad`**. Debe tener un JSON similar a:
   ```json
   {
     "preguntas": [
       {
         "pregunta": "¿Cuál es el nombre de tu primera mascota?",
         "respuesta_hash": "a1b2c3...",
         "tipo": "predefinida",
         "created_at": "2025-01-28T..."
       }
     ]
   }
   ```
   Si ves algo así, el registro de preguntas **está funcionando**.

---

## 3. Verificar la recuperación de contraseña (sin email)

1. Cierra sesión (o usa una ventana de incógnito).
2. En la página de **Login**, haz clic en **"¿Olvidaste tu contraseña?"** (o el enlace que lleve a `/forgot-password`).
3. **Paso 1 – Correo:** escribe el **mismo correo** del usuario que registraste con preguntas y continúa.
4. Debe aparecer el **Paso 2 – Preguntas de seguridad:** las preguntas que guardaste (solo el texto de la pregunta, no la respuesta).
5. Responde **exactamente** como en el registro (misma respuesta, mismo uso de mayúsculas/minúsculas no importa; se normaliza).
6. Si las respuestas son correctas, debe aparecer el **Paso 3 – Nueva contraseña:** escribe una contraseña nueva y confírmala.
7. Envía el formulario.
8. Debe mostrarse un mensaje de éxito (contraseña actualizada).
9. Ve al **Login** e inicia sesión con ese correo y la **nueva contraseña**. Debe permitirte entrar.

Si en el paso 4 no aparecen preguntas y ves un mensaje tipo "Este usuario no tiene preguntas de seguridad configuradas", entonces:
- **RLS activo:** asegúrate de haber ejecutado **`sql/rpc_preguntas_seguridad.sql`** en Supabase (ver sección 0).
- La columna `preguntas_seguridad` no existe en tu BD, o
- Ese usuario se creó antes de guardar preguntas (no tiene datos en esa columna).

---

## 4. Resumen rápido

| Paso | Acción | Qué comprobar |
|-----|--------|----------------|
| 0 | Ejecutar `sql/rpc_preguntas_seguridad.sql` (si usas RLS) | Funciones RPC creadas; recuperación por correo funciona sin sesión. |
| 1 | Ejecutar `sql/add_preguntas_seguridad.sql` | Columna `preguntas_seguridad` existe en `usuarios`. |
| 2 | Registrar usuario nuevo con al menos 1 pregunta | En `usuarios`, ese usuario tiene `preguntas_seguridad` con al menos una pregunta y `respuesta_hash`. |
| 3 | Ir a "¿Olvidaste tu contraseña?" → correo | Se cargan las preguntas de ese usuario. |
| 4 | Responder preguntas y poner nueva contraseña | Mensaje de éxito y poder entrar con la nueva contraseña. |

Si todo lo anterior se cumple, la operación de preguntas de seguridad y recuperación de contraseña está verificada.
