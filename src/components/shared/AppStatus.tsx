import { useAuth } from '../../hooks/useAuth';

interface AppStatusProps {
  children: React.ReactNode;
}

export const AppStatus = ({ children }: AppStatusProps) => {
  const { isConfigured, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error de Configuración</h2>
          <p className="text-gray-600 mb-4">
            La aplicación no puede conectarse a la base de datos. 
            Verifica que las variables de entorno estén configuradas correctamente.
          </p>
          <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
            <p><strong>Variables requeridas:</strong></p>
            <p>• VITE_SUPABASE_API_KEY</p>
            <p>• VITE_PROJECT_URL_SUPABASE</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}; 