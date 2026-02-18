export type DiceType = 'azioni' | 'danno' | 'danno_critico' | 'percentuale' | 'tiro_libero';

export interface DiceRoll {
  id: string;
  characterId: string;
  characterName: string;
  diceType: DiceType;
  result: number;
  maxValue: number;
  modifier?: number;
  modifierType?: string;
  timestamp: Date;
  isHidden: boolean;
  diceDetails?: string;  // Stringa formattata con [] per dadi e () per valori puri
  rollDetails: {
    pureDamage?: number;        // Danno puro ()
    diceRolls?: Array<{         // Tiri di dado []
      type: string;
      value: number;
      maxValue: number;
    }>;
    totalResult: number;
    description: string;
  };
  isSpecialMessage?: boolean;
  specialMessage?: string;
}

export interface FreeDiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (diceCount: number, diceValue: number) => void;
}

// Importa i tipi Character e CharacterStats se non sono già definiti qui
export interface Character {
  // Definisci qui la struttura del personaggio se necessario
  id: string;
  name: string;
  // ... altri campi
}

export interface CharacterStats {
  // Definisci qui le statistiche del personaggio
  forza?: number;
  agilita?: number;
  intelligenza?: number;
  percezione?: number;
  volonta?: number;
  anima?: number;
  // ... altre statistiche
}

export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
  spellCooldowns?: Record<string, number>;
  activationOnly?: boolean;
  activationPreset?: { type: 'ability' | 'magic'; item: any } | null;
  perTurnUses?: Record<string, number>;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
  spellCooldowns?: Record<string, number>;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
  diceType?: DiceType;
  preselectedItem?: any;
  preselectedType?: string;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
export interface StatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stat: keyof CharacterStats, competences: any[]) => void;
  character: Character | null;
  calculations: any;
}
export interface DamageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'equipment' | 'ability' | 'magic', selection?: any, damageType?: string) => void;
  character: Character | null;
  calculations: any;
}
