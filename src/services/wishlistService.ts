import { supabase } from '../config/supabase';
import { WishlistCard } from '../types/database';

export async function getWishlistByUserId(userId: string) {
  const { data, error } = await supabase
    .from('wishlist_cards')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function addToWishlist(cardData: Partial<WishlistCard>) {
  const { data, error } = await supabase
    .from('wishlist_cards')
    .insert([cardData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFromWishlist(userId: string, cardId: string) {
  const { error } = await supabase
    .from('wishlist_cards')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', cardId);

  if (error) throw error;
  return true;
}

export async function updateWishlistCard(
  userId: string,
  cardId: string,
  cardData: Partial<WishlistCard>
) {
  const { data, error } = await supabase
    .from('wishlist_cards')
    .update(cardData)
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw error;
  return data;
}