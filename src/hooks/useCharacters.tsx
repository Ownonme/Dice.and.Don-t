import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Character, StatusAnomaly } from '@/types/character';
import { isLocalDb } from '@/integrations/localdb';
import * as LocalChars from '@/integrations/localdb/characters';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { isAllZeroStats, pruneEmptyFields, readSpecificCatalog } from '@/lib/utils';

const normalizeAlwaysActiveAnomalies = (character: Character): Character => {
  const listBase = Array.isArray((character as any)?.anomalies) ? ((character as any).anomalies as StatusAnomaly[]) : [];

  const toNumber = (value: any) => {
    if (typeof value === 'number') return value;
    const s = String(value ?? '').trim().replace(',', '.');
    const m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  };

  const getClassicSpecificValues = (key: string) => {
    if (key === 'hp') {
      const current = toNumber((character as any)?.currentHealth ?? (character as any)?.health?.current ?? (character as any)?.health ?? 0);
      const max = toNumber((character as any)?.maxHealth ?? (character as any)?.health?.max ?? (character as any)?.health ?? 0);
      return { current, max };
    }
    if (key === 'pa') {
      const current = toNumber((character as any)?.currentActionPoints ?? (character as any)?.actionPoints?.current ?? (character as any)?.actionPoints ?? 0);
      const max = toNumber((character as any)?.maxActionPoints ?? (character as any)?.actionPoints?.max ?? (character as any)?.actionPoints ?? 0);
      return { current, max };
    }
    if (key === 'armor') {
      const current = toNumber((character as any)?.currentArmor ?? (character as any)?.armor ?? (character as any)?.baseArmor ?? 0);
      const max = toNumber((character as any)?.baseArmor ?? (character as any)?.armor ?? (character as any)?.currentArmor ?? 0);
      return { current, max };
    }
    const stats = (character as any)?.baseStats ?? {};
    const current = toNumber(stats?.[key] ?? (character as any)?.[key] ?? 0);
    return { current, max: current };
  };

  const getCustomSpecificValues = (spec: any) => {
    const list = Array.isArray((character as any)?.specifics) ? ((character as any).specifics as any[]) : [];
    const specId = String(spec?.id ?? '').trim();
    const specKey = String(spec?.key ?? '').trim();
    const specName = String(spec?.name ?? '').trim();
    const found =
      list.find((s: any) => String(s?.id ?? '') === specId) ??
      list.find((s: any) => String(s?.id ?? '') === specKey) ??
      list.find((s: any) => String(s?.name ?? '') === specName) ??
      null;
    return {
      current: toNumber(found?.current ?? 0),
      max: toNumber(found?.max ?? 0),
    };
  };

  const getSpecificValues = (spec: any) => {
    const rawId = String(spec?.id ?? '').trim();
    const rawKey = String(spec?.key ?? '').trim();
    const kind = spec?.kind === 'classic' || rawId.startsWith('classic:') ? 'classic' : 'custom';
    if (kind === 'classic') {
      const key = rawKey || rawId.replace(/^classic:/, '');
      return getClassicSpecificValues(key);
    }
    return getCustomSpecificValues(spec);
  };

  const meetsPassiveConditions = (levelObj: any) => {
    const typesRaw = Array.isArray((levelObj as any)?.passive_condition_types)
      ? (levelObj as any).passive_condition_types
      : Array.isArray((levelObj as any)?.passiveConditionTypes)
        ? (levelObj as any).passiveConditionTypes
        : [];
    const specificsRaw = Array.isArray((levelObj as any)?.passive_specific_conditions)
      ? (levelObj as any).passive_specific_conditions
      : Array.isArray((levelObj as any)?.passiveSpecificConditions)
        ? (levelObj as any).passiveSpecificConditions
        : [];
    const types = (Array.isArray(typesRaw) ? typesRaw : [])
      .map((t: any) => String(t ?? '').trim())
      .filter(Boolean);
    const specifics = (Array.isArray(specificsRaw) ? specificsRaw : [])
      .filter((s: any) => ((s?.id ?? '').toString().trim().length > 0) || ((s?.name ?? '').toString().trim().length > 0) || ((s?.key ?? '').toString().trim().length > 0));
    if (types.length === 0 || specifics.length === 0) return true;

    return specifics.every((spec: any) => {
      const { current, max } = getSpecificValues(spec);
      const percent = max > 0 ? (current / max) * 100 : 0;
      const minPercent = toNumber(spec?.min_percent ?? spec?.minPercent ?? 0);
      const maxPercent = toNumber(spec?.max_percent ?? spec?.maxPercent ?? 0);
      const minValue = toNumber(spec?.min_value ?? spec?.minValue ?? 0);
      const maxValue = toNumber(spec?.max_value ?? spec?.maxValue ?? 0);
      return types.every((type) => {
        if (type === 'specific_percent_lt') return percent <= maxPercent;
        if (type === 'specific_percent_gt') return percent >= minPercent;
        if (type === 'specific_value_lt') return current <= maxValue;
        if (type === 'specific_value_gt') return current >= minValue;
        return true;
      });
    });
  };

  const buildFromItem = (sourceType: 'spell' | 'ability', item: any): StatusAnomaly[] => {
    const sourceId = String(item?.id ?? item?.name ?? '').trim();
    if (!sourceId) return [];

    const levelNum = Number(item?.current_level ?? item?.currentLevel ?? item?.level ?? 1) || 1;
    const levels = Array.isArray(item?.levels) ? item.levels : [];
    const levelObj = levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || item || {};
    if (!meetsPassiveConditions(levelObj)) return [];
    const passive = Array.isArray((levelObj as any)?.passive_anomalies) ? (levelObj as any).passive_anomalies : [];

    const out: StatusAnomaly[] = [];
    for (let i = 0; i < passive.length; i++) {
      const a = passive[i] || {};
      const alwaysActive = !!(a?.alwaysActive ?? a?.always_active);
      if (!alwaysActive) continue;

      const id = `passive:${sourceType}:${sourceId}:${levelNum}:${i}`;
      const name = String(a?.name ?? 'Anomalia').trim() || 'Anomalia';
      const description = String(a?.description ?? '');
      const statsModifier = (typeof a?.statsModifier === 'object' && a?.statsModifier) ? a.statsModifier : {};
      const actionPointsModifier = Number(a?.actionPointsModifier ?? 0) || 0;
      const healthModifier = Number(a?.healthModifier ?? 0) || 0;
      const armorModifier = Number(a?.armorModifier ?? (a as any)?.armor_modifier ?? (a as any)?.temp_armour ?? (a as any)?.tempArmour ?? 0) || 0;

      const doesDamage = !!(a?.doesDamage ?? a?.does_damage);
      const damagePerTurn = Number(a?.damagePerTurn ?? a?.damage_per_turn ?? 0) || 0;
      const damageEffectId = a?.damageEffectId ?? a?.damage_effect_id ?? null;
      const damageEffectName = String(a?.damageEffectName ?? a?.damage_effect_name ?? '');

      const damageBonusEnabled = a?.damageBonusEnabled ?? a?.damage_bonus_enabled;
      const damageBonus = a?.damageBonus ?? a?.damage_bonus;
      const paDiscountEnabled = a?.paDiscountEnabled ?? a?.pa_discount_enabled;
      const paDiscount = a?.paDiscount ?? a?.pa_discount;
      const damageReductionEnabled = a?.damageReductionEnabled ?? a?.damage_reduction_enabled;
      const damageReduction = a?.damageReduction ?? a?.damage_reduction;
      const weaknessEnabled = a?.weaknessEnabled ?? a?.weakness_enabled;
      const weakness = a?.weakness ?? a?.weakness_config;

      const next: StatusAnomaly = {
        id,
        name,
        description,
        statsModifier,
        actionPointsModifier,
        healthModifier,
        armorModifier,
        alwaysActive: true,
        sourceType,
        sourceId,
        ...(doesDamage && damageEffectId ? {
          damageSets: [{ damageEffectId: String(damageEffectId), effectName: damageEffectName, guaranteedDamage: damagePerTurn, additionalDamage: 0 }],
        } : {}),
        ...(damageBonusEnabled != null ? { damageBonusEnabled: !!damageBonusEnabled } : {}),
        ...(damageBonus ? { damageBonus } : {}),
        ...(paDiscountEnabled != null ? { paDiscountEnabled: !!paDiscountEnabled } : {}),
        ...(paDiscount ? { paDiscount } : {}),
        ...(damageReductionEnabled != null ? { damageReductionEnabled: !!damageReductionEnabled } : {}),
        ...(damageReduction ? { damageReduction } : {}),
        ...(weaknessEnabled != null ? { weaknessEnabled: !!weaknessEnabled } : {}),
        ...(weakness ? { weakness } : {}),
      };
      out.push(next);
    }
    return out;
  };

  const spells = Array.isArray((character as any)?.custom_spells) ? (character as any).custom_spells : [];
  const abilities = Array.isArray((character as any)?.custom_abilities) ? (character as any).custom_abilities : [];
  const derived: StatusAnomaly[] = [
    ...spells.flatMap((s: any) => buildFromItem('spell', s)),
    ...abilities.flatMap((a: any) => buildFromItem('ability', a)),
  ];

  const kept = listBase.filter((a) => {
    if (!(a as any)?.alwaysActive) return true;
    const st = (a as any)?.sourceType;
    const sid = String((a as any)?.id ?? '');
    if (st !== 'spell' && st !== 'ability') return true;
    return !sid.startsWith('passive:');
  });

  const nextList = [...kept];
  const existingIds = new Set(nextList.map((a) => String((a as any)?.id ?? '')));
  for (const d of derived) {
    const did = String((d as any)?.id ?? '');
    if (!did || existingIds.has(did)) continue;
    existingIds.add(did);
    nextList.push(d);
  }

  const catalog = readSpecificCatalog();
  const catalogById = new Map(catalog.map((c: any) => [String(c?.id ?? ''), c]));
  const normalizeType = (v: any) => String(v ?? '').trim().toLowerCase();
  const resolveLevel = (item: any) => {
    const levelNum = Number(item?.current_level ?? item?.currentLevel ?? item?.level ?? 1) || 1;
    const levels = Array.isArray(item?.levels) ? item.levels : [];
    return levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || item || {};
  };
  const requiredMap = new Map<string, { id: string; name: string; max: number; color?: string }>();
  const addRequired = (spec: any) => {
    const id = String(spec?.id ?? '').trim();
    const name = String(spec?.name ?? '').trim();
    const key = id || name;
    if (!key) return;
    const maxVal = toNumber(spec?.max ?? spec?.value ?? 0);
    if (maxVal <= 0) return;
    const fromCatalog = id ? catalogById.get(id) : catalog.find((c: any) => String(c?.name ?? '').trim() === name);
    const prev = requiredMap.get(key);
    const nextMax = Math.max(prev?.max ?? 0, maxVal);
    requiredMap.set(key, { id: id || (fromCatalog?.id ?? ''), name: name || (fromCatalog?.name ?? ''), max: nextMax, color: fromCatalog?.color });
  };
  spells.forEach((spell: any) => {
    const t = normalizeType(spell?.type ?? (spell as any)?.spell_type);
    if (t !== 'passiva') return;
    const lvl = resolveLevel(spell);
    const list = Array.isArray((lvl as any)?.passive_custom_specifics)
      ? (lvl as any).passive_custom_specifics
      : Array.isArray((spell as any)?.passive_custom_specifics)
        ? (spell as any).passive_custom_specifics
        : [];
    list.forEach(addRequired);
  });
  abilities.forEach((ability: any) => {
    const t = normalizeType(ability?.type ?? (ability as any)?.ability_type);
    if (t !== 'passiva') return;
    const lvl = resolveLevel(ability);
    const list = Array.isArray((lvl as any)?.passive_custom_specifics)
      ? (lvl as any).passive_custom_specifics
      : Array.isArray((ability as any)?.passive_custom_specifics)
        ? (ability as any).passive_custom_specifics
        : [];
    list.forEach(addRequired);
  });
  const currentSpecifics = Array.isArray((character as any)?.specifics) ? ((character as any).specifics as any[]) : [];
  const keyOfSpecific = (spec: any) => {
    const id = String(spec?.id ?? '').trim();
    const name = String(spec?.name ?? '').trim();
    return id || name;
  };
  const requiredKeys = new Set(Array.from(requiredMap.keys()));
  const nextSpecifics = currentSpecifics
    .filter((s: any) => {
      if (!s?.auto) return true;
      const key = keyOfSpecific(s);
      return key ? requiredKeys.has(key) : false;
    })
    .map((s: any) => {
      const baseMax = toNumber(s?.base_max ?? s?.baseMax ?? s?.max ?? 0);
      const current = toNumber(s?.current ?? 0);
      return { ...s, base_max: baseMax, max: baseMax, current, bonus_max: undefined };
    });
  const findSpecificIndex = (spec: { id?: string; name?: string }) =>
    nextSpecifics.findIndex((s: any) => keyOfSpecific(s) === keyOfSpecific(spec));
  requiredMap.forEach((spec) => {
    const idx = findSpecificIndex(spec);
    if (idx >= 0) {
      const existing = nextSpecifics[idx];
      const baseMax = Math.max(toNumber(existing?.base_max ?? existing?.max ?? 0), spec.max);
      nextSpecifics[idx] = { ...existing, id: spec.id || existing?.id, name: spec.name || existing?.name, base_max: baseMax, max: baseMax, color: existing?.color ?? spec.color, auto: true };
    } else {
      nextSpecifics.push({ id: spec.id, name: spec.name || 'Specifica', base_max: spec.max, max: spec.max, current: 0, color: spec.color, auto: true });
    }
  });
  const equipmentList = Array.isArray((character as any)?.equipment)
    ? ((character as any).equipment as any[])
    : Object.values((character as any)?.equipment || {}).filter(Boolean) as any[];
  const equipmentBonusMap = new Map<string, { id: string; name: string; bonus: number; color?: string }>();
  const addEquipmentSpecific = (spec: any) => {
    const id = String(spec?.id ?? '').trim();
    const name = String(spec?.name ?? '').trim();
    const key = id || name;
    if (!key) return;
    const bonus = toNumber(spec?.max ?? spec?.value ?? 0);
    if (bonus <= 0) return;
    const fromCatalog = id ? catalogById.get(id) : catalog.find((c: any) => String(c?.name ?? '').trim() === name);
    const prev = equipmentBonusMap.get(key);
    equipmentBonusMap.set(key, {
      id: id || (fromCatalog?.id ?? ''),
      name: name || (fromCatalog?.name ?? ''),
      bonus: (prev?.bonus ?? 0) + bonus,
      color: fromCatalog?.color ?? prev?.color,
    });
  };
  equipmentList.forEach((item: any) => {
    const list = Array.isArray(item?.custom_specifics)
      ? item.custom_specifics
      : Array.isArray(item?.customSpecifics)
        ? item.customSpecifics
        : Array.isArray(item?.data?.custom_specifics)
          ? item.data.custom_specifics
          : [];
    list.forEach(addEquipmentSpecific);
  });
  equipmentBonusMap.forEach((spec) => {
    const idx = findSpecificIndex(spec);
    if (idx >= 0) {
      const existing = nextSpecifics[idx];
      const baseMax = toNumber(existing?.base_max ?? existing?.max ?? 0);
      const totalMax = baseMax + spec.bonus;
      const current = Math.min(toNumber(existing?.current ?? 0), totalMax);
      nextSpecifics[idx] = { ...existing, id: spec.id || existing?.id, name: spec.name || existing?.name, base_max: baseMax, bonus_max: spec.bonus, max: totalMax, current, color: existing?.color ?? spec.color };
    } else {
      nextSpecifics.push({ id: spec.id, name: spec.name || 'Specifica', base_max: 0, bonus_max: spec.bonus, max: spec.bonus, current: 0, color: spec.color });
    }
  });

  return { ...(character as any), anomalies: nextList, specifics: nextSpecifics } as Character;
};

