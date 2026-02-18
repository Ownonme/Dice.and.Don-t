// Calcolo facce dado per livello azioni
export const getActionDiceValue = (level: number): number => {
  const diceMap: { [key: number]: number } = {
    1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 100, 8: 120,
    9: 140, 10: 160, 11: 180, 12: 200, 13: 220, 14: 240,
    15: 260, 16: 290, 17: 320, 18: 350, 19: 380, 20: 400
  };
  return diceMap[level] || 400;
};

const getCombinedAnomalies = (character: any, explicitAnomalies: any[] = []) => {
  const out: any[] = [];
  const pushMany = (arr: any[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return;
    for (const x of arr) if (x) out.push(x);
  };

  const collectFromItem = (item: any) => {
    if (!item) return [];
    const a =
      (Array.isArray(item?.statusAnomalies) ? item.statusAnomalies : null) ??
      (Array.isArray(item?.status_anomalies) ? item.status_anomalies : null) ??
      (Array.isArray(item?.anomalies) ? item.anomalies : null) ??
      (Array.isArray(item?.data?.statusAnomalies) ? item.data.statusAnomalies : null) ??
      (Array.isArray(item?.data?.status_anomalies) ? item.data.status_anomalies : null) ??
      (Array.isArray(item?.data?.anomalies) ? item.data.anomalies : null) ??
      [];
    return Array.isArray(a) ? a : [];
  };

  const collectFromCharacterEquipment = (ch: any) => {
    const eq = ch?.equipment;
    if (!eq) return [];
    const values = Array.isArray(eq) ? eq : Object.values(eq);
    const all: any[] = [];
    for (const item of values) {
      all.push(...collectFromItem(item));
    }
    return all;
  };

  pushMany(explicitAnomalies);
  pushMany(Array.isArray(character?.anomalies) ? character.anomalies : []);
  pushMany(collectFromCharacterEquipment(character));

  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const a of out) {
    const key = String(a?.id ?? '').trim() || `${String(a?.name ?? '').trim()}|${String(a?.description ?? '').trim()}`;
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }
  return deduped;
};

