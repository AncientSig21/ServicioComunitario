# Qué hacer para que funcionen las preguntas de seguridad

## Por qué sale "no tiene preguntas de seguridad configuradas"

La columna **existe** en la base de datos, pero el **usuario con el que pruebas** no tiene ningún dato guardado en esa columna (está en NULL o vacío).  
Eso pasa cuando:

- El usuario se registró **antes** de que se guardaran las preguntas, o  
- El usuario se registró **sin completar** ninguna pregunta de seguridad.

El sistema solo puede recuperar contraseña por preguntas si ese usuario tiene **preguntas y respuestas guardadas** en `preguntas_seguridad`.

---

## Pasos que debes seguir (en orden)

### 1. Tener la columna en la base de datos

- Abre **Supabase** → **SQL Editor**.
- Ejecuta el contenido del archivo: **`sql/add_preguntas_seguridad.sql`**.
- Así se crea la columna **`preguntas_seguridad`** en la tabla **`usuarios`**.

### 2. Tener las funciones RPC en la base de datos

- En el mismo **SQL Editor** de Supabase, ejecuta el archivo: **`sql/rpc_preguntas_seguridad.sql`**.
- Con eso se crean las funciones que usa “¿Olvidaste tu contraseña?” para leer preguntas y restablecer la contraseña (y evitan problemas con RLS).

### 3. Usar un usuario que **sí tenga** preguntas guardadas

Tienes dos opciones:

**Opción A – Usuario nuevo (recomendado)**  
1. Ve a la página de **Registro** de tu aplicación.  
2. Crea un **usuario nuevo** (correo que no exista).  
3. Completa **todas** las preguntas de seguridad (al menos las 2 que pide el formulario).  
4. Envía el formulario y espera el mensaje de registro correcto.  
5. Para probar: ve a **“¿Olvidaste tu contraseña?”**, escribe **ese mismo correo** y continúa.  
   - Deberían aparecer las preguntas y, al responder bien, poder poner una nueva contraseña.

**Opción B – Usuario que ya existe**  
- Los usuarios que se registraron **antes** de tener la columna o **sin** llenar preguntas tienen `preguntas_seguridad` en NULL.  
- Para que a ese usuario le funcionen las preguntas hay que **escribir datos** en `preguntas_seguridad` (por ejemplo desde Supabase o con un script).  
- Lo más sencillo es usar la **Opción A**: crear un usuario nuevo y completar las preguntas en el registro.

---

## Cómo comprobar que un usuario tiene preguntas

En **Supabase** → **Table Editor** → tabla **`usuarios`**:

1. Localiza la fila del usuario (por correo).
2. Mira la columna **`preguntas_seguridad`**.
3. Si está en **NULL** o vacía → ese usuario **no tiene preguntas** y por eso sale el mensaje.
4. Si tiene un JSON con algo como `{"preguntas": [ ... ]}` → ese usuario **sí tiene preguntas** y “¿Olvidaste tu contraseña?” debería mostrar las preguntas al poner su correo.

---

## Resumen

| Qué necesitas | Dónde / cómo |
|---------------|--------------|
| Columna `preguntas_seguridad` en `usuarios` | Ejecutar **`sql/add_preguntas_seguridad.sql`** en Supabase. |
| Funciones para leer preguntas y restablecer contraseña | Ejecutar **`sql/rpc_preguntas_seguridad.sql`** en Supabase. |
| Usuario con preguntas guardadas | Registrar un **usuario nuevo** completando las preguntas de seguridad en el formulario de registro, y usar **ese correo** en “¿Olvidaste tu contraseña?”. |

Si haces estos tres puntos, las preguntas de seguridad y la recuperación de contraseña deberían funcionar para ese usuario.
