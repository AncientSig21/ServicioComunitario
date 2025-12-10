import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { User } from '../../services/authService';
import { notificationService } from '../../services/notificationService';

interface MorosoBlockProps {
  user: User;
}

interface OrdenMorosa {
  id: number;
  libro_id: number | null;
  fecha_limite_devolucion: string | null;
  Libros: {
    titulo: string;
  } | null;
}

const MorosoBlock: React.FC<MorosoBlockProps> = ({ user }) => {
  const [ordenesMorosas, setOrdenesMorosas] = useState<OrdenMorosa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [monto, setMonto] = useState('');
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrdenesMorosas = async () => {
      try {
        const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
        const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;
        
        if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
          // Modo simulado - no hay órdenes morosas en este contexto
          setOrdenesMorosas([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('ordenes')
          .select(`
            id,
            libro_id,
            fecha_limite_devolucion,
            Libros(titulo)
          `)
          .eq('usuario_id', user.id)
          .eq('estado', 'Moroso');

        if (error) {
          console.error('Error al obtener órdenes morosas:', error);
        } else {
          setOrdenesMorosas(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenesMorosas();
  }, [user.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando estado de cuenta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        {/* Header con ícono de advertencia */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cuenta Bloqueada - Estado Moroso
          </h1>
          <p className="text-gray-600">
            Tu cuenta ha sido bloqueada debido a pagos pendientes
          </p>
        </div>

        {/* Información del usuario */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Información del Usuario</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Nombre:</span> {user.nombre}</p>
            <p><span className="font-medium">Correo:</span> {user.correo}</p>
            <p><span className="font-medium">Estado:</span> <span className="text-red-600 font-semibold">Moroso</span></p>
          </div>
        </div>

        {/* Libros pendientes de devolución */}
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Libros Pendientes de Devolución</h2>
          {ordenesMorosas.length === 0 ? (
            <p className="text-gray-500 italic">No se encontraron libros pendientes</p>
          ) : (
            <div className="space-y-3">
              {ordenesMorosas.map((orden) => (
                <div key={orden.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {orden.Libros?.titulo || 'Libro no encontrado'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Fecha límite de devolución: {orden.fecha_limite_devolucion ? new Date(orden.fecha_limite_devolucion).toLocaleDateString() : 'No especificada'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Vencido
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario de pago */}
        {!showPaymentForm ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">¿Realizaste el pago?</h3>
            <div className="space-y-2 text-sm text-blue-800 mb-4">
              <p>Si ya realizaste el pago de tu morosidad, puedes enviar una notificación al administrador con los detalles de tu pago.</p>
            </div>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Enviar Notificación de Pago
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-4">Notificación de Pago</h3>
            
            {submitSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">✓ Notificación enviada exitosamente</p>
                <p className="text-green-700 text-sm mt-2">El administrador revisará tu solicitud y te notificará cuando se resuelva.</p>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSubmitSuccess(false);
                    setMonto('');
                    setComprobanteUrl('');
                    setDescripcion('');
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Enviar otra notificación
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmitting(true);
                  setSubmitError(null);

                  try {
                    await notificationService.createNotification({
                      tipo: 'pago',
                      titulo: `Notificación de Pago - ${user.nombre}`,
                      mensaje: `El residente ${user.nombre} (${user.numeroApartamento || 'N/A'}, ${user.condominio || 'N/A'}) ha enviado una notificación de pago.`,
                      usuario_id: user.id,
                      relacion_id: user.id,
                      relacion_tipo: 'pago_morosidad',
                      estado: 'pendiente',
                      leida: false,
                      accion_requerida: true,
                      datos_adicionales: JSON.stringify({
                        monto: monto,
                        comprobante_url: comprobanteUrl,
                        descripcion: descripcion,
                        usuario_nombre: user.nombre,
                        usuario_correo: user.correo,
                        usuario_apartamento: user.numeroApartamento,
                        usuario_condominio: user.condominio,
                      }),
                    });

                    setSubmitSuccess(true);
                  } catch (error: any) {
                    setSubmitError(error.message || 'Error al enviar la notificación');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto pagado (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Ej: 150.00"
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL del comprobante (opcional)
                  </label>
                  <input
                    type="url"
                    value={comprobanteUrl}
                    onChange={(e) => setComprobanteUrl(e.target.value)}
                    placeholder="https://ejemplo.com/comprobante.jpg"
                    className="w-full border p-2 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">Puedes subir el comprobante a un servicio de almacenamiento y pegar el enlace aquí</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción del pago
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe el pago realizado, método de pago, fecha, etc."
                    rows={3}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{submitError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Notificación'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setMonto('');
                      setComprobanteUrl('');
                      setDescripcion('');
                      setSubmitError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">¿Cómo desbloquear mi cuenta?</h3>
          <div className="space-y-2 text-sm text-yellow-800">
            <p>1. <strong>Realiza el pago</strong> de tu morosidad pendiente</p>
            <p>2. <strong>Envía una notificación</strong> al administrador con los detalles del pago</p>
            <p>3. <strong>Espera la confirmación</strong> del administrador para desbloquear tu cuenta</p>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Contacto del Administrador</h3>
          <div className="space-y-1 text-sm text-yellow-800">
            <p><strong>Horario de atención:</strong> Lunes a Viernes, 8:00 AM - 6:00 PM</p>
            <p><strong>Ubicación:</strong> Oficina de Administración del Condominio</p>
            <p><strong>Teléfono:</strong> (123) 456-7890</p>
            <p><strong>Email:</strong> admin@condominio.com</p>
          </div>
        </div>

        {/* Botón de cerrar sesión */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default MorosoBlock; 