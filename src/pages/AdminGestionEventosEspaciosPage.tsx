import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchEspaciosComunes, eliminarEspacioComun, actualizarEspacioComun } from '../services/bookService';
import { FaEdit, FaTrash, FaCalendarAlt, FaBuilding, FaSearch, FaFilter } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_DB_KEY = 'mockDatabase_condominio';

interface Evento {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  categoria: 'general' | 'importante' | 'mantenimiento' | 'evento' | 'foro';
  autor?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  usuario_id?: number;
  usuario_nombre?: string;
}

interface EspacioComun {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidad: number | null;
  horarios: string | null;
  equipamiento?: string[] | null;
  estado: string;
  activo: boolean | null;
  created_at?: string | null;
  condominio_id?: number | null;
  imagen_url?: string | null;
  updated_at?: string | null;
}

export const AdminGestionEventosEspaciosPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'eventos' | 'espacios'>('eventos');
  
  // Estados para eventos
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const [searchEventos, setSearchEventos] = useState('');
  const [filtroEstadoEventos, setFiltroEstadoEventos] = useState<string>('todos');
  const [showEditEventoModal, setShowEditEventoModal] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [formEvento, setFormEvento] = useState({ titulo: '', contenido: '', fecha: '' });

  // Estados para espacios
  const [espacios, setEspacios] = useState<EspacioComun[]>([]);
  const [espaciosLoading, setEspaciosLoading] = useState(false);
  const [searchEspacios, setSearchEspacios] = useState('');
  const [filtroEstadoEspacios, setFiltroEstadoEspacios] = useState<string>('todos');
  const [showEditEspacioModal, setShowEditEspacioModal] = useState(false);
  const [espacioEditando, setEspacioEditando] = useState<EspacioComun | null>(null);
  const [formEspacio, setFormEspacio] = useState({
    nombre: '',
    descripcion: '',
    capacidad: '',
    horarios: '',
    equipamiento: '',
  });

  // Cargar eventos desde localStorage
  const cargarEventos = () => {
    try {
      setEventosLoading(true);
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const todosLosAnuncios = db.anuncios || [];
      
      const eventosData = todosLosAnuncios
        .filter((anuncio: any) => anuncio.categoria === 'evento')
        .map((anuncio: any) => ({
          ...anuncio,
          estado: anuncio.estado || (anuncio.autor === 'Pendiente de aprobación' ? 'pendiente' : 'aprobado'),
        }));

      setEventos(eventosData);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setEventos([]);
    } finally {
      setEventosLoading(false);
    }
  };

  // Cargar espacios desde Supabase
  const cargarEspacios = async () => {
    try {
      setEspaciosLoading(true);
      // Cargar TODOS los espacios (no solo aprobados)
      const data = await fetchEspaciosComunes(user?.condominio_id, false);
      setEspacios(data || []);
    } catch (error: any) {
      console.error('Error cargando espacios:', error);
      alert(error.message || 'Error al cargar los espacios comunes');
    } finally {
      setEspaciosLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      if (activeTab === 'eventos') {
        cargarEventos();
      } else {
        cargarEspacios();
      }
    }
  }, [user, activeTab]);

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(evento => {
    const matchSearch = searchEventos === '' || 
      evento.titulo.toLowerCase().includes(searchEventos.toLowerCase()) ||
      evento.contenido.toLowerCase().includes(searchEventos.toLowerCase());
    
    const matchEstado = filtroEstadoEventos === 'todos' || 
      evento.estado === filtroEstadoEventos;
    
    return matchSearch && matchEstado;
  });

  // Filtrar espacios
  const espaciosFiltrados = espacios.filter(espacio => {
    const matchSearch = searchEspacios === '' || 
      espacio.nombre.toLowerCase().includes(searchEspacios.toLowerCase()) ||
      (espacio.descripcion && espacio.descripcion.toLowerCase().includes(searchEspacios.toLowerCase()));
    
    const matchEstado = filtroEstadoEspacios === 'todos' ||
      (filtroEstadoEspacios === 'activo' && espacio.activo === true) ||
      (filtroEstadoEspacios === 'pendiente' && espacio.activo === false) ||
      (filtroEstadoEspacios === 'inactivo' && espacio.activo === false);
    
    return matchSearch && matchEstado;
  });

  // ==================== FUNCIONES DE EVENTOS ====================

  const handleEditarEvento = (evento: Evento) => {
    setEventoEditando(evento);
    setFormEvento({
      titulo: evento.titulo,
      contenido: evento.contenido,
      fecha: evento.fecha,
    });
    setShowEditEventoModal(true);
  };

  const handleGuardarEvento = () => {
    if (!eventoEditando) return;
    if (!formEvento.titulo.trim() || !formEvento.contenido.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const anuncios = db.anuncios || [];
      
      const index = anuncios.findIndex((a: any) => 
        a.id === eventoEditando.id && a.categoria === 'evento'
      );

      if (index !== -1) {
        anuncios[index] = {
          ...anuncios[index],
          titulo: formEvento.titulo.trim(),
          contenido: formEvento.contenido.trim(),
          fecha: formEvento.fecha || anuncios[index].fecha,
        };

        db.anuncios = anuncios;
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
        
        alert('✅ Evento actualizado exitosamente');
        setShowEditEventoModal(false);
        setEventoEditando(null);
        cargarEventos();
      }
    } catch (error) {
      console.error('Error actualizando evento:', error);
      alert('Error al actualizar el evento');
    }
  };

  const handleEliminarEvento = async (evento: Evento) => {
    if (!user?.id) return;

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el evento "${evento.titulo}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const anuncios = db.anuncios || [];
      
      const anunciosFiltrados = anuncios.filter((anuncio: any) => 
        !(anuncio.id === evento.id && anuncio.categoria === 'evento')
      );

      db.anuncios = anunciosFiltrados;
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

      // Notificar al usuario si existe
      if (evento.usuario_id) {
        try {
          const { crearNotificacion } = await import('../services/bookService');
          await crearNotificacion(
            evento.usuario_id,
            'evento_eliminado',
            `El evento "${evento.titulo}" ha sido eliminado por el administrador.`,
            'evento',
            evento.id,
            'Evento Eliminado'
          );
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
        }
      }

      alert('✅ Evento eliminado exitosamente');
      cargarEventos();
    } catch (error) {
      console.error('Error eliminando evento:', error);
      alert('Error al eliminar el evento');
    }
  };

  // ==================== FUNCIONES DE ESPACIOS ====================

  const handleEditarEspacio = (espacio: EspacioComun) => {
    setEspacioEditando(espacio);
    setFormEspacio({
      nombre: espacio.nombre,
      descripcion: espacio.descripcion || '',
      capacidad: espacio.capacidad?.toString() || '',
      horarios: espacio.horarios || '',
      equipamiento: Array.isArray(espacio.equipamiento) 
        ? espacio.equipamiento.join(', ') 
        : espacio.equipamiento || '',
    });
    setShowEditEspacioModal(true);
  };

  const handleGuardarEspacio = async () => {
    if (!espacioEditando || !user?.id) return;
    if (!formEspacio.nombre.trim()) {
      alert('Por favor completa el nombre del espacio');
      return;
    }

    try {
      setEspaciosLoading(true);

      const equipamientoArray = formEspacio.equipamiento
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      await actualizarEspacioComun(espacioEditando.id, user.id, {
        nombre: formEspacio.nombre.trim(),
        descripcion: formEspacio.descripcion.trim() || null,
        capacidad: formEspacio.capacidad ? parseInt(formEspacio.capacidad) : null,
        horarios: formEspacio.horarios.trim() || null,
        equipamiento: equipamientoArray.length > 0 ? equipamientoArray : null,
      });

      alert('✅ Espacio común actualizado exitosamente');
      setShowEditEspacioModal(false);
      setEspacioEditando(null);
      await cargarEspacios();
    } catch (error: any) {
      console.error('Error actualizando espacio:', error);
      alert(error.message || 'Error al actualizar el espacio');
    } finally {
      setEspaciosLoading(false);
    }
  };

  const handleEliminarEspacio = async (espacio: EspacioComun) => {
    if (!user?.id) return;

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el espacio "${espacio.nombre}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      setEspaciosLoading(true);
      await eliminarEspacioComun(espacio.id, user.id);
      alert('✅ Espacio eliminado exitosamente');
      await cargarEspacios();
    } catch (error: any) {
      console.error('Error eliminando espacio:', error);
      alert(error.message || 'Error al eliminar el espacio');
    } finally {
      setEspaciosLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-xl p-6 mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Gestión de Eventos y Espacios Comunes
          </h1>
          <p className="text-gray-600">
            Administra y modifica eventos y espacios comunes del sistema
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('eventos')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'eventos'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaCalendarAlt className="inline mr-2" />
              Eventos ({eventos.length})
            </button>
            <button
              onClick={() => setActiveTab('espacios')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'espacios'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaBuilding className="inline mr-2" />
              Espacios Comunes ({espacios.length})
            </button>
          </div>
        </div>

        {/* Contenido de Eventos */}
        {activeTab === 'eventos' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-xl p-6"
          >
            {/* Filtros y búsqueda */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={searchEventos}
                  onChange={(e) => setSearchEventos(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={filtroEstadoEventos}
                  onChange={(e) => setFiltroEstadoEventos(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="aprobado">Aprobados</option>
                  <option value="rechazado">Rechazados</option>
                </select>
              </div>
            </div>

            {/* Lista de eventos */}
            {eventosLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando eventos...</p>
              </div>
            ) : eventosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay eventos para mostrar
              </div>
            ) : (
              <div className="space-y-4">
                {eventosFiltrados.map((evento) => (
                  <motion.div
                    key={evento.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {evento.titulo}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {evento.contenido}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>📅 {new Date(evento.fecha).toLocaleDateString()}</span>
                          {evento.usuario_nombre && (
                            <span>👤 {evento.usuario_nombre}</span>
                          )}
                          <span className={`px-2 py-1 rounded ${
                            evento.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                            evento.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {evento.estado || 'pendiente'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditarEvento(evento)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar evento"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleEliminarEvento(evento)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar evento"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Contenido de Espacios */}
        {activeTab === 'espacios' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-xl p-6"
          >
            {/* Filtros y búsqueda */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar espacios..."
                  value={searchEspacios}
                  onChange={(e) => setSearchEspacios(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={filtroEstadoEspacios}
                  onChange={(e) => setFiltroEstadoEspacios(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>
            </div>

            {/* Lista de espacios */}
            {espaciosLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando espacios...</p>
              </div>
            ) : espaciosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay espacios comunes para mostrar
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {espaciosFiltrados.map((espacio) => (
                  <motion.div
                    key={espacio.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 flex-1">
                        {espacio.nombre}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditarEspacio(espacio)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar espacio"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleEliminarEspacio(espacio)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar espacio"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    {espacio.descripcion && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {espacio.descripcion}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {espacio.capacidad && <span>👥 {espacio.capacidad} personas</span>}
                      {espacio.horarios && <span>🕐 {espacio.horarios}</span>}
                      <span className={`px-2 py-1 rounded ${
                        espacio.activo ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {espacio.activo ? 'Activo' : 'Pendiente'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Modal de Edición de Evento */}
        <AnimatePresence>
          {showEditEventoModal && eventoEditando && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Evento</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={formEvento.titulo}
                      onChange={(e) => setFormEvento({ ...formEvento, titulo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contenido *
                    </label>
                    <textarea
                      value={formEvento.contenido}
                      onChange={(e) => setFormEvento({ ...formEvento, contenido: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={formEvento.fecha}
                      onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => {
                      setShowEditEventoModal(false);
                      setEventoEditando(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarEvento}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Edición de Espacio */}
        <AnimatePresence>
          {showEditEspacioModal && espacioEditando && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Espacio Común</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formEspacio.nombre}
                      onChange={(e) => setFormEspacio({ ...formEspacio, nombre: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={formEspacio.descripcion}
                      onChange={(e) => setFormEspacio({ ...formEspacio, descripcion: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacidad
                      </label>
                      <input
                        type="number"
                        value={formEspacio.capacidad}
                        onChange={(e) => setFormEspacio({ ...formEspacio, capacidad: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horarios
                      </label>
                      <input
                        type="text"
                        value={formEspacio.horarios}
                        onChange={(e) => setFormEspacio({ ...formEspacio, horarios: e.target.value })}
                        placeholder="Ej: Lunes a Viernes 8:00 AM - 6:00 PM"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Equipamiento (separado por comas)
                    </label>
                    <input
                      type="text"
                      value={formEspacio.equipamiento}
                      onChange={(e) => setFormEspacio({ ...formEspacio, equipamiento: e.target.value })}
                      placeholder="Ej: Proyector, Sonido, Mesas, Sillas"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => {
                      setShowEditEspacioModal(false);
                      setEspacioEditando(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarEspacio}
                    disabled={espaciosLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {espaciosLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

