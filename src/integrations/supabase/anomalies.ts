import { supabase } from '@/integrations/supabase/client';
import type { AdminAnomalyDefinition } from '@/components/magic/AnomalyAdminModal';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export async function createAnomaly(def: AdminAnomalyDefinition) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const hasStatsModifier = !!def.statsModifier && Object.values(def.statsModifier).some((v) => (v || 0) !== 0);
  const statsPayload: any = {
    stats_modifier: def.statsModifier || {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0,
    },
    action_duration_mode: def.durationMode ?? null,
    duration_mode: def.durationMode ?? null,
    action_duration_type: def.actionsDurationType ?? null,
    actions_duration_type: def.actionsDurationType ?? null,
    decrement_on_failure: def.decrementOnFailure ?? null,
    damage_sets: def.doesDamage ? (def.damageSets ?? []) : [],
    damage_bonus_enabled: !!def.damageBonusEnabled,
    damage_bonus: def.damageBonusEnabled ? (def.damageBonus ?? null) : null,
    damage_reduction_enabled: !!def.damageReductionEnabled,
    damage_reduction: def.damageReductionEnabled ? (def.damageReduction ?? null) : null,
    weakness_enabled: !!def.weaknessEnabled,
    weakness: def.weaknessEnabled ? (def.weakness ?? null) : null,
    pa_discount_enabled: !!def.paDiscountEnabled,
    pa_discount: def.paDiscountEnabled ? (def.paDiscount ?? null) : null,
    immunity_total: !!def.immunityTotal,
    immunity_anomalies: Array.isArray(def.immunityAnomalies) ? def.immunityAnomalies : [],
    immunity_damage_effects: Array.isArray(def.immunityDamageEffects) ? def.immunityDamageEffects : [],
  };

  const payload: TablesInsert<'anomalies'> = {
    name: def.name,
    description: def.description || null,
    malus: def.malus || null,
    turns: def.turns ?? null,
    does_damage: !!def.doesDamage,
    // Con effetti multipli salviamo i dettagli in stats.damage_sets; lasciamo null i vecchi campi
    damage_per_turn: def.doesDamage ? null : null,
    damage_effect_id: def.doesDamage ? null : null,
    modifies_stats: hasStatsModifier,
    stats: statsPayload,
    modifies_specifics: !!def.modifiesSpecifics,
    temp_health: def.modifiesSpecifics ? (def.tempHealth ?? null) : null,
    temp_action_points: def.modifiesSpecifics ? (def.tempActionPoints ?? null) : null,
    temp_armour: def.modifiesSpecifics ? (def.tempArmour ?? null) : null,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('anomalies')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateAnomaly(id: string, def: AdminAnomalyDefinition) {
  const hasStatsModifier = !!def.statsModifier && Object.values(def.statsModifier).some((v) => (v || 0) !== 0);
  const statsPayload: any = {
    stats_modifier: def.statsModifier || {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0,
    },
    action_duration_mode: def.durationMode ?? null,
    duration_mode: def.durationMode ?? null,
    action_duration_type: def.actionsDurationType ?? null,
    actions_duration_type: def.actionsDurationType ?? null,
    decrement_on_failure: def.decrementOnFailure ?? null,
    damage_sets: def.doesDamage ? (def.damageSets ?? []) : [],
    damage_bonus_enabled: !!def.damageBonusEnabled,
    damage_bonus: def.damageBonusEnabled ? (def.damageBonus ?? null) : null,
    damage_reduction_enabled: !!def.damageReductionEnabled,
    damage_reduction: def.damageReductionEnabled ? (def.damageReduction ?? null) : null,
    weakness_enabled: !!def.weaknessEnabled,
    weakness: def.weaknessEnabled ? (def.weakness ?? null) : null,
    pa_discount_enabled: !!def.paDiscountEnabled,
    pa_discount: def.paDiscountEnabled ? (def.paDiscount ?? null) : null,
    immunity_total: !!def.immunityTotal,
    immunity_anomalies: Array.isArray(def.immunityAnomalies) ? def.immunityAnomalies : [],
    immunity_damage_effects: Array.isArray(def.immunityDamageEffects) ? def.immunityDamageEffects : [],
  };

  const payload: TablesUpdate<'anomalies'> = {
    name: def.name,
    description: def.description || null,
    malus: def.malus || null,
    turns: def.turns ?? null,
    does_damage: !!def.doesDamage,
    damage_per_turn: null,
    damage_effect_id: null,
    modifies_stats: hasStatsModifier,
    stats: statsPayload,
    modifies_specifics: !!def.modifiesSpecifics,
    temp_health: def.modifiesSpecifics ? (def.tempHealth ?? null) : null,
    temp_action_points: def.modifiesSpecifics ? (def.tempActionPoints ?? null) : null,
    temp_armour: def.modifiesSpecifics ? (def.tempArmour ?? null) : null,
  };

  const { data, error } = await supabase
    .from('anomalies')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAnomalies() {
  const { data, error } = await supabase
    .from('anomalies')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getAnomalyById(id: string) {
  const { data, error } = await supabase
    .from('anomalies')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteAnomaly(id: string) {
  const { error } = await supabase
    .from('anomalies')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
