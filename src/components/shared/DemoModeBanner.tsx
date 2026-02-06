import React, { useState, useEffect } from 'react';
import { FaDesktop, FaTimes, FaInfoCircle, FaSync } from 'react-icons/fa';

interface DemoModeBannerProps {
  className?: string;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    // Verificar si está en modo demo
    const checkDemoMode = () => {
      const demoActive = localStorage.getItem('DEMO_MODE_ACTIVE') === 'true' || !navigator.onLine;
      setIsDemoMode(demoActive);
      setIsVisible(demoActive);
    };

    checkDemoMode();

    // Listener para cambios en la conexión
    window.addEventListener('online', checkDemoMode);
    window.addEventListener('offline', checkDemoMode);

    return () => {
      window.removeEventListener('online', checkDemoMode);
      window.removeEventListener('offline', checkDemoMode);
    };
  }, []);

  const handleResetData = () => {
    if (confirm('¿Desea reiniciar todos los datos de demostración a sus valores originales?')) {
      (window as any).demoMode?.resetData();
      window.location.reload();
    }
  };

  const handleDisableDemo = () => {
    if (confirm('¿Desea desactivar el modo demo? Se intentará conectar con el servidor real.')) {
      (window as any).demoMode?.disable();
    }
  };

  if (!isVisible || !isDemoMode) return null;

  return (
    <>
      {/* Banner principal */}
      <div className={`bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white py-2 px-4 shadow-lg ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full animate-pulse">
              <FaDesktop className="text-lg" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base">MODO PRESENTACIÓN ACTIVO</span>
              <span className="hidden sm:inline text-xs ml-2 opacity-90">
                • Datos de demostración • Sin conexión a servidor
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Ver información"
            >
              <FaInfoCircle />
            </button>
            <button
              onClick={handleResetData}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Reiniciar datos"
            >
              <FaSync />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Ocultar banner"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de información desplegable */}
      {showInfo && (
        <div className="bg-amber-50 border-b border-amber-200 py-4 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <FaInfoCircle />
                  Credenciales de Prueba
                </h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li><strong>Admin:</strong> admin@condominio.com / admin123</li>
                  <li><strong>Usuario 1:</strong> maria@condominio.com / usuario123</li>
                  <li><strong>Usuario 2:</strong> carlos@condominio.com / usuario123</li>
                  <li><strong>Moroso:</strong> ana@condominio.com / usuario123</li>
                  <li><strong>Usuario 3:</strong> pedro@condominio.com / usuario123</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-amber-800 mb-2">Funcionalidades Disponibles</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>✓ Gestión de pagos y cuotas</li>
                  <li>✓ Validación de comprobantes</li>
                  <li>✓ Generación de recibos PDF</li>
                  <li>✓ Centro de recaudación</li>
                  <li>✓ Anuncios y eventos</li>
                  <li>✓ Solicitudes de mantenimiento</li>
                  <li>✓ Reserva de espacios</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-amber-200 flex flex-wrap gap-2">
              <button
                onClick={handleResetData}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors flex items-center gap-2"
              >
                <FaSync />
                Reiniciar Datos Demo
              </button>
              <button
                onClick={handleDisableDemo}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Intentar Conexión Real
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DemoModeBanner;
