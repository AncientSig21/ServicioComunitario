import { Outlet, NavLink } from 'react-router-dom';
import { FaChartBar, FaBook, FaFileAlt, FaAngleDoubleLeft, FaAngleDoubleRight, FaBars } from 'react-icons/fa';
import { useState } from 'react';



export default function AdminLayout() {
  // Estado global para notificaciones en modo demo
  const [morososCount, setMorososCount] = useState(1);
  const [pendientesCount, setPendientesCount] = useState(2);

  // Funciones para actualizar los contadores desde hijos (por ejemplo, desde AdminReportsPage)
  const handleMorosoDesbloqueado = () => setMorososCount(c => Math.max(0, c - 1));
  const handlePedidoRespondido = () => setPendientesCount(c => Math.max(0, c - 1));

  const adminLinks = [
    { to: '/admin', label: 'Estadísticas', icon: <FaChartBar />, end: true },
    { to: '/admin/libros', label: 'Residentes', icon: <FaBook /> },
    { to: '/admin/reportes', label: 'Reportes', icon: <FaFileAlt />, notis: { morosos: morososCount, pendientes: pendientesCount } },
  ];

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              {/* Notificaciones para la pestaña de reportes - COMENTADO */}
              {/* {link.to === '/admin/reportes' && link.notis && !collapsed && (
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
              )} */}
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
        <Outlet context={{ handleMorosoDesbloqueado, handlePedidoRespondido }} />
      </main>
    </div>
  );
} 