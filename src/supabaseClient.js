import { createClient } from "@supabase/supabase-js";

// --------------------------------------------------
// Setup Supabase client
// --------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --------------------------------------------------
// TEST CONNECTION
// --------------------------------------------------
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("calendar_entries").select("*").limit(1);
    if (error) {
      console.error("[Supabase] Test connection FAILED:", error);
    } else {
      console.log("[Supabase] Test connection OK:", data);
    }
  } catch (err) {
    console.error("[Supabase] Test connection crashed:", err);
  }
}

// --------------------------------------------------
// LOAD ENTRIES
// --------------------------------------------------
export async function refreshEntriesFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("calendar_entries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Supabase] Error loading entries:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[Supabase] refreshEntriesFromSupabase crashed:", err);
    return [];
  }
}

// --------------------------------------------------
// LOAD PLAYER PIN OVERRIDES
// --------------------------------------------------
export async function loadPinsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("player_pins")
      .select("*");

    if (error) {
      console.error("[Supabase] Error loading PINs:", error);
      return {};
    }

    const pinMap = {};
    for (const row of data) {
      pinMap[row.player_id] = row.pin;
    }

    return pinMap;
  } catch (err) {
    console.error("[Supabase] loadPinsFromSupabase crashed:", err);
    return {};
  }
}

// --------------------------------------------------
// LOAD RAFFLE WINNERS
// --------------------------------------------------
export async function loadRaffleWinnersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("raffle_winners")
      .select("*");

    if (error) {
      console.error("[Supabase] Error loading raffle winners:", error);
      return {};
    }

    const winners = {};
    for (const row of data) {
      winners[`${row.year}-${row.month}`] = row.winning_day;
    }

    return winners;
  } catch (err) {
    console.error("[Supabase] loadRaffleWinnersFromSupabase crashed:", err);
    return {};
  }
}

// --------------------------------------------------
// SAVE ENTRIES
// --------------------------------------------------
export async function saveEntriesToSupabase(entries) {
  try {
    const { error } = await supabase
      .from("calendar_entries")
      .upsert(entries, { onConflict: "id" });

    if (error) {
      console.error("[Supabase] saveEntriesToSupabase FAILED:", error);
    } else {
      console.log("[Supabase] Entries synced successfully");
    }
  } catch (err) {
    console.error("[Supabase] saveEntriesToSupabase crashed:", err);
  }
}

// --------------------------------------------------
// SAVE PIN OVERRIDES
// --------------------------------------------------
export async function savePinOverridesToSupabase(pinMap) {
  try {
    const rows = Object.entries(pinMap).map(([player_id, pin]) => ({
      player_id,
      pin,
    }));

    const { error } = await supabase
      .from("player_pins")
      .upsert(rows, { onConflict: "player_id" });

    if (error) {
      console.error("[Supabase] savePinOverridesToSupabase FAILED:", error);
    } else {
      console.log("[Supabase] Player PINs synced");
    }
  } catch (err) {
    console.error("[Supabase] savePinOverridesToSupabase crashed:", err);
  }
}

// --------------------------------------------------
// SAVE RAFFLE WINNERS
// --------------------------------------------------
export async function saveRaffleWinnersToSupabase(winners) {
  try {
    const rows = Object.entries(winners).map(([key, winning_day]) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month, winning_day };
    });

    const { error } = await supabase
      .from("raffle_winners")
      .upsert(rows, { onConflict: "year,month" });

    if (error) {
      console.error("[Supabase] saveRaffleWinnersToSupabase FAILED:", error);
    } else {
      console.log("[Supabase] Raffle winners synced");
    }
  } catch (err) {
    console.error("[Supabase] saveRaffleWinnersToSupabase crashed:", err);
  }
}
