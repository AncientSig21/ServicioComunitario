import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";

// TUS CREDENCIALES REALES - CON NOMBRES CORRECTOS
const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE || "https://vsyunsvlrvbbvgiwcxnt.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeXVuc3ZscnZiYnZnaXdjeG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjUxNzEsImV4cCI6MjA4MTkwMTE3MX0.bACD3Ls_hBHx1bbfkr1tGXWqHIrLTCj0CB0vDOU3oyE";

// ✅ CLIENTE SUPABASE 100% FUNCIONAL - NUNCA NULL
export const supabase = createClient<Database>(
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

// Verificación de conexión (opcional, para debugging)
if (typeof window !== 'undefined') {
  console.log("🚀 Supabase Client INICIALIZADO:", {
    project: "vsyunsvlrvbbvgiwcxnt",
    url: supabaseUrl.replace('https://', '').split('.')[0],
    hasAuth: !!supabase.auth,
    timestamp: new Date().toISOString()
  });

  // Test simple de conexión CON CONTEO DE USUARIOS
  Promise.resolve(
    supabase.from('usuarios').select('count', { count: 'exact', head: true })
  )
    .then(({ count, error }) => {
      if (error) {
        console.warn("⚠️ Supabase: Error en conexión inicial", error.message);
      } else {
        // Mostrar el conteo de usuarios en el mensaje
        const mensajeConConteo = count !== null && count !== undefined 
          ? `Conexión exitosa a la base de datos (${count} usuarios registrados)`
          : "Conexión exitosa a la base de datos";
        
        console.log(`✅ Supabase: ${mensajeConConteo}`);
      }
    })
    .catch(err => {
      console.warn("⚠️ Supabase: No se pudo conectar", err.message);
    });
}