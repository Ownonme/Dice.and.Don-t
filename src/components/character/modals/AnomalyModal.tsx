import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { supabase } from '@/integrations/supabase/client';
import { StatusAnomaly } from '@/types/character';
import { ABILITY_GRADES, ABILITY_SECTIONS } from '@/constants/abilityConfig';
import { MAGIC_GRADES, MAGIC_SECTIONS } from '@/constants/magicConfig';

interface AnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (anomaly: StatusAnomaly) => void;
  editingAnomaly?: StatusAnomaly | null;
  readOnly?: boolean;
}

const AnomalyModal = ({ isOpen, onClose, onSave, editingAnomaly, readOnly }: AnomalyModalProps) => {
  const isReadOnly = !!readOnly;
  const [formData, setFormData] = useState<Partial<StatusAnomaly>>({
    name: '',
    description: '',
    actionPointsModifier: 0,
    healthModifier: 0,
    armorModifier: 0,
    turns: undefined,
    statsModifier: {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0,
    },
  });

  const [modifiesSpecifics, setModifiesSpecifics] = useState(false);
  const [actionDurationMode, setActionDurationMode] = useState<'turns' | 'actions'>('turns');
  const [actionDurationType, setActionDurationType] = useState<'submitted' | 'executed'>('submitted');
  const [decrementOnFailure, setDecrementOnFailure] = useState(false);

  // Danno per turno
  const [doesDamage, setDoesDamage] = useState<boolean>(false);
  const [damageSets, setDamageSets] = useState<Array<{ damageEffectId: string; guaranteedDamage: number; additionalDamage: number }>>([]);
  const [damageEffectOptions, setDamageEffectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingDamageEffects, setLoadingDamageEffects] = useState<boolean>(false);

  const [damageBonusEnabled, setDamageBonusEnabled] = useState(false);
  const [damageBonusIsSpecific, setDamageBonusIsSpecific] = useState(false);
  const [damageBonusMode, setDamageBonusMode] = useState<'classic' | 'percentage' | 'both'>('classic');
  const [damageBonusEffectIds, setDamageBonusEffectIds] = useState<string[]>([]);
  const [damageBonusClassicGuaranteed, setDamageBonusClassicGuaranteed] = useState<string>('');
  const [damageBonusClassicAdditional, setDamageBonusClassicAdditional] = useState<string>('');
  const [damageBonusPercentageGuaranteed, setDamageBonusPercentageGuaranteed] = useState<string>('');
  const [damageBonusPercentageAdditional, setDamageBonusPercentageAdditional] = useState<string>('');

  const [paDiscountEnabled, setPaDiscountEnabled] = useState(false);
  const [paDiscountIsSpecific, setPaDiscountIsSpecific] = useState(false);
  const [paDiscountTargetMode, setPaDiscountTargetMode] = useState<'abilities' | 'magic' | 'select'>('abilities');
  const [paDiscountCategories, setPaDiscountCategories] = useState<string[]>([]);
  const [paDiscountMode, setPaDiscountMode] = useState<'classic' | 'percentage' | 'both'>('classic');
  const [paDiscountClassicGuaranteed, setPaDiscountClassicGuaranteed] = useState<string>('');
  const [paDiscountClassicAdditional, setPaDiscountClassicAdditional] = useState<string>('');
  const [paDiscountPercentageGuaranteed, setPaDiscountPercentageGuaranteed] = useState<string>('');
  const [paDiscountPercentageAdditional, setPaDiscountPercentageAdditional] = useState<string>('');

  const [damageReductionEnabled, setDamageReductionEnabled] = useState(false);
  const [damageReductionIsSpecific, setDamageReductionIsSpecific] = useState(false);
  const [damageReductionMode, setDamageReductionMode] = useState<'classic' | 'percentage' | 'both'>('classic');
  const [damageReductionEffectIds, setDamageReductionEffectIds] = useState<string[]>([]);
  const [damageReductionClassicGuaranteed, setDamageReductionClassicGuaranteed] = useState<string>('');
  const [damageReductionClassicAdditional, setDamageReductionClassicAdditional] = useState<string>('');
  const [damageReductionPercentageGuaranteed, setDamageReductionPercentageGuaranteed] = useState<string>('');
  const [damageReductionPercentageAdditional, setDamageReductionPercentageAdditional] = useState<string>('');

  const [weaknessEnabled, setWeaknessEnabled] = useState(false);
  const [weaknessIsSpecific, setWeaknessIsSpecific] = useState(false);
  const [weaknessMode, setWeaknessMode] = useState<'classic' | 'percentage' | 'both'>('classic');
  const [weaknessEffectIds, setWeaknessEffectIds] = useState<string[]>([]);
  const [weaknessClassicGuaranteed, setWeaknessClassicGuaranteed] = useState<string>('');
  const [weaknessClassicAdditional, setWeaknessClassicAdditional] = useState<string>('');
  const [weaknessPercentageGuaranteed, setWeaknessPercentageGuaranteed] = useState<string>('');
  const [weaknessPercentageAdditional, setWeaknessPercentageAdditional] = useState<string>('');

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

  // Aggiungo useEffect per sincronizzare lo stato con editingAnomaly
  useEffect(() => {
    let active = true;
    if (editingAnomaly) {
      const ext = editingAnomaly as any;
      const actionPointsModifier = Number(
        ext?.actionPointsModifier ??
          ext?.action_points_modifier ??
          ext?.temp_action_points ??
          ext?.tempActionPoints ??
          0,
      ) || 0;
      const healthModifier = Number(
        ext?.healthModifier ??
          ext?.health_modifier ??
          ext?.temp_health ??
          ext?.tempHealth ??
          0,
      ) || 0;
      const armorModifier = Number(
        ext?.armorModifier ??
          ext?.armor_modifier ??
          ext?.temp_armour ??
          ext?.tempArmour ??
          0,
      ) || 0;

      const hasSpecificsFlag = ext?.modifiesSpecifics ?? ext?.modifies_specifics;
      setModifiesSpecifics(
        typeof hasSpecificsFlag === 'boolean'
          ? hasSpecificsFlag
          : actionPointsModifier !== 0 || healthModifier !== 0 || armorModifier !== 0,
      );

      setFormData({
        name: editingAnomaly.name || '',
        description: editingAnomaly.description || '',
        actionPointsModifier,
        healthModifier,
        armorModifier,
        turns: typeof editingAnomaly.turns === 'number' ? editingAnomaly.turns : undefined,
        statsModifier: editingAnomaly.statsModifier || {
          forza: 0,
          percezione: 0,
          resistenza: 0,
          intelletto: 0,
          agilita: 0,
          sapienza: 0,
          anima: 0
        }
      });

      const modeRaw =
        ext?.actionDurationMode ??
        ext?.action_duration_mode ??
        ext?.durationMode ??
        ext?.duration_mode ??
        ext?.stats?.action_duration_mode ??
        ext?.stats?.duration_mode ??
        null;
      setActionDurationMode(modeRaw === 'actions' ? 'actions' : 'turns');

      const typeRaw =
        ext?.actionDurationType ??
        ext?.action_duration_type ??
        ext?.actionsDurationType ??
        ext?.actions_duration_type ??
        ext?.stats?.action_duration_type ??
        ext?.stats?.actions_duration_type ??
        null;
      const normalizedType =
        typeRaw === 'executed' || typeRaw === 'performed'
          ? 'executed'
          : typeRaw === 'submitted' || typeRaw === 'received'
            ? 'submitted'
            : null;
      setActionDurationType(normalizedType === 'executed' ? 'executed' : 'submitted');

      const decRaw =
        ext?.decrementOnFailure ??
        ext?.decrement_on_failure ??
        ext?.stats?.decrement_on_failure ??
        ext?.stats?.decrementOnFailure ??
        null;
      setDecrementOnFailure(!!decRaw);

      const nameToLookup = String(editingAnomaly?.name || '').trim();
      const currentStatsModifier = (ext?.statsModifier ?? ext?.stats_modifier) as any;
      const hasStatsModifierNonZero =
        !!currentStatsModifier &&
        typeof currentStatsModifier === 'object' &&
        Object.values(currentStatsModifier).some((v) => (Number(v ?? 0) || 0) !== 0);

      const hasAnyExtraConfig =
        !!(ext?.doesDamage ?? ext?.does_damage) ||
        (Array.isArray(ext?.damageSets) && ext.damageSets.length > 0) ||
        (Array.isArray(ext?.damage_sets) && ext.damage_sets.length > 0) ||
        (Array.isArray(ext?.stats?.damage_sets) && ext.stats.damage_sets.length > 0) ||
        !!(ext?.damageBonusEnabled ?? ext?.damage_bonus_enabled) ||
        !!(ext?.damageBonus ?? ext?.damage_bonus) ||
        !!(ext?.damageReductionEnabled ?? ext?.damage_reduction_enabled) ||
        !!(ext?.damageReduction ?? ext?.damage_reduction) ||
        !!(ext?.weaknessEnabled ?? ext?.weakness_enabled) ||
        !!(ext?.weakness ?? ext?.weakness_config) ||
        !!(ext?.paDiscountEnabled ?? ext?.pa_discount_enabled) ||
        !!(ext?.paDiscount ?? ext?.pa_discount);

      const shouldBackfillFromDefinition =
        actionPointsModifier === 0 &&
        healthModifier === 0 &&
        armorModifier === 0 &&
        !hasStatsModifierNonZero &&
        !hasAnyExtraConfig &&
        String(editingAnomaly?.description || '').trim().length === 0 &&
        typeof editingAnomaly?.turns !== 'number' &&
        nameToLookup.length > 0;

      if (shouldBackfillFromDefinition) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('anomalies')
              .select('*')
              .eq('name', nameToLookup)
              .maybeSingle();
            if (error) throw error;
            const row: any = data || null;
            if (!active || !row) return;
            const ap = Number(
              row?.actionPointsModifier ??
                row?.action_points_modifier ??
                row?.temp_action_points ??
                row?.tempActionPoints ??
                0,
            ) || 0;
            const hp = Number(row?.healthModifier ?? row?.health_modifier ?? row?.temp_health ?? row?.tempHealth ?? 0) || 0;
            const ar = Number(row?.armorModifier ?? row?.armor_modifier ?? row?.temp_armour ?? row?.tempArmour ?? 0) || 0;
            const stats = row?.stats || {};
            const sm = (stats?.stats_modifier || stats?.statsModifier || row?.statsModifier || row?.stats_modifier || null) as any;
            const hasSpecificsFlag = row?.modifiesSpecifics ?? row?.modifies_specifics;
            const nextModifiesSpecifics =
              typeof hasSpecificsFlag === 'boolean'
                ? hasSpecificsFlag
                : ap !== 0 || hp !== 0 || ar !== 0;
            setModifiesSpecifics(nextModifiesSpecifics);
            const nextDescription = row?.description != null ? String(row.description) : '';
            const nextTurns = typeof row?.turns === 'number' ? row.turns : undefined;

            setFormData((prev) => ({
              ...prev,
              description: nextDescription || prev.description,
              turns: nextTurns != null ? nextTurns : prev.turns,
              actionPointsModifier: ap,
              healthModifier: hp,
              armorModifier: ar,
              statsModifier: typeof sm === 'object' && sm ? sm : prev.statsModifier || {},
            }));

            const durModeRaw =
              row?.durationMode ??
              row?.duration_mode ??
              row?.action_duration_mode ??
              stats?.duration_mode ??
              stats?.action_duration_mode ??
              stats?.durationMode ??
              stats?.actionDurationMode ??
              null;
            setActionDurationMode(durModeRaw === 'actions' ? 'actions' : 'turns');

            const durTypeRaw =
              row?.actionsDurationType ??
              row?.actions_duration_type ??
              row?.action_duration_type ??
              stats?.actions_duration_type ??
              stats?.action_duration_type ??
              stats?.actionsDurationType ??
              stats?.actionDurationType ??
              null;
            const normalizedType =
              durTypeRaw === 'executed' || durTypeRaw === 'performed'
                ? 'executed'
                : durTypeRaw === 'submitted' || durTypeRaw === 'received'
                  ? 'submitted'
                  : null;
            setActionDurationType(normalizedType === 'executed' ? 'executed' : 'submitted');

            const decRaw =
              row?.decrementOnFailure ??
              row?.decrement_on_failure ??
              stats?.decrement_on_failure ??
              stats?.decrementOnFailure ??
              null;
            setDecrementOnFailure(!!decRaw);

            const rawRowDamageSets = Array.isArray(stats?.damage_sets) ? stats.damage_sets : [];
            const parsedRowDamageSets = (Array.isArray(rawRowDamageSets) ? rawRowDamageSets : [])
              .map((ds: any) => {
                const d = ds || {};
                const damageEffectId = String(d?.damageEffectId ?? d?.damage_effect_id ?? d?.id ?? '').trim();
                const guaranteedDamage = Number(d?.guaranteedDamage ?? d?.guaranteed_damage ?? d?.damagePerTurn ?? d?.damage_per_turn ?? 0) || 0;
                const additionalDamage = Number(d?.additionalDamage ?? d?.additional_damage ?? 0) || 0;
                return { damageEffectId, guaranteedDamage, additionalDamage };
              })
              .filter(
                (d: any) =>
                  String(d?.damageEffectId || '').trim() || Number(d?.guaranteedDamage || 0) || Number(d?.additionalDamage || 0),
              );

            const rowDoesDamage = !!(row?.doesDamage ?? row?.does_damage) || parsedRowDamageSets.length > 0;
            setDoesDamage(rowDoesDamage);
            setDamageSets(rowDoesDamage ? parsedRowDamageSets : []);

            const rowDamageBonusEnabled = !!(stats?.damage_bonus_enabled ?? stats?.damageBonusEnabled ?? row?.damageBonusEnabled ?? row?.damage_bonus_enabled);
            setDamageBonusEnabled(rowDamageBonusEnabled);
            const rowDamageBonus = (stats?.damage_bonus || stats?.damageBonus || row?.damageBonus || row?.damage_bonus) || null;
            setDamageBonusIsSpecific(!!(rowDamageBonus?.isSpecific ?? (rowDamageBonus as any)?.is_specific));
            setDamageBonusMode(rowDamageBonus?.mode === 'classic' || rowDamageBonus?.mode === 'percentage' ? rowDamageBonus.mode : 'both');
            setDamageBonusEffectIds(
              Array.isArray(rowDamageBonus?.damageEffectIds)
                ? rowDamageBonus.damageEffectIds.map(String)
                : (Array.isArray((rowDamageBonus as any)?.damage_effect_ids) ? (rowDamageBonus as any).damage_effect_ids.map(String) : []),
            );
            setDamageBonusClassicGuaranteed(rowDamageBonus?.classicGuaranteed != null ? String(rowDamageBonus.classicGuaranteed) : '');
            setDamageBonusClassicAdditional(rowDamageBonus?.classicAdditional != null ? String(rowDamageBonus.classicAdditional) : '');
            setDamageBonusPercentageGuaranteed(rowDamageBonus?.percentageGuaranteed != null ? String(rowDamageBonus.percentageGuaranteed) : '');
            setDamageBonusPercentageAdditional(rowDamageBonus?.percentageAdditional != null ? String(rowDamageBonus.percentageAdditional) : '');

            const rowPaDiscountEnabled = !!(stats?.pa_discount_enabled ?? stats?.paDiscountEnabled ?? row?.paDiscountEnabled ?? row?.pa_discount_enabled);
            setPaDiscountEnabled(rowPaDiscountEnabled);
            const rowPaDiscount = (stats?.pa_discount || stats?.paDiscount || row?.paDiscount || row?.pa_discount) || null;
            setPaDiscountIsSpecific(!!(rowPaDiscount?.isSpecific ?? (rowPaDiscount as any)?.is_specific));
            setPaDiscountTargetMode((rowPaDiscount?.targetMode as any) || 'abilities');
            setPaDiscountCategories(Array.isArray(rowPaDiscount?.categories) ? rowPaDiscount.categories.map(String) : []);
            setPaDiscountMode(rowPaDiscount?.mode === 'classic' || rowPaDiscount?.mode === 'percentage' ? rowPaDiscount.mode : 'both');
            setPaDiscountClassicGuaranteed(rowPaDiscount?.classicGuaranteed != null ? String(rowPaDiscount.classicGuaranteed) : '');
            setPaDiscountClassicAdditional(rowPaDiscount?.classicAdditional != null ? String(rowPaDiscount.classicAdditional) : '');
            setPaDiscountPercentageGuaranteed(rowPaDiscount?.percentageGuaranteed != null ? String(rowPaDiscount.percentageGuaranteed) : '');
            setPaDiscountPercentageAdditional(rowPaDiscount?.percentageAdditional != null ? String(rowPaDiscount.percentageAdditional) : '');

            const rowDamageReductionEnabled = !!(stats?.damage_reduction_enabled ?? stats?.damageReductionEnabled ?? row?.damageReductionEnabled ?? row?.damage_reduction_enabled);
            setDamageReductionEnabled(rowDamageReductionEnabled);
            const rowDamageReduction = (stats?.damage_reduction || stats?.damageReduction || row?.damageReduction || row?.damage_reduction) || null;
            setDamageReductionIsSpecific(!!(rowDamageReduction?.isSpecific ?? (rowDamageReduction as any)?.is_specific));
            setDamageReductionMode(rowDamageReduction?.mode === 'classic' || rowDamageReduction?.mode === 'percentage' ? rowDamageReduction.mode : 'both');
            setDamageReductionEffectIds(
              Array.isArray(rowDamageReduction?.damageEffectIds)
                ? rowDamageReduction.damageEffectIds.map(String)
                : (Array.isArray((rowDamageReduction as any)?.damage_effect_ids)
                    ? (rowDamageReduction as any).damage_effect_ids.map(String)
                    : []),
            );
            setDamageReductionClassicGuaranteed(rowDamageReduction?.classicGuaranteed != null ? String(rowDamageReduction.classicGuaranteed) : '');
            setDamageReductionClassicAdditional(rowDamageReduction?.classicAdditional != null ? String(rowDamageReduction.classicAdditional) : '');
            setDamageReductionPercentageGuaranteed(rowDamageReduction?.percentageGuaranteed != null ? String(rowDamageReduction.percentageGuaranteed) : '');
            setDamageReductionPercentageAdditional(rowDamageReduction?.percentageAdditional != null ? String(rowDamageReduction.percentageAdditional) : '');

            const rowWeaknessEnabled = !!(stats?.weakness_enabled ?? stats?.weaknessEnabled ?? row?.weaknessEnabled ?? row?.weakness_enabled);
            setWeaknessEnabled(rowWeaknessEnabled);
            const rowWeakness = (stats?.weakness || stats?.weakness_config || row?.weakness || row?.weakness_config) || null;
            setWeaknessIsSpecific(!!(rowWeakness?.isSpecific ?? (rowWeakness as any)?.is_specific));
            setWeaknessMode(rowWeakness?.mode === 'classic' || rowWeakness?.mode === 'percentage' ? rowWeakness.mode : 'both');
            setWeaknessEffectIds(
              Array.isArray(rowWeakness?.damageEffectIds)
                ? rowWeakness.damageEffectIds.map(String)
                : (Array.isArray((rowWeakness as any)?.damage_effect_ids) ? (rowWeakness as any).damage_effect_ids.map(String) : []),
            );
            setWeaknessClassicGuaranteed(rowWeakness?.classicGuaranteed != null ? String(rowWeakness.classicGuaranteed) : '');
            setWeaknessClassicAdditional(rowWeakness?.classicAdditional != null ? String(rowWeakness.classicAdditional) : '');
            setWeaknessPercentageGuaranteed(rowWeakness?.percentageGuaranteed != null ? String(rowWeakness.percentageGuaranteed) : '');
            setWeaknessPercentageAdditional(rowWeakness?.percentageAdditional != null ? String(rowWeakness.percentageAdditional) : '');
          } catch {}
        })();
      }

      // Sincronizza eventuali campi extra se presenti sull'anomalia in modifica
      const prevDoesDamage = !!(ext?.doesDamage ?? ext?.does_damage);
      const rawDamageSets = Array.isArray(ext?.damageSets)
        ? ext.damageSets
        : (Array.isArray(ext?.damage_sets)
            ? ext.damage_sets
            : (Array.isArray(ext?.stats?.damage_sets) ? ext.stats.damage_sets : []));
      const parsedDamageSets = (Array.isArray(rawDamageSets) ? rawDamageSets : [])
        .map((ds: any) => {
          const d = ds || {};
          const damageEffectId = String(d?.damageEffectId ?? d?.damage_effect_id ?? d?.id ?? '').trim();
          const guaranteedDamage = Number(d?.guaranteedDamage ?? d?.guaranteed_damage ?? d?.damagePerTurn ?? d?.damage_per_turn ?? 0) || 0;
          const additionalDamage = Number(d?.additionalDamage ?? d?.additional_damage ?? 0) || 0;
          return { damageEffectId, guaranteedDamage, additionalDamage };
        })
        .filter((d: any) => String(d?.damageEffectId || '').trim() || Number(d?.guaranteedDamage || 0) || Number(d?.additionalDamage || 0));
      const legacyDamagePerTurn = Number(ext?.damagePerTurn ?? ext?.damage_per_turn ?? 0) || 0;
      const legacyEffectId = String(ext?.damageEffectId ?? ext?.damage_effect_id ?? '').trim();
      const effectiveDamageSets =
        parsedDamageSets.length > 0
          ? parsedDamageSets
          : (prevDoesDamage && (legacyEffectId || legacyDamagePerTurn)
              ? [{ damageEffectId: legacyEffectId, guaranteedDamage: legacyDamagePerTurn, additionalDamage: 0 }]
              : []);
      setDoesDamage(prevDoesDamage || effectiveDamageSets.length > 0);
      setDamageSets(effectiveDamageSets);

      const prevDamageBonusEnabled = !!(ext?.damageBonusEnabled ?? ext?.damage_bonus_enabled);
      setDamageBonusEnabled(prevDamageBonusEnabled);
      const db = (ext?.damageBonus ?? ext?.damage_bonus) || null;
      setDamageBonusIsSpecific(!!(db?.isSpecific ?? (db as any)?.is_specific));
      setDamageBonusMode(db?.mode === 'classic' || db?.mode === 'percentage' ? db.mode : 'both');
      setDamageBonusEffectIds(
        Array.isArray(db?.damageEffectIds)
          ? db.damageEffectIds.map(String)
          : (Array.isArray((db as any)?.damage_effect_ids) ? (db as any).damage_effect_ids.map(String) : []),
      );
      setDamageBonusClassicGuaranteed(db?.classicGuaranteed != null ? String(db.classicGuaranteed) : '');
      setDamageBonusClassicAdditional(db?.classicAdditional != null ? String(db.classicAdditional) : '');
      setDamageBonusPercentageGuaranteed(db?.percentageGuaranteed != null ? String(db.percentageGuaranteed) : '');
      setDamageBonusPercentageAdditional(db?.percentageAdditional != null ? String(db.percentageAdditional) : '');

      const prevPaDiscountEnabled = !!(ext?.paDiscountEnabled ?? ext?.pa_discount_enabled);
      setPaDiscountEnabled(prevPaDiscountEnabled);
      const pd = (ext?.paDiscount ?? ext?.pa_discount) || null;
      setPaDiscountIsSpecific(!!(pd?.isSpecific ?? (pd as any)?.is_specific));
      setPaDiscountTargetMode((pd?.targetMode as any) || 'abilities');
      setPaDiscountCategories(Array.isArray(pd?.categories) ? pd.categories.map(String) : []);
      setPaDiscountMode(pd?.mode === 'classic' || pd?.mode === 'percentage' ? pd.mode : 'both');
      setPaDiscountClassicGuaranteed(pd?.classicGuaranteed != null ? String(pd.classicGuaranteed) : '');
      setPaDiscountClassicAdditional(pd?.classicAdditional != null ? String(pd.classicAdditional) : '');
      setPaDiscountPercentageGuaranteed(pd?.percentageGuaranteed != null ? String(pd.percentageGuaranteed) : '');
      setPaDiscountPercentageAdditional(pd?.percentageAdditional != null ? String(pd.percentageAdditional) : '');

      const prevDamageReductionEnabled = !!(ext?.damageReductionEnabled ?? ext?.damage_reduction_enabled);
      setDamageReductionEnabled(prevDamageReductionEnabled);
      const dr = (ext?.damageReduction ?? ext?.damage_reduction) || null;
      setDamageReductionIsSpecific(!!(dr?.isSpecific ?? (dr as any)?.is_specific));
      setDamageReductionMode(dr?.mode === 'classic' || dr?.mode === 'percentage' ? dr.mode : 'both');
      setDamageReductionEffectIds(
        Array.isArray(dr?.damageEffectIds)
          ? dr.damageEffectIds.map(String)
          : (Array.isArray((dr as any)?.damage_effect_ids) ? (dr as any).damage_effect_ids.map(String) : []),
      );
      setDamageReductionClassicGuaranteed(dr?.classicGuaranteed != null ? String(dr.classicGuaranteed) : '');
      setDamageReductionClassicAdditional(dr?.classicAdditional != null ? String(dr.classicAdditional) : '');
      setDamageReductionPercentageGuaranteed(dr?.percentageGuaranteed != null ? String(dr.percentageGuaranteed) : '');
      setDamageReductionPercentageAdditional(dr?.percentageAdditional != null ? String(dr.percentageAdditional) : '');

      const prevWeaknessEnabled = !!(ext?.weaknessEnabled ?? ext?.weakness_enabled);
      setWeaknessEnabled(prevWeaknessEnabled);
      const wk = (ext?.weakness ?? ext?.weakness_config) || null;
      setWeaknessIsSpecific(!!(wk?.isSpecific ?? (wk as any)?.is_specific));
      setWeaknessMode(wk?.mode === 'classic' || wk?.mode === 'percentage' ? wk.mode : 'both');
      setWeaknessEffectIds(
        Array.isArray(wk?.damageEffectIds)
          ? wk.damageEffectIds.map(String)
          : (Array.isArray((wk as any)?.damage_effect_ids) ? (wk as any).damage_effect_ids.map(String) : []),
      );
      setWeaknessClassicGuaranteed(wk?.classicGuaranteed != null ? String(wk.classicGuaranteed) : '');
      setWeaknessClassicAdditional(wk?.classicAdditional != null ? String(wk.classicAdditional) : '');
      setWeaknessPercentageGuaranteed(wk?.percentageGuaranteed != null ? String(wk.percentageGuaranteed) : '');
      setWeaknessPercentageAdditional(wk?.percentageAdditional != null ? String(wk.percentageAdditional) : '');
    } else {
      // Reset form quando non c'è editingAnomaly (nuova anomalia)
      setFormData({
        name: '',
        description: '',
        actionPointsModifier: 0,
        healthModifier: 0,
        armorModifier: 0,
        turns: undefined,
        statsModifier: {
          forza: 0,
          percezione: 0,
          resistenza: 0,
          intelletto: 0,
          agilita: 0,
          sapienza: 0,
          anima: 0
        }
      });
      setModifiesSpecifics(false);
      setActionDurationMode('turns');
      setActionDurationType('submitted');
      setDecrementOnFailure(false);
      setDoesDamage(false);
      setDamageSets([]);
      setDamageBonusEnabled(false);
      setDamageBonusIsSpecific(false);
      setDamageBonusMode('classic');
      setDamageBonusEffectIds([]);
      setDamageBonusClassicGuaranteed('');
      setDamageBonusClassicAdditional('');
      setDamageBonusPercentageGuaranteed('');
      setDamageBonusPercentageAdditional('');
      setPaDiscountEnabled(false);
      setPaDiscountIsSpecific(false);
      setPaDiscountTargetMode('abilities');
      setPaDiscountCategories([]);
      setPaDiscountMode('classic');
      setPaDiscountClassicGuaranteed('');
      setPaDiscountClassicAdditional('');
      setPaDiscountPercentageGuaranteed('');
      setPaDiscountPercentageAdditional('');
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
    }
  }, [editingAnomaly]);

  // Carica effetti di danno da Supabase quando il modale è aperto
  useEffect(() => {
    const loadDamageEffects = async () => {
      try {
        setLoadingDamageEffects(true);
        const list = await listDamageEffects();
        const options = (Array.isArray(list) ? list : []).map((d: any) => ({ id: String(d.id), name: d.name }));
        setDamageEffectOptions(options);
      } catch (e) {
        console.warn('Errore caricando damage effects', e);
        setDamageEffectOptions([]);
      } finally {
        setLoadingDamageEffects(false);
      }
    };
    if (isOpen) loadDamageEffects();
  }, [isOpen]);

  const handleStatChange = (stat: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      statsModifier: {
        ...prev.statsModifier,
        [stat]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = () => {
    if (isReadOnly) {
      onClose();
      return;
    }
    const anomaly: StatusAnomaly = {
      id: editingAnomaly?.id || crypto.randomUUID(),
      name: formData.name || '',
      description: formData.description || '',
      actionPointsModifier: modifiesSpecifics ? (formData.actionPointsModifier || 0) : 0,
      healthModifier: modifiesSpecifics ? (formData.healthModifier || 0) : 0,
      armorModifier: modifiesSpecifics ? (formData.armorModifier || 0) : 0,
      statsModifier: formData.statsModifier || {},
      turns: typeof formData.turns === 'number' ? formData.turns : undefined,
      ...(actionDurationMode === 'actions'
        ? {
            actionDurationMode: 'actions',
            actionDurationType,
            decrementOnFailure,
          }
        : {}),
    };

    const normalizedDamageSets = doesDamage
      ? (damageSets || [])
          .map((ds) => ({
            damageEffectId: String(ds?.damageEffectId || '').trim(),
            guaranteedDamage: Number(ds?.guaranteedDamage ?? 0) || 0,
            additionalDamage: Number(ds?.additionalDamage ?? 0) || 0,
          }))
          .filter((ds) => ds.damageEffectId || ds.guaranteedDamage || ds.additionalDamage)
      : [];
    const legacySingleDamage =
      normalizedDamageSets.length === 1 && Number(normalizedDamageSets[0]?.additionalDamage ?? 0) === 0
        ? {
            damagePerTurn: Number(normalizedDamageSets[0]?.guaranteedDamage ?? 0) || 0,
            damageEffectId: normalizedDamageSets[0]?.damageEffectId || null,
            damageEffectName:
              damageEffectOptions.find((o) => String(o.id) === String(normalizedDamageSets[0]?.damageEffectId))?.name || '',
          }
        : {};

    const anomalyWithDamage = {
      ...anomaly,
      ...(doesDamage
        ? {
            doesDamage: true,
            damageSets: normalizedDamageSets,
            ...legacySingleDamage,
          }
        : { doesDamage: false, damageSets: [] }),
      damageBonusEnabled,
      damageBonus: damageBonusEnabled ? {
        isSpecific: damageBonusIsSpecific,
        damageEffectIds: damageBonusIsSpecific ? damageBonusEffectIds : [],
        damageEffectNames: damageBonusIsSpecific
          ? damageBonusEffectIds
              .map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name)
              .filter(Boolean)
          : [],
        applyToEquipment: (editingAnomaly as any)?.damageBonus?.applyToEquipment ?? true,
        ...(damageBonusMode !== 'both' ? { mode: damageBonusMode } : {}),
        classicGuaranteed: damageBonusClassicGuaranteed === '' ? 0 : Number(damageBonusClassicGuaranteed) || 0,
        classicAdditional: damageBonusClassicAdditional === '' ? 0 : Number(damageBonusClassicAdditional) || 0,
        percentageGuaranteed: damageBonusPercentageGuaranteed === '' ? 0 : Number(damageBonusPercentageGuaranteed) || 0,
        percentageAdditional: damageBonusPercentageAdditional === '' ? 0 : Number(damageBonusPercentageAdditional) || 0,
      } : undefined,
      paDiscountEnabled,
      paDiscount: paDiscountEnabled ? {
        isSpecific: paDiscountIsSpecific,
        targetMode: paDiscountIsSpecific ? paDiscountTargetMode : 'abilities',        
        categories: (paDiscountIsSpecific && paDiscountTargetMode === 'select') ? paDiscountCategories : [],
        ...(paDiscountMode !== 'both' ? { mode: paDiscountMode } : {}),
        classicGuaranteed: paDiscountClassicGuaranteed === '' ? 0 : Number(paDiscountClassicGuaranteed) || 0,
        classicAdditional: paDiscountClassicAdditional === '' ? 0 : Number(paDiscountClassicAdditional) || 0,
        percentageGuaranteed: paDiscountPercentageGuaranteed === '' ? 0 : Number(paDiscountPercentageGuaranteed) || 0,
        percentageAdditional: paDiscountPercentageAdditional === '' ? 0 : Number(paDiscountPercentageAdditional) || 0,
      } : undefined,
      damageReductionEnabled,
      damageReduction: damageReductionEnabled ? {
        isSpecific: damageReductionIsSpecific,
        damageEffectIds: damageReductionIsSpecific ? damageReductionEffectIds : [],
        damageEffectNames: damageReductionIsSpecific
          ? damageReductionEffectIds
              .map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name)
              .filter(Boolean)
          : [],
        ...(damageReductionMode !== 'both' ? { mode: damageReductionMode } : {}),
        classicGuaranteed: damageReductionClassicGuaranteed === '' ? 0 : Number(damageReductionClassicGuaranteed) || 0,
        classicAdditional: damageReductionClassicAdditional === '' ? 0 : Number(damageReductionClassicAdditional) || 0,
        percentageGuaranteed: damageReductionPercentageGuaranteed === '' ? 0 : Number(damageReductionPercentageGuaranteed) || 0,
        percentageAdditional: damageReductionPercentageAdditional === '' ? 0 : Number(damageReductionPercentageAdditional) || 0,
      } : undefined,
      weaknessEnabled,
      weakness: weaknessEnabled ? {
        isSpecific: weaknessIsSpecific,
        damageEffectIds: weaknessIsSpecific ? weaknessEffectIds : [],
        damageEffectNames: weaknessIsSpecific
          ? weaknessEffectIds
              .map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name)
              .filter(Boolean)
          : [],
        ...(weaknessMode !== 'both' ? { mode: weaknessMode } : {}),
        classicGuaranteed: weaknessClassicGuaranteed === '' ? 0 : Number(weaknessClassicGuaranteed) || 0,
        classicAdditional: weaknessClassicAdditional === '' ? 0 : Number(weaknessClassicAdditional) || 0,
        percentageGuaranteed: weaknessPercentageGuaranteed === '' ? 0 : Number(weaknessPercentageGuaranteed) || 0,
        percentageAdditional: weaknessPercentageAdditional === '' ? 0 : Number(weaknessPercentageAdditional) || 0,
      } : undefined,
    } as any;

    onSave(anomalyWithDamage);
    onClose();
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      actionPointsModifier: 0,
      healthModifier: 0,
      armorModifier: 0,
      turns: undefined,
      statsModifier: {
        forza: 0, percezione: 0, resistenza: 0,
        intelletto: 0, agilita: 0, sapienza: 0, anima: 0
      }
    });
    setModifiesSpecifics(false);
    setActionDurationMode('turns');
    setActionDurationType('submitted');
    setDecrementOnFailure(false);
    setDoesDamage(false);
    setDamageSets([]);
    setDamageBonusEnabled(false);
    setDamageBonusIsSpecific(false);
    setDamageBonusMode('classic');
    setDamageBonusEffectIds([]);
    setDamageBonusClassicGuaranteed('');
    setDamageBonusClassicAdditional('');
    setDamageBonusPercentageGuaranteed('');
    setDamageBonusPercentageAdditional('');
    setPaDiscountEnabled(false);
    setPaDiscountIsSpecific(false);
    setPaDiscountTargetMode('abilities');
    setPaDiscountCategories([]);
    setPaDiscountMode('classic');
    setPaDiscountClassicGuaranteed('');
    setPaDiscountClassicAdditional('');
    setPaDiscountPercentageGuaranteed('');
    setPaDiscountPercentageAdditional('');
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? (String(formData.name || '').trim() || 'Anomalia') : (editingAnomaly ? 'Modifica Anomalia' : 'Aggiungi Anomalia')}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? 'Visualizza i dettagli dell\'anomalia selezionata'
              : (editingAnomaly 
                ? 'Modifica i parametri dell\'anomalia di stato selezionata'
                : 'Crea una nuova anomalia di stato con modificatori per statistiche e specifiche'
              )
            } 
          </DialogDescription>
        </DialogHeader>

        {isReadOnly ? (
          <div className="space-y-4">
            {String(formData.description || '').trim().length > 0 && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {String(formData.description)}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {typeof formData.turns === 'number' && formData.turns > 0 && (
                <Badge variant="secondary">Durata: {formData.turns} turni</Badge>
              )}
              {!!((editingAnomaly as any)?.alwaysActive ?? (editingAnomaly as any)?.always_active) && (
                <Badge variant="outline">Sempre attiva</Badge>
              )}
              {doesDamage && (
                <Badge>Danno per turno</Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              {(() => {
                const ap = Number((formData as any)?.actionPointsModifier ?? 0) || 0;
                const hp = Number((formData as any)?.healthModifier ?? 0) || 0;
                const ar = Number((formData as any)?.armorModifier ?? 0) || 0;
                const rows = [
                  { label: 'Salute', value: hp },
                  { label: 'Punti Azione', value: ap },
                  { label: 'Armatura', value: ar },
                ].filter((r) => Number(r.value || 0) !== 0);
                if (rows.length === 0) return null;
                return (
                  <div>
                    <div className="text-sm font-medium">Specifiche</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rows.map((r) => (
                        <Badge key={r.label} variant="outline">
                          {r.label}: {r.value > 0 ? '+' : ''}{r.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const sm: any = (formData as any)?.statsModifier || {};
                const entries = Object.entries(sm).filter(([, v]) => Number(v || 0) !== 0);
                if (entries.length === 0) return null;
                return (
                  <div>
                    <div className="text-sm font-medium">Statistiche</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entries.map(([k, v]) => (
                        <Badge key={k} variant="outline">
                          {String(k)}: {Number(v) > 0 ? '+' : ''}{Number(v)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const shown = (doesDamage ? (damageSets || []) : [])
                  .map((ds) => ({
                    damageEffectId: String((ds as any)?.damageEffectId || '').trim(),
                    guaranteedDamage: Number((ds as any)?.guaranteedDamage ?? 0) || 0,
                    additionalDamage: Number((ds as any)?.additionalDamage ?? 0) || 0,
                  }))
                  .filter((ds) => ds.damageEffectId || ds.guaranteedDamage || ds.additionalDamage);
                if (shown.length === 0) return null;
                return (
                  <div>
                    <div className="text-sm font-medium">Danno per turno</div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {shown.map((ds, i) => {
                        const name =
                          damageEffectOptions.find((o) => String(o.id) === String(ds.damageEffectId))?.name ||
                          String((editingAnomaly as any)?.damageEffectName ?? (editingAnomaly as any)?.damage_effect_name ?? '').trim() ||
                          (ds.damageEffectId ? `Effetto ${ds.damageEffectId}` : 'Effetto');
                        const parts = [
                          ds.guaranteedDamage ? `assicurato ${ds.guaranteedDamage}` : '',
                          ds.additionalDamage ? `aggiuntivo ${ds.additionalDamage}` : '',
                        ].filter(Boolean);
                        return (
                          <div key={`${ds.damageEffectId || i}`}>
                            • {name}{parts.length ? `: ${parts.join(', ')}` : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const enabled = !!damageBonusEnabled;
                if (!enabled) return null;
                const def: any = (editingAnomaly as any)?.damageBonus ?? (editingAnomaly as any)?.damage_bonus ?? null;
                const ids: string[] = Array.isArray(damageBonusEffectIds) ? damageBonusEffectIds : [];
                const fallbackNames: string[] = Array.isArray(def?.damageEffectNames)
                  ? def.damageEffectNames.map((x: any) => String(x))
                  : (Array.isArray(def?.damage_effect_names) ? def.damage_effect_names.map((x: any) => String(x)) : []);
                const targetLabel = !damageBonusIsSpecific
                  ? 'Tutti i tipi ci danno'
                  : (
                      ids.length > 0
                        ? ids.map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name || `Effetto ${id}`)
                        : fallbackNames
                    ).filter((x) => String(x || '').trim().length > 0);
                const values = [
                  { label: 'Assicurato', classic: damageBonusClassicGuaranteed, percentage: damageBonusPercentageGuaranteed },
                  { label: 'Aggiuntivo', classic: damageBonusClassicAdditional, percentage: damageBonusPercentageAdditional },
                ];
                const classic = values.map((v) => `${v.label} ${Number(v.classic || 0)}`).join(' • ');
                const perc = values.map((v) => `${v.label} ${Number(v.percentage || 0)}%`).join(' • ');
                const mode = damageBonusMode === 'classic' ? classic : damageBonusMode === 'percentage' ? perc : `${classic} | ${perc}`;
                return (
                  <div>
                    <div className="text-sm font-medium">Bonus danno</div>
                    <div className="mt-1 text-sm text-muted-foreground">{mode}</div>
                    {damageBonusIsSpecific ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(targetLabel) ? targetLabel : []).map((n) => (
                          <Badge key={n} variant="outline">{n}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground">{targetLabel}</div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const enabled = !!damageReductionEnabled;
                if (!enabled) return null;
                const def: any = (editingAnomaly as any)?.damageReduction ?? (editingAnomaly as any)?.damage_reduction ?? null;
                const ids: string[] = Array.isArray(damageReductionEffectIds) ? damageReductionEffectIds : [];
                const fallbackNames: string[] = Array.isArray(def?.damageEffectNames)
                  ? def.damageEffectNames.map((x: any) => String(x))
                  : (Array.isArray(def?.damage_effect_names) ? def.damage_effect_names.map((x: any) => String(x)) : []);
                const targetLabel = !damageReductionIsSpecific
                  ? 'Tutti i tipi di danno'
                  : (
                      ids.length > 0
                        ? ids.map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name || `Effetto ${id}`)
                        : fallbackNames
                    ).filter((x) => String(x || '').trim().length > 0);
                const values = [
                  { label: 'Assicurato', classic: damageReductionClassicGuaranteed, percentage: damageReductionPercentageGuaranteed },
                  { label: 'Aggiuntivo', classic: damageReductionClassicAdditional, percentage: damageReductionPercentageAdditional },
                ];
                const classic = values.map((v) => `${v.label} ${Number(v.classic || 0)}`).join(' • ');
                const perc = values.map((v) => `${v.label} ${Number(v.percentage || 0)}%`).join(' • ');
                const mode = damageReductionMode === 'classic' ? classic : damageReductionMode === 'percentage' ? perc : `${classic} | ${perc}`;
                return (
                  <div>
                    <div className="text-sm font-medium">Riduzione danno</div>
                    <div className="mt-1 text-sm text-muted-foreground">{mode}</div>
                    {damageReductionIsSpecific ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(targetLabel) ? targetLabel : []).map((n) => (
                          <Badge key={n} variant="outline">{n}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground">{targetLabel}</div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const enabled = !!weaknessEnabled;
                if (!enabled) return null;
                const def: any = (editingAnomaly as any)?.weakness ?? (editingAnomaly as any)?.weakness_config ?? null;
                const ids: string[] = Array.isArray(weaknessEffectIds) ? weaknessEffectIds : [];
                const fallbackNames: string[] = Array.isArray(def?.damageEffectNames)
                  ? def.damageEffectNames.map((x: any) => String(x))
                  : (Array.isArray(def?.damage_effect_names) ? def.damage_effect_names.map((x: any) => String(x)) : []);
                const targetLabel = !weaknessIsSpecific
                  ? 'Tutti i tipi di danno'
                  : (
                      ids.length > 0
                        ? ids.map((id) => damageEffectOptions.find((o) => String(o.id) === String(id))?.name || `Effetto ${id}`)
                        : fallbackNames
                    ).filter((x) => String(x || '').trim().length > 0);
                const values = [
                  { label: 'Assicurato', classic: weaknessClassicGuaranteed, percentage: weaknessPercentageGuaranteed },
                  { label: 'Aggiuntivo', classic: weaknessClassicAdditional, percentage: weaknessPercentageAdditional },
                ];
                const classic = values.map((v) => `${v.label} ${Number(v.classic || 0)}`).join(' • ');
                const perc = values.map((v) => `${v.label} ${Number(v.percentage || 0)}%`).join(' • ');
                const mode = weaknessMode === 'classic' ? classic : weaknessMode === 'percentage' ? perc : `${classic} | ${perc}`;
                return (
                  <div>
                    <div className="text-sm font-medium">Debolezza</div>
                    <div className="mt-1 text-sm text-muted-foreground">{mode}</div>
                    {weaknessIsSpecific ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(targetLabel) ? targetLabel : []).map((n) => (
                          <Badge key={n} variant="outline">{n}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground">{targetLabel}</div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const enabled = !!paDiscountEnabled;
                if (!enabled) return null;
                const values = [
                  { label: 'Assicurato', classic: paDiscountClassicGuaranteed, percentage: paDiscountPercentageGuaranteed },
                  { label: 'Aggiuntivo', classic: paDiscountClassicAdditional, percentage: paDiscountPercentageAdditional },
                ];
                const classic = values.map((v) => `${v.label} ${Number(v.classic || 0)}`).join(' • ');
                const perc = values.map((v) => `${v.label} ${Number(v.percentage || 0)}%`).join(' • ');
                const mode = paDiscountMode === 'classic' ? classic : paDiscountMode === 'percentage' ? perc : `${classic} | ${perc}`;
                const target =
                  paDiscountIsSpecific
                    ? (paDiscountTargetMode === 'magic' ? 'Magie' : paDiscountTargetMode === 'select' ? 'Categorie selezionate' : 'Abilità')
                    : 'Tutte';
                return (
                  <div>
                    <div className="text-sm font-medium">Sconto PA</div>
                    <div className="mt-1 text-sm text-muted-foreground">{mode}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Target: {target}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome Anomalia</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome anomalia"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex-1">Modifica temporaneamente Specifiche?</Label>
            <Switch
              checked={modifiesSpecifics}
              onCheckedChange={(checked) => {
                setModifiesSpecifics(checked);
                if (!checked) {
                  setFormData((prev) => ({
                    ...prev,
                    actionPointsModifier: 0,
                    healthModifier: 0,
                    armorModifier: 0,
                  }));
                }
              }}
            />
          </div>
          {modifiesSpecifics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="health">Salute</Label>
                <Input
                  id="health"
                  type="number"
                  value={formData.healthModifier}
                  onChange={(e) => setFormData(prev => ({ ...prev, healthModifier: parseInt(e.target.value) || 0 }))}
                  placeholder="Può essere negativo"
                />
              </div>
              <div>
                <Label htmlFor="actionPoints">Punti Azione</Label>
                <Input
                  id="actionPoints"
                  type="number"
                  value={formData.actionPointsModifier}
                  onChange={(e) => setFormData(prev => ({ ...prev, actionPointsModifier: parseInt(e.target.value) || 0 }))}
                  placeholder="Può essere negativo"
                />
              </div>
              <div>
                <Label htmlFor="armor">Armatura</Label>
                <Input
                  id="armor"
                  type="number"
                  value={formData.armorModifier}
                  onChange={(e) => setFormData(prev => ({ ...prev, armorModifier: parseInt(e.target.value) || 0 }))}
                  placeholder="Può essere negativo"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="turns">Durata ({actionDurationMode === 'actions' ? 'azioni' : 'turni'})</Label>
            <Input
              id="turns"
              type="number"
              value={typeof formData.turns === 'number' ? formData.turns : ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  turns: val === '' ? undefined : (parseInt(val) || 0)
                }))
              }}
              placeholder="Facoltativo"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Lascia vuoto se l'anomalia non ha durata
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionDurationMode">Modo durata</Label>
            <Select value={actionDurationMode} onValueChange={(v) => setActionDurationMode(v as any)}>
              <SelectTrigger id="actionDurationMode">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="turns">Durata turni</SelectItem>
                <SelectItem value="actions">Durata azioni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionDurationMode === 'actions' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="actionDurationType">Tipo durata azioni</Label>
                <Select value={actionDurationType} onValueChange={(v) => setActionDurationType(v as any)}>
                  <SelectTrigger id="actionDurationType">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Durata azioni subite</SelectItem>
                    <SelectItem value="executed">Durata azioni eseguite</SelectItem>
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

          {/* Danno per turno */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Danno per turno?</Label>
                <p className="text-xs text-muted-foreground">Se attivo, aggiungi uno o più effetti di danno.</p>
              </div>
              <Switch
                checked={doesDamage}
                onCheckedChange={(checked) => {
                  setDoesDamage(checked);
                  if (!checked) {
                    setDamageSets([]);
                    return;
                  }
                  if ((damageSets || []).length === 0) {
                    setDamageSets([{ damageEffectId: '', guaranteedDamage: 0, additionalDamage: 0 }]);
                  }
                }}
              />
            </div>

            {doesDamage && (
              <div className="space-y-3">
                {(damageSets || []).map((row, idx) => (
                  <div key={`ds:${idx}`} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-3">
                      <Label>Effetto di danno</Label>
                      <Select
                        value={String(row?.damageEffectId || '')}
                        onValueChange={(value) => {
                          setDamageSets((prev) => (prev || []).map((r, i) => (i === idx ? { ...r, damageEffectId: value } : r)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDamageEffects ? 'Caricamento...' : 'Seleziona effetto'} />
                        </SelectTrigger>
                        <SelectContent>
                          {damageEffectOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Label>Assicurato</Label>
                      <Input
                        type="number"
                        value={String(row?.guaranteedDamage ?? 0)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDamageSets((prev) =>
                            (prev || []).map((r, i) => (i === idx ? { ...r, guaranteedDamage: v === '' ? 0 : (Number(v) || 0) } : r)),
                          );
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Aggiuntivo</Label>
                      <Input
                        type="number"
                        value={String(row?.additionalDamage ?? 0)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDamageSets((prev) =>
                            (prev || []).map((r, i) => (i === idx ? { ...r, additionalDamage: v === '' ? 0 : (Number(v) || 0) } : r)),
                          );
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDamageSets((prev) => (prev || []).filter((_, i) => i !== idx))}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDamageSets((prev) => [...(Array.isArray(prev) ? prev : []), { damageEffectId: '', guaranteedDamage: 0, additionalDamage: 0 }])
                    }
                  >
                    Aggiungi effetto
                  </Button>
                </div>
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

                <div className="space-y-2">
                  <Label>Tipo incremento</Label>
                  <Select value={damageBonusMode} onValueChange={(v) => {
                    if (v === 'classic' || v === 'percentage' || v === 'both') setDamageBonusMode(v);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                      <SelectItem value="both">Entrambi (compatibilità)</SelectItem>
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
                        <SelectValue placeholder={loadingDamageEffects ? 'Caricamento...' : 'Aggiungi damage effect'} />
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
                          ?? (loadingDamageEffects ? 'Caricamento...' : 'Effetto sconosciuto');
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

                {(damageBonusMode === 'classic' || damageBonusMode === 'both') && (
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
                )}
                {(damageBonusMode === 'percentage' || damageBonusMode === 'both') && (
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
                          setPaDiscountTargetMode(v as any);
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
                  <Select value={paDiscountMode} onValueChange={(v) => {
                    if (v === 'classic' || v === 'percentage' || v === 'both') setPaDiscountMode(v);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                      <SelectItem value="both">Entrambi (compatibilità)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(paDiscountMode === 'classic' || paDiscountMode === 'both') && (
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
                )}
                {(paDiscountMode === 'percentage' || paDiscountMode === 'both') && (
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

          {/* Riduzione danni */}
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
                    <p className="text-xs text-muted-foreground">{damageReductionIsSpecific ? 'Specifico: scegli uno o più damage effect' : 'Generico: vale per tutti i damage effect'}</p>
                  </div>
                  <Switch checked={damageReductionIsSpecific} onCheckedChange={(checked) => {
                    setDamageReductionIsSpecific(checked);
                    if (!checked) setDamageReductionEffectIds([]);
                  }} />
                </div>

                {damageReductionIsSpecific && (
                  <div className="space-y-2">
                    <Label>Damage effect</Label>
                    <Select
                      value={''}
                      onValueChange={(value) => {
                        if (!value) return;
                        setDamageReductionEffectIds(prev => (prev.includes(value) ? prev : [...prev, value]));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aggiungi damage effect" />
                      </SelectTrigger>
                      <SelectContent>
                        {damageEffectOptions.map((opt) => (
                          <SelectItem key={`dr:${opt.id}`} value={String(opt.id)}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {damageReductionEffectIds.map((id) => {
                        const name = damageEffectOptions.find((o) => String(o.id) === String(id))?.name || id;
                        return (
                          <Button
                            key={`drs:${id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDamageReductionEffectIds(prev => prev.filter(x => x !== id))}
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
                  <Select value={damageReductionMode} onValueChange={(v) => {
                    if (v === 'classic' || v === 'percentage' || v === 'both') setDamageReductionMode(v);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                      <SelectItem value="both">Entrambi (compatibilità)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(damageReductionMode === 'classic' || damageReductionMode === 'both') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore classico</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={damageReductionClassicGuaranteed} onChange={(e) => setDamageReductionClassicGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={damageReductionClassicAdditional} onChange={(e) => setDamageReductionClassicAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
                {(damageReductionMode === 'percentage' || damageReductionMode === 'both') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore percentuale</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={damageReductionPercentageGuaranteed} onChange={(e) => setDamageReductionPercentageGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={damageReductionPercentageAdditional} onChange={(e) => setDamageReductionPercentageAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Debolezza */}
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
                    <p className="text-xs text-muted-foreground">{weaknessIsSpecific ? 'Specifico: scegli uno o più damage effect' : 'Generico: vale per tutti i damage effect'}</p>
                  </div>
                  <Switch checked={weaknessIsSpecific} onCheckedChange={(checked) => {
                    setWeaknessIsSpecific(checked);
                    if (!checked) setWeaknessEffectIds([]);
                  }} />
                </div>

                {weaknessIsSpecific && (
                  <div className="space-y-2">
                    <Label>Damage effect</Label>
                    <Select
                      value={''}
                      onValueChange={(value) => {
                        if (!value) return;
                        setWeaknessEffectIds(prev => (prev.includes(value) ? prev : [...prev, value]));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aggiungi damage effect" />
                      </SelectTrigger>
                      <SelectContent>
                        {damageEffectOptions.map((opt) => (
                          <SelectItem key={`wk:${opt.id}`} value={String(opt.id)}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {weaknessEffectIds.map((id) => {
                        const name = damageEffectOptions.find((o) => String(o.id) === String(id))?.name || id;
                        return (
                          <Button
                            key={`wks:${id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setWeaknessEffectIds(prev => prev.filter(x => x !== id))}
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
                  <Select value={weaknessMode} onValueChange={(v) => {
                    if (v === 'classic' || v === 'percentage' || v === 'both') setWeaknessMode(v);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classico</SelectItem>
                      <SelectItem value="percentage">Percentuale</SelectItem>
                      <SelectItem value="both">Entrambi (compatibilità)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(weaknessMode === 'classic' || weaknessMode === 'both') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore classico</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={weaknessClassicGuaranteed} onChange={(e) => setWeaknessClassicGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={weaknessClassicAdditional} onChange={(e) => setWeaknessClassicAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
                {(weaknessMode === 'percentage' || weaknessMode === 'both') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Valore percentuale</Label>
                    </div>
                    <div>
                      <Label>Assicurato</Label>
                      <Input type="number" value={weaknessPercentageGuaranteed} onChange={(e) => setWeaknessPercentageGuaranteed(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Aggiuntivo</Label>
                      <Input type="number" value={weaknessPercentageAdditional} onChange={(e) => setWeaknessPercentageAdditional(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statistiche */}
          <div>
            <Label>Statistiche</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(formData.statsModifier || {}).map(([stat, value]) => (
                <div key={stat}>
                  <Label htmlFor={stat} className="text-sm capitalize">
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </Label>
                  <Input
                    id={stat}
                    type="number"
                    value={value}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    placeholder="Può essere negativo"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Usa valori negativi per penalità
            </p>
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione anomalia"
            />
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? 'Chiudi' : 'Annulla'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave}>
              {editingAnomaly ? 'Salva Modifiche' : 'Aggiungi'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnomalyModal;
