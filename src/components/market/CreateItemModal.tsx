import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { readSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Shield, Sword } from 'lucide-react';
import { ARMOR_SUBTYPES, WEAPON_SUBTYPES, CharacterStats, StatusAnomaly } from '@/types/character';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal';
import { ImportSpellModal } from '@/components/magic/ImportSpellModal';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { listAnomalies, getAnomalyById } from '@/integrations/supabase/anomalies';
import { listMaterials } from '@/integrations/supabase/materials';
import { listWeaponTypes } from '@/integrations/supabase/weaponTypes';
import { isAllZeroStats, pruneEmptyFields } from '@/lib/utils';

interface CreateItemModalProps {
  shopId: string;
  onClose: () => void;
  onItemCreated: () => void;
}

type ItemType = 'arma' | 'armatura' | 'pozione' | 'oggetto' | 'servizio';

type UnlockedPowers = {
  abilities: Array<{ name?: string; ability_id?: string; level: number; ability?: unknown }>;
  spells: Array<{ name?: string; spell_id?: string; level: number; spell?: unknown }>;
};

type EquipmentMetaState = {
  weapon_type_id?: string | null;
  weapon_type_name?: string | null;
  weapon_type_category?: string | null;
  material_id?: string | null;
  material_name?: string | null;
  weapon_subtype_detail?: string | null;
  custom_specifics?: Array<{ id: string; name: string; max: number }>;
};

type MaterialOption = { id: string; name: string };
type WeaponTypeOption = { id: string; name: string; category: string };

type WeaponDamageSetState = {
  effect_name: string;
  damage_veloce: number;
  damage_pesante: number;
  damage_affondo: number;
  calculated_damage_veloce?: number;
  calculated_damage_pesante?: number;
  calculated_damage_affondo?: number;
};

type AlternateDamageState = { name: string; damage_sets: WeaponDamageSetState[] };

type PotionDamageSetState = {
  damageEffectId: string;
  effect_name: string;
  guaranteedDamage: number;
  additionalDamage: number;
};

type PotionMetaState = {
  isRestore: boolean;
  damageSets: PotionDamageSetState[];
  hasAnomaly: boolean;
  anomaly?: StatusAnomaly;
  anomalyId?: string;
};

type EquipmentMetaPayload = EquipmentMetaState & {
  damage_sets: WeaponDamageSetState[];
  alternate_damages?: AlternateDamageState[];
  alternate_damage?: AlternateDamageState;
  statusAnomalies?: StatusAnomaly[];
  unlockedPowers?: UnlockedPowers;
};

type ItemDataPayload = {
  potion_meta?: PotionMetaState;
  equipment_meta?: EquipmentMetaPayload;
};

type MarketItemInsert = {
  shop_id: string;
  name: string;
  type: ItemType;
  description?: string;
  price_oro?: number;
  price_argento?: number;
  price_bronzo?: number;
  price_rosse?: number;
  price_bianche?: number;
  created_by: string;
  subtype?: string;
  weight?: number;
  quantity?: number;
  armor?: number;
  damage?: { veloce: number; pesante: number; affondo: number };
  effect?: string;
  stats?: CharacterStats;
  item_data?: ItemDataPayload;
};

type FormDataState = {
  name: string;
  type: ItemType;
  subtype: string;
  description: string;
  price_bronzo: number;
  price_argento: number;
  price_oro: number;
  price_rosse: number;
  price_bianche: number;
  weight: number;
  quantity: number;
  armor: number;
  damageVeloce: number;
  damagePesante: number;
  damageAffondo: number;
  potionEffect: string;
  unlockedPowers: UnlockedPowers;
  stats: CharacterStats;
};

// Tipi di oggetto basati sulla struttura dell'inventario
const ITEM_TYPES = [
  { value: 'arma', label: 'Arma' },
  { value: 'armatura', label: 'Armatura' },
  { value: 'pozione', label: 'Pozione' },
  { value: 'oggetto', label: 'Oggetto' },
  { value: 'servizio', label: 'Servizio' }
];