const hydrateDamageBonusEffectNames = async (characters: Character[]) => {
  const norm = (v: any) => String(v ?? '').trim();
  const all = Array.isArray(characters) ? characters : [];

  const idsSet = new Set<string>();
  const collectIds = (def: any) => {
    if (!def) return;
    const isSpecific = !!(def?.isSpecific ?? def?.is_specific);
    if (!isSpecific) return;
    const names: string[] = Array.isArray(def?.damageEffectNames)
      ? def.damageEffectNames.map(norm).filter(Boolean)
      : Array.isArray(def?.damage_effect_names)
        ? def.damage_effect_names.map(norm).filter(Boolean)
        : [];
    if (names.length > 0) return;
    const ids: string[] = Array.isArray(def?.damageEffectIds)
      ? def.damageEffectIds.map(norm).filter(Boolean)
      : Array.isArray(def?.damage_effect_ids)
        ? def.damage_effect_ids.map(norm).filter(Boolean)
        : [];
    ids.forEach((id) => idsSet.add(id));
  };
  for (const ch of all) {
    const anomalies = Array.isArray((ch as any)?.anomalies) ? ((ch as any).anomalies as any[]) : [];
    for (const a of anomalies) {
      const bonusDef =
        (a as any)?.damageBonus ??
        (a as any)?.damage_bonus ??
        (a as any)?.stats?.damageBonus ??
        (a as any)?.stats?.damage_bonus;
      const reductionDef =
        (a as any)?.damageReduction ??
        (a as any)?.damage_reduction ??
        (a as any)?.stats?.damageReduction ??
        (a as any)?.stats?.damage_reduction;
      const weaknessDef =
        (a as any)?.weakness ??
        (a as any)?.weakness_config ??
        (a as any)?.stats?.weakness ??
        (a as any)?.stats?.weakness_config;
      collectIds(bonusDef);
      collectIds(reductionDef);
      collectIds(weaknessDef);
    }
  }

  const ids = Array.from(idsSet);
  if (ids.length === 0) return all;

  const { data } = await supabase
    .from('damage_effects')
    .select('id, name')
    .in('id', ids);
  const idToName: Record<string, string> = {};
  (data || []).forEach((r: any) => {
    const id = norm(r?.id);
    const name = norm(r?.name);
    if (id && name) idToName[id] = name;
  });

  const hydrateDefNames = (defOriginal: any) => {
    if (!defOriginal) return defOriginal;
    const isSpecific = !!(defOriginal?.isSpecific ?? defOriginal?.is_specific);
    if (!isSpecific) return defOriginal;

    const names: string[] = Array.isArray(defOriginal?.damageEffectNames)
      ? defOriginal.damageEffectNames.map(norm).filter(Boolean)
      : Array.isArray(defOriginal?.damage_effect_names)
        ? defOriginal.damage_effect_names.map(norm).filter(Boolean)
        : [];
    if (names.length > 0) return defOriginal;

    const ids: string[] = Array.isArray(defOriginal?.damageEffectIds)
      ? defOriginal.damageEffectIds.map(norm).filter(Boolean)
      : Array.isArray(defOriginal?.damage_effect_ids)
        ? defOriginal.damage_effect_ids.map(norm).filter(Boolean)
        : [];
    const resolved = ids.map((id) => idToName[id]).filter(Boolean);
    if (resolved.length === 0) return defOriginal;

    return { ...(defOriginal as any), damageEffectNames: resolved };
  };

  const hydrateAnomaly = (a: any) => {
    const bonusDefOriginal =
      (a as any)?.damageBonus ??
      (a as any)?.damage_bonus ??
      (a as any)?.stats?.damageBonus ??
      (a as any)?.stats?.damage_bonus;
    const reductionDefOriginal =
      (a as any)?.damageReduction ??
      (a as any)?.damage_reduction ??
      (a as any)?.stats?.damageReduction ??
      (a as any)?.stats?.damage_reduction;
    const weaknessDefOriginal =
      (a as any)?.weakness ??
      (a as any)?.weakness_config ??
      (a as any)?.stats?.weakness ??
      (a as any)?.stats?.weakness_config;

    const nextBonusDef = hydrateDefNames(bonusDefOriginal);
    const nextReductionDef = hydrateDefNames(reductionDefOriginal);
    const nextWeaknessDef = hydrateDefNames(weaknessDefOriginal);

    const changed =
      nextBonusDef !== bonusDefOriginal ||
      nextReductionDef !== reductionDefOriginal ||
      nextWeaknessDef !== weaknessDefOriginal;
    if (!changed) return a;

    const nextStats = (a as any)?.stats
      ? {
          ...(a as any).stats,
          ...(typeof (a as any).stats?.damageBonus === 'object' || typeof (a as any).stats?.damage_bonus === 'object'
            ? { damageBonus: nextBonusDef, damage_bonus: nextBonusDef }
            : {}),
          ...(typeof (a as any).stats?.damageReduction === 'object' || typeof (a as any).stats?.damage_reduction === 'object'
            ? { damageReduction: nextReductionDef, damage_reduction: nextReductionDef }
            : {}),
          ...(typeof (a as any).stats?.weakness === 'object' || typeof (a as any).stats?.weakness_config === 'object'
            ? { weakness: nextWeaknessDef, weakness_config: nextWeaknessDef }
            : {}),
        }
      : (a as any)?.stats;

    return {
      ...(a as any),
      ...(nextBonusDef !== bonusDefOriginal ? { damageBonus: nextBonusDef } : {}),
      ...((a as any)?.damage_bonus ? (nextBonusDef !== bonusDefOriginal ? { damage_bonus: nextBonusDef } : {}) : {}),
      ...(nextReductionDef !== reductionDefOriginal ? { damageReduction: nextReductionDef } : {}),
      ...((a as any)?.damage_reduction ? (nextReductionDef !== reductionDefOriginal ? { damage_reduction: nextReductionDef } : {}) : {}),
      ...(nextWeaknessDef !== weaknessDefOriginal ? { weakness: nextWeaknessDef } : {}),
      ...((a as any)?.weakness_config ? (nextWeaknessDef !== weaknessDefOriginal ? { weakness_config: nextWeaknessDef } : {}) : {}),
      ...(nextStats ? { stats: nextStats } : {}),
    };
  };

  return all.map((ch) => {
    const anomalies = Array.isArray((ch as any)?.anomalies) ? ((ch as any).anomalies as any[]) : [];
    if (anomalies.length === 0) return ch;
    let changed = false;
    const nextAnomalies = anomalies.map((a) => {
      const nextA = hydrateAnomaly(a);
      if (nextA !== a) changed = true;
      return nextA;
    });
    return changed ? ({ ...(ch as any), anomalies: nextAnomalies } as Character) : ch;
  });
};

