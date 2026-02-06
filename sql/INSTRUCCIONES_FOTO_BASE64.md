# Agregar columna foto_base64 para fotos de avances de mantenimiento

Si al agregar una foto en **Avances de mantenimiento** aparece el error:

> Could not find the 'foto_base64' column of 'avances_mantenimiento' in the schema cache

hay que crear la columna en la base de datos.

## Pasos en Supabase

1. Entra a tu proyecto en [Supabase](https://supabase.com/dashboard).
2. En el menú izquierdo, abre **SQL Editor**.
3. Crea una nueva query y pega este SQL:

```sql
ALTER TABLE avances_mantenimiento
ADD COLUMN IF NOT EXISTS foto_base64 TEXT;

COMMENT ON COLUMN avances_mantenimiento.foto_base64 IS 'Imagen del avance en base64 (data URL). Se usa para acceso directo sin bucket.';
```

4. Pulsa **Run** (o Ctrl+Enter).
5. Deberías ver algo como "Success. No rows returned".

Después de eso, vuelve a la app y prueba a agregar una foto de nuevo. Las imágenes se guardarán en la base de datos y se verán sin depender del bucket.
