import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validation } from '../utils/validation';
import { PasswordInput } from '../components/shared/PasswordInput';
import { registerResidente, fetchCondominios, fetchViviendas, notificarRegistroUsuario } from '../services/bookService';
import { supabase } from '../supabase/client';
import { hashAnswer } from '../utils/securityUtils';

// Roles válidos para registro público (admin no está disponible)
const rolesValidos = [
  { value: 'propietario', label: 'Propietario' },
  { value: 'residente', label: 'Residente' },
  { value: 'conserje', label: 'Conserje' },
  { value: 'invitado', label: 'Invitado' },
];

// Roles en vivienda válidos
const rolesEnVivienda = [
  { value: 'propietario', label: 'Propietario' },
  { value: 'inquilino', label: 'Inquilino' },
  { value: 'arrendatario', label: 'Arrendatario' },
  { value: 'familiar', label: 'Familiar' },
];

// Preguntas de seguridad predefinidas
const preguntasPredefinidas = [
  { id: 'mascota', texto: '¿Cuál es el nombre de tu primera mascota?' },
  { id: 'ciudad', texto: '¿En qué ciudad naciste?' },
  { id: 'colegio', texto: '¿Cuál es el nombre de tu colegio de primaria?' },
  { id: 'comida', texto: '¿Cuál es tu comida favorita?' },
  { id: 'color', texto: '¿Cuál es tu color favorito?' },
  { id: 'pelicula', texto: '¿Cuál es tu película favorita?' },
  { id: 'deporte', texto: '¿Cuál es tu deporte favorito?' },
  { id: 'personalizada', texto: 'Pregunta personalizada' },
];

