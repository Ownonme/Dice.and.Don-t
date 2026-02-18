import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface AdminMaterialDefinition {
  name: string;
  description?: string;
  ingotWeight?: number | null;
  bonusEffects: string[];
}

export async function createMaterial(def: AdminMaterialDefinition) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const payload: TablesInsert<'materials'> = {
    name: def.name,
    description: def.description ?? null,
    ingot_weight: def.ingotWeight ?? null,
    bonus_effects: def.bonusEffects ?? [],
    created_by: userId,
  } as any; // In caso la tabella non esista ancora, preveniamo errori di typing

  const { data, error } = await supabase
    .from('materials')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Lista materiali per UI
export async function listMaterials() {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, description, ingot_weight, bonus_effects')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}