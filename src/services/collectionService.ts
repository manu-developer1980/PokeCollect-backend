import { supabase } from "../config/supabase.js";
import { CollectionCard, Collection } from "../types/database.js";

export async function getCollectionsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

// Implementa otras funciones según sea necesario
