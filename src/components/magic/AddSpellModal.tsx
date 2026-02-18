import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
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
import { EvocationGeneralFields, EvocationLevelFields } from '@/components/magic/EvocationOptions';
import { listEvocations, getEvocationById } from '@/integrations/supabase/evocations';
import { listAnomalies } from '@/integrations/supabase/anomalies';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { Form } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { Badge } from '@/components/ui/badge';
import { ABILITY_SECTIONS } from '@/constants/abilityConfig';
import { X } from 'lucide-react';

// Interfacce
interface LevelDamageValue {
  typeName: string;
  damageEffectId?: string;
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

// Nuovo: rappresentazione dei campi di un singolo grado aggiuntivo
interface SpellGrade {
  effects: string[];
  guaranteed_damage?: number;
  additional_damage?: number;
  damage_values?: { typeName: string; damageEffectId?: string; guaranteed_damage?: number; additional_damage?: number }[];
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
  // Replica campi di forma del danno
  area_or_cone_value?: number;
  chain_targets?: number;
  // Replica campi danno al secondo
  max_seconds?: number;
  pa_cost_per_second?: number;
  increasing_damage_per_second?: number;
  // Durata e tiri multipli
  turn_duration_rounds?: number;
  max_projectiles?: number;
  increasing_damage_per_projectile?: number;
  // Molteplici attacchi
  max_multiple_attacks?: number;
  // Avvertimento
  level_warning?: string;
  // Danno arma
  use_weapon_damage?: boolean;
  // Replica anomalie
  anomaly1_percentage?: number;
  anomaly1_type?: string;
  anomaly2_percentage?: number;
  anomaly2_type?: string;
  anomaly3_percentage?: number;
  anomaly3_type?: string;
  // Indipendenza dei costi di azione per grado
  action_cost?: number;
  indicative_action_cost?: number;
  // Intervallo di utilizzo in turni per grado
  usage_interval_turns?: number;
  // Identificatore del grado (Grado 2, Grado 3, ...)
  grade_number?: number;
}

interface SpellLevel {
  level: number;
  guaranteed_damage: number;
  additional_damage: number;
  damage_values: LevelDamageValue[];
  percentage_damage_values?: LevelPercentageDamageValue[];
  action_cost: number;
  indicative_action_cost: number;
  extra_action_cost?: number;
  anomaly1_percentage: number;
  anomaly1_type: string;
  anomaly2_percentage: number;
  anomaly2_type: string;
  anomaly3_percentage: number;
  anomaly3_type: string;
  removed_anomalies: string[];
  level_description: string;
  less_health_more_damage_every_hp?: number;
  damage_shape?: 'area' | 'cone' | 'single' | 'chain';
  area_or_cone_value?: number;
  chain_targets?: number;
  max_seconds?: number;
  pa_cost_per_second?: number;
  // nuovi campi esistenti
  increasing_damage_per_second?: number;
  // Nuovo: investimento PA e danno crescente per PA
  max_pa_investment?: number;
  increasing_damage_per_pa?: number;
  success_roll_increase_every_pa?: number;
  max_projectiles?: number;
  increasing_damage_per_projectile?: number;
  // nuovi campi aggiuntivi
  conditional_additional_damage?: boolean;
  turn_duration_rounds?: number;
  // nuovi campi: gestione bersagli e cooldown
  max_targets?: number;
  usage_interval_turns?: number;
  max_uses_per_turn?: number;
  // nuovi campi: richieste aggiuntive
  no_damage_turn_increase_values?: LevelDamageValue[];
  activation_delay_turns?: number;
  knockback_meters?: number;
  scaled_move_stats?: string[];
  scaled_move_skills?: string[];
  // nuovi campi: utilizzo danno arma
  use_weapon_damage?: boolean;
  // nuovi campi: effetti su utilizzatore
  self_effect_enabled?: boolean;
  // nuovi campi: set di autodanno (multi-effect)
  self_damage_sets?: {
    effect_name: string;
    guaranteed_damage?: number;
    max_damage?: number;
    mode?: 'classic' | 'percentage';
    guaranteed_percentage_damage?: number;
    max_percentage_damage?: number;
  }[];
  // nuovi campi: anomalia su utilizzatore (self)
  self_anomaly_mode?: 'select' | 'custom';
  self_anomaly_name?: string;
  self_anomaly_description?: string;
  self_anomaly_turns?: number;
  self_anomaly_action_points_modifier?: number;
  self_anomaly_health_modifier?: number;
  self_anomaly_stats_modifier?: { forza?: number; percezione?: number; resistenza?: number; intelletto?: number; agilita?: number; sapienza?: number; anima?: number };
  passive_anomalies?: any[];
  self_anomalies?: any[];
  // Blocco unificato lato self
  self?: {
    enabled?: boolean;
    damage_sets?: {
      effect_name: string;
      guaranteed_damage?: number;
      max_damage?: number;
      mode?: 'classic' | 'percentage';
      guaranteed_percentage_damage?: number;
      max_percentage_damage?: number;
    }[];
    anomaly?: {
      mode?: 'select' | 'custom';
      name?: string;
      description?: string;
      turns?: number;
      doesDamage?: boolean;
      damagePerTurn?: number;
      damageEffectId?: string | null;
      damageEffectName?: string;
      actionPointsModifier?: number;
      healthModifier?: number;
      armorModifier?: number;
      statsModifier?: { forza?: number; percezione?: number; resistenza?: number; intelletto?: number; agilita?: number; sapienza?: number; anima?: number };
      damageBonusEnabled?: boolean;
      damageBonus?: any;
      paDiscountEnabled?: boolean;
      paDiscount?: any;
      damageReductionEnabled?: boolean;
      damageReduction?: any;
      weaknessEnabled?: boolean;
      weakness?: any;
    };
    anomalies?: any[];
  };
  // evocazione
  evocation_enabled?: boolean;
  evocation_type?: 'weapon' | 'replica' | 'energy';
  weapon_light_damage?: number;
  weapon_heavy_damage?: number;
  weapon_thrust_damage?: number;
  // meta arma
  weapon_subtype?: string;
  weapon_weight?: number;
  weapon_description?: string;
  weapon_damage_sets?: {
    effect_name: string;
    damage_veloce?: number;
    damage_pesante?: number;
    damage_affondo?: number;
    calculated_damage_veloce?: number;
    calculated_damage_pesante?: number;
    calculated_damage_affondo?: number;
  }[];
  weapon_stats?: { statKey: string; amount: number }[];
  max_replicas?: number;
  replica_source_character_id?: string;
  energy_health?: number;
  energy_action_points?: number;
  energy_armour?: number;
  energy_stats?: { statKey: string; amount: number }[];
    energy_embedded_refs?: { refId: string; refType: string }[];
    energy_can_create_equipment?: boolean;
    // Nuovo: snapshot di equipaggiamento importato da evocazione di entità
    equipment?: any;
    // Nuovi campi livelli: molteplici attacchi, fasi, gradi, avvertimento
    max_multiple_attacks?: number;
    // Fasi
    phase_attack_enabled?: boolean;
    phase1_enabled?: boolean;
    phase1_effects?: string[];
    phase1_guaranteed_damage?: number;
    phase1_additional_damage?: number;
    phase2_enabled?: boolean;
    phase2_effects?: string[];
    phase2_guaranteed_damage?: number;
    phase2_additional_damage?: number;
    phase3_enabled?: boolean;
    phase3_effects?: string[];
    phase3_guaranteed_damage?: number;
    phase3_additional_damage?: number;
    // Attacco caricato (gradi)
    charged_attack_enabled?: boolean;
    grade1_enabled?: boolean;
    grade1_effects?: string[];
    grade1_guaranteed_damage?: number;
    grade1_additional_damage?: number;
    grade2_enabled?: boolean;
    grade2_effects?: string[];
    grade2_guaranteed_damage?: number;
    grade2_additional_damage?: number;
    grade3_enabled?: boolean;
    grade3_effects?: string[];
    grade3_guaranteed_damage?: number;
    grade3_additional_damage?: number;
    // Nuovo: array dinamici di fasi e gradi per replicare la logica di livello
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
    grades?: SpellGrade[];
    // Avvertimento per livello
    level_warning?: string;
    // Nuovi campi: tiro di percentuale e fallimento
    min_success_percentage?: number;
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
      // Danno per turno associato all'anomalia di fallimento
      failure_anomaly_does_damage?: boolean;
      failure_anomaly_damage_per_turn?: number;
      failure_anomaly_damage_effect_id?: string | null;
      failure_anomaly_damage_effect_name?: string;
      failure_anomaly_action_points_modifier?: number;
      failure_anomaly_health_modifier?: number;
      failure_anomaly_stats_modifier?: { forza?: number; percezione?: number; resistenza?: number; intelletto?: number; agilita?: number; sapienza?: number; anima?: number };
      failure_anomaly_probability?: number;
      // Danno per turno associato all'anomalia su utilizzatore
      self_anomaly_does_damage?: boolean;
      self_anomaly_damage_per_turn?: number;
      self_anomaly_damage_effect_id?: string | null;
    self_anomaly_damage_effect_name?: string;
    lottery_enabled?: boolean;
    lottery_dice_faces?: number;
    lottery_numeric_choices?: number;
    lottery_correct_instances?: SpellGrade[];
    lottery_wrong_instances?: SpellGrade[];
}

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
const MAGIC_BRANCHES = {
  'Distruzione': ['Fuoco', 'Ghiaccio', 'Elettrico', 'Esplosivo', 'Lavico', 'Vento', 'Oro', 'Terra', 'Neo-Arcano'],
  'Illusione': ['Illusione', 'Ombra', 'Telecinesi'],
  'Evocazione': ['Evocazione energetica', 'Evocazione Necromantica'],
  'Supporto': ['Supporto', 'Sangue', 'Divino', 'Neo-Arcano'],
  'Alterazione': ['Veleno', 'Acqua', 'Gravità', 'Spazio', 'Tempo', 'Elementale', 'Sangue', 'Terra', 'Ossa', 'Vento'],
  'Alchimia': ['Pratica', 'Utilitaria'],
  'Divinazione': ['Runica', 'Divinazione'],
  'Trasmutazione': ['Trasmutazione', 'Elementale', 'Alterazione'],
  'Occulto': ['Ombra', 'Ossa', 'Sangue'],
  'Arcano': ['Caotico', 'Compresso'],
  'Speciale': ['Draconico', 'Critico', 'Altro']
};
const MAGIC_BRANCH_OPTIONS: string[] = Object.keys(MAGIC_BRANCHES).map((b) => b.toLowerCase().replace(/\s+/g, '_'));
const COMPETENCE_OPTIONS: string[] = Array.from(new Set([
  ...Object.values(ABILITY_SECTIONS).flatMap((section: any) =>
    Object.values(section.categories || {}).map((cat: any) => String(cat.competence || '').trim()).filter((s: string) => !!s)
  ),
  ...MAGIC_BRANCH_OPTIONS,
]));

interface Spell {
  id: string;
  name: string;
  type: string;
  primary_branch: string;
  secondary_branch?: string;
  primary_specificity: string;
  secondary_specificity?: string;
  grade: string;
  description: string;
  additional_description: string;
  story1?: string;
  story2?: string;
  levels: SpellLevel[];
  created_by: string;
  created_at: string;
}

interface AddSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSpell?: Spell | null;
  mode?: 'add' | 'edit';
}

// Costanti
const MAGIC_TYPES = ['Attiva', 'Passiva', 'Suprema'];

const SPECIFICITY_GRADES = {
  'Fuoco': ['Semplice', 'Avanzata', 'Suprema'],
  'Ghiaccio': ['Semplice', 'Avanzata', 'Suprema'],
  'Elettrico': ['Semplice', 'Avanzata', 'Suprema'],
  'Sangue': ['Semplice', 'Avanzata', 'Suprema'],
  // Aggiungi altri gradi per ogni specificità
};

const ANOMALY_TYPES = [
  'Nessuna',
  'Incendiato 1', 'Incendiato 2', 'Incendiato 3',
  'Congelamento 1', 'Congelamento 2', 'Congelamento 3',
  'Shock 1', 'Shock 2', 'Shock 3',
  'Antimagia', 'Anticura',
  'Sanguinamento 1', 'Sanguinamento 2', 'Sanguinamento 3',
  'Veleno 1', 'Veleno 2', 'Veleno 3',
  'Confusione 1', 'Confusione 2', 'Confusione 3'
];

interface SpellFormData {
  name: string;
  type: string;
  primaryBranch: string;
  secondaryBranch: string;
  primarySpecificity: string;
  secondarySpecificity: string;
  grade: string;
  description: string;
  levels: SpellLevel[];
  damageTypes: { name: string }[];
  lessHealthMoreDamageEnabled: boolean;
  additionalDescription: string;
  story1: string;
  story2: string;
  damageShape: 'area' | 'cone' | 'single' | 'chain';
  damagePerSecond: boolean;
  // nuove opzioni generali
  damagePerSecondIncreasing: boolean;
  multipleShots: boolean;
  multipleShotsIncreasing: boolean;
  // Nuovi toggle generali per PA
  paInvestmentEnabled: boolean;
  damageIncreasePerPaEnabled: boolean;
  successRollIncreasePerPaEnabled: boolean;
  // Nuovo toggle generale: Tiro di percentuale
  percentageRollEnabled: boolean;
  percentageDamageEnabled: boolean;
  percentageDamageEffects: { name: string }[];
  lotteryEnabled: boolean;
  // nuovi flag generali
  conditionalAdditionalDamage: boolean;
  hasTurnDuration: boolean;
  // nuovi switch richiesti
  hasMaxTargets: boolean;
  useWeaponDamage: boolean;
  hasUsageInterval: boolean;
  hasMaxUsesPerTurn: boolean;
  hasSelfEffects: boolean;
  // selezione multipla degli effetti di autodanno (generale)
  selfDamageEffects: { name: string; mode?: 'classic' | 'percentage' }[];
  // Fallimento (generale)
  hasFailure: boolean;
  failureDamageEffects: { name: string; mode?: 'classic' | 'percentage' }[];
  // evocazione (generale, sincronizzata sui livelli)
  evocationEnabled: boolean;
  evocationType: 'weapon' | 'replica' | 'energy';
  // Nuovi toggle generali richiesti
  multipleAttacks: boolean;
  phaseAttack: boolean;
  chargedAttack: boolean;
  hasLevelWarning: boolean;
  selfAnomalyEnabled: boolean;
  passiveAnomalyEnabled: boolean;
  passiveAnomalyAlwaysActive: boolean;
  // costo extra generale
  extraCostEnabled: boolean;
  extraCostEffectId: string | null;
  extraCostEffectName: string;
  // nuovi campi: richieste aggiuntive
  difficulty: number;
  noDamageTurnIncreaseEnabled: boolean;
  launchDelayEnabled: boolean;
  knockbackEnabled: boolean;
  scaledMoveEnabled: boolean;
  removeAnomalyEnabled: boolean;
}

