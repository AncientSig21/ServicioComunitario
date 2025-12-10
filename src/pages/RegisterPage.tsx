import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { validation } from '../utils/validation';

export const RegisterPage = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [condominio, setCondominio] = useState('');
  const [tipoResidencia, setTipoResidencia] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const navigate = useNavigate();
  const { register, loading, error, clearError, isConfigured } = useAuth();

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Validar nombre
    const nombreError = validation.getNombreError(nombre);
    if (nombreError) newErrors.nombre = nombreError;

    // Validar email
    const emailError = validation.getEmailError(email);
    if (emailError) newErrors.email = emailError;

    // Validar teléfono
    if (!telefono) {
      newErrors.telefono = 'El teléfono es requerido';
    } else if (!/^[0-9+\-\s()]+$/.test(telefono)) {
      newErrors.telefono = 'Formato de teléfono inválido';
    }

    // Validar cédula
    if (!cedula) {
      newErrors.cedula = 'La cédula es requerida';
    } else if (!/^[0-9]+$/.test(cedula)) {
      newErrors.cedula = 'La cédula debe contener solo números';
    }

    // Validar condominio
    if (!condominio) {
      newErrors.condominio = 'Selecciona el condominio al que perteneces';
    }

    // Validar tipo de residencia
    if (!tipoResidencia) {
      newErrors.tipoResidencia = 'Selecciona tu tipo de residencia';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    // Generar contraseña automáticamente usando la cédula como base
    // El usuario podrá cambiarla después desde su perfil
    const passwordAuto = cedula || 'temp123';

    const result = await register({
      nombre,
      correo: email,
      contraseña: passwordAuto,
      telefono,
      cedula,
      condominio,
      tipoResidencia,
    });

    if (result.success) {
      // Redirigir a la página principal después del registro exitoso
      setTimeout(() => {
        if (result.user && (result.user.rol === 'admin' || result.user.rol === 'Administrador')) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }, 100);
    }
  };

  const handleInputChange = (_field: string, _value?: string) => {
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[_field]) {
      setErrors(prev => ({ ...prev, [_field]: '' }));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Fondo de imagen */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white z-[-1]" />
      <form
        onSubmit={handleRegister}
        className="relative z-10 bg-white p-8 rounded shadow-lg shadow-gray-400 w-full max-w-md flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center mb-4">Registro de Habitante</h2>
        
        {!isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-700">
              <strong>Modo simulado:</strong> El sistema de autenticación no está configurado. 
              Los datos se simularán localmente.
            </p>
          </div>
        )}
        
        <input
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={e => {
            setNombre(e.target.value);
            handleInputChange('nombre', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.nombre ? 'border-red-500' : ''}`}
          required
        />
        {errors.nombre && <p className="text-red-500 text-sm">{errors.nombre}</p>}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            handleInputChange('email', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.email ? 'border-red-500' : ''}`}
          required
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

        <input
          type="tel"
          placeholder="Teléfono de contacto"
          value={telefono}
          onChange={e => {
            setTelefono(e.target.value);
            handleInputChange('telefono', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.telefono ? 'border-red-500' : ''}`}
          required
        />
        {errors.telefono && <p className="text-red-500 text-sm">{errors.telefono}</p>}

        <input
          type="text"
          placeholder="Cédula de identidad"
          value={cedula}
          onChange={e => {
            setCedula(e.target.value.replace(/\D/g, ''));
            handleInputChange('cedula', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.cedula ? 'border-red-500' : ''}`}
          required
        />
        {errors.cedula && <p className="text-red-500 text-sm">{errors.cedula}</p>}

        <select
          value={condominio}
          onChange={e => {
            setCondominio(e.target.value);
            handleInputChange('condominio', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.condominio ? 'border-red-500' : ''}`}
          required
        >
          <option value="">Selecciona tu condominio</option>
          <option value="San Antonio">San Antonio</option>
          <option value="Caripe">Caripe</option>
          <option value="San Juan">San Juan</option>
        </select>
        {errors.condominio && <p className="text-red-500 text-sm">{errors.condominio}</p>}

        <select
          value={tipoResidencia}
          onChange={e => {
            setTipoResidencia(e.target.value);
            handleInputChange('tipoResidencia', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.tipoResidencia ? 'border-red-500' : ''}`}
          required
        >
          <option value="">Selecciona tu tipo de residencia</option>
          <option value="Propietario">Propietario</option>
          <option value="Inquilino">Inquilino</option>
          <option value="Arrendatario">Arrendatario</option>
          <option value="Familiar del Propietario">Familiar del Propietario</option>
        </select>
        {errors.tipoResidencia && <p className="text-red-500 text-sm">{errors.tipoResidencia}</p>}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
        
        <button
          type="button"
          className="text-blue-600 underline text-sm mt-2"
          onClick={() => navigate('/login')}
        >
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </form>
    </div>
  );
}; 