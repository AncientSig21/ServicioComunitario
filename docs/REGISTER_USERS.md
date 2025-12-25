# Guía para Registrar Usuarios

Este documento explica cómo usar los scripts para registrar usuarios en la base de datos usando el CRUD corregido.

## 🚀 Métodos Disponibles

### Método 1: Script Interactivo (Recomendado)

El script más fácil de usar, te guía paso a paso:

```bash
npm run register-user
```

O directamente:

```bash
node scripts/register-user-interactive.js
```

Este script te pedirá:
- Nombre completo
- Correo electrónico
- Teléfono (opcional)
- Cédula (opcional)
- Rol (admin, propietario, residente, conserje, invitado)
- Contraseña
- Si tiene condominio
- Si necesita vivienda (y número de apartamento)

### Método 2: Script Simple (Programático)

Para usar en código o scripts automatizados:

```bash
npm run register-user:simple
```

O importar las funciones:

```javascript
import { registerUsuarioSimple, registerResidenteCompleto } from './scripts/register-user-simple.js';

// Registrar usuario simple (sin vivienda)
await registerUsuarioSimple({
  nombre: 'Admin Principal',
  correo: 'admin@condominio.com',
  telefono: '04121234567',
  cedula: 'V12345678',
  rol: 'admin',
  contraseña: 'admin123',
  condominio_id: null
});

// Registrar residente completo (con vivienda)
await registerResidenteCompleto({
  nombre: 'Juan Pérez',
  correo: 'juan.perez@email.com',
  telefono: '04121234568',
  cedula: 'V87654321',
  rol: 'residente',
  contraseña: 'password123',
  condominio_id: 1,
  vivienda_id: 1,
  rol_en_vivienda: 'propietario'
});
```

### Método 3: Usar el CRUD Directamente

Puedes usar las funciones del CRUD directamente en tu código:

```typescript
import { registerResidente } from './services/bookService';
import { supabase } from './supabase/client';

// Registrar un residente
const usuario = await registerResidente({
  nombre: 'María González',
  correo: 'maria@email.com',
  telefono: '04121234569',
  cedula: 'V11223344',
  rol: 'propietario',
  contraseña: 'password123',
  auth_uid: `auth_${Date.now()}`,
  condominio_id: 1,
  vivienda_id: 1,
  rol_en_vivienda: 'propietario'
});
```

## 📋 Roles Válidos

Los roles válidos según `supabase.ts` son:

- `admin` - Administrador del sistema
- `propietario` - Propietario de vivienda
- `residente` - Residente de vivienda
- `conserje` - Conserje del condominio
- `invitado` - Usuario invitado

**Nota:** Si usas roles antiguos como `mantenimiento`, `contador`, o `visitante`, se mapearán automáticamente a los roles válidos.

## 🔧 Requisitos

### Para Usuario Simple (sin vivienda):
- `nombre` (requerido)
- `correo` (requerido)
- `rol` (requerido)
- `contraseña` (requerido)
- `telefono` (opcional)
- `cedula` (opcional)
- `condominio_id` (opcional)

### Para Residente Completo (con vivienda):
- Todos los campos del usuario simple
- `vivienda_id` (requerido)
- `rol_en_vivienda` (requerido: 'propietario', 'inquilino', 'arrendatario', 'familiar')
- `auth_uid` (se genera automáticamente si no se proporciona)

## 📝 Ejemplos

### Ejemplo 1: Registrar Administrador

```javascript
import { registerUsuarioSimple } from './scripts/register-user-simple.js';

await registerUsuarioSimple({
  nombre: 'Administrador Principal',
  correo: 'admin@condominio.com',
  telefono: '04121234567',
  cedula: 'V12345678',
  rol: 'admin',
  contraseña: 'admin123',
  condominio_id: null
});
```

### Ejemplo 2: Registrar Propietario con Vivienda

```javascript
import { registerResidenteCompleto, obtenerOCrearVivienda } from './scripts/register-user-simple.js';

// Primero obtener o crear la vivienda
const vivienda_id = await obtenerOCrearVivienda('A-101', 1);

await registerResidenteCompleto({
  nombre: 'Juan Pérez',
  correo: 'juan.perez@email.com',
  telefono: '04121234568',
  cedula: 'V87654321',
  rol: 'propietario',
  contraseña: 'password123',
  condominio_id: 1,
  vivienda_id: vivienda_id,
  rol_en_vivienda: 'propietario'
});
```

### Ejemplo 3: Registrar Múltiples Usuarios

```javascript
import { registerResidenteCompleto, obtenerOCrearVivienda } from './scripts/register-user-simple.js';

const usuarios = [
  {
    nombre: 'María González',
    correo: 'maria.gonzalez@email.com',
    telefono: '04121234569',
    cedula: 'V11223344',
    rol: 'propietario',
    contraseña: 'password123',
    condominio_id: 1,
    numeroApartamento: 'A-102',
    rol_en_vivienda: 'propietario'
  },
  {
    nombre: 'Carlos Rodríguez',
    correo: 'carlos.rodriguez@email.com',
    telefono: '04121234570',
    cedula: 'V55667788',
    rol: 'residente',
    contraseña: 'password123',
    condominio_id: 1,
    numeroApartamento: 'A-103',
    rol_en_vivienda: 'inquilino'
  }
];

for (const userData of usuarios) {
  try {
    const { numeroApartamento, rol_en_vivienda, ...userInfo } = userData;
    const vivienda_id = await obtenerOCrearVivienda(numeroApartamento, userData.condominio_id);
    
    await registerResidenteCompleto({
      ...userInfo,
      vivienda_id,
      rol_en_vivienda
    });
    
    console.log(`✅ Usuario ${userData.nombre} registrado exitosamente`);
  } catch (error) {
    console.error(`❌ Error al registrar ${userData.nombre}:`, error.message);
  }
}
```

## ⚠️ Notas Importantes

1. **Contraseñas**: Las contraseñas se almacenan en texto plano en la BD. En producción, deberías usar hash (bcrypt, etc.)

2. **auth_uid**: Se genera automáticamente si no se proporciona. Formato: `auth_${timestamp}_${random}`

3. **Viviendas**: Si la vivienda no existe, se creará automáticamente si se proporciona `condominio_id`

4. **Roles**: Los roles se validan y mapean automáticamente según los enums de `supabase.ts`

5. **Validaciones**: El script verifica que el correo no esté duplicado antes de registrar

## 🔍 Verificar Usuario Registrado

Para verificar que el usuario se registró correctamente:

```javascript
import { supabase } from './supabase/client';

const { data: usuarios, error } = await supabase
  .from('usuarios')
  .select('*')
  .eq('correo', 'usuario@email.com')
  .single();

console.log('Usuario encontrado:', usuarios);
```

## 🐛 Solución de Problemas

### Error: "El correo electrónico ya está registrado"
- El correo ya existe en la base de datos
- Usa un correo diferente o actualiza el usuario existente

### Error: "condominio_id es requerido para crear una nueva vivienda"
- Necesitas proporcionar `condominio_id` al crear una vivienda nueva
- O usa una vivienda existente

### Error: "No tiene permisos para solicitar..."
- Verifica que el usuario tenga los permisos necesarios
- Asegúrate de que la vivienda existe y está activa




