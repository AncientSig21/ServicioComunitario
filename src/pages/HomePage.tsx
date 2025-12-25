import { useState } from 'react';
import { Brands } from '../components/home/Brands';
import { FeatureGrid } from '../components/home/FeatureGrid';
import { PaymentRequestModal } from '../components/payments/PaymentRequestModal';
import { useAuth } from '../hooks/useAuth';

export const HomePage = () => {
	const { isAuthenticated } = useAuth();
	const [showPaymentModal, setShowPaymentModal] = useState(false);

	return (
		<div>
			<FeatureGrid />

			<Brands />

			{/* Sección de solicitar pago - Solo para usuarios autenticados */}
			{isAuthenticated && (
				<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 sm:my-24 lg:my-32">
					<div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-md border border-blue-200 p-6 sm:p-8">
						<div className="text-center">
							<h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
								💰 Solicitar Nuevo Pago
							</h3>
							<p className="text-gray-700 mb-4">
								¿Necesitas registrar un nuevo pago? Haz clic en el botón para solicitar un pago y que el administrador lo revise.
							</p>
							<button
								onClick={() => setShowPaymentModal(true)}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
							>
								Solicitar Pago
							</button>
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
					// Puedes agregar lógica adicional aquí si es necesario
				}}
			/>
		</div>
	);
};
