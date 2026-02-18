import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { extractCompetences } from '@/utils/diceUtils';
import { StatSelectionDialogProps } from '@/types/dice';
import { supabase } from '@/integrations/supabase/client';
import { listEvocationInstancesByCharacter } from '@/integrations/supabase/evocationInstances';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import PostureSelectionModal from '@/components/posture/PostureSelectionModal';
import SpellSelectModal from '@/components/dice/SpellSelectModal';
import AbilitySelectModal from '@/components/dice/AbilitySelectModal';

const StatSelectionDialog: React.FC<StatSelectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  character,
  calculations,
  spellCooldowns,
  perTurnUses,
  activationOnly,
  activationPreset
}) => {
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState<boolean>(false);
  const [targetsTab, setTargetsTab] = useState<'all' | 'characters' | 'enemies' | 'evocations'>('all');
  const [targetsSearchQuery, setTargetsSearchQuery] = useState<string>('');
  const [publicCharacters, setPublicCharacters] = useState<any[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [evocations, setEvocations] = useState<any[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<Array<{ type: 'characters' | 'enemies' | 'evocations'; id: string; name: string }>>([]);
  const [compileDamage, setCompileDamage] = useState<boolean>(false);
  const [damageSource, setDamageSource] = useState<'equipment' | 'magic' | 'ability' | ''>('');
  const [selectedWeapon, setSelectedWeapon] = useState<any>(null);
  const [weaponDamageType, setWeaponDamageType] = useState<string>('');
  const [selectedArrow, setSelectedArrow] = useState<any>(null);
  const [selectedSpell, setSelectedSpell] = useState<any>(null);
  // Selettore grado interno della magia (1 = base livello, >=2 = gradi aggiuntivi)
  const [selectedSpellGradeNumber, setSelectedSpellGradeNumber] = useState<number>(1);
  const [selectedAbility, setSelectedAbility] = useState<any>(null);
  // Trigger UI: scelte interattive per magie
  const [selectedDpsSeconds, setSelectedDpsSeconds] = useState<number>(0);
  const [selectedShotsCount, setSelectedShotsCount] = useState<number>(0);
  const [selectedPaConsumption, setSelectedPaConsumption] = useState<number>(0);
  const [lotteryUserChoices, setLotteryUserChoices] = useState<number[]>([]);
  // Nuovi stati: competenza bonus, anima, extra narrazione
  const [bonusCompetenceType, setBonusCompetenceType] = useState<'none' | 'assassinio' | 'contrattacco'>('none');
  const [assassinioMultiplier, setAssassinioMultiplier] = useState<number>(1);
  const [includeAnimaInDamage, setIncludeAnimaInDamage] = useState<boolean>(false);
  // Sostituisco gli stati singoli per extra con un array di extra multipli
  const [extras, setExtras] = useState<Array<{ id: string; type: 'ability' | 'magic'; item: any }>>([]);
  // Aggiunta: stato e opzioni competenze danno
  const [selectedDamageCompetences, setSelectedDamageCompetences] = useState<string[]>([]);
  const [directDamageEnabled, setDirectDamageEnabled] = useState<boolean>(false);
  const [isPostureModalOpen, setIsPostureModalOpen] = useState(false);
  const [selectedPostureIdLocal, setSelectedPostureIdLocal] = useState<string | null>(null);
  const [selectedPostureNameLocal, setSelectedPostureNameLocal] = useState<string>('');
  const [isSpellModalOpen, setIsSpellModalOpen] = useState(false);
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const damageCompetenceOptions = [
    { id: 'spada', label: 'Spada' },
    { id: 'coltello', label: 'Coltello' },
    { id: 'ascia', label: 'Ascia' },
    { id: 'mazza', label: 'Mazza' },
    { id: 'frusta', label: 'Frusta' },
    { id: 'falce', label: 'Falce' },
    { id: 'tirapugni', label: 'Tirapugni' },
    { id: 'bastone', label: 'Bastone' },
    { id: 'armi_inastate', label: 'Armi inastate' },
    { id: 'scudo', label: 'Scudo' },
    { id: 'arco', label: 'Arco' },
    { id: 'balestra', label: 'Balestra' },
    { id: 'fionda', label: 'Fionda' },
    { id: 'da_lancio', label: 'Da lancio' },
    { id: 'da_fuoco', label: 'Da fuoco' },
    { id: 'pesante', label: 'Pesante' },
  ];
  const handleDamageCompetenceToggle = (id: string) => {
    setSelectedDamageCompetences(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  // Derived lists
  const weapons = React.useMemo(() => {
    try {
      if (!character) return [];

      const list: any[] = [];

      const pushIfWeapon = (item: any) => {
        if (!item) return;
        const type = String(item?.type || '').toLowerCase().trim();
        const subtype = String(item?.subtype || '').toLowerCase().trim();
        const category = String((item as any)?.data?.weapon_type_category || '').toLowerCase().trim();

        const weaponSubtypes = new Set(['una_mano', 'due_mani', 'arma_laterale', 'arma_distanza']);
        const isWeapon = (
          type === 'arma' || type === 'weapon' ||
          weaponSubtypes.has(subtype) ||
          category === 'mischia' || category === 'distanza'
        );
        if (isWeapon) list.push(item);
      };

      // Leggi SOLO da character.equipment
      const eq = (character as any)?.equipment;
      if (Array.isArray(eq)) {
        eq.forEach(pushIfWeapon);
      } else if (eq && typeof eq === 'object') {
        // Oggetto indicizzato ("0","1","2") o struttura {weapon, armor}
        const values = Object.values(eq);
        values.forEach(pushIfWeapon);
        if ((eq as any).weapon) pushIfWeapon((eq as any).weapon);
      }

      // Deduplica conservativa per id+name
      const seen = new Set<string>();
      const deduped = list.filter((w) => {
        const key = `${w?.id ?? ''}|${w?.name ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return deduped.filter(Boolean);
    } catch {
      return [];
    }
  }, [character]);
  
  const arrows = React.useMemo(() => {
    const normalizeDamageSet = (s: any) => ({
      ...s,
      guaranteed_damage: s?.guaranteed_damage ?? s?.guaranteedDamage ?? 0,
      additional_damage: s?.additional_damage ?? s?.additionalDamage ?? 0,
      effect_name: s?.effect_name ?? s?.effectName ?? s?.name ?? 'Effetto'
    });

    const baseArrows = Array.isArray((character as any)?.arrows) ? (character as any).arrows : [];
    const magicQuiverArrows = Array.isArray((character as any)?.magic_quivers)
      ? (character as any).magic_quivers.map((mq: any) => ({
          id: String(mq.id),
          name: mq.name,
          description: mq.description,
          warnings: mq.warnings,
          action_points_cost: mq.action_points_cost ?? mq.actionPointsCost ?? 0,
          indicative_action_points_cost: mq.indicative_action_points_cost ?? mq.indicativeActionPointsCost ?? 0,
          damage_sets: Array.isArray(mq.damage_sets) ? mq.damage_sets.map(normalizeDamageSet) : [],
          anomalies: Array.isArray(mq.anomalies) ? mq.anomalies : [],
          __source: 'magic_quiver'
        }))
      : [];
    // Arricchisci con campi derivati (damage, label sintetico) per visualizzazione e calcolo
    const decorateArrow = (a: any) => {
      try {
        const sets = Array.isArray((a as any)?.damage_sets) ? (a as any).damage_sets : [];
        const guaranteed = Array.isArray(sets) && sets.length > 0
          ? sets.reduce((sum: number, s: any) => sum + (Number(s?.guaranteed_damage || 0)), 0)
          : Number((a as any)?.damage || 0) || 0;
        const additional = Array.isArray(sets) && sets.length > 0
          ? sets.reduce((sum: number, s: any) => sum + (Number(s?.additional_damage || 0)), 0)
          : 0;
        const display = (additional > 0 || guaranteed > 0)
          ? `d${Math.max(0, additional)} + ${Math.max(0, guaranteed)}`
          : undefined;
        return { ...a, damage: guaranteed, __damage_display: display };
      } catch {
        return { ...a };
      }
    };
    return [...baseArrows, ...magicQuiverArrows].map(decorateArrow);
  }, [character]);
  
  const spells = React.useMemo(() => {
    const list = Array.isArray((character as any)?.custom_spells) ? (character as any).custom_spells : [];
    return list.filter((s: any) => String(s?.type || '').toLowerCase() !== 'passiva');
  }, [character]);
  const sortedSpells = React.useMemo(() => {
    try {
      return [...spells].sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }));
    } catch {
      return spells;
    }
  }, [spells]);
  
  const abilitiesList = React.useMemo(() => {
    const list = Array.isArray((character as any)?.custom_abilities) ? (character as any).custom_abilities : [];
    return list.filter((a: any) => String(a?.type || '').toLowerCase() !== 'passiva');
  }, [character]);
  useEffect(() => {
    try {
      const active = abilitiesList.find((a: any) =>
        (a?.category === 'Posture' || a?.category === 'Tecnico' || a?.subcategory === 'Posture') && a?.is_active
      ) || null;
      setSelectedPostureIdLocal(active ? String(active.id) : null);
      setSelectedPostureNameLocal(active ? String(active.name || '') : '');
    } catch {
      setSelectedPostureIdLocal(null);
      setSelectedPostureNameLocal('');
    }
  }, [abilitiesList]);
  
  // Helper: traduci forma del danno
  const translateDamageShape = (shape?: string) => {
    if (!shape) return '';
    switch (shape) {
      case 'single': return 'Singolo';
      case 'area': return 'Area';
      default: return shape;
    }
  };

  // Helper: etichetta leggibile per statistiche
  const prettyStatLabel = (key: string): string => {
    const map: Record<string, string> = {
      'forza': 'Forza',
      'percezione': 'Percezione',
      'resistenza': 'Resistenza',
      'intelletto': 'Intelletto',
      'agilità': 'Agilità',
      'agilita': 'Agilità',
      'sapienza': 'Sapienza',
      'anima': 'Anima',
    };
    const normalized = (key || '').toString().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
    const lowered = normalized.toLowerCase();
    if (map[lowered]) return map[lowered];
    return lowered.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Helper: estrai info livello e nuovi danni da magia
  const getSpellLevelInfo = React.useCallback((spell: any) => {
    if (!spell) return null;
    const levelNum = Number(spell?.current_level) || Number(spell?.level) || Number(spell?.levels?.[0]?.level) || 1;
    // Trova il livello corrente o il primo disponibile
    const levelObj = Array.isArray(spell?.levels)
      ? (spell.levels.find((l: any) => Number(l.level) === levelNum) || spell.levels[0])
      : spell;

    // Se è stato selezionato un grado interno (>=2) e il livello ha dei gradi, usa quello come sorgente dati
    const gradesArr = Array.isArray((levelObj as any)?.grades) ? (levelObj as any).grades : [];
    const desiredGradeNumber = Number(selectedSpellGradeNumber || 1);
    // Per i gradi > 1, non ricadere sul livello base: i valori devono essere indipendenti.
    const levelData = (gradesArr.length > 0 && desiredGradeNumber > 1)
      ? (gradesArr.find((g: any) => Number(g?.grade_number || 0) === desiredGradeNumber)
          // fallback su indice relativo (se manca grade_number), ma NON sul livello base
          || gradesArr[Math.max(0, desiredGradeNumber - 2)]
        )
      : levelObj;

    // Se è un grado > 1 senza dati, evitare di usare fallback ai valori della magia/level base
    const useBaseFallback = !(desiredGradeNumber > 1);

    const extractPhases = (src: any) => {
      if (!src) return [];
      const direct = Array.isArray(src?.phases) ? src.phases : [];
      if (direct.length > 0) return direct;
      const out: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const enabled = !!(src as any)?.[`phase${i}_enabled`];
        if (!enabled) continue;
        out.push({
          name: `Fase ${i}`,
          guaranteed_damage: Number((src as any)?.[`phase${i}_guaranteed_damage`] ?? 0) || 0,
          additional_damage: Number((src as any)?.[`phase${i}_additional_damage`] ?? 0) || 0,
        });
      }
      return out;
    };

    const phases = extractPhases(levelData);
    const phaseAttackEnabled = !!(
      (levelData as any)?.phase_attack_enabled ||
      (levelData as any)?.phaseAttackEnabled ||
      phases.length > 0 ||
      (levelData as any)?.phase1_enabled ||
      (levelData as any)?.phase2_enabled ||
      (levelData as any)?.phase3_enabled
    );
    const effectiveLevelData = levelData;

    const damageValues = Array.isArray(effectiveLevelData?.damage_values) ? effectiveLevelData.damage_values : [];
    const totals = damageValues.reduce((acc: any, v: any) => {
      acc.guaranteed += Number(v?.guaranteed_damage || 0);
      acc.additional += Number(v?.additional_damage || 0);
      return acc;
    }, { guaranteed: 0, additional: 0 });

    // Somma anche i set di self-damage, se presenti
    const selfSets = Array.isArray((levelData as any)?.self?.damage_sets)
      ? ((levelData as any).self.damage_sets as any[])
      : (Array.isArray(levelData?.self_damage_sets) ? (levelData.self_damage_sets as any[]) : []);
    const toNum = (v: any): number => {
      if (typeof v === 'number') return v;
      const s = String(v ?? '').trim().replace(',', '.');
      const m = s.match(/-?\d+(?:\.\d+)?/);
      return m ? parseFloat(m[0]) : 0;
    };
    const selfTotals = selfSets.reduce((acc: any, s: any) => {
      acc.guaranteed += toNum((s as any)?.guaranteed_damage ?? 0);
      acc.additional += toNum((s as any)?.max_damage ?? 0);
      return acc;
    }, { guaranteed: 0, additional: 0 });

    // Fallback legacy: singolo valore self_damage (solo garantito)
    const legacySelfEnabled = !!(effectiveLevelData?.self_damage_enabled || effectiveLevelData?.self_effect_enabled || (useBaseFallback ? spell?.self_damage_enabled : false));
    const legacySelfValue = toNum(effectiveLevelData?.self_damage ?? (useBaseFallback ? spell?.self_damage : 0));

    const guaranteed = effectiveLevelData?.guaranteed_damage ?? effectiveLevelData?.danno_assicurato ?? (useBaseFallback ? (spell?.guaranteed_damage ?? 0) : 0);
    const additional = effectiveLevelData?.additional_damage ?? effectiveLevelData?.danno_aggiuntivo ?? (useBaseFallback ? (spell?.additional_damage ?? 0) : 0);

    const actionCost = effectiveLevelData?.action_cost ?? effectiveLevelData?.punti_azione ?? (useBaseFallback ? (spell?.action_cost ?? effectiveLevelData?.indicative_action_cost ?? spell?.indicative_action_cost) : (effectiveLevelData?.indicative_action_cost ?? 0));

    return {
      levelNum,
      levelData: effectiveLevelData,
      damageValues,
      hasDamageValues: damageValues.length > 0,
      guaranteedTotal: (totals.guaranteed > 0 ? totals.guaranteed : Number(guaranteed || 0)) + selfTotals.guaranteed + (legacySelfEnabled ? legacySelfValue : 0),
      additionalTotal: (totals.additional > 0 ? totals.additional : Number(additional || 0)) + selfTotals.additional,
      actionCost,
      isPhaseAttack: phaseAttackEnabled && phases.length > 0,
      phases
    };
  }, [selectedSpellGradeNumber]);
  const isRangedWeapon = React.useMemo(() => {
    return selectedWeapon?.subtype === 'arma_distanza' || selectedWeapon?.type === 'arma_distanza';
  }, [selectedWeapon]);
  
  // Valore Anima totale da mostrare accanto al toggle
  const animaTotal = calculations?.totalStats?.anima ?? (character as any)?.baseStats?.anima ?? 0;
  const stats = [
    { key: 'forza', name: 'Forza' },
    { key: 'percezione', name: 'Percezione' },
    { key: 'resistenza', name: 'Resistenza' },
    { key: 'intelletto', name: 'Intelletto' },
    { key: 'agilita', name: 'Agilità' },
    { key: 'sapienza', name: 'Sapienza' },
    { key: 'anima', name: 'Anima' }
  ];
  
  // Competenze specifiche richieste per i tiri azione
  const actionCompetences = [
    { key: 'schivata', name: 'Schivata' },
    { key: 'parata', name: 'Parata' },
    { key: 'deviazione', name: 'Deviazione' },
    { key: 'contrattacco', name: 'Contrattacco' },
    { key: 'precisione', name: 'Precisione' },
    { key: 'logica', name: 'Logica' },
    { key: 'trappole', name: 'Trappole' },
    { key: 'alchimia', name: 'Alchimia' },
    { key: 'fabbro', name: 'Fabbro' },
    { key: 'survivalista', name: 'Survivalista' },
    { key: 'furtivita', name: 'Furtività' },
    { key: 'assassinio', name: 'Assassinio' },
    { key: 'furto', name: 'Furto' },
    { key: 'saccheggio', name: 'Saccheggio' }
  ];
  
  // Filtra le competenze disponibili dal personaggio
  const availableCompetences = actionCompetences.filter(comp => {
    const value = character?.abilities?.[comp.key] || 0;
    return value > 0;
  }).map(comp => ({
    id: comp.key,
    name: comp.name,
    value: character?.abilities?.[comp.key] || 0
  }));
  
  const handleCompetenceToggle = (competenceId: string) => {
    setSelectedCompetences(prev => 
      prev.includes(competenceId) 
        ? prev.filter(id => id !== competenceId)
        : [...prev, competenceId]
    );
  };
  
  const toBool = (v: any) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }
    return false;
  };

  const handleActivationOnlyConfirm = () => {
    const preset = activationPreset as any;
    if (!preset?.item) return;
    const removedAnomalies = (() => {
      try {
        if (preset.type === 'magic') {
          const info = getSpellLevelInfo(preset.item);
          const lvl = info?.levelData || {};
          return Array.isArray((lvl as any)?.removed_anomalies) ? (lvl as any).removed_anomalies : [];
        }
        const item = preset.item;
        const levelNum = Number(item?.current_level ?? item?.currentLevel ?? item?.level ?? 1) || 1;
        const levels = Array.isArray(item?.levels) ? item.levels : [];
        const lvl = levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || item || {};
        return Array.isArray((lvl as any)?.removed_anomalies) ? (lvl as any).removed_anomalies : [];
      } catch {
        return [];
      }
    })();
    const payload: any = {
      selectedStat: '',
      selectedCompetences: [],
      target: { type: 'none' },
      targets: [],
      damage: preset.type === 'magic'
        ? { source: 'magic', spell: preset.item, triggers: { removedAnomalies } }
        : { source: 'ability', ability: preset.item, triggers: { removedAnomalies } },
      selectedPostureId: selectedPostureIdLocal,
      selectedPostureName: selectedPostureNameLocal,
    };
    (onConfirm as any)(payload);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedStat) {
      const selectedCompetenceData = availableCompetences.filter(c => 
        selectedCompetences.includes(c.id)
      );
      const targetsInfo = (selectedTargets || []).map(t => ({ type: t.type, id: t.id, name: t.name }));
      const mapDamageType = (t: string) => {
        if (!t) return '';
        return t === 'leggero' ? 'veloce' : t;
      };
      
      const bonusCompetence =
        bonusCompetenceType === 'none'
          ? null
          : (() => {
              const contrattaccoVal = Number((character as any)?.abilities?.contrattacco) || 0;
              const assassinioVal = Number((character as any)?.abilities?.assassinio) || 0;
              if (bonusCompetenceType === 'assassinio') {
                return { type: 'assassinio', value: assassinioVal, multiplier: Number(assassinioMultiplier) || 1 };
              }
              return { type: 'contrattacco', value: contrattaccoVal };
            })();

      // Nuovo: payload multiplo per extra
      const extrasPayload = extras.filter(x => x.item).map(x => ({ type: x.type, item: x.item }));

      const damagePayload = compileDamage ? (
        damageSource === 'equipment' && selectedWeapon
          ? {
              source: 'equipment',
              weapon: selectedWeapon,
              damageType: mapDamageType(weaponDamageType),
              arrow: isRangedWeapon ? selectedArrow : null,
              consumeArrow: isRangedWeapon && !!selectedArrow,
              competences: selectedDamageCompetences,
              bonusCompetence,
              includeAnima: includeAnimaInDamage,
              // compat: primo extra singolo + lista completa
              extra: extrasPayload[0] || null,
              extras: extrasPayload,
            }
          : damageSource === 'magic' && selectedSpell
            ? (() => {
                const info = getSpellLevelInfo(selectedSpell);
                const lvl = info?.levelData || {};
                const shape = String(lvl?.damage_shape || selectedSpell?.damage_shape || '').trim();
                const maxTargets = Number(lvl?.max_targets || selectedSpell?.max_targets || 0) || undefined;
                // Regole bersagli (Usodadi)
                const targetsRule = (() => {
                  const s = shape.toLowerCase();
                  if (s.includes('area') || s.includes('cono')) {
                    return { type: s.includes('cono') ? 'cone' : 'area', unlimited: true };
                  }
                  if (s.includes('catena')) {
                    return { type: 'chain', unlimited: false, maxTargets: maxTargets };
                  }
                  return { type: 'single', unlimited: false, maxTargets: maxTargets || 1 };
                })();

                // Tiri multipli (Usodadi)
                const maxMultipleShotsRaw = Number(
                  (lvl as any)?.max_multiple_attacks ||
                  (selectedSpell as any)?.max_multiple_attacks ||
                  (lvl as any)?.max_projectiles ||
                  (selectedSpell as any)?.max_projectiles ||
                  0
                ) || 0;
                const multipleShotsEnabled = maxMultipleShotsRaw > 0;
                const maxMultipleShots = multipleShotsEnabled ? maxMultipleShotsRaw : undefined;
                const increasePerShot = Number(lvl?.damage_increasing_per_multiple_shots || selectedSpell?.damage_increasing_per_multiple_shots || 0) || 0;

                // Danno al secondo (Usodadi)
                const maxSecondsRaw = Number(lvl?.max_seconds || selectedSpell?.max_seconds || 0) || 0;
                const paCostPerSecondRaw = Number(lvl?.pa_cost_per_second || selectedSpell?.pa_cost_per_second || 0) || 0;
                const increasePerSecond = Number(lvl?.increasing_damage_per_second || selectedSpell?.increasing_damage_per_second || 0) || 0;
                const maxSeconds = maxSecondsRaw || undefined;
                const dpsEnabled = (maxSecondsRaw > 0) || (paCostPerSecondRaw > 0) || (increasePerSecond > 0);

                // Usa danno arma (Usodadi)
                const useWeaponDamage = !!(lvl?.use_weapon_damage || selectedSpell?.use_weapon_damage);

                // Blocco a turni (Usodadi)
                const usageEveryNTurnsEnabled = !!(lvl?.usage_every_n_turns_enabled || selectedSpell?.usage_every_n_turns_enabled);
                const usageEveryNTurns = Number(lvl?.usage_every_n_turns || selectedSpell?.usage_every_n_turns || 0) || 0;

                const activationDelayTurns = Number((lvl as any)?.activation_delay_turns ?? (selectedSpell as any)?.activation_delay_turns ?? 0) || 0;
                const launchDelayEnabled = activationDelayTurns > 0;

                // Danni self (Usodadi)
                const selfDamageEnabled = !!(lvl?.self_damage_enabled || selectedSpell?.self_damage_enabled);
                const selfDamage = lvl?.self_damage ?? selectedSpell?.self_damage ?? null;

                // Impiego PA (Usodadi) — supporta alias extra_action_cost/indicative_action_cost
                const maxPaInvestment = Number(
                  (lvl as any)?.max_pa_investment ??
                  (selectedSpell as any)?.max_pa_investment ??
                  (lvl as any)?.extra_action_cost ??
                  (selectedSpell as any)?.extra_action_cost ??
                  (lvl as any)?.indicative_action_cost ??
                  (selectedSpell as any)?.indicative_action_cost ??
                  0
                ) || 0;
                const damageIncreasePerPaEnabled = !!(lvl?.damageIncreasePerPaEnabled || (selectedSpell as any)?.damageIncreasePerPaEnabled);
                const increaseDamagePerPa = Number(
                  lvl?.increasing_damage_per_pa ||
                  (selectedSpell as any)?.increasing_damage_per_pa ||
                  (selectedSpell as any)?.increase_damage_per_pa ||
                  0
                ) || 0;
                const successRollIncreaseEveryPa = Number(
                  (lvl as any)?.success_roll_increase_every_pa ||
                  (selectedSpell as any)?.success_roll_increase_every_pa ||
                  0
                ) || 0;
                const explicitPaFlag = !!(lvl?.paInvestmentEnabled || (selectedSpell as any)?.paInvestmentEnabled);
                const paInvestmentEnabled = explicitPaFlag || (maxPaInvestment > 0) || damageIncreasePerPaEnabled || (increaseDamagePerPa > 0) || (successRollIncreaseEveryPa > 0);

                return {
                  source: 'magic',
                  spell: selectedSpell,
                  bonusCompetence,
                  includeAnima: includeAnimaInDamage,
                  extra: extrasPayload[0] || null,
                  extras: extrasPayload,
                  // Se la magia consente il danno arma, includi i dettagli selezionati
                  ...(useWeaponDamage && selectedWeapon ? {
                    weaponForDamage: selectedWeapon,
                    weaponDamageType: mapDamageType(weaponDamageType),
                    arrowForDamage: isRangedWeapon ? selectedArrow : null,
                    consumeArrowForDamage: isRangedWeapon && !!selectedArrow,
                    weaponCompetences: selectedDamageCompetences,
                  } : {}),
                  triggers: {
                    targets: targetsRule,
                    multipleShots: {
                      enabled: multipleShotsEnabled,
                      maxShots: maxMultipleShots,
                      selectedShots: multipleShotsEnabled
                        ? (maxMultipleShots > 0
                          ? Math.min(Math.max(0, Number(selectedShotsCount || 0)), maxMultipleShots)
                          : Math.max(0, Number(selectedShotsCount || 0)))
                        : 0,
                      increasePerShot,
                    },
                    damagePerSecond: {
                      enabled: dpsEnabled,
                      maxSeconds,
                      selectedSeconds: dpsEnabled ? (maxSeconds ? Math.min(Math.max(0, Number(selectedDpsSeconds || 0)), maxSeconds) : Math.max(0, Number(selectedDpsSeconds || 0))) : 0,
                      paCostPerSecond: paCostPerSecondRaw,
                      increasePerSecond,
                    },
                    useWeaponDamage: {
                      enabled: useWeaponDamage,
                    },
                    usageEveryNTurns: {
                      enabled: usageEveryNTurnsEnabled,
                      turns: usageEveryNTurns,
                    },
                    launchDelay: {
                      enabled: launchDelayEnabled,
                      turns: activationDelayTurns,
                    },
                    selfDamage: {
                      enabled: selfDamageEnabled,
                      value: selfDamage,
                    },
                    actionPoints: {
                      enabled: paInvestmentEnabled,
                      max: maxPaInvestment,
                      selected: paInvestmentEnabled
                        ? (maxPaInvestment > 0
                          ? Math.min(Math.max(0, Number(selectedPaConsumption || 0)), maxPaInvestment)
                          : Math.max(0, Number(selectedPaConsumption || 0)))
                        : 0,
                      damageIncreasePerPa: {
                        enabled: damageIncreasePerPaEnabled,
                        rate: increaseDamagePerPa,
                        // Formula (da applicare a valle): Danni * (rate ^ selected)
                      }
                    },
                    lottery: (() => {
                      const faces = Number((lvl as any)?.lottery_dice_faces ?? (selectedSpell as any)?.lottery_dice_faces ?? 0) || 0;
                      const count = Number((lvl as any)?.lottery_numeric_choices ?? (selectedSpell as any)?.lottery_numeric_choices ?? 0) || 0;
                      const enabled = toBool((lvl as any)?.lottery_enabled ?? (selectedSpell as any)?.lottery_enabled);
                      const values = lotteryUserChoices.slice(0, count).map((v) => {
                        const n = Number(v) || 0;
                        const min = 1;
                        const max = faces > 0 ? faces : Number.POSITIVE_INFINITY;
                        return Math.min(Math.max(min, n), max);
                      });
                      const df = enabled ? faces : 0;
                      const nc = enabled ? count : 0;
                      const u = enabled ? values : [];
                      return { enabled, diceFaces: df, numericChoices: nc, userChoices: u };
                    })(),
                    removedAnomalies: Array.isArray((lvl as any)?.removed_anomalies) ? (lvl as any).removed_anomalies : [],
                  }
                };
              })()
            : damageSource === 'ability' && selectedAbility
              ? (() => {
                  const lvl = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                  const shape = String(lvl?.damage_shape || (selectedAbility as any)?.damage_shape || '').trim();
                  const maxTargets = Number(lvl?.max_targets || (selectedAbility as any)?.max_targets || 0) || undefined;
                  const targetsRule = (() => {
                    const s = shape.toLowerCase();
                    if (s.includes('area') || s.includes('cone')) return { type: s.includes('cone') ? 'cone' : 'area', unlimited: true };
                    if (s.includes('chain')) return { type: 'chain', unlimited: false, maxTargets };
                    return { type: 'single', unlimited: false, maxTargets: (maxTargets && maxTargets > 0) ? maxTargets : 1 };
                  })();

                  const maxMultipleShotsRaw = Number(
                    (lvl as any)?.max_multiple_attacks ??
                    (selectedAbility as any)?.max_multiple_attacks ??
                    (lvl as any)?.max_projectiles ??
                    (selectedAbility as any)?.max_projectiles ??
                    0
                  ) || 0;
                  const multipleShotsEnabled = maxMultipleShotsRaw > 0;
                  const maxMultipleShots = multipleShotsEnabled ? maxMultipleShotsRaw : undefined;
                  const increasePerShot = Number(
                    (lvl as any)?.damage_increasing_per_multiple_shots ??
                    (selectedAbility as any)?.damage_increasing_per_multiple_shots ??
                    (lvl as any)?.increasing_damage_per_projectile ??
                    (selectedAbility as any)?.increasing_damage_per_projectile ??
                    0
                  ) || 0;

                  const maxSecondsRaw = Number(lvl?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0;
                  const paCostPerSecondRaw = Number(lvl?.pa_cost_per_second || (selectedAbility as any)?.pa_cost_per_second || 0) || 0;
                  const increasePerSecond = Number(lvl?.increasing_damage_per_second || (selectedAbility as any)?.increasing_damage_per_second || 0) || 0;
                  const maxSeconds = maxSecondsRaw || undefined;
                  const dpsEnabled = (maxSecondsRaw > 0) || (paCostPerSecondRaw > 0) || (increasePerSecond > 0);

                  const useWeaponDamage = !!(lvl?.use_weapon_damage || (selectedAbility as any)?.use_weapon_damage);

                  const usageTurns = Number(lvl?.usage_interval_turns || (selectedAbility as any)?.usage_interval_turns || 0) || 0;
                  const usageEveryNTurnsEnabled = usageTurns > 0;

                  const activationDelayTurns = Number((lvl as any)?.activation_delay_turns ?? (selectedAbility as any)?.activation_delay_turns ?? 0) || 0;
                  const launchDelayEnabled = activationDelayTurns > 0;

                  const selfDamageEnabled = !!(lvl?.self_effect_enabled || (selectedAbility as any)?.self_effect_enabled);
                  const selfDamage = (lvl as any)?.self_damage ?? (selectedAbility as any)?.self_damage ?? null;

                  const maxPaInvestment = Number(
                    (lvl as any)?.max_pa_investment ??
                    (selectedAbility as any)?.max_pa_investment ??
                    0
                  ) || 0;
                  const damageIncreasePerPaEnabled = !!((lvl as any)?.damageIncreasePerPaEnabled || (selectedAbility as any)?.damageIncreasePerPaEnabled);
                  const increaseDamagePerPa = Number(
                    (lvl as any)?.increasing_damage_per_pa ??
                    (selectedAbility as any)?.increasing_damage_per_pa ??
                    0
                  ) || 0;
                  const successRollIncreaseEveryPa = Number(
                    (lvl as any)?.success_roll_increase_every_pa ??
                    (selectedAbility as any)?.success_roll_increase_every_pa ??
                    0
                  ) || 0;
                  const explicitAbilityPaFlag = !!((lvl as any)?.paInvestmentEnabled || (selectedAbility as any)?.paInvestmentEnabled);
                  const paInvestmentEnabled = explicitAbilityPaFlag || (maxPaInvestment > 0) || damageIncreasePerPaEnabled || (increaseDamagePerPa > 0) || (successRollIncreaseEveryPa > 0);

                  const baseObj: any = {
                    source: 'ability',
                    ability: selectedAbility,
                    bonusCompetence,
                    includeAnima: includeAnimaInDamage,
                    extra: extrasPayload[0] || null,
                    extras: extrasPayload,
                    triggers: {
                      targets: targetsRule,
                      multipleShots: {
                        enabled: multipleShotsEnabled,
                        maxShots: maxMultipleShots,
                        selectedShots: multipleShotsEnabled
                          ? (maxMultipleShotsRaw > 0 ? Math.min(Math.max(0, Number(selectedShotsCount || 0)), maxMultipleShotsRaw) : Math.max(0, Number(selectedShotsCount || 0)))
                          : 0,
                        increasePerShot,
                      },
                      damagePerSecond: {
                        enabled: dpsEnabled,
                        maxSeconds,
                        selectedSeconds: dpsEnabled ? (maxSeconds ? Math.min(Math.max(0, Number(selectedDpsSeconds || 0)), maxSeconds) : Math.max(0, Number(selectedDpsSeconds || 0))) : 0,
                        paCostPerSecond: paCostPerSecondRaw,
                        increasePerSecond,
                      },
                      useWeaponDamage: { enabled: useWeaponDamage },
                      usageEveryNTurns: { enabled: usageEveryNTurnsEnabled, turns: usageTurns },
                      launchDelay: { enabled: launchDelayEnabled, turns: activationDelayTurns },
                      selfDamage: { enabled: selfDamageEnabled, value: selfDamage },
                      actionPoints: {
                        enabled: paInvestmentEnabled,
                        max: maxPaInvestment,
                        selected: paInvestmentEnabled
                          ? (maxPaInvestment > 0 ? Math.min(Math.max(0, Number(selectedPaConsumption || 0)), maxPaInvestment) : Math.max(0, Number(selectedPaConsumption || 0)))
                          : 0,
                        damageIncreasePerPa: {
                          enabled: damageIncreasePerPaEnabled,
                          rate: increaseDamagePerPa,
                        }
                      },
                      lottery: (() => {
                        const faces = Number((lvl as any)?.lottery_dice_faces ?? (selectedAbility as any)?.lottery_dice_faces ?? 0) || 0;
                        const count = Number((lvl as any)?.lottery_numeric_choices ?? (selectedAbility as any)?.lottery_numeric_choices ?? 0) || 0;
                        const enabled = toBool((lvl as any)?.lottery_enabled ?? (selectedAbility as any)?.lottery_enabled);
                        const values = lotteryUserChoices.slice(0, count).map((v) => {
                          const n = Number(v) || 0;
                          const min = 1;
                          const max = faces > 0 ? faces : Number.POSITIVE_INFINITY;
                          return Math.min(Math.max(min, n), max);
                        });
                        return { enabled, diceFaces: enabled ? faces : 0, numericChoices: enabled ? count : 0, userChoices: enabled ? values : [] };
                      })(),
                      removedAnomalies: Array.isArray((lvl as any)?.removed_anomalies) ? (lvl as any).removed_anomalies : [],
                    }
                  };

                  if (useWeaponDamage && selectedWeapon) {
                    baseObj.weaponForDamage = selectedWeapon;
                    baseObj.weaponDamageType = mapDamageType(weaponDamageType);
                    baseObj.arrowForDamage = isRangedWeapon ? selectedArrow : null;
                    baseObj.consumeArrowForDamage = isRangedWeapon && !!selectedArrow;
                    baseObj.weaponCompetences = selectedDamageCompetences;
                  }

                  return baseObj;
                })()
              : null
      ) : null;

      (onConfirm as any)({
        selectedStat: selectedStat,
        selectedCompetences: selectedCompetenceData,
        // compat: manteniamo anche il singolo target come primo della lista
        target: (targetsInfo && targetsInfo.length > 0) ? targetsInfo[0] : { type: 'none' },
        targets: targetsInfo,
        damage: {
          ...damagePayload,
          directApply: (() => {
            const effects: any[] = [];
            if (directDamageEnabled) {
              if (damageSource === 'equipment' && selectedWeapon) {
                const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                  ? (selectedWeapon as any).data.damage_sets
                  : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                for (const ds of (sets || [])) {
                  effects.push({
                    name: ds?.effect_name || 'Generico',
                    affects_action_points: false,
                    affects_health: false,
                    affects_armor: false,
                    affects_classic_damage: true,
                    bonus_effects: Array.isArray((ds as any)?.bonus_effects) ? (ds as any).bonus_effects : []
                  });
                }
                if (selectedArrow && Array.isArray((selectedArrow as any)?.damage_sets)) {
                  for (const ds of ((selectedArrow as any).damage_sets as any[])) {
                    effects.push({
                      name: ds?.effect_name || 'Generico',
                      affects_action_points: false,
                      affects_health: false,
                      affects_armor: false,
                      affects_classic_damage: true,
                      bonus_effects: Array.isArray((ds as any)?.bonus_effects) ? (ds as any).bonus_effects : []
                    });
                  }
                }
              }
              if (damageSource === 'magic' && selectedSpell) {
                const info = getSpellLevelInfo(selectedSpell);
                const vals: any[] = Array.isArray((info as any)?.damageValues) ? (info as any).damageValues : [];
                for (const v of (vals || [])) {
                  effects.push({
                    name: v?.typeName || v?.name || 'Generico',
                    affects_action_points: false,
                    affects_health: false,
                    affects_armor: false,
                    affects_classic_damage: true,
                    bonus_effects: Array.isArray((v as any)?.bonus_effects) ? (v as any).bonus_effects : []
                  });
                }
              }
              if (damageSource === 'ability' && selectedAbility) {
                const lvl = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                const vals: any[] = Array.isArray((lvl as any)?.damage_values) ? (lvl as any).damage_values : [];
                for (const v of (vals || [])) {
                  effects.push({
                    name: v?.typeName || v?.name || 'Generico',
                    affects_action_points: false,
                    affects_health: false,
                    affects_armor: false,
                    affects_classic_damage: true,
                    bonus_effects: Array.isArray((v as any)?.bonus_effects) ? (v as any).bonus_effects : []
                  });
                }
              }
            }
            return { enabled: directDamageEnabled, effects };
          })()
        },
        selectedPostureId: selectedPostureIdLocal,
        selectedPostureName: selectedPostureNameLocal
      });
      onClose();
    }
  };

  // Reset delle scelte trigger quando cambia sorgente o magia
  useEffect(() => {
    if (damageSource !== 'magic') {
      setSelectedDpsSeconds(0);
      setSelectedShotsCount(0);
      setSelectedPaConsumption(0);
      setLotteryUserChoices([]);
    } else if (!selectedSpell) {
      setSelectedDpsSeconds(0);
      setSelectedShotsCount(0);
      setSelectedPaConsumption(0);
      setLotteryUserChoices([]);
    } else {
      try {
        const info = getSpellLevelInfo(selectedSpell);
        const lvl = info?.levelData || {};
        const defSec = Number(lvl?.max_seconds || selectedSpell?.max_seconds || 0) || 0;
        const defShots = Number(
          (lvl as any)?.max_multiple_attacks ||
          (selectedSpell as any)?.max_multiple_attacks ||
          (lvl as any)?.max_projectiles ||
          (selectedSpell as any)?.max_projectiles ||
          0
        ) || 0;
        const defPa = Number(
          (lvl as any)?.max_pa_investment ??
          (selectedSpell as any)?.max_pa_investment ??
          (lvl as any)?.extra_action_cost ??
          (selectedSpell as any)?.extra_action_cost ??
          (lvl as any)?.indicative_action_cost ??
          (selectedSpell as any)?.indicative_action_cost ??
          0
        ) || 0;
        setSelectedDpsSeconds(defSec > 0 ? Math.min(1, defSec) : 0);
        setSelectedShotsCount(defShots > 0 ? Math.min(1, defShots) : 0);
        setSelectedPaConsumption(defPa > 0 ? Math.min(1, defPa) : 0);

        const numericChoices = Number((lvl as any)?.lottery_numeric_choices ?? (selectedSpell as any)?.lottery_numeric_choices ?? 0) || 0;
        const faces = Number((lvl as any)?.lottery_dice_faces ?? (selectedSpell as any)?.lottery_dice_faces ?? 0) || 0;
        if (numericChoices > 0) {
          setLotteryUserChoices(prev => {
            const next = Array.from({ length: numericChoices }).map((_, i) => {
              const raw = Number(prev?.[i] ?? 0) || 0;
              const min = 1;
              const max = faces > 0 ? faces : Number.POSITIVE_INFINITY;
              return Math.min(Math.max(min, raw), max);
            });
            return next;
          });
        } else {
          setLotteryUserChoices([]);
        }
      } catch {
        setSelectedDpsSeconds(0);
        setSelectedShotsCount(0);
        setSelectedPaConsumption(0);
        setLotteryUserChoices([]);
      }
    }
  }, [damageSource, getSpellLevelInfo, selectedSpell]);

  useEffect(() => {
    if (damageSource !== 'ability') {
      return;
    }
    if (!selectedAbility) {
      setSelectedDpsSeconds(0);
      setSelectedShotsCount(0);
      setSelectedPaConsumption(0);
      setLotteryUserChoices([]);
      return;
    }
    try {
      const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
      const defSec = Number((lvl as any)?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0;
      const defShots = Number(
        (lvl as any)?.max_multiple_attacks ||
        (selectedAbility as any)?.max_multiple_attacks ||
        (lvl as any)?.max_projectiles ||
        (selectedAbility as any)?.max_projectiles ||
        0
      ) || 0;
      const defPa = Number((lvl as any)?.max_pa_investment || (selectedAbility as any)?.max_pa_investment || 0) || 0;
      setSelectedDpsSeconds(defSec > 0 ? Math.min(1, defSec) : 0);
      setSelectedShotsCount(defShots > 0 ? Math.min(1, defShots) : 0);
      setSelectedPaConsumption(defPa > 0 ? Math.min(1, defPa) : 0);

      const numericChoices = Number((lvl as any)?.lottery_numeric_choices ?? (selectedAbility as any)?.lottery_numeric_choices ?? 0) || 0;
      const faces = Number((lvl as any)?.lottery_dice_faces ?? (selectedAbility as any)?.lottery_dice_faces ?? 0) || 0;
      if (numericChoices > 0) {
        setLotteryUserChoices(prev => {
          const next = Array.from({ length: numericChoices }).map((_, i) => {
            const raw = Number(prev?.[i] ?? 0) || 0;
            const min = 1;
            const max = faces > 0 ? faces : Number.POSITIVE_INFINITY;
            return Math.min(Math.max(min, raw), max);
          });
          return next;
        });
      } else {
        setLotteryUserChoices([]);
      }
    } catch {
      setSelectedDpsSeconds(0);
      setSelectedShotsCount(0);
      setSelectedPaConsumption(0);
      setLotteryUserChoices([]);
    }
  }, [damageSource, selectedAbility]);
  
  useEffect(() => {
    if (!isOpen) {
      setIsTargetsModalOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const loadTargets = async () => {
      try {
        const [charsRes, enemiesRes, evocationsRes] = await Promise.all([
          (async () => {
            const { data, error } = await supabase
              .from('characters')
              .select('id, name, avatar_url, is_public, data')
              .eq('is_public', true);
            if (error) return [];
            const formatted = (data || []).map((char: any) => {
              const rawData = (char?.data || {}) as any;
              const normalizedEquipment = Array.isArray(rawData?.equipment)
                ? rawData.equipment
                : Object.values(rawData?.equipment || {}).filter(Boolean);
              return {
                ...rawData,
                equipment: normalizedEquipment,
                id: char.id,
                name: char.name ?? rawData?.name,
                avatar_url: char.avatar_url,
                is_public: char.is_public === true,
              };
            });
            return formatted;
          })(),
          (async () => {
            const { data, error } = await supabase
              .from('enemies')
              .select('id, name, enemy_level, enemy_max_hp, enemy_current_hp, enemy_max_armor, enemy_current_armor, enemy_max_pa, enemy_current_pa');
            if (error) return [];
            return data || [];
          })(),
          (async () => {
            try {
              const local = Array.isArray((character as any)?.evocation_instances) ? (character as any).evocation_instances : null;
              let rows: any[] = [];
              if (local) {
                rows = local as any[];
              } else if (character?.id) {
                rows = await listEvocationInstancesByCharacter(String(character.id));
              }
              return (rows || []).filter((r: any) => Number(r?.remaining_turns || 0) > 0);
            } catch {
              return [];
            }
          })(),
        ]);

        setPublicCharacters(
          (charsRes || []).sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }))
        );
        setEnemies(
          (enemiesRes || []).sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }))
        );
        setEvocations(
          (evocationsRes || []).sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }))
        );
      } catch {
        setPublicCharacters([]);
        setEnemies([]);
        setEvocations([]);
      }
    };

    if (isOpen && isTargetsModalOpen) {
      loadTargets();
    }
  }, [character, isOpen, isTargetsModalOpen]);
  
  const n = React.useCallback((v: any) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const getCharacterTargetEnergies = React.useCallback((c: any) => {
    try {
      const baseStats = (c?.baseStats || {}) as any;
      const equipment: any[] = Array.isArray(c?.equipment) ? c.equipment : [];
      const anomalies: any[] = Array.isArray(c?.anomalies) ? c.anomalies : [];

      const totalStats = {
        forza: n(baseStats?.forza),
        percezione: n(baseStats?.percezione),
        resistenza: n(baseStats?.resistenza),
        intelletto: n(baseStats?.intelletto),
        agilita: n(baseStats?.agilita),
        sapienza: n(baseStats?.sapienza),
        anima: n(baseStats?.anima),
      };

      for (const item of equipment) {
        const stats = (item as any)?.stats;
        if (stats && typeof stats === 'object') {
          for (const [k, v] of Object.entries(stats)) {
            if (k in totalStats) (totalStats as any)[k] += n(v);
          }
        }
      }

      for (const an of anomalies) {
        const mod = (an as any)?.statsModifier;
        if (mod && typeof mod === 'object') {
          for (const [k, v] of Object.entries(mod)) {
            if (k in totalStats) (totalStats as any)[k] += n(v);
          }
        }
      }

      const healthAnomalyModifier = anomalies.reduce((sum, an) => sum + n((an as any)?.healthModifier), 0);
      const apAnomalyModifier = anomalies.reduce((sum, an) => sum + n((an as any)?.actionPointsModifier), 0);

      const hpMax = 12 + (totalStats.resistenza * 2) + healthAnomalyModifier;
      const apMax = 12 + Math.floor(totalStats.sapienza / 2) + totalStats.anima + apAnomalyModifier;
      const arMax = n(c?.baseArmor) + equipment.reduce((sum, it) => sum + n((it as any)?.armor), 0);

      const hpCur = n((c as any)?.currentHealth ?? hpMax);
      const apCur = n((c as any)?.currentActionPoints ?? apMax);
      const arCur = n((c as any)?.currentArmor ?? arMax);

      return {
        hpCur: Math.max(0, hpCur),
        hpMax: Math.max(0, hpMax),
        arCur: Math.max(0, arCur),
        arMax: Math.max(0, arMax),
        apCur: Math.max(0, apCur),
        apMax: Math.max(0, apMax),
      };
    } catch {
      return { hpCur: 0, hpMax: 0, arCur: 0, arMax: 0, apCur: 0, apMax: 0 };
    }
  }, [n]);

  const getEnemyTargetEnergies = React.useCallback((e: any) => {
    const hpMax = n(e?.enemy_max_hp);
    const arMax = n(e?.enemy_max_armor);
    const apMax = n(e?.enemy_max_pa);
    return {
      hpCur: n(e?.enemy_current_hp ?? hpMax),
      hpMax,
      arCur: n(e?.enemy_current_armor ?? arMax),
      arMax,
      apCur: n(e?.enemy_current_pa ?? apMax),
      apMax,
    };
  }, [n]);

  const getEvocationTargetEnergies = React.useCallback((ev: any) => {
    try {
      const details = (ev?.details || {}) as any;
      const level = (details?.level_data || details?.level || {}) as any;
      const hpCur = n(level?.energy_health ?? level?.health);
      const apCur = n(level?.energy_action_points ?? level?.action_points);
      const arCur = n(level?.energy_armour ?? level?.armour);
      const hpMax = n(level?.health ?? level?.energy_health ?? hpCur);
      const apMax = n(level?.action_points ?? level?.energy_action_points ?? apCur);
      const arMax = n(level?.armour ?? level?.energy_armour ?? arCur);
      return { hpCur, hpMax, arCur, arMax, apCur, apMax };
    } catch {
      return { hpCur: 0, hpMax: 0, arCur: 0, arMax: 0, apCur: 0, apMax: 0 };
    }
  }, [n]);

  const isSelectedTarget = (type: 'characters' | 'enemies' | 'evocations', id: string) => {
    return (selectedTargets || []).some(t => t.type === type && String(t.id) === String(id));
  };

  const toggleTarget = (t: { type: 'characters' | 'enemies' | 'evocations'; id: string; name: string }) => {
    setSelectedTargets(prev => {
      const exists = (prev || []).some(x => x.type === t.type && String(x.id) === String(t.id));
      if (exists) return (prev || []).filter(x => !(x.type === t.type && String(x.id) === String(t.id)));
      return [...(prev || []), t];
    });
  };

  const filteredByQuery = (name: any) => {
    const q = String(targetsSearchQuery || '').trim().toLowerCase();
    if (!q) return true;
    return String(name || '').toLowerCase().includes(q);
  };

  const itemsCharacters = React.useMemo(() => {
    return (publicCharacters || []).map((c: any) => {
      const id = String(c?.id || '');
      const name = String(c?.name || '—');
      const energies = getCharacterTargetEnergies(c);
      return { type: 'characters' as const, id, name, energies, raw: c };
    });
  }, [getCharacterTargetEnergies, publicCharacters]);

  const itemsEnemies = React.useMemo(() => {
    return (enemies || []).map((e: any) => {
      const id = String(e?.id || '');
      const name = String(e?.name || '—');
      const energies = getEnemyTargetEnergies(e);
      return { type: 'enemies' as const, id, name, energies, raw: e };
    });
  }, [enemies, getEnemyTargetEnergies]);

  const itemsEvocations = React.useMemo(() => {
    return (evocations || []).map((ev: any) => {
      const id = String(ev?.id || '');
      const name = String(ev?.name || '—');
      const energies = getEvocationTargetEnergies(ev);
      return { type: 'evocations' as const, id, name, energies, raw: ev };
    });
  }, [evocations, getEvocationTargetEnergies]);

  const itemsAll = React.useMemo(() => {
    const all = [...itemsCharacters, ...itemsEnemies, ...itemsEvocations];
    return all.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
  }, [itemsCharacters, itemsEnemies, itemsEvocations]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" aria-describedby="stat-selection-description">
        <DialogHeader>
          <DialogTitle>{activationOnly ? 'Attiva passiva' : 'Seleziona Statistica e Competenze'}</DialogTitle>
          <DialogDescription id="stat-selection-description">
            {activationOnly
              ? 'Conferma l\'attivazione per eseguire il tiro di riuscita.'
              : 'Scegli una statistica per il tiro di dado e opzionalmente seleziona le competenze da aggiungere al tiro.'}
          </DialogDescription>
        </DialogHeader>
        
        {activationOnly ? (
          <div className="space-y-4">
            {(() => {
              const preset: any = activationPreset;
              const typeLabel = preset?.type === 'magic' ? 'Magia' : 'Abilità';
              const item = preset?.item || null;
              const name = String(item?.name || typeLabel).trim() || typeLabel;
              const description = String(item?.description || '').trim();
              let levelDescription = '';
              try {
                if (preset?.type === 'magic') {
                  const info = getSpellLevelInfo(item);
                  levelDescription = String(info?.levelData?.level_description || info?.levelData?.levelDescription || '').trim();
                } else {
                  const lvl = Array.isArray(item?.levels) ? (item.levels.find((l: any) => l?.level != null) || item.levels[0]) : item;
                  levelDescription = String(lvl?.level_description || lvl?.levelDescription || '').trim();
                }
              } catch {}
              return (
                <div className="border rounded-md p-3 bg-muted">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold truncate">{name}</div>
                    <Badge variant="secondary">{typeLabel}</Badge>
                  </div>
                  {levelDescription ? (
                    <div className="text-xs text-muted-foreground mt-1">{levelDescription}</div>
                  ) : null}
                  {description ? (
                    <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{description}</div>
                  ) : null}
                </div>
              );
            })()}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>Annulla</Button>
              <Button onClick={handleActivationOnlyConfirm} disabled={!(activationPreset as any)?.item}>Attiva</Button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Statistica</label>
            <Select value={selectedStat} onValueChange={setSelectedStat}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona statistica" />
              </SelectTrigger>
              <SelectContent>
                {stats.map(stat => (
                  <SelectItem key={stat.key} value={stat.key}>
                    {stat.name} ({calculations?.totalStats?.[stat.key] || character?.baseStats?.[stat.key] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {availableCompetences.length > 0 && (
            <div>
              <label className="text-sm font-medium">Competenze (opzionale)</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableCompetences.map(competence => (
                  <div key={competence.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={competence.id}
                      checked={selectedCompetences.includes(competence.id)}
                      onCheckedChange={() => handleCompetenceToggle(competence.id)}
                    />
                    <label htmlFor={competence.id} className="text-sm">
                      {competence.name} (d{competence.value})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Bersagli (opzionale)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetsSearchQuery('');
                  setTargetsTab('all');
                  setIsTargetsModalOpen(true);
                }}
              >
                Seleziona
              </Button>
            </div>
            {selectedTargets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTargets.map((t) => (
                  <span key={`${t.type}:${t.id}`} className="inline-flex items-center px-2 py-1 rounded bg-muted text-sm">
                    {t.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {t.type === 'characters' ? 'PG' : t.type === 'enemies' ? 'Nemico' : 'Evocazione'}
                    </span>
                    <button
                      type="button"
                      className="ml-2 text-xs hover:underline"
                      onClick={() => setSelectedTargets(prev => prev.filter(x => !(x.type === t.type && x.id === t.id)))}
                    >
                      rimuovi
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nessun bersaglio selezionato</div>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Compilare il danno?</label>
              <Switch checked={compileDamage} onCheckedChange={setCompileDamage} />
            </div>

            {compileDamage && (
              <>
                <div>
                  <label className="text-sm font-medium">Fonte del danno</label>
                  <Select value={damageSource} onValueChange={(v) => {
                    setDamageSource(v as any);
                    setSelectedWeapon(null);
                    setWeaponDamageType('');
                    setSelectedArrow(null);
                    setSelectedSpell(null);
                    setSelectedAbility(null);
                    setSelectedDamageCompetences([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipaggiamento</SelectItem>
                      <SelectItem value="magic">Magia</SelectItem>
                      <SelectItem value="ability">Abilità</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {damageSource === 'equipment' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Arma</label>
                      <Select value={selectedWeapon?.id || ''} onValueChange={(value) => {
                        const w = weapons.find((x: any) => String(x?.id) === String(value) || (x?.name && String(x.name) === String(value)));
                        setSelectedWeapon(w || null);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona arma" />
                        </SelectTrigger>
                        <SelectContent>
                          {weapons.map((w: any) => (
                            <SelectItem key={w.id ?? w.name ?? `weapon-${w.index ?? w.name ?? 'x'}`} value={String((w.id && String(w.id).length > 0) ? w.id : (w.name && String(w.name).length > 0 ? w.name : `weapon-${w.name ?? 'x'}`))}>
                              {w.name || 'Arma'}
                            </SelectItem>
                          ))}
                          {weapons.length === 0 && (
                            <SelectItem value="no-weapon" disabled>Nessuna arma disponibile</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedWeapon && (() => {
                      const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                        ? (selectedWeapon as any).data.damage_sets
                        : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);

                      const sum = (arr: any[], baseKey: string, calcKey: string, fallbackBase: number) => {
                        const base = arr.length > 0 ? arr.reduce((tot, s) => tot + (Number((s as any)?.[baseKey]) || 0), 0) : Number(fallbackBase || 0);
                        const calc = arr.length > 0 ? arr.reduce((tot, s) => tot + (Number((s as any)?.[calcKey]) || 0), 0) : Math.floor(Number(fallbackBase || 0) * 0.33);
                        return { base, calc };
                      };

                      const veloce = sum(sets, 'damage_veloce', 'calculated_damage_veloce', (selectedWeapon as any)?.damageVeloce);
                      const pesante = sum(sets, 'damage_pesante', 'calculated_damage_pesante', (selectedWeapon as any)?.damagePesante);
                      const affondo = sum(sets, 'damage_affondo', 'calculated_damage_affondo', (selectedWeapon as any)?.damageAffondo);

                      const subtype = (selectedWeapon as any)?.subtype;
                      const weight = (selectedWeapon as any)?.weight;

                      return (
                        <div className="rounded border p-2 text-sm space-y-1">
                          <div className="font-medium">{(selectedWeapon as any)?.name || 'Arma'}</div>
                          {subtype ? (<div>Sottotipo: {String(subtype)}</div>) : null}
                          {Number(weight || 0) > 0 ? (<div>Peso: {Number(weight)}</div>) : null}
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Dettaglio danni</div>
                            <div className="grid grid-cols-3 gap-1">
                              <div className="flex items-center justify-between border rounded px-2 py-1">
                                <span>Leggero</span>
                                <span>{`d${Number(veloce.base || 0)} + ${Number(veloce.calc || 0)}`}</span>
                              </div>
                              <div className="flex items-center justify-between border rounded px-2 py-1">
                                <span>Pesante</span>
                                <span>{`d${Number(pesante.base || 0)} + ${Number(pesante.calc || 0)}`}</span>
                              </div>
                              <div className="flex items-center justify-between border rounded px-2 py-1">
                                <span>Affondo</span>
                                <span>{`d${Number(affondo.base || 0)} + ${Number(affondo.calc || 0)}`}</span>
                              </div>
                            </div>
                            {Array.isArray(sets) && sets.length > 0 && (
                              <div className="pt-2">
                                <div className="text-xs text-muted-foreground">Danni per effetto</div>
                                <div className="space-y-2 mt-1">
                                  {sets.map((s: any, idx: number) => {
                                    const bV = Number(s?.damage_veloce || 0);
                                    const cV = Number(s?.calculated_damage_veloce || 0);
                                    const bP = Number(s?.damage_pesante || 0);
                                    const cP = Number(s?.calculated_damage_pesante || 0);
                                    const bA = Number(s?.damage_affondo || 0);
                                    const cA = Number(s?.calculated_damage_affondo || 0);
                                    const hasAny = (bV || cV || bP || cP || bA || cA) > 0;
                                    if (!hasAny) return null;
                                    return (
                                      <div key={`eff-${idx}`} className="rounded border p-2">
                                        <div className="text-xs font-semibold">{s?.effect_name || 'Effetto'}</div>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          {(bV || cV) ? (
                                            <div className="rounded border px-2 py-1 text-xs">
                                              <span className="mr-1">Leggero</span>
                                              <span className="font-semibold">d{Math.max(1, bV)}</span>
                                              <span className="mx-1">+</span>
                                              <span className="font-semibold">{cV}</span>
                                            </div>
                                          ) : null}
                                          {(bP || cP) ? (
                                            <div className="rounded border px-2 py-1 text-xs">
                                              <span className="mr-1">Pesante</span>
                                              <span className="font-semibold">d{Math.max(1, bP)}</span>
                                              <span className="mx-1">+</span>
                                              <span className="font-semibold">{cP}</span>
                                            </div>
                                          ) : null}
                                          {(bA || cA) ? (
                                            <div className="rounded border px-2 py-1 text-xs">
                                              <span className="mr-1">Affondo</span>
                                              <span className="font-semibold">d{Math.max(1, bA)}</span>
                                              <span className="mx-1">+</span>
                                              <span className="font-semibold">{cA}</span>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-sm font-medium">Tipo di danno</label>
                      <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli tipo danno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leggero">
                            {(() => {
                              const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                ? (selectedWeapon as any).data.damage_sets
                                : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                              const base = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.damage_veloce) || 0), 0)
                                : Number((selectedWeapon as any)?.damageVeloce || 0);
                              const calc = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_veloce) || 0), 0)
                                : Math.floor(base * 0.33);
                              return `Leggero (d${base} + ${calc})`;
                            })()}
                          </SelectItem>
                          <SelectItem value="pesante">
                            {(() => {
                              const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                ? (selectedWeapon as any).data.damage_sets
                                : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                              const base = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.damage_pesante) || 0), 0)
                                : Number((selectedWeapon as any)?.damagePesante || 0);
                              const calc = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_pesante) || 0), 0)
                                : Math.floor(base * 0.33);
                              return `Pesante (d${base} + ${calc})`;
                            })()}
                          </SelectItem>
                          <SelectItem value="affondo">
                            {(() => {
                              const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                ? (selectedWeapon as any).data.damage_sets
                                : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                              const base = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.damage_affondo) || 0), 0)
                                : Number((selectedWeapon as any)?.damageAffondo || 0);
                              const calc = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_affondo) || 0), 0)
                                : Math.floor(base * 0.33);
                              return `Affondo (d${base} + ${calc})`;
                            })()}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isRangedWeapon && (
                      <div>
                        <label className="text-sm font-medium">Frecce (consuma 1)</label>
                        <Select value={selectedArrow?.id || ''} onValueChange={(value) => {
                          const a = arrows.find((x: any) => String(x?.id) === String(value) || (x?.name && String(x.name) === String(value)));
                          setSelectedArrow(a || null);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona freccia" />
                          </SelectTrigger>
                          <SelectContent>
                            {arrows.map((a: any) => (
                              <SelectItem key={a.id ?? a.name} value={String(a.id ?? a.name)}>
                                {a.name}{a.__source === 'magic_quiver' ? ' (Magica)' : ''} {a.quantity != null ? `• x${a.quantity}` : ''} {a.damage ? `• D:${a.damage}` : ''}
                              </SelectItem>
                            ))}
                            {arrows.length === 0 && (
                              <SelectItem value="no-arrow" disabled>Nessuna freccia disponibile</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {selectedArrow && (
                          <div className="mt-2 rounded border p-2 text-sm">
                            <div className="font-semibold">{selectedArrow.name}</div>
                            {selectedArrow.description && (
                              <div className="text-muted-foreground">{selectedArrow.description}</div>
                            )}
                            {Array.isArray((selectedArrow as any)?.damage_sets) && (selectedArrow as any).damage_sets.length > 0 ? (
                              <div className="mt-1 space-y-1">
                                {((selectedArrow as any).damage_sets || []).map((ds: any, idx: number) => {
                                  const eff = ds?.effect_name || `Effetto ${idx + 1}`;
                                  const guar = Number(ds?.guaranteed_damage || 0);
                                  const addi = Number(ds?.additional_damage || 0);
                                  return (
                                    <div key={`${eff}-${idx}`}>• {eff}: {guar} {addi > 0 ? `+ d${addi}` : ''}</div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-1">Danno: {Number((selectedArrow as any)?.damage || 0)}{Number((selectedArrow as any)?.additional_damage || 0) > 0 ? ` + d${Number((selectedArrow as any)?.additional_damage || 0)}` : ''}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Competenze arma (non influiscono sul tiro)</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {damageCompetenceOptions.map(opt => (
                          <div key={opt.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dm-${opt.id}`}
                              checked={selectedDamageCompetences.includes(opt.id)}
                              onCheckedChange={() => handleDamageCompetenceToggle(opt.id)}
                            />
                            <label htmlFor={`dm-${opt.id}`} className="text-sm">{opt.label} ({(character as any)?.abilities?.[opt.id] ?? 0})</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {damageSource === 'magic' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Magia</label>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => setIsSpellModalOpen(true)}>Cerca magia</Button>
                        {(() => {
                          const s = selectedSpell as any;
                          if (!s) return (<span className="text-sm text-muted-foreground">Nessuna magia selezionata</span>);
                          const levelNum = Number(s?.current_level) || Number(s?.level) || Number(s?.levels?.[0]?.level) || 1;
                          const sid = String(s?.id ?? s?.name);
                          const cdTurns = Number(spellCooldowns?.[sid] ?? 0) || 0;
                          return (<span className="text-sm">{String(s.name)} • Livello {levelNum}{cdTurns > 0 ? ` • in recupero: ${cdTurns}` : ''}</span>);
                        })()}
                        {selectedSpell && (
                          <Button variant="ghost" onClick={() => { setSelectedSpell(null); setSelectedSpellGradeNumber(1); }}>Rimuovi</Button>
                        )}
                      </div>
                    </div>

                    {/* Selezione grado interno (mostra solo se il livello ha gradi) */}
                    {selectedSpell && (() => {
                      const currentLevelNumber = Number((selectedSpell as any)?.current_level) || Number((selectedSpell as any)?.level) || Number((selectedSpell as any)?.levels?.[0]?.level) || 1;
                      const currentLevel = Array.isArray((selectedSpell as any)?.levels)
                        ? ((selectedSpell as any).levels.find((l: any) => Number(l.level) === currentLevelNumber) || (selectedSpell as any).levels[0])
                        : (selectedSpell as any);
                      const grades = Array.isArray((currentLevel as any)?.grades) ? (currentLevel as any).grades : [];
                      // Se non esistono gradi per il livello, non mostrare il selettore
                      if (!grades || grades.length === 0) return null;
                      const grade2 = grades.find((g: any) => Number(g?.grade_number || 0) === 2) ?? grades[0];
                      const grade3 = grades.find((g: any) => Number(g?.grade_number || 0) === 3) ?? grades[1];
                      const has2 = !!grade2;
                      const has3 = !!grade3;
                      const cost2 = has2 ? (Number((grade2 as any)?.action_cost ?? (grade2 as any)?.indicative_action_cost ?? 0) || 0) : 0;
                      const cost3 = has3 ? (Number((grade3 as any)?.action_cost ?? (grade3 as any)?.indicative_action_cost ?? 0) || 0) : 0;
                      const extra2 = cost2 > 0 ? ` — PA: ${cost2}` : '';
                      const extra3 = cost3 > 0 ? ` — PA: ${cost3}` : '';
                      return (
                        <div>
                          <label className="text-sm font-medium">Grado interno</label>
                          <Select value={String(selectedSpellGradeNumber)} onValueChange={(value) => setSelectedSpellGradeNumber(Number(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona grado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={"1"}>Grado 1 (base livello)</SelectItem>
                              <SelectItem value={"2"} disabled={!has2}>{`Grado 2${extra2}`}</SelectItem>
                              <SelectItem value={"3"} disabled={!has3}>{`Grado 3${extra3}`}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}

                    {selectedSpell && (() => {
                      const info = getSpellLevelInfo(selectedSpell);
                      if (!info) return null;
                      const shape = translateDamageShape(info.levelData?.damage_shape);
                      const maxProj = info.levelData?.max_projectiles;
                      const maxSec = info.levelData?.max_seconds;
                      return (
                        <div className="rounded border p-2 text-sm space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            <span>{selectedSpell.name}</span>
                            {Number((selectedSpell as any)?.difficulty || 0) > 0 && (
                              <span className="inline-flex">
                                <Badge variant="outline" className="text-xs bg-yellow-500 text-white border-yellow-600">
                                  Diff {Number((selectedSpell as any).difficulty || 0)}
                                </Badge>
                              </span>
                            )}
                          </div>
                          <div>Livello: {info.levelNum}</div>
                          {(() => {
                            const currentLevelNumber = Number((selectedSpell as any)?.current_level) || Number((selectedSpell as any)?.level) || Number((selectedSpell as any)?.levels?.[0]?.level) || 1;
                            const currentLevel = Array.isArray((selectedSpell as any)?.levels)
                              ? ((selectedSpell as any).levels.find((l: any) => Number(l.level) === currentLevelNumber) || (selectedSpell as any).levels[0])
                              : (selectedSpell as any);
                            const grades = Array.isArray((currentLevel as any)?.grades) ? (currentLevel as any).grades : [];
                            return grades.length > 0 ? (<div>Grado: {Number(selectedSpellGradeNumber || 1)}</div>) : null;
                          })()}
                          {(() => {
                            const toNum = (v: any): number => {
                              if (typeof v === 'number') return v;
                              const s = String(v ?? '').trim().replace(',', '.');
                              const m = s.match(/-?\d+(?:\.\d+)?/);
                              return m ? parseFloat(m[0]) : 0;
                            };
                            const sets = Array.isArray((info as any)?.levelData?.self_damage_sets)
                              ? ((info as any).levelData.self_damage_sets as any[])
                              : [];
                            const selfGuaranteed = sets.reduce((acc, s) => acc + toNum((s as any)?.guaranteed_damage || 0), 0);
                            const selfAdditional = sets.reduce((acc, s) => acc + toNum((s as any)?.max_damage || 0), 0);
                            const legacyEnabled = !!(((info as any)?.levelData?.self_damage_enabled) || ((info as any)?.levelData?.self_effect_enabled) || (selectedSpell as any)?.self_damage_enabled);
                            const legacyValue = toNum(((info as any)?.levelData?.self_damage) ?? ((selectedSpell as any)?.self_damage) ?? 0);
                            if (selfGuaranteed <= 0 && selfAdditional <= 0 && !(legacyEnabled && legacyValue > 0)) return null;
                            return (
                              <>
                                {selfGuaranteed > 0 && (<div>Danno self (assicurato): {selfGuaranteed}</div>)}
                                {selfAdditional > 0 && (<div>Danno self (aggiuntivo): {selfAdditional}</div>)}
                                {(selfGuaranteed <= 0 && selfAdditional <= 0 && legacyEnabled && legacyValue > 0) && (
                                  <div>Danno self (assicurato): {legacyValue}</div>
                                )}
                              </>
                            );
                          })()}
                          {Number(info.actionCost || 0) > 0 && (
                            <div>Punti azione: {Number(info.actionCost || 0)}</div>
                          )}
                          {shape && <div>Forma del danno: {shape}</div>}
                          {maxProj ? <div>Max proiettili: {maxProj}</div> : null}
                          {maxSec ? <div>Max secondi: {maxSec}</div> : null}
                          {(selectedSpell as any)?.description && (
                            <div className="pt-1">
                              <div className="text-xs text-muted-foreground">Descrizione magia</div>
                              <div>{String((selectedSpell as any).description)}</div>
                            </div>
                          )}
                      {(() => {
                        const detailed = (Array.isArray(info.damageValues) ? info.damageValues : []).filter((v: any) => (
                          Number(v?.guaranteed_damage || 0) > 0 || Number(v?.additional_damage || 0) > 0
                        ));
                        return detailed.length > 0 ? (
                              <div className="pt-1">
                                <div className="text-xs text-muted-foreground">Dettaglio danni</div>
                                <div className="grid grid-cols-2 gap-1">
                                  {detailed.map((v: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between border rounded px-2 py-1">
                                      <span>{v?.typeName || 'Generico'}</span>
                                      <span>{Number(v?.guaranteed_damage || 0)} + d{Number(v?.additional_damage || 0)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {(() => {
                            const lvl: any = info.levelData || {};
                            const scaledStats: string[] = Array.isArray(lvl?.scaled_move_stats) ? lvl.scaled_move_stats : [];
                            const scaledSkills: string[] = Array.isArray(lvl?.scaled_move_skills) ? lvl.scaled_move_skills : [];
                            const getStatValue = (k: string) => {
                              const key = String(k || '').trim();
                              const v = (calculations?.totalStats?.[key] ?? (character as any)?.totalStats?.[key] ?? (character as any)?.baseStats?.[key] ?? 0);
                              return Number(v || 0) || 0;
                            };
                            const getSkillValue = (k: string) => {
                              const key = String(k || '').trim();
                              return Number((character as any)?.abilities?.[key] ?? 0) || 0;
                            };
                            const skillLabel = (k: string) => {
                              const key = String(k || '').trim();
                              const a = (actionCompetences || []).find((c: any) => String(c?.key) === key);
                              if (a?.name) return String(a.name);
                              const w = (damageCompetenceOptions || []).find((c: any) => String(c?.id) === key);
                              if (w?.label) return String(w.label);
                              return prettyStatLabel(key);
                            };
                            const items = [
                              ...(scaledStats || []).map((k) => ({ kind: 'stat' as const, key: String(k || '').trim(), value: getStatValue(String(k || '').trim()) })).filter(x => x.key),
                              ...(scaledSkills || []).map((k) => ({ kind: 'skill' as const, key: String(k || '').trim(), value: getSkillValue(String(k || '').trim()) })).filter(x => x.key),
                            ];
                            if (items.length === 0) return null;
                            return (
                              <div className="pt-1">
                                <div className="text-xs text-muted-foreground">Mossa scalata</div>
                                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                                  {items.map((x, i) => (
                                    <div key={`${x.kind}:${x.key}:${i}`} className="flex items-center justify-between border rounded px-2 py-1">
                                      <span>{x.kind === 'stat' ? prettyStatLabel(x.key) : skillLabel(x.key)}</span>
                                      <span>{Math.round(Number(x.value || 0))}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Trigger Usodadi: Target rule */}
                          {(() => {
                            const rawShape = String(info.levelData?.damage_shape || '').toLowerCase();
                            const maxTargets = Number(info.levelData?.max_targets || 0) || 0;
                            let rule: string | null = null;
                            if (rawShape.includes('area') || rawShape.includes('cono')) rule = 'Selezione bersagli illimitata';
                            else if (rawShape.includes('catena')) rule = `Selezione massima: ${maxTargets > 0 ? maxTargets : '—'}`;
                            else rule = `Selezione massima: ${maxTargets > 0 ? maxTargets : 1}`;
                            return (
                              <div className="pt-1">
                                <div className="text-xs text-muted-foreground">Regole bersagli</div>
                                <div>{rule}</div>
                              </div>
                            );
                          })()}

                          {/* Trigger Usodadi: Tiri multipli */}
                          {(() => {
                            const maxProjVal = Number(
                              (info.levelData as any)?.max_multiple_attacks ||
                              (selectedSpell as any)?.max_multiple_attacks ||
                              (info.levelData as any)?.max_projectiles ||
                              (selectedSpell as any)?.max_projectiles ||
                              0
                            ) || 0;
                            return maxProjVal > 0;
                          })() && (
                            <div className="pt-2 space-y-1">
                              <div className="text-xs text-muted-foreground">Tiri multipli</div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={(() => {
                                    const val = Number(
                                      (info.levelData as any)?.max_multiple_attacks ||
                                      (selectedSpell as any)?.max_multiple_attacks ||
                                      (info.levelData as any)?.max_projectiles ||
                                      (selectedSpell as any)?.max_projectiles ||
                                      0
                                    ) || 0;
                                    return val > 0 ? val : undefined;
                                  })()}
                                  value={selectedShotsCount}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const max = Number(
                                      (info.levelData as any)?.max_multiple_attacks ||
                                      (selectedSpell as any)?.max_multiple_attacks ||
                                      (info.levelData as any)?.max_projectiles ||
                                      (selectedSpell as any)?.max_projectiles ||
                                      0
                                    ) || 0;
                                    const clampedShots = max > 0 ? Math.min(Math.max(0, v), max) : Math.max(0, v);
                                    setSelectedShotsCount(clampedShots);

                                    // Propagazione: se max_seconds o DPS è attivo, usa lo stesso numero
                                    const maxSecVal = Number(
                                      (info.levelData as any)?.max_seconds ||
                                      (selectedSpell as any)?.max_seconds ||
                                      0
                                    ) || 0;
                                    const dpsEnabled = ((maxSecVal > 0) ||
                                      (Number((info.levelData as any)?.pa_cost_per_second || (selectedSpell as any)?.pa_cost_per_second || 0) > 0) ||
                                      (Number((info.levelData as any)?.increasing_damage_per_second || (selectedSpell as any)?.increasing_damage_per_second || 0) > 0));
                                    if (dpsEnabled) {
                                      const clampedSec = maxSecVal > 0 ? Math.min(Math.max(0, v), maxSecVal) : Math.max(0, v);
                                      setSelectedDpsSeconds(clampedSec);
                                    }

                                    // Propagazione: se costo PA extra/impiego PA è attivo, usa lo stesso numero
                                    const maxPa = Number(
                                      (info.levelData as any)?.max_pa_investment ||
                                      (selectedSpell as any)?.max_pa_investment ||
                                      0
                                    ) || 0;
                                    const incPa = Number(
                                      (info.levelData as any)?.increasing_damage_per_pa ||
                                      (selectedSpell as any)?.increasing_damage_per_pa ||
                                      (selectedSpell as any)?.increase_damage_per_pa ||
                                      0
                                    ) || 0;
                                    const succEvery = Number(
                                      (info.levelData as any)?.success_roll_increase_every_pa ||
                                      (selectedSpell as any)?.success_roll_increase_every_pa ||
                                      0
                                    ) || 0;
                                    const paFlag = !!(
                                      (info.levelData as any)?.paInvestmentEnabled ||
                                      (selectedSpell as any)?.paInvestmentEnabled ||
                                      (info.levelData as any)?.damageIncreasePerPaEnabled ||
                                      (selectedSpell as any)?.damageIncreasePerPaEnabled
                                    );
                                    const paEnabled = paFlag || (maxPa > 0) || (incPa > 0) || (succEvery > 0);
                                    if (paEnabled) {
                                      const clampedPa = maxPa > 0 ? Math.min(Math.max(0, v), maxPa) : Math.max(0, v);
                                      setSelectedPaConsumption(clampedPa);
                                    }
                                  }}
                                  placeholder={(() => {
                                    const val = Number(
                                      (info.levelData as any)?.max_multiple_attacks ||
                                      (selectedSpell as any)?.max_multiple_attacks ||
                                      (info.levelData as any)?.max_projectiles ||
                                      (selectedSpell as any)?.max_projectiles ||
                                      0
                                    ) || 0;
                                    return `Max ${val}`;
                                  })()}
                                />
                                <span className="text-xs text-muted-foreground">Danno crescente: {Number(info.levelData?.damage_increasing_per_multiple_shots || 0) || 0}</span>
                              </div>
                            </div>
                          )}

                          {/* Trigger Usodadi: Danno al secondo */}
                          {(() => {
                            const maxS = Number(info.levelData?.max_seconds || 0) || 0;
                            const paS = Number(info.levelData?.pa_cost_per_second || 0) || 0;
                            const incS = Number(info.levelData?.increasing_damage_per_second || 0) || 0;
                            const show = (maxS > 0) || (paS > 0) || (incS > 0);
                            return show;
                          })() && (
                            <div className="pt-2 space-y-1">
                              <div className="text-xs text-muted-foreground">Danno al secondo</div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={Number(info.levelData?.max_seconds || maxSec || 0) || undefined}
                                  value={selectedDpsSeconds}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const max = Number(info.levelData?.max_seconds || maxSec || 0) || 0;
                                    setSelectedDpsSeconds(max > 0 ? Math.min(Math.max(0, v), max) : Math.max(0, v));
                                  }}
                                  placeholder={`Max ${Number(info.levelData?.max_seconds || maxSec || 0) || 0}`}
                                />
                                <span className="text-xs text-muted-foreground">Danno crescente: {Number(info.levelData?.increasing_damage_per_second || 0) || 0}</span>
                              </div>
                            </div>
                          )}

                          {/* Trigger Usodadi: Impiego PA e incremento danno per PA (solo se abilitato dai dati Supabase) */}
                          {(() => {
                            const maxPa = Number(
                              (info.levelData as any)?.max_pa_investment ??
                              (selectedSpell as any)?.max_pa_investment ??
                              (info.levelData as any)?.extra_action_cost ??
                              (selectedSpell as any)?.extra_action_cost ??
                              (info.levelData as any)?.indicative_action_cost ??
                              (selectedSpell as any)?.indicative_action_cost ??
                              0
                            ) || 0;
                            const incPa = Number(
                              info.levelData?.increasing_damage_per_pa ||
                              (selectedSpell as any)?.increasing_damage_per_pa ||
                              (selectedSpell as any)?.increase_damage_per_pa ||
                              0
                            ) || 0;
                            const flag = !!(info.levelData?.paInvestmentEnabled || (selectedSpell as any)?.paInvestmentEnabled || info.levelData?.damageIncreasePerPaEnabled || (selectedSpell as any)?.damageIncreasePerPaEnabled);
                            const show = flag || (maxPa > 0) || (incPa > 0);
                            return show;
                          })() && (
                            <div className="pt-2 space-y-1">
                              <div className="text-xs text-muted-foreground">Impiego PA</div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={(() => {
                                    const maxPa = Number(
                                      (info.levelData as any)?.max_pa_investment ??
                                      (selectedSpell as any)?.max_pa_investment ??
                                      (info.levelData as any)?.extra_action_cost ??
                                      (selectedSpell as any)?.extra_action_cost ??
                                      (info.levelData as any)?.indicative_action_cost ??
                                      (selectedSpell as any)?.indicative_action_cost ??
                                      0
                                    ) || 0;
                                    return maxPa > 0 ? maxPa : undefined;
                                  })()}
                                  value={selectedPaConsumption}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const maxPa = Number(
                                      (info.levelData as any)?.max_pa_investment ??
                                      (selectedSpell as any)?.max_pa_investment ??
                                      (info.levelData as any)?.extra_action_cost ??
                                      (selectedSpell as any)?.extra_action_cost ??
                                      (info.levelData as any)?.indicative_action_cost ??
                                      (selectedSpell as any)?.indicative_action_cost ??
                                      0
                                    ) || 0;
                                    setSelectedPaConsumption(maxPa > 0 ? Math.min(Math.max(0, v), maxPa) : Math.max(0, v));
                                  }}
                                  placeholder={`Max ${Number((info.levelData as any)?.max_pa_investment ?? (selectedSpell as any)?.max_pa_investment ?? (info.levelData as any)?.extra_action_cost ?? (selectedSpell as any)?.extra_action_cost ?? (info.levelData as any)?.indicative_action_cost ?? (selectedSpell as any)?.indicative_action_cost ?? 0) || 0}`}
                                />
                                {(() => {
                                  const rate = Number(
                                    info.levelData?.increasing_damage_per_pa ||
                                    (selectedSpell as any)?.increasing_damage_per_pa ||
                                    (selectedSpell as any)?.increase_damage_per_pa ||
                                    0
                                  ) || 0;
                                  return rate > 0 ? (
                                    <span className="text-xs text-muted-foreground">Tasso crescita/PA: {rate}</span>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Usa anche danno arma: se abilitato dal livello magia, mostra UI arma */}
                          {(() => {
                            const useWeapon = !!(info.levelData?.use_weapon_damage || (selectedSpell as any)?.use_weapon_damage);
                            return useWeapon ? (
                              <div className="pt-2 space-y-2">
                                <div className="text-xs text-muted-foreground">Usa anche danno arma</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium">Arma</label>
                                    <Select value={selectedWeapon?.id || ''} onValueChange={(value) => {
                                      const w = weapons.find((x: any) => String(x?.id) === String(value) || (x?.name && String(x.name) === String(value)));
                                      setSelectedWeapon(w || null);
                                    }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona arma" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {weapons.map((w: any) => (
                                          <SelectItem key={w.id ?? w.name ?? `weapon-${w.index ?? w.name ?? 'x'}`} value={String((w.id && String(w.id).length > 0) ? w.id : (w.name && String(w.name).length > 0 ? w.name : `weapon-${w.name ?? 'x'}`))}>
                                            {w.name || 'Arma'}
                                          </SelectItem>
                                        ))}
                                        {weapons.length === 0 && (
                                          <SelectItem value="no-weapon" disabled>Nessuna arma disponibile</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {selectedWeapon && (() => {
                                    const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                      ? (selectedWeapon as any).data.damage_sets
                                      : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);

                                    const sum = (arr: any[], baseKey: string, calcKey: string, fallbackBase: number) => {
                                      const base = arr.length > 0 ? arr.reduce((tot, s) => tot + (Number((s as any)?.[baseKey]) || 0), 0) : Number(fallbackBase || 0);
                                      const calc = arr.length > 0 ? arr.reduce((tot, s) => tot + (Number((s as any)?.[calcKey]) || 0), 0) : Math.floor(Number(fallbackBase || 0) * 0.33);
                                      return { base, calc };
                                    };

                                    const veloce = sum(sets, 'damage_veloce', 'calculated_damage_veloce', (selectedWeapon as any)?.damageVeloce);
                                    const pesante = sum(sets, 'damage_pesante', 'calculated_damage_pesante', (selectedWeapon as any)?.damagePesante);
                                    const affondo = sum(sets, 'damage_affondo', 'calculated_damage_affondo', (selectedWeapon as any)?.damageAffondo);

                                    const subtype = (selectedWeapon as any)?.subtype;
                                    const weight = (selectedWeapon as any)?.weight;

                                    return (
                                      <div className="rounded border p-2 text-sm space-y-1">
                                        <div className="font-medium">{(selectedWeapon as any)?.name || 'Arma'}</div>
                                        {subtype ? (<div>Sottotipo: {String(subtype)}</div>) : null}
                                        {Number(weight || 0) > 0 ? (<div>Peso: {Number(weight)}</div>) : null}
                                        <div className="pt-1">
                                          <div className="text-xs text-muted-foreground">Dettaglio danni</div>
                                          <div className="grid grid-cols-3 gap-1">
                                            <div className="flex items-center justify-between border rounded px-2 py-1">
                                              <span>Leggero</span>
                                              <span>{`d${Number(veloce.base || 0)} + ${Number(veloce.calc || 0)}`}</span>
                                            </div>
                                            <div className="flex items-center justify-between border rounded px-2 py-1">
                                              <span>Pesante</span>
                                              <span>{`d${Number(pesante.base || 0)} + ${Number(pesante.calc || 0)}`}</span>
                                            </div>
                                            <div className="flex items-center justify-between border rounded px-2 py-1">
                                              <span>Affondo</span>
                                              <span>{`d${Number(affondo.base || 0)} + ${Number(affondo.calc || 0)}`}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div>
                                    <label className="text-sm font-medium">Tipo di danno</label>
                                    <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Scegli tipo danno" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="leggero">
                                          {(() => {
                                            const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                              ? (selectedWeapon as any).data.damage_sets
                                              : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                                            const base = (sets.length > 0)
                                              ? sets.reduce((sum, s) => sum + (Number(s?.damage_veloce) || 0), 0)
                                              : Number((selectedWeapon as any)?.damageVeloce || 0);
                                            const calc = (sets.length > 0)
                                              ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_veloce) || 0), 0)
                                              : Math.floor(base * 0.33);
                                            return `Leggero (d${base} + ${calc})`;
                                          })()}
                                        </SelectItem>
                                        <SelectItem value="pesante">
                                          {(() => {
                                            const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                              ? (selectedWeapon as any).data.damage_sets
                                              : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                                            const base = (sets.length > 0)
                                              ? sets.reduce((sum, s) => sum + (Number(s?.damage_pesante) || 0), 0)
                                              : Number((selectedWeapon as any)?.damagePesante || 0);
                                            const calc = (sets.length > 0)
                                              ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_pesante) || 0), 0)
                                              : Math.floor(base * 0.33);
                                            return `Pesante (d${base} + ${calc})`;
                                          })()}
                                        </SelectItem>
                                        <SelectItem value="affondo">
                                          {(() => {
                                            const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                              ? (selectedWeapon as any).data.damage_sets
                                              : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                                            const base = (sets.length > 0)
                                              ? sets.reduce((sum, s) => sum + (Number(s?.damage_affondo) || 0), 0)
                                              : Number((selectedWeapon as any)?.damageAffondo || 0);
                                            const calc = (sets.length > 0)
                                              ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_affondo) || 0), 0)
                                              : Math.floor(base * 0.33);
                                            return `Affondo (d${base} + ${calc})`;
                                          })()}
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {isRangedWeapon && (
                                    <div>
                                      <label className="text-sm font-medium">Frecce (consuma 1)</label>
                                      <Select value={selectedArrow?.id || ''} onValueChange={(value) => {
                                        const a = arrows.find((x: any) => String(x?.id) === String(value) || (x?.name && String(x.name) === String(value)));
                                        setSelectedArrow(a || null);
                                      }}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seleziona freccia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {arrows.map((a: any) => (
                                            <SelectItem key={a.id ?? a.name} value={String(a.id ?? a.name)}>
                                              {a.name}{a.__source === 'magic_quiver' ? ' (Magica)' : ''}
                                              {a.quantity != null ? ` • x${a.quantity}` : ''}
                                              {a.__damage_display ? ` • ${a.__damage_display}` : (a.damage ? ` • D:${a.damage}` : '')}
                                            </SelectItem>
                                          ))}
                                          {arrows.length === 0 && (
                                            <SelectItem value="no-arrow" disabled>Nessuna freccia disponibile</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {isRangedWeapon && selectedArrow && (
                                    <div className="mt-2 rounded border p-2 text-sm">
                                      <div className="font-semibold">{selectedArrow.name}</div>
                                      {selectedArrow.description && (
                                        <div className="text-muted-foreground">{selectedArrow.description}</div>
                                      )}
                                      {Array.isArray((selectedArrow as any)?.damage_sets) && (selectedArrow as any).damage_sets.length > 0 ? (
                                        <div className="mt-1 space-y-1">
                                          {((selectedArrow as any).damage_sets || []).map((ds: any, idx: number) => {
                                            const eff = ds?.effect_name || `Effetto ${idx + 1}`;
                                            const guar = Number(ds?.guaranteed_damage || 0);
                                            const addi = Number(ds?.additional_damage || 0);
                                            return (
                                              <div key={`${eff}-${idx}`}>• {eff}: {guar} {addi > 0 ? `+ d${addi}` : ''}</div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="mt-1">Danno: {Number((selectedArrow as any)?.damage || 0)}{Number((selectedArrow as any)?.additional_damage || 0) > 0 ? ` + d${Number((selectedArrow as any)?.additional_damage || 0)}` : ''}</div>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    <label className="text-sm font-medium">Competenze arma (non influiscono sul tiro)</label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      {damageCompetenceOptions.map(opt => (
                                        <div key={opt.id} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`dm-mg-${opt.id}`}
                                            checked={selectedDamageCompetences.includes(opt.id)}
                                            onCheckedChange={() => handleDamageCompetenceToggle(opt.id)}
                                          />
                                          <label htmlFor={`dm-mg-${opt.id}`} className="text-sm">{opt.label} ({(character as any)?.abilities?.[opt.id] ?? 0})</label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {(() => {
                            const info = getSpellLevelInfo(selectedSpell);
                            const lvl = info?.levelData || {};
                            const enabled = toBool((lvl as any)?.lottery_enabled ?? (selectedSpell as any)?.lottery_enabled);
                            const diceFaces = Number((lvl as any)?.lottery_dice_faces ?? (selectedSpell as any)?.lottery_dice_faces ?? 0) || 0;
                            const numericChoices = Number((lvl as any)?.lottery_numeric_choices ?? (selectedSpell as any)?.lottery_numeric_choices ?? 0) || 0;
                            const show = enabled && (diceFaces > 0 || numericChoices > 0);
                            if (!show) return null;
                            const values = lotteryUserChoices.slice(0, numericChoices);
                            return (
                              <div className="pt-2 space-y-2">
                                <div className="text-xs text-muted-foreground">Tombola</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="rounded border p-2 text-sm">Facce del dado: {diceFaces > 0 ? diceFaces : '-'}</div>
                                  <div className="rounded border p-2 text-sm">
                                    {(() => {
                                      const arr: any[] = Array.isArray((lvl as any)?.lottery_correct_instances) ? (lvl as any).lottery_correct_instances : [];
                                      return (
                                        <div>
                                          <div className="font-medium">Istanze corrette</div>
                                          {arr.length > 0 ? (
                                            <ul className="list-disc ml-4 mt-1">
                                              {arr.map((it: any, i: number) => (
                                                <li key={`lc-${i}`}>{String((it as any)?.title || `Corretta ${i + 1}`)}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <div className="text-muted-foreground">Nessuna</div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="rounded border p-2 text-sm">
                                    {(() => {
                                      const arr: any[] = Array.isArray((lvl as any)?.lottery_wrong_instances) ? (lvl as any).lottery_wrong_instances : [];
                                      return (
                                        <div>
                                          <div className="font-medium">Istanze sbagliate</div>
                                          {arr.length > 0 ? (
                                            <ul className="list-disc ml-4 mt-1">
                                              {arr.map((it: any, i: number) => (
                                                <li key={`lw-${i}`}>{String((it as any)?.title || `Sbagliata ${i + 1}`)}</li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <div className="text-muted-foreground">Nessuna</div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="rounded border p-2 text-sm">
                                    <div className="font-medium">Scelte utente</div>
                                    {numericChoices > 0 ? (
                                      <div className="grid grid-cols-2 gap-2 mt-1">
                                        {Array.from({ length: numericChoices }).map((_, idx) => (
                                          <Input
                                            key={`lc-input-${idx}`}
                                            type="number"
                                            min={1}
                                            max={diceFaces > 0 ? diceFaces : undefined}
                                            step={1}
                                            value={values[idx] ?? ''}
                                            onChange={(e) => {
                                              const raw = Number(e.target.value);
                                              const n = isNaN(raw) ? 0 : raw;
                                              const min = 1;
                                              const max = diceFaces > 0 ? diceFaces : Number.POSITIVE_INFINITY;
                                              const clamped = Math.min(Math.max(min, n), max);
                                              setLotteryUserChoices(prev => {
                                                const next = [...prev];
                                                next[idx] = clamped;
                                                return next;
                                              });
                                            }}
                                            placeholder={'Numero'}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground">Nessuna scelta richiesta</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Dettagli evocazione, se presenti nel livello selezionato */}
                          {info.levelData?.evocation_enabled && (
                            <div className="pt-2 space-y-1">
                              <div className="font-medium">Evocazione</div>
                              {info.levelData?.evocation_type === 'weapon' && (
                                <div className="space-y-1">
                                  {info.levelData?.weapon_description && (
                                    <div>Descrizione: {info.levelData.weapon_description}</div>
                                  )}
                                  {info.levelData?.weapon_subtype && (
                                    <div>Sottotipo: {info.levelData.weapon_subtype}</div>
                                  )}
                                  {Number(info.levelData?.weapon_weight || 0) > 0 && (
                                    <div>Peso: {Number(info.levelData.weapon_weight || 0)}</div>
                                  )}
                                  {Array.isArray(info.levelData?.weapon_stats) && (() => {
                                    const stats = info.levelData.weapon_stats.filter((s: any) => Number(s?.amount ?? 0) > 0);
                                    return stats.length > 0 ? (
                                      <div>
                                        <span>Statistiche:</span>
                                        <div className="ml-2 grid grid-cols-2 gap-x-3 gap-y-1">
                                          {stats.map((s: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <span className="font-medium">{prettyStatLabel(String(s?.statKey ?? ''))}</span>
                                              <span>{Number(s?.amount ?? 0)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}
                                  {Array.isArray(info.levelData?.weapon_damage_sets) && info.levelData.weapon_damage_sets.length > 0 && (
                                    <div>
                                      <span>Set di danno:</span>
                                      <div className="ml-2 space-y-1">
                                        {info.levelData.weapon_damage_sets.map((ds: any, i: number) => {
                                          const name = ds?.effect_name?.trim?.() || null;
                                          const dv = (v: unknown) => Number(v ?? 0);
                                          const lv = dv(ds?.damage_veloce);
                                          const hv = dv(ds?.damage_pesante);
                                          const tv = dv(ds?.damage_affondo);
                                          const clv = dv(ds?.calculated_damage_veloce) || (lv > 0 ? Math.floor(lv * 0.33) : 0);
                                          const chv = dv(ds?.calculated_damage_pesante) || (hv > 0 ? Math.floor(hv * 0.33) : 0);
                                          const ctv = dv(ds?.calculated_damage_affondo) || (tv > 0 ? Math.floor(tv * 0.33) : 0);
                                          if (!name && lv <= 0 && hv <= 0 && tv <= 0) return null;
                                          return (
                                            <div key={i}>
                                              {(name || lv > 0 || hv > 0 || tv > 0) && (
                                                <div>
                                                  {name ? `${name}: ` : ''}
                                                  {lv > 0 ? `Veloce ${lv} (Calcolato ${clv})` : ''}
                                                  {lv > 0 && (hv > 0 || tv > 0) ? ' | ' : ''}
                                                  {hv > 0 ? `Pesante ${hv} (Calcolato ${chv})` : ''}
                                                  {hv > 0 && tv > 0 ? ' | ' : ''}
                                                  {tv > 0 ? `Affondo ${tv} (Calcolato ${ctv})` : ''}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {info.levelData?.evocation_type === 'replica' && (
                                <div className="space-y-1">
                                  {Number(info.levelData?.max_replicas || 0) > 0 && (
                                    <div>Massimo repliche: {Number(info.levelData?.max_replicas || 0)}</div>
                                  )}
                                  {info.levelData?.replica_source_character_id && (
                                    <div>Sorgente: {String(info.levelData?.replica_source_character_id)}</div>
                                  )}
                                </div>
                              )}

                              {info.levelData?.evocation_type === 'energy' && (
                                <div className="space-y-1">
                                  {Number(info.levelData?.energy_health || 0) > 0 && (<div>Salute: {Number(info.levelData?.energy_health || 0)}</div>)}
                                  {Number(info.levelData?.energy_action_points || 0) > 0 && (<div>PA: {Number(info.levelData?.energy_action_points || 0)}</div>)}
                                  {Number(info.levelData?.energy_armour || 0) > 0 && (<div>Armatura: {Number(info.levelData?.energy_armour || 0)}</div>)}
                                  {Array.isArray(info.levelData?.energy_stats) && (() => {
                                    const stats = info.levelData.energy_stats.filter((s: any) => Number(s?.amount ?? 0) > 0);
                                    return stats.length > 0 ? (
                                      <div>
                                        <span>Statistiche:</span>
                                        <div className="ml-2 grid grid-cols-2 gap-x-3 gap-y-1">
                                          {stats.map((s: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <span className="font-medium">{prettyStatLabel(String(s?.statKey ?? ''))}</span>
                                              <span>{Number(s?.amount ?? 0)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}
                                  {Array.isArray(info.levelData?.energy_embedded_refs) && info.levelData.energy_embedded_refs.length > 0 && (
                                    <div>
                                      <span>Magie:</span>
                                      <div className="ml-2 space-y-1">
                                        {info.levelData.energy_embedded_refs.map((r: any, i: number) => {
                                          const name = (r?.refName ?? r?.name ?? null);
                                          const lvl = (r?.refLevel ?? r?.level ?? null);
                                          if (!name && !lvl) return null;
                                          return (
                                            <div key={i}>{name ?? 'Magia'}{lvl ? ` (Livello ${lvl})` : ''}</div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {info.levelData?.energy_can_create_equipment && (<div>Crea equipaggiamento: Sì</div>)}
                                </div>
                              )}

                              {(() => {
                                const p1 = Number(info.levelData?.anomaly1_percentage ?? 0);
                                const t1 = info.levelData?.anomaly1_type;
                                const p2 = Number(info.levelData?.anomaly2_percentage ?? 0);
                                const t2 = info.levelData?.anomaly2_type;
                                const p3 = Number(info.levelData?.anomaly3_percentage ?? 0);
                                const t3 = info.levelData?.anomaly3_type;
                                const anomalies = [
                                  { percentage: p1, type: t1 },
                                  { percentage: p2, type: t2 },
                                  { percentage: p3, type: t3 },
                                ].filter(a => a.percentage > 0 && a.type && a.type !== 'Nessuna');
                                return anomalies.length > 0 ? (
                                  <div className="pt-1">
                                    <span>Anomalie:</span>
                                    <div className="ml-2 space-y-1">
                                      {anomalies.map((a, i) => (
                                        <div key={i}>
                                          {a.type}: {a.percentage}%
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {damageSource === 'ability' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Abilità</label>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => setIsAbilityModalOpen(true)}>Cerca abilità</Button>
                        {(() => {
                          const a = selectedAbility as any;
                          if (!a) return (<span className="text-sm text-muted-foreground">Nessuna abilità selezionata</span>);
                          const levelNum = Number(a?.current_level) || Number(a?.level) || Number(a?.levels?.[0]?.level) || 1;
                          return (<span className="text-sm">{String(a.name)} • Livello {levelNum}</span>);
                        })()}
                        {selectedAbility && (
                          <Button variant="ghost" onClick={() => { setSelectedAbility(null); }}>Rimuovi</Button>
                        )}
                      </div>
                    </div>

                      {selectedAbility && (
                        <div className="rounded border p-2 text-sm space-y-1">
                          <div className="font-medium">{selectedAbility.name}</div>
                          {selectedAbility.levels && Array.isArray(selectedAbility.levels) && selectedAbility.levels.length > 0 ? (
                            <>
                              <div>Livello: {selectedAbility.levels[0]?.level ?? '-'}</div>
                              <div>Punti azione: {selectedAbility.levels[0]?.punti_azione ?? selectedAbility.levels[0]?.action_cost ?? '-'}</div>
                              {(() => {
                                const toNum = (v: any): number => {
                                  if (typeof v === 'number') return v;
                                  const s = String(v ?? '').trim().replace(',', '.');
                                  const m = s.match(/-?\d+(?:\.\d+)?/);
                                  return m ? parseFloat(m[0]) : 0;
                                };
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const detailed = (Array.isArray(lvl?.damage_values) ? (lvl.damage_values as any[]) : []).filter((v: any) => (
                                  toNum(v?.guaranteed_damage) > 0 || toNum(v?.additional_damage) > 0
                                ));
                                const detailedPct = (Array.isArray(lvl?.percentage_damage_values) ? (lvl.percentage_damage_values as any[]) : []).filter((v: any) => (
                                  toNum(v?.guaranteed_percentage_damage) > 0 || toNum(v?.additional_percentage_damage) > 0
                                ));
                                if (detailed.length === 0 && detailedPct.length === 0) return null;
                                return (
                                  <div className="pt-1">
                                    {detailed.length > 0 && (
                                      <>
                                        <div className="text-xs text-muted-foreground">Dettaglio danni</div>
                                        <div className="grid grid-cols-2 gap-1">
                                          {detailed.map((v: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between border rounded px-2 py-1">
                                              <span>{v?.typeName || v?.name || 'Generico'}</span>
                                              <span>{toNum(v?.guaranteed_damage || 0)} + d{toNum(v?.additional_damage || 0)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                    {detailedPct.length > 0 && (
                                      <>
                                        <div className="text-xs text-muted-foreground mt-2">Danni percentuali</div>
                                        <div className="grid grid-cols-2 gap-1">
                                          {detailedPct.map((v: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between border rounded px-2 py-1">
                                              <span>{v?.typeName || v?.name || 'Generico'}</span>
                                              <span>{toNum(v?.guaranteed_percentage_damage || 0)}% + {toNum(v?.additional_percentage_damage || 0)}%</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}

                              {(() => {
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const scaledStats: string[] = Array.isArray(lvl?.scaled_move_stats) ? lvl.scaled_move_stats : [];
                                const scaledSkills: string[] = Array.isArray(lvl?.scaled_move_skills) ? lvl.scaled_move_skills : [];
                                const getStatValue = (k: string) => {
                                  const key = String(k || '').trim();
                                  const v = (calculations?.totalStats?.[key] ?? (character as any)?.totalStats?.[key] ?? (character as any)?.baseStats?.[key] ?? 0);
                                  return Number(v || 0) || 0;
                                };
                                const getSkillValue = (k: string) => {
                                  const key = String(k || '').trim();
                                  return Number((character as any)?.abilities?.[key] ?? 0) || 0;
                                };
                                const skillLabel = (k: string) => {
                                  const key = String(k || '').trim();
                                  const a = (actionCompetences || []).find((c: any) => String(c?.key) === key);
                                  if (a?.name) return String(a.name);
                                  const w = (damageCompetenceOptions || []).find((c: any) => String(c?.id) === key);
                                  if (w?.label) return String(w.label);
                                  return prettyStatLabel(key);
                                };
                                const items = [
                                  ...(scaledStats || []).map((k) => ({ kind: 'stat' as const, key: String(k || '').trim(), value: getStatValue(String(k || '').trim()) })).filter(x => x.key),
                                  ...(scaledSkills || []).map((k) => ({ kind: 'skill' as const, key: String(k || '').trim(), value: getSkillValue(String(k || '').trim()) })).filter(x => x.key),
                                ];
                                if (items.length === 0) return null;
                                return (
                                  <div className="pt-1">
                                    <div className="text-xs text-muted-foreground">Mossa scalata</div>
                                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                                      {items.map((x, i) => (
                                        <div key={`${x.kind}:${x.key}:${i}`} className="flex items-center justify-between border rounded px-2 py-1">
                                          <span>{x.kind === 'stat' ? prettyStatLabel(x.key) : skillLabel(x.key)}</span>
                                          <span>{Math.round(Number(x.value || 0))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {(() => {
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const maxPa = Number(lvl?.max_pa_investment || (selectedAbility as any)?.max_pa_investment || 0) || 0;
                                const dmgIncEnabled = !!(lvl?.damageIncreasePerPaEnabled || (selectedAbility as any)?.damageIncreasePerPaEnabled);
                                const rate = Number(lvl?.increasing_damage_per_pa || (selectedAbility as any)?.increasing_damage_per_pa || 0) || 0;
                                const succEvery = Number(lvl?.success_roll_increase_every_pa || (selectedAbility as any)?.success_roll_increase_every_pa || 0) || 0;
                                const explicitFlag = !!(lvl?.paInvestmentEnabled || (selectedAbility as any)?.paInvestmentEnabled);
                                const paEnabled = explicitFlag || (maxPa > 0) || dmgIncEnabled || (rate > 0) || (succEvery > 0);
                                return paEnabled ? (
                                  <div className="pt-2 space-y-2">
                                    <label className="text-sm font-medium">Impiego PA</label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={maxPa > 0 ? Math.max(0, maxPa) : undefined}
                                        value={selectedPaConsumption}
                                        onChange={(e) => setSelectedPaConsumption(maxPa > 0 ? Math.min(Math.max(0, Number(e.target.value) || 0), maxPa) : Math.max(0, Number(e.target.value) || 0))}
                                        placeholder={`Max ${maxPa}`}
                                      />
                                      {dmgIncEnabled && rate > 0 && (
                                      <span className="text-xs text-muted-foreground">Danno × {rate}<sup>PA</sup></span>
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                              {(() => {
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const rawShape = String(lvl?.damage_shape || '').toLowerCase();
                                const maxTargets = Number(lvl?.max_targets || 0) || 0;
                                let rule: string | null = null;
                                if (rawShape.includes('area') || rawShape.includes('cono')) rule = 'Selezione bersagli illimitata';
                                else if (rawShape.includes('catena')) rule = `Selezione massima: ${maxTargets > 0 ? maxTargets : '—'}`;
                                else rule = `Selezione massima: ${maxTargets > 0 ? maxTargets : 1}`;
                                return (
                                  <div className="pt-1">
                                    <div className="text-xs text-muted-foreground">Regole bersagli</div>
                                    <div>{rule}</div>
                                  </div>
                                );
                              })()}
                              {(() => {
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const maxProjVal = Number(
                                  (lvl as any)?.max_multiple_attacks ||
                                  (selectedAbility as any)?.max_multiple_attacks ||
                                  (lvl as any)?.max_projectiles ||
                                  (selectedAbility as any)?.max_projectiles ||
                                  0
                                ) || 0;
                                return maxProjVal > 0;
                              })() && (
                                <div className="pt-2 space-y-1">
                                  <div className="text-xs text-muted-foreground">Tiri multipli</div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={(() => {
                                        const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                        const val = Number(
                                          (lvl as any)?.max_multiple_attacks ||
                                          (selectedAbility as any)?.max_multiple_attacks ||
                                          (lvl as any)?.max_projectiles ||
                                          (selectedAbility as any)?.max_projectiles ||
                                          0
                                        ) || 0;
                                        return val > 0 ? val : undefined;
                                      })()}
                                      value={selectedShotsCount}
                                      onChange={(e) => {
                                        const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                        const v = Number(e.target.value) || 0;
                                        const max = Number(
                                          (lvl as any)?.max_multiple_attacks ||
                                          (selectedAbility as any)?.max_multiple_attacks ||
                                          (lvl as any)?.max_projectiles ||
                                          (selectedAbility as any)?.max_projectiles ||
                                          0
                                        ) || 0;
                                        const clampedShots = max > 0 ? Math.min(Math.max(0, v), max) : Math.max(0, v);
                                        setSelectedShotsCount(clampedShots);
                                        const maxSecVal = Number((lvl as any)?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0;
                                        const dpsEnabled = ((maxSecVal > 0) ||
                                          (Number((lvl as any)?.pa_cost_per_second || (selectedAbility as any)?.pa_cost_per_second || 0) > 0) ||
                                          (Number((lvl as any)?.increasing_damage_per_second || (selectedAbility as any)?.increasing_damage_per_second || 0) > 0));
                                        if (dpsEnabled) {
                                          const clampedSec = maxSecVal > 0 ? Math.min(Math.max(0, v), maxSecVal) : Math.max(0, v);
                                          setSelectedDpsSeconds(clampedSec);
                                        }
                                        const maxPa = Number((lvl as any)?.max_pa_investment || (selectedAbility as any)?.max_pa_investment || 0) || 0;
                                        const incPa = Number((lvl as any)?.increasing_damage_per_pa || (selectedAbility as any)?.increasing_damage_per_pa || 0) || 0;
                                        const succEvery = Number((lvl as any)?.success_roll_increase_every_pa || (selectedAbility as any)?.success_roll_increase_every_pa || 0) || 0;
                                        const paFlag = !!(
                                          (lvl as any)?.paInvestmentEnabled ||
                                          (selectedAbility as any)?.paInvestmentEnabled ||
                                          (lvl as any)?.damageIncreasePerPaEnabled ||
                                          (selectedAbility as any)?.damageIncreasePerPaEnabled ||
                                          (lvl as any)?.successRollIncreasePerPaEnabled ||
                                          (selectedAbility as any)?.successRollIncreasePerPaEnabled
                                        );
                                        const paEnabled = paFlag || (maxPa > 0) || (incPa > 0) || (succEvery > 0);
                                        if (paEnabled) {
                                          const clampedPa = maxPa > 0 ? Math.min(Math.max(0, v), maxPa) : Math.max(0, v);
                                          setSelectedPaConsumption(clampedPa);
                                        }
                                      }}
                                      placeholder={(() => {
                                        const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                        const val = Number(
                                          (lvl as any)?.max_multiple_attacks ||
                                          (selectedAbility as any)?.max_multiple_attacks ||
                                          (lvl as any)?.max_projectiles ||
                                          (selectedAbility as any)?.max_projectiles ||
                                          0
                                        ) || 0;
                                        return `Max ${val}`;
                                      })()}
                                    />
                                    <span className="text-xs text-muted-foreground">Danno crescente: {(() => { const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any); return Number((lvl as any)?.increasing_damage_per_projectile || (selectedAbility as any)?.increasing_damage_per_projectile || 0) || 0; })()}</span>
                                  </div>
                                </div>
                              )}
                              {(() => {
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const maxS = Number((lvl as any)?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0;
                                const paS = Number((lvl as any)?.pa_cost_per_second || (selectedAbility as any)?.pa_cost_per_second || 0) || 0;
                                const incS = Number((lvl as any)?.increasing_damage_per_second || (selectedAbility as any)?.increasing_damage_per_second || 0) || 0;
                                const show = (maxS > 0) || (paS > 0) || (incS > 0);
                                return show;
                              })() && (
                                <div className="pt-2 space-y-1">
                                  <div className="text-xs text-muted-foreground">Danno al secondo</div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={(() => { const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any); const m = Number((lvl as any)?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0; return m > 0 ? m : undefined; })()}
                                      value={selectedDpsSeconds}
                                      onChange={(e) => { const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any); const v = Number(e.target.value) || 0; const max = Number((lvl as any)?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0; setSelectedDpsSeconds(max > 0 ? Math.min(Math.max(0, v), max) : Math.max(0, v)); }}
                                      placeholder={(() => { const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any); const m = Number((lvl as any)?.max_seconds || (selectedAbility as any)?.max_seconds || 0) || 0; return `Max ${m}`; })()}
                                    />
                                    <span className="text-xs text-muted-foreground">Danno crescente: {(() => { const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any); return Number((lvl as any)?.increasing_damage_per_second || (selectedAbility as any)?.increasing_damage_per_second || 0) || 0; })()}</span>
                                  </div>
                                </div>
                              )}
                              {(() => {
                                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                                const enabled = toBool((lvl as any)?.lottery_enabled ?? (selectedAbility as any)?.lottery_enabled);
                                const diceFaces = Number((lvl as any)?.lottery_dice_faces ?? (selectedAbility as any)?.lottery_dice_faces ?? 0) || 0;
                                const numericChoices = Number((lvl as any)?.lottery_numeric_choices ?? (selectedAbility as any)?.lottery_numeric_choices ?? 0) || 0;
                                const show = enabled && (diceFaces > 0 || numericChoices > 0);
                                if (!show) return null;
                                const values = lotteryUserChoices.slice(0, numericChoices);
                                return (
                                  <div className="pt-2 space-y-2">
                                    <div className="text-xs text-muted-foreground">Tombola</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div className="rounded border p-2 text-sm">Facce del dado: {diceFaces > 0 ? diceFaces : '-'}</div>
                                      <div className="rounded border p-2 text-sm">
                                        {(() => {
                                          const arr: any[] = Array.isArray((lvl as any)?.lottery_correct_instances) ? (lvl as any).lottery_correct_instances : [];
                                          return (
                                            <div>
                                              <div className="font-medium">Istanze corrette</div>
                                              {arr.length > 0 ? (
                                                <ul className="list-disc ml-4 mt-1">
                                                  {arr.map((it: any, i: number) => (
                                                    <li key={`lc-ab-${i}`}>{String((it as any)?.title || `Corretta ${i + 1}`)}</li>
                                                  ))}
                                                </ul>
                                              ) : (
                                                <div className="text-muted-foreground">Nessuna</div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="rounded border p-2 text-sm">
                                        {(() => {
                                          const arr: any[] = Array.isArray((lvl as any)?.lottery_wrong_instances) ? (lvl as any).lottery_wrong_instances : [];
                                          return (
                                            <div>
                                              <div className="font-medium">Istanze sbagliate</div>
                                              {arr.length > 0 ? (
                                                <ul className="list-disc ml-4 mt-1">
                                                  {arr.map((it: any, i: number) => (
                                                    <li key={`lw-ab-${i}`}>{String((it as any)?.title || `Sbagliata ${i + 1}`)}</li>
                                                  ))}
                                                </ul>
                                              ) : (
                                                <div className="text-muted-foreground">Nessuna</div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="rounded border p-2 text-sm">
                                        <div className="font-medium">Scelte utente</div>
                                        {numericChoices > 0 ? (
                                          <div className="grid grid-cols-2 gap-2 mt-1">
                                            {Array.from({ length: numericChoices }).map((_, idx) => (
                                              <Input
                                                key={`lc-ab-input-${idx}`}
                                                type="number"
                                                min={1}
                                                max={diceFaces > 0 ? diceFaces : undefined}
                                                step={1}
                                                value={values[idx] ?? ''}
                                                onChange={(e) => {
                                                  const raw = Number(e.target.value);
                                                  const n = isNaN(raw) ? 0 : raw;
                                                  const min = 1;
                                                  const max = diceFaces > 0 ? diceFaces : Number.POSITIVE_INFINITY;
                                                  const clamped = Math.min(Math.max(min, n), max);
                                                  setLotteryUserChoices(prev => {
                                                    const next = [...prev];
                                                    next[idx] = clamped;
                                                    return next;
                                                  });
                                                }}
                                                placeholder={'Numero'}
                                              />
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-muted-foreground">Nessuna scelta richiesta</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <div>Nessun dettaglio livello disponibile</div>
                          )}

                        {/* Usa anche danno arma per abilità */}
                        {(() => {
                          const lvl = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                          const useWeapon = !!(lvl?.use_weapon_damage || (selectedAbility as any)?.use_weapon_damage);
                          return useWeapon ? (
                            <div className="pt-2 space-y-2">
                              <div className="text-xs text-muted-foreground">Usa anche danno arma</div>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium">Arma</label>
                                  <Select value={selectedWeapon?.id || ''} onValueChange={(value) => {
                                    const w = weapons.find((x: any) => String(x?.id) === String(value) || (x?.name && String(x.name) === String(value)));
                                    setSelectedWeapon(w || null);
                                  }}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleziona arma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {weapons.map((w: any) => (
                                        <SelectItem key={w.id ?? w.name ?? `weapon-${w.index ?? w.name ?? 'x'}`} value={String((w.id && String(w.id).length > 0) ? w.id : (w.name && String(w.name).length > 0 ? w.name : `weapon-${w.name ?? 'x'}`))}>
                                          {w.name || 'Arma'}
                                        </SelectItem>
                                      ))}
                                      {weapons.length === 0 && (
                                        <SelectItem value="no-weapon" disabled>Nessuna arma disponibile</SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {selectedWeapon && (() => {
                                  const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                    ? (selectedWeapon as any).data.damage_sets
                                    : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);

                                  const sum = (arr: any[], baseKey: string, calcKey: string, fallbackBase: number) => {
                                    const base = arr.length > 0 ? arr.reduce((tot, s) => tot + (Number((s as any)?.[baseKey]) || 0), 0) : Number(fallbackBase || 0);
                                    const calc = arr.length > 0 ? arr.reduce((tot, s) => tot + (Number((s as any)?.[calcKey]) || 0), 0) : Math.floor(Number(fallbackBase || 0) * 0.33);
                                    return { base, calc };
                                  };

                                  const veloce = sum(sets, 'damage_veloce', 'calculated_damage_veloce', (selectedWeapon as any)?.damageVeloce);
                                  const pesante = sum(sets, 'damage_pesante', 'calculated_damage_pesante', (selectedWeapon as any)?.damagePesante);
                                  const affondo = sum(sets, 'damage_affondo', 'calculated_damage_affondo', (selectedWeapon as any)?.damageAffondo);

                                  const subtype = (selectedWeapon as any)?.subtype;
                                  const weight = (selectedWeapon as any)?.weight;

                                  return (
                                    <div className="rounded border p-2 text-sm space-y-1">
                                      <div className="font-medium">{(selectedWeapon as any)?.name || 'Arma'}</div>
                                      {subtype ? (<div>Sottotipo: {String(subtype)}</div>) : null}
                                      {Number(weight || 0) > 0 ? (<div>Peso: {Number(weight)}</div>) : null}
                                      <div className="pt-1">
                                        <div className="text-xs text-muted-foreground">Dettaglio danni</div>
                                        <div className="grid grid-cols-3 gap-1">
                                          <div className="flex items-center justify-between border rounded px-2 py-1">
                                            <span>Leggero</span>
                                            <span>{`d${Number(veloce.base || 0)} + ${Number(veloce.calc || 0)}`}</span>
                                          </div>
                                          <div className="flex items-center justify-between border rounded px-2 py-1">
                                            <span>Pesante</span>
                                            <span>{`d${Number(pesante.base || 0)} + ${Number(pesante.calc || 0)}`}</span>
                                          </div>
                                          <div className="flex items-center justify-between border rounded px-2 py-1">
                                            <span>Affondo</span>
                                            <span>{`d${Number(affondo.base || 0)} + ${Number(affondo.calc || 0)}`}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div>
                                  <label className="text-sm font-medium">Tipo di danno</label>
                                  <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Scegli tipo danno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="leggero">
                                        {(() => {
                                          const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                            ? (selectedWeapon as any).data.damage_sets
                                            : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                                          const base = (sets.length > 0)
                                            ? sets.reduce((sum, s) => sum + (Number(s?.damage_veloce) || 0), 0)
                                            : Number((selectedWeapon as any)?.damageVeloce || 0);
                                          const calc = (sets.length > 0)
                                            ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_veloce) || 0), 0)
                                            : Math.floor(base * 0.33);
                                          return `Leggero (d${base} + ${calc})`;
                                        })()}
                                      </SelectItem>
                                      <SelectItem value="pesante">
                                        {(() => {
                                          const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                            ? (selectedWeapon as any).data.damage_sets
                                            : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                                          const base = (sets.length > 0)
                                            ? sets.reduce((sum, s) => sum + (Number(s?.damage_pesante) || 0), 0)
                                            : Number((selectedWeapon as any)?.damagePesante || 0);
                                          const calc = (sets.length > 0)
                                            ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_pesante) || 0), 0)
                                            : Math.floor(base * 0.33);
                                          return `Pesante (d${base} + ${calc})`;
                                        })()}
                                      </SelectItem>
                                      <SelectItem value="affondo">
                                        {(() => {
                                          const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                            ? (selectedWeapon as any).data.damage_sets
                                            : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                                          const base = (sets.length > 0)
                                            ? sets.reduce((sum, s) => sum + (Number(s?.damage_affondo) || 0), 0)
                                            : Number((selectedWeapon as any)?.damageAffondo || 0);
                                          const calc = (sets.length > 0)
                                            ? sets.reduce((sum, s) => sum + (Number(s?.calculated_damage_affondo) || 0), 0)
                                            : Math.floor(base * 0.33);
                                          return `Affondo (d${base} + ${calc})`;
                                        })()}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {isRangedWeapon && (
                                  <div>
                                    <label className="text-sm font-medium">Frecce (consuma 1)</label>
                                    <Select value={selectedArrow?.id || ''} onValueChange={(value) => {
                                      const a = arrows.find((x: any) => String(x?.id) === String(value) || (x?.name && String(x.name) === String(value)));
                                      setSelectedArrow(a || null);
                                    }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona freccia" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {arrows.map((a: any) => (
                                          <SelectItem key={a.id ?? a.name} value={String(a.id ?? a.name)}>
                                            {a.name}{a.__source === 'magic_quiver' ? ' (Magica)' : ''} {a.quantity != null ? `• x${a.quantity}` : ''} {a.damage ? `• D:${a.damage}` : ''}
                                          </SelectItem>
                                        ))}
                                        {arrows.length === 0 && (
                                          <SelectItem value="no-arrow" disabled>Nessuna freccia disponibile</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {selectedArrow && (
                                      <div className="mt-2 rounded border p-2 text-sm">
                                        <div className="font-semibold">{selectedArrow.name}</div>
                                        {selectedArrow.description && (
                                          <div className="text-muted-foreground">{selectedArrow.description}</div>
                                        )}
                                        {Array.isArray((selectedArrow as any)?.damage_sets) && (selectedArrow as any).damage_sets.length > 0 ? (
                                          <div className="mt-1 space-y-1">
                                            {((selectedArrow as any).damage_sets || []).map((ds: any, idx: number) => {
                                              const eff = ds?.effect_name || `Effetto ${idx + 1}`;
                                              const guar = Number(ds?.guaranteed_damage || 0);
                                              const addi = Number(ds?.additional_damage || 0);
                                              return (
                                                <div key={`${eff}-${idx}`}>• {eff}: {guar} {addi > 0 ? `+ d${addi}` : ''}</div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="mt-1">Danno: {Number((selectedArrow as any)?.damage || 0)}{Number((selectedArrow as any)?.additional_damage || 0) > 0 ? ` + d${Number((selectedArrow as any)?.additional_damage || 0)}` : ''}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div>
                                  <label className="text-sm font-medium">Competenze arma (non influiscono sul tiro)</label>
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {damageCompetenceOptions.map(opt => (
                                      <div key={opt.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`dm-ab-${opt.id}`}
                                          checked={selectedDamageCompetences.includes(opt.id)}
                                          onCheckedChange={() => handleDamageCompetenceToggle(opt.id)}
                                        />
                                        <label htmlFor={`dm-ab-${opt.id}`} className="text-sm">{opt.label} ({(character as any)?.abilities?.[opt.id] ?? 0})</label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Nuove opzioni danno generali */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Competenza bonus (qualsiasi fonte)</label>
                    <Select value={bonusCompetenceType} onValueChange={(v) => setBonusCompetenceType(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona competenza bonus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna</SelectItem>
                        <SelectItem value="assassinio">Assassinio (moltiplicatore)</SelectItem>
                        <SelectItem value="contrattacco">Contrattacco</SelectItem>
                      </SelectContent>
                    </Select>
                    {bonusCompetenceType === 'assassinio' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={assassinioMultiplier}
                          onChange={(e) => setAssassinioMultiplier(parseFloat(e.target.value) || 1)}
                          placeholder="Moltiplicatore (es. 1.5)"
                        />
                        <span className="text-xs text-muted-foreground">Moltiplica i danni</span>
                      </div>
                    )}
                    {bonusCompetenceType === 'contrattacco' && (
                      <div className="text-xs text-muted-foreground">
                        Usa il valore della competenza Contrattacco del personaggio.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Contare Anima ({animaTotal})</label>
                    <Switch checked={includeAnimaInDamage} onCheckedChange={setIncludeAnimaInDamage} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Aggiunte extra (abilità/magie)</label>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExtras(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, type: 'ability', item: null }])}
                      >
                        + Aggiungi
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {extras.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Nessun extra aggiunto.</div>
                      ) : (
                        extras.map((ex, idx) => (
                          <div key={ex.id} className="grid grid-cols-3 gap-2 items-center">
                            <Select value={ex.type} onValueChange={(v) => {
                              setExtras(prev => prev.map((e,i) => i===idx ? { ...e, type: v as 'ability'|'magic', item: null } : e));
                            }}>
                              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ability">Abilità</SelectItem>
                                <SelectItem value="magic">Magia</SelectItem>
                              </SelectContent>
                            </Select>

                            {ex.type === 'ability' ? (
                              <Select value={ex.item?.id ? String(ex.item.id) : ''} onValueChange={(value) => {
                                const ab = abilitiesList.find((x: any) => String(x?.id) === String(value));
                                setExtras(prev => prev.map((e,i) => i===idx ? { ...e, item: ab || null } : e));
                              }}>
                                <SelectTrigger><SelectValue placeholder="Seleziona abilità" /></SelectTrigger>
                                <SelectContent>
                                  {abilitiesList.map((ab: any) => (
                                    <SelectItem key={ab.id ?? ab.name} value={String(ab.id ?? ab.name)}>{ab.name}</SelectItem>
                                  ))}
                                  {abilitiesList.length === 0 && (
                                    <SelectItem value="no-ability" disabled>Nessuna abilità</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value={ex.item?.id ? String(ex.item.id) : ''} onValueChange={(value) => {
                                const s = spells.find((x: any) => String(x?.id) === String(value));
                                setExtras(prev => prev.map((e,i) => i===idx ? { ...e, item: s || null } : e));
                              }}>
                                <SelectTrigger><SelectValue placeholder="Seleziona magia" /></SelectTrigger>
                                <SelectContent>
                                  {sortedSpells.map((s: any) => (
                                    <SelectItem key={s.id ?? s.name} value={String(s.id ?? s.name)}>{s.name}</SelectItem>
                                  ))}
                                  {sortedSpells.length === 0 && (
                                    <SelectItem value="no-spell" disabled>Nessuna magia disponibile</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            )}

                            <Button variant="outline" size="sm" onClick={() => setExtras(prev => prev.filter((_,i) => i !== idx))}>Rimuovi</Button>
                          </div>
                        ))
                      )}
                    </div>

                    {extras.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Le extra non influenzano il danno; servono per la narrazione.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Danno diretto</label>
                    <Switch checked={directDamageEnabled} onCheckedChange={setDirectDamageEnabled} />
                  </div>
                  {directDamageEnabled && (
                    <div className="text-xs text-muted-foreground">
                      I danni verranno applicati direttamente alle specifiche dei bersagli.
                    </div>
                  )}
                </div>

              </>
            )}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm">{selectedPostureNameLocal ? `Postura selezionata: ${selectedPostureNameLocal}` : 'Nessuna postura selezionata'}</div>
          <Button variant="secondary" onClick={() => setIsPostureModalOpen(true)}>Seleziona nuova postura</Button>
        </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button
              onClick={handleConfirm}
            disabled={
              !selectedStat ||
              (compileDamage && (
                (damageSource === '') ||
                (damageSource === 'equipment' && (!selectedWeapon || !weaponDamageType || (isRangedWeapon && !selectedArrow))) ||
                (damageSource === 'magic' && (!selectedSpell || (() => { const info = getSpellLevelInfo(selectedSpell); const lvl = info?.levelData || {}; const useW = !!(lvl?.use_weapon_damage || (selectedSpell as any)?.use_weapon_damage); return useW ? (!selectedWeapon || !weaponDamageType || (isRangedWeapon && !selectedArrow)) : false; })())) ||
                (damageSource === 'ability' && (!selectedAbility || (() => { const lvl = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any); const useW = !!(lvl?.use_weapon_damage || (selectedAbility as any)?.use_weapon_damage); return useW ? (!selectedWeapon || !weaponDamageType || (isRangedWeapon && !selectedArrow)) : false; })()))
              )) ||
              (() => {
                if (!(compileDamage && damageSource === 'magic' && selectedSpell)) return false;
                const info = getSpellLevelInfo(selectedSpell);
                const lvl = info?.levelData || {};
                const count = Number((lvl as any)?.lottery_numeric_choices ?? (selectedSpell as any)?.lottery_numeric_choices ?? 0) || 0;
                if (count <= 0) return false;
                const values = lotteryUserChoices.slice(0, count);
                if (values.length < count) return true;
                for (let i = 0; i < count; i++) {
                  const val = Number(values[i] ?? 0);
                  if (!(val > 0)) return true;
                }
                return false;
              })()
              || (() => {
                if (!(compileDamage && damageSource === 'ability' && selectedAbility)) return false;
                const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                const enabled = toBool((lvl as any)?.lottery_enabled ?? (selectedAbility as any)?.lottery_enabled);
                if (!enabled) return false;
                const count = Number((lvl as any)?.lottery_numeric_choices ?? (selectedAbility as any)?.lottery_numeric_choices ?? 0) || 0;
                if (count <= 0) return false;
                const values = lotteryUserChoices.slice(0, count);
                if (values.length < count) return true;
                for (let i = 0; i < count; i++) {
                  const val = Number(values[i] ?? 0);
                  if (!(val > 0)) return true;
                }
                return false;
              })()
            }
          >
            Conferma
          </Button>
        </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
    <SpellSelectModal
      isOpen={isSpellModalOpen}
      onOpenChange={setIsSpellModalOpen}
      character={character}
      spellCooldowns={spellCooldowns}
      perTurnUses={perTurnUses}
      onConfirm={({ spell }) => {
        setSelectedSpell(spell)
        setSelectedSpellGradeNumber(1)
      }}
    />
    <AbilitySelectModal
      isOpen={isAbilityModalOpen}
      onOpenChange={setIsAbilityModalOpen}
      character={character}
      spellCooldowns={spellCooldowns}
      perTurnUses={perTurnUses}
      onConfirm={({ ability }) => {
        setSelectedAbility(ability)
      }}
    />
    <PostureSelectionModal
      isOpen={isPostureModalOpen}
      onOpenChange={setIsPostureModalOpen}
      character={character}
      characterId={String((character as any)?.id ?? '')}
      onCharacterUpdate={(updatedCharacter: any) => {
        try {
          const active = (updatedCharacter as any)?.custom_abilities?.find((a: any) =>
            (a?.category === 'Posture' || a?.category === 'Tecnico' || a?.subcategory === 'Posture') && a?.is_active
          ) || null;
          setSelectedPostureIdLocal(active ? String(active.id) : null);
          setSelectedPostureNameLocal(active ? String(active.name || '') : '');
        } catch {
          setSelectedPostureIdLocal(null);
          setSelectedPostureNameLocal('');
        }
      }}
    />
    <Dialog open={isTargetsModalOpen} onOpenChange={setIsTargetsModalOpen}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden grid-rows-[auto_1fr]" aria-describedby="targets-selection-description">
        <DialogHeader>
          <DialogTitle>Seleziona bersagli</DialogTitle>
          <DialogDescription id="targets-selection-description">
            Seleziona nemici, evocazioni attive e personaggi pubblici.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
          <div className="md:col-span-2 flex flex-col gap-3 min-h-0 h-full">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cerca per nome"
                value={targetsSearchQuery}
                onChange={(e) => setTargetsSearchQuery(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTargets([])}
                disabled={selectedTargets.length === 0}
              >
                Svuota
              </Button>
            </div>

            <Tabs value={targetsTab} onValueChange={(v) => setTargetsTab(v as any)} className="flex flex-col min-h-0 flex-1">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">Tutti</TabsTrigger>
                <TabsTrigger value="characters">Personaggi</TabsTrigger>
                <TabsTrigger value="enemies">Nemici</TabsTrigger>
                <TabsTrigger value="evocations">Evocazioni</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex-1 min-h-0 h-full">
                <ScrollArea className="h-full min-h-0 rounded border">
                  <div className="p-2 space-y-2">
                    {itemsAll.filter(it => filteredByQuery(it.name)).map((it) => {
                      const sel = isSelectedTarget(it.type, it.id);
                      const e = it.energies;
                      return (
                        <button
                          type="button"
                          key={`${it.type}:${it.id}`}
                          className={`w-full text-left rounded border px-3 py-2 hover:bg-muted ${sel ? 'bg-primary/5 border-primary/40' : 'bg-background'}`}
                          onClick={() => toggleTarget({ type: it.type, id: it.id, name: it.name })}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="pt-0.5" onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox checked={sel} onCheckedChange={() => toggleTarget({ type: it.type, id: it.id, name: it.name })} />
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-medium leading-none">{it.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {it.type === 'characters' ? 'PG' : it.type === 'enemies' ? 'Nemico' : 'Evocazione'}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              <div>HP {Math.max(0, Math.floor(e.hpCur))}/{Math.max(0, Math.floor(e.hpMax))}</div>
                              <div>AR {Math.max(0, Math.floor(e.arCur))}/{Math.max(0, Math.floor(e.arMax))}</div>
                              <div>PA {Math.max(0, Math.floor(e.apCur))}/{Math.max(0, Math.floor(e.apMax))}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {itemsAll.filter(it => filteredByQuery(it.name)).length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Nessun risultato</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="characters" className="flex-1 min-h-0 h-full">
                <ScrollArea className="h-full min-h-0 rounded border">
                  <div className="p-2 space-y-2">
                    {itemsCharacters.filter(it => filteredByQuery(it.name)).map((it) => {
                      const sel = isSelectedTarget(it.type, it.id);
                      const e = it.energies;
                      return (
                        <button
                          type="button"
                          key={`${it.type}:${it.id}`}
                          className={`w-full text-left rounded border px-3 py-2 hover:bg-muted ${sel ? 'bg-primary/5 border-primary/40' : 'bg-background'}`}
                          onClick={() => toggleTarget({ type: it.type, id: it.id, name: it.name })}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="pt-0.5" onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox checked={sel} onCheckedChange={() => toggleTarget({ type: it.type, id: it.id, name: it.name })} />
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-medium leading-none">{it.name}</div>
                                <div className="text-xs text-muted-foreground">PG</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              <div>HP {Math.max(0, Math.floor(e.hpCur))}/{Math.max(0, Math.floor(e.hpMax))}</div>
                              <div>AR {Math.max(0, Math.floor(e.arCur))}/{Math.max(0, Math.floor(e.arMax))}</div>
                              <div>PA {Math.max(0, Math.floor(e.apCur))}/{Math.max(0, Math.floor(e.apMax))}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {itemsCharacters.filter(it => filteredByQuery(it.name)).length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Nessun risultato</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="enemies" className="flex-1 min-h-0 h-full">
                <ScrollArea className="h-full min-h-0 rounded border">
                  <div className="p-2 space-y-2">
                    {itemsEnemies.filter(it => filteredByQuery(it.name)).map((it) => {
                      const sel = isSelectedTarget(it.type, it.id);
                      const e = it.energies;
                      return (
                        <button
                          type="button"
                          key={`${it.type}:${it.id}`}
                          className={`w-full text-left rounded border px-3 py-2 hover:bg-muted ${sel ? 'bg-primary/5 border-primary/40' : 'bg-background'}`}
                          onClick={() => toggleTarget({ type: it.type, id: it.id, name: it.name })}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="pt-0.5" onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox checked={sel} onCheckedChange={() => toggleTarget({ type: it.type, id: it.id, name: it.name })} />
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-medium leading-none">{it.name}</div>
                                <div className="text-xs text-muted-foreground">Nemico</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              <div>HP {Math.max(0, Math.floor(e.hpCur))}/{Math.max(0, Math.floor(e.hpMax))}</div>
                              <div>AR {Math.max(0, Math.floor(e.arCur))}/{Math.max(0, Math.floor(e.arMax))}</div>
                              <div>PA {Math.max(0, Math.floor(e.apCur))}/{Math.max(0, Math.floor(e.apMax))}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {itemsEnemies.filter(it => filteredByQuery(it.name)).length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Nessun risultato</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="evocations" className="flex-1 min-h-0 h-full">
                <ScrollArea className="h-full min-h-0 rounded border">
                  <div className="p-2 space-y-2">
                    {itemsEvocations.filter(it => filteredByQuery(it.name)).map((it) => {
                      const sel = isSelectedTarget(it.type, it.id);
                      const e = it.energies;
                      return (
                        <button
                          type="button"
                          key={`${it.type}:${it.id}`}
                          className={`w-full text-left rounded border px-3 py-2 hover:bg-muted ${sel ? 'bg-primary/5 border-primary/40' : 'bg-background'}`}
                          onClick={() => toggleTarget({ type: it.type, id: it.id, name: it.name })}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="pt-0.5" onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox checked={sel} onCheckedChange={() => toggleTarget({ type: it.type, id: it.id, name: it.name })} />
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-medium leading-none">{it.name}</div>
                                <div className="text-xs text-muted-foreground">Evocazione</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              <div>HP {Math.max(0, Math.floor(e.hpCur))}/{Math.max(0, Math.floor(e.hpMax))}</div>
                              <div>AR {Math.max(0, Math.floor(e.arCur))}/{Math.max(0, Math.floor(e.arMax))}</div>
                              <div>PA {Math.max(0, Math.floor(e.apCur))}/{Math.max(0, Math.floor(e.apMax))}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {itemsEvocations.filter(it => filteredByQuery(it.name)).length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Nessun risultato</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <div className="md:col-span-1 flex flex-col gap-2 min-h-0 h-full">
            <div className="flex items-center justify-between">
              <div className="font-medium">Riepilogo</div>
              <div className="text-sm text-muted-foreground">{selectedTargets.length}</div>
            </div>
            <ScrollArea className="flex-1 rounded border">
              <div className="p-2 space-y-2">
                {selectedTargets.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessun bersaglio selezionato</div>
                ) : (
                  selectedTargets.map((t) => (
                    <div key={`${t.type}:${t.id}`} className="flex items-center justify-between gap-2 rounded border px-2 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.type === 'characters' ? 'PG' : t.type === 'enemies' ? 'Nemico' : 'Evocazione'}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTargets(prev => (prev || []).filter(x => !(x.type === t.type && String(x.id) === String(t.id))))}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setIsTargetsModalOpen(false)}>
                Fatto
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default StatSelectionDialog;
 
