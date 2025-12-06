# 📄 Extracción Automática de Metadatos de PDF

## 🎯 Funcionalidad Implementada

El sistema ahora puede extraer automáticamente los metadatos de un PDF cuando se sube en el formulario de administración, llenando automáticamente los campos de:

- **Título** (desde metadatos del PDF)
- **Autor** (desde metadatos del PDF)
- **Sinopsis** (generada automáticamente desde el texto de la primera página)
- **Tipo de documento** (detectado automáticamente: Tesis, Proyecto de Investigación, Virtual)

## 🔧 Cómo Funciona

### 1. **Extracción de Metadatos**
- Utiliza la biblioteca `pdfjs-dist` para leer el PDF
- Extrae metadatos como título, autor, fecha de creación, etc.
- Lee el texto de la primera página para análisis adicional

### 2. **Generación Automática de Sinopsis**
- Toma los primeros 500 caracteres del texto del PDF
- Limpia el texto de caracteres especiales
- Genera una sinopsis de máximo 200 caracteres
- Corta en una palabra completa para evitar cortes abruptos

### 3. **Detección Automática del Tipo**
- Analiza el contenido del PDF y metadatos
- Busca palabras clave como "tesis", "proyecto", "investigación"
- Selecciona automáticamente el tipo apropiado

## 📋 Campos que se Llenan Automáticamente

| Campo | Origen | Comportamiento |
|-------|--------|----------------|
| **Título** | Metadatos del PDF | Solo si el campo está vacío |
| **Autor** | Metadatos del PDF | Solo si el campo está vacío |
| **Sinopsis** | Texto de la primera página | Solo si el campo está vacío |
| **Tipo** | Análisis del contenido | Se selecciona automáticamente |

## 🎨 Interfaz de Usuario

### Indicadores Visuales
- **Spinner azul**: "Extrayendo metadatos del PDF..."
- **Check verde**: "¡Metadatos extraídos automáticamente!"
- **Notificación temporal**: Desaparece después de 3 segundos

### Restricciones
- Solo funciona con archivos PDF
- No sobrescribe campos ya llenados
- Mantiene la funcionalidad manual existente

## 🛠️ Archivos Modificados

### Nuevos Archivos
- `src/utils/pdfMetadata.ts` - Funciones de extracción de metadatos

### Archivos Modificados
- `src/pages/AdminBooksPage.tsx` - Integración en el formulario

## 📦 Dependencias Agregadas

```bash
npm install pdfjs-dist
npm install pdf-parse
```

## 🔧 Solución a Problemas de CORS

### Problema Identificado
El error de CORS ocurre porque PDF.js intenta cargar el worker desde un CDN externo, pero el navegador bloquea la carga por políticas de seguridad.

### Soluciones Implementadas

#### 1. **Versión Original (pdfjs-dist)**
- Problema: CORS con worker externo
- Solución: Configuración de worker local o deshabilitación

#### 2. **Versión Simplificada (pdfMetadataSimple.ts)**
- Enfoque: Extracción directa usando expresiones regulares
- Ventaja: No depende de workers externos
- Limitación: Menos precisa para PDFs complejos

#### 3. **Versión Alternativa (pdfMetadataAlternative.ts)**
- Enfoque: Mejorada con pdf-parse
- Ventaja: Más robusta para diferentes tipos de PDF
- Limitación: Dependencia adicional

#### 4. **Versión Final (pdfMetadataFinal.ts)**
- Enfoque: Sin dependencias externas
- Ventaja: Completamente compatible, sin problemas de CORS
- Características:
  - Extracción de metadatos básicos (título, autor, subject)
  - Extracción de texto de la primera página con múltiples patrones
  - Detección automática del tipo de documento
  - Múltiples encodings de texto (UTF-8, Latin1, ISO-8859-1)
  - Limpieza robusta de strings de PDF
  - Búsqueda de autor en el contenido del documento
  - Generación inteligente de sinopsis basada en frases completas
  - Filtrado avanzado de texto legible

#### 5. **Versión Simplificada (pdfMetadataSimple.ts) - RECOMENDADA**
- Enfoque: Solo extracción esencial
- Ventaja: Rápida, confiable y sin problemas
- Características:
  - **Título**: Extraído desde metadatos del PDF
  - **Autor**: Extraído desde el nombre del archivo (más confiable)
  - **Patrones de nombre**: "Autor - Título", "Autor_Título", "Tesis - Autor", etc.
  - **Validación inteligente**: Verifica que el autor sea un nombre válido
  - **Formateo automático**: Capitaliza nombres correctamente
  - **Sin extracción de texto**: Evita problemas de caracteres extraños

## 🔍 Palabras Clave para Detección

### Tesis
- "tesis", "thesis", "graduación", "graduation", "investigación", "research"

### Proyecto de Investigación
- "proyecto", "project", "investigación", "research", "estudio", "study"

### Virtual (por defecto)
- Si no coincide con los patrones anteriores

## 📁 Patrones de Nombre de Archivo para Autor

### Patrones Reconocidos (Sistema Avanzado)
1. **"Título autor Autor"** (95% confianza): `10. Java2 autor Jorge Sánchez.pdf`
2. **"Autor - Título"** (90% confianza): `Juan Pérez - Tesis de Ingeniería.pdf`
3. **"Autor_Título"** (90% confianza): `María García_Tesis de Sistemas.pdf`
4. **"Tesis - Autor"** (85% confianza): `Tesis - Ana Rodríguez.pdf`
5. **"Autor Título"** (80% confianza): `Carlos López Tesis de Civil.pdf`
6. **"Título Autor"** (75% confianza): `java2 Jorge Sanchez.pdf`
7. **"Título Nombre"** (60% confianza): `Tesis Juan Pérez.pdf`
8. **"Nombre Título"** (60% confianza): `Juan Pérez Tesis.pdf`
9. **Extracción Inteligente** (50% confianza): Casos sin patrón claro
10. **Extracción Simple** (30% confianza): Solo nombre sin apellido

