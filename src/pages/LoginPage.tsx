import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { validation } from '../utils/validation';
import { PasswordInput } from '../components/shared/PasswordInput';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const navigate = useNavigate();
  const { login, loading, error, clearError, isConfigured } = useAuth();

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Validar email
    const emailError = validation.getEmailError(email);
    if (emailError) newErrors.email = emailError;

    // Validar contraseña
    const passwordError = validation.getPasswordError(password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    const result = await login({
      correo: email,
      contraseña: password,
    });

    if (result.success) {
      // Pequeño delay para asegurar que el estado se actualice
      setTimeout(() => {
        if (result.user && (result.user.rol === 'admin' || result.user.rol === 'Administrador')) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }, 100);
    }
  };

  const handleInputChange = (field: string) => {
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Fondo de imagen */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white z-[-1]" />
      <form
        onSubmit={handleLogin}
        className="relative z-10 bg-white p-8 rounded shadow-lg shadow-gray-400 w-full max-w-md flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center mb-4">Iniciar sesión</h2>
        
        {!isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-700">
              <strong>Modo simulado:</strong> El sistema de autenticación no está configurado. 
              Cualquier email y contraseña funcionarán para probar la interfaz.
            </p>
          </div>
        )}
        
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            handleInputChange('email');
          }}
          className={`border p-2 rounded w-full ${errors.email ? 'border-red-500' : ''}`}
          required
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

        <PasswordInput
          value={password}
          onChange={(value) => {
            setPassword(value);
            handleInputChange('password');
          }}
          placeholder="Contraseña"
          error={errors.password}
          required
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Iniciando sesión...' : 'Ingresar'}
        </button>
        
        <button
          type="button"
          className="text-blue-600 underline text-sm mt-2"
          onClick={() => navigate('/register')}
        >
          ¿No tienes cuenta? Regístrate
        </button>
      </form>
    </div>
  );
}; 