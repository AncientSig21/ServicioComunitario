import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';

export const TesisPages = () => {
  return (
    <div className="my-32">
      <BackToHome />
      <ScrollToTop />
      
      <h2 className="text-3xl font-semibold text-center mb-8 md:text-4xl lg:text-5xl text-primary">
        Servicios de Ciudad Colonial
      </h2>
      
      <div className="max-w-4xl mx-auto px-4">
        <p className="text-center text-gray-600 text-lg my-8">
          Esta sección está en desarrollo. Los servicios y solicitudes de mantenimiento se gestionan desde otras secciones del sistema.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <a
            href="/mantenimiento"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="text-xl font-semibold text-primary mb-2">Solicitudes de Mantenimiento</h3>
            <p className="text-gray-600">Gestiona y realiza solicitudes de mantenimiento para tu condominio.</p>
          </a>
          <a
            href="/reservas"
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="text-xl font-semibold text-primary mb-2">Reservas de Espacios</h3>
            <p className="text-gray-600">Reserva espacios comunes del condominio.</p>
          </a>
        </div>
      </div>
      
      <ScrollToTop />
    </div>
  );
};
