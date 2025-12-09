import { useEffect, useState } from 'react';
import { Pagination } from '../components/shared/Pagination';

const MOCK_DB_KEY = 'mockDatabase_condominio';

interface Residente {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  cedula?: string;
  numeroApartamento?: string;
  tipoResidencia?: string;
  estado?: string;
  rol?: string;
  escuela?: string;
}

const getMockDatabase = () => {
  try {
    const stored = localStorage.getItem(MOCK_DB_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error al cargar base de datos desde localStorage:', error);
  }
  return { usuarios: [], ordenes: [] };
};

const saveMockDatabase = (db: any) => {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error al guardar base de datos en localStorage:', error);
  }
};

const AdminResidentesPage = () => {
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [filteredResidentes, setFilteredResidentes] = useState<Residente[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  
  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroTipoResidencia, setFiltroTipoResidencia] = useState<string>('');

  // Obtener lista de residentes
  const fetchResidentes = async () => {
    const db = getMockDatabase();
    const usuarios = db.usuarios || [];
    setResidentes(usuarios);
  };

  useEffect(() => {
    fetchResidentes();
  }, []);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let filtered = [...residentes];

    // Aplicar búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(residente =>
        residente.nombre?.toLowerCase().includes(query) ||
        residente.correo?.toLowerCase().includes(query) ||
        residente.cedula?.includes(query) ||
        residente.numeroApartamento?.toLowerCase().includes(query)
      );
    }

    // Filtro por estado
    if (filtroEstado) {
      filtered = filtered.filter(residente => residente.estado === filtroEstado);
    }

    // Filtro por tipo de residencia
    if (filtroTipoResidencia) {
      filtered = filtered.filter(residente => residente.tipoResidencia === filtroTipoResidencia);
    }

    setFilteredResidentes(filtered);
    setCurrentPage(1);
  }, [residentes, searchQuery, filtroEstado, filtroTipoResidencia]);

  // Calcular residentes para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResidentes = filteredResidentes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResidentes.length / itemsPerPage);

  // Cambiar estado del residente
  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    const db = getMockDatabase();
    const usuarioIndex = db.usuarios.findIndex((u: any) => u.id === id);
    
    if (usuarioIndex !== -1) {
      db.usuarios[usuarioIndex].estado = nuevoEstado;
      saveMockDatabase(db);
      fetchResidentes();
    }
  };

  // Eliminar residente
  const handleDelete = async (id: number) => {
    const db = getMockDatabase();
    db.usuarios = db.usuarios.filter((u: any) => u.id !== id);
    saveMockDatabase(db);
    setConfirmDeleteId(null);
    fetchResidentes();
  };

  const getEstadoBadge = (estado?: string) => {
    const estados: { [key: string]: string } = {
      'Activo': 'bg-green-500 text-white',
      'Moroso': 'bg-red-500 text-white',
      'Inactivo': 'bg-gray-400 text-white',
    };
    return estados[estado || 'Activo'] || 'bg-gray-400 text-white';
  };

  const getTipoResidenciaBadge = (tipo?: string) => {
    const tipos: { [key: string]: string } = {
      'Propietario': 'bg-blue-500 text-white',
      'Inquilino': 'bg-purple-500 text-white',
      'Arrendatario': 'bg-orange-500 text-white',
      'Familiar del Propietario': 'bg-pink-500 text-white',
    };
    return tipos[tipo || ''] || 'bg-gray-400 text-white';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Gestión de Residentes
        </h1>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre, correo, cédula o apartamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Moroso">Moroso</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <select
              value={filtroTipoResidencia}
              onChange={(e) => setFiltroTipoResidencia(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los tipos</option>
              <option value="Propietario">Propietario</option>
              <option value="Inquilino">Inquilino</option>
              <option value="Arrendatario">Arrendatario</option>
              <option value="Familiar del Propietario">Familiar del Propietario</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentResidentes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron residentes
                  </td>
                </tr>
              ) : (
                currentResidentes.map((residente) => (
                  <tr key={residente.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{residente.nombre}</td>
                    <td className="px-4 py-3 text-sm">{residente.correo}</td>
                    <td className="px-4 py-3 text-sm">{residente.cedula || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{residente.numeroApartamento || 'N/A'}</td>
                    <td className="px-4 py-3">
                      {residente.tipoResidencia && (
                        <span className={`px-2 py-1 rounded text-xs ${getTipoResidenciaBadge(residente.tipoResidencia)}`}>
                          {residente.tipoResidencia}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(residente.estado)}`}>
                        {residente.estado || 'Activo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {residente.estado === 'Activo' ? (
                          <button
                            onClick={() => handleCambiarEstado(residente.id, 'Moroso')}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                            title="Marcar como moroso"
                          >
                            Marcar Moroso
                          </button>
                        ) : residente.estado === 'Moroso' ? (
                          <button
                            onClick={() => handleCambiarEstado(residente.id, 'Activo')}
                            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                            title="Desbloquear"
                          >
                            Desbloquear
                          </button>
                        ) : null}
                        {confirmDeleteId === residente.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(residente.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(residente.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                            disabled={residente.rol === 'admin'}
                            title={residente.rol === 'admin' ? 'No se puede eliminar al administrador' : 'Eliminar'}
                          >
                            Eliminar
                          </button>
                        )}
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
              totalItems={filteredResidentes.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResidentesPage;

