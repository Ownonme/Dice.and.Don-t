import { useMemo } from 'react';
import {
  Character,
  CharacterStats,
  EquipmentItem,
  ARMOR_LIMITS,
  WEAPON_LIMITS,
} from '@/types/character';

const EMPTY_ANOMALIES: readonly any[] = [];

// Tabella di lookup per capacità di carico basata su resistenza
const CARRY_CAPACITY_TABLE: { [key: number]: number } = {
  [-3]: 0.5,
  [-2]: 1.2,
  [-1]: 1.8,
  [0]: 2.4,
  [1]: 3.9,
  [2]: 4.5,
  [3]: 4.8,
  [4]: 5.2,
  [5]: 5.7,
  [6]: 6.5,
  [7]: 7.6,
  [8]: 8.2,
  [9]: 9.0,
  [10]: 10.0,
  [11]: 10.8,
  [12]: 11.6,
  [13]: 12.5,
  [14]: 13.8,
  [15]: 15.0,
  [16]: 16.0,
  [17]: 17.0,
  [18]: 18.0,
  [19]: 19.0,
  [20]: 20.0,
  [21]: 22.0,
};

// Funzione per ottenere la capacità di carico basata su resistenza
const getCarryCapacityFromResistance = (resistance: number): number => {
  if (resistance >= 81 && resistance <= 100) return 65;
  if (resistance >= 61 && resistance <= 80) return 58;
  if (resistance >= 51 && resistance <= 60) return 50;
  if (resistance >= 41 && resistance <= 50) return 42;
  if (resistance >= 31 && resistance <= 40) return 35;
  if (resistance >= 21 && resistance <= 30) return 28;
  if (resistance < -3) return 0.5;
  return CARRY_CAPACITY_TABLE[resistance] || 0.5;
};

// Tipi di sovraccarico
export type OverloadLevel = {
  id: string;
  name: string;
  min: number;
  max: number;
};

const OVERLOAD_LEVELS: OverloadLevel[] = [
  { id: 'sov1', name: 'Sovraccarico leggero', min: 0.1, max: 1.2 },
  { id: 'sov2', name: 'Sovraccarico minore', min: 1.3, max: 2.0 },
  { id: 'sov3', name: 'Sovraccarico ridotto', min: 2.1, max: 3.1 },
  { id: 'sov4', name: 'Sovraccarico medio', min: 3.2, max: 4.6 },
  { id: 'sov5', name: 'Sovraccarico superiore', min: 4.7, max: 5.9 },
  { id: 'sov6', name: 'Sovraccarico alto', min: 6.0, max: 7.1 },
  { id: 'sov7', name: 'Sovraccarico eccessivo', min: 7.2, max: 7.5 },
  { id: 'sov8', name: 'Forse hai un pò esagerato eh?', min: 7.6, max: Infinity },
];

const getOverloadLevel = (overloadAmount: number): OverloadLevel | null => {
  if (overloadAmount <= 0) return null;
  return (
    OVERLOAD_LEVELS.find(
      (level) => overloadAmount >= level.min && overloadAmount <= level.max,
    ) || null
  );
};

