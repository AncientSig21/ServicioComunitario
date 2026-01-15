import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { Pagination } from '../components/shared/Pagination';

const MOCK_DB_KEY = 'mockDatabase_condominio';

interface Reporte {
  id: number;
  tipo: 'pago' | 'morosidad' | 'mantenimiento' | 'reserva' | 'cambio_estado';
  residente_id: number;
  residente_nombre?: string;
  residente_correo?: string;
  residente_apartamento?: string;
  descripcion: string;
  monto?: number;
  fecha: string;
  estado: 'pendiente' | 'completado' | 'cancelado' | 'vencido';
  fecha_vencimiento?: string;
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
  return { usuarios: [], ordenes: [], reportes: [] };
};

const saveMockDatabase = (db: any) => {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error al guardar base de datos en localStorage:', error);
  }
};

const AdminReportsPage = () => {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroAccion, setFiltroAccion] = useState<string>('');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<string>('residente'); // residente, apartamento, descripcion

  // Generar reportes desde los datos de usuarios y órdenes
  const generarReportes = () => {
    const db = getMockDatabase();
    const usuarios = db.usuarios || [];
    const reportesExistentes = db.reportes || [];
    
    const nuevosReportes: Reporte[] = [];
    let reporteId = reportesExistentes.length > 0 
      ? Math.max(...reportesExistentes.map((r: any) => r.id)) + 1 
      : 1;

    // Generar reportes de morosidad
    usuarios.forEach((usuario: any) => {
      if (usuario.Estado === 'Moroso') {
        nuevosReportes.push({
          id: reporteId++,
          tipo: 'morosidad',
          residente_id: usuario.id,
          residente_nombre: usuario.nombre,
          residente_correo: usuario.correo,
          residente_apartamento: usuario.numeroApartamento,
          descripcion: `Residente con pagos pendientes`,
          monto: 0,
          fecha: new Date().toISOString(),
          estado: 'vencido',
        });
      }
    });

    // Generar reportes de cambio de estado
    usuarios.forEach((usuario: any) => {
      if (usuario.Estado === 'Moroso') {
        nuevosReportes.push({
          id: reporteId++,
          tipo: 'cambio_estado',
          residente_id: usuario.id,
          residente_nombre: usuario.nombre,
          residente_correo: usuario.correo,
          residente_apartamento: usuario.numeroApartamento,
          descripcion: `Cambio de estado a: ${usuario.Estado}`,
          fecha: new Date().toISOString(),
          estado: 'completado',
        });
      }
    });

    // Combinar reportes existentes con nuevos
    const todosReportes = [...reportesExistentes, ...nuevosReportes];
    
    // Guardar reportes actualizados
    db.reportes = todosReportes;
    saveMockDatabase(db);
    
    return todosReportes;
  };

  useEffect(() => {
    const fetchReportes = async () => {
      setLoading(true);
      setError(null);
      try {
        const reportesGenerados = generarReportes();
        setReportes(reportesGenerados);
      } catch (err: any) {
        setError('Error al obtener reportes');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportes();
  }, []);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado, filtroTipo, filtroAccion, searchTerm, searchBy]);

  // Función para actualizar el estado del reporte
  const updateReporteEstado = (id: number, nuevoEstado: string) => {
    const db = getMockDatabase();
    const reporteIndex = db.reportes.findIndex((r: any) => r.id === id);
    
    if (reporteIndex !== -1) {
      db.reportes[reporteIndex].estado = nuevoEstado;
      saveMockDatabase(db);
      setReportes(db.reportes);
    }
  };

  // Función para resolver morosidad
  const resolverMorosidad = (reporteId: number, residenteId: number) => {
    const db = getMockDatabase();
    
    // Cambiar estado del residente a Activo
    const usuarioIndex = db.usuarios.findIndex((u: any) => u.id === residenteId);
    if (usuarioIndex !== -1) {
      db.usuarios[usuarioIndex].estado = 'Activo';
    }
    
    // Marcar reporte como completado
    const reporteIndex = db.reportes.findIndex((r: any) => r.id === reporteId);
    if (reporteIndex !== -1) {
      db.reportes[reporteIndex].estado = 'completado';
    }
    
    saveMockDatabase(db);
    generarReportes();
    const reportesActualizados = generarReportes();
    setReportes(reportesActualizados);
  };


  // Función para filtrar reportes
  const reportesFiltrados = reportes.filter(reporte => {
    // Filtro por estado
    if (filtroEstado && reporte.estado !== filtroEstado) {
    return false;
    }
    
    // Filtro por tipo
    if (filtroTipo && reporte.tipo !== filtroTipo) {
      return false;
    }
    
    // Filtro por acción (tiempo)
    if (filtroAccion) {
      const fechaReporte = dayjs(reporte.fecha);
      switch (filtroAccion) {
        case 'ultimas_24h':
          return fechaReporte.isAfter(dayjs().subtract(24, 'hour'));
        case 'ultimas_48h':
          return fechaReporte.isAfter(dayjs().subtract(48, 'hour'));
        case 'ultimos_7dias':
          return fechaReporte.isAfter(dayjs().subtract(7, 'day'));
        case 'ultimos_30dias':
          return fechaReporte.isAfter(dayjs().subtract(30, 'day'));
        default:
          return true;
      }
    }
    
    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      switch (searchBy) {
        case 'residente':
          return reporte.residente_nombre?.toLowerCase().includes(term) ||
                 reporte.residente_correo?.toLowerCase().includes(term);
        case 'apartamento':
          return reporte.residente_apartamento?.toLowerCase().includes(term);
        case 'descripcion':
          return reporte.descripcion?.toLowerCase().includes(term);
        default:
          return true;
      }
    }
    
    return true;
  });
  
  // Paginación
  const totalPages = Math.ceil(reportesFiltrados.length / itemsPerPage);
  const paginatedReportes = reportesFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Contadores para resumen superior
  const morososCount = reportes.filter(r => r.tipo === 'morosidad' && r.estado === 'vencido').length;
  const pendientesCount = reportes.filter(r => r.estado === 'pendiente').length;
  const completadosCount = reportes.filter(r => r.estado === 'completado').length;

  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'pendiente': 'bg-yellow-400 text-white',
      'completado': 'bg-green-500 text-white',
      'cancelado': 'bg-gray-400 text-white',
      'vencido': 'bg-red-500 text-white',
    };
    return badges[estado] || 'bg-gray-400 text-white';
  };

  const getTipoBadge = (tipo: string) => {
    const badges: { [key: string]: string } = {
      'pago': 'bg-blue-500 text-white',
      'morosidad': 'bg-red-500 text-white',
      'mantenimiento': 'bg-orange-500 text-white',
      'reserva': 'bg-purple-500 text-white',
      'cambio_estado': 'bg-indigo-500 text-white',
    };
    return badges[tipo] || 'bg-gray-400 text-white';
  };

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'pago': 'Pago',
      'morosidad': 'Morosidad',
      'mantenimiento': 'Mantenimiento',
      'reserva': 'Reserva',
      'cambio_estado': 'Cambio de Estado',
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">
      {/* Resumen superior */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-6 lg:mb-8 pt-4 lg:pt-6">
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-2 lg:p-4">
          <span className="text-xl lg:text-2xl mb-1">🔴</span>
          <span className="text-xl lg:text-2xl font-bold text-red-600 mb-1">{morososCount}</span>
          <span className="text-xs sm:text-sm text-gray-700 text-center">Morosos</span>
        </div>
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-2 lg:p-4">
          <span className="text-xl lg:text-2xl mb-1">🟡</span>
          <span className="text-xl lg:text-2xl font-bold text-yellow-600 mb-1">{pendientesCount}</span>
          <span className="text-xs sm:text-sm text-gray-700 text-center">Pendientes</span>
        </div>
        <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-2 lg:p-4">
          <span className="text-xl lg:text-2xl mb-1">🟢</span>
          <span className="text-xl lg:text-2xl font-bold text-green-600 mb-1">{completadosCount}</span>
          <span className="text-xs sm:text-sm text-gray-700 text-center">Completados</span>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por residente, apartamento o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="residente">Buscar por residente</option>
              <option value="apartamento">Buscar por apartamento</option>
              <option value="descripcion">Buscar por descripción</option>
            </select>
          </div>
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="pago">Pago</option>
              <option value="morosidad">Morosidad</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="reserva">Reserva</option>
              <option value="cambio_estado">Cambio de Estado</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
              <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los períodos</option>
            <option value="ultimas_24h">Últimas 24 horas</option>
            <option value="ultimas_48h">Últimas 48 horas</option>
            <option value="ultimos_7dias">Últimos 7 días</option>
            <option value="ultimos_30dias">Últimos 30 días</option>
              </select>
            </div>
      </div>

      {/* Tabla de reportes */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reportes...</p>
      </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Residente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedReportes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No se encontraron reportes
                      </td>
                    </tr>
                  ) : (
                    paginatedReportes.map((reporte) => (
                      <tr key={reporte.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {dayjs(reporte.fecha).format('DD/MM/YYYY HH:mm')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getTipoBadge(reporte.tipo)}`}>
                            {getTipoLabel(reporte.tipo)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium text-gray-800">{reporte.residente_nombre || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{reporte.residente_correo || ''}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{reporte.residente_apartamento || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={reporte.descripcion}>
                          {reporte.descripcion}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {reporte.monto ? `$${reporte.monto.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getEstadoBadge(reporte.estado)}`}>
                            {reporte.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {reporte.tipo === 'morosidad' && reporte.estado === 'vencido' && (
                              <button
                                onClick={() => resolverMorosidad(reporte.id, reporte.residente_id)}
                                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                title="Resolver morosidad"
                              >
                                Resolver
                              </button>
                            )}
                            {reporte.estado === 'pendiente' && (
                              <button
                                onClick={() => updateReporteEstado(reporte.id, 'completado')}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                title="Marcar como completado"
                              >
                                Completar
                              </button>
                            )}
                            {reporte.estado !== 'cancelado' && (
                <button
                                onClick={() => updateReporteEstado(reporte.id, 'cancelado')}
                                className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                                title="Cancelar"
                >
                                Cancelar
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
                  totalItems={reportesFiltrados.length}
                  itemsPerPage={itemsPerPage}
                />
                </div>
              )}
            </div>
            
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {paginatedReportes.length} de {reportesFiltrados.length} reportes
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReportsPage; 
