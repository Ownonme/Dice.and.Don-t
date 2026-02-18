import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { ABILITY_GRADES, ABILITY_SECTIONS } from '@/constants/abilityConfig';
import { MAGIC_GRADES, MAGIC_SECTIONS } from '@/constants/magicConfig';

export interface StatsModifier {
  forza: number;
  percezione: number;
  resistenza: number;
  intelletto: number;
  agilita: number;
  sapienza: number;
  anima: number;
}

export interface DamageSetRow {
  damageEffectId: string;
  guaranteedDamage: number;
  additionalDamage: number;
}

export interface ValueClassicAndPercent {
  classicGuaranteed: number;
  classicAdditional: number;
  percentageGuaranteed: number;
  percentageAdditional: number;
}

export interface DamageBonusDefinition extends ValueClassicAndPercent {
  isSpecific: boolean;
  damageEffectIds: string[];
  damageEffectNames?: string[];
  applyToEquipment?: boolean;
  mode?: 'classic' | 'percentage';
}

export interface DamageEffectValueDefinition extends ValueClassicAndPercent {
  isSpecific: boolean;
  damageEffectIds: string[];
  damageEffectNames?: string[];
  mode?: 'classic' | 'percentage';
}

export type PaDiscountTargetMode = 'abilities' | 'magic' | 'select';

export interface PaDiscountDefinition extends ValueClassicAndPercent {
  isSpecific: boolean;
  targetMode: PaDiscountTargetMode;
  categories: string[];
  mode?: 'classic' | 'percentage';
}

export interface AdminAnomalyDefinition {
  name: string;
  turns: number | null;
  durationMode?: 'turns' | 'actions';
  actionsDurationType?: 'received' | 'performed';
  decrementOnFailure?: boolean;
  description: string;
  malus: string;
  doesDamage: boolean;
  // Compat: manteniamo i vecchi campi ma non li usiamo se presenti più effetti
  damagePerTurn?: number | null;
  damageEffectId?: string | null;
  // Nuovo: set di danni multipli con garantito/aggiuntivo
  damageSets?: DamageSetRow[];
  statsModifier: StatsModifier;
  modifiesSpecifics: boolean;
  tempHealth?: number | null;
  tempActionPoints?: number | null;
  tempArmour?: number | null;
  damageBonusEnabled?: boolean;
  damageBonus?: DamageBonusDefinition;
  damageReductionEnabled?: boolean;
  damageReduction?: DamageEffectValueDefinition;
  weaknessEnabled?: boolean;
  weakness?: DamageEffectValueDefinition;
  paDiscountEnabled?: boolean;
  paDiscount?: PaDiscountDefinition;
}

interface AnomalyAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (def: AdminAnomalyDefinition) => void;
  initialDef?: AdminAnomalyDefinition | null;
  saveLabel?: string;
}

