# Generar Tipos de TypeScript desde Supabase

Este documento explica cómo generar automáticamente los tipos de TypeScript desde tu base de datos de Supabase.

## 🚀 Métodos Disponibles

### Método 1: Usando npx con Access Token (Recomendado)

Este es el método más simple. Solo necesitas tu access token de Supabase:

**PowerShell:**
```powershell
$env:SUPABASE_ACCESS_TOKEN="tu_token_aqui"; npx supabase gen types typescript --project-id vsyunsvlrvbbvgiwcxnt > src/supabase/supabase.ts
```

**Bash/Linux/Mac:**
```bash
SUPABASE_ACCESS_TOKEN="tu_token_aqui" npx supabase gen types typescript --project-id vsyunsvlrvbbvgiwcxnt > src/supabase/supabase.ts
```

**Obtén tu access token desde:** https://supabase.com/dashboard/account/tokens

### Método 2: Usando Supabase CLI (Requiere instalación)

1. **Instalar Supabase CLI globalmente:**
   ```bash
   npm install -g supabase
   ```

2. **Generar tipos:**
   ```bash
   npm run types:generate
   ```

   O directamente:
   ```bash
   supabase gen types typescript --project-id vsyunsvlrvbbvgiwcxnt > src/supabase/supabase.ts
   ```

### Método 3: Desde el Dashboard de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/vsyunsvlrvbbvgiwcxnt
2. Navega a **Settings** > **API**
3. En la sección **Generate TypeScript types**, copia el código generado
4. Pega el contenido en `src/supabase/supabase.ts`

### Método 4: Para desarrollo local (si usas Supabase local)

Si estás usando Supabase localmente:

```bash
npm run types:generate:local
```

O:

```bash
supabase gen types typescript --local > src/supabase/supabase.ts
```

## 📝 Notas Importantes

- **Project ID**: `vsyunsvlrvbbvgiwcxnt` (ya configurado en los scripts)
- **Archivo de salida**: `src/supabase/supabase.ts`
- **Cuándo regenerar**: Cada vez que cambies el esquema de la base de datos
- **Access Token**: Necesario para usar el CLI. Obtén uno desde: https://supabase.com/dashboard/account/tokens

## 🔄 Flujo de Trabajo Recomendado

1. Haz cambios en tu base de datos (tablas, columnas, etc.)
2. Ejecuta `npm run types:generate:npx`
3. Los tipos se actualizarán automáticamente en `src/supabase/supabase.ts`
4. TypeScript te mostrará errores si hay incompatibilidades

## ⚠️ Solución de Problemas

### Error: "supabase: command not found"

**Solución**: Usa el método con npx:
```bash
npm run types:generate:npx
```

### Error: "Project not found"

**Solución**: Verifica que el Project ID sea correcto. Puedes encontrarlo en:
- Dashboard de Supabase > Settings > General > Reference ID

### Error: "Permission denied"

**Solución**: Asegúrate de tener acceso al proyecto y que la API key sea válida.

## 📚 Referencias

- [Documentación de Supabase CLI](https://supabase.com/docs/reference/cli)
- [Generación de Tipos](https://supabase.com/docs/reference/cli/supabase-gen-types-typescript)

