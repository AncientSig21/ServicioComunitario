import { ReactNode, useState, useEffect, useRef } from 'react';
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
  const verifiedUserIdRef = useRef<number | null>(null);
  const navigateRef = useRef(navigate);
  const showErrorRef = useRef(showError);
  navigateRef.current = navigate;
  showErrorRef.current = showError;

  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!authLoading && !isAuthenticated) {
        navigateRef.current('/login');
        return;
      }

      const userId = user?.id;
      if (!user || !userId) {
        if (!authLoading) navigateRef.current('/login');
        return;
      }

      if (verifiedUserIdRef.current === userId) {
        setCheckingRole(false);
        return;
      }

      try {
        setCheckingRole(true);
        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('id, rol')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error verificando rol de admin:', error);
          setIsAdmin(false);
          verifiedUserIdRef.current = null;
          showErrorRef.current('Error al verificar permisos. Intenta iniciar sesión nuevamente.');
          navigateRef.current('/', { replace: true });
          return;
        }

        const userRole = usuario?.rol?.toLowerCase();
        const isUserAdmin = userRole === 'admin';

        if (!isUserAdmin) {
          console.warn('Acceso denegado: Usuario no es administrador. Rol actual:', usuario?.rol);
          setIsAdmin(false);
          verifiedUserIdRef.current = null;
          showErrorRef.current('No tienes permisos para acceder al panel de administración. Solo los administradores pueden acceder a esta sección.');
          navigateRef.current('/', { replace: true });
          return;
        }

        verifiedUserIdRef.current = userId;
        setIsAdmin(true);
      } catch (error: any) {
        console.error('Error al verificar rol de administrador:', error);
        setIsAdmin(false);
        verifiedUserIdRef.current = null;
        showErrorRef.current('Error al verificar permisos de administrador. Intenta iniciar sesión nuevamente.');
        navigateRef.current('/', { replace: true });
      } finally {
        setCheckingRole(false);
      }
    };

    verifyAdminRole();
  }, [user?.id, isAuthenticated, authLoading]);

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

