import { NavLink, useNavigate } from 'react-router-dom';
import { navbarLinks } from '../../constants/links';
import {
	HiOutlineSearch,
	HiOutlineBookOpen,
} from 'react-icons/hi';
import { FaBarsStaggered } from 'react-icons/fa6';
import { FaTachometerAlt } from 'react-icons/fa';
import { Logo } from './Logo';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCallback } from 'react';
import { fetchBooks } from '../../services/bookService';
import { AnimatePresence, motion } from 'framer-motion';
import { useReservationContext } from '../../contexts/ReservationContext';
import { formatDate } from '../../utils/dateUtils';

export const Navbar = () => {
	const { user, isAuthenticated, logout, isConfigured, loading } = useAuth();
	const { refreshReservations } = useReservationContext();
	const navigate = useNavigate();
	const [showMenu, setShowMenu] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [showPrestamos, setShowPrestamos] = useState(false);
	const [prestamos, setPrestamos] = useState<any[]>([]);
	const userMenuRef = useRef<HTMLDivElement>(null);
	const prestamosMenuRef = useRef<HTMLDivElement>(null);
	// Estado para el buscador
	const [showSearch, setShowSearch] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [allBooks, setAllBooks] = useState<any[]>([]);
	const [suggestions, setSuggestions] = useState<any[]>([]);
	const [loadingSuggestions, setLoadingSuggestions] = useState(false);

	// Cargar historial de solicitudes desde la base de datos
	useEffect(() => {
		if (user) {
			const fetchPrestamos = async () => {
				try {
					// En modo simulado, no hay órdenes de libros, así que usamos un array vacío
					// Esto se puede adaptar más adelante para mostrar solicitudes de servicios
					setPrestamos([]);
				} catch (error) {
					console.error('Error:', error);
				}
			};

			fetchPrestamos();
		}
	}, [user?.id, refreshReservations()]);

	useEffect(() => {
		if (!showMenu) return;
		function handleClickOutside(event: MouseEvent) {
			if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showMenu]);

	useEffect(() => {
		if (!showMobileMenu) return;
		function handleClickOutsideMobile(event: MouseEvent) {
			const target = event.target as Node;
			const mobileMenu = document.querySelector('[data-mobile-menu]');
			if (mobileMenu && !mobileMenu.contains(target)) {
				setShowMobileMenu(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutsideMobile);
		return () => document.removeEventListener('mousedown', handleClickOutsideMobile);
	}, [showMobileMenu]);

	useEffect(() => {
		if (!showPrestamos) return;
		function handleClickOutsideDownloads(event: MouseEvent) {
			if (prestamosMenuRef.current && !prestamosMenuRef.current.contains(event.target as Node)) {
				setShowPrestamos(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutsideDownloads);
		return () => document.removeEventListener('mousedown', handleClickOutsideDownloads);
	}, [showPrestamos]);

	// Función para manejar la búsqueda
	const handleSearch = useCallback(() => {
		if (searchValue.trim() !== '') {
			navigate(`/libros?search=${encodeURIComponent(searchValue.trim())}`);
			setShowSearch(false);
			setSearchValue('');
		}
	}, [searchValue, navigate]);

	// Enfocar el input cuando se muestre
	useEffect(() => {
		if (showSearch && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [showSearch]);

	// Cargar todos los documentos al abrir el buscador
	useEffect(() => {
		if (showSearch && allBooks.length === 0) {
			setLoadingSuggestions(true);
			fetchBooks().then(data => {
				setAllBooks(data);
				setLoadingSuggestions(false);
			});
		}
	}, [showSearch, allBooks.length]);

	// Filtrar sugerencias en tiempo real
	useEffect(() => {
		if (searchValue.trim() === '') {
			setSuggestions([]);
			return;
		}
		const normalize = (str: string) =>
			(str || '')
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/\s+/g, ' ')
				.trim();
		const query = normalize(searchValue);
		const filtered = allBooks.filter(book =>
			normalize(book.title).includes(query)
		);
		setSuggestions(filtered.slice(0, 6)); // máximo 6 sugerencias
	}, [searchValue, allBooks]);

	const handleToggleMenu = () => {
		setShowMenu(v => {
			if (!v) setShowPrestamos(false);
			return !v;
		});
	};

	const handleToggleMobileMenu = () => {
		setShowMobileMenu(!showMobileMenu);
	};

	const handleTogglePrestamos = () => {
		setShowPrestamos(v => {
			if (!v) setShowMenu(false);
			return !v;
		});
	};

	// Función para obtener el color del estado
	const getEstadoColor = (estado: string) => {
		switch (estado) {
			case 'Pendiente de buscar':
				return 'text-yellow-600';
			case 'Prestado':
				return 'text-blue-600';
			case 'Completado':
				return 'text-green-600';
			case 'Cancelado':
				return 'text-gray-600';
			case 'Moroso':
				return 'text-red-600';
			default:
				return 'text-gray-600';
		}
	};

	const handleLogout = () => {
		logout();
		navigate('/');
		setShowMenu(false);
	};

	const handleLogin = () => {
		navigate('/login');
	};

	// Función para scroll animado al navegar
	const handleNavLinkClick = (to: string) => {
		navigate(to);
		window.scrollTo({ top: 0, behavior: 'smooth' });
		setShowMenu(false);
		setShowMobileMenu(false);
	};

	// Si está cargando, mostrar navbar básico
	if (loading) {
		return (
			<header className='bg-primary text-white py-4 flex items-center justify-between px-5 border-b border-primary-dark lg:px-12 shadow-lg'>
				<Logo />
				<nav className='space-x-5 hidden md:flex'>
					{navbarLinks.map(link => (
						<NavLink
							key={link.id}
							to={link.href}
							className={({ isActive }) =>
								`${isActive ? 'text-secondary underline' : ''} transition-all duration-300 font-medium hover:text-secondary hover:underline `
							}
						>
							{link.title}
						</NavLink>
					))}
				</nav>
				<div className='flex gap-5 items-center'>
					<button onClick={() => setShowSearch(v => !v)} className='text-white hover:text-secondary transition-colors'>
						<HiOutlineSearch size={25} />
					</button>
					{showSearch && (
						<input
							type='text'
							className='border border-gray-300 rounded px-2 py-1 ml-2 text-gray-800 placeholder-gray-500 bg-white focus:ring-2 focus:ring-secondary focus:border-secondary transition-all'
							placeholder='Buscar documento o anuncio...'
							value={searchValue}
							onChange={e => setSearchValue(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									handleSearch();
								}
							}}
							ref={searchInputRef}
						/>
					)}
					<div className='animate-pulse bg-secondary w-9 h-9 rounded-full'></div>
				</div>
			</header>
		);
	}

	return (
		<header className='bg-primary text-white py-3 sm:py-4 flex items-center justify-between px-3 sm:px-5 border-b border-primary-dark lg:px-12 shadow-lg'>
			<Logo />

			<nav className='space-x-3 sm:space-x-5 hidden md:flex'>
				{navbarLinks.map(link => (
					<button
						key={link.id}
						onClick={() => handleNavLinkClick(link.href)}
						className={`transition-all duration-300 font-medium hover:text-secondary hover:underline bg-transparent border-none outline-none cursor-pointer text-white text-sm sm:text-base ${window.location.pathname === link.href ? 'text-secondary underline' : ''}`}
					>
						{link.title}
					</button>
				))}
			</nav>

			<div className='flex gap-3 sm:gap-5 items-center relative'>
				<button onClick={() => setShowSearch(v => !v)} className='text-white hover:text-secondary transition-colors'>
					<HiOutlineSearch size={25} />
				</button>
				<AnimatePresence>
					{showSearch && (
						<motion.div
							className='relative'
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.18 }}
						>
							<input
								type='text'
								className='border border-gray-300 rounded px-2 py-1 ml-2 text-gray-800 placeholder-gray-500 bg-white focus:ring-2 focus:ring-secondary focus:border-secondary transition-all'
								placeholder='Buscar documento o anuncio...'
								value={searchValue}
								onChange={e => setSearchValue(e.target.value)}
								onKeyDown={e => {
									if (e.key === 'Enter') {
										handleSearch();
									}
								}}
								ref={searchInputRef}
							/>
							{/* Dropdown de sugerencias */}
							<AnimatePresence>
								{(suggestions.length > 0 || loadingSuggestions) && (
									<motion.ul
										initial={{ opacity: 0, y: -8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.18 }}
										className='absolute left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto'
									>
										{loadingSuggestions ? (
											<li className='p-3 text-gray-500 text-sm flex items-center gap-2'>
												<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-secondary'></div>
												Cargando...
											</li>
										) : suggestions.length === 0 ? null : suggestions.map(book => (
											<li
												key={book.id}
												className='p-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-800 border-b border-gray-100 last:border-b-0 transition-colors'
												onClick={() => {
													const type = (book.type || '').toLowerCase();
													const isTesis = [
														'tesis',
														'pasantía',
														'pasantias',
														'servicio comunitario'
													].some(t => type.includes(t));
													const path = isTesis ? '/tesis' : '/libros';
													navigate(`${path}?carrera=${encodeURIComponent(book.speciality || '')}`);
													setShowSearch(false);
													setSearchValue('');
												}}
											>
												<div className='font-medium text-gray-900'>{book.title}</div>
												{book.speciality && (
													<div className='text-xs text-gray-500 mt-1'>{book.speciality}</div>
												)}
											</li>
										))}
									</motion.ul>
								)}
							</AnimatePresence>
						</motion.div>
					)}
				</AnimatePresence>

				{isConfigured && isAuthenticated && user ? (
					<>
						{/* Botón para admin: Ir al dashboard */}
						{(user.rol === 'admin' || user.rol === 'Administrador') && (
							<button
								title="Ir al Dashboard"
								onClick={() => navigate('/admin')}
								className="p-2 rounded-full hover:bg-secondary hover:bg-opacity-20 transition-colors"
							>
								<FaTachometerAlt size={22} className="text-secondary" />
							</button>
						)}
						<div className='relative'>
							{/* User Nav */}
							<button
								onClick={handleToggleMenu}
								className='border-2 border-secondary w-9 h-9 rounded-full grid place-items-center text-base font-bold focus:outline-none text-secondary hover:bg-secondary hover:text-white transition-colors shadow-lg'
								title={`${user.nombre} - Click para ver perfil`}
							>
								{user.nombre.charAt(0).toUpperCase()}
							</button>
							{showMenu && (
								<div ref={userMenuRef} className='absolute right-0 mt-2 w-64 bg-white border-2 border-secondary rounded-lg shadow-2xl p-3 z-50'>
									<div className="border-b border-gray-200 pb-2 mb-2">
										<h3 className="font-bold text-base text-primary mb-1">Perfil de Usuario</h3>
									</div>
									<div className="space-y-1 mb-3">
										<p className='font-semibold text-gray-700 text-sm'>Nombre: <span className='font-normal text-gray-900'>{user.nombre}</span></p>
										<p className='font-semibold text-gray-700 text-sm'>Email: <span className='font-normal break-words text-gray-900'>{user.correo}</span></p>
									{user.escuela && (
											<p className='font-semibold text-gray-700 text-sm'>Escuela: <span className='font-normal text-gray-900'>{user.escuela}</span></p>
									)}
										{user.rol && (
											<p className='font-semibold text-gray-700 text-sm'>Rol: <span className='font-normal text-gray-900 capitalize'>{user.rol}</span></p>
										)}
										{user.estado && (
											<p className='font-semibold text-gray-700 text-sm'>Estado: <span className={`font-normal ${user.estado === 'Moroso' ? 'text-red-600' : 'text-green-600'}`}>{user.estado}</span></p>
										)}
									</div>
									<button
										onClick={handleLogout}
										className='w-full bg-secondary text-white py-1.5 px-3 rounded hover:bg-secondary-dark transition text-xs font-medium'
									>
										Cerrar sesión
									</button>
								</div>
							)}
						</div>

						<div className='relative'>
							<button className='relative' onClick={handleTogglePrestamos}>
								<span className='absolute -bottom-2 -right-2 w-5 h-5 grid place-items-center bg-black text-white text-xs rounded-full'>
									{prestamos.length}
								</span>
								<HiOutlineBookOpen size={25} />
							</button>
							{showPrestamos && (
								<div ref={prestamosMenuRef} className='absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded shadow-lg p-4 z-50'>
									<p className='font-semibold mb-2 text-black'>Historial de solicitudes</p>
									{prestamos.length === 0 ? (
										<p className='text-gray-500 text-sm'>No has realizado ninguna solicitud.</p>
									) : (
										<ul className='max-h-48 overflow-y-auto'>
											{prestamos.map(p => (
												<li key={p.id} className='text-sm py-2 border-b last:border-b-0'>
													<div className='font-medium text-gray-800 mb-1'>
														{p.Libros?.titulo || 'Solicitud no disponible'}
													</div>
													<div className='flex items-center justify-between'>
														<span className={`text-xs font-medium ${getEstadoColor(p.estado)}`}>
															{p.estado}
														</span>
														<span className='text-gray-500 text-xs'>
															{formatDate(p.fecha_reserva)}
														</span>
													</div>
												</li>
											))}
										</ul>
									)}
								</div>
							)}
						</div>
					</>
				) : (
					<div className="flex items-center gap-3">
					<button
						onClick={handleLogin}
							className='bg-secondary text-white py-2 px-4 rounded hover:bg-secondary-dark transition font-medium'
					>
						Iniciar sesión
					</button>
						{!isConfigured && (
							<span className="text-yellow-300 text-xs bg-yellow-800 px-2 py-1 rounded">
								Configuración pendiente
							</span>
						)}
					</div>
				)}
			</div>

			<button className='md:hidden' onClick={handleToggleMobileMenu}>
				<FaBarsStaggered size={25} />
			</button>

			{/* Menú desplegable mobile */}
			{showMobileMenu && (
				<div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-end md:hidden">
					<div data-mobile-menu className="w-2/3 max-w-xs bg-white h-full shadow-lg p-6 flex flex-col gap-6 animate-slide-in">
						<button onClick={() => setShowMobileMenu(false)} className="self-end text-2xl text-gray-500 mb-4">&times;</button>
						<button onClick={() => handleNavLinkClick('/')} className={`${window.location.pathname === '/' ? 'text-secondary underline' : ''} text-lg font-semibold`}>Inicio</button>
						<button onClick={() => handleNavLinkClick('/libros')} className={`${window.location.pathname === '/libros' ? 'text-secondary underline' : ''} text-lg font-semibold`}>Documentos y Anuncios</button>
						<button onClick={() => handleNavLinkClick('/tesis')} className={`${window.location.pathname === '/tesis' ? 'text-secondary underline' : ''} text-lg font-semibold`}>Servicios</button>
					</div>
				</div>
			)}
		</header>
	);
};
