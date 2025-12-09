import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { validation } from '../utils/validation';
import { PasswordInput } from '../components/shared/PasswordInput';

const tiposResidencia = [
  'Propietario',
  'Inquilino',
  'Arrendatario',
  'Familiar del Propietario',
];

export const RegisterPage = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [numeroApartamento, setNumeroApartamento] = useState('');
  const [tipoResidencia, setTipoResidencia] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Campos condicionales para Propietario
  const [fechaAdquisicion, setFechaAdquisicion] = useState('');
  const [numeroEscritura, setNumeroEscritura] = useState('');
  
  // Campos condicionales para Inquilino/Arrendatario
  const [nombrePropietario, setNombrePropietario] = useState('');
  const [cedulaPropietario, setCedulaPropietario] = useState('');
  const [telefonoPropietario, setTelefonoPropietario] = useState('');
  const [fechaInicioContrato, setFechaInicioContrato] = useState('');
  const [fechaFinContrato, setFechaFinContrato] = useState('');
  
  // Campos condicionales para Familiar del Propietario
  const [nombrePropietarioRelacionado, setNombrePropietarioRelacionado] = useState('');
  const [cedulaPropietarioRelacionado, setCedulaPropietarioRelacionado] = useState('');
  const [parentesco, setParentesco] = useState('');
  
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

    // Validar número de apartamento
    if (!numeroApartamento) {
      newErrors.numeroApartamento = 'El número de apartamento es requerido';
    }

    // Validar tipo de residencia
    if (!tipoResidencia) {
      newErrors.tipoResidencia = 'Selecciona el tipo de residencia';
    }

    // Validaciones condicionales según tipo de residencia
    if (tipoResidencia === 'Propietario') {
      if (!fechaAdquisicion) {
        newErrors.fechaAdquisicion = 'La fecha de adquisición es requerida';
      }
      if (!numeroEscritura) {
        newErrors.numeroEscritura = 'El número de escritura es requerido';
      }
    }

    if (tipoResidencia === 'Inquilino' || tipoResidencia === 'Arrendatario') {
      if (!nombrePropietario) {
        newErrors.nombrePropietario = 'El nombre del propietario es requerido';
      }
      if (!cedulaPropietario) {
        newErrors.cedulaPropietario = 'La cédula del propietario es requerida';
      } else if (!/^[0-9]+$/.test(cedulaPropietario)) {
        newErrors.cedulaPropietario = 'La cédula debe contener solo números';
      }
      if (!telefonoPropietario) {
        newErrors.telefonoPropietario = 'El teléfono del propietario es requerido';
      }
      if (!fechaInicioContrato) {
        newErrors.fechaInicioContrato = 'La fecha de inicio del contrato es requerida';
      }
      if (!fechaFinContrato) {
        newErrors.fechaFinContrato = 'La fecha de fin del contrato es requerida';
      }
      // Validar que la fecha de fin sea posterior a la de inicio
      if (fechaInicioContrato && fechaFinContrato && new Date(fechaFinContrato) <= new Date(fechaInicioContrato)) {
        newErrors.fechaFinContrato = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (tipoResidencia === 'Familiar del Propietario') {
      if (!nombrePropietarioRelacionado) {
        newErrors.nombrePropietarioRelacionado = 'El nombre del propietario relacionado es requerido';
      }
      if (!cedulaPropietarioRelacionado) {
        newErrors.cedulaPropietarioRelacionado = 'La cédula del propietario relacionado es requerida';
      } else if (!/^[0-9]+$/.test(cedulaPropietarioRelacionado)) {
        newErrors.cedulaPropietarioRelacionado = 'La cédula debe contener solo números';
      }
      if (!parentesco) {
        newErrors.parentesco = 'El parentesco es requerido';
      }
    }

    // Validar contraseña
    const passwordError = validation.getPasswordError(password);
    if (passwordError) newErrors.password = passwordError;

    // Validar confirmar contraseña
    const confirmPasswordError = validation.getConfirmPasswordError(password, confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    const result = await register({
      nombre,
      correo: email,
      contraseña: password,
      escuela: `${numeroApartamento} - ${tipoResidencia}`, // Usamos escuela para almacenar info del condominio
      telefono,
      cedula,
      numeroApartamento,
      tipoResidencia,
      // Campos condicionales
      ...(tipoResidencia === 'Propietario' && {
        fechaAdquisicion,
        numeroEscritura,
      }),
      ...((tipoResidencia === 'Inquilino' || tipoResidencia === 'Arrendatario') && {
        nombrePropietario,
        cedulaPropietario,
        telefonoPropietario,
        fechaInicioContrato,
        fechaFinContrato,
      }),
      ...(tipoResidencia === 'Familiar del Propietario' && {
        nombrePropietarioRelacionado,
        cedulaPropietarioRelacionado,
        parentesco,
      }),
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

        <input
          type="text"
          placeholder="Número de apartamento/casa (ej: Apto 101, Casa 5)"
          value={numeroApartamento}
          onChange={e => {
            setNumeroApartamento(e.target.value);
            handleInputChange('numeroApartamento', e.target.value);
          }}
          className={`border p-2 rounded w-full ${errors.numeroApartamento ? 'border-red-500' : ''}`}
          required
        />
        {errors.numeroApartamento && <p className="text-red-500 text-sm">{errors.numeroApartamento}</p>}

        <select
          value={tipoResidencia}
          onChange={e => {
            setTipoResidencia(e.target.value);
            handleInputChange('tipoResidencia', e.target.value);
            // Limpiar campos condicionales al cambiar el tipo
            setFechaAdquisicion('');
            setNumeroEscritura('');
            setNombrePropietario('');
            setCedulaPropietario('');
            setTelefonoPropietario('');
            setFechaInicioContrato('');
            setFechaFinContrato('');
            setNombrePropietarioRelacionado('');
            setCedulaPropietarioRelacionado('');
            setParentesco('');
          }}
          className={`border p-2 rounded w-full ${errors.tipoResidencia ? 'border-red-500' : ''}`}
          required
        >
          <option value="">Selecciona tu tipo de residencia</option>
          {tiposResidencia.map(tipo => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
        {errors.tipoResidencia && <p className="text-red-500 text-sm">{errors.tipoResidencia}</p>}

        {/* Campos condicionales para Propietario */}
        {tipoResidencia === 'Propietario' && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <h3 className="font-semibold text-gray-700 mb-2">Información de Propiedad</h3>
            
            <input
              type="date"
              placeholder="Fecha de adquisición"
              value={fechaAdquisicion}
              onChange={e => {
                setFechaAdquisicion(e.target.value);
                handleInputChange('fechaAdquisicion', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.fechaAdquisicion ? 'border-red-500' : ''}`}
              required
            />
            {errors.fechaAdquisicion && <p className="text-red-500 text-sm">{errors.fechaAdquisicion}</p>}

            <input
              type="text"
              placeholder="Número de escritura pública"
              value={numeroEscritura}
              onChange={e => {
                setNumeroEscritura(e.target.value);
                handleInputChange('numeroEscritura', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.numeroEscritura ? 'border-red-500' : ''}`}
              required
            />
            {errors.numeroEscritura && <p className="text-red-500 text-sm">{errors.numeroEscritura}</p>}
          </div>
        )}

        {/* Campos condicionales para Inquilino/Arrendatario */}
        {(tipoResidencia === 'Inquilino' || tipoResidencia === 'Arrendatario') && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <h3 className="font-semibold text-gray-700 mb-2">Información del {tipoResidencia === 'Inquilino' ? 'Contrato de Alquiler' : 'Arrendamiento'}</h3>
            
            <input
              type="text"
              placeholder="Nombre completo del propietario"
              value={nombrePropietario}
              onChange={e => {
                setNombrePropietario(e.target.value);
                handleInputChange('nombrePropietario', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.nombrePropietario ? 'border-red-500' : ''}`}
              required
            />
            {errors.nombrePropietario && <p className="text-red-500 text-sm">{errors.nombrePropietario}</p>}

            <input
              type="text"
              placeholder="Cédula del propietario"
              value={cedulaPropietario}
              onChange={e => {
                setCedulaPropietario(e.target.value.replace(/\D/g, ''));
                handleInputChange('cedulaPropietario', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.cedulaPropietario ? 'border-red-500' : ''}`}
              required
            />
            {errors.cedulaPropietario && <p className="text-red-500 text-sm">{errors.cedulaPropietario}</p>}

            <input
              type="tel"
              placeholder="Teléfono del propietario"
              value={telefonoPropietario}
              onChange={e => {
                setTelefonoPropietario(e.target.value);
                handleInputChange('telefonoPropietario', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.telefonoPropietario ? 'border-red-500' : ''}`}
              required
            />
            {errors.telefonoPropietario && <p className="text-red-500 text-sm">{errors.telefonoPropietario}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fecha de inicio del contrato</label>
                <input
                  type="date"
                  value={fechaInicioContrato}
                  onChange={e => {
                    setFechaInicioContrato(e.target.value);
                    handleInputChange('fechaInicioContrato', e.target.value);
                  }}
                  className={`border p-2 rounded w-full ${errors.fechaInicioContrato ? 'border-red-500' : ''}`}
                  required
                />
                {errors.fechaInicioContrato && <p className="text-red-500 text-sm">{errors.fechaInicioContrato}</p>}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Fecha de fin del contrato</label>
                <input
                  type="date"
                  value={fechaFinContrato}
                  onChange={e => {
                    setFechaFinContrato(e.target.value);
                    handleInputChange('fechaFinContrato', e.target.value);
                  }}
                  min={fechaInicioContrato}
                  className={`border p-2 rounded w-full ${errors.fechaFinContrato ? 'border-red-500' : ''}`}
                  required
                />
                {errors.fechaFinContrato && <p className="text-red-500 text-sm">{errors.fechaFinContrato}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Campos condicionales para Familiar del Propietario */}
        {tipoResidencia === 'Familiar del Propietario' && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <h3 className="font-semibold text-gray-700 mb-2">Información del Propietario Relacionado</h3>
            
            <input
              type="text"
              placeholder="Nombre completo del propietario relacionado"
              value={nombrePropietarioRelacionado}
              onChange={e => {
                setNombrePropietarioRelacionado(e.target.value);
                handleInputChange('nombrePropietarioRelacionado', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.nombrePropietarioRelacionado ? 'border-red-500' : ''}`}
              required
            />
            {errors.nombrePropietarioRelacionado && <p className="text-red-500 text-sm">{errors.nombrePropietarioRelacionado}</p>}

            <input
              type="text"
              placeholder="Cédula del propietario relacionado"
              value={cedulaPropietarioRelacionado}
              onChange={e => {
                setCedulaPropietarioRelacionado(e.target.value.replace(/\D/g, ''));
                handleInputChange('cedulaPropietarioRelacionado', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.cedulaPropietarioRelacionado ? 'border-red-500' : ''}`}
              required
            />
            {errors.cedulaPropietarioRelacionado && <p className="text-red-500 text-sm">{errors.cedulaPropietarioRelacionado}</p>}

            <select
              value={parentesco}
              onChange={e => {
                setParentesco(e.target.value);
                handleInputChange('parentesco', e.target.value);
              }}
              className={`border p-2 rounded w-full ${errors.parentesco ? 'border-red-500' : ''}`}
              required
            >
              <option value="">Selecciona el parentesco</option>
              <option value="Cónyuge">Cónyuge</option>
              <option value="Hijo/Hija">Hijo/Hija</option>
              <option value="Padre/Madre">Padre/Madre</option>
              <option value="Hermano/Hermana">Hermano/Hermana</option>
              <option value="Abuelo/Abuela">Abuelo/Abuela</option>
              <option value="Nieto/Nieta">Nieto/Nieta</option>
              <option value="Otro">Otro</option>
            </select>
            {errors.parentesco && <p className="text-red-500 text-sm">{errors.parentesco}</p>}
          </div>
        )}

        <PasswordInput
          value={password}
          onChange={(value) => {
            setPassword(value);
            handleInputChange('password', value);
          }}
          placeholder="Contraseña"
          error={errors.password}
          required
        />

        <PasswordInput
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            handleInputChange('confirmPassword', value);
          }}
          placeholder="Confirmar contraseña"
          error={errors.confirmPassword}
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