const getRefLevel = (item: any): number => {
  return Number(item?.current_level ?? item?.currentLevel ?? item?.level ?? 1) || 1;
};

const isEquipmentDerivedPower = (it: any): boolean => {
  return (it as any)?.sourceType === 'equipment' || String((it as any)?.id ?? '').startsWith('equip:');
};

const isCompactRef = (item: any): boolean => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const id = String((item as any)?.id ?? '').trim();
  if (!id) return false;
  const hasLevels = Array.isArray((item as any)?.levels) && (item as any).levels.length > 0;
  const hasLevelRef =
    Object.prototype.hasOwnProperty.call(item as any, 'current_level') ||
    Object.prototype.hasOwnProperty.call(item as any, 'currentLevel') ||
    Object.prototype.hasOwnProperty.call(item as any, 'level');
  return !hasLevels && hasLevelRef;
};

const compactSpellOrAbility = (item: any) => {
  if (isEquipmentDerivedPower(item)) return item;
  if (isCompactRef(item)) return item;
  if (Array.isArray(item?.levels) && item.levels.length > 0) return item;
  const id = String(item?.spell_id ?? item?.ability_id ?? item?.id ?? '').trim();
  if (!id) return item;
  const current_level = getRefLevel(item);
  const name = String(item?.name ?? '').trim();
  return name ? { id, name, current_level } : { id, current_level };
};

