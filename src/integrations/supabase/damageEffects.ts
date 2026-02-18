import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface AdminDamageEffectDefinition {
  name: string;
  description?: string;
  affects: { actionPoints: boolean; health: boolean; armor: boolean; classicDamage: boolean };
  bonusEffects: string[];
}

export async function createDamageEffect(def: AdminDamageEffectDefinition) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const payload: TablesInsert<'damage_effects'> = {
    name: def.name,
    description: def.description ?? null,
    affects_action_points: !!def.affects.actionPoints,
    affects_health: !!def.affects.health,
    affects_armor: !!def.affects.armor,
    affects_classic_damage: !!def.affects.classicDamage,
    bonus_effects: def.bonusEffects ?? [],
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('damage_effects')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listDamageEffects() {
  const { data, error } = await supabase
    .from('damage_effects')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function deleteDamageEffect(id: string) {
  const { error } = await supabase
    .from('damage_effects')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
