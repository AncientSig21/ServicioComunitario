import { useState, useEffect } from 'react';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { fetchEspaciosComunes, crearEspacioComun, eliminarEspacioComun } from '../services/bookService';

interface EspacioComun {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidad: number | null;
  horarios: string | null;
  equipamiento: string[] | null;
  estado: string;
  activo: boolean;
  created_at?: string;
}

const estadoColors = {
  activo: 'bg-green-100 text-green-800 border-green-300',
  disponible: 'bg-green-100 text-green-800 border-green-300',
  reservado: 'bg-red-100 text-red-800 border-red-300',
  mantenimiento: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  cerrado: 'bg-gray-100 text-gray-800 border-gray-300',
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const estadoLabels = {
  activo: 'Disponible',
  disponible: 'Disponible',
  reservado: 'Reservado',
  mantenimiento: 'En Mantenimiento',
  cerrado: 'Cerrado',
  pendiente: 'Pendiente',
};

export const ReservasPage = () => {
  const { user } = useAuth();
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [espacios, setEspacios] = useState<EspacioComun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingReserva, setLoadingReserva] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    capacidad: '',
    horarios: '',
    equipamiento: '',
  });

  const estados = ['todos', 'activo', 'disponible', 'mantenimiento', 'cerrado'];

  // Cargar espacios desde la base de datos
  useEffect(() => {
    const cargarEspacios = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEspaciosComunes(user?.condominio_id, true); // Solo aprobados
        setEspacios(data || []);
      } catch (err: any) {
        console.error('Error cargando espacios:', err);
        setError(err.message || 'Error al cargar los espacios comunes');
      } finally {
        setLoading(false);
      }
    };

    cargarEspacios();
  }, [user]);

  const filteredEspacios = selectedEstado === 'todos'
    ? espacios
    : espacios.filter(espacio => {
        if (selectedEstado === 'activo' || selectedEstado === 'disponible') {
          return espacio.estado === 'activo' || espacio.estado === 'disponible';
        }
        return espacio.estado === selectedEstado;
      });

  const handleCrearEspacio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Debes estar autenticado para crear un espacio');
      return;
    }

    if (!formData.nombre.trim()) {
      alert('Por favor, proporciona un nombre para el espacio');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const equipamientoArray = formData.equipamiento
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      await crearEspacioComun({
        usuario_creador_id: user.id,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : undefined,
        horarios: formData.horarios.trim() || undefined,
        equipamiento: equipamientoArray.length > 0 ? equipamientoArray : undefined,
        es_admin: user.rol === 'admin',
      });

      if (user.rol === 'admin') {
        alert('✅ Espacio común creado exitosamente. El espacio está disponible inmediatamente.');
      } else {
        alert('✅ Solicitud de espacio común enviada exitosamente.\n\nEl administrador revisará tu solicitud y te notificará cuando sea aprobada o rechazada.');
      }
      
      setFormData({ nombre: '', descripcion: '', capacidad: '', horarios: '', equipamiento: '' });
      setShowCreateModal(false);
      
      // Recargar espacios
      const data = await fetchEspaciosComunes(user?.condominio_id, true);
      setEspacios(data || []);
    } catch (err: any) {
      console.error('Error creando espacio:', err);
      setError(err.message || 'Error al crear el espacio común');
      alert(`Error: ${err.message || 'No se pudo crear el espacio'}`);
    } finally {
      setCreating(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleReservar = async (espacio: EspacioComun) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar una reserva');
      return;
    }

    // Por ahora, solo mostramos un mensaje informativo
    // La funcionalidad completa de reserva se puede implementar después
    alert('La funcionalidad de reserva se implementará próximamente. Por ahora, puedes contactar a la administración.');
  };

  const handleEliminarEspacio = async (espacio: EspacioComun) => {
    if (!user || user.rol !== 'admin') {
      alert('Solo los administradores pueden eliminar espacios');
      return;
    }

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el espacio "${espacio.nombre}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      setLoading(true);
      await eliminarEspacioComun(espacio.id, user.id);
      alert('✅ Espacio eliminado exitosamente');
      
      // Recargar espacios
      const data = await fetchEspaciosComunes(user?.condominio_id, true);
      setEspacios(data || []);
    } catch (err: any) {
      console.error('Error eliminando espacio:', err);
      alert(`Error: ${err.message || 'No se pudo eliminar el espacio'}`);
    } finally {
      setLoading(false);
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
              📅 Espacios comunes
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Consulta los espacios comunes disponibles en la comunidad y realiza tus reservas
            </p>
          </div>
        </div>

        {/* Botón para crear nuevo espacio */}
        {user && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md flex items-center gap-2"
            >
              ➕ Nuevo Espacio
            </button>
          </div>
        )}

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

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Lista de espacios */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 text-lg mt-4">Cargando espacios...</p>
          </div>
        ) : filteredEspacios.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">No hay espacios disponibles en este momento</p>
            {user && (
              <p className="text-gray-400 text-sm mt-2">
                Puedes crear un nuevo espacio usando el botón de arriba
              </p>
            )}
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
                    espacio.estado === 'activo' || espacio.estado === 'disponible'
                      ? '#22c55e'
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
                          estadoColors[espacio.estado as keyof typeof estadoColors] || estadoColors.activo
                        }`}
                      >
                        {estadoLabels[espacio.estado as keyof typeof estadoLabels] || 'Disponible'}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {espacio.nombre}
                    </h2>
                  </div>
                </div>

                {espacio.descripcion && (
                  <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-line">
                    {espacio.descripcion}
                  </p>
                )}

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
                    {espacio.created_at && (
                      <span className="flex items-center gap-1">
                        📅 Creado: {formatFecha(espacio.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(espacio.estado === 'activo' || espacio.estado === 'disponible') && (
                      <button 
                        onClick={() => handleReservar(espacio)}
                        disabled={loadingReserva === espacio.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingReserva === espacio.id ? 'Procesando...' : 'Reservar Ahora'}
                      </button>
                    )}
                    {user?.rol === 'admin' && (
                      <button 
                        onClick={() => handleEliminarEspacio(espacio)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar espacio"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Información sobre espacios comunes
          </h3>
          <p className="text-blue-800 text-sm mb-2">
            Los espacios comunes mostrados aquí son los aprobados y disponibles en la comunidad. 
            Puedes proponer nuevos espacios usando el botón "Nuevo Espacio" de arriba.
          </p>
          <p className="text-blue-800 text-sm">
            Las propuestas de espacios serán revisadas por el administrador antes de ser publicadas.
          </p>
        </div>
      </div>

      {/* Modal para crear espacio */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user?.rol === 'admin' ? 'Nuevo Espacio Común' : 'Solicitar Nuevo Espacio Común'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ nombre: '', descripcion: '', capacidad: '', horarios: '', equipamiento: '' });
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {user?.rol !== 'admin' && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>⚠️ Importante:</strong> Esta es una solicitud que será revisada por el administrador. 
                    El espacio solo estará disponible después de ser aprobado.
                  </p>
                </div>
              )}
              <form onSubmit={handleCrearEspacio} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Espacio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Cancha de Fútbol, Gimnasio, Piscina, Campo de Juegos..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Describe el espacio, sus características y usos..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacidad (personas)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacidad}
                      onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: 50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horarios
                    </label>
                    <input
                      type="text"
                      value={formData.horarios}
                      onChange={(e) => setFormData({ ...formData, horarios: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Lunes a Viernes: 8:00 AM - 8:00 PM"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipamiento (separado por comas)
                  </label>
                  <input
                    type="text"
                    value={formData.equipamiento}
                    onChange={(e) => setFormData({ ...formData, equipamiento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Iluminación, Redes, Bancas, Duchas"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separa cada elemento con una coma
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ nombre: '', descripcion: '', capacidad: '', horarios: '', equipamiento: '' });
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating 
                      ? (user?.rol === 'admin' ? 'Creando...' : 'Enviando solicitud...') 
                      : (user?.rol === 'admin' ? 'Crear Espacio' : 'Solicitar Espacio')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