const compactUnlockedPowers = (unlocked: any) => {
  if (!unlocked || typeof unlocked !== 'object' || Array.isArray(unlocked)) return unlocked;

  const abilitiesIn = Array.isArray((unlocked as any).abilities) ? (unlocked as any).abilities : [];
  const spellsIn = Array.isArray((unlocked as any).spells) ? (unlocked as any).spells : [];

  const abilities = abilitiesIn
    .map((row: any) => {
      const level = Number(row?.level ?? 1) || 1;
      const abilityObj = row?.ability;
      const ability_id = String(row?.ability_id ?? abilityObj?.id ?? '').trim();
      if (!ability_id) return null;
      const name = String(row?.name ?? abilityObj?.name ?? '').trim();
      return { name: name || undefined, ability_id, level };
    })
    .filter(Boolean);

  const spells = spellsIn
    .map((row: any) => {
      const level = Number(row?.level ?? 1) || 1;
      const spellObj = row?.spell;
      const spell_id = String(row?.spell_id ?? spellObj?.id ?? '').trim();
      if (!spell_id) return null;
      const name = String(row?.name ?? spellObj?.name ?? '').trim();
      return { name: name || undefined, spell_id, level };
    })
    .filter(Boolean);

  const out: any = {};
  if (abilities.length > 0) out.abilities = abilities;
  if (spells.length > 0) out.spells = spells;
  return Object.keys(out).length > 0 ? out : undefined;
};

