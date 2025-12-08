import { PreparedBook } from '../../interfaces';
import { CarouselCardBook } from './CarouselCardBook';
import { PDFViewer } from '../products/PDFViewer';
import { PhysicalBookModal } from '../products/PhysicalBookModal';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

interface Props {
	title: string;
	books: PreparedBook[];
	noBooksMessage?: string;
	isAuthenticated?: boolean;
}

export const BookCarousel = ({ title, books, noBooksMessage }: Props) => {
	const [selectedBook, setSelectedBook] = useState<PreparedBook | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isPhysicalBookModalOpen, setIsPhysicalBookModalOpen] = useState(false);
	const [currentSlide, setCurrentSlide] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);
	const [progress, setProgress] = useState(0);
	const { isAuthenticated } = useAuth();

	// Filtrar solo libros físicos o virtuales y tomar 9 aleatorios
	const filteredBooks = useMemo(() => {
		const filtered = books.filter(
			book => book.type === 'Físico' || book.type === 'Virtual' || book.type === 'Fisico y Virtual'
		);
		// Mezclar aleatoriamente y tomar solo 9
		return filtered
			.sort(() => Math.random() - 0.5)
			.slice(0, 9);
	}, [books]);

	const totalSlides = 3; // 9 libros ÷ 3 = 3 páginas

	// Calcular libros de la página actual
	const currentPageBooks = useMemo(() => {
		const startIndex = currentSlide * 3;
		const endIndex = startIndex + 3;
		return filteredBooks.slice(startIndex, endIndex);
	}, [filteredBooks, currentSlide]);

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

	const handleClosePhysicalBookModal = () => {
		setIsPhysicalBookModalOpen(false);
		setSelectedBook(null);
	};

	const goToSlide = (slideIndex: number) => {
		setCurrentSlide(slideIndex);
	};

	const nextSlide = useCallback(() => {
		setCurrentSlide((prev) => (prev + 1) % totalSlides);
	}, [totalSlides]);

	const prevSlide = useCallback(() => {
		setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
	}, [totalSlides]);

	// Auto-play functionality
	useEffect(() => {
		if (!isAutoPlaying) {
			setProgress(0);
			return;
		}

		const duration = 5000; // 5 segundos
		const interval = 50; // Actualizar cada 50ms para animación suave
		let elapsed = 0;

		const timer = setInterval(() => {
			elapsed += interval;
			const newProgress = (elapsed / duration) * 100;
			
			if (elapsed >= duration) {
				nextSlide();
				elapsed = 0;
				setProgress(0);
			} else {
				setProgress(newProgress);
			}
		}, interval);

		return () => clearInterval(timer);
	}, [isAutoPlaying, nextSlide]);

	// Pausar auto-play cuando el usuario interactúa
	const handleUserInteraction = useCallback(() => {
		setIsAutoPlaying(false);
		setProgress(0);
		// Reanudar auto-play después de 10 segundos de inactividad
		setTimeout(() => setIsAutoPlaying(true), 10000);
	}, []);

	return (
		<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32'>
			<h2 className='text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-12 md:text-4xl lg:text-5xl text-gray-800'>
				{title}
			</h2>

			{filteredBooks.length === 0 ? (
				<div className="text-center py-12 sm:py-16">
					<div className="text-gray-400 text-6xl mb-4">📄</div>
					<p className='text-gray-500 text-base sm:text-lg'>{noBooksMessage || 'No hay documentos disponibles.'}</p>
				</div>
			) : (
				<div className="relative">
					{/* Botón de navegación izquierdo */}
					<button
						onClick={() => {
							prevSlide();
							handleUserInteraction();
						}}
						className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110"
						aria-label="Página anterior"
					>
						<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>

					{/* Botón de navegación derecho */}
					<button
						onClick={() => {
							nextSlide();
							handleUserInteraction();
						}}
						className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110"
						aria-label="Página siguiente"
					>
						<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</button>

					{/* Contenedor del carrusel */}
					<div className="relative overflow-hidden">
						<AnimatePresence mode="wait">
							<motion.div
								key={currentSlide}
								initial={{ opacity: 0, x: 100 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -100 }}
								transition={{ duration: 0.4, ease: "easeInOut" }}
								className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 justify-center max-w-4xl mx-auto"
							>
								{currentPageBooks.map((book, index) => (
									<motion.div
										key={book.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ 
											duration: 0.3, 
											ease: "easeInOut",
											delay: index * 0.1 
										}}
										className="h-full"
									>
										<CarouselCardBook
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
											onShowDetails={() => {
												setSelectedBook(book);
												setIsPhysicalBookModalOpen(true);
											}}
											cantidadDisponible={book.cantidadDisponible}
										/>
									</motion.div>
								))}
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Indicadores de página */}
					<div className="flex justify-center mt-8 gap-2">
						{Array.from({ length: totalSlides }, (_, index) => (
							<div key={index} className="relative">
								<button
									onClick={() => {
										goToSlide(index);
										handleUserInteraction();
									}}
									className={`w-3 h-3 rounded-full transition-all duration-200 ${
										currentSlide === index 
											? 'bg-blue-600 scale-110' 
											: 'bg-gray-300 hover:bg-gray-400'
									}`}
									aria-label={`Ir a página ${index + 1}`}
								/>
								{/* Barra de progreso para el indicador activo */}
								{currentSlide === index && isAutoPlaying && (
									<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gray-200 rounded-full overflow-hidden">
										<motion.div
											className="h-full bg-blue-600"
											initial={{ width: 0 }}
											animate={{ width: `${progress}%` }}
											transition={{ duration: 0.05, ease: "linear" }}
										/>
									</div>
								)}
							</div>
						))}
					</div>

					{/* Botón "Ver más" */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.5 }}
						className="flex justify-center mt-8"
					>
						<Link
							to="/anuncios"
							className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
						>
							Ver eventos
							<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</Link>
					</motion.div>
				</div>
			)}

			{/* Modal para libros físicos */}
			<PhysicalBookModal
				isOpen={isPhysicalBookModalOpen}
				onClose={handleClosePhysicalBookModal}
				book={selectedBook}
				onReserve={() => {
					// Aquí podrías agregar la lógica de reserva si es necesaria
					handleClosePhysicalBookModal();
				}}
				hasActiveOrder={false} // Por simplicidad en el carrusel
				cantidadDisponible={selectedBook?.cantidadDisponible}
				isAuthenticated={isAuthenticated}
			/>

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