import { useState } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

interface Reserva {
  id: number;
  espacio: string;
  descripcion: string;
  fecha: string;
  estado: 'disponible' | 'reservado' | 'mantenimiento' | 'cerrado';
  capacidad?: number;
  horarios?: string;
  equipamiento?: string[];
}

// Datos de ejemplo - en producción vendrían de Supabase
const espaciosEjemplo: Reserva[] = [
  {
    id: 1,
    espacio: 'Sala de Eventos',
    descripcion: 'Amplia sala para eventos sociales, cumpleaños, reuniones familiares y celebraciones. Incluye sistema de sonido, proyector y mobiliario.',
    fecha: '2025-01-15',
    estado: 'disponible',
    capacidad: 50,
    horarios: 'Lunes a Domingo: 8:00 AM - 10:00 PM',
    equipamiento: ['Sistema de sonido', 'Proyector', 'Mobiliario', 'Cocina básica'],
  },
  {
    id: 2,
    espacio: 'Gimnasio',
    descripcion: 'Gimnasio completamente equipado con máquinas de cardio, pesas y área de entrenamiento funcional.',
    fecha: '2025-01-20',
    estado: 'reservado',
    capacidad: 15,
    horarios: 'Lunes a Viernes: 6:00 AM - 10:00 PM | Sábados y Domingos: 8:00 AM - 8:00 PM',
    equipamiento: ['Máquinas de cardio', 'Pesas', 'Mancuernas', 'Colchonetas'],
  },
  {
    id: 3,
    espacio: 'Área de Juegos Infantiles',
    descripcion: 'Parque infantil con juegos seguros para niños. Ideal para cumpleaños y actividades recreativas.',
    fecha: '2025-01-18',
    estado: 'disponible',
    capacidad: 20,
    horarios: 'Todos los días: 7:00 AM - 7:00 PM',
    equipamiento: ['Juegos infantiles', 'Área cubierta', 'Bancas'],
  },
  {
    id: 4,
    espacio: 'Salón de Usos Múltiples',
    descripcion: 'Salón versátil para reuniones, talleres, clases o actividades grupales. Equipado con pizarra y proyector.',
    fecha: '2025-01-12',
    estado: 'disponible',
    capacidad: 30,
    horarios: 'Lunes a Viernes: 9:00 AM - 9:00 PM',
    equipamiento: ['Pizarra', 'Proyector', 'Sillas y mesas', 'Sistema de sonido'],
  },
  {
    id: 5,
    espacio: 'Piscina y Área de Recreación',
    descripcion: 'Piscina con área de recreación, ideal para eventos al aire libre y actividades familiares.',
    fecha: '2025-01-10',
    estado: 'mantenimiento',
    capacidad: 40,
    horarios: 'Martes a Domingo: 7:00 AM - 8:00 PM',
    equipamiento: ['Piscina', 'Área de descanso', 'Duchas', 'Vestuarios'],
  },
  {
    id: 6,
    espacio: 'Cancha Deportiva',
    descripcion: 'Cancha multiusos para fútbol, básquetbol y voleibol. Perfecta para actividades deportivas.',
    fecha: '2025-01-08',
    estado: 'disponible',
    capacidad: 20,
    horarios: 'Todos los días: 6:00 AM - 9:00 PM',
    equipamiento: ['Iluminación', 'Redes', 'Marcadores'],
  },
];

const estadoColors = {
  disponible: 'bg-green-100 text-green-800 border-green-300',
  reservado: 'bg-red-100 text-red-800 border-red-300',
  mantenimiento: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  cerrado: 'bg-gray-100 text-gray-800 border-gray-300',
};

const estadoLabels = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  mantenimiento: 'En Mantenimiento',
  cerrado: 'Cerrado',
};

