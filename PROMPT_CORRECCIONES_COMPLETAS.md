# 📋 Prompt Completo de Correcciones Solicitadas

## Contexto del Proyecto
Proyecto React + TypeScript + Vite + Supabase para sistema de gestión condominial. La base de datos PostgreSQL tiene una columna `Estado` (con E mayúscula) en la tabla `usuarios`, pero el código TypeScript estaba usando `estado` (minúscula), causando errores de esquema.

---

## 🔧 CORRECCIÓN 1: Cambiar `estado` a `Estado` en toda la aplicación

### Problema:
El error "Could not find the 'estado' column of 'usuarios' in the schema cache" ocurría porque la base de datos tiene la columna como `Estado` (con E mayúscula) pero el código TypeScript usaba `estado` (minúscula).

### Solución requerida:
Cambiar TODAS las referencias de `estado` a `Estado` (con E mayúscula) en los siguientes archivos:

1. **`src/supabase/supabase.ts`**: 
   - En la definición de la tabla `usuarios`, cambiar `estado: string | null` a `Estado: string | null` en las interfaces `Row`, `Insert`, y `Update`.

2. **`src/hooks/useAuth.ts`**:
   - Cambiar `user?.estado` a `user?.Estado` en la función `isUserMoroso()`
   - Cambiar `'estado'` a `'Estado'` en la consulta `select()` de `refreshUserStatus()`
   - Agregar `Estado: data.Estado || user.Estado` al objeto `updatedUser`

3. **`src/pages/RegisterPage.tsx`**:
   - Cambiar `estado: 'Activo'` a `Estado: 'Activo'` en el insert de usuarios

4. **`src/services/userMaintenanceService.ts`**:
   - Cambiar `'estado'` a `'Estado'` en el `select()` de usuarios
   - Cambiar `usuario.estado` a `usuario.Estado`
   - Cambiar `estado: estadoCorrecto` a `Estado: estadoCorrecto` en el update

5. **`src/services/bookService.ts`**:
   - Cambiar `estado: 'Activo'` a `Estado: 'Activo'` en todas las inserciones/actualizaciones de usuarios
   - Solo cambiar las referencias a la tabla `usuarios`, NO las de otras tablas (pagos, reservas, etc.)

6. **`src/services/authService.ts`**:
   - Cambiar la interfaz `User` de `estado?: string | null` a `Estado?: string | null`
   - Cambiar todas las referencias a `estado` relacionadas con usuarios a `Estado`
   - Cambiar `usuario.estado` a `usuario.Estado` en las consultas

7. **Componentes y páginas**:
   - `src/pages/ProfilePage.tsx`: Cambiar `user.estado` a `user.Estado`
   - `src/components/shared/Navbar.tsx`: Cambiar `user.estado` a `user.Estado`
   - `src/pages/AdminStatsPage.tsx`: Cambiar `u.estado` a `u.Estado`
   - `src/pages/AdminReportsPage.tsx`: Cambiar `usuario.estado` a `usuario.Estado`

**IMPORTANTE**: Solo cambiar las referencias a la columna `Estado` de la tabla `usuarios`. NO cambiar referencias a `estado` de otras tablas como `pagos`, `reservas`, `solicitudes_mantenimiento`, `notificaciones`, etc.

---

## 🔧 CORRECCIÓN 2: Eliminar restricción de aprobación antes de iniciar sesión

### Problema:
Los usuarios no podían iniciar sesión hasta que un administrador aprobara su registro (cuando `rol` era `null`).

### Solución requerida:

1. **`src/services/authService.ts`**:
   - **Eliminar** las siguientes validaciones que bloquean el login:
     ```typescript
     // ELIMINAR ESTO:
     if (!usuario.rol || usuario.rol === null) {
       return { data: null, error: { message: 'Tu cuenta está pendiente de aprobación...' } };
     }
     ```
   - Reemplazar con comentario: `// Permitir login incluso si el usuario está pendiente de aprobación (rol null)`
   - Esto debe hacerse en AMBAS funciones `loginUser` (modo simulado y modo Supabase)

2. **`src/pages/RegisterPage.tsx`**:
   - Después de registrar el usuario, **iniciar sesión automáticamente**:
     - Guardar el usuario en `localStorage` con `localStorage.setItem('user', JSON.stringify(userData))`
     - Redirigir a la página principal con `window.location.href = '/'`
   - **Eliminar** el mensaje que dice "Un administrador revisará tu solicitud y te notificará cuando sea aprobada" antes de poder iniciar sesión
   - **Cambiar** el mensaje de éxito a: "¡Registro exitoso! Has sido registrado en el sistema. Un administrador revisará tu solicitud y te notificará cuando sea aprobada o rechazada."

