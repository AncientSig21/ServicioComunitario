import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { validation } from '../utils/validation';
import { PasswordInput } from '../components/shared/PasswordInput';

type Step = 'email' | 'code' | 'newPassword' | 'success';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContraseña, setNuevaContraseña] = useState('');
  const [confirmarContraseña, setConfirmarContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    const emailError = validation.getEmailError(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    setStep('code');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    if (!codigo.trim()) {
      setErrors({ codigo: 'Ingresa tu código de recuperación' });
      return;
    }

    const passwordError = validation.getPasswordError(nuevaContraseña);
    if (passwordError) {
      setErrors({ password: passwordError });
      return;
    }

    const confirmPasswordError = validation.getConfirmPasswordError(nuevaContraseña, confirmarContraseña);
    if (confirmPasswordError) {
      setErrors({ confirmPassword: confirmPasswordError });
      return;
    }

    try {
      setLoading(true);
      const { success, error: resetError } = await authService.resetPasswordWithCode({
        email,
        codigo: codigo.trim(),
        nuevaContraseña
      });

      if (!success || resetError) {
        setError(resetError?.message || 'Error al recuperar la contraseña. Verifica tu código.');
        return;
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Error al recuperar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-8 px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white z-[-1]" />

      <div className="relative z-10 bg-white p-6 sm:p-8 rounded-lg shadow-lg shadow-gray-400 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">
          {step === 'email' && 'Recuperar Contraseña'}
          {step === 'code' && 'Código de Recuperación'}
          {step === 'newPassword' && 'Nueva Contraseña'}
          {step === 'success' && 'Contraseña Recuperada'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Paso 1: Ingresar email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4">
              Ingresa tu correo electrónico. En el siguiente paso deberás ingresar el código de recuperación que recibiste al registrarte (también lo puede ver el administrador en Residentes).
            </p>

            <div>
              <input
                type="email"
                placeholder="Correo electrónico *"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={`border p-2 rounded w-full ${errors.email ? 'border-red-500' : ''}`}
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-medium ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Continuar
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-blue-600 underline text-sm mt-2"
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}

        {/* Paso 2: Código + Nueva contraseña */}
        {step === 'code' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4">
              Ingresa el código de recuperación que recibiste al registrarte y tu nueva contraseña. Si no lo tienes, el administrador puede verlo en la sección Residentes.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                readOnly
                className="border p-2 rounded w-full bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Código de recuperación *"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value.toUpperCase());
                  if (errors.codigo) setErrors({ ...errors, codigo: '' });
                }}
                className={`border p-2 rounded w-full font-mono tracking-wider ${errors.codigo ? 'border-red-500' : ''}`}
                maxLength={20}
                required
              />
              {errors.codigo && <p className="text-red-500 text-sm mt-1">{errors.codigo}</p>}
            </div>

            <PasswordInput
              value={nuevaContraseña}
              onChange={(value) => {
                setNuevaContraseña(value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              placeholder="Nueva contraseña *"
              error={errors.password}
              required
            />

            <PasswordInput
              value={confirmarContraseña}
              onChange={(value) => {
                setConfirmarContraseña(value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              placeholder="Confirmar nueva contraseña *"
              error={errors.confirmPassword}
              required
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCodigo('');
                  setNuevaContraseña('');
                  setConfirmarContraseña('');
                  setError(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition font-medium"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-medium ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Actualizando...' : 'Recuperar Contraseña'}
              </button>
            </div>
          </form>
        )}

        {/* Paso 3: Éxito */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-semibold text-gray-900">
              ¡Contraseña recuperada exitosamente!
            </p>
            <p className="text-sm text-gray-600">
              Tu contraseña ha sido actualizada. Ahora puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-medium mt-4"
            >
              Ir al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
