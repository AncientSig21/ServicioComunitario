import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { validation } from '../utils/validation';
import { PasswordInput } from '../components/shared/PasswordInput';

type Step = 'email' | 'questions' | 'newPassword' | 'success';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [respuestas, setRespuestas] = useState<{ [key: string]: string }>({});
  const [nuevaContraseña, setNuevaContraseña] = useState('');
  const [confirmarContraseña, setConfirmarContraseña] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    // Validar email
    const emailError = validation.getEmailError(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    try {
      setLoading(true);
      const { data, error: questionsError } = await authService.getSecurityQuestions(email);

      if (questionsError) {
        setError(questionsError.message || 'Error al obtener preguntas de seguridad');
        return;
      }

      if (!data || data.length === 0) {
        setError('Este usuario no tiene preguntas de seguridad configuradas. Contacta al administrador.');
        return;
      }

      setPreguntas(data);
      setStep('questions');
    } catch (err: any) {
      setError(err.message || 'Error al obtener preguntas de seguridad');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    // Validar que todas las preguntas tengan respuesta
    const newErrors: { [key: string]: string } = {};
    preguntas.forEach((pregunta, index) => {
      if (!respuestas[pregunta.pregunta] || !respuestas[pregunta.pregunta].trim()) {
        newErrors[`respuesta${index}`] = 'Debes responder esta pregunta';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Validar respuestas (solo verificar que estén completas, la validación real se hace en el siguiente paso)
    setStep('newPassword');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    // Validar contraseñas
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

      // Preparar respuestas en el formato esperado
      const respuestasFormato = preguntas.map(pregunta => ({
        pregunta: pregunta.pregunta,
        respuesta: respuestas[pregunta.pregunta]
      }));

      const { success, error: resetError } = await authService.resetPasswordWithSecurityQuestions({
        email,
        respuestas: respuestasFormato,
        nuevaContraseña
      });

      if (!success || resetError) {
        setError(resetError?.message || 'Error al recuperar la contraseña. Verifica tus respuestas.');
        // Volver a preguntas si las respuestas son incorrectas
        if (resetError?.message?.includes('incorrectas')) {
          setStep('questions');
        }
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
      {/* Fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white z-[-1]" />

      <div className="relative z-10 bg-white p-6 sm:p-8 rounded-lg shadow-lg shadow-gray-400 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">
          {step === 'email' && 'Recuperar Contraseña'}
          {step === 'questions' && 'Preguntas de Seguridad'}
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
              Ingresa tu correo electrónico para recuperar tu contraseña mediante preguntas de seguridad.
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
              {loading ? 'Cargando...' : 'Continuar'}
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

        {/* Paso 2: Responder preguntas */}
        {step === 'questions' && (
          <form onSubmit={handleQuestionsSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4">
              Responde las siguientes preguntas de seguridad para verificar tu identidad.
            </p>

            <div className="space-y-4">
              {preguntas.map((pregunta, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {pregunta.pregunta}
                  </label>
                  <input
                    type="text"
                    value={respuestas[pregunta.pregunta] || ''}
                    onChange={(e) => {
                      setRespuestas({
                        ...respuestas,
                        [pregunta.pregunta]: e.target.value
                      });
                      if (errors[`respuesta${index}`]) {
                        setErrors({ ...errors, [`respuesta${index}`]: '' });
                      }
                    }}
                    placeholder="Tu respuesta"
                    className={`w-full border p-2 rounded ${errors[`respuesta${index}`] ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors[`respuesta${index}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`respuesta${index}`]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setRespuestas({});
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
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </form>
        )}

        {/* Paso 3: Nueva contraseña */}
        {step === 'newPassword' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4">
              Establece una nueva contraseña para tu cuenta.
            </p>

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
                  setStep('questions');
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

        {/* Paso 4: Éxito */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-semibold text-gray-900">
              ¡Contraseña recuperada exitosamente!
            </p>
            <p className="text-sm text-gray-600">
              Tu contraseña ha sido actualizada. Ahora puedes iniciar sesión con tu nueva contraseña.
            </p>
            <p className="text-xs text-gray-500">
              Se ha notificado al administrador sobre esta recuperación de contraseña.
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


