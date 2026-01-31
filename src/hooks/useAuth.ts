import { useState, useEffect } from 'react';
import { authService, User, LoginData, RegisterData } from '../services/authService';
import { supabase } from '../supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Función para actualizar el usuario desde localStorage
  const updateUserFromStorage = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  // Verificar si Supabase está configurado e inicializar usuario desde localStorage
  useEffect(() => {
    try {
      const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
      const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;

      // Siempre intentamos leer el usuario desde localStorage para modo simulado
      updateUserFromStorage();

      if (!supabaseKey || !supabaseUrl || supabaseKey === 'undefined' || supabaseUrl === 'undefined') {
        console.warn('Supabase no está configurado o las variables no son válidas. Usando modo simulado.');
        setIsConfigured(false);
        setLoading(false);
        return;
      }

      setIsConfigured(true);
      setLoading(false);
    } catch (err) {
      console.warn('Error al inicializar autenticación:', err);
      setIsConfigured(false);
      setLoading(false);
    }
  }, []);

  // Refrescar estado del usuario desde la BD después del primer paint (no bloquea carga inicial)
  useEffect(() => {
    if (!user?.id || !isConfigured) return;
    const id = setTimeout(() => refreshUserStatus(), 0);
    return () => clearTimeout(id);
  }, [user?.id, isConfigured]);

  // Listener para cambios en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      updateUserFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar cambios en el mismo tab
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      if (key === 'user') {
        updateUserFromStorage();
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  // Función de login
  const login = async (loginData: LoginData) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authService.loginUser(loginData);

      if (error) {
        setError(error.message || 'Credenciales incorrectas');
        return { success: false };
      }

      if (data) {
        authService.setCurrentUser(data);
        setUser(data);
        return { success: true, user: data };
      } else {
        setError('Usuario no encontrado');
        return { success: false };
      }
    } catch (err) {
      setError('Error al iniciar sesión');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Función de registro
  const register = async (registerData: RegisterData) => {
    setLoading(true);
    setError(null);

    try {
      // Verificar si el email ya existe
      const { exists } = await authService.checkEmailExists(registerData.correo);
      
      if (exists) {
        setError('El email ya está registrado');
        return { success: false };
      }

      // Registrar el usuario
      const { data, error } = await authService.registerUser(registerData);

      if (error) {
        setError(error.message || 'Error al registrar usuario');
        return { success: false };
      }

      if (data) {
        // Guardar el usuario en localStorage después del registro exitoso
        authService.setCurrentUser(data);
        setUser(data);
        return { success: true, user: data };
      } else {
        setError('Error al crear la cuenta');
        return { success: false };
      }
    } catch (err) {
      setError('Error al registrar usuario');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    // Siempre limpiar el usuario en localStorage, incluso en modo simulado
    authService.logout();
    setUser(null);
    setError(null);

    // Recargar la página después de cerrar sesión para reiniciar el estado global
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Limpiar error
  const clearError = () => {
    setError(null);
  };

  // Función para verificar si el usuario está moroso
  const isUserMoroso = () => {
    return (user?.Estado ?? user?.estado) === 'Moroso';
  };

  // Función para actualizar el estado del usuario desde la base de datos
  const refreshUserStatus = async () => {
    if (!user || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, condominio_id, Estado')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const newEstado = data.Estado ?? user.estado ?? 'Activo';
        const newRol = data.rol || user.rol;
        const newCondominioId = data.condominio_id ?? user.condominio_id;
        // Solo actualizar estado si algo relevante cambió (evita re-renders en cascada)
        const estadoCambio = (user.estado ?? (user as any).Estado) !== newEstado;
        const rolCambio = (user.rol ?? (user as any).rol) !== newRol;
        const condominioCambio = (user.condominio_id ?? (user as any).condominio_id) !== newCondominioId;
        if (!estadoCambio && !rolCambio && !condominioCambio && user.nombre === data.nombre) {
          return;
        }
        const updatedUser = {
          ...user,
          id: data.id,
          nombre: data.nombre,
          correo: data.correo || user.correo,
          rol: newRol,
          condominio_id: newCondominioId,
          estado: newEstado,
          codigo_recuperacion: data.codigo_recuperacion ?? user.codigo_recuperacion ?? null
        };
        authService.setCurrentUser(updatedUser);
        setUser(updatedUser);
      }
    } catch (err) {
      console.error('Error al actualizar información del usuario:', err);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!user,
    isConfigured,
    isUserMoroso,
    refreshUserStatus,
  };
}; 