// Calcolo danno equipaggiamento - ora supporta danni normali e critici
// Modifica la funzione per accettare il personaggio e includere l'anima
export function calculateEquipmentDamage(
  weapon: any, 
  damageType: string, 
  projectile: any = null, // Freccia o proiettile
  isCritical: boolean = false,
  anomalies: any[] = []
) {
  let baseDamage = 0;
  let calculatedDamage = 0;
  let rawBaseDamage = 0;
  let rawCalculatedDamage = 0;
  let bonusBaseDamage = 0;
  let bonusCalculatedDamage = 0;
  let bonusBaseDamageClassic = 0;
  let bonusBaseDamagePercent = 0;
  let bonusCalculatedDamageClassic = 0;
  let bonusCalculatedDamagePercent = 0;

  // Nuova logica: usa set di danno nominati, sommando più set dello stesso tipo
  const sets: any[] = Array.isArray((weapon?.data as any)?.damage_sets)
    ? (weapon as any).data.damage_sets
    : (Array.isArray((weapon as any)?.damage_sets) ? (weapon as any).damage_sets : []);

  if (Array.isArray(sets) && sets.length > 0) {
    const key = damageType === 'veloce' ? 'damage_veloce'
      : damageType === 'pesante' ? 'damage_pesante'
      : 'damage_affondo';
    const calcKey = damageType === 'veloce' ? 'calculated_damage_veloce'
      : damageType === 'pesante' ? 'calculated_damage_pesante'
      : 'calculated_damage_affondo';

    rawBaseDamage = sets.reduce((sum: number, s: any) => {
      const v = typeof s?.[key] === 'number' ? s[key] : Number(s?.[key]) || 0;
      return sum + v;
    }, 0);
    rawCalculatedDamage = sets.reduce((sum: number, s: any) => {
      const v = typeof s?.[calcKey] === 'number' ? s[calcKey] : Number(s?.[calcKey]) || 0;
      return sum + v;
    }, 0);
  } else {
    // Fallback: campi diretti dell'arma
    switch (damageType) {
      case 'veloce':
        rawBaseDamage = weapon.damageVeloce || 0;
        rawCalculatedDamage = weapon.calculatedDamageVeloce || 0;
        break;
      case 'pesante':
        rawBaseDamage = weapon.damagePesante || 0;
        rawCalculatedDamage = weapon.calculatedDamagePesante || 0;
        break;
      case 'affondo':
        rawBaseDamage = weapon.damageAffondo || 0;
        rawCalculatedDamage = weapon.calculatedDamageAffondo || 0;
        break;
    }
  }

  const norm = (s: any) => String(s ?? '').trim().toLowerCase();
  const weaponAnomalies =
    (Array.isArray((weapon as any)?.statusAnomalies) ? (weapon as any).statusAnomalies : null) ??
    (Array.isArray((weapon as any)?.status_anomalies) ? (weapon as any).status_anomalies : null) ??
    (Array.isArray((weapon as any)?.anomalies) ? (weapon as any).anomalies : null) ??
    (Array.isArray((weapon as any)?.data?.statusAnomalies) ? (weapon as any).data.statusAnomalies : null) ??
    (Array.isArray((weapon as any)?.data?.status_anomalies) ? (weapon as any).data.status_anomalies : null) ??
    (Array.isArray((weapon as any)?.data?.anomalies) ? (weapon as any).data.anomalies : null) ??
    [];
  const projectileAnomalies =
    (Array.isArray((projectile as any)?.statusAnomalies) ? (projectile as any).statusAnomalies : null) ??
    (Array.isArray((projectile as any)?.status_anomalies) ? (projectile as any).status_anomalies : null) ??
    (Array.isArray((projectile as any)?.anomalies) ? (projectile as any).anomalies : null) ??
    (Array.isArray((projectile as any)?.data?.statusAnomalies) ? (projectile as any).data.statusAnomalies : null) ??
    (Array.isArray((projectile as any)?.data?.status_anomalies) ? (projectile as any).data.status_anomalies : null) ??
    (Array.isArray((projectile as any)?.data?.anomalies) ? (projectile as any).data.anomalies : null) ??
    [];
  const anomaliesList: any[] = getCombinedAnomalies(null, [
    ...(Array.isArray(anomalies) ? anomalies : []),
    ...(Array.isArray(weaponAnomalies) ? weaponAnomalies : []),
    ...(Array.isArray(projectileAnomalies) ? projectileAnomalies : []),
  ]);
  const getDamageBonusTotalsForType = (typeName?: string, typeId?: string) => {
    const typeNorm = norm(typeName);
    const idNorm = norm(typeId);
    let classicGuaranteed = 0;
    let classicAdditional = 0;
    let percentageGuaranteed = 0;
    let percentageAdditional = 0;
    for (const a of anomaliesList) {
      const enabled =
        (a as any)?.damageBonusEnabled ??
        (a as any)?.damage_bonus_enabled ??
        (a as any)?.stats?.damageBonusEnabled ??
        (a as any)?.stats?.damage_bonus_enabled;
      const def =
        (a as any)?.damageBonus ??
        (a as any)?.damage_bonus ??
        (a as any)?.stats?.damageBonus ??
        (a as any)?.stats?.damage_bonus;
      if (!def) continue;
      if (enabled === false) continue;
      const applyToEquipment =
        (def as any)?.applyToEquipment ??
        (def as any)?.appliesToEquipment ??
        (def as any)?.apply_to_equipment ??
        (def as any)?.applies_to_equipment;
      if (applyToEquipment === false) continue;
      const isSpecific = !!(def?.isSpecific ?? (def as any)?.is_specific);
      if (isSpecific) {
        const names: string[] = Array.isArray(def?.damageEffectNames)
          ? def.damageEffectNames
          : Array.isArray((def as any)?.damage_effect_names)
            ? (def as any).damage_effect_names
            : [];
        const ids: string[] = Array.isArray(def?.damageEffectIds)
          ? def.damageEffectIds
          : Array.isArray((def as any)?.damage_effect_ids)
            ? (def as any).damage_effect_ids
            : [];
        const ok = [...names, ...ids].some((v) => {
          const vNorm = norm(v);
          return (typeNorm && vNorm === typeNorm) || (idNorm && vNorm === idNorm);
        });
        if (!ok) continue;
      }
      const mode = String(def?.mode ?? '').trim().toLowerCase();
      const allowClassic = mode !== 'percentage';
      const allowPercentage = mode !== 'classic';
      if (allowClassic) {
        classicGuaranteed += Number(def?.classicGuaranteed ?? (def as any)?.classic_guaranteed ?? 0) || 0;
        classicAdditional += Number(def?.classicAdditional ?? (def as any)?.classic_additional ?? 0) || 0;
      }
      if (allowPercentage) {
        percentageGuaranteed += Number(def?.percentageGuaranteed ?? (def as any)?.percentage_guaranteed ?? 0) || 0;
        percentageAdditional += Number(def?.percentageAdditional ?? (def as any)?.percentage_additional ?? 0) || 0;
      }
    }
    return { classicGuaranteed, classicAdditional, percentageGuaranteed, percentageAdditional };
  };

  if (Array.isArray(sets) && sets.length > 0) {
    const key = damageType === 'veloce' ? 'damage_veloce'
      : damageType === 'pesante' ? 'damage_pesante'
      : 'damage_affondo';
    const calcKey = damageType === 'veloce' ? 'calculated_damage_veloce'
      : damageType === 'pesante' ? 'calculated_damage_pesante'
      : 'calculated_damage_affondo';
    for (const s of sets) {
      const effectName = (s as any)?.effect_name ?? (s as any)?.effectName ?? '';
      const effectId = (s as any)?.damageEffectId ?? (s as any)?.damage_effect_id ?? '';
      const g0 = typeof s?.[calcKey] === 'number' ? s[calcKey] : Number(s?.[calcKey]) || 0;
      const a0 = typeof s?.[key] === 'number' ? s[key] : Number(s?.[key]) || 0;
      if (!g0 && !a0) continue;
      const bonus = getDamageBonusTotalsForType(effectName, effectId);
      const gClassic = Number(bonus.classicGuaranteed) || 0;
      const aClassic = Number(bonus.classicAdditional) || 0;
      const pG = Number(bonus.percentageGuaranteed) || 0;
      const pA = Number(bonus.percentageAdditional) || 0;
      const totalPctBonus = pG && !pA ? Math.floor(((g0 + a0) * pG) / 100) : 0;
      const gPercent = Math.floor((g0 * pG) / 100);
      const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((a0 * pA) / 100);
      const gPlus = gClassic + gPercent;
      const aPlus = aClassic + aPercent;
      bonusCalculatedDamage += gPlus;
      bonusBaseDamage += aPlus;
      bonusCalculatedDamageClassic += gClassic;
      bonusCalculatedDamagePercent += gPercent;
      bonusBaseDamageClassic += aClassic;
      bonusBaseDamagePercent += aPercent;
    }
  } else {
    const bonus = getDamageBonusTotalsForType('', '');
    const gClassic = Number(bonus.classicGuaranteed) || 0;
    const aClassic = Number(bonus.classicAdditional) || 0;
    const pG = Number(bonus.percentageGuaranteed) || 0;
    const pA = Number(bonus.percentageAdditional) || 0;
    const totalPctBonus = pG && !pA ? Math.floor(((rawCalculatedDamage + rawBaseDamage) * pG) / 100) : 0;
    const gPercent = Math.floor((rawCalculatedDamage * pG) / 100);
    const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((rawBaseDamage * pA) / 100);
    const gPlus = gClassic + gPercent;
    const aPlus = aClassic + aPercent;
    bonusCalculatedDamage = gPlus;
    bonusBaseDamage = aPlus;
    bonusCalculatedDamageClassic = gClassic;
    bonusCalculatedDamagePercent = gPercent;
    bonusBaseDamageClassic = aClassic;
    bonusBaseDamagePercent = aPercent;
  }

  baseDamage = Math.max(0, rawBaseDamage + bonusBaseDamage);
  calculatedDamage = Math.max(0, rawCalculatedDamage + bonusCalculatedDamage);
  
  // Se baseDamage è 0, significa che l'arma non supporta questo tipo di attacco
  if (rawBaseDamage === 0) {
    console.warn(`⚠️ Arma '${weapon.name}' non supporta attacco '${damageType}'`);
    return {
      baseDamage: 0,
      rawBaseDamage: 0,
      bonusBaseDamage: 0,
      bonusBaseDamageClassic: 0,
      bonusBaseDamagePercent: 0,
      calculatedDamage: 0,
      rawCalculatedDamage: 0,
      bonusCalculatedDamage: 0,
      bonusCalculatedDamageClassic: 0,
      bonusCalculatedDamagePercent: 0,
      projectileDamage: 0,
      totalPureDamage: 0,
      diceRolls: [],
      diceResult: 0,
      guaranteedDamage: 0,
      maximalDamage: 0
    };
  }

  // Danno freccia/proiettile: supporta sia campo diretto sia damage_sets (garantito)
  let rawProjectileGuaranteedDamage = 0;
  let rawProjectileAdditionalSides = 0;
  let bonusProjectileGuaranteedDamage = 0;
  let bonusProjectileAdditionalSides = 0;
  let bonusProjectileGuaranteedClassic = 0;
  let bonusProjectileGuaranteedPercent = 0;
  let bonusProjectileAdditionalClassic = 0;
  let bonusProjectileAdditionalPercent = 0;

  try {
    if (projectile) {
      const pSets = Array.isArray((projectile as any)?.damage_sets) ? (projectile as any).damage_sets : [];
      if (Array.isArray(pSets) && pSets.length > 0) {
        for (const s of pSets) {
          const effectName = (s as any)?.effect_name ?? (s as any)?.effectName ?? '';
          const effectId = (s as any)?.damageEffectId ?? (s as any)?.damage_effect_id ?? '';
          const g0 = Number((s as any)?.guaranteed_damage ?? (s as any)?.guaranteedDamage ?? 0) || 0;
          const a0 = Number((s as any)?.additional_damage ?? (s as any)?.additionalDamage ?? 0) || 0;
          rawProjectileGuaranteedDamage += g0;
          rawProjectileAdditionalSides += a0;
          const bonus = getDamageBonusTotalsForType(effectName, effectId);
          const gClassic = Number(bonus.classicGuaranteed) || 0;
          const aClassic = Number(bonus.classicAdditional) || 0;
          const pG = Number(bonus.percentageGuaranteed) || 0;
          const pA = Number(bonus.percentageAdditional) || 0;
          const totalPctBonus = pG && !pA ? Math.floor(((g0 + a0) * pG) / 100) : 0;
          const gPercent = Math.floor((g0 * pG) / 100);
          const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((a0 * pA) / 100);
          bonusProjectileGuaranteedDamage += gClassic + gPercent;
          bonusProjectileAdditionalSides += aClassic + aPercent;
          bonusProjectileGuaranteedClassic += gClassic;
          bonusProjectileGuaranteedPercent += gPercent;
          bonusProjectileAdditionalClassic += aClassic;
          bonusProjectileAdditionalPercent += aPercent;
        }
      } else {
        rawProjectileGuaranteedDamage = Number((projectile as any)?.damage ?? (projectile as any)?.guaranteed_damage ?? (projectile as any)?.guaranteedDamage ?? 0) || 0;
        rawProjectileAdditionalSides = Number((projectile as any)?.additional_damage ?? (projectile as any)?.additionalDamage ?? 0) || 0;
        const bonus = getDamageBonusTotalsForType('', '');
        const gClassic = Number(bonus.classicGuaranteed) || 0;
        const aClassic = Number(bonus.classicAdditional) || 0;
        const pG = Number(bonus.percentageGuaranteed) || 0;
        const pA = Number(bonus.percentageAdditional) || 0;
        const totalPctBonus = pG && !pA ? Math.floor(((rawProjectileGuaranteedDamage + rawProjectileAdditionalSides) * pG) / 100) : 0;
        const gPercent = Math.floor((rawProjectileGuaranteedDamage * pG) / 100);
        const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((rawProjectileAdditionalSides * pA) / 100);
        bonusProjectileGuaranteedDamage = gClassic + gPercent;
        bonusProjectileAdditionalSides = aClassic + aPercent;
        bonusProjectileGuaranteedClassic = gClassic;
        bonusProjectileGuaranteedPercent = gPercent;
        bonusProjectileAdditionalClassic = aClassic;
        bonusProjectileAdditionalPercent = aPercent;
      }
    }
  } catch {
    rawProjectileGuaranteedDamage = Number((projectile as any)?.damage ?? 0) || 0;
  }

  const projectileGuaranteedDamage = Math.max(0, rawProjectileGuaranteedDamage + bonusProjectileGuaranteedDamage);
  const projectileAdditionalSides = Math.max(0, rawProjectileAdditionalSides + bonusProjectileAdditionalSides);
  const projectileDamage = projectileGuaranteedDamage;
  
  if (isCritical) {
    // Per danno critico, tutti i valori diventano puri
    const totalPureDamage = baseDamage + projectileDamage;
    return {
      baseDamage,
      rawBaseDamage,
      bonusBaseDamage,
      bonusBaseDamageClassic,
      bonusBaseDamagePercent,
      // Nel critico il danno base diventa garantito; manteniamo calculated separato per breakdown UI
      calculatedDamage,
      rawCalculatedDamage,
      bonusCalculatedDamage,
      bonusCalculatedDamageClassic,
      bonusCalculatedDamagePercent,
      projectileDamage,
      rawProjectileGuaranteedDamage,
      bonusProjectileGuaranteedDamage,
      bonusProjectileGuaranteedClassic,
      bonusProjectileGuaranteedPercent,
      projectileGuaranteedDamage,
      rawProjectileAdditionalSides,
      bonusProjectileAdditionalSides,
      bonusProjectileAdditionalClassic,
      bonusProjectileAdditionalPercent,
      projectileAdditionalSides,
      totalPureDamage,
      diceRolls: [],
      guaranteedDamage: baseDamage + projectileDamage,
      maximalDamage: 0
    };
  } else {
    // Per danno normale: [Danno Massimale] + (33% danno assicurato + freccia)
    const diceResult = baseDamage > 0 ? (Math.floor(Math.random() * Math.max(1, baseDamage)) + 1) : 0;
    const guaranteedDamage = calculatedDamage + projectileDamage; // 33% + freccia
  
    return {
      baseDamage,
      rawBaseDamage,
      bonusBaseDamage,
      bonusBaseDamageClassic,
      bonusBaseDamagePercent,
      calculatedDamage,
      rawCalculatedDamage,
      bonusCalculatedDamage,
      bonusCalculatedDamageClassic,
      bonusCalculatedDamagePercent,
      projectileDamage,
      rawProjectileGuaranteedDamage,
      bonusProjectileGuaranteedDamage,
      bonusProjectileGuaranteedClassic,
      bonusProjectileGuaranteedPercent,
      projectileGuaranteedDamage,
      rawProjectileAdditionalSides,
      bonusProjectileAdditionalSides,
      bonusProjectileAdditionalClassic,
      bonusProjectileAdditionalPercent,
      projectileAdditionalSides,
      totalPureDamage: guaranteedDamage + diceResult, // CORREZIONE: aggiungere il tiro di dado
      diceRolls: diceResult > 0 ? [{ dice: `d${baseDamage}`, result: diceResult }] : [],
      diceResult,
      guaranteedDamage,
      maximalDamage: diceResult // Tiro di dado
    };
  }
};

