// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables are missing. " +
      "Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and .env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
