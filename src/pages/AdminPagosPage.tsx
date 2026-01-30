import { useEffect, useState } from 'react';
import { fetchPagos, crearPagosMasivos, actualizarPago, eliminarPago, fetchCondominios, fetchResidentes } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/shared/Pagination';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaBuilding, FaGlobe, FaCity } from 'react-icons/fa';

interface Pago {
  id: number;
  usuario_id: number;
  vivienda_id: number | null;
  condominio_id?: number | null;
  concepto: string;
  monto: number;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  observaciones: string | null;
  created_at: string;
  usuarios?: {
    nombre: string;
    correo: string;
    condominio_id?: number | null;
    condominios?: {
      id: number;
      nombre: string;
    } | null;
  };
  viviendas?: {
    numero_apartamento: string;
  };
}

const AdminPagosPage = () => {
  const { user } = useAuth();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [condominios, setCondominios] = useState<any[]>([]);
  const [residentes, setResidentes] = useState<any[]>([]);
  const [selectedResidentes, setSelectedResidentes] = useState<number[]>([]);

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroCondominioId, setFiltroCondominioId] = useState<string>('');

  // Estados para formulario de creación masiva
  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    tipo: 'mantenimiento' as string,
    fecha_vencimiento: '',
    tipoAplicacion: 'condominio' as 'condominio' | 'usuarios' | 'todos' | 'todos_condominios',
    condominio_id: '',
    aplicar_a_todos: false,
  });

  // Estados para formulario de edición
  const [editFormData, setEditFormData] = useState({
    concepto: '',
    monto: '',
    tipo: 'mantenimiento' as string,
    fecha_vencimiento: '',
    estado: 'pendiente' as string,
    observaciones: '',
  });

  useEffect(() => {
    if (user?.id) {
      cargarDatos();
    }
  }, [user, filtroCondominioId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar condominios y residentes para los formularios
      const [condominiosData, residentesData] = await Promise.all([
        fetchCondominios(),
        fetchResidentes()
      ]);
      
      setCondominios(condominiosData || []);
      setResidentes(residentesData || []);

      // Cargar historial de todos los pagos (opcionalmente filtrados por condominio)
      const pagosData = await fetchPagos(
        filtroCondominioId ? { condominio_id: Number(filtroCondominioId) } : undefined
      );

      setPagos((pagosData || []) as Pago[]);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros y búsqueda
  const pagosFiltrados = pagos.filter(pago => {
    if (filtroEstado && pago.estado !== filtroEstado) return false;
    if (filtroTipo && pago.tipo !== filtroTipo) return false;
    if (filtroCondominioId) {
      const pagoCondominioId = pago.condominio_id ?? pago.usuarios?.condominio_id;
      if (Number(pagoCondominioId) !== Number(filtroCondominioId)) return false;
    }
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

  // Paginación
  const totalPages = Math.ceil(pagosFiltrados.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPagos = pagosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  const handleCrearPagosMasivos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Error: No se pudo identificar al administrador');
      return;
    }

    if (!formData.concepto.trim()) {
      alert('El concepto es requerido');
      return;
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      
      const montoValue = parseFloat(formData.monto);
      const tipoMapeado = typeof formData.tipo === 'string' ? formData.tipo : formData.tipo;

      let resultado;
      
      if (formData.tipoAplicacion === 'todos' || formData.aplicar_a_todos) {
        // Aplicar a todos los usuarios
        resultado = await crearPagosMasivos({
          admin_id: user.id,
          concepto: formData.concepto,
          monto: montoValue,
          tipo: tipoMapeado,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          aplicar_a_todos: true
        });
      } else if (formData.tipoAplicacion === 'todos_condominios') {
        // Aplicar a todos los condominios
        resultado = await crearPagosMasivos({
          admin_id: user.id,
          concepto: formData.concepto,
          monto: montoValue,
          tipo: tipoMapeado,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          aplicar_a_todos_condominios: true
        });
      } else if (formData.tipoAplicacion === 'condominio' && formData.condominio_id) {
        // Aplicar a un condominio específico
        resultado = await crearPagosMasivos({
          admin_id: user.id,
          concepto: formData.concepto,
          monto: montoValue,
          tipo: tipoMapeado,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          condominio_id: parseInt(formData.condominio_id)
        });
      } else if (formData.tipoAplicacion === 'usuarios' && selectedResidentes.length > 0) {
        // Aplicar a usuarios específicos
        resultado = await crearPagosMasivos({
          admin_id: user.id,
          concepto: formData.concepto,
          monto: montoValue,
          tipo: tipoMapeado,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          usuario_ids: selectedResidentes
        });
      } else {
        alert('Debe seleccionar usuarios, un condominio, todos los condominios o aplicar a todos');
        return;
      }

      alert(`✅ ${resultado.message}`);
      setShowCreateModal(false);
      setFormData({
        concepto: '',
        monto: '',
        tipo: 'mantenimiento',
        fecha_vencimiento: '',
        tipoAplicacion: 'condominio',
        condominio_id: '',
        aplicar_a_todos: false,
      });
      setSelectedResidentes([]);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error creando pagos masivos:', err);
      alert(err.message || 'Error al crear los pagos masivos');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarPago = (pago: Pago) => {
    setPagoSeleccionado(pago);
    setEditFormData({
      concepto: pago.concepto,
      monto: pago.monto.toString(),
      tipo: pago.tipo,
      fecha_vencimiento: pago.fecha_vencimiento || '',
      estado: pago.estado,
      observaciones: pago.observaciones || '',
    });
    setShowEditModal(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !pagoSeleccionado) return;

    try {
      setLoading(true);
      await actualizarPago({
        pago_id: pagoSeleccionado.id,
        admin_id: user.id,
        concepto: editFormData.concepto || undefined,
        monto: editFormData.monto ? parseFloat(editFormData.monto) : undefined,
        tipo: editFormData.tipo || undefined,
        fecha_vencimiento: editFormData.fecha_vencimiento || undefined,
        estado: editFormData.estado as any,
        observaciones: editFormData.observaciones || undefined,
      });

      alert('✅ Pago actualizado exitosamente');
      setShowEditModal(false);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error actualizando pago:', err);
      alert(err.message || 'Error al actualizar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPago = async () => {
    if (!user?.id || !pagoSeleccionado) return;

    try {
      setLoading(true);
      await eliminarPago({
        pago_id: pagoSeleccionado.id,
        admin_id: user.id
      });

      alert('✅ Pago inhabilitado exitosamente. El pago ya no será visible para los usuarios pero permanecerá en el historial.');
      setShowDeleteConfirm(false);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error eliminando pago:', err);
      alert(err.message || 'Error al eliminar el pago');
    } finally {
      setLoading(false);
    }
  };

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'pendiente': 'bg-yellow-400 text-white',
      'pagado': 'bg-green-500 text-white',
      'vencido': 'bg-red-500 text-white',
      'parcial': 'bg-orange-500 text-white',
      'rechazado': 'bg-gray-400 text-white',
    };
    return badges[estado] || 'bg-gray-400 text-white';
  };

  const getTipoBadge = (tipo: string) => {
    const badges: { [key: string]: string } = {
      'mantenimiento': 'bg-blue-500 text-white',
      'multa': 'bg-red-500 text-white',
      'reserva': 'bg-purple-500 text-white',
      'otros': 'bg-gray-500 text-white',
    };
    return badges[tipo] || 'bg-gray-400 text-white';
  };

  if (loading && pagos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando pagos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            Gestión de Pagos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de todos los pagos existentes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaPlus />
          Crear Pagos Masivos
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              value={filtroCondominioId}
              onChange={(e) => setFiltroCondominioId(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los condominios</option>
              {condominios.map(cond => (
                <option key={cond.id} value={cond.id}>{cond.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
              <option value="parcial">Parcial</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="multa">Multa</option>
              <option value="reserva">Reserva</option>
              <option value="otros">Otros</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condominio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPagos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroEstado || filtroTipo || filtroCondominioId ? 'No se encontraron pagos con los filtros aplicados' : 'No hay pagos registrados'}
                  </td>
                </tr>
              ) : (
                currentPagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{pago.concepto}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{pago.usuarios?.nombre || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{pago.usuarios?.correo || ''}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                        {pago.usuarios?.condominios?.nombre || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pago.viviendas?.numero_apartamento || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatMonto(pago.monto)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getTipoBadge(pago.tipo)}`}>
                        {pago.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(pago.estado)}`}>
                        {pago.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {pago.fecha_vencimiento 
                        ? new Date(pago.fecha_vencimiento).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditarPago(pago)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors flex items-center gap-1"
                          title="Editar pago"
                        >
                          <FaEdit />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setPagoSeleccionado(pago);
                            setShowDeleteConfirm(true);
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                          title="Eliminar pago"
                        >
                          <FaTrash />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Modal de creación masiva */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Pagos Masivos</h2>
            
            <form onSubmit={handleCrearPagosMasivos} className="space-y-4">
              {/* Concepto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Cuota de Mantenimiento - Enero 2025"
                  required
                />
              </div>

              {/* Monto y Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="multa">Multa</option>
                    <option value="reserva">Reserva</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento (Opcional)
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tipo de aplicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aplicar a <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="todos"
                      checked={formData.tipoAplicacion === 'todos'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'todos' as any, aplicar_a_todos: true })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaGlobe className="text-blue-600" />
                    <span className="text-gray-900">Todos los usuarios activos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="todos_condominios"
                      checked={formData.tipoAplicacion === 'todos_condominios'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'todos_condominios' as any, aplicar_a_todos: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaCity className="text-indigo-600" />
                    <span className="text-gray-900">Todos los condominios</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="condominio"
                      checked={formData.tipoAplicacion === 'condominio'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'condominio' as any, aplicar_a_todos: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaBuilding className="text-green-600" />
                    <span className="text-gray-900">Condominio específico</span>
                  </label>
                  {formData.tipoAplicacion === 'condominio' && (
                    <select
                      value={formData.condominio_id}
                      onChange={(e) => setFormData({ ...formData, condominio_id: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ml-6"
                      required={formData.tipoAplicacion === 'condominio'}
                    >
                      <option value="">Selecciona un condominio</option>
                      {condominios.map(cond => (
                        <option key={cond.id} value={cond.id}>{cond.nombre}</option>
                      ))}
                    </select>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="usuarios"
                      checked={formData.tipoAplicacion === 'usuarios'}
                      onChange={(e) => setFormData({ ...formData, tipoAplicacion: 'usuarios' as any, aplicar_a_todos: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <FaUsers className="text-purple-600" />
                    <span className="text-gray-900">Usuarios específicos</span>
                  </label>
                  {formData.tipoAplicacion === 'usuarios' && (
                    <div className="ml-6 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {residentes.map(residente => (
                        <label key={residente.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedResidentes.includes(residente.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResidentes([...selectedResidentes, residente.id]);
                              } else {
                                setSelectedResidentes(selectedResidentes.filter(id => id !== residente.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-900 text-sm">{residente.nombre} ({residente.correo})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando...' : 'Crear Pagos'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      concepto: '',
                      monto: '',
                      tipo: 'mantenimiento',
                      fecha_vencimiento: '',
                      tipoAplicacion: 'condominio',
                      condominio_id: '',
                      aplicar_a_todos: false,
                    });
                    setSelectedResidentes([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && pagoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Pago</h2>
            
            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.concepto}
                    onChange={(e) => setEditFormData({ ...editFormData, concepto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.monto}
                    onChange={(e) => setEditFormData({ ...editFormData, monto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.tipo}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="multa">Multa</option>
                    <option value="reserva">Reserva</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.estado}
                    onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                    <option value="parcial">Parcial</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={editFormData.fecha_vencimiento}
                  onChange={(e) => setEditFormData({ ...editFormData, fecha_vencimiento: e.target.value })}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={editFormData.observaciones}
                  onChange={(e) => setEditFormData({ ...editFormData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setPagoSeleccionado(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && pagoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmar Inhabilitación</h2>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas inhabilitar el pago "{pagoSeleccionado.concepto}" de {pagoSeleccionado.usuarios?.nombre || 'este usuario'}?
            </p>
            <p className="text-sm text-orange-600 mb-2">
              El pago será marcado como eliminado y dejará de ser visible para los usuarios.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              El pago permanecerá en la base de datos y en el historial para mantener la integridad de los registros.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPagoSeleccionado(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarPago}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Inhabilitando...' : 'Inhabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPagosPage;

