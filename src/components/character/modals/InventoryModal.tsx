import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { InventoryItem, EquipmentItem, ARMOR_SUBTYPES, WEAPON_SUBTYPES, WeaponData, WeaponDamageSet, StatusAnomaly } from '@/types/character';
import { readSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';
import { listMaterials } from '@/integrations/supabase/materials';
import { listWeaponTypes } from '@/integrations/supabase/weaponTypes';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal';
import { ImportSpellModal } from '@/components/magic/ImportSpellModal';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  editingItem?: InventoryItem | null;
}

const InventoryModal = ({ isOpen, onClose, onSave, editingItem }: InventoryModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'oggetto' as 'oggetto' | 'armatura' | 'arma',
    subtype: '',
    description: '',
    weight: 0,
    quantity: 1,
    armor: 0,
    damageVeloce: 0,
    damagePesante: 0,
    damageAffondo: 0,
    unlockedPowers: {
      abilities: [] as Array<{ ability: any; level: number }>,
      spells: [] as Array<{ spell: any; level: number }>,
    },
    stats: {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0
    },
    custom_specifics: [] as Array<{ id: string; name: string; max: number }>,
    data: {
      material_id: null,
      material_name: null,
      weapon_type_id: null,
      weapon_type_name: null,
      weapon_type_category: null,
      weapon_subtype_detail: null,
      damage_sets: []
    } as WeaponData,
    statusAnomalies: [] as StatusAnomaly[]
  });

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

  useEffect(() => {
    if (editingItem) {
      const base = {
        name: editingItem.name || '',
        description: editingItem.description || '',
        weight: editingItem.weight || 0,
        quantity: editingItem.quantity || 1,
      };
      if ((editingItem as any).equipmentData) {
        const ed = (editingItem as any).equipmentData as Partial<EquipmentItem>;
        const existingAbilities = ((ed as any)?.unlockedPowers?.abilities || []) as Array<{ ability: any; level: number }>;
        const existingSpells = ((ed as any)?.unlockedPowers?.spells || []) as Array<{ spell: any; level: number }>;
        setPowerUnlockEnabled(existingAbilities.length > 0 || existingSpells.length > 0);
        setFormData({
          name: base.name,
          type: (ed.type as 'armatura' | 'arma') || 'armatura',
          subtype: ed.subtype || '',
          description: base.description,
          weight: base.weight,
          quantity: base.quantity,
          armor: ed.armor || 0,
          damageVeloce: ed.damageVeloce || 0,
          damagePesante: ed.damagePesante || 0,
          damageAffondo: ed.damageAffondo || 0,
          stats: ed.stats || {
            forza: 0,
            percezione: 0,
            resistenza: 0,
            intelletto: 0,
            agilita: 0,
            sapienza: 0,
            anima: 0
          },
          custom_specifics: (ed as any).custom_specifics || [],
          data: (ed as any).data || {
            material_id: null,
            material_name: null,
            weapon_type_id: null,
            weapon_type_name: null,
            weapon_type_category: null,
            weapon_subtype_detail: null,
            damage_sets: []
          },
          statusAnomalies: ((ed as any).statusAnomalies as StatusAnomaly[]) || [],
          unlockedPowers: {
            abilities: existingAbilities,
            spells: existingSpells,
          }
        });
      } else {
        setPowerUnlockEnabled(false);
        setFormData({
          name: base.name,
          type: 'oggetto',
          subtype: '',
          description: base.description,
          weight: base.weight,
          quantity: base.quantity,
          armor: 0,
          damageVeloce: 0,
          damagePesante: 0,
          damageAffondo: 0,
          custom_specifics: [],
          stats: {
            forza: 0,
            percezione: 0,
            resistenza: 0,
            intelletto: 0,
            agilita: 0,
            sapienza: 0,
            anima: 0
          },
          data: {
            material_id: null,
            material_name: null,
            weapon_type_id: null,
            weapon_type_name: null,
            weapon_type_category: null,
            weapon_subtype_detail: null,
            damage_sets: []
          } as WeaponData,
          statusAnomalies: [],
          unlockedPowers: { abilities: [], spells: [] }
        });
      }
    } else {
      setPowerUnlockEnabled(false);
      setFormData({
        name: '',
        type: 'oggetto',
        subtype: '',
        description: '',
        weight: 0,
        quantity: 1,
        armor: 0,
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
        data: {
          material_id: null,
          material_name: null,
          weapon_type_id: null,
          weapon_type_name: null,
          weapon_type_category: null,
          weapon_subtype_detail: null,
          damage_sets: []
        } as WeaponData,
        statusAnomalies: [],
        unlockedPowers: { abilities: [], spells: [] }
      });
    }
  }, [editingItem]);

  useEffect(() => {
    setStatusAnomaliesEnabled((formData.statusAnomalies?.length || 0) > 0);
  }, [formData.statusAnomalies]);

  useEffect(() => {
    const loadLists = async () => {
      try {
        setLoadingMaterials(true);
        setLoadingWeaponTypes(true);
        const [mat, wt] = await Promise.all([listMaterials(), listWeaponTypes()]);
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

  const handleStatChange = (stat: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      stats: { ...prev.stats, [stat]: parseInt(value) || 0 }
    }));
  };

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

  const setAlternateDamageEnabled = (enabled: boolean) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      if (!enabled) {
        const { alternate_damage: _ignored, ...rest } = currentData as any;
        return { ...prev, data: rest as WeaponData };
      }
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damage: currentData.alternate_damage || { name: '', damage_sets: [] },
        }
      };
    });
  };

  const setAlternateDamageName = (name: string) => {
    setFormData(prev => ({
      ...prev,
      data: {
        ...(prev.data as WeaponData),
        alternate_damage: {
          ...(((prev.data as WeaponData) || {}).alternate_damage || { damage_sets: [] }),
          name,
        }
      }
    }));
  };

  const addAlternateDamageSet = () => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const currentAlt = currentData.alternate_damage || { name: '', damage_sets: [] };
      const nextSets = [
        ...((currentAlt.damage_sets as WeaponDamageSet[]) || []),
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
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damage: {
            ...currentAlt,
            damage_sets: nextSets
          }
        }
      };
    });
  };

  const updateAlternateDamageSet = (index: number, patch: Partial<WeaponDamageSet>) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const currentAlt = currentData.alternate_damage || { name: '', damage_sets: [] };
      const current = ((currentAlt.damage_sets as WeaponDamageSet[]) || []).slice();
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
        data: {
          ...currentData,
          alternate_damage: {
            ...currentAlt,
            damage_sets: current
          }
        }
      };
    });
  };

  const removeAlternateDamageSet = (index: number) => {
    setFormData(prev => {
      const currentData = (prev.data as WeaponData) || {};
      const currentAlt = currentData.alternate_damage;
      if (!currentAlt) return prev;
      const current = ((currentAlt.damage_sets as WeaponDamageSet[]) || []).slice();
      current.splice(index, 1);
      return {
        ...prev,
        data: {
          ...currentData,
          alternate_damage: {
            ...currentAlt,
            damage_sets: current
          }
        }
      };
    });
  };

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

  const handleSave = () => {
    const computedSets = ((formData.data?.damage_sets as WeaponDamageSet[]) || []).map((ds) => ({
      ...ds,
      calculated_damage_veloce: Math.floor(Number(ds.damage_veloce || 0) * 0.33),
      calculated_damage_pesante: Math.floor(Number(ds.damage_pesante || 0) * 0.33),
      calculated_damage_affondo: Math.floor(Number(ds.damage_affondo || 0) * 0.33),
    }));
    const alt = (formData.data as WeaponData | undefined)?.alternate_damage;
    const altEnabled = !!(alt && (String(alt.name || '').trim() || ((alt.damage_sets as any[]) || []).length > 0));
    const computedAltSets = ((alt?.damage_sets as WeaponDamageSet[]) || []).map((ds) => ({
      ...ds,
      calculated_damage_veloce: Math.floor(Number(ds.damage_veloce || 0) * 0.33),
      calculated_damage_pesante: Math.floor(Number(ds.damage_pesante || 0) * 0.33),
      calculated_damage_affondo: Math.floor(Number(ds.damage_affondo || 0) * 0.33),
    }));
    const cleanedCustomSpecifics = normalizeCustomSpecifics((formData as any).custom_specifics);

    if (formData.type === 'arma' && altEnabled) {
      if (!String(alt?.name || '').trim()) {
        alert('Inserisci il nome del danno alternativo.');
        return;
      }
      const cleanAltSets = computedAltSets.filter(s => String(s.effect_name || '').trim());
      if (cleanAltSets.length === 0) {
        alert('Aggiungi almeno un damage effect per il danno alternativo.');
        return;
      }
    }

    const base: InventoryItem = {
      id: editingItem?.id || crypto.randomUUID(),
      name: formData.name || '',
      type: 'oggetto',
      description: formData.description || '',
      weight: parseFloat(formData.weight.toString()) || 0,
      quantity: formData.quantity || 1,
      ...(cleanedCustomSpecifics.length > 0 ? { custom_specifics: cleanedCustomSpecifics } : {}),
      ...(formData.type !== 'oggetto'
        ? {
            equipmentData: {
              name: formData.name || '',
              type: (formData.type as 'armatura' | 'arma'),
              subtype: formData.subtype || '',
              description: formData.description || '',
              weight: parseFloat(formData.weight.toString()) || 0,
              stats: formData.stats || {},
              ...(formData.type === 'armatura' && { armor: formData.armor || 0 }),
              ...(formData.type === 'arma' && {
                // Danni classici rimossi: usiamo solo i set da Supabase
                data: {
                  ...(formData.data as WeaponData),
                  damage_sets: computedSets,
                  ...(altEnabled
                    ? {
                        alternate_damage: {
                          name: String(alt?.name || '').trim(),
                          damage_sets: computedAltSets.filter(s => String(s.effect_name || '').trim()),
                        }
                      }
                    : {})
                } as WeaponData
              }),
              statusAnomalies: statusAnomaliesEnabled ? (formData.statusAnomalies || []) : [],
              ...(powerUnlockEnabled &&
                (((formData as any).unlockedPowers?.abilities?.length || 0) > 0 || ((formData as any).unlockedPowers?.spells?.length || 0) > 0)
                ? { unlockedPowers: (formData as any).unlockedPowers }
                : {}),
              ...(cleanedCustomSpecifics.length > 0 ? { custom_specifics: cleanedCustomSpecifics } : {}),
            } as Partial<EquipmentItem>
          }
        : {})
    } as any;

    onSave(base);
    onClose();
    setFormData({
      name: '',
      type: 'oggetto',
      subtype: '',
      description: '',
      weight: 0,
      quantity: 1,
      armor: 0,
      damageVeloce: 0,
      damagePesante: 0,
      damageAffondo: 0,
      custom_specifics: [],
      stats: { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
      data: {
        material_id: null,
        material_name: null,
        weapon_type_id: null,
        weapon_type_name: null,
        weapon_type_category: null,
        weapon_subtype_detail: null,
        damage_sets: []
      } as WeaponData,
      statusAnomalies: [],
      unlockedPowers: { abilities: [], spells: [] }
    });
    setPowerUnlockEnabled(false);
  };

  const availableSubtypes =
    formData.type === 'armatura'
      ? ARMOR_SUBTYPES
      : formData.type === 'arma'
      ? WEAPON_SUBTYPES
      : [];
  const alternateDamage = (formData.data as WeaponData | undefined)?.alternate_damage;
  const alternateDamageEnabled = !!alternateDamage;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Modifica Inventario' : 'Aggiungi a Inventario'}
          </DialogTitle>
          <DialogDescription>
            Scegli il tipo e compila i campi. Se selezioni armatura/arma, verranno salvati i dettagli equip.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div>
            <Label htmlFor='name'>Nome *</Label>
            <Input id='name' value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
          </div>

          <div>
            <Label htmlFor='type'>Tipo *</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as 'oggetto' | 'armatura' | 'arma', subtype: '' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='oggetto'>Oggetto</SelectItem>
                <SelectItem value='armatura'>Armatura</SelectItem>
                <SelectItem value='arma'>Arma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type !== 'oggetto' && (
            <div>
              <Label htmlFor='subtype'>Sottotipo *</Label>
              <Select value={formData.subtype} onValueChange={(v) => setFormData(prev => ({ ...prev, subtype: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSubtypes.map(st => (
                    <SelectItem key={st} value={st}>{st.replace('_', ' ').toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.type === 'arma' && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='weapon_type_id'>Tipo arma (Supabase)</Label>
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
                <Label htmlFor='material_id'>Materiale</Label>
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

          <div>
            <Label htmlFor='weight'>Peso</Label>
            <Input id='weight' type='number' value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))} min='0' step='0.1' />
          </div>

          {formData.type === 'armatura' && (
            <div>
              <Label htmlFor='armor'>Armatura</Label>
              <Input id='armor' type='number' value={formData.armor} onChange={(e) => setFormData(prev => ({ ...prev, armor: parseInt(e.target.value) || 0 }))} min='0' />
            </div>
          )}

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
                          <p className="text-xs text-muted-foreground mt-1">Assicurato (33%): {Math.floor((Number(ds.damage_veloce || 0)) * 0.33)}</p>
                        </div>
                        <div>
                          <Label>Pesante</Label>
                          <Input type="number" value={Number(ds.damage_pesante || 0)} min="0" onChange={(e) => updateDamageSet(idx, { damage_pesante: parseInt(e.target.value) || 0 })} />
                          <p className="text-xs text-muted-foreground mt-1">Assicurato (33%): {Math.floor((Number(ds.damage_pesante || 0)) * 0.33)}</p>
                        </div>
                        <div>
                          <Label>Affondo</Label>
                          <Input type="number" value={Number(ds.damage_affondo || 0)} min="0" onChange={(e) => updateDamageSet(idx, { damage_affondo: parseInt(e.target.value) || 0 })} />
                          <p className="text-xs text-muted-foreground mt-1">Assicurato (33%): {Math.floor((Number(ds.damage_affondo || 0)) * 0.33)}</p>
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
                    <Label>Danno alternativo</Label>
                  </div>
                  <Switch checked={alternateDamageEnabled} onCheckedChange={(checked) => setAlternateDamageEnabled(checked)} />
                </div>

                {alternateDamageEnabled && (
                  <div className="space-y-3">
                    <div>
                      <Label>Nome danno alternativo</Label>
                      <Input
                        value={String(alternateDamage?.name || '')}
                        onChange={(e) => setAlternateDamageName(e.target.value)}
                        placeholder="Es. Fuoco, Veleno, Sacro..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Set danni (alternativo, per effetto)</Label>
                      <Button type="button" variant="secondary" onClick={addAlternateDamageSet}>Aggiungi effetto</Button>
                    </div>

                    <div className="space-y-3">
                      {(((alternateDamage?.damage_sets as WeaponDamageSet[]) || [])).map((ds: WeaponDamageSet, idx) => (
                        <div key={`alt:${idx}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <div className="md:col-span-2">
                            <Label>Effetto</Label>
                            <Select value={ds.effect_name || ''} onValueChange={(value) => updateAlternateDamageSet(idx, { effect_name: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingDamageEffects ? 'Caricamento...' : 'Seleziona effetto'} />
                              </SelectTrigger>
                              <SelectContent>
                                {damageEffectOptions.map((opt: any) => (
                                  <SelectItem key={`altopt:${opt.id}`} value={opt.name}>
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
                                <Input type="number" value={Number(ds.damage_veloce || 0)} min="0" onChange={(e) => updateAlternateDamageSet(idx, { damage_veloce: parseInt(e.target.value) || 0 })} />
                              </div>
                              <div>
                                <Label>Pesante</Label>
                                <Input type="number" value={Number(ds.damage_pesante || 0)} min="0" onChange={(e) => updateAlternateDamageSet(idx, { damage_pesante: parseInt(e.target.value) || 0 })} />
                              </div>
                              <div>
                                <Label>Affondo</Label>
                                <Input type="number" value={Number(ds.damage_affondo || 0)} min="0" onChange={(e) => updateAlternateDamageSet(idx, { damage_affondo: parseInt(e.target.value) || 0 })} />
                              </div>
                            </>
                          )}

                          <div className="flex gap-2">
                            <Button type="button" variant="destructive" onClick={() => removeAlternateDamageSet(idx)}>
                              Rimuovi
                            </Button>
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

          {formData.type !== 'oggetto' && (
            <div>
              <Label>Statistiche</Label>
              <div className='grid grid-cols-2 gap-4 mt-2'>
                {Object.entries(formData.stats || {}).map(([stat, value]) => (
                  <div key={stat}>
                    <Label htmlFor={stat} className='text-sm capitalize'>{stat.charAt(0).toUpperCase() + stat.slice(1)}</Label>
                    <Input id={stat} type='number' value={value as number} onChange={(e) => handleStatChange(stat, e.target.value)} min='0' />
                  </div>
                ))}
              </div>
            </div>
          )}

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

          <div>
            <Label htmlFor='description'>Descrizione</Label>
            <Textarea id='description' value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          </div>
        </div>

        <AnomalyModal
          isOpen={anomalyModalOpen}
          onClose={() => setAnomalyModalOpen(false)}
          onSave={handleAnomalySave}
          editingAnomaly={null}
        />

        <DialogFooter className='mt-4'>
          <Button variant='outline' onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave}>{editingItem ? 'Salva Modifiche' : 'Aggiungi'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryModal;
