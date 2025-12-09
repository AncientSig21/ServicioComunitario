import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";

const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY;
const supabaseUrl = import.meta.env.VITE_PROJECT_URL_SUPABASE;

// Solo crear el cliente si las variables están correctamente definidas
export const supabase =
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== "undefined" &&
  supabaseKey !== "undefined"
    ? createClient<Database>(supabaseUrl, supabaseKey)
    : null;