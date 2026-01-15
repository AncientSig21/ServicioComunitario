import { useState, useEffect } from 'react';
import { FaDollarSign, FaUsers, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { fetchCondominios, crearPagoParaTodosUsuarios, crearPagoParaTodosCondominios } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

interface Condominio {
  id: number;
  nombre: string;
  direccion?: string;
}

const tiposPago = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'multa', label: 'Multa' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'otros', label: 'Otros' },
];

export default function AdminPagosPage() {
  const { user } = useAuth();
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCondominios, setLoadingCondominios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    condominio_id: '',
    concepto: '',
    monto: '',
    tipo: 'mantenimiento',
    fecha_vencimiento: '',
  });
  const [resultado, setResultado] = useState<{
    pagosCreados: number;
    totalUsuarios: number;
    totalCondominios?: number;
    resultadosPorCondominio?: Array<{condominio: string, pagos: number, usuarios: number}>;
  } | null>(null);

  // Cargar condominios
  useEffect(() => {
    const cargarCondominios = async () => {
      try {
        setLoadingCondominios(true);
        const data = await fetchCondominios();
        setCondominios(data);
      } catch (err: any) {
        console.error('Error cargando condominios:', err);
        setError('Error al cargar condominios');
      } finally {
        setLoadingCondominios(false);
      }
    };

    cargarCondominios();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResultado(null);

    // Validaciones
    if (!formData.condominio_id) {
      setError('Debes seleccionar un condominio o "Todos los condominios"');
      return;
    }

    if (!formData.concepto.trim()) {
      setError('El concepto es requerido');
      return;
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!user) {
      setError('Debes estar autenticado');
      return;
    }

    try {
      setLoading(true);

      let resultadoCreacion;

      // Si se seleccionó "Todos los condominios"
      if (formData.condominio_id === 'todos') {
        resultadoCreacion = await crearPagoParaTodosCondominios({
          concepto: formData.concepto.trim(),
          monto: parseFloat(formData.monto),
          tipo: formData.tipo,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          admin_id: user.id,
        });

        setResultado(resultadoCreacion);
        setSuccess(`✅ Pago creado exitosamente para ${resultadoCreacion.pagosCreados} usuarios en ${resultadoCreacion.totalCondominios} condominios`);
      } else {
        // Pago para un condominio específico
        resultadoCreacion = await crearPagoParaTodosUsuarios({
          condominio_id: parseInt(formData.condominio_id),
          concepto: formData.concepto.trim(),
          monto: parseFloat(formData.monto),
          tipo: formData.tipo,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          admin_id: user.id,
        });

        setResultado(resultadoCreacion);
        setSuccess(`✅ Pago creado exitosamente para ${resultadoCreacion.pagosCreados} usuarios`);
      }
      
      // Limpiar formulario
      setFormData({
        condominio_id: '',
        concepto: '',
        monto: '',
        tipo: 'mantenimiento',
        fecha_vencimiento: '',
      });
    } catch (err: any) {
      console.error('Error creando pago:', err);
      setError(err.message || 'Error al crear el pago. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FaDollarSign className="text-blue-600" />
            Crear Pago Masivo
          </h1>
          <p className="text-gray-600">
            Crea un pago que aparecerá para todos los usuarios activos del condominio seleccionado o para todos los condominios
          </p>
        </div>

        {/* Mensajes de error/éxito */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
          >
            <FaExclamationCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3"
          >
            <FaCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-semibold">Éxito</p>
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          </motion.div>
        )}

        {/* Resultado de la creación */}
        {resultado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <FaUsers className="text-blue-600" />
              Resumen de la Operación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resultado.totalCondominios && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Total de Condominios</p>
                  <p className="text-2xl font-bold text-purple-600">{resultado.totalCondominios}</p>
                </div>
              )}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">
                  {resultado.totalCondominios ? 'Total de Usuarios' : 'Total de Usuarios en Condominio'}
                </p>
                <p className="text-2xl font-bold text-blue-600">{resultado.totalUsuarios}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Pagos Creados Exitosamente</p>
                <p className="text-2xl font-bold text-green-600">{resultado.pagosCreados}</p>
              </div>
            </div>
            {resultado.resultadosPorCondominio && resultado.resultadosPorCondominio.length > 0 && (
              <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Resultados por Condominio:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {resultado.resultadosPorCondominio.map((res, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                      <span className="font-medium text-gray-800">{res.condominio}</span>
                      <span className="text-gray-600">
                        {res.pagos} pagos / {res.usuarios} usuarios
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resultado.pagosCreados < resultado.totalUsuarios && (
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                ⚠️ Nota: Algunos usuarios ya tenían un pago pendiente con el mismo concepto, por lo que no se creó un duplicado.
              </p>
            )}
          </motion.div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Condominio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condominio <span className="text-red-500">*</span>
              </label>
              {loadingCondominios ? (
                <div className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
                  <p className="text-gray-500">Cargando condominios...</p>
                </div>
              ) : (
                <select
                  value={formData.condominio_id}
                  onChange={(e) => setFormData({ ...formData, condominio_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                  required
                >
                  <option value="">Selecciona un condominio</option>
                  <option value="todos" className="font-semibold">
                    🏢 Todos los Condominios
                  </option>
                  {condominios.map((condominio) => (
                    <option key={condominio.id} value={condominio.id}>
                      {condominio.nombre}
                    </option>
                  ))}
                </select>
              )}
              {formData.condominio_id === 'todos' && (
                <p className="mt-2 text-sm text-blue-600 font-medium">
                  ⚠️ Se creará el pago para todos los usuarios de todos los condominios
                </p>
              )}
            </div>

            {/* Concepto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concepto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Pago de Mantenimiento - Enero 2025"
                required
              />
            </div>

            {/* Monto y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {tiposPago.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha de Vencimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento (Opcional)
              </label>
              <input
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || loadingCondominios}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creando pagos...</span>
                  </>
                ) : (
                  <>
                    <FaDollarSign />
                    <span>Crear Pago para Todos los Usuarios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💡 Información Importante
          </h3>
          <ul className="text-blue-800 text-sm space-y-2 list-disc list-inside">
            <li>Puedes seleccionar un <strong>condominio específico</strong> o <strong>"Todos los Condominios"</strong> para crear el pago masivamente</li>
            <li>El pago se creará para todos los usuarios <strong>activos</strong> del condominio(s) seleccionado(s)</li>
            <li>Si un usuario ya tiene un pago pendiente con el mismo concepto, no se creará un duplicado</li>
            <li>Los usuarios recibirán una notificación cuando se cree el pago</li>
            <li>El pago aparecerá en el estado de pagos de cada usuario con estado "Pendiente"</li>
            <li>Los usuarios podrán solicitar el pago usando el botón "Solicitar Pago" en su página de pagos</li>
            <li><strong>Nota:</strong> Si seleccionas "Todos los Condominios", el proceso puede tardar más tiempo dependiendo de la cantidad de usuarios</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

