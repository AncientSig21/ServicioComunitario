# 🎮 Instrucciones para Presentación (Modo Demo/Offline)

## Activación Automática

El sistema **detecta automáticamente** cuando no hay conexión a internet y activa el modo demo. Si la aplicación detecta que no puede conectarse al servidor, cambiará automáticamente a usar datos locales.

## Activación Manual

### Opción 1: Desde la Consola del Navegador (F12)
```javascript
// Activar modo demo
demoMode.enable()

// Desactivar modo demo
demoMode.disable()

// Reiniciar datos de demostración
demoMode.resetData()

// Ver datos actuales
demoMode.getData()
```

### Opción 2: En la URL
Simplemente desconecta el WiFi/Ethernet antes de cargar la página.

---

## 👥 Credenciales de Prueba

| Tipo | Email | Contraseña | Descripción |
|------|-------|------------|-------------|
| **Admin** | admin@condominio.com | admin123 | Acceso completo al panel de administración |
| **Usuario** | maria@condominio.com | usuario123 | Residente con pagos al día |
| **Usuario** | carlos@condominio.com | usuario123 | Residente con pagos al día |
| **Moroso** | ana@condominio.com | usuario123 | Usuario con pagos pendientes |
| **Usuario** | pedro@condominio.com | usuario123 | Residente activo |

---

## 📋 Datos de Demostración Incluidos

### Pagos
- ✅ Pagos validados (con recibos generados)
- ⏳ Pagos pendientes de validación
- 💰 Gastos fijos distribuidos
- 📊 Historial de pagos por usuario

### Anuncios y Eventos
- 📢 Reunión de condominio
- 🔧 Mantenimiento de ascensores
- 🎉 Celebración de Carnaval
- 🧘 Clases de yoga
- ℹ️ Información general

### Espacios
- Salón de Eventos
- Área de BBQ
- Piscina
- Gimnasio

### Solicitudes de Mantenimiento
- Alta prioridad (Filtración)
- Completadas (Luz del pasillo)
- En proceso (Aire acondicionado)

---

## 🎯 Flujos de Demostración Sugeridos

### 1. Flujo de Usuario Normal
1. Login como `maria@condominio.com`
2. Ver dashboard con anuncios
3. Ir a "Mis Pagos" y ver historial
4. Descargar recibo oficial de un pago validado
5. Ver solicitudes de mantenimiento
6. Revisar reservas de espacios

### 2. Flujo de Administrador
1. Login como `admin@condominio.com`
2. Ver dashboard de administración
3. Ir a "Validación de Pagos"
4. Validar un pago pendiente
5. Ver Centro de Recaudación
6. Generar reporte de recaudación PDF
7. Revisar gastos fijos distribuidos
8. Gestionar anuncios y eventos

### 3. Demostrar Usuario Moroso
1. Login como `ana@condominio.com`
2. Ver bloqueo de acceso por morosidad
3. Acceder a "Mis Pagos" para enviar comprobante

---

## ⚠️ Notas Importantes

- **Los datos persisten en localStorage**: Si reinicias el navegador, los datos se mantienen.
- **Reiniciar datos**: Usa `demoMode.resetData()` para volver a los datos originales.
- **Banner visible**: Cuando el modo demo está activo, aparece un banner naranja en la parte superior.
- **Funciona 100% offline**: No necesitas conexión a internet.

---

## 🚀 Iniciar la Aplicación

```bash
cd "c:\Users\larac\OneDrive\Desktop\ServicioComunitario-feature-condominio-foro-anuncios-bd"
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 🔧 Solución de Problemas

### La aplicación no carga
```bash
npm install
npm run dev
```

### Los datos no aparecen correctamente
Abre la consola (F12) y ejecuta:
```javascript
demoMode.resetData()
```
Luego recarga la página.

### Quiero usar datos reales
1. Asegúrate de tener conexión a internet
2. Ejecuta en la consola: `demoMode.disable()`
3. La página se recargará e intentará conectar con Supabase

---

**¡Buena suerte con tu presentación!** 🎓
