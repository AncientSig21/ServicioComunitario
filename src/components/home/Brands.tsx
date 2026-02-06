import { Link } from 'react-router-dom';

const servicios = [
  {
    icon: '📢',
    label: 'Anuncios',
    description: 'Noticias y avisos',
    categoria: 'anuncios',
  },
  {
    icon: '🔧',
    label: 'Mantenimiento',
    description: 'Solicitudes y reportes',
    categoria: 'mantenimiento',
  },
  {
    icon: '📅',
    label: 'Espacios comunes',
    description: 'Reserva de áreas y espacios',
    categoria: 'reservas',
  },
  {
    icon: '💰',
    label: 'Pagos',
    description: 'Estado de cuotas',
    categoria: 'pagos',
  },
];

export const Brands = () => {
  return (
    <div className="flex flex-col items-center gap-3 pt-16 pb-12">
      <h2 className="font-bold text-2xl">Servicios de Ciudad Colonial</h2>

      <p className="w-2/3 text-center text-sm md:text-base">
        Accede a todos los servicios y recursos disponibles para los residentes
      </p>

      <div className="flex flex-wrap justify-center gap-6 mt-8 max-w-full">
        {servicios.map((servicio, index) => {
          // Rutas especiales para cada servicio
          const routeMap: { [key: string]: string } = {
            'anuncios': '/anuncios',
            'mantenimiento': '/mantenimiento',
            'reservas': '/reservas',
            'pagos': '/pagos',
          };
          
          const route = routeMap[servicio.categoria] || `/tesis?categoria=${encodeURIComponent(servicio.categoria)}`;
          
          return (
          <Link
            key={index}
            to={route}
            className="w-32 flex flex-col items-center justify-center hover:scale-105 transition-transform p-4 bg-white rounded-lg shadow-md cursor-pointer"
          >
            <div className="text-4xl mb-2">{servicio.icon}</div>
            <span className="text-center text-sm font-medium">
              {servicio.label}
            </span>
            <span className="text-xs text-gray-500 text-center mt-1">
              {servicio.description}
            </span>
          </Link>
          );
        })}
      </div>
    </div>
  );
};