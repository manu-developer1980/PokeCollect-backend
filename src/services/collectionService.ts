import { supabase } from '../config/supabase';
import { CollectionCard, Collection } from '../types/database';

export async function getCollectionsByUserId(userId: string) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function getCollectionCards(collectionId: string) {
  const { data, error } = await supabase
    .from('collection_cards')
    .select(`
      *,
      collections (
        name,
        user_id
      )
    `)
    .eq('collection_id', collectionId);

  if (error) throw error;
  return data;
}

export async function addCardToCollection(cardData: Partial<CollectionCard>) {
  const { data, error } = await supabase
    .from('collection_cards')
    .insert([cardData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCardInCollection(
  cardId: string,
  cardData: Partial<CollectionCard>
) {
  const { data, error } = await supabase
    .from('collection_cards')
    .update(cardData)
    .eq('id', cardId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeCardFromCollection(cardId: string) {
  const { error } = await supabase
    .from('collection_cards')
    .delete()
    .eq('id', cardId);

  if (error) throw error;
  return true;
}

export async function createCollection(collectionData: Partial<Collection>) {
  const { data, error } = await supabase
    .from('collections')
    .insert([collectionData])
    .select()
    .single();

  if (error) throw error;
  return data;
}