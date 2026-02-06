# Guía: Implementar RLS con Supabase Auth

## 📋 Situación Actual

Actualmente tu proyecto usa:
- ✅ Supabase como base de datos
- ✅ Cliente de Supabase configurado
- ✅ Campo `auth_uid` en la tabla `usuarios`
- ❌ Autenticación personalizada (correo/contraseña directo en tabla)
- ❌ No estás usando `auth.uid()` de Supabase Auth

## 🎯 Opciones de Implementación

Tienes **2 opciones**:

### Opción 1: Migrar a Supabase Auth Completo (RECOMENDADO)

Usar Supabase Auth nativo para manejar autenticación y aprovechar `auth.uid()` para RLS.

### Opción 2: RLS con Autenticación Personalizada

Mantener tu sistema actual pero adaptar las políticas para funcionar sin `auth.uid()`.

---

## 🚀 OPCIÓN 1: Migrar a Supabase Auth (Recomendado)

### Paso 1: Verificar que Supabase Auth esté habilitado

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Authentication** → **Providers**
3. Asegúrate de que **Email** esté habilitado

### Paso 2: Actualizar la tabla usuarios

Tu tabla ya tiene `auth_uid`, pero necesitas asegurarte de que sea UUID:

```sql
-- Verificar que auth_uid es UUID
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name = 'auth_uid';

-- Si no es UUID, cambiarlo:
ALTER TABLE usuarios 
ALTER COLUMN auth_uid TYPE UUID USING auth_uid::uuid;
```

### Paso 3: Crear Trigger para vincular usuarios con Auth

Cuando se registre un usuario en Supabase Auth, vincularlo automáticamente con la tabla `usuarios`:

