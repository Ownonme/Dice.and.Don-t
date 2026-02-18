import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface AdminWeaponTypeDefinition {
  name: string;
  category: 'mischia' | 'distanza';
}

export async function createWeaponType(def: AdminWeaponTypeDefinition) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const payload: TablesInsert<'weapon_types'> = {
    name: def.name,
    category: def.category as any,
    created_by: userId,
  } as any; // compat fino a quando non aggiorniamo i tipi generati

  const { data, error } = await supabase
    .from('weapon_types')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Lista weapon_types per UI
export async function listWeaponTypes() {
  const { data, error } = await supabase
    .from('weapon_types')
    .select('id, name, category')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}