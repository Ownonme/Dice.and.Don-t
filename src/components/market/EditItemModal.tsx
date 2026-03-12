import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { MarketItem } from '@/types/market';
import type { CharacterStats, StatusAnomaly } from '@/types/character';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal';
import { ImportSpellModal } from '@/components/magic/ImportSpellModal';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { listAnomalies, getAnomalyById } from '@/integrations/supabase/anomalies';
import { listMaterials } from '@/integrations/supabase/materials';
import { listWeaponTypes } from '@/integrations/supabase/weaponTypes';
import { isAllZeroStats, pruneEmptyFields, readSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';

interface EditItemModalProps {
  item: MarketItem;
  onClose: () => void;
  onItemUpdated: (updated: MarketItem) => void;
}

const ITEM_TYPES = [
  { value: 'arma', label: 'Arma' },
  { value: 'armatura', label: 'Armatura' },
  { value: 'pozione', label: 'Pozione' },
  { value: 'oggetto', label: 'Oggetto' },
  { value: 'servizio', label: 'Servizio' }
];

const WEAPON_SUBTYPES = [
  { value: 'una_mano', label: 'Una Mano' },
  { value: 'due_mani', label: 'Due Mani' },
  { value: 'a_distanza', label: 'A Distanza' }
];

const ARMOR_SUBTYPES = [
  { value: 'anello', label: 'Anello' },
  { value: 'amuleto', label: 'Amuleto' },
  { value: 'veste', label: 'Veste' },
  { value: 'armatura', label: 'Armatura' },
  { value: 'sotto_corazza', label: 'Sotto Corazza' },
  { value: 'mantello', label: 'Mantello' },
  { value: 'testa', label: 'Testa' },
  { value: 'maschera', label: 'Maschera' },
  { value: 'spallacci', label: 'Spallacci' }
];

export default function EditItemModal({ item, onClose, onItemUpdated }: EditItemModalProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [type, setType] = useState<string>(item.type || 'oggetto');
  const [subtype, setSubtype] = useState<string>(item.subtype || '');
  const [name, setName] = useState<string>(item.name || '');
  const [description, setDescription] = useState<string>(item.description || '');
  const [price_bronzo, setPriceBronzo] = useState<number>(item.price_bronzo || 0);
  const [price_argento, setPriceArgento] = useState<number>(item.price_argento || 0);
  const [price_oro, setPriceOro] = useState<number>(item.price_oro || 0);
  const [price_rosse, setPriceRosse] = useState<number>(item.price_rosse || 0);
  const [price_bianche, setPriceBianche] = useState<number>(item.price_bianche || 0);
  const [weight, setWeight] = useState<number>(item.weight || 0);
  const [quantity, setQuantity] = useState<number>((item as any)?.quantity || 1);
  const [armor, setArmor] = useState<number>(item.armor || 0);
  const [effect, setEffect] = useState<string>(item.effect || '');
  const [stats, setStats] = useState<CharacterStats>({
    anima: Number((item.stats as any)?.anima || 0),
    forza: Number((item.stats as any)?.forza || 0),
    agilita: Number((item.stats as any)?.agilita || 0),
    sapienza: Number((item.stats as any)?.sapienza || 0),
    intelletto: Number((item.stats as any)?.intelletto || 0),
    percezione: Number((item.stats as any)?.percezione || 0),
    resistenza: Number((item.stats as any)?.resistenza || 0)
  });

  const [damageEffectOptions, setDamageEffectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [anomalyOptions, setAnomalyOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [importedAnomalyId, setImportedAnomalyId] = useState<string | null>(null);

  const potionMeta = ((item as any)?.item_data?.potion_meta) || {};
  const [potionIsRestore, setPotionIsRestore] = useState<boolean>(!!potionMeta?.isRestore);
  const [potionHasAnomaly, setPotionHasAnomaly] = useState<boolean>(!!potionMeta?.hasAnomaly);
  const [potionAnomaly, setPotionAnomaly] = useState<StatusAnomaly | null>(potionMeta?.anomaly || null);
  const [selectedDamageSets, setSelectedDamageSets] = useState<Array<{ damageEffectId: string; effect_name: string; guaranteedDamage: number; additionalDamage: number }>>(
    Array.isArray(potionMeta?.damageSets) ? potionMeta.damageSets.map((d: any) => ({
      damageEffectId: String(d.damageEffectId ?? ''),
      effect_name: String(d.effect_name ?? ''),
      guaranteedDamage: Number(d.guaranteedDamage ?? 0) || 0,
      additionalDamage: Number(d.additionalDamage ?? 0) || 0,
    })) : []
  );

  const equipmentMetaInit = ((item as any)?.item_data?.equipment_meta) || {};
  const [equipmentMeta, setEquipmentMeta] = useState<{
    weapon_type_id?: string | null;
    weapon_type_name?: string | null;
    weapon_type_category?: string | null;
    material_id?: string | null;
    material_name?: string | null;
    custom_specifics?: Array<{ id: string; name: string; max: number }>;
  }>({
    weapon_type_id: equipmentMetaInit?.weapon_type_id ?? null,
    weapon_type_name: equipmentMetaInit?.weapon_type_name ?? null,
    weapon_type_category: equipmentMetaInit?.weapon_type_category ?? null,
    material_id: equipmentMetaInit?.material_id ?? null,
    material_name: equipmentMetaInit?.material_name ?? null,
    custom_specifics: Array.isArray((equipmentMetaInit as any)?.custom_specifics) ? (equipmentMetaInit as any).custom_specifics : [],
  });
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
  const [materials, setMaterials] = useState<any[]>([]);
  const [weaponTypes, setWeaponTypes] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [loadingWeaponTypes, setLoadingWeaponTypes] = useState<boolean>(false);
  const [equipmentDamageSets, setEquipmentDamageSets] = useState<Array<{ effect_name: string; damage_veloce: number; damage_pesante: number; damage_affondo: number }>>(
    Array.isArray(equipmentMetaInit?.damage_sets) ? equipmentMetaInit.damage_sets.map((ds: any) => ({
      effect_name: String(ds?.effect_name ?? ''),
      damage_veloce: Number(ds?.damage_veloce ?? 0) || 0,
      damage_pesante: Number(ds?.damage_pesante ?? 0) || 0,
      damage_affondo: Number(ds?.damage_affondo ?? 0) || 0,
    })) : []
  );
  const alternateDamagesInitRaw =
    (Array.isArray((equipmentMetaInit as any)?.alternate_damages) ? (equipmentMetaInit as any).alternate_damages : null) ??
    (Array.isArray((equipmentMetaInit as any)?.alternateDamages) ? (equipmentMetaInit as any).alternateDamages : null) ??
    (((equipmentMetaInit as any)?.alternate_damage || (equipmentMetaInit as any)?.alternateDamage) ? [(equipmentMetaInit as any).alternate_damage || (equipmentMetaInit as any).alternateDamage] : []);
  const alternateDamagesInit = (Array.isArray(alternateDamagesInitRaw) ? alternateDamagesInitRaw : []).map((a: any) => ({
    name: String(a?.name ?? ''),
    damage_sets: Array.isArray(a?.damage_sets) ? a.damage_sets.map((ds: any) => ({
      effect_name: String(ds?.effect_name ?? ''),
      damage_veloce: Number(ds?.damage_veloce ?? 0) || 0,
      damage_pesante: Number(ds?.damage_pesante ?? 0) || 0,
      damage_affondo: Number(ds?.damage_affondo ?? 0) || 0,
    })) : []
  }));
  const [alternateDamagesEnabled, setAlternateDamagesEnabled] = useState<boolean>(alternateDamagesInit.length > 0);
  const [alternateDamages, setAlternateDamages] = useState<Array<{ name: string; damage_sets: Array<{ effect_name: string; damage_veloce: number; damage_pesante: number; damage_affondo: number }> }>>(
    alternateDamagesInit
  );
  const [equipmentAnomaliesEnabled, setEquipmentAnomaliesEnabled] = useState<boolean>(Array.isArray(equipmentMetaInit?.statusAnomalies) && equipmentMetaInit.statusAnomalies.length > 0);
  const [equipmentAnomalies, setEquipmentAnomalies] = useState<StatusAnomaly[]>(Array.isArray(equipmentMetaInit?.statusAnomalies) ? equipmentMetaInit.statusAnomalies : []);
  const [equipmentAnomalyModalOpen, setEquipmentAnomalyModalOpen] = useState<boolean>(false);
  const unlockedInitAny = (equipmentMetaInit as any)?.unlockedPowers || {};
  const [unlockedPowers, setUnlockedPowers] = useState<{
    abilities: Array<{ name?: string; ability_id?: string; ability?: any; level: number }>;
    spells: Array<{ name?: string; spell_id?: string; spell?: any; level: number }>;
  }>({
    abilities: Array.isArray((unlockedInitAny as any)?.abilities) ? (unlockedInitAny as any).abilities : [],
    spells: Array.isArray((unlockedInitAny as any)?.spells) ? (unlockedInitAny as any).spells : [],
  });
  const [powerUnlockEnabled, setPowerUnlockEnabled] = useState<boolean>(
    (Array.isArray((unlockedInitAny as any)?.abilities) && (unlockedInitAny as any).abilities.length > 0) ||
    (Array.isArray((unlockedInitAny as any)?.spells) && (unlockedInitAny as any).spells.length > 0)
  );
  const [abilitySelectorOpen, setAbilitySelectorOpen] = useState<boolean>(false);
  const [spellSelectorOpen, setSpellSelectorOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isAdmin) onClose();
  }, [isAdmin, onClose]);

  useEffect(() => {
    setSpecificCatalog(readSpecificCatalog());
  }, []);

  useEffect(() => {
    if (type !== 'armatura' && type !== 'arma') {
      setPowerUnlockEnabled(false);
      setUnlockedPowers({ abilities: [], spells: [] });
    }
  }, [type]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const dmg = await listDamageEffects();
        const dmgOpts = (Array.isArray(dmg) ? dmg : []).map((d: any) => ({ id: String(d.id), name: d.name }));
        setDamageEffectOptions(dmgOpts);
      } catch {
        setDamageEffectOptions([]);
      }
      try {
        const anoms = await listAnomalies();
        const anOpts = (Array.isArray(anoms) ? anoms : []).map((a: any) => ({ id: String(a.id), name: a.name }));
        setAnomalyOptions(anOpts);
      } catch {
        setAnomalyOptions([]);
      }
    };
    if (type === 'pozione' || type === 'arma') loadOptions();
  }, [type]);

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
      } catch {
        setMaterials([]);
        setWeaponTypes([]);
      } finally {
        setLoadingMaterials(false);
        setLoadingWeaponTypes(false);
      }
    };
    if (type === 'arma') loadLists();
  }, [type]);

  const getAvailableSubtypes = () => {
    if (type === 'arma') return WEAPON_SUBTYPES;
    if (type === 'armatura') return ARMOR_SUBTYPES;
    return [];
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
      return;
    }
    try {
      setIsSaving(true);
      const patchBase: any = {
        name,
        description: description?.trim() ? description : undefined,
        type,
        subtype: subtype?.trim() ? subtype : undefined,
        price_bronzo: price_bronzo ? Number(price_bronzo) : undefined,
        price_argento: price_argento ? Number(price_argento) : undefined,
        price_oro: price_oro ? Number(price_oro) : undefined,
        price_rosse: price_rosse ? Number(price_rosse) : undefined,
        price_bianche: price_bianche ? Number(price_bianche) : undefined,
        weight: weight ? Number(weight) : undefined,
        quantity: Number(quantity) || 1,
        stats: isAllZeroStats(stats) ? undefined : stats,
        updated_at: new Date().toISOString()
      };
      if (type === 'armatura') patchBase.armor = armor ? Number(armor) : undefined;
      if (type === 'pozione') patchBase.effect = effect?.trim() ? effect : undefined;
      const patch: any = pruneEmptyFields(patchBase) || {};

      const existingItemData = ((item as any)?.item_data) || {};
      let newItemData: any = { ...existingItemData };
      if (type !== 'pozione') delete newItemData.potion_meta;
      if (type !== 'armatura' && type !== 'arma') delete newItemData.equipment_meta;
      const cleanedCustomSpecifics = normalizeCustomSpecifics((equipmentMeta as any).custom_specifics);

      if (type === 'pozione') {
        newItemData = {
          ...newItemData,
          potion_meta: {
            isRestore: !!potionIsRestore,
            damageSets: selectedDamageSets.map((d) => ({
              damageEffectId: d.damageEffectId,
              effect_name: d.effect_name,
              guaranteedDamage: Number(d.guaranteedDamage) || 0,
              additionalDamage: Number(d.additionalDamage) || 0,
            })),
            hasAnomaly: !!potionHasAnomaly,
            anomaly: potionHasAnomaly ? (potionAnomaly || undefined) : undefined,
            anomalyId: potionHasAnomaly ? (importedAnomalyId || undefined) : undefined,
          }
        };
      }

      if (type === 'armatura' || type === 'arma') {
        const computedSets = equipmentDamageSets.map((ds) => ({
          ...ds,
          calculated_damage_veloce: Math.floor(Number(ds.damage_veloce || 0) * 0.33),
          calculated_damage_pesante: Math.floor(Number(ds.damage_pesante || 0) * 0.33),
          calculated_damage_affondo: Math.floor(Number(ds.damage_affondo || 0) * 0.33),
        }));

        const computedAlternateDamages = (alternateDamages || [])
          .map((a) => ({
            name: String(a?.name || '').trim(),
            damage_sets: (Array.isArray(a?.damage_sets) ? a.damage_sets : [])
              .map((ds) => ({
                ...ds,
                calculated_damage_veloce: Math.floor(Number(ds.damage_veloce || 0) * 0.33),
                calculated_damage_pesante: Math.floor(Number(ds.damage_pesante || 0) * 0.33),
                calculated_damage_affondo: Math.floor(Number(ds.damage_affondo || 0) * 0.33),
              }))
              .filter((ds) => String((ds as any)?.effect_name || '').trim()),
          }))
          .filter((a) => String(a?.name || '').trim() && Array.isArray(a?.damage_sets) && a.damage_sets.length > 0);
        newItemData = {
          ...newItemData,
          equipment_meta: {
            weapon_type_id: type === 'arma' ? (equipmentMeta.weapon_type_id ?? undefined) : undefined,
            weapon_type_name: type === 'arma' ? (equipmentMeta.weapon_type_name ?? undefined) : undefined,
            weapon_type_category: type === 'arma' ? (equipmentMeta.weapon_type_category ?? undefined) : undefined,
            material_id: type === 'arma' ? (equipmentMeta.material_id ?? undefined) : undefined,
            material_name: type === 'arma' ? (equipmentMeta.material_name ?? undefined) : undefined,
            weapon_subtype_detail: subtype?.trim() ? subtype : undefined,
            damage_sets: computedSets,
            ...(type === 'arma' && alternateDamagesEnabled && computedAlternateDamages.length > 0 ? {
              alternate_damages: computedAlternateDamages,
              alternate_damage: computedAlternateDamages[0],
            } : {}),
            ...(cleanedCustomSpecifics.length > 0 ? { custom_specifics: cleanedCustomSpecifics } : {}),
            statusAnomalies: equipmentAnomaliesEnabled ? equipmentAnomalies : undefined,
            ...(powerUnlockEnabled && ((unlockedPowers.abilities.length > 0) || (unlockedPowers.spells.length > 0))
              ? { unlockedPowers }
              : {}),
          }
        };

        if (type === 'arma' && computedSets.length > 0) {
          const sum = (arr: any[], key: string) => arr.reduce((tot, s) => tot + (Number((s as any)?.[key]) || 0), 0);
          const veloceBase = sum(computedSets, 'damage_veloce');
          const pesanteBase = sum(computedSets, 'damage_pesante');
          const affondoBase = sum(computedSets, 'damage_affondo');
          patch.damage = {
            veloce: veloceBase,
            pesante: pesanteBase,
            affondo: affondoBase,
          };
        }
      } else if (cleanedCustomSpecifics.length > 0) {
        newItemData = { ...newItemData, custom_specifics: cleanedCustomSpecifics };
      }

      const prunedItemData = pruneEmptyFields(newItemData);
      if (prunedItemData !== undefined) {
        patch.item_data = prunedItemData;
      } else if (existingItemData && typeof existingItemData === 'object' && !Array.isArray(existingItemData) && Object.keys(existingItemData).length > 0) {
        patch.item_data = {};
      }

      const res: any = await supabase
        .from('market_items')
        .update(patch)
        .eq('id', item.id);

      if (res?.error) throw res.error;
      const updated = (res?.data || item) as MarketItem;
      toast({ title: 'Oggetto aggiornato', description: 'Le modifiche sono state salvate' });
      onItemUpdated(updated);
      onClose();
    } catch (error) {
      toast({ title: 'Errore', description: 'Impossibile salvare le modifiche', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Oggetto</DialogTitle>
          <DialogDescription>Modifica i dati dell'oggetto del negozio</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(type === 'arma' || type === 'armatura') && (
            <div>
              <Label htmlFor="subtype">Sottotipo</Label>
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sottotipo" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubtypes().map((st) => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'arma' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo arma (Supabase)</Label>
                <Select
                  value={equipmentMeta.weapon_type_id ? String(equipmentMeta.weapon_type_id) : ''}
                  onValueChange={(value) => {
                    const wt = weaponTypes.find((t: any) => String(t.id) === String(value));
                    setEquipmentMeta(prev => ({
                      ...prev,
                      weapon_type_id: value,
                      weapon_type_name: wt?.name ?? null,
                      weapon_type_category: wt?.category ?? null,
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
                <Label>Materiale</Label>
                <Select
                  value={equipmentMeta.material_id ? String(equipmentMeta.material_id) : ''}
                  onValueChange={(value) => {
                    const mat = materials.find((m: any) => String(m.id) === String(value));
                    setEquipmentMeta(prev => ({
                      ...prev,
                      material_id: value,
                      material_name: mat?.name ?? null,
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
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome oggetto" />
          </div>
          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Bronzo</Label>
              <Input type="number" value={price_bronzo} onChange={(e) => setPriceBronzo(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Argento</Label>
              <Input type="number" value={price_argento} onChange={(e) => setPriceArgento(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Oro</Label>
              <Input type="number" value={price_oro} onChange={(e) => setPriceOro(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Rosse</Label>
              <Input type="number" value={price_rosse} onChange={(e) => setPriceRosse(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Bianche</Label>
              <Input type="number" value={price_bianche} onChange={(e) => setPriceBianche(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Peso</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} />
            </div>
            {type !== 'servizio' && (
              <div>
                <Label>Quantità</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
            )}
            {type === 'armatura' && (
              <div>
                <Label>Armatura</Label>
                <Input type="number" value={armor} onChange={(e) => setArmor(parseInt(e.target.value) || 0)} />
              </div>
            )}
            {type === 'pozione' && (
              <div>
                <Label>Effetto</Label>
                <Input value={effect} onChange={(e) => setEffect(e.target.value)} />
              </div>
            )}
          </div>
          {type === 'arma' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Set Danni (per effetto)</Label>
                <Button type="button" variant="secondary" onClick={() => setEquipmentDamageSets(prev => ([...prev, { effect_name: '', damage_veloce: 0, damage_pesante: 0, damage_affondo: 0 }]))}>Aggiungi effetto</Button>
              </div>
              <div className="space-y-3">
                {equipmentDamageSets.map((ds, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label>Effetto</Label>
                      <Select value={ds.effect_name || ''} onValueChange={(value) => setEquipmentDamageSets(prev => prev.map((x, i) => i === idx ? { ...x, effect_name: value } : x))}>
                        <SelectTrigger>
                          <SelectValue placeholder={damageEffectOptions.length === 0 ? 'Caricamento...' : 'Seleziona effetto'} />
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
                          <Input type="number" value={Number(ds.damage_veloce || 0)} min="0" onChange={(e) => setEquipmentDamageSets(prev => prev.map((x, i) => i === idx ? { ...x, damage_veloce: parseInt(e.target.value) || 0 } : x))} />
                        </div>
                        <div>
                          <Label>Pesante</Label>
                          <Input type="number" value={Number(ds.damage_pesante || 0)} min="0" onChange={(e) => setEquipmentDamageSets(prev => prev.map((x, i) => i === idx ? { ...x, damage_pesante: parseInt(e.target.value) || 0 } : x))} />
                        </div>
                        <div>
                          <Label>Affondo</Label>
                          <Input type="number" value={Number(ds.damage_affondo || 0)} min="0" onChange={(e) => setEquipmentDamageSets(prev => prev.map((x, i) => i === idx ? { ...x, damage_affondo: parseInt(e.target.value) || 0 } : x))} />
                        </div>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" onClick={() => setEquipmentDamageSets(prev => prev.filter((_, i) => i !== idx))}>Rimuovi</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Danni alternativi</Label>
                  </div>
                  <Switch checked={alternateDamagesEnabled} onCheckedChange={(checked) => {
                    setAlternateDamagesEnabled(checked);
                    if (!checked) {
                      setAlternateDamages([]);
                    } else {
                      setAlternateDamages((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : [{ name: '', damage_sets: [] }]));
                    }
                  }} />
                </div>

                {alternateDamagesEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Profili</Label>
                      <Button type="button" variant="secondary" onClick={() => setAlternateDamages(prev => ([...(Array.isArray(prev) ? prev : []), { name: '', damage_sets: [] }]))}>Aggiungi danno alternativo</Button>
                    </div>

                    <div className="space-y-3">
                      {(alternateDamages || []).map((alt, altIdx) => (
                        <div key={`alt:${altIdx}`} className="space-y-3 rounded-md border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <Label>Nome</Label>
                              <Input
                                value={String(alt?.name || '')}
                                onChange={(e) => setAlternateDamages(prev => (prev || []).map((x, i) => i === altIdx ? { ...x, name: e.target.value } : x))}
                                placeholder="Es. Fuoco, Veleno, Sacro..."
                              />
                            </div>
                            <Button type="button" variant="destructive" onClick={() => setAlternateDamages(prev => (prev || []).filter((_, i) => i !== altIdx))}>Rimuovi</Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label>Set danni (per effetto)</Label>
                            <Button type="button" variant="secondary" onClick={() => setAlternateDamages(prev => (prev || []).map((x, i) => i === altIdx ? { ...x, damage_sets: [...(Array.isArray((x as any)?.damage_sets) ? (x as any).damage_sets : []), { effect_name: '', damage_veloce: 0, damage_pesante: 0, damage_affondo: 0 }] } : x))}>Aggiungi effetto</Button>
                          </div>

                          <div className="space-y-3">
                            {(((alt as any)?.damage_sets || []) as any[]).map((ds: any, dsIdx: number) => (
                              <div key={`alt:${altIdx}:${dsIdx}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                <div className="md:col-span-2">
                                  <Label>Effetto</Label>
                                  <Select value={ds.effect_name || ''} onValueChange={(value) => setAlternateDamages(prev => (prev || []).map((x, i) => {
                                    if (i !== altIdx) return x;
                                    const sets = (Array.isArray((x as any)?.damage_sets) ? (x as any).damage_sets : []).map((s: any, si: number) => si === dsIdx ? { ...s, effect_name: value } : s);
                                    return { ...x, damage_sets: sets };
                                  }))}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={damageEffectOptions.length === 0 ? 'Caricamento...' : 'Seleziona effetto'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {damageEffectOptions.map((opt: any) => (
                                        <SelectItem key={`altopt:${altIdx}:${opt.id}`} value={opt.name}>{opt.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(ds.effect_name && ds.effect_name.length > 0) && (
                                  <>
                                    <div>
                                      <Label>Veloce</Label>
                                      <Input type="number" value={Number(ds.damage_veloce || 0)} min="0" onChange={(e) => setAlternateDamages(prev => (prev || []).map((x, i) => {
                                        if (i !== altIdx) return x;
                                        const sets = (Array.isArray((x as any)?.damage_sets) ? (x as any).damage_sets : []).map((s: any, si: number) => si === dsIdx ? { ...s, damage_veloce: parseInt(e.target.value) || 0 } : s);
                                        return { ...x, damage_sets: sets };
                                      }))} />
                                    </div>
                                    <div>
                                      <Label>Pesante</Label>
                                      <Input type="number" value={Number(ds.damage_pesante || 0)} min="0" onChange={(e) => setAlternateDamages(prev => (prev || []).map((x, i) => {
                                        if (i !== altIdx) return x;
                                        const sets = (Array.isArray((x as any)?.damage_sets) ? (x as any).damage_sets : []).map((s: any, si: number) => si === dsIdx ? { ...s, damage_pesante: parseInt(e.target.value) || 0 } : s);
                                        return { ...x, damage_sets: sets };
                                      }))} />
                                    </div>
                                    <div>
                                      <Label>Affondo</Label>
                                      <Input type="number" value={Number(ds.damage_affondo || 0)} min="0" onChange={(e) => setAlternateDamages(prev => (prev || []).map((x, i) => {
                                        if (i !== altIdx) return x;
                                        const sets = (Array.isArray((x as any)?.damage_sets) ? (x as any).damage_sets : []).map((s: any, si: number) => si === dsIdx ? { ...s, damage_affondo: parseInt(e.target.value) || 0 } : s);
                                        return { ...x, damage_sets: sets };
                                      }))} />
                                    </div>
                                  </>
                                )}
                                <div className="flex gap-2">
                                  <Button type="button" variant="destructive" onClick={() => setAlternateDamages(prev => (prev || []).map((x, i) => {
                                    if (i !== altIdx) return x;
                                    const sets = (Array.isArray((x as any)?.damage_sets) ? (x as any).damage_sets : []).filter((_: any, si: number) => si !== dsIdx);
                                    return { ...x, damage_sets: sets };
                                  }))}>Rimuovi</Button>
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
          {type === 'pozione' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ripristina?</Label>
                <Select value={potionIsRestore ? 'si' : 'no'} onValueChange={(v) => setPotionIsRestore(v === 'si')}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {potionIsRestore && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Aggiungi effetto danno</Label>
                    <Button type="button" variant="secondary" onClick={() => {
                      const opt = damageEffectOptions[0];
                      if (opt) {
                        const exists = selectedDamageSets.some(d => d.damageEffectId === opt.id);
                        if (!exists) {
                          setSelectedDamageSets(prev => ([...prev, { damageEffectId: opt.id, effect_name: opt.name, guaranteedDamage: 0, additionalDamage: 0 }]));
                        }
                      }
                    }}>Aggiungi effetto</Button>
                  </div>

                  <Select
                    value={''}
                    onValueChange={(value) => {
                      const opt = damageEffectOptions.find(o => o.id === value);
                      const exists = selectedDamageSets.some(d => d.damageEffectId === value);
                      if (!exists && opt) {
                        setSelectedDamageSets(prev => ([...prev, { damageEffectId: opt.id, effect_name: opt.name, guaranteedDamage: 0, additionalDamage: 0 }]));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aggiungi effetto danno" />
                    </SelectTrigger>
                    <SelectContent>
                      {damageEffectOptions.map(opt => (
                        <SelectItem key={`dmgsel:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDamageSets.length > 0 && (
                    <div className="space-y-2">
                      {selectedDamageSets.map((d) => (
                        <div key={`set:${d.damageEffectId}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <div className="text-sm font-medium">{d.effect_name}</div>
                          </div>
                          <div>
                            <Label className="text-xs">Assicurato</Label>
                            <Input type="number" min="0" value={d.guaranteedDamage} onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSelectedDamageSets(prev => prev.map(x => x.damageEffectId === d.damageEffectId ? { ...x, guaranteedDamage: val } : x));
                            }} />
                          </div>
                          <div>
                            <Label className="text-xs">Aggiuntivo</Label>
                            <Input type="number" min="0" value={d.additionalDamage} onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSelectedDamageSets(prev => prev.map(x => x.damageEffectId === d.damageEffectId ? { ...x, additionalDamage: val } : x));
                            }} />
                          </div>
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => setSelectedDamageSets(prev => prev.filter(x => x.damageEffectId !== d.damageEffectId))}>Rimuovi</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Anomalia?</Label>
                  <Select value={potionHasAnomaly ? 'si' : 'no'} onValueChange={(v) => {
                    const flag = v === 'si';
                    setPotionHasAnomaly(flag);
                    if (!flag) {
                      setPotionAnomaly(null);
                      setImportedAnomalyId(null);
                    }
                  }}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sì</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {potionHasAnomaly && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => setAnomalyModalOpen(true)}>Crea Anomalia</Button>
                      <div className="flex-1">
                        <Label>Importa anomalia</Label>
                        <Select
                          value={importedAnomalyId ?? ''}
                          onValueChange={async (value) => {
                            if (value === 'none') {
                              setImportedAnomalyId(null);
                              setPotionAnomaly(null);
                              setPotionHasAnomaly(false);
                              return;
                            }
                            setImportedAnomalyId(value);
                            try {
                              const row = await getAnomalyById(value);
                              const statsAny = (row as any)?.stats || {};
                              const a: StatusAnomaly = {
                                id: String(row?.id || value),
                                name: String(row?.name || ''),
                                description: String(row?.description || ''),
                                actionPointsModifier: Number((row as any)?.temp_action_points ?? 0) || 0,
                                healthModifier: Number((row as any)?.temp_health ?? 0) || 0,
                                armorModifier: Number((row as any)?.temp_armour ?? 0) || 0,
                                turns: (row as any)?.turns ?? undefined,
                                statsModifier: (statsAny?.stats_modifier || statsAny?.statsModifier || {
                                  forza: 0, percezione: 0, resistenza: 0,
                                  intelletto: 0, agilita: 0, sapienza: 0, anima: 0,
                                }),
                                damageSets: Array.isArray(statsAny?.damage_sets) ? statsAny.damage_sets.map((s: any) => ({
                                  damageEffectId: s.damageEffectId ?? s.damage_effect_id,
                                  effectName: s.effect_name,
                                  guaranteedDamage: Number(s.guaranteedDamage ?? s.guaranteed_damage ?? 0) || 0,
                                  additionalDamage: Number(s.additionalDamage ?? s.additional_damage ?? 0) || 0,
                                })) : undefined,
                                damageBonusEnabled: !!(statsAny?.damage_bonus_enabled ?? statsAny?.damageBonusEnabled),
                                damageBonus: (statsAny?.damage_bonus ?? statsAny?.damageBonus) || undefined,
                                paDiscountEnabled: !!(statsAny?.pa_discount_enabled ?? statsAny?.paDiscountEnabled),
                                paDiscount: (statsAny?.pa_discount ?? statsAny?.paDiscount) || undefined,
                              };
                              setPotionAnomaly(a);
                            } catch {
                              setPotionAnomaly(null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona anomalia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nessuna</SelectItem>
                            {anomalyOptions.map((opt) => (
                              <SelectItem key={`anom:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {potionAnomaly && (
                      <div className="p-3 border rounded-md space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-base font-semibold">{potionAnomaly.name}</div>
                            {potionAnomaly.description && (
                              <div className="text-sm text-muted-foreground mt-1">{potionAnomaly.description}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <AnomalyModal
                  isOpen={anomalyModalOpen}
                  onClose={() => setAnomalyModalOpen(false)}
                  onSave={(anom) => {
                    setPotionAnomaly(anom);
                    setImportedAnomalyId(null);
                    setPotionHasAnomaly(true);
                    setAnomalyModalOpen(false);
                  }}
                  editingAnomaly={null}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Anima</Label>
              <Input type="number" value={stats.anima} onChange={(e) => setStats({ ...stats, anima: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Forza</Label>
              <Input type="number" value={stats.forza} onChange={(e) => setStats({ ...stats, forza: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Agilità</Label>
              <Input type="number" value={stats.agilita} onChange={(e) => setStats({ ...stats, agilita: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Sapienza</Label>
              <Input type="number" value={stats.sapienza} onChange={(e) => setStats({ ...stats, sapienza: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Intelletto</Label>
              <Input type="number" value={stats.intelletto} onChange={(e) => setStats({ ...stats, intelletto: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Percezione</Label>
              <Input type="number" value={stats.percezione} onChange={(e) => setStats({ ...stats, percezione: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Resistenza</Label>
              <Input type="number" value={stats.resistenza} onChange={(e) => setStats({ ...stats, resistenza: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          {type !== 'servizio' && (
            <div className="space-y-2">
              <Label>Imposta specifiche</Label>
              {(() => {
                const list: any[] = Array.isArray((equipmentMeta as any).custom_specifics) ? ((equipmentMeta as any).custom_specifics as any[]) : [];
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
                            const next = list.slice();
                            next[idx] = { ...next[idx], id: val, name: picked?.name ?? '' };
                            setEquipmentMeta((prev) => ({ ...prev, custom_specifics: next }));
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
                            const next = list.slice();
                            next[idx] = { ...next[idx], max: v };
                            setEquipmentMeta((prev) => ({ ...prev, custom_specifics: next }));
                          }}
                          min="0"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            const next = list.slice();
                            next.splice(idx, 1);
                            setEquipmentMeta((prev) => ({ ...prev, custom_specifics: next }));
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
                        const next = list.slice();
                        next.push({ id: '', name: '', max: 0 });
                        setEquipmentMeta((prev) => ({ ...prev, custom_specifics: next }));
                      }}
                    >
                      Aggiungi specifica
                    </Button>
                  </div>
                );
              })()}
            </div>
          )}
          {(type === 'armatura' || type === 'arma') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Anomalie di stato?</Label>
                </div>
                <Select value={equipmentAnomaliesEnabled ? 'si' : 'no'} onValueChange={(v) => {
                  const flag = v === 'si';
                  setEquipmentAnomaliesEnabled(flag);
                  if (!flag) setEquipmentAnomalies([]);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {equipmentAnomaliesEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Anomalie dell'oggetto</Label>
                    <Button type="button" variant="secondary" onClick={() => setEquipmentAnomalyModalOpen(true)}>
                      Aggiungi anomalia
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {equipmentAnomalies.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Nessuna anomalia definita.</div>
                    ) : (
                      equipmentAnomalies.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                          <div>
                            <div className="text-sm font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">{a.description}</div>
                          </div>
                          <Button type="button" variant="destructive" size="sm" onClick={() => setEquipmentAnomalies(prev => prev.filter(x => x.id !== a.id))}>Rimuovi</Button>
                        </div>
                      ))
                    )}
                  </div>
                  <AnomalyModal
                    isOpen={equipmentAnomalyModalOpen}
                    onClose={() => setEquipmentAnomalyModalOpen(false)}
                    onSave={(anom) => {
                      setEquipmentAnomalies(prev => [...prev, anom]);
                      setEquipmentAnomalyModalOpen(false);
                    }}
                    editingAnomaly={null}
                  />
                </div>
              )}
            </div>
          )}

          {(type === 'armatura' || type === 'arma') && (
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
                      setUnlockedPowers({ abilities: [], spells: [] });
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
                    {(unlockedPowers.abilities.length === 0) && (unlockedPowers.spells.length === 0) ? (
                      <p className="text-xs text-muted-foreground">Nessun potere selezionato.</p>
                    ) : (
                      <>
                        {unlockedPowers.abilities.map((row, idx) => (
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
                                setUnlockedPowers((prev) => {
                                  const next = prev.abilities.slice();
                                  next.splice(idx, 1);
                                  return { ...prev, abilities: next };
                                });
                              }}
                            >
                              Rimuovi
                            </Button>
                          </div>
                        ))}

                        {unlockedPowers.spells.map((row, idx) => (
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
                                setUnlockedPowers((prev) => {
                                  const next = prev.spells.slice();
                                  next.splice(idx, 1);
                                  return { ...prev, spells: next };
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
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva Modifiche
            </Button>
          </DialogFooter>
        </form>

        <ImportAbilityModal
          isOpen={abilitySelectorOpen}
          onOpenChange={setAbilitySelectorOpen}
          mode="inline"
          onConfirm={({ ability, level }) => {
            setUnlockedPowers((prev) => ({ ...prev, abilities: [...prev.abilities, { name: String(ability?.name ?? 'Abilità'), ability_id: String(ability?.id ?? ''), level }] }));
            setPowerUnlockEnabled(true);
          }}
        />

        <ImportSpellModal
          isOpen={spellSelectorOpen}
          onOpenChange={setSpellSelectorOpen}
          mode="inline"
          onConfirm={({ spell, level }) => {
            setUnlockedPowers((prev) => ({ ...prev, spells: [...prev.spells, { name: String(spell?.name ?? 'Magia'), spell_id: String(spell?.id ?? ''), level }] }));
            setPowerUnlockEnabled(true);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
