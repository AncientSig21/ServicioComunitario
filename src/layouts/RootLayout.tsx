import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/shared/Navbar';
import { Footer } from '../components/shared/Footer';
import { Banner } from '../components/home/Banner';
import { useAuth } from '../hooks/useAuth';
import MorosoBlock from '../components/shared/MorosoBlock';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { ReservationProvider } from '../contexts/ReservationContext';
import { ToastProvider } from '../contexts/ToastContext';

export const RootLayout = () => {
	const { pathname } = useLocation();
	const { user, isUserMoroso, loading } = useAuth();

	// Si el usuario está cargando, mostrar loading
	if (loading) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
					<p className="mt-4 text-gray-600">Cargando aplicación...</p>
				</div>
			</div>
		);
	}

	// Nota: Ya no bloqueamos la aplicación si Supabase no está configurado
	// Ahora funciona en modo simulado usando localStorage

	// Si el usuario está autenticado y es moroso, mostrar bloqueo
	if (user && isUserMoroso()) {
		return <MorosoBlock user={user} />;
	}

	return (
		<ToastProvider>
			<ReservationProvider>
				<div className='h-screen flex flex-col font-montserrat bg-white'>
					<Navbar />

					{pathname === '/' && <Banner />}

					<main className='flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto my-8 bg-white'>
						<Outlet />
					</main>
					<Footer />
					<ScrollToTop />
				</div>
			</ReservationProvider>
		</ToastProvider>
	);
};
