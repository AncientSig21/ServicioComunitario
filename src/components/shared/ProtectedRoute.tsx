import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AuthRequiredModal } from './AuthRequiredModal';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute = ({ children, redirectTo = '/login' }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Si no está autenticado y terminó de cargar, mostrar modal
    if (!loading && !isAuthenticated) {
      setShowModal(true);
    } else if (isAuthenticated) {
      setShowModal(false);
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthRequiredModal 
          isOpen={showModal} 
          onClose={() => {
            // Si cierra el modal, redirigir a home
            window.location.href = '/';
          }} 
        />
        {/* No mostrar contenido mientras se muestra el modal */}
        <div style={{ display: 'none' }} />
      </>
    );
  }

  return <>{children}</>;
}; 