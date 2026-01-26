/**
 * Página de Prueba de Políticas RLS
 * 
 * Esta página permite probar las políticas RLS del sistema de mantenimiento
 * directamente desde la interfaz web.
 * 
 * Para acceder: /test-rls
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { testRLSPolicies, TestResult } from '../utils/testRLSPolicies';
import { motion } from 'framer-motion';

export const TestRLSPage = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [key: number]: boolean }>({});

  const handleRunTests = async () => {
    if (!user) {
      alert('❌ Debes iniciar sesión primero para ejecutar las pruebas');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const testResults = await testRLSPolicies(user);
      setResults(testResults);
    } catch (error: any) {
      console.error('Error ejecutando pruebas:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleDetails = (index: number) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const percentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-xl p-8 mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧪 Prueba de Políticas RLS
          </h1>
          <p className="text-gray-600 mb-6">
            Esta página verifica que las políticas Row Level Security (RLS) 
            del sistema de mantenimiento funcionan correctamente.
          </p>

          {!user ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
              ⚠️ Debes iniciar sesión para ejecutar las pruebas.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Usuario actual:</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li><strong>ID:</strong> {user.id}</li>
                  <li><strong>Nombre:</strong> {user.nombre}</li>
                  <li><strong>Rol:</strong> {user.rol}</li>
                  <li><strong>Condominio ID:</strong> {user.condominio_id}</li>
                </ul>
              </div>

              <button
                onClick={handleRunTests}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Ejecutando pruebas...
                  </>
                ) : (
                  <>
                    🚀 Ejecutar Pruebas RLS
                  </>
                )}
              </button>
            </>
          )}
        </motion.div>

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-xl p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Resultados</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Progreso:</span>
                  <span className="text-gray-900 font-bold">
                    {passedCount}/{totalCount} pruebas pasaron ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      percentage === 100
                        ? 'bg-green-500'
                        : percentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {percentage === 100 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 font-semibold">
                    🎉 ¡Todas las políticas RLS están funcionando correctamente!
                  </p>
                </div>
              )}

              {percentage < 100 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 font-semibold">
                    ⚠️ Algunas políticas RLS necesitan revisión
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">
                          {result.passed ? '✅' : '❌'}
                        </span>
                        <h3 className="font-semibold text-gray-800">
                          {result.test}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {result.message}
                      </p>
                      {result.details && !result.details.skip && (
                        <button
                          onClick={() => toggleDetails(index)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {showDetails[index] ? 'Ocultar' : 'Mostrar'} detalles
                        </button>
                      )}
                    </div>
                  </div>

                  {result.details && showDetails[index] && (
                    <div className="mt-4 bg-white rounded p-3 border border-gray-200">
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-white rounded-lg shadow-xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📝 Instrucciones
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>Inicia sesión con diferentes roles (usuario, conserje, admin) para probar diferentes escenarios</li>
            <li>Las pruebas verifican SELECT, INSERT, UPDATE y DELETE</li>
            <li>Los resultados muestran si las políticas RLS están funcionando correctamente</li>
            <li>También puedes ejecutar las pruebas desde la consola del navegador usando: <code className="bg-gray-100 px-1 rounded">runRLSTests()</code></li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};




