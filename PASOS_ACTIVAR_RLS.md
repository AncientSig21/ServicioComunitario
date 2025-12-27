# 🔐 Pasos para Activar RLS y Verificar

## Paso 1: Activar las Políticas RLS

1. **Ve a Supabase Dashboard:**
   - Abre: https://supabase.com/dashboard/project/vsyunsvlrvbbvgiwcxnt/sql/new

2. **Abre el archivo:**
   - `sql/rls_policies_supabase_auth.sql`

3. **Copia TODO el contenido** del archivo (todo el código SQL)

4. **Pégalo en el SQL Editor** de Supabase

5. **Ejecuta** (haz clic en "Run" o presiona Ctrl+Enter)

⚠️ **IMPORTANTE:** Este script creará todas las políticas RLS. Puede tardar unos segundos.

---

## Paso 2: Avísame cuando termines

Una vez que hayas ejecutado el script en Supabase, **avísame** y ejecutaré el script de verificación nuevamente para confirmar que todo está correcto.

---

## Verificación Rápida (Opcional)

Si quieres verificar manualmente antes de avisarme:

1. Ejecuta en Supabase SQL Editor:
   - Archivo: `sql/verificar_y_aplicar_rls.sql`

2. Deberías ver:
   - ✅ Funciones creadas
   - ✅ Tablas con RLS habilitado
   - ✅ Políticas creadas

---

## Después de Activar RLS

Una vez activadas las políticas:
- ✅ Las consultas sin autenticación serán bloqueadas
- ✅ Cada usuario solo verá sus propios datos
- ✅ Los administradores verán todos los datos
- ⚠️ Tu aplicación necesitará estar autenticada con Supabase Auth

---

**¿Listo?** Ejecuta el script en Supabase y avísame cuando termines. 🚀

