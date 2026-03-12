import { useCallback, useEffect, useState } from 'react';
import { Character } from '@/types/character';
import { calculateEquipmentDamage, calculateAbilityDamage } from '@/utils/diceUtils';
import { supabase } from '@/integrations/supabase/client';
import { subscribeRollHistory } from '@/integrations/localserver/api';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { useAuth } from '@/hooks/useAuth';

export type DamageSourcePayload = 
  | { source: 'equipment'; weapon?: any; damageType?: string; arrow?: any; consumeArrow?: boolean; bonusCompetence?: { type: 'assassinio' | 'contrattacco'; value?: number; multiplier?: number } | null; includeAnima?: boolean; extra?: any | null; extras?: any[]; competences?: string[] }
  | { source: 'magic'; spell?: any; bonusCompetence?: { type: 'assassinio' | 'contrattacco'; value?: number; multiplier?: number } | null; includeAnima?: boolean; extra?: any | null; extras?: any[]; weaponForDamage?: any; weaponDamageType?: string; arrowForDamage?: any; consumeArrowForDamage?: boolean; weaponCompetences?: string[]; triggers?: any }
  | { source: 'ability'; ability?: any; bonusCompetence?: { type: 'assassinio' | 'contrattacco'; value?: number; multiplier?: number } | null; includeAnima?: boolean; extra?: any | null; extras?: any[]; weaponForDamage?: any; weaponDamageType?: string; arrowForDamage?: any; consumeArrowForDamage?: boolean; weaponCompetences?: string[]; triggers?: any };

export interface ModalRollData {
  selectedStat?: string;
  selectedCompetences?: { id: string; name: string; value: number }[];
  target?: { type: 'none' | 'characters' | 'enemies' | 'evocations'; id?: string; name?: string } | null;
  targets?: { type: 'characters' | 'enemies' | 'evocations'; id?: string; name?: string }[];
  damage?: DamageSourcePayload | null;
}

export interface NewRollEntry {
  id: string;
  message: string;
  characterId?: string;
  characterName: string;
  result: number;
  diceMax: number;
  targetName?: string;
  damageDescription?: string;
  timestamp: number;
  baseResult: number;
  statKey?: string;
  statLabel?: string;
  statValue: number;
  competenceDetails?: { id: string; name: string; sides: number; roll: number }[];
  // Nuovi campi
  entryType?: 'action' | 'damage';
  badge?: 'Non riuscito' | 'riuscito' | 'Critico!';
  damageSources?: { label: string; value: number; pure?: boolean; detail?: string }[];
  // Campi percentuale
  isPercent?: boolean;
  percentMinRequired?: number;
  // Tombola
  lottery?: { diceFaces: number; choices: number[]; rolls?: number[]; correctCount?: number; wrongCount?: number };
  // Costi PA della magia
  actionCostBase?: number;
  actionCostIndicative?: number;
  actionCostTotal?: number;
}

const diceMaxByLevel: Record<number, number> = {
  1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 100,
  8: 120, 9: 140, 10: 160, 11: 180, 12: 200, 13: 220,
  14: 240, 15: 260, 16: 290, 17: 320, 18: 350, 19: 380, 20: 400
};

export function getDiceMaxByLevel(level?: number): number {
  const lv = Math.max(1, Math.min(20, level || 1));
  return diceMaxByLevel[lv];
}

function mapDamageTypeLabel(t?: string): string {
  if (!t) return '';
  if (t === 'veloce') return 'Leggero';
  if (t === 'pesante') return 'Pesante';
  if (t === 'affondo') return 'Affondo';
  return t;
}

function makeDamageDescription(damage?: DamageSourcePayload | null): string | undefined {
  if (!damage) return undefined;
  if (damage.source === 'equipment') {
    const weaponName = damage.weapon?.name || 'Arma';
    const typeLabel = mapDamageTypeLabel(damage.damageType);
    return `${weaponName}${typeLabel ? ' • ' + typeLabel : ''}`;
  }
  if (damage.source === 'magic') {
    const spell = (damage as any)?.spell || {};
    const spellName = spell?.name || 'Magia';
    let levelDesc: string | undefined;
    try {
      if (Array.isArray(spell?.levels) && (spell as any)?.current_level != null) {
        const lvl = (spell as any).levels.find((l: any) => String(l?.level) === String((spell as any).current_level));
        levelDesc = (lvl?.level_description || (lvl as any)?.levelDescription || undefined);
      } else {
        levelDesc = (spell?.level_description || (spell as any)?.levelDescription || undefined);
      }
    } catch {}
    return levelDesc ? `${spellName} • ${levelDesc}` : `${spellName}`;
  }
  if (damage.source === 'ability') {
    const ability = (damage as any)?.ability || {};
    const abilityName = ability?.name || 'Abilità';
    let levelDesc: string | undefined;
    try {
      if (Array.isArray(ability?.levels)) {
        const lvl = (ability as any).levels.find((l: any) => (l?.level != null)) || (ability as any).levels[0];
        levelDesc = (lvl?.level_description || (lvl as any)?.levelDescription || undefined);
      } else {
        levelDesc = (ability?.level_description || (ability as any)?.levelDescription || undefined);
      }
    } catch {}
    return levelDesc ? `${abilityName} • ${levelDesc}` : `${abilityName}`;
  }
  return undefined;
}

function mapStatLabel(key?: string): string {
  if (!key) return '';
  const labels: Record<string, string> = {
    forza: 'Forza',
    percezione: 'Percezione',
    resistenza: 'Resistenza',
    intelletto: 'Intelletto',
    agilita: 'Agilità',
    sapienza: 'Sapienza',
    anima: 'Anima',
  };
  return labels[key] || key;
}

function formatBonusNotes(bonus?: string[] | null): string | undefined {
  try {
    const arr = (bonus || []).map((b) => String(b || '').trim()).filter(Boolean);
    return arr.length > 0 ? `Bonus: ${arr.join(', ')}` : undefined;
  } catch { return undefined; }
}

// Mappa id competenze → etichette lato danno (equipaggiamento)
const DAMAGE_COMPETENCE_LABELS: Record<string, string> = {
  spada: 'Spada',
  coltello: 'Coltello',
  ascia: 'Ascia',
  mazza: 'Mazza',
  frusta: 'Frusta',
  falce: 'Falce',
  tirapugni: 'Tirapugni',
  bastone: 'Bastone',
  armi_inastate: 'Armi inastate',
  scudo: 'Scudo',
  arco: 'Arco',
  balestra: 'Balestra',
  fionda: 'Fionda',
  da_lancio: 'Da lancio',
  da_fuoco: 'Da fuoco',
  pesante: 'Pesante',
};

