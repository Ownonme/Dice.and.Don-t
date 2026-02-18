import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { listAllEvocationInstances } from '@/integrations/supabase/evocationInstances';

interface EnemyStatSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enemy: any | null;
  onConfirm: (payload: {
    selectedStat?: string;
    selectedCompetences?: { id: string; name: string; value: number }[];
    target?: { type: 'none' | 'characters' | 'enemies'; id?: string; name?: string } | null;
    targets?: { type: 'characters' | 'enemies'; id?: string; name?: string }[];
    damage?: any;
  }) => void;
  onRequestPostureModal?: () => void;
}

const EnemyStatSelectionDialog: React.FC<EnemyStatSelectionDialogProps> = ({ isOpen, onClose, enemy, onConfirm }) => {
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'none' | 'characters' | 'enemies' | 'evocations'>('none');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [publicCharacters, setPublicCharacters] = useState<any[]>([]);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [evocations, setEvocations] = useState<any[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<{ id: string; name: string }[]>([]);

  const [compileDamage, setCompileDamage] = useState<boolean>(false);
  const [damageSource, setDamageSource] = useState<'equipment' | 'magic' | 'ability' | ''>('');
  const [selectedWeapon, setSelectedWeapon] = useState<any>(null);
  const [weaponDamageType, setWeaponDamageType] = useState<string>('');
  const [selectedSpell, setSelectedSpell] = useState<any>(null);
  const [selectedAbility, setSelectedAbility] = useState<any>(null);
  const [selectedArrow, setSelectedArrow] = useState<any>(null);
  const [bonusCompetenceType, setBonusCompetenceType] = useState<'none' | 'assassinio' | 'contrattacco'>('none');
  const [assassinioMultiplier, setAssassinioMultiplier] = useState<number>(1);
  const [includeAnimaInDamage, setIncludeAnimaInDamage] = useState<boolean>(false);
  const [extras, setExtras] = useState<Array<{ id: string; type: 'ability' | 'magic'; item: any }>>([]);
  const [selectedDamageCompetences, setSelectedDamageCompetences] = useState<string[]>([]);
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
    { id: 'pesante', label: 'Pesante' }
  ];
  const handleDamageCompetenceToggle = (id: string) => {
    setSelectedDamageCompetences(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const [paInvestmentEnabled, setPaInvestmentEnabled] = useState<boolean>(false);
  const [selectedPaConsumption, setSelectedPaConsumption] = useState<number>(0);
  const [damageIncreasePerPaEnabled, setDamageIncreasePerPaEnabled] = useState<boolean>(false);
  const [increaseDamagePerPa, setIncreaseDamagePerPa] = useState<number>(0);
  const [selectedSpellGradeNumber, setSelectedSpellGradeNumber] = useState<number>(1);
  const [selectedDpsSeconds, setSelectedDpsSeconds] = useState<number>(0);
  const [selectedShotsCount, setSelectedShotsCount] = useState<number>(0);
  const [lotteryUserChoices, setLotteryUserChoices] = useState<number[]>([]);
  const [directDamageEnabled, setDirectDamageEnabled] = useState<boolean>(false);
  const [selectedPostureNameLocal, setSelectedPostureNameLocal] = useState<string>('');

  // Liste derivate dal nemico
  const weapons = useMemo(() => {
    try {
      return Array.isArray(enemy?.enemy_weapons) ? enemy.enemy_weapons : [];
    } catch { return []; }
  }, [enemy]);
  const spells = useMemo(() => {
    try {
      return Array.isArray(enemy?.enemy_spells) ? enemy.enemy_spells : [];
    } catch { return []; }
  }, [enemy]);
  const sortedSpells = useMemo(() => {
    try {
      return [...spells].sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }));
    } catch { return spells; }
  }, [spells]);
  const abilitiesList = useMemo(() => {
    try {
      return Array.isArray(enemy?.enemy_abilities) ? enemy.enemy_abilities : [];
    } catch { return []; }
  }, [enemy]);

  const arrows = useMemo(() => {
    try {
      return Array.isArray(enemy?.arrows) ? enemy.arrows : [];
    } catch { return []; }
  }, [enemy]);

  const isRangedWeapon = useMemo(() => {
    return Boolean(selectedWeapon?.subtype === 'arma_distanza' || selectedWeapon?.type === 'arma_distanza');
  }, [selectedWeapon]);

  const animaTotal = useMemo(() => {
    return Number(enemy?.enemy_anima || 0);
  }, [enemy]);
  const maxPaInvestment = useMemo(() => {
    return Math.max(0, Number(enemy?.enemy_current_pa ?? enemy?.enemy_max_pa ?? 0));
  }, [enemy]);
  useEffect(() => {
    try {
      const active = abilitiesList.find((a: any) => (a?.category === 'Posture' || a?.subcategory === 'Posture' || a?.category === 'Tecnico') && a?.is_active);
      setSelectedPostureNameLocal(active ? String(active?.name || '') : '');
    } catch {
      setSelectedPostureNameLocal('');
    }
  }, [abilitiesList]);

  // Mappa etichetta statistica leggibile
  const prettyStatLabel = (key: string): string => {
    const map: Record<string, string> = {
      enemy_forza: 'Forza',
      enemy_percezione: 'Percezione',
      enemy_resistenza: 'Resistenza',
      enemy_intelletto: 'Intelletto',
      enemy_sapienza: 'Sapienza',
      enemy_anima: 'Anima',
    };
    return map[key] || key;
  };

  const stats = [
    { key: 'enemy_forza', name: 'Forza', value: Number(enemy?.enemy_forza || 0) },
    { key: 'enemy_percezione', name: 'Percezione', value: Number(enemy?.enemy_percezione || 0) },
    { key: 'enemy_resistenza', name: 'Resistenza', value: Number(enemy?.enemy_resistenza || 0) },
    { key: 'enemy_intelletto', name: 'Intelletto', value: Number(enemy?.enemy_intelletto || 0) },
    { key: 'enemy_sapienza', name: 'Sapienza', value: Number(enemy?.enemy_sapienza || 0) },
    { key: 'enemy_anima', name: 'Anima', value: Number(enemy?.enemy_anima || 0) },
  ];

  // Competenze disponibili per i nemici: se non definiti, lascia vuoto
  const availableCompetences: { id: string; name: string; value: number }[] = [];

  const handleCompetenceToggle = (competenceId: string) => {
    setSelectedCompetences(prev => prev.includes(competenceId) ? prev.filter(id => id !== competenceId) : [...prev, competenceId]);
  };

  const mapDamageType = (t: string) => {
    if (!t) return '';
    return t === 'leggero' ? 'veloce' : t;
  };
  const getSpellLevelInfo = (spell: any) => {
    if (!spell) return null;
    const levelNum = Number(spell?.current_level) || Number(spell?.level) || Number(spell?.levels?.[0]?.level) || 1;
    const levelObj = Array.isArray(spell?.levels)
      ? (spell.levels.find((l: any) => Number(l.level) === levelNum) || spell.levels[0])
      : spell;
    const gradesArr = Array.isArray((levelObj as any)?.grades) ? (levelObj as any).grades : [];
    const desiredGradeNumber = Number(selectedSpellGradeNumber || 1);
    const levelData = (gradesArr.length > 0 && desiredGradeNumber > 1)
      ? (gradesArr.find((g: any) => Number(g?.grade_number || 0) === desiredGradeNumber) || gradesArr[Math.max(0, desiredGradeNumber - 2)])
      : levelObj;
    const useBaseFallback = !(desiredGradeNumber > 1);
    const damageValues = Array.isArray(levelData?.damage_values) ? levelData.damage_values : [];
    const totals = damageValues.reduce((acc: any, v: any) => {
      acc.guaranteed += Number(v?.guaranteed_damage || 0);
      acc.additional += Number(v?.additional_damage || 0);
      return acc;
    }, { guaranteed: 0, additional: 0 });
    const guaranteed = levelData?.guaranteed_damage ?? levelData?.danno_assicurato ?? (useBaseFallback ? (spell?.guaranteed_damage ?? 0) : 0);
    const additional = levelData?.additional_damage ?? levelData?.danno_aggiuntivo ?? (useBaseFallback ? (spell?.additional_damage ?? 0) : 0);
    const actionCost = levelData?.action_cost ?? levelData?.punti_azione ?? (useBaseFallback ? (spell?.action_cost ?? levelData?.indicative_action_cost ?? spell?.indicative_action_cost) : (levelData?.indicative_action_cost ?? 0));
    return {
      levelNum,
      levelData,
      damageValues,
      hasDamageValues: damageValues.length > 0,
      guaranteedTotal: (totals.guaranteed > 0 ? totals.guaranteed : Number(guaranteed || 0)),
      additionalTotal: (totals.additional > 0 ? totals.additional : Number(additional || 0)),
      actionCost
    };
  };

  const handleConfirm = () => {
    const selectedCompetenceData = availableCompetences.filter(c => selectedCompetences.includes(c.id));
    const targetsInfo = targetType === 'none' ? [] : selectedTargets.map(t => ({ type: targetType, id: t.id, name: t.name }));
    if (targetType !== 'none' && selectedTargets.length === 0) {
      return;
    }

    const bonusCompetence =
      bonusCompetenceType === 'none'
        ? null
        : (() => {
            if (bonusCompetenceType === 'assassinio') {
              return { type: 'assassinio', value: 0, multiplier: Number(assassinioMultiplier) || 1 };
            }
            return { type: 'contrattacco', value: 0 };
          })();

    const extrasPayload = extras.filter(x => x.item).map(x => ({ type: x.type, item: x.item }));

    const damagePayload = compileDamage ? (
      damageSource === 'equipment' && selectedWeapon
        ? {
            source: 'equipment',
            weapon: selectedWeapon,
            damageType: mapDamageType(weaponDamageType),
            arrow: isRangedWeapon ? selectedArrow : null,
            consumeArrow: isRangedWeapon && !!selectedArrow,
            weaponCompetences: selectedDamageCompetences,
            bonusCompetence,
            includeAnima: includeAnimaInDamage,
            extra: extrasPayload[0] || null,
            extras: extrasPayload,
            triggers: {
              useWeaponDamage: { enabled: true },
              actionPoints: {
                enabled: paInvestmentEnabled,
                max: maxPaInvestment,
                selected: paInvestmentEnabled ? Math.min(Math.max(0, Number(selectedPaConsumption || 0)), maxPaInvestment) : 0,
                damageIncreasePerPa: {
                  enabled: damageIncreasePerPaEnabled,
                  rate: increaseDamagePerPa
                }
              }
            }
          }
        : damageSource === 'magic' && selectedSpell
          ? (() => {
              const info = getSpellLevelInfo(selectedSpell);
              const lvl = info?.levelData || {};
              const shape = String(lvl?.damage_shape || selectedSpell?.damage_shape || '').trim();
              const maxTargets = Number(lvl?.max_targets || selectedSpell?.max_targets || 0) || undefined;
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
              const maxMultipleShotsRaw = Number((lvl as any)?.max_multiple_attacks || (selectedSpell as any)?.max_multiple_attacks || (lvl as any)?.max_projectiles || (selectedSpell as any)?.max_projectiles || 0) || 0;
              const multipleShotsEnabled = maxMultipleShotsRaw > 0;
              const maxSecondsRaw = Number(lvl?.max_seconds || selectedSpell?.max_seconds || 0) || 0;
              const paCostPerSecondRaw = Number(lvl?.pa_cost_per_second || selectedSpell?.pa_cost_per_second || 0) || 0;
              const increasePerSecond = Number(lvl?.increasing_damage_per_second || selectedSpell?.increasing_damage_per_second || 0) || 0;
              const dpsEnabled = (maxSecondsRaw > 0) || (paCostPerSecondRaw > 0) || (increasePerSecond > 0);
              const useWeaponDamage = !!(lvl?.use_weapon_damage || (selectedSpell as any)?.use_weapon_damage);
              const maxPaInv = Number((lvl as any)?.max_pa_investment ?? (selectedSpell as any)?.max_pa_investment ?? (lvl as any)?.extra_action_cost ?? (selectedSpell as any)?.extra_action_cost ?? (lvl as any)?.indicative_action_cost ?? (selectedSpell as any)?.indicative_action_cost ?? 0) || 0;
              const incPaRate = Number(lvl?.increasing_damage_per_pa || (selectedSpell as any)?.increasing_damage_per_pa || (selectedSpell as any)?.increase_damage_per_pa || 0) || 0;
              const numericChoices = Number((lvl as any)?.lottery_numeric_choices ?? (selectedSpell as any)?.lottery_numeric_choices ?? 0) || 0;
              const faces = Number((lvl as any)?.lottery_dice_faces ?? (selectedSpell as any)?.lottery_dice_faces ?? 0) || 0;
              const values = lotteryUserChoices.slice(0, numericChoices);
              return {
                source: 'magic',
                spell: selectedSpell,
                bonusCompetence,
                includeAnima: includeAnimaInDamage,
                extra: extrasPayload[0] || null,
                extras: extrasPayload,
                triggers: {
                  targetsRule,
                  multipleShots: {
                    enabled: multipleShotsEnabled,
                    max: multipleShotsEnabled ? maxMultipleShotsRaw : undefined,
                    selected: multipleShotsEnabled ? Math.min(Math.max(0, Number(selectedShotsCount || 0)), maxMultipleShotsRaw) : 0,
                    increasePerShot: Number(lvl?.damage_increasing_per_multiple_shots || selectedSpell?.damage_increasing_per_multiple_shots || 0) || 0
                  },
                  seconds: {
                    enabled: dpsEnabled,
                    max: maxSecondsRaw || undefined,
                    selectedSeconds: dpsEnabled ? (maxSecondsRaw ? Math.min(Math.max(0, Number(selectedDpsSeconds || 0)), maxSecondsRaw) : Math.max(0, Number(selectedDpsSeconds || 0))) : 0,
                    paCostPerSecond: paCostPerSecondRaw,
                    increasePerSecond
                  },
                  actionPoints: {
                    enabled: !!(maxPaInv || incPaRate),
                    max: maxPaInv || undefined,
                    selected: (maxPaInv || incPaRate) ? (maxPaInv ? Math.min(Math.max(0, Number(selectedPaConsumption || 0)), maxPaInv) : Math.max(0, Number(selectedPaConsumption || 0))) : 0,
                    damageIncreasePerPa: {
                      enabled: incPaRate > 0,
                      rate: incPaRate
                    }
                  },
                  lottery: {
                    enabled: numericChoices > 0,
                    faces,
                    values
                  },
                  useWeaponDamage: {
                    enabled: useWeaponDamage
                  },
                  weapon: useWeaponDamage ? {
                    selectedWeapon,
                    damageType: mapDamageType(weaponDamageType),
                    arrow: isRangedWeapon ? selectedArrow : null,
                    consumeArrow: isRangedWeapon && !!selectedArrow,
                    weaponCompetences: selectedDamageCompetences
                  } : undefined
                }
              };
            })()
        : damageSource === 'ability' && selectedAbility
          ? (() => {
              const lvl = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
              const useWeaponDamage = !!(lvl?.use_weapon_damage || (selectedAbility as any)?.use_weapon_damage);
              const maxPaInv = Number((lvl as any)?.max_pa_investment ?? (selectedAbility as any)?.max_pa_investment ?? (lvl as any)?.extra_action_cost ?? (selectedAbility as any)?.extra_action_cost ?? (lvl as any)?.indicative_action_cost ?? (selectedAbility as any)?.indicative_action_cost ?? 0) || 0;
              const incPaRate = Number((lvl as any)?.increasing_damage_per_pa ?? (selectedAbility as any)?.increasing_damage_per_pa ?? 0) || 0;
              return {
                source: 'ability',
                ability: selectedAbility,
                bonusCompetence,
                includeAnima: includeAnimaInDamage,
                extra: extrasPayload[0] || null,
                extras: extrasPayload,
                triggers: {
                  useWeaponDamage: { enabled: useWeaponDamage },
                  weapon: useWeaponDamage ? {
                    selectedWeapon,
                    damageType: mapDamageType(weaponDamageType),
                    arrow: isRangedWeapon ? selectedArrow : null,
                    consumeArrow: isRangedWeapon && !!selectedArrow,
                    weaponCompetences: selectedDamageCompetences
                  } : undefined,
                  actionPoints: {
                    enabled: !!(maxPaInv || incPaRate),
                    max: maxPaInv || undefined,
                    selected: (maxPaInv || incPaRate) ? (maxPaInv ? Math.min(Math.max(0, Number(selectedPaConsumption || 0)), maxPaInv) : Math.max(0, Number(selectedPaConsumption || 0))) : 0,
                    damageIncreasePerPa: {
                      enabled: incPaRate > 0,
                      rate: incPaRate
                    }
                  }
                }
              };
            })()
          : null
    ) : null;

    const directApply = (() => {
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
    })();

    onConfirm({
      selectedStat,
      selectedCompetences: selectedCompetenceData,
      target: (targetsInfo && targetsInfo.length > 0) ? targetsInfo[0] : { type: 'none' },
      targets: targetsInfo,
      damage: damagePayload ? { ...damagePayload, directApply } : { directApply },
    });
    onClose();
  };

  useEffect(() => {
    const loadPublicCharacters = async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, is_public')
        .eq('is_public', true)
        .order('name', { ascending: true });
      if (!error) setPublicCharacters(data || []);
    };
    const loadEnemies = async () => {
      const { data, error } = await supabase
        .from('enemies')
        .select('id, name')
        .order('name', { ascending: true });
      if (!error) setEnemies(data || []);
    };
    const loadEvocations = async () => {
      try {
        const rows = await listAllEvocationInstances();
        const active = (rows || []).filter((r: any) => Number(r?.remaining_turns || 0) > 0);
        const mapped = active.map((r: any) => ({ id: String(r.id), name: String(r.name) }));
        setEvocations(mapped);
      } catch {}
    };
    if (isOpen) {
      if (targetType === 'characters') loadPublicCharacters();
      if (targetType === 'enemies') loadEnemies();
      if (targetType === 'evocations') loadEvocations();
    }
  }, [isOpen, targetType]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" aria-describedby="enemy-stat-selection-description">
        <DialogHeader>
          <DialogTitle>Seleziona Statistica e Competenze</DialogTitle>
          <DialogDescription id="enemy-stat-selection-description">
            Scegli una statistica per il tiro di dado e opzionalmente seleziona le competenze da aggiungere al tiro.
          </DialogDescription>
        </DialogHeader>

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
                    {stat.name} ({stat.value})
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

          <div>
            <label className="text-sm font-medium">Seleziona bersaglio</label>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v as any); setSelectedTargets([]); setSearchQuery(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli categoria bersaglio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun bersaglio</SelectItem>
                <SelectItem value="characters">Personaggi (pubblici)</SelectItem>
                <SelectItem value="enemies">Nemici</SelectItem>
                <SelectItem value="evocations">Evocazioni attive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(targetType === 'characters' || targetType === 'enemies' || targetType === 'evocations') && (
            <div className="space-y-2">
              <Input
                placeholder="Cerca per nome"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <ScrollArea className="h-40 rounded border p-2">
                {((targetType === 'characters' ? publicCharacters : (targetType === 'enemies' ? enemies : evocations)) || [])
                  .filter((item: any) => item.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item: any) => (
                    <button
                      key={item.id}
                      className={`w-full text-left px-2 py-1 rounded ${selectedTargets.some(t => t.id === item.id) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                      onClick={() => {
                        setSelectedTargets(prev => (
                          prev.some(t => t.id === item.id)
                            ? prev.filter(t => t.id !== item.id)
                            : [...prev, { id: item.id, name: item.name }]
                        ));
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                {(((targetType === 'characters' ? publicCharacters : (targetType === 'enemies' ? enemies : evocations)) || [])
                  .filter((item: any) => item.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .length === 0) && (
                    <div className="text-sm text-muted-foreground">Nessun risultato</div>
                )}
              </ScrollArea>
            </div>
          )}
          {selectedTargets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTargets.map((t) => (
                <span key={t.id} className="inline-flex items-center px-2 py-1 rounded bg-muted text-sm">
                  {t.name}
                  <button className="ml-2 text-xs hover:underline" onClick={() => setSelectedTargets(prev => prev.filter(x => x.id !== t.id))}>rimuovi</button>
                </span>
              ))}
            </div>
          )}

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
                    setSelectedSpell(null);
                    setSelectedAbility(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      {weapons.length > 0 && <SelectItem value="equipment">Equipaggiamento</SelectItem>}
                      {spells.length > 0 && <SelectItem value="magic">Magia</SelectItem>}
                      {abilitiesList.length > 0 && <SelectItem value="ability">Abilità</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {damageSource === 'equipment' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Arma</label>
                      <Select value={selectedWeapon?.name || ''} onValueChange={(value) => {
                        const weapon = weapons.find((w: any) => w.name === value);
                        setSelectedWeapon(weapon);
                        setSelectedArrow(null);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona arma" />
                        </SelectTrigger>
                        <SelectContent>
                          {weapons.map((weapon: any, index: number) => (
                            <SelectItem key={index} value={weapon.name}>
                              {weapon.name}
                            </SelectItem>
                          ))}
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
                      const veloce = sum(sets, 'damage_veloce', 'calculated_damage_veloce', (selectedWeapon as any)?.damageVeloce ?? (selectedWeapon as any)?.enemy_damage_leggero);
                      const pesante = sum(sets, 'damage_pesante', 'calculated_damage_pesante', (selectedWeapon as any)?.damagePesante ?? (selectedWeapon as any)?.enemy_damage_pesante);
                      const affondo = sum(sets, 'damage_affondo', 'calculated_damage_affondo', (selectedWeapon as any)?.damageAffondo ?? (selectedWeapon as any)?.enemy_damage_affondo);
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
                      <label className="text-sm font-medium">Tipo di Danno Arma</label>
                      <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leggero">
                            {(() => {
                              const sets: any[] = Array.isArray((selectedWeapon as any)?.data?.damage_sets)
                                ? (selectedWeapon as any).data.damage_sets
                                : (Array.isArray((selectedWeapon as any)?.damage_sets) ? (selectedWeapon as any).damage_sets : []);
                              const base = (sets.length > 0)
                                ? sets.reduce((sum, s) => sum + (Number(s?.damage_veloce) || 0), 0)
                                : Number((selectedWeapon as any)?.damageVeloce ?? (selectedWeapon as any)?.enemy_damage_leggero ?? 0);
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
                                : Number((selectedWeapon as any)?.damagePesante ?? (selectedWeapon as any)?.enemy_damage_pesante ?? 0);
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
                                : Number((selectedWeapon as any)?.damageAffondo ?? (selectedWeapon as any)?.enemy_damage_affondo ?? 0);
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
                        <label className="text-sm font-medium">Frecce/Proiettili</label>
                        <Select value={selectedArrow?.name || ''} onValueChange={(value) => {
                          const arrow = arrows.find((a: any) => a.name === value);
                          setSelectedArrow(arrow || null);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder={arrows.length > 0 ? 'Seleziona freccia' : 'Nessuna freccia disponibile'} />
                          </SelectTrigger>
                          <SelectContent>
                            {arrows.map((a: any, index: number) => (
                              <SelectItem key={index} value={a.name}>{a.name}</SelectItem>
                            ))}
                            {arrows.length === 0 && (
                              <SelectItem value="no-arrow" disabled>Nessuna freccia</SelectItem>
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
                              id={`dm-eq-${opt.id}`}
                              checked={selectedDamageCompetences.includes(opt.id)}
                              onCheckedChange={() => handleDamageCompetenceToggle(opt.id)}
                            />
                            <label htmlFor={`dm-eq-${opt.id}`} className="text-sm">{opt.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Investire PA</label>
                        <Switch checked={paInvestmentEnabled} onCheckedChange={setPaInvestmentEnabled} />
                      </div>
                      {paInvestmentEnabled && (
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <div className="text-xs text-muted-foreground">Max</div>
                            <div className="text-sm font-medium">{maxPaInvestment}</div>
                          </div>
                          <div>
                            <label className="text-sm">PA usati</label>
                            <Input
                              type="number"
                              min={0}
                              max={maxPaInvestment}
                              value={selectedPaConsumption}
                              onChange={(e) => setSelectedPaConsumption(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={damageIncreasePerPaEnabled} onCheckedChange={setDamageIncreasePerPaEnabled} />
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              value={increaseDamagePerPa}
                              onChange={(e) => setIncreaseDamagePerPa(parseFloat(e.target.value) || 0)}
                              placeholder="Aumento danno per PA"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {damageSource === 'magic' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Magia</label>
                      <Select value={selectedSpell?.name || ''} onValueChange={(value) => {
                        const spell = spells.find((s: any) => s.name === value);
                        setSelectedSpell(spell);
                        setSelectedSpellGradeNumber(1);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona magia" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedSpells.map((spell: any, index: number) => (
                            <SelectItem key={index} value={spell.name}>
                              {spell.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSpell && (() => {
                      const info = getSpellLevelInfo(selectedSpell);
                      const lvl = info?.levelData || {};
                      const currentLevelNumber = Number((selectedSpell as any)?.current_level) || Number((selectedSpell as any)?.level) || Number((selectedSpell as any)?.levels?.[0]?.level) || 1;
                      const currentLevel = Array.isArray((selectedSpell as any)?.levels)
                        ? ((selectedSpell as any).levels.find((l: any) => Number(l.level) === currentLevelNumber) || (selectedSpell as any).levels[0])
                        : (selectedSpell as any);
                      const grades = Array.isArray((currentLevel as any)?.grades) ? (currentLevel as any).grades : [];
                      const rule = (() => {
                        const shape = String(lvl?.damage_shape || selectedSpell?.damage_shape || '').trim().toLowerCase();
                        const maxTargets = Number(lvl?.max_targets || selectedSpell?.max_targets || 0) || undefined;
                        if (shape.includes('area') || shape.includes('cono')) return 'Area/Cono';
                        if (shape.includes('catena')) return `Catena${maxTargets ? ` • max ${maxTargets}` : ''}`;
                        return `Singolo${maxTargets ? ` • max ${maxTargets}` : ''}`;
                      })();
                      return (
                        <div className="rounded border p-2 text-sm space-y-2">
                          {grades.length > 0 && (
                            <div>
                              <label className="text-sm font-medium">Grado interno</label>
                              <Select value={String(selectedSpellGradeNumber)} onValueChange={(value) => setSelectedSpellGradeNumber(Number(value))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona grado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={"1"}>Grado 1 (base livello)</SelectItem>
                                  <SelectItem value={"2"} disabled={!grades.find((g: any) => Number(g?.grade_number || 0) === 2)}>Grado 2</SelectItem>
                                  <SelectItem value={"3"} disabled={!grades.find((g: any) => Number(g?.grade_number || 0) === 3)}>Grado 3</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Livello</div>
                              <div>{info?.levelNum ?? '-'}</div>
                            </div>
                            {grades.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground">Grado</div>
                                <div>{Number(selectedSpellGradeNumber || 1)}</div>
                              </div>
                            )}
                          </div>
                          {Number(info?.guaranteedTotal || 0) > 0 && (
                            <div>Danno assicurato: {Number(info?.guaranteedTotal || 0)}</div>
                          )}
                          {Number(info?.additionalTotal || 0) > 0 && (
                            <div>Danno aggiuntivo: {Number(info?.additionalTotal || 0)}</div>
                          )}
                          {(() => {
                            const detailed = (Array.isArray(info?.damageValues) ? info!.damageValues : []).filter((v: any) => (
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
                          <div>
                            <div className="text-xs text-muted-foreground">Regole bersagli</div>
                            <div>{rule}</div>
                          </div>

                          {(() => {
                            const maxProjVal = Number((lvl as any)?.max_multiple_attacks || (selectedSpell as any)?.max_multiple_attacks || (lvl as any)?.max_projectiles || (selectedSpell as any)?.max_projectiles || 0) || 0;
                            return maxProjVal > 0;
                          })() && (
                            <div className="pt-2 space-y-1">
                              <div className="text-xs text-muted-foreground">Tiri multipli</div>
                              <div className="flex items-center gap-2">
                                <Input type="number" min={0} max={Number((lvl as any)?.max_multiple_attacks || (selectedSpell as any)?.max_multiple_attacks || (lvl as any)?.max_projectiles || (selectedSpell as any)?.max_projectiles || 0) || undefined} value={selectedShotsCount} onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  const max = Number((lvl as any)?.max_multiple_attacks || (selectedSpell as any)?.max_multiple_attacks || (lvl as any)?.max_projectiles || (selectedSpell as any)?.max_projectiles || 0) || 0;
                                  const clampedShots = max > 0 ? Math.min(Math.max(0, v), max) : Math.max(0, v);
                                  setSelectedShotsCount(clampedShots);
                                }} placeholder={`Max ${Number((lvl as any)?.max_multiple_attacks || (selectedSpell as any)?.max_multiple_attacks || (lvl as any)?.max_projectiles || (selectedSpell as any)?.max_projectiles || 0) || 0}`} />
                                <span className="text-xs text-muted-foreground">Danno crescente: {Number(lvl?.damage_increasing_per_multiple_shots || selectedSpell?.damage_increasing_per_multiple_shots || 0) || 0}</span>
                              </div>
                            </div>
                          )}

                          {(() => {
                            const maxS = Number(lvl?.max_seconds || 0) || 0;
                            const paS = Number(lvl?.pa_cost_per_second || 0) || 0;
                            const incS = Number(lvl?.increasing_damage_per_second || 0) || 0;
                            const show = (maxS > 0) || (paS > 0) || (incS > 0);
                            return show;
                          })() && (
                            <div className="pt-2 space-y-1">
                              <div className="text-xs text-muted-foreground">Danno al secondo</div>
                              <div className="flex items-center gap-2">
                                <Input type="number" min={0} max={Number(lvl?.max_seconds || 0) || undefined} value={selectedDpsSeconds} onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  const max = Number(lvl?.max_seconds || 0) || 0;
                                  setSelectedDpsSeconds(max > 0 ? Math.min(Math.max(0, v), max) : Math.max(0, v));
                                }} placeholder={`Max ${Number(lvl?.max_seconds || 0) || 0}`} />
                                <span className="text-xs text-muted-foreground">Danno crescente: {Number(lvl?.increasing_damage_per_second || 0) || 0}</span>
                              </div>
                            </div>
                          )}

                          {(() => {
                            const maxPa = Number((lvl as any)?.max_pa_investment ?? (selectedSpell as any)?.max_pa_investment ?? (lvl as any)?.extra_action_cost ?? (selectedSpell as any)?.extra_action_cost ?? (lvl as any)?.indicative_action_cost ?? (selectedSpell as any)?.indicative_action_cost ?? 0) || 0;
                            const incPa = Number(lvl?.increasing_damage_per_pa || (selectedSpell as any)?.increasing_damage_per_pa || (selectedSpell as any)?.increase_damage_per_pa || 0) || 0;
                            const show = (maxPa > 0) || (incPa > 0);
                            return show;
                          })() && (
                            <div className="pt-2 space-y-1">
                              <div className="text-xs text-muted-foreground">Impiego PA</div>
                              <div className="flex items-center gap-2">
                                <Input type="number" min={0} max={Number((lvl as any)?.max_pa_investment ?? (selectedSpell as any)?.max_pa_investment ?? (lvl as any)?.extra_action_cost ?? (selectedSpell as any)?.extra_action_cost ?? (lvl as any)?.indicative_action_cost ?? (selectedSpell as any)?.indicative_action_cost ?? 0) || undefined} value={selectedPaConsumption} onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  const maxPa = Number((lvl as any)?.max_pa_investment ?? (selectedSpell as any)?.max_pa_investment ?? (lvl as any)?.extra_action_cost ?? (selectedSpell as any)?.extra_action_cost ?? (lvl as any)?.indicative_action_cost ?? (selectedSpell as any)?.indicative_action_cost ?? 0) || 0;
                                  setSelectedPaConsumption(maxPa > 0 ? Math.min(Math.max(0, v), maxPa) : Math.max(0, v));
                                }} placeholder={`Max ${Number((lvl as any)?.max_pa_investment ?? (selectedSpell as any)?.max_pa_investment ?? (lvl as any)?.extra_action_cost ?? (selectedSpell as any)?.extra_action_cost ?? (lvl as any)?.indicative_action_cost ?? (selectedSpell as any)?.indicative_action_cost ?? 0) || 0}`} />
                                {(() => {
                                  const rate = Number(lvl?.increasing_damage_per_pa || (selectedSpell as any)?.increasing_damage_per_pa || (selectedSpell as any)?.increase_damage_per_pa || 0) || 0;
                                  return rate > 0 ? (<span className="text-xs text-muted-foreground">Tasso crescita/PA: {rate}</span>) : null;
                                })()}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const useWeapon = !!(lvl?.use_weapon_damage || (selectedSpell as any)?.use_weapon_damage);
                            return useWeapon;
                          })() && (
                            <div className="pt-2 space-y-2">
                              <div className="text-xs text-muted-foreground">Usa anche danno arma</div>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium">Arma</label>
                                  <Select value={selectedWeapon?.name || ''} onValueChange={(value) => {
                                    const w = weapons.find((x: any) => x?.name === value);
                                    setSelectedWeapon(w || null);
                                  }}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleziona arma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {weapons.map((w: any, index: number) => (
                                        <SelectItem key={index} value={w.name}>
                                          {w.name}
                                        </SelectItem>
                                      ))}
                                      {weapons.length === 0 && (
                                        <SelectItem value="no-weapon" disabled>Nessuna arma disponibile</SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {selectedWeapon && (
                                  <div>
                                    <label className="text-sm font-medium">Tipo di danno</label>
                                    <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Scegli tipo danno" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="leggero">Leggero</SelectItem>
                                        <SelectItem value="pesante">Pesante</SelectItem>
                                        <SelectItem value="affondo">Affondo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                {isRangedWeapon && (
                                  <div>
                                    <label className="text-sm font-medium">Frecce/Proiettili</label>
                                    <Select value={selectedArrow?.name || ''} onValueChange={(value) => {
                                      const a = arrows.find((x: any) => x?.name === value);
                                      setSelectedArrow(a || null);
                                    }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona freccia" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {arrows.map((a: any, index: number) => (
                                          <SelectItem key={index} value={a.name}>
                                            {a.name}
                                          </SelectItem>
                                        ))}
                                        {arrows.length === 0 && (
                                          <SelectItem value="no-arrow" disabled>Nessuna freccia</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
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
                                        <label htmlFor={`dm-mg-${opt.id}`} className="text-sm">{opt.label}</label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {(() => {
                            const numericChoices = Number((lvl as any)?.lottery_numeric_choices ?? (selectedSpell as any)?.lottery_numeric_choices ?? 0) || 0;
                            const diceFaces = Number((lvl as any)?.lottery_dice_faces ?? (selectedSpell as any)?.lottery_dice_faces ?? 0) || 0;
                            const show = (numericChoices > 0) || (diceFaces > 0);
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
                        </div>
                      );
                    })()}
                  </div>
                )}

                {damageSource === 'ability' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Abilità</label>
                      <Select value={selectedAbility?.name || ''} onValueChange={(value) => {
                        const ability = abilitiesList.find((a: any) => a.name === value);
                        setSelectedAbility(ability);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona abilità" />
                        </SelectTrigger>
                        <SelectContent>
                          {abilitiesList.map((ability: any, index: number) => (
                            <SelectItem key={index} value={ability.name}>
                              {ability.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedAbility && (
                      <div className="rounded border p-2 text-sm space-y-1">
                        <div className="font-medium">{selectedAbility.name}</div>
                        {selectedAbility.levels && Array.isArray(selectedAbility.levels) && selectedAbility.levels.length > 0 ? (
                          <>
                            <div>Livello: {selectedAbility.levels[0]?.level ?? '-'}</div>
                            <div>Danno assicurato: {selectedAbility.levels[0]?.danno_assicurato ?? selectedAbility.levels[0]?.guaranteed_damage ?? '-'}</div>
                            <div>Danno aggiuntivo: {selectedAbility.levels[0]?.danno_aggiuntivo ?? selectedAbility.levels[0]?.additional_damage ?? '-'}</div>
                            <div>Punti azione: {selectedAbility.levels[0]?.punti_azione ?? selectedAbility.levels[0]?.action_cost ?? '-'}</div>
                            {(() => {
                              const lvl: any = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                              const maxPa = Number(lvl?.max_pa_investment || (selectedAbility as any)?.max_pa_investment || (lvl as any)?.extra_action_cost || (selectedAbility as any)?.extra_action_cost || (lvl as any)?.indicative_action_cost || (selectedAbility as any)?.indicative_action_cost || 0) || 0;
                              const dmgIncEnabled = !!(lvl?.damageIncreasePerPaEnabled || (selectedAbility as any)?.damageIncreasePerPaEnabled);
                              const rate = Number(lvl?.increasing_damage_per_pa || (selectedAbility as any)?.increasing_damage_per_pa || 0) || 0;
                              const explicitFlag = !!(lvl?.paInvestmentEnabled || (selectedAbility as any)?.paInvestmentEnabled);
                              const paEnabled = explicitFlag || (maxPa > 0) || dmgIncEnabled || (rate > 0);
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
                                      <span className="text-xs text-muted-foreground">Tasso crescita/PA: {rate}</span>
                                    )}
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </>
                        ) : (
                          <div>Nessun dettaglio livello disponibile</div>
                        )}
                      </div>
                    )}

                    {selectedAbility && (() => {
                      const lvl = Array.isArray((selectedAbility as any)?.levels) ? (selectedAbility as any).levels[0] : (selectedAbility as any);
                      const useWeapon = !!(lvl?.use_weapon_damage || (selectedAbility as any)?.use_weapon_damage);
                      return useWeapon ? (
                        <div className="pt-2 space-y-2">
                          <div className="text-xs text-muted-foreground">Usa anche danno arma</div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">Arma</label>
                              <Select value={selectedWeapon?.name || ''} onValueChange={(value) => {
                                const w = weapons.find((x: any) => x?.name === value);
                                setSelectedWeapon(w || null);
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona arma" />
                                </SelectTrigger>
                                <SelectContent>
                                  {weapons.map((w: any, index: number) => (
                                    <SelectItem key={index} value={w.name}>
                                      {w.name}
                                    </SelectItem>
                                  ))}
                                  {weapons.length === 0 && (
                                    <SelectItem value="no-weapon" disabled>Nessuna arma disponibile</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            {selectedWeapon && (
                              <div>
                                <label className="text-sm font-medium">Tipo di danno</label>
                                <Select value={weaponDamageType} onValueChange={setWeaponDamageType}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Scegli tipo danno" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="leggero">Leggero</SelectItem>
                                    <SelectItem value="pesante">Pesante</SelectItem>
                                    <SelectItem value="affondo">Affondo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {isRangedWeapon && (
                              <div>
                                <label className="text-sm font-medium">Frecce/Proiettili</label>
                                <Select value={selectedArrow?.name || ''} onValueChange={(value) => {
                                  const a = arrows.find((x: any) => x?.name === value);
                                  setSelectedArrow(a || null);
                                }}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona freccia" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {arrows.map((a: any, index: number) => (
                                      <SelectItem key={index} value={a.name}>
                                        {a.name}
                                      </SelectItem>
                                    ))}
                                    {arrows.length === 0 && (
                                      <SelectItem value="no-arrow" disabled>Nessuna freccia</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
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
                                    <label htmlFor={`dm-ab-${opt.id}`} className="text-sm">{opt.label}</label>
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

                {/* Riepilogo scelta (display arma/magia/abilità) */}
                {compileDamage && (selectedWeapon || selectedSpell || selectedAbility) && (
                  <div className="rounded border p-3 bg-muted/30 space-y-1">
                    <div className="text-sm font-medium">Riepilogo scelta</div>
                    {damageSource === 'equipment' && selectedWeapon && (
                      <div className="text-xs space-y-1">
                        <div><span className="font-semibold">Arma:</span> {selectedWeapon.name}</div>
                        <div><span className="font-semibold">Tipo:</span> {selectedWeapon.type || selectedWeapon.subtype || '—'}</div>
                        <div><span className="font-semibold">Danno:</span> {mapDamageType(weaponDamageType) || '—'}</div>
                        {isRangedWeapon && (
                          <div><span className="font-semibold">Freccia/Proiettile:</span> {selectedArrow?.name || '—'}</div>
                        )}
                      </div>
                    )}
                    {damageSource === 'magic' && selectedSpell && (
                      <div className="text-xs space-y-1">
                        <div><span className="font-semibold">Magia:</span> {selectedSpell.name}</div>
                        <div><span className="font-semibold">Categoria:</span> {selectedSpell.category || '—'}</div>
                        <div><span className="font-semibold">Sottocategoria:</span> {selectedSpell.subcategory || '—'}</div>
                      </div>
                    )}
                    {damageSource === 'ability' && selectedAbility && (
                      <div className="text-xs space-y-1">
                        <div><span className="font-semibold">Abilità:</span> {selectedAbility.name}</div>
                        <div><span className="font-semibold">Categoria:</span> {selectedAbility.category || '—'}</div>
                        <div><span className="font-semibold">Sottocategoria:</span> {selectedAbility.subcategory || '—'}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Opzioni danno generali */}
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
                        Usa il valore della competenza Contrattacco del nemico (se definito).
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
                              <Select value={ex.item?.name || ''} onValueChange={(value) => {
                                const ab = abilitiesList.find((x: any) => x?.name === value);
                                setExtras(prev => prev.map((e,i) => i===idx ? { ...e, item: ab || null } : e));
                              }}>
                                <SelectTrigger><SelectValue placeholder="Seleziona abilità" /></SelectTrigger>
                                <SelectContent>
                                  {abilitiesList.map((ab: any, index: number) => (
                                    <SelectItem key={index} value={ab.name}>{ab.name}</SelectItem>
                                  ))}
                                  {abilitiesList.length === 0 && (
                                    <SelectItem value="no-ability" disabled>Nessuna abilità</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value={ex.item?.name || ''} onValueChange={(value) => {
                                const s = spells.find((x: any) => x?.name === value);
                                setExtras(prev => prev.map((e,i) => i===idx ? { ...e, item: s || null } : e));
                              }}>
                                <SelectTrigger><SelectValue placeholder="Seleziona magia" /></SelectTrigger>
                                <SelectContent>
                                  {sortedSpells.map((s: any, index: number) => (
                                    <SelectItem key={index} value={s.name}>{s.name}</SelectItem>
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
                  <div className="pt-2 border-t mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Danno diretto</label>
                      <Switch checked={directDamageEnabled} onCheckedChange={setDirectDamageEnabled} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-sm">{selectedPostureNameLocal ? `Postura selezionata: ${selectedPostureNameLocal}` : 'Nessuna postura selezionata'}</div>
            <Button variant="secondary" onClick={() => {}}>
              Gestisci postura
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleConfirm} disabled={
              !selectedStat ||
              (targetType !== 'none' && selectedTargets.length === 0) ||
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
            }>
              Conferma
            </Button>
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnemyStatSelectionDialog;
