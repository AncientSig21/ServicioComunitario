// Función avanzada para detectar más patrones de nombres de archivo
export interface ExtractionResult {
  author: string;
  title: string;
  confidence: number; // 0-100, indica qué tan confiable es la extracción
}

export const extractAuthorAdvanced = (filename: string): ExtractionResult => {
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');
  
  // Patrones ordenados por confianza (de mayor a menor)
  const patterns = [
    // Patrón 1: "Título autor Autor" (confianza: 95%)
    {
      regex: /^(.+?)\s+autor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/i,
      confidence: 95
    },
    // Patrón 2: "Autor - Título" (confianza: 90%)
    {
      regex: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-_]\s*(.+)$/i,
      confidence: 90
    },
    // Patrón 3: "Autor Título" (confianza: 85%)
    {
      regex: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z].+)$/i,
      confidence: 85
    },
    // Patrón 4: "Título Autor" (confianza: 80%)
    {
      regex: /^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/i,
      confidence: 80
    },
    // Patrón 5: "Tesis - Autor" (confianza: 75%)
    {
      regex: /^(?:Tesis|Proyecto|Tesina)\s*[-_]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/i,
      confidence: 75
    },
    // Patrón 6: "Autor" al final (confianza: 70%)
    {
      regex: /^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/i,
      confidence: 70
    },
    // Patrón 7: "Título por Autor" (confianza: 65%)
    {
      regex: /^(.+?)\s+por\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/i,
      confidence: 65
    },
    // Patrón 8: Extracción inteligente (confianza: 60%)
    {
      regex: null,
      confidence: 60
    }
  ];

  // Probar cada patrón
  for (const pattern of patterns) {
    if (pattern.regex) {
      const match = nameWithoutExt.match(pattern.regex);
      if (match) {
        let title = match[1]?.trim() || '';
        let author = match[2]?.trim() || '';
        
        // Si el patrón 5 (Tesis - Autor), ajustar
        if (pattern.confidence === 75) {
          title = 'Tesis';
          author = match[1]?.trim() || '';
        }
        
        if (title && author) {
          return {
            author,
            title,
            confidence: pattern.confidence
          };
        }
      }
    } else {
      // Patrón 8: Extracción inteligente
      const result = extractIntelligently(nameWithoutExt);
      if (result.author && result.title) {
        return {
          ...result,
          confidence: pattern.confidence
        };
      }
    }
  }

  // Si no se encuentra nada, devolver valores vacíos
  return {
    author: '',
    title: nameWithoutExt,
    confidence: 0
  };
};

const extractIntelligently = (nameWithoutExt: string): { author: string; title: string } => {
  const words = nameWithoutExt.split(/\s+/);
  
  // Buscar dos palabras consecutivas que empiecen con mayúscula
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    
    if (/^[A-Z][a-z]+$/.test(word1) && /^[A-Z][a-z]+$/.test(word2)) {
      const author = `${word1} ${word2}`;
      const title = words.filter((_, index) => index !== i && index !== i + 1).join(' ');
      
      if (title.trim()) {
        return { author, title: title.trim() };
      }
    }
  }
  
  // Si no se encuentra, buscar una sola palabra que empiece con mayúscula
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^[A-Z][a-z]+$/.test(word)) {
      const author = word;
      const title = words.filter((_, index) => index !== i).join(' ');
      
      if (title.trim()) {
        return { author, title: title.trim() };
      }
    }
  }
  
  return { author: '', title: nameWithoutExt };
};

export const isExtractionReliable = (result: ExtractionResult): boolean => {
  return result.confidence > 60;
}; 