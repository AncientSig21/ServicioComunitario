import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";
import { createMockSupabaseClient, enableDemoMode } from "./mockSupabaseClient";

// ==================== CONFIGURACIÓN ====================
const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE || "https://vsyunsvlrvbbvgiwcxnt.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeXVuc3ZscnZiYnZnaXdjeG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjUxNzEsImV4cCI6MjA4MTkwMTE3MX0.bACD3Ls_hBHx1bbfkr1tGXWqHIrLTCj0CB0vDOU3oyE";

// ==================== DETECCIÓN DE MODO ====================
const DEMO_MODE_KEY = 'DEMO_MODE_ACTIVE';

// Función para verificar si debe usar modo demo
const shouldUseDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // 1. Verificar flag manual activado
  if (localStorage.getItem(DEMO_MODE_KEY) === 'true') {
    return true;
  }
  
  // 2. Verificar si hay conexión a internet
  if (!navigator.onLine) {
    console.log('📴 Sin conexión a internet - Activando modo demo automáticamente');
    return true;
  }
  
  return false;
};

// ==================== CREAR CLIENTE ====================
const createSupabaseClientWithFallback = (): any => {
  // Si estamos en modo demo, usar mock client
  if (shouldUseDemoMode()) {
    console.log('🎮 MODO DEMO/OFFLINE ACTIVO');
    console.log('📊 Usando base de datos local para la presentación');
    console.log('💡 Para desactivar: demoMode.disable() en la consola');
    return createMockSupabaseClient();
  }

  // Crear cliente real de Supabase
  const realClient = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce'
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  );

  return realClient;
};

// ==================== EXPORTAR CLIENTE ====================
export const supabase = createSupabaseClientWithFallback();

// Variable para saber si estamos en modo demo
export const isInDemoMode = shouldUseDemoMode();

// ==================== INICIALIZACIÓN Y VERIFICACIÓN ====================
if (typeof window !== 'undefined') {
  if (isInDemoMode) {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🎮 SISTEMA EN MODO DEMO/PRESENTACIÓN");
    console.log("═══════════════════════════════════════════════════════");
    console.log("📋 Usuarios disponibles:");
    console.log("   • admin@condominio.com / admin123 (Administrador)");
    console.log("   • maria@condominio.com / usuario123 (Usuario)");
    console.log("   • carlos@condominio.com / usuario123 (Usuario)");
    console.log("   • ana@condominio.com / usuario123 (Usuario Moroso)");
    console.log("   • pedro@condominio.com / usuario123 (Usuario)");
    console.log("═══════════════════════════════════════════════════════");
    console.log("💡 Comandos útiles en consola:");
    console.log("   • demoMode.disable() - Desactivar modo demo");
    console.log("   • demoMode.resetData() - Reiniciar datos demo");
    console.log("   • demoMode.getData() - Ver base de datos actual");
    console.log("═══════════════════════════════════════════════════════");
  } else {
    console.log("🚀 Supabase Client INICIALIZADO:", {
      project: "vsyunsvlrvbbvgiwcxnt",
      url: supabaseUrl.replace('https://', '').split('.')[0],
      hasAuth: !!supabase.auth,
      timestamp: new Date().toISOString()
    });

    // Test de conexión - si falla, activar modo demo automáticamente
    Promise.resolve(
      supabase.from('usuarios').select('count', { count: 'exact', head: true })
    )
      .then(({ count, error }: any) => {
        if (error) {
          console.warn("⚠️ Supabase: Error en conexión - Activando modo demo", error.message);
          enableDemoMode();
        } else {
          const mensajeConConteo = count !== null && count !== undefined 
            ? `Conexión exitosa a la base de datos (${count} usuarios registrados)`
            : "Conexión exitosa a la base de datos";
          console.log(`✅ Supabase: ${mensajeConConteo}`);
        }
      })
      .catch((err: any) => {
        console.warn("⚠️ Supabase: No se pudo conectar - Activando modo demo", err.message);
        enableDemoMode();
      });
  }

  // Listener para detectar cuando se pierde la conexión
  window.addEventListener('offline', () => {
    console.log('📴 Conexión perdida - El sistema seguirá funcionando con datos locales');
  });

  window.addEventListener('online', () => {
    console.log('📶 Conexión restaurada');
  });
}