import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { Pagination } from '../components/shared/Pagination';
import { getReportesFromSupabase, actualizarEstadoUsuario, type ReporteAdmin } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';

const AdminReportsPage = () => {
  const { user } = useAuth();
  const [reportes, setReportes] = useState<ReporteAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroAccion, setFiltroAccion] = useState<string>('');
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [resolviendoId, setResolviendoId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<string>('residente');

  const fetchReportes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReportesFromSupabase();
      setReportes(data);
    } catch (err: unknown) {
      setError('Error al obtener reportes desde la base de datos');
      console.error(err);
      setReportes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado, filtroTipo, filtroAccion, searchTerm, searchBy]);

  const resolverMorosidad = async (reporteId: number, residenteId: number) => {
    if (!user?.id) return;
    setResolviendoId(reporteId);
    try {
      await actualizarEstadoUsuario({
        usuario_id: residenteId,
        estado: 'Activo',
        admin_id: user.id,
      });
      await fetchReportes();
    } catch (err: unknown) {
      console.error('Error al resolver morosidad:', err);
      setError('No se pudo actualizar el estado del usuario. Verifique que sea administrador.');
    } finally {
      setResolviendoId(null);
    }
  };

  const updateReporteEstado = (id: number, nuevoEstado: string, reporte?: ReporteAdmin) => {
    if (nuevoEstado === 'completado' && reporte?.tipo === 'morosidad') {
      resolverMorosidad(id, reporte.residente_id);
      return;
    }
    if (nuevoEstado === 'cancelado') {
      setDismissedIds((prev) => new Set(prev).add(id));
    }
  };

  const reportesVisibles = reportes.filter((r) => !dismissedIds.has(r.id));
  const reportesFiltrados = reportesVisibles.filter((reporte) => {
    if (filtroEstado && reporte.estado !== filtroEstado) return false;
    if (filtroTipo && reporte.tipo !== filtroTipo) return false;
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
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      switch (searchBy) {
        case 'residente':
          return (
            reporte.residente_nombre?.toLowerCase().includes(term) ||
            reporte.residente_correo?.toLowerCase().includes(term)
          );
        case 'descripcion':
          return reporte.descripcion?.toLowerCase().includes(term);
        default:
          return true;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(reportesFiltrados.length / itemsPerPage);
  const paginatedReportes = reportesFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const morososCount = reportesVisibles.filter((r) => r.tipo === 'morosidad' && r.estado === 'vencido').length;
  const pendientesCount = reportesVisibles.filter((r) => r.estado === 'pendiente').length;
  const completadosCount = reportesVisibles.filter((r) => r.estado === 'completado').length;

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, string> = {
      pendiente: 'bg-yellow-400 text-white',
      completado: 'bg-green-500 text-white',
      cancelado: 'bg-gray-400 text-white',
      vencido: 'bg-red-500 text-white',
    };
    return badges[estado] || 'bg-gray-400 text-white';
  };

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, string> = {
      pago: 'bg-blue-500 text-white',
      morosidad: 'bg-red-500 text-white',
      mantenimiento: 'bg-orange-500 text-white',
      reserva: 'bg-purple-500 text-white',
      cambio_estado: 'bg-indigo-500 text-white',
    };
    return badges[tipo] || 'bg-gray-400 text-white';
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      pago: 'Pago',
      morosidad: 'Morosidad',
      mantenimiento: 'Mantenimiento',
      reserva: 'Reserva',
      cambio_estado: 'Cambio de Estado',
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">
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

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por residente o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="residente">Buscar por residente</option>
              <option value="descripcion">Buscar por descripción</option>
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
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los períodos</option>
            <option value="ultimas_24h">Últimas 24 horas</option>
            <option value="ultimas_48h">Últimas 48 horas</option>
            <option value="ultimos_7dias">Últimos 7 días</option>
            <option value="ultimos_30dias">Últimos 30 días</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando reportes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
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
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {dayjs(reporte.fecha).format('DD/MM/YYYY HH:mm')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getTipoBadge(reporte.tipo)}`}>
                            {getTipoLabel(reporte.tipo)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{reporte.residente_nombre || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{reporte.residente_correo || ''}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{reporte.residente_apartamento || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{reporte.descripcion}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {reporte.monto != null ? `$${reporte.monto.toFixed(2)}` : 'N/A'}
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
                                disabled={resolviendoId === reporte.id}
                                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                                title="Resolver morosidad (pasar usuario a Activo)"
                              >
                                {resolviendoId === reporte.id ? '...' : 'Resolver'}
                              </button>
                            )}
                            {reporte.estado === 'pendiente' && (
                              <button
                                onClick={() => updateReporteEstado(reporte.id, 'completado', reporte)}
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
                                title="Ocultar de la lista"
                              >
                                Ocultar
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
