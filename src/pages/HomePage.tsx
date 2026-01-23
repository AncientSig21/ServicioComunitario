import { useState, useEffect } from 'react';
import { Brands } from '../components/home/Brands';
import { FeatureGrid } from '../components/home/FeatureGrid';
import { PaymentRequestModal } from '../components/payments/PaymentRequestModal';
import { useAuth } from '../hooks/useAuth';
import { fetchPagos } from '../services/bookService';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface PagoPendiente {
  id: number;
  concepto: string;
  monto: number;
  estado: string;
  created_at: string;
}

export const HomePage = () => {
	const { isAuthenticated, user } = useAuth();
	const [showPaymentModal, setShowPaymentModal] = useState(false);
	const [pagosPendientes, setPagosPendientes] = useState<PagoPendiente[]>([]);
	const [loadingPagos, setLoadingPagos] = useState(false);

	useEffect(() => {
		if (isAuthenticated && user?.id) {
			cargarPagosPendientes();
		}
	}, [isAuthenticated, user]);

	const cargarPagosPendientes = async () => {
		if (!user?.id) return;
		try {
			setLoadingPagos(true);
			const pagos = await fetchPagos({ usuario_id: user.id, estado: 'pendiente' });
			setPagosPendientes(pagos.slice(0, 3)); // Mostrar máximo 3 pagos pendientes
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
												{formatMonto(pago.monto || 0)}
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

			{/* Sección fija de Anuncios y Eventos */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32">
				<h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6 sm:mb-8 md:text-4xl lg:text-5xl text-gray-800">
					Anuncios y Eventos
				</h2>
				<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8">
					<p className="text-sm uppercase tracking-wide text-blue-600 font-semibold mb-2 text-center">
						Próximo evento
					</p>
					<h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-3">
						Presentación del Proyecto Administrativo
					</h3>
					<p className="text-center text-gray-600 mb-4">
						15 de febrero de 2026
					</p>
					<p className="text-sm sm:text-base text-gray-700 text-center">
						Este evento está orientado a presentar el sistema de información web para la gestión comunitaria
						del Consejo Comunal de la Urbanización Ciudad Colonial.
					</p>
				</div>
			</section>

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
