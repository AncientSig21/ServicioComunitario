import { useEffect, useState } from 'react';
import { PaymentCard } from '../components/payments/PaymentCard';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchPayments } from '../services/paymentService';
import { ContainerFilter } from '../components/products/ContainerFilter';
import { Pagination } from '../components/shared/Pagination';
import { useAuth } from '../hooks/useAuth';
import { Payment } from '../interfaces';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { PaymentRequestModal } from '../components/payments/PaymentRequestModal';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { isAuthenticated, user } = useAuth();
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);

  // Lista de categorías de pagos para los filtros
  const paymentCategories = [
    'Mantenimiento',
    'Cuota Ordinaria',
    'Cuota Extraordinaria',
    'Multas',
    'Servicios',
    'Otros',
  ];

  // Estados de pago para el filtro
  const paymentStatus = [
    'Pendiente',
    'Aprobado',
    'Rechazado',
    'Vencido',
    'Pagado',
  ];


  // Cargar pagos
  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        // Si el usuario está autenticado, cargar solo sus pagos
        const userId = isAuthenticated && user ? String(user.id) : undefined;
        const data = await fetchPayments(userId);
        setPayments(data);
        setError(null);
      } catch (err) {
        console.error('Error al cargar los pagos:', err);
        setError('No se pudieron cargar los pagos. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [isAuthenticated, user]);

  // Filtrar pagos según los filtros seleccionados
  const filteredPayments = payments.filter((payment) => {
    // Filtrar por categoría
    if (selectedCategories.length > 0 && !selectedCategories.includes(payment.category)) {
      return false;
    }
    
    // Filtrar por estado
    if (selectedStatus.length > 0 && !selectedStatus.includes(payment.status)) {
      return false;
    }
    
    return true;
  });

  // Calcular paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  // Manejar cambio de página
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejar selección de pago
  const handlePaymentSelect = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  // Manejar cierre del modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowReceipt(false);
    setSelectedPayment(null);
  };

  // Manejar visualización de recibo
  const handleViewReceipt = () => {
    setShowReceipt(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Cargando pagos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BackToHome />
        
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestión de Pagos</h1>
              <p className="text-lg text-gray-600">Administra y realiza seguimiento a tus pagos del condominio</p>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => setShowPaymentRequestModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md whitespace-nowrap"
              >
                + Registrar Nuevo Pago
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8">
          <ContainerFilter
            title="Categorías"
            specialities={paymentCategories}
            selectedSpecialities={selectedCategories}
            onChange={setSelectedCategories}
          />
          
          <ContainerFilter
            title="Estados"
            specialities={paymentStatus}
            selectedSpecialities={selectedStatus}
            onChange={setSelectedStatus}
          />
        </div>

        {/* Listado de pagos */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron pagos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCategories.length > 0 || selectedStatus.length > 0
                ? 'Intenta con otros filtros de búsqueda.'
                : 'No hay pagos registrados en este momento.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {currentPayments.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PaymentCard 
                    payment={payment} 
                    onViewDetails={() => handlePaymentSelect(payment)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredPayments.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}

        {/* Modal de detalles del pago */}
        <AnimatePresence>
          {isModalOpen && selectedPayment && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 transition-opacity"
                  aria-hidden="true"
                  onClick={handleCloseModal}
                >
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </motion.div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                  &#8203;
                </span>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6"
                >
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      type="button"
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={handleCloseModal}
                    >
                      <span className="sr-only">Cerrar</span>
                      <svg
                        className="h-6 w-6"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Detalles del Pago
                      </h3>
                      
                      <div className="mt-4 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <dt className="text-sm font-medium text-gray-500">Concepto</dt>
                              <dd className="mt-1 text-sm text-gray-900 font-medium">
                                {selectedPayment.concept}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Monto</dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                ${selectedPayment.amount.toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Estado</dt>
                              <dd className="mt-1">
                                <span 
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    selectedPayment.status === 'Pagado' 
                                      ? 'bg-green-100 text-green-800' 
                                      : selectedPayment.status === 'Pendiente'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {selectedPayment.status}
                                </span>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Fecha de vencimiento</dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                {new Date(selectedPayment.dueDate).toLocaleDateString()}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Categoría</dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                {selectedPayment.category}
                              </dd>
                            </div>
                            {selectedPayment.paymentDate && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Fecha de pago</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {new Date(selectedPayment.paymentDate).toLocaleDateString()}
                                </dd>
                              </div>
                            )}
                            {selectedPayment.reference && (
                              <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Referencia</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {selectedPayment.reference}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {selectedPayment.receiptUrl && (
                          <div className="mt-4">
                            <button
                              type="button"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              onClick={handleViewReceipt}
                            >
                              <svg
                                className="-ml-1 mr-2 h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {showReceipt ? 'Ocultar recibo' : 'Ver recibo'}
                            </button>
                          </div>
                        )}

                        {showReceipt && selectedPayment.receiptUrl && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Comprobante de pago</h4>
                            <div className="border rounded-md p-2 bg-gray-50">
                              <img 
                                src={selectedPayment.receiptUrl} 
                                alt="Comprobante de pago" 
                                className="max-w-full h-auto mx-auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                      onClick={handleCloseModal}
                    >
                      Cerrar
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de solicitud de nuevo pago */}
        <PaymentRequestModal
          isOpen={showPaymentRequestModal}
          onClose={() => setShowPaymentRequestModal(false)}
          onSuccess={() => {
            // Recargar pagos después de registrar uno nuevo
            const loadPayments = async () => {
              try {
                const userId = isAuthenticated && user ? String(user.id) : undefined;
                const data = await fetchPayments(userId);
                setPayments(data);
              } catch (err) {
                console.error('Error al recargar pagos:', err);
              }
            };
            loadPayments();
          }}
        />

        <ScrollToTop />
      </div>
    </div>
  );
};