// Calcolo danno abilità/magia - ora supporta danni normali e critici
export const calculateAbilityDamage = (
  ability: any,
  character: any,
  competences: any[] = [],
  isCritical: boolean = false,
  anomalies: any[] = []
) => {
  const currentLevel = ability.current_level || 1;
  const baseLevelData = ability.levels?.find((l: any) => l.level === currentLevel) || ability;
  const desiredGradeNumber = Number((ability as any)?.__selectedGradeNumber ?? (ability as any)?.selectedGradeNumber ?? 1) || 1;
  const gradesArr = Array.isArray((baseLevelData as any)?.grades) ? (baseLevelData as any).grades : [];
  const levelData = (gradesArr.length > 0 && desiredGradeNumber > 1)
    ? ((gradesArr.find((g: any) => Number(g?.grade_number || 0) === desiredGradeNumber) || gradesArr[Math.max(0, desiredGradeNumber - 2)]) ?? baseLevelData)
    : baseLevelData;

  // Nuova logica: usa array damage_values (typeName, guaranteed_damage, additional_damage)
  const damageValues: any[] = Array.isArray(levelData?.damage_values) ? levelData.damage_values : [];
  const hasNewSchema = Array.isArray(damageValues) && damageValues.length > 0;

  const rawGuaranteedBase = hasNewSchema
    ? damageValues.reduce((sum, dv) => sum + (Number(dv?.guaranteed_damage ?? 0) || 0), 0)
    : (Number(levelData.danno_assicurato ?? levelData.guaranteed_damage ?? 0) || 0);
  const rawAdditionalBase = hasNewSchema
    ? damageValues.reduce((sum, dv) => sum + (Number(dv?.additional_damage ?? 0) || 0), 0)
    : (Number(levelData.danno_aggiuntivo ?? levelData.additional_damage ?? 0) || 0);
  const rawBaseSum = (Number(rawGuaranteedBase) || 0) + (Number(rawAdditionalBase) || 0);

  if (rawBaseSum === 0) {
    const secondsDuration = ability.secondsDuration || 1;
    const projectilesCount = ability.projectilesCount || 1;
    const actionsCount = ability.actionsCount || 1;
    const copies = Math.max(1, Number(secondsDuration)) * Math.max(1, Number(projectilesCount)) * Math.max(1, Number(actionsCount));
    const zeroAdjustedDamageValues: any[] = hasNewSchema
      ? damageValues.map((dv) => {
          const g0 = Number(dv?.guaranteed_damage ?? 0) || 0;
          const a0 = Number(dv?.additional_damage ?? 0) || 0;
          return {
            ...dv,
            guaranteed_damage: 0,
            additional_damage: 0,
            raw_guaranteed_damage: g0,
            raw_additional_damage: a0,
            bonus_guaranteed_damage: 0,
            bonus_additional_damage: 0,
            bonus_guaranteed_classic: 0,
            bonus_guaranteed_percent: 0,
            bonus_additional_classic: 0,
            bonus_additional_percent: 0,
          };
        })
      : [];
    return {
      baseDamageLockedZero: true,
      guaranteedDamage: 0,
      additionalDamage: 0,
      competenceTotal: 0,
      animaBonus: 0,
      increasingPerSecondPure: 0,
      increasingPerShotPure: 0,
      increasingPureTotal: 0,
      scaledMovePureTotal: 0,
      scaledMoveInputs: [],
      scaledMoveCopies: copies,
      totalDamage: 0,
      diceRolls: [],
      damageValuesAdjusted: zeroAdjustedDamageValues,
      secondsDuration,
      projectilesCount,
      actionsCount
    };
  }

  const norm = (s: any) => String(s ?? '').trim().toLowerCase();
  const anomaliesList: any[] = getCombinedAnomalies(character, Array.isArray(anomalies) ? anomalies : []);
  const getDamageBonusTotalsForType = (
    typeName?: string,
    typeId?: string,
    opts?: { includeSpecific?: boolean; includeNonSpecific?: boolean }
  ) => {
    const typeNorm = norm(typeName);
    const idNorm = norm(typeId);
    let classicGuaranteed = 0;
    let classicAdditional = 0;
    let percentageGuaranteed = 0;
    let percentageAdditional = 0;
    const includeSpecific = opts?.includeSpecific ?? true;
    const includeNonSpecific = opts?.includeNonSpecific ?? true;
    for (const a of anomaliesList) {
      const enabled =
        (a as any)?.damageBonusEnabled ??
        (a as any)?.damage_bonus_enabled ??
        (a as any)?.stats?.damageBonusEnabled ??
        (a as any)?.stats?.damage_bonus_enabled;
      const def =
        (a as any)?.damageBonus ??
        (a as any)?.damage_bonus ??
        (a as any)?.stats?.damageBonus ??
        (a as any)?.stats?.damage_bonus;
      if (!def) continue;
      if (enabled === false) continue;
      const isSpecific = !!(def?.isSpecific ?? (def as any)?.is_specific);
      if (isSpecific && !includeSpecific) continue;
      if (!isSpecific && !includeNonSpecific) continue;
      if (isSpecific) {
        const names: string[] = Array.isArray(def?.damageEffectNames)
          ? def.damageEffectNames
          : Array.isArray((def as any)?.damage_effect_names)
            ? (def as any).damage_effect_names
            : [];
        const ids: string[] = Array.isArray(def?.damageEffectIds)
          ? def.damageEffectIds
          : Array.isArray((def as any)?.damage_effect_ids)
            ? (def as any).damage_effect_ids
            : [];
        const ok = [...names, ...ids].some((v) => {
          const vNorm = norm(v);
          return (typeNorm && vNorm === typeNorm) || (idNorm && vNorm === idNorm);
        });
        if (!ok) continue;
      }
      const mode = String(def?.mode ?? '').trim().toLowerCase();
      const allowClassic = mode !== 'percentage';
      const allowPercentage = mode !== 'classic';
      if (allowClassic) {
        classicGuaranteed += Number(def?.classicGuaranteed ?? (def as any)?.classic_guaranteed ?? 0) || 0;
        classicAdditional += Number(def?.classicAdditional ?? (def as any)?.classic_additional ?? 0) || 0;
      }
      if (allowPercentage) {
        percentageGuaranteed += Number(def?.percentageGuaranteed ?? (def as any)?.percentage_guaranteed ?? 0) || 0;
        percentageAdditional += Number(def?.percentageAdditional ?? (def as any)?.percentage_additional ?? 0) || 0;
      }
    }
    return { classicGuaranteed, classicAdditional, percentageGuaranteed, percentageAdditional };
  };

  const getLegacyDamageEffectNames = () => {
    const raw =
      (Array.isArray(levelData?.effects) ? levelData.effects : null) ??
      (Array.isArray((levelData as any)?.damage_effects) ? (levelData as any).damage_effects : null) ??
      (Array.isArray((levelData as any)?.damageEffects) ? (levelData as any).damageEffects : null) ??
      (Array.isArray(ability?.effects) ? ability.effects : null) ??
      (Array.isArray((ability as any)?.damage_effects) ? (ability as any).damage_effects : null) ??
      (Array.isArray((ability as any)?.damageEffects) ? (ability as any).damageEffects : null) ??
      [];
    const names = (Array.isArray(raw) ? raw : [])
      .map((e: any) => (typeof e === 'string' ? e : (e?.name ?? e?.effect_name ?? '')))
      .map((s: any) => String(s || '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  };

  const getDamageBonusTotalsForLegacy = () => {
    const effectNames = getLegacyDamageEffectNames();
    const nonSpecific = getDamageBonusTotalsForType('', '', { includeSpecific: false, includeNonSpecific: true });
    if (effectNames.length === 0) return nonSpecific;
    const specificTotals = effectNames.reduce(
      (acc, name) => {
        const b = getDamageBonusTotalsForType(name, '', { includeSpecific: true, includeNonSpecific: false });
        acc.classicGuaranteed += Number(b.classicGuaranteed) || 0;
        acc.classicAdditional += Number(b.classicAdditional) || 0;
        acc.percentageGuaranteed += Number(b.percentageGuaranteed) || 0;
        acc.percentageAdditional += Number(b.percentageAdditional) || 0;
        return acc;
      },
      { classicGuaranteed: 0, classicAdditional: 0, percentageGuaranteed: 0, percentageAdditional: 0 }
    );
    return {
      classicGuaranteed: (Number(nonSpecific.classicGuaranteed) || 0) + (Number(specificTotals.classicGuaranteed) || 0),
      classicAdditional: (Number(nonSpecific.classicAdditional) || 0) + (Number(specificTotals.classicAdditional) || 0),
      percentageGuaranteed: (Number(nonSpecific.percentageGuaranteed) || 0) + (Number(specificTotals.percentageGuaranteed) || 0),
      percentageAdditional: (Number(nonSpecific.percentageAdditional) || 0) + (Number(specificTotals.percentageAdditional) || 0),
    };
  };

  const adjustedDamageValues: any[] = hasNewSchema
    ? damageValues.map((dv) => {
        const g0 = Number(dv?.guaranteed_damage ?? 0) || 0;
        const a0 = Number(dv?.additional_damage ?? 0) || 0;
        const typeName = (dv?.typeName ?? dv?.name ?? '').toString();
        const typeId = (dv?.damageEffectId ?? dv?.damage_effect_id ?? dv?.effect_id ?? dv?.typeId ?? '').toString();
        const bonus = getDamageBonusTotalsForType(typeName, typeId);
        const gClassic = Number(bonus.classicGuaranteed) || 0;
        const aClassic = Number(bonus.classicAdditional) || 0;
        const pG = Number(bonus.percentageGuaranteed) || 0;
        const pA = Number(bonus.percentageAdditional) || 0;
        const totalPctBonus = pG && !pA ? Math.floor(((g0 + a0) * pG) / 100) : 0;
        const gPercent = Math.floor((g0 * pG) / 100);
        const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((a0 * pA) / 100);
        const gPlus = gClassic + gPercent;
        const aPlus = aClassic + aPercent;
        const gNext = Math.max(0, g0 + gPlus);
        const aNext = Math.max(0, a0 + aPlus);
        return {
          ...dv,
          guaranteed_damage: gNext,
          additional_damage: aNext,
          raw_guaranteed_damage: g0,
          raw_additional_damage: a0,
          bonus_guaranteed_damage: gNext - g0,
          bonus_additional_damage: aNext - a0,
          bonus_guaranteed_classic: gClassic,
          bonus_guaranteed_percent: gPercent,
          bonus_additional_classic: aClassic,
          bonus_additional_percent: aPercent,
        };
      })
    : [];

  const guaranteedDamage = hasNewSchema
    ? adjustedDamageValues.reduce((sum, dv) => sum + (Number(dv?.guaranteed_damage) || 0), 0)
    : (() => {
        const g0 = Number(levelData.danno_assicurato ?? levelData.guaranteed_damage ?? 0) || 0;
        const a0 = Number(levelData.danno_aggiuntivo ?? levelData.additional_damage ?? 0) || 0;
        const bonus = getDamageBonusTotalsForLegacy();
        const pG = Number(bonus.percentageGuaranteed) || 0;
        const pA = Number(bonus.percentageAdditional) || 0;
        const totalPctBonus = pG && !pA ? Math.floor(((g0 + a0) * pG) / 100) : 0;
        const gPercent = Math.floor((g0 * pG) / 100);
        const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((a0 * pA) / 100);
        const gPlus = (Number(bonus.classicGuaranteed) || 0) + gPercent;
        return Math.max(0, g0 + gPlus);
      })();
  const additionalDamage = hasNewSchema
    ? adjustedDamageValues.reduce((sum, dv) => sum + (Number(dv?.additional_damage) || 0), 0)
    : (() => {
        const a0 = Number(levelData.danno_aggiuntivo ?? levelData.additional_damage ?? 0) || 0;
        const g0 = Number(levelData.danno_assicurato ?? levelData.guaranteed_damage ?? 0) || 0;
        const bonus = getDamageBonusTotalsForLegacy();
        const pG = Number(bonus.percentageGuaranteed) || 0;
        const pA = Number(bonus.percentageAdditional) || 0;
        const totalPctBonus = pG && !pA ? Math.floor(((g0 + a0) * pG) / 100) : 0;
        const gPercent = Math.floor((g0 * pG) / 100);
        const aPercent = pG && !pA ? (totalPctBonus - gPercent) : Math.floor((a0 * pA) / 100);
        const aPlus = (Number(bonus.classicAdditional) || 0) + aPercent;
        return Math.max(0, a0 + aPlus);
      })();
  const animaBonus = character?.totalStats?.anima || character?.baseStats?.anima || 0;
  
  // Gestisci effetti "per secondo" e "per proiettile"
  const secondsDuration = ability.secondsDuration || 1;
  const projectilesCount = ability.projectilesCount || 1;
  const actionsCount = ability.actionsCount || 1;
  const baseGuaranteedDamage = guaranteedDamage;
  const baseAdditionalDamage = additionalDamage;

  // Copie totali (secondi x proiettili), non moltiplica l'Anima
  const copies = Math.max(1, Number(secondsDuration)) * Math.max(1, Number(projectilesCount)) * Math.max(1, Number(actionsCount));
  
  // Moltiplica il danno base per le copie (solo assicurato e aggiuntivo, non l'anima)
  const finalGuaranteedDamage = baseGuaranteedDamage * copies;
  const finalAdditionalDamage = baseAdditionalDamage * copies;

  const scaledStats: string[] = Array.isArray((levelData as any)?.scaled_move_stats) ? (levelData as any).scaled_move_stats : [];
  const scaledSkills: string[] = Array.isArray((levelData as any)?.scaled_move_skills) ? (levelData as any).scaled_move_skills : [];
  const getScaledStatValue = (key: string) => {
    const k = String(key || '').trim();
    const v = (character?.totalStats?.[k] ?? character?.baseStats?.[k] ?? 0);
    return Number(v || 0) || 0;
  };
  const getScaledSkillValue = (key: string) => {
    const k = String(key || '').trim();
    return Number(character?.abilities?.[k] ?? 0) || 0;
  };
  const scaledMoveInputs = [
    ...(scaledStats || []).map((k) => ({ kind: 'stat' as const, key: String(k || '').trim(), value: getScaledStatValue(String(k || '').trim()) })),
    ...(scaledSkills || []).map((k) => ({ kind: 'skill' as const, key: String(k || '').trim(), value: getScaledSkillValue(String(k || '').trim()) })),
  ].filter(x => x.key && Number(x.value || 0) !== 0);
  const scaledMoveBaseSum = scaledMoveInputs.reduce((sum, x) => sum + (Number(x.value || 0) || 0), 0);
  const scaledMovePureTotalRaw = Math.floor(scaledMoveBaseSum * copies);
  const scaledMovePureTotal = scaledMovePureTotalRaw > 0 ? scaledMovePureTotalRaw : 0;

  // Danno crescente per secondo (puro): somma aritmetica inc * (1 + 2 + ... + N)
  const incPerSecond = Number(levelData?.increasing_damage_per_second || ability?.increasing_damage_per_second || 0) || 0;
  const seconds = Math.max(0, Number(secondsDuration) || 0);
  const increasingPerSecondPure = incPerSecond > 0 && seconds > 0
    ? Math.round(incPerSecond * (seconds * (seconds + 1) / 2))
    : 0;
  const incPerShot = Number(
    levelData?.damage_increasing_per_multiple_shots ||
    ability?.damage_increasing_per_multiple_shots ||
    ability?.increasing_damage_per_projectile ||
    0
  ) || 0;
  const shots = Math.max(0, Number(projectilesCount) || 0);
  const increasingPerShotPure = incPerShot > 0 && shots > 0
    ? Math.round(incPerShot * (shots * (shots + 1) / 2))
    : 0;
  const increasingPureTotal = increasingPerSecondPure + increasingPerShotPure;
  
  if (isCritical) {
    // Somma competenze come valore puro (senza tiri) nel critico
    let competenceTotal = 0;
    if (competences && competences.length > 0) {
      competences.forEach(comp => {
        const val = (comp?.current_level ?? comp?.value ?? 0);
        competenceTotal += Number(val) || 0;
      });
    }

    // Per danno critico, tutti i valori diventano puri
    const totalDamage = finalGuaranteedDamage + finalAdditionalDamage + competenceTotal + animaBonus + increasingPureTotal + scaledMovePureTotal;
    return {
      guaranteedDamage: finalGuaranteedDamage,
      additionalDamage: finalAdditionalDamage,
      competenceTotal,
      animaBonus,
      increasingPerSecondPure,
      increasingPerShotPure,
      increasingPureTotal,
      scaledMovePureTotal,
      scaledMoveInputs,
      scaledMoveCopies: copies,
      totalDamage,
      diceRolls: [], // Nessun tiro di dadi per il critico
      damageValuesAdjusted: adjustedDamageValues,
      secondsDuration,
      projectilesCount,
      actionsCount
    };
  } else {
    // Per danno normale: danno assicurato (puro) + danno aggiuntivo (tiro dadi) + competenze (dN) + anima (puro)
    let competenceResults = [];
    let competenceTotal = 0;
    
    if (competences && competences.length > 0) {
      competences.forEach(comp => {
        // Usa il valore della competenza come facce del dado (es: 5 => d5)
        const faces = comp.current_level || comp.value || 0;
        if (faces > 0) {
          const roll = Math.floor(Math.random() * faces) + 1;
          competenceResults.push({ dice: `d${faces}`, result: roll, name: comp.name });
          competenceTotal += roll;
        }
      });
    }
    
    // Danno aggiuntivo come tiro di dado se presente - somma per ciascun tipo e ciascuna copia
    let additionalDiceResults: Array<{dice: string, result: number, typeName?: string, copy?: number}> = [];
    let totalAdditionalDiceResult = 0;

    if (hasNewSchema) {
      // Per ogni voce in damage_values, tira per ciascuna copia
      adjustedDamageValues.forEach((dv) => {
        const sides = Number(dv?.additional_damage) || 0;
        if (sides > 0) {
          for (let i = 0; i < copies; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            totalAdditionalDiceResult += roll;
            additionalDiceResults.push({ dice: `d${sides}`, result: roll, typeName: (dv?.typeName || '').trim(), copy: i + 1 });
          }
        }
      });
    } else {
      if (finalAdditionalDamage > 0) {
        for (let i = 0; i < copies; i++) {
          const diceResult = Math.floor(Math.random() * Math.max(1, baseAdditionalDamage)) + 1;
          additionalDiceResults.push({ dice: `d${baseAdditionalDamage}`, result: diceResult, copy: i + 1 });
          totalAdditionalDiceResult += diceResult;
        }
      }
    }
    
    const totalDamage = finalGuaranteedDamage + totalAdditionalDiceResult + competenceTotal + animaBonus + increasingPureTotal + scaledMovePureTotal;

    const diceRolls = [] as any[];
    if (additionalDiceResults.length > 0) {
      additionalDiceResults.forEach((entry) => {
        diceRolls.push(entry);
      });
    }
    diceRolls.push(...competenceResults);
    
    return {
      guaranteedDamage: finalGuaranteedDamage,
      additionalDamage: totalAdditionalDiceResult,
      competenceTotal,
      animaBonus,
      increasingPerSecondPure,
      increasingPerShotPure,
      increasingPureTotal,
      scaledMovePureTotal,
      scaledMoveInputs,
      scaledMoveCopies: copies,
      totalDamage,
      diceRolls,
      damageValuesAdjusted: adjustedDamageValues,
      secondsDuration,
      projectilesCount,
      actionsCount
    };
  }
};

// Estrazione competenze dal database
export const extractCompetences = (character: any, category?: string) => {
  const competences: Array<{id: string, name: string, value: number}> = [];
  
  if (character.skills) {
    Object.entries(character.skills).forEach(([categoryKey, categorySkills]: [string, any]) => {
      if (!category || categoryKey === category) {
        Object.entries(categorySkills).forEach(([skillKey, skill]: [string, any]) => {
          if (skill.value > 0) {
            competences.push({
              id: skillKey,
              name: skill.name,
              value: skill.value
            });
          }
        });
      }
    });
  }
  
  return competences;
};

export const getDiceMaxValue = (type: string, level: number, damageValue?: number) => {
  switch (type) {
    case 'azioni': return getActionDiceValue(level);
    case 'danno': return damageValue || 100;
    case 'danno_critico': return 0; // Il critico non fa tiri, è una somma
    case 'percentuale': return 100;
    case 'tiro_libero': return damageValue || 20;
    default: return 20;
  }
};

export const getDiceTypeLabel = (type: string) => {
  switch (type) {
    case 'azioni': return 'Azioni';
    case 'danno': return 'Danno';
    case 'danno_critico': return 'Danno Critico';
    case 'percentuale': return 'Percentuale';
    case 'tiro_libero': return 'Tiro Libero';
    default: return type;
  }
};

export const createDummyCharacter = () => ({
  name: '',
  level: 1,
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
  potions: [],
  currency: {
    bronzo: 0,
    argento: 0,
    oro: 0,
    rosse: 0,
    bianche: 0
  },
  anomalies: [],
  skills: {},
  magic: {},
  custom_spells: [],
  custom_abilities: []
});
