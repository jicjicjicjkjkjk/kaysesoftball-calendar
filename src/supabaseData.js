// src/supabaseData.js
import { supabase } from './supabaseClient';

/*  
  TABLE: entries
  COLUMNS:
    id (uuid, primary key)
    year (int)
    month (int)
    day (int)
    supporter_name (text)
    supporter_phone (text)
    player_id (text)
    payment_status (text)
*/

export async function fetchEntries() {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('day', { ascending: true });

  if (error) {
    console.error("Error fetching entries:", error);
    return [];
  }
  return data;
}

export async function createEntry(entry) {
  const { error } = await supabase.from('entries').insert(entry);
  if (error) console.error("Error creating entry:", error);
}

export async function updateEntry(id, updates) {
  const { error } = await supabase.from('entries').update(updates).eq('id', id);
  if (error) console.error("Error updating entry:", error);
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) console.error("Error deleting entry:", error);
}
