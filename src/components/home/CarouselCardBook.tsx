import { useState } from 'react';

interface Props {
	img: string;
	title: string;
	authors: string;
	price?: number;
	slug: string;
	speciality: string;
	type: string;
	fragment?: string;
	fileUrl?: string;
	onViewDetails?: () => void; // Visualizar PDF
	onShowDetails?: () => void; // Ver detalles
	onReserve?: () => void; // Reservar libro físico
	cantidadDisponible?: number; // Cantidad de ejemplares físicos disponibles
	hasActiveOrder?: boolean; // Si el usuario ya tiene una orden activa para este libro
	isAuthenticated?: boolean; // Si el usuario está autenticado
}

export const CarouselCardBook = ({ img, title, speciality, type, fragment, fileUrl, onViewDetails, onShowDetails, onReserve, cantidadDisponible, hasActiveOrder = false, isAuthenticated = false }: Props) => {
	const [showNoPdf, setShowNoPdf] = useState(false);
	const [showAuthMessage, setShowAuthMessage] = useState(false);
	let hideTimeout: NodeJS.Timeout;

	const isFisico = type === 'Fisico' || type === 'Físico' || type === 'Fisico y Virtual';
	const noDisponibles = isFisico && (cantidadDisponible === 0 || cantidadDisponible === undefined || cantidadDisponible < 0);
	const yaTieneOrden = isFisico && hasActiveOrder;
	const botonDeshabilitado = noDisponibles || yaTieneOrden;

	const handleViewDetails = () => {
		if (!isAuthenticated) {
			setShowAuthMessage(true);
			clearTimeout(hideTimeout);
			hideTimeout = setTimeout(() => setShowAuthMessage(false), 3000);
			return;
		}

		// Para libros de tipo "Fisico" (solo físico), mostrar modal especial
		if (type === 'Fisico' || type === 'Físico') {
			if (onShowDetails) {
				onShowDetails();
			}
			return;
		}

		// Para otros tipos, mostrar PDF si existe
		if (fileUrl && onViewDetails) {
			onViewDetails();
		} else {
			setShowNoPdf(true);
			clearTimeout(hideTimeout);
			hideTimeout = setTimeout(() => setShowNoPdf(false), 2000);
		}
	};

	return (
		<div className='flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden max-w-[200px] mx-auto'>
			{/* Imagen del libro - altura reducida */}
			<div className='relative w-full aspect-[3/4] bg-gray-50 flex items-center justify-center p-2'>
				<img
					src={img}
					alt={title}
					className='object-contain max-h-full max-w-full'
				/>
			</div>

			{/* Contenido de la tarjeta */}
			<div className='flex flex-col flex-1 p-3 gap-2'>
				{/* Título */}
				<h3 className='text-xs font-semibold text-gray-800 text-center line-clamp-2 leading-tight'>
					{title}
				</h3>

				{/* Información del libro */}
				<div className='flex flex-col gap-1 text-[10px] text-gray-600'>
					<p className='text-center'><span className='font-medium'>Especialidad:</span> {speciality}</p>
					<p className='text-center'><span className='font-medium'>Tipo:</span> {type}</p>
					{isFisico && (
						<p className='text-center'><span className='font-medium'>Disponibles:</span> {cantidadDisponible ?? 'N/D'}</p>
					)}
				</div>

				{/* Fragmento (si existe) */}
				{fragment && (
					<p className='text-[8px] text-gray-400 text-center line-clamp-1' title={fragment}>
						Fragmento: {fragment.slice(0, 20)}...
					</p>
				)}

				{/* Botones - siempre al final */}
				<div className='flex flex-col gap-1 mt-auto'>
					{/* Botón Visualizar */}
					<button
						onClick={handleViewDetails}
						className={`px-2 py-1 rounded text-[10px] font-medium transition-colors w-full ${
							isAuthenticated 
								? 'bg-green-600 text-white hover:bg-green-700' 
								: 'bg-gray-400 text-gray-600 cursor-not-allowed'
						}`}
						disabled={!isAuthenticated}
					>
						{isAuthenticated ? 'Visualizar' : 'Inicia sesión'}
					</button>

					{/* Botón Reservar solo si es físico */}
					{isFisico && (
						<button
							className={`px-2 py-1 rounded text-[10px] font-medium transition-colors w-full ${
								botonDeshabilitado 
									? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
									: 'bg-blue-600 text-white hover:bg-blue-700'
							}`}
							onClick={onReserve}
							disabled={botonDeshabilitado}
						>
							{yaTieneOrden ? 'Ya Reservado' : 'Reservar'}
						</button>
					)}

					{/* Mensajes de estado */}
					{noDisponibles && (
						<p className='text-[8px] text-red-600 text-center'>No hay ejemplares disponibles</p>
					)}
					{yaTieneOrden && (
						<p className='text-[8px] text-orange-600 text-center'>Orden activa</p>
					)}
				</div>
			</div>

			{/* Tooltip para PDF no disponible */}
			{showNoPdf && (
				<div className="absolute left-1/2 -translate-x-1/2 -top-10 bg-gray-800 text-white text-[10px] rounded px-2 py-1 shadow-lg z-20 animate-fade-in">
					Este libro no cuenta con un PDF para visualizar.
					<span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></span>
				</div>
			)}

			{/* Tooltip para usuario no autenticado */}
			{showAuthMessage && (
				<div className="absolute left-1/2 -translate-x-1/2 -top-10 bg-red-600 text-white text-[10px] rounded px-2 py-1 shadow-lg z-20 animate-fade-in">
					Debes iniciar sesión para visualizar este libro.
					<span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45"></span>
				</div>
			)}
		</div>
	);
}; 