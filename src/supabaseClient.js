alert("Supabase test triggered");

// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// These must match the keys you set in Netlify
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase environment variables. " +
      "Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Simple helper you can call to verify the connection.
 * This assumes you will create a table called `calendar_entries`
 * in Supabase. For now it just tries a harmless SELECT.
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("calendar_entries")
      .select("*")
      .limit(1);

    if (error) {
      console.error("Supabase test error:", error.message);
    } else {
      console.log("Supabase test OK. Example row:", data?.[0] || null);
    }
  } catch (err) {
    console.error("Supabase test threw:", err);
  }
}