### Ejemplos de Nombres Válidos
- `Juan Pérez - Tesis de Ingeniería.pdf` → Autor: "Juan Pérez"
- `María García_Tesis de Sistemas.pdf` → Autor: "María García"
- `Tesis - Ana Rodríguez.pdf` → Autor: "Ana Rodríguez"
- `Carlos López.pdf` → Autor: "Carlos López"
- `java2 Jorge Sanchez.pdf` → Autor: "Jorge Sanchez", Título: "java2"
- `proyecto Juan Pérez.pdf` → Autor: "Juan Pérez", Título: "proyecto"
- `10. Java2 autor Jorge Sánchez.pdf` → Autor: "Jorge Sánchez", Título: "10. Java2"
- `Java2 autor Jorge Sánchez.pdf` → Autor: "Jorge Sánchez", Título: "Java2"

### Validaciones
- ✅ Solo letras, espacios y caracteres especiales del español
- ✅ Mínimo 2 caracteres, máximo 50
- ✅ Al menos una letra
- ✅ No palabras de una sola letra
- ✅ Formateo automático de mayúsculas/minúsculas

## 🔍 Sistema de Validación de Datos

### Validaciones Implementadas
1. **Título no contiene "autor"**: Evita que el título incluya la palabra "autor"
2. **Autor no contiene palabras inválidas**: Evita palabras como "java", "tesis", "proyecto"
3. **Longitud del título**: Máximo 100 caracteres
4. **Longitud del autor**: Máximo 50 caracteres
5. **Autor completo**: Debe contener al menos un espacio (nombre y apellido)
6. **Título no vacío**: Mínimo 3 caracteres
7. **Autor no vacío**: Mínimo 3 caracteres
8. **Título y autor diferentes**: No pueden ser iguales
9. **Título no contiene autor**: El título no puede incluir el nombre del autor
10. **Autor no contiene título**: El autor no puede incluir el título

### Comportamiento en Caso de Error
- **Mensaje de error**: Se muestra un mensaje específico explicando el problema
- **No llenado automático**: Los campos no se llenan automáticamente
- **Entrada manual**: Se solicita al usuario que ingrese los datos manualmente
- **Intento de corrección**: El sistema intenta corregir automáticamente antes de mostrar el error

### Sistema de Confianza
- **Alta confianza (>80%)**: Validaciones más permisivas, mayor probabilidad de éxito
- **Media confianza (60-80%)**: Validaciones estándar
- **Baja confianza (<60%)**: Validaciones estrictas, mayor probabilidad de solicitar entrada manual
- **Sin confianza (0%)**: No se llenan campos automáticamente

## ⚠️ Limitaciones

1. **PDFs sin metadatos**: Si el PDF no tiene metadatos, solo se extrae el texto
2. **PDFs escaneados**: No funcionan con PDFs que son imágenes escaneadas
3. **PDFs protegidos**: No funcionan con PDFs con contraseña
4. **Tamaño de archivo**: PDFs muy grandes pueden tardar más en procesarse

## 🚀 Beneficios

1. **Ahorro de tiempo**: No hay que escribir manualmente los datos
2. **Consistencia**: Los datos se extraen directamente del documento
3. **Precisión**: Reduce errores de transcripción manual
4. **Experiencia mejorada**: Proceso más fluido para el administrador

## 🔄 Flujo de Trabajo

1. Usuario selecciona un archivo PDF
2. Sistema detecta automáticamente que es un PDF
3. Se inicia la extracción de metadatos (spinner visible)
4. Se llenan automáticamente los campos vacíos
5. Se detecta y selecciona el tipo de documento
6. Se muestra confirmación de éxito
7. Usuario puede revisar y modificar los datos si es necesario
8. Usuario guarda el libro con todos los datos

## 🎯 Casos de Uso

### Caso 1: PDF con Metadatos Completos
- Se extraen título, autor, fecha
- Se genera sinopsis automática
- Se detecta tipo automáticamente

### Caso 2: PDF con Metadatos Parciales
- Se extraen los metadatos disponibles
- Se complementa con análisis de texto
- Se llenan solo los campos faltantes

### Caso 3: PDF sin Metadatos
- Se analiza solo el texto del documento
- Se genera sinopsis desde el contenido
- Se detecta tipo por palabras clave

## 🔧 Configuración Avanzada

### Personalizar Palabras Clave
```typescript
// En src/utils/pdfMetadata.ts
const tesisKeywords = ['tesis', 'thesis', 'graduación', 'graduation'];
const proyectoKeywords = ['proyecto', 'project', 'investigación', 'research'];
```

### Ajustar Longitud de Sinopsis
```typescript
// Cambiar el parámetro maxLength
const synopsis = generateSynopsis(metadata.firstPageText, 300); // 300 caracteres
```

### Modificar Texto de Primera Página
```typescript
// Cambiar la cantidad de caracteres analizados
const firstPageText = textContent.items
  .map((item: any) => item.str)
  .join(' ')
  .substring(0, 1000); // 1000 caracteres en lugar de 500
``` 