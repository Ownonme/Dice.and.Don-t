import { supabase } from '@/integrations/supabase/client';
import type { MagicQuiverDefinition } from '@/components/magic/MagicQuiverAdminModal';

export async function createMagicQuiver(def: MagicQuiverDefinition) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const payload: any = {
    name: def.name,
    description: def.description || null,
    warnings: def.warnings || null,
    action_points_cost: def.actionPointsCost ?? null,
    indicative_action_points_cost: def.indicativeActionPointsCost ?? null,
    damage_sets: def.damageSets || [],
    anomalies: def.anomalies || [],
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('magic_quivers')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listMagicQuivers() {
  const { data, error } = await supabase
    .from('magic_quivers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}