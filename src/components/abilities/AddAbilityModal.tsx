import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { apiBase } from '@/integrations/localserver';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { listAnomalies } from '@/integrations/supabase/anomalies';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { Badge } from '@/components/ui/badge';
import { ABILITY_SECTIONS } from '@/constants/abilityConfig';
import { MAGIC_SECTIONS } from '@/constants/magicConfig';
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { readSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';

// Interfacce
interface LevelDamageValue {
  typeName: string;
  guaranteed_damage: number;
  additional_damage: number;
  less_health_more_damage_guaranteed_increment?: number;
  less_health_more_damage_additional_increment?: number;
}

interface LevelPercentageDamageValue {
  typeName: string;
  guaranteed_percentage_damage: number;
  additional_percentage_damage: number;
}
interface CustomSpecificSelection {
  id: string;
  name: string;
}
interface PassiveConditionSpecificSelection {
  id: string;
  name: string;
  kind: 'classic' | 'custom';
  key: string;
}
interface LevelCustomSpecificValue {
  id: string;
  name: string;
  value: number;
}
interface LevelPassiveSpecificCondition {
  id: string;
  name: string;
  kind: 'classic' | 'custom';
  key: string;
  min_percent?: number;
  max_percent?: number;
  min_value?: number;
  max_value?: number;
}

interface AbilityGrade {
  effects: string[];
  guaranteed_damage?: number;
  additional_damage?: number;
  damage_values?: { typeName: string; guaranteed_damage?: number; additional_damage?: number }[];
  percentage_damage_values?: { typeName: string; guaranteed_percentage_damage?: number; additional_percentage_damage?: number }[];
  self_damage_sets?: {
    effect_name: string;
    guaranteed_damage?: number;
    max_damage?: number;
    mode?: 'classic' | 'percentage';
    guaranteed_percentage_damage?: number;
    max_percentage_damage?: number;
  }[];
  title?: string;
  area_or_cone_value?: number;
  chain_targets?: number;
  max_seconds?: number;
  pa_cost_per_second?: number;
  increasing_damage_per_second?: number;
  turn_duration_rounds?: number;
  max_projectiles?: number;
  increasing_damage_per_projectile?: number;
  max_multiple_attacks?: number;
  level_warning?: string;
  use_weapon_damage?: boolean;
  anomaly1_percentage?: number;
  anomaly1_type?: string;
  anomaly2_percentage?: number;
  anomaly2_type?: string;
  anomaly3_percentage?: number;
  anomaly3_type?: string;
  action_cost?: number;
  indicative_action_cost?: number;
  usage_interval_turns?: number;
  grade_number?: number;
}

interface AbilityLevel {
  level: number;
  // valori per tipo di danno
  damage_values: LevelDamageValue[];
  percentage_damage_values?: LevelPercentageDamageValue[];
  // costi e descrizione livello
  punti_azione?: number;
  punti_azione_indicativi?: number;
  action_cost?: number;
  indicative_action_cost?: number;
  level_description: string;
  removed_anomalies: string[];
  less_health_more_damage_every_hp?: number;
  // opzioni generali a livello
  turn_duration_rounds?: number;
  max_targets?: number;
  usage_interval_turns?: number;
  max_uses_per_turn?: number;
  use_weapon_damage?: boolean;
  // tiri multipli
  max_projectiles?: number;
  increasing_damage_per_projectile?: number;
  // forma del danno
  damage_shape?: 'area' | 'cone' | 'single' | 'chain';
  area_or_cone_value?: number;
  chain_targets?: number;
  consume_custom_specifics?: LevelCustomSpecificValue[];
  generate_custom_specifics?: LevelCustomSpecificValue[];
  passive_condition_types?: string[];
  passive_specific_conditions?: LevelPassiveSpecificCondition[];
  // danno al secondo
  max_seconds?: number;
  pa_cost_per_second?: number;
  increasing_damage_per_second?: number;
  // attacchi multipli
  max_multiple_attacks?: number;
  // investimento PA
  max_pa_investment?: number;
  increasing_damage_per_pa?: number;
  success_roll_increase_every_pa?: number;
  // tiro percentuale
  min_success_percentage?: number;
  // avvertimento
  level_warning?: string;
  // tombola
  lottery_enabled?: boolean;
  lottery_dice_faces?: number;
  lottery_numeric_choices?: number;
  lottery_correct_instances?: AbilityGrade[];
  lottery_wrong_instances?: AbilityGrade[];
  scaled_move_stats?: string[];
  scaled_move_skills?: string[];
  no_damage_turn_increase_values?: LevelDamageValue[];
  activation_delay_turns?: number;
  knockback_meters?: number;
  extra_cost_effect_id?: string | null;
  extra_cost_effect_name?: string;
  // autodanni/effetti su utilizzatore
  self_effect_enabled?: boolean;
  self_damage_sets?: {
    effect_name: string;
    guaranteed_damage?: number;
    max_damage?: number;
    mode?: 'classic' | 'percentage';
    guaranteed_percentage_damage?: number;
    max_percentage_damage?: number;
  }[];
  self_anomaly_mode?: 'select' | 'custom';
  self_anomaly_name?: string;
  self_anomaly_description?: string;
  self_anomaly_turns?: number;
  self_anomaly_does_damage?: boolean;
  self_anomaly_damage_per_turn?: number;
  self_anomaly_damage_effect_id?: string | null;
  self_anomaly_damage_effect_name?: string;
  self_anomaly_action_points_modifier?: number;
  self_anomaly_health_modifier?: number;
  self_anomaly_stats_modifier?: { forza?: number; percezione?: number; resistenza?: number; intelletto?: number; agilita?: number; sapienza?: number; anima?: number };
  self_anomalies?: any[];
  failure_enabled?: boolean;
  failure_damage_sets?: {
    effect_name: string;
    guaranteed_damage?: number;
    max_damage?: number;
    mode?: 'classic' | 'percentage';
    guaranteed_percentage_damage?: number;
    max_percentage_damage?: number;
  }[];
  failure_anomaly_mode?: 'select' | 'custom';
  failure_anomaly_name?: string;
  failure_anomaly_description?: string;
  failure_anomaly_turns?: number;
  failure_anomaly_does_damage?: boolean;
  failure_anomaly_damage_per_turn?: number;
  failure_anomaly_damage_effect_id?: string | null;
  failure_anomaly_damage_effect_name?: string;
  failure_anomaly_action_points_modifier?: number;
  failure_anomaly_health_modifier?: number;
  failure_anomaly_stats_modifier?: { forza?: number; percezione?: number; resistenza?: number; intelletto?: number; agilita?: number; sapienza?: number; anima?: number };
  failure_anomaly_probability?: number;
  passive_anomalies?: any[];
  phases?: {
    enabled?: boolean;
    effects?: string[];
    guaranteed_damage?: number;
    additional_damage?: number;
    damage_values?: { typeName: string; guaranteed_damage?: number; additional_damage?: number }[];
    percentage_damage_values?: { typeName: string; guaranteed_percentage_damage?: number; additional_percentage_damage?: number }[];
    action_cost?: number;
    indicative_action_cost?: number;
    area_or_cone_value?: number;
    chain_targets?: number;
    max_seconds?: number;
    pa_cost_per_second?: number;
    increasing_damage_per_second?: number;
    max_projectiles?: number;
    increasing_damage_per_projectile?: number;
    max_pa_investment?: number;
    increasing_damage_per_pa?: number;
    success_roll_increase_every_pa?: number;
    conditional_additional_damage?: boolean;
    turn_duration_rounds?: number;
    max_targets?: number;
    usage_interval_turns?: number;
    max_uses_per_turn?: number;
    min_success_percentage?: number;
    activation_delay_turns?: number;
    knockback_meters?: number;
  }[];
  grades?: AbilityGrade[];
}

interface Ability {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string;
  grade: string;
  description: string;
  additional_description: string;
  story1?: string;
  story2?: string;
  levels: AbilityLevel[];
  created_by: string;
  created_at: string;
}

interface AddAbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAbility?: Ability | null;
  mode?: 'add' | 'edit';
}

// Costanti
const ABILITY_TYPES = ['Attiva', 'Passiva', 'Suprema'];

const ABILITY_CATEGORIES = {
  'Mischia Offensiva': ['Ascia', 'Spada', 'Mazza', 'Pugnale', 'Bastone', 'Armi inastate', 'Frusta', 'Falce', 'Tirapugni', 'Scudo'],
  'Mischia Difensiva': ['Schivata', 'Parata', 'Deviazione', 'Contrattacco'],
  'Armi a Distanza': ['Precisione', 'Arco', 'Balestra', 'Fionda', 'Da fuoco', 'Da lancio', 'Pesante'],
  'Logica': ['Logica', 'Trappole', 'Telecinesi', 'Alchimia', 'Fabbro', 'Survivalista'],
  'Furtive': ['Furtività', 'Assassinio', 'Furto', 'Saccheggio'],
  'Tecnico': ['Posture', 'Generale']
};

const GRADES = ['Semplice', 'Avanzata', 'Suprema'];

const STAT_OPTIONS = ['forza','percezione','resistenza','intelletto','agilita','sapienza','anima'] as const;
const STAT_LABELS: Record<(typeof STAT_OPTIONS)[number], string> = {
  forza: 'Forza',
  percezione: 'Percezione',
  resistenza: 'Resistenza',
  intelletto: 'Intelletto',
  agilita: 'Agilità',
  sapienza: 'Sapienza',
  anima: 'Anima'
};
const MAGIC_BRANCH_OPTIONS: string[] = Object.keys(MAGIC_SECTIONS || {}).map((b) => b.toLowerCase().replace(/\s+/g, '_'));
const COMPETENCE_OPTIONS: string[] = Array.from(new Set(
  [
    ...Object.values(ABILITY_SECTIONS).flatMap((section: any) =>
      Object.values(section.categories || {}).map((cat: any) => String(cat.competence || '').trim()).filter((s: string) => !!s)
    ),
    ...MAGIC_BRANCH_OPTIONS,
  ]
));

const PASSIVE_CONDITION_TYPES = [
  { id: 'specific_percent_lt', label: 'Specifica minore di %', mode: 'percent', dir: 'lt' },
  { id: 'specific_percent_gt', label: 'Specifica maggiore di %', mode: 'percent', dir: 'gt' },
  { id: 'specific_value_lt', label: 'Specifica minore di numerico', mode: 'value', dir: 'lt' },
  { id: 'specific_value_gt', label: 'Specifica maggiore di numerico', mode: 'value', dir: 'gt' },
];

const PASSIVE_CLASSIC_SPECIFICS = [
  { id: 'classic:hp', name: 'Punti vita', kind: 'classic' as const, key: 'hp' },
  { id: 'classic:armor', name: 'Armatura', kind: 'classic' as const, key: 'armor' },
  { id: 'classic:pa', name: 'Punti azione', kind: 'classic' as const, key: 'pa' },
  ...STAT_OPTIONS.map((s) => ({
    id: `classic:${s}`,
    name: STAT_LABELS[s],
    kind: 'classic' as const,
    key: s,
  })),
];

interface AbilityFormData {
  name: string;
  type: string;
  category: string;
  subcategory: string;
  grade: string;
  description: string;
  levels: AbilityLevel[];
  damageTypes: { name: string }[];
  lessHealthMoreDamageEnabled: boolean;
  conditionalAdditionalDamage: boolean;
  // flag generali richiesti
  hasTurnDuration: boolean;
  multipleShots: boolean;
  multipleShotsIncreasing: boolean;
  hasMaxTargets: boolean;
  useWeaponDamage: boolean;
  hasUsageInterval: boolean;
  hasMaxUsesPerTurn: boolean;
  hasSelfEffects: boolean;
  consumeCustomSpecificsEnabled: boolean;
  consumeCustomSpecifics: CustomSpecificSelection[];
  generateCustomSpecificsEnabled: boolean;
  generateCustomSpecifics: CustomSpecificSelection[];
  immunityEnabled: boolean;
  immunityTotal: boolean;
  immunityAnomalies: { id: string; name: string }[];
  immunityDamageEffects: { id: string; name: string }[];
  passiveConditionEnabled: boolean;
  passiveConditionTypes: string[];
  passiveConditionSpecifics: PassiveConditionSpecificSelection[];
  selfDamageEffects: { name: string }[];
  percentageDamageEnabled: boolean;
  percentageDamageEffects: { name: string }[];
  lotteryEnabled: boolean;
  damageShape: 'area' | 'cone' | 'single' | 'chain';
  damagePerSecond: boolean;
  damagePerSecondIncreasing: boolean;
  multipleAttacks: boolean;
  phaseAttack: boolean;
  chargedAttack: boolean;
  hasLevelWarning: boolean;
  percentageRollEnabled: boolean;
  paInvestmentEnabled: boolean;
  damageIncreasePerPaEnabled: boolean;
  successRollIncreasePerPaEnabled: boolean;
  extraCostEnabled: boolean;
  extraCostEffectId: string | null;
  extraCostEffectName: string;
  difficulty: number;
  noDamageTurnIncreaseEnabled: boolean;
  launchDelayEnabled: boolean;
  knockbackEnabled: boolean;
  hasFailure: boolean;
  failureDamageEffects: { name: string; mode?: 'classic' | 'percentage' }[];
  scaledMoveEnabled: boolean;
  passiveAnomalyEnabled: boolean;
  passiveAnomalyAlwaysActive: boolean;
  removeAnomalyEnabled: boolean;
  additionalDescription: string;
  story1: string;
  story2: string;
}

const createDefaultLevel = (level: number): AbilityLevel => ({
  level,
  damage_values: [],
  punti_azione: 0,
  punti_azione_indicativi: 0,
  action_cost: 0,
  indicative_action_cost: 0,
  level_description: '',
  removed_anomalies: [],
  less_health_more_damage_every_hp: 0,
  turn_duration_rounds: 0,
  max_targets: 0,
  usage_interval_turns: 0,
  max_uses_per_turn: 0,
  use_weapon_damage: false,
  consume_custom_specifics: [],
  generate_custom_specifics: [],
  passive_condition_types: [],
  passive_specific_conditions: [],
  max_projectiles: 0,
  scaled_move_stats: [],
  scaled_move_skills: [],
  no_damage_turn_increase_values: [],
  activation_delay_turns: 0,
  knockback_meters: 0,
  extra_cost_effect_id: null,
  extra_cost_effect_name: '',
  self_effect_enabled: false,
  self_damage_sets: [],
  self_anomaly_mode: 'select',
  self_anomaly_name: 'Nessuna',
  self_anomaly_description: '',
  self_anomaly_turns: 0,
  self_anomaly_does_damage: false,
  self_anomaly_damage_per_turn: 0,
  self_anomaly_damage_effect_id: null,
  self_anomaly_damage_effect_name: '',
  self_anomaly_action_points_modifier: 0,
  self_anomaly_health_modifier: 0,
  self_anomaly_stats_modifier: { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
  self_anomalies: [],
  max_pa_investment: 0,
  increasing_damage_per_pa: 0,
  success_roll_increase_every_pa: 0,
  failure_enabled: false,
  failure_damage_sets: [],
  failure_anomaly_mode: 'custom',
  failure_anomaly_name: '',
  failure_anomaly_description: '',
  failure_anomaly_turns: 0,
  failure_anomaly_does_damage: false,
  failure_anomaly_damage_per_turn: 0,
  failure_anomaly_damage_effect_id: null,
  failure_anomaly_damage_effect_name: '',
  failure_anomaly_action_points_modifier: 0,
  failure_anomaly_health_modifier: 0,
  failure_anomaly_stats_modifier: {},
  failure_anomaly_probability: 100,
  passive_anomalies: [],
  phases: [],
  grades: [],
  lottery_correct_instances: [],
  lottery_wrong_instances: [],
});

const pruneAbilityLevelPayload = (level: any): any => {
  const isEmptyString = (v: unknown): boolean => typeof v === 'string' && v.trim().length === 0;
  const isAllZeroStats = (v: any): boolean => {
    if (!v || typeof v !== 'object') return true;
    return Object.values(v).every((x) => (typeof x === 'number' ? x : Number(x) || 0) === 0);
  };
  const filterDamageSets = (arr: any[]): any[] => {
    return arr
      .map((s) => ({
        ...s,
        effect_name: (s?.effect_name ?? '').toString().trim(),
      }))
      .filter((s) => {
        if (!s.effect_name) return false;
        const gd = Number(s?.guaranteed_damage) || 0;
        const md = Number(s?.max_damage) || 0;
        const gpd = Number(s?.guaranteed_percentage_damage) || 0;
        const mpd = Number(s?.max_percentage_damage) || 0;
        return gd !== 0 || md !== 0 || gpd !== 0 || mpd !== 0 || (s?.mode ?? 'classic') !== 'classic';
      });
  };

  const pruneMiniPayload = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    const next: any = { ...obj };

    if (Array.isArray(next.damage_values) && next.damage_values.length > 0) {
      delete next.guaranteed_damage;
      delete next.additional_damage;
    }
    if (!next.action_cost) delete next.action_cost;
    if (!next.indicative_action_cost) delete next.indicative_action_cost;
    if (!next.max_targets) delete next.max_targets;
    if (!next.usage_interval_turns) delete next.usage_interval_turns;
    if (!next.max_uses_per_turn) delete next.max_uses_per_turn;
    if (!next.min_success_percentage) delete next.min_success_percentage;
    if (!next.max_multiple_attacks) delete next.max_multiple_attacks;
    if (!next.area_or_cone_value) delete next.area_or_cone_value;
    if (!next.max_seconds) delete next.max_seconds;
    if (!next.pa_cost_per_second) delete next.pa_cost_per_second;
    if (!next.increasing_damage_per_second) delete next.increasing_damage_per_second;
    if (!next.max_pa_investment) delete next.max_pa_investment;
    if (!next.increasing_damage_per_pa) delete next.increasing_damage_per_pa;
    if (!next.success_roll_increase_every_pa) delete next.success_roll_increase_every_pa;
    if (!next.max_projectiles) delete next.max_projectiles;
    if (!next.increasing_damage_per_projectile) delete next.increasing_damage_per_projectile;
    if (!next.turn_duration_rounds) delete next.turn_duration_rounds;
    if (!next.activation_delay_turns) delete next.activation_delay_turns;
    if (!next.knockback_meters) delete next.knockback_meters;
    if (isEmptyString(next.level_warning)) delete next.level_warning;

    if (Array.isArray(next.effects) && next.effects.length === 0) delete next.effects;
    if (Array.isArray(next.damage_values) && next.damage_values.length === 0) delete next.damage_values;
    if (Array.isArray(next.percentage_damage_values) && next.percentage_damage_values.length === 0) delete next.percentage_damage_values;

    return next;
  };

  const out: any = { ...level };

  if (Array.isArray(out.damage_values) && out.damage_values.length > 0) {
    out.damage_values = out.damage_values.map((dv: any) => {
      const next: any = { ...dv };
      if (!next.less_health_more_damage_guaranteed_increment) delete next.less_health_more_damage_guaranteed_increment;
      if (!next.less_health_more_damage_additional_increment) delete next.less_health_more_damage_additional_increment;
      return next;
    });
  }

  if (Array.isArray(out.damage_values) && out.damage_values.length === 0) delete out.damage_values;
  if (Array.isArray(out.percentage_damage_values) && out.percentage_damage_values.length === 0) delete out.percentage_damage_values;

  if (!out.punti_azione) delete out.punti_azione;
  if (!out.punti_azione_indicativi) delete out.punti_azione_indicativi;

  if (isEmptyString(out.level_description)) delete out.level_description;
  if (Array.isArray(out.removed_anomalies) && out.removed_anomalies.length === 0) delete out.removed_anomalies;
  if (!out.less_health_more_damage_every_hp) delete out.less_health_more_damage_every_hp;

  if (!out.turn_duration_rounds) delete out.turn_duration_rounds;
  if (!out.max_targets) delete out.max_targets;
  if (!out.usage_interval_turns) delete out.usage_interval_turns;
  if (!out.max_uses_per_turn) delete out.max_uses_per_turn;

  if (!out.use_weapon_damage) delete out.use_weapon_damage;

  if (!out.max_projectiles) delete out.max_projectiles;
  if (!out.increasing_damage_per_projectile) delete out.increasing_damage_per_projectile;
  if (!out.max_multiple_attacks) delete out.max_multiple_attacks;

  if (!out.min_success_percentage) delete out.min_success_percentage;

  if (isEmptyString(out.level_warning)) delete out.level_warning;

  if (Array.isArray(out.scaled_move_stats) && out.scaled_move_stats.length === 0) delete out.scaled_move_stats;
  if (Array.isArray(out.scaled_move_skills) && out.scaled_move_skills.length === 0) delete out.scaled_move_skills;
  if (Array.isArray(out.consume_custom_specifics)) {
    out.consume_custom_specifics = out.consume_custom_specifics
      .map((s: any) => ({
        id: (s?.id ?? '').toString(),
        name: (s?.name ?? '').toString(),
        value: typeof s?.value === 'number' ? s.value : Number(s?.value) || 0,
      }))
      .filter((s: any) => !!s.id || !!s.name);
    if (out.consume_custom_specifics.length === 0) delete out.consume_custom_specifics;
  }
  if (Array.isArray(out.generate_custom_specifics)) {
    out.generate_custom_specifics = out.generate_custom_specifics
      .map((s: any) => ({
        id: (s?.id ?? '').toString(),
        name: (s?.name ?? '').toString(),
        value: typeof s?.value === 'number' ? s.value : Number(s?.value) || 0,
      }))
      .filter((s: any) => !!s.id || !!s.name);
    if (out.generate_custom_specifics.length === 0) delete out.generate_custom_specifics;
  }
  if (Array.isArray(out.passive_condition_types)) {
    out.passive_condition_types = out.passive_condition_types
      .map((t: any) => (t ?? '').toString().trim())
      .filter((t: string) => !!t);
    if (out.passive_condition_types.length === 0) delete out.passive_condition_types;
  }
  if (Array.isArray(out.passive_specific_conditions)) {
    out.passive_specific_conditions = out.passive_specific_conditions
      .map((s: any) => ({
        id: (s?.id ?? '').toString(),
        name: (s?.name ?? '').toString(),
        kind: (s?.kind === 'classic' ? 'classic' : 'custom') as 'classic' | 'custom',
        key: (s?.key ?? '').toString(),
        min_percent: typeof s?.min_percent === 'number' ? s.min_percent : Number(s?.min_percent) || 0,
        max_percent: typeof s?.max_percent === 'number' ? s.max_percent : Number(s?.max_percent) || 0,
        min_value: typeof s?.min_value === 'number' ? s.min_value : Number(s?.min_value) || 0,
        max_value: typeof s?.max_value === 'number' ? s.max_value : Number(s?.max_value) || 0,
      }))
      .filter((s: any) => !!s.id || !!s.name || !!s.key);
    if (out.passive_specific_conditions.length === 0) delete out.passive_specific_conditions;
  }
  if (!out.max_seconds) delete out.max_seconds;
  if (!out.pa_cost_per_second) delete out.pa_cost_per_second;
  if (!out.increasing_damage_per_second) delete out.increasing_damage_per_second;

  if (!out.area_or_cone_value) delete out.area_or_cone_value;
  if (!out.chain_targets) delete out.chain_targets;

  if (!out.max_pa_investment) delete out.max_pa_investment;
  if (!out.increasing_damage_per_pa) delete out.increasing_damage_per_pa;
  if (!out.success_roll_increase_every_pa) delete out.success_roll_increase_every_pa;
  if (out.extra_cost_effect_id == null || String(out.extra_cost_effect_id).trim().length === 0) delete out.extra_cost_effect_id;
  if (isEmptyString(out.extra_cost_effect_name)) delete out.extra_cost_effect_name;
  if (!out.activation_delay_turns) delete out.activation_delay_turns;
  if (!out.knockback_meters) delete out.knockback_meters;

  if (!out.lottery_enabled) {
    delete out.lottery_enabled;
    delete out.lottery_dice_faces;
    delete out.lottery_numeric_choices;
    delete out.lottery_correct_instances;
    delete out.lottery_wrong_instances;
  } else {
    if (!out.lottery_dice_faces) delete out.lottery_dice_faces;
    if (!out.lottery_numeric_choices) delete out.lottery_numeric_choices;

    if (Array.isArray(out.lottery_correct_instances)) {
      if (out.lottery_correct_instances.length === 0) delete out.lottery_correct_instances;
      else out.lottery_correct_instances = out.lottery_correct_instances.map((x: any) => pruneMiniPayload(x));
    }
    if (Array.isArray(out.lottery_wrong_instances)) {
      if (out.lottery_wrong_instances.length === 0) delete out.lottery_wrong_instances;
      else out.lottery_wrong_instances = out.lottery_wrong_instances.map((x: any) => pruneMiniPayload(x));
    }
  }

  if (!out.self_effect_enabled) {
    delete out.self_effect_enabled;
    delete out.self_damage_sets;
    delete out.self_anomaly_mode;
    delete out.self_anomaly_name;
    delete out.self_anomaly_description;
    delete out.self_anomaly_turns;
    delete out.self_anomaly_does_damage;
    delete out.self_anomaly_damage_per_turn;
    delete out.self_anomaly_damage_effect_id;
    delete out.self_anomaly_damage_effect_name;
    delete out.self_anomaly_action_points_modifier;
    delete out.self_anomaly_health_modifier;
    delete out.self_anomaly_stats_modifier;
    delete out.self_anomalies;
  } else {
    if (Array.isArray(out.self_damage_sets)) {
      const filtered = filterDamageSets(out.self_damage_sets);
      if (filtered.length > 0) out.self_damage_sets = filtered;
      else delete out.self_damage_sets;
    }

    if (Array.isArray(out.self_anomalies) && out.self_anomalies.length === 0) delete out.self_anomalies;

    const selfName = String(out.self_anomaly_name ?? '').trim();
    const selfMeaningful =
      (selfName && selfName !== 'Nessuna') ||
      !isEmptyString(out.self_anomaly_description) ||
      (Number(out.self_anomaly_turns) || 0) > 0 ||
      !!out.self_anomaly_does_damage ||
      (Number(out.self_anomaly_damage_per_turn) || 0) > 0 ||
      (Number(out.self_anomaly_action_points_modifier) || 0) !== 0 ||
      (Number(out.self_anomaly_health_modifier) || 0) !== 0 ||
      !isAllZeroStats(out.self_anomaly_stats_modifier);

    if (!selfMeaningful) {
      delete out.self_anomaly_mode;
      delete out.self_anomaly_name;
      delete out.self_anomaly_description;
      delete out.self_anomaly_turns;
      delete out.self_anomaly_does_damage;
      delete out.self_anomaly_damage_per_turn;
      delete out.self_anomaly_damage_effect_id;
      delete out.self_anomaly_damage_effect_name;
      delete out.self_anomaly_action_points_modifier;
      delete out.self_anomaly_health_modifier;
      delete out.self_anomaly_stats_modifier;
    } else {
      if (isAllZeroStats(out.self_anomaly_stats_modifier)) delete out.self_anomaly_stats_modifier;
      if (selfName === 'Nessuna') delete out.self_anomaly_name;
      if (isEmptyString(out.self_anomaly_description)) delete out.self_anomaly_description;
      if (!out.self_anomaly_turns) delete out.self_anomaly_turns;
      if (!out.self_anomaly_does_damage) delete out.self_anomaly_does_damage;
      if (!out.self_anomaly_damage_per_turn) delete out.self_anomaly_damage_per_turn;
      if (out.self_anomaly_damage_effect_id == null) delete out.self_anomaly_damage_effect_id;
      if (isEmptyString(out.self_anomaly_damage_effect_name)) delete out.self_anomaly_damage_effect_name;
      if (!out.self_anomaly_action_points_modifier) delete out.self_anomaly_action_points_modifier;
      if (!out.self_anomaly_health_modifier) delete out.self_anomaly_health_modifier;
      if (!out.self_anomaly_mode) delete out.self_anomaly_mode;
    }
  }

  if (!out.failure_enabled) {
    delete out.failure_enabled;
    delete out.failure_damage_sets;
    delete out.failure_anomaly;
    delete out.failure_anomaly_mode;
    delete out.failure_anomaly_name;
    delete out.failure_anomaly_description;
    delete out.failure_anomaly_turns;
    delete out.failure_anomaly_does_damage;
    delete out.failure_anomaly_damage_per_turn;
    delete out.failure_anomaly_damage_effect_id;
    delete out.failure_anomaly_damage_effect_name;
    delete out.failure_anomaly_action_points_modifier;
    delete out.failure_anomaly_health_modifier;
    delete out.failure_anomaly_stats_modifier;
    delete out.failure_anomaly_probability;
  } else {
    if (Array.isArray(out.failure_damage_sets)) {
      const filtered = filterDamageSets(out.failure_damage_sets);
      if (filtered.length > 0) out.failure_damage_sets = filtered;
      else delete out.failure_damage_sets;
    }

    if (out.failure_anomaly == null) delete out.failure_anomaly;
    const failureName = String(out.failure_anomaly_name ?? '').trim();
    const failureMeaningful =
      (failureName && failureName !== 'Nessuna') ||
      !isEmptyString(out.failure_anomaly_description) ||
      (Number(out.failure_anomaly_turns) || 0) > 0 ||
      !!out.failure_anomaly_does_damage ||
      (Number(out.failure_anomaly_damage_per_turn) || 0) > 0 ||
      (Number(out.failure_anomaly_action_points_modifier) || 0) !== 0 ||
      (Number(out.failure_anomaly_health_modifier) || 0) !== 0 ||
      !isAllZeroStats(out.failure_anomaly_stats_modifier);

    if (!failureMeaningful) {
      delete out.failure_anomaly_mode;
      delete out.failure_anomaly_name;
      delete out.failure_anomaly_description;
      delete out.failure_anomaly_turns;
      delete out.failure_anomaly_does_damage;
      delete out.failure_anomaly_damage_per_turn;
      delete out.failure_anomaly_damage_effect_id;
      delete out.failure_anomaly_damage_effect_name;
      delete out.failure_anomaly_action_points_modifier;
      delete out.failure_anomaly_health_modifier;
      delete out.failure_anomaly_stats_modifier;
      delete out.failure_anomaly_probability;
    } else {
      if (isAllZeroStats(out.failure_anomaly_stats_modifier)) delete out.failure_anomaly_stats_modifier;
      if (failureName === 'Nessuna') delete out.failure_anomaly_name;
      if (isEmptyString(out.failure_anomaly_description)) delete out.failure_anomaly_description;
      if (!out.failure_anomaly_turns) delete out.failure_anomaly_turns;
      if (!out.failure_anomaly_does_damage) delete out.failure_anomaly_does_damage;
      if (!out.failure_anomaly_damage_per_turn) delete out.failure_anomaly_damage_per_turn;
      if (out.failure_anomaly_damage_effect_id == null) delete out.failure_anomaly_damage_effect_id;
      if (isEmptyString(out.failure_anomaly_damage_effect_name)) delete out.failure_anomaly_damage_effect_name;
      if (!out.failure_anomaly_action_points_modifier) delete out.failure_anomaly_action_points_modifier;
      if (!out.failure_anomaly_health_modifier) delete out.failure_anomaly_health_modifier;
      if (!out.failure_anomaly_mode) delete out.failure_anomaly_mode;
      if ((Number(out.failure_anomaly_probability) || 0) === 100) delete out.failure_anomaly_probability;
    }
  }

  if (Array.isArray(out.passive_anomalies) && out.passive_anomalies.length === 0) delete out.passive_anomalies;

  if (Array.isArray(out.phases)) {
    if (out.phases.length === 0) delete out.phases;
    else out.phases = out.phases.map((p: any) => pruneMiniPayload(p));
  }
  if (Array.isArray(out.grades)) {
    if (out.grades.length === 0) delete out.grades;
    else out.grades = out.grades.map((g: any) => pruneMiniPayload(g));
  }

  return out;
};