```sql
-- Función para vincular usuario de Auth con tabla usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar si ya existe un usuario con este correo
  UPDATE usuarios
  SET auth_uid = NEW.id
  WHERE correo = NEW.email
  AND auth_uid IS NULL;
  
  -- Si no existe, crear uno nuevo (opcional, según tu flujo)
  -- INSERT INTO usuarios (nombre, correo, auth_uid, rol, contraseña)
  -- VALUES (COALESCE(NEW.raw_user_meta_data->>'nombre', ''), NEW.email, NEW.id, NULL, '');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Paso 4: Modificar el código de registro

Actualizar `src/services/authService.ts` para usar Supabase Auth:

```typescript
// En lugar de insertar directamente en usuarios, usar signUp
export const authService = {
  async registerUser(userData: RegisterData): Promise<{ data: User | null; error: any }> {
    try {
      // 1. Registrar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.correo,
        password: userData.contraseña,
        options: {
          data: {
            nombre: userData.nombre,
            // otros metadatos que necesites
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. El trigger automáticamente vinculará auth_uid con la tabla usuarios
      // O puedes hacerlo manualmente:
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .update({ auth_uid: authData.user.id })
        .eq('correo', userData.correo)
        .select()
        .single();

      if (userError) throw userError;

      return { data: usuario, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },

  async loginUser(loginData: LoginData): Promise<{ data: User | null; error: any }> {
    try {
      // Usar signInWithPassword de Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.correo,
        password: loginData.contraseña
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Credenciales incorrectas');

      // Obtener datos del usuario desde tu tabla usuarios
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol')
        .eq('auth_uid', authData.user.id)
        .single();

      if (userError) throw userError;

      // Verificar si está pendiente de aprobación
      if (!usuario.rol || usuario.rol === null) {
        return { 
          data: null, 
          error: { message: 'Tu cuenta está pendiente de aprobación por un administrador.' } 
        };
      }

      return { data: usuario, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
};
```

### Paso 5: Actualizar para obtener usuario actual

```typescript
// Obtener usuario actual desde Supabase Auth
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_uid', user.id)
    .single();

  return usuario;
};
```

### Paso 6: Ejecutar el script RLS

```bash
# Ejecutar el script de políticas RLS para Supabase Auth
psql -h tu-host -U tu-usuario -d tu-database -f sql/rls_policies_supabase_auth.sql
```

O desde el SQL Editor de Supabase Dashboard, copia y pega el contenido de `sql/rls_policies_supabase_auth.sql`.

### Paso 7: Probar

```typescript
// En tu aplicación
const { data: { session } } = await supabase.auth.getSession();

// Ahora las consultas automáticamente usarán auth.uid() para filtrar
const { data: pagos } = await supabase
  .from('pagos')
  .select('*');
// Solo retornará los pagos del usuario autenticado (gracias a RLS)
```

---

## 🔧 OPCIÓN 2: RLS con Autenticación Personalizada

Si quieres mantener tu sistema actual, necesitas adaptar las políticas para usar un método diferente de identificación.

### Crear función que obtenga user_id desde sesión

```sql
-- Crear tabla de sesiones activas
CREATE TABLE IF NOT EXISTS sesiones_activas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expira_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sesiones_token ON sesiones_activas(token);
CREATE INDEX idx_sesiones_usuario ON sesiones_activas(usuario_id);
```

### Modificar función get_current_user_id()

```sql
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
DECLARE
  session_token TEXT;
BEGIN
  -- Obtener token desde header o variable de sesión
  -- Opción 1: Desde header HTTP (requiere extensión)
  -- session_token := current_setting('request.headers', true)::json->>'x-session-token';
  
  -- Opción 2: Desde variable de sesión (para pruebas)
  session_token := current_setting('app.session_token', true);
  
  IF session_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar usuario por token válido
  RETURN (
    SELECT usuario_id 
    FROM sesiones_activas 
    WHERE token = session_token 
    AND expira_at > NOW()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Actualizar código para establecer token de sesión

En tu servicio de autenticación, después de login exitoso:

```typescript
// Después de login
const token = generateSessionToken(); // Genera un token único
const expira_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

// Guardar en tabla sesiones_activas
await supabase.from('sesiones_activas').insert({
  usuario_id: usuario.id,
  token: token,
  expira_at: expira_at.toISOString()
});

// Almacenar token en localStorage
localStorage.setItem('session_token', token);

// Para consultas, establecer el token como header
const { data } = await supabase
  .from('pagos')
  .select('*')
  .header('x-session-token', token);
```

**Nota:** Esta opción es más compleja y menos segura que usar Supabase Auth directamente.

---

## ✅ RECOMENDACIÓN FINAL

**Te recomiendo la OPCIÓN 1** porque:
1. ✅ Más seguro (Supabase maneja autenticación)
2. ✅ Más simple (RLS funciona automáticamente)
3. ✅ Mejor integración con Supabase
4. ✅ Menos código personalizado
5. ✅ Funcionalidades adicionales (reset password, email verification, etc.)

---

## 📝 Checklist de Migración a Supabase Auth

- [ ] Habilitar Email provider en Supabase Dashboard
- [ ] Verificar que `auth_uid` es tipo UUID
- [ ] Crear trigger `handle_new_user()`
- [ ] Actualizar `registerUser()` para usar `signUp()`
- [ ] Actualizar `loginUser()` para usar `signInWithPassword()`
- [ ] Actualizar `getCurrentUser()` para usar `getUser()`
- [ ] Ejecutar script `rls_policies_supabase_auth.sql`
- [ ] Probar registro de nuevo usuario
- [ ] Probar login de usuario existente
- [ ] Verificar que RLS funciona (usuario solo ve sus datos)
- [ ] Probar con diferentes roles (admin, residente, etc.)

---

## 🆘 Si Necesitas Ayuda

Si encuentras problemas durante la migración, verifica:
1. Que Supabase Auth esté habilitado en tu proyecto
2. Que las políticas RLS se hayan creado correctamente
3. Que `auth_uid` esté vinculado correctamente con `auth.users.id`
4. Que estés usando el cliente de Supabase correctamente en el código

