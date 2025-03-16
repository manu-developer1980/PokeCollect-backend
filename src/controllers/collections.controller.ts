import { Request, Response } from "express";
import { supabase } from "../lib/supabase";

// Obtener todas las colecciones de un usuario
export const getCollections = async (req: Request, res: Response) => {
  try {
    // Aquí deberías obtener el userId del token de autenticación
    const userId = req.headers.authorization?.split(" ")[1] || "anonymous";

    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
};

// Añadir una carta a una colección
export const addCardToCollection = async (req: Request, res: Response) => {
  const { collectionId } = req.params;
  const cardData = req.body;

  try {
    // Aquí deberías obtener el userId del token de autenticación
    const userId = req.headers.authorization?.split(" ")[1] || "anonymous";

    // Primero verificamos que la colección pertenece al usuario
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .single();

    if (collectionError || !collection) {
      return res
        .status(404)
        .json({ error: "Collection not found or access denied" });
    }

    // Añadimos la carta a la colección
    const { data, error } = await supabase.from("collection_cards").insert({
      collection_id: collectionId,
      card_id: cardData.id,
      card_data: cardData,
      added_at: new Date(),
    });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error("Error adding card to collection:", error);
    res.status(500).json({ error: "Failed to add card to collection" });
  }
};