export const AnomalyAdminModal = ({ isOpen, onClose, onSave, initialDef, saveLabel = 'Salva' }: AnomalyAdminModalProps) => {
  const [name, setName] = useState('');
  const [turns, setTurns] = useState<string>('');
  const [description, setDescription] = useState('');
  const [malus, setMalus] = useState('');
  const [durationMode, setDurationMode] = useState<'turns' | 'actions'>('turns');
  const [actionsDurationType, setActionsDurationType] = useState<'received' | 'performed'>('received');
  const [decrementOnFailure, setDecrementOnFailure] = useState(false);

  const [doesDamage, setDoesDamage] = useState(false);
  const [damageSets, setDamageSets] = useState<DamageSetRow[]>([]);
  const [damageEffectOptions, setDamageEffectOptions] = useState<{ id: string; name: string }[]>([]);
  const [damageEffectLoading, setDamageEffectLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchDamageEffects = async () => {
      setDamageEffectLoading(true);
      try {
        const effects = await listDamageEffects();
        const mapped = Array.isArray(effects) ? effects.map((e: any) => ({ id: e.id, name: e.name })) : [];
        if (active) {
          setDamageEffectOptions(mapped);
        }
      } catch (error) {
        console.error('Error loading damage effects', error);
      } finally {
        if (active) setDamageEffectLoading(false);
      }
    };
    fetchDamageEffects();
    return () => {
      active = false;
    };
  }, []);

  const [modifiesStats, setModifiesStats] = useState(false);
  const [statsModifier, setStatsModifier] = useState<StatsModifier>({
    forza: 0,
    percezione: 0,
    resistenza: 0,
    intelletto: 0,
    agilita: 0,
    sapienza: 0,
    anima: 0,
  });

  const [modifiesSpecifics, setModifiesSpecifics] = useState(false);
  const [tempHealth, setTempHealth] = useState<string>('');
  const [tempActionPoints, setTempActionPoints] = useState<string>('');
  const [tempArmour, setTempArmour] = useState<string>('');

  const [damageBonusEnabled, setDamageBonusEnabled] = useState(false);
  const [damageBonusIsSpecific, setDamageBonusIsSpecific] = useState(false);
  const [damageBonusApplyToEquipment, setDamageBonusApplyToEquipment] = useState(true);
  const [damageBonusMode, setDamageBonusMode] = useState<'classic' | 'percentage'>('classic');
  const [damageBonusEffectIds, setDamageBonusEffectIds] = useState<string[]>([]);
  const [damageBonusClassicGuaranteed, setDamageBonusClassicGuaranteed] = useState<string>('');
  const [damageBonusClassicAdditional, setDamageBonusClassicAdditional] = useState<string>('');
  const [damageBonusPercentageGuaranteed, setDamageBonusPercentageGuaranteed] = useState<string>('');
  const [damageBonusPercentageAdditional, setDamageBonusPercentageAdditional] = useState<string>('');

  const [damageReductionEnabled, setDamageReductionEnabled] = useState(false);
  const [damageReductionIsSpecific, setDamageReductionIsSpecific] = useState(false);
  const [damageReductionMode, setDamageReductionMode] = useState<'classic' | 'percentage'>('classic');
  const [damageReductionEffectIds, setDamageReductionEffectIds] = useState<string[]>([]);
  const [damageReductionClassicGuaranteed, setDamageReductionClassicGuaranteed] = useState<string>('');
  const [damageReductionClassicAdditional, setDamageReductionClassicAdditional] = useState<string>('');
  const [damageReductionPercentageGuaranteed, setDamageReductionPercentageGuaranteed] = useState<string>('');
  const [damageReductionPercentageAdditional, setDamageReductionPercentageAdditional] = useState<string>('');

  const [weaknessEnabled, setWeaknessEnabled] = useState(false);
  const [weaknessIsSpecific, setWeaknessIsSpecific] = useState(false);
  const [weaknessMode, setWeaknessMode] = useState<'classic' | 'percentage'>('classic');
  const [weaknessEffectIds, setWeaknessEffectIds] = useState<string[]>([]);
  const [weaknessClassicGuaranteed, setWeaknessClassicGuaranteed] = useState<string>('');
  const [weaknessClassicAdditional, setWeaknessClassicAdditional] = useState<string>('');
  const [weaknessPercentageGuaranteed, setWeaknessPercentageGuaranteed] = useState<string>('');
  const [weaknessPercentageAdditional, setWeaknessPercentageAdditional] = useState<string>('');

  const [paDiscountEnabled, setPaDiscountEnabled] = useState(false);
  const [paDiscountIsSpecific, setPaDiscountIsSpecific] = useState(false);
  const [paDiscountTargetMode, setPaDiscountTargetMode] = useState<PaDiscountTargetMode>('abilities');
  const [paDiscountCategories, setPaDiscountCategories] = useState<string[]>([]);
  const [paDiscountMode, setPaDiscountMode] = useState<'classic' | 'percentage'>('classic');
  const [paDiscountClassicGuaranteed, setPaDiscountClassicGuaranteed] = useState<string>('');
  const [paDiscountClassicAdditional, setPaDiscountClassicAdditional] = useState<string>('');
  const [paDiscountPercentageGuaranteed, setPaDiscountPercentageGuaranteed] = useState<string>('');
  const [paDiscountPercentageAdditional, setPaDiscountPercentageAdditional] = useState<string>('');

  const paCategoryOptions = useMemo(() => {
    const out: Array<{ value: string; label: string }> = [];

    const magicSectionKeys = Object.keys(MAGIC_SECTIONS || {});
    for (const sectionKey of magicSectionKeys) {
      out.push({ value: `magic:section:${sectionKey}`, label: `Magie — ${sectionKey} (tutte)` });
    }

    for (const sectionKey of magicSectionKeys) {
      const section = (MAGIC_SECTIONS as any)?.[sectionKey];
      const categories = section?.categories || {};
      const categoryKeys = Object.keys(categories);
      for (const categoryKey of categoryKeys) {
        const catName = categories?.[categoryKey]?.name || categoryKey;
        for (const grade of (MAGIC_GRADES as any)) {
          out.push({
            value: `magic:category:${sectionKey}:${categoryKey}:${grade}`,
            label: `Magie — ${catName} ${grade} (${sectionKey})`,
          });
        }
      }
    }

    const abilitySectionKeys = Object.keys(ABILITY_SECTIONS || {});
    for (const sectionKey of abilitySectionKeys) {
      const section = (ABILITY_SECTIONS as any)?.[sectionKey];
      const categories = section?.categories || {};
      const categoryKeys = Object.keys(categories);
      for (const categoryKey of categoryKeys) {
        const catName = categories?.[categoryKey]?.name || categoryKey;
        for (const grade of (ABILITY_GRADES as any)) {
          out.push({
            value: `ability:category:${categoryKey}:${grade}`,
            label: `Abilità — ${catName} ${grade}`,
          });
        }
      }
    }

    return out;
  }, []);

  // Rimosso: cura per turno

  const resetAll = () => {
    setName(''); setTurns(''); setDescription(''); setMalus('');
    setDurationMode('turns'); setActionsDurationType('received'); setDecrementOnFailure(false);
    setDoesDamage(false); setDamageSets([]);
    setModifiesStats(false);
    setStatsModifier({ forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 });
    setModifiesSpecifics(false); setTempHealth(''); setTempActionPoints(''); setTempArmour('');
    setDamageBonusEnabled(false);
    setDamageBonusIsSpecific(false);
    setDamageBonusApplyToEquipment(true);
    setDamageBonusEffectIds([]);
    setDamageBonusMode('classic');
    setDamageBonusClassicGuaranteed('');
    setDamageBonusClassicAdditional('');
    setDamageBonusPercentageGuaranteed('');
    setDamageBonusPercentageAdditional('');
    setDamageReductionEnabled(false);
    setDamageReductionIsSpecific(false);
    setDamageReductionMode('classic');
    setDamageReductionEffectIds([]);
    setDamageReductionClassicGuaranteed('');
    setDamageReductionClassicAdditional('');
    setDamageReductionPercentageGuaranteed('');
    setDamageReductionPercentageAdditional('');
    setWeaknessEnabled(false);
    setWeaknessIsSpecific(false);
    setWeaknessMode('classic');
    setWeaknessEffectIds([]);
    setWeaknessClassicGuaranteed('');
    setWeaknessClassicAdditional('');
    setWeaknessPercentageGuaranteed('');
    setWeaknessPercentageAdditional('');
    setPaDiscountEnabled(false);
    setPaDiscountIsSpecific(false);
    setPaDiscountTargetMode('abilities');
    setPaDiscountCategories([]);
    setPaDiscountMode('classic');
    setPaDiscountClassicGuaranteed('');
    setPaDiscountClassicAdditional('');
    setPaDiscountPercentageGuaranteed('');
    setPaDiscountPercentageAdditional('');
  };

  useEffect(() => {
    const toStr = (value: any) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n === 0) return '';
      return String(n);
    };

    if (!isOpen) {
      resetAll();
      return;
    }

    if (!initialDef) {
      resetAll();
      return;
    }

    setName(String(initialDef.name ?? ''));
    setTurns(initialDef.turns === null || initialDef.turns === undefined ? '' : String(Number(initialDef.turns) || 0));
    setDescription(String(initialDef.description ?? ''));
    setMalus(String(initialDef.malus ?? ''));
    setDurationMode((initialDef.durationMode === 'actions' || initialDef.durationMode === 'turns') ? initialDef.durationMode : 'turns');
    setActionsDurationType((initialDef.actionsDurationType === 'performed' || initialDef.actionsDurationType === 'received') ? initialDef.actionsDurationType : 'received');
    setDecrementOnFailure(!!initialDef.decrementOnFailure);

    setDoesDamage(!!initialDef.doesDamage || (Array.isArray(initialDef.damageSets) && initialDef.damageSets.length > 0));
    setDamageSets(
      Array.isArray(initialDef.damageSets)
        ? initialDef.damageSets.map((r: any) => ({
            damageEffectId: String(r?.damageEffectId ?? r?.damage_effect_id ?? ''),
            guaranteedDamage: Number(r?.guaranteedDamage ?? r?.guaranteed_damage ?? 0) || 0,
            additionalDamage: Number(r?.additionalDamage ?? r?.additional_damage ?? 0) || 0,
          }))
        : [],
    );

    const baseStats: StatsModifier = {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0,
    };
    const loadedStats = (initialDef as any)?.statsModifier;
    const mergedStats: StatsModifier = {
      ...baseStats,
      ...(typeof loadedStats === 'object' && loadedStats ? loadedStats : {}),
    };
    setStatsModifier(mergedStats);
    setModifiesStats(Object.values(mergedStats).some((v) => (Number(v) || 0) !== 0));

    const inferredModifiesSpecifics =
      !!initialDef.modifiesSpecifics ||
      initialDef.tempHealth !== null && initialDef.tempHealth !== undefined ||
      initialDef.tempActionPoints !== null && initialDef.tempActionPoints !== undefined ||
      initialDef.tempArmour !== null && initialDef.tempArmour !== undefined;
    setModifiesSpecifics(inferredModifiesSpecifics);
    setTempHealth(initialDef.tempHealth === null || initialDef.tempHealth === undefined ? '' : String(Number(initialDef.tempHealth) || 0));
    setTempActionPoints(
      initialDef.tempActionPoints === null || initialDef.tempActionPoints === undefined ? '' : String(Number(initialDef.tempActionPoints) || 0),
    );
    setTempArmour(initialDef.tempArmour === null || initialDef.tempArmour === undefined ? '' : String(Number(initialDef.tempArmour) || 0));

    const db = initialDef.damageBonus;
    setDamageBonusEnabled(!!initialDef.damageBonusEnabled || !!db);
    setDamageBonusIsSpecific(!!db?.isSpecific);
    setDamageBonusApplyToEquipment(db?.applyToEquipment ?? true);
    setDamageBonusMode((db?.mode as any) ?? 'classic');
    setDamageBonusEffectIds(Array.isArray(db?.damageEffectIds) ? db.damageEffectIds.map((x: any) => String(x)) : []);
    setDamageBonusClassicGuaranteed(toStr(db?.classicGuaranteed));
    setDamageBonusClassicAdditional(toStr(db?.classicAdditional));
    setDamageBonusPercentageGuaranteed(toStr(db?.percentageGuaranteed));
    setDamageBonusPercentageAdditional(toStr(db?.percentageAdditional));

    const dr = initialDef.damageReduction;
    setDamageReductionEnabled(!!initialDef.damageReductionEnabled || !!dr);
    setDamageReductionIsSpecific(!!dr?.isSpecific);
    setDamageReductionMode((dr?.mode as any) ?? 'classic');
    setDamageReductionEffectIds(Array.isArray(dr?.damageEffectIds) ? dr.damageEffectIds.map((x: any) => String(x)) : []);
    setDamageReductionClassicGuaranteed(toStr(dr?.classicGuaranteed));
    setDamageReductionClassicAdditional(toStr(dr?.classicAdditional));
    setDamageReductionPercentageGuaranteed(toStr(dr?.percentageGuaranteed));
    setDamageReductionPercentageAdditional(toStr(dr?.percentageAdditional));

    const wk = initialDef.weakness;
    setWeaknessEnabled(!!initialDef.weaknessEnabled || !!wk);
    setWeaknessIsSpecific(!!wk?.isSpecific);
    setWeaknessMode((wk?.mode as any) ?? 'classic');
    setWeaknessEffectIds(Array.isArray(wk?.damageEffectIds) ? wk.damageEffectIds.map((x: any) => String(x)) : []);
    setWeaknessClassicGuaranteed(toStr(wk?.classicGuaranteed));
    setWeaknessClassicAdditional(toStr(wk?.classicAdditional));
    setWeaknessPercentageGuaranteed(toStr(wk?.percentageGuaranteed));
    setWeaknessPercentageAdditional(toStr(wk?.percentageAdditional));

    const pa = initialDef.paDiscount;
    setPaDiscountEnabled(!!initialDef.paDiscountEnabled || !!pa);
    setPaDiscountIsSpecific(!!pa?.isSpecific);
    setPaDiscountTargetMode((pa?.targetMode as any) ?? 'abilities');
    setPaDiscountCategories(Array.isArray(pa?.categories) ? pa.categories.map((x: any) => String(x)) : []);
    setPaDiscountMode((pa?.mode as any) ?? 'classic');
    setPaDiscountClassicGuaranteed(toStr(pa?.classicGuaranteed));
    setPaDiscountClassicAdditional(toStr(pa?.classicAdditional));
    setPaDiscountPercentageGuaranteed(toStr(pa?.percentageGuaranteed));
    setPaDiscountPercentageAdditional(toStr(pa?.percentageAdditional));
  }, [isOpen, initialDef]);

  const handleSave = () => {
    const def: AdminAnomalyDefinition = {
      name: name.trim(),
      turns: turns === '' ? null : Number(turns) || 0,
      durationMode,
      actionsDurationType: durationMode === 'actions' ? actionsDurationType : undefined,
      decrementOnFailure: durationMode === 'actions' ? decrementOnFailure : undefined,
      description: description.trim(),
      malus: malus.trim(),
      doesDamage,
      // Se attivi danni, salviamo set multipli (garantito/aggiuntivo) per ciascun effetto
      damageSets: doesDamage ? damageSets.map(s => ({
        damageEffectId: s.damageEffectId,
        guaranteedDamage: Number(s.guaranteedDamage) || 0,
        additionalDamage: Number(s.additionalDamage) || 0,
      })) : [],
      statsModifier: statsModifier,
      modifiesSpecifics,
      tempHealth: modifiesSpecifics ? (tempHealth === '' ? null : Number(tempHealth) || 0) : undefined,
      tempActionPoints: modifiesSpecifics ? (tempActionPoints === '' ? null : Number(tempActionPoints) || 0) : undefined,
      tempArmour: modifiesSpecifics ? (tempArmour === '' ? null : Number(tempArmour) || 0) : undefined,
      damageBonusEnabled,
      damageBonus: damageBonusEnabled ? {
        isSpecific: damageBonusIsSpecific,
        applyToEquipment: damageBonusApplyToEquipment,
        mode: damageBonusMode,
        damageEffectIds: damageBonusIsSpecific ? damageBonusEffectIds : [],
        damageEffectNames: damageBonusIsSpecific
          ? damageBonusEffectIds
              .map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name || '')
              .filter((n) => !!String(n || '').trim())
          : [],
        classicGuaranteed: damageBonusClassicGuaranteed === '' ? 0 : Number(damageBonusClassicGuaranteed) || 0,
        classicAdditional: damageBonusClassicAdditional === '' ? 0 : Number(damageBonusClassicAdditional) || 0,
        percentageGuaranteed: damageBonusPercentageGuaranteed === '' ? 0 : Number(damageBonusPercentageGuaranteed) || 0,
        percentageAdditional: damageBonusPercentageAdditional === '' ? 0 : Number(damageBonusPercentageAdditional) || 0,
      } : undefined,
      damageReductionEnabled,
      damageReduction: damageReductionEnabled ? {
        isSpecific: damageReductionIsSpecific,
        mode: damageReductionMode,
        damageEffectIds: damageReductionIsSpecific ? damageReductionEffectIds : [],
        damageEffectNames: damageReductionIsSpecific
          ? damageReductionEffectIds
              .map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name || '')
              .filter((n) => !!String(n || '').trim())
          : [],
        classicGuaranteed: damageReductionClassicGuaranteed === '' ? 0 : Number(damageReductionClassicGuaranteed) || 0,
        classicAdditional: damageReductionClassicAdditional === '' ? 0 : Number(damageReductionClassicAdditional) || 0,
        percentageGuaranteed: damageReductionPercentageGuaranteed === '' ? 0 : Number(damageReductionPercentageGuaranteed) || 0,
        percentageAdditional: damageReductionPercentageAdditional === '' ? 0 : Number(damageReductionPercentageAdditional) || 0,
      } : undefined,
      weaknessEnabled,
      weakness: weaknessEnabled ? {
        isSpecific: weaknessIsSpecific,
        mode: weaknessMode,
        damageEffectIds: weaknessIsSpecific ? weaknessEffectIds : [],
        damageEffectNames: weaknessIsSpecific
          ? weaknessEffectIds
              .map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name || '')
              .filter((n) => !!String(n || '').trim())
          : [],
        classicGuaranteed: weaknessClassicGuaranteed === '' ? 0 : Number(weaknessClassicGuaranteed) || 0,
        classicAdditional: weaknessClassicAdditional === '' ? 0 : Number(weaknessClassicAdditional) || 0,
        percentageGuaranteed: weaknessPercentageGuaranteed === '' ? 0 : Number(weaknessPercentageGuaranteed) || 0,
        percentageAdditional: weaknessPercentageAdditional === '' ? 0 : Number(weaknessPercentageAdditional) || 0,
      } : undefined,
      paDiscountEnabled,
      paDiscount: paDiscountEnabled ? {
        isSpecific: paDiscountIsSpecific,
        targetMode: paDiscountIsSpecific ? paDiscountTargetMode : 'abilities',
        categories: (paDiscountIsSpecific && paDiscountTargetMode === 'select') ? paDiscountCategories : [],
        mode: paDiscountMode,
        classicGuaranteed: paDiscountClassicGuaranteed === '' ? 0 : Number(paDiscountClassicGuaranteed) || 0,
        classicAdditional: paDiscountClassicAdditional === '' ? 0 : Number(paDiscountClassicAdditional) || 0,
        percentageGuaranteed: paDiscountPercentageGuaranteed === '' ? 0 : Number(paDiscountPercentageGuaranteed) || 0,
        percentageAdditional: paDiscountPercentageAdditional === '' ? 0 : Number(paDiscountPercentageAdditional) || 0,
      } : undefined,
    };
    onSave(def);
    resetAll();
  };
  const handleStatChange = (stat: keyof StatsModifier, value: string) => {
    setStatsModifier(prev => ({
      ...prev,
      [stat]: value === '' ? 0 : (Number(value) || 0)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestione Anomalie</DialogTitle>
          <DialogDescription>
            Allinea i campi alla modale classica: nome, durata, descrizione, modificatori e danni per turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome anomalia</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
          </div>

          {/* Durata (turni) */}
          <div>
            <Label htmlFor="turns">Durata ({durationMode === 'actions' ? 'azioni' : 'turni'})</Label>
            <Input id="turns" type="number" value={turns} onChange={(e) => setTurns(e.target.value)} placeholder="Facoltativo" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="durationMode">Modo durata</Label>
            <Select value={durationMode} onValueChange={(v) => setDurationMode(v as any)}>
              <SelectTrigger id="durationMode">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="turns">Durata turni</SelectItem>
                <SelectItem value="actions">Durata azioni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {durationMode === 'actions' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="actionsDurationType">Tipo durata azioni</Label>
                <Select value={actionsDurationType} onValueChange={(v) => setActionsDurationType(v as any)}>
                  <SelectTrigger id="actionsDurationType">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Durata azioni subite</SelectItem>
                    <SelectItem value="performed">Durata azioni eseguite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Scalo anche in caso di fallimento</Label>
                  <p className="text-xs text-muted-foreground">Se attivo, scala anche se l'azione non riesce.</p>
                </div>
                <Switch checked={decrementOnFailure} onCheckedChange={(checked) => setDecrementOnFailure(checked)} />
              </div>
            </div>
          )}

          {/* Descrizione */}
          <div>
            <Label htmlFor="desc">Descrizione</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione dettagliata" />
          </div>

          {/* Malus testuale (facoltativo) */}
          <div>
            <Label htmlFor="malus">Malus (testo)</Label>
            <Textarea id="malus" value={malus} onChange={(e) => setMalus(e.target.value)} placeholder="Eventuali malus testuali" />
          </div>

          {/* Danno per turno: switch + effetti multipli */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Danno per turno?</Label>
                <p className="text-xs text-muted-foreground">Se attivo, seleziona uno o più effetti e compila danno assicurato/aggiuntivo.</p>
              </div>
              <Switch checked={doesDamage} onCheckedChange={(checked) => setDoesDamage(checked)} />
            </div>

            {doesDamage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Effetti di danno (per turno) — multipli</Label>
                  <Button variant="secondary" size="sm" onClick={() => setDamageSets(prev => [...prev, { damageEffectId: '', guaranteedDamage: 0, additionalDamage: 0 }])}>Aggiungi effetto</Button>
                </div>
                {damageSets.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nessun effetto aggiunto. Usa "Aggiungi effetto" per inserire un tipo di danno.</p>
                )}
                {damageSets.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <Label>Tipo di danno</Label>
                      <Select
                        value={row.damageEffectId}
                        onValueChange={(val) => setDamageSets(prev => prev.map((r, i) => i === idx ? { ...r, damageEffectId: val } : r))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Seleziona effetto'} />
                        </SelectTrigger>
                        <SelectContent>
                          {damageEffectOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Label>Danno assicurato</Label>
                      <Input type="number" min="0" value={row.guaranteedDamage}
                        onChange={(e) => setDamageSets(prev => prev.map((r, i) => i === idx ? { ...r, guaranteedDamage: Number(e.target.value) || 0 } : r))}
                        placeholder="0" />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Label>Danno aggiuntivo</Label>
                      <Input type="number" min="0" value={row.additionalDamage}
                        onChange={(e) => setDamageSets(prev => prev.map((r, i) => i === idx ? { ...r, additionalDamage: Number(e.target.value) || 0 } : r))}
                        placeholder="0" />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end">
                      <Button variant="ghost" onClick={() => setDamageSets(prev => prev.filter((_, i) => i !== idx))} className="w-full">Rimuovi</Button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Suggerimento: usa più effetti per comporre danni di natura diversa.</p>
              </div>
            )}
          </div>

          {/* Incremento bonus danni */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Incremento bonus danni?</Label>
                <p className="text-xs text-muted-foreground">Supporta valore classico e percentuale (assicurato e aggiuntivo).</p>
              </div>
              <Switch checked={damageBonusEnabled} onCheckedChange={(checked) => setDamageBonusEnabled(checked)} />
            </div>

            {damageBonusEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Generico / specifico</Label>
                    <p className="text-xs text-muted-foreground">{damageBonusIsSpecific ? 'Specifico: seleziona uno o più damage effect' : 'Generico: influenza tutti i danni'}</p>
                  </div>
                  <Switch checked={damageBonusIsSpecific} onCheckedChange={(checked) => {
                    setDamageBonusIsSpecific(checked);
                    if (!checked) setDamageBonusEffectIds([]);
                  }} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Applica a equipaggiamento</Label>
                    <p className="text-xs text-muted-foreground">Se disattivo, influenza solo abilità e magie.</p>
                  </div>
                  <Switch checked={damageBonusApplyToEquipment} onCheckedChange={(checked) => setDamageBonusApplyToEquipment(checked)} />
                </div>

                <div className="space-y-2">
                  <Label>Tipo incremento</Label>
                  <Select value={damageBonusMode} onValueChange={(v) => setDamageBonusMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {damageBonusIsSpecific && (
                  <div className="space-y-2">
                    <Label>Damage effect influenzati</Label>
                    <Select
                      value={''}
                      onValueChange={(value) => {
                        if (!value) return;
                        setDamageBonusEffectIds(prev => (prev.includes(value) ? prev : [...prev, value]));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Aggiungi damage effect'} />
                      </SelectTrigger>
                      <SelectContent>
                        {damageEffectOptions.map(opt => (
                          <SelectItem key={`db:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {damageBonusEffectIds.map((id) => {
                        const name =
                          damageEffectOptions.find(o => String(o.id) === String(id))?.name
                          ?? (damageEffectLoading ? 'Caricamento...' : 'Effetto sconosciuto');
                        return (
                          <Button
                            key={`dbsel:${id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDamageBonusEffectIds(prev => prev.filter(x => x !== id))}
                          >
                            {name}
                          </Button>
                        );
                      })}
                      {damageBonusEffectIds.length === 0 && (
                        <div className="text-xs text-muted-foreground">Nessun damage effect selezionato</div>
                      )}
                    </div>
                  </div>
                )}

                {damageBonusMode === 'classic' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore classico</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={damageBonusClassicGuaranteed} onChange={(e) => setDamageBonusClassicGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={damageBonusClassicAdditional} onChange={(e) => setDamageBonusClassicAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore percentuale</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={damageBonusPercentageGuaranteed} onChange={(e) => setDamageBonusPercentageGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={damageBonusPercentageAdditional} onChange={(e) => setDamageBonusPercentageAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Riduzione danni?</Label>
                <p className="text-xs text-muted-foreground">Generico/specifico, classico o percentuale (assicurato e aggiuntivo).</p>
              </div>
              <Switch checked={damageReductionEnabled} onCheckedChange={(checked) => setDamageReductionEnabled(checked)} />
            </div>

            {damageReductionEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Generico / specifico</Label>
                    <p className="text-xs text-muted-foreground">
                      {damageReductionIsSpecific ? 'Specifico: seleziona uno o più damage effect' : 'Generico: vale per tutti i damage effect'}
                    </p>
                  </div>
                  <Switch
                    checked={damageReductionIsSpecific}
                    onCheckedChange={(checked) => {
                      setDamageReductionIsSpecific(checked);
                      if (!checked) setDamageReductionEffectIds([]);
                    }}
                  />
                </div>

                {damageReductionIsSpecific && (
                  <div className="space-y-2">
                    <Label>Damage effect</Label>
                    <Select
                      value={''}
                      onValueChange={(value) => {
                        if (!value) return;
                        setDamageReductionEffectIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Aggiungi damage effect'} />
                      </SelectTrigger>
                      <SelectContent>
                        {damageEffectOptions.map((opt) => (
                          <SelectItem key={`dr:${opt.id}`} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {damageReductionEffectIds.map((id) => {
                        const name =
                          damageEffectOptions.find((o) => String(o.id) === String(id))?.name ??
                          (damageEffectLoading ? 'Caricamento...' : 'Effetto sconosciuto');
                        return (
                          <Button
                            key={`drsel:${id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDamageReductionEffectIds((prev) => prev.filter((x) => x !== id))}
                          >
                            {name}
                          </Button>
                        );
                      })}
                      {damageReductionEffectIds.length === 0 && (
                        <div className="text-xs text-muted-foreground">Nessun damage effect selezionato</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo riduzione</Label>
                  <Select value={damageReductionMode} onValueChange={(v) => setDamageReductionMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {damageReductionMode === 'classic' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore classico</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input
                        type="number"
                        value={damageReductionClassicGuaranteed}
                        onChange={(e) => setDamageReductionClassicGuaranteed(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input
                        type="number"
                        value={damageReductionClassicAdditional}
                        onChange={(e) => setDamageReductionClassicAdditional(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore percentuale</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input
                        type="number"
                        value={damageReductionPercentageGuaranteed}
                        onChange={(e) => setDamageReductionPercentageGuaranteed(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input
                        type="number"
                        value={damageReductionPercentageAdditional}
                        onChange={(e) => setDamageReductionPercentageAdditional(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Debolezza?</Label>
                <p className="text-xs text-muted-foreground">Generico/specifico, classico o percentuale (assicurato e aggiuntivo).</p>
              </div>
              <Switch checked={weaknessEnabled} onCheckedChange={(checked) => setWeaknessEnabled(checked)} />
            </div>

            {weaknessEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Generico / specifico</Label>
                    <p className="text-xs text-muted-foreground">
                      {weaknessIsSpecific ? 'Specifico: seleziona uno o più damage effect' : 'Generico: vale per tutti i damage effect'}
                    </p>
                  </div>
                  <Switch
                    checked={weaknessIsSpecific}
                    onCheckedChange={(checked) => {
                      setWeaknessIsSpecific(checked);
                      if (!checked) setWeaknessEffectIds([]);
                    }}
                  />
                </div>

                {weaknessIsSpecific && (
                  <div className="space-y-2">
                    <Label>Damage effect</Label>
                    <Select
                      value={''}
                      onValueChange={(value) => {
                        if (!value) return;
                        setWeaknessEffectIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={damageEffectLoading ? 'Caricamento...' : 'Aggiungi damage effect'} />
                      </SelectTrigger>
                      <SelectContent>
                        {damageEffectOptions.map((opt) => (
                          <SelectItem key={`wk:${opt.id}`} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {weaknessEffectIds.map((id) => {
                        const name =
                          damageEffectOptions.find((o) => String(o.id) === String(id))?.name ??
                          (damageEffectLoading ? 'Caricamento...' : 'Effetto sconosciuto');
                        return (
                          <Button
                            key={`wksel:${id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setWeaknessEffectIds((prev) => prev.filter((x) => x !== id))}
                          >
                            {name}
                          </Button>
                        );
                      })}
                      {weaknessEffectIds.length === 0 && (
                        <div className="text-xs text-muted-foreground">Nessun damage effect selezionato</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo debolezza</Label>
                  <Select value={weaknessMode} onValueChange={(v) => setWeaknessMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {weaknessMode === 'classic' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore classico</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input
                        type="number"
                        value={weaknessClassicGuaranteed}
                        onChange={(e) => setWeaknessClassicGuaranteed(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input
                        type="number"
                        value={weaknessClassicAdditional}
                        onChange={(e) => setWeaknessClassicAdditional(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore percentuale</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input
                        type="number"
                        value={weaknessPercentageGuaranteed}
                        onChange={(e) => setWeaknessPercentageGuaranteed(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input
                        type="number"
                        value={weaknessPercentageAdditional}
                        onChange={(e) => setWeaknessPercentageAdditional(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sconto PA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Sconto PA?</Label>
                <p className="text-xs text-muted-foreground">Supporta valore classico e percentuale (assicurato e aggiuntivo).</p>
              </div>
              <Switch checked={paDiscountEnabled} onCheckedChange={(checked) => setPaDiscountEnabled(checked)} />
            </div>

            {paDiscountEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Generico / specifico</Label>
                    <p className="text-xs text-muted-foreground">{paDiscountIsSpecific ? 'Specifico: scegli Abilità, Magie o Seleziona categorie' : 'Generico: coinvolge tutte le magie e le abilità'}</p>
                  </div>
                  <Switch checked={paDiscountIsSpecific} onCheckedChange={(checked) => {
                    setPaDiscountIsSpecific(checked);
                    if (!checked) {
                      setPaDiscountTargetMode('abilities');
                      setPaDiscountCategories([]);
                    }
                  }} />
                </div>

                {paDiscountIsSpecific && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                      <div>
                        <Label>Target</Label>
                        <Select value={paDiscountTargetMode} onValueChange={(v) => {
                          setPaDiscountTargetMode(v as PaDiscountTargetMode);
                          if (v !== 'select') setPaDiscountCategories([]);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abilities">Abilità</SelectItem>
                            <SelectItem value="magic">Magie</SelectItem>
                            <SelectItem value="select">Seleziona</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {paDiscountTargetMode === 'select' && (
                        <div className="md:col-span-2 space-y-2">
                          <Label>Categorie selezionate</Label>
                          <Select
                            value={''}
                            onValueChange={(value) => {
                              if (!value) return;
                              setPaDiscountCategories(prev => (prev.includes(value) ? prev : [...prev, value]));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Aggiungi categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {paCategoryOptions.map((opt) => (
                                <SelectItem key={`pac:${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex flex-wrap gap-2">
                            {paDiscountCategories.map((v) => {
                              const label = paCategoryOptions.find(o => o.value === v)?.label || v;
                              return (
                                <Button
                                  key={`pacc:${v}`}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPaDiscountCategories(prev => prev.filter(x => x !== v))}
                                >
                                  {label}
                                </Button>
                              );
                            })}
                            {paDiscountCategories.length === 0 && (
                              <div className="text-xs text-muted-foreground">Nessuna categoria selezionata</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo sconto</Label>
                  <Select value={paDiscountMode} onValueChange={(v) => setPaDiscountMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paDiscountMode === 'classic' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore classico</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={paDiscountClassicGuaranteed} onChange={(e) => setPaDiscountClassicGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={paDiscountClassicAdditional} onChange={(e) => setPaDiscountClassicAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore percentuale</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={paDiscountPercentageGuaranteed} onChange={(e) => setPaDiscountPercentageGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={paDiscountPercentageAdditional} onChange={(e) => setPaDiscountPercentageAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statistiche (allineate alla modale classica) */}
          <div>
            <Label>Statistiche</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(statsModifier).map(([stat, value]) => (
                <div key={stat}>
                  <Label htmlFor={stat} className="text-sm capitalize">
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </Label>
                  <Input
                    id={stat}
                    type="number"
                    value={value}
                    onChange={(e) => handleStatChange(stat as keyof StatsModifier, e.target.value)}
                    placeholder="Può essere negativo"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Usa valori negativi per penalità</p>
          </div>

          {/* Modifica temporanea specifiche */}
          <div className="flex items-center justify-between">
            <Label className="flex-1">Modifica temporaneamente Specifiche?</Label>
            <Switch checked={modifiesSpecifics} onCheckedChange={setModifiesSpecifics} />
          </div>
          {modifiesSpecifics && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="th">Salute</Label>
                <Input id="th" type="number" value={tempHealth} onChange={(e) => setTempHealth(e.target.value)} placeholder="Può essere negativo" />
              </div>
              <div>
                <Label htmlFor="tap">Punti Azione</Label>
                <Input id="tap" type="number" value={tempActionPoints} onChange={(e) => setTempActionPoints(e.target.value)} placeholder="Può essere negativo" />
              </div>
              <div>
                <Label htmlFor="ta">Armatura</Label>
                <Input id="ta" type="number" value={tempArmour} onChange={(e) => setTempArmour(e.target.value)} placeholder="Può essere negativo" />
              </div>
            </div>
          )}

          {/* Rimosso: sezione Cura */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetAll(); onClose(); }}>Annulla</Button>
          <Button onClick={handleSave}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