export const compactCharacterForStorage = (character: any) => {
  if (!character || typeof character !== 'object') return character;

  const spells = Array.isArray(character.custom_spells) ? character.custom_spells : [];
  const abilities = Array.isArray(character.custom_abilities) ? character.custom_abilities : [];
  const baseSpells = spells.filter((s: any) => !isEquipmentDerivedPower(s));
  const baseAbilities = abilities.filter((a: any) => !isEquipmentDerivedPower(a));

  const derivedPostureId =
    character.selectedPostureId ??
    (baseAbilities.find((a: any) => !!(a?.is_active ?? a?.isActive))?.ability_id ?? baseAbilities.find((a: any) => !!(a?.is_active ?? a?.isActive))?.id ?? null);

  const nextSelectedPostureId = derivedPostureId ? String(derivedPostureId) : null;

  const nextSpells = baseSpells.map(compactSpellOrAbility);
  const nextAbilities = baseAbilities.map(compactSpellOrAbility);

  const equipmentIn = Array.isArray((character as any).equipment) ? (character as any).equipment : [];
  let equipmentChanged = false;
  const compactEquipmentItem = (eq: any) => {
    if (!eq || typeof eq !== 'object' || Array.isArray(eq)) return eq;
    let changedEq = false;
    const nextEq: any = { ...(eq as any) };

    const unlockedBefore = (eq as any)?.unlockedPowers;
    const unlockedAfter = compactUnlockedPowers(unlockedBefore);
    if (unlockedAfter !== unlockedBefore) {
      changedEq = true;
      if (unlockedAfter) nextEq.unlockedPowers = unlockedAfter;
      else delete nextEq.unlockedPowers;
    }

    if (typeof nextEq.description === 'string' && nextEq.description.trim().length === 0) {
      delete nextEq.description;
      changedEq = true;
    }

    if (Number(nextEq.weight ?? 0) === 0) {
      delete nextEq.weight;
      changedEq = true;
    }

    if (Number(nextEq.armor ?? 0) === 0) {
      delete nextEq.armor;
      changedEq = true;
    }

    if (Number(nextEq.damage ?? 0) === 0) {
      delete nextEq.damage;
      changedEq = true;
    }

    if (Number(nextEq.damageVeloce ?? 0) === 0) {
      delete nextEq.damageVeloce;
      changedEq = true;
    }
    if (Number(nextEq.damagePesante ?? 0) === 0) {
      delete nextEq.damagePesante;
      changedEq = true;
    }
    if (Number(nextEq.damageAffondo ?? 0) === 0) {
      delete nextEq.damageAffondo;
      changedEq = true;
    }

    if (Number(nextEq.calculatedDamageVeloce ?? 0) === 0) {
      delete nextEq.calculatedDamageVeloce;
      changedEq = true;
    }
    if (Number(nextEq.calculatedDamagePesante ?? 0) === 0) {
      delete nextEq.calculatedDamagePesante;
      changedEq = true;
    }
    if (Number(nextEq.calculatedDamageAffondo ?? 0) === 0) {
      delete nextEq.calculatedDamageAffondo;
      changedEq = true;
    }

    if (nextEq.stats && isAllZeroStats(nextEq.stats)) {
      delete nextEq.stats;
      changedEq = true;
    }

    if (Array.isArray(nextEq.statusAnomalies) && nextEq.statusAnomalies.length === 0) {
      delete nextEq.statusAnomalies;
      changedEq = true;
    }

    const prunedData = pruneEmptyFields(nextEq.data);
    if (prunedData === undefined) {
      if (Object.prototype.hasOwnProperty.call(nextEq, 'data')) {
        delete nextEq.data;
        changedEq = true;
      }
    } else if (prunedData !== nextEq.data) {
      nextEq.data = prunedData;
      changedEq = true;
    }

    if (!changedEq) return eq;
    equipmentChanged = true;
    return nextEq;
  };

  const nextEquipment = equipmentIn.map(compactEquipmentItem);

  const inventoryIn = Array.isArray((character as any).inventory) ? (character as any).inventory : [];
  let inventoryChanged = false;
  const compactInventoryItem = (inv: any) => {
    if (!inv || typeof inv !== 'object' || Array.isArray(inv)) return inv;
    let changedInv = false;
    const nextInv: any = { ...(inv as any) };

    if (typeof nextInv.description === 'string' && nextInv.description.trim().length === 0) {
      delete nextInv.description;
      changedInv = true;
    }

    if (Number(nextInv.weight ?? 0) === 0) {
      delete nextInv.weight;
      changedInv = true;
    }

    if (nextInv.equipmentData && typeof nextInv.equipmentData === 'object' && !Array.isArray(nextInv.equipmentData)) {
      const compacted = compactEquipmentItem(nextInv.equipmentData);
      if (compacted !== nextInv.equipmentData) {
        nextInv.equipmentData = compacted;
        changedInv = true;
      }
      const prunedEq = pruneEmptyFields(nextInv.equipmentData);
      if (prunedEq === undefined) {
        delete nextInv.equipmentData;
        changedInv = true;
      } else if (prunedEq !== nextInv.equipmentData) {
        nextInv.equipmentData = prunedEq;
        changedInv = true;
      }
    }

    if (!changedInv) return inv;
    inventoryChanged = true;
    return nextInv;
  };

  const nextInventory = inventoryIn.map(compactInventoryItem);

  const isEmptyObject = (v: any): boolean => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    return Object.keys(v).length === 0;
  };

  const isRedundantMagic = (magic: any): boolean => {
    if (magic == null) return true;
    if (typeof magic !== 'object' || Array.isArray(magic)) return false;

    const sectionKeys = new Set([
      'distruzione',
      'illusione',
      'evocazione',
      'supporto',
      'alterazione',
      'alchimia',
      'divinazione',
      'trasmutazione',
      'occulto',
      'arcano',
      'speciale',
    ]);

    for (const [k, v] of Object.entries(magic)) {
      if (sectionKeys.has(k)) {
        if (v == null) continue;
        if (typeof v !== 'object' || Array.isArray(v)) return false;
        if (!isEmptyObject(v)) return false;
        continue;
      }
      if (typeof v === 'number') {
        if (Number(v) !== 0) return false;
        continue;
      }
      if (typeof v === 'string') {
        if (String(v).trim().length > 0) return false;
        continue;
      }
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) {
          if (v.length > 0) return false;
        } else if (Object.keys(v).length > 0) {
          return false;
        }
      }
    }

    return true;
  };

  const isRedundantSkills = (skills: any): boolean => {
    if (skills == null) return true;
    if (typeof skills !== 'object' || Array.isArray(skills)) return false;

    let leafCount = 0;
    const stack: any[] = [skills];
    while (stack.length > 0) {
      const cur = stack.pop();
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) continue;

      const hasValue = Object.prototype.hasOwnProperty.call(cur, 'value');
      const hasSkillsArr = Object.prototype.hasOwnProperty.call(cur, 'skills');
      if (hasValue && hasSkillsArr) {
        leafCount++;
        const v = Number((cur as any).value ?? 0) || 0;
        const arr = Array.isArray((cur as any).skills) ? (cur as any).skills : [];
        if (v !== 0) return false;
        if (arr.length > 0) return false;
        continue;
      }

      for (const v of Object.values(cur)) {
        if (v && typeof v === 'object') stack.push(v);
      }
    }

    return leafCount > 0;
  };

  const shouldDropSkills = isRedundantSkills((character as any).skills);
  const shouldDropMagic = isRedundantMagic((character as any).magic);
  const shouldDropEvocations = Array.isArray((character as any).evocations) && (character as any).evocations.length === 0;

  const changed =
    nextSelectedPostureId !== (character.selectedPostureId ?? null) ||
    nextSpells !== spells ||
    nextAbilities !== abilities ||
    baseSpells.length !== spells.length ||
    baseAbilities.length !== abilities.length ||
    equipmentChanged ||
    inventoryChanged ||
    shouldDropSkills ||
    shouldDropMagic ||
    shouldDropEvocations;

  if (!changed) return character;

  const out: any = {
    ...(character as any),
    selectedPostureId: nextSelectedPostureId,
    custom_spells: nextSpells,
    custom_abilities: nextAbilities,
    ...(equipmentChanged ? { equipment: nextEquipment } : {}),
    ...(inventoryChanged ? { inventory: nextInventory } : {}),
  };

  if (shouldDropSkills) delete out.skills;
  if (shouldDropMagic) delete out.magic;
  if (shouldDropEvocations) delete out.evocations;

  return out;
};

