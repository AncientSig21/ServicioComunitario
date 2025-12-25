import React from 'react';
import { Payment } from '../../interfaces';

interface PaymentCardProps {
  payment: Payment;
  onViewDetails: () => void;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({ payment, onViewDetails }) => {
  // Mapeo de estados a colores
  const statusColors = {
    Pendiente: 'bg-yellow-100 text-yellow-800',
    Aprobado: 'bg-blue-100 text-blue-800',
    Rechazado: 'bg-red-100 text-red-800',
    Vencido: 'bg-red-100 text-red-800',
    Pagado: 'bg-green-100 text-green-800',
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div 
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={onViewDetails}
    >
      <div className="px-4 py-5 sm:p-6">
        {/* Encabezado con concepto y estado */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 line-clamp-1">
            {payment.concept}
          </h3>
          <span 
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[payment.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {payment.status}
          </span>
        </div>
        
        {/* Monto y fechas */}
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">
            ${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Vencimiento</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(payment.dueDate)}
              </p>
            </div>
            
            {payment.paymentDate && (
              <div>
                <p className="text-xs text-gray-500">Pagado el</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(payment.paymentDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Categoría */}
        <div className="mt-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {payment.category}
          </span>
          
          {payment.reference && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">Referencia</p>
              <p className="text-sm font-mono text-gray-900">
                {payment.reference}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Pie de tarjeta */}
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <button
            type="button"
            className="font-medium text-blue-600 hover:text-blue-500"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            Ver detalles<span className="sr-only">, {payment.concept}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
