import { useEffect, useState } from 'react';
import { fetchPagos, validarPago, crearNotificacion, fetchSolicitudesMantenimiento, actualizarEstadoSolicitud, fetchEspaciosPendientes, validarEspacioComun, eliminarEspacioComun } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/shared/Pagination';
import { FaCheck, FaTimes, FaEye, FaDollarSign, FaCalendarAlt, FaTools, FaBuilding } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Pago {
  id: number;
  usuario_id: number;
  vivienda_id: number | null;
  concepto: string;
  monto: number;
  abono?: number; // Campo real en la BD
  monto_pagado?: number; // Alias para compatibilidad
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  observaciones: string | null;
  created_at: string;
  usuarios?: {
    nombre: string;
    correo: string;
  };
  viviendas?: {
    numero_apartamento: string;
  };
  archivos?: {
    url: string;
    nombre: string;
  };
}

interface Evento {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  categoria: 'general' | 'importante' | 'mantenimiento' | 'evento' | 'foro';
  autor?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  usuario_id?: number; // ID del usuario que creó el evento
  usuario_nombre?: string; // Nombre del usuario que creó el evento
}

const MOCK_DB_KEY = 'mockDatabase_condominio';

interface SolicitudMantenimiento {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_solicitud: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'completado' | 'cancelado' | 'activo' | 'inactivo' | 'vencido' | 'pagado' | null;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  ubicacion?: string | null;
  usuarios?: {
    nombre: string;
    correo: string;
  };
}

interface EspacioComun {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidad: number | null;
  horarios: string | null;
  equipamiento?: string[] | null;
  equipo?: string | null; // Campo alternativo de la BD
  estado: string;
  activo: boolean | null;
  created_at?: string | null;
  condominio_id?: number | null;
  imagen_url?: string | null;
  updated_at?: string | null;
}

const AdminValidacionPagosPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pagos' | 'eventos' | 'solicitudes' | 'espacios'>('pagos');
  
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosPendientesCount, setEventosPendientesCount] = useState(0);
  const [showEventValidationModal, setShowEventValidationModal] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const [solicitudes, setSolicitudes] = useState<SolicitudMantenimiento[]>([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [solicitudesPendientesCount, setSolicitudesPendientesCount] = useState(0);
  const [showSolicitudValidationModal, setShowSolicitudValidationModal] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudMantenimiento | null>(null);
  const [motivoRechazoSolicitud, setMotivoRechazoSolicitud] = useState('');

  const [espacios, setEspacios] = useState<EspacioComun[]>([]);
  const [espaciosLoading, setEspaciosLoading] = useState(false);
  const [espaciosPendientesCount, setEspaciosPendientesCount] = useState(0);
  const [showEspacioValidationModal, setShowEspacioValidationModal] = useState(false);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<EspacioComun | null>(null);
  const [motivoRechazoEspacio, setMotivoRechazoEspacio] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('pendiente');

  const [formValidacion, setFormValidacion] = useState({
    nuevo_estado: 'pagado' as string,
    monto_aprobado: '',
    metodo_pago: '',
    referencia: '',
    observaciones: '',
  });

  const cargarEventos = () => {
    try {
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const todosLosAnuncios = db.anuncios || [];
      
      const eventosData = todosLosAnuncios
        .filter((anuncio: any) => anuncio.categoria === 'evento')
        .map((anuncio: any) => ({
          ...anuncio,
          estado: anuncio.estado || (anuncio.autor === 'Pendiente de aprobación' ? 'pendiente' : 'aprobado'),
        }));

      setEventos(eventosData);
      
      const pendientes = eventosData.filter((e: Evento) => e.estado === 'pendiente');
      setEventosPendientesCount(pendientes.length);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setEventos([]);
      setEventosPendientesCount(0);
    }
  };

  useEffect(() => {
    if (user?.id) {
      cargarPagos();
      cargarEventos();
      cargarSolicitudes();
      cargarEspacios();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'eventos') {
      cargarEventos();
    } else if (activeTab === 'solicitudes') {
      cargarSolicitudes();
    } else if (activeTab === 'espacios') {
      cargarEspacios();
    }
  }, [activeTab]);

  const cargarPagos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const pagosData = await fetchPagos({ estado: filtroEstado as any });
      
      const pagosUsuarios = (pagosData || []).filter((pago: any) => {
        const observaciones = pago.observaciones?.toLowerCase() || '';
        const concepto = pago.concepto?.toLowerCase() || '';
        const esAdminCreado = observaciones.includes('pago creado masivamente por administrador') ||
                              observaciones.includes('creado masivamente por administrador');
        
        if (esAdminCreado) {
          return false;
        }
        
        const esPagoRestante = concepto.includes('restante');
        
        if (esPagoRestante) {
          const tieneReferencia = pago.referencia && pago.referencia.trim() !== '';
          const tieneMetodoPago = pago.metodo_pago && pago.metodo_pago.trim() !== '';
          const tieneDescripcion = pago.observaciones && pago.observaciones.trim() !== '';
          const tieneComprobante = pago.comprobante_archivo_id !== null && pago.comprobante_archivo_id !== undefined;
          
          if (!tieneReferencia || !tieneMetodoPago || !tieneDescripcion || !tieneComprobante) {
            return false;
          }
        }
        
        return true;
      }).map((pago: any) => {
        const abono = pago.abono !== undefined && pago.abono !== null ? pago.abono : (pago.monto_pagado || 0);
        return {
          ...pago,
          abono: abono,
          monto_pagado: abono
        };
      });
      
      setPagos(pagosUsuarios);
    } catch (err: any) {
      console.error('Error cargando pagos:', err);
      setError(err.message || 'Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPagos();
  }, [filtroEstado]);

  const pagosFiltrados = pagos.filter(pago => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        pago.concepto?.toLowerCase().includes(query) ||
        pago.usuarios?.nombre?.toLowerCase().includes(query) ||
        pago.usuarios?.correo?.toLowerCase().includes(query) ||
        pago.viviendas?.numero_apartamento?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const eventosPendientes = eventos?.filter(e => e.estado === 'pendiente') || [];

  const cargarSolicitudes = async () => {
    try {
      setSolicitudesLoading(true);
      const data = await fetchSolicitudesMantenimiento({ estado: 'pendiente' });
      const solicitudesFiltradas = (data || [])
        .filter((s: any) => s.estado === 'pendiente')
        .map((s: any) => ({
          id: s.id,
          titulo: s.titulo,
          descripcion: s.descripcion,
          fecha_solicitud: s.fecha_solicitud,
          estado: s.estado as 'pendiente',
          prioridad: s.prioridad,
          ubicacion: s.ubicacion,
          usuarios: s.usuarios,
        }));
      setSolicitudes(solicitudesFiltradas);
      setSolicitudesPendientesCount(solicitudesFiltradas.length);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
      setError(err.message || 'Error al cargar las solicitudes de mantenimiento');
    } finally {
      setSolicitudesLoading(false);
    }
  };

  const cargarEspacios = async () => {
    try {
      setEspaciosLoading(true);
      const data: any[] = await fetchEspaciosPendientes();
      const espaciosMapeados: EspacioComun[] = (data || []).map((esp: any) => ({
        id: esp.id,
        nombre: esp.nombre,
        descripcion: esp.descripcion || null,
        capacidad: esp.capacidad || null,
        horarios: esp.horarios || null,
        equipamiento: Array.isArray(esp.equipamiento) ? esp.equipamiento : (esp.equipo ? [esp.equipo] : null),
        estado: esp.Estado || esp.estado || (esp.activo === true ? 'activo' : 'pendiente'), // Usar "Estado" con mayúscula si existe
        activo: esp.activo !== null && esp.activo !== undefined ? esp.activo : false,
        created_at: esp.created_at || null,
        condominio_id: esp.condominio_id || null,
        imagen_url: esp.imagen_url || null,
        updated_at: esp.updated_at || null,
      }));
      setEspacios(espaciosMapeados);
      setEspaciosPendientesCount(espaciosMapeados.length);
    } catch (err: any) {
      console.error('Error cargando espacios:', err);
      setError(err.message || 'Error al cargar los espacios comunes');
    } finally {
      setEspaciosLoading(false);
    }
  };

  const handleAbrirModalEspacio = (espacio: EspacioComun) => {
    setEspacioSeleccionado(espacio);
    setMotivoRechazoEspacio('');
    setShowEspacioValidationModal(true);
  };

  const handleAprobarEspacio = async () => {
    if (!user?.id || !espacioSeleccionado) return;

    try {
      setEspaciosLoading(true);
      await validarEspacioComun({
        espacio_id: espacioSeleccionado.id,
        admin_id: user.id,
        nuevo_estado: 'activo',
      });

      alert('✅ Espacio común aprobado exitosamente');
      setShowEspacioValidationModal(false);
      setEspacioSeleccionado(null);
      await cargarEspacios();
    } catch (err: any) {
      console.error('Error aprobando espacio:', err);
      alert(err.message || 'Error al aprobar el espacio');
    } finally {
      setEspaciosLoading(false);
    }
  };

  const handleRechazarEspacio = async () => {
    if (!user?.id || !espacioSeleccionado) return;
    if (!motivoRechazoEspacio.trim()) {
      alert('Por favor, proporciona un motivo para el rechazo.');
      return;
    }

    try {
      setEspaciosLoading(true);
      await validarEspacioComun({
        espacio_id: espacioSeleccionado.id,
        admin_id: user.id,
        nuevo_estado: 'rechazado',
        motivo_rechazo: motivoRechazoEspacio,
      });

      alert('❌ Espacio común rechazado exitosamente');
      setShowEspacioValidationModal(false);
      setEspacioSeleccionado(null);
      setMotivoRechazoEspacio('');
      await cargarEspacios();
    } catch (err: any) {
      console.error('Error rechazando espacio:', err);
      alert(err.message || 'Error al rechazar el espacio');
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
    } catch (err: any) {
      console.error('Error eliminando espacio:', err);
      alert(err.message || 'Error al eliminar el espacio');
    } finally {
      setEspaciosLoading(false);
    }
  };

  const handleAbrirModalSolicitud = (solicitud: SolicitudMantenimiento) => {
    setSolicitudSeleccionada(solicitud);
    setMotivoRechazoSolicitud('');
    setShowSolicitudValidationModal(true);
  };

  const handleAprobarSolicitud = async () => {
    if (!user?.id || !solicitudSeleccionada) return;

    try {
      setSolicitudesLoading(true);
      await actualizarEstadoSolicitud({
        solicitud_id: solicitudSeleccionada.id,
        usuario_id: user.id,
        nuevo_estado: 'aprobado',
      });

      alert('✅ Solicitud de mantenimiento aprobada exitosamente');
      setShowSolicitudValidationModal(false);
      setSolicitudSeleccionada(null);
      await cargarSolicitudes();
    } catch (err: any) {
      console.error('Error aprobando solicitud:', err);
      alert(err.message || 'Error al aprobar la solicitud');
    } finally {
      setSolicitudesLoading(false);
    }
  };

  const handleRechazarSolicitud = async () => {
    if (!user?.id || !solicitudSeleccionada) return;

    if (!motivoRechazoSolicitud.trim()) {
      alert('Debe proporcionar un motivo para rechazar la solicitud');
      return;
    }

    try {
      setSolicitudesLoading(true);
      await actualizarEstadoSolicitud({
        solicitud_id: solicitudSeleccionada.id,
        usuario_id: user.id,
        nuevo_estado: 'rechazado',
        motivo_rechazo: motivoRechazoSolicitud,
      });

      alert('✅ Solicitud de mantenimiento rechazada exitosamente');
      setShowSolicitudValidationModal(false);
      setSolicitudSeleccionada(null);
      setMotivoRechazoSolicitud('');
      await cargarSolicitudes();
    } catch (err: any) {
      console.error('Error rechazando solicitud:', err);
      alert(err.message || 'Error al rechazar la solicitud');
    } finally {
      setSolicitudesLoading(false);
    }
  };

  const totalPages = Math.ceil(pagosFiltrados.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPagos = pagosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'pendiente': 'bg-yellow-400 text-white',
      'pagado': 'bg-green-500 text-white',
      'vencido': 'bg-red-500 text-white',
      'parcial': 'bg-orange-500 text-white',
      'rechazado': 'bg-gray-400 text-white',
      'aprobado': 'bg-green-500 text-white',
    };
    return badges[estado] || 'bg-gray-400 text-white';
  };

  const handleAbrirModalValidacion = (pago: Pago) => {
    setPagoSeleccionado(pago);
    const montoActual = pago.abono !== undefined && pago.abono !== null 
      ? pago.abono 
      : (pago.monto_pagado || 0);
    const montoRestante = pago.monto - montoActual;
    
    setFormValidacion({
      nuevo_estado: montoRestante > 0 ? 'pendiente' : 'pagado',
      monto_aprobado: montoRestante > 0 ? montoRestante.toString() : pago.monto.toString(),
      metodo_pago: pago.metodo_pago || '',
      referencia: pago.referencia || '',
      observaciones: '',
    });
    setShowValidationModal(true);
  };

  const handleValidarPago = async () => {
    if (!user?.id || !pagoSeleccionado) return;

    if (!formValidacion.monto_aprobado || parseFloat(formValidacion.monto_aprobado) <= 0) {
      alert('El monto aprobado debe ser mayor a 0');
      return;
    }

    const montoAprobado = parseFloat(formValidacion.monto_aprobado);
    const montoActual = pagoSeleccionado.abono !== undefined && pagoSeleccionado.abono !== null 
      ? pagoSeleccionado.abono 
      : (pagoSeleccionado.monto_pagado || 0);
    const montoTotal = pagoSeleccionado.monto;
    const nuevoAbono = montoActual + montoAprobado;

    let estadoFinal: string;
    if (nuevoAbono >= montoTotal) {
      estadoFinal = 'pagado';
    } else {
      estadoFinal = 'pendiente';
    }

    try {
      setLoading(true);
      await validarPago({
        pago_id: pagoSeleccionado.id,
        admin_id: user.id,
        nuevo_estado: estadoFinal as any,
        monto_aprobado: montoAprobado,
        metodo_pago: formValidacion.metodo_pago || undefined,
        referencia: formValidacion.referencia || undefined,
        observaciones: formValidacion.observaciones || undefined,
      });

      if (estadoFinal === 'pagado') {
        alert(`✅ Pago completado exitosamente. Total pagado: ${formatMonto(nuevoAbono)}`);
      } else {
        alert(`✅ Abono de ${formatMonto(montoAprobado)} registrado exitosamente. ` +
              `Total pagado: ${formatMonto(nuevoAbono)} de ${formatMonto(montoTotal)}. ` +
              `Pendiente: ${formatMonto(montoTotal - nuevoAbono)}`);
      }
      
      setShowValidationModal(false);
      setPagoSeleccionado(null);
      setFormValidacion({
        nuevo_estado: 'pagado',
        monto_aprobado: '',
        metodo_pago: '',
        referencia: '',
        observaciones: '',
      });
      await cargarPagos();
    } catch (err: any) {
      console.error('Error validando pago:', err);
      alert(err.message || 'Error al validar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleRechazarPago = async () => {
    if (!user?.id || !pagoSeleccionado) return;

    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (!motivo || !motivo.trim()) {
      alert('Debe proporcionar un motivo para rechazar el pago');
      return;
    }

    try {
      setLoading(true);
      await validarPago({
        pago_id: pagoSeleccionado.id,
        admin_id: user.id,
        nuevo_estado: 'rechazado',
        observaciones: motivo,
      });

      alert('✅ Pago rechazado exitosamente');
      setShowValidationModal(false);
      setPagoSeleccionado(null);
      await cargarPagos();
    } catch (err: any) {
      console.error('Error rechazando pago:', err);
      alert(err.message || 'Error al rechazar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirModalEvento = (evento: Evento) => {
    setEventoSeleccionado(evento);
    setMotivoRechazo('');
    setShowEventValidationModal(true);
  };

  const handleAprobarEvento = async () => {
    if (!user?.id || !eventoSeleccionado) return;

    try {
      setLoading(true);
      
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const anuncios = db.anuncios || [];
      
      const eventoActualizado = anuncios.map((anuncio: any) => {
        if (anuncio.id === eventoSeleccionado.id && anuncio.categoria === 'evento') {
          return {
            ...anuncio,
            estado: 'aprobado',
            autor: eventoSeleccionado.autor || eventoSeleccionado.usuario_nombre || 'Administración',
          };
        }
        return anuncio;
      });

      db.anuncios = eventoActualizado;
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

      if (eventoSeleccionado.usuario_id) {
        try {
          await crearNotificacion(
            eventoSeleccionado.usuario_id,
            'evento_aprobado',
            `Tu evento "${eventoSeleccionado.titulo}" ha sido aprobado y ahora es visible para todos los residentes.`,
            'evento',
            eventoSeleccionado.id,
            'Evento Aprobado' // Título específico
          );
        } catch (notifError) {
          console.error('Error enviando notificación de evento aprobado:', notifError);
        }
      }

      alert('✅ Evento aprobado exitosamente');
      setShowEventValidationModal(false);
      setEventoSeleccionado(null);
      cargarEventos(); // Recargar eventos para actualizar contador
    } catch (err: any) {
      console.error('Error aprobando evento:', err);
      alert(err.message || 'Error al aprobar el evento');
    } finally {
      setLoading(false);
    }
  };

  const handleRechazarEvento = async () => {
    if (!user?.id || !eventoSeleccionado) return;

    if (!motivoRechazo.trim()) {
      alert('Debe proporcionar un motivo para rechazar el evento');
      return;
    }

    try {
      setLoading(true);
      
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const anuncios = db.anuncios || [];
      
      const eventoActualizado = anuncios.map((anuncio: any) => {
        if (anuncio.id === eventoSeleccionado.id && anuncio.categoria === 'evento') {
          return {
            ...anuncio,
            estado: 'rechazado',
          };
        }
        return anuncio;
      });

      db.anuncios = eventoActualizado;
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

      if (eventoSeleccionado.usuario_id) {
        try {
          await crearNotificacion(
            eventoSeleccionado.usuario_id,
            'evento_rechazado',
            `Tu evento "${eventoSeleccionado.titulo}" ha sido rechazado. Motivo: ${motivoRechazo}`,
            'evento',
            eventoSeleccionado.id,
            'Evento Rechazado' // Título específico
          );
        } catch (notifError) {
          console.error('Error enviando notificación de evento rechazado:', notifError);
        }
      }

      alert('✅ Evento rechazado exitosamente');
      setShowEventValidationModal(false);
      setEventoSeleccionado(null);
      setMotivoRechazo('');
      cargarEventos(); // Recargar eventos para actualizar contador
    } catch (err: any) {
      console.error('Error rechazando evento:', err);
      alert(err.message || 'Error al rechazar el evento');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarEvento = async (evento: Evento) => {
    if (!user?.id) return;

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el evento "${evento.titulo}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      setLoading(true);
      
      const db = JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '{"anuncios": []}');
      const anuncios = db.anuncios || [];
      
      const anunciosFiltrados = anuncios.filter((anuncio: any) => 
        !(anuncio.id === evento.id && anuncio.categoria === 'evento')
      );

      db.anuncios = anunciosFiltrados;
      localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));

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
          console.error('Error enviando notificación de evento eliminado:', notifError);
        }
      }

      alert('✅ Evento eliminado exitosamente');
      cargarEventos(); // Recargar eventos para actualizar contador
    } catch (err: any) {
      console.error('Error eliminando evento:', err);
      alert(err.message || 'Error al eliminar el evento');
    } finally {
      setLoading(false);
    }
  };

  const calcularMontoPendiente = (pago: Pago) => {
    const montoTotal = pago.monto;
    const montoPagado = pago.abono !== undefined && pago.abono !== null 
      ? pago.abono 
      : (pago.monto_pagado || 0);
    return montoTotal - montoPagado;
  };
  
  const obtenerMontoPagado = (pago: Pago) => {
    return pago.abono !== undefined && pago.abono !== null 
      ? pago.abono 
      : (pago.monto_pagado || 0);
  };

  if (loading && pagos.length === 0 && activeTab === 'pagos') {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Validación
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => {
                setActiveTab('pagos');
                setCurrentPage(1);
                setSearchQuery('');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'pagos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaDollarSign />
              Pagos
              {pagos.filter(p => p.estado === 'pendiente' || p.estado === 'parcial').length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {pagos.filter(p => p.estado === 'pendiente' || p.estado === 'parcial').length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('eventos');
                setCurrentPage(1);
                setSearchQuery('');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'eventos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaCalendarAlt />
              Eventos
              {eventosPendientesCount > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {eventosPendientesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('solicitudes');
                setCurrentPage(1);
                setSearchQuery('');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'solicitudes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaTools />
              Solicitudes
              {solicitudesPendientesCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {solicitudesPendientesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('espacios');
                setCurrentPage(1);
                setSearchQuery('');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'espacios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBuilding />
              Espacios
              {espaciosPendientesCount > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {espaciosPendientesCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Contenido de Pagos */}
      {activeTab === 'pagos' && (
        <>
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Buscar por concepto, usuario o apartamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pendiente">Pendientes</option>
              <option value="parcial">Parciales</option>
              <option value="pagado">Pagados</option>
              <option value="rechazado">Rechazados</option>
              <option value="vencido">Vencidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Pagado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Pendiente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPagos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroEstado !== 'pendiente' ? 'No se encontraron pagos con los filtros aplicados' : 'No hay pagos pendientes de validación'}
                  </td>
                </tr>
              ) : (
                currentPagos.map((pago) => {
                  const montoPendiente = calcularMontoPendiente(pago);
                  const montoPagado = obtenerMontoPagado(pago);
                  
                  return (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{pago.usuarios?.nombre || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{pago.usuarios?.correo || ''}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pago.viviendas?.numero_apartamento || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{pago.concepto}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatMonto(pago.monto)}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                        {montoPagado > 0 ? formatMonto(montoPagado) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">
                        {montoPendiente > 0 ? formatMonto(montoPendiente) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(pago.estado)}`}>
                          {pago.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(pago.estado === 'pendiente' || pago.estado === 'parcial') && (
                            <>
                              <button
                                onClick={() => handleAbrirModalValidacion(pago)}
                                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors flex items-center gap-1"
                                title="Validar pago"
                              >
                                <FaCheck />
                                Validar
                              </button>
                              <button
                                onClick={() => {
                                  setPagoSeleccionado(pago);
                                  setShowDetailsModal(true);
                                }}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                                title="Ver detalles"
                              >
                                <FaEye />
                                Ver
                              </button>
                            </>
                          )}
                          {pago.estado === 'pendiente' && (
                            <button
                              onClick={() => {
                                setPagoSeleccionado(pago);
                                handleRechazarPago();
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                              title="Rechazar pago"
                            >
                              <FaTimes />
                              Rechazar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={pagosFiltrados.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>
        </>
      )}

      {/* Contenido de Solicitudes */}
      {activeTab === 'solicitudes' && (
        <>
          {solicitudesLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 text-lg mt-4">Cargando solicitudes...</p>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-gray-500 text-lg">No hay solicitudes de mantenimiento pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudes.map((solicitud) => (
                <motion.div
                  key={solicitud.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                          {solicitud.prioridad === 'urgente' ? '🔴 Urgente' :
                           solicitud.prioridad === 'alta' ? '🟠 Alta' :
                           solicitud.prioridad === 'media' ? '🟡 Media' : '⚪ Baja'}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                          Pendiente
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{solicitud.titulo}</h3>
                      {solicitud.descripcion && (
                        <p className="text-gray-700 mb-3 whitespace-pre-line">{solicitud.descripcion}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span>👤 {solicitud.usuarios?.nombre || 'N/A'}</span>
                        {solicitud.fecha_solicitud && (
                          <span>📅 {formatFecha(solicitud.fecha_solicitud)}</span>
                        )}
                        {solicitud.ubicacion && (
                          <span>📍 {solicitud.ubicacion}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex gap-2">
                      <button
                        onClick={() => handleAbrirModalSolicitud(solicitud)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <FaCheck />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleAbrirModalSolicitud(solicitud)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                      >
                        <FaTimes />
                        Rechazar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Contenido de Eventos */}
      {activeTab === 'eventos' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {eventos.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-lg">No hay eventos</p>
            </div>
          ) : (
            <>
              {/* Notificación de eventos pendientes */}
              {eventosPendientesCount > 0 && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600 font-semibold">
                      📋 {eventosPendientesCount} {eventosPendientesCount === 1 ? 'evento pendiente' : 'eventos pendientes'} de validación
                    </span>
                  </div>
                </div>
              )}

              {/* Eventos pendientes */}
              {eventosPendientes.length > 0 && (
                <div className="divide-y divide-gray-200">
                  {eventosPendientes.map((evento) => (
                    <div key={evento.id} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                            Pendiente
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{evento.titulo}</h3>
                        <p className="text-gray-700 mb-3 whitespace-pre-line">{evento.contenido}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span>📅 {formatFecha(evento.fecha)}</span>
                          {evento.autor && (
                            <span>👤 {evento.autor}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAbrirModalEvento(evento)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <FaCheck />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleAbrirModalEvento(evento)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                          <FaTimes />
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleEliminarEvento(evento)}
                          disabled={loading}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar evento permanentemente"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {/* Eventos aprobados */}
              {eventos.filter(e => e.estado === 'aprobado').length > 0 && (
                <>
                  <div className={`bg-green-50 border-b border-green-200 px-6 py-4 ${eventosPendientes.length > 0 ? 'mt-4' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold">
                        ✅ Eventos Aprobados
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {eventos.filter(e => e.estado === 'aprobado').map((evento) => (
                      <div key={evento.id} className="p-6 hover:bg-gray-50">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                                Aprobado
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{evento.titulo}</h3>
                            <p className="text-gray-700 mb-3 whitespace-pre-line">{evento.contenido}</p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <span>📅 {formatFecha(evento.fecha)}</span>
                              {evento.autor && (
                                <span>👤 {evento.autor}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEliminarEvento(evento)}
                              disabled={loading}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Eliminar evento permanentemente"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Contenido de Espacios */}
      {activeTab === 'espacios' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {espaciosLoading ? (
            <div className="px-4 py-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 text-lg mt-4">Cargando espacios...</p>
            </div>
          ) : espacios.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <FaBuilding className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-lg">No hay espacios comunes pendientes de validación</p>
            </div>
          ) : (
            <>
              {/* Notificación de espacios pendientes */}
              <div className="bg-purple-50 border-b border-purple-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-semibold">
                    📋 {espaciosPendientesCount} {espaciosPendientesCount === 1 ? 'espacio pendiente' : 'espacios pendientes'} de validación
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {espacios.map((espacio) => (
                  <div key={espacio.id} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                            Pendiente
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{espacio.nombre}</h3>
                        {espacio.descripcion && (
                          <p className="text-gray-700 mb-3 whitespace-pre-line">{espacio.descripcion}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {espacio.capacidad && (
                            <span>👥 Capacidad: {espacio.capacidad} personas</span>
                          )}
                          {espacio.horarios && (
                            <span>🕐 {espacio.horarios}</span>
                          )}
                          {espacio.created_at && (
                            <span>📅 Creado: {formatFecha(espacio.created_at)}</span>
                          )}
                        </div>
                        {espacio.equipamiento && espacio.equipamiento.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Equipamiento:</p>
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
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAbrirModalEspacio(espacio)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <FaCheck />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleAbrirModalEspacio(espacio)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                          <FaTimes />
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleEliminarEspacio(espacio)}
                          disabled={espaciosLoading}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar espacio permanentemente"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de validación de pago (mantener código existente) */}
      <AnimatePresence>
        {showValidationModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Validar Pago
              </h2>
              
              {/* Información del pago */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Usuario:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.usuarios?.nombre || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Apartamento:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.viviendas?.numero_apartamento || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Concepto:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.concepto}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Monto Total:</p>
                    <p className="text-xl font-bold text-blue-600">{formatMonto(pagoSeleccionado.monto)}</p>
                  </div>
                  {(() => {
                    const montoPagado = obtenerMontoPagado(pagoSeleccionado);
                    return montoPagado > 0 && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Monto Pagado (Acumulado):</p>
                          <p className="text-lg font-bold text-green-600">{formatMonto(montoPagado)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Monto Pendiente:</p>
                          <p className="text-lg font-bold text-red-600">{formatMonto(calcularMontoPendiente(pagoSeleccionado))}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                {/* Monto aprobado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto a Aprobar *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={calcularMontoPendiente(pagoSeleccionado)}
                    value={formValidacion.monto_aprobado}
                    onChange={(e) => {
                      const valor = e.target.value;
                      const montoPendiente = calcularMontoPendiente(pagoSeleccionado);
                      if (parseFloat(valor) > montoPendiente) {
                        alert(`El monto no puede ser mayor a ${formatMonto(montoPendiente)}`);
                        return;
                      }
                      setFormValidacion({ 
                        ...formValidacion, 
                        monto_aprobado: valor,
                        nuevo_estado: parseFloat(valor) >= montoPendiente ? 'pagado' : 'parcial'
                      });
                    }}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo disponible: {formatMonto(calcularMontoPendiente(pagoSeleccionado))}
                  </p>
                </div>

                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={formValidacion.metodo_pago}
                    onChange={(e) => setFormValidacion({ ...formValidacion, metodo_pago: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona un método</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                    <option value="cheque">Cheque</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                {/* Referencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={formValidacion.referencia}
                    onChange={(e) => setFormValidacion({ ...formValidacion, referencia: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: REF-2025-001234"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={formValidacion.observaciones}
                    onChange={(e) => setFormValidacion({ ...formValidacion, observaciones: e.target.value })}
                    rows={3}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                {/* Resumen de cálculo */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumen del Pago:</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto Total:</span>
                      <span className="font-semibold text-gray-900">{formatMonto(pagoSeleccionado.monto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ya Pagado:</span>
                      <span className="font-semibold text-green-600">{formatMonto(obtenerMontoPagado(pagoSeleccionado))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto a Aprobar:</span>
                      <span className="font-semibold text-blue-600">
                        {formValidacion.monto_aprobado ? formatMonto(parseFloat(formValidacion.monto_aprobado)) : formatMonto(0)}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-1 mt-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-semibold">Total Pagado (después):</span>
                        <span className="font-bold text-green-600">
                          {formatMonto(obtenerMontoPagado(pagoSeleccionado) + (parseFloat(formValidacion.monto_aprobado) || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-semibold">Pendiente (después):</span>
                        <span className="font-bold text-red-600">
                          {formatMonto(calcularMontoPendiente(pagoSeleccionado) - (parseFloat(formValidacion.monto_aprobado) || 0))}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-semibold">Estado Final:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(formValidacion.nuevo_estado)}`}>
                          {formValidacion.nuevo_estado === 'parcial' ? 'Pago Parcial' : 'Pago Completo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleValidarPago}
                  disabled={loading || !formValidacion.monto_aprobado || parseFloat(formValidacion.monto_aprobado) <= 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  {loading ? 'Validando...' : formValidacion.nuevo_estado === 'parcial' ? 'Aprobar Pago Parcial' : 'Aprobar Pago Completo'}
                </button>
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setPagoSeleccionado(null);
                    setFormValidacion({
                      nuevo_estado: 'pagado',
                      monto_aprobado: '',
                      metodo_pago: '',
                      referencia: '',
                      observaciones: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de validación de solicitud de mantenimiento */}
      <AnimatePresence>
        {showSolicitudValidationModal && solicitudSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Validar Solicitud de Mantenimiento
              </h2>
              
              {/* Información de la solicitud */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    solicitudSeleccionada.prioridad === 'urgente' ? 'bg-red-100 text-red-800' :
                    solicitudSeleccionada.prioridad === 'alta' ? 'bg-orange-100 text-orange-800' :
                    solicitudSeleccionada.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {solicitudSeleccionada.prioridad === 'urgente' ? '🔴 Urgente' :
                     solicitudSeleccionada.prioridad === 'alta' ? '🟠 Alta' :
                     solicitudSeleccionada.prioridad === 'media' ? '🟡 Media' : '⚪ Baja'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{solicitudSeleccionada.titulo}</h3>
                {solicitudSeleccionada.descripcion && (
                  <p className="text-gray-700 mb-3 whitespace-pre-line">{solicitudSeleccionada.descripcion}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span>👤 {solicitudSeleccionada.usuarios?.nombre || 'N/A'}</span>
                  {solicitudSeleccionada.fecha_solicitud && (
                    <span>📅 {formatFecha(solicitudSeleccionada.fecha_solicitud)}</span>
                  )}
                  {solicitudSeleccionada.ubicacion && (
                    <span>📍 {solicitudSeleccionada.ubicacion}</span>
                  )}
                </div>
              </div>

              {/* Notificación de solicitudes restantes */}
              {solicitudesPendientesCount > 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>{solicitudesPendientesCount - 1}</strong> {solicitudesPendientesCount - 1 === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} más por validar
                  </p>
                </div>
              )}

              {/* Motivo de rechazo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del Rechazo (requerido si rechaza)
                </label>
                <textarea
                  value={motivoRechazoSolicitud}
                  onChange={(e) => setMotivoRechazoSolicitud(e.target.value)}
                  rows={3}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingrese el motivo del rechazo (requerido para rechazar)"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAprobarSolicitud}
                  disabled={solicitudesLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  {solicitudesLoading ? 'Aprobando...' : 'Aprobar Solicitud'}
                </button>
                <button
                  onClick={handleRechazarSolicitud}
                  disabled={solicitudesLoading || !motivoRechazoSolicitud.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  {solicitudesLoading ? 'Rechazando...' : 'Rechazar Solicitud'}
                </button>
                <button
                  onClick={() => {
                    setShowSolicitudValidationModal(false);
                    setSolicitudSeleccionada(null);
                    setMotivoRechazoSolicitud('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de validación de evento */}
      <AnimatePresence>
        {showEventValidationModal && eventoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Validar Evento
              </h2>
              
              {/* Información del evento */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{eventoSeleccionado.titulo}</h3>
                <p className="text-gray-700 mb-3 whitespace-pre-line">{eventoSeleccionado.contenido}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span>📅 {formatFecha(eventoSeleccionado.fecha)}</span>
                  {eventoSeleccionado.autor && (
                    <span>👤 {eventoSeleccionado.autor}</span>
                  )}
                </div>
              </div>

              {/* Notificación de eventos restantes */}
              {eventosPendientesCount > 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>{eventosPendientesCount - 1}</strong> {eventosPendientesCount - 1 === 1 ? 'evento pendiente' : 'eventos pendientes'} más por validar
                  </p>
                </div>
              )}

              {/* Motivo de rechazo (solo si se va a rechazar) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del Rechazo (opcional, solo si rechaza)
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={3}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingrese el motivo del rechazo (opcional)"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAprobarEvento}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  {loading ? 'Aprobando...' : 'Aprobar Evento'}
                </button>
                <button
                  onClick={handleRechazarEvento}
                  disabled={loading || !motivoRechazo.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  {loading ? 'Rechazando...' : 'Rechazar Evento'}
                </button>
                <button
                  onClick={() => {
                    setShowEventValidationModal(false);
                    setEventoSeleccionado(null);
                    setMotivoRechazo('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de validación de espacio común */}
      <AnimatePresence>
        {showEspacioValidationModal && espacioSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Validar Espacio Común
              </h2>
              
              {/* Información del espacio */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{espacioSeleccionado.nombre}</h3>
                {espacioSeleccionado.descripcion && (
                  <p className="text-gray-700 mb-3 whitespace-pre-line">{espacioSeleccionado.descripcion}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {espacioSeleccionado.capacidad && (
                    <span>👥 Capacidad: {espacioSeleccionado.capacidad} personas</span>
                  )}
                  {espacioSeleccionado.horarios && (
                    <span>🕐 {espacioSeleccionado.horarios}</span>
                  )}
                  {espacioSeleccionado.created_at && (
                    <span>📅 Creado: {formatFecha(espacioSeleccionado.created_at)}</span>
                  )}
                </div>
                {espacioSeleccionado.equipamiento && espacioSeleccionado.equipamiento.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Equipamiento:</p>
                    <div className="flex flex-wrap gap-2">
                      {espacioSeleccionado.equipamiento.map((item, idx) => (
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
              </div>

              {/* Notificación de espacios restantes */}
              {espaciosPendientesCount > 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>{espaciosPendientesCount - 1}</strong> {espaciosPendientesCount - 1 === 1 ? 'espacio pendiente' : 'espacios pendientes'} más por validar
                  </p>
                </div>
              )}

              {/* Motivo de rechazo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del Rechazo (requerido si rechaza)
                </label>
                <textarea
                  value={motivoRechazoEspacio}
                  onChange={(e) => setMotivoRechazoEspacio(e.target.value)}
                  rows={3}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingrese el motivo del rechazo (requerido para rechazar)"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAprobarEspacio}
                  disabled={espaciosLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  {espaciosLoading ? 'Aprobando...' : 'Aprobar Espacio'}
                </button>
                <button
                  onClick={handleRechazarEspacio}
                  disabled={espaciosLoading || !motivoRechazoEspacio.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaTimes />
                  {espaciosLoading ? 'Rechazando...' : 'Rechazar Espacio'}
                </button>
                <button
                  onClick={() => {
                    setShowEspacioValidationModal(false);
                    setEspacioSeleccionado(null);
                    setMotivoRechazoEspacio('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de detalles de pago (mantener código existente) */}
      <AnimatePresence>
        {showDetailsModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Detalles del Pago
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Usuario:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.usuarios?.nombre || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{pagoSeleccionado.usuarios?.correo || ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Apartamento:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.viviendas?.numero_apartamento || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Concepto:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.concepto}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tipo:</p>
                    <p className="font-semibold text-gray-900">{pagoSeleccionado.tipo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Monto Total:</p>
                    <p className="text-xl font-bold text-blue-600">{formatMonto(pagoSeleccionado.monto)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Estado:</p>
                    <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(pagoSeleccionado.estado)}`}>
                      {pagoSeleccionado.estado}
                    </span>
                  </div>
                  {(() => {
                    const montoPagado = obtenerMontoPagado(pagoSeleccionado);
                    return montoPagado > 0 && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Monto Pagado:</p>
                          <p className="text-lg font-bold text-green-600">{formatMonto(montoPagado)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Monto Pendiente:</p>
                          <p className="text-lg font-bold text-red-600">{formatMonto(calcularMontoPendiente(pagoSeleccionado))}</p>
                        </div>
                      </>
                    );
                  })()}
                  {pagoSeleccionado.referencia && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Referencia:</p>
                      <p className="font-semibold text-gray-900">{pagoSeleccionado.referencia}</p>
                    </div>
                  )}
                  {pagoSeleccionado.metodo_pago && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Método de Pago:</p>
                      <p className="font-semibold text-gray-900">{pagoSeleccionado.metodo_pago}</p>
                    </div>
                  )}
                </div>
                {pagoSeleccionado.observaciones && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Observaciones:</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{pagoSeleccionado.observaciones}</p>
                  </div>
                )}
                {pagoSeleccionado.archivos?.url && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Comprobante:</p>
                    <a
                      href={pagoSeleccionado.archivos.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Ver comprobante
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setPagoSeleccionado(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminValidacionPagosPage;
