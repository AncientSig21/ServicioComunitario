import { useEffect, useState } from 'react';
import { fetchCondominios, crearCondominio, editarCondominio, eliminarCondominio } from '../services/bookService';
import { Pagination } from '../components/shared/Pagination';

interface Condominio {
  id: number;
  nombre: string;
  direccion: string | null;
  estado: string | null;
  telefono: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const AdminCondominiosPage = () => {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [filteredCondominios, setFilteredCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formulario
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    estado: '',
    telefono: ''
  });

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar condominios
  const cargarCondominios = async () => {
    try {
      setLoading(true);
      const data = await fetchCondominios();
      setCondominios(data);
      setFilteredCondominios(data);
      setError(null);
    } catch (err: any) {
      console.error('Error al cargar condominios:', err);
      setError(err.message || 'Error al cargar condominios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCondominios();
  }, []);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let filtered = [...condominios];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(condominio =>
        condominio.nombre?.toLowerCase().includes(query) ||
        condominio.direccion?.toLowerCase().includes(query)
      );
    }

    setFilteredCondominios(filtered);
    setCurrentPage(1);
  }, [condominios, searchQuery]);

  // Calcular condominios para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCondominios = filteredCondominios.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCondominios.length / itemsPerPage);

  // Manejar creación/edición
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre del condominio es requerido');
      return;
    }

    try {
      if (editingId) {
        // Editar
        await editarCondominio(editingId, {
          nombre: formData.nombre,
          direccion: formData.direccion || null,
          estado: formData.estado || null,
          telefono: formData.telefono || null
        });
      } else {
        // Crear
        await crearCondominio({
          nombre: formData.nombre,
          direccion: formData.direccion || null,
          estado: formData.estado || null,
          telefono: formData.telefono || null
        });
      }

      // Limpiar formulario y cerrar modal
      setFormData({ nombre: '', direccion: '', estado: '', telefono: '' });
      setEditingId(null);
      setShowModal(false);
      await cargarCondominios();
    } catch (err: any) {
      console.error('Error al guardar condominio:', err);
      setError(err.message || 'Error al guardar el condominio');
    }
  };

  // Iniciar edición
  const handleEdit = (condominio: Condominio) => {
    setFormData({
      nombre: condominio.nombre,
      direccion: condominio.direccion || '',
      estado: condominio.estado || '',
      telefono: condominio.telefono || ''
    });
    setEditingId(condominio.id);
    setShowModal(true);
  };

  // Cancelar edición/creación
  const handleCancel = () => {
    setFormData({ nombre: '', direccion: '', estado: '', telefono: '' });
    setEditingId(null);
    setShowModal(false);
    setError(null);
  };

  // Eliminar condominio
  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await eliminarCondominio(id);
      setConfirmDeleteId(null);
      await cargarCondominios();
    } catch (err: any) {
      console.error('Error al eliminar condominio:', err);
      setError(err.message || 'Error al eliminar el condominio');
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Cargando condominios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Gestión de Condominios
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Nuevo Condominio
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Total: <span className="font-bold ml-2">{filteredCondominios.length}</span> condominios
          </div>
        </div>
      </div>

      {/* Lista de condominios */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentCondominios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No se encontraron condominios' : 'No hay condominios registrados'}
                  </td>
                </tr>
              ) : (
                currentCondominios.map((condominio) => (
                  <tr key={condominio.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{condominio.nombre}</td>
                    <td className="px-4 py-3 text-sm">{condominio.direccion || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{condominio.estado || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{condominio.telefono || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(condominio)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Editar
                        </button>
                        {confirmDeleteId === condominio.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(condominio.id)}
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
                            onClick={() => setConfirmDeleteId(condominio.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
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
              totalItems={filteredCondominios.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Editar Condominio' : 'Nuevo Condominio'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCondominiosPage;



