export interface WishlistCard {
  id?: string;
  user_id: string;
  card_id: string;
  quantity?: number;
  condition?: string;
  price?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
