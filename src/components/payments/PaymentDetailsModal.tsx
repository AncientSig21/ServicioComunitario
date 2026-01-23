import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Payment } from '../../interfaces';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onStatusChange?: (status: string) => void;
  onReceiptUpload?: (file: File) => Promise<void>;
  isAdmin?: boolean;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  payment,
  onStatusChange,
  onReceiptUpload,
  isAdmin = false,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!payment) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadClick = async () => {
    if (selectedFile && onReceiptUpload) {
      try {
        await onReceiptUpload(selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error uploading receipt:', error);
      }
    }
  };

  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Cerrar</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Detalles del Pago
                    </Dialog.Title>
                    
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{payment.concept}</h4>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          ${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Estado</p>
                          <p className="text-sm font-medium text-gray-900">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.status === 'Pagado' ? 'bg-green-100 text-green-800' :
                              payment.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              payment.status === 'Aprobado' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {payment.status}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Categoría</p>
                          <p className="text-sm font-medium text-gray-900">{payment.category}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Fecha de vencimiento</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(payment.dueDate)}
                          </p>
                        </div>
                        {payment.paymentDate && (
                          <div>
                            <p className="text-sm text-gray-500">Fecha de pago</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(payment.paymentDate)}
                            </p>
                          </div>
                        )}
                      </div>

                      {payment.reference && (
                        <div>
                          <p className="text-sm text-gray-500">Referencia</p>
                          <p className="text-sm font-mono text-gray-900">{payment.reference}</p>
                        </div>
                      )}

                      {payment.receiptUrl ? (
                        <div>
                          <p className="text-sm text-gray-500">Comprobante</p>
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                          >
                            Ver comprobante
                          </a>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subir comprobante
                          </label>
                          <div className="flex space-x-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                              className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                            />
                            {selectedFile && (
                              <button
                                type="button"
                                onClick={handleUploadClick}
                                className="inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                              >
                                Subir
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {isAdmin && onStatusChange && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cambiar estado
                          </label>
                          <select
                            value={payment.status}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Rechazado">Rechazado</option>
                            <option value="Pagado">Pagado</option>
                            <option value="Vencido">Vencido</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default PaymentDetailsModal;
