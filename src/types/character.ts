// Tipi per le statistiche base del personaggio
export interface CharacterStats {
  forza: number;
  percezione: number;
  resistenza: number;
  intelletto: number;
  agilita: number;
  sapienza: number;
  anima: number;
}

export interface CharacterCalculations {
  totalStats: CharacterStats;
  statModifiers: CharacterStats;
  maxHealth: number;
  maxActionPoints: number;
  totalWeight: number;
  carryCapacity: number;
  isOverloaded: boolean;
  overloadAmount: number;
  overloadLevel: OverloadLevel | null;
  carryStatus: string;
  totalArmor: number;
  canEquipItem: (item: EquipmentItem) => boolean;
  firstWeaponDamage: any;
  otherWeaponsDamage: any[];
}

// Tipi per gli oggetti equipaggiabili
export interface EquipmentItem {
  id: string;
  name: string;
  type: 'armatura' | 'arma';
  subtype: string; // Per armatura: 'armatura', 'sotto_corazza', etc. Per arma: 'una_mano', 'due_mani', etc.
  stats: Partial<CharacterStats>;
  weight: number;
  description: string;
  armor?: number; // Solo per armature
  damage?: number; // Solo per armi (campo legacy)
  calculatedDamage?: number; // 33% del danno per armi (campo legacy)
  // Nuovi campi per i diversi tipi di danno
  damageVeloce?: number; // Danno veloce per armi
  damagePesante?: number; // Danno pesante per armi
  damageAffondo?: number; // Danno affondo per armi
  calculatedDamageVeloce?: number; // 33% del danno veloce
  calculatedDamagePesante?: number; // 33% del danno pesante
  calculatedDamageAffondo?: number; // 33% del danno affondo
  // Dati estesi per armi (materiale, tipo arma da supabase, set di danno nominati)
  statusAnomalies?: StatusAnomaly[]; // Anomalie applicate dall'oggetto quando equipaggiato
  unlockedPowers?: {
    abilities?: Array<
      | { name?: string; ability_id: string; level: number }
      | { ability: any; level: number }
    >;
    spells?: Array<
      | { name?: string; spell_id: string; level: number }
      | { spell: any; level: number }
    >;
  };
  data?: WeaponData;
}

export interface WeaponDamageSet {
  effect_name: string; // Selezionato da Supabase damage_effects.name
  damage_veloce?: number;
  damage_pesante?: number;
  damage_affondo?: number;
  calculated_damage_veloce?: number; // 33% del danno veloce
  calculated_damage_pesante?: number; // 33% del danno pesante
  calculated_damage_affondo?: number; // 33% del danno affondo
}

export interface WeaponData {
  material_id?: string | null;
  material_name?: string | null;
  weapon_type_id?: string | null; // id da tabella supabase weapon_types
  weapon_type_name?: string | null;
  weapon_type_category?: 'mischia' | 'distanza' | null;
  weapon_subtype_detail?: string | null; // sotto-sottotipo libero
  damage_sets?: WeaponDamageSet[]; // più tipi per arma con nome
  alternate_damages?: Array<{
    name?: string | null;
    damage_sets?: WeaponDamageSet[];
  }>;
  alternate_damage?: {
    name?: string | null;
    damage_sets?: WeaponDamageSet[];
  };
}

// Tipi per gli oggetti inventario
export interface InventoryItem {
  id: string;
  name: string;
  type: 'oggetto';
  description?: string;
  weight?: number;
  quantity?: number;
  equipmentData?: Partial<EquipmentItem>;
}

// Tipi per le frecce
export interface Arrow {
  id: string;
  name: string;
  description: string;
  damage: number;
  quantity: number;
}

// Freccia/Faretra Magica importata dal database admin
export interface MagicQuiverItem {
  id: string; // id dalla tabella supabase magic_quivers
  name: string;
  description?: string;
  warnings?: string | null;
  action_points_cost?: number | null;
  indicative_action_points_cost?: number | null;
  damage_sets?: {
    // Alcuni record possono avere solo l'id dell'effetto danno
    damageEffectId?: string;
    // Preferibilmente memorizziamo anche il nome per la UI
    effect_name?: string;
    guaranteed_damage?: number | null;
    additional_damage?: number | null;
  }[];
  anomalies?: {
    anomalyId?: string;
    percent?: number; // 0-100
    name?: string; // opzionale se disponibile
  }[];
}

