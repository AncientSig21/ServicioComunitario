import { useEffect, useState } from 'react';
import { Pagination } from '../components/shared/Pagination';
import { fetchResidentes, fetchCondominios, actualizarEstadoUsuario } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { FaEdit } from 'react-icons/fa';

interface Residente {
  id: number;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  cedula: string | null;
  rol: string | null;
  /** Columna en BD: Estado (mayúscula); se mantiene estado por compatibilidad */
  Estado?: string | null;
  estado?: string | null;
  condominio_id: number | null;
  /** Código de recuperación de contraseña (visible para admin en Residentes) */
  codigo_recuperacion?: string | null;
  condominios?: {
    nombre: string;
  } | null;
  usuario_vivienda?: Array<{
    viviendas: {
      numero_apartamento: string;
    };
    rol_en_vivienda: string;
  }>;
}

const AdminResidentesPage = () => {
  const { user } = useAuth();
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [filteredResidentes, setFilteredResidentes] = useState<Residente[]>([]);
  const [condominios, setCondominios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [residenteSeleccionado, setResidenteSeleccionado] = useState<Residente | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<'Activo' | 'Moroso' | 'Inactivo'>('Activo');
  const [updating, setUpdating] = useState(false);
  
  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroCondominio, setFiltroCondominio] = useState<string>('');

  // Cargar residentes y condominios
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar condominios para el filtro
      const condominiosData = await fetchCondominios();
      setCondominios(condominiosData);
      
      // Cargar residentes (sin filtro inicial - todos)
      const residentesData = await fetchResidentes();
      setResidentes(residentesData || []);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError(err.message || 'Error al cargar los residentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let filtered = [...residentes];

    // Filtro por condominio
    if (filtroCondominio) {
      const condominioId = parseInt(filtroCondominio);
      filtered = filtered.filter(residente => residente.condominio_id === condominioId);
    }

    // Aplicar búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(residente => {
        const nombre = residente.nombre?.toLowerCase() || '';
        const correo = residente.correo?.toLowerCase() || '';
        const cedula = residente.cedula?.toLowerCase() || '';
        const apartamento = residente.usuario_vivienda?.[0]?.viviendas?.numero_apartamento?.toLowerCase() || '';
        
        return nombre.includes(query) ||
               correo.includes(query) ||
               cedula.includes(query) ||
               apartamento.includes(query);
      });
    }

    // Filtro por Estado
    if (filtroEstado) {
      filtered = filtered.filter(residente => (residente.Estado ?? residente.estado) === filtroEstado);
    }

    setFilteredResidentes(filtered);
    setCurrentPage(1);
  }, [residentes, searchQuery, filtroEstado, filtroCondominio]);

  // Calcular residentes para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResidentes = filteredResidentes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResidentes.length / itemsPerPage);

  // Obtener información del apartamento
  const getApartamento = (residente: Residente) => {
    return residente.usuario_vivienda?.[0]?.viviendas?.numero_apartamento || 'N/A';
  };

  // Obtener rol en vivienda
  const getRolVivienda = (residente: Residente) => {
    return residente.usuario_vivienda?.[0]?.rol_en_vivienda || 'N/A';
  };

  // Obtener nombre del condominio
  const getCondominioNombre = (residente: Residente) => {
    return residente.condominios?.nombre || 'N/A';
  };

  // Función para abrir modal de edición de estado
  const handleEditarEstado = (residente: Residente) => {
    setResidenteSeleccionado(residente);
    setNuevoEstado((residente.Estado ?? residente.estado) as 'Activo' | 'Moroso' | 'Inactivo' || 'Activo');
    setShowEditModal(true);
  };

  // Función para actualizar el estado del residente
  const handleActualizarEstado = async () => {
    if (!user?.id || !residenteSeleccionado) return;

    try {
      setUpdating(true);
      setError(null);

      await actualizarEstadoUsuario({
        usuario_id: residenteSeleccionado.id,
        estado: nuevoEstado,
        admin_id: user.id
      });

      alert(`✅ Estado del residente actualizado a ${nuevoEstado}`);
      setShowEditModal(false);
      setResidenteSeleccionado(null);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      setError(err.message || 'Error al actualizar el estado del residente');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Cargando residentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Gestión de Residentes
        </h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre, correo, cédula o apartamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filtroCondominio}
              onChange={(e) => setFiltroCondominio(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los condominios</option>
              {condominios.map(condominio => (
                <option key={condominio.id} value={condominio.id}>
                  {condominio.nombre}
                </option>
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
              <option value="Activo">Activo</option>
              <option value="Moroso">Moroso</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Total: <span className="font-bold ml-2">{filteredResidentes.length}</span> residentes
          </div>
        </div>
      </div>

      {/* Lista de residentes */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condominio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol en Vivienda</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentResidentes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroCondominio || filtroEstado ? 'No se encontraron residentes con los filtros aplicados' : 'No hay residentes registrados'}
                  </td>
                </tr>
              ) : (
                currentResidentes.map((residente) => (
                  <tr key={residente.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{residente.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{residente.correo || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{residente.cedula || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getCondominioNombre(residente)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getApartamento(residente)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        residente.rol === 'admin' ? 'bg-purple-500 text-white' :
                        residente.rol === 'propietario' ? 'bg-blue-500 text-white' :
                        residente.rol === 'residente' ? 'bg-green-500 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                        {residente.rol || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (residente.Estado ?? residente.estado) === 'Activo' ? 'bg-green-100 text-green-800' :
                        (residente.Estado ?? residente.estado) === 'Moroso' ? 'bg-red-100 text-red-800' :
                        (residente.Estado ?? residente.estado) === 'Inactivo' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {residente.Estado ?? residente.estado ?? 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">
                        {getRolVivienda(residente)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleEditarEstado(residente)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors flex items-center gap-1"
                        title="Cambiar estado"
                      >
                        <FaEdit />
                        Cambiar Estado
                      </button>
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
              totalItems={filteredResidentes.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal de edición de estado */}
      {showEditModal && residenteSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cambiar Estado del Residente</h2>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Residente:</span> {residenteSeleccionado.nombre}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Código de recuperación:</span>{' '}
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{residenteSeleccionado.codigo_recuperacion || '—'}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Estado actual:</span>{' '}
                <span className={`px-2 py-1 rounded text-xs ${
                  (residenteSeleccionado.Estado ?? residenteSeleccionado.estado) === 'Activo' ? 'bg-green-100 text-green-800' :
                  (residenteSeleccionado.Estado ?? residenteSeleccionado.estado) === 'Moroso' ? 'bg-red-100 text-red-800' :
                  (residenteSeleccionado.Estado ?? residenteSeleccionado.estado) === 'Inactivo' ? 'bg-gray-100 text-gray-800' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {residenteSeleccionado.estado || 'N/A'}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as 'Activo' | 'Moroso' | 'Inactivo')}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Activo">Activo</option>
                <option value="Moroso">Moroso</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleActualizarEstado}
                disabled={updating || nuevoEstado === residenteSeleccionado.estado}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Actualizando...' : 'Actualizar Estado'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setResidenteSeleccionado(null);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResidentesPage;
