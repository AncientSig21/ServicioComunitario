import { JSONContent } from '@tiptap/react';

export interface PreparedBook {
	id: number;
	title: string;
	author: string;
	authors: string; // <-- Agregado para múltiples autores
	slug: string;
	features: string[]; // Ej: ['Filosofía', 'Infantil']
	description: JSONContent;
	coverImage: string; // Portada
	created_at: string;
	price?: number; // Opcional si mostrarás "Gratis" o algún precio simbólico
	// Nuevos campos:
	type: 'Físico' | 'Virtual' | 'Tesis' | (string & {});
	speciality: string;
	fragment?: string; // Fragmento de la primera página
	fileUrl?: string; // URL del archivo para descargar
	cantidadDisponible?: number; // Cantidad de ejemplares físicos disponibles
	sinopsis?: string; // Sinopsis del libro
}

export interface TesisBook extends PreparedBook {
  type: 'Tesis';
}
