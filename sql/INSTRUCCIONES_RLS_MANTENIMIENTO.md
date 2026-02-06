# 🔒 Instrucciones para Aplicar RLS en Sistema de Mantenimiento

Este documento explica cómo aplicar las políticas RLS (Row Level Security) para garantizar la seguridad del sistema de mantenimiento.

## 📋 Requisitos Previos

1. **Base de datos configurada**: Las tablas `solicitudes_mantenimiento` y `avances_mantenimiento` deben existir
2. **Campo auth_uid**: La tabla `usuarios` debe tener un campo `auth_uid` que coincida con `auth.uid()` de Supabase
3. **Acceso a Supabase**: Debes tener permisos de administrador en Supabase

## 🚀 Pasos para Aplicar RLS

### Opción 1: Script Simplificado (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **SQL Editor**

2. **Copia el script completo**
   - Abre el archivo `sql/aplicar_rls_mantenimiento.sql`
   - Copia TODO el contenido

3. **Ejecuta el script**
   - Pega el contenido en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter`
   - Verifica que no haya errores

4. **Verifica las políticas**
   - El script mostrará las políticas creadas al final
   - Deberías ver 4 políticas para `solicitudes_mantenimiento`
   - Si existe `avances_mantenimiento`, verás 4 políticas adicionales

### Opción 2: Script Completo con Documentación

Si prefieres ver más detalles y comentarios:
- Usa el archivo `sql/rls_mantenimiento_completo.sql`
- Sigue los mismos pasos que la Opción 1

## 🔐 Políticas Creadas

### Para `solicitudes_mantenimiento`:

1. **SELECT** - "Usuarios ven sus solicitudes de mantenimiento"
   - Usuarios ven sus propias solicitudes
   - Responsables ven solicitudes asignadas
   - Conserjes ven solicitudes de su condominio
   - Administradores ven todas

2. **INSERT** - "Usuarios pueden crear solicitudes"
   - Solo pueden crear solicitudes para sí mismos
   - El estado inicial debe ser 'pendiente'

3. **UPDATE** - "Usuarios y conserjes pueden actualizar solicitudes"
   - Usuarios solo pueden actualizar sus solicitudes pendientes
   - Responsables pueden actualizar solicitudes asignadas
   - Conserjes pueden actualizar solicitudes de su condominio
   - Administradores pueden actualizar cualquier solicitud

4. **DELETE** - "Solo admins pueden eliminar solicitudes"
   - Solo administradores pueden eliminar

### Para `avances_mantenimiento` (si existe):

1. **SELECT** - "Usuarios ven avances de sus solicitudes"
2. **INSERT** - "Responsables y admins pueden crear avances"
3. **UPDATE** - "Responsables y admins pueden actualizar avances"
4. **DELETE** - "Solo admins pueden eliminar avances"

## ✅ Verificación

Después de ejecutar el script, verifica que las políticas estén activas usando uno de estos scripts:

### Opción 1: Script de Verificación Completo (Recomendado)

1. **Abre el archivo** `sql/verificar_rls_mantenimiento.sql`
2. **Copia y pega** el contenido en Supabase SQL Editor
3. **Ejecuta el script**
4. **Revisa los mensajes** en la pestaña "Messages" o "Notices"

Este script verifica:
- ✅ Funciones auxiliares (get_current_user_id, is_admin, is_conserje)
- ✅ RLS habilitado en las tablas
- ✅ Políticas creadas (todas las 4 esperadas)
- ✅ Estructura de tablas (columnas requeridas)
- ✅ Campo auth_uid en usuarios
- ✅ Prueba de funciones (si hay usuario autenticado)
- ✅ Resumen final con porcentaje de verificación

### Opción 2: Script de Verificación Simple

1. **Abre el archivo** `sql/verificar_rls_mantenimiento_simple.sql`
2. **Copia y pega** el contenido en Supabase SQL Editor
3. **Ejecuta el script**
4. **Revisa los resultados** en formato de tabla

Este script muestra resultados en formato tabla, más fácil de leer.

### Verificación Manual Rápida

Si prefieres verificar manualmente:

```sql
-- Ver todas las políticas de solicitudes_mantenimiento
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'solicitudes_mantenimiento';
```

## 🛠️ Solución de Problemas

### Error: "function get_current_user_id() does not exist"
- **Solución**: El script crea esta función automáticamente. Si persiste, ejecuta solo la sección de funciones auxiliares.

### Error: "relation solicitudes_mantenimiento does not exist"
- **Solución**: Asegúrate de que la tabla existe. Verifica con:
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_name = 'solicitudes_mantenimiento';
  ```

### Error: "column auth_uid does not exist"
- **Solución**: La tabla `usuarios` necesita un campo `auth_uid`. Agrégalo con:
  ```sql
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_uid UUID;
  ```

### Las políticas no funcionan
- **Verifica RLS está habilitado**:
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename = 'solicitudes_mantenimiento';
  ```
- **Verifica que get_current_user_id() retorna un valor**:
  ```sql
  SELECT get_current_user_id();
  ```

## 📝 Notas Importantes

1. **Seguridad**: Las políticas RLS se aplican a nivel de base de datos, proporcionando seguridad adicional incluso si hay problemas en la aplicación.

2. **Performance**: Las políticas pueden afectar el rendimiento de las consultas. Asegúrate de tener índices en:
   - `usuario_solicitante_id`
   - `responsable_id`
   - `condominio_id`
   - `estado`

3. **Testing**: Después de aplicar las políticas, prueba:
   - Crear una solicitud como usuario normal
   - Ver solo tus propias solicitudes
   - Intentar ver solicitudes de otros (debe fallar)
   - Aprobar/rechazar como administrador

## 🔄 Actualizar Políticas

Si necesitas modificar las políticas:

1. Elimina la política existente:
   ```sql
   DROP POLICY "nombre_politica" ON solicitudes_mantenimiento;
   ```

2. Crea la nueva política con el mismo nombre o uno diferente

3. O simplemente ejecuta el script completo de nuevo (elimina y recrea todas las políticas)

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de Supabase
2. Verifica que todas las funciones auxiliares existen
3. Asegúrate de que los roles de usuario están correctamente configurados