const createDefaultLevel = (level: number): SpellLevel => ({
  level,
  guaranteed_damage: 0,
  additional_damage: 0,
  damage_values: [],
  percentage_damage_values: [],
  action_cost: 0,
  indicative_action_cost: 0,
  extra_action_cost: 0,
  anomaly1_percentage: 0,
  anomaly1_type: 'Nessuna',
  anomaly2_percentage: 0,
  anomaly2_type: 'Nessuna',
  anomaly3_percentage: 0,
  anomaly3_type: 'Nessuna',
  removed_anomalies: [],
  level_description: '',
  less_health_more_damage_every_hp: 0,
  // default danno al secondo / tiri multipli
  max_seconds: 0,
  pa_cost_per_second: 0,
  increasing_damage_per_second: 0,
  // Default nuovi campi PA
  max_pa_investment: 0,
  increasing_damage_per_pa: 0,
  success_roll_increase_every_pa: 0,
  max_projectiles: 0,
  increasing_damage_per_projectile: 0,
  // default nuovi campi
  conditional_additional_damage: false,
  turn_duration_rounds: 0,
  // default nuovi campi richiesti
  max_targets: 0,
  usage_interval_turns: 0,
  max_uses_per_turn: 0,
  no_damage_turn_increase_values: [],
  activation_delay_turns: 0,
  knockback_meters: 0,
  scaled_move_stats: [],
  scaled_move_skills: [],
  use_weapon_damage: false,
  self_effect_enabled: false,
  self_damage_sets: [],
  self: undefined,
  // evocazione
  evocation_enabled: false,
  evocation_type: 'weapon',
  weapon_light_damage: 0,
  weapon_heavy_damage: 0,
  weapon_thrust_damage: 0,
  weapon_subtype: '',
  weapon_weight: 0,
  weapon_description: '',
  weapon_damage_sets: [],
  weapon_stats: [],
  max_replicas: 0,
  replica_source_character_id: '',
  energy_health: 0,
  energy_action_points: 0,
  energy_armour: 0,
  energy_stats: [],
    energy_embedded_refs: [],
    energy_can_create_equipment: false,
    // defaults nuovi campi livelli
    max_multiple_attacks: 0,
    phase_attack_enabled: false,
    phase1_enabled: false,
    phase1_effects: [],
    phase1_guaranteed_damage: 0,
    phase1_additional_damage: 0,
    phase2_enabled: false,
    phase2_effects: [],
    phase2_guaranteed_damage: 0,
    phase2_additional_damage: 0,
    phase3_enabled: false,
    phase3_effects: [],
    phase3_guaranteed_damage: 0,
    phase3_additional_damage: 0,
    charged_attack_enabled: false,
    grade1_enabled: false,
    grade1_effects: [],
    grade1_guaranteed_damage: 0,
    grade1_additional_damage: 0,
    grade2_enabled: false,
    grade2_effects: [],
    grade2_guaranteed_damage: 0,
    grade2_additional_damage: 0,
    grade3_enabled: false,
    grade3_effects: [],
    grade3_guaranteed_damage: 0,
    grade3_additional_damage: 0,
    phases: [],
    grades: [],
    level_warning: '',
    // defaults: tiro di percentuale e fallimento
    min_success_percentage: 0,
    failure_enabled: false,
    failure_damage_sets: [],
    failure_anomaly_mode: 'select',
    failure_anomaly_name: 'Nessuna',
    failure_anomaly_description: '',
      failure_anomaly_turns: 0,
      failure_anomaly_does_damage: false,
      failure_anomaly_damage_per_turn: 0,
      failure_anomaly_damage_effect_id: null,
      failure_anomaly_damage_effect_name: '',
      failure_anomaly_action_points_modifier: 0,
      failure_anomaly_health_modifier: 0,
      failure_anomaly_stats_modifier: { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
      failure_anomaly_probability: 0,
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
    passive_anomalies: [],
    self_anomalies: [],
    lottery_enabled: false,
    lottery_dice_faces: 0,
    lottery_numeric_choices: 0,
    lottery_correct_instances: [],
    lottery_wrong_instances: [],
  });

const pruneSpellLevelPayload = (level: any): any => {
  const isEmptyString = (v: unknown): boolean => typeof v === 'string' && v.trim().length === 0;
  const isAllZeroStats = (v: any): boolean => {
    if (!v || typeof v !== 'object') return true;
    return Object.values(v).every((x) => (typeof x === 'number' ? x : Number(x) || 0) === 0);
  };
  const isAllZeroDamageValues = (arr: any[]): boolean => {
    return arr.every((dv) =>
      (Number(dv?.guaranteed_damage) || 0) === 0 &&
      (Number(dv?.additional_damage) || 0) === 0 &&
      (Number(dv?.less_health_more_damage_guaranteed_increment) || 0) === 0 &&
      (Number(dv?.less_health_more_damage_additional_increment) || 0) === 0
    );
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

  const pruneSelfBlock = (self: any): any | undefined => {
    if (!self || typeof self !== 'object') return undefined;
    const next: any = { ...self };

    if (Array.isArray(next.damage_sets)) {
      const filtered = filterDamageSets(next.damage_sets);
      if (filtered.length > 0) next.damage_sets = filtered;
      else delete next.damage_sets;
    }

    if (Array.isArray(next.anomalies) && next.anomalies.length === 0) delete next.anomalies;

    const a = next.anomaly;
    const anomalyMeaningful =
      !!a &&
      (String(a.name ?? '').trim() !== '' && String(a.name ?? '').trim() !== 'Nessuna'
        ? true
        : !isEmptyString(a.description) ||
          (Number(a.turns) || 0) > 0 ||
          !!a.doesDamage ||
          (Number(a.damagePerTurn) || 0) > 0 ||
          (Number(a.actionPointsModifier) || 0) !== 0 ||
          (Number(a.healthModifier) || 0) !== 0 ||
          !isAllZeroStats(a.statsModifier));

    if (!anomalyMeaningful) delete next.anomaly;

    const enabled = !!next.enabled;
    const hasDamageSets = Array.isArray(next.damage_sets) && next.damage_sets.length > 0;
    const hasAnomalies = Array.isArray(next.anomalies) && next.anomalies.length > 0;
    if (!enabled && !hasDamageSets && !hasAnomalies && !anomalyMeaningful) return undefined;

    return next;
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
    if (!next.max_targets) delete next.max_targets;
    if (!next.usage_interval_turns) delete next.usage_interval_turns;
    if (!next.max_uses_per_turn) delete next.max_uses_per_turn;
    if (!next.min_success_percentage) delete next.min_success_percentage;
    if (next.extra_cost_effect_id == null || String(next.extra_cost_effect_id).trim().length === 0) delete next.extra_cost_effect_id;
    if (isEmptyString(next.extra_cost_effect_name)) delete next.extra_cost_effect_name;
    if (isEmptyString(next.level_warning)) delete next.level_warning;
    if (next.self) {
      const pruned = pruneSelfBlock(next.self);
      if (pruned) next.self = pruned;
      else delete next.self;
    }
    if (Array.isArray(next.self_damage_sets)) {
      const filtered = filterDamageSets(next.self_damage_sets);
      if (filtered.length > 0) next.self_damage_sets = filtered;
      else delete next.self_damage_sets;
    }
    return next;
  };

  const out: any = { ...level };

  if (!out.less_health_more_damage_every_hp) delete out.less_health_more_damage_every_hp;

  if (Array.isArray(out.damage_values) && out.damage_values.length > 0) {
    delete out.guaranteed_damage;
    delete out.additional_damage;
  }
  if (Array.isArray(out.damage_values)) {
    out.damage_values = out.damage_values.map((dv: any) => {
      const next: any = { ...dv };
      if (!next.less_health_more_damage_guaranteed_increment) delete next.less_health_more_damage_guaranteed_increment;
      if (!next.less_health_more_damage_additional_increment) delete next.less_health_more_damage_additional_increment;
      return next;
    });
  }
  if (!out.action_cost) delete out.action_cost;
  if (!out.indicative_action_cost) delete out.indicative_action_cost;

  if (Array.isArray(out.no_damage_turn_increase_values)) {
    if (out.no_damage_turn_increase_values.length === 0 || isAllZeroDamageValues(out.no_damage_turn_increase_values)) {
      delete out.no_damage_turn_increase_values;
    }
  }
  if (Array.isArray(out.scaled_move_stats) && out.scaled_move_stats.length === 0) delete out.scaled_move_stats;
  if (Array.isArray(out.scaled_move_skills) && out.scaled_move_skills.length === 0) delete out.scaled_move_skills;
  if (Array.isArray(out.removed_anomalies) && out.removed_anomalies.length === 0) delete out.removed_anomalies;

  if (!out.max_multiple_attacks) delete out.max_multiple_attacks;
  if (!out.min_success_percentage) delete out.min_success_percentage;
  if (!out.area_or_cone_value) delete out.area_or_cone_value;
  if (!out.max_seconds) delete out.max_seconds;
  if (!out.pa_cost_per_second) delete out.pa_cost_per_second;
  if (!out.increasing_damage_per_second) delete out.increasing_damage_per_second;
  if (!out.max_pa_investment) delete out.max_pa_investment;
  if (!out.increasing_damage_per_pa) delete out.increasing_damage_per_pa;
  if (!out.success_roll_increase_every_pa) delete out.success_roll_increase_every_pa;
  if (!out.max_projectiles) delete out.max_projectiles;
  if (!out.increasing_damage_per_projectile) delete out.increasing_damage_per_projectile;
  if (!out.turn_duration_rounds) delete out.turn_duration_rounds;
  if (!out.activation_delay_turns) delete out.activation_delay_turns;
  if (!out.knockback_meters) delete out.knockback_meters;
  if (!out.max_targets) delete out.max_targets;
  if (!out.usage_interval_turns) delete out.usage_interval_turns;
  if (!out.max_uses_per_turn) delete out.max_uses_per_turn;
  if (out.extra_cost_effect_id == null || String(out.extra_cost_effect_id).trim().length === 0) delete out.extra_cost_effect_id;
  if (isEmptyString(out.extra_cost_effect_name)) delete out.extra_cost_effect_name;

  if (!out.evocation_enabled) {
    delete out.evocation_enabled;
    delete out.evocation_type;
    delete out.weapon_light_damage;
    delete out.weapon_heavy_damage;
    delete out.weapon_thrust_damage;
    delete out.weapon_subtype;
    delete out.weapon_weight;
    delete out.weapon_description;
    delete out.weapon_damage_sets;
    delete out.weapon_stats;
    delete out.max_replicas;
    delete out.replica_source_character_id;
    delete out.energy_health;
    delete out.energy_action_points;
    delete out.energy_armour;
    delete out.energy_stats;
    delete out.energy_embedded_refs;
    delete out.energy_can_create_equipment;
    delete out.equipment;
  } else {
    const t = out.evocation_type;
    if (t === 'weapon') {
      delete out.max_replicas;
      delete out.replica_source_character_id;
      delete out.energy_health;
      delete out.energy_action_points;
      delete out.energy_armour;
      delete out.energy_stats;
      delete out.energy_embedded_refs;
      delete out.energy_can_create_equipment;
      delete out.equipment;
    } else if (t === 'replica') {
      delete out.weapon_light_damage;
      delete out.weapon_heavy_damage;
      delete out.weapon_thrust_damage;
      delete out.weapon_subtype;
      delete out.weapon_weight;
      delete out.weapon_description;
      delete out.weapon_damage_sets;
      delete out.weapon_stats;
      delete out.energy_health;
      delete out.energy_action_points;
      delete out.energy_armour;
      delete out.energy_stats;
      delete out.energy_embedded_refs;
      delete out.energy_can_create_equipment;
      delete out.equipment;
    } else if (t === 'energy') {
      delete out.weapon_light_damage;
      delete out.weapon_heavy_damage;
      delete out.weapon_thrust_damage;
      delete out.weapon_subtype;
      delete out.weapon_weight;
      delete out.weapon_description;
      delete out.weapon_damage_sets;
      delete out.weapon_stats;
      delete out.max_replicas;
      delete out.replica_source_character_id;
    }
  }

  if (!out.phase_attack_enabled) {
    delete out.phase_attack_enabled;
    delete out.phase1_enabled;
    delete out.phase1_effects;
    delete out.phase1_guaranteed_damage;
    delete out.phase1_additional_damage;
    delete out.phase2_enabled;
    delete out.phase2_effects;
    delete out.phase2_guaranteed_damage;
    delete out.phase2_additional_damage;
    delete out.phase3_enabled;
    delete out.phase3_effects;
    delete out.phase3_guaranteed_damage;
    delete out.phase3_additional_damage;
    delete out.phases;
  } else if (Array.isArray(out.phases) && out.phases.length === 0) {
    delete out.phases;
    if (!out.phase1_enabled) {
      delete out.phase1_enabled;
      delete out.phase1_effects;
      delete out.phase1_guaranteed_damage;
      delete out.phase1_additional_damage;
    }
    if (!out.phase2_enabled) {
      delete out.phase2_enabled;
      delete out.phase2_effects;
      delete out.phase2_guaranteed_damage;
      delete out.phase2_additional_damage;
    }
    if (!out.phase3_enabled) {
      delete out.phase3_enabled;
      delete out.phase3_effects;
      delete out.phase3_guaranteed_damage;
      delete out.phase3_additional_damage;
    }
  }
  if (Array.isArray(out.phases) && out.phases.length > 0) {
    out.phases = out.phases.map((p: any) => pruneMiniPayload(p));
  }

  if (!Array.isArray(out.grades) || out.grades.length === 0) {
    delete out.grades;
  } else {
    const nextGrades = out.grades.map((g: any) => pruneMiniPayload(g));
    out.grades = nextGrades;
  }

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

  if (isEmptyString(out.level_warning)) delete out.level_warning;
  if (Array.isArray(out.percentage_damage_values) && out.percentage_damage_values.length === 0) delete out.percentage_damage_values;

  if (!out.failure_enabled) {
    delete out.failure_enabled;
    delete out.failure_damage_sets;
    delete out.failure_anomaly;
    delete out.failure_anomaly_probability;
  } else if (Array.isArray(out.failure_damage_sets) && out.failure_damage_sets.length === 0) {
    delete out.failure_damage_sets;
  }

  if (out.self) {
    const pruned = pruneSelfBlock(out.self);
    if (pruned) out.self = pruned;
    else delete out.self;
  }

  return out;
};

export const AddSpellModal = ({ isOpen, onClose, editSpell = null, mode = 'add' }: AddSpellModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [anomalyOptions, setAnomalyOptions] = useState<string[]>(['Nessuna']);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  const [damageEffectOptions, setDamageEffectOptions] = useState<{ id: string; name: string }[]>([]);
  const [damageEffectLoading, setDamageEffectLoading] = useState(false);

  const form = useForm<SpellFormData>({
    defaultValues: {
      name: '',
      type: '',
      primaryBranch: '',
      secondaryBranch: 'none',
      primarySpecificity: '',
      secondarySpecificity: '',
      grade: '',
      description: '',
      levels: Array.from({ length: 10 }, (_, i) => createDefaultLevel(i + 1)),
      damageTypes: [],
      lessHealthMoreDamageEnabled: false,
      additionalDescription: '',
      story1: '',
      story2: '',
      damageShape: 'single',
      damagePerSecond: false,
      // nuove opzioni generali
      damagePerSecondIncreasing: false,
      multipleShots: false,
      multipleShotsIncreasing: false,
      // nuovi flag generali PA
      paInvestmentEnabled: false,
      damageIncreasePerPaEnabled: false,
      successRollIncreasePerPaEnabled: false,
      // nuovo toggle generale
      percentageRollEnabled: false,
      percentageDamageEnabled: false,
      percentageDamageEffects: [],
      lotteryEnabled: false,
      // nuovi flag generali
      conditionalAdditionalDamage: false,
      hasTurnDuration: false,
      // nuovi switch richiesti
      hasMaxTargets: false,
      useWeaponDamage: false,
      hasUsageInterval: false,
      hasMaxUsesPerTurn: false,
      hasSelfEffects: false,
      selfDamageEffects: [],
      // evocazione
      evocationEnabled: false,
      evocationType: 'weapon',
      // Nuovi toggle generali
      multipleAttacks: false,
      phaseAttack: false,
      chargedAttack: false,
      hasLevelWarning: false,
      // Fallimento generale
      hasFailure: false,
      failureDamageEffects: [],
      // Anomalia su utilizzatore (toggle generale)
      selfAnomalyEnabled: false,
      passiveAnomalyEnabled: false,
      passiveAnomalyAlwaysActive: false,
      removeAnomalyEnabled: false,
      // costo extra generale
      extraCostEnabled: false,
      extraCostEffectId: null,
      extraCostEffectName: '',
      // richieste aggiuntive
      difficulty: 1,
      noDamageTurnIncreaseEnabled: false,
      launchDelayEnabled: false,
      knockbackEnabled: false,
      scaledMoveEnabled: false,
    }
  });

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = form;

  const { fields: levelFields, replace: replaceLevels } = useFieldArray({
    control,
    name: 'levels'
  });

  const { fields: damageTypeFields, append: appendDamageType, remove: removeDamageType, replace: replaceDamageTypes } = useFieldArray({
    control,
    name: 'damageTypes'
  });

  // Selezione multipla degli effetti self (generale)
  const { fields: selfDamageEffectFields, append: appendSelfDamageEffect, remove: removeSelfDamageEffect, replace: replaceSelfDamageEffects } = useFieldArray({
    control,
    name: 'selfDamageEffects'
  });

  const { fields: percentageDamageEffectFields, append: appendPercentageDamageEffect, remove: removePercentageDamageEffect, replace: replacePercentageDamageEffects } = useFieldArray({
    control,
    name: 'percentageDamageEffects'
  });

  // Selezione multipla degli effetti fallimento (generale)
  const { fields: failureDamageEffectFields, append: appendFailureDamageEffect, remove: removeFailureDamageEffect, replace: replaceFailureDamageEffects } = useFieldArray({
    control,
    name: 'failureDamageEffects'
  });

  useEffect(() => {
    const loadAnomalies = async () => {
      setAnomalyLoading(true);
      try {
        const list = await listAnomalies();
        const names = (list || []).map((a: { id: string; name: string }) => a.name).filter(Boolean);
        const uniq = Array.from(new Set(['Nessuna', ...names]));
        setAnomalyOptions(uniq);
      } catch (err) {
        console.error('Errore caricando anomalie:', err);
        toast({ title: 'Errore', description: 'Impossibile caricare le anomalie', variant: 'destructive' });
        setAnomalyOptions(['Nessuna']);
      } finally {
        setAnomalyLoading(false);
      }
    };
    if (isOpen) loadAnomalies();
  }, [isOpen, toast]);

  useEffect(() => {
    const loadDamageEffects = async () => {
      setDamageEffectLoading(true);
      try {
        const list = await listDamageEffects();
        setDamageEffectOptions(list || []);
      } catch (err) {
        console.error('Errore caricando tipi di danno:', err);
        toast({ title: 'Errore', description: 'Impossibile caricare i tipi di danno', variant: 'destructive' });
        setDamageEffectOptions([]);
      } finally {
        setDamageEffectLoading(false);
      }
    };
    if (isOpen) loadDamageEffects();
  }, [isOpen, toast]);

  const watchedPrimaryBranch = watch('primaryBranch');
  const watchedSecondaryBranch = watch('secondaryBranch');
  const watchedType = watch('type');
  const watchedPrimarySpecificity = watch('primarySpecificity');
  const watchedDamageTypes = watch('damageTypes');
  const watchedLessHealthMoreDamageEnabled = watch('lessHealthMoreDamageEnabled');
  const watchedLevels = watch('levels');
  const watchedDamageShape = watch('damageShape');
  const watchedDamagePerSecond = watch('damagePerSecond');
  // nuovi watcher generali
  const watchedDamagePerSecondIncreasing = watch('damagePerSecondIncreasing');
  const watchedMultipleShots = watch('multipleShots');
  const watchedMultipleShotsIncreasing = watch('multipleShotsIncreasing');
  // Nuovi watcher
  const watchedMultipleAttacks = watch('multipleAttacks');
  const watchedPhaseAttack = watch('phaseAttack');
  const watchedChargedAttack = watch('chargedAttack');
  const watchedHasLevelWarning = watch('hasLevelWarning');
  const watchedPercentageRollEnabled = watch('percentageRollEnabled');
  const watchedPercentageDamageEnabled = watch('percentageDamageEnabled');
  const watchedLotteryEnabled = watch('lotteryEnabled');
  const watchedHasFailure = watch('hasFailure');
  const watchedFailureDamageEffects = watch('failureDamageEffects');
  const watchedSelfAnomalyEnabled = watch('selfAnomalyEnabled');
  const watchedPassiveAnomalyEnabled = watch('passiveAnomalyEnabled');
  const watchedRemoveAnomalyEnabled = watch('removeAnomalyEnabled');
  const watchedExtraCostEnabled = watch('extraCostEnabled');
  const watchedPaInvestmentEnabled = watch('paInvestmentEnabled');
  const watchedDamageIncreasePerPaEnabled = watch('damageIncreasePerPaEnabled');
  const watchedSuccessRollIncreasePerPaEnabled = watch('successRollIncreasePerPaEnabled');
  const watchedConditionalAdditionalDamage = watch('conditionalAdditionalDamage');
  const watchedHasTurnDuration = watch('hasTurnDuration');
  const watchedHasMaxTargets = watch('hasMaxTargets');
  const watchedUseWeaponDamage = watch('useWeaponDamage');
  const watchedHasUsageInterval = watch('hasUsageInterval');
  const watchedHasMaxUsesPerTurn = watch('hasMaxUsesPerTurn');
  const watchedHasSelfEffects = watch('hasSelfEffects');
  const watchedSelfDamageEffects = watch('selfDamageEffects');
  const watchedPercentageDamageEffects = watch('percentageDamageEffects');
  // evocazione
  const watchedEvocationEnabled = watch('evocationEnabled');
  const watchedEvocationType = watch('evocationType');
  const watchedExtraCostEffectName = watch('extraCostEffectName');
  const watchedExtraCostEffectId = watch('extraCostEffectId');
  const watchedNoDamageTurnIncreaseEnabled = watch('noDamageTurnIncreaseEnabled');
  const watchedLaunchDelayEnabled = watch('launchDelayEnabled');
  const watchedKnockbackEnabled = watch('knockbackEnabled');
  const watchedScaledMoveEnabled = watch('scaledMoveEnabled');
  const watchedDifficulty = watch('difficulty');
  const [levelStatsQueries, setLevelStatsQueries] = useState<Record<number, string>>({});
  const [levelSkillsQueries, setLevelSkillsQueries] = useState<Record<number, string>>({});

  // Evocazioni da Supabase (STATE + HELPERS) — devono stare DENTRO al componente
  const [evocationList, setEvocationList] = useState<Array<{ id: string; name: string; evocation_type: 'weapon' | 'entity' | 'replica' }>>([]);
  const [selectedEvocation, setSelectedEvocation] = useState<any | null>(null);
  const [selectedEvocationId, setSelectedEvocationId] = useState<string>('');

  // Stato e gestori per AnomalyModal per configurazione per livello
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [anomalyModalKind, setAnomalyModalKind] = useState<'failure' | 'self' | 'passive'>('failure');
  const [anomalyModalLevelIndex, setAnomalyModalLevelIndex] = useState<number | null>(null);
  const [anomalyModalItemIndex, setAnomalyModalItemIndex] = useState<number | null>(null);
  const [editingAnomaly, setEditingAnomaly] = useState<any | null>(null);

  const openAnomalyModal = (levelIndex: number, kind: 'failure' | 'self' | 'passive', itemIndex: number | null = null) => {
    setAnomalyModalLevelIndex(levelIndex);
    setAnomalyModalKind(kind);
    setAnomalyModalItemIndex((kind === 'passive' || kind === 'self') ? itemIndex : null);
    const level = watchedLevels?.[levelIndex];
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
        name: name === 'Nessuna' ? '' : name,
        description: description || '',
        turns: turns || 0,
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
    // Aggiunge l'anomalia all'elenco se nuova
    if (!anomalyOptions.includes(name)) {
      setAnomalyOptions((prev) => [...prev, name]);
    }
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
          setValue('selfAnomalyEnabled', true, { shouldDirty: true });
          const first = existing[0] || null;
          if (first) {
            setValue(`${base}self_anomaly_mode`, 'custom');
            setValue(`${base}self_anomaly_name`, (first?.name ?? 'Nessuna').toString().trim() || 'Nessuna');
            setValue(`${base}self_anomaly_description`, (first?.description ?? '').toString());
            setValue(`${base}self_anomaly_turns`, Number(first?.turns) || 0);
            setValue(`${base}self_anomaly_does_damage`, !!first?.doesDamage);
            setValue(`${base}self_anomaly_damage_per_turn`, Number(first?.damagePerTurn) || 0);
            setValue(`${base}self_anomaly_damage_effect_id`, first?.damageEffectId ?? null);
            setValue(`${base}self_anomaly_damage_effect_name`, (first?.damageEffectName ?? '').toString());
            setValue(`${base}self_anomaly_action_points_modifier`, Number(first?.actionPointsModifier) || 0);
            setValue(`${base}self_anomaly_health_modifier`, Number(first?.healthModifier) || 0);
            setValue(`${base}self_anomaly_stats_modifier`, first?.statsModifier || { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 });
          } else {
            setValue(`${base}self_anomaly_mode`, 'select');
            setValue(`${base}self_anomaly_name`, 'Nessuna');
            setValue(`${base}self_anomaly_description`, '');
            setValue(`${base}self_anomaly_turns`, 0);
            setValue(`${base}self_anomaly_does_damage`, false);
            setValue(`${base}self_anomaly_damage_per_turn`, 0);
            setValue(`${base}self_anomaly_damage_effect_id`, null);
            setValue(`${base}self_anomaly_damage_effect_name`, '');
            setValue(`${base}self_anomaly_action_points_modifier`, 0);
            setValue(`${base}self_anomaly_health_modifier`, 0);
            setValue(`${base}self_anomaly_stats_modifier`, { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 });
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

  useEffect(() => {
    const loadEvocations = async () => {
      try {
        const list = await listEvocations();
        setEvocationList(list as any);
      } catch (e) {
        console.warn('Errore caricando evocazioni', e);
        setEvocationList([]);
      }
    };
    if (isOpen && watchedEvocationEnabled) loadEvocations();
  }, [isOpen, watchedEvocationEnabled]);

  const mapTypeToSupabase = (t: 'weapon' | 'replica' | 'energy') => (t === 'energy' ? 'entity' : t);

  const applyEvocationToLevels = (def: any) => {
    if (!def || !Array.isArray(def.levels)) return;
    // Se i tipi differiscono, sincronizza il tipo del form con quello dell'evocazione
    const nextType: 'weapon' | 'replica' | 'energy' = def.evocation_type === 'entity' ? 'energy' : def.evocation_type;
    setValue('evocationEnabled', true, { shouldDirty: true });
    setValue('evocationType', nextType, { shouldDirty: true });

    // Colleziona tutti i nomi dei damage sets (by_type) per settare i Tipi di danno generali
    if (def.evocation_type === 'entity') {
      const namesSet = new Set<string>();
      (def.levels || []).forEach((lvl: any) => {
        const byType = lvl?.entity?.damage?.by_type || lvl?.damageByType || [];
        byType.forEach((d: any) => {
          const nm = (d?.name || '').trim();
          if (nm) namesSet.add(nm);
        });
      });
      const names = Array.from(namesSet).map((n) => ({ name: n }));
      if (names.length > 0) {
        setValue('damageTypes', names, { shouldDirty: true });
      }
    }

    const readNum = (obj: any, keys: string[]) => {
      for (const k of keys) {
        const v = obj?.[k];
        const num = Number(v);
        if (v != null && !Number.isNaN(num)) return num;
      }
      return 0;
    };
    const readMaybeNum = (obj: any, keys: string[]): number | undefined => {
      for (const k of keys) {
        const v = obj?.[k];
        if (v == null) continue;
        const num = Number(v);
        if (!Number.isNaN(num)) return num;
      }
      return undefined;
    };

    for (let idx = 0; idx < 10; idx++) {
      const src = def.levels[idx] || {};
      setValue(`levels.${idx}.turn_duration_rounds`, readNum(src, ['turn_duration_rounds', 'turnDurationRounds']), { shouldDirty: true });
      const ac = readMaybeNum(src, ['action_cost', 'actionCost', 'pa_cost', 'paCost']);
      if (ac !== undefined) {
        setValue(`levels.${idx}.action_cost`, ac, { shouldDirty: true });
      }
      const iac = readMaybeNum(src, ['indicative_action_cost', 'indicativeActionCost', 'indicative_pa_cost', 'indicativePaCost']);
      if (iac !== undefined) {
        setValue(`levels.${idx}.indicative_action_cost`, iac, { shouldDirty: true });
      }

      if (def.evocation_type === 'entity') {
        // Leggi struttura annidata dall'admin modal: src.entity
        const ent = src?.entity || {};
        const specifics = ent?.specifics || {};
        setValue(`levels.${idx}.energy_health`, specifics?.health ?? 0, { shouldDirty: true });
        setValue(`levels.${idx}.energy_action_points`, specifics?.action_points ?? 0, { shouldDirty: true });
        setValue(`levels.${idx}.energy_armour`, specifics?.armor ?? 0, { shouldDirty: true });
        // Salva snapshot completo dell'equipaggiamento importato (se presente)
        if (ent?.equipment) {
          setValue(`levels.${idx}.equipment`, ent.equipment, { shouldDirty: true });
        }
        // Stats (array di {statKey, amount})
        if (Array.isArray(ent?.stats)) {
          setValue(
            `levels.${idx}.energy_stats`,
            ent.stats.map((r: any) => ({ statKey: r.statKey, amount: r.amount })),
            { shouldDirty: true }
          );
        }
        // Refs embedded da spells/abilities
        const refs: any[] = [];
        if (Array.isArray(ent?.spells)) {
          ent.spells.forEach((s: any) => refs.push({ refId: s.id, refType: 'spell', refName: s.name, refLevel: s.level ?? 1 }));
        }
        if (Array.isArray(ent?.abilities)) {
          ent.abilities.forEach((a: any) => refs.push({ refId: a.id, refType: 'ability', refName: a.name, refLevel: a.level ?? 1 }));
        }
        setValue(`levels.${idx}.energy_embedded_refs`, refs, { shouldDirty: true });
        setValue(`levels.${idx}.energy_can_create_equipment`, !!ent?.equipment, { shouldDirty: true });

        // Importa damage sets (by_type) con nome e danni nei campi di livello
        const byType = ent?.damage?.by_type || src?.damageByType || [];
        if (Array.isArray(byType) && byType.length > 0) {
          // Recupera i tipi generali già impostati o derivati sopra
          const typeNames: string[] = ((Array.isArray((watch as any)('damageTypes')) ? (watch as any)('damageTypes') : [])
            .map((t: any) => (t?.name || '').trim())
            .filter((n: string) => !!n));
          const names = typeNames.length > 0 ? typeNames : byType.map((d: any) => (d?.name || '').trim()).filter((n: string) => !!n);
          const nextDamageValues = names.map((nm: string) => {
            const found = byType.find((d: any) => ((d?.name || '').trim()) === nm) || null;
            const effectId = (damageEffectOptions || []).find((opt) => opt.name === nm)?.id || '';
            return {
              typeName: nm,
              damageEffectId: effectId,
              guaranteed_damage: typeof found?.assured_damage === 'number' ? found.assured_damage : 0,
              additional_damage: typeof found?.additional_damage === 'number' ? found.additional_damage : 0,
            };
          });
          setValue(`levels.${idx}.damage_values`, nextDamageValues, { shouldDirty: true });
        }
      }

      if (def.evocation_type === 'weapon') {
        const wp = src?.weapon || {};
        const dataSets = Array.isArray(wp?.data?.damage_sets) ? wp.data.damage_sets : [];
        const firstSet = dataSets[0] || null;
        const light = typeof firstSet?.damage_veloce === 'number' ? firstSet.damage_veloce : (Number(wp?.damageVeloce) || 0);
        const heavy = typeof firstSet?.damage_pesante === 'number' ? firstSet.damage_pesante : (Number(wp?.damagePesante) || 0);
        const thrust = typeof firstSet?.damage_affondo === 'number' ? firstSet.damage_affondo : (Number(wp?.damageAffondo) || 0);
        setValue(`levels.${idx}.weapon_light_damage`, light, { shouldDirty: true });
        setValue(`levels.${idx}.weapon_heavy_damage`, heavy, { shouldDirty: true });
        setValue(`levels.${idx}.weapon_thrust_damage`, thrust, { shouldDirty: true });

        // salva anche meta arma e set di danno completi
        const subtype = typeof wp?.subtype === 'string' ? wp.subtype : '';
        const weightNum = typeof wp?.weight === 'number' ? wp.weight : Number(wp?.weight) || 0;
        const description = typeof wp?.description === 'string' ? wp.description : '';
        setValue(`levels.${idx}.weapon_subtype`, subtype, { shouldDirty: true });
        setValue(`levels.${idx}.weapon_weight`, weightNum, { shouldDirty: true });
        setValue(`levels.${idx}.weapon_description`, description, { shouldDirty: true });

        const sanitizedSets = dataSets.map((s: any) => ({
          effect_name: (s?.effect_name ?? '').trim(),
          damage_veloce: typeof s?.damage_veloce === 'number' ? s.damage_veloce : Number(s?.damage_veloce) || 0,
          damage_pesante: typeof s?.damage_pesante === 'number' ? s.damage_pesante : Number(s?.damage_pesante) || 0,
          damage_affondo: typeof s?.damage_affondo === 'number' ? s.damage_affondo : Number(s?.damage_affondo) || 0,
          calculated_damage_veloce: typeof s?.calculated_damage_veloce === 'number' ? s.calculated_damage_veloce : Number(s?.calculated_damage_veloce) || 0,
          calculated_damage_pesante: typeof s?.calculated_damage_pesante === 'number' ? s.calculated_damage_pesante : Number(s?.calculated_damage_pesante) || 0,
          calculated_damage_affondo: typeof s?.calculated_damage_affondo === 'number' ? s.calculated_damage_affondo : Number(s?.calculated_damage_affondo) || 0,
        }));
        setValue(`levels.${idx}.weapon_damage_sets`, sanitizedSets, { shouldDirty: true });

        // salva statistiche arma (solo valori non nulli)
        const statsObj = (wp as any)?.stats || {};
        const statsEntries = Object.entries(statsObj)
          .map(([k, v]) => ({ statKey: String(k), amount: Number(v) || 0 }))
          .filter((s) => (s.amount || 0) !== 0);
        setValue(`levels.${idx}.weapon_stats`, statsEntries, { shouldDirty: true });
      }

      if (def.evocation_type === 'replica') {
        // Struttura annidata replica
        const rep = src?.replica || {};
        setValue(`levels.${idx}.max_replicas`, Number(rep?.max_replicas) || 1, { shouldDirty: true });
        const specificId = rep?.origin === 'specific' ? (rep?.source_character_id ?? '') : '';
        setValue(`levels.${idx}.replica_source_character_id`, specificId, { shouldDirty: true });
      }
      // Per 'weapon', i danni restano manuali; comunque riempiamo i costi.
    }
  };

  // Helper per selezionare/deselezionare effect nei campi per livello
  const toggleLevelEffects = (
    lvlIndex: number,
    key:
      | 'phase1_effects'
      | 'phase2_effects'
      | 'phase3_effects'
      | 'grade1_effects'
      | 'grade2_effects'
      | 'grade3_effects',
    effectName: string,
    checked: boolean
  ) => {
    const current = Array.isArray(watchedLevels?.[lvlIndex]?.[key])
      ? [...(watchedLevels?.[lvlIndex]?.[key] as string[])]
      : [];
    const next = checked
      ? Array.from(new Set([...current, effectName]))
      : current.filter((n) => n !== effectName);
    setValue(`levels.${lvlIndex}.${key}` as const, next, { shouldDirty: true });
  };

  const onSelectEvocation = async (id: string) => {
    try {
      setSelectedEvocationId(id);
      const def = await getEvocationById(id);
      setSelectedEvocation(def);
      applyEvocationToLevels(def);
    } catch (e) {
      console.error('Errore caricando evocazione:', e);
    }
  };

  // Funzioni helper
  const getAllBranches = () => {
    return Object.keys(MAGIC_BRANCHES);
  };

  const getSpecificitiesForBranch = (branch: string) => {
    return MAGIC_BRANCHES[branch as keyof typeof MAGIC_BRANCHES] || [];
  };

  const getGradesForSpecificity = (specificity: string) => {
    return SPECIFICITY_GRADES[specificity as keyof typeof SPECIFICITY_GRADES] || ['Semplice', 'Avanzata', 'Suprema'];
  };

  // Effetto per pre-popolare i campi in modalità modifica
  useEffect(() => {
    if (mode === 'edit' && editSpell) {
      setValue('name', editSpell.name);
      setValue('type', editSpell.type);
      setValue('primaryBranch', editSpell.primary_branch);
      setValue('secondaryBranch', editSpell.secondary_branch || 'none');
      setValue('primarySpecificity', editSpell.primary_specificity);
      setValue('secondarySpecificity', editSpell.secondary_specificity || '');
      setValue('grade', editSpell.grade);
      setValue('description', editSpell.description);
      setValue('additionalDescription', editSpell.additional_description);
      setValue('story1', editSpell.story1 || '');
      setValue('story2', editSpell.story2 || '');
      if (editSpell.levels) {
        // Applica valori di default se mancanti anche per la forma del danno e nuovi campi di livello
        const sourceLevels = Array.isArray(editSpell.levels) ? editSpell.levels : [];
        const sanitizedLevels = Array.from({ length: 10 }, (_, idx) => {
          const levelNum = idx + 1;
          const lvl = sourceLevels.find((l: any) => Number(l?.level) === levelNum) ?? sourceLevels[idx];
          if (!lvl) return createDefaultLevel(levelNum);
          return {
            ...createDefaultLevel(levelNum),
            ...lvl,
            damage_shape: lvl.damage_shape ?? 'single',
            removed_anomalies: Array.isArray((lvl as any).removed_anomalies) ? ((lvl as any).removed_anomalies as any[]).map((n: any) => (n ?? '').toString()) : [],
            less_health_more_damage_every_hp: typeof (lvl as any).less_health_more_damage_every_hp === 'number'
              ? (lvl as any).less_health_more_damage_every_hp
              : Number((lvl as any).less_health_more_damage_every_hp ?? (lvl as any).lessHealthMoreDamageEveryHp) || 0,
            area_or_cone_value: typeof lvl.area_or_cone_value === 'number' ? lvl.area_or_cone_value : 0,
            chain_targets: typeof lvl.chain_targets === 'number' ? lvl.chain_targets : 1,
            max_seconds: typeof lvl.max_seconds === 'number' ? lvl.max_seconds : 0,
            pa_cost_per_second: typeof lvl.pa_cost_per_second === 'number' ? lvl.pa_cost_per_second : 0,
            increasing_damage_per_second: typeof lvl.increasing_damage_per_second === 'number' ? lvl.increasing_damage_per_second : 0,
            max_pa_investment: typeof lvl.max_pa_investment === 'number' ? lvl.max_pa_investment : 0,
            increasing_damage_per_pa: typeof lvl.increasing_damage_per_pa === 'number' ? lvl.increasing_damage_per_pa : 0,
            success_roll_increase_every_pa: typeof (lvl as any).success_roll_increase_every_pa === 'number'
              ? (lvl as any).success_roll_increase_every_pa
              : Number((lvl as any).success_roll_increase_every_pa) || 0,
            max_projectiles: typeof lvl.max_projectiles === 'number' ? lvl.max_projectiles : 0,
            increasing_damage_per_projectile: typeof lvl.increasing_damage_per_projectile === 'number' ? lvl.increasing_damage_per_projectile : 0,
            conditional_additional_damage: typeof lvl.conditional_additional_damage === 'boolean' ? lvl.conditional_additional_damage : false,
            turn_duration_rounds: typeof lvl.turn_duration_rounds === 'number' ? lvl.turn_duration_rounds : 0,
            no_damage_turn_increase_values: (() => {
              const arr = Array.isArray((lvl as any).no_damage_turn_increase_values) ? (lvl as any).no_damage_turn_increase_values : null;
              if (arr && arr.length > 0) {
                return arr.map((dv: any) => ({
                  typeName: ((dv?.typeName ?? '') as string).trim(),
                  guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                  additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                }));
              }
              const perTurn = Number((lvl as any).no_damage_turn_increase_per_turn) || 0;
              const gvals = Array.isArray((lvl as any).damage_values) ? (lvl as any).damage_values : [];
              return gvals.map((dv: any) => ({
                typeName: ((dv?.typeName ?? '') as string).trim(),
                guaranteed_damage: perTurn,
                additional_damage: 0,
              }));
            })(),
            activation_delay_turns: typeof (lvl as any).activation_delay_turns === 'number' ? (lvl as any).activation_delay_turns : Number((lvl as any).activation_delay_turns) || 0,
            knockback_meters: typeof (lvl as any).knockback_meters === 'number' ? (lvl as any).knockback_meters : Number((lvl as any).knockback_meters) || 0,
            scaled_move_stats: Array.isArray((lvl as any).scaled_move_stats) ? (lvl as any).scaled_move_stats : [],
            scaled_move_skills: Array.isArray((lvl as any).scaled_move_skills) ? (lvl as any).scaled_move_skills : [],
            max_targets: typeof lvl.max_targets === 'number' ? lvl.max_targets : 0,
            usage_interval_turns: typeof lvl.usage_interval_turns === 'number' ? lvl.usage_interval_turns : 0,
            max_uses_per_turn: typeof (lvl as any).max_uses_per_turn === 'number' ? (lvl as any).max_uses_per_turn : Number((lvl as any).max_uses_per_turn) || 0,
            use_weapon_damage: typeof lvl.use_weapon_damage === 'boolean' ? lvl.use_weapon_damage : false,
            self_effect_enabled: typeof (lvl.self?.enabled ?? lvl.self_effect_enabled) === 'boolean' ? (lvl.self?.enabled ?? lvl.self_effect_enabled) : false,
            self_damage_sets: Array.isArray(lvl.self?.damage_sets) ? lvl.self.damage_sets : (Array.isArray(lvl.self_damage_sets) ? lvl.self_damage_sets : []),
            evocation_enabled: typeof lvl.evocation_enabled === 'boolean' ? lvl.evocation_enabled : false,
            evocation_type: (lvl.evocation_type as any) ?? 'weapon',
            weapon_light_damage: typeof lvl.weapon_light_damage === 'number' ? lvl.weapon_light_damage : 0,
            weapon_heavy_damage: typeof lvl.weapon_heavy_damage === 'number' ? lvl.weapon_heavy_damage : 0,
            weapon_thrust_damage: typeof lvl.weapon_thrust_damage === 'number' ? lvl.weapon_thrust_damage : 0,
            max_replicas: typeof lvl.max_replicas === 'number' ? lvl.max_replicas : 0,
            replica_source_character_id: typeof lvl.replica_source_character_id === 'string' ? lvl.replica_source_character_id : '',
            energy_health: typeof lvl.energy_health === 'number' ? lvl.energy_health : 0,
            energy_action_points: typeof lvl.energy_action_points === 'number' ? lvl.energy_action_points : 0,
            energy_armour: typeof lvl.energy_armour === 'number' ? lvl.energy_armour : 0,
            energy_stats: Array.isArray(lvl.energy_stats) ? lvl.energy_stats : [],
            energy_embedded_refs: Array.isArray(lvl.energy_embedded_refs) ? lvl.energy_embedded_refs : [],
            energy_can_create_equipment: typeof lvl.energy_can_create_equipment === 'boolean' ? lvl.energy_can_create_equipment : false,
            self_anomaly_mode: (lvl.self?.anomaly?.mode ?? lvl.self_anomaly_mode) ?? 'select',
            self_anomaly_name: (lvl.self?.anomaly?.name ?? lvl.self_anomaly_name) ?? 'Nessuna',
            self_anomaly_description: (lvl.self?.anomaly?.description ?? lvl.self_anomaly_description) ?? '',
            self_anomaly_turns: typeof (lvl.self?.anomaly?.turns ?? lvl.self_anomaly_turns) === 'number' ? (lvl.self?.anomaly?.turns ?? lvl.self_anomaly_turns) : 0,
            self_anomaly_does_damage: !!(lvl.self?.anomaly?.doesDamage ?? lvl.self_anomaly_does_damage),
            self_anomaly_damage_per_turn: Number(lvl.self?.anomaly?.damagePerTurn ?? lvl.self_anomaly_damage_per_turn) || 0,
            self_anomaly_damage_effect_id: (lvl.self?.anomaly?.damageEffectId ?? lvl.self_anomaly_damage_effect_id) ?? null,
            self_anomaly_damage_effect_name: (lvl.self?.anomaly?.damageEffectName ?? lvl.self_anomaly_damage_effect_name) ?? '',
            self_anomaly_action_points_modifier: Number(lvl.self?.anomaly?.actionPointsModifier ?? lvl.self_anomaly_action_points_modifier) || 0,
            self_anomaly_health_modifier: Number(lvl.self?.anomaly?.healthModifier ?? lvl.self_anomaly_health_modifier) || 0,
            self_anomaly_stats_modifier: (typeof (lvl.self?.anomaly?.statsModifier ?? lvl.self_anomaly_stats_modifier) === 'object' && (lvl.self?.anomaly?.statsModifier ?? lvl.self_anomaly_stats_modifier))
              ? (lvl.self?.anomaly?.statsModifier ?? lvl.self_anomaly_stats_modifier)
              : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
            failure_anomaly_probability: typeof (lvl.failure_anomaly_probability) === 'number' ? lvl.failure_anomaly_probability : 0,
            failure_anomaly_mode: (lvl.failure_anomaly?.mode ?? lvl.failure_anomaly_mode) ?? 'select',
            failure_anomaly_name: (lvl.failure_anomaly?.name ?? lvl.failure_anomaly_name) ?? 'Nessuna',
            failure_anomaly_description: (lvl.failure_anomaly?.description ?? lvl.failure_anomaly_description) ?? '',
            failure_anomaly_turns: typeof (lvl.failure_anomaly?.turns ?? lvl.failure_anomaly_turns) === 'number' ? (lvl.failure_anomaly?.turns ?? lvl.failure_anomaly_turns) : 0,
            failure_anomaly_does_damage: !!(lvl.failure_anomaly?.doesDamage ?? lvl.failure_anomaly_does_damage),
            failure_anomaly_damage_per_turn: Number(lvl.failure_anomaly?.damagePerTurn ?? lvl.failure_anomaly_damage_per_turn) || 0,
            failure_anomaly_damage_effect_id: (lvl.failure_anomaly?.damageEffectId ?? lvl.failure_anomaly_damage_effect_id) ?? null,
            failure_anomaly_damage_effect_name: (lvl.failure_anomaly?.damageEffectName ?? lvl.failure_anomaly_damage_effect_name) ?? '',
            failure_anomaly_action_points_modifier: Number(lvl.failure_anomaly?.actionPointsModifier ?? lvl.failure_anomaly_action_points_modifier) || 0,
            failure_anomaly_health_modifier: Number(lvl.failure_anomaly?.healthModifier ?? lvl.failure_anomaly_health_modifier) || 0,
            failure_anomaly_stats_modifier: (typeof (lvl.failure_anomaly?.statsModifier ?? lvl.failure_anomaly_stats_modifier) === 'object' && (lvl.failure_anomaly?.statsModifier ?? lvl.failure_anomaly_stats_modifier))
              ? (lvl.failure_anomaly?.statsModifier ?? lvl.failure_anomaly_stats_modifier)
              : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
            passive_anomalies: Array.isArray((lvl as any)?.passive_anomalies) ? ((lvl as any).passive_anomalies as any[]) : [],
            self_anomalies: (() => {
              const src = Array.isArray((lvl as any)?.self?.anomalies)
                ? ((lvl as any).self.anomalies as any[])
                : (Array.isArray((lvl as any)?.self_anomalies) ? ((lvl as any).self_anomalies as any[]) : []);
              return src.map((a: any) => ({
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
                  : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
                alwaysActive: !!(a?.alwaysActive ?? a?.always_active),
                sourceType: (a?.sourceType ?? a?.source_type) || undefined,
                sourceId: (a?.sourceId ?? a?.source_id) || undefined,
              }));
            })()
          };
        });
        replaceLevels(sanitizedLevels);

        // Deriva opzioni generali da livelli esistenti
        const firstShape = editSpell.levels?.[0]?.damage_shape ?? 'single';
        setValue('damageShape', firstShape);
        setValue('difficulty', Number((editSpell as any)?.difficulty ?? 1) || 1);

        const anyDPS = editSpell.levels?.some((lvl: any) =>
          (lvl.max_seconds ?? 0) > 0 ||
          (lvl.pa_cost_per_second ?? 0) > 0 ||
          (lvl.increasing_damage_per_second ?? 0) > 0
        ) ?? false;
        setValue('damagePerSecond', anyDPS);

        const anyDPSIncreasing = editSpell.levels?.some((lvl: any) =>
          (lvl.increasing_damage_per_second ?? 0) > 0
        ) ?? false;
        setValue('damagePerSecondIncreasing', anyDPSIncreasing);

        // Deriva nuovi toggle PA
        const anyPaInvestment = editSpell.levels?.some((lvl: any) => (lvl.max_pa_investment ?? 0) > 0) ?? false;
        setValue('paInvestmentEnabled', anyPaInvestment);
        const anyDamageIncreasePa = editSpell.levels?.some((lvl: any) => (lvl.increasing_damage_per_pa ?? 0) > 0) ?? false;
        setValue('damageIncreasePerPaEnabled', anyDamageIncreasePa);
        const anySuccessRollIncreasePa = editSpell.levels?.some((lvl: any) => Number((lvl as any)?.success_roll_increase_every_pa ?? 0) > 0) ?? false;
        setValue('successRollIncreasePerPaEnabled', anySuccessRollIncreasePa);

        const anyMulti = editSpell.levels?.some((lvl: any) =>
          (lvl.max_projectiles ?? 0) > 0
        ) ?? false;
        setValue('multipleShots', anyMulti);

        const anyMultiIncreasing = editSpell.levels?.some((lvl: any) =>
          (lvl.increasing_damage_per_projectile ?? 0) > 0
        ) ?? false;
        setValue('multipleShotsIncreasing', anyMultiIncreasing);

        const anyConditional = editSpell.levels?.some((lvl: any) => !!lvl.conditional_additional_damage) ?? false;
        setValue('conditionalAdditionalDamage', anyConditional);

        const anyTurnDuration = editSpell.levels?.some((lvl: any) => (lvl.turn_duration_rounds ?? 0) > 0) ?? false;
        setValue('hasTurnDuration', anyTurnDuration);

        const anyNoDmgInc = editSpell.levels?.some((lvl: any) => {
          const arr = Array.isArray((lvl as any).no_damage_turn_increase_values) ? (lvl as any).no_damage_turn_increase_values : [];
          const hasArr = arr.some((v: any) => (Number(v?.guaranteed_damage || 0) > 0) || (Number(v?.additional_damage || 0) > 0));
          const legacy = Number((lvl as any).no_damage_turn_increase_per_turn ?? 0) > 0;
          return hasArr || legacy;
        }) ?? false;
        setValue('noDamageTurnIncreaseEnabled', anyNoDmgInc);

        const anyLaunchDelay = editSpell.levels?.some((lvl: any) => Number((lvl as any).activation_delay_turns ?? 0) > 0) ?? false;
        setValue('launchDelayEnabled', anyLaunchDelay);

        const anyKnockback = editSpell.levels?.some((lvl: any) => Number((lvl as any).knockback_meters ?? 0) > 0) ?? false;
        setValue('knockbackEnabled', anyKnockback);

        const anyScaledMove = editSpell.levels?.some((lvl: any) => {
          const stats = Array.isArray((lvl as any).scaled_move_stats) ? (lvl as any).scaled_move_stats : [];
          const skills = Array.isArray((lvl as any).scaled_move_skills) ? (lvl as any).scaled_move_skills : [];
          return (stats.length > 0) || (skills.length > 0);
        }) ?? false;
        setValue('scaledMoveEnabled', anyScaledMove);

        // Evocazione: deriva flag e tipologia
        const anyEvocation = editSpell.levels?.some((lvl: any) => !!lvl.evocation_enabled) ?? false;
        setValue('evocationEnabled', anyEvocation);
        const firstEvType = editSpell.levels?.find((lvl: any) => !!lvl.evocation_type)?.evocation_type ?? 'weapon';
        setValue('evocationType', firstEvType as any);

        // Pre-popolare i tipi di danno dai livelli esistenti in modalità modifica
        const typeSet = new Set<string>();
        editSpell.levels.forEach((lvl: any) => {
          const dmgVals = Array.isArray(lvl.damage_values) ? lvl.damage_values : [];
          dmgVals.forEach((dv: any) => {
            const name = (dv.typeName ?? '').trim();
            if (name) typeSet.add(name);
          });
        });
        const derivedDamageTypes = Array.from(typeSet).map((name) => ({ name }));
        replaceDamageTypes(derivedDamageTypes);

        // Deriva effetti self dai livelli (livello, gradi, istanze lotteria + legacy)
        const selfSet = new Set<string>();
        const modeLookup: Record<string, 'classic' | 'percentage'> = {};
        editSpell.levels.forEach((lvl: any) => {
          const addFromSets = (arr?: any[]) => {
            (Array.isArray(arr) ? arr : []).forEach((s: any) => {
              const nm = (s?.effect_name || '').trim();
              if (!nm) return;
              selfSet.add(nm);
              if (!modeLookup[nm]) {
                modeLookup[nm] = (s?.mode === 'percentage') ? 'percentage' : 'classic';
              }
            });
          };
          addFromSets(lvl.self_damage_sets);
          addFromSets(lvl?.self?.damage_sets);
          const grades = Array.isArray((lvl as any)?.grades) ? ((lvl as any).grades as any[]) : [];
          grades.forEach((g: any) => {
            addFromSets((g as any)?.self_damage_sets);
            addFromSets((g as any)?.self?.damage_sets);
          });
          const corr = Array.isArray((lvl as any)?.lottery_correct_instances) ? ((lvl as any).lottery_correct_instances as any[]) : [];
          const wrong = Array.isArray((lvl as any)?.lottery_wrong_instances) ? ((lvl as any).lottery_wrong_instances as any[]) : [];
          corr.forEach((inst: any) => {
            addFromSets(inst?.self_damage_sets);
            addFromSets(inst?.self?.damage_sets);
          });
          wrong.forEach((inst: any) => {
            addFromSets(inst?.self_damage_sets);
            addFromSets(inst?.self?.damage_sets);
          });
          const single = (lvl?.self_damage_effect || '').trim();
          if (single) {
            selfSet.add(single);
            if (!modeLookup[single]) modeLookup[single] = 'classic';
          }
        });
        const derivedSelfEffects = Array.from(selfSet).map((name) => ({ name, mode: modeLookup[name] || 'classic' }));
        if (derivedSelfEffects.length > 0) {
          replaceSelfDamageEffects(derivedSelfEffects);
          setValue('hasSelfEffects', true, { shouldDirty: true });
        } else {
          replaceSelfDamageEffects([]);
          const anySelf = editSpell.levels?.some((lvl: any) => !!lvl.self_effect_enabled) ?? false;
          setValue('hasSelfEffects', anySelf, { shouldDirty: true });
        }

        // Deriva effetti percentuali dai livelli
        const percSet = new Set<string>();
        editSpell.levels.forEach((lvl: any) => {
          const pvals = Array.isArray((lvl as any)?.percentage_damage_values) ? ((lvl as any).percentage_damage_values as any[]) : [];
          pvals.forEach((pv: any) => {
            const nm = (pv?.typeName || '').trim();
            if (nm) percSet.add(nm);
          });
        });
        const derivedPercentageEffects = Array.from(percSet).map((name) => ({ name }));
        if (derivedPercentageEffects.length > 0) {
          replacePercentageDamageEffects(derivedPercentageEffects);
          setValue('percentageDamageEnabled', true, { shouldDirty: true });
        } else {
          replacePercentageDamageEffects([]);
          const anyPercentEnabled = editSpell.levels?.some((lvl: any) => Array.isArray((lvl as any)?.percentage_damage_values) && ((lvl as any).percentage_damage_values.length > 0)) ?? false;
          setValue('percentageDamageEnabled', anyPercentEnabled, { shouldDirty: true });
        }

        const anyUsageInterval = editSpell.levels?.some((lvl: any) => (lvl.usage_interval_turns ?? 0) > 0) ?? false;
        setValue('hasUsageInterval', anyUsageInterval, { shouldDirty: true });

        const anyMaxUsesPerTurn = editSpell.levels?.some((lvl: any) => (lvl.max_uses_per_turn ?? 0) > 0) ?? false;
        setValue('hasMaxUsesPerTurn', anyMaxUsesPerTurn, { shouldDirty: true });

        const anyUseWeapon = editSpell.levels?.some((lvl: any) => !!lvl.use_weapon_damage) ?? false;
        setValue('useWeaponDamage', anyUseWeapon, { shouldDirty: true });

        const anyMaxTargets = editSpell.levels?.some((lvl: any) => (lvl.max_targets ?? 0) > 0) ?? false;
        setValue('hasMaxTargets', anyMaxTargets, { shouldDirty: true });

        const anyLottery = editSpell.levels?.some((lvl: any) => !!(lvl.lottery_enabled)) ?? false;
        setValue('lotteryEnabled', anyLottery, { shouldDirty: true });

        const anyLessHealthMoreDamage = editSpell.levels?.some((lvl: any) => {
          const everyHp = Number((lvl as any)?.less_health_more_damage_every_hp ?? (lvl as any)?.lessHealthMoreDamageEveryHp ?? 0) || 0;
          if (everyHp > 0) return true;
          const vals = Array.isArray((lvl as any)?.damage_values) ? ((lvl as any).damage_values as any[]) : [];
          return vals.some((dv: any) =>
            (Number(dv?.less_health_more_damage_guaranteed_increment ?? dv?.lessHealthMoreDamageGuaranteedIncrement ?? 0) || 0) !== 0 ||
            (Number(dv?.less_health_more_damage_additional_increment ?? dv?.lessHealthMoreDamageAdditionalIncrement ?? 0) || 0) !== 0
          );
        }) ?? false;
        setValue('lessHealthMoreDamageEnabled', anyLessHealthMoreDamage, { shouldDirty: true });

        const anyFailure = editSpell.levels?.some((lvl: any) => !!(lvl.failure_enabled) || (Array.isArray((lvl as any)?.failure_damage_sets) && ((lvl as any).failure_damage_sets.length > 0))) ?? false;
        setValue('hasFailure', anyFailure, { shouldDirty: true });

        const failSet = new Set<string>();
        editSpell.levels.forEach((lvl: any) => {
          const sets = Array.isArray((lvl as any)?.failure_damage_sets) ? ((lvl as any).failure_damage_sets as any[]) : [];
          sets.forEach((s: any) => {
            const nm = (s?.effect_name || '').trim();
            if (nm) failSet.add(nm);
          });
        });
        const derivedFailureEffects = Array.from(failSet).map((name) => {
          try {
            const lvlWith = editSpell.levels.find((l: any) => Array.isArray((l as any)?.failure_damage_sets) && ((l as any).failure_damage_sets.some((s: any) => ((s?.effect_name || '').trim()) === name)));
            const setRow = lvlWith?.failure_damage_sets?.find((s: any) => ((s?.effect_name || '').trim()) === name);
            const mode = (setRow?.mode === 'percentage') ? 'percentage' : 'classic';
            return { name, mode };
          } catch {
            return { name } as any;
          }
        });
        if (derivedFailureEffects.length > 0) {
          replaceFailureDamageEffects(derivedFailureEffects);
        } else {
          replaceFailureDamageEffects([]);
        }

        const anyPhaseAttack = editSpell.levels?.some((lvl: any) => (
          !!(lvl.phase_attack_enabled) ||
          (Array.isArray((lvl as any)?.phases) && ((lvl as any).phases.length > 0)) ||
          !!(lvl.phase1_enabled) || !!(lvl.phase2_enabled) || !!(lvl.phase3_enabled)
        )) ?? false;
        setValue('phaseAttack', anyPhaseAttack, { shouldDirty: true });

        const anyMultipleAttacks = editSpell.levels?.some((lvl: any) => (
          (Number(lvl.max_multiple_attacks || 0) > 0)
        )) ?? false;
        setValue('multipleAttacks', anyMultipleAttacks, { shouldDirty: true });

        const anyChargedAttack = editSpell.levels?.some((lvl: any) => Array.isArray((lvl as any)?.grades) && ((lvl as any).grades.length > 0)) ?? false;
        setValue('chargedAttack', anyChargedAttack, { shouldDirty: true });

        const anyLevelWarning = editSpell.levels?.some((lvl: any) => ((lvl.level_warning ?? '').toString().trim().length > 0)) ?? false;
        setValue('hasLevelWarning', anyLevelWarning, { shouldDirty: true });

        const anyPercentageRoll = editSpell.levels?.some((lvl: any) => (Number((lvl.min_success_percentage ?? 0)) > 0)) ?? false;
        setValue('percentageRollEnabled', anyPercentageRoll, { shouldDirty: true });

        const anyExtraCost = editSpell.levels?.some((lvl: any) => (Number((lvl.extra_action_cost ?? 0)) > 0)) ?? false;
        setValue('extraCostEnabled', anyExtraCost, { shouldDirty: true });

        const firstExtraEffLevel = editSpell.levels?.find((lvl: any) => {
          const nm = (((lvl as any).extra_cost_effect_name ?? '') as string).trim();
          const idv = (lvl as any).extra_cost_effect_id ?? null;
          return nm.length > 0 || idv !== null;
        });
        if (firstExtraEffLevel) {
          const nm = (((firstExtraEffLevel as any).extra_cost_effect_name ?? '') as string).trim();
          const idv = (firstExtraEffLevel as any).extra_cost_effect_id ?? null;
          if (nm) setValue('extraCostEffectName', nm, { shouldDirty: true });
          setValue('extraCostEffectId', idv, { shouldDirty: true });
        }

        const anySelfAnomaly = editSpell.levels?.some((lvl: any) => {
          const list = Array.isArray(lvl?.self?.anomalies)
            ? (lvl.self.anomalies as any[])
            : (Array.isArray(lvl?.self_anomalies) ? (lvl.self_anomalies as any[]) : []);
          if (list.length > 0) return true;
          const an = (lvl.self?.anomaly ?? null) as any;
          const name = ((an?.name ?? lvl.self_anomaly_name ?? '') as string).trim();
          const desc = ((an?.description ?? lvl.self_anomaly_description ?? '') as string).trim();
          const turns = Number(an?.turns ?? (lvl.self_anomaly_turns ?? 0)) || 0;
          const doesDamage = !!(an?.doesDamage ?? lvl.self_anomaly_does_damage);
          const dmgPerTurn = Number(an?.damagePerTurn ?? (lvl.self_anomaly_damage_per_turn ?? 0)) || 0;
          const effectId = (an?.damageEffectId ?? lvl.self_anomaly_damage_effect_id) ?? null;
          const effectName = ((an?.damageEffectName ?? lvl.self_anomaly_damage_effect_name ?? '') as string).trim();
          const apMod = Number(an?.actionPointsModifier ?? (lvl.self_anomaly_action_points_modifier ?? 0)) || 0;
          const hpMod = Number(an?.healthModifier ?? (lvl.self_anomaly_health_modifier ?? 0)) || 0;
          const stats = (an?.statsModifier ?? lvl.self_anomaly_stats_modifier) || {};
          const hasStats = Object.values(stats).some((v: any) => Number(v || 0) !== 0);
          return !!name || !!desc || turns > 0 || doesDamage || dmgPerTurn > 0 || !!effectId || !!effectName || apMod !== 0 || hpMod !== 0 || hasStats;
        }) ?? false;
        setValue('selfAnomalyEnabled', anySelfAnomaly, { shouldDirty: true });

        const anyPassiveAnomaly = editSpell.levels?.some((lvl: any) => Array.isArray((lvl as any)?.passive_anomalies) && ((lvl as any).passive_anomalies.length > 0)) ?? false;
        setValue('passiveAnomalyEnabled', editSpell.type === 'Passiva' ? anyPassiveAnomaly : false, { shouldDirty: true });

        const anyPassiveAlwaysActive = editSpell.levels?.some((lvl: any) =>
          Array.isArray((lvl as any)?.passive_anomalies) &&
          ((lvl as any).passive_anomalies || []).some((a: any) => !!(a?.alwaysActive ?? a?.always_active))
        ) ?? false;
        setValue('passiveAnomalyAlwaysActive', (editSpell.type === 'Passiva' && anyPassiveAnomaly) ? anyPassiveAlwaysActive : false, { shouldDirty: true });

        const anyRemoveAnomaly = editSpell.levels?.some((lvl: any) => Array.isArray((lvl as any)?.removed_anomalies) && ((lvl as any).removed_anomalies.length > 0)) ?? false;
        setValue('removeAnomalyEnabled', anyRemoveAnomaly, { shouldDirty: true });
      }
    } else {
      reset();
    }
  }, [mode, editSpell, setValue, reset, replaceLevels, replaceDamageTypes, replaceSelfDamageEffects, replacePercentageDamageEffects, replaceFailureDamageEffects]);

  useEffect(() => {
    if (!watchedPassiveAnomalyEnabled) {
      setValue('passiveAnomalyAlwaysActive', false, { shouldDirty: true });
    }
  }, [watchedPassiveAnomalyEnabled, setValue]);

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

  // Sincronizza i tipi di danno su tutti i livelli (dentro il componente)
  useEffect(() => {
    const types = Array.isArray(watchedDamageTypes) ? watchedDamageTypes : [];
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];

    // Filtra tipi vuoti e normalizza i nomi
    const filteredTypes = types
      .map((t: { name: string; id?: string }) => {
        const name = (t.name ?? '').trim();
        const idFromType = typeof t.id === 'string' ? t.id : '';
        const idFromOptions = (damageEffectOptions || []).find((opt) => opt.name === name)?.id || '';
        return { name, id: idFromType || idFromOptions };
      })
      .filter((t) => !!t.name);

    // Evita di azzerare i valori esistenti se non ci sono tipi definiti
    if (filteredTypes.length === 0) {
      return;
    }

    levels.forEach((lvl, idx) => {
      const existing = Array.isArray(lvl.damage_values) ? lvl.damage_values : [];
      const next = filteredTypes.map((t) => {
        const found = existing.find((v: any) => ((v.typeName ?? '').trim()) === t.name);
        return {
          typeName: t.name,
          damageEffectId: found?.damageEffectId ?? found?.damage_effect_id ?? (t.id || ''),
          guaranteed_damage: found?.guaranteed_damage ?? 0,
          additional_damage: found?.additional_damage ?? 0,
          less_health_more_damage_guaranteed_increment: Number(found?.less_health_more_damage_guaranteed_increment) || 0,
          less_health_more_damage_additional_increment: Number(found?.less_health_more_damage_additional_increment) || 0,
        };
      });
      setValue(`levels.${idx}.damage_values`, next, { shouldDirty: true });
    });
  }, [watchedDamageTypes, watchedLevels, damageEffectOptions, setValue]);

  // Sincronizza la forma del danno generale su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.damage_shape`, watchedDamageShape, { shouldDirty: true });
    });
  }, [watchedDamageShape, watchedLevels, setValue]);

  // Se "Danno al secondo" è No, azzera i secondi massimi, costo PA e danno crescente al secondo su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedDamagePerSecond) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.max_seconds`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.pa_cost_per_second`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.increasing_damage_per_second`, 0, { shouldDirty: true });
      });
    }
  }, [watchedDamagePerSecond, watchedLevels, setValue]);

  // Se "Danno crescente?" per DPS è No, azzera "Danno crescente per secondo" sui livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedDamagePerSecondIncreasing) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.increasing_damage_per_second`, 0, { shouldDirty: true });
      });
    }
  }, [watchedDamagePerSecondIncreasing, watchedLevels, setValue]);

  // Se "Tiri multipli?" è No, azzera "Proiettili massimi" e "Danno crescente per proiettile" sui livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedMultipleShots) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.max_projectiles`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.increasing_damage_per_projectile`, 0, { shouldDirty: true });
      });
    }
  }, [watchedMultipleShots, watchedLevels, setValue]);

  // Se "Danno crescente?" per tiri multipli è No, azzera "Danno crescente per proiettile" sui livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedMultipleShotsIncreasing) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.increasing_damage_per_projectile`, 0, { shouldDirty: true });
      });
    }
  }, [watchedMultipleShotsIncreasing, watchedLevels, setValue]);

  // Nuovo: se "Incremento costo PA?" è No, azzera "Valore consumo massimo PA" sui livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedPaInvestmentEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.max_pa_investment`, 0, { shouldDirty: true });
      });
    }
  }, [watchedPaInvestmentEnabled, watchedLevels, setValue]);

  // Nuovo: se "Incremento danno per PA?" è No, azzera "Tasso di crescita per PA" sui livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedDamageIncreasePerPaEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.increasing_damage_per_pa`, 0, { shouldDirty: true });
      });
    }
  }, [watchedDamageIncreasePerPaEnabled, watchedLevels, setValue]);

  useEffect(() => {
    if (!watchedPaInvestmentEnabled) {
      setValue('damageIncreasePerPaEnabled', false, { shouldDirty: true });
      setValue('successRollIncreasePerPaEnabled', false, { shouldDirty: true });
    }
  }, [watchedPaInvestmentEnabled, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedSuccessRollIncreasePerPaEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.success_roll_increase_every_pa`, 0, { shouldDirty: true });
      });
    }
  }, [watchedSuccessRollIncreasePerPaEnabled, watchedLevels, setValue]);

  // Nuovo: se "Quanti bersagli?" è No, azzera max_targets su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasMaxTargets) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.max_targets`, 0, { shouldDirty: true });
      });
    }
  }, [watchedHasMaxTargets, watchedLevels, setValue]);

  // Nuovo: sincronizza "Usa anche danno arma?" su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.use_weapon_damage`, !!watchedUseWeaponDamage, { shouldDirty: true });
    });
  }, [watchedUseWeaponDamage, watchedLevels, setValue]);

  // Nuovo: se "Utilizzo ogni quanti turni?" è No, azzera usage_interval_turns su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasUsageInterval) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.usage_interval_turns`, 0, { shouldDirty: true });
        // Nuovo: azzera anche per tutti i gradi del livello
        const lvl = levels[idx] as any;
        const gradesArr = Array.isArray(lvl?.grades) ? (lvl.grades as any[]) : [];
        if (gradesArr.length > 0) {
          const nextGrades = gradesArr.map((g: any) => ({ ...g, usage_interval_turns: 0 }));
          setValue(`levels.${idx}.grades`, nextGrades, { shouldDirty: true });
        }
      });
    }
  }, [watchedHasUsageInterval, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasMaxUsesPerTurn) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.max_uses_per_turn`, 0, { shouldDirty: true });
      });
    }
  }, [watchedHasMaxUsesPerTurn, watchedLevels, setValue]);

  // Nuovo: sincronizza "Effetti su utilizzatore?" su tutti i livelli e pulizia quando disattivo
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((lvl, idx) => {
      setValue(`levels.${idx}.self_effect_enabled`, !!watchedHasSelfEffects, { shouldDirty: true });
      if (!watchedHasSelfEffects) {
        setValue(`levels.${idx}.self_damage_sets`, [], { shouldDirty: true });
      }
    });
  }, [watchedHasSelfEffects, watchedLevels, setValue]);

  // Nuovo: sincronizza selezione multipla degli effetti self con i set per livello
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    const effectsRaw = Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : [];
    const effects = effectsRaw.map((e: any) => (e?.name || '').trim()).filter((n: string) => !!n);
    const modeByName: Record<string, 'classic' | 'percentage'> = effectsRaw.reduce((acc: any, e: any) => {
      const nm = (e?.name || '').trim();
      if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
      return acc;
    }, {});

    if (!watchedHasSelfEffects || effects.length === 0) {
      // se disattivo o nessun effect selezionato, non forzo nulla (pulizia già gestita sopra)
      return;
    }

    levels.forEach((lvl, idx) => {
      const existing: any[] = Array.isArray(lvl?.self_damage_sets) ? (lvl.self_damage_sets as any[]) : [];
      const next = effects.map((name: string) => {
        const found = existing.find((s: any) => ((s?.effect_name || '').trim()) === name) || null;
        return {
          effect_name: name,
          guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : 0,
          max_damage: typeof found?.max_damage === 'number' ? found.max_damage : 0,
          mode: modeByName[name] || 'classic',
          guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : 0,
          max_percentage_damage: typeof found?.max_percentage_damage === 'number' ? found.max_percentage_damage : 0,
        };
      });
      setValue(`levels.${idx}.self_damage_sets`, next, { shouldDirty: true });
    });
  }, [watchedSelfDamageEffects, watchedHasSelfEffects, watchedLevels, setValue]);

  // Nuovo: sincronizza "Fallimento" generale su tutti i livelli e pulizia quando disattivo
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((lvl, idx) => {
      setValue(`levels.${idx}.failure_enabled`, !!watchedHasFailure, { shouldDirty: true });
      if (!watchedHasFailure) {
        setValue(`levels.${idx}.failure_damage_sets`, [], { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_mode`, 'select', { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_name`, 'Nessuna', { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_description`, '', { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_turns`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_action_points_modifier`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_health_modifier`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_stats_modifier`, { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 }, { shouldDirty: true });
        setValue(`levels.${idx}.failure_anomaly_probability`, 0, { shouldDirty: true });
      }
    });
  }, [watchedHasFailure, watchedLevels, setValue]);

  // Nuovo: sincronizza selezione multipla degli effetti di fallimento con i set per livello
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    const effectsRaw = Array.isArray(watchedFailureDamageEffects) ? watchedFailureDamageEffects : [];
    const effects = effectsRaw.map((e: any) => (e?.name || '').trim()).filter((n: string) => !!n);
    const modeByName: Record<string, 'classic' | 'percentage'> = effectsRaw.reduce((acc: any, e: any) => {
      const nm = (e?.name || '').trim();
      if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
      return acc;
    }, {});

    if (!watchedHasFailure || effects.length === 0) {
      return;
    }

    levels.forEach((lvl, idx) => {
      const existing: any[] = Array.isArray((lvl as any)?.failure_damage_sets) ? ((lvl as any).failure_damage_sets as any[]) : [];
      const next = effects.map((name: string) => {
        const found = existing.find((s: any) => ((s?.effect_name || '').trim()) === name) || null;
        return {
          effect_name: name,
          guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : 0,
          max_damage: typeof found?.max_damage === 'number' ? found.max_damage : 0,
          mode: modeByName[name] || 'classic',
          guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : 0,
          max_percentage_damage: typeof found?.max_percentage_damage === 'number' ? found.max_percentage_damage : 0,
        };
      });
      setValue(`levels.${idx}.failure_damage_sets`, next, { shouldDirty: true });
    });
  }, [watchedFailureDamageEffects, watchedHasFailure, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    const effectsRaw = Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : [];
    const effects = effectsRaw.map((e: any) => (e?.name || '').trim()).filter((n: string) => !!n);
    const modeByName: Record<string, 'classic' | 'percentage'> = effectsRaw.reduce((acc: any, e: any) => {
      const nm = (e?.name || '').trim();
      if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
      return acc;
    }, {});

    if (!watchedHasSelfEffects || effects.length === 0) {
      return;
    }

    levels.forEach((lvl, idx) => {
      const gradesArr = Array.isArray((lvl as any)?.grades) ? (((lvl as any).grades) as any[]) : [];
      if (gradesArr.length > 0) {
        const nextGrades = gradesArr.map((g: any) => {
          const existing: any[] = Array.isArray((g as any)?.self_damage_sets) ? (((g as any).self_damage_sets) as any[]) : [];
          const next = effects.map((name: string) => {
            const found = existing.find((s: any) => ((s?.effect_name || '').trim()) === name) || null;
            return {
              effect_name: name,
              guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : Number(found?.guaranteed_damage) || 0,
              max_damage: typeof found?.max_damage === 'number' ? found.max_damage : Number(found?.max_damage) || 0,
              mode: (typeof found?.mode === 'string') ? found.mode : (modeByName[name] || 'classic'),
              guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : Number(found?.guaranteed_percentage_damage) || 0,
              max_percentage_damage: typeof found?.max_percentage_damage === 'number' ? found.max_percentage_damage : Number(found?.max_percentage_damage) || 0,
            };
          });
          return { ...g, self_damage_sets: next };
        });
        setValue(`levels.${idx}.grades`, nextGrades, { shouldDirty: true });
      }

      const corrArr = Array.isArray((lvl as any)?.lottery_correct_instances) ? (((lvl as any).lottery_correct_instances) as any[]) : [];
      if (corrArr.length > 0) {
        const nextCorr = corrArr.map((inst: any) => {
          const existing: any[] = Array.isArray(inst?.self_damage_sets) ? (inst.self_damage_sets as any[]) : [];
          const next = effects.map((name: string) => {
            const found = existing.find((s: any) => ((s?.effect_name || '').trim()) === name) || null;
            return {
              effect_name: name,
              guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : Number(found?.guaranteed_damage) || 0,
              max_damage: typeof found?.max_damage === 'number' ? found.max_damage : Number(found?.max_damage) || 0,
              mode: (typeof found?.mode === 'string') ? found.mode : (modeByName[name] || 'classic'),
              guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : Number(found?.guaranteed_percentage_damage) || 0,
              max_percentage_damage: typeof found?.max_percentage_damage === 'number' ? found.max_percentage_damage : Number(found?.max_percentage_damage) || 0,
            };
          });
          return { ...inst, self_damage_sets: next };
        });
        setValue(`levels.${idx}.lottery_correct_instances`, nextCorr, { shouldDirty: true });
      }

      const wrongArr = Array.isArray((lvl as any)?.lottery_wrong_instances) ? (((lvl as any).lottery_wrong_instances) as any[]) : [];
      if (wrongArr.length > 0) {
        const nextWrong = wrongArr.map((inst: any) => {
          const existing: any[] = Array.isArray(inst?.self_damage_sets) ? (inst.self_damage_sets as any[]) : [];
          const next = effects.map((name: string) => {
            const found = existing.find((s: any) => ((s?.effect_name || '').trim()) === name) || null;
            return {
              effect_name: name,
              guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : Number(found?.guaranteed_damage) || 0,
              max_damage: typeof found?.max_damage === 'number' ? found.max_damage : Number(found?.max_damage) || 0,
              mode: (typeof found?.mode === 'string') ? found.mode : (modeByName[name] || 'classic'),
              guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : Number(found?.guaranteed_percentage_damage) || 0,
              max_percentage_damage: typeof found?.max_percentage_damage === 'number' ? found.max_percentage_damage : Number(found?.max_percentage_damage) || 0,
            };
          });
          return { ...inst, self_damage_sets: next };
        });
        setValue(`levels.${idx}.lottery_wrong_instances`, nextWrong, { shouldDirty: true });
      }
    });
  }, [watchedSelfDamageEffects, watchedHasSelfEffects, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    const effects = Array.isArray(watchedPercentageDamageEffects)
      ? watchedPercentageDamageEffects.map((e: any) => (e?.name || '').trim()).filter((n: string) => !!n)
      : [];
    if (!watchedPercentageDamageEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.percentage_damage_values`, [], { shouldDirty: true });
        const gradesArr = Array.isArray((levels[idx] as any)?.grades) ? (((levels[idx] as any).grades) as any[]) : [];
        if (gradesArr.length > 0) {
          const nextGrades = gradesArr.map((g: any) => ({ ...g, percentage_damage_values: [] }));
          setValue(`levels.${idx}.grades`, nextGrades, { shouldDirty: true });
        }
      });
      return;
    }
    if (effects.length === 0) return;
    levels.forEach((lvl, idx) => {
      const existing: any[] = Array.isArray((lvl as any)?.percentage_damage_values) ? ((lvl as any).percentage_damage_values as any[]) : [];
      const next = effects.map((name: string) => {
        const found = existing.find((s: any) => ((s?.typeName || '').trim()) === name) || null;
        return {
          typeName: name,
          guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : Number(found?.guaranteed_percentage_damage) || 0,
          additional_percentage_damage: typeof found?.additional_percentage_damage === 'number' ? found.additional_percentage_damage : Number(found?.additional_percentage_damage) || 0,
        };
      });
      setValue(`levels.${idx}.percentage_damage_values`, next, { shouldDirty: true });
    });
  }, [watchedPercentageDamageEffects, watchedPercentageDamageEnabled, watchedLevels, setValue]);

  // Pulizia self anomaly su livelli quando il toggle generale è disattivato
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedSelfAnomalyEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.self_anomaly_mode`, 'select', { shouldDirty: true });
        setValue(`levels.${idx}.self_anomaly_name`, 'Nessuna', { shouldDirty: true });
        setValue(`levels.${idx}.self_anomaly_description`, '', { shouldDirty: true });
        setValue(`levels.${idx}.self_anomaly_turns`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.self_anomaly_action_points_modifier`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.self_anomaly_health_modifier`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.self_anomaly_stats_modifier`, { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 }, { shouldDirty: true });
      });
    }
  }, [watchedSelfAnomalyEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (watchedType !== 'Passiva' || !watchedPassiveAnomalyEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.passive_anomalies`, [], { shouldDirty: true });
      });
    }
  }, [watchedPassiveAnomalyEnabled, watchedType, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedExtraCostEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.extra_cost_effect_id`, null, { shouldDirty: true });
        setValue(`levels.${idx}.extra_cost_effect_name`, '', { shouldDirty: true });
      });
      return;
    }
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.extra_cost_effect_id`, watchedExtraCostEffectId ?? null, { shouldDirty: true });
      setValue(`levels.${idx}.extra_cost_effect_name`, watchedExtraCostEffectName ?? '', { shouldDirty: true });
    });
  }, [watchedExtraCostEffectName, watchedExtraCostEffectId, watchedExtraCostEnabled, watchedLevels, setValue]);

  // Nuovo: sincronizza "Danno aggiuntivo condizionale" su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.conditional_additional_damage`, !!watchedConditionalAdditionalDamage, { shouldDirty: true });
    });
  }, [watchedConditionalAdditionalDamage, watchedLevels, setValue]);

  // Nuovo: se "Durata in turni?" è No, azzera "Quanti turni dura?" su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedHasTurnDuration) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.turn_duration_rounds`, 0, { shouldDirty: true });
      });
    }
  }, [watchedHasTurnDuration, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedNoDamageTurnIncreaseEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.no_damage_turn_increase_values`, [], { shouldDirty: true });
      });
      return;
    }
    const typeNames = (Array.isArray(watchedDamageTypes) ? watchedDamageTypes : [])
      .map((t: any) => (t?.name ?? '').trim())
      .filter((n: string) => !!n);
    levels.forEach((lvl: any, idx: number) => {
      const existing = Array.isArray((lvl as any)?.no_damage_turn_increase_values)
        ? ((lvl as any).no_damage_turn_increase_values as any[])
        : [];
      const next = typeNames.map((name: string, i: number) => {
        const found = existing.find((s: any) => ((s?.typeName || '').trim()) === name) || existing[i] || null;
        return {
          typeName: name,
          guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : Number(found?.guaranteed_damage) || 0,
          additional_damage: typeof found?.additional_damage === 'number' ? found.additional_damage : Number(found?.additional_damage) || 0,
        };
      });
      setValue(`levels.${idx}.no_damage_turn_increase_values`, next, { shouldDirty: true });
    });
  }, [watchedDamageTypes, watchedNoDamageTurnIncreaseEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedLaunchDelayEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.activation_delay_turns`, 0, { shouldDirty: true });
      });
    }
  }, [watchedLaunchDelayEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedKnockbackEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.knockback_meters`, 0, { shouldDirty: true });
      });
    }
  }, [watchedKnockbackEnabled, watchedLevels, setValue]);

  useEffect(() => {
    if (!watchedPhaseAttack) return;
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    const baseEffects = (Array.isArray(watchedDamageTypes) ? watchedDamageTypes : [])
      .map((t: any) => (t?.name ?? '').toString().trim())
      .filter((n: string) => !!n && n !== 'Nessuna');
    const basePercentEffects = (watchedPercentageDamageEnabled && Array.isArray(watchedPercentageDamageEffects))
      ? watchedPercentageDamageEffects
          .map((t: any) => (t?.name ?? '').toString().trim())
          .filter((n: string) => !!n && n !== 'Nessuna')
      : [];

    levels.forEach((lvl: any, idx) => {
      setValue(`levels.${idx}.phase_attack_enabled`, true, { shouldDirty: true });

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
        max_projectiles: watchedMultipleShots ? (Number(lvl?.max_projectiles) || 0) : 0,
        increasing_damage_per_projectile: (watchedMultipleShots && watchedMultipleShotsIncreasing) ? (Number(lvl?.increasing_damage_per_projectile) || 0) : 0,
        max_pa_investment: watchedPaInvestmentEnabled ? (Number(lvl?.max_pa_investment) || 0) : 0,
        increasing_damage_per_pa: (watchedPaInvestmentEnabled && watchedDamageIncreasePerPaEnabled) ? (Number(lvl?.increasing_damage_per_pa) || 0) : 0,
        success_roll_increase_every_pa: (watchedPaInvestmentEnabled && watchedSuccessRollIncreasePerPaEnabled) ? (Number(lvl?.success_roll_increase_every_pa) || 0) : 0,
        conditional_additional_damage: watchedConditionalAdditionalDamage ? !!lvl?.conditional_additional_damage : false,
        turn_duration_rounds: watchedHasTurnDuration ? (Number(lvl?.turn_duration_rounds) || 0) : 0,
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
    watchedMultipleShots,
    watchedMultipleShotsIncreasing,
    watchedPaInvestmentEnabled,
    watchedDamageIncreasePerPaEnabled,
    watchedSuccessRollIncreasePerPaEnabled,
    watchedConditionalAdditionalDamage,
    watchedHasTurnDuration,
    watchedHasMaxTargets,
    watchedHasUsageInterval,
    watchedHasMaxUsesPerTurn,
    watchedPercentageRollEnabled,
    watchedLaunchDelayEnabled,
    watchedKnockbackEnabled,
    setValue,
  ]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedPhaseAttack) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.phase_attack_enabled`, false, { shouldDirty: true });
        setValue(`levels.${idx}.phases`, [], { shouldDirty: true });
      });
    }
  }, [watchedPhaseAttack, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!watchedScaledMoveEnabled) {
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.scaled_move_stats`, [], { shouldDirty: true });
        setValue(`levels.${idx}.scaled_move_skills`, [], { shouldDirty: true });
      });
    }
  }, [watchedScaledMoveEnabled, watchedLevels, setValue]);

  // Evocazione: pulizia se il ramo non è Evocazione
  useEffect(() => {
    const isEvocationBranch = watchedPrimaryBranch === 'Evocazione' || watchedSecondaryBranch === 'Evocazione';
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    if (!isEvocationBranch) {
      setValue('evocationEnabled', false, { shouldDirty: true });
      setValue('evocationType', 'weapon', { shouldDirty: true });
      levels.forEach((_, idx) => {
        setValue(`levels.${idx}.evocation_enabled`, false, { shouldDirty: true });
        setValue(`levels.${idx}.evocation_type`, 'weapon', { shouldDirty: true });
      });
    }
  }, [watchedPrimaryBranch, watchedSecondaryBranch, watchedLevels, setValue]);

  // Evocazione: se disabilitata, azzera tipologia
  useEffect(() => {
    if (!watchedEvocationEnabled) {
      setValue('evocationType', 'weapon', { shouldDirty: true });
    }
  }, [watchedEvocationEnabled, setValue]);

  // Nuovo: sincronizza i flag evocazione su tutti i livelli
  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.evocation_enabled`, !!watchedEvocationEnabled, { shouldDirty: true });
    });
  }, [watchedEvocationEnabled, watchedLevels, setValue]);

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.lottery_enabled`, !!watchedLotteryEnabled, { shouldDirty: true });
      if (!watchedLotteryEnabled) {
        setValue(`levels.${idx}.lottery_dice_faces`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.lottery_numeric_choices`, 0, { shouldDirty: true });
        setValue(`levels.${idx}.lottery_correct_instances`, [], { shouldDirty: true });
        setValue(`levels.${idx}.lottery_wrong_instances`, [], { shouldDirty: true });
      }
    });
  }, [watchedLotteryEnabled, watchedLevels, setValue]);

  useEffect(() => {
    if (watchedLessHealthMoreDamageEnabled) return;
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((lvl: any, idx) => {
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

  useEffect(() => {
    const levels = Array.isArray(watchedLevels) ? watchedLevels : [];
    levels.forEach((_, idx) => {
      setValue(`levels.${idx}.evocation_type`, watchedEvocationType, { shouldDirty: true });
    });
  }, [watchedEvocationType, watchedLevels, setValue]);

  const onSubmit = async (data: SpellFormData) => {
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per aggiungere una magia",
        variant: "destructive",
      });
      return;
    }

    // Validazione nomi dei tipi di danno: obbligatori e univoci
    const typeNames = (data.damageTypes || []).map((dt) => (dt.name ?? '').trim());
    if (typeNames.length > 0) {
      const hasEmpty = typeNames.some((n) => !n);
      const duplicates = typeNames.filter((n, i) => n && typeNames.indexOf(n) !== i);
      if (hasEmpty) {
        toast({
          title: "Tipi di danno mancanti",
          description: "Inserisci un nome per ogni tipo di danno.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (duplicates.length > 0) {
        toast({
          title: "Tipi di danno duplicati",
          description: "I nomi dei tipi di danno devono essere univoci.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const safeTrim = (v: any) => String(v ?? '').trim();
      // Crea la categoria concatenata nel formato RamoPrincipale_Specificità_Grado
      const primaryCategory = `${data.primaryBranch}_${data.primarySpecificity}_${data.grade}`;
      const secondaryCategory = data.secondaryBranch && data.secondaryBranch !== 'none' && data.secondarySpecificity
        ? `${data.secondaryBranch}_${data.secondarySpecificity}_${data.grade}`
        : null;

      const spellPayload = {
        name: safeTrim(data.name),
        type: data.type,
        primary_branch: data.primaryBranch,
        secondary_branch: data.secondaryBranch === 'none' ? null : data.secondaryBranch,
        primary_specificity: data.primarySpecificity,
        secondary_specificity: data.secondarySpecificity || null,
        grade: data.grade,
        category: primaryCategory,
        secondary_category: secondaryCategory,
        description: safeTrim(data.description),
        additional_description: safeTrim(data.additionalDescription),
        story_1: safeTrim(data.story1) || null,
        story_2: safeTrim(data.story2) || null,
        difficulty: Number(data.difficulty || 1) || 1,
        // Normalizza i livelli e rimuove i campi legacy dei gradi
        levels: (Array.isArray(data.levels) ? data.levels : []).map((lvl) => {
          const {
            grade1_enabled,
            grade1_effects,
            grade1_guaranteed_damage,
            grade1_additional_damage,
            grade2_enabled,
            grade2_effects,
            grade2_guaranteed_damage,
            grade2_additional_damage,
            grade3_enabled,
            grade3_effects,
            grade3_guaranteed_damage,
            grade3_additional_damage,
            charged_attack_enabled,
            ...lvlRest
          } = (lvl as any);

        const normalizedTypes = (data.damageTypes || [])
          .map((dt) => (dt.name ?? '').trim())
          .filter((n) => !!n);
        const normalizedPercentTypes = (data.percentageDamageEffects || [])
          .map((dt) => (dt.name ?? '').trim())
          .filter((n) => !!n);

          const vals = Array.isArray(lvlRest.damage_values) ? lvlRest.damage_values : [];
          const damage_values = normalizedTypes.length > 0
            ? normalizedTypes.map((name, i) => {
                const dv = vals?.[i];
                return {
                  typeName: name,
                  damageEffectId: (dv?.damageEffectId ?? dv?.damage_effect_id ?? null) ? String(dv?.damageEffectId ?? dv?.damage_effect_id) : undefined,
                  guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                  additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                  less_health_more_damage_guaranteed_increment: data.lessHealthMoreDamageEnabled
                    ? (typeof dv?.less_health_more_damage_guaranteed_increment === 'number'
                        ? dv.less_health_more_damage_guaranteed_increment
                        : Number(dv?.less_health_more_damage_guaranteed_increment) || 0)
                    : 0,
                  less_health_more_damage_additional_increment: data.lessHealthMoreDamageEnabled
                    ? (typeof dv?.less_health_more_damage_additional_increment === 'number'
                        ? dv.less_health_more_damage_additional_increment
                        : Number(dv?.less_health_more_damage_additional_increment) || 0)
                    : 0,
                };
              })
            : vals.map((dv: any) => ({
                typeName: (dv?.typeName ?? '').trim(),
                damageEffectId: (dv?.damageEffectId ?? dv?.damage_effect_id ?? null) ? String(dv?.damageEffectId ?? dv?.damage_effect_id) : undefined,
                guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                less_health_more_damage_guaranteed_increment: data.lessHealthMoreDamageEnabled
                  ? (typeof dv?.less_health_more_damage_guaranteed_increment === 'number'
                      ? dv.less_health_more_damage_guaranteed_increment
                      : Number(dv?.less_health_more_damage_guaranteed_increment) || 0)
                  : 0,
                less_health_more_damage_additional_increment: data.lessHealthMoreDamageEnabled
                  ? (typeof dv?.less_health_more_damage_additional_increment === 'number'
                      ? dv.less_health_more_damage_additional_increment
                      : Number(dv?.less_health_more_damage_additional_increment) || 0)
                  : 0,
              }));

          const pvals = Array.isArray((lvlRest as any).percentage_damage_values) ? (lvlRest as any).percentage_damage_values : [];
          const percentage_damage_values = normalizedPercentTypes.length > 0
            ? normalizedPercentTypes.map((name, i) => {
                const dv = pvals?.[i];
                return {
                  typeName: name,
                  guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                  additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                };
              })
            : pvals.map((dv: any) => ({
                typeName: (dv?.typeName ?? '').trim(),
                guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
              }));

          const phases = Array.isArray((lvlRest as any).phases)
            ? ((lvlRest as any).phases as any[]).map((p) => {
              const pvals = Array.isArray(p?.damage_values) ? p.damage_values : [];
              const phase_damage_values = normalizedTypes.length > 0
                ? normalizedTypes.map((name, i) => {
                    const dv = pvals?.[i];
                    return {
                      typeName: name,
                      guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                      additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                    };
                  })
                : pvals.map((dv: any) => ({
                    typeName: (dv?.typeName ?? '').trim(),
                    guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                    additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                  }));

              const ppvals = Array.isArray((p as any)?.percentage_damage_values) ? ((p as any).percentage_damage_values as any[]) : [];
              const phase_percentage_damage_values = normalizedPercentTypes.length > 0
                ? normalizedPercentTypes.map((name, i) => {
                    const dv = ppvals?.[i];
                    return {
                      typeName: name,
                      guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                      additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                    };
                  })
                : ppvals.map((dv: any) => ({
                    typeName: (dv?.typeName ?? '').trim(),
                    guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                    additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                  }));

              return {
                enabled: !!p?.enabled,
                effects: Array.isArray(p?.effects) ? (p.effects as any[]).map((s) => (s ?? '').toString().trim()).filter((s) => !!s) : [],
                guaranteed_damage: Number(p?.guaranteed_damage) || 0,
                additional_damage: Number(p?.additional_damage) || 0,
                damage_values: phase_damage_values,
                percentage_damage_values: phase_percentage_damage_values,
                action_cost: Number(p?.action_cost) || 0,
                indicative_action_cost: Number(p?.indicative_action_cost) || 0,
                area_or_cone_value: (data.damageShape === 'area' || data.damageShape === 'cone') ? (Number(p?.area_or_cone_value) || 0) : 0,
                chain_targets: data.damageShape === 'chain' ? (Number(p?.chain_targets) || 1) : 0,
                max_seconds: data.damagePerSecond ? (Number(p?.max_seconds) || 0) : 0,
                pa_cost_per_second: data.damagePerSecond ? (Number(p?.pa_cost_per_second) || 0) : 0,
                increasing_damage_per_second: (data.damagePerSecond && data.damagePerSecondIncreasing) ? (Number(p?.increasing_damage_per_second) || 0) : 0,
                max_projectiles: data.multipleShots ? (Number(p?.max_projectiles) || 0) : 0,
                increasing_damage_per_projectile: (data.multipleShots && data.multipleShotsIncreasing) ? (Number(p?.increasing_damage_per_projectile) || 0) : 0,
                max_pa_investment: data.paInvestmentEnabled ? (Number(p?.max_pa_investment) || 0) : 0,
                increasing_damage_per_pa: (data.paInvestmentEnabled && data.damageIncreasePerPaEnabled) ? (Number(p?.increasing_damage_per_pa) || 0) : 0,
                success_roll_increase_every_pa: (data.paInvestmentEnabled && data.successRollIncreasePerPaEnabled) ? (Number(p?.success_roll_increase_every_pa) || 0) : 0,
                conditional_additional_damage: data.conditionalAdditionalDamage ? !!p?.conditional_additional_damage : false,
                turn_duration_rounds: data.hasTurnDuration ? (Number(p?.turn_duration_rounds) || 0) : 0,
                max_targets: data.hasMaxTargets ? (Number(p?.max_targets) || 0) : 0,
                usage_interval_turns: data.hasUsageInterval ? (Number(p?.usage_interval_turns) || 0) : 0,
                max_uses_per_turn: data.hasMaxUsesPerTurn ? (Number(p?.max_uses_per_turn) || 0) : 0,
                min_success_percentage: data.percentageRollEnabled ? (Number(p?.min_success_percentage) || 0) : 0,
                activation_delay_turns: data.launchDelayEnabled ? (Number(p?.activation_delay_turns) || 0) : 0,
                knockback_meters: data.knockbackEnabled ? (Number(p?.knockback_meters) || 0) : 0,
              };
            })
            : [];

          const grades = Array.isArray(lvlRest.grades)
            ? (lvlRest.grades as any[]).map((g, i) => {
              const gvals = Array.isArray(g?.damage_values) ? g.damage_values : [];
              const grade_damage_values = normalizedTypes.length > 0
                ? normalizedTypes.map((name, i) => {
                    const dv = gvals?.[i];
                return {
                  typeName: name,
                  damageEffectId: (dv?.damageEffectId ?? dv?.damage_effect_id ?? null) ? String(dv?.damageEffectId ?? dv?.damage_effect_id) : undefined,
                  guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                  additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                };
              })
            : gvals.map((dv: any) => ({
                typeName: (dv?.typeName ?? '').trim(),
                damageEffectId: (dv?.damageEffectId ?? dv?.damage_effect_id ?? null) ? String(dv?.damageEffectId ?? dv?.damage_effect_id) : undefined,
                guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
              }));

              const gpvals = Array.isArray((g as any)?.percentage_damage_values) ? ((g as any).percentage_damage_values as any[]) : [];
              const grade_percentage_damage_values = normalizedPercentTypes.length > 0
                ? normalizedPercentTypes.map((name, i) => {
                    const dv = gpvals?.[i];
                    return {
                      typeName: name,
                      guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                      additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                    };
                  })
                : gpvals.map((dv: any) => ({
                    typeName: (dv?.typeName ?? '').trim(),
                    guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                    additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                  }));

              const grade_self_damage_sets = Array.isArray((g as any)?.self_damage_sets)
                ? ((g as any).self_damage_sets as any[]).map((s: any) => ({
                    effect_name: (s?.effect_name ?? '').trim(),
                    guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                    max_damage: Number(s?.max_damage) || 0,
                    mode: ((s?.mode ?? 'classic') === 'percentage') ? 'percentage' : 'classic',
                    guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
                    max_percentage_damage: Number(s?.max_percentage_damage) || 0,
                  }))
                : [];

              const gradeAnomalyFields: any = (() => {
                const obj: any = {};
                for (let ai = 1; ai <= 20; ai++) {
                  const percVal = Number((g as any)[`anomaly${ai}_percentage`]) || 0;
                  const typeVal = (((g as any)[`anomaly${ai}_type`] ?? 'Nessuna') as string).trim();
                  const hasPerc = (g as any)[`anomaly${ai}_percentage`] !== undefined;
                  const hasType = (g as any)[`anomaly${ai}_type`] !== undefined;
                  if (hasPerc || hasType || ai <= 3) {
                    obj[`anomaly${ai}_percentage`] = percVal;
                    obj[`anomaly${ai}_type`] = typeVal;
                  }
                }
                return obj;
              })();

              return {
                effects: Array.isArray(g?.effects) ? (g.effects as string[]).map((s) => (s ?? '').trim()).filter((s) => !!s) : [],
                guaranteed_damage: typeof g?.guaranteed_damage === 'number' ? g.guaranteed_damage : Number(g?.guaranteed_damage) || 0,
                additional_damage: typeof g?.additional_damage === 'number' ? g.additional_damage : Number(g?.additional_damage) || 0,
                damage_values: grade_damage_values,
                percentage_damage_values: grade_percentage_damage_values,
                self: {
                  enabled: grade_self_damage_sets.length > 0,
                  damage_sets: grade_self_damage_sets,
                },
                // Forma del danno
                area_or_cone_value: typeof g?.area_or_cone_value === 'number' ? g.area_or_cone_value : Number(g?.area_or_cone_value) || 0,
                chain_targets: typeof g?.chain_targets === 'number' ? g.chain_targets : Number(g?.chain_targets) || 1,
                // Danni al secondo
                max_seconds: typeof g?.max_seconds === 'number' ? g.max_seconds : Number(g?.max_seconds) || 0,
                  pa_cost_per_second: typeof g?.pa_cost_per_second === 'number' ? g.pa_cost_per_second : Number(g?.pa_cost_per_second) || 0,
                  increasing_damage_per_second: typeof g?.increasing_damage_per_second === 'number' ? g.increasing_damage_per_second : Number(g?.increasing_damage_per_second) || 0,
                  ...gradeAnomalyFields,
                  // Costi azione indipendenti per grado
                  action_cost: typeof g?.action_cost === 'number' ? g.action_cost : Number(g?.action_cost) || 0,
                  indicative_action_cost: typeof g?.indicative_action_cost === 'number' ? g.indicative_action_cost : Number(g?.indicative_action_cost) || 0,
                  // Intervallo di utilizzo per grado
                  usage_interval_turns: typeof g?.usage_interval_turns === 'number' ? g.usage_interval_turns : Number(g?.usage_interval_turns) || 0,
                  // Identificatore del grado
                  grade_number: typeof g?.grade_number === 'number' ? g.grade_number : i + 2,
              };
              })
            : [];

          const lottery_correct_instances = Array.isArray((lvlRest as any).lottery_correct_instances)
            ? ((lvlRest as any).lottery_correct_instances as any[]).map((g, i) => {
                const gvals = Array.isArray(g?.damage_values) ? g.damage_values : [];
                const instance_damage_values = normalizedTypes.length > 0
                  ? normalizedTypes.map((name, i) => {
                      const dv = gvals?.[i];
                      return {
                        typeName: name,
                        guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                        additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                      };
                    })
                  : gvals.map((dv: any) => ({
                      typeName: (dv?.typeName ?? '').trim(),
                      guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                      additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                    }));

                const gpvals = Array.isArray((g as any)?.percentage_damage_values) ? ((g as any).percentage_damage_values as any[]) : [];
                const instance_percentage_damage_values = normalizedPercentTypes.length > 0
                  ? normalizedPercentTypes.map((name, i) => {
                      const dv = gpvals?.[i];
                      return {
                        typeName: name,
                        guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                        additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                      };
                    })
                  : gpvals.map((dv: any) => ({
                      typeName: (dv?.typeName ?? '').trim(),
                      guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                      additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                    }));

                const instance_self_damage_sets = Array.isArray((g as any)?.self_damage_sets)
                  ? ((g as any).self_damage_sets as any[]).map((s: any) => ({
                      effect_name: (s?.effect_name ?? '').trim(),
                      guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                      max_damage: Number(s?.max_damage) || 0,
                      mode: ((s?.mode ?? 'classic') === 'percentage') ? 'percentage' : 'classic',
                      guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
                      max_percentage_damage: Number(s?.max_percentage_damage) || 0,
                    }))
                  : [];

              const instAnomalyFields: any = (() => {
                const obj: any = {};
                for (let ai = 1; ai <= 20; ai++) {
                  const percVal = Number((g as any)[`anomaly${ai}_percentage`]) || 0;
                  const typeVal = (((g as any)[`anomaly${ai}_type`] ?? 'Nessuna') as string).trim();
                  const hasPerc = (g as any)[`anomaly${ai}_percentage`] !== undefined;
                  const hasType = (g as any)[`anomaly${ai}_type`] !== undefined;
                  if (hasPerc || hasType || ai <= 3) {
                    obj[`anomaly${ai}_percentage`] = percVal;
                    obj[`anomaly${ai}_type`] = typeVal;
                  }
                }
                return obj;
              })();

              return {
                effects: Array.isArray(g?.effects) ? (g.effects as string[]).map((s) => (s ?? '').trim()).filter((s) => !!s) : [],
                guaranteed_damage: typeof g?.guaranteed_damage === 'number' ? g.guaranteed_damage : Number(g?.guaranteed_damage) || 0,
                additional_damage: typeof g?.additional_damage === 'number' ? g.additional_damage : Number(g?.additional_damage) || 0,
                damage_values: instance_damage_values,
                percentage_damage_values: instance_percentage_damage_values,
                self: {
                  enabled: instance_self_damage_sets.length > 0,
                  damage_sets: instance_self_damage_sets,
                },
                title: `Corretta ${i + 1}`,
                area_or_cone_value: typeof g?.area_or_cone_value === 'number' ? g.area_or_cone_value : Number(g?.area_or_cone_value) || 0,
                chain_targets: typeof g?.chain_targets === 'number' ? g.chain_targets : Number(g?.chain_targets) || 1,
                max_seconds: typeof g?.max_seconds === 'number' ? g.max_seconds : Number(g?.max_seconds) || 0,
                pa_cost_per_second: typeof g?.pa_cost_per_second === 'number' ? g.pa_cost_per_second : Number(g?.pa_cost_per_second) || 0,
                increasing_damage_per_second: typeof g?.increasing_damage_per_second === 'number' ? g.increasing_damage_per_second : Number(g?.increasing_damage_per_second) || 0,
                turn_duration_rounds: typeof (g as any)?.turn_duration_rounds === 'number' ? (g as any).turn_duration_rounds : Number((g as any)?.turn_duration_rounds) || 0,
                max_projectiles: typeof (g as any)?.max_projectiles === 'number' ? (g as any).max_projectiles : Number((g as any)?.max_projectiles) || 0,
                increasing_damage_per_projectile: typeof (g as any)?.increasing_damage_per_projectile === 'number' ? (g as any).increasing_damage_per_projectile : Number((g as any)?.increasing_damage_per_projectile) || 0,
                max_multiple_attacks: typeof (g as any)?.max_multiple_attacks === 'number' ? (g as any).max_multiple_attacks : Number((g as any)?.max_multiple_attacks) || 0,
                level_warning: ((g as any)?.level_warning ?? '').toString().trim(),
                use_weapon_damage: !!(g as any)?.use_weapon_damage,
                ...instAnomalyFields,
                action_cost: typeof g?.action_cost === 'number' ? g.action_cost : Number(g?.action_cost) || 0,
                indicative_action_cost: typeof g?.indicative_action_cost === 'number' ? g.indicative_action_cost : Number(g?.indicative_action_cost) || 0,
                usage_interval_turns: typeof g?.usage_interval_turns === 'number' ? g.usage_interval_turns : Number(g?.usage_interval_turns) || 0,
              };
              })
            : [];

          const lottery_wrong_instances = Array.isArray((lvlRest as any).lottery_wrong_instances)
            ? ((lvlRest as any).lottery_wrong_instances as any[]).map((g, i) => {
                const gvals = Array.isArray(g?.damage_values) ? g.damage_values : [];
                const instance_damage_values = normalizedTypes.length > 0
                  ? normalizedTypes.map((name, i) => {
                      const dv = gvals?.[i];
                      return {
                        typeName: name,
                        guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                        additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                      };
                    })
                  : gvals.map((dv: any) => ({
                      typeName: (dv?.typeName ?? '').trim(),
                      guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                      additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                    }));

                const gpvals = Array.isArray((g as any)?.percentage_damage_values) ? ((g as any).percentage_damage_values as any[]) : [];
                const instance_percentage_damage_values = normalizedPercentTypes.length > 0
                  ? normalizedPercentTypes.map((name, i) => {
                      const dv = gpvals?.[i];
                      return {
                        typeName: name,
                        guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                        additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                      };
                    })
                  : gpvals.map((dv: any) => ({
                      typeName: (dv?.typeName ?? '').trim(),
                      guaranteed_percentage_damage: typeof dv?.guaranteed_percentage_damage === 'number' ? dv.guaranteed_percentage_damage : Number(dv?.guaranteed_percentage_damage) || 0,
                      additional_percentage_damage: typeof dv?.additional_percentage_damage === 'number' ? dv.additional_percentage_damage : Number(dv?.additional_percentage_damage) || 0,
                    }));

                const instance_self_damage_sets = Array.isArray((g as any)?.self_damage_sets)
                  ? ((g as any).self_damage_sets as any[]).map((s: any) => ({
                      effect_name: (s?.effect_name ?? '').trim(),
                      guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                      max_damage: Number(s?.max_damage) || 0,
                      mode: ((s?.mode ?? 'classic') === 'percentage') ? 'percentage' : 'classic',
                      guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
                      max_percentage_damage: Number(s?.max_percentage_damage) || 0,
                    }))
                  : [];

              const wrongInstAnomalyFields: any = (() => {
                const obj: any = {};
                for (let ai = 1; ai <= 20; ai++) {
                  const percVal = Number((g as any)[`anomaly${ai}_percentage`]) || 0;
                  const typeVal = (((g as any)[`anomaly${ai}_type`] ?? 'Nessuna') as string).trim();
                  const hasPerc = (g as any)[`anomaly${ai}_percentage`] !== undefined;
                  const hasType = (g as any)[`anomaly${ai}_type`] !== undefined;
                  if (hasPerc || hasType || ai <= 3) {
                    obj[`anomaly${ai}_percentage`] = percVal;
                    obj[`anomaly${ai}_type`] = typeVal;
                  }
                }
                return obj;
              })();

              return {
                effects: Array.isArray(g?.effects) ? (g.effects as string[]).map((s) => (s ?? '').trim()).filter((s) => !!s) : [],
                guaranteed_damage: typeof g?.guaranteed_damage === 'number' ? g.guaranteed_damage : Number(g?.guaranteed_damage) || 0,
                additional_damage: typeof g?.additional_damage === 'number' ? g.additional_damage : Number(g?.additional_damage) || 0,
                damage_values: instance_damage_values,
                percentage_damage_values: instance_percentage_damage_values,
                self: {
                  enabled: instance_self_damage_sets.length > 0,
                  damage_sets: instance_self_damage_sets,
                },
                title: `Sbagliata ${i + 1}`,
                area_or_cone_value: typeof g?.area_or_cone_value === 'number' ? g.area_or_cone_value : Number(g?.area_or_cone_value) || 0,
                chain_targets: typeof g?.chain_targets === 'number' ? g.chain_targets : Number(g?.chain_targets) || 1,
                max_seconds: typeof g?.max_seconds === 'number' ? g.max_seconds : Number(g?.max_seconds) || 0,
                pa_cost_per_second: typeof g?.pa_cost_per_second === 'number' ? g.pa_cost_per_second : Number(g?.pa_cost_per_second) || 0,
                increasing_damage_per_second: typeof g?.increasing_damage_per_second === 'number' ? g.increasing_damage_per_second : Number(g?.increasing_damage_per_second) || 0,
                turn_duration_rounds: typeof (g as any)?.turn_duration_rounds === 'number' ? (g as any).turn_duration_rounds : Number((g as any)?.turn_duration_rounds) || 0,
                max_projectiles: typeof (g as any)?.max_projectiles === 'number' ? (g as any).max_projectiles : Number((g as any)?.max_projectiles) || 0,
                increasing_damage_per_projectile: typeof (g as any)?.increasing_damage_per_projectile === 'number' ? (g as any).increasing_damage_per_projectile : Number((g as any)?.increasing_damage_per_projectile) || 0,
                max_multiple_attacks: typeof (g as any)?.max_multiple_attacks === 'number' ? (g as any).max_multiple_attacks : Number((g as any)?.max_multiple_attacks) || 0,
                level_warning: ((g as any)?.level_warning ?? '').toString().trim(),
                use_weapon_damage: !!(g as any)?.use_weapon_damage,
                ...wrongInstAnomalyFields,
                action_cost: typeof g?.action_cost === 'number' ? g.action_cost : Number(g?.action_cost) || 0,
                indicative_action_cost: typeof g?.indicative_action_cost === 'number' ? g.indicative_action_cost : Number(g?.indicative_action_cost) || 0,
                usage_interval_turns: typeof g?.usage_interval_turns === 'number' ? g.usage_interval_turns : Number(g?.usage_interval_turns) || 0,
              };
              })
            : [];

          const anomalyFields: any = (() => {
            const obj: any = {};
            for (let i = 1; i <= 20; i++) {
              const percVal = Number((lvlRest as any)[`anomaly${i}_percentage`]) || 0;
              const typeVal = (((lvlRest as any)[`anomaly${i}_type`] ?? 'Nessuna') as string).trim();
              const hasPerc = (lvlRest as any)[`anomaly${i}_percentage`] !== undefined;
              const hasType = (lvlRest as any)[`anomaly${i}_type`] !== undefined;
              if (hasPerc || hasType || i <= 3) {
                obj[`anomaly${i}_percentage`] = percVal;
                obj[`anomaly${i}_type`] = typeVal;
              }
            }
            return obj;
          })();

          const rawRemovedAnomalies = Array.isArray((lvlRest as any).removed_anomalies) ? ((lvlRest as any).removed_anomalies as any[]) : [];
          const removed_anomalies = (data as any).removeAnomalyEnabled
            ? Array.from(
                new Set(
                  rawRemovedAnomalies
                    .map((n) => (n ?? '').toString().trim())
                    .filter((n) => !!n && n !== 'Nessuna')
                )
              )
            : [];

          const levelPayload = {
            level: Number(lvlRest.level) || 0,
            damage_values,
            percentage_damage_values,
            guaranteed_damage: Number(lvlRest.guaranteed_damage) || 0,
            additional_damage: Number(lvlRest.additional_damage) || 0,
            action_cost: Number(lvlRest.action_cost) || 0,
            indicative_action_cost: Number(lvlRest.indicative_action_cost) || 0,
            extra_action_cost: Number((lvlRest as any).extra_action_cost) || 0,
            extra_cost_effect_id: (data.extraCostEffectId ?? null),
            extra_cost_effect_name: ((data.extraCostEffectName ?? '') as string).trim(),
            ...anomalyFields,
            removed_anomalies,
            level_description: ((lvlRest.level_description ?? '') as string).trim(),
            less_health_more_damage_every_hp: data.lessHealthMoreDamageEnabled ? (Number((lvlRest as any).less_health_more_damage_every_hp) || 0) : 0,
            damage_shape: lvlRest.damage_shape,
            area_or_cone_value: Number(lvlRest.area_or_cone_value) || 0,
            chain_targets: Number(lvlRest.chain_targets) || 0,
            max_seconds: Number(lvlRest.max_seconds) || 0,
            pa_cost_per_second: Number(lvlRest.pa_cost_per_second) || 0,
            increasing_damage_per_second: Number(lvlRest.increasing_damage_per_second) || 0,
            max_pa_investment: Number((lvlRest as any).max_pa_investment) || 0,
            increasing_damage_per_pa: Number((lvlRest as any).increasing_damage_per_pa) || 0,
            success_roll_increase_every_pa: Number((lvlRest as any).success_roll_increase_every_pa) || 0,
            max_projectiles: Number(lvlRest.max_projectiles) || 0,
            increasing_damage_per_projectile: Number(lvlRest.increasing_damage_per_projectile) || 0,
            conditional_additional_damage: !!lvlRest.conditional_additional_damage,
            turn_duration_rounds: Number(lvlRest.turn_duration_rounds) || 0,
            no_damage_turn_increase_values: (() => {
              const arr = Array.isArray((lvlRest as any).no_damage_turn_increase_values) ? ((lvlRest as any).no_damage_turn_increase_values as any[]) : [];
              const vals = arr.length > 0 ? arr : [];
              return normalizedTypes.length > 0
                ? normalizedTypes.map((name, i) => {
                    const dv = vals?.[i];
                    return {
                      typeName: name,
                      guaranteed_damage: typeof dv?.guaranteed_damage === 'number' ? dv.guaranteed_damage : Number(dv?.guaranteed_damage) || 0,
                      additional_damage: typeof dv?.additional_damage === 'number' ? dv.additional_damage : Number(dv?.additional_damage) || 0,
                    };
                  })
                : vals.map((dv: any) => ({
                    typeName: (dv?.typeName ?? '').trim(),
                    guaranteed_damage: Number(dv?.guaranteed_damage) || 0,
                    additional_damage: Number(dv?.additional_damage) || 0,
                  }));
            })(),
            activation_delay_turns: Number((lvlRest as any).activation_delay_turns) || 0,
            knockback_meters: Number((lvlRest as any).knockback_meters) || 0,
            scaled_move_stats: Array.isArray((lvlRest as any).scaled_move_stats) ? (lvlRest as any).scaled_move_stats : [],
            scaled_move_skills: Array.isArray((lvlRest as any).scaled_move_skills) ? (lvlRest as any).scaled_move_skills : [],
            max_targets: Number(lvlRest.max_targets) || 0,
            usage_interval_turns: Number(lvlRest.usage_interval_turns) || 0,
            max_uses_per_turn: data.hasMaxUsesPerTurn ? (Number((lvlRest as any).max_uses_per_turn) || 0) : 0,
            use_weapon_damage: !!lvlRest.use_weapon_damage,
            self: (() => {
              const legacyAnomaly = {
                mode: (lvlRest as any).self_anomaly_mode ?? 'select',
                name: ((lvlRest as any).self_anomaly_name ?? 'Nessuna').toString().trim(),
                description: ((lvlRest as any).self_anomaly_description ?? '').toString().trim(),
                turns: Number((lvlRest as any).self_anomaly_turns) || 0,
                doesDamage: !!(lvlRest as any).self_anomaly_does_damage,
                damagePerTurn: Number((lvlRest as any).self_anomaly_damage_per_turn) || 0,
                damageEffectId: (lvlRest as any).self_anomaly_damage_effect_id ?? null,
                damageEffectName: ((lvlRest as any).self_anomaly_damage_effect_name ?? '').toString().trim(),
                actionPointsModifier: Number((lvlRest as any).self_anomaly_action_points_modifier) || 0,
                healthModifier: Number((lvlRest as any).self_anomaly_health_modifier) || 0,
                statsModifier: (typeof (lvlRest as any).self_anomaly_stats_modifier === 'object' && (lvlRest as any).self_anomaly_stats_modifier)
                  ? (lvlRest as any).self_anomaly_stats_modifier
                  : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
              };
              const selfAnomalyGate = !!((data as any).selfAnomalyEnabled || (data as any).hasSelfEffects);
              const selfAnomalies = selfAnomalyGate
                ? (Array.isArray((lvlRest as any).self_anomalies) ? ((lvlRest as any).self_anomalies as any[]) : []).map((a: any) => ({
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
                      : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
                    alwaysActive: !!(a?.alwaysActive ?? a?.always_active),
                    sourceType: (a?.sourceType ?? a?.source_type) || undefined,
                    sourceId: (a?.sourceId ?? a?.source_id) || undefined,
                  }))
                : [];
              return {
                enabled: !!lvlRest.self_effect_enabled,
                damage_sets: Array.isArray((lvlRest as any).self_damage_sets)
                  ? (lvlRest as any).self_damage_sets.map((s: any) => ({
                      effect_name: (s?.effect_name ?? '').trim(),
                      guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                      max_damage: Number(s?.max_damage) || 0,
                      mode: ((s?.mode ?? 'classic') === 'percentage') ? 'percentage' : 'classic',
                      guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
                      max_percentage_damage: Number(s?.max_percentage_damage) || 0,
                    }))
                  : [],
                anomaly: legacyAnomaly,
                anomalies: selfAnomalies,
              };
            })(),
            self_anomalies: ((data as any).selfAnomalyEnabled || (data as any).hasSelfEffects)
              ? (Array.isArray((lvlRest as any).self_anomalies) ? ((lvlRest as any).self_anomalies as any[]) : []).map((a: any) => ({
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
                    : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
                  alwaysActive: !!(a?.alwaysActive ?? a?.always_active),
                  sourceType: (a?.sourceType ?? a?.source_type) || undefined,
                  sourceId: (a?.sourceId ?? a?.source_id) || undefined,
                }))
              : [],
            evocation_enabled: !!lvlRest.evocation_enabled,
            evocation_type: lvlRest.evocation_type,
            weapon_light_damage: Number(lvlRest.weapon_light_damage) || 0,
            weapon_heavy_damage: Number(lvlRest.weapon_heavy_damage) || 0,
            weapon_thrust_damage: Number(lvlRest.weapon_thrust_damage) || 0,
            weapon_subtype: ((lvlRest as any).weapon_subtype ?? '').toString(),
            weapon_weight: Number((lvlRest as any).weapon_weight) || 0,
            weapon_description: ((lvlRest as any).weapon_description ?? '').toString(),
            weapon_damage_sets: Array.isArray((lvlRest as any).weapon_damage_sets)
              ? (lvlRest as any).weapon_damage_sets.map((s: any) => ({
                  effect_name: (s?.effect_name ?? '').trim(),
                  damage_veloce: Number(s?.damage_veloce) || 0,
                  damage_pesante: Number(s?.damage_pesante) || 0,
                  damage_affondo: Number(s?.damage_affondo) || 0,
                  calculated_damage_veloce: Number(s?.calculated_damage_veloce) || 0,
                  calculated_damage_pesante: Number(s?.calculated_damage_pesante) || 0,
                  calculated_damage_affondo: Number(s?.calculated_damage_affondo) || 0,
                }))
              : [],
            weapon_stats: Array.isArray((lvlRest as any).weapon_stats)
              ? (lvlRest as any).weapon_stats.map((s: any) => ({
                  statKey: String(s?.statKey ?? ''),
                  amount: Number(s?.amount) || 0,
                }))
              : [],
            max_replicas: Number(lvlRest.max_replicas) || 0,
            replica_source_character_id: ((lvlRest as any).replica_source_character_id ?? '').toString(),
            energy_health: Number(lvlRest.energy_health) || 0,
            energy_action_points: Number(lvlRest.energy_action_points) || 0,
            energy_armour: Number(lvlRest.energy_armour) || 0,
            energy_stats: Array.isArray((lvlRest as any).energy_stats)
              ? (lvlRest as any).energy_stats.map((s: any) => ({
                  statKey: String(s?.statKey ?? ''),
                  amount: Number(s?.amount) || 0,
                }))
              : [],
            energy_embedded_refs: Array.isArray((lvlRest as any).energy_embedded_refs)
              ? (lvlRest as any).energy_embedded_refs.map((r: any) => ({
                  refId: String(r?.refId ?? ''),
                  refType: String(r?.refType ?? ''),
                }))
              : [],
            energy_can_create_equipment: !!(lvlRest as any).energy_can_create_equipment,
            equipment: (lvlRest as any).equipment ?? undefined,
            max_multiple_attacks: Number((lvlRest as any).max_multiple_attacks) || 0,
            phase_attack_enabled: !!(lvlRest as any).phase_attack_enabled,
            phase1_enabled: !!(lvlRest as any).phase1_enabled,
            phase1_effects: Array.isArray((lvlRest as any).phase1_effects) ? (lvlRest as any).phase1_effects : [],
            phase1_guaranteed_damage: Number((lvlRest as any).phase1_guaranteed_damage) || 0,
            phase1_additional_damage: Number((lvlRest as any).phase1_additional_damage) || 0,
            phase2_enabled: !!(lvlRest as any).phase2_enabled,
            phase2_effects: Array.isArray((lvlRest as any).phase2_effects) ? (lvlRest as any).phase2_effects : [],
            phase2_guaranteed_damage: Number((lvlRest as any).phase2_guaranteed_damage) || 0,
            phase2_additional_damage: Number((lvlRest as any).phase2_additional_damage) || 0,
            phase3_enabled: !!(lvlRest as any).phase3_enabled,
            phase3_effects: Array.isArray((lvlRest as any).phase3_effects) ? (lvlRest as any).phase3_effects : [],
            phase3_guaranteed_damage: Number((lvlRest as any).phase3_guaranteed_damage) || 0,
            phase3_additional_damage: Number((lvlRest as any).phase3_additional_damage) || 0,
            phases,
            grades,
            lottery_enabled: !!(lvlRest as any).lottery_enabled,
            lottery_dice_faces: Number((lvlRest as any).lottery_dice_faces) || 0,
            lottery_numeric_choices: Number((lvlRest as any).lottery_numeric_choices) || 0,
            lottery_correct_instances,
            lottery_wrong_instances,
            level_warning: ((lvlRest as any).level_warning ?? '').toString().trim(),
            min_success_percentage: Number((lvlRest as any).min_success_percentage) || 0,
            failure_enabled: !!(lvlRest as any).failure_enabled,
            failure_damage_sets: Array.isArray((lvlRest as any).failure_damage_sets)
              ? (lvlRest as any).failure_damage_sets.map((s: any) => ({
                  effect_name: (s?.effect_name ?? '').trim(),
                  guaranteed_damage: Number(s?.guaranteed_damage) || 0,
                  max_damage: Number(s?.max_damage) || 0,
                  mode: ((s?.mode ?? 'classic') === 'percentage') ? 'percentage' : 'classic',
                  guaranteed_percentage_damage: Number(s?.guaranteed_percentage_damage) || 0,
                  max_percentage_damage: Number(s?.max_percentage_damage) || 0,
                }))
              : [],
            failure_anomaly: (() => {
              const raw = (lvlRest as any).failure_anomaly;
              const baseObj = (typeof raw === 'object' && raw) ? raw : {};
              const name = ((lvlRest as any).failure_anomaly_name ?? (baseObj as any)?.name ?? 'Nessuna').toString().trim() || 'Nessuna';
              const damageBonusEnabled = !!(((baseObj as any)?.damageBonusEnabled ?? (baseObj as any)?.damage_bonus_enabled) as any);
              const damageBonus = (((baseObj as any)?.damageBonus ?? (baseObj as any)?.damage_bonus) as any) || undefined;
              const damageReductionEnabled = !!(((baseObj as any)?.damageReductionEnabled ?? (baseObj as any)?.damage_reduction_enabled) as any);
              const damageReduction = (((baseObj as any)?.damageReduction ?? (baseObj as any)?.damage_reduction) as any) || undefined;
              const weaknessEnabled = !!(((baseObj as any)?.weaknessEnabled ?? (baseObj as any)?.weakness_enabled) as any);
              const weakness = (((baseObj as any)?.weakness ?? (baseObj as any)?.weakness_config) as any) || undefined;
              const paDiscountEnabled = !!(((baseObj as any)?.paDiscountEnabled ?? (baseObj as any)?.pa_discount_enabled) as any);
              const paDiscount = (((baseObj as any)?.paDiscount ?? (baseObj as any)?.pa_discount) as any) || undefined;
              return {
                ...baseObj,
                id: (((baseObj as any)?.id ?? crypto.randomUUID()) as any).toString(),
                mode: (lvlRest as any).failure_anomaly_mode ?? (baseObj as any)?.mode ?? 'select',
                name,
                description: ((lvlRest as any).failure_anomaly_description ?? (baseObj as any)?.description ?? '').toString().trim(),
                turns: Number((lvlRest as any).failure_anomaly_turns ?? (baseObj as any)?.turns) || 0,
                doesDamage: !!((lvlRest as any).failure_anomaly_does_damage ?? (baseObj as any)?.doesDamage ?? (baseObj as any)?.does_damage),
                damagePerTurn: Number((lvlRest as any).failure_anomaly_damage_per_turn ?? (baseObj as any)?.damagePerTurn ?? (baseObj as any)?.damage_per_turn) || 0,
                damageEffectId: (lvlRest as any).failure_anomaly_damage_effect_id ?? (baseObj as any)?.damageEffectId ?? (baseObj as any)?.damage_effect_id ?? null,
                damageEffectName: ((lvlRest as any).failure_anomaly_damage_effect_name ?? (baseObj as any)?.damageEffectName ?? (baseObj as any)?.damage_effect_name ?? '').toString().trim(),
                actionPointsModifier: Number((lvlRest as any).failure_anomaly_action_points_modifier ?? (baseObj as any)?.actionPointsModifier ?? (baseObj as any)?.action_points_modifier) || 0,
                healthModifier: Number((lvlRest as any).failure_anomaly_health_modifier ?? (baseObj as any)?.healthModifier ?? (baseObj as any)?.health_modifier) || 0,
                armorModifier: Number((baseObj as any)?.armorModifier ?? (baseObj as any)?.armor_modifier) || 0,
                statsModifier: (typeof ((lvlRest as any).failure_anomaly_stats_modifier ?? (baseObj as any)?.statsModifier ?? (baseObj as any)?.stats_modifier) === 'object' &&
                  ((lvlRest as any).failure_anomaly_stats_modifier ?? (baseObj as any)?.statsModifier ?? (baseObj as any)?.stats_modifier))
                  ? ((lvlRest as any).failure_anomaly_stats_modifier ?? (baseObj as any)?.statsModifier ?? (baseObj as any)?.stats_modifier)
                  : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
                probability: Number((lvlRest as any).failure_anomaly_probability ?? (baseObj as any)?.probability) || 0,
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
            passive_anomalies: (data.type === 'Passiva' && !!(data as any).passiveAnomalyEnabled)
              ? (Array.isArray((lvlRest as any).passive_anomalies) ? (lvlRest as any).passive_anomalies : []).map((a: any) => ({
                  id: (a?.id ?? crypto.randomUUID()).toString(),
                  name: (a?.name ?? 'Anomalia').toString().trim() || 'Anomalia',
                  description: (a?.description ?? '').toString(),
                  turns: Number(a?.turns) || 0,
                  alwaysActive: !!(data as any).passiveAnomalyAlwaysActive,
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
                    : { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
                  sourceType: (a?.sourceType ?? a?.source_type) || undefined,
                  sourceId: (a?.sourceId ?? a?.source_id) || undefined,
                }))
              : [],
          };

          return pruneSpellLevelPayload(levelPayload);
        }),
      };

      if (mode === 'edit' && editSpell) {
        const { error } = await supabase
          .from('spells')
          .update(spellPayload)
          .eq('id', editSpell.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('spells')
          .insert({
            ...spellPayload,
            created_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: mode === 'edit' ? 'Magia aggiornata' : 'Magia aggiunta',
        description: 'Le modifiche sono state salvate correttamente.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Errore nel salvataggio',
        description: error.message || 'Qualcosa è andato storto durante il salvataggio.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isEvocationBranch = watchedPrimaryBranch === 'Evocazione' || watchedSecondaryBranch === 'Evocazione';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Modifica Magia' : 'Aggiungi Nuova Magia'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifica i dettagli della magia esistente utilizzando i campi sottostanti.' 
              : 'Crea una nuova magia compilando tutti i campi richiesti.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Informazioni Generali</TabsTrigger>
              <TabsTrigger value="levels">Livelli (1-10)</TabsTrigger>
              <TabsTrigger value="additional">Informazioni Aggiuntive</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              {/* Nome della magia */}
              <div>
                <Label htmlFor="name">Nome della magia *</Label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Il nome è obbligatorio" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="name"
                      placeholder="Nome della magia"
                      className={errors.name ? "border-red-500" : ""}
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Tipologia della magia */}
              <div>
                <Label htmlFor="type">Tipologia della magia *</Label>
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
                        {MAGIC_TYPES.map((type) => (
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
                <div>
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
                </div>
              ) : null}

              {/* Rami */}
              <div className="grid grid-cols-2 gap-4">
                {/* Ramo Principale */}
                <div>
                  <Label htmlFor="primaryBranch">Ramo principale *</Label>
                  <Controller
                    name="primaryBranch"
                    control={control}
                    rules={{ required: "Il ramo principale è obbligatorio" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.primaryBranch ? "border-red-500" : ""}>
                          <SelectValue placeholder="Seleziona ramo principale" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAllBranches().map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.primaryBranch && (
                    <p className="text-sm text-red-500 mt-1">{errors.primaryBranch.message}</p>
                  )}
                </div>
                
                {/* Ramo Secondario */}
                <div>
                  <Label htmlFor="secondaryBranch">Ramo secondario</Label>
                  <Controller
                    name="secondaryBranch"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona ramo secondario (opzionale)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuno</SelectItem>
                          {getAllBranches().map((branch) => (
                            <SelectItem key={`secondary-${branch}`} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Specificità */}
              <div className="grid grid-cols-2 gap-4">
                {/* Specificità Principale */}
                <div>
                  <Label htmlFor="primarySpecificity">Specificità principale *</Label>
                  <Controller
                    name="primarySpecificity"
                    control={control}
                    rules={{ required: "La specificità principale è obbligatoria" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.primarySpecificity ? "border-red-500" : ""}>
                          <SelectValue placeholder="Seleziona specificità principale" />
                        </SelectTrigger>
                        <SelectContent>
                          {watchedPrimaryBranch && getSpecificitiesForBranch(watchedPrimaryBranch).map((specificity) => (
                            <SelectItem key={specificity} value={specificity}>
                              {specificity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.primarySpecificity && (
                    <p className="text-sm text-red-500 mt-1">{errors.primarySpecificity.message}</p>
                  )}
                </div>

                {/* Specificità Secondaria */}
                <div>
                  <Label htmlFor="secondarySpecificity">Specificità secondaria</Label>
                  <Controller
                    name="secondarySpecificity"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona specificità secondaria (opzionale)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuna</SelectItem>
                          {watchedSecondaryBranch && watchedSecondaryBranch !== 'none' && 
                            getSpecificitiesForBranch(watchedSecondaryBranch).map((specificity) => (
                              <SelectItem key={`secondary-${specificity}`} value={specificity}>
                                {specificity}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Grado della magia */}
              <div>
                <Label htmlFor="grade">Grado della magia *</Label>
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
                        {watchedPrimarySpecificity && getGradesForSpecificity(watchedPrimarySpecificity).map((grade) => (
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

              <div>
                <Label htmlFor="difficulty">Difficoltà</Label>
                <Controller
                  name="difficulty"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value ?? 1)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona difficoltà (1-10)" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={`diff-${n}`} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Descrizione */}
              <div>
                <Label htmlFor="description">Descrizione della magia *</Label>
                <Controller
                  name="description"
                  control={control}
                  rules={{ required: "La descrizione è obbligatoria" }}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="description"
                      placeholder="Descrizione della magia"
                      rows={4}
                      className={errors.description ? "border-red-500" : ""}
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
                <Label>Danno in percentuale?</Label>
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
                {watchedPercentageDamageEnabled ? (
                  <div className="space-y-2">
                    {percentageDamageEffectFields.map((pd, idx) => (
                      <div key={pd.id} className="flex items-center gap-2">
                        <Controller
                          name={`percentageDamageEffects.${idx}.name`}
                          control={control}
                          rules={{ required: "L'effetto è obbligatorio" }}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Seleziona effect'} />
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
                    <Button type="button" onClick={() => appendPercentageDamageEffect({ name: '' })}>Aggiungi effect percentuale</Button>
                    <p className="text-xs text-muted-foreground">Gli effetti percentuali saranno configurati nei livelli e nei gradi.</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
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

              <div className="space-y-3">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma del danno</Label>
                  <Controller
                    name="damageShape"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona forma del danno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="area">Danno ad area</SelectItem>
                          <SelectItem value="cone">Danno a cono</SelectItem>
                          <SelectItem value="single">Danno singolo</SelectItem>
                          <SelectItem value="chain">Danno a catena</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Danno al secondo</Label>
                  <Controller
                    name="damagePerSecond"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli se è al secondo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sì</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {watchedDamagePerSecond ? (
                    <div className="mt-2">
                      <Label>Danno crescente?</Label>
                      <Controller
                        name="damagePerSecondIncreasing"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={(v) => field.onChange(v === 'yes')}
                            value={field.value ? 'yes' : 'no'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Scegli se è crescente" />
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
                </div>
              </div>

              {/* Nuove opzioni generali */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Danno aggiuntivo condizionale</Label>
                  <Controller
                    name="conditionalAdditionalDamage"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli se è condizionale" />
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
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Incremento danni per turni senza danni?</Label>
                  <Controller
                    name="noDamageTurnIncreaseEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita incremento per turni senza danni" />
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

              {/* Tiri multipli + danno crescente (generale) */}
              <div className="grid grid-cols-2 gap-4">
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
                {watchedMultipleShots ? (
                  <div>
                    <Label>Danno crescente?</Label>
                    <Controller
                      name="multipleShotsIncreasing"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => field.onChange(v === 'yes')}
                          value={field.value ? 'yes' : 'no'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Scegli se è crescente" />
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
              </div>

              {/* Molteplici attacchi, Attacco a fase, Attacco caricato (generale) */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Molteplici attacchi?</Label>
                  <Controller
                    name="multipleAttacks"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita attacchi multipli" />
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
                  <Label>Attacco caricato?</Label>
                  <Controller
                    name="chargedAttack"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita gradi" />
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
                    <Select
                      onValueChange={(v) => field.onChange(v === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
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

              {/* Avvertimento per livello (generale) */}
              <div className="mt-4">
                <Label>Avvertimento per livello?</Label>
                <Controller
                  name="hasLevelWarning"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(v === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Abilita avvertimento testuale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Sì</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Tiro di percentuale (generale) */}
              <div className="mt-4">
                <Label>Tiro di percentuale?</Label>
                <Controller
                  name="percentageRollEnabled"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(v === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
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

              {/* PA investimento e danno per PA (generale) */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Incremento costo PA?</Label>
                  <Controller
                    name="paInvestmentEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
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
                {watchedPaInvestmentEnabled ? (
                  <div>
                    <Label>Incremento danno per PA?</Label>
                    <Controller
                      name="damageIncreasePerPaEnabled"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => field.onChange(v === 'yes')}
                          value={field.value ? 'yes' : 'no'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Abilita crescita danno/PA" />
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
              </div>
              {watchedPaInvestmentEnabled ? (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Incremento tiro di riuscita?</Label>
                    <Controller
                      name="successRollIncreasePerPaEnabled"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => field.onChange(v === 'yes')}
                          value={field.value ? 'yes' : 'no'}
                        >
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

              {/* Nuovi switch richiesti */}
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
                          rules={{ required: 'L\'effetto è obbligatorio' }}
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
                        <Controller
                          name={`selfDamageEffects.${idx}.mode`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'classic'}>
                              <SelectTrigger>
                                <SelectValue placeholder="Forma danno" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="classic">Classico</SelectItem>
                                <SelectItem value="percentage">Percentuale</SelectItem>
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
                  <Button type="button" onClick={() => appendSelfDamageEffect({ name: '', mode: 'classic' })}>
                    Aggiungi damage effect (self)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Il danno self per livello apparirà dopo aver selezionato uno o più effect.
                  </p>
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

              {/* Fallimento (generale) */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Fallimento?</Label>
                  <Controller
                    name="hasFailure"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
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

              {/* Costo extra (generale) */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Costo extra?</Label>
                  <Controller
                    name="extraCostEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v === 'yes')}
                        value={field.value ? 'yes' : 'no'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Abilita costo extra" />
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

              {watchedExtraCostEnabled ? (
                <div className="space-y-3 mt-3">
                  <Label>Effetto costo extra</Label>
                  <Select
                    value={watch('extraCostEffectName') || ''}
                    onValueChange={(v) => {
                      setValue('extraCostEffectName', v);
                      const found = (damageEffectOptions || []).find((opt) => opt.name === v);
                      setValue('extraCostEffectId', found?.id ?? null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Seleziona effect'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(damageEffectOptions || []).map((opt) => (
                        <SelectItem key={`xce:${opt.id}`} value={opt.name}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {watchedHasFailure ? (
                <div className="space-y-3 mt-3">
                  <Label>Effetti di fallimento (per livello) — multipli</Label>
                  <div className="space-y-2">
                    {failureDamageEffectFields.map((fd, idx) => (
                      <div key={fd.id} className="flex items-center gap-2">
                        <Controller
                          name={`failureDamageEffects.${idx}.name`}
                          control={control}
                          rules={{ required: 'L\'effetto è obbligatorio' }}
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
                        <Controller
                          name={`failureDamageEffects.${idx}.mode`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'classic'}>
                              <SelectTrigger>
                                <SelectValue placeholder="Forma danno" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="classic">Classico</SelectItem>
                                <SelectItem value="percentage">Percentuale</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Button type="button" variant="destructive" onClick={() => removeFailureDamageEffect(idx)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={() => appendFailureDamageEffect({ name: '', mode: 'classic' })}>
                    Aggiungi effect di fallimento
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Questi effetti si applicano al livello e saranno mostrati anche nella card dei gradi.</p>

                  {/* Configurazione anomalia generale rimossa: l'anomalia viene gestita a livello di singolo livello */}
                </div>
              ) : null}

              {/* Mostra selezione evocazione solo se ramo principale/secondario è Evocazione */}
              {(watchedPrimaryBranch === 'Evocazione' || watchedSecondaryBranch === 'Evocazione') && (
                <EvocationGeneralFields control={control} enabled={watchedEvocationEnabled} />
              )}

              {watchedEvocationEnabled && (
                <div className="space-y-3">
                  <Label>Importa Evocazione da Supabase</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Select
                      value={selectedEvocationId || ''}
                      onValueChange={(v) => onSelectEvocation(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona evocazione" />
                      </SelectTrigger>
                      <SelectContent>
                        {evocationList
                          .filter((e) => e.evocation_type === mapTypeToSupabase(watchedEvocationType || 'weapon'))
                          .map((e) => (
                            <SelectItem key={`evc:${e.id}`} value={e.id}>{e.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {selectedEvocation ? (
                      <div className="text-xs text-muted-foreground">{selectedEvocation.name} • {selectedEvocation.evocation_type}</div>
                    ) : null}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                La forma del danno è generale; nei livelli inserisci solo i valori associati.
              </p>
            </TabsContent>

            <TabsContent value="levels" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {levelFields.map((level, index) => (
                  <Card key={level.id}>
                    <CardHeader>
                      <CardTitle>Livello {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Campi alternativi evocazione */}
                      {!watchedLotteryEnabled && (
                        <EvocationLevelFields
                          control={control}
                          index={index}
                          enabled={watchedEvocationEnabled}
                          type={watchedEvocationType}
                          imported={selectedEvocation?.levels?.[index]}
                          importedType={selectedEvocation?.evocation_type}
                        />
                      )}

                      {/* Campi condizionali in base alla forma (solo valore/bersagli) */}
                      {!watchedLotteryEnabled && (watchedDamageShape === 'area' || watchedDamageShape === 'cone') ? (
                        <div>
                          <Label>Valore (decimale)</Label>
                          <Controller
                            name={`levels.${index}.area_or_cone_value`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0.0"
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            )}
                          />
                        </div>
                      ) : (!watchedLotteryEnabled && watchedDamageShape === 'chain') ? (
                        <div>
                          <Label>Quanti bersagli</Label>
                          <Controller
                            name={`levels.${index}.chain_targets`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                step="1"
                                min="1"
                                placeholder="1"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value, 10) || 1)
                                }
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {/* Danno al secondo */}
                      {!watchedLotteryEnabled && watchedDamagePerSecond ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Secondi massimi</Label>
                              <Controller
                                name={`levels.${index}.max_seconds`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value, 10) || 0)
                                    }
                                  />
                                )}
                              />
                            </div>
                            <div>
                              <Label>Costo PA al secondo</Label>
                              <Controller
                                name={`levels.${index}.pa_cost_per_second`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value, 10) || 0)
                                    }
                                  />
                                )}
                              />
                            </div>
                          </div>

                          {watchedDamagePerSecondIncreasing ? (
                            <div>
                              <Label>Danno crescente per secondo</Label>
                              <Controller
                                name={`levels.${index}.increasing_damage_per_second`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    onChange={(e) =>
                                      field.onChange(parseFloat(e.target.value) || 0)
                                    }
                                  />
                                )}
                              />
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      {!watchedLotteryEnabled && watchedHasTurnDuration ? (
                        <div>
                          <Label>Quanti turni dura?</Label>
                          <Controller
                            name={`levels.${index}.turn_duration_rounds`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                step="1"
                                min="0"
                                placeholder="0"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value, 10) || 0)
                                }
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedNoDamageTurnIncreaseEnabled ? (
                        Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                          <div className="space-y-4">
                            <Label>Incremento danni per turno senza danni subiti (per tipo)</Label>
                            {watchedDamageTypes.map((dt, tIndex) => (
                              <div key={`ndti-${dt.name}-${tIndex}`} className="space-y-2">
                                <Label className="text-sm">Tipo di danno: {dt.name || `Tipo ${tIndex + 1}`}</Label>
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
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value, 10) || 0)
                                }
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
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            )}
                          />
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

                      {/* Tiri multipli */}
                      {!watchedLotteryEnabled && watchedMultipleShots ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Quanti proiettili massimo?</Label>
                              <Controller
                                name={`levels.${index}.max_projectiles`}
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="number"
                                    step="1"
                                    min="1"
                                    placeholder="1"
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value, 10) || 1)
                                    }
                                  />
                                )}
                              />
                            </div>

                            {watchedMultipleShotsIncreasing ? (
                              <div>
                                <Label>Danno crescente per proiettile</Label>
                                <Controller
                                  name={`levels.${index}.increasing_damage_per_projectile`}
                                  control={control}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      placeholder="0.0"
                                      onChange={(e) =>
                                        field.onChange(parseFloat(e.target.value) || 0)
                                      }
                                    />
                                  )}
                                />
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {/* Molteplici attacchi: quantità massima */}
                      {!watchedLotteryEnabled && watchedMultipleAttacks ? (
                        <div>
                          <Label>Quanti attacchi massimo?</Label>
                          <Controller
                            name={`levels.${index}.max_multiple_attacks`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                step="1"
                                min="1"
                                placeholder="1"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value, 10) || 1)
                                }
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {/* Nuovi campi livello: investimento PA e crescita danno per PA */}
                      <div className="grid grid-cols-2 gap-4">
                        {watchedPaInvestmentEnabled ? (
                          <div>
                            <Label>Valore consumo massimo PA</Label>
                            <Controller
                              name={`levels.${index}.max_pa_investment`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  step="1"
                                  min="0"
                                  placeholder="0"
                                  onChange={(e) =>
                                    field.onChange(parseInt(e.target.value, 10) || 0)
                                  }
                                />
                              )}
                            />
                          </div>
                        ) : null}

                        {watchedDamageIncreasePerPaEnabled ? (
                          <div>
                            <Label>Tasso di crescita danno/PA</Label>
                            <Controller
                              name={`levels.${index}.increasing_damage_per_pa`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value) || 0)
                                  }
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
                      </div>

                      {/* Nuovo: campi per livello legati ai nuovi switch */}
                      {watchedHasMaxTargets ? (
                        <div>
                          <Label>Numero massimo di bersagli</Label>
                          <Controller
                            name={`levels.${index}.max_targets`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                placeholder="1"
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
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
                                        </div>
                                      ) : null}

                                      {watchedDamagePerSecond && watchedDamagePerSecondIncreasing ? (
                                        <div>
                                          <Label>Danno crescente per secondo (Fase {phIdx + 1})</Label>
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

                                      {watchedHasTurnDuration ? (
                                        <div>
                                          <Label>Durata in turni (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(ph?.turn_duration_rounds || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                ? [...(watchedLevels[index].phases as any[])]
                                                : [];
                                              current[phIdx] = { ...current[phIdx], turn_duration_rounds: val };
                                              setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      ) : null}

                                      {watchedMultipleShots ? (
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Proiettili massimi (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.max_projectiles || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], max_projectiles: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                          {watchedMultipleShotsIncreasing ? (
                                            <div>
                                              <Label>Danno crescente per proiettile (Fase {phIdx + 1})</Label>
                                              <Input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={Number(ph?.increasing_damage_per_projectile || 0)}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value) || 0;
                                                  const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                    ? [...(watchedLevels[index].phases as any[])]
                                                    : [];
                                                  current[phIdx] = { ...current[phIdx], increasing_damage_per_projectile: val };
                                                  setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                }}
                                              />
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}

                                      {watchedPaInvestmentEnabled ? (
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Consumo massimo PA (Fase {phIdx + 1})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(ph?.max_pa_investment || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                  ? [...(watchedLevels[index].phases as any[])]
                                                  : [];
                                                current[phIdx] = { ...current[phIdx], max_pa_investment: val };
                                                setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                          {watchedDamageIncreasePerPaEnabled ? (
                                            <div>
                                              <Label>Tasso di crescita danno/PA (Fase {phIdx + 1})</Label>
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                placeholder="0.0"
                                                value={Number(ph?.increasing_damage_per_pa || 0)}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value) || 0;
                                                  const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                    ? [...(watchedLevels[index].phases as any[])]
                                                    : [];
                                                  current[phIdx] = { ...current[phIdx], increasing_damage_per_pa: val };
                                                  setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                }}
                                              />
                                            </div>
                                          ) : null}
                                          {watchedSuccessRollIncreasePerPaEnabled ? (
                                            <div>
                                              <Label>1 punto addizione ogni quanto? (Fase {phIdx + 1})</Label>
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                placeholder="0.0"
                                                value={Number(ph?.success_roll_increase_every_pa || 0)}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value) || 0;
                                                  const current = Array.isArray(watchedLevels?.[index]?.phases)
                                                    ? [...(watchedLevels[index].phases as any[])]
                                                    : [];
                                                  current[phIdx] = { ...current[phIdx], success_roll_increase_every_pa: val };
                                                  setValue(`levels.${index}.phases`, current, { shouldDirty: true });
                                                }}
                                              />
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}

                                      {watchedHasMaxTargets ? (
                                        <div>
                                          <Label>Numero massimo di bersagli (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            placeholder="1"
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
                                          <Label>Dopo quanti turni si attiva? (Fase {phIdx + 1})</Label>
                                          <Input
                                            type="number"
                                            min="0"
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
                                            placeholder="0.0"
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
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Attacco caricato */}
                      {!watchedLotteryEnabled && watchedChargedAttack ? (
                        <div className="space-y-4">
                          <Label>Attacco caricato</Label>
                          {/* Base grade heading (mostrato quando il toggle globale è attivo) */}
                          <div>
                            <Label>Grado 1 (base)</Label>
                          </div>
                        </div>
                      ) : null}

                      {/* Avvertimento per livello */}
                      {!watchedLotteryEnabled && watchedHasLevelWarning ? (
                        <div>
                          <Label>Avvertimento (mostrato all'uso)</Label>
                          <Controller
                            name={`levels.${index}.level_warning`}
                            control={control}
                            render={({ field }) => (
                              <Textarea
                                {...field}
                                placeholder="Testo di avvertimento per questo livello"
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {/* Tiro di percentuale - per livello */}
                      {!watchedLotteryEnabled && watchedPercentageRollEnabled ? (
                        <div>
                          <Label>Percentuale minima di successo (%)</Label>
                          <Controller
                            name={`levels.${index}.min_success_percentage`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="0"
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {watchedLotteryEnabled ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Numero di facce dado</Label>
                            <Controller
                              name={`levels.${index}.lottery_dice_faces`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min="2"
                                  placeholder="6"
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              )}
                            />
                          </div>

                          <div>
                            <Label>Quante scelte numeriche?</Label>
                            <Controller
                              name={`levels.${index}.lottery_numeric_choices`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Istanza corretta</Label>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                    ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                    : [];
                                  const lvl = (watchedLevels?.[index] || {}) as any;
                                  const baseDamageValues = Array.isArray(lvl?.damage_values) ? lvl.damage_values : [];
                                  const basePercentageValues = Array.isArray(lvl?.percentage_damage_values) ? lvl.percentage_damage_values : [];
                              const dv = baseDamageValues.map((bdv: any) => ({
                                    guaranteed_damage: typeof bdv?.guaranteed_damage === 'number' ? bdv.guaranteed_damage : Number(bdv?.guaranteed_damage) || 0,
                                    additional_damage: typeof bdv?.additional_damage === 'number' ? bdv.additional_damage : Number(bdv?.additional_damage) || 0,
                                  }));
                                  const pdv = basePercentageValues.map((bpv: any) => ({
                                    guaranteed_percentage_damage: typeof bpv?.guaranteed_percentage_damage === 'number' ? bpv.guaranteed_percentage_damage : Number(bpv?.guaranteed_percentage_damage) || 0,
                                    additional_percentage_damage: typeof bpv?.additional_percentage_damage === 'number' ? bpv.additional_percentage_damage : Number(bpv?.additional_percentage_damage) || 0,
                                  }));
                              const next = [
                                ...current,
                                {
                                  title: `Corretta ${current.length + 1}`,
                                  effects: [],
                                  guaranteed_damage: 0,
                                  additional_damage: 0,
                                  damage_values: dv,
                                  percentage_damage_values: pdv,
                                  self_damage_sets: Array.isArray(lvl?.self_damage_sets) ? lvl.self_damage_sets : [],
                                  area_or_cone_value: typeof lvl?.area_or_cone_value === 'number' ? lvl.area_or_cone_value : Number(lvl?.area_or_cone_value) || 0,
                                  chain_targets: typeof lvl?.chain_targets === 'number' ? lvl.chain_targets : Number(lvl?.chain_targets) || 1,
                                  max_seconds: typeof lvl?.max_seconds === 'number' ? lvl.max_seconds : Number(lvl?.max_seconds) || 0,
                                  pa_cost_per_second: typeof lvl?.pa_cost_per_second === 'number' ? lvl.pa_cost_per_second : Number(lvl?.pa_cost_per_second) || 0,
                                  increasing_damage_per_second: typeof lvl?.increasing_damage_per_second === 'number' ? lvl.increasing_damage_per_second : Number(lvl?.increasing_damage_per_second) || 0,
                                  turn_duration_rounds: typeof lvl?.turn_duration_rounds === 'number' ? lvl.turn_duration_rounds : Number(lvl?.turn_duration_rounds) || 0,
                                  max_projectiles: typeof lvl?.max_projectiles === 'number' ? lvl.max_projectiles : Number(lvl?.max_projectiles) || 0,
                                  increasing_damage_per_projectile: typeof lvl?.increasing_damage_per_projectile === 'number' ? lvl.increasing_damage_per_projectile : Number(lvl?.increasing_damage_per_projectile) || 0,
                                  max_multiple_attacks: typeof lvl?.max_multiple_attacks === 'number' ? lvl.max_multiple_attacks : Number(lvl?.max_multiple_attacks) || 0,
                                  level_warning: (lvl?.level_warning ?? '').toString().trim(),
                                  use_weapon_damage: !!lvl?.use_weapon_damage,
                                  anomaly1_percentage: typeof lvl?.anomaly1_percentage === 'number' ? lvl.anomaly1_percentage : Number(lvl?.anomaly1_percentage) || 0,
                                  anomaly1_type: (lvl?.anomaly1_type || 'Nessuna') as string,
                                  anomaly2_percentage: typeof lvl?.anomaly2_percentage === 'number' ? lvl.anomaly2_percentage : Number(lvl?.anomaly2_percentage) || 0,
                                  anomaly2_type: (lvl?.anomaly2_type || 'Nessuna') as string,
                                  anomaly3_percentage: typeof lvl?.anomaly3_percentage === 'number' ? lvl.anomaly3_percentage : Number(lvl?.anomaly3_percentage) || 0,
                                  anomaly3_type: (lvl?.anomaly3_type || 'Nessuna') as string,
                                  action_cost: typeof lvl?.action_cost === 'number' ? lvl.action_cost : Number(lvl?.action_cost) || 0,
                                  indicative_action_cost: typeof lvl?.indicative_action_cost === 'number' ? lvl.indicative_action_cost : Number(lvl?.indicative_action_cost) || 0,
                                  usage_interval_turns: typeof lvl?.usage_interval_turns === 'number' ? lvl.usage_interval_turns : Number(lvl?.usage_interval_turns) || 0,
                                },
                              ];
                              setValue(`levels.${index}.lottery_correct_instances`, next, { shouldDirty: true });
                                }}
                              >
                                Aggiungi istanza corretta
                              </Button>
                            </div>

                            {Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances) && ((watchedLevels?.[index] as any)?.lottery_correct_instances as any[]).length > 0 ? (
                              <div className="space-y-3">
                                {(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[]).map((inst: any, instIdx: number) => (
                                  <div key={`lvl-${index}-lottery-correct-${instIdx}`} className="rounded border p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm">Corretta {instIdx + 1}</Label>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                          const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                            ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                            : [];
                                          current.splice(instIdx, 1);
                                          setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                        }}
                                      >
                                        Rimuovi
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Costo punti azione (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.action_cost || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), action_cost: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label>Costo indicativo punti azione (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.indicative_action_cost || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), indicative_action_cost: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2 mt-2">
                                      <Label>Anomalie (Istanza)</Label>
                                      {(() => {
                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                          : [];
                                        const iobj: any = current[instIdx] || {};
                                        let maxIdx = 3;
                                        for (let i = 4; i <= 20; i++) {
                                          if (iobj?.[`anomaly${i}_percentage`] !== undefined || iobj?.[`anomaly${i}_type`] !== undefined) {
                                            maxIdx = i;
                                          }
                                        }
                                        const indices = Array.from({ length: maxIdx }, (_, i) => i + 1);
                                        return (
                                          <>
                                            <div className="grid grid-cols-3 gap-4">
                                              {indices.map((num) => (
                                                <div key={`inst-wrong-anom-${index}-${instIdx}-${num}`} className="space-y-2">
                                                  <Label className="text-xs">Anomalia {num}</Label>
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-xs">Percentuale</span>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      onClick={() => {
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                          : [];
                                                        const curr = { ...(current[instIdx] || {}) } as any;
                                                        const isBase = num <= 3;
                                                        if (isBase) {
                                                          curr[`anomaly${num}_percentage`] = 0;
                                                          curr[`anomaly${num}_type`] = 'Nessuna';
                                                        } else {
                                                          curr[`anomaly${num}_percentage`] = undefined;
                                                          curr[`anomaly${num}_type`] = undefined;
                                                        }
                                                        current[instIdx] = curr;
                                                        setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                      }}
                                                    >
                                                      X
                                                    </Button>
                                                  </div>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="%"
                                                    value={Number((iobj?.[`anomaly${num}_percentage`] ?? 0))}
                                                    onChange={(e) => {
                                                      const raw = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      curr[`anomaly${num}_percentage`] = Math.max(0, Math.min(raw, 100));
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                  {(() => {
                                                    const currentVal = (iobj?.[`anomaly${num}_type`] ?? 'Nessuna') as string;
                                                    const opts = currentVal && !anomalyOptions.includes(currentVal)
                                                      ? [...anomalyOptions, currentVal]
                                                      : anomalyOptions;
                                                    return (
                                                      <Select
                                                        onValueChange={(v) => {
                                                          const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                            ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                            : [];
                                                          const curr = { ...(current[instIdx] || {}) } as any;
                                                          curr[`anomaly${num}_type`] = v;
                                                          current[instIdx] = curr;
                                                          setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                        }}
                                                        value={currentVal}
                                                      >
                                                        <SelectTrigger>
                                                          <SelectValue placeholder={anomalyLoading ? 'Caricamento...' : 'Seleziona anomalia'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {opts.map((anom) => (
                                                            <SelectItem key={`inst-wrong-a${num}-${anom}`} value={anom}>
                                                              {anom}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    );
                                                  })()}
                                                </div>
                                              ))}
                                            </div>
                                            <div className="mt-2">
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                  const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                    ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                    : [];
                                                  const curr = { ...(current[instIdx] || {}) } as any;
                                                  let next = 4;
                                                  for (let i = 1; i <= 50; i++) {
                                                    if (curr?.[`anomaly${i}_percentage`] !== undefined || curr?.[`anomaly${i}_type`] !== undefined) {
                                                      next = i + 1;
                                                    }
                                                  }
                                                  curr[`anomaly${next}_percentage`] = 0;
                                                  curr[`anomaly${next}_type`] = 'Nessuna';
                                                  current[instIdx] = curr;
                                                  setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                }}
                                              >
                                                Aggiungi anomalia
                                              </Button>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>

                                    <div className="space-y-2 mt-2">
                                      <Label>Anomalie (Istanza)</Label>
                                      {(() => {
                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                          : [];
                                        const iobj: any = current[instIdx] || {};
                                        let maxIdx = 3;
                                        for (let i = 4; i <= 20; i++) {
                                          if (iobj?.[`anomaly${i}_percentage`] !== undefined || iobj?.[`anomaly${i}_type`] !== undefined) {
                                            maxIdx = i;
                                          }
                                        }
                                        const indices = Array.from({ length: maxIdx }, (_, i) => i + 1);
                                        return (
                                          <>
                                            <div className="grid grid-cols-3 gap-4">
                                              {indices.map((num) => (
                                                <div key={`inst-corr-anom-${index}-${instIdx}-${num}`} className="space-y-2">
                                                  <Label className="text-xs">Anomalia {num}</Label>
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-xs">Percentuale</span>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      onClick={() => {
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                          : [];
                                                        const curr = { ...(current[instIdx] || {}) } as any;
                                                        const isBase = num <= 3;
                                                        if (isBase) {
                                                          curr[`anomaly${num}_percentage`] = 0;
                                                          curr[`anomaly${num}_type`] = 'Nessuna';
                                                        } else {
                                                          curr[`anomaly${num}_percentage`] = undefined;
                                                          curr[`anomaly${num}_type`] = undefined;
                                                        }
                                                        current[instIdx] = curr;
                                                        setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                      }}
                                                    >
                                                      X
                                                    </Button>
                                                  </div>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="%"
                                                    value={Number((iobj?.[`anomaly${num}_percentage`] ?? 0))}
                                                    onChange={(e) => {
                                                      const raw = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      curr[`anomaly${num}_percentage`] = Math.max(0, Math.min(raw, 100));
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                  {(() => {
                                                    const currentVal = (iobj?.[`anomaly${num}_type`] ?? 'Nessuna') as string;
                                                    const opts = currentVal && !anomalyOptions.includes(currentVal)
                                                      ? [...anomalyOptions, currentVal]
                                                      : anomalyOptions;
                                                    return (
                                                      <Select
                                                        onValueChange={(v) => {
                                                          const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                            ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                            : [];
                                                          const curr = { ...(current[instIdx] || {}) } as any;
                                                          curr[`anomaly${num}_type`] = v;
                                                          current[instIdx] = curr;
                                                          setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                        }}
                                                        value={currentVal}
                                                      >
                                                        <SelectTrigger>
                                                          <SelectValue placeholder={anomalyLoading ? 'Caricamento...' : 'Seleziona anomalia'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {opts.map((anom) => (
                                                            <SelectItem key={`inst-corr-a${num}-${anom}`} value={anom}>
                                                              {anom}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    );
                                                  })()}
                                                </div>
                                              ))}
                                            </div>
                                            <div className="mt-2">
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                  const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                    ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                    : [];
                                                  const curr = { ...(current[instIdx] || {}) } as any;
                                                  let next = 4;
                                                  for (let i = 1; i <= 50; i++) {
                                                    if (curr?.[`anomaly${i}_percentage`] !== undefined || curr?.[`anomaly${i}_type`] !== undefined) {
                                                      next = i + 1;
                                                    }
                                                  }
                                                  curr[`anomaly${next}_percentage`] = 0;
                                                  curr[`anomaly${next}_type`] = 'Nessuna';
                                                  current[instIdx] = curr;
                                                  setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                }}
                                              >
                                                Aggiungi anomalia
                                              </Button>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>

                                    {Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                                      <div className="space-y-4">
                                        {watchedDamageTypes.map((dt, tIndex) => {
                                          const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                          const gv = Array.isArray(inst?.damage_values) ? inst.damage_values[tIndex] : undefined;
                                          const guaranteed = Number(gv?.guaranteed_damage || 0);
                                          const additional = Number(gv?.additional_damage || 0);
                                          return (
                                            <div key={`lottery-correct-${index}-${instIdx}-dt-${typeName}`} className="space-y-2">
                                              <Label className="text-sm">Tipo di danno: {typeName}</Label>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <Label>Danno assicurato (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={guaranteed}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), guaranteed_damage: val };
                                                      curr.damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Danno aggiuntivo (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={additional}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), additional_damage: val };
                                                      curr.damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
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
                                      <div className="mt-2">
                                        <Label>Valore area/cono (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          placeholder="0"
                                          value={Number(inst?.area_or_cone_value || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), area_or_cone_value: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : watchedDamageShape === 'chain' ? (
                                      <div className="mt-2">
                                        <Label>Quanti bersagli (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          placeholder="1"
                                          value={Number(inst?.chain_targets || 1)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 1;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), chain_targets: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedDamagePerSecond ? (
                                      <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                          <Label>Secondi massimo (istanza)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(inst?.max_seconds || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                : [];
                                              current[instIdx] = { ...(current[instIdx] || {}), max_seconds: val };
                                              setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Label>Costo PA al secondo (istanza)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(inst?.pa_cost_per_second || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                : [];
                                              current[instIdx] = { ...(current[instIdx] || {}), pa_cost_per_second: val };
                                              setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : null}

                                    {watchedDamagePerSecond && watchedDamagePerSecondIncreasing ? (
                                      <div className="mt-2">
                                        <Label>Danno crescente per secondo (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.increasing_damage_per_second || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), increasing_damage_per_second: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedHasTurnDuration ? (
                                      <div className="mt-2">
                                        <Label>Durata in turni (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.turn_duration_rounds || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), turn_duration_rounds: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedMultipleShots ? (
                                      <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                          <Label>Proiettili massimi (istanza)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(inst?.max_projectiles || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                : [];
                                              current[instIdx] = { ...(current[instIdx] || {}), max_projectiles: val };
                                              setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        {watchedMultipleShotsIncreasing ? (
                                          <div>
                                            <Label>Danno crescente per proiettile (istanza)</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(inst?.increasing_damage_per_projectile || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                  ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                  : [];
                                                current[instIdx] = { ...(current[instIdx] || {}), increasing_damage_per_projectile: val };
                                                setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    {watchedMultipleAttacks ? (
                                      <div className="mt-2">
                                        <Label>Attacchi massimi (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.max_multiple_attacks || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), max_multiple_attacks: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedHasLevelWarning ? (
                                      <div className="mt-2">
                                        <Label>Avvertimento (istanza)</Label>
                                        <Textarea
                                          rows={2}
                                          placeholder="Inserisci avvertimento"
                                          value={(inst?.level_warning ?? '') as string}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), level_warning: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedUseWeaponDamage ? (
                                      <div className="mt-2">
                                        <Label>Usa anche danno arma (istanza)</Label>
                                        <Select
                                          value={inst?.use_weapon_damage ? 'yes' : 'no'}
                                          onValueChange={(v) => {
                                            const val = v === 'yes';
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), use_weapon_damage: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleziona" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="no">No</SelectItem>
                                            <SelectItem value="yes">Sì</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : null}

                                    {watchedHasUsageInterval ? (
                                      <div className="mt-2">
                                        <Label>Utilizzo ogni quanti turni (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.usage_interval_turns || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), usage_interval_turns: val };
                                            setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedPercentageDamageEnabled && Array.isArray(watchedPercentageDamageEffects) && watchedPercentageDamageEffects.length > 0 ? (
                                      <div className="space-y-4">
                                        {watchedPercentageDamageEffects.map((dt, tIndex) => {
                                          const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                          const gv = Array.isArray(inst?.percentage_damage_values) ? inst.percentage_damage_values[tIndex] : undefined;
                                          const guaranteed = Number(gv?.guaranteed_percentage_damage || 0);
                                          const additional = Number(gv?.additional_percentage_damage || 0);
                                          return (
                                            <div key={`lottery-correct-${index}-${instIdx}-pdt-${typeName}`} className="space-y-2">
                                              <Label className="text-sm">Danno percentuale: {typeName}</Label>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <Label>Danno percentuale assicurato (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={guaranteed}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), guaranteed_percentage_damage: val };
                                                      curr.percentage_damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Danno percentuale aggiuntivo (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={additional}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), additional_percentage_damage: val };
                                                      curr.percentage_damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
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
                                      <div className="mt-2">
                                        <Label>Valore area/cono (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          placeholder="0"
                                          value={Number(inst?.area_or_cone_value || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), area_or_cone_value: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : watchedDamageShape === 'chain' ? (
                                      <div className="mt-2">
                                        <Label>Quanti bersagli (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          placeholder="1"
                                          value={Number(inst?.chain_targets || 1)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 1;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), chain_targets: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedDamagePerSecond ? (
                                      <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                          <Label>Secondi massimo (istanza)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(inst?.max_seconds || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                : [];
                                              current[instIdx] = { ...(current[instIdx] || {}), max_seconds: val };
                                              setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Label>Costo PA al secondo (istanza)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(inst?.pa_cost_per_second || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                : [];
                                              current[instIdx] = { ...(current[instIdx] || {}), pa_cost_per_second: val };
                                              setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : null}

                                    {watchedDamagePerSecond && watchedDamagePerSecondIncreasing ? (
                                      <div className="mt-2">
                                        <Label>Danno crescente per secondo (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.increasing_damage_per_second || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), increasing_damage_per_second: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedHasTurnDuration ? (
                                      <div className="mt-2">
                                        <Label>Durata in turni (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.turn_duration_rounds || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), turn_duration_rounds: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedMultipleShots ? (
                                      <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                          <Label>Proiettili massimi (istanza)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(inst?.max_projectiles || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                : [];
                                              current[instIdx] = { ...(current[instIdx] || {}), max_projectiles: val };
                                              setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        {watchedMultipleShotsIncreasing ? (
                                          <div>
                                            <Label>Danno crescente per proiettile (istanza)</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(inst?.increasing_damage_per_projectile || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                  ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                  : [];
                                                current[instIdx] = { ...(current[instIdx] || {}), increasing_damage_per_projectile: val };
                                                setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    {watchedMultipleAttacks ? (
                                      <div className="mt-2">
                                        <Label>Attacchi massimi (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.max_multiple_attacks || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), max_multiple_attacks: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedHasLevelWarning ? (
                                      <div className="mt-2">
                                        <Label>Avvertimento (istanza)</Label>
                                        <Textarea
                                          rows={2}
                                          placeholder="Inserisci avvertimento"
                                          value={(inst?.level_warning ?? '') as string}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), level_warning: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedUseWeaponDamage ? (
                                      <div className="mt-2">
                                        <Label>Usa anche danno arma (istanza)</Label>
                                        <Select
                                          value={inst?.use_weapon_damage ? 'yes' : 'no'}
                                          onValueChange={(v) => {
                                            const val = v === 'yes';
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), use_weapon_damage: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleziona" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="no">No</SelectItem>
                                            <SelectItem value="yes">Sì</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : null}

                                    {watchedHasUsageInterval ? (
                                      <div className="mt-2">
                                        <Label>Utilizzo ogni quanti turni (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.usage_interval_turns || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), usage_interval_turns: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {watchedHasSelfEffects && Array.isArray(watchedSelfDamageEffects) && watchedSelfDamageEffects.length > 0 ? (
                                      <div className="space-y-3">
                                        <Label>Effetti su utilizzatore (istanza)</Label>
                                        {(() => {
                                          const instanceSets: any[] = Array.isArray(inst?.self_damage_sets)
                                            ? (inst.self_damage_sets as any[])
                                            : [];
                                          const generalEffects: string[] = Array.isArray(watchedSelfDamageEffects)
                                            ? watchedSelfDamageEffects
                                                .map((e: any) => (e?.name || '').trim())
                                                .filter((n: string) => !!n)
                                            : [];
                                          const rows: any[] = instanceSets.length > 0
                                            ? instanceSets
                                            : generalEffects.map((name: string) => ({ effect_name: name, guaranteed_damage: 0, max_damage: 0 }));

                                          const modeByName: Record<string, 'classic' | 'percentage'> = (Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : []).reduce((acc: any, e: any) => {
                                            const nm = (e?.name || '').trim();
                                            if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
                                            return acc;
                                          }, {});

                                          return rows.map((s: any, sIndex: number) => (
                                            <div key={`inst-selfset-${index}-${instIdx}-${s?.effect_name || 'effect'}-${sIndex}`} className="space-y-2">
                                              <Label className="text-sm">Effect: {s?.effect_name || `Effect ${sIndex + 1}`}</Label>
                                              {((modeByName[s?.effect_name || generalEffects?.[sIndex] || ''] || s?.mode || 'classic') === 'percentage') ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <Label>Danni percentuali assicurati (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.guaranteed_percentage_damage) ?? s?.guaranteed_percentage_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'percentage',
                                                          guaranteed_percentage_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Danni percentuali aggiuntivi (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.max_percentage_damage) ?? s?.max_percentage_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'percentage',
                                                          max_percentage_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <Label>Danni assicurati (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.guaranteed_damage) ?? s?.guaranteed_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'classic',
                                                          guaranteed_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Danni massimi (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.max_damage) ?? s?.max_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_correct_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_correct_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'classic',
                                                          max_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_correct_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    ) : null}

                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Istanza sbagliata</Label>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                    ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                    : [];
                                  const lvl = (watchedLevels?.[index] || {}) as any;
                                  const baseDamageValues = Array.isArray(lvl?.damage_values) ? lvl.damage_values : [];
                                  const basePercentageValues = Array.isArray(lvl?.percentage_damage_values) ? lvl.percentage_damage_values : [];
                                  const dv = baseDamageValues.map((bdv: any) => ({
                                    guaranteed_damage: typeof bdv?.guaranteed_damage === 'number' ? bdv.guaranteed_damage : Number(bdv?.guaranteed_damage) || 0,
                                    additional_damage: typeof bdv?.additional_damage === 'number' ? bdv.additional_damage : Number(bdv?.additional_damage) || 0,
                                  }));
                                  const pdv = basePercentageValues.map((bpv: any) => ({
                                    guaranteed_percentage_damage: typeof bpv?.guaranteed_percentage_damage === 'number' ? bpv.guaranteed_percentage_damage : Number(bpv?.guaranteed_percentage_damage) || 0,
                                    additional_percentage_damage: typeof bpv?.additional_percentage_damage === 'number' ? bpv.additional_percentage_damage : Number(bpv?.additional_percentage_damage) || 0,
                                  }));
                              const next = [
                                ...current,
                                {
                                  title: `Sbagliata ${current.length + 1}`,
                                  effects: [],
                                  guaranteed_damage: 0,
                                  additional_damage: 0,
                                  damage_values: dv,
                                  percentage_damage_values: pdv,
                                  self_damage_sets: Array.isArray(lvl?.self_damage_sets) ? lvl.self_damage_sets : [],
                                  area_or_cone_value: typeof lvl?.area_or_cone_value === 'number' ? lvl.area_or_cone_value : Number(lvl?.area_or_cone_value) || 0,
                                  chain_targets: typeof lvl?.chain_targets === 'number' ? lvl.chain_targets : Number(lvl?.chain_targets) || 1,
                                  max_seconds: typeof lvl?.max_seconds === 'number' ? lvl.max_seconds : Number(lvl?.max_seconds) || 0,
                                  pa_cost_per_second: typeof lvl?.pa_cost_per_second === 'number' ? lvl.pa_cost_per_second : Number(lvl?.pa_cost_per_second) || 0,
                                  increasing_damage_per_second: typeof lvl?.increasing_damage_per_second === 'number' ? lvl.increasing_damage_per_second : Number(lvl?.increasing_damage_per_second) || 0,
                                  turn_duration_rounds: typeof lvl?.turn_duration_rounds === 'number' ? lvl.turn_duration_rounds : Number(lvl?.turn_duration_rounds) || 0,
                                  max_projectiles: typeof lvl?.max_projectiles === 'number' ? lvl.max_projectiles : Number(lvl?.max_projectiles) || 0,
                                  increasing_damage_per_projectile: typeof lvl?.increasing_damage_per_projectile === 'number' ? lvl.increasing_damage_per_projectile : Number(lvl?.increasing_damage_per_projectile) || 0,
                                  max_multiple_attacks: typeof lvl?.max_multiple_attacks === 'number' ? lvl.max_multiple_attacks : Number(lvl?.max_multiple_attacks) || 0,
                                  level_warning: (lvl?.level_warning ?? '').toString().trim(),
                                  use_weapon_damage: !!lvl?.use_weapon_damage,
                                  anomaly1_percentage: typeof lvl?.anomaly1_percentage === 'number' ? lvl.anomaly1_percentage : Number(lvl?.anomaly1_percentage) || 0,
                                  anomaly1_type: (lvl?.anomaly1_type || 'Nessuna') as string,
                                  anomaly2_percentage: typeof lvl?.anomaly2_percentage === 'number' ? lvl.anomaly2_percentage : Number(lvl?.anomaly2_percentage) || 0,
                                  anomaly2_type: (lvl?.anomaly2_type || 'Nessuna') as string,
                                  anomaly3_percentage: typeof lvl?.anomaly3_percentage === 'number' ? lvl.anomaly3_percentage : Number(lvl?.anomaly3_percentage) || 0,
                                  anomaly3_type: (lvl?.anomaly3_type || 'Nessuna') as string,
                                  action_cost: typeof lvl?.action_cost === 'number' ? lvl.action_cost : Number(lvl?.action_cost) || 0,
                                  indicative_action_cost: typeof lvl?.indicative_action_cost === 'number' ? lvl.indicative_action_cost : Number(lvl?.indicative_action_cost) || 0,
                                  usage_interval_turns: typeof lvl?.usage_interval_turns === 'number' ? lvl.usage_interval_turns : Number(lvl?.usage_interval_turns) || 0,
                                },
                              ];
                              setValue(`levels.${index}.lottery_wrong_instances`, next, { shouldDirty: true });
                                }}
                              >
                                Aggiungi istanza sbagliata
                              </Button>
                            </div>

                            {Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances) && ((watchedLevels?.[index] as any)?.lottery_wrong_instances as any[]).length > 0 ? (
                              <div className="space-y-3">
                                {(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[]).map((inst: any, instIdx: number) => (
                                  <div key={`lvl-${index}-lottery-wrong-${instIdx}`} className="rounded border p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm">Sbagliata {instIdx + 1}</Label>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                          const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                            ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                            : [];
                                          current.splice(instIdx, 1);
                                          setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                        }}
                                      >
                                        Rimuovi
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Costo punti azione (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.action_cost || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), action_cost: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label>Costo indicativo punti azione (istanza)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={Number(inst?.indicative_action_cost || 0)}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                              ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                              : [];
                                            current[instIdx] = { ...(current[instIdx] || {}), indicative_action_cost: val };
                                            setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                                      <div className="space-y-4">
                                        {watchedDamageTypes.map((dt, tIndex) => {
                                          const typeName = dt?.name || `Tipo ${tIndex + 1}`;
                                          const gv = Array.isArray(inst?.damage_values) ? inst.damage_values[tIndex] : undefined;
                                          const guaranteed = Number(gv?.guaranteed_damage || 0);
                                          const additional = Number(gv?.additional_damage || 0);
                                          return (
                                            <div key={`lottery-wrong-${index}-${instIdx}-dt-${typeName}`} className="space-y-2">
                                              <Label className="text-sm">Tipo di danno: {typeName}</Label>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <Label>Danno assicurato (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={guaranteed}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), guaranteed_damage: val };
                                                      curr.damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Danno aggiuntivo (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={additional}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.damage_values) ? [...curr.damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), additional_damage: val };
                                                      curr.damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
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
                                          const gv = Array.isArray(inst?.percentage_damage_values) ? inst.percentage_damage_values[tIndex] : undefined;
                                          const guaranteed = Number(gv?.guaranteed_percentage_damage || 0);
                                          const additional = Number(gv?.additional_percentage_damage || 0);
                                          return (
                                            <div key={`lottery-wrong-${index}-${instIdx}-pdt-${typeName}`} className="space-y-2">
                                              <Label className="text-sm">Danno percentuale: {typeName}</Label>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <Label>Danno percentuale assicurato (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={guaranteed}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), guaranteed_percentage_damage: val };
                                                      curr.percentage_damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Danno percentuale aggiuntivo (istanza)</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={additional}
                                                    onChange={(e) => {
                                                      const val = Number(e.target.value) || 0;
                                                      const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                        ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                        : [];
                                                      const curr = { ...(current[instIdx] || {}) } as any;
                                                      const dv = Array.isArray(curr.percentage_damage_values) ? [...curr.percentage_damage_values] : [];
                                                      dv[tIndex] = { ...(dv[tIndex] || {}), additional_percentage_damage: val };
                                                      curr.percentage_damage_values = dv;
                                                      current[instIdx] = curr;
                                                      setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : null}

                                    {watchedHasSelfEffects && Array.isArray(watchedSelfDamageEffects) && watchedSelfDamageEffects.length > 0 ? (
                                      <div className="space-y-3">
                                        <Label>Effetti su utilizzatore (istanza)</Label>
                                        {(() => {
                                          const instanceSets: any[] = Array.isArray(inst?.self_damage_sets)
                                            ? (inst.self_damage_sets as any[])
                                            : [];
                                          const generalEffects: string[] = Array.isArray(watchedSelfDamageEffects)
                                            ? watchedSelfDamageEffects
                                                .map((e: any) => (e?.name || '').trim())
                                                .filter((n: string) => !!n)
                                            : [];
                                          const rows: any[] = instanceSets.length > 0
                                            ? instanceSets
                                            : generalEffects.map((name: string) => ({ effect_name: name, guaranteed_damage: 0, max_damage: 0 }));

                                          const modeByName: Record<string, 'classic' | 'percentage'> = (Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : []).reduce((acc: any, e: any) => {
                                            const nm = (e?.name || '').trim();
                                            if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
                                            return acc;
                                          }, {});

                                          return rows.map((s: any, sIndex: number) => (
                                            <div key={`inst-selfset-wrong-${index}-${instIdx}-${s?.effect_name || 'effect'}-${sIndex}`} className="space-y-2">
                                              <Label className="text-sm">Effect: {s?.effect_name || `Effect ${sIndex + 1}`}</Label>
                                              {((modeByName[s?.effect_name || generalEffects?.[sIndex] || ''] || s?.mode || 'classic') === 'percentage') ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <Label>Danni percentuali assicurati (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.guaranteed_percentage_damage) ?? s?.guaranteed_percentage_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'percentage',
                                                          guaranteed_percentage_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Danni percentuali aggiuntivi (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.max_percentage_damage) ?? s?.max_percentage_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'percentage',
                                                          max_percentage_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <Label>Danni assicurati (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.guaranteed_damage) ?? s?.guaranteed_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'classic',
                                                          guaranteed_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Danni massimi (self)</Label>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={Number((instanceSets?.[sIndex]?.max_damage) ?? s?.max_damage ?? 0)}
                                                      onChange={(e) => {
                                                        const val = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.lottery_wrong_instances)
                                                          ? ([...(((watchedLevels?.[index] as any)?.lottery_wrong_instances) as any[])])
                                                          : [];
                                                        const currInst = { ...(current[instIdx] || {}) } as any;
                                                        const currSets: any[] = Array.isArray(currInst.self_damage_sets) ? [...currInst.self_damage_sets] : [];
                                                        currSets[sIndex] = {
                                                          effect_name: (s?.effect_name || currSets?.[sIndex]?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`),
                                                          ...(currSets?.[sIndex] || {}),
                                                          mode: 'classic',
                                                          max_damage: val,
                                                        } as any;
                                                        currInst.self_damage_sets = currSets;
                                                        current[instIdx] = currInst;
                                                        setValue(`levels.${index}.lottery_wrong_instances`, current, { shouldDirty: true });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    ) : null}

                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {/* Sezione fallimento per livello rimossa: la configurazione avviene solo nelle informazioni generali */}

                      {!watchedLotteryEnabled && watchedHasUsageInterval ? (
                        <div>
                          <Label>Intervallo di utilizzo (turni)</Label>
                          <Controller
                            name={`levels.${index}.usage_interval_turns`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                placeholder="1"
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedHasMaxUsesPerTurn ? (
                        <div>
                          <Label>Massimi utilizzi a turno</Label>
                          <Controller
                            name={`levels.${index}.max_uses_per_turn`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                placeholder="1"
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedHasSelfEffects ? (
                        <div className="space-y-3">
                          {Array.isArray(watchedSelfDamageEffects) && watchedSelfDamageEffects.length > 0 ? (
                            <>
                              <Label>Effetti su utilizzatore</Label>
                              {(() => {
                                const levelSets: any[] = Array.isArray(watchedLevels?.[index]?.self_damage_sets)
                                  ? (watchedLevels[index].self_damage_sets as any[])
                                  : [];
                                const generalEffects: string[] = Array.isArray(watchedSelfDamageEffects)
                                  ? watchedSelfDamageEffects
                                      .map((e: any) => (e?.name || '').trim())
                                      .filter((n: string) => !!n)
                                  : [];
                                const modeByName: Record<string, 'classic' | 'percentage'> = (Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : []).reduce((acc: any, e: any) => {
                                  const nm = (e?.name || '').trim();
                                  if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
                                  return acc;
                                }, {});

                                const rows: any[] = generalEffects.map((name: string) => {
                                  const found = levelSets.find((s: any) => ((s?.effect_name || '').trim()) === name) || null;
                                  return {
                                    effect_name: name,
                                    guaranteed_damage: typeof found?.guaranteed_damage === 'number' ? found.guaranteed_damage : 0,
                                    max_damage: typeof found?.max_damage === 'number' ? found.max_damage : 0,
                                    mode: (typeof found?.mode === 'string') ? found.mode : (modeByName[name] || 'classic'),
                                    guaranteed_percentage_damage: typeof found?.guaranteed_percentage_damage === 'number' ? found.guaranteed_percentage_damage : 0,
                                    max_percentage_damage: typeof found?.max_percentage_damage === 'number' ? found.max_percentage_damage : 0,
                                  };
                                });

                                return rows.map((s: any, sIndex: number) => (
                                  <div key={`selfset-${index}-${s?.effect_name || 'effect'}-${sIndex}`} className="space-y-2">
                                    <Label className="text-sm">Effect: {s?.effect_name || `Effect ${sIndex + 1}`}</Label>
                                    {((modeByName[s?.effect_name || generalEffects?.[sIndex] || ''] || 'classic') === 'percentage') ? (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Danni percentuali assicurati (self)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="0"
                                            value={Number(s?.guaranteed_percentage_damage ?? 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const curr: any[] = Array.isArray(watchedLevels?.[index]?.self_damage_sets)
                                                ? [ ...(watchedLevels[index].self_damage_sets as any[]) ]
                                                : [];
                                              const name = s?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`;
                                              const i = curr.findIndex((x: any) => ((x?.effect_name || '').trim()) === name);
                                              const nextObj = { ...(i >= 0 ? curr[i] : {}), effect_name: name, mode: 'percentage', guaranteed_percentage_damage: val } as any;
                                              if (i >= 0) curr[i] = nextObj; else curr.push(nextObj);
                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Label>Danni percentuali aggiuntivi (self)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="0"
                                            value={Number(s?.max_percentage_damage ?? 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const curr: any[] = Array.isArray(watchedLevels?.[index]?.self_damage_sets)
                                                ? [ ...(watchedLevels[index].self_damage_sets as any[]) ]
                                                : [];
                                              const name = s?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`;
                                              const i = curr.findIndex((x: any) => ((x?.effect_name || '').trim()) === name);
                                              const nextObj = { ...(i >= 0 ? curr[i] : {}), effect_name: name, mode: 'percentage', max_percentage_damage: val } as any;
                                              if (i >= 0) curr[i] = nextObj; else curr.push(nextObj);
                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Danni assicurati (self)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(s?.guaranteed_damage ?? 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const curr: any[] = Array.isArray(watchedLevels?.[index]?.self_damage_sets)
                                                ? [ ...(watchedLevels[index].self_damage_sets as any[]) ]
                                                : [];
                                              const name = s?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`;
                                              const i = curr.findIndex((x: any) => ((x?.effect_name || '').trim()) === name);
                                              const nextObj = { ...(i >= 0 ? curr[i] : {}), effect_name: name, mode: 'classic', guaranteed_damage: val } as any;
                                              if (i >= 0) curr[i] = nextObj; else curr.push(nextObj);
                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Label>Danni massimi (self)</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(s?.max_damage ?? 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const curr: any[] = Array.isArray(watchedLevels?.[index]?.self_damage_sets)
                                                ? [ ...(watchedLevels[index].self_damage_sets as any[]) ]
                                                : [];
                                              const name = s?.effect_name || generalEffects?.[sIndex] || `Effect ${sIndex + 1}`;
                                              const i = curr.findIndex((x: any) => ((x?.effect_name || '').trim()) === name);
                                              const nextObj = { ...(i >= 0 ? curr[i] : {}), effect_name: name, mode: 'classic', max_damage: val } as any;
                                              if (i >= 0) curr[i] = nextObj; else curr.push(nextObj);
                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ));
                              })()}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Seleziona gli effect self nella sezione “Informazioni Generali”.
                            </p>
                          )}

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
                                  <div key={`rm:${level.id}:${name}`} className="flex items-center gap-2">
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

                      {/* Danni per tipo */}
                      {!watchedLotteryEnabled && Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                        <div className="space-y-4">
                          {watchedDamageTypes.map((dt, tIndex) => (
                            <div key={`${dt.name}-${tIndex}`} className="space-y-2">
                              <Label className="text-sm">Tipo di danno: {dt.name || `Tipo ${tIndex + 1}`}</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Danno assicurato</Label>
                                  <Controller
                                    name={`levels.${index}.damage_values.${tIndex}.guaranteed_damage`}
                                    control={control}
                                    render={({ field }) => (
                                      <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                      />
                                    )}
                                  />
                                </div>
                                <div>
                                  <Label>Danno aggiuntivo</Label>
                                  <Controller
                                    name={`levels.${index}.damage_values.${tIndex}.additional_damage`}
                                    control={control}
                                    render={({ field }) => (
                                      <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                      />
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aggiungi almeno un tipo di danno nella sezione “Informazioni Generali”.
                        </p>
                      )}

                      {watchedLessHealthMoreDamageEnabled ? (
                        <div className="space-y-2 mt-4">
                          <div>
                            <Label>Ogni quanto punto salute in meno?</Label>
                            <Controller
                              name={`levels.${index}.less_health_more_damage_every_hp`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  placeholder="Valore da inserire"
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              )}
                            />
                          </div>

                          {!watchedLotteryEnabled && Array.isArray(watchedDamageTypes) && watchedDamageTypes.length > 0 ? (
                            <div className="space-y-2">
                              <Label>Incremento danni: (Usando i damage effect selezionati)</Label>
                              {watchedDamageTypes.map((dt, tIndex) => (
                                <div key={`lhd:${dt.name}-${tIndex}`} className="space-y-1">
                                  <Label className="text-sm">{dt.name || `Tipo ${tIndex + 1}`}</Label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Controller
                                        name={`levels.${index}.damage_values.${tIndex}.less_health_more_damage_guaranteed_increment`}
                                        control={control}
                                        render={({ field }) => (
                                          <Input
                                            {...field}
                                            type="number"
                                            min="0"
                                            placeholder="Assicurato"
                                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                          />
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <Controller
                                        name={`levels.${index}.damage_values.${tIndex}.less_health_more_damage_additional_increment`}
                                        control={control}
                                        render={({ field }) => (
                                          <Input
                                            {...field}
                                            type="number"
                                            min="0"
                                            placeholder="Aggiutivo"
                                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                          />
                                        )}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {!watchedLotteryEnabled && watchedPercentageDamageEnabled ? (
                        Array.isArray(watchedPercentageDamageEffects) && watchedPercentageDamageEffects.length > 0 ? (
                          <div className="space-y-4">
                            {watchedPercentageDamageEffects.map((dt, tIndex) => (
                              <div key={`p-${dt.name}-${tIndex}`} className="space-y-2">
                                <Label className="text-sm">Danno percentuale: {dt.name || `Tipo ${tIndex + 1}`}</Label>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Danno percentuale assicurato</Label>
                                    <Controller
                                      name={`levels.${index}.percentage_damage_values.${tIndex}.guaranteed_percentage_damage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          type="number"
                                          min="0"
                                          max="100"
                                          placeholder="0"
                                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                        />
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <Label>Danno percentuale aggiuntivo</Label>
                                    <Controller
                                      name={`levels.${index}.percentage_damage_values.${tIndex}.additional_percentage_damage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          type="number"
                                          min="0"
                                          max="100"
                                          placeholder="0"
                                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Seleziona effetti percentuali nella sezione “Informazioni Generali”.</p>
                        )
                      ) : null}

                      {/* Effetti di fallimento per livello */}
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
                            {Number(watchedLevels?.[index]?.failure_anomaly_action_points_modifier || 0) !== 0 && (
                              <p className="text-sm"><span className="font-medium">Punti azione:</span> {Number(watchedLevels?.[index]?.failure_anomaly_action_points_modifier || 0)}</p>
                            )}
                            {Number(watchedLevels?.[index]?.failure_anomaly_health_modifier || 0) !== 0 && (
                              <p className="text-sm"><span className="font-medium">Salute:</span> {Number(watchedLevels?.[index]?.failure_anomaly_health_modifier || 0)}</p>
                            )}
                            {(() => {
                              const sm: any = (watchedLevels?.[index] as any)?.failure_anomaly_stats_modifier;
                              const entries = sm ? Object.entries(sm).filter(([, v]) => Number(v || 0) !== 0) : [];
                              if (entries.length === 0) return null;
                              const txt = entries.map(([k, v]) => `${k}: ${Number(v || 0)}`).join(', ');
                              return (<p className="text-sm"><span className="font-medium">Statistiche:</span> {txt}</p>);
                            })()}
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
                                    {...field}
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-4">
                        {/* Costi */}
                        <div>
                          <Label>Costo punti azione</Label>
                          <Controller
                            name={`levels.${index}.action_cost`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                placeholder="0"
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <Label>Costo indicativo punti azione</Label>
                          <Controller
                            name={`levels.${index}.indicative_action_cost`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                placeholder="0"
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      </div>

                      {watchedExtraCostEnabled ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label>Costo extra</Label>
                            <Controller
                              name={`levels.${index}.extra_action_cost`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              )}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label>Anomalie</Label>
                        {(() => {
                          const lvl: any = watchedLevels?.[index] || {};
                          let maxIdx = 3;
                          for (let i = 4; i <= 20; i++) {
                            if (lvl?.[`anomaly${i}_percentage`] !== undefined || lvl?.[`anomaly${i}_type`] !== undefined) {
                              maxIdx = i;
                            }
                          }
                          const indices = Array.from({ length: maxIdx }, (_, i) => i + 1);
                          return (
                            <>
                              <div className="grid grid-cols-3 gap-4">
                                {indices.map((num) => (
                                  <div key={`anom-${index}-${num}`} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm">Anomalia {num}</Label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const isBase = num <= 3;
                                          if (isBase) {
                                            setValue(`levels.${index}.anomaly${num}_percentage`, 0, { shouldDirty: true });
                                            setValue(`levels.${index}.anomaly${num}_type`, 'Nessuna', { shouldDirty: true });
                                          } else {
                                            setValue(`levels.${index}.anomaly${num}_percentage`, undefined as any, { shouldDirty: true });
                                            setValue(`levels.${index}.anomaly${num}_type`, undefined as any, { shouldDirty: true });
                                          }
                                        }}
                                      >
                                        X
                                      </Button>
                                    </div>
                                    <Controller
                                      name={`levels.${index}.anomaly${num}_percentage`}
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          type="number"
                                          min="0"
                                          max="100"
                                          placeholder="%"
                                          onChange={(e) => {
                                            const raw = Number(e.target.value) || 0;
                                            field.onChange(Math.max(0, Math.min(raw, 100)));
                                          }}
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`levels.${index}.anomaly${num}_type`}
                                      control={control}
                                      render={({ field }) => {
                                        const opts = field.value && !anomalyOptions.includes(field.value)
                                          ? [...anomalyOptions, field.value]
                                          : anomalyOptions;
                                        return (
                                          <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                              <SelectValue placeholder={anomalyLoading ? 'Caricamento...' : 'Seleziona anomalia'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {opts.map((anom) => (
                                                <SelectItem key={`a${num}-${anom}`} value={anom}>
                                                  {anom}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        );
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    const lvl: any = watchedLevels?.[index] || {};
                                    let next = 4;
                                    for (let i = 1; i <= 50; i++) {
                                      if (lvl?.[`anomaly${i}_percentage`] !== undefined || lvl?.[`anomaly${i}_type`] !== undefined) {
                                        next = i + 1;
                                      }
                                    }
                                    setValue(`levels.${index}.anomaly${next}_percentage`, 0, { shouldDirty: true });
                                    setValue(`levels.${index}.anomaly${next}_type`, 'Nessuna', { shouldDirty: true });
                                  }}
                                >
                                  Aggiungi anomalia
                                </Button>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Gradi aggiuntivi (replica UI livello) */}
                      {!watchedLotteryEnabled && watchedChargedAttack ? (
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <Label>Gradi aggiuntivi</Label>
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
                                    anomaly1_percentage: 0,
                                    anomaly1_type: 'Nessuna',
                                    anomaly2_percentage: 0,
                                    anomaly2_type: 'Nessuna',
                                    anomaly3_percentage: 0,
                                    anomaly3_type: 'Nessuna',
                                    // Nuovo: campi indipendenti per il grado
                                    action_cost: 0,
                                    indicative_action_cost: 0,
                                    usage_interval_turns: 0,
                                    // Nuovo: identificatore del grado
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
                                    anomaly1_percentage: typeof lvl?.anomaly1_percentage === 'number' ? lvl.anomaly1_percentage : Number(lvl?.anomaly1_percentage) || 0,
                                    anomaly1_type: (lvl?.anomaly1_type || 'Nessuna') as string,
                                    anomaly2_percentage: typeof lvl?.anomaly2_percentage === 'number' ? lvl.anomaly2_percentage : Number(lvl?.anomaly2_percentage) || 0,
                                    anomaly2_type: (lvl?.anomaly2_type || 'Nessuna') as string,
                                    anomaly3_percentage: typeof lvl?.anomaly3_percentage === 'number' ? lvl.anomaly3_percentage : Number(lvl?.anomaly3_percentage) || 0,
                                    anomaly3_type: (lvl?.anomaly3_type || 'Nessuna') as string,
                                    // Copia anche i costi di azione del livello di base
                                    action_cost: typeof lvl?.action_cost === 'number' ? lvl.action_cost : Number(lvl?.action_cost) || 0,
                                    indicative_action_cost: typeof lvl?.indicative_action_cost === 'number' ? lvl.indicative_action_cost : Number(lvl?.indicative_action_cost) || 0,
                                    usage_interval_turns: typeof lvl?.usage_interval_turns === 'number' ? lvl.usage_interval_turns : Number(lvl?.usage_interval_turns) || 0,
                                    // Mantieni/assegna identificatore del grado
                                    grade_number: typeof g?.grade_number === 'number' ? g.grade_number : i + 2,
                                  };
                                });

                                setValue(`levels.${index}.grades`, copiedGrades, { shouldDirty: true });
                              }}
                            >
                              Duplica dal Grado 1
                            </Button>
                          </div>

                          {Array.isArray(watchedLevels?.[index]?.grades) && (watchedLevels[index].grades as any[]).length > 0 ? (
                            <div className="space-y-3">
                              {(watchedLevels[index].grades as any[]).map((gr, grIdx) => (
                                <div key={`lvl-${index}-grade-${grIdx}`} className="rounded border p-3 space-y-2">
                                  <>
                                      {/* Danni per tipo (replica livello) */}
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
                                        <p className="text-xs text-muted-foreground">
                                          Aggiungi almeno un tipo di danno nella sezione “Informazioni Generali”.
                                        </p>
                                      )}

                                      {/* Forma del danno (replica livello) */}
                                      {watchedDamageShape === 'area' || watchedDamageShape === 'cone' ? (
                                        <div className="grid grid-cols-1 gap-4">
                                          <div>
                                            <Label>Valore area/cono (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(gr?.area_or_cone_value || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                  ? [...(watchedLevels[index].grades as any[])]
                                                  : [];
                                                current[grIdx] = { ...current[grIdx], area_or_cone_value: val } as any;
                                                setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ) : watchedDamageShape === 'chain' ? (
                                        <div className="grid grid-cols-1 gap-4">
                                          <div>
                                            <Label>Bersagli in catena (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                            <Input
                                              type="number"
                                              min="1"
                                              placeholder="1"
                                              value={Number(gr?.chain_targets || 1)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 1;
                                                const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                  ? [...(watchedLevels[index].grades as any[])]
                                                  : [];
                                                current[grIdx] = { ...current[grIdx], chain_targets: val } as any;
                                                setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* Danni al secondo (replica livello) */}
                                      {watchedDamagePerSecond ? (
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Max secondi (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(gr?.max_seconds || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                  ? [...(watchedLevels[index].grades as any[])]
                                                  : [];
                                                current[grIdx] = { ...current[grIdx], max_seconds: val } as any;
                                                setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                          <div>
                                            <Label>Costo PA/sec (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={Number(gr?.pa_cost_per_second || 0)}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                  ? [...(watchedLevels[index].grades as any[])]
                                                  : [];
                                                current[grIdx] = { ...current[grIdx], pa_cost_per_second: val } as any;
                                                setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                              }}
                                            />
                                          </div>
                                          {watchedDamagePerSecondIncreasing ? (
                                            <div className="col-span-2">
                                              <Label>Danno crescente/sec (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                              <Input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={Number(gr?.increasing_damage_per_second || 0)}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value) || 0;
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

                                      {/* Costi azione del grado (indipendenti dal livello) */}
                                      <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                          <Label>Costo punti azione (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(gr?.action_cost || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                ? [...(watchedLevels[index].grades as any[])]
                                                : [];
                                              const curr = { ...(current[grIdx] || {}) } as any;
                                              curr.action_cost = val;
                                              current[grIdx] = curr;
                                              setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Label>Costo indicativo punti azione (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={Number(gr?.indicative_action_cost || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                ? [...(watchedLevels[index].grades as any[])]
                                                : [];
                                              const curr = { ...(current[grIdx] || {}) } as any;
                                              curr.indicative_action_cost = val;
                                              current[grIdx] = curr;
                                              setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {/* Durata in turni */}
                                      {watchedHasTurnDuration ? (
                                        <div>
                                          <Label>Quanti turni dura?</Label>
                                          <Controller
                                            name={`levels.${index}.turn_duration_rounds`}
                                            control={control}
                                            render={({ field }) => (
                                              <Input
                                                {...field}
                                                type="number"
                                                step="1"
                                                min="1"
                                                placeholder="1"
                                                onChange={(e) =>
                                                  field.onChange(parseInt(e.target.value, 10) || 1)
                                                }
                                              />
                                            )}
                                          />
                                        </div>
                                      ) : null}

                                      {/* Tiri multipli */}
                                      {watchedMultipleShots ? (
                                        <>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label>Quanti proiettili massimo?</Label>
                                              <Controller
                                                name={`levels.${index}.max_projectiles`}
                                                control={control}
                                                render={({ field }) => (
                                                  <Input
                                                    {...field}
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    placeholder="1"
                                                    onChange={(e) =>
                                                      field.onChange(parseInt(e.target.value, 10) || 1)
                                                    }
                                                  />
                                                )}
                                              />
                                            </div>

                                            {watchedMultipleShotsIncreasing ? (
                                              <div>
                                                <Label>Danno crescente per proiettile</Label>
                                                <Controller
                                                  name={`levels.${index}.increasing_damage_per_projectile`}
                                                  control={control}
                                                  render={({ field }) => (
                                                    <Input
                                                      {...field}
                                                      type="number"
                                                      step="0.1"
                                                      min="0"
                                                      placeholder="0.0"
                                                      onChange={(e) =>
                                                        field.onChange(parseFloat(e.target.value) || 0)
                                                      }
                                                    />
                                                  )}
                                                />
                                              </div>
                                            ) : null}
                                          </div>
                                        </>
                                      ) : null}

                                      {/* Molteplici attacchi: quantità massima */}
                                      {watchedMultipleAttacks ? (
                                        <div>
                                          <Label>Quanti attacchi massimo?</Label>
                                          <Controller
                                            name={`levels.${index}.max_multiple_attacks`}
                                            control={control}
                                            render={({ field }) => (
                                              <Input
                                                {...field}
                                                type="number"
                                                step="1"
                                                min="1"
                                                placeholder="1"
                                                onChange={(e) =>
                                                  field.onChange(parseInt(e.target.value, 10) || 1)
                                                }
                                              />
                                            )}
                                          />
                                        </div>
                                      ) : null}

                                      {/* Nuovi campi livello: investimento PA e crescita danno per PA */}
                                      <div className="grid grid-cols-2 gap-4">
                                        {watchedPaInvestmentEnabled ? (
                                          <div>
                                            <Label>Valore consumo massimo PA</Label>
                                            <Controller
                                              name={`levels.${index}.max_pa_investment`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  {...field}
                                                  type="number"
                                                  step="1"
                                                  min="0"
                                                  placeholder="0"
                                                  onChange={(e) =>
                                                    field.onChange(parseInt(e.target.value, 10) || 0)
                                                  }
                                                />
                                              )}
                                            />
                                          </div>
                                        ) : null}

                                        {watchedDamageIncreasePerPaEnabled ? (
                                          <div>
                                            <Label>Tasso di crescita danno/PA</Label>
                                            <Controller
                                              name={`levels.${index}.increasing_damage_per_pa`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  {...field}
                                                  type="number"
                                                  step="0.1"
                                                  min="0"
                                                  placeholder="0.0"
                                                  onChange={(e) =>
                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                  }
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
                                      </div>

                                      {/* Numero massimo di bersagli */}
                                      {watchedHasMaxTargets ? (
                                        <div>
                                          <Label>Numero massimo di bersagli</Label>
                                          <Controller
                                            name={`levels.${index}.max_targets`}
                                            control={control}
                                            render={({ field }) => (
                                              <Input
                                                {...field}
                                                type="number"
                                                min="1"
                                                placeholder="1"
                                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                              />
                                            )}
                                          />
                                        </div>
                                      ) : null}

                                      {/* Avvertimento per livello */}
                                      {watchedHasLevelWarning ? (
                                        <div>
                                          <Label>Avvertimento (mostrato all'uso)</Label>
                                          <Controller
                                            name={`levels.${index}.level_warning`}
                                            control={control}
                                            render={({ field }) => (
                                              <Textarea
                                                {...field}
                                                placeholder="Testo di avvertimento per questo livello"
                                              />
                                            )}
                                          />
                                        </div>
                                      ) : null}

                                      {/* Tiro di percentuale - per livello */}
                                      {watchedPercentageRollEnabled ? (
                                        <div>
                                          <Label>Percentuale minima di successo (%)</Label>
                                          <Controller
                                            name={`levels.${index}.min_success_percentage`}
                                            control={control}
                                            render={({ field }) => (
                                              <Input
                                                {...field}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                placeholder="0"
                                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                              />
                                            )}
                                          />
                                        </div>
                                      ) : null}

                                      {/* Intervallo di utilizzo (turni) per grado */}
                                      {watchedHasUsageInterval ? (
                                        <div>
                                          <Label>Intervallo di utilizzo (turni) (Grado {Number((gr as any)?.grade_number ?? grIdx + 2)})</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            placeholder="1"
                                            value={Number((gr as any)?.usage_interval_turns || 0)}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              const current = Array.isArray(watchedLevels?.[index]?.grades)
                                                ? [...(watchedLevels[index].grades as any[])]
                                                : [];
                                              const curr = { ...(current[grIdx] || {}) } as any;
                                              curr.usage_interval_turns = val;
                                              current[grIdx] = curr;
                                              setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                            }}
                                          />
                                        </div>
                                      ) : null}

                                      {/* Effetti su utilizzatore */}
                                      {watchedHasSelfEffects ? (
                                        <>
                                          {Array.isArray(watchedSelfDamageEffects) && watchedSelfDamageEffects.length > 0 ? (
                                            <div className="space-y-3">
                                              <Label>Effetti su utilizzatore</Label>
                                              {(() => {
                                                const sets = Array.isArray(watchedLevels?.[index]?.self_damage_sets) ? (watchedLevels[index].self_damage_sets as any[]) : [];
                                                const modeByName: Record<string, 'classic' | 'percentage'> = (Array.isArray(watchedSelfDamageEffects) ? watchedSelfDamageEffects : []).reduce((acc: any, e: any) => {
                                                  const nm = (e?.name || '').trim();
                                                  if (nm) acc[nm] = (e?.mode === 'percentage' ? 'percentage' : 'classic');
                                                  return acc;
                                                }, {});
                                                return sets.map((s: any, sIndex: number) => (
                                                  <div key={`selfset-${index}-${s.effect_name}-${sIndex}`} className="space-y-2">
                                                    <Label className="text-sm">Effect: {s?.effect_name || `Effect ${sIndex + 1}`}</Label>
                                                    {((modeByName[s?.effect_name || ''] || s?.mode || 'classic') === 'percentage') ? (
                                                      <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                          <Label>Danni percentuali assicurati (self)</Label>
                                                          <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="0"
                                                            value={Number(s?.guaranteed_percentage_damage || 0)}
                                                            onChange={(e) => {
                                                              const val = Number(e.target.value) || 0;
                                                              const curr = Array.isArray(watchedLevels?.[index]?.self_damage_sets) ? [...(watchedLevels[index].self_damage_sets as any[])] : [];
                                                              curr[sIndex] = { ...(curr[sIndex] || {}), mode: 'percentage', guaranteed_percentage_damage: val } as any;
                                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                                            }}
                                                          />
                                                        </div>
                                                        <div>
                                                          <Label>Danni percentuali aggiuntivi (self)</Label>
                                                          <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="0"
                                                            value={Number(s?.max_percentage_damage || 0)}
                                                            onChange={(e) => {
                                                              const val = Number(e.target.value) || 0;
                                                              const curr = Array.isArray(watchedLevels?.[index]?.self_damage_sets) ? [...(watchedLevels[index].self_damage_sets as any[])] : [];
                                                              curr[sIndex] = { ...(curr[sIndex] || {}), mode: 'percentage', max_percentage_damage: val } as any;
                                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
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
                                                            value={Number(s?.guaranteed_damage || 0)}
                                                            onChange={(e) => {
                                                              const val = Number(e.target.value) || 0;
                                                              const curr = Array.isArray(watchedLevels?.[index]?.self_damage_sets) ? [...(watchedLevels[index].self_damage_sets as any[])] : [];
                                                              curr[sIndex] = { ...(curr[sIndex] || {}), mode: 'classic', guaranteed_damage: val } as any;
                                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                                            }}
                                                          />
                                                        </div>
                                                        <div>
                                                          <Label>Danno massimo</Label>
                                                          <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0"
                                                            value={Number(s?.max_damage || 0)}
                                                            onChange={(e) => {
                                                              const val = Number(e.target.value) || 0;
                                                              const curr = Array.isArray(watchedLevels?.[index]?.self_damage_sets) ? [...(watchedLevels[index].self_damage_sets as any[])] : [];
                                                              curr[sIndex] = { ...(curr[sIndex] || {}), mode: 'classic', max_damage: val } as any;
                                                              setValue(`levels.${index}.self_damage_sets`, curr, { shouldDirty: true });
                                                            }}
                                                          />
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          ) : null}

                                          {/* Anomalia su utilizzatore per grado */}
                                          <div className="space-y-2 mt-2">
                                            <Label>Anomalia su utilizzatore</Label>
                                              <div className="space-y-1">
                                                <p className="text-sm"><span className="font-medium">Nome:</span> {watchedLevels?.[index]?.self_anomaly_name || 'Nessuna'}</p>
                                                {watchedLevels?.[index]?.self_anomaly_description ? (
                                                  <p className="text-sm"><span className="font-medium">Descrizione:</span> {watchedLevels[index].self_anomaly_description}</p>
                                                ) : null}
                                                <p className="text-sm"><span className="font-medium">Durata:</span> {(watchedLevels?.[index]?.self_anomaly_turns ?? 0)} turni</p>
                                                {watchedLevels?.[index]?.self_anomaly_does_damage ? (
                                                  <p className="text-sm">
                                                    <span className="font-medium">Danno per turno:</span> {(watchedLevels?.[index]?.self_anomaly_damage_per_turn ?? 0)}{' '}
                                                    <span className="text-muted-foreground">({watchedLevels?.[index]?.self_anomaly_damage_effect_name || 'Effetto'})</span>
                                                  </p>
                                                ) : null}
                                                {Number(watchedLevels?.[index]?.self_anomaly_action_points_modifier || 0) !== 0 && (
                                                  <p className="text-sm"><span className="font-medium">Punti azione:</span> {Number(watchedLevels?.[index]?.self_anomaly_action_points_modifier || 0)}</p>
                                                )}
                                                {Number(watchedLevels?.[index]?.self_anomaly_health_modifier || 0) !== 0 && (
                                                  <p className="text-sm"><span className="font-medium">Salute:</span> {Number(watchedLevels?.[index]?.self_anomaly_health_modifier || 0)}</p>
                                                )}
                                                {(() => {
                                                  const sm: any = (watchedLevels?.[index] as any)?.self_anomaly_stats_modifier;
                                                  const entries = sm ? Object.entries(sm).filter(([, v]) => Number(v || 0) !== 0) : [];
                                                  if (entries.length === 0) return null;
                                                  const txt = entries.map(([k, v]) => `${k}: ${Number(v || 0)}`).join(', ');
                                                  return (<p className="text-sm"><span className="font-medium">Statistiche:</span> {txt}</p>);
                                                })()}
                                              </div>
                                            <div className="mt-2">
                                              <Button type="button" variant="secondary" onClick={() => openAnomalyModal(index, 'self')}>
                                                Modifica anomalia
                                              </Button>
                                            </div>
                                          </div>
                                        </>
                                      ) : null}

                                      {/* Costo extra */}
                                      {watchedExtraCostEnabled ? (
                                        <div className="grid grid-cols-1 gap-4">
                                          <div>
                                            <Label>Costo extra</Label>
                                            <Controller
                                              name={`levels.${index}.extra_action_cost`}
                                              control={control}
                                              render={({ field }) => (
                                                <Input
                                                  {...field}
                                                  type="number"
                                                  min="0"
                                                  placeholder="0"
                                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                />
                                              )}
                                            />
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* Effetti di fallimento (per livello) mostrati anche nel grado */}
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

                                      <div className="space-y-2 mt-2">
                                        <Label>Anomalie (Grado {grIdx + 2})</Label>
                                        {(() => {
                                          const lvlGrades: any[] = Array.isArray((watchedLevels?.[index] as any)?.grades) ? ([...(((watchedLevels?.[index] as any)?.grades) as any[])]) : [];
                                          const gobj: any = lvlGrades[grIdx] || {};
                                          let maxIdx = 3;
                                          for (let i = 4; i <= 20; i++) {
                                            if (gobj?.[`anomaly${i}_percentage`] !== undefined || gobj?.[`anomaly${i}_type`] !== undefined) {
                                              maxIdx = i;
                                            }
                                          }
                                          const indices = Array.from({ length: maxIdx }, (_, i) => i + 1);
                                          return (
                                            <>
                                              <div className="grid grid-cols-3 gap-4">
                                                {indices.map((num) => (
                                                  <div key={`grade-anom-${index}-${grIdx}-${num}`} className="space-y-2">
                                                  <Label className="text-xs">Anomalia {num}</Label>
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-xs">Percentuale</span>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      onClick={() => {
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.grades)
                                                          ? ([...(((watchedLevels?.[index] as any)?.grades) as any[])])
                                                          : [];
                                                        const isBase = num <= 3;
                                                        const curr = { ...(current[grIdx] || {}) } as any;
                                                        if (isBase) {
                                                          curr[`anomaly${num}_percentage`] = 0;
                                                          curr[`anomaly${num}_type`] = 'Nessuna';
                                                        } else {
                                                          curr[`anomaly${num}_percentage`] = undefined;
                                                          curr[`anomaly${num}_type`] = undefined;
                                                        }
                                                        current[grIdx] = curr;
                                                        setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                      }}
                                                    >
                                                      X
                                                    </Button>
                                                  </div>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="%"
                                                    value={Number((gobj?.[`anomaly${num}_percentage`] ?? 0))}
                                                    onChange={(e) => {
                                                        const raw = Number(e.target.value) || 0;
                                                        const current = Array.isArray((watchedLevels?.[index] as any)?.grades)
                                                          ? ([...(((watchedLevels?.[index] as any)?.grades) as any[])])
                                                          : [];
                                                        const gcur = { ...(current[grIdx] || {}) } as any;
                                                        gcur[`anomaly${num}_percentage`] = Math.max(0, Math.min(raw, 100));
                                                        current[grIdx] = gcur as any;
                                                        setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                      }}
                                                  />
                                                    {(() => {
                                                      const currentVal = (gobj?.[`anomaly${num}_type`] ?? 'Nessuna') as string;
                                                      const opts = currentVal && !anomalyOptions.includes(currentVal)
                                                        ? [...anomalyOptions, currentVal]
                                                        : anomalyOptions;
                                                      return (
                                                        <Select
                                                          onValueChange={(v) => {
                                                            const current = Array.isArray((watchedLevels?.[index] as any)?.grades)
                                                              ? ([...(((watchedLevels?.[index] as any)?.grades) as any[])])
                                                              : [];
                                                            current[grIdx] = { ...(current[grIdx] || {}), [`anomaly${num}_type`]: v } as any;
                                                            setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                          }}
                                                          value={currentVal}
                                                        >
                                                          <SelectTrigger>
                                                            <SelectValue placeholder={anomalyLoading ? 'Caricamento...' : 'Seleziona anomalia'} />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {opts.map((anom) => (
                                                              <SelectItem key={`gr${index}-${grIdx}-a${num}-${anom}`} value={anom}>
                                                                {anom}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      );
                                                    })()}
                                                  </div>
                                                ))}
                                              </div>
                                              <div className="mt-2">
                                                <Button
                                                  type="button"
                                                  variant="secondary"
                                                  onClick={() => {
                                                    const current = Array.isArray((watchedLevels?.[index] as any)?.grades)
                                                      ? ([...(((watchedLevels?.[index] as any)?.grades) as any[])])
                                                      : [];
                                                    const gobj: any = current[grIdx] || {};
                                                    let next = 4;
                                                    for (let i = 1; i <= 50; i++) {
                                                      if (gobj?.[`anomaly${i}_percentage`] !== undefined || gobj?.[`anomaly${i}_type`] !== undefined) {
                                                        next = i + 1;
                                                      }
                                                    }
                                                    current[grIdx] = { ...(current[grIdx] || {}), [`anomaly${next}_percentage`]: 0, [`anomaly${next}_type`]: 'Nessuna' } as any;
                                                    setValue(`levels.${index}.grades`, current, { shouldDirty: true });
                                                  }}
                                                >
                                                  Aggiungi anomalia
                                                </Button>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>

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
                                            {Number(watchedLevels?.[index]?.failure_anomaly_action_points_modifier || 0) !== 0 && (
                                              <p className="text-sm"><span className="font-medium">Punti azione:</span> {Number(watchedLevels?.[index]?.failure_anomaly_action_points_modifier || 0)}</p>
                                            )}
                                            {Number(watchedLevels?.[index]?.failure_anomaly_health_modifier || 0) !== 0 && (
                                              <p className="text-sm"><span className="font-medium">Salute:</span> {Number(watchedLevels?.[index]?.failure_anomaly_health_modifier || 0)}</p>
                                            )}
                                            {(() => {
                                              const sm: any = (watchedLevels?.[index] as any)?.failure_anomaly_stats_modifier;
                                              const entries = sm ? Object.entries(sm).filter(([, v]) => Number(v || 0) !== 0) : [];
                                              if (entries.length === 0) return null;
                                              const txt = entries.map(([k, v]) => `${k}: ${Number(v || 0)}`).join(', ');
                                              return (<p className="text-sm"><span className="font-medium">Statistiche:</span> {txt}</p>);
                                            })()}
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
                                                    {...field}
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                  />
                                                )}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}
                                  </>

                                  <div className="flex justify-end">
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
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* (fine sezione anomalie) */}

                      {/* Descrizione del livello */}
                      <div>
                        <Label>Descrizione del livello</Label>
                        <Controller
                          name={`levels.${index}.level_description`}
                          control={control}
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              placeholder="Dettagli ed effetti del livello"
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

            {/* Tab Informazioni Aggiuntive */}
            <TabsContent value="additional" className="space-y-6">
              <div>
                <Label htmlFor="additionalDescription">Descrizione aggiuntiva</Label>
                <Controller
                  name="additionalDescription"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="additionalDescription"
                      placeholder="Altre note, effetti, dettagli..."
                      rows={4}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="story1">Storia 1</Label>
                  <Controller
                    name="story1"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="story1"
                        placeholder="Narrativa, origine, ecc..."
                        rows={3}
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
                        placeholder="Altre note di storia..."
                        rows={3}
                      />
                    )}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : mode === 'edit' ? 'Aggiorna Magia' : 'Crea Magia'}
            </Button>
          </DialogFooter>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
    <AnomalyModal
      isOpen={isAnomalyModalOpen}
      onClose={handleAnomalyClose}
      onSave={handleAnomalySave}
      editingAnomaly={editingAnomaly as any}
    />
    </>
  );
};
