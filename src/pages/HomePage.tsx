import { useState, useEffect } from 'react';
import { Brands } from '../components/home/Brands';
import { FeatureGrid } from '../components/home/FeatureGrid';
import { AnunciosCarousel } from '../components/home/AnunciosCarousel';
import { PaymentRequestModal } from '../components/payments/PaymentRequestModal';
import { useAuth } from '../hooks/useAuth';
import { fetchPagos, getTasaParaPagos, getMontoDisplay, formatMontoUsd } from '../services/bookService';
import { fetchTasaEnTiempoReal } from '../services/exchangeRateService';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface PagoPendiente {
  id: number;
  concepto: string;
  monto: number;
  monto_usd?: number | null;
  estado: string;
  created_at: string;
}

export const HomePage = () => {
	const { isAuthenticated, user } = useAuth();
	const [showPaymentModal, setShowPaymentModal] = useState(false);
	const [pagosPendientes, setPagosPendientes] = useState<PagoPendiente[]>([]);
	const [tasaPagos, setTasaPagos] = useState<number>(0);
	const [, setLoadingPagos] = useState(false);

	useEffect(() => {
		if (isAuthenticated && user?.id) {
			cargarPagosPendientes();
		}
	}, [isAuthenticated, user]);

	// Recargar pagos pendientes cuando la página vuelve a estar visible
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden && isAuthenticated && user?.id) {
				cargarPagosPendientes();
			}
		};

		const handleFocus = () => {
			if (isAuthenticated && user?.id) {
				cargarPagosPendientes();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleFocus);

		return () => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('focus', handleFocus);
		};
	}, [isAuthenticated, user?.id]);

	const cargarPagosPendientes = async () => {
		if (!user?.id) return;
		try {
			setLoadingPagos(true);
			// Misma lógica que PagosPage: obtener pagos y tasa en paralelo para montos consistentes
			const [pagos, tasaResult] = await Promise.all([
				fetchPagos({ usuario_id: user.id }),
				fetchTasaEnTiempoReal({ guardarEnBD: false }).then(r => r.tasa).catch(() => getTasaParaPagos()),
			]);
			setTasaPagos(tasaResult);

			// Filtrar explícitamente para excluir pagos completados (pagado) y rechazados
			// Solo mostrar pagos que están pendientes de revisión
			const pagosFiltrados: PagoPendiente[] = (pagos || [])
				.filter((pago: any) => {
					const estado = (pago.estado || '').toLowerCase();
					const montoPagado = (pago.abono !== undefined && pago.abono !== null)
						? parseFloat(pago.abono.toString())
						: ((pago.monto_pagado !== undefined && pago.monto_pagado !== null) ? parseFloat(pago.monto_pagado.toString()) : 0);
					const montoUsd = pago.monto_usd ?? null;
					const montoTotal = (montoUsd != null && montoUsd > 0 && tasaResult > 0)
						? montoUsd * tasaResult
						: parseFloat((pago.monto || 0).toString());

					if (estado === 'pagado' || (montoPagado >= montoTotal && montoTotal > 0)) return false;
					if (estado === 'rechazado') return false;
					return estado === 'pendiente' || estado === 'vencido' || estado === 'parcial';
				})
				.map((pago: any): PagoPendiente => ({
					id: pago.id,
					concepto: pago.concepto || '',
					monto: parseFloat((pago.monto || 0).toString()),
					monto_usd: pago.monto_usd ?? null,
					estado: pago.estado || 'pendiente',
					created_at: pago.created_at || new Date().toISOString(),
				}));

			setPagosPendientes(pagosFiltrados.slice(0, 3)); // Mostrar máximo 3 pagos pendientes
		} catch (error) {
			console.error('Error cargando pagos pendientes:', error);
		} finally {
			setLoadingPagos(false);
		}
	};

	const formatMonto = (monto: number) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: 'VES',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(monto);
	};

	return (
		<div>
			<FeatureGrid />

			<Brands />

			{/* Sección de pagos - Solo para usuarios autenticados */}
			{isAuthenticated && (
				<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32">
					<div className="max-w-4xl mx-auto">
						{/* Pagos pendientes */}
						{pagosPendientes.length > 0 && (
							<div className="mb-6">
								<h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
									⏳ Pagos Pendientes de Revisión
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{pagosPendientes.map((pago) => (
										<motion.div
											key={pago.id}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm"
										>
											<div className="flex items-start justify-between mb-2">
												<h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
													{pago.concepto}
												</h4>
												<span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
													Pendiente
												</span>
											</div>
											<p className="text-lg font-bold text-gray-900 mb-2">
												{formatMonto(getMontoDisplay(pago, tasaPagos))}
												{pago.monto_usd != null && pago.monto_usd > 0 && (
													<span className="text-indigo-600 font-semibold ml-1">({formatMontoUsd(pago.monto_usd)})</span>
												)}
											</p>
											<Link
												to="/pagos"
												className="text-sm text-blue-600 hover:text-blue-800 font-medium"
											>
												Ver Detalles →
											</Link>
										</motion.div>
									))}
								</div>
								{pagosPendientes.length >= 3 && (
									<div className="mt-4 text-center">
										<Link
											to="/pagos"
											className="text-sm text-blue-600 hover:text-blue-800 font-medium"
										>
											Ver todos los pagos pendientes →
										</Link>
									</div>
								)}
							</div>
						)}

						{/* Solicitar nuevo pago */}
						<div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-md border border-blue-200 p-6 sm:p-8">
							<div className="text-center">
								<h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
									💰 {pagosPendientes.length > 0 ? 'Solicitar Otro Pago' : 'Solicitar Nuevo Pago'}
								</h3>
								<p className="text-gray-700 mb-4">
									{pagosPendientes.length > 0 
										? 'Puedes solicitar un nuevo pago incluso si tienes pagos pendientes de revisión.'
										: '¿Necesitas registrar un nuevo pago? Haz clic en el botón para solicitar un pago y que el administrador lo revise.'
									}
								</p>
								<button
									onClick={() => setShowPaymentModal(true)}
									className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
								>
									{pagosPendientes.length > 0 ? 'Solicitar Otro Pago' : 'Solicitar Pago'}
								</button>
								{pagosPendientes.length > 0 && (
									<div className="mt-4">
										<Link
											to="/pagos"
											className="text-sm text-blue-600 hover:text-blue-800 font-medium"
										>
											Ver Mis Pagos →
										</Link>
									</div>
								)}
							</div>
						</div>
					</div>
				</section>
			)}

			{/* Carrusel dinámico de Anuncios y Eventos */}
			<AnunciosCarousel maxItems={5} autoPlayInterval={6000} />

			{/* Modal de solicitud de pago */}
			<PaymentRequestModal
				isOpen={showPaymentModal}
				onClose={() => setShowPaymentModal(false)}
				onSuccess={() => {
					cargarPagosPendientes(); // Recargar pagos pendientes después de crear uno nuevo
				}}
			/>
		</div>
	);
};
