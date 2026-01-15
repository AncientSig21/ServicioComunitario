# 🚀 Cómo Iniciar el Servidor de Desarrollo

## ⚠️ IMPORTANTE: NO uses `npm create vite@latest`

Ese comando **crea un proyecto nuevo**, no inicia el servidor del proyecto actual.

## ✅ Forma Correcta de Iniciar el Servidor

### Opción 1: Comando Simple (Recomendado)
```powershell
npm run dev
```

### Opción 2: Si estás en otro directorio
```powershell
cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario
npm run dev
```

## 📋 Pasos Completos

1. **Abre PowerShell o Terminal**
2. **Navega al directorio del proyecto** (si no estás ahí):
   ```powershell
   cd C:\Users\larac\OneDrive\Desktop\Practicas\ServicioComunitario
   ```
3. **Inicia el servidor**:
   ```powershell
   npm run dev
   ```
4. **Abre tu navegador** en: `http://localhost:3000`

## 🔧 Si el servidor no inicia

### Verificar que las dependencias estén instaladas:
```powershell
npm install
```

### Detener procesos que puedan estar bloqueando el puerto:
```powershell
# Detener procesos Node.js
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Liberar puerto 3000
netstat -ano | Select-String ":3000"
```

## 📝 Comandos Útiles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye el proyecto para producción
- `npm run preview` - Previsualiza la versión de producción
- `npm run lint` - Ejecuta el linter

## 🎯 El servidor estará disponible en:
- **URL Local**: http://localhost:3000
- **Puerto**: 3000 (configurado en `vite.config.ts`)


