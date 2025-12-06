import { validateExtractedData, attemptDataCorrection } from './dataValidator';

export interface PDFMetadata {
  title?: string;
  author?: string;
  validationError?: string;
}

export const extractPDFMetadataSimple = async (file: File): Promise<PDFMetadata> => {
  const metadata: PDFMetadata = {};

  try {
    // Extraer título del PDF
    const title = await extractTitleFromPDF(file);
    if (title && !title.includes('.doc') && !title.includes('.pdf')) {
      metadata.title = title;
    }

    // Extraer autor del nombre del archivo
    const author = extractAuthorFromFilename(file.name);
    if (author) {
      metadata.author = author;
    }

    // Si no se encontró título válido del PDF, usar el nombre del archivo
    if (!metadata.title) {
      const filenameWithoutExt = file.name.replace(/\.pdf$/i, '');
      const extractedAuthor = metadata.author || '';
      const potentialTitle = filenameWithoutExt.replace(new RegExp(extractedAuthor, 'gi'), '').trim();
      if (potentialTitle && potentialTitle.length > 2) {
        metadata.title = potentialTitle;
      } else {
        metadata.title = filenameWithoutExt;
      }
    }

    // Intentar extracción avanzada si no se encontró autor
    if (!metadata.author) {
      try {
        const { extractAuthorAdvanced } = await import('./advancedAuthorExtractor');
        const advancedResult = extractAuthorAdvanced(file.name);
        
        if (advancedResult.author && advancedResult.confidence > 60) {
          // Validar el resultado de extracción avanzada
          const validation = validateExtractedData(
            advancedResult.title || metadata.title || '',
            advancedResult.author,
            file.name,
            advancedResult.confidence
          );

          if (validation.isValid) {
            metadata.author = validation.suggestedAuthor || advancedResult.author;
            if (advancedResult.title) {
              metadata.title = validation.suggestedTitle || advancedResult.title;
            }
          } else {
            // Si la validación falló y la confianza es baja, intentar corrección
            if (advancedResult.confidence < 80) {
              const correction = attemptDataCorrection(file.name);
              if (correction.isValid) {
                metadata.author = correction.suggestedAuthor || '';
                metadata.title = correction.suggestedTitle || metadata.title || '';
                             } else {
                 metadata.validationError = correction.message || 'Error al validar datos extraídos';
               }
             } else {
               metadata.validationError = validation.message || 'Error al validar datos extraídos';
             }
          }
        }
      } catch (error) {
        // Si falla la extracción avanzada, continuar sin autor
      }
    }

    return metadata;
  } catch (error) {
    return metadata;
  }
};

const extractTitleFromPDF = async (file: File): Promise<string | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const text = textDecoder.decode(uint8Array);

    // Buscar metadatos del PDF
    const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
    if (titleMatch) {
      return cleanPDFString(titleMatch[1]);
    }

    return null;
  } catch (error) {
    return null;
  }
};

const extractAuthorFromFilename = (filename: string): string | null => {
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');
  
  // Patrones comunes para extraer autor del nombre del archivo
  const patterns = [
    /^([^-_]+)\s*[-_]\s*(.+)$/i, // "Autor - Título" o "Autor_Título"
    /^(.+?)\s+por\s+(.+)$/i, // "Título por Autor"
    /^Tesis\s*[-_]\s*(.+)$/i, // "Tesis - Autor"
    /^(.+?)\s+autor\s+(.+)$/i, // "Título autor Autor"
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = nameWithoutExt.match(patterns[i]);
    if (match) {
      const potentialAuthor = match[1] || match[2];
      if (isValidAuthorName(potentialAuthor)) {
        return formatAuthorName(potentialAuthor);
      }
    }
  }

  // Extracción por palabras si no se encontró con patrones
  const words = nameWithoutExt.split(/\s+/);
  
  // Buscar dos palabras consecutivas que parezcan un nombre
  for (let i = 0; i < words.length - 1; i++) {
    const potentialAuthor = `${words[i]} ${words[i + 1]}`;
    if (isValidAuthorName(potentialAuthor)) {
      return formatAuthorName(potentialAuthor);
    }
  }

  // Buscar una sola palabra que parezca un nombre
  for (const word of words) {
    if (isValidAuthorName(word)) {
      return formatAuthorName(word);
    }
  }

  return null;
};

const isValidAuthorName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  
  // Debe contener solo letras, espacios y caracteres especiales del español
  if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(trimmed)) return false;
  
  // Debe contener al menos una letra
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(trimmed)) return false;
  
  // No debe ser muy corto después de trim
  if (trimmed.length < 2) return false;
  
  // Verificar que no tenga palabras muy cortas
  const words = trimmed.split(/\s+/);
  for (const word of words) {
    if (word.length === 1) return false;
  }
  
  return true;
};

const formatAuthorName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const cleanPDFString = (str: string): string => {
  if (!str) return '';
  
  // Limpiar secuencias de escape de PDF
  let cleaned = str.replace(/\\([0-7]{3})/g, (_, oct) => {
    return String.fromCharCode(parseInt(oct, 8));
  });
  
  cleaned = cleaned.replace(/\\([nrtbf])/g, (_, char) => {
    const escapes: { [key: string]: string } = {
      'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f'
    };
    return escapes[char] || char;
  });
  
  // Eliminar caracteres no imprimibles
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  return cleaned.trim();
};

export const detectDocumentType = (filename: string, metadata: PDFMetadata): string => {
  const text = `${filename} ${metadata.title || ''} ${metadata.author || ''}`.toLowerCase();
  
  if (text.includes('tesis') || text.includes('thesis')) {
    return 'Tesis';
  }
  
  if (text.includes('proyecto') || text.includes('investigacion') || text.includes('investigation')) {
    return 'Proyecto de Investigacion';
  }
  
  return 'Virtual';
}; 