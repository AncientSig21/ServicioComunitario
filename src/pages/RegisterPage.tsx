import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validation } from '../utils/validation';
import { PasswordInput } from '../components/shared/PasswordInput';
import { fetchCondominios, notificarRegistroUsuario } from '../services/bookService';
import { supabase } from '../supabase/client';

export const RegisterPage = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [condominioId, setCondominioId] = useState<number | null>(null);
  
  const [condominios, setCondominios] = useState<any[]>([]);
  const [loadingCondominios, setLoadingCondominios] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Cargar condominios al montar
  useEffect(() => {
    const cargarCondominios = async () => {
      try {
        setLoadingCondominios(true);
        const data = await fetchCondominios();
        setCondominios(data);
      } catch (err) {
        console.error('Error al cargar condominios:', err);
      } finally {
        setLoadingCondominios(false);
      }
    };
    cargarCondominios();
  }, []);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Validar nombre
    const nombreError = validation.getNombreError(nombre);
    if (nombreError) newErrors.nombre = nombreError;

    // Validar email
    const emailError = validation.getEmailError(email);
    if (emailError) newErrors.email = emailError;

    // Validar teléfono (opcional pero si se proporciona debe ser válido)
    if (telefono && !/^[0-9+\-\s()]+$/.test(telefono)) {
      newErrors.telefono = 'Formato de teléfono inválido';
    }

    // Validar cédula (opcional pero si se proporciona debe ser válida)
    if (cedula && !/^[0-9]+$/.test(cedula)) {
      newErrors.cedula = 'La cédula debe contener solo números';
    }

    // Validar número de casa (requerido)
    if (!numeroCasa.trim()) {
      newErrors.numeroCasa = 'El número de casa es requerido';
    } else if (!/^[A-Za-z0-9\-\s]+$/.test(numeroCasa)) {
      newErrors.numeroCasa = 'Formato de número de casa inválido';
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
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Registrar usuario - Solo campos que existen en la tabla usuarios según el esquema SQL
      // Campos válidos: nombre, correo, telefono, cedula, contraseña, condominio_id
      // auth_uid, created_at, updated_at se generan automáticamente
      // rol se deja como null para que el administrador lo asigne después
      // estado se establece como 'Activo' por defecto
      // numero_casa: campo adicional para asociar con teléfono y verificar en pagos
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .insert([{
          nombre,
          correo: email,
          telefono: telefono || null,
          cedula: cedula || null,
          contraseña: password,
          condominio_id: condominioId || null,
          rol: null, // Pendiente de aprobación del administrador
          Estado: 'Activo', // Estado inicial: Activo
          // Nota: numero_casa se guardará en un campo JSON o como parte de observaciones
          // Si la BD no tiene el campo, podemos guardarlo en observaciones o crear una tabla adicional
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Si se proporcionó número de casa y condominio, buscar o crear vivienda y asociarla
      let vivienda_id: number | null = null;
      if (numeroCasa.trim() && condominioId) {
        try {
          // Buscar vivienda existente con ese número en el condominio
          const { data: viviendaExistente, error: viviendaError } = await supabase
            .from('viviendas')
            .select('id')
            .eq('numero_apartamento', numeroCasa.trim())
            .eq('condominio_id', condominioId)
            .maybeSingle();

          if (viviendaError && viviendaError.code !== 'PGRST116') {
            console.warn('Error buscando vivienda:', viviendaError);
          }

          if (viviendaExistente) {
            vivienda_id = viviendaExistente.id;
          } else {
            // Crear nueva vivienda
            const { data: nuevaVivienda, error: crearError } = await supabase
              .from('viviendas')
              .insert([{
                condominio_id: condominioId,
                numero_apartamento: numeroCasa.trim(),
                activo: true
              }])
              .select('id')
              .single();

            if (crearError) {
              console.warn('No se pudo crear vivienda (puede requerir permisos de admin):', crearError);
            } else {
              vivienda_id = nuevaVivienda.id;
            }
          }

          // Asociar usuario con vivienda si se encontró/creó
          if (vivienda_id) {
            const { error: asociarError } = await supabase
              .from('usuario_vivienda')
              .insert([{
                usuario_id: usuario.id,
                vivienda_id: vivienda_id,
                rol_en_vivienda: 'propietario', // Por defecto, el admin puede cambiar esto
                fecha_inicio: new Date().toISOString().split('T')[0],
                activo: true
              }]);

            if (asociarError) {
              console.warn('No se pudo asociar usuario con vivienda:', asociarError);
            }
          }
        } catch (err) {
          console.warn('Error procesando vivienda:', err);
          // Continuar con el registro aunque falle la asociación de vivienda
        }
      }

      // Notificar a los administradores sobre el nuevo registro
      await notificarRegistroUsuario(usuario.id, nombre, email, null);

      // Crear objeto User para iniciar sesión automáticamente
      const userData = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        escuela: null,
        numeroApartamento: undefined,
        rol: usuario.rol || null,
        Estado: usuario.Estado || 'Activo'
      };

      // Guardar usuario en localStorage para iniciar sesión automáticamente
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Mostrar mensaje de éxito
      alert('¡Registro exitoso! Has sido registrado en el sistema. Un administrador revisará tu solicitud y te notificará cuando sea aprobada o rechazada.');

      // Redirigir a la página principal
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (err: any) {
      console.error('Error al registrar:', err);
      
      // Manejar errores específicos de la base de datos
      let errorMessage = 'Error al registrar usuario. Intenta nuevamente.';
      
      if (err.message) {
        // Error de cédula duplicada
        if (err.message.includes('usuarios_cedula_key') || err.message.includes('cedula')) {
          errorMessage = 'Esta cédula ya está registrada en el sistema. Por favor, verifica el número o contacta al administrador.';
          setErrors(prev => ({ ...prev, cedula: 'Esta cédula ya está registrada' }));
        }
        // Error de correo duplicado
        else if (err.message.includes('usuarios_correo_key') || err.message.includes('correo') || err.message.includes('email')) {
          errorMessage = 'Este correo electrónico ya está registrado. Por favor, usa otro correo o inicia sesión.';
          setErrors(prev => ({ ...prev, email: 'Este correo ya está registrado' }));
        }
        // Otros errores
        else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-8 px-4">
      {/* Fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white z-[-1]" />
      
      <form
        onSubmit={handleRegister}
        className="relative z-10 bg-white p-6 sm:p-8 rounded-lg shadow-lg shadow-gray-400 w-full max-w-2xl flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Registro de Usuario</h2>
        <p className="text-sm text-gray-600 text-center mb-4">
          Completa el formulario para registrarte en el sistema
        </p>
        
        {/* Información básica */}
        <div className="border-b pb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Información Personal</h3>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Nombre completo *"
                value={nombre}
                onChange={e => {
                  setNombre(e.target.value);
                  handleInputChange('nombre');
                }}
                className={`border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.nombre ? 'border-red-500' : ''}`}
                required
              />
              {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
            </div>

            <div>
              <input
                type="email"
                placeholder="Correo electrónico *"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  handleInputChange('email');
                }}
                className={`border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={telefono}
                  onChange={e => {
                    setTelefono(e.target.value);
                    handleInputChange('telefono');
                  }}
                  className={`border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.telefono ? 'border-red-500' : ''}`}
                />
                {errors.telefono && <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Cédula / Identificación"
                  value={cedula}
                  onChange={e => {
                    setCedula(e.target.value.replace(/\D/g, ''));
                    handleInputChange('cedula');
                  }}
                  className={`border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.cedula ? 'border-red-500' : ''}`}
                />
                {errors.cedula && <p className="text-red-500 text-sm mt-1">{errors.cedula}</p>}
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Número de Casa *"
                value={numeroCasa}
                onChange={e => {
                  setNumeroCasa(e.target.value);
                  handleInputChange('numeroCasa');
                }}
                className={`border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.numeroCasa ? 'border-red-500' : ''}`}
                required
              />
              {errors.numeroCasa && <p className="text-red-500 text-sm mt-1">{errors.numeroCasa}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Este número se asociará con tu teléfono y se usará para verificar pagos
              </p>
            </div>
          </div>
        </div>

        {/* Condominio (opcional) */}
        <div className="border-b pb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Condominio (Opcional)</h3>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Selecciona un condominio
            </label>
            <select
              value={condominioId || ''}
              onChange={e => {
                const value = e.target.value ? parseInt(e.target.value) : null;
                setCondominioId(value);
                handleInputChange('condominioId');
              }}
              className="border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingCondominios}
            >
              <option value="">Selecciona un condominio (opcional)</option>
              {loadingCondominios ? (
                <option>Cargando...</option>
              ) : (
                condominios.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Solo se muestran los condominios agregados por el administrador
            </p>
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Contraseña</h3>
          
          <div className="space-y-4">
            <PasswordInput
              value={password}
              onChange={(value) => {
                setPassword(value);
                handleInputChange('password');
              }}
              placeholder="Contraseña *"
              error={errors.password}
              required
            />

            <PasswordInput
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                handleInputChange('confirmPassword');
              }}
              placeholder="Confirmar contraseña *"
              error={errors.confirmPassword}
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-medium ${
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
