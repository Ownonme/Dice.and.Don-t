export interface MarketItem {
  id: string;
  shop_id: string;
  name: string;
  type: string;
  price_bronzo?: number;
  price_argento?: number;
  price_oro?: number;
  price_rosse?: number;
  price_bianche?: number;
  description?: string;
  item_data?: any;
  created_at: string;
  updated_at: string;
  // Nuovi campi allineati a collected_items
  subtype?: string;
  armor?: number;
  stats?: Record<string, number>;
  weight?: number;
  damage?: number;
  damage_veloce?: number;
  damage_pesante?: number;
  damage_affondo?: number;
  effect?: string;
  quantity?: number;
}

export interface Shop {
  id: string;
  city_id: string;
  name: string;
  category: 'weapons' | 'armor' | 'potions' | 'services' | 'general';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface City {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShoppingCart {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseHistory {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  total_cost: number;
  purchased_at?: string;
}