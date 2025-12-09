import { PreparedBook } from '../../interfaces';
import { CardBook } from '../products/CardBook';
import { PDFViewer } from '../products/PDFViewer';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

interface Props {
	title: string;
	books: PreparedBook[];
	noBooksMessage?: string;
	isAuthenticated?: boolean;
}

export const BookGrid = ({ title, books, noBooksMessage }: Props) => {
	const [selectedBook, setSelectedBook] = useState<PreparedBook | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { isAuthenticated } = useAuth();

	const handleViewDetails = (book: PreparedBook) => {
		if (!isAuthenticated) {
			return; // No abrir modal si no está autenticado
		}
		setSelectedBook(book);
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setSelectedBook(null);
	};

	// Filtrar solo libros físicos o virtuales
	const filteredBooks = books.filter(
		book => book.type === 'Físico' || book.type === 'Virtual'
	);

	return (
		<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32'>
			<h2 className='text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-12 md:text-4xl lg:text-5xl text-gray-800'>
				{title}
			</h2>

			{filteredBooks.length === 0 ? (
				<div className="text-center py-12 sm:py-16">
					<div className="text-gray-400 text-6xl mb-4">📚</div>
					<p className='text-gray-500 text-base sm:text-lg'>{noBooksMessage || 'No hay libros disponibles.'}</p>
				</div>
			) : (
				<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8'>
					{filteredBooks.map(book => (
						<div key={book.id} className="h-full">
							<CardBook
								img={book.coverImage}
								title={book.title}
								authors={book.authors}
								slug={book.slug}
								speciality={book.speciality}
								type={book.type as 'Fisico' | 'Virtual'}
								fragment={book.fragment}
								fileUrl={book.fileUrl}
								isAuthenticated={isAuthenticated}
								onViewDetails={() => handleViewDetails(book)}
								cantidadDisponible={book.cantidadDisponible}
							/>
						</div>
					))}
				</div>
			)}

			{/* Modal */}
			<AnimatePresence>
			{isModalOpen && selectedBook && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={handleCloseModal}
				>
					<motion.div
						className="bg-white rounded-lg shadow-lg max-w-4xl w-[95%] max-h-[90vh] p-4 sm:p-6 lg:p-8 relative flex flex-col items-center"
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={e => e.stopPropagation()}
					>
						<button
							onClick={handleCloseModal}
							className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl z-10"
						>
							&times;
						</button>
						{/* Título y visor PDF */}
						<h3 className="text-base sm:text-lg font-bold text-center w-full truncate mb-2 sm:mb-4">{selectedBook.title}</h3>
						
						{/* Contenido del modal */}
						<div className="w-full h-[50vh] sm:h-[60vh] lg:h-[65vh] mb-4 flex items-center justify-center relative">
							{/* Botón flotante para detalles */}
							<BookDetailsPopover book={selectedBook} />
							
							{/* Mostrar PDF si existe, sino mostrar mensaje */}
							{selectedBook.fileUrl ? (
								<PDFViewer fileUrl={selectedBook.fileUrl} isAuthenticated={isAuthenticated} />
							) : (
								<div className="text-center">
									<div className="text-red-500 text-6xl mb-4">📄</div>
									<p className="text-red-500 text-lg mb-2">Este libro no tiene PDF disponible</p>
									<p className="text-gray-600 text-sm">El PDF no está asociado a este libro en la base de datos</p>
								</div>
							)}
						</div>
						
						{/* Botones de acción - solo para usuarios autenticados */}
						{isAuthenticated && selectedBook.fileUrl && (
							<div className="flex items-center justify-center gap-4 mt-4">
								<button
									onClick={() => window.open(selectedBook.fileUrl, '_blank')}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
								>
									Abrir en nueva ventana
								</button>
								<a
									href={selectedBook.fileUrl}
									download
									className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
								>
									Descargar PDF
								</a>
							</div>
						)}
					</motion.div>
				</motion.div>
			)}
			</AnimatePresence>
		</div>
	);
};

// Popover de detalles del libro
function BookDetailsPopover({ book }: { book: PreparedBook }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
			<button
				className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full w-10 h-10 flex items-center justify-center shadow transition"
				onClick={() => setOpen(o => !o)}
				title="Ver detalles"
			>
				<span className="sr-only">Ver detalles</span>
				<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.22 }}
						className="mr-2 bg-white rounded-lg shadow-lg p-4 w-64 border border-gray-200 text-sm text-left right-full relative"
						style={{ left: 'auto', right: '100%' }}
					>
						{/* Flecha visual */}
						<span className="absolute top-1/2 right-[-3px] -translate-y-1/2 w-4 h-4">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<polygon points="0,8 16,0 16,16" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
							</svg>
						</span>
						<div className="font-bold text-base mb-1 truncate">{book.title}</div>
						<div className="mb-1"><span className="font-semibold">Tipo:</span> {book.type}</div>
						<div className="mb-1"><span className="font-semibold">Especialidad:</span> {book.speciality}</div>
						<div className="mb-1"><span className="font-semibold">Sinopsis:</span> <span className="block text-gray-600 max-h-24 overflow-y-auto whitespace-pre-line">{book.description?.content?.[0]?.content?.[0]?.text || 'Sin sinopsis.'}</span></div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
