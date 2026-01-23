# Guía de Verificación de Políticas RLS

## 📋 Scripts Disponibles

Tienes **3 scripts** para verificar las políticas RLS:

### 1. `verificar_rls_policies.sql` - Verificación Estructural

**Qué hace:**
- ✅ Verifica que las funciones auxiliares existen
- ✅ Verifica que RLS está habilitado en todas las tablas
- ✅ Cuenta las políticas creadas
- ✅ Verifica la estructura de la tabla usuarios
- ✅ Prueba las funciones auxiliares

**Cómo ejecutar:**
```bash
# Desde psql
psql -h tu-host -U tu-usuario -d tu-database -f sql/verificar_rls_policies.sql

# O desde Supabase SQL Editor
# Copia y pega el contenido del archivo
```

**Cuándo usar:** Para verificar que las políticas se crearon correctamente.

---

### 2. `test_rls_con_usuarios.sql` - Verificación de Datos

**Qué hace:**
- ✅ Verifica integridad de datos
- ✅ Verifica relaciones entre tablas
- ✅ Muestra ejemplos de cómo probar desde la aplicación

**Cómo ejecutar:**
```bash
psql -h tu-host -U tu-usuario -d tu-database -f sql/test_rls_con_usuarios.sql
```

**Cuándo usar:** Para verificar que los datos están bien relacionados.

---

### 3. `scripts/test-rls.js` - Pruebas Funcionales

**Qué hace:**
- ✅ Prueba las políticas desde Node.js
- ✅ Simula autenticación con Supabase Auth
- ✅ Verifica acceso a datos como usuario autenticado
- ✅ Compara acceso de admin vs usuario normal

**Cómo ejecutar:**
```bash
# Primero instala dependencias si no las tienes
npm install @supabase/supabase-js dotenv

# Luego ejecuta
node scripts/test-rls.js
```

**Cuándo usar:** Para probar el comportamiento real de las políticas.

---

## 🎯 Proceso Recomendado de Verificación

### Paso 1: Verificación Estructural (SQL)

```bash
# Ejecuta el script de verificación
psql -h tu-host -U postgres -d postgres -f sql/verificar_rls_policies.sql
```

**Resultado esperado:**
- ✅ 14 tablas con RLS habilitado
- ✅ 40+ políticas creadas
- ✅ 3 funciones auxiliares funcionando

### Paso 2: Verificación de Datos (SQL)

```bash
psql -h tu-host -U postgres -d postgres -f sql/test_rls_con_usuarios.sql
```

**Resultado esperado:**
- ✅ Usuarios con relaciones válidas
- ✅ Datos consistentes

### Paso 3: Pruebas Funcionales (Node.js)

1. Edita `scripts/test-rls.js` y agrega credenciales de prueba:
```javascript
const usuariosPrueba = [
  { email: 'admin@ejemplo.com', password: 'admin123', nombre: 'Administrador' },
  { email: 'usuario@ejemplo.com', password: 'usuario123', nombre: 'Usuario Normal' },
];
```

2. Ejecuta:
```bash
node scripts/test-rls.js
```

**Resultado esperado:**
- ✅ Admin ve todos los datos
- ✅ Usuario normal solo ve sus propios datos

### Paso 4: Pruebas desde la Aplicación (Recomendado)

La mejor forma de verificar es probar desde tu aplicación frontend:

```typescript
// 1. Autenticar como usuario normal
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'usuario@ejemplo.com',
  password: 'password123'
});

// 2. Intentar leer pagos
const { data: pagos } = await supabase
  .from('pagos')
  .select('*');

// Debería retornar SOLO los pagos del usuario autenticado
console.log('Pagos del usuario:', pagos);

// 3. Autenticar como admin
await supabase.auth.signInWithPassword({
  email: 'admin@ejemplo.com',
  password: 'admin123'
});

// 4. Leer todos los pagos (admin debería ver todos)
const { data: todosPagos } = await supabase
  .from('pagos')
  .select('*');

console.log('Todos los pagos (admin):', todosPagos);
```

---

## ✅ Checklist de Verificación

- [ ] Funciones auxiliares creadas (`get_current_user_id`, `is_admin`, `same_condominio`)
- [ ] RLS habilitado en las 14 tablas principales
- [ ] Políticas creadas para todas las tablas
- [ ] Campo `auth_uid` es tipo UUID en tabla usuarios
- [ ] Usuarios tienen `auth_uid` vinculado con `auth.users.id`
- [ ] Usuario admin puede ver todos los datos
- [ ] Usuario normal solo ve sus propios datos
- [ ] Usuario sin autenticación no puede ver datos privados
- [ ] Las políticas funcionan para INSERT, UPDATE, DELETE

---

## 🚨 Problemas Comunes

### Error: "permission denied for table usuarios"

**Causa:** RLS está funcionando, pero no estás autenticado.

**Solución:** Asegúrate de autenticarte antes de hacer consultas:
```typescript
await supabase.auth.signInWithPassword({ email, password });
```

### Error: "function get_current_user_id() does not exist"

**Causa:** Las funciones no se crearon.

**Solución:** Ejecuta el script `rls_policies_supabase_auth.sql` completo.

### Usuario ve todos los datos cuando debería ver solo los suyos

**Causa:** `auth_uid` no está vinculado o `get_current_user_id()` no funciona.

**Solución:** 
1. Verifica que `auth_uid` en usuarios coincide con `auth.users.id`
2. Verifica que estás autenticado con Supabase Auth

### Admin no puede ver todos los datos

**Causa:** El rol no es 'admin' o la función `is_admin()` no funciona.

**Solución:**
```sql
-- Verificar rol del usuario
SELECT id, nombre, rol FROM usuarios WHERE correo = 'admin@ejemplo.com';

-- Si el rol no es 'admin', actualizarlo
UPDATE usuarios SET rol = 'admin' WHERE correo = 'admin@ejemplo.com';
```

---

## 📚 Recursos Adicionales

- [Documentación RLS de Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentación RLS de PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- `sql/INSTRUCCIONES_RLS.md` - Instrucciones detalladas
- `sql/GUIA_IMPLEMENTACION_SUPABASE_AUTH.md` - Guía de implementación

