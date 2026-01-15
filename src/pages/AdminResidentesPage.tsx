import { useEffect, useState } from 'react';
import { Pagination } from '../components/shared/Pagination';
import { fetchResidentes, fetchCondominios } from '../services/bookService';

interface Residente {
  id: number;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  cedula: string | null;
  rol: string | null;
  condominio_id: number | null;
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
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [filteredResidentes, setFilteredResidentes] = useState<Residente[]>([]);
  const [condominios, setCondominios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

    // Filtro por estado (si tenemos esa información en el rol o en pagos)
    // Por ahora lo mantenemos para compatibilidad con el código anterior
    if (filtroEstado) {
      // Este filtro puede necesitar ajuste según cómo se maneje el estado en la BD
      // Por ahora lo dejamos sin efecto hasta definir mejor cómo se determina el estado
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
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filtroCondominio}
              onChange={(e) => setFiltroCondominio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Moroso">Moroso</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="text-sm text-gray-700 flex items-center">
            Total: <span className="font-bold ml-2 text-gray-800">{filteredResidentes.length}</span> residentes
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol en Vivienda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentResidentes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroCondominio ? 'No se encontraron residentes con los filtros aplicados' : 'No hay residentes registrados'}
                  </td>
                </tr>
              ) : (
                currentResidentes.map((residente) => (
                  <tr key={residente.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{residente.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{residente.correo || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{residente.cedula || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getCondominioNombre(residente)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getApartamento(residente)}</td>
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
                      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">
                        {getRolVivienda(residente)}
                      </span>
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
