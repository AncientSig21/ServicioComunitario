import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchTasaEnTiempoReal } from '../services/exchangeRateService';

const MOCK_DB_KEY = 'mockDatabase_condominio';

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

const AdminStatsPage = () => {
  const [totalUnidades, setTotalUnidades] = useState<number>(0);
  const [totalResidentes, setTotalResidentes] = useState<number>(0);
  const [totalMorosos, setTotalMorosos] = useState<number>(0);
  const [totalActivos, setTotalActivos] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tasa del dólar: en tiempo real (API) o última guardada en BD
  const [tasaDolar, setTasaDolar] = useState<number | null>(null);
  const [tasaFuente, setTasaFuente] = useState<string>('');
  const [tasaFecha, setTasaFecha] = useState<string | null>(null);
  const [tasaEsEnVivo, setTasaEsEnVivo] = useState(false);
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [showTasaFloating, setShowTasaFloating] = useState(false);

  const cargarTasaDolar = async (guardarEnBD = false) => {
    setLoadingTasa(true);
    try {
      const { tasa, fuente, esEnVivo, fecha } = await fetchTasaEnTiempoReal({ guardarEnBD });
      setTasaDolar(tasa);
      setTasaFuente(fuente);
      setTasaEsEnVivo(esEnVivo);
      setTasaFecha(esEnVivo ? new Date().toISOString() : (fecha ?? null));
    } catch (_) {
      setTasaDolar(null);
    } finally {
      setLoadingTasa(false);
    }
  };

  useEffect(() => {
    cargarTasaDolar();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const db = getMockDatabase();
        
        // Contar unidades únicas (por número de apartamento)
        const unidadesUnicas = new Set(
          db.usuarios?.map((u: any) => u.numeroApartamento).filter((apto: string) => apto) || []
        );
        setTotalUnidades(unidadesUnicas.size || 0);

        // Total de residentes
        const totalRes = db.usuarios?.length || 0;
        setTotalResidentes(totalRes);

        // Residentes morosos
        // Columna en BD: Estado (con mayúscula)
        const estadoUsuario = (u: any) => u.Estado ?? u.estado;
        const morosos = db.usuarios?.filter((u: any) => estadoUsuario(u) === 'Moroso').length || 0;
        setTotalMorosos(morosos);

        // Residentes activos
        const activos = db.usuarios?.filter((u: any) => estadoUsuario(u) === 'Activo').length || 0;
        setTotalActivos(activos);
      } catch (err: any) {
        setError('Error al obtener estadísticas');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Tooltip personalizado para la gráfica
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const label = payload[0].payload.name;
      let desc = '';
      if (label === 'Unidades') desc = 'Total de unidades habitacionales';
      else if (label === 'Residentes') desc = 'Total de residentes registrados';
      else if (label === 'Morosos') desc = 'Residentes con pagos pendientes';
      else if (label === 'Activos') desc = 'Residentes en buen estado';
      return (
        <div className="bg-white p-2 rounded shadow text-xs border border-gray-200">
          <div className="font-semibold mb-1">{label}</div>
          <div>{desc}: <span className="font-bold">{payload[0].value}</span></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-center text-gray-800">
        Dashboard de Administración - Ciudad Colonial
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12">
        {/* Estadísticas generales */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 flex flex-col items-center">
          <span className="text-base lg:text-lg font-semibold text-gray-700 text-center">
            Unidades Totales
          </span>
          <span className="text-3xl lg:text-4xl font-bold text-blue-600 mt-2">
            {loading ? '...' : error ? 'Error' : totalUnidades}
          </span>
          <span className="text-xs text-gray-500 mt-1">Apartamentos/Casas</span>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 flex flex-col items-center">
          <span className="text-base lg:text-lg font-semibold text-gray-700 text-center">
            Residentes Totales
          </span>
          <span className="text-3xl lg:text-4xl font-bold text-green-600 mt-2">
            {loading ? '...' : error ? 'Error' : totalResidentes}
          </span>
          <span className="text-xs text-gray-500 mt-1">Habitantes registrados</span>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 flex flex-col items-center">
          <span className="text-base lg:text-lg font-semibold text-gray-700 text-center">
            Residentes Activos
          </span>
          <span className="text-3xl lg:text-4xl font-bold text-emerald-600 mt-2">
            {loading ? '...' : error ? 'Error' : totalActivos}
          </span>
          <span className="text-xs text-gray-500 mt-1">En buen estado</span>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 flex flex-col items-center">
          <span className="text-base lg:text-lg font-semibold text-gray-700 text-center">
            Residentes Morosos
          </span>
          <span className="text-3xl lg:text-4xl font-bold text-red-600 mt-2">
            {loading ? '...' : error ? 'Error' : totalMorosos}
          </span>
          <span className="text-xs text-gray-500 mt-1">Pagos pendientes</span>
        </div>
      </div>
      
      {/* Gráfica de barras */}
      <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 max-w-4xl mx-auto">
        <h2 className="text-lg lg:text-xl font-semibold mb-4 text-center text-gray-800">
          Estadísticas de Ciudad Colonial
        </h2>
        <div className="w-full h-64 lg:h-80">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Unidades', value: totalUnidades || 0, color: '#2563eb' },
              { name: 'Residentes', value: totalResidentes || 0, color: '#22c55e' },
              { name: 'Activos', value: totalActivos || 0, color: '#10b981' },
              { name: 'Morosos', value: totalMorosos || 0, color: '#ef4444' },
            ]}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={CustomTooltip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell key="unidades" fill="#2563eb" />
                <Cell key="residentes" fill="#22c55e" />
                <Cell key="activos" fill="#10b981" />
                <Cell key="morosos" fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {error && (
        <div className="text-center text-red-500 mt-4 p-3 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* Botón flotante: precio del dólar (Banco de Venezuela) */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          {showTasaFloating && (
            <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl bg-white shadow-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">Precio del dólar (Bs/USD)</div>
              <div className="text-2xl font-bold text-amber-600">
                {loadingTasa ? 'Cargando...' : tasaDolar != null ? `${tasaDolar.toFixed(2)} Bs` : 'No disponible'}
              </div>
              {tasaFuente && <div className="text-xs text-gray-500 mt-1">Fuente: {tasaFuente}</div>}
              {tasaEsEnVivo && <div className="text-xs text-green-600 font-medium mt-0.5">En tiempo real</div>}
              {tasaFecha && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(tasaFecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <button
                type="button"
                onClick={() => cargarTasaDolar(false)}
                className="mt-3 w-full py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
              >
                Actualizar (tiempo real)
              </button>
              <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowTasaFloating((v) => !v)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            title="Ver precio del dólar (Banco de Venezuela)"
          >
            <span className="text-xl font-bold">$</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsPage; 