export function useNewRollHistory() {
  const [entries, setEntries] = useState<NewRollEntry[]>([]);
  const { user, isAdmin } = useAuth();

  const mapRowToEntry = useCallback((row: any): NewRollEntry => ({
    id: String(row.id),
    message: String(row.message || ''),
    characterId: row.character_id ? String(row.character_id) : undefined,
    characterName: String(row.character_name || ''),
    result: Number(row.result || 0),
    diceMax: Number(row.dice_max || 0),
    targetName: row.target_name ? String(row.target_name) : undefined,
    damageDescription: row.damage_description ? String(row.damage_description) : undefined,
    timestamp: Number(row.ts_ms || Date.parse(row.created_at) || Date.now()),
    baseResult: Number(row.base_result || 0),
    statKey: row.stat_key ? String(row.stat_key) : undefined,
    statLabel: row.stat_label ? String(row.stat_label) : undefined,
    statValue: Number(row.stat_value || 0),
    competenceDetails: Array.isArray(row.competence_details) ? row.competence_details : [],
    entryType: row.entry_type as any,
    badge: row.badge as any,
    damageSources: Array.isArray(row.damage_sources) ? row.damage_sources : undefined,
    isPercent: !!row.is_percent,
    percentMinRequired: row.percent_min_required != null ? Number(row.percent_min_required || 0) : undefined,
    lottery: row.lottery,
    actionCostBase: row.action_cost_base != null ? Number(row.action_cost_base || 0) : undefined,
    actionCostIndicative: row.action_cost_indicative != null ? Number(row.action_cost_indicative || 0) : undefined,
    actionCostTotal: row.action_cost_total != null ? Number(row.action_cost_total || 0) : undefined,
  }), []);

  const insertEntryRow = useCallback(async (e: NewRollEntry) => {
    try {
      await supabase.from('roll_history').insert({
        id: e.id,
        message: e.message,
        character_id: e.characterId,
        character_name: e.characterName,
        result: e.result,
        dice_max: e.diceMax,
        target_name: e.targetName,
        damage_description: e.damageDescription,
        ts_ms: e.timestamp,
        base_result: e.baseResult,
        stat_key: e.statKey,
        stat_label: e.statLabel,
        stat_value: e.statValue,
        competence_details: e.competenceDetails,
        entry_type: e.entryType,
        badge: e.badge,
        damage_sources: e.damageSources,
        is_percent: e.isPercent,
        percent_min_required: e.percentMinRequired,
        lottery: e.lottery,
        action_cost_base: e.actionCostBase,
        action_cost_indicative: e.actionCostIndicative,
        action_cost_total: e.actionCostTotal,
      });
    } catch (err) {
      console.warn('[useNewRollHistory] insert failed:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('roll_history')
          .select('*')
          .order('ts_ms', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(200);
        const list = (data || []).map(mapRowToEntry).sort((a, b) => b.timestamp - a.timestamp);
        setEntries(list);
      } catch (err) {
        console.warn('[useNewRollHistory] initial load failed:', err);
      }
    })();

    const hasChannel = typeof (supabase as any)?.channel === 'function';
    if (hasChannel) {
      const channel = (supabase as any).channel('roll_history_broadcast')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roll_history' }, (payload: any) => {
          try {
            const e = mapRowToEntry(payload.new);
            setEntries((prev) => (prev.some(p => p.id === e.id) ? prev : [e, ...prev]));
          } catch {}
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'roll_history' }, (payload: any) => {
          try {
            const e = mapRowToEntry(payload.new);
            setEntries((prev) => prev.map(p => (p.id === e.id ? e : p)));
          } catch {}
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'roll_history' }, (payload: any) => {
          try {
            const id = String(payload.old?.id || '');
            if (id) setEntries((prev) => prev.filter(p => p.id !== id));
            else setEntries([]);
          } catch {}
        });
      channel.subscribe();
      return () => { try { (supabase as any).removeChannel(channel); } catch {} };
    }
    const unsubscribe = subscribeRollHistory((ev) => {
        try {
          if (ev?.type === 'INSERT' && ev?.new) {
            const e = mapRowToEntry(ev.new);
            setEntries((prev) => (prev.some(p => p.id === e.id) ? prev : [e, ...prev]));
          }
          if (ev?.type === 'UPDATE' && ev?.new) {
            const e = mapRowToEntry(ev.new);
            setEntries((prev) => prev.map(p => (p.id === e.id ? e : p)));
          }
          if (ev?.type === 'DELETE' && ev?.old?.id) {
            const id = String(ev.old.id);
            setEntries((prev) => prev.filter(p => p.id !== id));
          }
        } catch {}
      });
    return () => unsubscribe();
  }, [mapRowToEntry]);

  const reload = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('roll_history')
        .select('*')
        .order('ts_ms', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      const list = (data || []).map(mapRowToEntry).sort((a, b) => b.timestamp - a.timestamp);
      setEntries(list);
    } catch {}
  }, [mapRowToEntry]);

  // Aggiunge un tiro da modale: livello + statistica + somma tiri competenze (breakdown incluso)
  const addEntryFromModalRoll = useCallback((character: Character | null | undefined, rollData: ModalRollData, calculations?: any) => {
    if (!character) return;

    const getSuccessRollBonusFromPaInvestment = (): number => {
      try {
        const d: any = (rollData as any)?.damage;
        if (!d || (d.source !== 'magic' && d.source !== 'ability')) return 0;
        const trig = d?.triggers || {};
        const ap = trig?.actionPoints || {};
        const selectedPa = Number(ap?.selected || 0) || 0;
        if (selectedPa <= 0) return 0;

        const isMagic = d.source === 'magic';
        const item: any = isMagic ? d?.spell : d?.ability;
        if (!item) return 0;

        let lvl: any = item;
        if (isMagic) {
          const levelNum = Number(item?.current_level) || Number(item?.level) || Number(item?.levels?.[0]?.level) || 1;
          lvl = Array.isArray(item?.levels) ? (item.levels.find((l: any) => Number(l?.level) === levelNum) || item.levels[0] || item) : item;
        } else {
          const levelNum = Number(item?.current_level) || Number(item?.level) || Number(item?.levels?.[0]?.level) || 1;
          lvl = Array.isArray(item?.levels) ? (item.levels.find((l: any) => Number(l?.level) === levelNum) || item.levels[0] || item) : item;
        }

        const every = Number(lvl?.success_roll_increase_every_pa ?? item?.success_roll_increase_every_pa ?? 0) || 0;
        if (every <= 0) return 0;

        const bonus = Math.floor(selectedPa / every);
        return bonus > 0 ? bonus : 0;
      } catch {
        return 0;
      }
    };

    // Se la fonte è una magia con regola percentuale attiva, registra un d100 al posto del tiro con statistica
    try {
      const isMagic = rollData?.damage?.source === 'magic';
      const spell: any = isMagic ? (rollData?.damage as any)?.spell : null;
      let percentEnabled = false;
      let minPct = 0;
      if (isMagic && spell) {
        percentEnabled = !!(spell?.percentageRollEnabled ?? (spell as any)?.percentage_roll_enabled);
        if (Array.isArray(spell?.levels) && spell?.current_level != null) {
          const lvl = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level)) || spell.levels[0];
          minPct = Number(lvl?.min_success_percentage ?? (lvl as any)?.minSuccessPercentage ?? spell?.min_success_percentage ?? (spell as any)?.minSuccessPercentage ?? 0);
        } else {
          minPct = Number(spell?.min_success_percentage ?? (spell as any)?.minSuccessPercentage ?? 0);
        }
      }

      if (isMagic && (percentEnabled || minPct > 0)) {
        const baseResult = Math.floor(Math.random() * 100) + 1;
        const bonusFromPaInvestment = getSuccessRollBonusFromPaInvestment();
        const totalResult = Math.min(100, Math.max(1, baseResult + bonusFromPaInvestment));
        const damageDescription = makeDamageDescription(rollData?.damage ?? null);
        const targetsList = Array.isArray(rollData?.targets) ? (rollData?.targets || []) : [];
        const targetName = (targetsList.length > 0)
          ? targetsList.map(t => t?.name).filter(Boolean).join(', ')
          : (rollData?.target?.type && rollData.target.type !== 'none' ? rollData.target.name || undefined : undefined);

        const spellName = (spell?.name || (spell as any)?.spell_name || 'Magia');
        const shotIndex = Number(((rollData?.damage as any)?.triggers?.multipleShots?.currentShotIndex) ?? 0);
        const shotLabel = shotIndex > 0 ? ` — Attacco #${shotIndex}` : '';
        const message = `${character.name} ha effettuato ${totalResult}% su d100${shotLabel}`
          + (bonusFromPaInvestment > 0 ? ` (+${bonusFromPaInvestment} da PA)` : '')
          + (spellName ? ` con ${spellName}` : '')
          + (damageDescription ? ` usando ${damageDescription}` : '')
          + (targetName ? ` su ${targetName}` : '');

        let paBase = 0; let paIndic = 0; let paTotal = 0;
        try {
          const trig = (rollData?.damage as any)?.triggers || {};
          const ac = trig?.actionCostApplied || trig?.actionCost || {};
          paBase = Number(ac?.base || 0) || 0;
          paIndic = Number(ac?.indicative || ac?.indicativeRoll || 0) || 0;
          const explicitTotal = Number(ac?.total || 0) || 0;
          const inv = Number(ac?.investment || 0) || 0;
          const sec = Number(ac?.seconds || 0) || 0;
          paTotal = explicitTotal > 0 ? explicitTotal : Math.max(0, paBase + paIndic + inv + sec);
        } catch {}

        const entry: NewRollEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          message,
          characterId: character.id,
          characterName: character.name,
          result: totalResult,
          diceMax: 100,
          targetName,
          damageDescription,
          timestamp: Date.now(),
          baseResult,
          statKey: undefined,
          statLabel: undefined,
          statValue: 0,
          competenceDetails: [],
          entryType: 'action',
          isPercent: true,
          percentMinRequired: minPct,
          lottery: (() => { try { const lot = (rollData?.damage as any)?.triggers?.lottery; const en = (typeof lot?.enabled === 'boolean') ? lot.enabled : (typeof lot?.enabled === 'number') ? lot.enabled !== 0 : (typeof lot?.enabled === 'string') ? ['true','1','yes'].includes(lot.enabled.trim().toLowerCase()) : false; const df = Number(lot?.diceFaces || 0) || 0; const nc = Number(lot?.numericChoices || 0) || 0; if (lot && en && df > 0 && nc > 0) { return { diceFaces: df, choices: Array.isArray(lot?.userChoices) ? lot.userChoices.filter((x: any) => typeof x === 'number' && x > 0) : [] }; } return undefined; } catch { return undefined; } })(),
          actionCostBase: paBase,
          actionCostIndicative: paIndic,
          actionCostTotal: paTotal,
        };

        setEntries(prev => [entry, ...prev]);
        insertEntryRow(entry);
        return entry;
      }
    } catch {}

    const diceMax = getDiceMaxByLevel(character.level);
    const shotIndex2 = Number(((rollData?.damage as any)?.triggers?.multipleShots?.currentShotIndex) ?? 0);
    const shotLabel2 = shotIndex2 > 0 ? ` — Attacco #${shotIndex2}` : '';
    const baseResult = Math.floor(Math.random() * diceMax) + 1;
    const bonusFromPaInvestment2 = getSuccessRollBonusFromPaInvestment();

    // Valore statistica totale: usa calculations.totalStats se disponibile, altrimenti baseStats
    const statKey = rollData?.selectedStat as keyof (Character['baseStats'] | any) | undefined;
    const statValue = statKey
      ? (
          (calculations?.totalStats?.[statKey]) ??
          ((character as any)?.totalStats?.[statKey]) ??
          ((character as any)?.baseStats?.[statKey]) ??
          0
        )
      : 0;
    const statLabel = mapStatLabel(rollData?.selectedStat);

    // Dettagli e somma dei tiri delle competenze selezionate (ognuna è un dN)
    const competenceDetails = (rollData?.selectedCompetences || []).map(c => {
      const sides = Number(c?.value) || 0;
      const roll = sides > 0 ? (Math.floor(Math.random() * sides) + 1) : 0;
      return { id: c.id, name: c.name, sides, roll };
    });
    const competenceRollTotal = competenceDetails.reduce((sum, c) => sum + c.roll, 0);

    const totalResult = baseResult + statValue + competenceRollTotal + bonusFromPaInvestment2;

    const damageDescription = makeDamageDescription(rollData?.damage ?? null);
    const targetsList = Array.isArray(rollData?.targets) ? (rollData?.targets || []) : [];
    const targetName = (targetsList.length > 0)
      ? targetsList.map(t => t?.name).filter(Boolean).join(', ')
      : (rollData?.target?.type && rollData.target.type !== 'none' ? rollData.target.name || undefined : undefined);

    const message = `${character.name} ha effettuato ${totalResult} su d${diceMax}${shotLabel2}`
      + (bonusFromPaInvestment2 > 0 ? ` (+${bonusFromPaInvestment2} da PA)` : '')
      + (statLabel ? ` con ${statLabel}` : '')
      + (damageDescription ? ` usando ${damageDescription}` : '')
      + (targetName ? ` su ${targetName}` : '');

    let paBase2 = 0; let paIndic2 = 0; let paTotal2 = 0;
    try {
      const trig2 = (rollData?.damage as any)?.triggers || {};
      const ac2 = trig2?.actionCostApplied || trig2?.actionCost || {};
      paBase2 = Number(ac2?.base || 0) || 0;
      paIndic2 = Number(ac2?.indicative || ac2?.indicativeRoll || 0) || 0;
      const explicitTotal2 = Number(ac2?.total || 0) || 0;
      const inv2 = Number(ac2?.investment || 0) || 0;
      const sec2 = Number(ac2?.seconds || 0) || 0;
      paTotal2 = explicitTotal2 > 0 ? explicitTotal2 : Math.max(0, paBase2 + paIndic2 + inv2 + sec2);
    } catch {}

    const entry: NewRollEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      characterId: character.id,
      characterName: character.name,
      result: totalResult,
      diceMax,
      targetName,
      damageDescription,
      timestamp: Date.now(),
      baseResult,
      statKey: rollData?.selectedStat,
      statLabel,
      statValue,
      competenceDetails,
      entryType: 'action',
      lottery: (() => { try { const lot = (rollData?.damage as any)?.triggers?.lottery; const en = (typeof lot?.enabled === 'boolean') ? lot.enabled : (typeof lot?.enabled === 'number') ? lot.enabled !== 0 : (typeof lot?.enabled === 'string') ? ['true','1','yes'].includes(lot.enabled.trim().toLowerCase()) : false; const df = Number(lot?.diceFaces || 0) || 0; const nc = Number(lot?.numericChoices || 0) || 0; if (lot && en && df > 0 && nc > 0) { return { diceFaces: df, choices: Array.isArray(lot?.userChoices) ? lot.userChoices.filter((x: any) => typeof x === 'number' && x > 0) : [] }; } return undefined; } catch { return undefined; } })(),
      actionCostBase: paBase2,
      actionCostIndicative: paIndic2,
      actionCostTotal: paTotal2,
    };

    setEntries(prev => [entry, ...prev]);
    insertEntryRow(entry);
    return entry;
  }, [insertEntryRow]);

  // Aggiorna il badge di una voce esistente (Non riuscito / riuscito / Critico!)
  const updateEntryBadge = useCallback((entryId: string, badge: 'Non riuscito' | 'riuscito' | 'Critico!') => {
    let updated: NewRollEntry | undefined;
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        updated = { ...e, badge };
        return updated;
      }
      return e;
    }));
    (async () => { try { await supabase.from('roll_history').update({ badge }).eq('id', entryId); } catch {} })();
    return updated;
  }, []);

  const updateEntryLotteryInfo = useCallback((entryId: string, info: { rolls?: number[]; correctCount?: number; wrongCount?: number }) => {
    let updated: NewRollEntry | undefined;
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const lot = e.lottery || { diceFaces: 0, choices: [] };
        updated = { ...e, lottery: { ...lot, ...info } };
        return updated;
      }
      return e;
    }));
    (async () => { try { await supabase.from('roll_history').update({ lottery: { ...(info || {}) } }).eq('id', entryId); } catch {} })();
    return updated;
  }, []);

  const appendEntryDamageSources = useCallback((entryId: string, extraSources: { label: string; value: number; pure?: boolean; detail?: string }[], baseSourcesFallback?: { label: string; value: number; pure?: boolean; detail?: string }[]) => {
    if (!entryId || !Array.isArray(extraSources) || extraSources.length === 0) return;

    let nextSourcesFromState: Array<{ label: string; value: number; pure?: boolean; detail?: string }> | null = null;

    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      const nextSources = [...(e.damageSources || []), ...extraSources];
      nextSourcesFromState = nextSources;
      return { ...e, damageSources: nextSources };
    }));

    (async () => {
      try {
        const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

        let merged = nextSourcesFromState;
        if (!merged) {
          for (let i = 0; i < 3; i += 1) {
            const { data } = await supabase
              .from('roll_history')
              .select('damage_sources')
              .eq('id', entryId)
              .maybeSingle();
            const existing = Array.isArray((data as any)?.damage_sources) ? (data as any).damage_sources : null;
            if (Array.isArray(existing) && existing.length > 0) {
              merged = [...existing, ...extraSources];
              break;
            }
            await sleep(150);
          }
        }

        if (!merged) {
          if (Array.isArray(baseSourcesFallback) && baseSourcesFallback.length > 0) {
            merged = [...baseSourcesFallback, ...extraSources];
          } else {
            merged = [...extraSources];
          }
        }

        const sources = merged.map(s => ({ ...s }));
        await supabase.from('roll_history').update({ damage_sources: sources }).eq('id', entryId);
      } catch {}
    })();
  }, []);

  // Aggiunge una voce di danno con breakdown delle fonti e asterisco sui valori puri
  const addDamageEntryFromModalRoll = useCallback((character: Character | null | undefined, rollData: ModalRollData, isCritical: boolean = false, calculations?: any) => {
    if (!character || !rollData?.damage) return;

    const damage = rollData.damage;
    const targetsList = Array.isArray(rollData?.targets) ? (rollData?.targets || []) : [];
    const targetName = (targetsList.length > 0)
      ? targetsList.map(t => t?.name).filter(Boolean).join(', ')
      : (rollData?.target?.type && rollData.target.type !== 'none' ? rollData.target.name || undefined : undefined);
    const extrasList = (damage as any)?.extras?.map((ex: any) => ex?.item?.name || ex?.originName).filter(Boolean) || [];
    const bonusCompLabel = damage?.bonusCompetence 
      ? (damage.bonusCompetence.type === 'assassinio' 
          ? `Assassinio${(damage as any)?.bonusCompetence?.multiplier ? ` x${Number((damage as any).bonusCompetence.multiplier)}` : ''}` 
          : 'Contrattacco') 
      : undefined;

    const totalAnima = (calculations?.totalStats?.anima ?? (character as any)?.totalStats?.anima ?? (character as any)?.baseStats?.anima ?? 0) as number;
    const legacyHealth = (character as any)?.health;
    const maxHealth = Number(
      calculations?.maxHealth ??
      (typeof legacyHealth === 'number' ? legacyHealth : undefined) ??
      legacyHealth?.max ??
      (character as any)?.maxHealth ??
      0
    ) || 0;
    const currentHealthRaw = (character as any)?.currentHealth ??
      (typeof legacyHealth === 'number' ? legacyHealth : undefined) ??
      legacyHealth?.current;
    const currentHealth = currentHealthRaw != null ? (Number(currentHealthRaw) || 0) : maxHealth;
    const healthPercentage = maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 100;
    const lowHealthBonusMultiplier = healthPercentage < 30 ? 1.5 : (healthPercentage < 50 ? 1.2 : 1);

    let totalDamage = 0;
    const damageSources: { label: string; value: number; pure?: boolean; detail?: string }[] = [];
    let message = '';

    if (damage.source === 'equipment') {
      const weapon = damage.weapon;
      const damageType = damage.damageType || 'veloce';
      const arrow = damage.arrow;
      const includeAnima = !!damage.includeAnima;

      const eq = calculateEquipmentDamage(weapon, damageType, arrow, isCritical, (character as any)?.anomalies || []);
      const animaBonus = includeAnima ? totalAnima : 0;
      const baseDelta = Number(eq?.baseDamage || 0) - Number((eq as any)?.rawBaseDamage || 0);
      const calcDelta = Number(eq?.calculatedDamage || 0) - Number((eq as any)?.rawCalculatedDamage || 0);
      const arrowGuaranteedRaw = Number((eq as any)?.rawProjectileGuaranteedDamage || 0) || 0;
      const arrowGuaranteedBonus = Number((eq as any)?.bonusProjectileGuaranteedDamage || 0) || 0;
      const arrowAdditionalRaw = Number((eq as any)?.rawProjectileAdditionalSides || 0) || 0;
      const arrowAdditionalBonus = Number((eq as any)?.bonusProjectileAdditionalSides || 0) || 0;
      // Danno aggiuntivo della freccia (dN): tira se non critico, altrimenti somma come puro
      let arrowAdditionalValue = 0;
      let arrowAdditionalSides = 0;
      try {
        arrowAdditionalSides = Number((eq as any)?.projectileAdditionalSides || 0) || 0;
        if (!arrowAdditionalSides) {
          const aSets: any[] = Array.isArray((arrow as any)?.damage_sets) ? (arrow as any).damage_sets : [];
          if (Array.isArray(aSets) && aSets.length > 0) {
            arrowAdditionalSides = aSets.reduce((sum: number, s: any) => sum + (Number(s?.additional_damage || 0)), 0);
          } else {
            arrowAdditionalSides = Number((arrow as any)?.additional_damage || 0) || 0;
          }
        }
        if (arrowAdditionalSides > 0) {
          if (isCritical) {
            arrowAdditionalValue = arrowAdditionalSides;
            const baseDetail = arrowAdditionalRaw > 0 && arrowAdditionalBonus
              ? ` (base d${arrowAdditionalRaw}${arrowAdditionalBonus > 0 ? ` + ${arrowAdditionalBonus}` : ` - ${Math.abs(arrowAdditionalBonus)}`})`
              : '';
            damageSources.push({ label: 'Freccia (aggiuntivo)', value: arrowAdditionalValue, pure: true, detail: baseDetail || undefined });
          } else {
            const roll = Math.floor(Math.random() * Math.max(1, arrowAdditionalSides)) + 1;
            arrowAdditionalValue = roll;
            const baseDetail = arrowAdditionalRaw > 0 && arrowAdditionalBonus
              ? ` (base d${arrowAdditionalRaw}${arrowAdditionalBonus > 0 ? ` + ${arrowAdditionalBonus}` : ` - ${Math.abs(arrowAdditionalBonus)}`})`
              : '';
            damageSources.push({ label: `Freccia (d${arrowAdditionalSides})`, value: roll, pure: false, detail: `${roll} su d${arrowAdditionalSides}${baseDetail}` });
          }
        }
      } catch {}

      const eqExtraDetails: any[] = Array.isArray((eq as any)?.extraDamageDetails) ? (eq as any).extraDamageDetails : [];
      const eqExtraTotal = Number((eq as any)?.extraDamageTotal || 0) || 0;
      if (eqExtraDetails.length > 0) {
        eqExtraDetails.forEach((row: any) => {
          const name = String(row?.typeName || 'Danno extra');
          const val = Number(row?.total || 0) || 0;
          if (!val) return;
          const detail = Array.isArray(row?.details) && row.details.length ? row.details.join(', ') : undefined;
          damageSources.push({ label: `Danno extra • ${name}`, value: val, pure: isCritical, detail });
        });
      }

      // Competenze lato danno...
      const compIds = Array.isArray((damage as any).competences) ? (damage as any).competences : [];
      let compTotal = 0;
      const compDetails: string[] = [];
      compIds.forEach((id) => {
        const sides = Number((character as any)?.abilities?.[id]) || 0;
        if (sides > 0) {
          if (isCritical) {
            compTotal += sides; // nel critico diventano puri
          } else {
            const roll = Math.floor(Math.random() * sides) + 1;
            compTotal += roll;
            const label = DAMAGE_COMPETENCE_LABELS[id] || id;
            compDetails.push(`${label} (d${sides}): ${roll}`);
          }
        }
      });
      if (compTotal) {
        damageSources.push({
          label: isCritical ? 'Competenze (pure)' : 'Competenze (dadi)',
          value: compTotal,
          pure: isCritical,
          detail: isCritical ? undefined : (compDetails.length ? compDetails.join(', ') : undefined)
        });
      }

      // Breakdown: effetti arma (33%) per tipo selezionato
      const sets: any[] = Array.isArray((weapon as any)?.data?.damage_sets)
        ? (weapon as any).data.damage_sets
        : (Array.isArray((weapon as any)?.damage_sets) ? (weapon as any).damage_sets : []);
      if (Array.isArray(sets) && sets.length > 0) {
        const typeLabel = mapDamageTypeLabel(damageType);
        const calcKey = damageType === 'veloce' ? 'calculated_damage_veloce'
          : damageType === 'pesante' ? 'calculated_damage_pesante'
          : 'calculated_damage_affondo';
        sets.forEach((s: any) => {
          const v = Number(s?.[calcKey] || 0);
          if (v > 0) {
            const effName = (s?.effect_name || 'Effetto').toString();
            const notes = formatBonusNotes(Array.isArray((s as any)?.bonus_effects) ? (s as any).bonus_effects : []);
            damageSources.push({ label: `Danno arma • ${effName} • ${typeLabel}`, value: v, pure: true, detail: notes ? `— ${notes}` : undefined });
          }
        });
        if (calcDelta) {
          const rawCalc = Number((eq as any)?.rawCalculatedDamage || 0);
          const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
          const cClassic = Number((eq as any)?.bonusCalculatedDamageClassic ?? 0) || 0;
          const cPercent = Number((eq as any)?.bonusCalculatedDamagePercent ?? 0) || 0;
          const parts: string[] = [];
          if (cClassic) parts.push(`classico ${fmt(cClassic)}`);
          if (cPercent) parts.push(`da % ${fmt(cPercent)}${rawCalc ? ` su ${rawCalc}` : ''}`);
          const detail = parts.length ? parts.join(', ') : undefined;
          damageSources.push({ label: 'Bonus anomalia • Arma (33%)', value: calcDelta, pure: true, detail });
        }
      } else {
        // Fallback aggregato se non ci sono set
        const raw = Number((eq as any)?.rawCalculatedDamage || 0);
        if (raw) damageSources.push({ label: 'Danno arma (33%)', value: raw, pure: true });
        if (calcDelta) {
          const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
          const cClassic = Number((eq as any)?.bonusCalculatedDamageClassic ?? 0) || 0;
          const cPercent = Number((eq as any)?.bonusCalculatedDamagePercent ?? 0) || 0;
          const parts: string[] = [];
          if (cClassic) parts.push(`classico ${fmt(cClassic)}`);
          if (cPercent) parts.push(`da % ${fmt(cPercent)}${raw ? ` su ${raw}` : ''}`);
          const detail = parts.length ? parts.join(', ') : undefined;
          damageSources.push({ label: 'Bonus anomalia • Arma (33%)', value: calcDelta, pure: true, detail });
        }
      }
      if (arrowGuaranteedRaw) damageSources.push({ label: 'Freccia', value: arrowGuaranteedRaw, pure: true });
      if (arrowGuaranteedBonus) {
        const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
        const pClassic = Number((eq as any)?.bonusProjectileGuaranteedClassic ?? 0) || 0;
        const pPercent = Number((eq as any)?.bonusProjectileGuaranteedPercent ?? 0) || 0;
        const parts: string[] = [];
        if (pClassic) parts.push(`classico ${fmt(pClassic)}`);
        if (pPercent) parts.push(`da % ${fmt(pPercent)}${arrowGuaranteedRaw ? ` su ${arrowGuaranteedRaw}` : ''}`);
        const detail = parts.length ? parts.join(', ') : undefined;
        damageSources.push({ label: 'Bonus anomalia • Freccia', value: arrowGuaranteedBonus, pure: true, detail });
      }
      if (!arrowGuaranteedRaw && !arrowGuaranteedBonus && eq.projectileDamage) damageSources.push({ label: 'Freccia', value: eq.projectileDamage, pure: true });
      if (!isCritical && eq.diceResult) {
        const baseDetail = baseDelta ? ` (base d${Number((eq as any)?.rawBaseDamage || 0)}${baseDelta > 0 ? ` + ${baseDelta}` : ` - ${Math.abs(baseDelta)}`})` : '';
        damageSources.push({ label: `Tiro d${eq.baseDamage}`, value: eq.diceResult, pure: false, detail: `${eq.diceResult} su d${eq.baseDamage}${baseDetail}` });
      }
      if (isCritical && baseDelta) {
        const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
        const bClassic = Number((eq as any)?.bonusBaseDamageClassic ?? 0) || 0;
        const bPercent = Number((eq as any)?.bonusBaseDamagePercent ?? 0) || 0;
        const parts: string[] = [];
        if (bClassic) parts.push(`classico ${fmt(bClassic)}`);
        if (bPercent) parts.push(`da % ${fmt(bPercent)}${Number((eq as any)?.rawBaseDamage || 0) ? ` su ${Number((eq as any)?.rawBaseDamage || 0)}` : ''}`);
        const detail = parts.length ? parts.join(', ') : undefined;
        damageSources.push({ label: 'Bonus anomalia • Arma (base)', value: baseDelta, pure: true, detail });
      }
      if (animaBonus) damageSources.push({ label: 'Anima', value: animaBonus, pure: true });

      // Bonus competenza non assicurato (contrattacco/assassinio)
      let bonusRollValue = 0;
      let bonusDetail: string | undefined;
      let multiplier = 1;
      const bc = (damage as any).bonusCompetence;
      if (bc?.type === 'contrattacco') {
        const sides = Number(bc.value) || Number((character as any)?.abilities?.contrattacco) || 0;
        if (sides > 0) {
          if (isCritical) {
            bonusRollValue = sides;
          } else {
            const roll = Math.floor(Math.random() * sides) + 1;
            bonusRollValue = roll;
            bonusDetail = `${roll} su d${sides}`;
          }
        }
        if (bonusRollValue) damageSources.push({ label: 'Bonus Contrattacco', value: bonusRollValue, pure: false, detail: bonusDetail });
      } else if (bc?.type === 'assassinio') {
        const sides = Number(bc.value) || Number((character as any)?.abilities?.assassinio) || 0;
        multiplier = Number(bc.multiplier) || 1;
        if (sides > 0) {
          if (isCritical) {
            bonusRollValue = sides;
          } else {
            const roll = Math.floor(Math.random() * sides) + 1;
            bonusRollValue = roll;
            bonusDetail = `${roll} su d${sides}`;
          }
        }
        if (bonusRollValue) damageSources.push({ label: 'Bonus Assassinio', value: bonusRollValue, pure: false, detail: bonusDetail });
      }

      // Totale (evita doppio conteggio del dado dell'arma)
      const eqTotal = isCritical
        ? (Number(eq.totalPureDamage || 0) + Number(eq.calculatedDamage || 0))
        : Number(eq.totalPureDamage ?? (eq.guaranteedDamage || 0));
      const totalBase = eqTotal + animaBonus + compTotal + bonusRollValue + arrowAdditionalValue + eqExtraTotal;
      totalDamage = multiplier !== 1 ? Math.round(totalBase * multiplier) : totalBase;

      const weaponName = weapon?.name || 'Arma';
      const typeLabel = mapDamageTypeLabel(damageType);
      const arrowName = arrow?.name ? arrow.name : undefined;

      if (lowHealthBonusMultiplier !== 1) {
        damageSources.push({
          label: 'Bonus Salute Bassa',
          value: lowHealthBonusMultiplier,
          pure: false,
          detail: `x${lowHealthBonusMultiplier} (${Math.round(healthPercentage)}%)`
        });
        totalDamage = Math.round(totalDamage * lowHealthBonusMultiplier);
      }

      // Valore critico puro (opzionale)
      const criticalExtra = Number((damage as any)?.criticalExtraPureValue || 0);
      if (criticalExtra > 0) {
        damageSources.push({ label: 'Valore critico puro', value: criticalExtra, pure: true });
        totalDamage += criticalExtra;
      }

      message = `${character.name} infligge ${totalDamage} usando ${weaponName}${typeLabel ? ' • ' + typeLabel : ''}`
        + (arrowName ? ` e ${arrowName}` : '')
        + (bonusCompLabel ? `, in ${bonusCompLabel}` : '')
        + (targetName ? ` contro ${targetName}` : '')
        + '!'
        + (extrasList.length ? ` ed usa ${extrasList.join(', ')}` : '');
    } else if (damage.source === 'magic' || damage.source === 'ability') {
      const item = damage.source === 'magic' ? damage.spell : damage.ability;
      const getRawBaseDamageSum = (srcItem: any): number => {
        try {
          if (!srcItem) return 0;
          const levelNum = Number(srcItem?.current_level ?? srcItem?.currentLevel ?? srcItem?.level ?? 1) || 1;
          let levelData: any = srcItem;
          if (Array.isArray(srcItem?.levels) && srcItem.levels.length > 0) {
            levelData =
              srcItem.levels.find((l: any) => Number(l?.level ?? 0) === levelNum) ||
              (srcItem?.current_level != null ? (srcItem.levels.find((l: any) => String(l?.level) === String(srcItem.current_level)) || null) : null) ||
              srcItem.levels[0] ||
              srcItem;
          }
          const dvs: any[] = Array.isArray(levelData?.damage_values) ? levelData.damage_values : [];
          if (dvs.length > 0) {
            return dvs.reduce((sum: number, dv: any) => {
              return sum + (Number(dv?.guaranteed_damage ?? 0) || 0) + (Number(dv?.additional_damage ?? 0) || 0);
            }, 0);
          }
          const g = Number(levelData?.guaranteed_damage ?? levelData?.damage ?? 0) || 0;
          const a = Number(levelData?.additional_damage ?? 0) || 0;
          return g + a;
        } catch {
          return 0;
        }
      };
      const rawBaseDamageSum = getRawBaseDamageSum(item);
      const hasNonNoneAnomalies = (() => {
        try {
          const list = Array.isArray((character as any)?.anomalies) ? (character as any).anomalies : [];
          return list.some((a: any) => {
            const name = String((a as any)?.name ?? (typeof a === 'string' ? a : '') ?? '').trim().toLowerCase();
            return name !== 'nessuna';
          });
        } catch {
          return false;
        }
      })();
      if (rawBaseDamageSum === 0 && !hasNonNoneAnomalies) {
        const damageDesc = makeDamageDescription(damage);
        const shotIndex3 = Number(((damage as any)?.triggers?.multipleShots?.currentShotIndex) ?? 0);
        const shotLabel3 = shotIndex3 > 0 ? ` — Attacco #${shotIndex3}` : '';
        const fallbackName = item?.name || (damage.source === 'magic' ? 'Magia' : 'Abilità');
        totalDamage = 0;
        message = `${character.name} infligge 0${shotLabel3} usando ${damageDesc || fallbackName}`
          + (bonusCompLabel ? `, in ${bonusCompLabel}` : '')
          + (targetName ? ` contro ${targetName}` : '')
          + '!'
          + (extrasList.length ? ` ed usa ${extrasList.join(', ')}` : '');
      } else {
      // Integra i trigger del dialog per DPS e Tiri multipli
      const triggers: any = (damage as any)?.triggers;
      const enrichedItem = { ...(item as any) };
      const selectedSeconds = Number(triggers?.damagePerSecond?.selectedSeconds || 0);
      if (selectedSeconds > 0) {
        enrichedItem.secondsDuration = selectedSeconds;
      }
      const selectedShots = Number(triggers?.multipleShots?.selectedShots || 0);
      if (selectedShots > 0) {
        enrichedItem.projectilesCount = selectedShots;
      }
      // Nota: i PA non mappano direttamente ad actionsCount qui.
      const includeAnima = !!(damage.includeAnima);

      const calc = calculateAbilityDamage(
        enrichedItem,
        { ...character, totalStats: (calculations?.totalStats ?? (character as any)?.totalStats) },
        [],
        isCritical,
        (character as any)?.anomalies || []
      );

      const animaBonus = includeAnima ? totalAnima : 0;
      const copies = Math.max(1, Number(calc.secondsDuration || 1)) * Math.max(1, Number(calc.projectilesCount || 1)) * Math.max(1, Number(calc.actionsCount || 1));
      const adjustedDamageValues: any[] = Array.isArray((calc as any)?.damageValuesAdjusted) ? ((calc as any).damageValuesAdjusted || []) : [];
      const adjustedMap: Record<string, any> = {};
      adjustedDamageValues.forEach((dv: any) => {
        const k = (dv?.typeName || dv?.name || 'Generico').toString();
        adjustedMap[k] = dv;
      });

      const scaledMovePureTotal = Math.max(0, Math.floor(Number((calc as any)?.scaledMovePureTotal ?? 0) || 0));
      if (scaledMovePureTotal > 0) {
        const statLabels: Record<string, string> = {
          forza: 'Forza',
          percezione: 'Percezione',
          resistenza: 'Resistenza',
          intelletto: 'Intelletto',
          agilita: 'Agilità',
          sapienza: 'Sapienza',
          anima: 'Anima',
        };
        const skillLabels: Record<string, string> = {
          schivata: 'Schivata',
          parata: 'Parata',
          deviazione: 'Deviazione',
          contrattacco: 'Contrattacco',
          precisione: 'Precisione',
          logica: 'Logica',
          trappole: 'Trappole',
          alchimia: 'Alchimia',
          fabbro: 'Fabbro',
          survivalista: 'Survivalista',
          furtivita: 'Furtività',
          assassinio: 'Assassinio',
          furto: 'Furto',
          saccheggio: 'Saccheggio',
        };
        const inputs: Array<{ kind: 'stat' | 'skill'; key: string; value: number }> = Array.isArray((calc as any)?.scaledMoveInputs)
          ? (calc as any).scaledMoveInputs
          : [];
        const inputsDetail = (inputs || [])
          .filter((x) => x && x.key && Number(x.value || 0) !== 0)
          .map((x) => {
            const k = String(x.key || '').trim();
            const label = x.kind === 'stat' ? (statLabels[k] || k) : (skillLabels[k] || k);
            return `${label}: ${Math.round(Number(x.value || 0))}`;
          })
          .join(', ');
        const copiesDetail = copies > 1 ? ` • copie: ${copies}` : '';
        const detail = `${inputsDetail}${copiesDetail}`.trim();

        const sourceValues = (Array.isArray(adjustedDamageValues) && adjustedDamageValues.length > 0)
          ? adjustedDamageValues
          : [];
        const typeNames = Array.from(new Set(
          (sourceValues || [])
            .map((dv: any) => (dv?.typeName || dv?.name || 'Generico').toString().trim())
            .filter(Boolean)
        ));
        const effectNames = typeNames.length > 0 ? typeNames : ['Generico'];
        const weights = effectNames.map((n) => {
          const dv = (sourceValues || []).find((x: any) => String((x?.typeName || x?.name || 'Generico')).trim() === n);
          return (Number(dv?.guaranteed_damage || 0) || 0) + (Number(dv?.additional_damage || 0) || 0);
        });
        const sumW = weights.reduce((sum, w) => sum + (Number(w || 0) || 0), 0);

        if (sumW > 0) {
          let used = 0;
          for (let i = 0; i < effectNames.length; i++) {
            const name = effectNames[i];
            const w = weights[i];
            const share = (i < effectNames.length - 1)
              ? Math.round(scaledMovePureTotal * (w / sumW))
              : Math.max(0, scaledMovePureTotal - used);
            used += (i < effectNames.length - 1) ? share : 0;
            if (share > 0) {
              damageSources.push({ label: `Bonus • ${name} • Mossa scalata`, value: share, pure: true, detail: detail || undefined });
            }
          }
        } else {
          const n = effectNames.length;
          const base = Math.floor(scaledMovePureTotal / n);
          const remainder = scaledMovePureTotal - (base * n);
          for (let i = 0; i < effectNames.length; i++) {
            const name = effectNames[i];
            const share = base + (i === n - 1 ? remainder : 0);
            if (share > 0) {
              damageSources.push({ label: `Bonus • ${name} • Mossa scalata`, value: share, pure: true, detail: detail || undefined });
            }
          }
        }
      }

      // Breakdown: assicurato per effetto (abilità/magie)
      if (calc.guaranteedDamage) {
        const levelData = (item as any)?.levels?.find((l: any) => l.level === (item as any)?.current_level) || (item as any);
        const damageValues = levelData?.damage_values;
        const sourceValues = (Array.isArray(adjustedDamageValues) && adjustedDamageValues.length > 0)
          ? adjustedDamageValues
          : (Array.isArray(damageValues) ? damageValues : []);
        if (Array.isArray(sourceValues) && sourceValues.length > 0) {
          sourceValues.forEach((dv: any) => {
            const name = (dv?.typeName || dv?.name || 'Assicurato').toString();
            const raw = Number((dv as any)?.raw_guaranteed_damage ?? dv?.guaranteed_damage ?? 0) || 0;
            const bonus = Number((dv as any)?.bonus_guaranteed_damage ?? 0) || 0;
            const bonusClassicPerCopy = Number((dv as any)?.bonus_guaranteed_classic ?? 0) || 0;
            const bonusPercentPerCopy = Number((dv as any)?.bonus_guaranteed_percent ?? 0) || 0;
            const rawVal = raw * copies;
            const bonusVal = bonus * copies;
            if (rawVal) {
              const notes = formatBonusNotes(Array.isArray((dv as any)?.bonus_effects) ? (dv as any).bonus_effects : []);
              damageSources.push({ label: `Assicurato • ${name}`, value: rawVal, pure: true, detail: notes ? `— ${notes}` : undefined });
            }
            if (bonusVal) {
              const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
              const classicTotal = bonusClassicPerCopy * copies;
              const percentTotal = bonusPercentPerCopy * copies;
              const parts: string[] = [];
              if (classicTotal) parts.push(`classico ${fmt(classicTotal)}`);
              if (percentTotal) parts.push(`da % ${fmt(percentTotal)}${rawVal ? ` su ${rawVal}` : ''}`);
              const detail = parts.length ? parts.join(', ') : undefined;
              damageSources.push({ label: `Bonus anomalia • ${name} (assicurato)`, value: bonusVal, pure: true, detail });
            }
          });
        } else {
          damageSources.push({ label: 'Danno assicurato', value: calc.guaranteedDamage, pure: true });
        }
      }

      if (calc.additionalDamage) {
        const levelData = (item as any)?.levels?.find((l: any) => l.level === (item as any)?.current_level) || (item as any);
        const damageValues = levelData?.damage_values;
        if (!isCritical) {
          // Raggruppa i tiri per effect/typeName
          const addRolls = Array.isArray(calc.diceRolls) ? (calc.diceRolls as any[]).filter(r => !r.name) : [];
          const byType: Record<string, { baseTotal: number; baseDetails: string[]; totalDetails: string[]; bonusTotal: number; bonusDetails: string[]; rawSides: number; deltaSides: number }> = {};
          addRolls.forEach((r: any) => {
            const t = (r.typeName || 'Generico').toString();
            const dvAdj = adjustedMap[t];
            const rawSides = Number(dvAdj?.raw_additional_damage ?? 0) || 0;
            const deltaSides = Number(dvAdj?.bonus_additional_damage ?? 0) || 0;
            const deltaClassic = Number(dvAdj?.bonus_additional_classic ?? 0) || 0;
            const deltaPercent = Number(dvAdj?.bonus_additional_percent ?? 0) || 0;
            if (!byType[t]) byType[t] = { baseTotal: 0, baseDetails: [], totalDetails: [], bonusTotal: 0, bonusDetails: [], rawSides, deltaSides };
            const res = Number(r.result || 0) || 0;
            const adjustedSides = (() => {
              const s = String(r.dice || '');
              const m = s.match(/d(\d+)/i);
              return m ? Number(m[1]) || 0 : 0;
            })();
            const { basePart, bonusPart } = (() => {
              if (rawSides <= 0) return { basePart: res, bonusPart: 0 };
              if (deltaSides < 0 && adjustedSides > 0) {
                const baseEquivalent = Math.max(1, Math.min(rawSides, Math.round((res / Math.max(1, adjustedSides)) * rawSides)));
                return { basePart: baseEquivalent, bonusPart: res - baseEquivalent };
              }
              const base = Math.min(res, rawSides);
              return { basePart: base, bonusPart: res - base };
            })();
            byType[t].baseTotal += basePart;
            byType[t].bonusTotal += bonusPart;
            const baseDetail = (() => {
              if (!deltaSides) return '';
              const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
              const segments: string[] = [];
              segments.push(
                rawSides > 0
                  ? `base d${rawSides}${deltaSides > 0 ? ` + ${deltaSides}` : ` - ${Math.abs(deltaSides)}`}`
                  : `bonus facce ${deltaSides > 0 ? `+${deltaSides}` : `-${Math.abs(deltaSides)}`}`
              );
              const bonusParts: string[] = [];
              if (deltaClassic) bonusParts.push(`classico ${fmt(deltaClassic)}`);
              if (deltaPercent) bonusParts.push(`da % ${fmt(deltaPercent)}${rawSides ? ` su ${rawSides}` : ''}`);
              if (bonusParts.length) segments.push(bonusParts.join(', '));
              return ` (${segments.join('; ')})`;
            })();
            byType[t].totalDetails.push(r.copy ? `copia ${r.copy}: ${res} su ${r.dice}${baseDetail}` : `${res} su ${r.dice}${baseDetail}`);
            if (rawSides > 0) {
              byType[t].baseDetails.push(r.copy ? `copia ${r.copy}: ${basePart} su d${rawSides}` : `${basePart} su d${rawSides}`);
              if (bonusPart !== 0) {
                const det = bonusPart < 0
                  ? (r.copy ? `copia ${r.copy}: ${bonusPart} (detrazione)` : `${bonusPart} (detrazione)`)
                  : (r.copy ? `copia ${r.copy}: ${bonusPart} su d${Math.max(1, deltaSides)}` : `${bonusPart} su d${Math.max(1, deltaSides)}`);
                byType[t].bonusDetails.push(det);
              }
            } else {
              byType[t].baseDetails.push(r.copy ? `copia ${r.copy}: ${basePart} su ${r.dice}` : `${basePart} su ${r.dice}`);
            }
          });
          const keys = Object.keys(byType);
          if (keys.length > 0) {
            const levelData = (item as any)?.levels?.find((l: any) => l.level === (item as any)?.current_level) || (item as any);
            const damageValues = Array.isArray(levelData?.damage_values) ? levelData.damage_values : [];
            const dvMap: Record<string, any> = {};
            damageValues.forEach((dv: any) => {
              const k = (dv?.typeName || dv?.name || 'Generico').toString();
              dvMap[k] = dv;
            });
            keys.forEach(k => {
              const info = byType[k];
              const dv = adjustedMap[k] || dvMap[k];
              const notes = formatBonusNotes(Array.isArray((dv as any)?.bonus_effects) ? (dv as any).bonus_effects : []);
              const baseDetail = info.baseDetails.join(', ');
              damageSources.push({ label: `Aggiuntivo • ${k}`, value: info.baseTotal, pure: false, detail: notes ? `${baseDetail} — ${notes}` : baseDetail });

              if (info.bonusTotal !== 0) {
                const bonusDetail = info.bonusDetails.length > 0 ? info.bonusDetails.join(', ') : info.totalDetails.join(', ');
                damageSources.push({
                  label: `Bonus anomalia • ${k} (aggiuntivo)`,
                  value: info.bonusTotal,
                  pure: false,
                  detail: notes ? `${bonusDetail} — ${notes}` : bonusDetail,
                });
              }
            });
          } else {
            damageSources.push({ label: 'Danno aggiuntivo (dadi)', value: calc.additionalDamage, pure: false });
          }
        } else {
          const sourceValues = (Array.isArray(adjustedDamageValues) && adjustedDamageValues.length > 0)
            ? adjustedDamageValues
            : (Array.isArray(damageValues) ? damageValues : []);
          if (Array.isArray(sourceValues) && sourceValues.length > 0) {
            sourceValues.forEach((dv: any) => {
              const name = (dv?.typeName || dv?.name || 'Aggiuntivo').toString();
              const raw = Number((dv as any)?.raw_additional_damage ?? dv?.additional_damage ?? 0) || 0;
              const bonus = Number((dv as any)?.bonus_additional_damage ?? 0) || 0;
              const bonusClassicPerCopy = Number((dv as any)?.bonus_additional_classic ?? 0) || 0;
              const bonusPercentPerCopy = Number((dv as any)?.bonus_additional_percent ?? 0) || 0;
              const rawVal = raw * copies;
              const bonusVal = bonus * copies;
              if (rawVal) {
                const notes = formatBonusNotes(Array.isArray((dv as any)?.bonus_effects) ? (dv as any).bonus_effects : []);
                damageSources.push({ label: `Aggiuntivo • ${name}`, value: rawVal, pure: true, detail: notes ? `— ${notes}` : undefined });
              }
              if (bonusVal) {
                const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
                const classicTotal = bonusClassicPerCopy * copies;
                const percentTotal = bonusPercentPerCopy * copies;
                const parts: string[] = [];
                if (classicTotal) parts.push(`classico ${fmt(classicTotal)}`);
                if (percentTotal) parts.push(`da % ${fmt(percentTotal)}${rawVal ? ` su ${rawVal}` : ''}`);
                const detail = parts.length ? parts.join(', ') : undefined;
                damageSources.push({ label: `Bonus anomalia • ${name} (aggiuntivo)`, value: bonusVal, pure: true, detail });
              }
            });
          } else {
            damageSources.push({ label: 'Danno aggiuntivo (critico)', value: calc.additionalDamage, pure: true });
          }
        }
      }

      const extraDamageDetails: any[] = Array.isArray((calc as any)?.extraDamageDetails) ? (calc as any).extraDamageDetails : [];
      const extraDamageTotal = Number((calc as any)?.extraDamageTotal || 0) || 0;
      if (extraDamageDetails.length > 0) {
        extraDamageDetails.forEach((row: any) => {
          const name = String(row?.typeName || 'Danno extra');
          const val = Number(row?.total || 0) || 0;
          if (!val) return;
          const detail = Array.isArray(row?.details) && row.details.length ? row.details.join(', ') : undefined;
          damageSources.push({ label: `Danno extra • ${name}`, value: val, pure: isCritical, detail });
        });
      }

      const incPure = Number((calc as any)?.increasingPureTotal ?? ((calc as any)?.increasingPerSecondPure ?? 0));
      if (incPure > 0) {
        const levelData = (item as any)?.levels?.find((l: any) => l.level === (item as any)?.current_level) || (item as any);
        const damageValues: any[] = Array.isArray(levelData?.damage_values) ? levelData.damage_values : [];
        if (Array.isArray(damageValues) && damageValues.length > 0) {
          const weights = damageValues.map((dv: any) => Number(dv?.guaranteed_damage || 0) + Number(dv?.additional_damage || 0));
          const sumW = weights.reduce((sum: number, w: number) => sum + w, 0);
          if (sumW > 0) {
            let used = 0;
            for (let i = 0; i < damageValues.length; i++) {
              const name = (damageValues[i]?.typeName || damageValues[i]?.name || 'Generico').toString();
              const w = weights[i];
              const share = (i < damageValues.length - 1)
                ? Math.round(incPure * (w / sumW))
                : Math.max(0, incPure - used);
              used += (i < damageValues.length - 1) ? share : 0;
              if (share > 0) {
                damageSources.push({ label: `Danno crescente • ${name}`, value: share, pure: true });
              }
            }
          } else {
            // Distribuzione uniforme se non ci sono pesi
            const n = damageValues.length;
            const base = Math.floor(incPure / n);
            const remainder = incPure - (base * n);
            for (let i = 0; i < damageValues.length; i++) {
              const name = (damageValues[i]?.typeName || damageValues[i]?.name || 'Generico').toString();
              const share = base + (i === n - 1 ? remainder : 0);
              if (share > 0) {
                damageSources.push({ label: `Danno crescente • ${name}`, value: share, pure: true });
              }
            }
          }
        } else {
          // Fallback: nessun dettaglio di tipo, usa voce generica
          damageSources.push({ label: 'Danno crescente', value: incPure, pure: true });
        }
      }

      if (calc.competenceTotal) {
        const compRolls = Array.isArray(calc.diceRolls) ? (calc.diceRolls as any[]).filter(r => !!r.name) : [];
        const compDetail = compRolls.length ? compRolls.map((r: any) => `${r.name} (${r.dice}): ${r.result}`).join(', ') : undefined;
        damageSources.push({ label: isCritical ? 'Competenze (pure)' : 'Competenze (dadi)', value: calc.competenceTotal, pure: isCritical, detail: compDetail });
      }

      if (animaBonus) damageSources.push({ label: 'Anima', value: animaBonus, pure: true });

      let lotteryMagicAddition = 0;
      try {
        const lot = (damage as any)?.triggers?.lottery;
        const cc = Number(lot?.correctCount || 0);
        const wc = Number(lot?.wrongCount || 0);
        const levelData = (item as any)?.levels?.find((l: any) => l.level === (item as any)?.current_level) || (item as any);
        const corrArr: any[] = Array.isArray((levelData as any)?.lottery_correct_instances) ? (levelData as any).lottery_correct_instances : [];
        const wrongArr: any[] = Array.isArray((levelData as any)?.lottery_wrong_instances) ? (levelData as any).lottery_wrong_instances : [];
        const pickByTitle = (arr: any[], prefix: string, n: number) => {
          if (!arr || arr.length === 0 || n <= 0) return null;
          const title = `${prefix} ${n}`;
          const byTitle = arr.find((x: any) => String((x?.title || '')).toLowerCase() === title.toLowerCase());
          if (byTitle) return byTitle;
          const idx = n - 1;
          return arr[idx] || null;
        };
        const corrInst = pickByTitle(corrArr, 'Corretta', cc);
        const wrongInst = pickByTitle(wrongArr, 'Sbagliata', wc);
        const applyInstance = (inst: any, labelPrefix: string, n: number) => {
          if (!inst || n <= 0) return;
          const topG = Number(inst?.guaranteed_damage || 0) || 0;
          const topA = Number(inst?.additional_damage || 0) || 0;
          if (topG > 0) {
            lotteryMagicAddition += topG;
            damageSources.push({ label: `Tombola • ${labelPrefix} ${n}`, value: topG, pure: true });
          }
          if (topA > 0) {
            if (isCritical) {
              lotteryMagicAddition += topA;
              damageSources.push({ label: `Tombola • ${labelPrefix} ${n} (aggiuntivo)`, value: topA, pure: true });
            } else {
              const roll = Math.floor(Math.random() * Math.max(1, topA)) + 1;
              lotteryMagicAddition += roll;
              damageSources.push({ label: `Tombola • ${labelPrefix} ${n} (d${topA})`, value: roll, pure: false, detail: `${roll} su d${topA}` });
            }
          }
          const dvs: any[] = Array.isArray(inst?.damage_values) ? inst.damage_values : [];
          dvs.forEach((dv: any) => {
            const typeName = (dv?.typeName || dv?.name || 'Generico').toString();
            const g = Number(dv?.guaranteed_damage || 0) || 0;
            const a = Number(dv?.additional_damage || 0) || 0;
            if (g > 0) {
              lotteryMagicAddition += g;
              damageSources.push({ label: `Tombola • ${labelPrefix} ${n} • ${typeName}`, value: g, pure: true });
            }
            if (a > 0) {
              if (isCritical) {
                lotteryMagicAddition += a;
                damageSources.push({ label: `Tombola • ${labelPrefix} ${n} • ${typeName} (aggiuntivo)`, value: a, pure: true });
              } else {
                const roll = Math.floor(Math.random() * Math.max(1, a)) + 1;
                lotteryMagicAddition += roll;
                damageSources.push({ label: `Tombola • ${labelPrefix} ${n} • ${typeName} (d${a})`, value: roll, pure: false, detail: `${roll} su d${a}` });
              }
            }
          });
        };
        applyInstance(corrInst, 'Corretta', cc);
        applyInstance(wrongInst, 'Sbagliata', wc);
      } catch {}

      // Bonus competenza lato danno per abilità/magie (mai asterisco)
      let bonusRollValue2 = 0;
      let bonusDetail2: string | undefined;
      let multiplier2 = 1;
      const bc2 = (damage as any).bonusCompetence;
      if (bc2?.type === 'contrattacco') {
        const sides = Number(bc2.value) || Number((character as any)?.abilities?.contrattacco) || 0;
        if (sides > 0) {
          if (isCritical) {
            bonusRollValue2 = sides;
          } else {
            const roll = Math.floor(Math.random() * sides) + 1;
            bonusRollValue2 = roll;
            bonusDetail2 = `${roll} su d${sides}`;
          }
        }
        if (bonusRollValue2) damageSources.push({ label: 'Bonus Contrattacco', value: bonusRollValue2, pure: false, detail: bonusDetail2 });
      } else if (bc2?.type === 'assassinio') {
        const sides = Number(bc2.value) || Number((character as any)?.abilities?.assassinio) || 0;
        multiplier2 = Number(bc2.multiplier) || 1;
        if (sides > 0) {
          if (isCritical) {
            bonusRollValue2 = sides;
          } else {
            const roll = Math.floor(Math.random() * sides) + 1;
            bonusRollValue2 = roll;
            bonusDetail2 = `${roll} su d${sides}`;
          }
        }
        if (bonusRollValue2) damageSources.push({ label: 'Bonus Assassinio', value: bonusRollValue2, pure: false, detail: bonusDetail2 });
        // Mostra il moltiplicatore Assassinio nel breakdown
        if (multiplier2 !== 1) {
          damageSources.push({
            label: 'Moltiplicatore Assassinio',
            value: multiplier2,
            pure: false,
            detail: `x${multiplier2}`
          });
        }
      }

      // Se abilitato, somma anche il danno arma nella stessa voce di danno
      let weaponExtraTotal = 0;
      if (triggers?.useWeaponDamage?.enabled) {
        const weapon = (damage as any)?.weaponForDamage;
        const dmgType = (damage as any)?.weaponDamageType || 'veloce';
        const arrow = (damage as any)?.arrowForDamage;
        if (weapon) {
          const eq = calculateEquipmentDamage(weapon, dmgType, arrow, isCritical, (character as any)?.anomalies || []);
          const baseDelta = Number(eq?.baseDamage || 0) - Number((eq as any)?.rawBaseDamage || 0);
          const calcDelta = Number(eq?.calculatedDamage || 0) - Number((eq as any)?.rawCalculatedDamage || 0);
          // Breakdown equipaggiamento: effettua push nelle sorgenti
          const sets: any[] = Array.isArray((weapon as any)?.data?.damage_sets)
            ? (weapon as any).data.damage_sets
            : (Array.isArray((weapon as any)?.damage_sets) ? (weapon as any).damage_sets : []);
          const typeLabel = mapDamageTypeLabel(dmgType);
          if (Array.isArray(sets) && sets.length > 0) {
            sets.forEach((s: any) => {
              const v = Number(s?.[dmgType === 'veloce' ? 'calculated_damage_veloce' : dmgType === 'pesante' ? 'calculated_damage_pesante' : 'calculated_damage_affondo'] || 0);
              if (v > 0) damageSources.push({ label: `Danno arma • ${s?.effect_name || 'Effetto'} • ${typeLabel}`, value: v, pure: true });
            });
            if (calcDelta) {
              const rawCalc = Number((eq as any)?.rawCalculatedDamage || 0);
              const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
              const cClassic = Number((eq as any)?.bonusCalculatedDamageClassic ?? 0) || 0;
              const cPercent = Number((eq as any)?.bonusCalculatedDamagePercent ?? 0) || 0;
              const parts: string[] = [];
              if (cClassic) parts.push(`classico ${fmt(cClassic)}`);
              if (cPercent) parts.push(`da % ${fmt(cPercent)}${rawCalc ? ` su ${rawCalc}` : ''}`);
              const detail = parts.length ? parts.join(', ') : undefined;
              damageSources.push({ label: 'Bonus anomalia • Arma (33%)', value: calcDelta, pure: true, detail });
            }
          } else {
            const raw = Number((eq as any)?.rawCalculatedDamage || 0);
            if (raw) damageSources.push({ label: 'Danno arma (33%)', value: raw, pure: true });
            if (calcDelta) {
              const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
              const cClassic = Number((eq as any)?.bonusCalculatedDamageClassic ?? 0) || 0;
              const cPercent = Number((eq as any)?.bonusCalculatedDamagePercent ?? 0) || 0;
              const parts: string[] = [];
              if (cClassic) parts.push(`classico ${fmt(cClassic)}`);
              if (cPercent) parts.push(`da % ${fmt(cPercent)}${raw ? ` su ${raw}` : ''}`);
              const detail = parts.length ? parts.join(', ') : undefined;
              damageSources.push({ label: 'Bonus anomalia • Arma (33%)', value: calcDelta, pure: true, detail });
            }
          }
          if (eq.projectileDamage) damageSources.push({ label: 'Freccia', value: eq.projectileDamage, pure: true });
          if (!isCritical && eq.diceResult) {
            const baseDetail = baseDelta ? ` (base d${Number((eq as any)?.rawBaseDamage || 0)}${baseDelta > 0 ? ` + ${baseDelta}` : ` - ${Math.abs(baseDelta)}`})` : '';
            damageSources.push({ label: `Tiro d${eq.baseDamage}`, value: eq.diceResult, pure: false, detail: `${eq.diceResult} su d${eq.baseDamage}${baseDetail}` });
          }
          if (isCritical && baseDelta) {
            const fmt = (n: number) => (n >= 0 ? `+${n}` : `-${Math.abs(n)}`);
            const bClassic = Number((eq as any)?.bonusBaseDamageClassic ?? 0) || 0;
            const bPercent = Number((eq as any)?.bonusBaseDamagePercent ?? 0) || 0;
            const parts: string[] = [];
            if (bClassic) parts.push(`classico ${fmt(bClassic)}`);
            if (bPercent) parts.push(`da % ${fmt(bPercent)}${Number((eq as any)?.rawBaseDamage || 0) ? ` su ${Number((eq as any)?.rawBaseDamage || 0)}` : ''}`);
            const detail = parts.length ? parts.join(', ') : undefined;
            damageSources.push({ label: 'Bonus anomalia • Arma (base)', value: baseDelta, pure: true, detail });
          }
          // Danno aggiuntivo della freccia (dN): tira se non critico, altrimenti somma come puro
          try {
            let arrowAdditionalSides = 0;
            const aSets: any[] = Array.isArray((arrow as any)?.damage_sets) ? (arrow as any).damage_sets : [];
            if (Array.isArray(aSets) && aSets.length > 0) {
              arrowAdditionalSides = aSets.reduce((sum: number, s: any) => sum + (Number(s?.additional_damage || 0)), 0);
            } else {
              arrowAdditionalSides = Number((arrow as any)?.additional_damage || 0) || 0;
            }
            if (arrowAdditionalSides > 0) {
              if (isCritical) {
                weaponExtraTotal += arrowAdditionalSides;
                damageSources.push({ label: 'Freccia (aggiuntivo)', value: arrowAdditionalSides, pure: true });
              } else {
                const roll = Math.floor(Math.random() * Math.max(1, arrowAdditionalSides)) + 1;
                weaponExtraTotal += roll;
                damageSources.push({ label: `Freccia (d${arrowAdditionalSides})`, value: roll, pure: false, detail: `${roll} su d${arrowAdditionalSides}` });
              }
            }
          } catch {}

          const eqExtraDetails: any[] = Array.isArray((eq as any)?.extraDamageDetails) ? (eq as any).extraDamageDetails : [];
          const eqExtraTotal = Number((eq as any)?.extraDamageTotal || 0) || 0;
          if (eqExtraDetails.length > 0) {
            eqExtraDetails.forEach((row: any) => {
              const name = String(row?.typeName || 'Danno extra');
              const val = Number(row?.total || 0) || 0;
              if (!val) return;
              const detail = Array.isArray(row?.details) && row.details.length ? row.details.join(', ') : undefined;
              damageSources.push({ label: `Danno extra • ${name}`, value: val, pure: isCritical, detail });
            });
          }

          weaponExtraTotal += isCritical
            ? (Number(eq.totalPureDamage || 0) + Number(eq.calculatedDamage || 0))
            : Number(eq.totalPureDamage ?? (eq.guaranteedDamage || 0));
          weaponExtraTotal += eqExtraTotal;

          // Competenze arma separate
          const compIds2 = Array.isArray((damage as any)?.weaponCompetences) ? (damage as any).weaponCompetences : [];
          let compTotal2 = 0;
          const compDetails2: string[] = [];
          compIds2.forEach((id) => {
            const sides = Number((character as any)?.abilities?.[id]) || 0;
            if (sides > 0) {
              if (isCritical) {
                compTotal2 += sides;
              } else {
                const roll = Math.floor(Math.random() * sides) + 1;
                compTotal2 += roll;
                const label = DAMAGE_COMPETENCE_LABELS[id] || id;
                compDetails2.push(`${label} (d${sides}): ${roll}`);
              }
            }
          });
          if (compTotal2) {
            damageSources.push({ label: isCritical ? 'Competenze arma (pure)' : 'Competenze arma (dadi)', value: compTotal2, pure: isCritical, detail: isCritical ? undefined : (compDetails2.length ? compDetails2.join(', ') : undefined) });
            weaponExtraTotal += compTotal2;
          }

          // Nota: l’Anima è già conteggiata per la magia/abilità; non si somma di nuovo per arma
        }
      }

      // Base di calcolo separata: il Moltiplicatore PA si applica SOLO ai danni della magia
      const baseMagicDamage = (calc.guaranteedDamage || 0) + (calc.additionalDamage || 0) + Number((calc as any)?.increasingPureTotal ?? (calc as any)?.increasingPerSecondPure ?? 0) + lotteryMagicAddition + scaledMovePureTotal + extraDamageTotal;
      const nonMagicDamage = (calc.competenceTotal || 0) + animaBonus + bonusRollValue2 + weaponExtraTotal;

      // Incremento danno per PA: applica se esiste un rate > 0 e PA selezionati
      const apSelected = Number((damage as any)?.triggers?.actionPoints?.selected || 0) || 0;
      const apRate = Number((damage as any)?.triggers?.actionPoints?.damageIncreasePerPa?.rate || 0) || 0;
      const apMultiplier = (apSelected > 0 && apRate > 0) ? Math.pow(apRate, apSelected) : 1;
      if (apMultiplier !== 1) {
        const apRateDisplayStr = apRate.toFixed(3).replace(/\.0{1,3}$/,'').replace(/\.([0-9]*?)0+$/,'.$1');
        damageSources.push({
          label: 'Moltiplicatore PA',
          value: apMultiplier,
          pure: false,
          detail: `x${apRateDisplayStr}^${apSelected}`
        });
      }

      // Applica prima il Moltiplicatore PA ai soli danni della magia, poi l'Assassinio al totale
      const subtotalAfterPA = (apMultiplier !== 1 ? (baseMagicDamage * apMultiplier) : baseMagicDamage) + nonMagicDamage;
      const assassinioMultiplier = (multiplier2 !== 1 ? multiplier2 : 1);
      totalDamage = assassinioMultiplier !== 1 ? Math.round(subtotalAfterPA * assassinioMultiplier) : Math.round(subtotalAfterPA);

      if (lowHealthBonusMultiplier !== 1) {
        damageSources.push({
          label: 'Bonus Salute Bassa',
          value: lowHealthBonusMultiplier,
          pure: false,
          detail: `x${lowHealthBonusMultiplier} (${Math.round(healthPercentage)}%)`
        });
        totalDamage = Math.round(totalDamage * lowHealthBonusMultiplier);
      }

      // Valore critico puro (opzionale)
      const criticalExtra2 = Number((damage as any)?.criticalExtraPureValue || 0);
      if (criticalExtra2 > 0) {
        damageSources.push({ label: 'Valore critico puro', value: criticalExtra2, pure: true });
        totalDamage += criticalExtra2;
      }

      const damageDesc = makeDamageDescription(damage);
      const shotIndex3 = Number(((damage as any)?.triggers?.multipleShots?.currentShotIndex) ?? 0);
      const shotLabel3 = shotIndex3 > 0 ? ` — Attacco #${shotIndex3}` : '';
      const fallbackName = item?.name || (damage.source === 'magic' ? 'Magia' : 'Abilità');
      message = `${character.name} infligge ${totalDamage}${shotLabel3} usando ${damageDesc || fallbackName}`
        + (bonusCompLabel ? `, in ${bonusCompLabel}` : '')
        + (targetName ? ` contro ${targetName}` : '')
        + '!'
        + (extrasList.length ? ` ed usa ${extrasList.join(', ')}` : '');
      }
    }

    const damageDescription = makeDamageDescription(damage);

    const entry: NewRollEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      characterId: character?.id,
      characterName: character?.name || '',
      result: totalDamage,
      diceMax: 0,
      targetName,
      damageDescription,
      timestamp: Date.now(),
      baseResult: 0,
      statKey: undefined,
      statLabel: undefined,
      statValue: 0,
      competenceDetails: [],
      entryType: 'damage',
      damageSources,
    };

    setEntries(prev => [entry, ...prev]);
    insertEntryRow(entry);
    return entry;
  }, [insertEntryRow]);

  const clear = useCallback(async () => {
    // Ambiente server locale: elimina tutte le righe via endpoint generico, richiede admin lato app
    if (isLocalServer()) {
      if (!isAdmin) {
        throw new Error('Accesso negato: solo admin possono eliminare lo storico');
      }
      const ids = entries.map(e => e.id);
      await Promise.all(ids.map(id => Api.deleteTableRow('roll_history', id)));
      setEntries([]);
      return ids.length;
    }
    // Supabase: richiede ruolo admin secondo RLS
    if (!isAdmin || !user) {
      throw new Error('Accesso negato: solo admin autenticati possono eliminare lo storico');
    }
    const { count } = await supabase
      .from('roll_history')
      .select('*', { count: 'exact', head: true });
    const { error } = await supabase
      .from('roll_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    setEntries([]);
    return count || 0;
  }, [entries, isAdmin, user]);

  const addCustomEntry = useCallback((entry: Partial<NewRollEntry> & { message: string; characterId?: string; characterName: string; result: number; diceMax?: number; entryType?: 'action' | 'damage' }) => {
    const e: NewRollEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: entry.message,
      characterId: entry.characterId,
      characterName: entry.characterName,
      result: entry.result,
      diceMax: Number(entry.diceMax || 0),
      targetName: entry.targetName,
      damageDescription: entry.damageDescription,
      timestamp: Date.now(),
      baseResult: Number(entry.baseResult ?? entry.result),
      statKey: entry.statKey,
      statLabel: entry.statLabel,
      statValue: Number(entry.statValue || 0),
      competenceDetails: entry.competenceDetails || [],
      entryType: entry.entryType || 'action',
      badge: entry.badge,
      damageSources: entry.damageSources,
      isPercent: entry.isPercent,
      percentMinRequired: entry.percentMinRequired,
    };
    setEntries(prev => [e, ...prev]);
    insertEntryRow(e);
    return e;
  }, [insertEntryRow]);

  return { entries, addEntryFromModalRoll, addDamageEntryFromModalRoll, updateEntryBadge, clear, addCustomEntry, updateEntryLotteryInfo, appendEntryDamageSources, reload };
}
