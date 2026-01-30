import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FaChartBar, FaBook, FaFileAlt, FaUserCheck, FaAngleDoubleLeft, FaAngleDoubleRight, FaBars, FaBuilding, FaSync, FaMoneyBillWave, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { fetchUsuariosPendientes, fetchNotificacionesUsuario, fetchPagos } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import { useToast } from '../contexts/ToastContext';

export default function AdminLayout() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  // Estado global para notificaciones
  const [morososCount, setMorososCount] = useState(0);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [usuariosPendientesCount, setUsuariosPendientesCount] = useState(0);

  // Cargar contadores de notificaciones
  useEffect(() => {
    if (user?.id) {
      cargarContadores();
      // Actualizar cada 30 segundos
      const interval = setInterval(cargarContadores, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const cargarContadores = async () => {
    try {
      // Contar usuarios pendientes de aprobación
      const usuariosPendientes = await fetchUsuariosPendientes();
      setUsuariosPendientesCount(usuariosPendientes.length);

      // Contar usuarios morosos desde la base de datos
      try {
        const { count: morososCount, error: morososError } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('Estado', 'Moroso');
        
        if (!morososError && morososCount !== null) {
          setMorososCount(morososCount || 0);
        } else {
          setMorososCount(0);
        }
      } catch (err) {
        console.error('Error contando morosos:', err);
        setMorososCount(0);
      }

      // Contar pagos pendientes desde la base de datos
      try {
        const pagosPendientes = await fetchPagos({ estado: 'pendiente' });
        setPendientesCount(pagosPendientes.length || 0);
      } catch (err) {
        console.error('Error contando pagos pendientes:', err);
        setPendientesCount(0);
      }
    } catch (error) {
      console.error('Error cargando contadores:', error);
      // Asegurar que los contadores se reseteen en caso de error
      setMorososCount(0);
      setPendientesCount(0);
    }
  };

  // Funciones para actualizar los contadores desde hijos
  const handleMorosoDesbloqueado = () => setMorososCount(c => Math.max(0, c - 1));
  const handlePedidoRespondido = () => setPendientesCount(c => Math.max(0, c - 1));
  const handleUsuarioAprobado = () => {
    setUsuariosPendientesCount(c => Math.max(0, c - 1));
    cargarContadores();
  };

  const adminLinks = [
    { to: '/admin', label: 'Estadísticas', icon: <FaChartBar />, end: true },
    { to: '/admin/residentes', label: 'Residentes', icon: <FaBook /> },
    { 
      to: '/admin/aprobaciones', 
      label: 'Aprobaciones', 
      icon: <FaUserCheck />, 
      notis: { count: usuariosPendientesCount } 
    },
    { to: '/admin/condominios', label: 'Condominios', icon: <FaBuilding /> },
    { to: '/admin/pagos', label: 'Pagos Masivos', icon: <FaMoneyBillWave /> },
    { to: '/admin/validacion-pagos', label: 'Validación', icon: <FaCheckCircle /> },
    { to: '/admin/gestion-eventos-espacios', label: 'Eventos y Espacios', icon: <FaCalendarAlt /> },
    { to: '/admin/reportes', label: 'Reportes', icon: <FaFileAlt />, notis: { morosos: morososCount, pendientes: pendientesCount } },
    { to: '/admin/mantenimiento', label: 'Mantenimiento', icon: <FaSync /> },
  ];

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verificar rol de administrador desde la base de datos
  useEffect(() => {
    const verifyAdminRole = async () => {
      // Si no está autenticado, redirigir a login
      if (!authLoading && !isAuthenticated) {
        navigate('/login');
        return;
      }

      // Si no hay usuario, esperar o redirigir
      const userId = user?.id;
      if (!user || !userId) {
        if (!authLoading) {
          navigate('/login');
        }
        return;
      }

      // Si ya verificamos que es admin para este usuario, no volver a consultar la BD
      if (isAdmin === true) {
        setCheckingRole(false);
        return;
      }

      try {
        setCheckingRole(true);
        
        // Verificar rol directamente desde la base de datos
        // Esto asegura que siempre consultamos la fuente de verdad
        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('id, rol')
          .eq('id', userId)
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
        showError('Error al verificar permisos de administrador.');
        navigate('/', { replace: true });
      } finally {
        setCheckingRole(false);
      }
    };

    verifyAdminRole();
    // Solo re-verificar cuando cambie el id del usuario (no cuando cambie el objeto user por refreshUserStatus)
  }, [user?.id, isAuthenticated, authLoading, isAdmin, navigate, showError]);

  // Mostrar loading mientras se verifica
  if (authLoading || checkingRole || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
          <p className="mt-2 text-sm text-gray-500">Consultando base de datos...</p>
        </div>
      </div>
    );
  }

  // Si no es admin, no mostrar contenido (ya se redirigió)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Botón hamburguesa para móvil */}
      <button
        className="lg:hidden fixed top-24 left-8 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Abrir menú"
      >
        <FaBars size={20} className="text-gray-700" />
      </button>
      
      {/* Menú lateral */}
      <aside
        className={`transition-all duration-300 bg-white shadow-lg p-4 flex flex-col gap-4
          ${collapsed ? 'w-20' : 'w-64'}
          lg:static lg:h-screen lg:translate-x-0
          fixed top-0 left-0 h-full z-40
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:block
        `}
        style={{ maxWidth: collapsed ? '5rem' : '16rem' }}
      >
        <div className="flex items-center justify-between mb-6">
          {!collapsed && (
            <h2 className="text-xl font-bold text-center flex-1 text-gray-800 lg:block hidden">Admin</h2>
          )}
          <button
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors ml-auto lg:block hidden"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expandir menú' : 'Minimizar menú'}
          >
            {collapsed ? (
              <FaAngleDoubleRight size={16} />
            ) : (
              <FaAngleDoubleLeft size={16} />
            )}
          </button>
          
          {/* Botón cerrar menú móvil */}
          <button
            className="lg:hidden ml-2 p-2 rounded-lg hover:bg-gray-200 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <span className="text-xl">✖️</span>
          </button>
        </div>
        
        <nav className="flex flex-col gap-2">
          {adminLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all whitespace-nowrap overflow-hidden ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-blue-100 hover:shadow-sm'
                } ${collapsed ? 'justify-center' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="text-xl flex-shrink-0">{link.icon}</span>
              {!collapsed && <span className="truncate">{link.label}</span>}
              {/* Contador de notificaciones para aprobaciones */}
              {link.to === '/admin/aprobaciones' && link.notis && !collapsed && link.notis.count > 0 && (
                <span className="ml-auto">
                  <span
                    title="Usuarios pendientes de aprobación"
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 border-2 border-white text-white text-xs font-bold"
                  >
                    {link.notis.count}
                  </span>
                </span>
              )}
              {/* Contador de notificaciones para reportes */}
              {link.to === '/admin/reportes' && link.notis && !collapsed && (link.notis.morosos > 0 || link.notis.pendientes > 0) && (
                <span className="flex gap-1 ml-auto">
                  {link.notis.morosos > 0 && (
                    <span
                      title="Usuarios morosos"
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 border-2 border-white text-white text-xs font-bold"
                    >
                      {link.notis.morosos}
                    </span>
                  )}
                  {link.notis.pendientes > 0 && (
                    <span
                      title="Pedidos por responder"
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 border-2 border-white text-gray-800 text-xs font-bold"
                    >
                      {link.notis.pendientes}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      
      {/* Fondo oscuro para menú móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Contenido */}
      <main className="flex-1 lg:ml-0 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Pasar funciones de actualización como contexto */}
        <Outlet context={{ handleMorosoDesbloqueado, handlePedidoRespondido, handleUsuarioAprobado, cargarContadores }} />
      </main>
    </div>
  );
} 