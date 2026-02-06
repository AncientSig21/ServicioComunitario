# Establecer Usuario Moroso

## Instrucciones para establecer el usuario moroso

### Opción 1: Desde la consola del navegador (Recomendado)

1. Abre la aplicación en tu navegador
2. Presiona `F12` para abrir las herramientas de desarrollador
3. Ve a la pestaña "Console"
4. Ejecuta el siguiente comando:

```javascript
// Limpiar y reinicializar la base de datos
localStorage.removeItem('mockDatabase_condominio');
location.reload();
```

### Opción 2: Usando la función del servicio

1. Abre la consola del navegador (F12)
2. Ejecuta:

```javascript
// Importar y ejecutar la función (si está disponible globalmente)
// O simplemente limpiar localStorage
localStorage.removeItem('mockDatabase_condominio');
```

### Opción 3: Verificar manualmente

El usuario moroso debería estar configurado automáticamente. Para verificar:

1. Abre la consola del navegador (F12)
2. Ejecuta:

```javascript
const db = JSON.parse(localStorage.getItem('mockDatabase_condominio') || '{}');
console.log('Usuarios:', db.usuarios);
const maria = db.usuarios?.find(u => u.correo === 'maria@condominio.com');
console.log('Usuario María:', maria);
```

## Credenciales del Usuario Moroso

- **Email:** `maria@condominio.com`
- **Contraseña:** `maria123`
- **Tipo de Residencia:** `Propietario`
- **Estado:** `Moroso`
- **Condominio:** `San Juan`
- **Apartamento:** `Apto 302`

## Nota

El sistema ahora verifica y actualiza automáticamente el usuario moroso al iniciar sesión. Si el usuario no existe o no tiene el estado correcto, se restaurará automáticamente desde `mockDatabase.json`.

