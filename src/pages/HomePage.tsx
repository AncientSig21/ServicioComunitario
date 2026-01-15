import { useState, useEffect } from 'react';
import { Brands } from '../components/home/Brands';
import { FeatureGrid } from '../components/home/FeatureGrid';
import { PaymentRequestModal } from '../components/payments/PaymentRequestModal';
import { useAuth } from '../hooks/useAuth';
import { fetchPagos } from '../services/bookService';

export const HomePage = () => {
	const { isAuthenticated, user } = useAuth();
	const [showPaymentModal, setShowPaymentModal] = useState(false);
	const [tienePagoPendiente, setTienePagoPendiente] = useState(false);
	const [pagoPendiente, setPagoPendiente] = useState<any>(null);

	// Verificar si hay un pago pendiente con comprobante
	useEffect(() => {
		const verificarPagoPendiente = async () => {
			if (!user || !isAuthenticated) {
				setTienePagoPendiente(false);
				return;
			}

			try {
				const pagosBD = await fetchPagos({ usuario_id: user.id });
				const pagoConComprobante = pagosBD.find(
					(p: any) => p.estado === 'pendiente' && p.comprobante_archivo_id !== null
				);
				
				if (pagoConComprobante) {
					setTienePagoPendiente(true);
					setPagoPendiente(pagoConComprobante);
				} else {
					setTienePagoPendiente(false);
					setPagoPendiente(null);
				}
			} catch (error) {
				console.error('Error verificando pago pendiente:', error);
				setTienePagoPendiente(false);
			}
		};

		verificarPagoPendiente();
		// Verificar cada 30 segundos
		const interval = setInterval(verificarPagoPendiente, 30000);
		return () => clearInterval(interval);
	}, [user, isAuthenticated]);

	return (
		<div>
			<FeatureGrid />

			<Brands />

			{/* Sección de pagos - Solo para usuarios autenticados */}
			{isAuthenticated && (
				<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8 sm:my-12">
					<div className="max-w-3xl mx-auto space-y-4">
						{/* Pago Pendiente - Si existe */}
						{tienePagoPendiente && pagoPendiente && (
							<div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-4 sm:p-5">
								<div className="text-center">
									<h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
										⏳ Pago Pendiente de Revisión
									</h3>
									<p className="text-sm text-gray-700 mb-3">
										Tienes un pago pendiente de revisión por el administrador. Recibirás una notificación cuando sea procesado.
									</p>
									<div className="bg-white rounded-lg p-3 mb-3 text-left max-w-sm mx-auto">
										<p className="text-xs text-gray-600 mb-1">Concepto:</p>
										<p className="font-semibold text-sm text-gray-900 mb-2 break-words">{pagoPendiente.concepto}</p>
										<p className="text-xs text-gray-600 mb-1">Monto:</p>
										<p className="text-lg font-bold text-blue-600">
											{new Intl.NumberFormat('es-VE', {
												style: 'currency',
												currency: 'VES',
												minimumFractionDigits: 2,
											}).format(parseFloat(pagoPendiente.monto))}
										</p>
									</div>
									<a
										href="/pagos"
										className="inline-block px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
									>
										Ver Detalles del Pago
									</a>
								</div>
							</div>
						)}

						{/* Solicitar Nuevo Pago - Siempre visible */}
						<div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-4 sm:p-5">
							<div className="text-center">
								<h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
									💰 Solicitar Nuevo Pago
								</h3>
								<p className="text-sm text-gray-700 mb-3">
									{tienePagoPendiente 
										? '¿Necesitas registrar otro pago? Puedes solicitar un nuevo pago incluso si tienes uno pendiente de revisión.'
										: '¿Necesitas registrar un nuevo pago? Haz clic en el botón para solicitar un pago y que el administrador lo revise.'
									}
								</p>
								<button
									onClick={() => setShowPaymentModal(true)}
									className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
								>
									Solicitar Pago
								</button>
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

			{/* Modal de solicitud de pago - Siempre disponible */}
			<PaymentRequestModal
				isOpen={showPaymentModal}
				onClose={() => setShowPaymentModal(false)}
				onSuccess={() => {
					// Recargar verificación de pago pendiente
					const verificarPagoPendiente = async () => {
						if (!user) return;
						try {
							const pagosBD = await fetchPagos({ usuario_id: user.id });
							const pagoConComprobante = pagosBD.find(
								(p: any) => p.estado === 'pendiente' && p.comprobante_archivo_id !== null
							);
							
							if (pagoConComprobante) {
								setTienePagoPendiente(true);
								setPagoPendiente(pagoConComprobante);
							}
						} catch (error) {
							console.error('Error verificando pago pendiente:', error);
						}
					};
					verificarPagoPendiente();
				}}
			/>
		</div>
	);
};
