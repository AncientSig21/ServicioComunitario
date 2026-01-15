# 🔧 Solución al Error: ENOENT - Could not read package.json

## ❌ El Problema

Cuando ejecutas `npm run dev` desde el directorio **incorrecto**, obtienes este error:

```
npm error path C:\Users\larac\OneDrive\Desktop\Practicas\package.json
npm error errno -4058
npm error enoent Could not read package.json
```

## ✅ La Solución

**Debes estar en el directorio del proyecto antes de ejecutar `npm run dev`**

### 📍 Directorio Correcto:
```
C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario
```

### 📍 Directorio Incorrecto (donde estabas):
```
C:\Users\larac\OneDrive\Desktop\Practicas  ❌
```

## 🚀 Pasos Correctos

### Opción 1: Navegar primero, luego ejecutar
```powershell
# 1. Navegar al directorio del proyecto
cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario

# 2. Verificar que estás en el lugar correcto (deberías ver package.json)
dir package.json

# 3. Ahora sí, ejecutar npm run dev
npm run dev
```

### Opción 2: Ejecutar desde cualquier lugar
```powershell
# Ejecutar directamente desde el directorio del proyecto
cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario; npm run dev
```

### Opción 3: Usar el script de PowerShell
```powershell
cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario
.\iniciar-servidor.ps1
```

## 🔍 Cómo Verificar que Estás en el Directorio Correcto

Antes de ejecutar `npm run dev`, verifica que veas estos archivos:
- ✅ `package.json`
- ✅ `vite.config.ts`
- ✅ `index.html`
- ✅ Carpeta `src/`
- ✅ Carpeta `node_modules/`

Si NO ves estos archivos, estás en el directorio incorrecto.

## 💡 Consejo

**Siempre verifica tu ubicación antes de ejecutar comandos npm:**

```powershell
# Ver dónde estás
Get-Location

# O simplemente
pwd

# Ver archivos del directorio actual
dir
```

## ✅ Comando Completo (Copia y Pega)

```powershell
cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario && npm run dev
```


