import { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { StripeService } from "../lib/stripe-service";

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

// Crear una nueva colección
export const createCollection = async (req: Request, res: Response) => {
  try {
    // Aquí deberías obtener el userId del token de autenticación
    const userId = req.headers.authorization?.split(" ")[1] || "anonymous";
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Collection name is required" });
    }

    // Obtener el número actual de colecciones del usuario
    const { count: currentCollections } = await supabase
      .from("collections")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId);

    // Obtener el plan actual del usuario
    const userPlan = await StripeService.getUserPlan(userId);
    const planFeatures = StripeService.getPlanFeatures(userPlan);
    
    console.log('🔍 DEBUG - Create Collection:');
    console.log('  - User ID:', userId);
    console.log('  - User Plan:', userPlan);
    console.log('  - Plan Features:', planFeatures);
    console.log('  - Current Collections:', currentCollections);
    console.log('  - Collection Limit:', planFeatures?.collectionLimit);
    
    const canCreate = StripeService.canPerformAction(userPlan, 'createCollection', currentCollections || 0);
    console.log('  - Can Create:', canCreate);
    
    if (!canCreate) {
      console.log('❌ Collection creation blocked - limit reached');
      return res.status(403).json({ 
        error: "Collection limit reached", 
        message: `You have reached the limit of ${planFeatures?.collectionLimit || 0} Collections in your ${planFeatures?.name || userPlan} plan.`,
        details: {
          currentPlan: userPlan,
          planName: planFeatures?.name,
          currentCollections: currentCollections || 0,
          collectionLimit: planFeatures?.collectionLimit || 0
        }
      });
    }

    // Crear la colección
    const { data, error } = await supabase
      .from("collections")
      .insert({
        user_id: userId,
        name,
        description: description || '',
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (error) {
    console.error("Error creating collection:", error);
    res.status(500).json({ error: "Failed to create collection" });
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

    // Obtener el número actual de cartas del usuario en todas las colecciones
    const { count: currentCards } = await supabase
      .from("collection_cards")
      .select("*", { count: 'exact', head: true })
      .eq("collection_id", collectionId);

    // Verificar límites del plan
    const userPlan = await StripeService.getUserPlan(userId);
    const canAddCard = StripeService.canPerformAction(userPlan, 'addCard', currentCards || 0);
    if (!canAddCard) {
      return res.status(403).json({ 
        error: "Card limit reached", 
        message: "You have reached the card limit for your current plan" 
      });
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
