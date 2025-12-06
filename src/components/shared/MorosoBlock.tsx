import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { User } from '../../services/authService';

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

  useEffect(() => {
    const fetchOrdenesMorosas = async () => {
      try {
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
            Cuenta Bloqueada
          </h1>
          <p className="text-gray-600">
            Tu cuenta ha sido bloqueada debido a libros sin devolver
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

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">¿Cómo desbloquear mi cuenta?</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>1. <strong>Devuelve los libros</strong> que tienes prestados en la biblioteca</p>
            <p>2. <strong>Contacta al administrador</strong> para que verifique la devolución</p>
            <p>3. <strong>Espera la confirmación</strong> del administrador para desbloquear tu cuenta</p>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Contacto del Administrador</h3>
          <div className="space-y-1 text-sm text-yellow-800">
            <p><strong>Horario de atención:</strong> Lunes a Viernes, 8:00 AM - 6:00 PM</p>
            <p><strong>Ubicación:</strong> Biblioteca Central, Piso 1</p>
            <p><strong>Teléfono:</strong> (123) 456-7890</p>
            <p><strong>Email:</strong> admin@biblioteca.edu</p>
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