// Tipi per le pozioni
export interface Potion {
  id: string;
  name: string;
  description: string;
  effect: string;
  quantity: number;
  isRestore?: boolean;
  damageSets?: {
    damageEffectId?: string;
    effect_name?: string;
    guaranteedDamage?: number;
    additionalDamage?: number;
  }[];
  hasAnomaly?: boolean;
  anomaly?: StatusAnomaly | null;
  anomalyId?: string | null;
}

// Tipi per le valute
export interface Currency {
  bronzo: number;
  argento: number;
  oro: number;
  rosse: number;
  bianche: number;
}

// Tipi per le anomalie di stato
export interface StatusAnomaly {
  id: string;
  name: string;
  description: string;
  statsModifier: Partial<CharacterStats>;
  actionPointsModifier: number;
  healthModifier: number;
  armorModifier?: number;
  turns?: number;
  durationMode?: 'turns' | 'actions';
  actionsDurationType?: 'received' | 'performed';
  decrementOnFailure?: boolean;
  alwaysActive?: boolean;
  sourceType?: 'equipment' | 'spell' | 'ability' | 'manual';
  sourceId?: string;
  damageSets?: { damageEffectId?: string; effectName?: string; guaranteedDamage?: number; additionalDamage?: number }[];
  damageBonusEnabled?: boolean;
  damageBonus?: {
    isSpecific?: boolean;
    damageEffectIds?: string[];
    damageEffectNames?: string[];
    applyToEquipment?: boolean;
    mode?: 'classic' | 'percentage';
    classicGuaranteed?: number;
    classicAdditional?: number;
    percentageGuaranteed?: number;
    percentageAdditional?: number;
  };
  damageReductionEnabled?: boolean;
  damageReduction?: {
    isSpecific?: boolean;
    damageEffectIds?: string[];
    damageEffectNames?: string[];
    mode?: 'classic' | 'percentage';
    classicGuaranteed?: number;
    classicAdditional?: number;
    percentageGuaranteed?: number;
    percentageAdditional?: number;
  };
  weaknessEnabled?: boolean;
  weakness?: {
    isSpecific?: boolean;
    damageEffectIds?: string[];
    damageEffectNames?: string[];
    mode?: 'classic' | 'percentage';
    classicGuaranteed?: number;
    classicAdditional?: number;
    percentageGuaranteed?: number;
    percentageAdditional?: number;
  };
  paDiscountEnabled?: boolean;
  paDiscount?: {
    isSpecific?: boolean;
    targetMode?: 'abilities' | 'magic' | 'select';
    categories?: string[];
    mode?: 'classic' | 'percentage';
    classicGuaranteed?: number;
    classicAdditional?: number;
    percentageGuaranteed?: number;
    percentageAdditional?: number;
  };
}

// Istanza di evocazione a runtime
export interface EvocationInstance {
  id: string;
  name: string;
  type: 'weapon' | 'entity' | 'replica' | 'energy';
  sourceType: 'spell' | 'ability';
  sourceId: string;
  level: number;
  remainingTurns: number;
  actionCost?: number | null;
  details?: any; // snapshot dei dati di livello per UI/logic
  created_at?: string;
}

// Tipi per le magie
export interface Spell {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
  primaryBranch: string;
  secondaryBranch?: string;
  primarySpecificity: string;
  secondarySpecificity?: string;
  grade: 'Semplice' | 'Avanzata' | 'Suprema';
}

export interface MagicSubcategory {
  name: string;
  value: number;
  spells: Spell[];
}

export interface MagicCategory {
  [subcategory: string]: MagicSubcategory;
}

