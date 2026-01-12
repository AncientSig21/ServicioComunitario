# Cambios Requeridos para Condominios

## 📋 Análisis de Requerimientos

### 1. Página de Condominios (`/admin/condominios`)
**Cambios necesarios:**
- ✅ Mostrar solo: **Nombre** y **Número de viviendas**
- ❌ Eliminar de la visualización: dirección, estado, teléfono
- ✅ Calcular número de viviendas contando `viviendas` donde `condominio_id = condominio.id`

### 2. Registro de Usuarios
**Cambios necesarios:**
- ✅ Permitir escribir nombre del condominio (no solo seleccionar)
- ✅ Si el nombre coincide con uno existente → usar ese `condominio_id`
- ✅ Si no existe → crear nuevo condominio y usar su `condominio_id`
- ✅ Anexar usuario al condominio encontrado/creado

### 3. Filtro de Residentes por Condominio
**Estado actual:**
- ✅ Ya existe en `AdminResidentesPage.tsx` (línea 36, 68-70)
- ✅ Funciona correctamente

## 🗄️ Cambios en Base de Datos

### ❌ NO SE REQUIEREN CAMBIOS EN LA BASE DE DATOS

**Razón:**
1. La tabla `condominios` ya tiene el campo `nombre` (VARCHAR) que permite búsqueda por nombre
2. La tabla `usuarios` ya tiene `condominio_id` (FK a condominios) para relacionar usuarios con condominios
3. La tabla `viviendas` ya tiene `condominio_id` (FK a condominios) para contar viviendas
4. No necesitamos agregar campos nuevos

### ✅ Solo se necesitan cambios en la lógica de la aplicación:

1. **Modificar `fetchCondominios`** para incluir conteo de viviendas
2. **Modificar `AdminCondominiosPage`** para mostrar solo nombre y número de viviendas
3. **Modificar `RegisterPage`** para buscar/crear condominio por nombre
4. **Crear función helper** `buscarOCrearCondominio` que busque por nombre y cree si no existe

## 📝 Resumen

**✅ NO SE REQUIEREN CAMBIOS EN LA BASE DE DATOS**

Todos los campos necesarios ya existen:
- ✅ `condominios.nombre` - Para búsqueda y visualización
- ✅ `condominios.id` - Para relaciones
- ✅ `usuarios.condominio_id` - Para anexar usuarios
- ✅ `viviendas.condominio_id` - Para contar viviendas

## ✅ Cambios Implementados

### 1. `bookService.ts`
- ✅ Modificado `fetchCondominios()` para incluir conteo de viviendas
- ✅ Creada función `buscarOCrearCondominio()` que:
  - Busca condominio por nombre (case-insensitive)
  - Si existe, retorna su ID
  - Si no existe, crea uno nuevo y retorna su ID

### 2. `AdminCondominiosPage.tsx`
- ✅ Simplificado para mostrar solo: **Nombre** y **Número de Viviendas**
- ✅ Eliminados campos: dirección, estado, teléfono de la visualización
- ✅ Formulario simplificado: solo requiere nombre
- ✅ El número de viviendas se calcula automáticamente

### 3. `RegisterPage.tsx`
- ✅ Cambiado de select a input de texto para escribir nombre del condominio
- ✅ Integrada función `buscarOCrearCondominio()` en el registro
- ✅ Si el nombre coincide con uno existente → anexa al usuario a ese condominio
- ✅ Si no existe → crea nuevo condominio y anexa al usuario
- ✅ Mantiene opción de seleccionar de lista existente (en detalles)

### 4. Filtro de Residentes
- ✅ Ya existe y funciona correctamente en `AdminResidentesPage.tsx`

## 🎯 Resultado Final

1. **Página de Condominios**: Muestra solo nombre y número de viviendas
2. **Registro de Usuarios**: Permite escribir nombre del condominio y lo busca/crea automáticamente
3. **Filtro de Residentes**: Funciona correctamente por condominio
4. **Base de Datos**: No requiere cambios, todo funciona con la estructura actual

