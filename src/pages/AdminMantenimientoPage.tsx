import { useState } from 'react';
import { ejecutarMantenimientoUsuarios } from '../services/userMaintenanceService';
import { useToast } from '../contexts/ToastContext';
import { FaSync, FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

const AdminMantenimientoPage = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const [ejecutando, setEjecutando] = useState(false);
  const [resultado, setResultado] = useState<{
    estados: {
      total: number;
      actualizados: number;
      errores: number;
      detalles: Array<{ usuario_id: number; nombre: string; estado_anterior: string; estado_nuevo: string }>;
    };
    pagos: {
      eliminados: number;
      errores: number;
    };
  } | null>(null);

  const handleEjecutarMantenimiento = async () => {
    if (!confirm('¿Estás seguro de que deseas ejecutar el mantenimiento? Esto actualizará el estado de todos los usuarios según sus pagos.')) {
      return;
    }

    try {
      setEjecutando(true);
      setResultado(null);
      
      showInfo('Ejecutando mantenimiento de usuarios...');
      
      const resultado = await ejecutarMantenimientoUsuarios();
      setResultado(resultado);
      
      if (resultado.estados.errores === 0) {
        showSuccess(`Mantenimiento completado: ${resultado.estados.actualizados} usuarios actualizados`);
      } else {
        showError(`Mantenimiento completado con ${resultado.estados.errores} errores`);
      }
    } catch (error: any) {
      console.error('Error ejecutando mantenimiento:', error);
      showError(error.message || 'Error al ejecutar el mantenimiento');
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaSync className="text-blue-600" size={28} />
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
            Mantenimiento de Usuarios
          </h1>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="text-blue-600 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">¿Qué hace esta función?</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Corrige el estado de todos los usuarios existentes según sus pagos</li>
                <li>Usuarios sin pagos vencidos → Estado: <strong>Activo</strong></li>
                <li>Usuarios con pagos vencidos → Estado: <strong>Moroso</strong></li>
                <li>Asegura que solo usuarios con deudas reales tengan estado "Moroso"</li>
                <li>No afecta a administradores</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={handleEjecutarMantenimiento}
            disabled={ejecutando}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-lg font-semibold
              flex items-center justify-center gap-2
              transition-all duration-200
              ${ejecutando
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
              }
            `}
          >
            <FaSync className={ejecutando ? 'animate-spin' : ''} />
            {ejecutando ? 'Ejecutando...' : 'Ejecutar Mantenimiento'}
          </button>
        </div>

        {resultado && (
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                {resultado.estados.errores === 0 ? (
                  <FaCheckCircle className="text-green-600" />
                ) : (
                  <FaExclamationCircle className="text-yellow-600" />
                )}
                Resultado del Mantenimiento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">Total de Usuarios</div>
                  <div className="text-2xl font-bold text-gray-800">{resultado.estados.total}</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">Actualizados</div>
                  <div className="text-2xl font-bold text-green-600">{resultado.estados.actualizados}</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">Errores</div>
                  <div className={`text-2xl font-bold ${resultado.estados.errores > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {resultado.estados.errores}
                  </div>
                </div>
              </div>

              {resultado.estados.detalles.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Usuarios Actualizados:</h4>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado Anterior
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado Nuevo
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {resultado.estados.detalles.map((detalle) => (
                            <tr key={detalle.usuario_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {detalle.usuario_id}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {detalle.nombre}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  detalle.estado_anterior === 'Moroso' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {detalle.estado_anterior}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  detalle.estado_nuevo === 'Moroso' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {detalle.estado_nuevo}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMantenimientoPage;

