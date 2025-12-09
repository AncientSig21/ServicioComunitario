// Sistema de validación para verificar que los datos extraídos sean correctos
export interface ValidationResult {
  isValid: boolean;
  message: string;
  suggestedTitle?: string;
  suggestedAuthor?: string;
}

// Función para validar si los datos extraídos son razonables
export function validateExtractedData(title: string, author: string, _filename: string, confidence?: number): ValidationResult {

  
  // Si la confianza es alta (>80), ser más permisivo con las validaciones
  const isHighConfidence = confidence && confidence > 80;
  
  // Validación 1: Verificar que el título no contenga la palabra "autor" (solo si no es alta confianza)
  if (!isHighConfidence && title.toLowerCase().includes('autor')) {
    return {
      isValid: false,
      message: 'Error: El título extraído contiene la palabra "autor". Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 2: Verificar que el autor no contenga palabras que no son nombres (solo si no es alta confianza)
  if (!isHighConfidence) {
    const invalidAuthorWords = ['java', 'tesis', 'proyecto', 'investigacion', 'documento', 'pdf', 'doc'];
    const authorLower = author.toLowerCase();
    for (const word of invalidAuthorWords) {
      if (authorLower.includes(word)) {
        return {
          isValid: false,
          message: `Error: El autor extraído contiene "${word}". Por favor, ingrese los datos manualmente.`
        };
      }
    }
  }
  
  // Validación 3: Verificar que el título no sea muy largo (más de 100 caracteres)
  if (title.length > 100) {
    return {
      isValid: false,
      message: 'Error: El título extraído es demasiado largo. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 4: Verificar que el autor no sea muy largo (más de 50 caracteres)
  if (author.length > 50) {
    return {
      isValid: false,
      message: 'Error: El autor extraído es demasiado largo. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 5: Verificar que el autor contenga al menos un espacio (nombre y apellido) - más permisivo con alta confianza
  if (!isHighConfidence && !author.includes(' ')) {
    return {
      isValid: false,
      message: 'Error: El autor extraído parece incompleto. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 6: Verificar que el título no esté vacío o sea muy corto
  if (!title || title.trim().length < 3) {
    return {
      isValid: false,
      message: 'Error: El título extraído está vacío o es muy corto. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 7: Verificar que el autor no esté vacío o sea muy corto
  if (!author || author.trim().length < 3) {
    return {
      isValid: false,
      message: 'Error: El autor extraído está vacío o es muy corto. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 8: Verificar que el título y autor no sean iguales
  if (title.toLowerCase() === author.toLowerCase()) {
    return {
      isValid: false,
      message: 'Error: El título y autor extraídos son iguales. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 9: Verificar que el título no contenga el nombre del autor
  if (author && title.toLowerCase().includes(author.toLowerCase())) {
    return {
      isValid: false,
      message: 'Error: El título extraído contiene el nombre del autor. Por favor, ingrese los datos manualmente.'
    };
  }
  
  // Validación 10: Verificar que el autor no contenga el título
  if (title && author.toLowerCase().includes(title.toLowerCase())) {
    return {
      isValid: false,
      message: 'Error: El autor extraído contiene el título. Por favor, ingrese los datos manualmente.'
    };
  }
  
  return {
    isValid: true,
    message: 'Datos extraídos son válidos',
    suggestedTitle: title,
    suggestedAuthor: author
  };
}

// Función para intentar corregir datos extraídos incorrectamente
export function attemptDataCorrection(filename: string): ValidationResult {
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');
  
  // Buscar el patrón "Título autor Autor"
  const autorPattern = /\s+autor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const match = nameWithoutExt.match(autorPattern);
  
  if (match) {
    const author = match[1];
    const title = nameWithoutExt.replace(autorPattern, '').trim();
    
    // Validar el resultado corregido
    const validation = validateExtractedData(title, author, filename);
    if (validation.isValid) {
      return {
        isValid: true,
        message: 'Datos corregidos exitosamente',
        suggestedTitle: title,
        suggestedAuthor: author
      };
    }
  }
  
  return {
    isValid: false,
    message: 'No se pudieron corregir los datos extraídos. Por favor, ingrese los datos manualmente.'
  };
} 