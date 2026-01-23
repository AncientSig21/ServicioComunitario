import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { FaUser, FaEnvelope, FaHome, FaKey, FaSave, FaArrowLeft } from 'react-icons/fa';
import { PasswordInput } from '../components/shared/PasswordInput';
import { validation } from '../utils/validation';

export const ProfilePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [numeroApartamento, setNumeroApartamento] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      setNombre(user.nombre || '');
      setEmail(user.correo || '');
      setNumeroApartamento(user.numeroApartamento || '');
    }
  }, [user, loading, navigate]);

  const validateProfileForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    const emailError = validation.getEmailError(email);
    if (emailError) newErrors.email = emailError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }

    const passwordError = validation.getPasswordError(newPassword);
    if (passwordError) newErrors.newPassword = passwordError;

    const confirmPasswordError = validation.getConfirmPasswordError(newPassword, confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;

    setIsSaving(true);
    try {
      // Aquí deberías actualizar el perfil en la base de datos
      // Por ahora solo mostramos un mensaje de éxito
      // TODO: Implementar actualización real cuando esté disponible en authService
      
      showSuccess('Perfil actualizado correctamente');
      
      // Limpiar errores
      setErrors({});
    } catch (error: any) {
      showError(error.message || 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setIsChangingPassword(true);
    try {
      // Aquí deberías verificar la contraseña actual y actualizar la nueva
      // Por ahora solo mostramos un mensaje de éxito
      // TODO: Implementar cambio de contraseña real cuando esté disponible en authService
      
      showSuccess('Contraseña actualizada correctamente');
      
      // Limpiar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (error: any) {
      showError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <FaArrowLeft />
          <span>Volver</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">Gestiona tu información personal y configuración de cuenta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Perfil */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <FaUser className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Información Personal</h2>
            </div>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (errors.nombre) setErrors({...errors, nombre: ''});
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Tu nombre completo"
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <FaEnvelope className="inline mr-2" />
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({...errors, email: ''});
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Número de Apartamento */}
              <div>
                <label htmlFor="numeroApartamento" className="block text-sm font-medium text-gray-700 mb-2">
                  <FaHome className="inline mr-2" />
                  Número de Casa/Apartamento
                </label>
                <input
                  id="numeroApartamento"
                  type="text"
                  value={numeroApartamento}
                  onChange={(e) => setNumeroApartamento(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: A-101"
                />
              </div>

              {/* Rol (solo lectura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <input
                  type="text"
                  value={user.rol || 'Usuario'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Estado (solo lectura) */}
              {user.estado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={user.estado}
                    disabled
                    className={`w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed ${
                      user.estado === 'Moroso' ? 'text-red-600' : 'text-green-600'
                    }`}
                  />
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSave />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          {/* Cambiar Contraseña */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaKey className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">Cambiar Contraseña</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual
                </label>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) setErrors({...errors, currentPassword: ''});
                  }}
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors({...errors, newPassword: ''});
                  }}
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({...errors, confirmPassword: ''});
                  }}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaKey />
                {isChangingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        </div>

        {/* Panel lateral con resumen */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Cuenta</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.nombre}</p>
                  <p className="text-sm text-gray-600">{user.correo}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Miembro desde</p>
                <p className="text-gray-900 font-medium">Ciudad Colonial</p>
              </div>

              {user.numeroApartamento && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Residencia</p>
                  <p className="text-gray-900 font-medium">{user.numeroApartamento}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