export const useCharacterCalculations = (character: Character | null) => {
  // Estraggo per evitare ?. nelle deps
  const baseStats = character ? character.baseStats : null;
  const anomalies = character?.anomalies ?? EMPTY_ANOMALIES;
  const equipmentRaw: any = (character as any)?.equipment ?? [];
  // Normalizza l'equipaggiamento in un array iterabile
  const equipment: any[] = Array.isArray(equipmentRaw)
    ? equipmentRaw
    : (() => {
        if (!equipmentRaw) return [];
        // Struttura { weapon, armor }
        if (typeof equipmentRaw === 'object' && (equipmentRaw.weapon || equipmentRaw.armor)) {
          const arr: any[] = [];
          if (equipmentRaw.weapon) arr.push(equipmentRaw.weapon);
          if (equipmentRaw.armor) arr.push(equipmentRaw.armor);
          return arr;
        }
        // Singolo oggetto con type
        if (typeof equipmentRaw === 'object' && (equipmentRaw.type === 'arma' || equipmentRaw.type === 'armatura')) {
          return [equipmentRaw];
        }
        return [];
      })();
  const inventory = character?.inventory ?? [];

  // Calcolo statistiche totali (base + equipaggiamento + anomalie)
  const totalStats = useMemo(() => {
    if (!baseStats) {
      return {
        forza: 0,
        percezione: 0,
        resistenza: 0,
        intelletto: 0,
        agilita: 0,
        sapienza: 0,
        anima: 0,
      } as CharacterStats;
    }

    const total = { ...baseStats };

    // Bonus da equipaggiamento
    for (const item of equipment) {
      if (item.stats) {
        for (const [stat, value] of Object.entries(item.stats)) {
          if (value) total[stat as keyof CharacterStats] += value;
        }
      }
    }

    // Modificatori da anomalie
    for (const anomaly of anomalies) {
      const sm =
        (anomaly as any)?.statsModifier ??
        (anomaly as any)?.stats_modifier ??
        (anomaly as any)?.stats?.stats_modifier ??
        (anomaly as any)?.stats?.statsModifier ??
        null;
      if (sm) {
        for (const [stat, value] of Object.entries(sm)) {
          if (value) total[stat as keyof CharacterStats] += value;
        }
      }
    }

    return total;
  }, [baseStats, equipment, anomalies]);

  // Modificatori 1:1
  const statModifiers = useMemo(() => {
    return Object.entries(totalStats).reduce((acc, [stat, value]) => {
      acc[stat as keyof CharacterStats] = value;
      return acc;
    }, {} as CharacterStats);
  }, [totalStats]);

  // Salute massima
  const maxHealth = useMemo(() => {
    if (!character) return 0;
    const baseHealth = 12;
    const resistanceBonus = totalStats.resistenza * 2;
    const anomalyModifier = anomalies.reduce(
      (sum, a) =>
        sum +
        (Number(
          (a as any)?.healthModifier ??
            (a as any)?.health_modifier ??
            (a as any)?.temp_health ??
            (a as any)?.tempHealth ??
            0,
        ) || 0),
      0,
    );
    return baseHealth + resistanceBonus + anomalyModifier;
  }, [character, totalStats.resistenza, anomalies]);

  // Punti azione massimi
  const maxActionPoints = useMemo(() => {
    if (!character) return 0;
    const baseAP = 12;
    const wisdomBonus = Math.floor(totalStats.sapienza / 2);
    const soulBonus = totalStats.anima;
    const anomalyModifier = anomalies.reduce(
      (sum, a) =>
        sum +
        (Number(
          (a as any)?.actionPointsModifier ??
            (a as any)?.action_points_modifier ??
            (a as any)?.temp_action_points ??
            (a as any)?.tempActionPoints ??
            0,
        ) || 0),
      0,
    );
    return baseAP + wisdomBonus + soulBonus + anomalyModifier;
  }, [character, totalStats.sapienza, totalStats.anima, anomalies]);

  // Peso totale (solo equipaggiamento)
  const totalWeight = useMemo(() => {
    if (!character) return 0;

    const equipmentWeight = equipment.reduce(
      (sum, item) => sum + (item.weight || 0),
      0,
    );

    return equipmentWeight;
  }, [character, equipment]);

  // Capacità di carico (basata su resistenza BASE + anomalie)
  const carryCapacity = useMemo(() => {
    const resistanceWithAnomalies = baseStats?.resistenza ?? 0;
    const anomalyModifier = anomalies.reduce(
      (sum, a) => {
        const sm =
          (a as any)?.statsModifier ??
          (a as any)?.stats_modifier ??
          (a as any)?.stats?.stats_modifier ??
          (a as any)?.stats?.statsModifier ??
          {};
        return sum + (Number((sm as any)?.resistenza ?? 0) || 0);
      },
      0,
    );
    const totalResistance = resistanceWithAnomalies + anomalyModifier;
    return getCarryCapacityFromResistance(totalResistance);
  }, [baseStats?.resistenza, anomalies]);

  // Sovraccarico
  const overloadAmount = useMemo(
    () => Math.max(0, totalWeight - carryCapacity),
    [totalWeight, carryCapacity],
  );

  const isOverloaded = useMemo(
    () => totalWeight > carryCapacity,
    [totalWeight, carryCapacity],
  );

  const overloadLevel = useMemo(
    () => getOverloadLevel(overloadAmount),
    [overloadAmount],
  );

  const carryStatus = useMemo(() => {
    if (!isOverloaded) return 'Carico adeguato';
    return overloadLevel?.name || 'Sovraccarico sconosciuto';
  }, [isOverloaded, overloadLevel]);

  // Armatura totale
  const totalArmor = useMemo(() => {
    if (!character) return 0;
    const equipmentArmor = equipment
      .filter((item) => item.armor)
      .reduce((sum, item) => sum + (item.armor || 0), 0);
    const anomalyArmor = anomalies.reduce((sum, a) => {
      return (
        sum +
        (Number(
          (a as any)?.armorModifier ??
            (a as any)?.armor_modifier ??
            (a as any)?.temp_armour ??
            (a as any)?.tempArmour ??
            0,
        ) || 0)
      );
    }, 0);
    return Math.max(0, (character.baseArmor || 0) + equipmentArmor + anomalyArmor);
  }, [character, equipment, anomalies]);

  // Controllo limiti equipaggiamento
  const canEquipItem = (item: EquipmentItem) => {
    if (!character) return false;

    const isEditing = equipment.some((eq) => eq.id === item.id);

    if (item.type === 'armatura') {
      const currentCount = equipment.filter(
        (eq) => eq.type === 'armatura' && eq.subtype === item.subtype,
      ).length;
      const effectiveCount = isEditing ? currentCount - 1 : currentCount;
      return effectiveCount < (ARMOR_LIMITS[item.subtype] || 0);
    }

    if (item.type === 'arma') {
      if (item.subtype === 'una_mano') {
        const oneHandCount = equipment.filter(
          (eq) => eq.type === 'arma' && eq.subtype === 'una_mano',
        ).length;
        const twoHandCount = equipment.filter(
          (eq) => eq.type === 'arma' && eq.subtype === 'due_mani',
        ).length;
        const effectiveOneHandCount = isEditing ? oneHandCount - 1 : oneHandCount;
        return effectiveOneHandCount < 2 && twoHandCount === 0;
      }

      if (item.subtype === 'due_mani') {
        const oneHandCount = equipment.filter(
          (eq) => eq.type === 'arma' && eq.subtype === 'una_mano',
        ).length;
        const twoHandCount = equipment.filter(
          (eq) => eq.type === 'arma' && eq.subtype === 'due_mani',
        ).length;
        const effectiveTwoHandCount = isEditing ? twoHandCount - 1 : twoHandCount;
        return oneHandCount === 0 && effectiveTwoHandCount === 0;
      }

      const currentCount = equipment.filter(
        (eq) => eq.type === 'arma' && eq.subtype === item.subtype,
      ).length;
      const effectiveCount = isEditing ? currentCount - 1 : currentCount;
      return effectiveCount < (WEAPON_LIMITS[item.subtype] || 0);
    }

    return false;
  };

  // Danni prima arma
  const firstWeaponDamage = useMemo(() => {
    const weapons = equipment.filter((item) => item.type === 'arma');
    if (weapons.length === 0) return null;
    const firstWeapon = weapons[0];
    return {
      name: firstWeapon.name,
      damageVeloce: firstWeapon.damageVeloce || 0,
      damagePesante: firstWeapon.damagePesante || 0,
      damageAffondo: firstWeapon.damageAffondo || 0,
      calculatedDamageVeloce: firstWeapon.calculatedDamageVeloce || 0,
      calculatedDamagePesante: firstWeapon.calculatedDamagePesante || 0,
      calculatedDamageAffondo: firstWeapon.calculatedDamageAffondo || 0,
    };
  }, [equipment]);

  // Danni altre armi
  const otherWeaponsDamage = useMemo(() => {
    const weapons = equipment.filter((item) => item.type === 'arma');
    if (weapons.length <= 1) return [];
    return weapons.slice(1).map((weapon) => ({
      name: weapon.name,
      damageVeloce: weapon.damageVeloce || 0,
      damagePesante: weapon.damagePesante || 0,
      damageAffondo: weapon.damageAffondo || 0,
      calculatedDamageVeloce: weapon.calculatedDamageVeloce || 0,
      calculatedDamagePesante: weapon.calculatedDamagePesante || 0,
      calculatedDamageAffondo: weapon.calculatedDamageAffondo || 0,
    }));
  }, [equipment]);

  return {
    totalStats,
    statModifiers,
    maxHealth,
    maxActionPoints,
    totalWeight,
    carryCapacity,
    isOverloaded,
    overloadAmount,
    overloadLevel,
    carryStatus,
    totalArmor,
    canEquipItem,
    firstWeaponDamage,
    otherWeaponsDamage,
  };
};