const CreateItemModal = ({ shopId, onClose, onItemCreated }: CreateItemModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    type: 'oggetto',
    subtype: '',
    description: '',
    price_bronzo: 0,
    price_argento: 0,
    price_oro: 0,
    price_rosse: 0,
    price_bianche: 0,
    weight: 0,
    quantity: 1,
    armor: 0,
    damageVeloce: 0,
    damagePesante: 0,
    damageAffondo: 0,
    potionEffect: '',
    unlockedPowers: {
      abilities: [],
      spells: [],
    },
    stats: {
      anima: 0,
      forza: 0,
      agilita: 0,
      sapienza: 0,
      intelletto: 0,
      percezione: 0,
      resistenza: 0
    }
  });

  const [damageEffectOptions, setDamageEffectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDamageSets, setSelectedDamageSets] = useState<Array<{ damageEffectId: string; effect_name: string; guaranteedDamage: number; additionalDamage: number }>>([]);
  const [anomalyOptions, setAnomalyOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [potionAnomaly, setPotionAnomaly] = useState<StatusAnomaly | null>(null);
  const [importedAnomalyId, setImportedAnomalyId] = useState<string | null>(null);
  const [potionHasAnomaly, setPotionHasAnomaly] = useState<boolean>(false);
  const [potionIsRestore, setPotionIsRestore] = useState<boolean>(false);

  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [weaponTypes, setWeaponTypes] = useState<WeaponTypeOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [loadingWeaponTypes, setLoadingWeaponTypes] = useState<boolean>(false);
  const [equipmentDamageSets, setEquipmentDamageSets] = useState<WeaponDamageSetState[]>([]);
  const [alternateDamageEnabled, setAlternateDamageEnabled] = useState<boolean>(false);
  const [alternateDamages, setAlternateDamages] = useState<AlternateDamageState[]>([]);
  const [equipmentAnomaliesEnabled, setEquipmentAnomaliesEnabled] = useState<boolean>(false);
  const [equipmentAnomalies, setEquipmentAnomalies] = useState<StatusAnomaly[]>([]);
  const [equipmentAnomalyModalOpen, setEquipmentAnomalyModalOpen] = useState<boolean>(false);
  const [equipmentMeta, setEquipmentMeta] = useState<EquipmentMetaState>({});
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
    setSpecificCatalog(readSpecificCatalog());
  }, []);

  const setItemDataEquipmentMeta = <K extends keyof EquipmentMetaState>(key: K, value: EquipmentMetaState[K]) => {
    setEquipmentMeta(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const dmg = await listDamageEffects();
        const dmgOpts = (Array.isArray(dmg) ? dmg : []).map((d) => ({
          id: String((d as { id: string | number }).id),
          name: String((d as { name: string }).name),
        }));
        setDamageEffectOptions(dmgOpts);
      } catch {
        setDamageEffectOptions([]);
      }
      try {
        const anoms = await listAnomalies();
        const anOpts = (Array.isArray(anoms) ? anoms : []).map((a) => ({
          id: String((a as { id: string | number }).id),
          name: String((a as { name: string }).name),
        }));
        setAnomalyOptions(anOpts);
      } catch {
        setAnomalyOptions([]);
      }
    };
    if (formData.type === 'pozione' || formData.type === 'arma') loadOptions();
  }, [formData.type]);

  useEffect(() => {
    const loadLists = async () => {
      try {
        setLoadingMaterials(true);
        setLoadingWeaponTypes(true);
        const [mat, wt] = await Promise.all([
          listMaterials(),
          listWeaponTypes()
        ]);
        const matOpts = (Array.isArray(mat) ? mat : []).map((m) => ({
          id: String((m as { id: string | number }).id),
          name: String((m as { name: string }).name),
        }));
        const wtOpts = (Array.isArray(wt) ? wt : []).map((t) => ({
          id: String((t as { id: string | number }).id),
          name: String((t as { name: string }).name),
          category: String((t as { category: string }).category),
        }));
        setMaterials(matOpts);
        setWeaponTypes(wtOpts);
      } catch {
        setMaterials([]);
        setWeaponTypes([]);
      } finally {
        setLoadingMaterials(false);
        setLoadingWeaponTypes(false);
      }
    };
    if (formData.type === 'arma') loadLists();
  }, [formData.type]);

  const handleTypeChange = (value: ItemType) => {
    setPowerUnlockEnabled(false);
    setAlternateDamageEnabled(false);
    setAlternateDamages([]);
    setEquipmentDamageSets([]);
    setEquipmentMeta({});
    setEquipmentAnomaliesEnabled(false);
    setEquipmentAnomalies([]);
    setSelectedDamageSets([]);
    setPotionAnomaly(null);
    setImportedAnomalyId(null);
    setPotionHasAnomaly(false);
    setPotionIsRestore(false);
    setFormData(prev => ({
      ...prev,
      type: value,
      subtype: '',
      unlockedPowers: { abilities: [], spells: [] }
    }));
  };

  const handleStatChange = (stat: keyof CharacterStats, value: string) => {
    setFormData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: parseInt(value) || 0
      }
    }));
  };

  const formatSubtypeLabel = (value: string) =>
    value
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const getAvailableSubtypes = () => {
    if (formData.type === 'arma') return WEAPON_SUBTYPES.map((v) => ({ value: v, label: formatSubtypeLabel(v) }));
    if (formData.type === 'armatura') return ARMOR_SUBTYPES.map((v) => ({ value: v, label: formatSubtypeLabel(v) }));
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.type) {
      toast({
        title: "Errore",
        description: "Nome e tipo sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per creare oggetti",
        variant: "destructive"
      });
      return;
    }

    if ((formData.type === 'arma' || formData.type === 'armatura') && !formData.subtype) {
      toast({
        title: "Errore",
        description: "Il sottotipo è obbligatorio per armi e armature",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === 'arma' && (!equipmentMeta.weapon_type_id || !equipmentMeta.material_id)) {
      toast({
        title: "Errore",
        description: "Seleziona tipo arma e materiale",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === 'arma' && alternateDamageEnabled) {
      if (alternateDamages.length === 0) {
        toast({
          title: "Errore",
          description: "Aggiungi almeno un danno alternativo",
          variant: "destructive"
        });
        return;
      }

      for (const alt of alternateDamages) {
        const name = String(alt?.name || '').trim();
        const setsAll = Array.isArray(alt?.damage_sets) ? alt.damage_sets : [];
        const sets = setsAll.filter((s) => String(s?.effect_name || '').trim());
        const hasAny = !!name || setsAll.length > 0;

        if (!hasAny) continue;

        if (!name) {
          toast({
            title: "Errore",
            description: "Inserisci il nome del danno alternativo",
            variant: "destructive"
          });
          return;
        }
        if (sets.length === 0) {
          toast({
            title: "Errore",
            description: "Aggiungi almeno un damage effect per ogni danno alternativo",
            variant: "destructive"
          });
          return;
        }
      }

      const cleanedAlt = alternateDamages
        .map((alt) => ({
          name: String(alt?.name || '').trim(),
          damage_sets: (Array.isArray(alt?.damage_sets) ? alt.damage_sets : [])
            .filter((s) => String(s?.effect_name || '').trim())
        }))
        .filter((alt) => alt.name && alt.damage_sets.length > 0);

      if (cleanedAlt.length === 0) {
        toast({
          title: "Errore",
          description: "Completa almeno un danno alternativo (nome + almeno un effetto)",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setIsLoading(true);
  
      const baseItemData: MarketItemInsert = {
        shop_id: shopId,
        name: formData.name,
        type: formData.type,
        description: formData.description?.trim() ? formData.description : undefined,
        price_oro: formData.price_oro ? formData.price_oro : undefined,
        price_argento: formData.price_argento ? formData.price_argento : undefined,
        price_bronzo: formData.price_bronzo ? formData.price_bronzo : undefined,
        price_rosse: formData.price_rosse ? formData.price_rosse : undefined,
        price_bianche: formData.price_bianche ? formData.price_bianche : undefined,
        created_by: user.id
      };
  
      let itemData: MarketItemInsert = {
        ...baseItemData,
        ...(formData.subtype && { subtype: formData.subtype }),
        ...(Number.isFinite(formData.weight) && { weight: Number(formData.weight) || 0 }),
        ...(Number.isFinite(formData.quantity) && { quantity: Number(formData.quantity) || 0 }),
        ...(formData.type === 'armatura' && { armor: Number(formData.armor) || 0 }),
        ...(formData.type === 'arma' && (formData.damageVeloce || formData.damagePesante || formData.damageAffondo) && {
          damage: {
            veloce: formData.damageVeloce || 0,
            pesante: formData.damagePesante || 0,
            affondo: formData.damageAffondo || 0
          }
        }),
        ...(formData.type === 'pozione' && formData.potionEffect && { effect: formData.potionEffect }),
        ...(!isAllZeroStats(formData.stats) && { stats: formData.stats })
      };

      const cleanedCustomSpecifics = normalizeCustomSpecifics((equipmentMeta as any).custom_specifics);

      if (formData.type === 'pozione') {
        itemData.item_data = {
          ...(itemData.item_data || {}),
          potion_meta: {
            isRestore: !!potionIsRestore,
            damageSets: selectedDamageSets.map((d): PotionDamageSetState => ({
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

      if (formData.type === 'armatura' || formData.type === 'arma') {
        const computedSets: WeaponDamageSetState[] = equipmentDamageSets.map((ds) => ({
          ...ds,
          calculated_damage_veloce: Math.floor(ds.damage_veloce * 0.33),
          calculated_damage_pesante: Math.floor(ds.damage_pesante * 0.33),
          calculated_damage_affondo: Math.floor(ds.damage_affondo * 0.33),
        }));

        const computedAlternateDamages: AlternateDamageState[] = alternateDamages
          .map((alt) => {
            const computedAltSets = (alt.damage_sets || [])
              .filter((ds) => ds.effect_name.trim())
              .map((ds) => ({
                ...ds,
                calculated_damage_veloce: Math.floor(ds.damage_veloce * 0.33),
                calculated_damage_pesante: Math.floor(ds.damage_pesante * 0.33),
                calculated_damage_affondo: Math.floor(ds.damage_affondo * 0.33),
              }));
            return { name: alt.name.trim(), damage_sets: computedAltSets };
          })
          .filter((alt) => alt.name && alt.damage_sets.length > 0);
        itemData.item_data = {
          ...(itemData.item_data || {}),
          equipment_meta: {
            weapon_type_id: formData.type === 'arma' ? (equipmentMeta.weapon_type_id ?? undefined) : undefined,
            weapon_type_name: formData.type === 'arma' ? (equipmentMeta.weapon_type_name ?? undefined) : undefined,
            weapon_type_category: formData.type === 'arma' ? (equipmentMeta.weapon_type_category ?? undefined) : undefined,
            material_id: formData.type === 'arma' ? (equipmentMeta.material_id ?? undefined) : undefined,
            material_name: formData.type === 'arma' ? (equipmentMeta.material_name ?? undefined) : undefined,
            weapon_subtype_detail: formData.type === 'arma' ? (equipmentMeta.weapon_subtype_detail?.trim() || undefined) : undefined,
            damage_sets: computedSets,
            ...(formData.type === 'arma' && alternateDamageEnabled && computedAlternateDamages.length > 0 ? {
              alternate_damages: computedAlternateDamages,
              alternate_damage: computedAlternateDamages[0],
            } : {}),
            ...(cleanedCustomSpecifics.length > 0 ? { custom_specifics: cleanedCustomSpecifics } : {}),
            statusAnomalies: equipmentAnomaliesEnabled ? equipmentAnomalies : undefined,
            ...(powerUnlockEnabled && (formData.unlockedPowers.abilities.length > 0 || formData.unlockedPowers.spells.length > 0)
              ? { unlockedPowers: formData.unlockedPowers }
              : {}),
          }
        };

        if (formData.type === 'arma' && computedSets.length > 0) {
          const veloceBase = computedSets.reduce((tot, s) => tot + (Number(s.damage_veloce) || 0), 0);
          const pesanteBase = computedSets.reduce((tot, s) => tot + (Number(s.damage_pesante) || 0), 0);
          const affondoBase = computedSets.reduce((tot, s) => tot + (Number(s.damage_affondo) || 0), 0);
          itemData.damage = {
            veloce: veloceBase,
            pesante: pesanteBase,
            affondo: affondoBase,
          };
        }
      } else if (cleanedCustomSpecifics.length > 0) {
        itemData.item_data = {
          ...(itemData.item_data || {}),
          custom_specifics: cleanedCustomSpecifics,
        };
      }
  
      itemData.item_data = pruneEmptyFields(itemData.item_data) || undefined;
      if (!itemData.item_data) delete itemData.item_data;
      itemData = pruneEmptyFields(itemData) || {};

      const { error } = await supabase
        .from('market_items')
        .insert([itemData]);
  
      if (error) throw error;
  
      toast({
        title: "Successo",
        description: "Oggetto creato con successo!"
      });
  
      onItemCreated();
      onClose();
    } catch (error) {
      console.error('Errore nella creazione dell\'oggetto:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'oggetto",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Oggetto</DialogTitle>
          <DialogDescription>
            Crea un nuovo oggetto per questo negozio. Compila i campi richiesti e imposta i prezzi nelle diverse valute.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo *</Label>
            <Select value={formData.type} onValueChange={(v) => handleTypeChange(v as ItemType)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.type === 'arma' || formData.type === 'armatura') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {formData.type === 'arma' ? <Sword className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                <Badge variant="secondary">{formData.type === 'arma' ? 'Arma' : 'Armatura'}</Badge>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-semibold text-lg">{formData.name || 'Oggetto senza nome'}</div>
                {formData.description && (
                  <div className="text-sm text-muted-foreground mt-1">{formData.description}</div>
                )}
              </div>
            </div>
          )}

          {/* Sottotipo (per armi e armature) */}
          {(formData.type === 'arma' || formData.type === 'armatura') && (
            <div>
              <Label htmlFor="subtype">Sottotipo *</Label>
              <Select value={formData.subtype} onValueChange={(value) => setFormData(prev => ({ ...prev, subtype: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sottotipo" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubtypes().map((subtype) => (
                    <SelectItem key={subtype.value} value={subtype.value}>
                      {subtype.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.type === 'arma' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weapon_type_id">Tipo arma (Supabase)</Label>
                <Select
                  value={equipmentMeta.weapon_type_id ? String(equipmentMeta.weapon_type_id) : ''}
                  onValueChange={(value) => {
                    const wt = weaponTypes.find((t) => String(t.id) === String(value));
                    setItemDataEquipmentMeta('weapon_type_id', value);
                    setItemDataEquipmentMeta('weapon_type_name', wt?.name ?? null);
                    setItemDataEquipmentMeta('weapon_type_category', wt?.category ?? null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingWeaponTypes ? 'Caricamento...' : 'Seleziona tipo arma'} />
                  </SelectTrigger>
                  <SelectContent>
                    {weaponTypes.map((wt) => (
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
                  value={equipmentMeta.material_id ? String(equipmentMeta.material_id) : ''}
                  onValueChange={(value) => {
                    const mat = materials.find((m) => String(m.id) === String(value));
                    setItemDataEquipmentMeta('material_id', value);
                    setItemDataEquipmentMeta('material_name', mat?.name ?? null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMaterials ? 'Caricamento...' : 'Seleziona materiale'} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.type === 'arma' && (
            <div>
              <Label htmlFor="weapon_subtype_detail">Dettaglio sottotipo (opzionale)</Label>
              <Input
                id="weapon_subtype_detail"
                value={equipmentMeta.weapon_subtype_detail ?? ''}
                onChange={(e) => setItemDataEquipmentMeta('weapon_subtype_detail', e.target.value)}
                placeholder="Es. Spada corta, Falchion, Ascia bipenne..."
              />
            </div>
          )}

          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome dell'oggetto"
              required
            />
          </div>

          {/* Costi in Corone - Tutte e 5 le valute */}
          <div className="space-y-2">
            <Label>Costo in Corone</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="price_bronzo" className="text-xs text-orange-600">Bronzo</Label>
                <Input
                  id="price_bronzo"
                  type="number"
                  value={formData.price_bronzo}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_bronzo: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="price_argento" className="text-xs text-gray-500">Argento</Label>
                <Input
                  id="price_argento"
                  type="number"
                  value={formData.price_argento}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_argento: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="price_oro" className="text-xs text-yellow-600">Oro</Label>
                <Input
                  id="price_oro"
                  type="number"
                  value={formData.price_oro}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_oro: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="price_rosse" className="text-xs text-red-600">Rosse</Label>
                <Input
                  id="price_rosse"
                  type="number"
                  value={formData.price_rosse}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_rosse: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label htmlFor="price_bianche" className="text-xs text-blue-600">Bianche</Label>
                <Input
                  id="price_bianche"
                  type="number"
                  value={formData.price_bianche}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_bianche: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Campi condizionali per oggetti fisici */}
          {formData.type !== 'servizio' && (
            <>
              {/* Peso e Quantità */}
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <Label htmlFor="quantity">Quantità</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
              </div>

              {/* Campi specifici per armature */}
              {formData.type === 'armatura' && (
                <div>
                  <Label htmlFor="armor">Valore Armatura</Label>
                  <Input
                    id="armor"
                    type="number"
                    value={formData.armor}
                    onChange={(e) => setFormData(prev => ({ ...prev, armor: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              )}

              {/* Campi specifici per armi */}
          {formData.type === 'arma' && (
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
                          {damageEffectOptions.map((opt) => (
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
                      <Button type="button" variant="destructive" onClick={() => setEquipmentDamageSets(prev => prev.filter((_, i) => i !== idx))}>
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Danni alternativi</Label>
                  </div>
                  <Switch checked={alternateDamageEnabled} onCheckedChange={(checked) => {
                    setAlternateDamageEnabled(checked);
                    if (!checked) {
                      setAlternateDamages([]);
                    } else if (alternateDamages.length === 0) {
                      setAlternateDamages([{ name: '', damage_sets: [] }]);
                    }
                  }} />
                </div>

                {alternateDamageEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Profili</Label>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setAlternateDamages(prev => ([...prev, { name: '', damage_sets: [] }]))}>
                        Aggiungi danno alternativo
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {alternateDamages.map((alt, altIdx) => (
                        <div key={`alt:${altIdx}`} className="rounded-md border p-3 space-y-3">
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Nome danno alternativo</Label>
                              <Input
                                value={alt.name}
                                onChange={(e) => setAlternateDamages(prev => prev.map((x, i) => i === altIdx ? { ...x, name: e.target.value } : x))}
                                placeholder="Es. Fuoco, Veleno, Sacro..."
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={alternateDamages.length <= 1}
                              onClick={() => setAlternateDamages(prev => prev.filter((_, i) => i !== altIdx))}
                            >
                              Rimuovi
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label>Set danni (per effetto)</Label>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setAlternateDamages(prev => prev.map((x, i) => {
                                if (i !== altIdx) return x;
                                return { ...x, damage_sets: [...(x.damage_sets || []), { effect_name: '', damage_veloce: 0, damage_pesante: 0, damage_affondo: 0 }] };
                              }))}
                            >
                              Aggiungi effetto
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {(alt.damage_sets || []).map((ds, setIdx) => (
                              <div key={`alt:${altIdx}:set:${setIdx}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                <div className="md:col-span-2">
                                  <Label>Effetto</Label>
                                  <Select
                                    value={ds.effect_name || ''}
                                    onValueChange={(value) => setAlternateDamages(prev => prev.map((x, i) => {
                                      if (i !== altIdx) return x;
                                      const nextSets = (x.damage_sets || []).map((s, si) => si === setIdx ? { ...s, effect_name: value } : s);
                                      return { ...x, damage_sets: nextSets };
                                    }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={damageEffectOptions.length === 0 ? 'Caricamento...' : 'Seleziona effetto'} />
                                    </SelectTrigger>
                                    <SelectContent>
                          {damageEffectOptions.map((opt) => (
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
                                      <Input
                                        type="number"
                                        value={Number(ds.damage_veloce || 0)}
                                        min="0"
                                        onChange={(e) => setAlternateDamages(prev => prev.map((x, i) => {
                                          if (i !== altIdx) return x;
                                          const nextSets = (x.damage_sets || []).map((s, si) => si === setIdx ? { ...s, damage_veloce: parseInt(e.target.value) || 0 } : s);
                                          return { ...x, damage_sets: nextSets };
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label>Pesante</Label>
                                      <Input
                                        type="number"
                                        value={Number(ds.damage_pesante || 0)}
                                        min="0"
                                        onChange={(e) => setAlternateDamages(prev => prev.map((x, i) => {
                                          if (i !== altIdx) return x;
                                          const nextSets = (x.damage_sets || []).map((s, si) => si === setIdx ? { ...s, damage_pesante: parseInt(e.target.value) || 0 } : s);
                                          return { ...x, damage_sets: nextSets };
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label>Affondo</Label>
                                      <Input
                                        type="number"
                                        value={Number(ds.damage_affondo || 0)}
                                        min="0"
                                        onChange={(e) => setAlternateDamages(prev => prev.map((x, i) => {
                                          if (i !== altIdx) return x;
                                          const nextSets = (x.damage_sets || []).map((s, si) => si === setIdx ? { ...s, damage_affondo: parseInt(e.target.value) || 0 } : s);
                                          return { ...x, damage_sets: nextSets };
                                        }))}
                                      />
                                    </div>
                                  </>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setAlternateDamages(prev => prev.map((x, i) => {
                                      if (i !== altIdx) return x;
                                      return { ...x, damage_sets: (x.damage_sets || []).filter((_, si) => si !== setIdx) };
                                    }))}
                                  >
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

              {/* Campo specifico per pozioni */}
              {formData.type === 'pozione' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="potionEffect">Effetto Pozione</Label>
                    <Textarea
                      id="potionEffect"
                      value={formData.potionEffect}
                      onChange={(e) => setFormData(prev => ({ ...prev, potionEffect: e.target.value }))}
                      placeholder="Descrivi l'effetto della pozione"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ripristina?</Label>
                    </div>
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
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const opt = damageEffectOptions[0];
                            if (opt) {
                              const exists = selectedDamageSets.some(d => d.damageEffectId === opt.id);
                              if (!exists) {
                                setSelectedDamageSets(prev => ([...prev, { damageEffectId: opt.id, effect_name: opt.name, guaranteedDamage: 0, additionalDamage: 0 }]));
                              }
                            }
                          }}
                        >Aggiungi effetto</Button>
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
                                <Input
                                  type="number"
                                  min="0"
                                  value={d.guaranteedDamage}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setSelectedDamageSets(prev => prev.map(x => x.damageEffectId === d.damageEffectId ? { ...x, guaranteedDamage: val } : x));
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Aggiuntivo</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={d.additionalDamage}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setSelectedDamageSets(prev => prev.map(x => x.damageEffectId === d.damageEffectId ? { ...x, additionalDamage: val } : x));
                                  }}
                                />
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
                                  const rowObj = (row && typeof row === 'object') ? (row as Record<string, unknown>) : {};
                                  const statsObj =
                                    rowObj.stats && typeof rowObj.stats === 'object'
                                      ? (rowObj.stats as Record<string, unknown>)
                                      : {};
                                  const rawDamageSets = statsObj.damage_sets;
                                  const damageSets = Array.isArray(rawDamageSets)
                                    ? rawDamageSets.map((s) => {
                                      const sObj = (s && typeof s === 'object') ? (s as Record<string, unknown>) : {};
                                      const damageEffectId = String((sObj.damageEffectId ?? sObj.damage_effect_id ?? '') as string | number);
                                      const effectName = String((sObj.effectName ?? sObj.effect_name ?? '') as string);
                                      const guaranteedDamage = Number((sObj.guaranteedDamage ?? sObj.guaranteed_damage ?? 0) as number) || 0;
                                      const additionalDamage = Number((sObj.additionalDamage ?? sObj.additional_damage ?? 0) as number) || 0;
                                      return { damageEffectId, effectName, guaranteedDamage, additionalDamage };
                                    })
                                    : undefined;
                                  const a: StatusAnomaly = {
                                    id: String(row?.id || value),
                                    name: String(row?.name || ''),
                                    description: String(row?.description || ''),
                                    actionPointsModifier: Number((rowObj.temp_action_points ?? 0) as number) || 0,
                                    healthModifier: Number((rowObj.temp_health ?? 0) as number) || 0,
                                    armorModifier: Number((rowObj.temp_armour ?? 0) as number) || 0,
                                    turns: (rowObj.turns as number | undefined) ?? undefined,
                                    statsModifier: ((statsObj.stats_modifier ?? statsObj.statsModifier) as Partial<CharacterStats>) || {
                                      forza: 0, percezione: 0, resistenza: 0,
                                      intelletto: 0, agilita: 0, sapienza: 0, anima: 0,
                                    },
                                    damageSets,
                                    damageBonusEnabled: !!(statsObj.damage_bonus_enabled ?? statsObj.damageBonusEnabled),
                                    damageBonus: (statsObj.damage_bonus ?? statsObj.damageBonus) as StatusAnomaly['damageBonus'],
                                    paDiscountEnabled: !!(statsObj.pa_discount_enabled ?? statsObj.paDiscountEnabled),
                                    paDiscount: (statsObj.pa_discount ?? statsObj.paDiscount) as StatusAnomaly['paDiscount'],
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
                                <div className="mt-2 text-sm">
                                  <div>Durata: {typeof potionAnomaly.turns === 'number' ? potionAnomaly.turns : 0} turni</div>
                                  {(potionAnomaly.healthModifier || 0) !== 0 && (
                                    <div>Salute: {potionAnomaly.healthModifier > 0 ? '+' : ''}{potionAnomaly.healthModifier}</div>
                                  )}
                                  {(potionAnomaly.actionPointsModifier || 0) !== 0 && (
                                    <div>PA: {potionAnomaly.actionPointsModifier > 0 ? '+' : ''}{potionAnomaly.actionPointsModifier}</div>
                                  )}
                                </div>
                                {potionAnomaly.statsModifier && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {Object.entries(potionAnomaly.statsModifier)
                                      .filter(([_, v]) => (v || 0) !== 0)
                                      .map(([k, v]) => (
                                        <span key={`s:${k}`} className="px-2 py-1 rounded text-xs border">
                                          {k}: {Number(v) > 0 ? '+' : ''}{Number(v)}
                                        </span>
                                      ))}
                                  </div>
                                )}
                                {Array.isArray(potionAnomaly.damageSets) && potionAnomaly.damageSets.length > 0 && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <div className="font-medium">Danni per tipo:</div>
                                    <div className="ml-2">
                                      {potionAnomaly.damageSets.map((ds, i) => (
                                        <div key={`ads:${i}`}>
                                          {typeof (ds as { effectName?: unknown }).effectName === 'string' && (ds as { effectName: string }).effectName.trim()
                                            ? (ds as { effectName: string }).effectName
                                            : (typeof (ds as { effect_name?: unknown }).effect_name === 'string' && (ds as { effect_name: string }).effect_name.trim()
                                              ? (ds as { effect_name: string }).effect_name
                                              : 'Tipo')}:
                                          {(ds.guaranteedDamage || 0) > 0 ? ` assicurato ${Number(ds.guaranteedDamage || 0)}` : ''}
                                          {(ds.additionalDamage || 0) > 0 ? `${(ds.guaranteedDamage || 0) > 0 ? ',' : ''} aggiuntivo ${Number(ds.additionalDamage || 0)}` : ''}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
              )}

              {/* Statistiche */}
          <div>
            <Label>Statistiche</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(formData.stats).map(([stat, value]) => (
                <div key={stat}>
                  <Label htmlFor={stat} className="text-sm capitalize">
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </Label>
                  <Input
                    id={stat}
                    type="number"
                    value={value}
                    onChange={(e) => handleStatChange(stat as keyof CharacterStats, e.target.value)}
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>

              {formData.type !== 'servizio' && (
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
                                setItemDataEquipmentMeta('custom_specifics', next);
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
                                setItemDataEquipmentMeta('custom_specifics', next);
                              }}
                              min="0"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                const next = list.slice();
                                next.splice(idx, 1);
                                setItemDataEquipmentMeta('custom_specifics', next);
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
                            setItemDataEquipmentMeta('custom_specifics', next);
                          }}
                        >
                          Aggiungi specifica
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}

          {(formData.type === 'armatura' || formData.type === 'arma') && (
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

          {(formData.type === 'armatura' || formData.type === 'arma') && (
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
                    {formData.unlockedPowers.abilities.length === 0 && formData.unlockedPowers.spells.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nessun potere selezionato.</p>
                    ) : (
                      <>
                        {formData.unlockedPowers.abilities.map((row, idx) => (
                          <div key={`ab-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{row.name || 'Abilità'}</span>
                              <Badge variant="outline" className="text-xs">Lv {row.level}</Badge>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const current = prev.unlockedPowers.abilities.slice();
                                  current.splice(idx, 1);
                                  return { ...prev, unlockedPowers: { ...prev.unlockedPowers, abilities: current } };
                                });
                              }}
                            >
                              Rimuovi
                            </Button>
                          </div>
                        ))}

                        {formData.unlockedPowers.spells.map((row, idx) => (
                          <div key={`sp-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{row.name || 'Magia'}</span>
                              <Badge variant="outline" className="text-xs">Lv {row.level}</Badge>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const current = prev.unlockedPowers.spells.slice();
                                  current.splice(idx, 1);
                                  return { ...prev, unlockedPowers: { ...prev.unlockedPowers, spells: current } };
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
            </>
          )}

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Oggetto
            </Button>
          </DialogFooter>
        </form>

        <ImportAbilityModal
          isOpen={abilitySelectorOpen}
          onOpenChange={setAbilitySelectorOpen}
          mode="inline"
          onConfirm={({ ability, level }) => {
            setFormData((prev) => {
              const current = prev.unlockedPowers.abilities;
              const next = [...current, { name: String((ability as { name?: unknown })?.name ?? 'Abilità'), ability_id: String((ability as { id?: unknown })?.id ?? ''), level }];
              return { ...prev, unlockedPowers: { ...prev.unlockedPowers, abilities: next } };
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
              const current = prev.unlockedPowers.spells;
              const next = [...current, { name: String((spell as { name?: unknown })?.name ?? 'Magia'), spell_id: String((spell as { id?: unknown })?.id ?? ''), level }];
              return { ...prev, unlockedPowers: { ...prev.unlockedPowers, spells: next } };
            });
            setPowerUnlockEnabled(true);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateItemModal;
