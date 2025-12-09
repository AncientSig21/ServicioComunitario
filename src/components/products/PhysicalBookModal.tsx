import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PreparedBook } from '../../interfaces';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  book: PreparedBook | null;
  onReserve: () => void;
  hasActiveOrder: boolean;
  cantidadDisponible?: number;
  isAuthenticated: boolean;
}

export const PhysicalBookModal = ({ 
  isOpen, 
  onClose, 
  book, 
  onReserve, 
  hasActiveOrder, 
  cantidadDisponible, 
  isAuthenticated 
}: Props) => {
  const [showDescription, setShowDescription] = useState(false);

  if (!book) return null;

  const isFisico = book.type === 'Fisico' || book.type === 'Físico';
  const noDisponibles = isFisico && (cantidadDisponible === 0 || cantidadDisponible === undefined || cantidadDisponible < 0);
  const yaTieneOrden = isFisico && hasActiveOrder;
  const botonDeshabilitado = noDisponibles || yaTieneOrden;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-lg max-w-2xl w-[95%] max-h-[90vh] p-6 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl z-10"
            >
              &times;
            </button>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Imagen del libro */}
              <div className="flex-shrink-0">
                <div className="w-48 h-64 bg-gray-50 rounded-lg flex items-center justify-center p-4">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="object-contain max-h-full max-w-full rounded"
                  />
                </div>
              </div>

              {/* Información del libro */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{book.title}</h2>
                
                <div className="space-y-3 mb-6">
                  <div>
                    <span className="font-semibold text-gray-700">Especialidad:</span>
                    <span className="ml-2 text-gray-600">{book.speciality}</span>
                  </div>
                  
                  <div>
                    <span className="font-semibold text-gray-700">Tipo:</span>
                    <span className="ml-2 text-gray-600">{book.type}</span>
                  </div>
                  
                  {cantidadDisponible !== undefined && (
                    <div>
                      <span className="font-semibold text-gray-700">Disponibles:</span>
                      <span className={`ml-2 ${cantidadDisponible > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cantidadDisponible}
                      </span>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span>{showDescription ? 'Ocultar' : 'Ver'} descripción</span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showDescription ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <AnimatePresence>
                    {showDescription && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-3 p-4 bg-gray-50 rounded-lg"
                      >
                        <p className="text-gray-700 leading-relaxed">
                          {book.sinopsis || 'No hay descripción disponible para este libro.'}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Botón de reservar */}
                {isAuthenticated ? (
                  <div className="mt-auto">
                    <button
                      onClick={onReserve}
                      disabled={botonDeshabilitado}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                        botonDeshabilitado
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {yaTieneOrden ? 'Ya Reservado' : 'Reservar Libro'}
                    </button>
                    
                    {/* Mensajes de estado */}
                    {noDisponibles && (
                      <p className="text-red-600 text-sm text-center mt-2">
                        No hay ejemplares disponibles
                      </p>
                    )}
                    {yaTieneOrden && (
                      <p className="text-orange-600 text-sm text-center mt-2">
                        Ya tienes una orden activa para este libro
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-auto">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-center">
                        Inicia sesión para poder reservar este libro
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 