import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchUsuariosPendientes, aprobarUsuario, rechazarUsuario } from '../services/bookService';
import { useAuth } from '../hooks/useAuth';
import { FaCheck, FaTimes, FaUser, FaEnvelope, FaPhone, FaIdCard, FaBuilding } from 'react-icons/fa';

interface UsuarioPendiente {
  id: number;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  cedula: string | null;
  condominio_id: number | null;
  created_at: string | null;
  condominios?: {
    id: number;
    nombre: string;
  } | null;
}

const AdminAprobacionesPage = () => {
  const { user } = useAuth();
  const { handleUsuarioAprobado, cargarContadores } = useOutletContext<{
    handleUsuarioAprobado: () => void;
    cargarContadores: () => void;
  }>();
  const [usuariosPendientes, setUsuariosPendientes] = useState<UsuarioPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [usuarioRechazoId, setUsuarioRechazoId] = useState<number | null>(null);

  useEffect(() => {
    cargarUsuariosPendientes();
  }, []);

  const cargarUsuariosPendientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const usuarios = await fetchUsuariosPendientes();
      setUsuariosPendientes(usuarios);
    } catch (err: any) {
      console.error('Error cargando usuarios pendientes:', err);
      setError(err.message || 'Error al cargar usuarios pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (usuarioId: number, rolSolicitado: string = 'residente') => {
    if (!user?.id) {
      alert('Error: No se pudo identificar al administrador');
      return;
    }

    try {
      setProcesandoId(usuarioId);
      
      // Mapear el rol solicitado a un rol válido
      let rolAprobar: 'propietario' | 'residente' | 'conserje' | 'invitado' = 'residente';
      if (rolSolicitado === 'propietario') rolAprobar = 'propietario';
      else if (rolSolicitado === 'conserje') rolAprobar = 'conserje';
      else if (rolSolicitado === 'invitado') rolAprobar = 'invitado';

      await aprobarUsuario(usuarioId, rolAprobar, user.id);
      
      // Recargar la lista
      await cargarUsuariosPendientes();
      
      // Actualizar contadores en el dashboard
      if (handleUsuarioAprobado) handleUsuarioAprobado();
      if (cargarContadores) cargarContadores();
      
      alert('Usuario aprobado exitosamente');
    } catch (err: any) {
      console.error('Error aprobando usuario:', err);
      alert(err.message || 'Error al aprobar usuario');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async () => {
    if (!usuarioRechazoId || !user?.id) {
      alert('Error: No se pudo identificar al usuario o administrador');
      return;
    }

    if (!motivoRechazo.trim()) {
      alert('Por favor, proporciona un motivo para el rechazo');
      return;
    }

    try {
      setProcesandoId(usuarioRechazoId);
      await rechazarUsuario(usuarioRechazoId, motivoRechazo, user.id);
      
      // Recargar la lista
      await cargarUsuariosPendientes();
      
      // Actualizar contadores en el dashboard
      if (handleUsuarioAprobado) handleUsuarioAprobado();
      if (cargarContadores) cargarContadores();
      
      // Cerrar modal
      setUsuarioRechazoId(null);
      setMotivoRechazo('');
      
      alert('Usuario rechazado exitosamente');
    } catch (err: any) {
      console.error('Error rechazando usuario:', err);
      alert(err.message || 'Error al rechazar usuario');
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando usuarios pendientes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={cargarUsuariosPendientes}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Aprobación de Usuarios
        </h1>
        <button
          onClick={cargarUsuariosPendientes}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {usuariosPendientes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaUser className="mx-auto text-gray-400 text-6xl mb-4" />
          <p className="text-lg text-gray-600">No hay usuarios pendientes de aprobación</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuariosPendientes.map((usuario) => (
            <div
              key={usuario.id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-100 rounded-full p-3">
                    <FaUser className="text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{usuario.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(usuario.created_at || '').toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                  Pendiente
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {usuario.correo && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaEnvelope className="mr-2 text-gray-400" />
                    <span>{usuario.correo}</span>
                  </div>
                )}
                {usuario.telefono && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaPhone className="mr-2 text-gray-400" />
                    <span>{usuario.telefono}</span>
                  </div>
                )}
                {usuario.cedula && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaIdCard className="mr-2 text-gray-400" />
                    <span>{usuario.cedula}</span>
                  </div>
                )}
                {usuario.condominios && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaBuilding className="mr-2 text-gray-400" />
                    <span>{usuario.condominios.nombre}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => handleAprobar(usuario.id, 'residente')}
                  disabled={procesandoId === usuario.id}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <FaCheck />
                  <span>Aprobar</span>
                </button>
                <button
                  onClick={() => setUsuarioRechazoId(usuario.id)}
                  disabled={procesandoId === usuario.id}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <FaTimes />
                  <span>Rechazar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de rechazo */}
      {usuarioRechazoId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Rechazar Usuario</h2>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas rechazar esta solicitud de registro?
            </p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (opcional)"
              className="w-full border rounded p-2 mb-4 min-h-[100px]"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setUsuarioRechazoId(null);
                  setMotivoRechazo('');
                }}
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={procesandoId !== null}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {procesandoId ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAprobacionesPage;