export interface Magic {
  distruzione: MagicCategory;
  illusione: MagicCategory;
  evocazione: MagicCategory;
  supporto: MagicCategory;
  alterazione: MagicCategory;
  alchimia: MagicCategory;
  divinazione: MagicCategory;
  trasmutazione: MagicCategory;
  occulto: MagicCategory;
  arcano: MagicCategory;
  speciale: MagicCategory;
}

// Tipo principale del personaggio
export interface Character {
  id?: string;
  name: string;
  level: number;
  birth_date?: string;
  baseStats: CharacterStats;
  health: {
    current: number;
    max: number;
  };
  actionPoints: {
    current: number;
    max: number;
  };
  baseArmor: number;
  currentArmor?: number;
  equipment: {
    weapon?: EquipmentItem;
    armor?: EquipmentItem;
    shield?: EquipmentItem;
    accessory?: EquipmentItem;
  };
  inventory: InventoryItem[];
  arrows: Arrow[];
  potions: Potion[];
  // Nuova sezione: Faretra Magica (frecce magiche importate dal DB)
  magic_quivers?: MagicQuiverItem[];
  currency: Currency;
  anomalies: StatusAnomaly[];
  evocations?: EvocationInstance[];
  skills: {
    [key: string]: SkillSection;
  };
  abilities?: {
    [key: string]: number;
  };
  magic: {
    [key: string]: MagicSection | number;
  };
  custom_spells?: any[];
  custom_abilities?: any[];
  avatar_url?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Sottotipi per equipaggiamento
export const ARMOR_SUBTYPES = [
  'armatura',
  'sotto_corazza', 
  'veste',
  'mantello',
  'testa',
  'maschera',
  'anello',
  'amuleto',
  'spallacci'
] as const;

export const WEAPON_SUBTYPES = [
  'una_mano',
  'due_mani',
  'arma_laterale',
  'arma_distanza'
] as const;

export const ARMOR_LIMITS: Record<string, number> = {
  armatura: 1,
  sotto_corazza: 1,
  veste: 1,
  mantello: 1,
  testa: 1,
  maschera: 1,
  anello: 6,
  amuleto: 2,
  spallacci: 1
};

export const WEAPON_LIMITS: Record<string, number> = {
  una_mano: 2,
  due_mani: 1,
  arma_laterale: 1,
  arma_distanza: 1
};

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
  meleeOffensive: {
    [key: string]: SkillSection;
  };
  meleeDefensive: {
    [key: string]: SkillSection;
  };
  ranged: {
    [key: string]: SkillSection;
  };
  logic: {
    [key: string]: SkillSection;
  };
  stealth: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
  meleeOffensive: {
    [key: string]: SkillSection;
  };
  meleeDefensive: {
    [key: string]: SkillSection;
  };
  ranged: {
    [key: string]: SkillSection;
  };
  logic: {
    [key: string]: SkillSection;
  };
  stealth: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
  meleeOffensive: {
    [key: string]: SkillSection;
  };
  meleeDefensive: {
    [key: string]: SkillSection;
  };
  ranged: {
    [key: string]: SkillSection;
  };
  logic: {
    [key: string]: SkillSection;
  };
  stealth: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
  meleeOffensive: {
    [key: string]: SkillSection;
  };
  meleeDefensive: {
    [key: string]: SkillSection;
  };
  ranged: {
    [key: string]: SkillSection;
  };
  logic: {
    [key: string]: SkillSection;
  };
  stealth: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
  meleeOffensive: {
    [key: string]: SkillSection;
  };
  meleeDefensive: {
    [key: string]: SkillSection;
  };
  ranged: {
    [key: string]: SkillSection;
  };
  logic: {
    [key: string]: SkillSection;
  };
  stealth: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}

// Tipi per le abilità
export interface Skill {
  id: string;
  name: string;
  type: 'passiva' | 'attiva' | 'suprema';
  level?: number | null;
  description: string;
  notes: string;
}

export interface SkillSection {
  name: string;
  value: number;
  skills: Skill[];
}

export interface Skills {
  fisiche: {
    [key: string]: SkillSection;
  };
  mentali: {
    [key: string]: SkillSection;
  };
  sociali: {
    [key: string]: SkillSection;
  };
}