export const ReservasPage = () => {
  const { user } = useAuth();
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [espacios, setEspacios] = useState<Reserva[]>(espaciosEjemplo);
  const [loadingReserva, setLoadingReserva] = useState<number | null>(null);

  const estados = ['todos', 'disponible', 'reservado', 'mantenimiento', 'cerrado'];

  const filteredEspacios = selectedEstado === 'todos'
    ? espacios
    : espacios.filter(espacio => espacio.estado === selectedEstado);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleReservar = async (espacio: Reserva) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar una reserva');
      return;
    }

    try {
      setLoadingReserva(espacio.id);
      
      // Crear la reserva (simulado)
      const MOCK_DB_KEY = 'mockDatabase_condominio';
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"reservas_espacios": []}');
      if (!db.reservas_espacios) {
        db.reservas_espacios = [];
      }

      const nuevaReserva = {
        id: db.reservas_espacios.length > 0 
          ? Math.max(...db.reservas_espacios.map((r: any) => r.id)) + 1 
          : 1,
        espacio_id: espacio.id,
        usuario_id: user.id,
        fecha_reserva: new Date().toISOString().split('T')[0],
        hora_inicio: '09:00',
        hora_fin: '12:00',
        estado: 'pendiente',
        numero_personas: espacio.capacidad || 1,
      };

      db.reservas_espacios.push(nuevaReserva);
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

      // Actualizar el estado del espacio
      setEspacios(espacios.map(e => 
        e.id === espacio.id ? { ...e, estado: 'reservado' } : e
      ));

      alert('✅ Reserva realizada exitosamente. El administrador revisará tu solicitud.');
    } catch (error) {
      console.error('Error al realizar reserva:', error);
      alert('Error al realizar la reserva. Por favor, intenta de nuevo.');
    } finally {
      setLoadingReserva(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToHome />
          <div className="mt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              📅 Reservas de Espacios Comunes
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Consulta la disponibilidad y reserva los espacios comunes de Ciudad Colonial
            </p>
          </div>
        </div>

        {/* Filtros de estado */}
        <div className="mb-8 flex flex-wrap gap-3">
          {estados.map((estado) => (
            <button
              key={estado}
              onClick={() => setSelectedEstado(estado)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedEstado === estado
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {estado === 'todos' ? 'Todos' : estadoLabels[estado as keyof typeof estadoLabels]}
            </button>
          ))}
        </div>

        {/* Lista de espacios */}
        {filteredEspacios.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">No hay espacios en este estado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredEspacios.map((espacio, index) => (
              <motion.div
                key={espacio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
                style={{
                  borderLeftColor:
                    espacio.estado === 'disponible'
                      ? '#22c55e'
                      : espacio.estado === 'reservado'
                      ? '#ef4444'
                      : espacio.estado === 'mantenimiento'
                      ? '#eab308'
                      : '#6b7280',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          estadoColors[espacio.estado]
                        }`}
                      >
                        {estadoLabels[espacio.estado]}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {espacio.espacio}
                    </h2>
                  </div>
                </div>

                <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-line">
                  {espacio.descripcion}
                </p>

                {/* Información adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {espacio.capacidad && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">👥 Capacidad:</span>
                      <span>{espacio.capacidad} personas</span>
                    </div>
                  )}
                  {espacio.horarios && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-semibold">🕐 Horarios:</span>
                      <span>{espacio.horarios}</span>
                    </div>
                  )}
                </div>

                {espacio.equipamiento && espacio.equipamiento.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Equipamiento incluido:</p>
                    <div className="flex flex-wrap gap-2">
                      {espacio.equipamiento.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2 sm:mb-0">
                    <span className="flex items-center gap-1">
                      📅 Última actualización: {formatFecha(espacio.fecha)}
                    </span>
                  </div>
                  {espacio.estado === 'disponible' && (
                    <button 
                      onClick={() => handleReservar(espacio)}
                      disabled={loadingReserva === espacio.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingReserva === espacio.id ? 'Procesando...' : 'Reservar Ahora'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 ¿Cómo hacer una reserva?
          </h3>
          <p className="text-blue-800 text-sm mb-2">
            Para reservar un espacio común, puedes hacerlo a través del portal seleccionando el botón "Reservar Ahora"
            en los espacios disponibles, o contactando directamente a la administración.
          </p>
          <p className="text-blue-800 text-sm">
            Las reservas están sujetas a disponibilidad y deben realizarse con al menos 48 horas de anticipación.
          </p>
        </div>
      </div>
    </div>
  );
};