export const RegisterPage = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rol, setRol] = useState<string>('propietario');
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [viviendaId, setViviendaId] = useState<number | null>(null);
  const [numeroApartamento, setNumeroApartamento] = useState('');
  const [crearNuevaVivienda, setCrearNuevaVivienda] = useState(false);
  const [rolEnVivienda, setRolEnVivienda] = useState<string>('propietario');
  
  const [condominios, setCondominios] = useState<any[]>([]);
  const [viviendas, setViviendas] = useState<any[]>([]);
  const [loadingCondominios, setLoadingCondominios] = useState(false);
  const [loadingViviendas, setLoadingViviendas] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para preguntas de seguridad
  const [preguntasSeguridad, setPreguntasSeguridad] = useState([
    { preguntaId: '', preguntaPersonalizada: '', respuesta: '' },
    { preguntaId: '', preguntaPersonalizada: '', respuesta: '' },
  ]);
  
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

  // Cargar viviendas cuando se selecciona un condominio
  useEffect(() => {
    if (condominioId) {
      const cargarViviendas = async () => {
        try {
          setLoadingViviendas(true);
          const data = await fetchViviendas(condominioId);
          setViviendas(data);
        } catch (err) {
          console.error('Error al cargar viviendas:', err);
        } finally {
          setLoadingViviendas(false);
        }
      };
      cargarViviendas();
    } else {
      setViviendas([]);
      setViviendaId(null);
    }
  }, [condominioId]);

  // Limpiar selección de vivienda cuando se cambia el condominio
  useEffect(() => {
    setViviendaId(null);
    setNumeroApartamento('');
    setCrearNuevaVivienda(false);
  }, [condominioId]);

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

    // Validar rol
    if (!rol || !rolesValidos.find(r => r.value === rol)) {
      newErrors.rol = 'Selecciona un rol válido';
    }

    // Si se selecciona condominio, validar vivienda
    if (condominioId) {
      if (crearNuevaVivienda) {
        if (!numeroApartamento.trim()) {
          newErrors.numeroApartamento = 'El número de apartamento es requerido';
        }
      } else {
        if (!viviendaId) {
          newErrors.viviendaId = 'Selecciona una vivienda o crea una nueva';
        }
      }

      // Validar rol en vivienda
      if (!rolEnVivienda || !rolesEnVivienda.find(r => r.value === rolEnVivienda)) {
        newErrors.rolEnVivienda = 'Selecciona un rol en vivienda válido';
      }
    }

    // Validar contraseña
    const passwordError = validation.getPasswordError(password);
    if (passwordError) newErrors.password = passwordError;

    // Validar confirmar contraseña
    const confirmPasswordError = validation.getConfirmPasswordError(password, confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    // Validar preguntas de seguridad
    let preguntasValidas = 0;
    preguntasSeguridad.forEach((pregunta, index) => {
      if (!pregunta.preguntaId) {
        newErrors[`pregunta${index}`] = 'Debes seleccionar una pregunta';
      } else if (pregunta.preguntaId === 'personalizada' && !pregunta.preguntaPersonalizada.trim()) {
        newErrors[`pregunta${index}`] = 'Debes escribir tu pregunta personalizada';
      } else if (!pregunta.respuesta.trim()) {
        newErrors[`respuesta${index}`] = 'Debes proporcionar una respuesta';
      } else {
        preguntasValidas++;
      }
    });

    if (preguntasValidas < 2) {
      newErrors.preguntas = 'Debes establecer al menos 2 preguntas de seguridad';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const obtenerOCrearVivienda = async (numeroApartamento: string, condominio_id: number): Promise<number> => {
    try {
      // Buscar vivienda existente
      const { data: viviendaExistente, error: searchError } = await supabase
        .from('viviendas')
        .select('id')
        .eq('numero_apartamento', numeroApartamento)
        .eq('condominio_id', condominio_id)
        .eq('activo', true)
        .maybeSingle();

      if (!searchError && viviendaExistente) {
        return viviendaExistente.id;
      }

      // Crear nueva vivienda
      const { data: nuevaVivienda, error: createError } = await supabase
        .from('viviendas')
        .insert([{
          condominio_id,
          numero_apartamento: numeroApartamento,
          activo: true
        }])
        .select('id')
        .single();

      if (createError) throw createError;
      return nuevaVivienda.id;
    } catch (error: any) {
      console.error('Error al obtener o crear vivienda:', error);
      throw error;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // auth_uid se generará automáticamente en la base de datos
      let viviendaIdFinal: number | null = null;

      // Si hay condominio, obtener o crear vivienda
      if (condominioId) {
        if (crearNuevaVivienda) {
          if (!numeroApartamento.trim()) {
            throw new Error('El número de apartamento es requerido');
          }
          viviendaIdFinal = await obtenerOCrearVivienda(numeroApartamento.trim(), condominioId);
        } else if (viviendaId) {
          viviendaIdFinal = viviendaId;
        } else {
          throw new Error('Debes seleccionar una vivienda o crear una nueva');
        }
      }

        // Preparar preguntas de seguridad
        const preguntasSeguridadData = await prepararPreguntasSeguridad();

        // Si no hay vivienda, registrar como usuario simple
      if (!viviendaIdFinal) {
        // Registrar usuario simple (sin vivienda) - PENDIENTE DE APROBACIÓN
        // IMPORTANTE: Nuevos usuarios NO deben tener pagos automáticos
        // El estado se establece como 'Activo' y los pagos deben ser creados solo por administradores
        // El rol se establecerá como null para indicar que está pendiente
        const { data: usuario, error: userError } = await supabase
          .from('usuarios')
          .insert([{
            nombre,
            correo: email,
            telefono: telefono || null,
            cedula: cedula || null,
            rol: null, // Pendiente de aprobación del administrador
            contraseña: password,
            estado: 'Activo', // Estado inicial: Activo (sin deudas, sin pagos pendientes)
            // auth_uid se genera automáticamente en la BD
            condominio_id: condominioId,
            preguntas_seguridad: preguntasSeguridadData
          }])
          .select()
          .single();

        if (userError) throw userError;

        // Notificar a los administradores sobre el nuevo registro
        await notificarRegistroUsuario(usuario.id, nombre, email, rol);

        // Mostrar mensaje de que está pendiente de aprobación
        alert('Tu registro ha sido enviado. Un administrador revisará tu solicitud y te notificará cuando sea aprobada.');

        // Redirigir a la página de login
        setTimeout(() => {
          navigate('/login');
        }, 100);
      } else {
        // Registrar residente completo (con vivienda) - PENDIENTE DE APROBACIÓN
        // El rol se establecerá como null para indicar que está pendiente
        const usuario = await registerResidente({
          nombre,
          correo: email,
          telefono: telefono || undefined,
          cedula: cedula || undefined,
          rol: null, // Pendiente de aprobación - se establecerá después
          contraseña: password,
          // auth_uid se genera automáticamente en la BD
          condominio_id: condominioId,
          vivienda_id: viviendaIdFinal,
          rol_en_vivienda: rolEnVivienda,
          preguntas_seguridad: preguntasSeguridadData
        });

        // Notificar a los administradores sobre el nuevo registro
        await notificarRegistroUsuario(usuario.id, nombre, email, rol);

        // Mostrar mensaje de que está pendiente de aprobación
        alert('Tu registro ha sido enviado. Un administrador revisará tu solicitud y te notificará cuando sea aprobada.');

        // Redirigir a la página de login
        setTimeout(() => {
          navigate('/login');
        }, 100);
      }
    } catch (err: any) {
      console.error('Error al registrar:', err);
      setError(err.message || 'Error al registrar usuario. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Función para preparar las preguntas de seguridad para guardar
  const prepararPreguntasSeguridad = async () => {
    const preguntas = [];
    
    for (const pregunta of preguntasSeguridad) {
      if (!pregunta.preguntaId && !pregunta.preguntaPersonalizada) continue;
      if (!pregunta.respuesta.trim()) continue;

      const preguntaTexto = pregunta.preguntaId === 'personalizada' 
        ? pregunta.preguntaPersonalizada 
        : preguntasPredefinidas.find(p => p.id === pregunta.preguntaId)?.texto || pregunta.preguntaId;
      
      const respuestaHash = await hashAnswer(pregunta.respuesta);
      
      preguntas.push({
        pregunta: preguntaTexto,
        respuesta_hash: respuestaHash,
        tipo: pregunta.preguntaId === 'personalizada' ? 'personalizada' : 'predefinida',
        created_at: new Date().toISOString()
      });
    }

    return preguntas.length > 0 ? { preguntas } : null;
  };

  // Manejar cambio en preguntas de seguridad
  const handlePreguntaChange = (index: number, field: string, value: string) => {
    const nuevasPreguntas = [...preguntasSeguridad];
    nuevasPreguntas[index] = {
      ...nuevasPreguntas[index],
      [field]: value,
      // Si cambia el tipo de pregunta, limpiar la personalizada si no es personalizada
      ...(field === 'preguntaId' && value !== 'personalizada' 
        ? { preguntaPersonalizada: '' } 
        : {})
    };
    setPreguntasSeguridad(nuevasPreguntas);
    
    // Limpiar errores
    if (errors[`pregunta${index}`] || errors[`respuesta${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`pregunta${index}`];
        delete newErrors[`respuesta${index}`];
        return newErrors;
      });
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
                className={`border p-2 rounded w-full ${errors.nombre ? 'border-red-500' : ''}`}
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
                className={`border p-2 rounded w-full ${errors.email ? 'border-red-500' : ''}`}
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
                  className={`border p-2 rounded w-full ${errors.telefono ? 'border-red-500' : ''}`}
                />
                {errors.telefono && <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Cédula"
                  value={cedula}
                  onChange={e => {
                    setCedula(e.target.value.replace(/\D/g, ''));
                    handleInputChange('cedula');
                  }}
                  className={`border p-2 rounded w-full ${errors.cedula ? 'border-red-500' : ''}`}
                />
                {errors.cedula && <p className="text-red-500 text-sm mt-1">{errors.cedula}</p>}
              </div>
            </div>

            <div>
              <select
                value={rol}
                onChange={e => {
                  setRol(e.target.value);
                  handleInputChange('rol');
                }}
                className={`border p-2 rounded w-full ${errors.rol ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Selecciona un rol *</option>
                {rolesValidos.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.rol && <p className="text-red-500 text-sm mt-1">{errors.rol}</p>}
            </div>
          </div>
        </div>

        {/* Información de residencia (opcional) */}
        <div className="border-b pb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Información de Residencia (Opcional)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Condominio</label>
              <select
                value={condominioId || ''}
                onChange={e => {
                  const value = e.target.value ? parseInt(e.target.value) : null;
                  setCondominioId(value);
                  handleInputChange('condominioId');
                }}
                className="border p-2 rounded w-full"
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
            </div>

            {condominioId && (
              <>
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={crearNuevaVivienda}
                      onChange={e => {
                        setCrearNuevaVivienda(e.target.checked);
                        if (e.target.checked) {
                          setViviendaId(null);
                        }
                        handleInputChange('viviendaId');
                      }}
                    />
                    <span className="text-sm text-gray-700">Crear nueva vivienda</span>
                  </label>
                </div>

                {crearNuevaVivienda ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Número de apartamento/casa *"
                      value={numeroApartamento}
                      onChange={e => {
                        setNumeroApartamento(e.target.value);
                        handleInputChange('numeroApartamento');
                      }}
                      className={`border p-2 rounded w-full ${errors.numeroApartamento ? 'border-red-500' : ''}`}
                      required
                    />
                    {errors.numeroApartamento && <p className="text-red-500 text-sm mt-1">{errors.numeroApartamento}</p>}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vivienda</label>
                    <select
                      value={viviendaId || ''}
                      onChange={e => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setViviendaId(value);
                        handleInputChange('viviendaId');
                      }}
                      className={`border p-2 rounded w-full ${errors.viviendaId ? 'border-red-500' : ''}`}
                      disabled={loadingViviendas}
                    >
                      <option value="">Selecciona una vivienda</option>
                      {loadingViviendas ? (
                        <option>Cargando...</option>
                      ) : (
                        viviendas.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.numero_apartamento} {v.piso ? `- Piso ${v.piso}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    {errors.viviendaId && <p className="text-red-500 text-sm mt-1">{errors.viviendaId}</p>}
                  </div>
                )}

                {(crearNuevaVivienda || viviendaId) && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rol en vivienda *</label>
                    <select
                      value={rolEnVivienda}
                      onChange={e => {
                        setRolEnVivienda(e.target.value);
                        handleInputChange('rolEnVivienda');
                      }}
                      className={`border p-2 rounded w-full ${errors.rolEnVivienda ? 'border-red-500' : ''}`}
                      required
                    >
                      <option value="">Selecciona un rol</option>
                      {rolesEnVivienda.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {errors.rolEnVivienda && <p className="text-red-500 text-sm mt-1">{errors.rolEnVivienda}</p>}
                  </div>
                )}
              </>
            )}
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

        {/* Preguntas de Seguridad */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Preguntas de Seguridad</h3>
          <p className="text-sm text-gray-600 mb-4">
            Establece 2 preguntas de seguridad para poder recuperar tu contraseña en caso de olvidarla.
          </p>
          
          <div className="space-y-4">
            {preguntasSeguridad.map((pregunta, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pregunta {index + 1} *
                  </label>
                  <select
                    value={pregunta.preguntaId}
                    onChange={(e) => handlePreguntaChange(index, 'preguntaId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecciona una pregunta</option>
                    {preguntasPredefinidas.map(p => (
                      <option key={p.id} value={p.id}>{p.texto}</option>
                    ))}
                  </select>
                  {errors[`pregunta${index}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`pregunta${index}`]}</p>
                  )}
                </div>

                {pregunta.preguntaId === 'personalizada' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Escribe tu pregunta personalizada *
                    </label>
                    <input
                      type="text"
                      value={pregunta.preguntaPersonalizada}
                      onChange={(e) => handlePreguntaChange(index, 'preguntaPersonalizada', e.target.value)}
                      placeholder="Ej: ¿Cuál es el nombre de tu mejor amigo de la infancia?"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={pregunta.preguntaId === 'personalizada'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Respuesta *
                  </label>
                  <input
                    type="text"
                    value={pregunta.respuesta}
                    onChange={(e) => handlePreguntaChange(index, 'respuesta', e.target.value)}
                    placeholder="Tu respuesta"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {errors[`respuesta${index}`] && (
                    <p className="text-red-500 text-sm mt-1">{errors[`respuesta${index}`]}</p>
                  )}
                </div>
              </div>
            ))}
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
