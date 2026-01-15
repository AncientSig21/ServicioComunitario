# Script para iniciar el servidor de desarrollo
# Uso: .\iniciar-servidor.ps1

Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio del proyecto" -ForegroundColor Yellow
    exit 1
}

# Detener procesos Node.js existentes
Write-Host "🛑 Deteniendo procesos Node.js existentes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Verificar que las dependencias estén instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Iniciar el servidor
Write-Host "✅ Iniciando servidor en http://localhost:3000" -ForegroundColor Green
Write-Host ""
npm run dev


