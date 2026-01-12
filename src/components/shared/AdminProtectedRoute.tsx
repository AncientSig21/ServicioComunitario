import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';
import { useToast } from '../../contexts/ToastContext';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Componente que protege las rutas de administración
 * Verifica que el usuario esté autenticado Y tenga rol 'admin' en la base de datos
 * Siempre consulta la BD para verificar el rol (no confía solo en localStorage)
 */
export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const verifyAdminRole = async () => {
      // Si no está autenticado, redirigir a login
      if (!authLoading && !isAuthenticated) {
        navigate('/login');
        return;
      }

      // Si no hay usuario, esperar o redirigir
      if (!user || !user.id) {
        if (!authLoading) {
          navigate('/login');
        }
        return;
      }

      try {
        setCheckingRole(true);
        
        // Verificar rol directamente desde la base de datos
        // Esto asegura que siempre consultamos la fuente de verdad
        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('id, rol')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error verificando rol de admin:', error);
          setIsAdmin(false);
          showError('Error al verificar permisos. Intenta iniciar sesión nuevamente.');
          navigate('/', { replace: true });
          return;
        }

        // Verificar si el rol es 'admin' (case-insensitive)
        const userRole = usuario?.rol?.toLowerCase();
        const isUserAdmin = userRole === 'admin';

        if (!isUserAdmin) {
          console.warn('Acceso denegado: Usuario no es administrador. Rol actual:', usuario?.rol);
          setIsAdmin(false);
          // Mostrar mensaje de error
          showError('No tienes permisos para acceder al panel de administración. Solo los administradores pueden acceder a esta sección.');
          // Redirigir a la página principal
          navigate('/', { replace: true });
          return;
        }

        // Usuario es admin
        setIsAdmin(true);
      } catch (error: any) {
        console.error('Error al verificar rol de administrador:', error);
        setIsAdmin(false);
        showError('Error al verificar permisos de administrador. Intenta iniciar sesión nuevamente.');
        navigate('/', { replace: true });
      } finally {
        setCheckingRole(false);
      }
    };

    verifyAdminRole();
  }, [user, isAuthenticated, authLoading, navigate, showError]);

  // Mostrar loading mientras se verifica
  if (authLoading || checkingRole || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
        </div>
      </div>
    );
  }

  // Si no es admin, no mostrar contenido (ya se redirigió)
  if (!isAdmin) {
    return null;
  }

  // Usuario es admin, mostrar contenido
  return <>{children}</>;
};

