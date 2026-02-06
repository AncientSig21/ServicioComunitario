# 🔐 Explicación: RLS vs Políticas

## ❓ ¿Qué pasa si solo activo RLS sin políticas?

### Respuesta Corta: **NO funciona, bloquea TODO** ❌

---

## 📚 Diferencia entre RLS y Políticas

### 1. **RLS (Row Level Security) - El Interruptor**

```sql
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

**Qué hace:**
- ✅ **Activa** el sistema de seguridad a nivel de fila
- ✅ **Activa** el filtrado automático de datos
- ❌ **NO define** quién puede hacer qué
- ❌ **NO crea** las reglas de acceso

**Resultado si solo haces esto:**
- 🔒 **TODAS las consultas serán bloqueadas**
- ❌ No podrás leer, insertar, actualizar ni eliminar datos
- ❌ Tu aplicación dejará de funcionar

---

### 2. **Políticas (Policies) - Las Reglas**

```sql
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON usuarios FOR SELECT
USING (id = get_current_user_id());
```

**Qué hace:**
- ✅ **Define** QUÉ puede hacer cada usuario
- ✅ **Crea** las reglas de acceso (SELECT, INSERT, UPDATE, DELETE)
- ✅ **Especifica** condiciones (ej: "solo sus propios datos")

**Ejemplos de políticas:**
- "Los usuarios pueden ver solo sus propios pagos"
- "Los administradores pueden ver todo"
- "Los usuarios pueden crear sus propias reservas"

---

## 🔄 Proceso Completo

### Paso 1: Habilitar RLS
```sql
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```
➡️ **Activa el sistema** (pero bloquea todo hasta crear políticas)

### Paso 2: Crear Políticas
```sql
CREATE POLICY "..." ON usuarios FOR SELECT USING (...);
CREATE POLICY "..." ON usuarios FOR INSERT WITH CHECK (...);
-- etc.
```
➡️ **Define las reglas** (quién puede hacer qué)

### Resultado Final
✅ RLS activo + Políticas creadas = Sistema de seguridad funcionando

---

## 🎯 Tu Script `rls_policies_supabase_auth.sql`

Este script hace **AMBAS cosas**:

1. ✅ Habilita RLS en todas las tablas
   ```sql
   ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
   ```

2. ✅ Crea las políticas para cada tabla
   ```sql
   CREATE POLICY "..." ON usuarios FOR SELECT ...
   CREATE POLICY "..." ON usuarios FOR INSERT ...
   ```

**Por eso necesitas ejecutar el script completo**, no solo habilitar RLS.

---

## 📊 Comparación Visual

| Acción | RLS Habilitado | Políticas Creadas | Resultado |
|--------|---------------|-------------------|-----------|
| Ninguna | ❌ | ❌ | ✅ Todo funciona (sin seguridad) |
| Solo RLS | ✅ | ❌ | 🔒 TODO bloqueado |
| Solo Políticas | ❌ | ✅ | ⚠️ Políticas ignoradas (RLS desactivado) |
| Ambos | ✅ | ✅ | ✅ Seguridad funcionando |

---

## ✅ Solución Correcta

**Ejecuta el script completo:**
- `sql/rls_policies_supabase_auth.sql`

Este script:
1. Crea las funciones auxiliares
2. Habilita RLS en todas las tablas
3. Crea todas las políticas necesarias

**Todo en un solo script, todo junto, funcionando correctamente.**

---

## 🆘 Si Ya Solo Habilitaste RLS

Si ya ejecutaste solo `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`:

1. **Opción 1 (Recomendada):** Ejecuta `sql/rls_policies_supabase_auth.sql` completo
   - Sobrescribirá cualquier política existente
   - Creará todas las políticas necesarias

2. **Opción 2:** Deshabilita RLS temporalmente
   ```sql
   ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
   ```
   Luego ejecuta el script completo cuando estés listo

---

## 💡 Resumen

- ❌ **Solo RLS** = Bloquea todo
- ✅ **RLS + Políticas** = Seguridad funcionando
- 🎯 **Tu script completo** hace ambas cosas automáticamente

**Conclusión:** Ejecuta `sql/rls_policies_supabase_auth.sql` completo. No solo habilites RLS.

