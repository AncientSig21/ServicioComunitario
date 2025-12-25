import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Navegar directamente a la página de login
    navigate('/login', { replace: true });
  };

  const handleRegister = () => {
    // Navegar directamente a la página de registro
    navigate('/register', { replace: true });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <div className="text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Acceso Restringido
            </h2>
            <p className="text-gray-600 mb-6">
              Debes iniciar sesión o registrarte para acceder a esta página.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleLogin}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Registrarse
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

