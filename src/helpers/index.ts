import { PreparedBook } from '../interfaces';

export const prepareBooks = (rawBooks: unknown[]): PreparedBook[] => {
	return rawBooks.map(book => {
		const b = book as any; // Si no hay un tipo mejor, usa 'as any' solo internamente
		return {
			id: b.id,
			title: b.title,
			author: b.author,
			authors: b.authors ?? b.author ?? '', // Campo requerido por la interfaz
			slug: b.slug,
			features: b.features ?? [],
			description: b.description,
			coverImage: b.coverImage ?? b.images?.[0] ?? '',
			created_at: b.created_at,
			price: b.price ?? 0,

			// Nuevos campos:
			type: b.type ?? 'Físico', // valor por defecto si falta
			speciality: b.speciality ?? 'Ingeniería en Sistemas', // valor por defecto si falta
			fragment: b.fragment, // <-- Agregado para que el fragmento llegue al modal
			fileUrl: b.fileUrl,
			sinopsis: b.sinopsis,
			cantidadDisponible: b.cantidadDisponible,
		};
	});
};
