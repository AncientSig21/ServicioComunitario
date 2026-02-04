import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchEspaciosComunes, eliminarEspacioComun, actualizarEspacioComun, fetchSolicitudesMantenimiento, actualizarSolicitudMantenimiento, fetchAnuncios, actualizarAnuncio, eliminarAnuncio, crearNotificacion } from '../services/bookService';
import { FaEdit, FaTrash, FaCalendarAlt, FaBuilding, FaSearch, FaFilter, FaWrench, FaImages } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressModal } from '../components/maintenance/ProgressModal';

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

export interface SolicitudMantenimientoAdmin {
  id: number;
  titulo: string;
  descripcion: string | null;
  estado: string | null;
  prioridad: string | null;
  ubicacion: string | null;
  observaciones: string | null;
  fecha_solicitud: string | null;
  usuarios?: { nombre?: string; correo?: string } | null;
}

export const AdminGestionEventosEspaciosPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'eventos' | 'espacios' | 'mantenimiento'>('eventos');
  
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
  const [quitarImagenEspacio, setQuitarImagenEspacio] = useState(false);
  const [eliminandoImagenEspacioId, setEliminandoImagenEspacioId] = useState<number | null>(null);
  const [nuevaImagenEspacio, setNuevaImagenEspacio] = useState<string | null>(null);
  const [formEspacio, setFormEspacio] = useState({
    nombre: '',
    descripcion: '',
    capacidad: '',
    horarios: '',
    equipamiento: '',
  });

  // Estados para Mantenimiento (solicitudes de mantenimiento de la comunidad)
  const [solicitudes, setSolicitudes] = useState<SolicitudMantenimientoAdmin[]>([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [searchMantenimiento, setSearchMantenimiento] = useState('');
  const [filtroEstadoMantenimiento, setFiltroEstadoMantenimiento] = useState<string>('todos');
  const [showEditMantenimientoModal, setShowEditMantenimientoModal] = useState(false);
  const [solicitudEditando, setSolicitudEditando] = useState<SolicitudMantenimientoAdmin | null>(null);
  const [formMantenimiento, setFormMantenimiento] = useState({
    titulo: '',
    descripcion: '',
    ubicacion: '',
    prioridad: 'media' as string,
    observaciones: '',
  });
  const [showAvancesModal, setShowAvancesModal] = useState(false);
  const [solicitudAvancesId, setSolicitudAvancesId] = useState<number | null>(null);
  const [solicitudAvancesTitulo, setSolicitudAvancesTitulo] = useState('');

  const cargarEventos = async () => {
    try {
      setEventosLoading(true);
      const rows = await fetchAnuncios(undefined, 'evento', true);
      const eventosData: Evento[] = rows.map((r: any) => ({
        id: r.id,
        titulo: r.titulo || '',
        contenido: r.contenido || '',
        fecha: r.fecha_publicacion ? new Date(r.fecha_publicacion).toISOString().split('T')[0] : '',
        categoria: 'evento',
        autor: r.autor_usuario?.nombre || 'Pendiente de aprobación',
        estado: r.activo ? 'aprobado' : 'pendiente',
        usuario_id: r.autor_usuario_id,
        usuario_nombre: r.autor_usuario?.nombre,
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

  // Cargar solicitudes de mantenimiento desde Supabase
  const cargarSolicitudesMantenimiento = async () => {
    try {
      setSolicitudesLoading(true);
      const filters = filtroEstadoMantenimiento !== 'todos'
        ? { estado: filtroEstadoMantenimiento as 'pendiente' | 'aprobado' | 'rechazado' | 'completado' }
        : undefined;
      const data = await fetchSolicitudesMantenimiento(filters);
      const list: SolicitudMantenimientoAdmin[] = (data || []).map((s: any) => ({
        id: s.id,
        titulo: s.titulo || '',
        descripcion: s.descripcion ?? null,
        estado: s.estado ?? null,
        prioridad: s.prioridad ?? null,
        ubicacion: s.ubicacion ?? null,
        observaciones: s.observaciones ?? null,
        fecha_solicitud: s.fecha_solicitud ?? null,
        usuarios: s.usuarios ?? null,
      }));
      setSolicitudes(list);
    } catch (error: any) {
      console.error('Error cargando solicitudes de mantenimiento:', error);
      setSolicitudes([]);
    } finally {
      setSolicitudesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      if (activeTab === 'eventos') {
        cargarEventos();
      } else if (activeTab === 'espacios') {
        cargarEspacios();
      } else if (activeTab === 'mantenimiento') {
        cargarSolicitudesMantenimiento();
      }
    }
  }, [user?.id, activeTab, filtroEstadoMantenimiento]);

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(evento => {
    const matchSearch = searchEventos === '' || 
      evento.titulo.toLowerCase().includes(searchEventos.toLowerCase()) ||
      evento.contenido.toLowerCase().includes(searchEventos.toLowerCase());
    
    const matchEstado = filtroEstadoEventos === 'todos' || 
      evento.estado === filtroEstadoEventos;
    
    return matchSearch && matchEstado;
  });

  // Filtrar solicitudes de mantenimiento
  const solicitudesFiltradas = solicitudes.filter(sol => {
    const matchSearch = searchMantenimiento === '' ||
      (sol.titulo && sol.titulo.toLowerCase().includes(searchMantenimiento.toLowerCase())) ||
      (sol.descripcion && sol.descripcion.toLowerCase().includes(searchMantenimiento.toLowerCase())) ||
      (sol.ubicacion && sol.ubicacion.toLowerCase().includes(searchMantenimiento.toLowerCase()));
    return matchSearch;
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

  const handleGuardarEvento = async () => {
    if (!eventoEditando) return;
    if (!formEvento.titulo.trim() || !formEvento.contenido.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await actualizarAnuncio(eventoEditando.id, {
        titulo: formEvento.titulo.trim(),
        contenido: formEvento.contenido.trim(),
      });
      alert('✅ Evento actualizado exitosamente');
      setShowEditEventoModal(false);
      setEventoEditando(null);
      await cargarEventos();
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
      await eliminarAnuncio(evento.id);
      if (evento.usuario_id) {
        try {
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
      await cargarEventos();
    } catch (error) {
      console.error('Error eliminando evento:', error);
      alert('Error al eliminar el evento');
    }
  };

  // ==================== FUNCIONES DE ESPACIOS ====================

  const handleEditarEspacio = (espacio: EspacioComun) => {
    setEspacioEditando(espacio);
    setQuitarImagenEspacio(false);
    setNuevaImagenEspacio(null);
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

  const handleEliminarImagenEspacio = async (espacio: EspacioComun) => {
    if (!user?.id || !espacio.imagen_url) return;
    if (!window.confirm(`¿Quitar la imagen del espacio "${espacio.nombre}"?`)) return;
    try {
      setEliminandoImagenEspacioId(espacio.id);
      await actualizarEspacioComun(espacio.id, user.id, { imagen_url: null });
      await cargarEspacios();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar la imagen');
    } finally {
      setEliminandoImagenEspacioId(null);
    }
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

      const imagenPayload =
        nuevaImagenEspacio ? { imagen_url: nuevaImagenEspacio } : quitarImagenEspacio ? { imagen_url: null } : {};
      await actualizarEspacioComun(espacioEditando.id, user.id, {
        nombre: formEspacio.nombre.trim(),
        descripcion: formEspacio.descripcion.trim() || null,
        capacidad: formEspacio.capacidad ? parseInt(formEspacio.capacidad) : null,
        horarios: formEspacio.horarios.trim() || null,
        equipamiento: equipamientoArray.length > 0 ? equipamientoArray : null,
        ...imagenPayload,
      });
      if (quitarImagenEspacio) setQuitarImagenEspacio(false);
      if (nuevaImagenEspacio) setNuevaImagenEspacio(null);

      alert('✅ Espacio común actualizado exitosamente');
      setShowEditEspacioModal(false);
      setEspacioEditando(null);
      setQuitarImagenEspacio(false);
      setNuevaImagenEspacio(null);
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

  // ==================== FUNCIONES DE MANTENIMIENTO ====================

  const handleEditarMantenimiento = (sol: SolicitudMantenimientoAdmin) => {
    setSolicitudEditando(sol);
    setFormMantenimiento({
      titulo: sol.titulo || '',
      descripcion: sol.descripcion || '',
      ubicacion: sol.ubicacion || '',
      prioridad: (sol.prioridad as string) || 'media',
      observaciones: sol.observaciones || '',
    });
    setShowEditMantenimientoModal(true);
  };

  const handleGuardarMantenimiento = async () => {
    if (!solicitudEditando) return;
    if (!formMantenimiento.titulo.trim()) {
      alert('El título es obligatorio');
      return;
    }
    try {
      await actualizarSolicitudMantenimiento({
        solicitud_id: solicitudEditando.id,
        titulo: formMantenimiento.titulo.trim(),
        descripcion: formMantenimiento.descripcion.trim() || undefined,
        ubicacion: formMantenimiento.ubicacion.trim() || null,
        prioridad: formMantenimiento.prioridad as 'baja' | 'media' | 'alta' | 'urgente',
        observaciones: formMantenimiento.observaciones.trim() || null,
      });
      alert('✅ Solicitud actualizada. Los cambios se verán en Solicitudes de mantenimiento y servicios.');
      setShowEditMantenimientoModal(false);
      setSolicitudEditando(null);
      cargarSolicitudesMantenimiento();
    } catch (error: any) {
      console.error('Error actualizando solicitud:', error);
      alert(error.message || 'Error al guardar');
    }
  };

  const handleVerAvances = (sol: SolicitudMantenimientoAdmin) => {
    setSolicitudAvancesId(sol.id);
    setSolicitudAvancesTitulo(sol.titulo || '');
    setShowAvancesModal(true);
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
            <button
              onClick={() => setActiveTab('mantenimiento')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'mantenimiento'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaWrench className="inline mr-2" />
              Mantenimiento ({solicitudes.length})
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
            <p className="text-gray-600 mb-6">
              Administra los espacios comunes. Puedes editar cada espacio y, si tiene imagen, eliminarla con el botón de eliminar imagen (icono de papelera en color ámbar).
            </p>
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
                      <div className="flex gap-2 flex-wrap">
                        {espacio.imagen_url && (
                          <button
                            onClick={() => handleEliminarImagenEspacio(espacio)}
                            disabled={eliminandoImagenEspacioId === espacio.id}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar imagen del espacio"
                          >
                            {eliminandoImagenEspacioId === espacio.id ? (
                              <span className="animate-spin inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
                            ) : (
                              <FaTrash className="w-4 h-4" />
                            )}
                            <span className="sr-only">Eliminar imagen</span>
                          </button>
                        )}
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
                    {espacio.imagen_url && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={espacio.imagen_url}
                          alt={espacio.nombre}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
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

        {/* Contenido de Mantenimiento */}
        {activeTab === 'mantenimiento' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-xl p-6"
          >
            <p className="text-gray-600 mb-6">
              Gestiona los mantenimientos de la comunidad. Las ediciones y las imágenes de avances que agregues aquí se mostrarán en la sección <strong>Solicitudes de mantenimiento</strong> para los residentes. Desde <strong>Avances y fotos</strong> puedes agregar imágenes de progreso y eliminar las que ya no quieras.
            </p>
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por título, descripción o ubicación..."
                  value={searchMantenimiento}
                  onChange={(e) => setSearchMantenimiento(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={filtroEstadoMantenimiento}
                  onChange={(e) => setFiltroEstadoMantenimiento(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="aprobado">Aprobados</option>
                  <option value="completado">Completados</option>
                  <option value="rechazado">Rechazados</option>
                </select>
              </div>
            </div>

            {solicitudesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando solicitudes de mantenimiento...</p>
              </div>
            ) : solicitudesFiltradas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay solicitudes de mantenimiento para mostrar
              </div>
            ) : (
              <div className="space-y-4">
                {solicitudesFiltradas.map((sol) => (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{sol.titulo}</h3>
                        {sol.descripcion && (
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{sol.descripcion}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {sol.fecha_solicitud && (
                            <span>📅 {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES')}</span>
                          )}
                          {sol.ubicacion && <span>📍 {sol.ubicacion}</span>}
                          {sol.usuarios?.nombre && <span>👤 {sol.usuarios.nombre}</span>}
                          <span className={`px-2 py-1 rounded ${
                            sol.estado === 'completado' ? 'bg-green-100 text-green-800' :
                            sol.estado === 'aprobado' ? 'bg-blue-100 text-blue-800' :
                            sol.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sol.estado || 'pendiente'}
                          </span>
                          {sol.prioridad && (
                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                              Prioridad: {sol.prioridad}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditarMantenimiento(sol)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar solicitud"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleVerAvances(sol)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Ver avances y fotos / Agregar imágenes de progreso"
                        >
                          <FaImages className="mr-1" />
                          <span className="text-sm">Avances y fotos</span>
                        </button>
                      </div>
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
                  {(espacioEditando.imagen_url || nuevaImagenEspacio) && !quitarImagenEspacio && (
                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {nuevaImagenEspacio ? 'Nueva imagen (se guardará al guardar cambios)' : 'Imagen actual del espacio'}
                      </p>
                      <img
                        src={nuevaImagenEspacio || espacioEditando.imagen_url || ''}
                        alt={espacioEditando.nombre}
                        className="w-full max-h-48 object-contain rounded-lg"
                      />
                      {!nuevaImagenEspacio && (
                        <button
                          type="button"
                          onClick={() => setQuitarImagenEspacio(true)}
                          className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          title="Quitar la imagen al guardar"
                        >
                          <FaTrash className="w-4 h-4" />
                          Eliminar imagen
                        </button>
                      )}
                      {nuevaImagenEspacio && (
                        <button
                          type="button"
                          onClick={() => setNuevaImagenEspacio(null)}
                          className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Quitar nueva imagen
                        </button>
                      )}
                    </div>
                  )}
                  {!nuevaImagenEspacio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Añadir o cambiar foto del espacio
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            if (dataUrl) setNuevaImagenEspacio(dataUrl);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  )}
                  {quitarImagenEspacio && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      La imagen se quitará al guardar los cambios.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => {
                      setShowEditEspacioModal(false);
                      setEspacioEditando(null);
                      setQuitarImagenEspacio(false);
                      setNuevaImagenEspacio(null);
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

        {/* Modal de Edición de Solicitud de Mantenimiento */}
        <AnimatePresence>
          {showEditMantenimientoModal && solicitudEditando && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Solicitud de Mantenimiento</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Los cambios se reflejarán en la sección <strong>Solicitudes de mantenimiento y servicios</strong> para los residentes.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                    <input
                      type="text"
                      value={formMantenimiento.titulo}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, titulo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formMantenimiento.descripcion}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, descripcion: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                    <input
                      type="text"
                      value={formMantenimiento.ubicacion}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, ubicacion: e.target.value })}
                      placeholder="Ej: Área común, Ascensor, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                    <select
                      value={formMantenimiento.prioridad}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, prioridad: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea
                      value={formMantenimiento.observaciones}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, observaciones: e.target.value })}
                      rows={2}
                      placeholder="Notas internas o para el residente"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => {
                      setShowEditMantenimientoModal(false);
                      setSolicitudEditando(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarMantenimiento}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Avances (imágenes de progreso) - mismo componente que usa el residente */}
        {solicitudAvancesId !== null && (
          <ProgressModal
            isOpen={showAvancesModal}
            onClose={() => {
              setShowAvancesModal(false);
              setSolicitudAvancesId(null);
              setSolicitudAvancesTitulo('');
              cargarSolicitudesMantenimiento();
            }}
            solicitudId={solicitudAvancesId}
            solicitudTitulo={solicitudAvancesTitulo}
          />
        )}
      </div>
    </div>
  );
};

