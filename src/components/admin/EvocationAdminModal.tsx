import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import EquipmentModal from '@/components/character/modals/EquipmentModal';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MAGIC_SECTIONS, MAGIC_GRADES } from '@/constants/magicConfig';
import { ABILITY_SECTIONS, ABILITY_GRADES } from '@/constants/abilityConfig';
import { ImportSpellModal } from '@/components/magic/ImportSpellModal';
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import CharacterSelector from '@/components/character/CharacterSelector';

interface EvocationAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (definition: any) => void;
}

interface WeaponLevelDef {
  turn_duration_rounds: number;
  action_cost: number;
  indicative_action_cost: number;
  weapon: any | null; // EquipmentItem snapshot
}

const createDefaultWeaponLevel = (): WeaponLevelDef => ({
  turn_duration_rounds: 0,
  action_cost: 0,
  indicative_action_cost: 0,
  weapon: null,
});

export function EvocationAdminModal({ isOpen, onClose, onSave }: EvocationAdminModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'weapon' | 'entity' | 'replica'>('weapon');
  const [levels, setLevels] = useState<WeaponLevelDef[]>(Array.from({ length: 10 }, () => createDefaultWeaponLevel()));

  // Entity variant state
  interface StatRow { statKey: 'forza' | 'percezione' | 'resistenza' | 'intelletto' | 'agilita' | 'sapienza' | 'anima'; amount: number }
  interface EntityLevelDef {
    turn_duration_rounds: number;
    action_cost: number;
    indicative_action_cost: number;
    specifics: { armor?: number | null; health?: number | null; action_points?: number | null };
    stats: StatRow[]; // opzionale: gli amount possono restare a 0
    hasEquipment: boolean;
    equipment: any | null;
    spells: Array<{ id: string; name: string; level: number }>; // semplice snapshot
    abilities: Array<{ id: string; name: string; level: number }>;
    damageEnabled: boolean;
    damageSets: string[]; // ids effetti danno
    assuredDamage?: number | null;
    additionalDamage?: number | null;
    // Nuovo: danno per tipologia selezionata
    damageByType: Array<{ effect_id: string; name: string; assured_damage: number | null; additional_damage: number | null }>;
  }

  // Replica variant state
  interface ReplicaLevelDef {
    turn_duration_rounds: number;
    action_cost: number;
    indicative_action_cost: number;
    max_replicas: number;
    origin: 'caster' | 'target' | 'specific';
    source_character_id: string | null;
  }

  const createDefaultReplicaLevel = (): ReplicaLevelDef => ({
    turn_duration_rounds: 0,
    action_cost: 0,
    indicative_action_cost: 0,
    max_replicas: 1,
    origin: 'caster',
    source_character_id: null,
  });

  const [replicaLevels, setReplicaLevels] = useState<ReplicaLevelDef[]>(
    Array.from({ length: 10 }, () => createDefaultReplicaLevel())
  );

  // Selettore personaggi per "Da personaggio specifico"
  const [characterSelectorOpen, setCharacterSelectorOpen] = useState(false);
  const [selectingCharacterLevelIndex, setSelectingCharacterLevelIndex] = useState<number | null>(null);
  const defaultStats: StatRow[] = [
    { statKey: 'forza', amount: 0 },
    { statKey: 'percezione', amount: 0 },
    { statKey: 'resistenza', amount: 0 },
    { statKey: 'intelletto', amount: 0 },
    { statKey: 'agilita', amount: 0 },
    { statKey: 'sapienza', amount: 0 },
    { statKey: 'anima', amount: 0 },
  ];
  const createDefaultEntityLevel = (): EntityLevelDef => ({
    turn_duration_rounds: 0,
    action_cost: 0,
    indicative_action_cost: 0,
    specifics: { armor: null, health: null, action_points: null },
    stats: defaultStats.map(s => ({ ...s })),
    hasEquipment: false,
    equipment: null,
    spells: [],
    abilities: [],
    damageEnabled: false,
    damageSets: [],
    assuredDamage: null,
    additionalDamage: null,
    damageByType: [],
  });
  const [entityLevels, setEntityLevels] = useState<EntityLevelDef[]>(Array.from({ length: 10 }, () => createDefaultEntityLevel()));

  // Damage sets catalog
  const [damageEffects, setDamageEffects] = useState<any[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const list = await listDamageEffects();
        setDamageEffects(list || []);
      } catch (e) {
        console.warn('Impossibile caricare set di danno', e);
      }
    })();
  }, [isOpen]);

  // Spells & abilities catalog (semplice)
  const [spellsCatalog, setSpellsCatalog] = useState<Array<{ id: string; name: string; levels?: any[] }>>([]);
  const [abilitiesCatalog, setAbilitiesCatalog] = useState<Array<{ id: string; name: string; levels?: any[] }>>([]);
  const [spellQuery, setSpellQuery] = useState<string>('');
  const [abilityQuery, setAbilityQuery] = useState<string>('');
  const [spellSectionKey, setSpellSectionKey] = useState<string | null>(null);
  const [spellCategoryKey, setSpellCategoryKey] = useState<string | null>(null);
  const [spellGrade, setSpellGrade] = useState<string | null>(null);
  const [abilitySectionKey, setAbilitySectionKey] = useState<string | null>(null);
  const [abilityCategoryKey, setAbilityCategoryKey] = useState<string | null>(null);
  const [abilityGrade, setAbilityGrade] = useState<string | null>(null);
  // Selezioni in stile ImportModal
  const [selectedSpell, setSelectedSpell] = useState<{ id: string; name: string } | null>(null);
  const [selectedSpellLevel, setSelectedSpellLevel] = useState<string>('1');
  const [selectedAbility, setSelectedAbility] = useState<{ id: string; name: string } | null>(null);
  const [selectedAbilityLevel, setSelectedAbilityLevel] = useState<string>('1');

  // Caricamento cataloghi con filtri come nei modali Import
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        let q = supabase.from('spells').select('id,name,levels').order('name');
        if (spellSectionKey) q = q.eq('category', spellSectionKey);
        if (spellCategoryKey) q = q.eq('subcategory', spellCategoryKey);
        if (spellGrade) q = q.eq('grade', spellGrade);
        const { data: spells } = await q;
        setSpellsCatalog(spells || []);
      } catch (e) {
        console.warn('Errore caricamento magie', e);
      }
    })();
  }, [isOpen, spellSectionKey, spellCategoryKey, spellGrade]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        let q = supabase.from('abilities').select('id,name,levels').order('name');
        if (abilitySectionKey) q = q.eq('category', abilitySectionKey);
        if (abilityCategoryKey) q = q.eq('subcategory', abilityCategoryKey);
        if (abilityGrade) q = q.eq('grade', abilityGrade);
        const { data: abilities } = await q;
        setAbilitiesCatalog(abilities || []);
      } catch (e) {
        console.warn('Errore caricamento abilità', e);
      }
    })();
  }, [isOpen, abilitySectionKey, abilityCategoryKey, abilityGrade]);

  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingLevelIndex, setEditingLevelIndex] = useState<number | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);
  // Modali import per magie/abilità
  const [spellImportOpen, setSpellImportOpen] = useState(false);
  const [abilityImportOpen, setAbilityImportOpen] = useState(false);
  const [importingLevelIndex, setImportingLevelIndex] = useState<number | null>(null);
  // Dialog di selezione danni per tipologia
  const [damageSelectOpen, setDamageSelectOpen] = useState(false);
  const [editingDamageIndex, setEditingDamageIndex] = useState<number | null>(null);
  const [damageSelectionDraft, setDamageSelectionDraft] = useState<Set<string>>(new Set());

  const openConfigForLevel = (idx: number) => {
    setEditingLevelIndex(idx);
    if (type === 'weapon') {
      const current = levels[idx]?.weapon || null;
      const fallback = idx > 0 ? levels[idx - 1]?.weapon || null : null;
      setEditingEquipment(current ?? fallback);
    } else {
      const current = entityLevels[idx]?.equipment || null;
      const fallback = idx > 0 ? entityLevels[idx - 1]?.equipment || null : null;
      setEditingEquipment(current ?? fallback);
    }
    setEquipmentModalOpen(true);
  };

  const handleSaveEquipment = (item: any) => {
    if (editingLevelIndex == null) return;
    if (type === 'weapon') {
      // Unifica update e propagazione in un solo setLevels basato su prev
      setLevels(prev => {
        const next = [...prev];
        next[editingLevelIndex!] = { ...next[editingLevelIndex!], weapon: item };
        return propagateWeaponConfig(next, editingLevelIndex!);
      });
    } else {
      const next = [...entityLevels];
      next[editingLevelIndex] = { ...next[editingLevelIndex], equipment: item };
      setEntityLevels(next);
    }
    setEditingLevelIndex(null);
    setEquipmentModalOpen(false);
  };

  const canEquipItem = () => true;

  const handleSave = () => {
    const definition = {
      name,
      type,
      levels:
        type === 'weapon'
          ? levels.map((lvl, i) => ({
              level: i + 1,
              turn_duration_rounds: Number(lvl.turn_duration_rounds) || 0,
              action_cost: Number(lvl.action_cost) || 0,
              indicative_action_cost: Number(lvl.indicative_action_cost) || 0,
              weapon: lvl.weapon || null,
            }))
          : type === 'entity'
          ? entityLevels.map((lvl, i) => ({
              level: i + 1,
              turn_duration_rounds: Number(lvl.turn_duration_rounds) || 0,
              action_cost: Number(lvl.action_cost) || 0,
              indicative_action_cost: Number(lvl.indicative_action_cost) || 0,
              entity: {
                specifics: {
                  armor: lvl.specifics.armor ?? null,
                  health: lvl.specifics.health ?? null,
                  action_points: lvl.specifics.action_points ?? null,
                },
                stats: lvl.stats,
                equipment: lvl.hasEquipment ? lvl.equipment : null,
                spells: lvl.spells,
                abilities: lvl.abilities,
                damage: lvl.damageEnabled
                  ? {
                      sets: (lvl.damageByType || []).map(d => d.effect_id),
                      by_type: (lvl.damageByType || []).map(d => ({
                        effect_id: d.effect_id,
                        name: d.name,
                        assured_damage: d.assured_damage ?? null,
                        additional_damage: d.additional_damage ?? null,
                      })),
                    }
                  : null,
              },
            }))
          : replicaLevels.map((lvl, i) => ({
              level: i + 1,
              turn_duration_rounds: Number(lvl.turn_duration_rounds) || 0,
              action_cost: Number(lvl.action_cost) || 0,
              indicative_action_cost: Number(lvl.indicative_action_cost) || 0,
              replica: {
                origin: lvl.origin,
                source_character_id: lvl.origin === 'specific' ? (lvl.source_character_id || null) : null,
                max_replicas: Number(lvl.max_replicas) || 1,
              },
            })),
    };
    onSave(definition);
  };

  // Helpers: propagazione ai livelli superiori se "vuoti"
  const propagateNumber = (fromIdx: number, getter: (lvl: EntityLevelDef) => number | null | undefined, setter: (lvl: EntityLevelDef, value: number | null) => EntityLevelDef) => {
    const value = getter(entityLevels[fromIdx]) ?? null;
    const next = [...entityLevels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      const current = next[j];
      const currentVal = getter(current);
      if (currentVal == null) {
        next[j] = setter(current, value);
      }
    }
    setEntityLevels(next);
  };
  const isEmptyStats = (rows: StatRow[]) => rows.every(r => !r.amount || r.amount === 0);
  const propagateStats = (fromIdx: number) => {
    const rows = entityLevels[fromIdx].stats.map(r => ({ ...r }));
    const next = [...entityLevels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if (isEmptyStats(next[j].stats)) {
        next[j].stats = rows.map(r => ({ ...r }));
      }
    }
    setEntityLevels(next);
  };
  const propagateArray = <T,>(fromIdx: number, getter: (lvl: EntityLevelDef) => T[], setter: (lvl: EntityLevelDef, value: T[]) => EntityLevelDef) => {
    const arr = getter(entityLevels[fromIdx]);
    const next = [...entityLevels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      const currentArr = getter(next[j]);
      if (!currentArr || currentArr.length === 0) {
        next[j] = setter(next[j], [...arr]);
      }
    }
    setEntityLevels(next);
  };

  // Nuovo: copia statistiche dal livello precedente
  const copyEntityStatsFromLevel = (sourceIdx: number, targetIdx: number) => {
    const src = entityLevels[sourceIdx]?.stats;
    if (!src || src.length === 0) return;
    setEntityLevels(prev => {
      const next = [...prev];
      next[targetIdx] = { ...next[targetIdx], stats: src.map(r => ({ ...r })) };
      return next;
    });
  };
  
  // Nuovi helper: propagazione per weapon (default numerici = 0) e replica
  const propagateWeaponNumber = (fromIdx: number, key: 'turn_duration_rounds' | 'action_cost' | 'indicative_action_cost') => {
    const value = (levels[fromIdx] as any)[key] as number;
    const next = [...levels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if ((next[j] as any)[key] === 0) {
        (next[j] as any)[key] = value;
      }
    }
    setLevels(next);
  };
  // Rende la propagazione pura: non legge lo stato globale né chiama setLevels
  const propagateWeaponConfig = (levelsBase: WeaponLevelDef[], fromIdx: number) => {
    const item = levelsBase[fromIdx].weapon;
    if (!item) return levelsBase;
    const next = [...levelsBase];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if (!next[j].weapon) {
        next[j] = { ...next[j], weapon: item };
      }
    }
    return next;
  };
  const propagateEntityNumberZeroDefault = (fromIdx: number, key: 'turn_duration_rounds' | 'action_cost' | 'indicative_action_cost') => {
    const value = (entityLevels[fromIdx] as any)[key] as number;
    const next = [...entityLevels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if ((next[j] as any)[key] === 0) {
        (next[j] as any)[key] = value;
      }
    }
    setEntityLevels(next);
  };
  const propagateReplicaNumber = (fromIdx: number, key: 'turn_duration_rounds' | 'action_cost' | 'indicative_action_cost' | 'max_replicas') => {
    const value = (replicaLevels[fromIdx] as any)[key] as number;
    const next = [...replicaLevels];
    const defaultVal = key === 'max_replicas' ? 1 : 0;
    for (let j = fromIdx + 1; j < next.length; j++) {
      if ((next[j] as any)[key] === defaultVal) {
        (next[j] as any)[key] = value;
      }
    }
    setReplicaLevels(next);
  };
  const propagateReplicaOriginPure = (levelsBase: ReplicaLevelDef[], fromIdx: number) => {
    const v = levelsBase[fromIdx].origin;
    const next = [...levelsBase];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if (next[j].origin === 'caster') {
        next[j] = {
          ...next[j],
          origin: v,
          source_character_id: v === 'specific' ? next[j].source_character_id : null,
        };
      }
    }
    return next;
  };
  const propagateReplicaSourceCharacter = (fromIdx: number) => {
    const id = replicaLevels[fromIdx].source_character_id;
    if (!id) return;
    const next = [...replicaLevels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if (next[j].origin === 'specific' && !next[j].source_character_id) {
        next[j].source_character_id = id;
      }
    }
    setReplicaLevels(next);
  };

  // Helper: copia configurazione arma da un livello ad un altro
  const copyWeaponFromLevel = (sourceIdx: number, targetIdx: number) => {
    const src = levels[sourceIdx]?.weapon;
    if (!src) return;
    const next = [...levels];
    next[targetIdx] = { ...next[targetIdx], weapon: src };
    setLevels(next);
  };

  // Helper: applica configurazione arma ai livelli successivi (solo quelli senza configurazione)
  const applyWeaponToFollowing = (fromIdx: number) => {
    const src = levels[fromIdx]?.weapon;
    if (!src) return;
    const next = [...levels];
    for (let j = fromIdx + 1; j < next.length; j++) {
      if (!next[j].weapon) {
        next[j] = { ...next[j], weapon: src };
      }
    }
    setLevels(next);
  };

  // Rimozione arma solo per il livello corrente
  const removeWeaponAtLevel = (idx: number) => {
    const current = levels[idx]?.weapon;
    if (!current) return;
    const ok = window.confirm('Rimuovere la configurazione arma da questo livello?');
    if (!ok) return;
    setLevels(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], weapon: null };
      return next;
    });
  };

  // Helper entità: copia equipaggiamento da un livello ad un altro (solo se target haEquipment)
  const copyEntityEquipmentFromLevel = (sourceIdx: number, targetIdx: number) => {
    const src = entityLevels[sourceIdx]?.equipment;
    if (!src) return;
    setEntityLevels(prev => {
      const next = [...prev];
      if (next[targetIdx]?.hasEquipment) {
        next[targetIdx] = { ...next[targetIdx], equipment: src };
      }
      return next;
    });
  };
  // Applica equipaggiamento ai successivi (solo livelli con hasEquipment e senza equipment)
  const applyEntityEquipmentToFollowing = (fromIdx: number) => {
    const src = entityLevels[fromIdx]?.equipment;
    if (!src) return;
    setEntityLevels(prev => {
      const next = [...prev];
      for (let j = fromIdx + 1; j < next.length; j++) {
        if (next[j].hasEquipment && !next[j].equipment) {
          next[j] = { ...next[j], equipment: src };
        }
      }
      return next;
    });
  };
  // Rimozione equipaggiamento solo per il livello corrente (mantiene hasEquipment)
  const removeEntityEquipmentAtLevel = (idx: number) => {
    const current = entityLevels[idx]?.equipment;
    if (!current) return;
    const ok = window.confirm('Rimuovere l\'equipaggiamento da questo livello?');
    if (!ok) return;
    setEntityLevels(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], equipment: null };
      return next;
    });
  };

  // Riepilogo completo equipaggiamento/arma per check continuo
  const renderEquipmentSummary = (equipment: any) => {
    if (!equipment) return <div className="text-xs text-muted-foreground">Nessuna configurazione.</div>;
    const stats = equipment.stats || {};
    const hasStats = Object.values(stats).some((v: any) => (Number(v) || 0) !== 0);
    const data = equipment.data || {};
    const anomalies = equipment.statusAnomalies || [];
    const damageSets = Array.isArray(data.damage_sets) ? data.damage_sets : [];

    return (
      <div className="text-xs text-muted-foreground space-y-2">
        <div className="flex flex-wrap gap-2">
          {equipment.name && <span>Nome: {equipment.name}</span>}
          {equipment.type && <span>Tipo: {String(equipment.type).toUpperCase()}</span>}
          {equipment.subtype && <span>Sottotipo: {String(equipment.subtype).replace('_',' ')}</span>}
          {typeof equipment.weight === 'number' && <span>Peso: {equipment.weight}</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {data.weapon_type_name && <span>Tipo arma: {data.weapon_type_name} ({data.weapon_type_category || '—'})</span>}
          {data.material_name && <span>Materiale: {data.material_name}</span>}
          {data.weapon_subtype_detail && <span>Dettaglio sottotipo: {data.weapon_subtype_detail}</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <span>Danni veloci: {equipment.damageVeloce ?? '—'}</span>
          <span>Danni pesanti: {equipment.damagePesante ?? '—'}</span>
          <span>Danni affondo: {equipment.damageAffondo ?? '—'}</span>
        </div>

        {hasStats && (
          <div>
            <div>Stats:</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
              {Object.entries(stats).map(([k, v]) => (
                <span key={k}>
                  {k}: {Number(v) || 0}
                </span>
              ))}
            </div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div>
            <div>Anomalie ({anomalies.length}):</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {anomalies.map((a: any) => (
                <span key={a.id}>{a.name}</span>
              ))}
            </div>
          </div>
        )}

        {damageSets.length > 0 && (
          <div>
            <div>Damage sets:</div>
            <div className="space-y-1">
              {damageSets.map((ds: any, i: number) => (
                <div key={`${ds.effect_name}-${i}`}>
                  <span className="font-medium">{ds.effect_name}</span>{' '}
                  <span>V:{ds.damage_veloce ?? '—'} P:{ds.damage_pesante ?? '—'} A:{ds.damage_affondo ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const importFromPreviousLevel = (idx: number) => {
    if (idx <= 0) return;

    if (type === 'weapon') {
      setLevels(prev => {
        const src = prev[idx - 1];
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          turn_duration_rounds: src.turn_duration_rounds,
          action_cost: src.action_cost,
          indicative_action_cost: src.indicative_action_cost,
          weapon: src.weapon ?? null,
        };
        return next;
      });
    } else if (type === 'entity') {
      setEntityLevels(prev => {
        const src = prev[idx - 1];
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          turn_duration_rounds: src.turn_duration_rounds,
          action_cost: src.action_cost,
          indicative_action_cost: src.indicative_action_cost,
          specifics: { ...src.specifics },
          stats: src.stats.map(r => ({ ...r })),
          hasEquipment: src.hasEquipment,
          equipment: src.hasEquipment ? src.equipment : null,
          spells: src.spells.map(s => ({ ...s })),
          abilities: src.abilities.map(a => ({ ...a })),
          damageEnabled: src.damageEnabled,
          damageSets: src.damageSets.slice(),
          assuredDamage: src.assuredDamage ?? null,
          additionalDamage: src.additionalDamage ?? null,
          damageByType: (src.damageByType || []).map(d => ({ ...d })),
        };
        return next;
      });
    } else {
      setReplicaLevels(prev => {
        const src = prev[idx - 1];
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          turn_duration_rounds: src.turn_duration_rounds,
          action_cost: src.action_cost,
          indicative_action_cost: src.indicative_action_cost,
          max_replicas: src.max_replicas,
          origin: src.origin,
          source_character_id: src.origin === 'specific' ? src.source_character_id : null,
        };
        return next;
      });
    }
  };

  const importFromNextLevel = (idx: number) => {
    if (type === 'weapon') {
      const nextIdx = idx + 1;
      if (nextIdx >= levels.length) return;
      setLevels(prev => {
        const src = prev[nextIdx];
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          turn_duration_rounds: src.turn_duration_rounds,
          action_cost: src.action_cost,
          indicative_action_cost: src.indicative_action_cost,
          weapon: src.weapon ?? next[idx].weapon ?? null,
        };
        return next;
      });
    } else if (type === 'entity') {
      const nextIdx = idx + 1;
      if (nextIdx >= entityLevels.length) return;
      setEntityLevels(prev => {
        const src = prev[nextIdx];
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          turn_duration_rounds: src.turn_duration_rounds,
          action_cost: src.action_cost,
          indicative_action_cost: src.indicative_action_cost,
          specifics: { ...src.specifics },
          stats: src.stats.map(r => ({ ...r })),
          hasEquipment: src.hasEquipment,
          equipment: src.hasEquipment ? src.equipment : null,
          spells: src.spells.map(s => ({ ...s })),
          abilities: src.abilities.map(a => ({ ...a })),
          damageEnabled: src.damageEnabled,
          damageSets: src.damageSets.slice(),
          assuredDamage: src.assuredDamage ?? null,
          additionalDamage: src.additionalDamage ?? null,
          damageByType: (src.damageByType || []).map(d => ({ ...d })),
        };
        return next;
      });
    } else {
      const nextIdx = idx + 1;
      if (nextIdx >= replicaLevels.length) return;
      setReplicaLevels(prev => {
        const src = prev[nextIdx];
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          turn_duration_rounds: src.turn_duration_rounds,
          action_cost: src.action_cost,
          indicative_action_cost: src.indicative_action_cost,
          max_replicas: src.max_replicas,
          origin: src.origin,
          source_character_id: src.origin === 'specific' ? src.source_character_id : null,
        };
        return next;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creazione Evocazione</DialogTitle>
          <DialogDescription>Imposta nome, tipo e livelli (10) per arma evocata, entità o replica.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome evocazione</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Lama Spirituale" />
              </div>
              <div className="space-y-2">
                <Label>Tipo evocazione</Label>
                {/* Selezione singola: weapon | entity | replica */}
                <Select value={type} onValueChange={(v) => setType(v as 'weapon' | 'entity' | 'replica')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo evocazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weapon">Arma evocata</SelectItem>
                    <SelectItem value="entity">Entità</SelectItem>
                    <SelectItem value="replica">Replica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Livelli (10)</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {(type === 'weapon' ? levels : type === 'entity' ? entityLevels : replicaLevels).map((lvl: any, idx: number) => (
                  <AccordionItem key={idx} value={`level-${idx + 1}`}>
                    <AccordionTrigger>Livello {idx + 1}</AccordionTrigger>
                    <AccordionContent>
                      {/* Toolbar in testa alla sezione livello */}
                      <div className="flex justify-end mb-2 gap-2">
                        {idx > 0 && (
                          <Button type="button" variant="secondary" onClick={() => importFromPreviousLevel(idx)}>
                            Copia dal livello precedente
                          </Button>
                        )}
                        {type !== 'replica' && (
                          <Button type="button" variant="secondary" onClick={() => importFromNextLevel(idx)}>
                            Importa dal livello successivo
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Durata turni</Label>
                          <Input
                            type="number"
                            value={lvl.turn_duration_rounds}
                            onChange={(e) => {
                              if (type === 'weapon') {
                                const next = [...levels];
                                next[idx] = { ...next[idx], turn_duration_rounds: Number(e.target.value) };
                                setLevels(next);
                              } else if (type === 'entity') {
                                const next = [...entityLevels];
                                next[idx] = { ...next[idx], turn_duration_rounds: Number(e.target.value) };
                                setEntityLevels(next);
                              } else {
                                const next = [...replicaLevels];
                                next[idx] = { ...next[idx], turn_duration_rounds: Number(e.target.value) };
                                setReplicaLevels(next);
                              }
                            }}
                            onBlur={() => {
                              if (type === 'weapon') {
                                propagateWeaponNumber(idx, 'turn_duration_rounds');
                              } else if (type === 'entity') {
                                propagateEntityNumberZeroDefault(idx, 'turn_duration_rounds');
                              } else {
                                propagateReplicaNumber(idx, 'turn_duration_rounds');
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Costo PA</Label>
                          <Input
                            type="number"
                            value={lvl.action_cost}
                            onChange={(e) => {
                              if (type === 'weapon') {
                                const next = [...levels];
                                next[idx] = { ...next[idx], action_cost: Number(e.target.value) };
                                setLevels(next);
                              } else if (type === 'entity') {
                                const next = [...entityLevels];
                                next[idx] = { ...next[idx], action_cost: Number(e.target.value) };
                                setEntityLevels(next);
                              } else {
                                const next = [...replicaLevels];
                                next[idx] = { ...next[idx], action_cost: Number(e.target.value) };
                                setReplicaLevels(next);
                              }
                            }}
                            onBlur={() => {
                              if (type === 'weapon') {
                                propagateWeaponNumber(idx, 'action_cost');
                              } else if (type === 'entity') {
                                propagateEntityNumberZeroDefault(idx, 'action_cost');
                              } else {
                                propagateReplicaNumber(idx, 'action_cost');
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Costo PA indicativo</Label>
                          <Input
                            type="number"
                            value={lvl.indicative_action_cost}
                            onChange={(e) => {
                              if (type === 'weapon') {
                                const next = [...levels];
                                next[idx] = { ...next[idx], indicative_action_cost: Number(e.target.value) };
                                setLevels(next);
                              } else if (type === 'entity') {
                                const next = [...entityLevels];
                                next[idx] = { ...next[idx], indicative_action_cost: Number(e.target.value) };
                                setEntityLevels(next);
                              } else {
                                const next = [...replicaLevels];
                                next[idx] = { ...next[idx], indicative_action_cost: Number(e.target.value) };
                                setReplicaLevels(next);
                              }
                            }}
                            onBlur={() => {
                              if (type === 'weapon') {
                                propagateWeaponNumber(idx, 'indicative_action_cost');
                              } else if (type === 'entity') {
                                propagateEntityNumberZeroDefault(idx, 'indicative_action_cost');
                              } else {
                                propagateReplicaNumber(idx, 'indicative_action_cost');
                              }
                            }}
                          />
                        </div>
                      </div>

                      {type === 'weapon' && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Configurazione arma evocata</div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => openConfigForLevel(idx)}>Configura arma</Button>
                              {idx > 0 && levels[idx - 1]?.weapon && (
                                <Button type="button" variant="outline" onClick={() => copyWeaponFromLevel(idx - 1, idx)}>
                                  Copia dal livello precedente
                                </Button>
                              )}
                              {lvl.weapon && (
                                <Button type="button" variant="outline" onClick={() => applyWeaponToFollowing(idx)}>
                                  Applica ai successivi
                                </Button>
                              )}
                              {lvl.weapon && (
                                <Button type="button" variant="destructive" onClick={() => removeWeaponAtLevel(idx)}>
                                  Rimuovi arma
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="rounded-md border p-3">
                            {renderEquipmentSummary(lvl.weapon)}
                          </div>
                        </div>
                      )}

                      {type === 'entity' && (
                        <div className="mt-4 space-y-6">
                          {/* Specifiche */}
                          <div>
                            <div className="text-sm font-medium mb-2">Specifiche (opzionali)</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Armatura</Label>
                                <Input type="number" value={lvl.specifics?.armor ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    const next = [...entityLevels];
                                    next[idx] = { ...next[idx], specifics: { ...next[idx].specifics, armor: val } };
                                    setEntityLevels(next);
                                  }}
                                  onBlur={() => {
                                    propagateNumber(idx, l => l.specifics.armor ?? null, (l, v) => ({ ...l, specifics: { ...l.specifics, armor: v } }));
                                  }} />
                              </div>
                              <div className="space-y-2">
                                <Label>Salute</Label>
                                <Input type="number" value={lvl.specifics?.health ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    const next = [...entityLevels];
                                    next[idx] = { ...next[idx], specifics: { ...next[idx].specifics, health: val } };
                                    setEntityLevels(next);
                                  }}
                                  onBlur={() => {
                                    propagateNumber(idx, l => l.specifics.health ?? null, (l, v) => ({ ...l, specifics: { ...l.specifics, health: v } }));
                                  }} />
                              </div>
                              <div className="space-y-2">
                                <Label>Punti Azione</Label>
                                <Input type="number" value={lvl.specifics?.action_points ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    const next = [...entityLevels];
                                    next[idx] = { ...next[idx], specifics: { ...next[idx].specifics, action_points: val } };
                                    setEntityLevels(next);
                                  }}
                                  onBlur={() => {
                                    propagateNumber(idx, l => l.specifics.action_points ?? null, (l, v) => ({ ...l, specifics: { ...l.specifics, action_points: v } }));
                                  }} />
                              </div>
                            </div>
                          </div>

                          {/* Statistiche */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium">Statistiche (opzionali)</div>
                              {idx > 0 && !isEmptyStats(entityLevels[idx - 1].stats) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyEntityStatsFromLevel(idx - 1, idx)}
                                >
                                  Copia dal livello precedente
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {lvl.stats.map((row: StatRow, rIdx: number) => (
                                <div key={`${row.statKey}-${rIdx}`} className="space-y-1">
                                  <Label className="text-sm capitalize">{row.statKey}</Label>
                                  <Input type="number" value={row.amount}
                                    onChange={(e) => {
                                      const val = Number(e.target.value || 0);
                                      const next = [...entityLevels];
                                      const stats = next[idx].stats.slice();
                                      stats[rIdx] = { ...stats[rIdx], amount: val };
                                      next[idx] = { ...next[idx], stats };
                                      setEntityLevels(next);
                                    }}
                                    onBlur={() => {
                                      propagateStats(idx);
                                    }} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Equipaggiamento */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Equipaggiamento</div>
                              <Switch checked={lvl.hasEquipment} onCheckedChange={() => {
                                const next = [...entityLevels];
                                const toggled = !next[idx].hasEquipment;
                                next[idx] = { ...next[idx], hasEquipment: toggled };
                                setEntityLevels(next);
                                if (toggled) propagateArray(idx, l => l.equipment ? [l.equipment] : [], (l, arr) => ({ ...l, equipment: arr[0] || null }));
                              }} />
                              {/* Fallback toggle via bottone */}
                              <Button variant="ghost" size="sm" className="ml-2"
                                onClick={() => {
                                  const next = [...entityLevels];
                                  next[idx] = { ...next[idx], hasEquipment: !next[idx].hasEquipment };
                                  setEntityLevels(next);
                                }}>
                                Toggle
                              </Button>
                            </div>
                            {lvl.hasEquipment && (
                              <div className="mt-2 space-y-2">
                                <div className="flex gap-2 flex-wrap">
                                  <Button variant="outline" onClick={() => openConfigForLevel(idx)}>
                                    Configura equipaggiamento
                                  </Button>
                                  {idx > 0 && entityLevels[idx - 1]?.equipment && (
                                    <Button type="button" variant="outline" onClick={() => copyEntityEquipmentFromLevel(idx - 1, idx)}>
                                      Copia dal livello precedente
                                    </Button>
                                  )}
                                  {lvl.equipment && (
                                    <Button type="button" variant="outline" onClick={() => applyEntityEquipmentToFollowing(idx)}>
                                      Applica ai successivi
                                    </Button>
                                  )}
                                  {lvl.equipment && (
                                    <Button type="button" variant="destructive" onClick={() => removeEntityEquipmentAtLevel(idx)}>
                                      Rimuovi equipaggiamento
                                    </Button>
                                  )}
                                </div>
                                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                                  {renderEquipmentSummary(lvl.equipment)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Magie e Abilità (multi-selezione tipo character) */}
                          <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Magie */}
                              <div>
                                <div className="text-sm font-medium mb-2">Magie</div>
                                <Button
                                  className="bg-purple-600 hover:bg-purple-700"
                                  onClick={() => { setImportingLevelIndex(idx); setSpellImportOpen(true); }}
                                >
                                  Importa Magia dal Database
                                </Button>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {lvl.spells.map((s: any) => (
                                    <Badge key={`${s.id}-${s.level}`} className="bg-purple-600">
                                      {s.name} L{s.level}
                                      <Button size="sm" variant="ghost" className="ml-2 px-1"
                                        onClick={() => {
                                          const next = [...entityLevels];
                                          next[idx] = { ...next[idx], spells: next[idx].spells.filter(x => !(x.id === s.id && x.level === s.level)) };
                                          setEntityLevels(next);
                                        }}>×</Button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              {/* Abilità */}
                              <div>
                                <div className="text-sm font-medium mb-2">Abilità</div>
                                <Button
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => { setImportingLevelIndex(idx); setAbilityImportOpen(true); }}
                                >
                                  Importa Abilità dal Database
                                </Button>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {lvl.abilities.map((a: any) => (
                                    <Badge key={`${a.id}-${a.level}`} className="bg-blue-600">
                                      {a.name} L{a.level}
                                      <Button size="sm" variant="ghost" className="ml-2 px-1"
                                        onClick={() => {
                                          const next = [...entityLevels];
                                          next[idx] = { ...next[idx], abilities: next[idx].abilities.filter(x => !(x.id === a.id && x.level === a.level)) };
                                          setEntityLevels(next);
                                        }}>×</Button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Danno */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Danno</div>
                              <Switch checked={lvl.damageEnabled} onCheckedChange={() => {
                                const next = [...entityLevels];
                                const toggled = !next[idx].damageEnabled;
                                next[idx] = { ...next[idx], damageEnabled: toggled };
                                setEntityLevels(next);
                                if (toggled) {
                                  propagateArray(idx, l => l.damageSets, (l, arr) => ({ ...l, damageSets: arr.slice() }));
                                  propagateNumber(idx, l => l.assuredDamage ?? null, (l, v) => ({ ...l, assuredDamage: v ?? null }));
                                  propagateNumber(idx, l => l.additionalDamage ?? null, (l, v) => ({ ...l, additionalDamage: v ?? null }));
                                }
                              }} />
                              {/* Fallback: click sul titolo per togglare */}
                              <Button variant="ghost" size="sm" className="ml-2"
                                onClick={() => {
                                  const next = [...entityLevels];
                                  next[idx] = { ...next[idx], damageEnabled: !next[idx].damageEnabled };
                                  setEntityLevels(next);
                                }}>
                                Toggle
                              </Button>
                            </div>
                            {lvl.damageEnabled && (
                              <div className="mt-2 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label>Tipologie di danno</Label>
                                  <Button variant="outline" size="sm"
                                    onClick={() => {
                                      setEditingDamageIndex(idx);
                                      setDamageSelectionDraft(new Set((entityLevels[idx].damageByType || []).map(d => d.effect_id)));
                                      setDamageSelectOpen(true);
                                    }}>
                                    Seleziona tipologie danno
                                  </Button>
                                </div>

                                {/* Lista per-tipologia con campi danno */}
                                <div className="space-y-2">
                                  {lvl.damageByType.length === 0 && (
                                    <div className="text-xs text-muted-foreground">Nessuna tipologia selezionata</div>
                                  )}
                                  {lvl.damageByType.map((d:any) => (
                                    <div key={d.effect_id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                      <div>
                                        <Label className="text-xs">Tipo</Label>
                                        <div className="text-sm font-medium">{d.name}</div>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Assicurato</Label>
                                        <Input type="number" value={d.assured_damage ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            const next = [...entityLevels];
                                            next[idx] = {
                                              ...next[idx],
                                              damageByType: next[idx].damageByType.map(x => x.effect_id === d.effect_id ? { ...x, assured_damage: val } : x)
                                            };
                                            setEntityLevels(next);
                                          }} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Aggiuntivo</Label>
                                        <div className="flex gap-2">
                                          <Input type="number" value={d.additional_damage ?? ''}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? null : Number(e.target.value);
                                              const next = [...entityLevels];
                                              next[idx] = {
                                                ...next[idx],
                                                damageByType: next[idx].damageByType.map(x => x.effect_id === d.effect_id ? { ...x, additional_damage: val } : x)
                                              };
                                              setEntityLevels(next);
                                            }} />
                                          <Button variant="ghost" size="sm"
                                            onClick={() => {
                                              const next = [...entityLevels];
                                              next[idx] = {
                                                ...next[idx],
                                                damageByType: next[idx].damageByType.filter(x => x.effect_id !== d.effect_id)
                                              };
                                              // aggiorna anche damageSets
                                              next[idx].damageSets = next[idx].damageByType.map(x => x.effect_id);
                                              setEntityLevels(next);
                                            }}>×</Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {type === 'replica' && (
                        <div className="mt-4 space-y-6">
                          <div>
                            <div className="text-sm font-medium mb-2">Replica dal personaggio</div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Quando usata, crea una forma energetica basata sui dati del personaggio che lancia.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Numero massimo di repliche</Label>
                                // Replica: numero massimo
                                <Input
                                  type="number"
                                  value={lvl.max_replicas}
                                  onChange={(e) => {
                                    const next = [...replicaLevels];
                                    next[idx] = { ...next[idx], max_replicas: Math.max(1, Number(e.target.value) || 1) };
                                    setReplicaLevels(next);
                                  }}
                                  onBlur={() => {
                                    propagateReplicaNumber(idx, 'max_replicas');
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Origine dati</Label>
                                <Select
                                  value={lvl.origin}
                                  onValueChange={(v) => {
                                    const base = [...replicaLevels];
                                    const val = (v as 'caster' | 'target' | 'specific');
                                    base[idx] = { ...base[idx], origin: val, source_character_id: val === 'specific' ? base[idx].source_character_id : null };
                                    const propagated = propagateReplicaOriginPure(base, idx);
                                    setReplicaLevels(propagated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona origine dati" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="caster">Dal personaggio che lancia</SelectItem>
                                    <SelectItem value="target">Dal personaggio bersagliato</SelectItem>
                                    <SelectItem value="specific">Da personaggio specifico</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {lvl.origin === 'specific' && (
                                <div className="space-y-2">
                                  <Label>Personaggio specifico</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="text"
                                      value={lvl.source_character_id || ''}
                                      onChange={(e) => {
                                        const next = [...replicaLevels];
                                        next[idx] = { ...next[idx], source_character_id: e.target.value || null };
                                        setReplicaLevels(next);
                                      }}
                                      placeholder="uuid del personaggio"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => { setSelectingCharacterLevelIndex(idx); setCharacterSelectorOpen(true); }}
                                    >
                                      Seleziona
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">Puoi incollare l'UUID o usare la selezione.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salva evocazione</Button>
        </DialogFooter>

        {/* Finestra selezione tipologie di danno */}
        <Dialog open={damageSelectOpen} onOpenChange={setDamageSelectOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Seleziona tipologie di danno</DialogTitle>
              <DialogDescription>Attiva una o più tipologie. Alla conferma potrai impostare i danni per ciascuna.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[360px] w-full">
                <div className="space-y-2 pr-2">
                  {damageEffects.map((eff) => {
                    const selected = damageSelectionDraft.has(eff.id);
                    return (
                      <div key={eff.id} className="flex items-center justify-between border rounded px-3 py-2">
                        <div className="text-sm">{eff.name}</div>
                        <Button size="sm" variant={selected ? 'default' : 'outline'}
                          onClick={() => {
                            const next = new Set(damageSelectionDraft);
                            if (selected) next.delete(eff.id); else next.add(eff.id);
                            setDamageSelectionDraft(next);
                          }}>
                          {selected ? 'Selezionata' : 'Seleziona'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDamageSelectOpen(false)}>Annulla</Button>
              <Button onClick={() => {
                if (editingDamageIndex == null) { setDamageSelectOpen(false); return; }
                const idx = editingDamageIndex;
                const selectedIds = Array.from(damageSelectionDraft);
                const current = entityLevels[idx].damageByType || [];
                const nextMap = new Map(current.map(d => [d.effect_id, d]));
                // aggiungi nuove selezioni con valori di default
                for (const id of selectedIds) {
                  if (!nextMap.has(id)) {
                    const eff = damageEffects.find((e:any) => e.id === id);
                    nextMap.set(id, {
                      effect_id: id,
                      name: eff?.name || id,
                      assured_damage: null,
                      additional_damage: null,
                    });
                  }
                }
                // rimuovi le deselezioni
                for (const k of Array.from(nextMap.keys())) {
                  if (!selectedIds.includes(k)) nextMap.delete(k);
                }
                const next = [...entityLevels];
                next[idx] = {
                  ...next[idx],
                  damageByType: Array.from(nextMap.values()),
                  damageSets: Array.from(nextMap.keys()),
                };
                setEntityLevels(next);
                setEditingDamageIndex(null);
                setDamageSelectOpen(false);
              }}>Conferma</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modale equipaggiamento riusata per definire arma/equipaggiamento */}
        <EquipmentModal
          isOpen={equipmentModalOpen}
          onClose={() => { setEquipmentModalOpen(false); setEditingLevelIndex(null); }}
          onSave={handleSaveEquipment}
          editingItem={editingEquipment}
          canEquipItem={canEquipItem as any}
        />

        {/* Modali import per magie/abilità (uso inline) */}
        <ImportSpellModal
          isOpen={spellImportOpen}
          onOpenChange={(open) => { setSpellImportOpen(open); if (!open) setImportingLevelIndex(null); }}
          mode="inline"
          preselectedSection={spellSectionKey ?? undefined}
          preselectedCategory={spellCategoryKey ?? undefined}
          preselectedGrade={spellGrade ?? undefined}
          onConfirm={({ spell, level }) => {
            const idx = importingLevelIndex ?? 0;
            const next = [...entityLevels];
            next[idx] = {
              ...next[idx],
              spells: [...next[idx].spells, { id: spell.id, name: spell.name, level }]
            };
            setEntityLevels(next);
          }}
        />

        <ImportAbilityModal
          isOpen={abilityImportOpen}
          onOpenChange={(open) => { setAbilityImportOpen(open); if (!open) setImportingLevelIndex(null); }}
          mode="inline"
          preselectedSection={abilitySectionKey ?? undefined}
          preselectedCategory={abilityCategoryKey ?? undefined}
          preselectedGrade={abilityGrade ?? undefined}
          onConfirm={({ ability, level }) => {
            const idx = importingLevelIndex ?? 0;
            const next = [...entityLevels];
            next[idx] = {
              ...next[idx],
              abilities: [...next[idx].abilities, { id: ability.id, name: ability.name, level }]
            };
            setEntityLevels(next);
          }}
        />

        {/* Selettore personaggi per Replica -> origine specifica */}
        <CharacterSelector
          isOpen={characterSelectorOpen}
          onClose={() => { setCharacterSelectorOpen(false); setSelectingCharacterLevelIndex(null); }}
          onCharacterSelect={(characterId: string) => {
            if (selectingCharacterLevelIndex == null) return;
            const next = [...replicaLevels];
            next[selectingCharacterLevelIndex] = { ...next[selectingCharacterLevelIndex], source_character_id: characterId };
            setReplicaLevels(next);
            setCharacterSelectorOpen(false);
            setSelectingCharacterLevelIndex(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default EvocationAdminModal;