const hydrateSpellAndAbilityRefs = async (characters: any[]) => {
  const list = Array.isArray(characters) ? characters : [];
  const spellIdsSet = new Set<string>();
  const abilityIdsSet = new Set<string>();

  const recoverBaseId = (id: string): string | null => {
    const m = String(id ?? '').trim().match(/^(.+)_\d{10,}$/);
    return m?.[1] ? String(m[1]).trim() : null;
  };

  const normalizeLevelsField = (row: any) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const rawLevels = (row as any).levels ?? (row as any)?.data?.levels;
    if (Array.isArray(rawLevels)) return rawLevels;
    if (typeof rawLevels === 'string') {
      try {
        const parsed = JSON.parse(rawLevels);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  for (const ch of list) {
    const spells = Array.isArray((ch as any)?.custom_spells) ? (ch as any).custom_spells : [];
    const abilities = Array.isArray((ch as any)?.custom_abilities) ? (ch as any).custom_abilities : [];
    for (const sp of spells) {
      if (!isCompactRef(sp)) continue;
      const id = String((sp as any)?.id ?? '').trim();
      if (id) {
        spellIdsSet.add(id);
        const baseId = recoverBaseId(id);
        if (baseId) spellIdsSet.add(baseId);
      }
    }
    for (const ab of abilities) {
      if (!isCompactRef(ab)) continue;
      const id = String((ab as any)?.id ?? '').trim();
      if (id) {
        abilityIdsSet.add(id);
        const baseId = recoverBaseId(id);
        if (baseId) abilityIdsSet.add(baseId);
      }
    }
  }

  const spellIds = Array.from(spellIdsSet);
  const abilityIds = Array.from(abilityIdsSet);
  if (spellIds.length === 0 && abilityIds.length === 0) return list;

  const [spellsRes, abilitiesRes] = await Promise.all([
    spellIds.length > 0 ? supabase.from('spells').select('*').in('id', spellIds) : Promise.resolve({ data: [] }),
    abilityIds.length > 0 ? supabase.from('abilities').select('*').in('id', abilityIds) : Promise.resolve({ data: [] }),
  ]);

  const spellsById: Record<string, any> = {};
  (spellsRes as any)?.data?.forEach?.((s: any) => {
    const id = String(s?.id ?? '').trim();
    if (!id) return;
    const levels = normalizeLevelsField(s);
    spellsById[id] = levels ? { ...(s as any), levels } : s;
  });
  const abilitiesById: Record<string, any> = {};
  (abilitiesRes as any)?.data?.forEach?.((a: any) => {
    const id = String(a?.id ?? '').trim();
    if (!id) return;
    const levels = normalizeLevelsField(a);
    abilitiesById[id] = levels ? { ...(a as any), levels } : a;
  });

  return list.map((ch) => {
    const spells = Array.isArray((ch as any)?.custom_spells) ? (ch as any).custom_spells : [];
    const abilities = Array.isArray((ch as any)?.custom_abilities) ? (ch as any).custom_abilities : [];
    let changed = false;

    const nextSpells = spells.map((sp: any) => {
      if (isEquipmentDerivedPower(sp)) return sp;
      if (!isCompactRef(sp)) return sp;
      const id = String(sp?.id ?? '').trim();
      const full = spellsById[id];
      if (!full) {
        const baseId = recoverBaseId(id);
        const recovered = baseId ? spellsById[baseId] : undefined;
        if (!recovered) return sp;
        changed = true;
        return { ...recovered, ...sp, id: baseId, current_level: getRefLevel(sp) };
      }
      changed = true;
      return { ...full, ...sp, current_level: getRefLevel(sp) };
    });

    const nextAbilities = abilities.map((ab: any) => {
      if (isEquipmentDerivedPower(ab)) return ab;
      if (!isCompactRef(ab)) return ab;
      const id = String(ab?.id ?? '').trim();
      const full = abilitiesById[id];
      if (!full) {
        const baseId = recoverBaseId(id);
        const recovered = baseId ? abilitiesById[baseId] : undefined;
        if (!recovered) return ab;
        changed = true;
        return { ...recovered, ...ab, id: baseId, current_level: getRefLevel(ab) };
      }
      changed = true;
      return { ...full, ...ab, current_level: getRefLevel(ab) };
    });

    return changed
      ? {
          ...(ch as any),
          custom_spells: nextSpells,
          custom_abilities: nextAbilities,
        }
      : ch;
  });
};

export const getDefaultCharacterTemplate = (name: string): Character => ({
  name,
  level: 1,
  birth_date: '',
  baseStats: {
    forza: 0,
    percezione: 0,
    resistenza: 0,
    intelletto: 0,
    agilita: 0,
    sapienza: 0,
    anima: 0
  },
  health: 12,
  actionPoints: 12,
  baseArmor: 0,
  equipment: [],
  inventory: [],
  arrows: [],
  magic_quivers: [],
  potions: [],
  currency: {
    bronzo: 0,
    argento: 0,
    oro: 0,
    rosse: 0,
    bianche: 0
  },
  anomalies: [],
  evocations: [],
  skills: {
    fisiche: {
      forza: { name: "Forza", value: 0, skills: [] },
      percezione: { name: "Percezione", value: 0, skills: [] },
      resistenza: { name: "Resistenza", value: 0, skills: [] },
      agilita: { name: "Agilità", value: 0, skills: [] }
    },
    mentali: {
      intelletto: { name: "Intelletto", value: 0, skills: [] },
      sapienza: { name: "Sapienza", value: 0, skills: [] },
      anima: { name: "Anima", value: 0, skills: [] }
    },
    sociali: {
      carisma: { name: "Carisma", value: 0, skills: [] },
      persuasione: { name: "Persuasione", value: 0, skills: [] }
    },
    meleeOffensive: {
      spada: { name: "Spada", value: 0, skills: [] },
      ascia: { name: "Ascia", value: 0, skills: [] },
      mazza: { name: "Mazza", value: 0, skills: [] }
    },
    meleeDefensive: {
      parata: { name: "Parata", value: 0, skills: [] },
      schivata: { name: "Schivata", value: 0, skills: [] }
    },
    ranged: {
      arco: { name: "Arco", value: 0, skills: [] },
      balestra: { name: "Balestra", value: 0, skills: [] }
    },
    logic: {
      investigazione: { name: "Investigazione", value: 0, skills: [] },
      medicina: { name: "Medicina", value: 0, skills: [] }
    },
    stealth: {
      furtivita: { name: "Furtività", value: 0, skills: [] },
      borseggio: { name: "Borseggio", value: 0, skills: [] }
    }
  },
  magic: {
    distruzione: {},
    illusione: {},
    evocazione: {},
    supporto: {},
    alterazione: {},
    alchimia: {},
    divinazione: {},
    trasmutazione: {},
    occulto: {},
    arcano: {},
    speciale: {}
  },
  // Aggiungi questi campi:
  custom_spells: [],
  custom_abilities: [],
  specifics: []
});

const ensureCharacterDefaults = (character: any): Character => {
  const base = character && typeof character === 'object' ? character : {};
  const template = getDefaultCharacterTemplate(String((base as any)?.name ?? ''));

  const normalizedMagic = (base as any)?.magic && typeof (base as any).magic === 'object' && !Array.isArray((base as any).magic)
    ? { ...(template as any).magic, ...(base as any).magic }
    : (template as any).magic;

  const normalizedSkills = (base as any)?.skills && typeof (base as any).skills === 'object' && !Array.isArray((base as any).skills)
    ? (base as any).skills
    : (template as any).skills;

  const normalizedEvocations = Array.isArray((base as any)?.evocations)
    ? (base as any).evocations
    : (template as any).evocations;

  return {
    ...(template as any),
    ...(base as any),
    magic: normalizedMagic,
    skills: normalizedSkills,
    evocations: normalizedEvocations,
    custom_spells: Array.isArray((base as any)?.custom_spells) ? (base as any).custom_spells : (template as any).custom_spells,
    custom_abilities: Array.isArray((base as any)?.custom_abilities) ? (base as any).custom_abilities : (template as any).custom_abilities,
    specifics: Array.isArray((base as any)?.specifics) ? (base as any).specifics : (template as any).specifics,
  } as Character;
};

export const useCharacters = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<(Character & { id: string })[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<(Character & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'personale' | null>(null);
  const lastLoadKeyRef = useRef<string>('');
  const lastLoadTsRef = useRef<number>(0);
  const lastLoadErrorTsRef = useRef<number>(0);

  // Crea character completo
  const createCharacter = async (name: string, avatarUrl?: string) => {
    if (!user) return null;
  
    try {
      const defaultCharacterData = getDefaultCharacterTemplate(name);
      if (avatarUrl) {
        defaultCharacterData.avatar_url = avatarUrl;
      }
      
      if (isLocalServer()) {
        const created = await Api.createCharacter({
          user_id: user.id,
          name,
          level: 1,
          data: defaultCharacterData,
          avatar_url: avatarUrl || null,
          is_public: false,
        });
        toast({ title: 'Successo', description: 'Personaggio creato!' });
        loadAllCharacters();
        return created.id;
      } else if (isLocalDb()) {
        const row = LocalChars.insert({
          user_id: user.id,
          name,
          level: 1,
          data: defaultCharacterData,
          avatar_url: avatarUrl || null,
          is_public: false,
        } as any);
        toast({ title: 'Successo', description: 'Personaggio creato!' });
        loadAllCharacters();
        return row.id;
      }

      const { data, error } = await supabase
        .from('characters')
        .insert({
          user_id: user.id,
          name,
          level: 1,
          data: defaultCharacterData,
          avatar_url: avatarUrl
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Personaggio creato!"
      });

      loadAllCharacters();
      return data.id;
    } catch (error) {
      console.error('Error creating character:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il personaggio",
        variant: "destructive"
      });
      return null;
    }
  };

  // Carica personaggio completo
  const loadFullCharacter = useCallback(async (characterId: string): Promise<Character | null> => {
    try {
      if (isLocalServer()) {
        const row = await Api.getCharacter(characterId, user?.id);
        if (!row) return null;
        const raw = {
          ...(row.data as any),
          id: row.id,
          user_id: row.user_id ?? (row.data as any)?.user_id,
          avatar_url: row.avatar_url || (row.data as any)?.avatar_url,
          is_public: row.is_public ?? (row.data as any)?.is_public,
        } as Character;
        const hydratedRefs = await hydrateSpellAndAbilityRefs([raw]);
        const first = (hydratedRefs?.[0] as Character) || raw;
        return normalizeAlwaysActiveAnomalies(ensureCharacterDefaults(first));
      } else if (isLocalDb()) {
        const row = LocalChars.getById(characterId);
        if (!row) return null;
        const raw = {
          ...(row.data as any),
          id: row.id,
          user_id: row.user_id ?? (row.data as any)?.user_id,
          avatar_url: row.avatar_url || (row.data as any)?.avatar_url,
          is_public: row.is_public ?? (row.data as any)?.is_public,
        } as Character;
        const hydratedRefs = await hydrateSpellAndAbilityRefs([raw]);
        const first = (hydratedRefs?.[0] as Character) || raw;
        return normalizeAlwaysActiveAnomalies(ensureCharacterDefaults(first));
      }
      const { data: character, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();
  
      if (!error && character) {
        const raw = {
          ...(character.data as any),
          id: character.id,
          user_id: (character as any)?.user_id ?? (character.data as any)?.user_id,
          avatar_url: (character as any)?.avatar_url || (character.data as any)?.avatar_url,
          is_public: (character as any)?.is_public ?? (character.data as any)?.is_public,
        } as Character;
        const hydratedRefs = await hydrateSpellAndAbilityRefs([raw]);
        const first = (hydratedRefs?.[0] as Character) || raw;
        const normalized = normalizeAlwaysActiveAnomalies(ensureCharacterDefaults(first));
        const hydrated = await hydrateDamageBonusEffectNames([normalized]);
        return hydrated[0] || normalized;
      }
  
      return null;
    } catch (error) {
      console.error('Error loading full character:', error);
      return null;
    }
  }, [user?.id]);

  // Salva personaggio completo
  const saveCharacter = async (characterId: string, characterData: Character) => {
    try {
      // VERIFICA PRELIMINARE - AGGIUNGI QUESTO CONTROLLO
      if (!characterData || !characterData.id) {
        console.error('Character data is invalid:', characterData);
        toast({
          title: "Errore",
          description: "Dati del personaggio non validi. Seleziona un personaggio valido.",
          variant: "destructive"
        });
        return;
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const normalizedCharacterData = normalizeAlwaysActiveAnomalies(characterData);
      const storageCharacterData = (isLocalServer() || isLocalDb())
        ? normalizedCharacterData
        : compactCharacterForStorage(normalizedCharacterData);
      
      // Se l'utente è admin e sta modificando un personaggio di altri
      const enableAdminUpdateCharacter = Boolean((globalThis as any).__ENABLE_ADMIN_UPDATE_CHARACTER__);
      if (enableAdminUpdateCharacter && userRole === 'admin' && characterData.user_id !== user.id) {
        /*
        const { error } = await supabase.rpc('admin_update_character', {
          character_id: characterData.id,
          character_data: {
            name: characterData.name,
            level: characterData.level,
            avatar_url: characterData.avatar_url,
            data: characterData  // Usa i dati originali
          }
        });
        
        if (error) {
          console.error('admin_update_character error:', error);
          throw error;
        }

        toast({
          title: "Successo",
          description: "Personaggio aggiornato con permessi admin!"
        });
        */
      } else {
        
        // RIMUOVI LA PULIZIA DEI CAMPI TEMPORANEI - mantieni i dati originali
        // const cleanCharacterData = { ...characterData };
        // delete cleanCharacterData.currentHealth;
        // delete cleanCharacterData.currentActionPoints;
        // delete cleanCharacterData.currentArmor;
        // delete cleanCharacterData.selectedPostureId;
        // delete cleanCharacterData.userModifiedHealth;
        // delete cleanCharacterData.userModifiedActionPoints;
        // delete cleanCharacterData.userModifiedArmor;
        // delete cleanCharacterData.userModifiedPosture;
        
        // VERIFICA CHE I CAMPI UUID SIANO VALIDI
        if (!characterData.id) {
          throw new Error('Character ID is missing');
        }
        
        
        // Usa il metodo normale per i propri personaggi - usa i dati originali
        if (isLocalServer()) {
          await Api.updateCharacter(storageCharacterData.id!, {
            name: storageCharacterData.name,
            level: storageCharacterData.level,
            avatar_url: storageCharacterData.avatar_url || null,
            data: storageCharacterData,
          } as any);
        } else if (isLocalDb()) {
          LocalChars.update(storageCharacterData.id!, {
            name: storageCharacterData.name,
            level: storageCharacterData.level,
            avatar_url: storageCharacterData.avatar_url || null,
            data: storageCharacterData,
          } as any);
        } else {
          const { error } = await supabase
            .from('characters')
            .update({
              name: storageCharacterData.name,
              level: storageCharacterData.level,
              avatar_url: storageCharacterData.avatar_url || null,
              data: storageCharacterData
            })
            .eq('id', storageCharacterData.id);
          if (error) {
            console.error('Normal update error:', error);
            throw error;
          }
        }
        
        
        // toast({
        //   title: "Successo",
        //   description: "Personaggio aggiornato!"
        // });
      }
      
      // Ricarica i personaggi dopo il salvataggio
      await loadAllCharacters();
      
      // AGGIUNGI IL RETURN TRUE PER INDICARE SUCCESSO
      return true;
    } catch (error) {
      console.error('Error saving character:', error);
      
      toast({
        title: "Errore",
        description: "Impossibile salvare il personaggio",
        variant: "destructive"
      });
      
      // AGGIUNGI IL RETURN FALSE PER INDICARE FALLIMENTO
      return false;
    }
  };

  // Elimina personaggio
  const deleteCharacter = async (characterId: string) => {
    if (!user) return false;

    try {
      if (isLocalServer()) {
        await Api.deleteCharacter(characterId);
      } else if (isLocalDb()) {
        LocalChars.remove(characterId);
      } else {
        const { error } = await supabase
          .from('characters')
          .delete()
          .eq('id', characterId);
        if (error) throw error;
      }


      toast({
        title: "Successo",
        description: "Personaggio eliminato"
      });

      loadAllCharacters();
      return true;
    } catch (error) {
      console.error('Error deleting character:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il personaggio",
        variant: "destructive"
      });
      return false;
    }
  };

  // Carica tutti i personaggi
  const loadAllCharacters = useCallback(async (force = false) => {
    if (!user) {
      setCharacters([]);
      setIsLoading(false);
      return;
    }

    try {
      const key = `${user.id}:${userRole ?? 'personale'}`;
      const now = Date.now();
      if (!force && lastLoadKeyRef.current === key && (now - lastLoadTsRef.current) < 2000) {
        return;
      }
      lastLoadKeyRef.current = key;
      lastLoadTsRef.current = now;
    } catch {}

    try {
      if (isLocalServer()) {
        let fullChars = null as any[] | null;
        if (userRole === 'admin') {
          fullChars = await Api.listCharacters(user.id);
        } else {
          fullChars = await Api.listCharacters(user.id);
          if (!fullChars || fullChars.length === 0) {
            fullChars = await Api.listCharacters();
          }
        }
        if (fullChars) {
          const formattedCharacters = fullChars.map((char: any) => {
            const rawData = char.data as any;
            const normalizedEquipment = Array.isArray(rawData?.equipment)
              ? rawData.equipment
              : Object.values(rawData?.equipment || {}).filter(Boolean);
            const merged = {
              ...rawData,
              equipment: normalizedEquipment,
              id: char.id
            };
            return ensureCharacterDefaults(merged as Character);
          });
          const hydratedRefs = await hydrateSpellAndAbilityRefs(formattedCharacters);
          const normalized = hydratedRefs.map((c: any) => normalizeAlwaysActiveAnomalies(c as Character));
          const hydrated = await hydrateDamageBonusEffectNames(normalized);
          setCharacters(hydrated);
        }
        return;
      } else if (isLocalDb()) {
        const fullChars = LocalChars.list(user.id, userRole || 'personale');
        if (fullChars) {
          const formattedCharacters = fullChars.map(char => {
            const rawData = char.data as any;
            const normalizedEquipment = Array.isArray(rawData?.equipment)
              ? rawData.equipment
              : Object.values(rawData?.equipment || {}).filter(Boolean);
            const merged = {
              ...rawData,
              equipment: normalizedEquipment,
              id: char.id
            };
            return ensureCharacterDefaults(merged as Character);
          });
          const hydratedRefs = await hydrateSpellAndAbilityRefs(formattedCharacters);
          const normalized = hydratedRefs.map((c: any) => normalizeAlwaysActiveAnomalies(c as Character));
          const hydrated = await hydrateDamageBonusEffectNames(normalized);
          setCharacters(hydrated);
        }
        return;
      }

      let charactersQuery = supabase.from('characters').select('*');
      if (userRole !== 'admin') {
        charactersQuery = charactersQuery.eq('user_id', user.id);
      }
      const { data: fullChars } = await charactersQuery;
      
      if (fullChars) {
        const formattedCharacters = fullChars.map(char => {
          const rawData = char.data as any;
          const normalizedEquipment = Array.isArray(rawData?.equipment)
            ? rawData.equipment
            : Object.values(rawData?.equipment || {}).filter(Boolean);
          const merged = {
            ...rawData,
            equipment: normalizedEquipment,
            id: char.id
          };
          return ensureCharacterDefaults(merged as Character);
        });
        const hydratedRefs = await hydrateSpellAndAbilityRefs(formattedCharacters);
        const normalized = hydratedRefs.map((c: any) => normalizeAlwaysActiveAnomalies(c as Character));
        const hydrated = await hydrateDamageBonusEffectNames(normalized);
        setCharacters(hydrated);
      }
    } catch (error) {
      setCharacters([]);
      const now = Date.now();
      if (now - lastLoadErrorTsRef.current > 5000) {
        lastLoadErrorTsRef.current = now;
        const msg =
          isLocalServer()
            ? "Backend non raggiungibile. Avvia 'npm run server' o imposta VITE_LOCAL_SERVER_URL."
            : "Impossibile caricare i personaggi.";
        toast({ title: 'Errore', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, userRole]);

  // Carica il ruolo dell'utente
  const loadUserRole = useCallback(async () => {
    if (!user) return;
    
    try {
      if (isLocalDb()) {
        const role = LocalChars.getUserRole(user.id);
        setUserRole(role);
        return;
      }
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      if (data && data.length > 0) {
        const hasAdmin = data.some(row => row.role === 'admin');
        setUserRole(hasAdmin ? 'admin' : 'personale');
      } else {
        setUserRole('personale');
      }
    } catch (error) {
      // console.error('Error loading user role:', error);
      setUserRole('personale');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadUserRole();
    }
  }, [user, loadUserRole]);

  useEffect(() => {
    if (user && userRole !== null) {
      void loadAllCharacters();
    }
  }, [user, userRole, loadAllCharacters]);

  useEffect(() => {
    if (!user || userRole === null) return;
    if (!isLocalServer()) return;
    let t: any = null;
    const schedule = () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        loadAllCharacters(true);
      }, 120);
    };
    const unsub = Api.subscribeCharacters(() => schedule());
    return () => {
      if (t) clearTimeout(t);
      try { unsub?.(); } catch {}
    };
  }, [user, userRole, loadAllCharacters]);

  // Aggiorna un personaggio esistente
  const updateCharacter = async (updatedCharacter: Character & { id: string }) => {
    try {
      const normalized = normalizeAlwaysActiveAnomalies(updatedCharacter);
      await saveCharacter(normalized.id, normalized);
      
      // Aggiorna la lista dei personaggi
      setCharacters(prev => 
        prev.map(char => 
          char.id === normalized.id ? normalized : char
        )
      );
      
      // Aggiorna il personaggio selezionato se è quello che stiamo modificando
      if (selectedCharacter?.id === normalized.id) {
        setSelectedCharacter(normalized);
      }
      
      return true;
    } catch (error) {
      // console.error('Error updating character:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il personaggio",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    characters,
    setCharacters,
    selectedCharacter,
    setSelectedCharacter,
    isLoading,
    createCharacter,
    loadFullCharacter,
    saveCharacter,
    updateCharacter,
    deleteCharacter,
    loadAllCharacters,
    userRole
  };
};
