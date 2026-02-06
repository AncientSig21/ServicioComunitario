import { useNavigate, useLocation } from 'react-router-dom';
import { FaBarsStaggered } from 'react-icons/fa6';
import { FaTachometerAlt } from 'react-icons/fa';
import { Logo } from './Logo';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationsBell } from './NotificationsBell';

const mainNavLinks: { id: number; title: string; href: string }[] = [
	{ id: 1, title: 'Inicio', href: '/' },
	{ id: 2, title: 'Anuncios', href: '/anuncios' },
	{ id: 3, title: 'Servicios', href: '/tesis' },
	{ id: 4, title: 'Foro', href: '/libros' },
];

export const Navbar = () => {
	const { user, isAuthenticated, logout, isConfigured, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [showMenu, setShowMenu] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const userMenuRef = useRef<HTMLDivElement>(null);

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

	const handleToggleMenu = () => setShowMenu(v => !v);

	const handleToggleMobileMenu = () => {
		setShowMobileMenu(!showMobileMenu);
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

	// Si está cargando, mostrar navbar básico (logo y placeholder perfil)
	if (loading) {
		return (
			<header className='bg-primary text-white py-4 flex items-center justify-between px-5 border-b border-primary-dark lg:px-12 shadow-lg'>
				<Logo />
				<div className='flex gap-5 items-center'>
					<div className='animate-pulse bg-secondary w-9 h-9 rounded-full' aria-hidden />
				</div>
			</header>
		);
	}

	return (
		<header className='bg-primary text-white py-3 sm:py-4 flex items-center justify-between px-3 sm:px-5 border-b border-primary-dark lg:px-12 shadow-lg'>
			<Logo />

			<nav className='space-x-3 sm:space-x-5 hidden md:flex' aria-label='Navegación principal'>
				{mainNavLinks.map(link => (
					<button
						key={link.id}
						onClick={() => handleNavLinkClick(link.href)}
						className={`transition-all duration-300 font-medium hover:text-secondary hover:underline bg-transparent border-none outline-none cursor-pointer text-white text-sm sm:text-base ${location.pathname === link.href ? 'text-secondary underline' : ''}`}
					>
						{link.title}
					</button>
				))}
			</nav>

			<div className='flex gap-3 sm:gap-5 items-center relative'>
				{isAuthenticated && user ? (
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
						{/* Campanita de notificaciones */}
						<NotificationsBell />
						{/* Clic en la inicial: ver mis datos / perfil (todo en este menú) */}
						<div className='relative'>
							<button
								onClick={handleToggleMenu}
								className='border-2 border-secondary w-9 h-9 rounded-full grid place-items-center text-base font-bold focus:outline-none text-secondary hover:bg-secondary hover:text-white transition-colors shadow-lg'
								title={`${user.nombre} - Clic para ver mis datos`}
							>
								{user.nombre.charAt(0).toUpperCase()}
							</button>
							{showMenu && (
								<div ref={userMenuRef} className='absolute right-0 mt-2 w-64 bg-white border-2 border-secondary rounded-lg shadow-2xl p-3 z-50'>
									<div className="border-b border-gray-200 pb-2 mb-2">
										<h3 className="font-bold text-base text-primary mb-1">Mis datos / Perfil</h3>
									</div>
									<div className="space-y-1 mb-3">
										<p className='font-semibold text-gray-700 text-sm'>Nombre: <span className='font-normal text-gray-900'>{user.nombre}</span></p>
										<p className='font-semibold text-gray-700 text-sm'>Email: <span className='font-normal break-words text-gray-900'>{user.correo}</span></p>
										{user.numeroApartamento && (
											<p className='font-semibold text-gray-700 text-sm'>Número de Casa: <span className='font-normal text-gray-900'>{user.numeroApartamento}</span></p>
										)}
										{user.rol && (
											<p className='font-semibold text-gray-700 text-sm'>Rol: <span className='font-normal text-gray-900 capitalize'>{user.rol}</span></p>
										)}
										{(user.estado ?? (user as { Estado?: string }).Estado) && (
											<p className='font-semibold text-gray-700 text-sm'>Estado: <span className={`font-normal ${((user as { Estado?: string }).Estado ?? user.estado) === 'Moroso' ? 'text-red-600' : 'text-green-600'}`}>{(user as { Estado?: string }).Estado ?? user.estado}</span></p>
										)}
									</div>
									<button
										onClick={() => {
											navigate('/perfil');
											setShowMenu(false);
										}}
										className='w-full bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 transition text-xs font-medium mb-2'
									>
										Ir a Perfil (editar)
									</button>
									<button
										onClick={handleLogout}
										className='w-full bg-secondary text-white py-1.5 px-3 rounded hover:bg-secondary-dark transition text-xs font-medium'
									>
										Cerrar sesión
									</button>
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
						{mainNavLinks.map(link => (
							<button
								key={link.id}
								onClick={() => handleNavLinkClick(link.href)}
								className={`${location.pathname === link.href ? 'text-secondary underline' : ''} text-lg font-semibold text-left`}
							>
								{link.title}
							</button>
						))}
					</div>
				</div>
			)}
		</header>
	);
};
