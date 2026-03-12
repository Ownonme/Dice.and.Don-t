import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EquipmentItem, ARMOR_SUBTYPES, WEAPON_SUBTYPES, WeaponData, WeaponDamageSet, StatusAnomaly } from '@/types/character';
import { readSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';
import { listMaterials } from '@/integrations/supabase/materials';
import { listWeaponTypes } from '@/integrations/supabase/weaponTypes';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { Switch } from '@/components/ui/switch';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal';
import { ImportSpellModal } from '@/components/magic/ImportSpellModal';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: EquipmentItem) => void;
  editingItem?: EquipmentItem | null;
  canEquipItem?: (item: EquipmentItem) => boolean;
}

const EquipmentModal = ({ isOpen, onClose, onSave, editingItem, canEquipItem }: EquipmentModalProps) => {
  const [formData, setFormData] = useState<Partial<EquipmentItem>>({
    name: '',
    type: 'armatura',
    subtype: '',
    description: '',
    weight: 0,
    armor: 0,
    damage: 0,
    damageVeloce: 0,
    damagePesante: 0,
    damageAffondo: 0,
    stats: {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0
    },
    custom_specifics: [],
    data: {
      material_id: null,
      material_name: null,
      weapon_type_id: null,
      weapon_type_name: null,
      weapon_type_category: null,
      weapon_subtype_detail: null,
      damage_sets: []
    }
  });

  // Liste da Supabase per materiale e weapon_types
  const [materials, setMaterials] = useState<any[]>([]);
  const [weaponTypes, setWeaponTypes] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [loadingWeaponTypes, setLoadingWeaponTypes] = useState<boolean>(false);
  const [damageEffectOptions, setDamageEffectOptions] = useState<any[]>([]);
  const [loadingDamageEffects, setLoadingDamageEffects] = useState<boolean>(false);
  const [statusAnomaliesEnabled, setStatusAnomaliesEnabled] = useState<boolean>(false);
  const [anomalyModalOpen, setAnomalyModalOpen] = useState<boolean>(false);
  const [powerUnlockEnabled, setPowerUnlockEnabled] = useState<boolean>(false);
  const [abilitySelectorOpen, setAbilitySelectorOpen] = useState<boolean>(false);
  const [spellSelectorOpen, setSpellSelectorOpen] = useState<boolean>(false);
  const [specificCatalog, setSpecificCatalog] = useState<CharacterSpecificCatalogItem[]>(() => readSpecificCatalog());

  const normalizeCustomSpecifics = (list: any[]) => {
    const map = new Map<string, { id: string; name: string; max: number }>();
    (Array.isArray(list) ? list : []).forEach((row: any) => {
      const id = String(row?.id ?? '').trim();
      const name = String(row?.name ?? '').trim();
      const key = id || name;
      if (!key) return;
      const max = Number(row?.max ?? row?.value ?? 0) || 0;
      if (max <= 0) return;
      const prev = map.get(key);
      map.set(key, {
        id: id || prev?.id || '',
        name: name || prev?.name || '',
        max: (prev?.max ?? 0) + max,
      });
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    if (isOpen) setSpecificCatalog(readSpecificCatalog());
  }, [isOpen]);

  // Aggiungo useEffect per sincronizzare lo stato con editingItem
  useEffect(() => {
    if (editingItem) {
      const existingAbilities = ((editingItem as any)?.unlockedPowers?.abilities || []) as Array<any>;
      const existingSpells = ((editingItem as any)?.unlockedPowers?.spells || []) as Array<any>;
      const rawData = (((editingItem as any).data) || {}) as WeaponData;
      const altArr = Array.isArray((rawData as any)?.alternate_damages) ? (rawData as any).alternate_damages : [];
      const legacyAlt = (rawData as any)?.alternate_damage;
      const normalizedAltArr = altArr.length > 0 ? altArr : (legacyAlt ? [legacyAlt] : []);
      const normalizedData: WeaponData = {
        material_id: null,
        material_name: null,
        weapon_type_id: null,
        weapon_type_name: null,
        weapon_type_category: null,
        weapon_subtype_detail: null,
        damage_sets: [],
        ...rawData,
        ...(normalizedAltArr.length > 0 ? { alternate_damages: normalizedAltArr } : {})
      };
      setPowerUnlockEnabled(existingAbilities.length > 0 || existingSpells.length > 0);
      setFormData({
        name: editingItem.name || '',
        type: editingItem.type || 'armatura',
        subtype: editingItem.subtype || '',
        description: editingItem.description || '',
        weight: editingItem.weight || 0,
        armor: editingItem.armor || 0,
        damage: editingItem.damage || 0,
        damageVeloce: editingItem.damageVeloce || 0,
        damagePesante: editingItem.damagePesante || 0,
        damageAffondo: editingItem.damageAffondo || 0,
        stats: editingItem.stats || {
          forza: 0,
          percezione: 0,
          resistenza: 0,
          intelletto: 0,
          agilita: 0,
          sapienza: 0,
          anima: 0
        },
        statusAnomalies: (editingItem as any).statusAnomalies || [],
        unlockedPowers: {
          abilities: existingAbilities,
          spells: existingSpells,
        },
        custom_specifics: (editingItem as any).custom_specifics || [],
        data: normalizedData
      });
    } else {
      // Reset form quando non c'è editingItem (nuovo oggetto)
      setPowerUnlockEnabled(false);
      setFormData({
        name: '',
        type: 'armatura',
        subtype: '',
        description: '',
        weight: 0,
        armor: 0,
        damage: 0,
        damageVeloce: 0,
        damagePesante: 0,
        damageAffondo: 0,
        stats: {
          forza: 0,
          percezione: 0,
          resistenza: 0,
          intelletto: 0,
          agilita: 0,
          sapienza: 0,
          anima: 0
        },
        statusAnomalies: [],
        unlockedPowers: {
          abilities: [],
          spells: [],
        },
        custom_specifics: [],
        data: {
          material_id: null,
          material_name: null,
          weapon_type_id: null,
          weapon_type_name: null,
          weapon_type_category: null,
          weapon_subtype_detail: null,
          damage_sets: []
        }
      });
    }
  }, [editingItem]);

  // Abilita automaticamente lo switch se ci sono anomalie presenti
  useEffect(() => {
    setStatusAnomaliesEnabled((formData.statusAnomalies?.length || 0) > 0);
  }, [formData.statusAnomalies]);

  // Caricamento liste da Supabase quando la modale è aperta e tipo è arma
  useEffect(() => {
    const loadLists = async () => {
      try {
        setLoadingMaterials(true);
        setLoadingWeaponTypes(true);
        const [mat, wt] = await Promise.all([
          listMaterials(),
          listWeaponTypes()
        ]);
        setMaterials(mat || []);
        setWeaponTypes(wt || []);
      } catch (e) {
        console.error('Errore caricamento liste materiali/weapon_types', e);
      } finally {
        setLoadingMaterials(false);
        setLoadingWeaponTypes(false);
      }
    };
    if (isOpen && formData.type === 'arma') loadLists();
  }, [isOpen, formData.type]);

  // Caricamento damage_effects da Supabase per tipi di danno
  useEffect(() => {
    const loadDamageEffects = async () => {
      try {
        setLoadingDamageEffects(true);
        const list = await listDamageEffects();
        setDamageEffectOptions(list || []);
      } catch (e) {
        console.error('Errore caricamento damage_effects', e);
      } finally {
        setLoadingDamageEffects(false);
      }
    };
    if (isOpen && formData.type === 'arma') loadDamageEffects();
  }, [isOpen, formData.type]);

  // Gestione set di danno nominati
  const addDamageSet = () => {
    setFormData(prev => ({
      ...prev,
      data: {
        ...(prev.data as WeaponData),
        damage_sets: [
          ...((prev.data?.damage_sets as WeaponDamageSet[]) || []),
          {
            effect_name: '',
            damage_veloce: 0,
            damage_pesante: 0,
            damage_affondo: 0,
            calculated_damage_veloce: 0,
            calculated_damage_pesante: 0,
            calculated_damage_affondo: 0
          }
        ]
      }
    }));
  };

  const updateDamageSet = (index: number, patch: Partial<WeaponDamageSet>) => {
    setFormData(prev => {
      const current = ((prev.data?.damage_sets as WeaponDamageSet[]) || []).slice();
      if (!current[index]) return prev;
      const merged = { ...current[index], ...patch } as WeaponDamageSet;
      const dv = Number(merged.damage_veloce || 0);
      const dp = Number(merged.damage_pesante || 0);
      const da = Number(merged.damage_affondo || 0);
      merged.calculated_damage_veloce = Math.floor(dv * 0.33);
      merged.calculated_damage_pesante = Math.floor(dp * 0.33);
      merged.calculated_damage_affondo = Math.floor(da * 0.33);
      current[index] = merged;
      return {
        ...prev,
        data: { ...(prev.data as WeaponData), damage_sets: current }
      };
    });
  };

  const removeDamageSet = (index: number) => {
    setFormData(prev => {
      const current = ((prev.data?.damage_sets as WeaponDamageSet[]) || []).slice();
      current.splice(index, 1);
      return {
        ...prev,
        data: { ...(prev.data as WeaponData), damage_sets: current }
      };
    });
  };

  const setAlternateDamagesEnabled = (enabled: boolean) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      if (!enabled) {
        const { alternate_damage: _legacyIgnored, alternate_damages: _ignored, ...rest } = currentData as any;
        return { ...prev, data: rest as WeaponData };
      }
      const existing =
        Array.isArray((currentData as any)?.alternate_damages)
          ? ((currentData as any).alternate_damages as any[])
          : ((currentData as any)?.alternate_damage ? [(currentData as any).alternate_damage] : []);
      const next = existing.length > 0 ? existing : [{ name: '', damage_sets: [] }];
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const addAlternateDamage = () => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const current = Array.isArray((currentData as any)?.alternate_damages) ? ((currentData as any).alternate_damages as any[]) : [];
      const next = [...current, { name: '', damage_sets: [] }];
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const removeAlternateDamage = (damageIndex: number) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const current = Array.isArray((currentData as any)?.alternate_damages) ? ((currentData as any).alternate_damages as any[]) : [];
      const next = current.slice();
      next.splice(damageIndex, 1);
      if (next.length === 0) {
        const { alternate_damage: _legacyIgnored, alternate_damages: _ignored, ...rest } = currentData as any;
        return { ...prev, data: rest as WeaponData };
      }
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const setAlternateDamageName = (damageIndex: number, name: string) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const current = Array.isArray((currentData as any)?.alternate_damages) ? ((currentData as any).alternate_damages as any[]) : [];
      if (!current[damageIndex]) return prev;
      const next = current.slice();
      next[damageIndex] = { ...(next[damageIndex] || {}), name };
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const addAlternateDamageSet = (damageIndex: number) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const current = Array.isArray((currentData as any)?.alternate_damages) ? ((currentData as any).alternate_damages as any[]) : [];
      if (!current[damageIndex]) return prev;
      const next = current.slice();
      const currAlt = next[damageIndex] || {};
      const currSets = Array.isArray((currAlt as any)?.damage_sets) ? ((currAlt as any).damage_sets as WeaponDamageSet[]) : [];
      const nextSets = [
        ...currSets,
        {
          effect_name: '',
          damage_veloce: 0,
          damage_pesante: 0,
          damage_affondo: 0,
          calculated_damage_veloce: 0,
          calculated_damage_pesante: 0,
          calculated_damage_affondo: 0
        } as WeaponDamageSet
      ];
      next[damageIndex] = { ...currAlt, damage_sets: nextSets };
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const updateAlternateDamageSet = (damageIndex: number, setIndex: number, patch: Partial<WeaponDamageSet>) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const current = Array.isArray((currentData as any)?.alternate_damages) ? ((currentData as any).alternate_damages as any[]) : [];
      if (!current[damageIndex]) return prev;
      const next = current.slice();
      const currAlt = next[damageIndex] || {};
      const currSets = Array.isArray((currAlt as any)?.damage_sets) ? ((currAlt as any).damage_sets as WeaponDamageSet[]) : [];
      const sets = currSets.slice();
      if (!sets[setIndex]) return prev;
      const merged = { ...sets[setIndex], ...patch } as WeaponDamageSet;
      const dv = Number(merged.damage_veloce || 0);
      const dp = Number(merged.damage_pesante || 0);
      const da = Number(merged.damage_affondo || 0);
      merged.calculated_damage_veloce = Math.floor(dv * 0.33);
      merged.calculated_damage_pesante = Math.floor(dp * 0.33);
      merged.calculated_damage_affondo = Math.floor(da * 0.33);
      sets[setIndex] = merged;
      next[damageIndex] = { ...currAlt, damage_sets: sets };
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const removeAlternateDamageSet = (damageIndex: number, setIndex: number) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const current = Array.isArray((currentData as any)?.alternate_damages) ? ((currentData as any).alternate_damages as any[]) : [];
      if (!current[damageIndex]) return prev;
      const next = current.slice();
      const currAlt = next[damageIndex] || {};
      const currSets = Array.isArray((currAlt as any)?.damage_sets) ? ((currAlt as any).damage_sets as WeaponDamageSet[]) : [];
      const sets = currSets.slice();
      sets.splice(setIndex, 1);
      next[damageIndex] = { ...currAlt, damage_sets: sets };
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damages: next,
          alternate_damage: next[0],
        }
      };
    });
  };

  const handleStatChange = (stat: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.type || !formData.subtype) return;

    const computedSets = ((formData.data?.damage_sets as WeaponDamageSet[]) || []).map((ds) => ({
      ...ds,
      calculated_damage_veloce: Math.floor(Number(ds.damage_veloce || 0) * 0.33),
      calculated_damage_pesante: Math.floor(Number(ds.damage_pesante || 0) * 0.33),
      calculated_damage_affondo: Math.floor(Number(ds.damage_affondo || 0) * 0.33),
    }));

    const altDamagesRaw =
      Array.isArray((formData.data as any)?.alternate_damages)
        ? ((formData.data as any).alternate_damages as any[])
        : ((formData.data as any)?.alternate_damage ? [(formData.data as any).alternate_damage] : []);
    const altEnabled = altDamagesRaw.some((a: any) => {
      const n = String(a?.name || '').trim();
      const sets = Array.isArray(a?.damage_sets) ? a.damage_sets : [];
      return !!n || sets.length > 0;
    });
    const computedAltDamages = altDamagesRaw.map((a: any) => {
      const sets = Array.isArray(a?.damage_sets) ? (a.damage_sets as WeaponDamageSet[]) : [];
      const computedAltSets = sets.map((ds) => ({
        ...ds,
        calculated_damage_veloce: Math.floor(Number(ds.damage_veloce || 0) * 0.33),
        calculated_damage_pesante: Math.floor(Number(ds.damage_pesante || 0) * 0.33),
        calculated_damage_affondo: Math.floor(Number(ds.damage_affondo || 0) * 0.33),
      }));
      return {
        name: String(a?.name || '').trim(),
        damage_sets: computedAltSets.filter(s => String(s.effect_name || '').trim()),
      };
    });
    const cleanedAltDamages = computedAltDamages.filter((a: any) => String(a?.name || '').trim() && Array.isArray(a?.damage_sets) && a.damage_sets.length > 0);
    const cleanedCustomSpecifics = normalizeCustomSpecifics((formData as any).custom_specifics);

    if (formData.type === 'arma' && altEnabled) {
      if (cleanedAltDamages.length === 0) {
        alert('Completa almeno un danno alternativo (nome + almeno un effetto).');
        return;
      }
      for (const a of cleanedAltDamages) {
        if (!String(a?.name || '').trim()) {
          alert('Inserisci il nome del danno alternativo.');
          return;
        }
        if (!Array.isArray(a?.damage_sets) || a.damage_sets.length === 0) {
          alert('Aggiungi almeno un damage effect per ogni danno alternativo.');
          return;
        }
      }
    }

    const item: EquipmentItem = {
      id: editingItem?.id || crypto.randomUUID(),
      name: formData.name,
      type: formData.type as 'armatura' | 'arma',
      subtype: formData.subtype,
      description: formData.description || '',
      weight: parseFloat(formData.weight.toString()) || 0,
      stats: formData.stats || {},
      ...(formData.type === 'armatura' && { armor: formData.armor || 0 }),
      ...(formData.type === 'arma' && { 
        damageVeloce: formData.damageVeloce || 0,
        damagePesante: formData.damagePesante || 0,
        damageAffondo: formData.damageAffondo || 0,
        calculatedDamageVeloce: Math.floor((formData.damageVeloce || 0) * 0.33),
        calculatedDamagePesante: Math.floor((formData.damagePesante || 0) * 0.33),
        calculatedDamageAffondo: Math.floor((formData.damageAffondo || 0) * 0.33)
      }),
      statusAnomalies: statusAnomaliesEnabled ? (formData.statusAnomalies || []) : [],
      ...(powerUnlockEnabled &&
        (((formData.unlockedPowers?.abilities?.length || 0) > 0) || ((formData.unlockedPowers?.spells?.length || 0) > 0))
        ? { unlockedPowers: formData.unlockedPowers }
        : {}),
      ...(cleanedCustomSpecifics.length > 0 ? { custom_specifics: cleanedCustomSpecifics } : {}),
      data: {
        ...(formData.data as WeaponData),
        damage_sets: computedSets,
        ...(formData.type === 'arma' && altEnabled && cleanedAltDamages.length > 0
          ? {
              alternate_damages: cleanedAltDamages,
              alternate_damage: cleanedAltDamages[0],
            }
          : {})
      } as WeaponData
    };

    // Controlla se l'oggetto può essere equipaggiato (con verifica di sicurezza)
    if (canEquipItem && typeof canEquipItem === 'function' && !canEquipItem(item)) {
      alert('Non puoi equipaggiare questo oggetto: limite massimo raggiunto per questo tipo di equipaggiamento.');
      return;
    }

    onSave(item);
    onClose();
    
    // Reset form
    setPowerUnlockEnabled(false);
    setFormData({
      name: '',
      type: 'armatura',
      subtype: '',
      description: '',
      weight: 0,
      armor: 0,
      damage: 0,
      damageVeloce: 0,
      damagePesante: 0,
      damageAffondo: 0,
      stats: {
        forza: 0, percezione: 0, resistenza: 0,
        intelletto: 0, agilita: 0, sapienza: 0, anima: 0
      },
      data: {
        material_id: null,
        material_name: null,
        weapon_type_id: null,
        weapon_type_name: null,
        weapon_type_category: null,
        weapon_subtype_detail: null,
        damage_sets: []
      },
      statusAnomalies: [],
      unlockedPowers: {
        abilities: [],
        spells: [],
      },
    });
  };

  const availableSubtypes = formData.type === 'armatura' ? ARMOR_SUBTYPES : WEAPON_SUBTYPES;
  const alternateDamages: Array<{ name?: string | null; damage_sets?: WeaponDamageSet[] }> =
    Array.isArray(((formData.data as WeaponData | undefined) as any)?.alternate_damages)
      ? ((((formData.data as WeaponData | undefined) as any).alternate_damages) as any[])
      : (((formData.data as WeaponData | undefined) as any)?.alternate_damage ? [(((formData.data as WeaponData | undefined) as any).alternate_damage)] : []);
  const alternateDamagesEnabled = alternateDamages.length > 0;

  // Gestori anomalie di stato
  const handleAnomalySave = (anom: StatusAnomaly) => {
    const newAnomaly: StatusAnomaly = { ...anom, sourceType: 'equipment' };
    setFormData(prev => ({
      ...prev,
      statusAnomalies: [ ...(prev.statusAnomalies || []), newAnomaly ]
    }));
    setAnomalyModalOpen(false);
    setStatusAnomaliesEnabled(true);
  };

  const handleRemoveAnomaly = (id: string) => {
    setFormData(prev => ({
      ...prev,
      statusAnomalies: (prev.statusAnomalies || []).filter(a => a.id !== id)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Modifica Equipaggiamento' : 'Aggiungi Equipaggiamento'}
          </DialogTitle>
          <DialogDescription>
            {editingItem ? 'Modifica le proprietà dell\'equipaggiamento selezionato.' : 'Crea un nuovo equipaggiamento per il tuo personaggio.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome oggetto"
            />
          </div>

          {/* Tipo */}
          <div>
            <Label htmlFor="type">Tipo *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as 'armatura' | 'arma', subtype: '' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="armatura">Armatura</SelectItem>
                <SelectItem value="arma">Arma</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Sottotipo */}
          <div>
            <Label htmlFor="subtype">Sottotipo *</Label>
            <Select 
              value={formData.subtype} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, subtype: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSubtypes.map(subtype => (
                  <SelectItem key={subtype} value={subtype}>
                    {subtype.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'arma' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weapon_type_id">Tipo arma (Supabase)</Label>
                <Select
                  value={(formData.data?.weapon_type_id as string) || ''}
                  onValueChange={(value) => {
                    const wt = weaponTypes.find((t: any) => String(t.id) === String(value));
                    setFormData(prev => ({
                      ...prev,
                      data: {
                        ...(prev.data as WeaponData),
                        weapon_type_id: value,
                        weapon_type_name: wt?.name ?? null,
                        weapon_type_category: wt?.category ?? null
                      }
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingWeaponTypes ? 'Caricamento...' : 'Seleziona tipo arma'} />
                  </SelectTrigger>
                  <SelectContent>
                    {weaponTypes.map((wt: any) => (
                      <SelectItem key={wt.id} value={String(wt.id)}>
                        {wt.name} ({wt.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="material_id">Materiale</Label>
                <Select
                  value={(formData.data?.material_id as string) || ''}
                  onValueChange={(value) => {
                    const mat = materials.find((m: any) => String(m.id) === String(value));
                    setFormData(prev => ({
                      ...prev,
                      data: {
                        ...(prev.data as WeaponData),
                        material_id: value,
                        material_name: mat?.name ?? null
                      }
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMaterials ? 'Caricamento...' : 'Seleziona materiale'} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Peso */}
          <div>
            <Label htmlFor="weight">Peso</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.1"
            />
          </div>

          {/* Armatura (solo per armature) */}
          {formData.type === 'armatura' && (
            <div>
              <Label htmlFor="armor">Armatura</Label>
              <Input
                id="armor"
                type="number"
                value={formData.armor}
                onChange={(e) => setFormData(prev => ({ ...prev, armor: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
          )}


          {/* Tipi di danno per arma (da Supabase) */}
          {formData.type === 'arma' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tipi di danno</Label>
                <Button type="button" variant="secondary" onClick={addDamageSet}>Aggiungi effetto</Button>
              </div>
              <div className="space-y-3">
                {(formData.data?.damage_sets || []).map((ds: WeaponDamageSet, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label>Effetto</Label>
                      <Select value={ds.effect_name || ''} onValueChange={(value) => updateDamageSet(idx, { effect_name: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDamageEffects ? 'Caricamento...' : 'Seleziona effetto'} />
                        </SelectTrigger>
                        <SelectContent>
                          {damageEffectOptions.map((opt: any) => (
                            <SelectItem key={opt.id} value={opt.name}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(ds.effect_name && ds.effect_name.length > 0) && (
                      <>
                        <div>
                          <Label>Veloce</Label>
                          <Input type="number" value={Number(ds.damage_veloce || 0)} min="0" onChange={(e) => updateDamageSet(idx, { damage_veloce: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label>Pesante</Label>
                          <Input type="number" value={Number(ds.damage_pesante || 0)} min="0" onChange={(e) => updateDamageSet(idx, { damage_pesante: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label>Affondo</Label>
                          <Input type="number" value={Number(ds.damage_affondo || 0)} min="0" onChange={(e) => updateDamageSet(idx, { damage_affondo: parseInt(e.target.value) || 0 })} />
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" onClick={() => removeDamageSet(idx)}>
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Per ogni effetto selezionato imposta i valori Veloce/Pesante/Affondo.</p>

              <div className="mt-4 space-y-3 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Danni alternativi</Label>
                  </div>
                  <Switch checked={alternateDamagesEnabled} onCheckedChange={(checked) => setAlternateDamagesEnabled(checked)} />
                </div>

                {alternateDamagesEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Profili</Label>
                      <Button type="button" variant="secondary" onClick={addAlternateDamage}>Aggiungi danno alternativo</Button>
                    </div>

                    <div className="space-y-3">
                      {alternateDamages.map((alt, damageIdx) => (
                        <div key={`alt:${damageIdx}`} className="space-y-3 rounded-md border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <Label>Nome</Label>
                              <Input
                                value={String(alt?.name || '')}
                                onChange={(e) => setAlternateDamageName(damageIdx, e.target.value)}
                                placeholder="Es. Fuoco, Veleno, Sacro..."
                              />
                            </div>
                            <Button type="button" variant="destructive" onClick={() => removeAlternateDamage(damageIdx)}>
                              Rimuovi
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label>Set danni (per effetto)</Label>
                            <Button type="button" variant="secondary" onClick={() => addAlternateDamageSet(damageIdx)}>Aggiungi effetto</Button>
                          </div>

                          <div className="space-y-3">
                            {(((alt?.damage_sets as WeaponDamageSet[]) || [])).map((ds: WeaponDamageSet, setIdx) => (
                              <div key={`alt:${damageIdx}:${setIdx}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                <div className="md:col-span-2">
                                  <Label>Effetto</Label>
                                  <Select value={ds.effect_name || ''} onValueChange={(value) => updateAlternateDamageSet(damageIdx, setIdx, { effect_name: value })}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={loadingDamageEffects ? 'Caricamento...' : 'Seleziona effetto'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {damageEffectOptions.map((opt: any) => (
                                        <SelectItem key={`altopt:${damageIdx}:${opt.id}`} value={opt.name}>
                                          {opt.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(ds.effect_name && ds.effect_name.length > 0) && (
                                  <>
                                    <div>
                                      <Label>Veloce</Label>
                                      <Input type="number" value={Number(ds.damage_veloce || 0)} min="0" onChange={(e) => updateAlternateDamageSet(damageIdx, setIdx, { damage_veloce: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                      <Label>Pesante</Label>
                                      <Input type="number" value={Number(ds.damage_pesante || 0)} min="0" onChange={(e) => updateAlternateDamageSet(damageIdx, setIdx, { damage_pesante: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                      <Label>Affondo</Label>
                                      <Input type="number" value={Number(ds.damage_affondo || 0)} min="0" onChange={(e) => updateAlternateDamageSet(damageIdx, setIdx, { damage_affondo: parseInt(e.target.value) || 0 })} />
                                    </div>
                                  </>
                                )}

                                <div className="flex gap-2">
                                  <Button type="button" variant="destructive" onClick={() => removeAlternateDamageSet(damageIdx, setIdx)}>
                                    Rimuovi
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anomalie di stato */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Anomalie di stato?</Label>
                <p className="text-xs text-muted-foreground">Se attivo, l'oggetto applica anomalie quando equipaggiato.</p>
              </div>
              <Switch
                checked={statusAnomaliesEnabled}
                onCheckedChange={(checked) => {
                  setStatusAnomaliesEnabled(checked);
                  if (!checked) {
                    setFormData(prev => ({ ...prev, statusAnomalies: [] }));
                  }
                }}
              />
            </div>

          {statusAnomaliesEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Anomalie dell'oggetto</Label>
                  <Button type="button" variant="secondary" onClick={() => setAnomalyModalOpen(true)}>
                    Aggiungi anomalia
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.statusAnomalies || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nessuna anomalia definita.</p>
                  ) : (
                    (formData.statusAnomalies || []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        </div>
                        <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveAnomaly(a.id)}>
                          Rimuovi
                        </Button>
                      </div>
                    ))
                  )}
              </div>
            </div>
          )}
        </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Sblocca potere</Label>
              </div>
              <Switch
                checked={powerUnlockEnabled}
                onCheckedChange={(checked) => {
                  setPowerUnlockEnabled(checked);
                  if (!checked) {
                    setFormData((prev) => ({
                      ...prev,
                      unlockedPowers: { abilities: [], spells: [] },
                    }));
                  }
                }}
              />
            </div>

            {powerUnlockEnabled && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setAbilitySelectorOpen(true)}>
                    Aggiungi abilità
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSpellSelectorOpen(true)}>
                    Aggiungi magia
                  </Button>
                </div>

                <div className="space-y-2">
                  {((formData.unlockedPowers?.abilities || []).length === 0) && ((formData.unlockedPowers?.spells || []).length === 0) ? (
                    <p className="text-xs text-muted-foreground">Nessun potere selezionato.</p>
                  ) : (
                    <>
                      {(formData.unlockedPowers?.abilities || []).map((row, idx) => (
                        <div key={`ab-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{row.name || row.ability?.name || 'Abilità'}</span>
                            <Badge variant="outline" className="text-xs">Lv {row.level}</Badge>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => {
                                const current = (prev.unlockedPowers?.abilities || []).slice();
                                current.splice(idx, 1);
                                return { ...prev, unlockedPowers: { ...(prev.unlockedPowers || {}), abilities: current } };
                              });
                            }}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      ))}

                      {(formData.unlockedPowers?.spells || []).map((row, idx) => (
                        <div key={`sp-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{row.name || row.spell?.name || 'Magia'}</span>
                            <Badge variant="outline" className="text-xs">Lv {row.level}</Badge>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => {
                                const current = (prev.unlockedPowers?.spells || []).slice();
                                current.splice(idx, 1);
                                return { ...prev, unlockedPowers: { ...(prev.unlockedPowers || {}), spells: current } };
                              });
                            }}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Statistiche */}
          <div>
            <Label>Statistiche</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(formData.stats || {}).map(([stat, value]) => (
                <div key={stat}>
                  <Label htmlFor={stat} className="text-sm capitalize">
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </Label>
                  <Input
                    id={stat}
                    type="number"
                    value={value}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imposta specifiche</Label>
            {(() => {
              const list: any[] = Array.isArray((formData as any).custom_specifics) ? ((formData as any).custom_specifics as any[]) : [];
              return (
                <div className="space-y-2">
                  {list.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nessuna specifica impostata.</div>
                  ) : null}
                  {list.map((row, idx) => (
                    <div key={`cs-${idx}`} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <Select
                        value={String(row?.id || '')}
                        onValueChange={(val) => {
                          const picked = specificCatalog.find((s) => String(s.id) === String(val));
                          setFormData((prev) => {
                            const curr = Array.isArray((prev as any).custom_specifics) ? [...((prev as any).custom_specifics as any[])] : [];
                            curr[idx] = { ...curr[idx], id: val, name: picked?.name ?? '' };
                            return { ...prev, custom_specifics: curr };
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={(specificCatalog || []).length === 0 ? 'Seleziona specifica' : 'Seleziona specifica'} />
                        </SelectTrigger>
                        <SelectContent>
                          {specificCatalog.map((spec) => (
                            <SelectItem key={`cs-opt-${spec.id}`} value={spec.id}>
                              {spec.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={Number(row?.max ?? 0)}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setFormData((prev) => {
                            const curr = Array.isArray((prev as any).custom_specifics) ? [...((prev as any).custom_specifics as any[])] : [];
                            curr[idx] = { ...curr[idx], max: v };
                            return { ...prev, custom_specifics: curr };
                          });
                        }}
                        min="0"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          setFormData((prev) => {
                            const curr = Array.isArray((prev as any).custom_specifics) ? [...((prev as any).custom_specifics as any[])] : [];
                            curr.splice(idx, 1);
                            return { ...prev, custom_specifics: curr };
                          });
                        }}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData((prev) => {
                        const curr = Array.isArray((prev as any).custom_specifics) ? [...((prev as any).custom_specifics as any[])] : [];
                        curr.push({ id: '', name: '', max: 0 });
                        return { ...prev, custom_specifics: curr };
                      });
                    }}
                  >
                    Aggiungi specifica
                  </Button>
                </div>
              );
            })()}
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione dell'oggetto"
            />
          </div>
        </div>

        <AnomalyModal
          isOpen={anomalyModalOpen}
          onClose={() => setAnomalyModalOpen(false)}
          onSave={handleAnomalySave}
          editingAnomaly={null}
        />

        <ImportAbilityModal
          isOpen={abilitySelectorOpen}
          onOpenChange={setAbilitySelectorOpen}
          mode="inline"
          onConfirm={({ ability, level }) => {
            setFormData((prev) => {
              const current = prev.unlockedPowers?.abilities || [];
              const next = [...current, { name: String(ability?.name ?? 'Abilità'), ability_id: String(ability?.id ?? ''), level }];
              return { ...prev, unlockedPowers: { ...(prev.unlockedPowers || {}), abilities: next } };
            });
            setPowerUnlockEnabled(true);
          }}
        />

        <ImportSpellModal
          isOpen={spellSelectorOpen}
          onOpenChange={setSpellSelectorOpen}
          mode="inline"
          onConfirm={({ spell, level }) => {
            setFormData((prev) => {
              const current = prev.unlockedPowers?.spells || [];
              const next = [...current, { name: String(spell?.name ?? 'Magia'), spell_id: String(spell?.id ?? ''), level }];
              return { ...prev, unlockedPowers: { ...(prev.unlockedPowers || {}), spells: next } };
            });
            setPowerUnlockEnabled(true);
          }}
        />

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentModal;
