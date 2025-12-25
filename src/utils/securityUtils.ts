/**
 * Utilidades para manejo de seguridad: hashing de contraseñas y respuestas
 */

// Generar un salt aleatorio
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Función para hashear contraseñas con salt usando Web Crypto API
export const hashPassword = async (password: string, salt?: string): Promise<{ hash: string; salt: string }> => {
  const saltToUse = salt || generateSalt();
  const encoder = new TextEncoder();
  
  // Combinar password + salt y hashear múltiples veces para mayor seguridad
  const combined = password + saltToUse;
  const data = encoder.encode(combined);
  
  // Realizar hash múltiple (3 iteraciones para mayor seguridad sin ser demasiado lento)
  let hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  for (let i = 0; i < 2; i++) {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashString + saltToUse));
  }
  
  // Convertir a string hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { hash: hashHex, salt: saltToUse };
};

// Función para comparar contraseña con hash almacenado
export const comparePassword = async (password: string, storedHash: string, salt: string): Promise<boolean> => {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
};

// Función simple para hashear respuestas usando Web Crypto API
export const hashAnswer = async (answer: string): Promise<string> => {
  // Normalizar la respuesta: minúsculas, sin espacios al inicio/final
  const normalized = answer.toLowerCase().trim();
  
  // Usar Web Crypto API para crear un hash SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convertir a string hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

// Función para comparar respuesta con hash
export const compareAnswer = async (answer: string, hash: string): Promise<boolean> => {
  const answerHash = await hashAnswer(answer);
  return answerHash === hash;
};

// Normalizar respuesta para comparación
export const normalizeAnswer = (answer: string): string => {
  return answer.toLowerCase().trim();
};

// Función helper para formatear hash de contraseña para almacenamiento
// Formato: salt:hash
export const formatPasswordHash = (salt: string, hash: string): string => {
  return `${salt}:${hash}`;
};

// Función helper para parsear hash de contraseña almacenado
export const parsePasswordHash = (stored: string): { salt: string; hash: string } | null => {
  const parts = stored.split(':');
  if (parts.length === 2) {
    return { salt: parts[0], hash: parts[1] };
  }
  // Compatibilidad con contraseñas antiguas sin hash (retornar null para indicar que necesita rehash)
  return null;
};


