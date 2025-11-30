// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// These come from your Vite env vars (.env.local and Netlify site settings)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Check your .env.local and Netlify environment variables."
  );
}

// Main Supabase client used throughout the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Simple helper to verify Supabase connectivity from the browser.
 * This is what App.jsx imports and calls in a useEffect.
 * It just does a tiny SELECT; if the table doesn't exist yet you'll
 * see an error in the console, but the site will still build and run.
 */
export async function testSupabaseConnection() {
  try {
    // You can point this at any table; if it's not there yet,
    // you'll just get a console error (no build failure).
    const { data, error } = await supabase
      .from("calendar_entries") // or "player_pins" if you prefer
      .select("id")
      .limit(1);

    if (error) {
      console.error("[Supabase] Connection test error:", error.message || error);
    } else {
      console.log(
        "[Supabase] Connection OK. Sample rows:",
        data && data.length ? data : "(no rows yet)"
      );
    }
  } catch (err) {
    console.error("[Supabase] Connection test threw:", err);
  }
}
