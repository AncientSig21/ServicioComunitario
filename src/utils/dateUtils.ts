/**
 * Utilidades para manejo de fechas en la aplicación
 */

/**
 * Obtiene la fecha actual en formato ISO string con zona horaria local
 * @returns string - Fecha en formato ISO string
 */
export const getCurrentLocalISOString = (): string => {
  const now = new Date();
  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
};

/**
 * Formatea una fecha ISO string a formato legible DD/MM/YYYY HH:mm
 * @param isoString - Fecha en formato ISO string
 * @returns string - Fecha formateada
 */
export const formatDateTime = (isoString: string | null): string => {
  if (!isoString) return 'Sin fecha';
  
  try {
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * Formatea una fecha ISO string a formato legible DD/MM/YYYY (solo fecha)
 * @param isoString - Fecha en formato ISO string
 * @returns string - Fecha formateada
 */
export const formatDate = (isoString: string | null): string => {
  if (!isoString) return 'Sin fecha';
  
  try {
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * Verifica si una fecha es válida
 * @param isoString - Fecha en formato ISO string
 * @returns boolean - true si la fecha es válida
 */
export const isValidDate = (isoString: string | null): boolean => {
  if (!isoString) return false;
  
  try {
    const date = new Date(isoString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}; 