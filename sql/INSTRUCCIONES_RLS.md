# Instrucciones para Implementar Políticas RLS

## 📋 Resumen

Este documento explica cómo implementar las políticas RLS (Row Level Security) para el sistema de gestión condominial.

## 🔍 Dos Versiones Disponibles

### 1. `rls_policies.sql` - Versión Genérica
- Requiere adaptar la función `get_current_user_id()` según tu método de autenticación
- Úsala si NO estás usando Supabase Auth directamente
- Necesitas modificar cómo obtienes el ID del usuario actual

### 2. `rls_policies_supabase_auth.sql` - Versión Supabase Auth
- Usa `auth.uid()` directamente
- Requiere que la tabla `usuarios` tenga un campo `auth_uid`
- Úsala si estás usando Supabase Auth completo

## ⚠️ Requisitos Previos

Antes de ejecutar las políticas, asegúrate de:

1. ✅ Todas las tablas estén creadas
2. ✅ Los índices estén creados
3. ✅ Las funciones de actualización automática (`updated_at`) estén funcionando
4. ✅ Tengas una forma de identificar usuarios autenticados

## 🚀 Pasos para Implementar

### Paso 1: Decidir qué versión usar

**Si usas Supabase Auth:**
```bash
# Ejecuta este archivo
psql -h tu-host -U tu-usuario -d tu-database -f sql/rls_policies_supabase_auth.sql
```

**Si NO usas Supabase Auth o tienes autenticación personalizada:**
1. Abre `sql/rls_policies.sql`
2. Modifica la función `get_current_user_id()` según tu método de autenticación
3. Ejecuta el script modificado

### Paso 2: Adaptar `get_current_user_id()` (solo si usas versión genérica)

#### Opción A: Si almacenas user_id en una variable de sesión
```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::integer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Opción B: Si tienes una tabla de sesiones
```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT user_id FROM sesiones 
    WHERE session_token = current_setting('app.session_token', true)
    AND expira_at > NOW()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Opción C: Si usas JWT con claims personalizados
```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'user_id')::integer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Paso 3: Ejecutar el script

```bash
# Desde la línea de comandos (PostgreSQL)
psql -h localhost -U postgres -d condominio_db -f sql/rls_policies.sql

# O desde psql interactivo
\i sql/rls_policies.sql
```

### Paso 4: Verificar que RLS esté habilitado

```sql
-- Verificar que RLS está habilitado en una tabla
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'usuarios';

-- Ver políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Paso 5: Probar las políticas

#### Probar con un usuario específico (si usas variables de sesión)
```sql
-- Establecer usuario actual
SET LOCAL app.current_user_id = '123';

-- Intentar leer datos
SELECT * FROM usuarios WHERE id = 123; -- Debe funcionar
SELECT * FROM usuarios WHERE id = 456; -- Debe fallar (si no es admin)

-- Limpiar
RESET app.current_user_id;
```

#### Probar con Supabase Auth
```javascript
// En tu aplicación
const { data, error } = await supabase
  .from('usuarios')
  .select('*');

// Solo debería retornar tu propio perfil (o todos si eres admin)
```

## 🔧 Solución de Problemas

### Error: "function get_current_user_id() does not exist"
- Asegúrate de ejecutar el script completo, incluyendo las funciones auxiliares
- Verifica que las funciones se crearon: `\df get_current_user_id`

### Error: "permission denied for table usuarios"
- Las políticas RLS están funcionando (eso es bueno)
- Verifica que estás autenticado y que `get_current_user_id()` retorna un valor válido

### No puedo ver ningún dato
1. Verifica que estás autenticado
2. Verifica que `get_current_user_id()` retorna un ID válido
3. Verifica que existe un usuario con ese ID en la tabla `usuarios`
4. Verifica que el usuario tiene un `rol` asignado (no es NULL)

### Puedo ver todos los datos (RLS no funciona)
1. Verifica que RLS está habilitado: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'usuarios';`
2. Verifica que las políticas se crearon: `SELECT * FROM pg_policies WHERE tablename = 'usuarios';`
3. Asegúrate de estar usando una conexión que respete RLS (no uses roles superuser)

## 📝 Notas Importantes

### Roles y Permisos

Las políticas asumen estos roles:
- `admin`: Acceso total a todo
- `propietario`: Acceso a sus propios datos y recursos del condominio
- `residente`: Acceso a sus propios datos y recursos del condominio
- `conserje`: Acceso a solicitudes de mantenimiento de su condominio
- `invitado`: Acceso limitado (solo lectura de recursos públicos)

### Deshabilitar RLS Temporalmente

Si necesitas deshabilitar RLS para debugging:

```sql
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- ... hacer pruebas ...

-- Volver a habilitar
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

### Modificar Políticas Existentes

Para modificar una política, primero elimínala:

```sql
DROP POLICY IF EXISTS "nombre_politica" ON nombre_tabla;
```

Luego crea la nueva política.

### Agregar Nuevas Políticas

Simplemente agrega las políticas nuevas al final del script o ejecútalas individualmente:

```sql
CREATE POLICY "Mi nueva política"
ON nombre_tabla FOR SELECT
USING (condicion);
```

## 🎯 Próximos Pasos

1. ✅ Ejecutar el script apropiado
2. ✅ Verificar que las políticas se crearon
3. ✅ Probar con diferentes roles de usuario
4. ✅ Ajustar políticas según necesidades específicas
5. ✅ Documentar cualquier cambio personalizado

## 📚 Referencias

- [Documentación de RLS en PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Documentación de RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)