export const AddAbilityModal = ({ isOpen, onClose, editAbility = null, mode = 'add' }: AddAbilityModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [specificCatalog, setSpecificCatalog] = useState<CharacterSpecificCatalogItem[]>(() => readSpecificCatalog());

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AbilityFormData>({
    defaultValues: {
      name: '',
      type: '',
      category: '',
      subcategory: '',
      grade: '',
      description: '',
      levels: Array.from({ length: 10 }, (_, i) => createDefaultLevel(i + 1)),
      damageTypes: [],
      lessHealthMoreDamageEnabled: false,
      conditionalAdditionalDamage: false,
      hasTurnDuration: false,
      multipleShots: false,
      multipleShotsIncreasing: false,
      hasMaxTargets: false,
      useWeaponDamage: false,
      hasUsageInterval: false,
      hasMaxUsesPerTurn: false,
      hasSelfEffects: false,
      consumeCustomSpecificsEnabled: false,
      consumeCustomSpecifics: [],
      generateCustomSpecificsEnabled: false,
      generateCustomSpecifics: [],
      immunityEnabled: false,
      immunityTotal: false,
      immunityAnomalies: [],
      immunityDamageEffects: [],
      passiveConditionEnabled: false,
      passiveConditionTypes: [],
      passiveConditionSpecifics: [],
      selfDamageEffects: [],
      percentageDamageEnabled: false,
      percentageDamageEffects: [],
      lotteryEnabled: false,
      damageShape: 'single',
      damagePerSecond: false,
      damagePerSecondIncreasing: false,
      multipleAttacks: false,
      phaseAttack: false,
      chargedAttack: false,
      hasLevelWarning: false,
      percentageRollEnabled: false,
      paInvestmentEnabled: false,
      damageIncreasePerPaEnabled: false,
      successRollIncreasePerPaEnabled: false,
      extraCostEnabled: false,
      extraCostEffectId: null,
      extraCostEffectName: '',
      difficulty: 1,
      noDamageTurnIncreaseEnabled: false,
      launchDelayEnabled: false,
      knockbackEnabled: false,
      hasFailure: false,
      failureDamageEffects: [],
      scaledMoveEnabled: false,
      passiveAnomalyEnabled: false,
      passiveAnomalyAlwaysActive: false,
      removeAnomalyEnabled: false,
      additionalDescription: '',
      story1: '',
      story2: ''
    }
  });

  const { fields: levelFields, replace: replaceLevels } = useFieldArray({
    control,
    name: 'levels'
  });

  const { fields: damageTypeFields, append: appendDamageType, remove: removeDamageType, replace: replaceDamageTypes } = useFieldArray({
    control,
    name: 'damageTypes'
  });

  const { fields: selfDamageEffectFields, append: appendSelfDamageEffect, remove: removeSelfDamageEffect, replace: replaceSelfDamageEffects } = useFieldArray({
    control,
    name: 'selfDamageEffects'
  });

  const { fields: percentageDamageEffectFields, append: appendPercentageDamageEffect, remove: removePercentageDamageEffect, replace: replacePercentageDamageEffects } = useFieldArray({
    control,
    name: 'percentageDamageEffects'
  });

  const { fields: failureDamageEffectFields, append: appendFailureDamageEffect, remove: removeFailureDamageEffect, replace: replaceFailureDamageEffects } = useFieldArray({
    control,
    name: 'failureDamageEffects'
  });

  const { fields: consumeSpecificFields, append: appendConsumeSpecific, remove: removeConsumeSpecific, replace: replaceConsumeSpecifics } = useFieldArray({
    control,
    name: 'consumeCustomSpecifics'
  });

  const { fields: generateSpecificFields, append: appendGenerateSpecific, remove: removeGenerateSpecific, replace: replaceGenerateSpecifics } = useFieldArray({
    control,
    name: 'generateCustomSpecifics'
  });

  const { fields: immunityAnomalyFields, append: appendImmunityAnomaly, remove: removeImmunityAnomaly, replace: replaceImmunityAnomalies } = useFieldArray({
    control,
    name: 'immunityAnomalies'
  });

  const { fields: immunityDamageEffectFields, append: appendImmunityDamageEffect, remove: removeImmunityDamageEffect, replace: replaceImmunityDamageEffects } = useFieldArray({
    control,
    name: 'immunityDamageEffects'
  });

  const { fields: passiveConditionSpecificFields, append: appendPassiveConditionSpecific, remove: removePassiveConditionSpecific, replace: replacePassiveConditionSpecifics } = useFieldArray({
    control,
    name: 'passiveConditionSpecifics'
  });

  const watchedCategory = watch('category');
  const watchedType = watch('type');
  const watchedLevels = watch('levels');
  const watchedDamageTypes = watch('damageTypes');
  const watchedHasTurnDuration = watch('hasTurnDuration');
  const watchedMultipleShots = watch('multipleShots');
  const watchedMultipleShotsIncreasing = watch('multipleShotsIncreasing');
  const watchedHasMaxTargets = watch('hasMaxTargets');
  const watchedUseWeaponDamage = watch('useWeaponDamage');
  const watchedHasUsageInterval = watch('hasUsageInterval');
  const watchedHasMaxUsesPerTurn = watch('hasMaxUsesPerTurn');
  const watchedHasSelfEffects = watch('hasSelfEffects');
  const watchedConsumeCustomSpecificsEnabled = watch('consumeCustomSpecificsEnabled');
  const watchedConsumeCustomSpecifics = watch('consumeCustomSpecifics');
  const watchedGenerateCustomSpecificsEnabled = watch('generateCustomSpecificsEnabled');
  const watchedGenerateCustomSpecifics = watch('generateCustomSpecifics');
  const watchedPassiveConditionEnabled = watch('passiveConditionEnabled');
  const watchedPassiveConditionTypes = watch('passiveConditionTypes');
  const watchedPassiveConditionSpecifics = watch('passiveConditionSpecifics');
  const watchedSelfDamageEffects = watch('selfDamageEffects');
  const watchedPercentageDamageEnabled = watch('percentageDamageEnabled');
  const watchedPercentageDamageEffects = watch('percentageDamageEffects');
  const watchedLotteryEnabled = watch('lotteryEnabled');
  const watchedDamageShape = watch('damageShape');
  const watchedDamagePerSecond = watch('damagePerSecond');
  const watchedDamagePerSecondIncreasing = watch('damagePerSecondIncreasing');
  const watchedMultipleAttacks = watch('multipleAttacks');
  const watchedPhaseAttack = watch('phaseAttack');
  const watchedChargedAttack = watch('chargedAttack');
  const watchedHasLevelWarning = watch('hasLevelWarning');
  const watchedPercentageRollEnabled = watch('percentageRollEnabled');
  const watchedPaInvestmentEnabled = watch('paInvestmentEnabled');
  const watchedDamageIncreasePerPaEnabled = watch('damageIncreasePerPaEnabled');
  const watchedSuccessRollIncreasePerPaEnabled = watch('successRollIncreasePerPaEnabled');
  const watchedExtraCostEnabled = watch('extraCostEnabled');
  const watchedExtraCostEffectId = watch('extraCostEffectId');
  const watchedExtraCostEffectName = watch('extraCostEffectName');
  const watchedNoDamageTurnIncreaseEnabled = watch('noDamageTurnIncreaseEnabled');
  const watchedLaunchDelayEnabled = watch('launchDelayEnabled');
  const watchedKnockbackEnabled = watch('knockbackEnabled');
  const watchedHasFailure = watch('hasFailure');
  const watchedFailureDamageEffects = watch('failureDamageEffects');
  const watchedScaledMoveEnabled = watch('scaledMoveEnabled');
  const watchedPassiveAnomalyEnabled = watch('passiveAnomalyEnabled');
  const watchedPassiveAnomalyAlwaysActive = watch('passiveAnomalyAlwaysActive');
  const watchedRemoveAnomalyEnabled = watch('removeAnomalyEnabled');
  const watchedImmunityEnabled = watch('immunityEnabled');
  const watchedImmunityTotal = watch('immunityTotal');
  const watchedLessHealthMoreDamageEnabled = watch('lessHealthMoreDamageEnabled');
  const watchedConditionalAdditionalDamage = watch('conditionalAdditionalDamage');
  const [levelStatsQueries, setLevelStatsQueries] = useState<Record<number, string>>({});
  const [levelSkillsQueries, setLevelSkillsQueries] = useState<Record<number, string>>({});

  const [damageEffectOptions, setDamageEffectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [damageEffectLoading, setDamageEffectLoading] = useState(false);
  const [anomalyModalItemIndex, setAnomalyModalItemIndex] = useState<number | null>(null);
  const [anomalyOptions, setAnomalyOptions] = useState<string[]>(['Nessuna']);
  const [anomalyOptionsWithId, setAnomalyOptionsWithId] = useState<Array<{ id: string; name: string }>>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  // Funzioni helper
  const getAllCategories = () => {
    return Object.keys(ABILITY_CATEGORIES);
  };

  const getSubcategoriesForCategory = (category: string) => {
    return ABILITY_CATEGORIES[category as keyof typeof ABILITY_CATEGORIES] || [];
  };

  useEffect(() => {
    if (watchedType !== 'Passiva') {
      setValue('passiveAnomalyEnabled', false, { shouldDirty: true });
      setValue('passiveAnomalyAlwaysActive', false, { shouldDirty: true });
      setValue('passiveConditionEnabled', false, { shouldDirty: true });
      setValue('passiveConditionTypes', [], { shouldDirty: true });
      setValue('passiveConditionSpecifics', [], { shouldDirty: true });
    }
  }, [watchedType, setValue]);

  useEffect(() => {
    if (!isOpen) return;
    setSpecificCatalog(readSpecificCatalog());
  }, [isOpen]);

  // Effetto per pre-popolare i campi in modalità modifica
  useEffect(() => {
    if (mode === 'edit' && editAbility) {
      setValue('name', editAbility.name);
      setValue('type', editAbility.type);
      setValue('category', editAbility.category);
      setValue('subcategory', editAbility.subcategory);
      setValue('grade', editAbility.grade);
      setValue('description', editAbility.description);
      setValue('additionalDescription', editAbility.additional_description);
      setValue('story1', editAbility.story1 || '');
      setValue('story2', editAbility.story2 || '');
      const immunityTotal = !!((editAbility as any).immunity_total ?? (editAbility as any).immunityTotal);
      const immunityAnomsRaw = Array.isArray((editAbility as any).immunity_anomalies) ? (editAbility as any).immunity_anomalies : [];
      const immunityEffectsRaw = Array.isArray((editAbility as any).immunity_damage_effects) ? (editAbility as any).immunity_damage_effects : [];
      const immunityAnoms = immunityAnomsRaw.map((a: any) => ({
        id: String(a?.id ?? '').trim(),
        name: String(a?.name ?? a ?? '').trim(),
      })).filter((a: any) => a.id || a.name);
      const immunityEffects = immunityEffectsRaw.map((e: any) => ({
        id: String(e?.id ?? '').trim(),
        name: String(e?.name ?? e ?? '').trim(),
      })).filter((e: any) => e.id || e.name);
      const immunityEnabled = immunityTotal || immunityAnoms.length > 0 || immunityEffects.length > 0;
      setValue('immunityEnabled', immunityEnabled);
      setValue('immunityTotal', immunityTotal);
      replaceImmunityAnomalies(immunityAnoms);
      replaceImmunityDamageEffects(immunityEffects);
      if (editAbility.levels) {
        // sanifica livelli importati
        const imported = (editAbility.levels || []).map((lvl: any) => ({
          level: Number(lvl.level) || 1,
          punti_azione: typeof lvl.punti_azione === 'number' ? lvl.punti_azione : Number(lvl.punti_azione) || 0,
          punti_azione_indicativi: typeof lvl.punti_azione_indicativi === 'number' ? lvl.punti_azione_indicativi : Number(lvl.punti_azione_indicativi) || 0,
          level_description: typeof lvl.level_description === 'string' ? lvl.level_description : (lvl.level_description ?? '').toString(),
          removed_anomalies: Array.isArray((lvl as any)?.removed_anomalies) ? ((lvl as any).removed_anomalies as any[]).map((n: any) => (n ?? '').toString()) : [],
          less_health_more_damage_every_hp: Number((lvl as any)?.less_health_more_damage_every_hp ?? (lvl as any)?.lessHealthMoreDamageEveryHp ?? 0) || 0,
          damage_values: Array.isArray(lvl.damage_values) ? lvl.damage_values.map((dv: any) => ({
            typeName: (dv?.typeName ?? '').toString(),
            guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
            additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
            less_health_more_damage_guaranteed_increment: Number(dv?.less_health_more_damage_guaranteed_increment ?? dv?.lessHealthMoreDamageGuaranteedIncrement ?? 0) || 0,
            less_health_more_damage_additional_increment: Number(dv?.less_health_more_damage_additional_increment ?? dv?.lessHealthMoreDamageAdditionalIncrement ?? 0) || 0,
          })) : [],
          consume_custom_specifics: Array.isArray((lvl as any).consume_custom_specifics)
            ? ((lvl as any).consume_custom_specifics as any[]).map((s: any) => ({
                id: (s?.id ?? '').toString(),
                name: (s?.name ?? '').toString(),
                value: typeof s?.value === 'number' ? s.value : Number(s?.value) || 0,
              }))
            : [],
          generate_custom_specifics: Array.isArray((lvl as any).generate_custom_specifics)
            ? ((lvl as any).generate_custom_specifics as any[]).map((s: any) => ({
                id: (s?.id ?? '').toString(),
                name: (s?.name ?? '').toString(),
                value: typeof s?.value === 'number' ? s.value : Number(s?.value) || 0,
              }))
            : [],
          turn_duration_rounds: typeof lvl.turn_duration_rounds === 'number' ? lvl.turn_duration_rounds : Number(lvl.turn_duration_rounds) || 0,
          max_targets: typeof lvl.max_targets === 'number' ? lvl.max_targets : Number(lvl.max_targets) || 0,
          usage_interval_turns: typeof lvl.usage_interval_turns === 'number' ? lvl.usage_interval_turns : Number(lvl.usage_interval_turns) || 0,
          max_uses_per_turn: typeof (lvl as any).max_uses_per_turn === 'number' ? (lvl as any).max_uses_per_turn : Number((lvl as any).max_uses_per_turn) || 0,
          use_weapon_damage: Boolean(lvl.use_weapon_damage) || false,
          max_projectiles: typeof lvl.max_projectiles === 'number' ? lvl.max_projectiles : Number(lvl.max_projectiles) || 0,
          max_pa_investment: typeof (lvl as any)?.max_pa_investment === 'number' ? (lvl as any).max_pa_investment : Number((lvl as any)?.max_pa_investment) || 0,
          increasing_damage_per_pa: typeof (lvl as any)?.increasing_damage_per_pa === 'number' ? (lvl as any).increasing_damage_per_pa : Number((lvl as any)?.increasing_damage_per_pa) || 0,
          success_roll_increase_every_pa: typeof (lvl as any)?.success_roll_increase_every_pa === 'number'
            ? (lvl as any).success_roll_increase_every_pa
            : Number((lvl as any)?.success_roll_increase_every_pa) || 0,
          self_effect_enabled: Boolean(lvl.self_effect_enabled) || false,
          self_damage_sets: Array.isArray(lvl.self_damage_sets) ? lvl.self_damage_sets.map((s: any) => ({
            effect_name: (s?.effect_name ?? '').toString(),
            guaranteed_damage: typeof s?.guaranteed_damage === 'number' ? s.guaranteed_damage : Number(s?.guaranteed_damage) || 0,
            max_damage: typeof s?.max_damage === 'number' ? s.max_damage : Number(s?.max_damage) || 0,
          })) : [],
          self_anomaly_mode: (String((lvl as any)?.self_anomaly_mode || (lvl as any)?.self?.anomaly?.mode || 'select') === 'custom' ? 'custom' : 'select') as any,
          self_anomaly_name: ((lvl as any)?.self?.anomaly?.name ?? (lvl as any)?.self_anomaly_name ?? 'Nessuna').toString(),
          self_anomaly_description: ((lvl as any)?.self?.anomaly?.description ?? (lvl as any)?.self_anomaly_description ?? '').toString(),
          self_anomaly_turns: Number((lvl as any)?.self?.anomaly?.turns ?? (lvl as any)?.self_anomaly_turns ?? 0) || 0,
          self_anomaly_does_damage: !!((lvl as any)?.self?.anomaly?.doesDamage ?? (lvl as any)?.self_anomaly_does_damage),
          self_anomaly_damage_per_turn: Number((lvl as any)?.self?.anomaly?.damagePerTurn ?? (lvl as any)?.self_anomaly_damage_per_turn ?? 0) || 0,
          self_anomaly_damage_effect_id: ((lvl as any)?.self?.anomaly?.damageEffectId ?? (lvl as any)?.self_anomaly_damage_effect_id ?? null) ? String(((lvl as any)?.self?.anomaly?.damageEffectId ?? (lvl as any)?.self_anomaly_damage_effect_id)) : null,
          self_anomaly_damage_effect_name: ((lvl as any)?.self?.anomaly?.damageEffectName ?? (lvl as any)?.self_anomaly_damage_effect_name ?? '').toString(),
          self_anomaly_action_points_modifier: Number((lvl as any)?.self?.anomaly?.actionPointsModifier ?? (lvl as any)?.self_anomaly_action_points_modifier ?? 0) || 0,
          self_anomaly_health_modifier: Number((lvl as any)?.self?.anomaly?.healthModifier ?? (lvl as any)?.self_anomaly_health_modifier ?? 0) || 0,
          self_anomaly_stats_modifier: (typeof ((lvl as any)?.self?.anomaly?.statsModifier ?? (lvl as any)?.self_anomaly_stats_modifier) === 'object' && ((lvl as any)?.self?.anomaly?.statsModifier ?? (lvl as any)?.self_anomaly_stats_modifier))
            ? ((lvl as any)?.self?.anomaly?.statsModifier ?? (lvl as any)?.self_anomaly_stats_modifier)
            : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
          self_anomalies: Array.isArray((lvl as any)?.self?.anomalies)
            ? ((lvl as any).self.anomalies as any[])
            : (Array.isArray((lvl as any)?.self_anomalies) ? ((lvl as any).self_anomalies as any[]) : []),
          failure_enabled: Boolean(lvl.failure_enabled) || false,
          failure_damage_sets: Array.isArray(lvl.failure_damage_sets) ? lvl.failure_damage_sets.map((s: any) => ({
            effect_name: (s?.effect_name ?? '').toString(),
            guaranteed_damage: Number(s?.guaranteed_damage) || 0,
            max_damage: Number(s?.max_damage) || 0,
            mode: String(s?.mode || 'classic') === 'percentage' ? 'percentage' : 'classic',
            guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
            max_percentage_damage: Number(s?.max_percentage_damage) || 0,
          })) : [],
          failure_anomaly_mode: (String(lvl.failure_anomaly_mode || 'custom') === 'select' ? 'select' : 'custom') as any,
          failure_anomaly_name: (lvl?.failure_anomaly_name ?? '').toString(),
          failure_anomaly_description: (lvl?.failure_anomaly_description ?? '').toString(),
          failure_anomaly_turns: Number(lvl?.failure_anomaly_turns) || 0,
          failure_anomaly_does_damage: Boolean(lvl?.failure_anomaly_does_damage) || false,
          failure_anomaly_damage_per_turn: Number(lvl?.failure_anomaly_damage_per_turn) || 0,
          failure_anomaly_damage_effect_id: (lvl?.failure_anomaly_damage_effect_id ?? null) ? String(lvl.failure_anomaly_damage_effect_id) : null,
          failure_anomaly_damage_effect_name: (lvl?.failure_anomaly_damage_effect_name ?? '').toString(),
          failure_anomaly_action_points_modifier: Number(lvl?.failure_anomaly_action_points_modifier) || 0,
          failure_anomaly_health_modifier: Number(lvl?.failure_anomaly_health_modifier) || 0,
          failure_anomaly_stats_modifier: typeof lvl?.failure_anomaly_stats_modifier === 'object' ? lvl.failure_anomaly_stats_modifier : {},
          failure_anomaly_probability: Number(lvl?.failure_anomaly_probability ?? 100) || 100,
          passive_anomalies: Array.isArray((lvl as any)?.passive_anomalies) ? (lvl as any).passive_anomalies : [],
        }));
        const padded = Array.from({ length: 10 }, (_, idx) => {
          const levelNum = idx + 1;
          const match = imported.find((l: any) => Number(l?.level) === levelNum) ?? imported[idx];
          return match ? { ...createDefaultLevel(levelNum), ...match, level: levelNum } : createDefaultLevel(levelNum);
        });
        replaceLevels(padded);

        try {
          const hasTurnDuration = padded.some((l: any) => Number(l.turn_duration_rounds) > 0);
          const multipleShots = padded.some((l: any) => Number(l.max_projectiles) > 0);
          const multipleShotsIncreasing = padded.some((l: any) => Number(l.increasing_damage_per_projectile) > 0);
          const hasMaxTargets = padded.some((l: any) => Number(l.max_targets) > 0);
          const useWeaponDamage = padded.some((l: any) => !!l.use_weapon_damage);
          const hasUsageInterval = padded.some((l: any) => Number(l.usage_interval_turns) > 0);
          const hasMaxUsesPerTurn = padded.some((l: any) => Number(l.max_uses_per_turn) > 0);
          const hasSelfEffects = padded.some((l: any) =>
            !!l.self_effect_enabled ||
            (Array.isArray(l.self_damage_sets) && l.self_damage_sets.length > 0) ||
            (Array.isArray(l.self_anomalies) && l.self_anomalies.length > 0) ||
            ((l.self_anomaly_name || '').trim().length > 0)
          );
          const percentageDamageEnabled = padded.some((l: any) => Array.isArray(l.percentage_damage_values) && l.percentage_damage_values.length > 0);
          const lotteryEnabled = padded.some((l: any) => !!l.lottery_enabled || Number(l.lottery_dice_faces) > 0 || Number(l.lottery_numeric_choices) > 0);
          const damageShape = (padded.find((l: any) => !!l.damage_shape)?.damage_shape) || 'single';
          const damagePerSecond = padded.some((l: any) => Number(l.max_seconds) > 0);
          const damagePerSecondIncreasing = padded.some((l: any) => Number(l.increasing_damage_per_second) > 0);
          const multipleAttacks = padded.some((l: any) => Number(l.max_multiple_attacks) > 0);
          const phaseAttack = padded.some((l: any) => Array.isArray(l.phases) && l.phases.length > 0);
          const chargedAttack = padded.some((l: any) => Array.isArray(l.grades) && l.grades.length > 0);
          const hasLevelWarning = padded.some((l: any) => ((l.level_warning || '').toString().trim().length > 0));
          const percentageRollEnabled = padded.some((l: any) => Number(l.min_success_percentage) > 0);
          const paInvestmentEnabled = padded.some((l: any) => Number(l.max_pa_investment) > 0);
          const damageIncreasePerPaEnabled = padded.some((l: any) => Number(l.increasing_damage_per_pa) > 0);
          const successRollIncreasePerPaEnabled = padded.some((l: any) => Number(l.success_roll_increase_every_pa) > 0);
          const noDamageTurnIncreaseEnabled = padded.some((l: any) =>
            Array.isArray(l.no_damage_turn_increase_values) &&
            (l.no_damage_turn_increase_values as any[]).some((dv: any) => (Number(dv?.guaranteed_damage) || 0) !== 0 || (Number(dv?.additional_damage) || 0) !== 0)
          );
          const launchDelayEnabled = padded.some((l: any) => Number(l.activation_delay_turns) > 0);
          const knockbackEnabled = padded.some((l: any) => Number(l.knockback_meters) > 0);
          const hasFailure = padded.some((l: any) => !!l.failure_enabled || (Array.isArray(l.failure_damage_sets) && l.failure_damage_sets.length > 0) || ((l.failure_anomaly_name || '').trim().length > 0));
          const scaledMoveEnabled = padded.some((l: any) =>
            (Array.isArray(l.scaled_move_stats) && l.scaled_move_stats.length > 0) ||
            (Array.isArray(l.scaled_move_skills) && l.scaled_move_skills.length > 0)
          );
          const consumeCustomSpecificsEnabled = padded.some((l: any) => Array.isArray((l as any).consume_custom_specifics) && (l as any).consume_custom_specifics.length > 0);
          const generateCustomSpecificsEnabled = padded.some((l: any) => Array.isArray((l as any).generate_custom_specifics) && (l as any).generate_custom_specifics.length > 0);
          const anyPassiveCondition = padded.some((l: any) =>
            Array.isArray((l as any).passive_specific_conditions) &&
            (l as any).passive_specific_conditions.length > 0 &&
            Array.isArray((l as any).passive_condition_types) &&
            (l as any).passive_condition_types.length > 0
          );
          const anyPassiveAnomaly = padded.some((l: any) => Array.isArray(l.passive_anomalies) && l.passive_anomalies.length > 0);
          const anyPassiveAlwaysActive = padded.some((l: any) =>
            Array.isArray(l.passive_anomalies) &&
            (l.passive_anomalies || []).some((a: any) => !!(a?.alwaysActive ?? a?.always_active))
          );
          const anyRemoveAnomaly = padded.some((l: any) => Array.isArray(l.removed_anomalies) && l.removed_anomalies.length > 0);
          const lessHealthMoreDamageEnabled = padded.some((l: any) =>
            Number((l as any)?.less_health_more_damage_every_hp || 0) > 0 ||
            (Array.isArray((l as any)?.damage_values) && ((l as any).damage_values as any[]).some((dv: any) =>
              (Number(dv?.less_health_more_damage_guaranteed_increment || 0) !== 0) ||
              (Number(dv?.less_health_more_damage_additional_increment || 0) !== 0)
            ))
          );

          setValue('hasTurnDuration', hasTurnDuration);
          setValue('multipleShots', multipleShots);
          setValue('multipleShotsIncreasing', multipleShotsIncreasing);
          setValue('hasMaxTargets', hasMaxTargets);
          setValue('useWeaponDamage', useWeaponDamage);
          setValue('hasUsageInterval', hasUsageInterval);
          setValue('hasMaxUsesPerTurn', hasMaxUsesPerTurn);
          setValue('hasSelfEffects', hasSelfEffects);
          setValue('percentageDamageEnabled', percentageDamageEnabled);
          setValue('lotteryEnabled', lotteryEnabled);
          setValue('damageShape', damageShape as any);
          setValue('damagePerSecond', damagePerSecond);
          setValue('damagePerSecondIncreasing', damagePerSecondIncreasing);
          setValue('multipleAttacks', multipleAttacks);
          setValue('phaseAttack', phaseAttack);
          setValue('chargedAttack', chargedAttack);
          setValue('hasLevelWarning', hasLevelWarning);
          setValue('percentageRollEnabled', percentageRollEnabled);
          setValue('paInvestmentEnabled', paInvestmentEnabled);
          setValue('damageIncreasePerPaEnabled', damageIncreasePerPaEnabled);
          setValue('successRollIncreasePerPaEnabled', successRollIncreasePerPaEnabled);
          setValue('noDamageTurnIncreaseEnabled', noDamageTurnIncreaseEnabled);
          setValue('launchDelayEnabled', launchDelayEnabled);
          setValue('knockbackEnabled', knockbackEnabled);
          setValue('hasFailure', hasFailure);
          setValue('scaledMoveEnabled', scaledMoveEnabled);
          setValue('passiveAnomalyEnabled', editAbility.type === 'Passiva' ? anyPassiveAnomaly : false);
          setValue('passiveAnomalyAlwaysActive', (editAbility.type === 'Passiva' && anyPassiveAnomaly) ? anyPassiveAlwaysActive : false);
          setValue('passiveConditionEnabled', editAbility.type === 'Passiva' ? anyPassiveCondition : false);
          setValue('removeAnomalyEnabled', anyRemoveAnomaly);
          setValue('lessHealthMoreDamageEnabled', lessHealthMoreDamageEnabled);
          setValue('consumeCustomSpecificsEnabled', consumeCustomSpecificsEnabled);
          setValue('generateCustomSpecificsEnabled', generateCustomSpecificsEnabled);

          const uniqueDamageTypes = Array.from(new Set(padded.flatMap((l: any) => (Array.isArray(l.damage_values) ? l.damage_values.map((dv: any) => dv.typeName) : [])))).filter(Boolean);
          replaceDamageTypes(uniqueDamageTypes.map((name: string) => ({ name })));

          const uniquePercentEffects = Array.from(new Set(padded.flatMap((l: any) => (Array.isArray(l.percentage_damage_values) ? l.percentage_damage_values.map((dv: any) => dv.typeName) : [])))).filter(Boolean);
          replacePercentageDamageEffects(uniquePercentEffects.map((name: string) => ({ name })));

          const uniqueSelfEffects = Array.from(new Set(padded.flatMap((l: any) => (Array.isArray(l.self_damage_sets) ? l.self_damage_sets.map((s: any) => s.effect_name) : [])))).filter(Boolean);
          replaceSelfDamageEffects(uniqueSelfEffects.map((name: string) => ({ name })));

          const uniqueFailureEffects = Array.from(new Set(padded.flatMap((l: any) => (Array.isArray(l.failure_damage_sets) ? l.failure_damage_sets.map((s: any) => s.effect_name) : [])))).filter(Boolean);
          const modeByName: Record<string, 'classic' | 'percentage'> = {};
          padded.forEach((l: any) => {
            (Array.isArray(l.failure_damage_sets) ? l.failure_damage_sets : []).forEach((s: any) => {
              const nm = (s?.effect_name || '').toString();
              if (!nm) return;
              const m = (String(s?.mode || 'classic') === 'percentage' ? 'percentage' : 'classic') as 'classic' | 'percentage';
              if (!(nm in modeByName)) modeByName[nm] = m;
            });
          });
          replaceFailureDamageEffects(uniqueFailureEffects.map((name: string) => ({ name, mode: modeByName[name] || 'classic' })));

          const consumeSet = new Map<string, { id: string; name: string }>();
          const generateSet = new Map<string, { id: string; name: string }>();
          const passiveSpecificSet = new Map<string, { id: string; name: string; kind: 'classic' | 'custom'; key: string }>();
          const passiveTypeSet = new Set<string>();
          padded.forEach((l: any) => {
            (Array.isArray((l as any).consume_custom_specifics) ? (l as any).consume_custom_specifics : []).forEach((s: any) => {
              const id = (s?.id ?? '').toString();
              const name = (s?.name ?? '').toString();
              if (id || name) consumeSet.set(id || name, { id, name });
            });
            (Array.isArray((l as any).generate_custom_specifics) ? (l as any).generate_custom_specifics : []).forEach((s: any) => {
              const id = (s?.id ?? '').toString();
              const name = (s?.name ?? '').toString();
              if (id || name) generateSet.set(id || name, { id, name });
            });
            (Array.isArray((l as any).passive_condition_types) ? (l as any).passive_condition_types : []).forEach((t: any) => {
              const id = (t ?? '').toString();
              if (id) passiveTypeSet.add(id);
            });
            (Array.isArray((l as any).passive_specific_conditions) ? (l as any).passive_specific_conditions : []).forEach((s: any) => {
              const id = (s?.id ?? '').toString();
              const name = (s?.name ?? '').toString();
              const kind = (s?.kind === 'classic' ? 'classic' : 'custom') as 'classic' | 'custom';
              const key = (s?.key ?? '').toString();
              if (id || name || key) passiveSpecificSet.set(id || key || name, { id, name, kind, key });
            });
          });
          replaceConsumeSpecifics(Array.from(consumeSet.values()));
          replaceGenerateSpecifics(Array.from(generateSet.values()));
          replacePassiveConditionSpecifics(Array.from(passiveSpecificSet.values()));
          setValue('passiveConditionTypes', Array.from(passiveTypeSet.values()), { shouldDirty: false });
        } catch (e) {
          console.warn('Errore impostando flag generali abilità:', e);
        }
      }
    } else {
      reset();
    }
  }, [mode, editAbility, setValue, reset, replaceLevels, replaceDamageTypes, replaceSelfDamageEffects, replacePercentageDamageEffects, replaceFailureDamageEffects, replaceConsumeSpecifics, replaceGenerateSpecifics, replaceImmunityAnomalies, replaceImmunityDamageEffects, replacePassiveConditionSpecifics]);

  // Carica tipi/effetti di danno
  useEffect(() => {
    const loadEffects = async () => {
      setDamageEffectLoading(true);
      try {
        const list = await listDamageEffects();
        setDamageEffectOptions(list || []);
      } catch (e) {
        console.error('Errore nel caricamento effetti danno:', e);
        toast({ title: 'Errore', description: 'Impossibile caricare i tipi di danno', variant: 'destructive' });
        setDamageEffectOptions([]);
      } finally {
        setDamageEffectLoading(false);
      }
    };
    if (isOpen) loadEffects();
  }, [isOpen, toast]);

  useEffect(() => {
    const loadAnoms = async () => {
      setAnomalyLoading(true);
      try {
        const list = await listAnomalies();
        const names = (list || []).map((a: { id: string; name: string }) => a.name).filter(Boolean);
        const uniq = Array.from(new Set(['Nessuna', ...names]));
        setAnomalyOptions(uniq);
        setAnomalyOptionsWithId((list || []).map((a: { id: string; name: string }) => ({ id: String(a.id || ''), name: String(a.name || '') })).filter((a: any) => a.id || a.name));
      } catch (e) {
        console.error('Errore nel caricamento anomalie:', e);
        toast({ title: 'Errore', description: 'Impossibile caricare le anomalie', variant: 'destructive' });
        setAnomalyOptions(['Nessuna']);
        setAnomalyOptionsWithId([]);
      } finally {
        setAnomalyLoading(false);
      }
    };
    if (isOpen) loadAnoms();
  }, [isOpen, toast]);

  useEffect(() => {
    if (watchedRemoveAnomalyEnabled) return;
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((lvl: any, idx) => {
      const curr = Array.isArray(lvl?.removed_anomalies) ? (lvl.removed_anomalies as any[]) : [];
      if (curr.length > 0) {
        setValue(`levels.${idx}.removed_anomalies`, [], { shouldDirty: true });
      }
    });
  }, [watchedRemoveAnomalyEnabled, watchedLevels, setValue]);

  // Se disabiliti "Durata in turni?", azzera valori sui livelli
  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasTurnDuration) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.turn_duration_rounds`, 0, { shouldDirty: true }));
    }
  }, [watchedHasTurnDuration, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedScaledMoveEnabled) {
      lvls.forEach((_, idx) => {
        setValue(`levels.${idx}.scaled_move_stats`, [], { shouldDirty: true });
        setValue(`levels.${idx}.scaled_move_skills`, [], { shouldDirty: true });
      });
    }
  }, [watchedScaledMoveEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedNoDamageTurnIncreaseEnabled) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.no_damage_turn_increase_values`, [], { shouldDirty: true }));
    }
  }, [watchedNoDamageTurnIncreaseEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedLaunchDelayEnabled) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.activation_delay_turns`, 0, { shouldDirty: true }));
    }
  }, [watchedLaunchDelayEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedKnockbackEnabled) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.knockback_meters`, 0, { shouldDirty: true }));
    }
  }, [watchedKnockbackEnabled, watchedLevels, setValue]);

  useEffect(() => {
    if (!watchedPhaseAttack) return;
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    const baseEffects = (Array.isArray(watchedDamageTypes) ? watchedDamageTypes : [])
      .map((t: any) => (t?.name ?? '').toString().trim())
      .filter((n: string) => !!n && n !== 'Nessuna');
    const basePercentEffects = (watchedPercentageDamageEnabled && Array.isArray(watchedPercentageDamageEffects))
      ? watchedPercentageDamageEffects
          .map((t: any) => (t?.name ?? '').toString().trim())
          .filter((n: string) => !!n && n !== 'Nessuna')
      : [];

    lvls.forEach((lvl: any, idx) => {
      const existing = Array.isArray(lvl?.phases) ? (lvl.phases as any[]) : [];
      if (existing.length > 0) return;

      const currDamageValues = Array.isArray(lvl?.damage_values) ? (lvl.damage_values as any[]) : [];
      const damage_values = baseEffects.map((name: string, i: number) => {
        const dv = currDamageValues.find((x: any) => (x?.typeName ?? '').toString() === name) ?? currDamageValues[i];
        return {
          typeName: name,
          guaranteed_damage: Number(dv?.guaranteed_damage) || 0,
          additional_damage: Number(dv?.additional_damage) || 0,
        };
      });

      const currPercentageValues = Array.isArray(lvl?.percentage_damage_values) ? (lvl.percentage_damage_values as any[]) : [];
      const percentage_damage_values = basePercentEffects.map((name: string, i: number) => {
        const dv = currPercentageValues.find((x: any) => (x?.typeName ?? '').toString() === name) ?? currPercentageValues[i];
        return {
          typeName: name,
          guaranteed_percentage_damage: Number(dv?.guaranteed_percentage_damage) || 0,
          additional_percentage_damage: Number(dv?.additional_percentage_damage) || 0,
        };
      });

      const phase1 = {
        enabled: true,
        effects: baseEffects,
        action_cost: Number(lvl?.action_cost ?? lvl?.punti_azione) || 0,
        indicative_action_cost: Number(lvl?.indicative_action_cost ?? lvl?.punti_azione_indicativi) || 0,
        damage_values,
        percentage_damage_values,
        area_or_cone_value: (watchedDamageShape === 'area' || watchedDamageShape === 'cone') ? (Number(lvl?.area_or_cone_value) || 0) : 0,
        chain_targets: watchedDamageShape === 'chain' ? (Number(lvl?.chain_targets) || 1) : 0,
        max_seconds: watchedDamagePerSecond ? (Number(lvl?.max_seconds) || 0) : 0,
        pa_cost_per_second: watchedDamagePerSecond ? (Number(lvl?.pa_cost_per_second) || 0) : 0,
        increasing_damage_per_second: (watchedDamagePerSecond && watchedDamagePerSecondIncreasing) ? (Number(lvl?.increasing_damage_per_second) || 0) : 0,
        max_targets: watchedHasMaxTargets ? (Number(lvl?.max_targets) || 0) : 0,
        usage_interval_turns: watchedHasUsageInterval ? (Number(lvl?.usage_interval_turns) || 0) : 0,
        max_uses_per_turn: watchedHasMaxUsesPerTurn ? (Number(lvl?.max_uses_per_turn) || 0) : 0,
        min_success_percentage: watchedPercentageRollEnabled ? (Number(lvl?.min_success_percentage) || 0) : 0,
        activation_delay_turns: watchedLaunchDelayEnabled ? (Number(lvl?.activation_delay_turns) || 0) : 0,
        knockback_meters: watchedKnockbackEnabled ? (Number(lvl?.knockback_meters) || 0) : 0,
      };

      setValue(`levels.${idx}.phases`, [phase1], { shouldDirty: true });
    });
  }, [
    watchedPhaseAttack,
    watchedLevels,
    watchedDamageTypes,
    watchedPercentageDamageEnabled,
    watchedPercentageDamageEffects,
    watchedDamageShape,
    watchedDamagePerSecond,
    watchedDamagePerSecondIncreasing,
    watchedHasMaxTargets,
    watchedHasUsageInterval,
    watchedHasMaxUsesPerTurn,
    watchedPercentageRollEnabled,
    watchedLaunchDelayEnabled,
    watchedKnockbackEnabled,
    setValue,
  ]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedPhaseAttack) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.phases`, [], { shouldDirty: true }));
    }
  }, [watchedPhaseAttack, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedChargedAttack) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.grades`, [], { shouldDirty: true }));
    }
  }, [watchedChargedAttack, watchedLevels, setValue]);

  // Se disabiliti "Tiri multipli?", azzera proiettili
  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedMultipleShots) {
      lvls.forEach((_, idx) => {
        setValue(`levels.${idx}.max_projectiles`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.increasing_damage_per_projectile`, 0, { shouldDirty: true });
      });
    }
  }, [watchedMultipleShots, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((_, idx) => {
      setValue(`levels.${idx}.damage_shape`, watchedDamageShape, { shouldDirty: true });
    });
  }, [watchedDamageShape, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    const selections = Array.isArray(watchedConsumeCustomSpecifics) ? watchedConsumeCustomSpecifics : [];
    if (!watchedConsumeCustomSpecificsEnabled || selections.length === 0) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.consume_custom_specifics`, [], { shouldDirty: true }));
      return;
    }
    lvls.forEach((lvl: any, idx) => {
      const existing: any[] = Array.isArray((lvl as any)?.consume_custom_specifics) ? ((lvl as any).consume_custom_specifics as any[]) : [];
      const next = selections.map((s: any) => {
        const id = (s?.id ?? '').toString();
        const name = (s?.name ?? '').toString();
        const found = existing.find((e: any) => (e?.id === id) || ((e?.name ?? '') === name)) || {};
        return {
          id,
          name,
          value: typeof found?.value === 'number' ? found.value : Number(found?.value) || 0,
        };
      });
      setValue(`levels.${idx}.consume_custom_specifics`, next, { shouldDirty: true });
    });
  }, [watchedConsumeCustomSpecificsEnabled, watchedConsumeCustomSpecifics, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    const selections = Array.isArray(watchedGenerateCustomSpecifics) ? watchedGenerateCustomSpecifics : [];
    if (!watchedGenerateCustomSpecificsEnabled || selections.length === 0) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.generate_custom_specifics`, [], { shouldDirty: true }));
      return;
    }
    lvls.forEach((lvl: any, idx) => {
      const existing: any[] = Array.isArray((lvl as any)?.generate_custom_specifics) ? ((lvl as any).generate_custom_specifics as any[]) : [];
      const next = selections.map((s: any) => {
        const id = (s?.id ?? '').toString();
        const name = (s?.name ?? '').toString();
        const found = existing.find((e: any) => (e?.id === id) || ((e?.name ?? '') === name)) || {};
        return {
          id,
          name,
          value: typeof found?.value === 'number' ? found.value : Number(found?.value) || 0,
        };
      });
      setValue(`levels.${idx}.generate_custom_specifics`, next, { shouldDirty: true });
    });
  }, [watchedGenerateCustomSpecificsEnabled, watchedGenerateCustomSpecifics, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    const selections = Array.isArray(watchedPassiveConditionSpecifics) ? watchedPassiveConditionSpecifics : [];
    const types = Array.isArray(watchedPassiveConditionTypes) ? watchedPassiveConditionTypes : [];
    if (!watchedPassiveConditionEnabled || selections.length === 0 || types.length === 0) {
      lvls.forEach((_, idx) => {
        setValue(`levels.${idx}.passive_condition_types`, [], { shouldDirty: true });
        setValue(`levels.${idx}.passive_specific_conditions`, [], { shouldDirty: true });
      });
      return;
    }
    lvls.forEach((lvl: any, idx) => {
      const existing: any[] = Array.isArray((lvl as any)?.passive_specific_conditions)
        ? ((lvl as any).passive_specific_conditions as any[])
        : [];
      const next = selections.map((s: any) => {
        const id = (s?.id ?? '').toString();
        const name = (s?.name ?? '').toString();
        const kind = (s?.kind === 'classic' ? 'classic' : 'custom') as 'classic' | 'custom';
        const key = (s?.key ?? '').toString();
        const found = existing.find((e: any) => (e?.id === id) || ((e?.name ?? '') === name) || ((e?.key ?? '') === key)) || {};
        return {
          id,
          name,
          kind,
          key,
          min_percent: typeof found?.min_percent === 'number' ? found.min_percent : Number(found?.min_percent) || 0,
          max_percent: typeof found?.max_percent === 'number' ? found.max_percent : Number(found?.max_percent) || 0,
          min_value: typeof found?.min_value === 'number' ? found.min_value : Number(found?.min_value) || 0,
          max_value: typeof found?.max_value === 'number' ? found.max_value : Number(found?.max_value) || 0,
        };
      });
      setValue(`levels.${idx}.passive_condition_types`, types, { shouldDirty: true });
      setValue(`levels.${idx}.passive_specific_conditions`, next, { shouldDirty: true });
    });
  }, [watchedPassiveConditionEnabled, watchedPassiveConditionTypes, watchedPassiveConditionSpecifics, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedDamagePerSecond) {
      lvls.forEach((_, idx) => {
        setValue(`levels.${idx}.max_seconds`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.pa_cost_per_second`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.increasing_damage_per_second`, 0, { shouldDirty: true });
      });
    }
  }, [watchedDamagePerSecond, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedDamagePerSecondIncreasing) {
      lvls.forEach((_, idx) => {
        setValue(`levels.${idx}.increasing_damage_per_second`, 0, { shouldDirty: true });
      });
    }
  }, [watchedDamagePerSecondIncreasing, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedMultipleShotsIncreasing) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.increasing_damage_per_projectile`, 0, { shouldDirty: true }));
    }
  }, [watchedMultipleShotsIncreasing, watchedLevels, setValue]);

  // Se disabiliti "Quanti bersagli?", azzera max_targets
  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasMaxTargets) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.max_targets`, 0, { shouldDirty: true }));
    }
  }, [watchedHasMaxTargets, watchedLevels, setValue]);

  // Se disabiliti "Utilizzo ogni quanti turni", azzera usage_interval_turns
  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasUsageInterval) {
      lvls.forEach((lvl: any, idx) => {
        setValue(`levels.${idx}.usage_interval_turns`, 0, { shouldDirty: true });
        if (Array.isArray(lvl?.phases) && lvl.phases.length > 0) {
          const nextPhases = (lvl.phases as any[]).map((p) => ({ ...(p || {}), usage_interval_turns: 0 }));
          setValue(`levels.${idx}.phases`, nextPhases, { shouldDirty: true });
        }
        if (Array.isArray(lvl?.grades) && lvl.grades.length > 0) {
          const nextGrades = (lvl.grades as any[]).map((g) => ({ ...(g || {}), usage_interval_turns: 0 }));
          setValue(`levels.${idx}.grades`, nextGrades, { shouldDirty: true });
        }
      });
    }
  }, [watchedHasUsageInterval, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasMaxUsesPerTurn) {
      lvls.forEach((_, idx) => setValue(`levels.${idx}.max_uses_per_turn`, 0, { shouldDirty: true }));
    }
  }, [watchedHasMaxUsesPerTurn, watchedLevels, setValue]);

  useEffect(() => {
    if (watchedPaInvestmentEnabled) return;
    setValue('successRollIncreasePerPaEnabled', false, { shouldDirty: true });
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((_, idx) => {
      setValue(`levels.${idx}.success_roll_increase_every_pa`, 0, { shouldDirty: true });
    });
  }, [watchedPaInvestmentEnabled, watchedLevels, setValue]);

  useEffect(() => {
    if (watchedSuccessRollIncreasePerPaEnabled) return;
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((_, idx) => {
      setValue(`levels.${idx}.success_roll_increase_every_pa`, 0, { shouldDirty: true });
    });
  }, [watchedSuccessRollIncreasePerPaEnabled, watchedLevels, setValue]);

  // Sincronizza flag "Usa anche danno arma" con livelli
  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((_, idx) => setValue(`levels.${idx}.use_weapon_damage`, !!watchedUseWeaponDamage, { shouldDirty: true }));
  }, [watchedUseWeaponDamage, watchedLevels, setValue]);

  // Sincronizza tipi di danno con i livelli
  useEffect(() => {
    const types = Array.isArray(watchedDamageTypes) ? watchedDamageTypes : [];
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((lvl, idx) => {
      const arr = (types || []).map((t) => ({
        typeName: (t?.name ?? '').toString(),
        guaranteed_damage: (lvl?.damage_values?.find((dv: any) => dv.typeName === t?.name)?.guaranteed_damage ?? 0) as number,
        additional_damage: (lvl?.damage_values?.find((dv: any) => dv.typeName === t?.name)?.additional_damage ?? 0) as number,
        less_health_more_damage_guaranteed_increment: (lvl?.damage_values?.find((dv: any) => dv.typeName === t?.name)?.less_health_more_damage_guaranteed_increment ?? 0) as number,
        less_health_more_damage_additional_increment: (lvl?.damage_values?.find((dv: any) => dv.typeName === t?.name)?.less_health_more_damage_additional_increment ?? 0) as number,
      }));
      setValue(`levels.${idx}.damage_values`, arr, { shouldDirty: true });
    });
  }, [watchedDamageTypes, watchedLevels, setValue]);

  useEffect(() => {
    const types = Array.isArray(watchedPercentageDamageEffects) ? watchedPercentageDamageEffects : [];
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((lvl, idx) => {
      const arr = (types || []).map((t) => ({
        typeName: (t?.name ?? '').toString(),
        guaranteed_percentage_damage: (lvl?.percentage_damage_values?.find((dv: any) => dv.typeName === t?.name)?.guaranteed_percentage_damage ?? 0) as number,
        additional_percentage_damage: (lvl?.percentage_damage_values?.find((dv: any) => dv.typeName === t?.name)?.additional_percentage_damage ?? 0) as number,
      }));
      setValue(`levels.${idx}.percentage_damage_values`, arr, { shouldDirty: true });
    });
  }, [watchedPercentageDamageEffects, watchedLevels, setValue]);

  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [anomalyModalKind, setAnomalyModalKind] = useState<'failure' | 'self' | 'passive'>('failure');
  const [anomalyModalLevelIndex, setAnomalyModalLevelIndex] = useState<number | null>(null);
  const [editingAnomaly, setEditingAnomaly] = useState<any | null>(null);

  const openAnomalyModal = (levelIndex: number, kind: 'failure' | 'self' | 'passive', itemIndex: number | null = null) => {
    setAnomalyModalLevelIndex(levelIndex);
    setAnomalyModalKind(kind);
    setAnomalyModalItemIndex((kind === 'passive' || kind === 'self') ? itemIndex : null);
    const level = (Array.isArray(watchedLevels) ? watchedLevels : [])?.[levelIndex];
    if (level) {
      if (kind === 'passive' || kind === 'self') {
        const key = kind === 'passive' ? 'passive_anomalies' : 'self_anomalies';
        const list: any[] = Array.isArray((level as any)?.[key]) ? (((level as any)[key]) as any[]) : [];
        let existing = (itemIndex != null) ? (list[itemIndex] ?? null) : null;
        if (!existing && kind === 'self' && list.length === 0) {
          const name = (level.self_anomaly_name ?? '').toString();
          const description = (level.self_anomaly_description ?? '').toString();
          const turns = Number(level.self_anomaly_turns ?? 0) || 0;
          const doesDamage = !!(level as any).self_anomaly_does_damage;
          const damagePerTurn = Number((level as any).self_anomaly_damage_per_turn ?? 0) || 0;
          const damageEffectId = ((level as any).self_anomaly_damage_effect_id ?? null) as any;
          const damageEffectName = ((level as any).self_anomaly_damage_effect_name ?? '').toString();
          const apMod = Number((level as any).self_anomaly_action_points_modifier ?? 0) || 0;
          const hpMod = Number((level as any).self_anomaly_health_modifier ?? 0) || 0;
          const statsMod = (level as any).self_anomaly_stats_modifier;
          const statsModifier =
            (typeof statsMod === 'object' && statsMod)
              ? statsMod
              : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 };
          const hasStats = Object.values(statsModifier || {}).some((v: any) => Number(v || 0) !== 0);
          const hasLegacy =
            (name && name !== 'Nessuna') ||
            description.trim().length > 0 ||
            turns > 0 ||
            doesDamage ||
            damagePerTurn > 0 ||
            !!damageEffectId ||
            damageEffectName.trim().length > 0 ||
            apMod !== 0 ||
            hpMod !== 0 ||
            hasStats;
          if (hasLegacy) {
            existing = {
              name: name === 'Nessuna' ? '' : name,
              description,
              turns,
              doesDamage,
              damagePerTurn,
              damageEffectId,
              damageEffectName,
              actionPointsModifier: apMod,
              healthModifier: hpMod,
              statsModifier,
            };
          }
        }
        setEditingAnomaly(existing ? { ...existing, name: (existing?.name ?? '').toString() } : null);
        setIsAnomalyModalOpen(true);
        return;
      }
      const name = kind === 'failure' ? level.failure_anomaly_name : level.self_anomaly_name;
      const description = kind === 'failure' ? level.failure_anomaly_description : level.self_anomaly_description;
      const turns = kind === 'failure' ? level.failure_anomaly_turns : level.self_anomaly_turns;
      const doesDamage = kind === 'failure' ? level.failure_anomaly_does_damage : level.self_anomaly_does_damage;
      const damagePerTurn = kind === 'failure' ? level.failure_anomaly_damage_per_turn : level.self_anomaly_damage_per_turn;
      const damageEffectId = kind === 'failure' ? level.failure_anomaly_damage_effect_id : level.self_anomaly_damage_effect_id;
      const damageEffectName = kind === 'failure' ? level.failure_anomaly_damage_effect_name : level.self_anomaly_damage_effect_name;
      const apMod = kind === 'failure' ? (level as any).failure_anomaly_action_points_modifier : (level as any).self_anomaly_action_points_modifier;
      const hpMod = kind === 'failure' ? (level as any).failure_anomaly_health_modifier : (level as any).self_anomaly_health_modifier;
      const statsMod = kind === 'failure' ? (level as any).failure_anomaly_stats_modifier : (level as any).self_anomaly_stats_modifier;
      setEditingAnomaly({
        name: name === 'Nessuna' ? '' : (name || ''),
        description: description || '',
        turns: Number(turns || 0) || 0,
        doesDamage: !!doesDamage,
        damagePerTurn: Number(damagePerTurn) || 0,
        damageEffectId: damageEffectId ?? null,
        damageEffectName: damageEffectName || '',
        actionPointsModifier: Number(apMod || 0) || 0,
        healthModifier: Number(hpMod || 0) || 0,
        statsModifier: typeof statsMod === 'object' && statsMod ? statsMod : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
      });
    } else {
      setEditingAnomaly(null);
    }
    setIsAnomalyModalOpen(true);
  };

  const handleAnomalyClose = () => {
    setIsAnomalyModalOpen(false);
  };

  const handleAnomalySave = (payload: any) => {
    const nameRaw = (payload?.name || '').trim();
    const name = nameRaw || (anomalyModalKind === 'passive' ? 'Anomalia' : 'Nessuna');
    if (anomalyModalLevelIndex != null) {
      const base = `levels.${anomalyModalLevelIndex}.`;
      if (anomalyModalKind === 'passive' || anomalyModalKind === 'self') {
        const key = anomalyModalKind === 'passive' ? 'passive_anomalies' : 'self_anomalies';
        const existing: any[] = Array.isArray((watchedLevels?.[anomalyModalLevelIndex] as any)?.[key])
          ? [ ...(((watchedLevels?.[anomalyModalLevelIndex] as any)?.[key]) as any[]) ]
          : [];
        const nextObj = { ...(payload || {}), name };
        if (anomalyModalItemIndex != null && anomalyModalItemIndex >= 0 && anomalyModalItemIndex < existing.length) {
          existing[anomalyModalItemIndex] = { ...(existing[anomalyModalItemIndex] || {}), ...nextObj };
        } else {
          existing.push(nextObj);
        }
        setValue(`${base}${key}`, existing, { shouldDirty: true });
        if (anomalyModalKind === 'self') {
          setValue('hasSelfEffects', true, { shouldDirty: true });
          setValue(`${base}self_effect_enabled`, true, { shouldDirty: true });
          const first = existing[0] || null;
          if (first) {
            setValue(`${base}self_anomaly_mode`, 'custom', { shouldDirty: true });
            setValue(`${base}self_anomaly_name`, (first?.name ?? 'Nessuna').toString().trim() || 'Nessuna', { shouldDirty: true });
            setValue(`${base}self_anomaly_description`, (first?.description ?? '').toString(), { shouldDirty: true });
            setValue(`${base}self_anomaly_turns`, Number(first?.turns) || 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_does_damage`, !!first?.doesDamage, { shouldDirty: true });
            setValue(`${base}self_anomaly_damage_per_turn`, Number(first?.damagePerTurn) || 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_damage_effect_id`, first?.damageEffectId ?? null, { shouldDirty: true });
            setValue(`${base}self_anomaly_damage_effect_name`, (first?.damageEffectName ?? '').toString(), { shouldDirty: true });
            setValue(`${base}self_anomaly_action_points_modifier`, Number(first?.actionPointsModifier) || 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_health_modifier`, Number(first?.healthModifier) || 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_stats_modifier`, first?.statsModifier || { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 }, { shouldDirty: true });
          } else {
            setValue(`${base}self_anomaly_mode`, 'select', { shouldDirty: true });
            setValue(`${base}self_anomaly_name`, 'Nessuna', { shouldDirty: true });
            setValue(`${base}self_anomaly_description`, '', { shouldDirty: true });
            setValue(`${base}self_anomaly_turns`, 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_does_damage`, false, { shouldDirty: true });
            setValue(`${base}self_anomaly_damage_per_turn`, 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_damage_effect_id`, null, { shouldDirty: true });
            setValue(`${base}self_anomaly_damage_effect_name`, '', { shouldDirty: true });
            setValue(`${base}self_anomaly_action_points_modifier`, 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_health_modifier`, 0, { shouldDirty: true });
            setValue(`${base}self_anomaly_stats_modifier`, { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 }, { shouldDirty: true });
          }
        }
        setIsAnomalyModalOpen(false);
        return;
      }
      if (anomalyModalKind === 'failure') {
        const full = {
          ...(payload || {}),
          id: (payload?.id ?? crypto.randomUUID()).toString(),
          name,
        };
        setValue(`${base}failure_anomaly_mode`, 'custom');
        setValue(`${base}failure_anomaly_name`, name);
        setValue(`${base}failure_anomaly_description`, payload?.description || '');
        setValue(`${base}failure_anomaly_turns`, Number(payload?.turns) || 0);
        setValue(`${base}failure_anomaly_does_damage`, !!payload?.doesDamage);
        setValue(`${base}failure_anomaly_damage_per_turn`, Number(payload?.damagePerTurn) || 0);
        setValue(`${base}failure_anomaly_damage_effect_id`, payload?.damageEffectId ?? null);
        setValue(`${base}failure_anomaly_damage_effect_name`, payload?.damageEffectName || '');
        setValue(`${base}failure_anomaly_action_points_modifier`, Number(payload?.actionPointsModifier) || 0);
        setValue(`${base}failure_anomaly_health_modifier`, Number(payload?.healthModifier) || 0);
        setValue(`${base}failure_anomaly_stats_modifier`, payload?.statsModifier || { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 });
        setValue(`${base}failure_anomaly`, full, { shouldDirty: true });
      } else {
        setValue(`${base}self_anomaly_mode`, 'custom');
        setValue(`${base}self_anomaly_name`, name);
        setValue(`${base}self_anomaly_description`, payload?.description || '');
        setValue(`${base}self_anomaly_turns`, Number(payload?.turns) || 0);
        setValue(`${base}self_anomaly_does_damage`, !!payload?.doesDamage);
        setValue(`${base}self_anomaly_damage_per_turn`, Number(payload?.damagePerTurn) || 0);
        setValue(`${base}self_anomaly_damage_effect_id`, payload?.damageEffectId ?? null);
        setValue(`${base}self_anomaly_damage_effect_name`, payload?.damageEffectName || '');
        setValue(`${base}self_anomaly_action_points_modifier`, Number(payload?.actionPointsModifier) || 0);
        setValue(`${base}self_anomaly_health_modifier`, Number(payload?.healthModifier) || 0);
        setValue(`${base}self_anomaly_stats_modifier`, payload?.statsModifier || { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 });
      }
    }
    setIsAnomalyModalOpen(false);
  };

  // Sincronizza effetti self con i livelli
  useEffect(() => {
    const enabled = !!watchedHasSelfEffects;
    const effects = Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : [];
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((lvl, idx) => {
      setValue(`levels.${idx}.self_effect_enabled`, enabled, { shouldDirty: true });
      const sets = enabled ? (effects || []).map((e) => ({
        effect_name: (e?.name ?? '').toString(),
        guaranteed_damage: (lvl?.self_damage_sets?.find((s: any) => s.effect_name === e?.name)?.guaranteed_damage ?? 0) as number,
        max_damage: (lvl?.self_damage_sets?.find((s: any) => s.effect_name === e?.name)?.max_damage ?? 0) as number,
      })) : [];
      setValue(`levels.${idx}.self_damage_sets`, sets, { shouldDirty: true });
    });
  }, [watchedHasSelfEffects, watchedSelfDamageEffects, watchedLevels, setValue]);

  // Sincronizza flag di fallimento con i livelli
  useEffect(() => {
    const enabled = !!watchedHasFailure;
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((_, idx) => {
      setValue(`levels.${idx}.failure_enabled`, enabled, { shouldDirty: true });
    });
  }, [watchedHasFailure, watchedLevels, setValue]);

  useEffect(() => {
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (watchedType !== 'Passiva' || !watchedPassiveAnomalyEnabled) {
      setValue('passiveAnomalyAlwaysActive', false, { shouldDirty: true });
      lvls.forEach((_, idx) => {
        setValue(`levels.${idx}.passive_anomalies`, [], { shouldDirty: true });
      });
    }
  }, [watchedPassiveAnomalyAlwaysActive, watchedPassiveAnomalyEnabled, watchedType, watchedLevels, setValue]);

  // Sincronizza tombola con i livelli
  useEffect(() => {
    const enabled = !!watchedLotteryEnabled;
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((_, idx) => {
      setValue(`levels.${idx}.lottery_enabled`, enabled, { shouldDirty: true });
      if (!enabled) {
        setValue(`levels.${idx}.lottery_dice_faces`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.lottery_numeric_choices`, 0, { shouldDirty: true });
      }
    });
  }, [watchedLotteryEnabled, watchedLevels, setValue]);

  useEffect(() => {
    if (watchedLessHealthMoreDamageEnabled) return;
    const lvls = Array.isArray(watchedLevels) ? watchedLevels : [];
    lvls.forEach((lvl: any, idx) => {
      setValue(`levels.${idx}.less_health_more_damage_every_hp`, 0, { shouldDirty: true });
      const current = Array.isArray(lvl?.damage_values) ? (lvl.damage_values as any[]) : [];
      if (current.length === 0) return;
      const next = current.map((dv: any) => ({
        ...dv,
        less_health_more_damage_guaranteed_increment: 0,
        less_health_more_damage_additional_increment: 0,
      }));
      setValue(`levels.${idx}.damage_values`, next, { shouldDirty: true });
    });
  }, [watchedLessHealthMoreDamageEnabled, watchedLevels, setValue]);

  const onSubmit = async (data: AbilityFormData) => {
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per aggiungere un'abilità",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Sanifica livelli in base ai flag generali
      const sanitizedLevels = (Array.isArray(data.levels) ? data.levels : []).map((lvl) => ({
        level: Number((lvl as any)?.level) || 1,
        punti_azione: Number((lvl as any)?.punti_azione) || 0,
        punti_azione_indicativi: Number((lvl as any)?.punti_azione_indicativi) || 0,
        level_description: ((lvl as any)?.level_description ?? '').toString(),
        removed_anomalies: data.removeAnomalyEnabled
          ? Array.from(
              new Set(
                (Array.isArray((lvl as any)?.removed_anomalies) ? (lvl as any).removed_anomalies : [])
                  .map((n: any) => (n ?? '').toString().trim())
                  .filter((n: string) => !!n && n !== 'Nessuna')
              )
            )
          : [],
        damage_values: (Array.isArray((lvl as any)?.damage_values) ? (lvl as any).damage_values : [])
          .filter((dv: any) => (dv?.typeName ?? '').toString().trim().length > 0)
          .map((dv: any) => ({
            typeName: (dv?.typeName ?? '').toString(),
            guaranteed_damage: Number(dv?.guaranteed_damage) || 0,
            additional_damage: Number(dv?.additional_damage) || 0,
            less_health_more_damage_guaranteed_increment: data.lessHealthMoreDamageEnabled ? (Number(dv?.less_health_more_damage_guaranteed_increment) || 0) : 0,
            less_health_more_damage_additional_increment: data.lessHealthMoreDamageEnabled ? (Number(dv?.less_health_more_damage_additional_increment) || 0) : 0,
          })),
        less_health_more_damage_every_hp: data.lessHealthMoreDamageEnabled ? (Number((lvl as any)?.less_health_more_damage_every_hp) || 0) : 0,
        percentage_damage_values: data.percentageDamageEnabled
          ? ((Array.isArray((lvl as any)?.percentage_damage_values) ? (lvl as any).percentage_damage_values : [])
              .filter((dv: any) => (dv?.typeName ?? '').toString().trim().length > 0)
              .map((dv: any) => ({
                typeName: (dv?.typeName ?? '').toString(),
                guaranteed_percentage_damage: Number(dv?.guaranteed_percentage_damage) || 0,
                additional_percentage_damage: Number(dv?.additional_percentage_damage) || 0,
              })))
          : [],
        damage_shape: data.damageShape,
        area_or_cone_value: Number((lvl as any)?.area_or_cone_value) || 0,
        chain_targets: Number((lvl as any)?.chain_targets) || 0,
        max_seconds: data.damagePerSecond ? (Number((lvl as any)?.max_seconds) || 0) : 0,
        pa_cost_per_second: data.damagePerSecond ? (Number((lvl as any)?.pa_cost_per_second) || 0) : 0,
        increasing_damage_per_second: (data.damagePerSecond && data.damagePerSecondIncreasing) ? (Number((lvl as any)?.increasing_damage_per_second) || 0) : 0,
        turn_duration_rounds: data.hasTurnDuration ? (Number((lvl as any)?.turn_duration_rounds) || 0) : 0,
        max_targets: data.hasMaxTargets ? (Number((lvl as any)?.max_targets) || 0) : 0,
        usage_interval_turns: data.hasUsageInterval ? (Number((lvl as any)?.usage_interval_turns) || 0) : 0,
        max_uses_per_turn: data.hasMaxUsesPerTurn ? (Number((lvl as any)?.max_uses_per_turn) || 0) : 0,
        use_weapon_damage: !!data.useWeaponDamage,
        max_projectiles: data.multipleShots ? (Number((lvl as any)?.max_projectiles) || 0) : 0,
        increasing_damage_per_projectile: (data.multipleShots && data.multipleShotsIncreasing) ? (Number((lvl as any)?.increasing_damage_per_projectile) || 0) : 0,
        max_multiple_attacks: data.multipleAttacks ? (Number((lvl as any)?.max_multiple_attacks) || 0) : 0,
        min_success_percentage: data.percentageRollEnabled ? (Number((lvl as any)?.min_success_percentage) || 0) : 0,
        level_warning: data.hasLevelWarning ? (((lvl as any)?.level_warning ?? '').toString()) : '',
        scaled_move_stats: data.scaledMoveEnabled ? (Array.isArray((lvl as any)?.scaled_move_stats) ? (lvl as any).scaled_move_stats : []) : [],
        scaled_move_skills: data.scaledMoveEnabled ? (Array.isArray((lvl as any)?.scaled_move_skills) ? (lvl as any).scaled_move_skills : []) : [],
        max_pa_investment: data.paInvestmentEnabled ? (Number((lvl as any)?.max_pa_investment) || 0) : 0,
        increasing_damage_per_pa: (data.paInvestmentEnabled && data.damageIncreasePerPaEnabled) ? (Number((lvl as any)?.increasing_damage_per_pa) || 0) : 0,
        success_roll_increase_every_pa: (data.paInvestmentEnabled && data.successRollIncreasePerPaEnabled) ? (Number((lvl as any)?.success_roll_increase_every_pa) || 0) : 0,
        consume_custom_specifics: (data as any).consumeCustomSpecificsEnabled
          ? (Array.isArray((lvl as any)?.consume_custom_specifics) ? (lvl as any).consume_custom_specifics : [])
              .filter((s: any) => ((s?.id ?? '').toString().trim().length > 0) || ((s?.name ?? '').toString().trim().length > 0))
              .map((s: any) => ({
                id: (s?.id ?? '').toString(),
                name: (s?.name ?? '').toString(),
                value: typeof s?.value === 'number' ? s.value : Number(s?.value) || 0,
              }))
          : [],
        generate_custom_specifics: (data as any).generateCustomSpecificsEnabled
          ? (Array.isArray((lvl as any)?.generate_custom_specifics) ? (lvl as any).generate_custom_specifics : [])
              .filter((s: any) => ((s?.id ?? '').toString().trim().length > 0) || ((s?.name ?? '').toString().trim().length > 0))
              .map((s: any) => ({
                id: (s?.id ?? '').toString(),
                name: (s?.name ?? '').toString(),
                value: typeof s?.value === 'number' ? s.value : Number(s?.value) || 0,
              }))
          : [],
        passive_condition_types: (data as any).passiveConditionEnabled
          ? (Array.isArray((lvl as any)?.passive_condition_types) ? (lvl as any).passive_condition_types : [])
              .map((t: any) => (t ?? '').toString().trim())
              .filter((t: string) => !!t)
          : [],
        passive_specific_conditions: (data as any).passiveConditionEnabled
          ? (Array.isArray((lvl as any)?.passive_specific_conditions) ? (lvl as any).passive_specific_conditions : [])
              .filter((s: any) => ((s?.id ?? '').toString().trim().length > 0) || ((s?.name ?? '').toString().trim().length > 0) || ((s?.key ?? '').toString().trim().length > 0))
              .map((s: any) => ({
                id: (s?.id ?? '').toString(),
                name: (s?.name ?? '').toString(),
                kind: (s?.kind === 'classic' ? 'classic' : 'custom') as 'classic' | 'custom',
                key: (s?.key ?? '').toString(),
                min_percent: typeof s?.min_percent === 'number' ? s.min_percent : Number(s?.min_percent) || 0,
                max_percent: typeof s?.max_percent === 'number' ? s.max_percent : Number(s?.max_percent) || 0,
                min_value: typeof s?.min_value === 'number' ? s.min_value : Number(s?.min_value) || 0,
                max_value: typeof s?.max_value === 'number' ? s.max_value : Number(s?.max_value) || 0,
              }))
          : [],
        lottery_enabled: !!data.lotteryEnabled,
        lottery_dice_faces: data.lotteryEnabled ? (Number((lvl as any)?.lottery_dice_faces) || 0) : 0,
        lottery_numeric_choices: data.lotteryEnabled ? (Number((lvl as any)?.lottery_numeric_choices) || 0) : 0,
        self_effect_enabled: !!data.hasSelfEffects,
        self_damage_sets: data.hasSelfEffects
          ? (Array.isArray((lvl as any)?.self_damage_sets) ? (lvl as any).self_damage_sets : [])
              .filter((s: any) => (s?.effect_name ?? '').toString().trim().length > 0)
              .map((s: any) => ({
                effect_name: (s?.effect_name ?? '').toString(),
                guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                max_damage: Number(s?.max_damage) || 0,
              }))
          : []
        ,
        self_anomaly_mode: (lvl as any)?.self_anomaly_mode || 'custom',
        self_anomaly_name: ((lvl as any)?.self_anomaly_name ?? '').toString(),
        self_anomaly_description: ((lvl as any)?.self_anomaly_description ?? '').toString(),
        self_anomaly_turns: Number((lvl as any)?.self_anomaly_turns) || 0,
        self_anomaly_does_damage: !!(lvl as any)?.self_anomaly_does_damage,
        self_anomaly_damage_per_turn: Number((lvl as any)?.self_anomaly_damage_per_turn) || 0,
        self_anomaly_damage_effect_id: (lvl as any)?.self_anomaly_damage_effect_id ?? null,
        self_anomaly_damage_effect_name: ((lvl as any)?.self_anomaly_damage_effect_name ?? '').toString(),
        self_anomaly_action_points_modifier: Number((lvl as any)?.self_anomaly_action_points_modifier) || 0,
        self_anomaly_health_modifier: Number((lvl as any)?.self_anomaly_health_modifier) || 0,
        self_anomaly_stats_modifier: typeof (lvl as any)?.self_anomaly_stats_modifier === 'object' ? (lvl as any).self_anomaly_stats_modifier : {},
        self_anomalies: data.hasSelfEffects
          ? (Array.isArray((lvl as any)?.self_anomalies) ? (lvl as any).self_anomalies : []).map((a: any) => ({
              id: (a?.id ?? crypto.randomUUID()).toString(),
              name: (a?.name ?? 'Anomalia').toString().trim() || 'Anomalia',
              description: (a?.description ?? '').toString(),
              turns: Number(a?.turns) || 0,
              doesDamage: !!(a?.doesDamage ?? a?.does_damage),
              damagePerTurn: Number(a?.damagePerTurn ?? a?.damage_per_turn) || 0,
              damageEffectId: a?.damageEffectId ?? a?.damage_effect_id ?? null,
              damageEffectName: (a?.damageEffectName ?? a?.damage_effect_name ?? '').toString(),
              damageBonusEnabled: !!(a?.damageBonusEnabled ?? a?.damage_bonus_enabled),
              damageBonus: (a?.damageBonus ?? a?.damage_bonus) || undefined,
              damageReductionEnabled: !!(a?.damageReductionEnabled ?? a?.damage_reduction_enabled),
              damageReduction: (a?.damageReduction ?? a?.damage_reduction) || undefined,
              weaknessEnabled: !!(a?.weaknessEnabled ?? a?.weakness_enabled),
              weakness: (a?.weakness ?? a?.weakness_config) || undefined,
              paDiscountEnabled: !!(a?.paDiscountEnabled ?? a?.pa_discount_enabled),
              paDiscount: (a?.paDiscount ?? a?.pa_discount) || undefined,
              actionPointsModifier: Number(a?.actionPointsModifier ?? a?.action_points_modifier) || 0,
              healthModifier: Number(a?.healthModifier ?? a?.health_modifier) || 0,
              armorModifier: Number(a?.armorModifier ?? a?.armor_modifier) || 0,
              statsModifier: (typeof (a?.statsModifier ?? a?.stats_modifier) === 'object' && (a?.statsModifier ?? a?.stats_modifier))
                ? (a?.statsModifier ?? a?.stats_modifier)
                : {},
              alwaysActive: !!(a?.alwaysActive ?? a?.always_active),
              sourceType: (a?.sourceType ?? a?.source_type) || undefined,
              sourceId: (a?.sourceId ?? a?.source_id) || undefined,
            }))
          : [],
        failure_anomaly: (() => {
          const raw = (lvl as any)?.failure_anomaly;
          const baseObj = (typeof raw === 'object' && raw) ? raw : {};
          const name = ((lvl as any)?.failure_anomaly_name ?? (baseObj as any)?.name ?? '').toString().trim();
          const damageBonusEnabled = !!(((baseObj as any)?.damageBonusEnabled ?? (baseObj as any)?.damage_bonus_enabled) as any);
          const damageBonus = (((baseObj as any)?.damageBonus ?? (baseObj as any)?.damage_bonus) as any) || undefined;
          const damageReductionEnabled = !!(((baseObj as any)?.damageReductionEnabled ?? (baseObj as any)?.damage_reduction_enabled) as any);
          const damageReduction = (((baseObj as any)?.damageReduction ?? (baseObj as any)?.damage_reduction) as any) || undefined;
          const weaknessEnabled = !!(((baseObj as any)?.weaknessEnabled ?? (baseObj as any)?.weakness_enabled) as any);
          const weakness = (((baseObj as any)?.weakness ?? (baseObj as any)?.weakness_config) as any) || undefined;
          const paDiscountEnabled = !!(((baseObj as any)?.paDiscountEnabled ?? (baseObj as any)?.pa_discount_enabled) as any);
          const paDiscount = (((baseObj as any)?.paDiscount ?? (baseObj as any)?.pa_discount) as any) || undefined;
          if (!data.hasFailure) return undefined;
          return {
            ...baseObj,
            id: (((baseObj as any)?.id ?? crypto.randomUUID()) as any).toString(),
            mode: ((lvl as any)?.failure_anomaly_mode ?? (baseObj as any)?.mode ?? 'custom') as any,
            name: name || 'Nessuna',
            description: ((lvl as any)?.failure_anomaly_description ?? (baseObj as any)?.description ?? '').toString(),
            turns: Number((lvl as any)?.failure_anomaly_turns ?? (baseObj as any)?.turns) || 0,
            doesDamage: !!((lvl as any)?.failure_anomaly_does_damage ?? (baseObj as any)?.doesDamage ?? (baseObj as any)?.does_damage),
            damagePerTurn: Number((lvl as any)?.failure_anomaly_damage_per_turn ?? (baseObj as any)?.damagePerTurn ?? (baseObj as any)?.damage_per_turn) || 0,
            damageEffectId: (lvl as any)?.failure_anomaly_damage_effect_id ?? (baseObj as any)?.damageEffectId ?? (baseObj as any)?.damage_effect_id ?? null,
            damageEffectName: ((lvl as any)?.failure_anomaly_damage_effect_name ?? (baseObj as any)?.damageEffectName ?? (baseObj as any)?.damage_effect_name ?? '').toString(),
            actionPointsModifier: Number((lvl as any)?.failure_anomaly_action_points_modifier ?? (baseObj as any)?.actionPointsModifier ?? (baseObj as any)?.action_points_modifier) || 0,
            healthModifier: Number((lvl as any)?.failure_anomaly_health_modifier ?? (baseObj as any)?.healthModifier ?? (baseObj as any)?.health_modifier) || 0,
            armorModifier: Number((baseObj as any)?.armorModifier ?? (baseObj as any)?.armor_modifier) || 0,
            statsModifier: (typeof ((lvl as any)?.failure_anomaly_stats_modifier ?? (baseObj as any)?.statsModifier ?? (baseObj as any)?.stats_modifier) === 'object' &&
              ((lvl as any)?.failure_anomaly_stats_modifier ?? (baseObj as any)?.statsModifier ?? (baseObj as any)?.stats_modifier))
              ? ((lvl as any)?.failure_anomaly_stats_modifier ?? (baseObj as any)?.statsModifier ?? (baseObj as any)?.stats_modifier)
              : {},
            probability: Number((lvl as any)?.failure_anomaly_probability ?? (baseObj as any)?.probability) || 0,
            damageBonusEnabled,
            damageBonus,
            damageReductionEnabled,
            damageReduction,
            weaknessEnabled,
            weakness,
            paDiscountEnabled,
            paDiscount,
          };
        })(),
        failure_enabled: !!data.hasFailure,
        failure_damage_sets: data.hasFailure
          ? (Array.isArray((lvl as any)?.failure_damage_sets) ? (lvl as any).failure_damage_sets : [])
              .filter((s: any) => (s?.effect_name ?? '').toString().trim().length > 0)
              .map((s: any) => ({
                effect_name: (s?.effect_name ?? '').toString(),
                guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                max_damage: Number(s?.max_damage) || 0,
                mode: (s?.mode === 'percentage' ? 'percentage' : 'classic') as 'classic' | 'percentage',
                guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
                max_percentage_damage: Number(s?.max_percentage_damage) || 0,
              }))
          : [],
        failure_anomaly_mode: (lvl as any)?.failure_anomaly_mode || 'custom',
        failure_anomaly_name: ((lvl as any)?.failure_anomaly_name ?? '').toString(),
        failure_anomaly_description: ((lvl as any)?.failure_anomaly_description ?? '').toString(),
        failure_anomaly_turns: Number((lvl as any)?.failure_anomaly_turns) || 0,
        failure_anomaly_does_damage: !!(lvl as any)?.failure_anomaly_does_damage,
        failure_anomaly_damage_per_turn: Number((lvl as any)?.failure_anomaly_damage_per_turn) || 0,
        failure_anomaly_damage_effect_id: (lvl as any)?.failure_anomaly_damage_effect_id ?? null,
        failure_anomaly_damage_effect_name: ((lvl as any)?.failure_anomaly_damage_effect_name ?? '').toString(),
        failure_anomaly_action_points_modifier: Number((lvl as any)?.failure_anomaly_action_points_modifier) || 0,
        failure_anomaly_health_modifier: Number((lvl as any)?.failure_anomaly_health_modifier) || 0,
        failure_anomaly_stats_modifier: typeof (lvl as any)?.failure_anomaly_stats_modifier === 'object' ? (lvl as any).failure_anomaly_stats_modifier : {},
        failure_anomaly_probability: data.hasFailure ? (Number((lvl as any)?.failure_anomaly_probability) || 0) : 0,
        passive_anomalies: (data.type === 'Passiva' && !!data.passiveAnomalyEnabled)
          ? (Array.isArray((lvl as any)?.passive_anomalies) ? (lvl as any).passive_anomalies : []).map((a: any) => ({
              id: (a?.id ?? crypto.randomUUID()).toString(),
              name: (a?.name ?? 'Anomalia').toString().trim() || 'Anomalia',
              description: (a?.description ?? '').toString(),
              turns: Number(a?.turns) || 0,
              doesDamage: !!(a?.doesDamage ?? a?.does_damage),
              damagePerTurn: Number(a?.damagePerTurn ?? a?.damage_per_turn) || 0,
              damageEffectId: a?.damageEffectId ?? a?.damage_effect_id ?? null,
              damageEffectName: (a?.damageEffectName ?? a?.damage_effect_name ?? '').toString(),
              damageBonusEnabled: !!(a?.damageBonusEnabled ?? a?.damage_bonus_enabled),
              damageBonus: (a?.damageBonus ?? a?.damage_bonus) || undefined,
              paDiscountEnabled: !!(a?.paDiscountEnabled ?? a?.pa_discount_enabled),
              paDiscount: (a?.paDiscount ?? a?.pa_discount) || undefined,
              damageReductionEnabled: !!(a?.damageReductionEnabled ?? a?.damage_reduction_enabled),
              damageReduction: (a?.damageReduction ?? a?.damage_reduction) || undefined,
              weaknessEnabled: !!(a?.weaknessEnabled ?? a?.weakness_enabled),
              weakness: (a?.weakness ?? a?.weakness_config) || undefined,
              actionPointsModifier: Number(a?.actionPointsModifier ?? a?.action_points_modifier) || 0,
              healthModifier: Number(a?.healthModifier ?? a?.health_modifier) || 0,
              armorModifier: Number(a?.armorModifier ?? a?.armor_modifier) || 0,
              statsModifier: (typeof (a?.statsModifier ?? a?.stats_modifier) === 'object' && (a?.statsModifier ?? a?.stats_modifier))
                ? (a?.statsModifier ?? a?.stats_modifier)
                : {},
              alwaysActive: !!(data as any).passiveAnomalyAlwaysActive,
              sourceType: (a?.sourceType ?? a?.source_type) || undefined,
              sourceId: (a?.sourceId ?? a?.source_id) || undefined,
            }))
          : [],
        phases: (!data.lotteryEnabled && !!data.phaseAttack)
          ? (Array.isArray((lvl as any)?.phases) ? (lvl as any).phases : []).map((p: any) => ({
              enabled: p?.enabled !== false,
              effects: Array.from(new Set((Array.isArray(p?.effects) ? p.effects : [])
                .map((n: any) => (n ?? '').toString().trim())
                .filter((n: string) => !!n && n !== 'Nessuna'))),
              action_cost: Number(p?.action_cost) || 0,
              indicative_action_cost: Number(p?.indicative_action_cost) || 0,
              damage_values: (Array.isArray(p?.damage_values) ? p.damage_values : [])
                .filter((dv: any) => (dv?.typeName ?? '').toString().trim().length > 0)
                .map((dv: any) => ({
                  typeName: (dv?.typeName ?? '').toString(),
                  guaranteed_damage: Number(dv?.guaranteed_damage) || 0,
                  additional_damage: Number(dv?.additional_damage) || 0,
                })),
              percentage_damage_values: data.percentageDamageEnabled
                ? ((Array.isArray(p?.percentage_damage_values) ? p.percentage_damage_values : [])
                    .filter((dv: any) => (dv?.typeName ?? '').toString().trim().length > 0)
                    .map((dv: any) => ({
                      typeName: (dv?.typeName ?? '').toString(),
                      guaranteed_percentage_damage: Number(dv?.guaranteed_percentage_damage) || 0,
                      additional_percentage_damage: Number(dv?.additional_percentage_damage) || 0,
                    })))
                : [],
              area_or_cone_value: (data.damageShape === 'area' || data.damageShape === 'cone') ? (Number(p?.area_or_cone_value) || 0) : 0,
              chain_targets: data.damageShape === 'chain' ? (Number(p?.chain_targets) || 1) : 0,
              max_seconds: data.damagePerSecond ? (Number(p?.max_seconds) || 0) : 0,
              pa_cost_per_second: data.damagePerSecond ? (Number(p?.pa_cost_per_second) || 0) : 0,
              increasing_damage_per_second: (data.damagePerSecond && data.damagePerSecondIncreasing) ? (Number(p?.increasing_damage_per_second) || 0) : 0,
              max_targets: data.hasMaxTargets ? (Number(p?.max_targets) || 0) : 0,
              usage_interval_turns: data.hasUsageInterval ? (Number(p?.usage_interval_turns) || 0) : 0,
              max_uses_per_turn: data.hasMaxUsesPerTurn ? (Number(p?.max_uses_per_turn) || 0) : 0,
              min_success_percentage: data.percentageRollEnabled ? (Number(p?.min_success_percentage) || 0) : 0,
              activation_delay_turns: data.launchDelayEnabled ? (Number(p?.activation_delay_turns) || 0) : 0,
              knockback_meters: data.knockbackEnabled ? (Number(p?.knockback_meters) || 0) : 0,
            }))
          : [],
        grades: (!data.lotteryEnabled && !!data.chargedAttack)
          ? (Array.isArray((lvl as any)?.grades) ? (lvl as any).grades : []).map((g: any, i: number) => ({
              grade_number: Number(g?.grade_number) || i + 2,
              action_cost: Number(g?.action_cost) || 0,
              indicative_action_cost: Number(g?.indicative_action_cost) || 0,
              usage_interval_turns: data.hasUsageInterval ? (Number(g?.usage_interval_turns) || 0) : 0,
              damage_values: (Array.isArray(g?.damage_values) ? g.damage_values : [])
                .filter((dv: any) => (dv?.typeName ?? '').toString().trim().length > 0)
                .map((dv: any) => ({
                  typeName: (dv?.typeName ?? '').toString(),
                  guaranteed_damage: Number(dv?.guaranteed_damage) || 0,
                  additional_damage: Number(dv?.additional_damage) || 0,
                })),
              percentage_damage_values: data.percentageDamageEnabled
                ? ((Array.isArray(g?.percentage_damage_values) ? g.percentage_damage_values : [])
                    .filter((dv: any) => (dv?.typeName ?? '').toString().trim().length > 0)
                    .map((dv: any) => ({
                      typeName: (dv?.typeName ?? '').toString(),
                      guaranteed_percentage_damage: Number(dv?.guaranteed_percentage_damage) || 0,
                      additional_percentage_damage: Number(dv?.additional_percentage_damage) || 0,
                    })))
                : [],
              area_or_cone_value: (data.damageShape === 'area' || data.damageShape === 'cone') ? (Number(g?.area_or_cone_value) || 0) : 0,
              chain_targets: data.damageShape === 'chain' ? (Number(g?.chain_targets) || 1) : 0,
              max_seconds: data.damagePerSecond ? (Number(g?.max_seconds) || 0) : 0,
              pa_cost_per_second: data.damagePerSecond ? (Number(g?.pa_cost_per_second) || 0) : 0,
              increasing_damage_per_second: (data.damagePerSecond && data.damagePerSecondIncreasing) ? (Number(g?.increasing_damage_per_second) || 0) : 0,
            }))
          : [],
      })).map(pruneAbilityLevelPayload);

      const aggregateSpecifics = (levels: any[], key: string) => {
        const map = new Map<string, { id: string; name: string; value: number }>();
        (Array.isArray(levels) ? levels : []).forEach((lvl) => {
          const list = Array.isArray((lvl as any)?.[key]) ? (lvl as any)[key] : [];
          list.forEach((s: any) => {
            const id = String(s?.id ?? '').trim();
            const name = String(s?.name ?? '').trim();
            const mapKey = id || name;
            if (!mapKey) return;
            const value = Number(s?.value) || 0;
            const prev = map.get(mapKey);
            map.set(mapKey, {
              id: id || (prev?.id ?? ''),
              name: name || (prev?.name ?? ''),
              value: Math.max(Number(prev?.value) || 0, value),
            });
          });
        });
        return Array.from(map.values());
      };
      const aggregatedConsumeSpecifics = aggregateSpecifics(sanitizedLevels, 'consume_custom_specifics');
      const aggregatedGenerateSpecifics = aggregateSpecifics(sanitizedLevels, 'generate_custom_specifics');
      const immunityTotal = data.immunityEnabled ? !!data.immunityTotal : false;
      const immunityAnomalies = data.immunityEnabled && !immunityTotal
        ? (Array.isArray(data.immunityAnomalies) ? data.immunityAnomalies : []).map((a) => ({
            id: String((a as any)?.id ?? '').trim(),
            name: String((a as any)?.name ?? '').trim(),
          })).filter((a: any) => a.id || a.name)
        : [];
      const immunityDamageEffects = data.immunityEnabled && !immunityTotal
        ? (Array.isArray(data.immunityDamageEffects) ? data.immunityDamageEffects : []).map((e) => ({
            id: String((e as any)?.id ?? '').trim(),
            name: String((e as any)?.name ?? '').trim(),
          })).filter((e: any) => e.id || e.name)
        : [];

      const safeTrim = (v: any) => String(v ?? '').trim();
      const abilityPayload = {
        name: safeTrim(data.name),
        type: data.type,
        category: data.category,
        subcategory: data.subcategory,
        grade: data.grade,
        description: safeTrim(data.description),
        additional_description: safeTrim(data.additionalDescription),
        story_1: safeTrim(data.story1) || null,
        story_2: safeTrim(data.story2) || null,
        levels: sanitizedLevels,
        ...(aggregatedConsumeSpecifics.length > 0 ? { consume_custom_specifics: aggregatedConsumeSpecifics } : {}),
        ...(aggregatedGenerateSpecifics.length > 0 ? { generate_custom_specifics: aggregatedGenerateSpecifics } : {}),
        ...(data.immunityEnabled ? { immunity_total: immunityTotal, immunity_anomalies: immunityAnomalies, immunity_damage_effects: immunityDamageEffects } : {}),
      };
      
      if (mode === 'edit' && editAbility) {
        await fetch(`${apiBase()}/api/abilities/${editAbility.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(abilityPayload),
        });
      } else {
        await fetch(`${apiBase()}/api/abilities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...abilityPayload, created_by: user.id }),
        });
      }

      toast({
        title: "Successo",
        description: mode === 'edit' ? "Abilità aggiornata con successo!" : "Abilità aggiunta con successo!",
      });

      reset();
      onClose();
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio dell'abilità",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Modifica Abilità' : 'Aggiungi Nuova Abilità'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifica i dettagli dell\'abilità esistente utilizzando i campi sottostanti.' 
              : 'Crea una nuova abilità compilando tutti i campi richiesti.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Informazioni Generali</TabsTrigger>
              <TabsTrigger value="levels">Livelli (1-10)</TabsTrigger>
              <TabsTrigger value="additional">Informazioni Aggiuntive</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              {/* Nome dell'abilità */}
              <div>
                <Label htmlFor="name">Nome dell'abilità *</Label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Il nome è obbligatorio" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name"
                      placeholder="Nome dell'abilità"
                      className={errors.name ? "border-red-500" : ""}
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Tipologia dell'abilità */}
              <div>
                <Label htmlFor="type">Tipologia dell'abilità *</Label>
                <Controller
                  name="type"
                  control={control}
                  rules={{ required: "La tipologia è obbligatoria" }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                        <SelectValue placeholder="Seleziona tipologia" />
                      </SelectTrigger>
                      <SelectContent>
                        {ABILITY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
                )}
              </div>

              {watchedType === 'Passiva' ? (
                <div className="space-y-4">
                  <Label>Applica anomalia?</Label>
                  <Controller
                    name="passiveAnomalyEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Applica anomalia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {watchedPassiveAnomalyEnabled ? (
                    <div className="mt-4">
                      <Label>Sempre attiva?</Label>
                      <Controller
                        name="passiveAnomalyAlwaysActive"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={(v) => field.onChange(v === 'yes')}
                            value={field.value ? 'yes' : 'no'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sempre attiva" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Sì</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  ) : null}
                  <div>
                    <Label>Effetto se condizione?</Label>
                    <Controller
                      name="passiveConditionEnabled"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => field.onChange(v === 'yes')}
                          value={field.value ? 'yes' : 'no'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Effetto se condizione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Sì</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {watchedPassiveConditionEnabled ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Seleziona condizione</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {PASSIVE_CONDITION_TYPES.map((opt) => {
                            const selected = Array.isArray(watchedPassiveConditionTypes) ? watchedPassiveConditionTypes : [];
                            const checked = selected.includes(opt.id);
                            return (
                              <div key={opt.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(checkedVal) => {
                                    const curr = Array.isArray(watchedPassiveConditionTypes) ? watchedPassiveConditionTypes : [];
                                    const next = checkedVal
                                      ? Array.from(new Set([...curr, opt.id]))
                                      : curr.filter((t) => t !== opt.id);
                                    setValue('passiveConditionTypes', next, { shouldDirty: true });
                                  }}
                                />
                                <span className="text-sm">{opt.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Selezione specifica — multiple</Label>
                        <div className="space-y-2">
                          {passiveConditionSpecificFields.map((sf, idx) => (
                            <div key={sf.id} className="flex items-center gap-2">
                              <Controller
                                name={`passiveConditionSpecifics.${idx}.id`}
                                control={control}
                                render={({ field }) => {
                                  const classicOptions = PASSIVE_CLASSIC_SPECIFICS.map((opt) => ({
                                    value: opt.id,
                                    label: opt.name,
                                    kind: opt.kind,
                                    key: opt.key,
                                    name: opt.name,
                                  }));
                                  const customOptions = (specificCatalog || []).map((opt) => ({
                                    value: opt.id,
                                    label: opt.name,
                                    kind: 'custom' as const,
                                    key: opt.id,
                                    name: opt.name,
                                  }));
                                  const allOptions = [...classicOptions, ...customOptions];
                                  return (
                                    <Select
                                      onValueChange={(v) => {
                                        const found = allOptions.find((o) => o.value === v);
                                        field.onChange(v);
                                        setValue(`passiveConditionSpecifics.${idx}.name`, found?.name ?? '', { shouldDirty: true });
                                        setValue(`passiveConditionSpecifics.${idx}.kind`, found?.kind ?? 'custom', { shouldDirty: true });
                                        setValue(`passiveConditionSpecifics.${idx}.key`, found?.key ?? '', { shouldDirty: true });
                                      }}
                                      value={field.value || ''}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={(specificCatalog || []).length === 0 ? 'Seleziona specifica' : 'Seleziona specifica'} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {allOptions.map((opt) => (
                                          <SelectItem key={`pcs:${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  );
                                }}
                              />
                              <Button type="button" variant="destructive" onClick={() => removePassiveConditionSpecific(idx)}>
                                Rimuovi
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button type="button" onClick={() => appendPassiveConditionSpecific({ id: '', name: '', kind: 'custom', key: '' })}>
                          Aggiungi specifica
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Categoria e Sottocategoria */}
              <div className="grid grid-cols-2 gap-4">
                {/* Categoria */}
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Controller
                    name="category"
                    control={control}
                    rules={{ required: "La categoria è obbligatoria" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Seleziona categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllCategories().map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                  )}
                </div>
                
                {/* Sottocategoria */}
                <div>
                  <Label htmlFor="subcategory">Sottocategoria *</Label>
                  <Controller
                    name="subcategory"
                    control={control}
                    rules={{ required: "La sottocategoria è obbligatoria" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.subcategory ? "border-red-500" : ""}>
                          <SelectValue placeholder="Seleziona sottocategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSubcategoriesForCategory(watchedCategory).map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subcategory && (
                    <p className="text-sm text-red-500 mt-1">{errors.subcategory.message}</p>
                  )}
                </div>
              </div>

              {/* Grado */}
              <div>
                <Label htmlFor="grade">Grado *</Label>
                <Controller
                  name="grade"
                  control={control}
                  rules={{ required: "Il grado è obbligatorio" }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.grade ? "border-red-500" : ""}>
                        <SelectValue placeholder="Seleziona grado" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.grade && (
                  <p className="text-sm text-red-500 mt-1">{errors.grade.message}</p>
                )}
              </div>

              {/* Descrizione */}
              <div>
                <Label htmlFor="description">Descrizione *</Label>
                <Controller
                  name="description"
                  control={control}
                  rules={{ required: "La descrizione è obbligatoria" }}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="description"
                      placeholder="Descrizione dell'abilità"
                      className={errors.description ? "border-red-500" : ""}
                      rows={4}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Tipi di danno */}
              <div className="space-y-3">
                <Label>Tipi di danno</Label>
                <div className="space-y-2">
                  {damageTypeFields.map((dt, idx) => (
                    <div key={dt.id} className="flex items-center gap-2">
                      <Controller
                        name={`damageTypes.${idx}.name`}
                        control={control}
                        rules={{ required: "Il tipo di danno è obbligatorio" }}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={damageEffectLoading ? "Caricamento..." : "Seleziona tipo di danno"} />
                            </SelectTrigger>
                            <SelectContent>
                              {damageEffectOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.name}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeDamageType(idx)}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={() => appendDamageType({ name: '' })}
                >
                  Aggiungi tipo di danno
                </Button>
                <p className="text-xs text-muted-foreground">
                  I tipi di danno si applicano a tutti i livelli. Per ogni tipo, inserirai i valori al livello corrispondente.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Immunità?</Label>
                <Controller
                  name="immunityEnabled"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Abilita immunità" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {watchedImmunityEnabled ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Immunità totale?</Label>
                      <Controller
                        name="immunityTotal"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                            <SelectTrigger>
                              <SelectValue placeholder="Immunità totale" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Sì</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    {!watchedImmunityTotal ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Immunità anomalie</Label>
                          {immunityAnomalyFields.map((ia, idx) => (
                            <div key={ia.id} className="flex items-center gap-2">
                              <Controller
                                name={`immunityAnomalies.${idx}.id`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    onValueChange={(v) => {
                                      field.onChange(v);
                                      const found = anomalyOptionsWithId.find((o) => String(o.id) === String(v));
                                      setValue(`immunityAnomalies.${idx}.name`, found?.name || '', { shouldDirty: true });
                                    }}
                                    value={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={anomalyLoading ? "Caricamento..." : "Seleziona anomalia"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {anomalyOptionsWithId.map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id}>
                                          {opt.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <Button type="button" variant="destructive" onClick={() => removeImmunityAnomaly(idx)}>
                                Rimuovi
                              </Button>
                            </div>
                          ))}
                          <Button type="button" onClick={() => appendImmunityAnomaly({ id: '', name: '' })}>
                            Aggiungi anomalia
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Immunità effetti danno</Label>
                          {immunityDamageEffectFields.map((ie, idx) => (
                            <div key={ie.id} className="flex items-center gap-2">
                              <Controller
                                name={`immunityDamageEffects.${idx}.id`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    onValueChange={(v) => {
                                      field.onChange(v);
                                      const found = damageEffectOptions.find((o) => String(o.id) === String(v));
                                      setValue(`immunityDamageEffects.${idx}.name`, found?.name || '', { shouldDirty: true });
                                    }}
                                    value={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={damageEffectLoading ? "Caricamento..." : "Seleziona effetto"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {damageEffectOptions.map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id}>
                                          {opt.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <Button type="button" variant="destructive" onClick={() => removeImmunityDamageEffect(idx)}>
                                Rimuovi
                              </Button>
                            </div>
                          ))}
                          <Button type="button" onClick={() => appendImmunityDamageEffect({ id: '', name: '' })}>
                            Aggiungi effetto
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Danno percentuale?</Label>
                  <Controller
                    name="percentageDamageEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita danno in percentuale" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Tiro tombola?</Label>
                  <Controller
                    name="lotteryEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita tiro tombola" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>Meno salute più danni?</Label>
                <Controller
                  name="lessHealthMoreDamageEnabled"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Scegli opzione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {watchedPercentageDamageEnabled ? (
                <div className="space-y-3 mt-3">
                  <Label>Effetti percentuali</Label>
                  <div className="space-y-2">
                    {percentageDamageEffectFields.map((pd, idx) => (
                      <div key={pd.id} className="flex items-center gap-2">
                        <Controller
                          name={`percentageDamageEffects.${idx}.name`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Seleziona effect percentuale'} />
                              </SelectTrigger>
                              <SelectContent>
                                {(damageEffectOptions || []).map((opt) => (
                                  <SelectItem key={`pde:${opt.id}`} value={opt.name}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Button type="button" variant="destructive" onClick={() => removePercentageDamageEffect(idx)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={() => appendPercentageDamageEffect({ name: '' })}>
                    Aggiungi effect percentuale
                  </Button>
                  <p className="text-xs text-muted-foreground">I danni percentuali verranno inseriti per livello.</p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Forma del danno</Label>
                  <Controller
                    name="damageShape"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona forma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Singolo</SelectItem>
                          <SelectItem value="area">Area</SelectItem>
                          <SelectItem value="cone">Cono</SelectItem>
                          <SelectItem value="chain">Catena</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Danno al secondo?</Label>
                  <Controller
                    name="damagePerSecond"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita DPS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>DPS con danno crescente?</Label>
                  <Controller
                    name="damagePerSecondIncreasing"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita crescita DPS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Danno crescente per tiri multipli?</Label>
                  <Controller
                    name="multipleShotsIncreasing"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita crescita tiri" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Molteplici attacchi?</Label>
                  <Controller
                    name="multipleAttacks"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita molteplici attacchi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Attacchi caricati?</Label>
                  <Controller
                    name="chargedAttack"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita attacchi caricati" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label>Attacco a fase?</Label>
                <Controller
                  name="phaseAttack"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Abilita fasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Avvertimento per livello?</Label>
                  <Controller
                    name="hasLevelWarning"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita avvertimento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Tiro di percentuale?</Label>
                  <Controller
                    name="percentageRollEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita tiro di percentuale" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Incremento costo PA?</Label>
                  <Controller
                    name="paInvestmentEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita investimento PA" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Incremento danno per PA?</Label>
                  <Controller
                    name="damageIncreasePerPaEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita danno crescente per PA" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              {watchedPaInvestmentEnabled ? (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Incremento tiro di riuscita?</Label>
                    <Controller
                      name="successRollIncreasePerPaEnabled"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Abilita incremento tiro" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Sì</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Fallimento?</Label>
                  <Controller
                    name="hasFailure"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita fallimento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {watchedHasFailure ? (
                <div className="space-y-3 mt-3">
                  <Label>Effetti di fallimento</Label>
                  <div className="space-y-2">
                    {failureDamageEffectFields.map((fd, idx) => (
                      <div key={fd.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div className="md:col-span-2">
                          <Controller
                            name={`failureDamageEffects.${idx}.name`}
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Seleziona effect'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(damageEffectOptions || []).map((opt) => (
                                    <SelectItem key={`fde:${opt.id}`} value={opt.name}>{opt.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div>
                          <Controller
                            name={`failureDamageEffects.${idx}.mode`}
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || 'classic'}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Modalità" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="classic">Classico</SelectItem>
                                  <SelectItem value="percentage">Percentuale</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <Button type="button" variant="destructive" onClick={() => removeFailureDamageEffect(idx)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={() => appendFailureDamageEffect({ name: '', mode: 'classic' })}>
                    Aggiungi effect di fallimento
                  </Button>
                  <p className="text-xs text-muted-foreground">Gli effetti saranno configurati per livello.</p>
                </div>
              ) : null}
              {/* Opzioni generali richieste */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Durata in turni?</Label>
                  <Controller
                    name="hasTurnDuration"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli se ha durata" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Tiri multipli?</Label>
                  <Controller
                    name="multipleShots"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli se sono multipli" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Incremento danni per turno senza danni?</Label>
                  <Controller
                    name="noDamageTurnIncreaseEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita incremento turni" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Ritardo di lancio?</Label>
                  <Controller
                    name="launchDelayEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita ritardo di lancio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Respinta?</Label>
                  <Controller
                    name="knockbackEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita respinta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Mossa scalata?</Label>
                  <Controller
                    name="scaledMoveEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita mossa scalata" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Quanti bersagli?</Label>
                  <Controller
                    name="hasMaxTargets"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita campo bersagli" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Usa anche danno arma?</Label>
                  <Controller
                    name="useWeaponDamage"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Somma danno equipaggiamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label>Utilizzo ogni quanti turni?</Label>
                  <Controller
                    name="hasUsageInterval"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita intervallo di utilizzo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Massimi utilizzi a turno?</Label>
                  <Controller
                    name="hasMaxUsesPerTurn"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita massimi utilizzi a turno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Effetti su utilizzatore?</Label>
                  <Controller
                    name="hasSelfEffects"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita autodanni ed effetti" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {watchedHasSelfEffects ? (
                <div className="space-y-3 mt-3">
                  <Label>Damage effect (self) — multipli</Label>
                  <div className="space-y-2">
                    {selfDamageEffectFields.map((sd, idx) => (
                      <div key={sd.id} className="flex items-center gap-2">
                        <Controller
                          name={`selfDamageEffects.${idx}.name`}
                          control={control}
                          rules={{ required: "L'effetto è obbligatorio" }}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Seleziona effect'} />
                              </SelectTrigger>
                              <SelectContent>
                                {(damageEffectOptions || []).map((opt) => (
                                  <SelectItem key={`sde:${opt.id}`} value={opt.name}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Button type="button" variant="destructive" onClick={() => removeSelfDamageEffect(idx)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={() => appendSelfDamageEffect({ name: '' })}>
                    Aggiungi damage effect (self)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Il danno self per livello apparirà dopo aver selezionato uno o più effect.
                  </p>
                </div>
              ) : null}

              <div className="mt-4">
                <Label>Consumo specifica personalizzata?</Label>
                <Controller
                  name="consumeCustomSpecificsEnabled"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(v === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Abilita consumo specifica personalizzata" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {watchedConsumeCustomSpecificsEnabled ? (
                <div className="space-y-3 mt-3">
                  <Label>Specifiche da consumare — multiple</Label>
                  <div className="space-y-2">
                    {consumeSpecificFields.map((sf, idx) => (
                      <div key={sf.id} className="flex items-center gap-2">
                        <Controller
                          name={`consumeCustomSpecifics.${idx}.id`}
                          control={control}
                          rules={{ required: 'La specifica è obbligatoria' }}
                          render={({ field }) => (
                            <Select
                              onValueChange={(v) => {
                                const found = (specificCatalog || []).find((s) => s.id === v);
                                field.onChange(v);
                                setValue(`consumeCustomSpecifics.${idx}.name`, found?.name ?? '', { shouldDirty: true });
                              }}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={specificCatalog.length === 0 ? 'Nessuna specifica' : 'Seleziona specifica'} />
                              </SelectTrigger>
                              <SelectContent>
                                {(specificCatalog || []).map((opt) => (
                                  <SelectItem key={`acs:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Button type="button" variant="destructive" onClick={() => removeConsumeSpecific(idx)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={() => appendConsumeSpecific({ id: '', name: '' })}>
                    Aggiungi specifica da consumare
                  </Button>
                </div>
              ) : null}

              <div className="mt-4">
                <Label>Utilizzo genera specifica personalizzata?</Label>
                <Controller
                  name="generateCustomSpecificsEnabled"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(v === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Abilita generazione specifica personalizzata" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {watchedGenerateCustomSpecificsEnabled ? (
                <div className="space-y-3 mt-3">
                  <Label>Specifiche generate — multiple</Label>
                  <div className="space-y-2">
                    {generateSpecificFields.map((sf, idx) => (
                      <div key={sf.id} className="flex items-center gap-2">
                        <Controller
                          name={`generateCustomSpecifics.${idx}.id`}
                          control={control}
                          rules={{ required: 'La specifica è obbligatoria' }}
                          render={({ field }) => (
                            <Select
                              onValueChange={(v) => {
                                const found = (specificCatalog || []).find((s) => s.id === v);
                                field.onChange(v);
                                setValue(`generateCustomSpecifics.${idx}.name`, found?.name ?? '', { shouldDirty: true });
                              }}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={specificCatalog.length === 0 ? 'Nessuna specifica' : 'Seleziona specifica'} />
                              </SelectTrigger>
                              <SelectContent>
                                {(specificCatalog || []).map((opt) => (
                                  <SelectItem key={`ags:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Button type="button" variant="destructive" onClick={() => removeGenerateSpecific(idx)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={() => appendGenerateSpecific({ id: '', name: '' })}>
                    Aggiungi specifica generata
                  </Button>
                </div>
              ) : null}

              <div className="mt-4">
                <Label>Rimuovi anomalia?</Label>
                <Controller
                  name="removeAnomalyEnabled"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(v === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Rimuovi anomalia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="levels" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {levelFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader>
                      <CardTitle>Livello {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Campi condizionali in base ai flag generali */}
                      <div className="grid grid-cols-2 gap-4">
                        {watchedHasTurnDuration ? (
                          <div>
                            <Label>Durata (turni)</Label>
                            <Controller
                              name={`levels.${index}.turn_duration_rounds`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        ) : null}
                        {watchedMultipleShots ? (
                          <div>
                            <Label>Proiettili massimi</Label>
                            <Controller
                              name={`levels.${index}.max_projectiles`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        ) : null}
                        {watchedMultipleShotsIncreasing ? (
                          <div>
                            <Label>Danno crescente per proiettile</Label>
                            <Controller
                              name={`levels.${index}.increasing_damage_per_projectile`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        ) : null}
                        {watchedHasMaxTargets ? (
                          <div>
                            <Label>Numero massimo bersagli</Label>
                            <Controller
                              name={`levels.${index}.max_targets`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        ) : null}
                        {watchedHasUsageInterval ? (
                          <div>
                            <Label>Intervallo utilizzo (turni)</Label>
                            <Controller
                              name={`levels.${index}.usage_interval_turns`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        ) : null}
                        {watchedHasMaxUsesPerTurn ? (
                          <div>
                            <Label>Massimi utilizzi a turno</Label>
                            <Controller
                              name={`levels.${index}.max_uses_per_turn`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        ) : null}
                      </div>

                      {watchedDamageShape !== 'single' ? (
                        <div className="grid grid-cols-2 gap-4">
                          {(watchedDamageShape === 'area' || watchedDamageShape === 'cone') ? (
                            <div>
                              <Label>{watchedDamageShape === 'area' ? 'Area (raggio)' : 'Cono (lunghezza)'}</Label>
                              <Controller
                                name={`levels.${index}.area_or_cone_value`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                )}
                              />
                            </div>
                          ) : null}
                          {watchedDamageShape === 'chain' ? (
                            <div>
                              <Label>Bersagli in catena</Label>
                              <Controller
                                name={`levels.${index}.chain_targets`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="1"
                                    min="1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                                  />
                                )}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {watchedConsumeCustomSpecificsEnabled && Array.isArray(watchedConsumeCustomSpecifics) && watchedConsumeCustomSpecifics.length > 0 ? (
                        <div className="space-y-2">
                          <Label>Consumo specifica personalizzata</Label>
                          {watchedConsumeCustomSpecifics.map((spec: any, specIdx: number) => {
                            const current = Array.isArray((watchedLevels?.[index] as any)?.consume_custom_specifics)
                              ? (((watchedLevels?.[index] as any).consume_custom_specifics) as any[])
                              : [];
                            const found = current.find((s: any) => (s?.id === spec?.id) || ((s?.name ?? '') === spec?.name)) || {};
                            const value = typeof found?.value === 'number' ? found.value : Number(found?.value) || 0;
                            return (
                              <div key={`accs:${spec?.id || specIdx}`} className="grid grid-cols-2 gap-2 items-center">
                                <div className="text-sm">{spec?.name || 'Specifica'}</div>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  value={value}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const next = (Array.isArray(watchedConsumeCustomSpecifics) ? watchedConsumeCustomSpecifics : []).map((s: any) => {
                                      const existing = current.find((c: any) => (c?.id === s?.id) || ((c?.name ?? '') === s?.name)) || {};
                                      return {
                                        id: (s?.id ?? '').toString(),
                                        name: (s?.name ?? '').toString(),
                                        value: typeof existing?.value === 'number' ? existing.value : Number(existing?.value) || 0,
                                      };
                                    });
                                    if (next[specIdx]) next[specIdx].value = val;
                                    setValue(`levels.${index}.consume_custom_specifics`, next, { shouldDirty: true });
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {watchedGenerateCustomSpecificsEnabled && Array.isArray(watchedGenerateCustomSpecifics) && watchedGenerateCustomSpecifics.length > 0 ? (
                        <div className="space-y-2">
                          <Label>Utilizzo genera specifica personalizzata</Label>
                          {watchedGenerateCustomSpecifics.map((spec: any, specIdx: number) => {
                            const current = Array.isArray((watchedLevels?.[index] as any)?.generate_custom_specifics)
                              ? (((watchedLevels?.[index] as any).generate_custom_specifics) as any[])
                              : [];
                            const found = current.find((s: any) => (s?.id === spec?.id) || ((s?.name ?? '') === spec?.name)) || {};
                            const value = typeof found?.value === 'number' ? found.value : Number(found?.value) || 0;
                            return (
                              <div key={`agcs:${spec?.id || specIdx}`} className="grid grid-cols-2 gap-2 items-center">
                                <div className="text-sm">{spec?.name || 'Specifica'}</div>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  value={value}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const next = (Array.isArray(watchedGenerateCustomSpecifics) ? watchedGenerateCustomSpecifics : []).map((s: any) => {
                                      const existing = current.find((c: any) => (c?.id === s?.id) || ((c?.name ?? '') === s?.name)) || {};
                                      return {
                                        id: (s?.id ?? '').toString(),
                                        name: (s?.name ?? '').toString(),
                                        value: typeof existing?.value === 'number' ? existing.value : Number(existing?.value) || 0,
                                      };
                                    });
                                    if (next[specIdx]) next[specIdx].value = val;
                                    setValue(`levels.${index}.generate_custom_specifics`, next, { shouldDirty: true });
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {watchedDamagePerSecond ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Secondi massimi</Label>
                            <Controller
                              name={`levels.${index}.max_seconds`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                          <div>
                            <Label>PA al secondo</Label>
                            <Controller
                              name={`levels.${index}.pa_cost_per_second`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                          {watchedDamagePerSecondIncreasing ? (
                            <div>
                              <Label>DPS crescente</Label>
                              <Controller
                                name={`levels.${index}.increasing_damage_per_second`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                )}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedNoDamageTurnIncreaseEnabled ? (
                        Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                          <div className="space-y-4">
                            <Label>Incremento danni per turno senza danni subiti (per tipo)</Label>
                            {watchedDamageTypes.map((dt, tIndex) => (
                              <div key={`ndti-${dt?.name || tIndex}-${tIndex}`} className="space-y-2">
                                <Label className="text-sm">Tipo di danno: {dt?.name || `Tipo ${tIndex + 1}`}</Label>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Crescita assicurata/turno</Label>
                                    <Controller
                                      name={`levels.${index}.no_damage_turn_increase_values.${tIndex}.guaranteed_damage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          placeholder="0.0"
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <Label>Crescita aggiuntiva/turno</Label>
                                    <Controller
                                      name={`levels.${index}.no_damage_turn_increase_values.${tIndex}.additional_damage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          placeholder="0.0"
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aggiungi almeno un tipo di danno nelle “Informazioni Generali”.</p>
                        )
                      ) : null}

                      {!watchedLotteryEnabled && watchedLaunchDelayEnabled ? (
                        <div>
                          <Label>Dopo quanti turni si attiva?</Label>
                          <Controller
                            name={`levels.${index}.activation_delay_turns`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                step="1"
                                min="0"
                                placeholder="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedKnockbackEnabled ? (
                        <div>
                          <Label>Respinta (metri)</Label>
                          <Controller
                            name={`levels.${index}.knockback_meters`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0.0"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {watchedPhaseAttack ? (
                        <div className="space-y-3">
                          <Label>Attacco a fase</Label>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Fasi</Label>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    const current = Array.isArray(watchedLevels?.[index]?.phases)
                                      ? [...(watchedLevels[index].phases as any[])]
                                      : [];
                                    const baseEffects = (Array.isArray(watchedDamageTypes) ? watchedDamageTypes : [])
                                      .map((t: any) => (t?.name ?? '').trim())
                                      .filter((n: string) => !!n);
                                    const baseDamageValues = baseEffects.map((name: string) => ({
                                      typeName: name,
                                      guaranteed_damage: 0,
                                      additional_damage: 0,
                                    }));
                                    const basePercentEffects = (Array.isArray(watchedPercentageDamageEffects) ? watchedPercentageDamageEffects : [])
                                      .map((t: any) => (t?.name ?? '').trim())
                                      .filter((n: string) => !!n);
                                    const basePercentageValues = basePercentEffects.map((name: string) => ({
                                      typeName: name,
                                      guaranteed_percentage_damage: 0,
                                      additional_percentage_damage: 0,
                                    }));
                                    const next = [
                                      ...current,
                                      {
                                        enabled: true,
                                        effects: baseEffects,
                                        guaranteed_damage: 0,
                                        additional_damage: 0,
                                        action_cost: 0,
                                        indicative_action_cost: 0,
                                        damage_values: baseDamageValues,
                                        percentage_damage_values: basePercentageValues,
                                      },
                                    ];
                                    setValue(`levels.${index}.phases`, next, { shouldDirty: true });
                                  }}
                                >
                                  Aggiungi fase
                                </Button>
                              </div>

                              {Array.isArray(watchedLevels?.[index]?.phases) && (watchedLevels[index].phases as any[]).length > 0 ? (
                                <div className="space-y-3">
                                  {(watchedLevels[index].phases as any[]).map((ph, phIdx) => (
                                    <div key={`lvl-${index}-phase-${phIdx}`} className="rounded border p-3 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label>Fase {phIdx + 1}</Label>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => {
                                            const current = Array.isArray(watchedLevels?.[index]?.phases)
                                              ? [...(watchedLevels[index].phases as any[])]
                                              : [];
                                            current.splice(phIdx, 1);
                                            setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                          }}
                                        >
                                          Rimuovi fase
                                        </Button>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Costo PA (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(ph?.action_cost || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                ? [...(watchedLevels[index].phases as any[])]
                                                : [];
                                              current[phIdx] = { ...current[phIdx], action_cost: val };
                                              setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Label>PA Indicativi (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(ph?.indicative_action_cost || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                ? [...(watchedLevels[index].phases as any[])]
                                                : [];
                                              current[phIdx] = { ...current[phIdx], indicative_action_cost: val };
                                              setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                                        <div className="space-y-4">
                                          {watchedDamageTypes.map((dt, tIndex) => {
                                            const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                            const gv = Array.isArray(ph?.damage_values) ? ph.damage_values[tIndex] : undefined;
                                            const guaranteed = Number(gv?.guaranteed_damage || 0);
                                            const additional = Number(gv?.additional_damage || 0);
                                            return (
                                              <div key={`phase-${index}-${phIdx}-dt-${typeName}`} className="space-y-2">
                                                <Label className="text-sm">Tipo di danno: {typeName}</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <Label>Danno assicurato (Fase {phIdx + 1})</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={guaranteed}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                          ? [...(watchedLevels[index].phases as any[])]
                                                          : [];
                                                        const curr = { ...(current[phIdx] || {}) } as any;
                                                        const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                        dv[tIndex] = { ...(dv[tIndex] || {}), typeName, guaranteed_damage: val };
                                                        curr.damage_values = dv;
                                                        current[phIdx] = curr;
                                                        setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Danno aggiuntivo (Fase {phIdx + 1})</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={additional}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                          ? [...(watchedLevels[index].phases as any[])]
                                                          : [];
                                                        const curr = { ...(current[phIdx] || {}) } as any;
                                                        const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                        dv[tIndex] = { ...(dv[tIndex] || {}), typeName, additional_damage: val };
                                                        curr.damage_values = dv;
                                                        current[phIdx] = curr;
                                                        setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}

                                      {watchedPercentageDamageEnabled && Array.isArray(watchedPercentageDamageEffects) && watchedPercentageDamageEffects.length > 0 ? (
                                        <div className="space-y-4">
                                          {watchedPercentageDamageEffects.map((dt, tIndex) => {
                                            const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                            const gv = Array.isArray(ph?.percentage_damage_values) ? ph.percentage_damage_values[tIndex] : undefined;
                                            const guaranteed = Number(gv?.guaranteed_percentage_damage || 0);
                                            const additional = Number(gv?.additional_percentage_damage || 0);
                                            return (
                                              <div key={`phase-${index}-${phIdx}-pct-${typeName}`} className="space-y-2">
                                                <Label className="text-sm">Tipo di danno (%): {typeName}</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <Label>Danno assicurato % (Fase {phIdx + 1})</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={guaranteed}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                          ? [...(watchedLevels[index].phases as any[])]
                                                          : [];
                                                        const curr = { ...(current[phIdx] || {}) } as any;
                                                        const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                        dv[tIndex] = { ...(dv[tIndex] || {}), typeName, guaranteed_percentage_damage: val };
                                                        curr.percentage_damage_values = dv;
                                                        current[phIdx] = curr;
                                                        setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Danno aggiuntivo % (Fase {phIdx + 1})</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={additional}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                          ? [...(watchedLevels[index].phases as any[])]
                                                          : [];
                                                        const curr = { ...(current[phIdx] || {}) } as any;
                                                        const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                        dv[tIndex] = { ...(dv[tIndex] || {}), typeName, additional_percentage_damage: val };
                                                        curr.percentage_damage_values = dv;
                                                        current[phIdx] = curr;
                                                        setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}

                                      {(watchedDamageShape === 'area' || watchedDamageShape === 'cone') ? (
                                        <div>
                                          <Label>Valore area/cono (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="0"
                                            value={Number(ph?.area_or_cone_value || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                ? [...(watchedLevels[index].phases as any[])]
                                                : [];
                                              current[phIdx] = { ...current[phIdx], area_or_cone_value: val };
                                              setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      ) : watchedDamageShape === 'chain' ? (
                                        <div>
                                          <Label>Quanti bersagli (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            placeholder="1"
                                            value={Number(ph?.chain_targets || 1)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 1;
                                              const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                ? [...(watchedLevels[index].phases as any[])]
                                                : [];
                                              current[phIdx] = { ...current[phIdx], chain_targets: val };
                                              setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      ) : null}

                                      {watchedDamagePerSecond ? (
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Secondi massimo (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.max_seconds || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], max_seconds: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                          <div>
                                            <Label>Costo PA al secondo (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.pa_cost_per_second || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], pa_cost_per_second: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                          {watchedDamagePerSecondIncreasing ? (
                                            <div>
                                              <Label>Danno crescente al secondo (Fase {phIdx + 1})</Label>
                                              <Input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={Number(ph?.increasing_damage_per_second || 0)}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value) || 0;
                                                  const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                    ? [...(watchedLevels[index].phases as any[])]
                                                    : [];
                                                  current[phIdx] = { ...current[phIdx], increasing_damage_per_second: val };
                                                  setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                }}
                                              />
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}

                                      <div className="grid grid-cols-2 gap-4">
                                        {watchedHasMaxTargets ? (
                                          <div>
                                            <Label>Quanti bersagli? (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.max_targets || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], max_targets: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}

                                        {watchedHasUsageInterval ? (
                                          <div>
                                            <Label>Ogni quanti turni si può riutilizzare (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.usage_interval_turns || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], usage_interval_turns: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}

                                        {watchedHasMaxUsesPerTurn ? (
                                          <div>
                                            <Label>Quante volte per turno (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.max_uses_per_turn || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], max_uses_per_turn: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}

                                        {watchedPercentageRollEnabled ? (
                                          <div>
                                            <Label>Percentuale minima di successo (%) (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="1"
                                              placeholder="0"
                                              value={Number(ph?.min_success_percentage || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], min_success_percentage: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}

                                        {watchedLaunchDelayEnabled ? (
                                          <div>
                                            <Label>Ritardo attivazione (turni) (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="1"
                                              placeholder="0"
                                              value={Number(ph?.activation_delay_turns || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], activation_delay_turns: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}

                                        {watchedKnockbackEnabled ? (
                                          <div>
                                            <Label>Respinta (metri) (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.1"
                                              placeholder="0"
                                              value={Number(ph?.knockback_meters || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], knockback_meters: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedChargedAttack ? (
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <Label>Gradi aggiuntivi</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  const current = Array.isArray(watchedLevels?.[index]?.grades)
                                    ? [...(watchedLevels[index].grades as any[])]
                                    : [];
                                  const next = [
                                    ...current,
                                    {
                                      guaranteed_damage: 0,
                                      additional_damage: 0,
                                      damage_values: [],
                                      percentage_damage_values: [],
                                      max_seconds: 0,
                                      pa_cost_per_second: 0,
                                      increasing_damage_per_second: 0,
                                      area_or_cone_value: 0,
                                      chain_targets: 1,
                                      action_cost: 0,
                                      indicative_action_cost: 0,
                                      usage_interval_turns: 0,
                                      grade_number: current.length + 2,
                                    },
                                  ];
                                  setValue(`levels.${index}.grades`, next, { shouldDirty: true });
                                }}
                              >
                                Aggiungi grado
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const lvl = (watchedLevels?.[index] || {}) as any;
                                  const current = Array.isArray(lvl?.grades) ? [...(lvl.grades as any[])] : [];
                                  const baseDamageValues = Array.isArray(lvl?.damage_values) ? lvl.damage_values : [];
                                  const basePercentageValues = Array.isArray(lvl?.percentage_damage_values) ? lvl.percentage_damage_values : [];

                                  const copiedGrades = current.map((g: any, i: number) => {
                                    const dv = baseDamageValues.map((bdv: any) => ({
                                      guaranteed_damage: typeof bdv?.guaranteed_damage === 'number' ? bdv.guaranteed_damage : Number(bdv?.guaranteed_damage) || 0,
                                      additional_damage: typeof bdv?.additional_damage === 'number' ? bdv.additional_damage : Number(bdv?.additional_damage) || 0,
                                    }));
                                    const pdv = basePercentageValues.map((bpv: any) => ({
                                      guaranteed_percentage_damage: typeof bpv?.guaranteed_percentage_damage === 'number' ? bpv.guaranteed_percentage_damage : Number(bpv?.guaranteed_percentage_damage) || 0,
                                      additional_percentage_damage: typeof bpv?.additional_percentage_damage === 'number' ? bpv.additional_percentage_damage : Number(bpv?.additional_percentage_damage) || 0,
                                    }));
                                    return {
                                      ...g,
                                      damage_values: dv,
                                      percentage_damage_values: pdv,
                                      area_or_cone_value: typeof lvl?.area_or_cone_value === 'number' ? lvl.area_or_cone_value : Number(lvl?.area_or_cone_value) || 0,
                                      chain_targets: typeof lvl?.chain_targets === 'number' ? lvl.chain_targets : Number(lvl?.chain_targets) || 1,
                                      max_seconds: typeof lvl?.max_seconds === 'number' ? lvl.max_seconds : Number(lvl?.max_seconds) || 0,
                                      pa_cost_per_second: typeof lvl?.pa_cost_per_second === 'number' ? lvl.pa_cost_per_second : Number(lvl?.pa_cost_per_second) || 0,
                                      increasing_damage_per_second: typeof lvl?.increasing_damage_per_second === 'number' ? lvl.increasing_damage_per_second : Number(lvl?.increasing_damage_per_second) || 0,
                                      action_cost: typeof lvl?.punti_azione === 'number' ? lvl.punti_azione : Number(lvl?.punti_azione) || 0,
                                      indicative_action_cost: typeof lvl?.punti_azione_indicativi === 'number' ? lvl.punti_azione_indicativi : Number(lvl?.punti_azione_indicativi) || 0,
                                      usage_interval_turns: typeof lvl?.usage_interval_turns === 'number' ? lvl.usage_interval_turns : Number(lvl?.usage_interval_turns) || 0,
                                      grade_number: typeof g?.grade_number === 'number' ? g.grade_number : i + 2,
                                    };
                                  });

                                  setValue(`levels.${index}.grades`, copiedGrades, { shouldDirty: true });
                                }}
                              >
                                Duplica dal Grado 1
                              </Button>
                            </div>
                          </div>

                          {Array.isArray(watchedLevels?.[index]?.grades) && (watchedLevels[index].grades as any[]).length > 0 ? (
                            <div className="space-y-3">
                              {(watchedLevels[index].grades as any[]).map((gr, grIdx) => (
                                <div key={`lvl-${index}-grade-${grIdx}`} className="rounded border p-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label>Grado {Number((gr as any)?.grade_number ?? grIdx + 2)}</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const current = Array.isArray(watchedLevels?.[index]?.grades)
                                          ? [...(watchedLevels[index].grades as any[])]
                                          : [];
                                        current.splice(grIdx, 1);
                                        setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                      }}
                                    >
                                      Rimuovi grado
                                    </Button>
                                  </div>

                                  {Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                                    <div className="space-y-4">
                                      {watchedDamageTypes.map((dt, tIndex) => {
                                        const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                        const gv = Array.isArray(gr?.damage_values) ? gr.damage_values[tIndex] : undefined;
                                        const guaranteed = Number(gv?.guaranteed_damage || 0);
                                        const additional = Number(gv?.additional_damage || 0);
                                        return (
                                          <div key={`grade-${index}-${grIdx}-dt-${typeName}`} className="space-y-2">
                                            <Label className="text-sm">Tipo di danno: {typeName}</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label>Danno assicurato (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  placeholder="0"
                                                  value={guaranteed}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                      ? [...(watchedLevels[index].grades as any[])]
                                                      : [];
                                                    const curr = { ...(current[grIdx] || {}) } as any;
                                                    const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                    dv[tIndex] = { ...(dv[tIndex] || {}), guaranteed_damage: val };
                                                    curr.damage_values = dv;
                                                    current[grIdx] = curr;
                                                    setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                  }}
                                                />
                                              </div>
                                              <div>
                                                <Label>Danno aggiuntivo (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  placeholder="0"
                                                  value={additional}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                      ? [...(watchedLevels[index].grades as any[])]
                                                      : [];
                                                    const curr = { ...(current[grIdx] || {}) } as any;
                                                    const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                    dv[tIndex] = { ...(dv[tIndex] || {}), additional_damage: val };
                                                    curr.damage_values = dv;
                                                    current[grIdx] = curr;
                                                    setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Aggiungi almeno un tipo di danno nella sezione “Informazioni Generali”.</p>
                                  )}

                                  {watchedPercentageDamageEnabled && Array.isArray(watchedPercentageDamageEffects) && watchedPercentageDamageEffects.length > 0 ? (
                                    <div className="space-y-4">
                                      {watchedPercentageDamageEffects.map((dt, tIndex) => {
                                        const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                        const gv = Array.isArray(gr?.percentage_damage_values) ? gr.percentage_damage_values[tIndex] : undefined;
                                        const guaranteed = Number(gv?.guaranteed_percentage_damage || 0);
                                        const additional = Number(gv?.additional_percentage_damage || 0);
                                        return (
                                          <div key={`grade-${index}-${grIdx}-pct-${typeName}`} className="space-y-2">
                                            <Label className="text-sm">Tipo di danno (%): {typeName}</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label>Danno assicurato % (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  placeholder="0"
                                                  value={guaranteed}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                      ? [...(watchedLevels[index].grades as any[])]
                                                      : [];
                                                    const curr = { ...(current[grIdx] || {}) } as any;
                                                    const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                    dv[tIndex] = { ...(dv[tIndex] || {}), guaranteed_percentage_damage: val };
                                                    curr.percentage_damage_values = dv;
                                                    current[grIdx] = curr;
                                                    setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                  }}
                                                />
                                              </div>
                                              <div>
                                                <Label>Danno aggiuntivo % (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  placeholder="0"
                                                  value={additional}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                      ? [...(watchedLevels[index].grades as any[])]
                                                      : [];
                                                    const curr = { ...(current[grIdx] || {}) } as any;
                                                    const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                    dv[tIndex] = { ...(dv[tIndex] || {}), additional_percentage_damage: val };
                                                    curr.percentage_damage_values = dv;
                                                    current[grIdx] = curr;
                                                    setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}

                                  {watchedDamageShape === 'area' || watchedDamageShape === 'cone' ? (
                                    <div>
                                      <Label>Valore area/cono (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="0.0"
                                        value={Number(gr?.area_or_cone_value || 0)}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          const current = Array.isArray(watchedLevels?.[index]?.grades)
                                            ? [...(watchedLevels[index].grades as any[])]
                                            : [];
                                          current[grIdx] = { ...current[grIdx], area_or_cone_value: val } as any;
                                          setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                  ) : watchedDamageShape === 'chain' ? (
                                    <div>
                                      <Label>Bersagli in catena (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="1"
                                        value={Number(gr?.chain_targets || 1)}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 1;
                                          const current = Array.isArray(watchedLevels?.[index]?.grades)
                                            ? [...(watchedLevels[index].grades as any[])]
                                            : [];
                                          current[grIdx] = { ...current[grIdx], chain_targets: val } as any;
                                          setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                  ) : null}

                                  {watchedDamagePerSecond ? (
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Max secondi (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          placeholder="0"
                                          value={Number(gr?.max_seconds || 0)}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 0;
                                            const current = Array.isArray(watchedLevels?.[index]?.grades)
                                              ? [...(watchedLevels[index].grades as any[])]
                                              : [];
                                            current[grIdx] = { ...current[grIdx], max_seconds: val } as any;
                                            setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label>Costo PA/secondo (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          placeholder="0"
                                          value={Number(gr?.pa_cost_per_second || 0)}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 0;
                                            const current = Array.isArray(watchedLevels?.[index]?.grades)
                                              ? [...(watchedLevels[index].grades as any[])]
                                              : [];
                                            current[grIdx] = { ...current[grIdx], pa_cost_per_second: val } as any;
                                            setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                      {watchedDamagePerSecondIncreasing ? (
                                        <div>
                                          <Label>Danno crescente/sec (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="0.0"
                                            value={Number(gr?.increasing_damage_per_second || 0)}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                ? [...(watchedLevels[index].grades as any[])]
                                                : [];
                                              current[grIdx] = { ...current[grIdx], increasing_damage_per_second: val } as any;
                                              setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Costo PA (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={Number(gr?.action_cost || 0)}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          const current = Array.isArray(watchedLevels?.[index]?.grades)
                                            ? [...(watchedLevels[index].grades as any[])]
                                            : [];
                                          current[grIdx] = { ...current[grIdx], action_cost: val } as any;
                                          setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label>PA Indicativi (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={Number(gr?.indicative_action_cost || 0)}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          const current = Array.isArray(watchedLevels?.[index]?.grades)
                                            ? [...(watchedLevels[index].grades as any[])]
                                            : [];
                                          current[grIdx] = { ...current[grIdx], indicative_action_cost: val } as any;
                                          setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {watchedHasUsageInterval ? (
                                    <div>
                                      <Label>Intervallo utilizzo (turni) (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={Number(gr?.usage_interval_turns || 0)}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          const current = Array.isArray(watchedLevels?.[index]?.grades)
                                            ? [...(watchedLevels[index].grades as any[])]
                                            : [];
                                          current[grIdx] = { ...current[grIdx], usage_interval_turns: val } as any;
                                          setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Danni per tipo */}
                      {!watchedLotteryEnabled && damageTypeFields.length > 0 ? (
                        <div className="space-y-2">
                          <Label>Valori danno per tipo</Label>
                          {damageTypeFields.map((dt, dtIdx) => (
                            <div key={`dtlvl:${dt.id}:${dtIdx}`} className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>{watch(`damageTypes.${dtIdx}.name`) || 'Tipo'}</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Controller
                                    name={`levels.${index}.damage_values.${dtIdx}.guaranteed_damage`}
                                    control={control}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                        placeholder="Danno assicurato"
                                      />
                                    )}
                                  />
                                  <Controller
                                    name={`levels.${index}.damage_values.${dtIdx}.additional_damage`}
                                    control={control}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                        placeholder="Danno aggiuntivo"
                                      />
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {watchedLessHealthMoreDamageEnabled ? (
                        <div className="space-y-2 mt-4">
                          <div>
                            <Label>Ogni quanto punto salute in meno?</Label>
                            <Controller
                              name={`levels.${index}.less_health_more_damage_every_hp`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                  placeholder="Valore da inserire"
                                />
                              )}
                            />
                          </div>

                          {!watchedLotteryEnabled && damageTypeFields.length > 0 ? (
                            <div className="space-y-2">
                              <Label>Incremento danni: (Usando i damage effect selezionati)</Label>
                              {damageTypeFields.map((dt, dtIdx) => (
                                <div key={`lhd:${dt.id}:${dtIdx}`} className="space-y-1">
                                  <Label className="text-sm">{watch(`damageTypes.${dtIdx}.name`) || 'Tipo'}</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Controller
                                      name={`levels.${index}.damage_values.${dtIdx}.less_health_more_damage_guaranteed_increment`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          min="0"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                          placeholder="Assicurato"
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`levels.${index}.damage_values.${dtIdx}.less_health_more_damage_additional_increment`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          min="0"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                          placeholder="Aggiutivo"
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedPercentageDamageEnabled ? (
                        Array.isArray(percentageDamageEffectFields) && percentageDamageEffectFields.length > 0 ? (
                          <div className="space-y-2">
                            <Label>Danni percentuali per effetto</Label>
                            {percentageDamageEffectFields.map((pd, pdIdx) => (
                              <div key={`pdlvl:${pd.id}:${pdIdx}`} className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>{watch(`percentageDamageEffects.${pdIdx}.name`) || 'Effetto'}</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Controller
                                      name={`levels.${index}.percentage_damage_values.${pdIdx}.guaranteed_percentage_damage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                          placeholder="% assicurato"
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`levels.${index}.percentage_damage_values.${pdIdx}.additional_percentage_damage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                          placeholder="% aggiuntivo"
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null
                      ) : null}

                      {/* Effetti su utilizzatore (self) */}
                      {watchedHasSelfEffects ? (
                        <div className="space-y-2">
                          <Label>Autodanni per effect</Label>
                          {selfDamageEffectFields.map((sd, sdIdx) => (
                            <div key={`sdlvl:${sd.id}:${sdIdx}`} className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>{watch(`selfDamageEffects.${sdIdx}.name`) || 'Effetto'}</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Controller
                                    name={`levels.${index}.self_damage_sets.${sdIdx}.guaranteed_damage`}
                                    control={control}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                        placeholder="Danno assicurato"
                                      />
                                    )}
                                  />
                                  <Controller
                                    name={`levels.${index}.self_damage_sets.${sdIdx}.max_damage`}
                                    control={control}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                        placeholder="Danno massimo"
                                      />
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="space-y-2 mt-2">
                            <Label>Anomalie su utilizzatore</Label>
                            {(() => {
                              const lvl: any = watchedLevels?.[index] || {};
                              const list: any[] = Array.isArray(lvl?.self_anomalies) ? (lvl.self_anomalies as any[]) : [];
                              const legacyName = String(lvl?.self_anomaly_name ?? '').trim();
                              const legacyDescription = String(lvl?.self_anomaly_description ?? '').trim();
                              const legacyTurns = Number(lvl?.self_anomaly_turns ?? 0) || 0;
                              const legacyDoesDamage = !!lvl?.self_anomaly_does_damage;
                              const legacyDamagePerTurn = Number(lvl?.self_anomaly_damage_per_turn ?? 0) || 0;
                              const legacyDamageEffectId = lvl?.self_anomaly_damage_effect_id ?? null;
                              const legacyDamageEffectName = String(lvl?.self_anomaly_damage_effect_name ?? '').trim();
                              const legacyApMod = Number(lvl?.self_anomaly_action_points_modifier ?? 0) || 0;
                              const legacyHpMod = Number(lvl?.self_anomaly_health_modifier ?? 0) || 0;
                              const legacyStats = (typeof lvl?.self_anomaly_stats_modifier === 'object' && lvl?.self_anomaly_stats_modifier) ? lvl.self_anomaly_stats_modifier : {};
                              const hasLegacyStats = Object.values(legacyStats || {}).some((v: any) => Number(v || 0) !== 0);
                              const hasLegacy =
                                ((legacyName && legacyName !== 'Nessuna') || legacyDescription.length > 0 || legacyTurns > 0) ||
                                legacyDoesDamage || legacyDamagePerTurn > 0 || !!legacyDamageEffectId || legacyDamageEffectName.length > 0 ||
                                legacyApMod !== 0 || legacyHpMod !== 0 || hasLegacyStats;
                              const displayList = list.length > 0
                                ? list
                                : (hasLegacy ? [{
                                  name: legacyName && legacyName !== 'Nessuna' ? legacyName : 'Anomalia',
                                  description: legacyDescription,
                                  turns: legacyTurns,
                                  doesDamage: legacyDoesDamage,
                                  damagePerTurn: legacyDamagePerTurn,
                                  damageEffectId: legacyDamageEffectId,
                                  damageEffectName: legacyDamageEffectName,
                                  actionPointsModifier: legacyApMod,
                                  healthModifier: legacyHpMod,
                                  statsModifier: legacyStats,
                                }] : []);
                              return displayList.length > 0 ? (
                                <div className="space-y-2">
                                  {displayList.map((a: any, ai: number) => (
                                    <div key={`selfanom-${index}-${a?.id || a?.name || ai}`} className="flex items-start justify-between gap-3">
                                      <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{(a?.name || 'Anomalia').toString()}</p>
                                        {(a?.description || '').toString().trim().length > 0 ? (
                                          <p className="text-xs text-muted-foreground">{(a?.description || '').toString()}</p>
                                        ) : null}
                                        {Number(a?.turns || 0) > 0 ? (
                                          <p className="text-xs text-muted-foreground">Durata: {Number(a?.turns || 0)} turni</p>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button type="button" variant="secondary" onClick={() => openAnomalyModal(index, 'self', list.length > 0 ? ai : null)}>
                                          Modifica
                                        </Button>
                                        {list.length > 0 ? (
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => {
                                              const curr: any[] = Array.isArray((watchedLevels?.[index] as any)?.self_anomalies)
                                                ? [ ...(((watchedLevels?.[index] as any)?.self_anomalies) as any[]) ]
                                                : [];
                                              const next = curr.filter((_, j) => j !== ai);
                                              setValue(`levels.${index}.self_anomalies`, next, { shouldDirty: true });
                                              const base = `levels.${index}.`;
                                              const first = next[0] || null;
                                              if (first) {
                                                setValue(`${base}self_anomaly_mode`, 'custom', { shouldDirty: true });
                                                setValue(`${base}self_anomaly_name`, (first?.name ?? 'Nessuna').toString().trim() || 'Nessuna', { shouldDirty: true });
                                                setValue(`${base}self_anomaly_description`, (first?.description ?? '').toString(), { shouldDirty: true });
                                                setValue(`${base}self_anomaly_turns`, Number(first?.turns) || 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_does_damage`, !!first?.doesDamage, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_damage_per_turn`, Number(first?.damagePerTurn) || 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_damage_effect_id`, first?.damageEffectId ?? null, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_damage_effect_name`, (first?.damageEffectName ?? '').toString(), { shouldDirty: true });
                                                setValue(`${base}self_anomaly_action_points_modifier`, Number(first?.actionPointsModifier) || 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_health_modifier`, Number(first?.healthModifier) || 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_stats_modifier`, first?.statsModifier || { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 }, { shouldDirty: true });
                                              } else {
                                                setValue(`${base}self_anomaly_mode`, 'select', { shouldDirty: true });
                                                setValue(`${base}self_anomaly_name`, 'Nessuna', { shouldDirty: true });
                                                setValue(`${base}self_anomaly_description`, '', { shouldDirty: true });
                                                setValue(`${base}self_anomaly_turns`, 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_does_damage`, false, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_damage_per_turn`, 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_damage_effect_id`, null, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_damage_effect_name`, '', { shouldDirty: true });
                                                setValue(`${base}self_anomaly_action_points_modifier`, 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_health_modifier`, 0, { shouldDirty: true });
                                                setValue(`${base}self_anomaly_stats_modifier`, { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 }, { shouldDirty: true });
                                              }
                                            }}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Nessuna anomalia configurata.</p>
                              );
                            })()}
                            <div className="mt-2">
                              <Button type="button" onClick={() => openAnomalyModal(index, 'self', null)}>
                                Aggiungi anomalia
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {watchedRemoveAnomalyEnabled ? (
                        <div className="rounded-md border p-3">
                          <Label>Rimuove anomalia</Label>
                          {anomalyLoading ? (
                            <p className="text-xs text-muted-foreground mt-2">Caricamento anomalie…</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {(anomalyOptions || []).filter((n) => n !== 'Nessuna').map((name) => {
                                const selected = Array.isArray(watch(`levels.${index}.removed_anomalies`))
                                  ? (watch(`levels.${index}.removed_anomalies`) as string[])
                                  : [];
                                const checked = selected.includes(name);
                                return (
                                  <div key={`rm:${field.id}:${name}`} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(checkedVal) => {
                                        const curr = Array.isArray(watch(`levels.${index}.removed_anomalies`))
                                          ? ([...(watch(`levels.${index}.removed_anomalies`) as any[])] as string[])
                                          : [];
                                        const next = checkedVal
                                          ? Array.from(new Set([...curr, name]))
                                          : curr.filter((n) => n !== name);
                                        setValue(`levels.${index}.removed_anomalies`, next, { shouldDirty: true });
                                      }}
                                    />
                                    <span className="text-sm">{name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {watchedHasFailure ? (
                        <div className="space-y-3 mt-2">
                          <Label>Effetti di fallimento (per livello)</Label>
                          {(() => {
                            const failSets: any[] = Array.isArray((watchedLevels?.[index] as any)?.failure_damage_sets)
                              ? (((watchedLevels?.[index] as any)?.failure_damage_sets) as any[])
                              : [];
                            const generalEffects: string[] = (Array.isArray(watchedFailureDamageEffects)
                              ? watchedFailureDamageEffects.map((e: any) => (e?.name || '').trim()).filter((n: string) => !!n)
                              : []);
                            const modeByName: Record<string, 'classic' | 'percentage'> = (Array.isArray(watchedFailureDamageEffects) ? watchedFailureDamageEffects : []).reduce((acc: any, e: any) => {
                              const nm = (e?.name || '').trim();
                              if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
                              return acc;
                            }, {});
                            const rows = failSets.length > 0 ? failSets : generalEffects.map((name: string, sIndex: number) => ({ effect_name: name, guaranteed_damage: 0, max_damage: 0, _idx: sIndex }));
                            return rows.length > 0 ? rows.map((s: any, sIndex: number) => (
                              <div key={`failset-${index}-${s?.effect_name || 'effect'}-${sIndex}`} className="space-y-2">
                                <Label className="text-sm">Effect: {s?.effect_name || `Effect ${sIndex + 1}`}</Label>
                                {((modeByName[s?.effect_name || generalEffects?.[sIndex] || ''] || 'classic') === 'percentage') ? (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Danno percentuale assicurato</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        value={Number((failSets[sIndex]?.guaranteed_percentage_damage) ?? s?.guaranteed_percentage_damage ?? 0)}
                                        onChange={(e) => {
                                          const val = Number(e.target.value) || 0;
                                          const curr: any[] = Array.isArray((watchedLevels?.[index] as any)?.failure_damage_sets) ? [ ...(((watchedLevels?.[index] as any)?.failure_damage_sets) as any[]) ] : [];
                                          curr[sIndex] = { effect_name: (s?.effect_name || curr[sIndex]?.effect_name || generalEffects[sIndex] || `Effect ${sIndex + 1}`), ...(curr[sIndex] || {}), mode: 'percentage', guaranteed_percentage_damage: val } as any;
                                          setValue(`levels.${index}.failure_damage_sets`, curr, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label>Danno percentuale aggiuntivo</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        value={Number((failSets[sIndex]?.max_percentage_damage) ?? s?.max_percentage_damage ?? 0)}
                                        onChange={(e) => {
                                          const val = Number(e.target.value) || 0;
                                          const curr: any[] = Array.isArray((watchedLevels?.[index] as any)?.failure_damage_sets) ? [ ...(((watchedLevels?.[index] as any)?.failure_damage_sets) as any[]) ] : [];
                                          curr[sIndex] = { effect_name: (s?.effect_name || curr[sIndex]?.effect_name || generalEffects[sIndex] || `Effect ${sIndex + 1}`), ...(curr[sIndex] || {}), mode: 'percentage', max_percentage_damage: val } as any;
                                          setValue(`levels.${index}.failure_damage_sets`, curr, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Danno assicurato</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={Number((failSets[sIndex]?.guaranteed_damage) ?? s?.guaranteed_damage ?? 0)}
                                        onChange={(e) => {
                                          const val = Number(e.target.value) || 0;
                                          const curr: any[] = Array.isArray((watchedLevels?.[index] as any)?.failure_damage_sets) ? [ ...(((watchedLevels?.[index] as any)?.failure_damage_sets) as any[]) ] : [];
                                          curr[sIndex] = { effect_name: (s?.effect_name || curr[sIndex]?.effect_name || generalEffects[sIndex] || `Effect ${sIndex + 1}`), ...(curr[sIndex] || {}), mode: 'classic', guaranteed_damage: val } as any;
                                          setValue(`levels.${index}.failure_damage_sets`, curr, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label>Danno aggiuntivo</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={Number((failSets[sIndex]?.max_damage) ?? s?.max_damage ?? 0)}
                                        onChange={(e) => {
                                          const val = Number(e.target.value) || 0;
                                          const curr: any[] = Array.isArray((watchedLevels?.[index] as any)?.failure_damage_sets) ? [ ...(((watchedLevels?.[index] as any)?.failure_damage_sets) as any[]) ] : [];
                                          curr[sIndex] = { effect_name: (s?.effect_name || curr[sIndex]?.effect_name || generalEffects[sIndex] || `Effect ${sIndex + 1}`), ...(curr[sIndex] || {}), mode: 'classic', max_damage: val } as any;
                                          setValue(`levels.${index}.failure_damage_sets`, curr, { shouldDirty: true });
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )) : (
                              <p className="text-xs text-muted-foreground">Aggiungi almeno un effect di fallimento nelle “Informazioni Generali”.</p>
                            );
                          })()}
                        </div>
                      ) : null}

                      {watchedHasFailure ? (
                        <div className="space-y-2 mt-2">
                          <Label>Anomalia di fallimento</Label>
                          <div className="space-y-1">
                            <p className="text-sm"><span className="font-medium">Nome:</span> {watchedLevels?.[index]?.failure_anomaly_name || 'Nessuna'}</p>
                            {watchedLevels?.[index]?.failure_anomaly_description ? (
                              <p className="text-sm"><span className="font-medium">Descrizione:</span> {watchedLevels[index].failure_anomaly_description}</p>
                            ) : null}
                            <p className="text-sm"><span className="font-medium">Durata:</span> {(watchedLevels?.[index]?.failure_anomaly_turns ?? 0)} turni</p>
                            {watchedLevels?.[index]?.failure_anomaly_does_damage ? (
                              <p className="text-sm">
                                <span className="font-medium">Danno per turno:</span> {(watchedLevels?.[index]?.failure_anomaly_damage_per_turn ?? 0)}{' '}
                                <span className="text-muted-foreground">({watchedLevels?.[index]?.failure_anomaly_damage_effect_name || 'Effetto'})</span>
                              </p>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-2">
                            <div className="md:col-span-2">
                              <Button type="button" variant="secondary" onClick={() => openAnomalyModal(index, 'failure')}>
                                Modifica anomalia
                              </Button>
                            </div>
                            <div>
                              <Label>Probabilità (%)</Label>
                              <Controller
                                name={`levels.${index}.failure_anomaly_probability`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {watchedType === 'Passiva' && watchedPassiveConditionEnabled ? (
                        <div className="space-y-2 mt-2">
                          <Label>Condizioni passive</Label>
                          {(() => {
                            const list: any[] = Array.isArray((watchedLevels?.[index] as any)?.passive_specific_conditions)
                              ? (((watchedLevels?.[index] as any)?.passive_specific_conditions) as any[])
                              : [];
                            const types = Array.isArray(watchedPassiveConditionTypes) ? watchedPassiveConditionTypes : [];
                            const hasPercent = types.some((t) => t.includes('percent'));
                            const hasValue = types.some((t) => t.includes('value'));
                            if (list.length === 0) {
                              return <p className="text-sm text-muted-foreground">Nessuna specifica selezionata.</p>;
                            }
                            return (
                              <div className="space-y-3">
                                {list.map((s: any, si: number) => (
                                  <div key={`pcond-${index}-${s?.id || s?.key || si}`} className="space-y-2">
                                    <p className="text-sm font-medium">{(s?.name || 'Specifica').toString()}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {hasPercent ? (
                                        <>
                                          <div>
                                            <Label className="text-xs">Tetto minimo %</Label>
                                            <Controller
                                              name={`levels.${index}.passive_specific_conditions.${si}.min_percent`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  type="number"
                                                  {...field}
                                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                />
                                              )}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Tetto massimo %</Label>
                                            <Controller
                                              name={`levels.${index}.passive_specific_conditions.${si}.max_percent`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  type="number"
                                                  {...field}
                                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                />
                                              )}
                                            />
                                          </div>
                                        </>
                                      ) : null}
                                      {hasValue ? (
                                        <>
                                          <div>
                                            <Label className="text-xs">Tetto minimo numerico</Label>
                                            <Controller
                                              name={`levels.${index}.passive_specific_conditions.${si}.min_value`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  type="number"
                                                  {...field}
                                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                />
                                              )}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Tetto massimo numerico</Label>
                                            <Controller
                                              name={`levels.${index}.passive_specific_conditions.${si}.max_value`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  type="number"
                                                  {...field}
                                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                />
                                              )}
                                            />
                                          </div>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}

                      {watchedType === 'Passiva' && watchedPassiveAnomalyEnabled ? (
                        <div className="space-y-2 mt-2">
                          <Label>Anomalie applicate</Label>
                          {(() => {
                            const list: any[] = Array.isArray((watchedLevels?.[index] as any)?.passive_anomalies)
                              ? (((watchedLevels?.[index] as any)?.passive_anomalies) as any[])
                              : [];
                            return list.length > 0 ? (
                              <div className="space-y-2">
                                {list.map((a: any, ai: number) => (
                                  <div key={`passanom-${index}-${a?.id || a?.name || ai}`} className="flex items-start justify-between gap-3">
                                    <div className="space-y-0.5">
                                      <p className="text-sm font-medium">{(a?.name || 'Anomalia').toString()}</p>
                                      {(a?.description || '').toString().trim().length > 0 ? (
                                        <p className="text-xs text-muted-foreground">{(a?.description || '').toString()}</p>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button type="button" variant="secondary" onClick={() => openAnomalyModal(index, 'passive', ai)}>
                                        Modifica
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => {
                                          const next = list.filter((_, j) => j !== ai);
                                          setValue(`levels.${index}.passive_anomalies`, next, { shouldDirty: true });
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Nessuna anomalia configurata.</p>
                            );
                          })()}
                          <div className="mt-2">
                            <Button type="button" onClick={() => openAnomalyModal(index, 'passive', null)}>
                              Aggiungi anomalia
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {/* Costi e descrizione livello */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Punti Azione</Label>
                          <Controller
                            name={`levels.${index}.punti_azione`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <Label>Punti Azione Indicativi</Label>
                          <Controller
                            name={`levels.${index}.punti_azione_indicativi`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          />
                        </div>
                      </div>
                      {watchedPercentageRollEnabled ? (
                        <div>
                          <Label>Percentuale di successo minima</Label>
                          <Controller
                            name={`levels.${index}.min_success_percentage`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}
                      {watchedPaInvestmentEnabled ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>PA investibili massimi</Label>
                            <Controller
                              name={`levels.${index}.max_pa_investment`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                          {watchedDamageIncreasePerPaEnabled ? (
                            <div>
                              <Label>Danno crescente per PA</Label>
                              <Controller
                                name={`levels.${index}.increasing_damage_per_pa`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                  />
                                )}
                              />
                            </div>
                          ) : null}
                          {watchedSuccessRollIncreasePerPaEnabled ? (
                            <div>
                              <Label>1 punto addizione ogni quanto?</Label>
                              <Controller
                                name={`levels.${index}.success_roll_increase_every_pa`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                )}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {watchedHasLevelWarning ? (
                        <div>
                          <Label>Avvertimento per livello</Label>
                          <Controller
                            name={`levels.${index}.level_warning`}
                            control={control}
                            render={({ field }) => (
                              <Textarea
                                {...field}
                                placeholder="Avvertimenti o note di livello"
                                rows={2}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {watchedMultipleAttacks ? (
                        <div>
                          <Label>Attacchi multipli massimi</Label>
                          <Controller
                            name={`levels.${index}.max_multiple_attacks`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {watchedLotteryEnabled ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Facce dado</Label>
                            <Controller
                              name={`levels.${index}.lottery_dice_faces`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                          <div>
                            <Label>Scelte numeriche</Label>
                            <Controller
                              name={`levels.${index}.lottery_numeric_choices`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                              )}
                            />
                          </div>
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedScaledMoveEnabled ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Statistiche</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={levelStatsQueries[index] || ''}
                                onChange={(e) => setLevelStatsQueries((prev) => ({ ...prev, [index]: e.target.value }))}
                                placeholder="Cerca statistica"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(Array.isArray(watch(`levels.${index}.scaled_move_stats`) ) ? watch(`levels.${index}.scaled_move_stats`) : []).map((s: string) => (
                                <Badge key={`stat:${index}:${s}`} variant="secondary" className="flex items-center gap-1">
                                  {s}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curr = Array.isArray(watch(`levels.${index}.scaled_move_stats`)) ? [...(watch(`levels.${index}.scaled_move_stats`) as any[])] : [];
                                      const next = curr.filter((v) => String(v) !== String(s));
                                      setValue(`levels.${index}.scaled_move_stats`, next, { shouldDirty: true });
                                    }}
                                    className="ml-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <div className="max-h-32 overflow-auto border rounded p-2">
                              {STAT_OPTIONS.filter((k) => {
                                const q = (levelStatsQueries[index] || '').toLowerCase();
                                const lbl = STAT_LABELS[k].toLowerCase();
                                const keyStr = String(k).toLowerCase();
                                const sel = Array.isArray(watch(`levels.${index}.scaled_move_stats`)) ? (watch(`levels.${index}.scaled_move_stats`) as string[]) : [];
                                return (q ? (lbl.includes(q) || keyStr.includes(q)) : true) && !sel.includes(k);
                              }).map((k) => (
                                <button
                                  key={`statopt:${index}:${k}`}
                                  type="button"
                                  className="px-2 py-1 text-sm rounded hover:bg-muted w-full text-left"
                                  onClick={() => {
                                    const curr = Array.isArray(watch(`levels.${index}.scaled_move_stats`)) ? [...(watch(`levels.${index}.scaled_move_stats`) as string[])] : [];
                                    if (!curr.includes(k)) {
                                      setValue(`levels.${index}.scaled_move_stats`, [...curr, k], { shouldDirty: true });
                                    }
                                  }}
                                >
                                  {k}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Competenze</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={levelSkillsQueries[index] || ''}
                                onChange={(e) => setLevelSkillsQueries((prev) => ({ ...prev, [index]: e.target.value }))}
                                placeholder="Cerca competenza"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(Array.isArray(watch(`levels.${index}.scaled_move_skills`) ) ? watch(`levels.${index}.scaled_move_skills`) : []).map((s: string) => (
                                <Badge key={`skill:${index}:${s}`} variant="secondary" className="flex items-center gap-1">
                                  {s}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curr = Array.isArray(watch(`levels.${index}.scaled_move_skills`)) ? [...(watch(`levels.${index}.scaled_move_skills`) as any[])] : [];
                                      const next = curr.filter((v) => String(v) !== String(s));
                                      setValue(`levels.${index}.scaled_move_skills`, next, { shouldDirty: true });
                                    }}
                                    className="ml-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <div className="max-h-32 overflow-auto border rounded p-2">
                              {COMPETENCE_OPTIONS.filter((c) => {
                                const q = (levelSkillsQueries[index] || '').toLowerCase();
                                const sel = Array.isArray(watch(`levels.${index}.scaled_move_skills`)) ? (watch(`levels.${index}.scaled_move_skills`) as string[]) : [];
                                return (q ? c.toLowerCase().includes(q) : true) && !sel.includes(c);
                              }).map((c) => (
                                <button
                                  key={`skillopt:${index}:${c}`}
                                  type="button"
                                  className="px-2 py-1 text-sm rounded hover:bg-muted w-full text-left"
                                  onClick={() => {
                                    const curr = Array.isArray(watch(`levels.${index}.scaled_move_skills`)) ? [...(watch(`levels.${index}.scaled_move_skills`) as string[])] : [];
                                    if (!curr.includes(c)) {
                                      setValue(`levels.${index}.scaled_move_skills`, [...curr, c], { shouldDirty: true });
                                    }
                                  }}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <Label htmlFor={`levels.${index}.level_description`}>Descrizione Livello</Label>
                        <Controller
                          name={`levels.${index}.level_description`}
                          control={control}
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              placeholder="Descrizione del livello (opzionale)"
                              rows={3}
                            />
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-6">
              {/* Descrizione aggiuntiva */}
              <div>
                <Label htmlFor="additionalDescription">Descrizione Aggiuntiva</Label>
                <Controller
                  name="additionalDescription"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="additionalDescription"
                      placeholder="Descrizione aggiuntiva (opzionale)"
                      rows={4}
                    />
                  )}
                />
              </div>

              {/* Storie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="story1">Storia 1</Label>
                  <Controller
                    name="story1"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="story1"
                        placeholder="Prima storia (opzionale)"
                        rows={6}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="story2">Storia 2</Label>
                  <Controller
                    name="story2"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="story2"
                        placeholder="Seconda storia (opzionale)"
                        rows={6}
                      />
                    )}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <AnomalyModal isOpen={isAnomalyModalOpen} onClose={handleAnomalyClose} onSave={handleAnomalySave} editingAnomaly={editingAnomaly} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : (mode === 'edit' ? 'Aggiorna' : 'Aggiungi')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