---

## 🔧 CORRECCIÓN 3: Mantener notificación al administrador

### Requisito:
La funcionalidad de notificar a los administradores sobre nuevos registros debe mantenerse intacta.

### Verificación:
- La función `notificarRegistroUsuario()` debe seguir siendo llamada después del registro
- Los administradores deben seguir recibiendo notificaciones de tipo `'solicitud_registro'`

---

## 🔧 CORRECCIÓN 4: Crear componente modal para aprobación/rechazo

### Requisito:
Crear un componente que muestre una ventana modal cuando el administrador apruebe o rechace el registro de un usuario.

### Solución requerida:

1. **Crear `src/components/shared/RegistrationStatusModal.tsx`**:
   ```typescript
   - Componente que recibe `userId` y `onClose`
   - Busca notificaciones de tipo 'aprobacion_registro' o 'rechazo_registro' no leídas
   - Muestra modal con:
     - Icono verde (check) para aprobación
     - Icono rojo (X) para rechazo
     - Mensaje de la notificación
     - Botón "Entendido" para cerrar
   - Marca la notificación como leída al mostrarla
   ```

2. **Modificar `src/layouts/RootLayout.tsx`**:
   - Importar `RegistrationStatusModal`
   - Agregar estado `showStatusModal` y `hasCheckedStatus`
   - En un `useEffect`, verificar si el usuario tiene notificaciones de aprobación/rechazo cuando inicia sesión
   - Mostrar el modal si hay notificaciones no leídas

---

## 🔧 CORRECCIÓN 5: Modificar rechazo de usuario para no eliminar

### Problema:
La función `rechazarUsuario` eliminaba completamente el usuario de la base de datos, impidiendo que viera la notificación de rechazo.

### Solución requerida:

**`src/services/bookService.ts`** - Función `rechazarUsuario`:
- **NO eliminar** el usuario con `.delete()`
- En su lugar, **actualizar** el campo `Estado` a `'Rechazado'`:
  ```typescript
  await supabase
    .from('usuarios')
    .update({
      Estado: 'Rechazado',
      updated_at: getCurrentLocalISOString()
    })
    .eq('id', usuario_id);
  ```
- Mantener la creación de la notificación de rechazo con `usuario_id` válido (no `null`)
- El usuario podrá iniciar sesión y ver la notificación de rechazo

---

## 📝 Resumen de Archivos a Modificar

1. `src/supabase/supabase.ts` - Cambiar `estado` a `Estado` en tabla usuarios
2. `src/hooks/useAuth.ts` - Cambiar referencias a `Estado` y eliminar bloqueo de login
3. `src/pages/RegisterPage.tsx` - Iniciar sesión automáticamente después del registro
4. `src/services/userMaintenanceService.ts` - Cambiar `estado` a `Estado`
5. `src/services/bookService.ts` - Cambiar `estado` a `Estado` en usuarios, modificar `rechazarUsuario`
6. `src/services/authService.ts` - Cambiar interfaz `User` y eliminar bloqueos de login
7. `src/pages/ProfilePage.tsx` - Cambiar `user.estado` a `user.Estado`
8. `src/components/shared/Navbar.tsx` - Cambiar `user.estado` a `user.Estado`
9. `src/pages/AdminStatsPage.tsx` - Cambiar `u.estado` a `u.Estado`
10. `src/pages/AdminReportsPage.tsx` - Cambiar `usuario.estado` a `usuario.Estado`
11. `src/components/shared/RegistrationStatusModal.tsx` - **CREAR NUEVO ARCHIVO**
12. `src/layouts/RootLayout.tsx` - Agregar modal de estado de registro

---

## ✅ Resultado Esperado

Después de aplicar todas las correcciones:

1. ✅ Los usuarios pueden registrarse e iniciar sesión inmediatamente
2. ✅ No hay errores de esquema relacionados con `estado` vs `Estado`
3. ✅ Los administradores reciben notificaciones de nuevos registros
4. ✅ Los usuarios ven una ventana modal cuando son aprobados o rechazados
5. ✅ Los usuarios rechazados no son eliminados, solo marcados como "Rechazado"
6. ✅ El flujo completo funciona sin errores

---

## 🚀 Comando para Iniciar Servidor

```powershell
cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

---

## 📌 Notas Importantes

- **NO usar** `npm create vite@latest` - esto crea un proyecto nuevo
- **Solo cambiar** referencias a `Estado` de la tabla `usuarios`, no de otras tablas
- **Mantener** todas las funcionalidades existentes de notificaciones
- **Asegurar** que el archivo `.env` tenga las variables `VITE_SUPABASE_API_KEY` y `VITE_PROJECT_URL_SUPABASE`


