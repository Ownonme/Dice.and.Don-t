import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Save } from 'lucide-react';
import { DiceLoader } from '@/components/ui/dice-loader';
import CharacterStats from '@/components/character/CharacterStats';
import CharacterInventory from '@/components/character/CharacterInventory';
import CharacterBag from '@/components/character/CharacterBag';
import CharacterAnomalies from '@/components/character/CharacterAnomalies';
import CharacterSelector from '@/components/character/CharacterSelector';
import AbilityPage from './AbilityPage';
import MagicPage from './MagicPage';
import { useCharacterCalculations } from '@/hooks/useCharacterCalculations';
import type { Character, CharacterStats as Stats, EquipmentItem, InventoryItem, Arrow, Potion, StatusAnomaly, Currency } from '@/types/character';
import { supabase } from '@/integrations/supabase/client';
import { useCharacters, getDefaultCharacterTemplate, compactCharacterForStorage } from '@/hooks/useCharacters';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import AvatarCropper from '@/components/character/AvatarCropper';
import { Switch } from '@/components/ui/switch';
import { apiBase, isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';

const isEquipmentDerivedPower = (it: any): boolean => {
  return (it as any)?.sourceType === 'equipment' || String((it as any)?.id ?? '').startsWith('equip:');
};

type EquipmentPowerCatalogs = {
  spellsById: Record<string, any>;
  abilitiesById: Record<string, any>;
};

const loadEquipmentPowerCatalogs = async (equipment: EquipmentItem[]): Promise<EquipmentPowerCatalogs> => {
  const spellIdsSet = new Set<string>();
  const abilityIdsSet = new Set<string>();

  for (const eq of equipment) {
    const unlocked: any = (eq as any)?.unlockedPowers || {};

    const abilitiesRows = Array.isArray(unlocked?.abilities) ? unlocked.abilities : [];
    for (const row of abilitiesRows) {
      const id = String((row as any)?.ability_id ?? (row as any)?.ability?.id ?? '').trim();
      if (id) abilityIdsSet.add(id);
    }

    const spellsRows = Array.isArray(unlocked?.spells) ? unlocked.spells : [];
    for (const row of spellsRows) {
      const id = String((row as any)?.spell_id ?? (row as any)?.spell?.id ?? '').trim();
      if (id) spellIdsSet.add(id);
    }
  }

  const spellIds = Array.from(spellIdsSet);
  const abilityIds = Array.from(abilityIdsSet);
  const spellsById: Record<string, any> = {};
  const abilitiesById: Record<string, any> = {};

  if (spellIds.length === 0 && abilityIds.length === 0) return { spellsById, abilitiesById };

  if (isLocalServer()) {
    const chunk = <T,>(arr: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };
    const fetchMany = async (table: 'spells' | 'abilities', ids: string[]) => {
      const baseUrl = apiBase();
      const chunks = chunk(ids, 50);
      const all: any[] = [];
      for (const c of chunks) {
        const qs = c.map((id) => `id=${encodeURIComponent(id)}`).join('&');
        const res = await fetch(`${baseUrl}/api/${table}?${qs}`);
        const data = await res.json();
        if (Array.isArray(data)) all.push(...data);
      }
      return all;
    };

    const [spells, abilities] = await Promise.all([
      spellIds.length > 0 ? fetchMany('spells', spellIds) : Promise.resolve([]),
      abilityIds.length > 0 ? fetchMany('abilities', abilityIds) : Promise.resolve([]),
    ]);

    for (const s of spells) {
      const id = String(s?.id ?? '').trim();
      if (id) spellsById[id] = s;
    }
    for (const a of abilities) {
      const id = String(a?.id ?? '').trim();
      if (id) abilitiesById[id] = a;
    }
    return { spellsById, abilitiesById };
  }

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const fetchSupabaseIn = async (table: 'spells' | 'abilities', ids: string[]) => {
    const chunks = chunk(ids, 500);
    const all: any[] = [];
    for (const c of chunks) {
      const { data, error } = await supabase.from(table).select('*').in('id', c);
      if (error) throw error;
      if (Array.isArray(data)) all.push(...data);
    }
    return all;
  };

  const [spells, abilities] = await Promise.all([
    spellIds.length > 0 ? fetchSupabaseIn('spells', spellIds) : Promise.resolve([]),
    abilityIds.length > 0 ? fetchSupabaseIn('abilities', abilityIds) : Promise.resolve([]),
  ]);

  for (const s of spells) {
    const id = String(s?.id ?? '').trim();
    if (id) spellsById[id] = s;
  }
  for (const a of abilities) {
    const id = String(a?.id ?? '').trim();
    if (id) abilitiesById[id] = a;
  }
  return { spellsById, abilitiesById };
};

const applyEquipmentPowers = (base: Character, catalogs?: EquipmentPowerCatalogs): Character => {
  const equipment = Array.isArray((base as any)?.equipment) ? ((base as any).equipment as EquipmentItem[]) : [];

  const derivedAbilities: any[] = [];
  const derivedSpells: any[] = [];

  for (const eq of equipment) {
    const sourceId = String((eq as any)?.id ?? '').trim();
    const sourceName = String((eq as any)?.name ?? '').trim();
    if (!sourceId) continue;

    const unlocked = (eq as any)?.unlockedPowers || {};

    const abilitiesRows: any[] = Array.isArray(unlocked?.abilities) ? unlocked.abilities : [];
    for (const row of abilitiesRows) {
      const abilityId = String((row as any)?.ability_id ?? (row as any)?.ability?.id ?? '').trim();
      if (!abilityId) continue;
      const ability = (row as any)?.ability ?? catalogs?.abilitiesById?.[abilityId];

      const levelNum = Number(row?.level ?? 1) || 1;
      const levels = Array.isArray(ability?.levels) ? ability.levels : [];
      const levelData = levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || {};

      derivedAbilities.push({
        id: `equip:${sourceId}:ability:${abilityId}`,
        ability_id: abilityId,
        name: String((row as any)?.name ?? ability?.name ?? 'Abilità'),
        type: ability?.type ?? '',
        category: ability?.subcategory ?? '',
        grade: ability?.grade ?? '',
        description: ability?.description ?? '',
        current_level: levelNum,
        levels,
        danno_assicurato: levelData?.danno_assicurato || 0,
        danno_aggiuntivo: levelData?.danno_aggiuntivo || 0,
        punti_azione: levelData?.punti_azione || 0,
        punti_azione_indicativi: levelData?.punti_azione_indicativi || 0,
        special_effect: levelData?.special_effect || '',
        level_description: levelData?.level_description || '',
        sourceType: 'equipment',
        sourceId,
        sourceName,
      });
    }

    const spellsRows: any[] = Array.isArray(unlocked?.spells) ? unlocked.spells : [];
    for (const row of spellsRows) {
      const spellId = String((row as any)?.spell_id ?? (row as any)?.spell?.id ?? '').trim();
      if (!spellId) continue;
      const spell = (row as any)?.spell ?? catalogs?.spellsById?.[spellId];

      const levelNum = Number(row?.level ?? 1) || 1;
      const levels = Array.isArray(spell?.levels) ? spell.levels : [];
      const levelData = levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || {};

      const primaryBranch = spell?.primary_branch || '';
      const primarySpecificity = spell?.primary_specificity || '';
      const grade = spell?.grade || '';
      const correctCategory = `${primaryBranch}_${primarySpecificity}_${grade}`;

      const n = (v: unknown): number => Number(v ?? 0);
      const gt0 = (v: unknown): boolean => n(v) > 0;

      derivedSpells.push({
        id: `equip:${sourceId}:spell:${spellId}`,
        spell_id: spellId,
        name: String((row as any)?.name ?? spell?.name ?? 'Magia'),
        difficulty: (spell as any)?.difficulty ?? null,
        type: spell?.type ?? '',
        category: spell ? correctCategory : '',
        grade: spell?.grade ?? '',
        description: spell?.description ?? '',
        additional_description: spell?.additional_description ?? '',
        story_1: spell?.story_1 ?? '',
        story_2: spell?.story_2 ?? '',
        primary_branch: spell?.primary_branch ?? '',
        secondary_branch: spell?.secondary_branch ?? '',
        primary_specificity: spell?.primary_specificity ?? '',
        secondary_specificity: spell?.secondary_specificity ?? '',
        current_level: levelNum,
        levels,
        guaranteed_damage: n(levelData?.guaranteed_damage),
        additional_damage: n(levelData?.additional_damage),
        action_cost: n(levelData?.action_cost),
        indicative_action_cost: n(levelData?.indicative_action_cost),
        duration: levelData?.duration || '',
        range: levelData?.range || '',
        special_effect: levelData?.special_effect || '',
        level_description: levelData?.level_description || '',
        damage: gt0(levelData?.damage) ? n(levelData?.damage) : n(levelData?.guaranteed_damage),
        mana_cost: gt0(levelData?.mana_cost) ? n(levelData?.mana_cost) : n(levelData?.action_cost),
        sourceType: 'equipment',
        sourceId,
        sourceName,
      });
    }
  }

  const baseAbilities = (Array.isArray((base as any)?.custom_abilities) ? (base as any).custom_abilities : []).filter(
    (a: any) => !isEquipmentDerivedPower(a),
  );
  const baseSpells = (Array.isArray((base as any)?.custom_spells) ? (base as any).custom_spells : []).filter(
    (s: any) => !isEquipmentDerivedPower(s),
  );

  const choose = (a: any, b: any) => {
    const la = Number(a?.current_level ?? a?.currentLevel ?? a?.level ?? 1) || 1;
    const lb = Number(b?.current_level ?? b?.currentLevel ?? b?.level ?? 1) || 1;
    if (la !== lb) return la > lb ? a : b;
    const ae = isEquipmentDerivedPower(a);
    const be = isEquipmentDerivedPower(b);
    if (ae !== be) return ae ? b : a;
    return a;
  };

  const dedupe = (items: any[], keyOf: (x: any) => string) => {
    const map = new Map<string, any>();
    for (const it of items) {
      const k = keyOf(it);
      if (!k) continue;
      if (!map.has(k)) {
        map.set(k, it);
        continue;
      }
      map.set(k, choose(map.get(k), it));
    }
    return Array.from(map.values());
  };

  const mergedAbilities = dedupe(
    [...baseAbilities, ...derivedAbilities],
    (a) => String(a?.ability_id ?? a?.id ?? '').trim(),
  );
  const mergedSpells = dedupe(
    [...baseSpells, ...derivedSpells],
    (s) => String(s?.spell_id ?? s?.id ?? '').trim(),
  );

  return {
    ...(base as any),
    custom_abilities: mergedAbilities,
    custom_spells: mergedSpells,
  } as Character;
};

const Character = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { loadFullCharacter, saveCharacter } = useCharacters();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const isNewCharacter = characterId === 'new';
  
  // Stati principali
  const [character, setCharacter] = useState<Character | null>(() => 
    isNewCharacter ? getDefaultCharacterTemplate('Nuovo Personaggio') : null
  );
  const [isLoading, setIsLoading] = useState(!isNewCharacter);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const calculations = useCharacterCalculations(character || getDefaultCharacterTemplate('Temp'));

  useEffect(() => {
    const raw = String(character?.birth_date ?? '').trim();
    const parts = raw.split('/').map((p) => p.trim());
    setBirthDay(parts[0] ?? '');
    setBirthMonth(parts[1] ?? '');
    setBirthYear(parts[2] ?? '');
  }, [character?.birth_date]);

  const checkAndLoadCharacter = useCallback(async () => {
    if (!characterId || isNewCharacter) return;

    setIsLoading(true);

    try {
      const loaded = await loadFullCharacter(characterId);
      if (!loaded) {
        toast({
          title: 'Errore',
          description: 'Personaggio non trovato o non accessibile',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      const normalizedEquipment = Array.isArray((loaded as any).equipment)
        ? (loaded as any).equipment
        : Object.values((((loaded as any).equipment || {}) as any)).filter(Boolean);

      setCharacter(applyEquipmentPowers({
        ...(loaded as any),
        equipment: normalizedEquipment,
        id: (loaded as any).id ?? characterId,
        avatar_url: (loaded as any).avatar_url || (loaded as any)?.avatar_url,
      } as Character, await loadEquipmentPowerCatalogs(normalizedEquipment)));
      setIsPublic(!!((loaded as any)?.is_public));
    } catch (error) {
      console.error('Error loading character:', error);
      navigate('/');
    }

    setIsLoading(false);
  }, [characterId, isNewCharacter, navigate, toast, loadFullCharacter]);

  useEffect(() => {
    if (characterId && !isNewCharacter && !authLoading) {
      void checkAndLoadCharacter();
    } else if (isNewCharacter) {
      setIsLoading(false);
    }
  }, [characterId, isNewCharacter, authLoading, user?.id, checkAndLoadCharacter]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // Crea URL temporaneo per il cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageForCrop(imageUrl);
    setShowAvatarCropper(true);
    
    // Reset input
    event.target.value = '';
  };

  const handleCroppedImageUpload = async (croppedImageBlob: Blob) => {
    if (!user) return;
    
    setIsUploadingAvatar(true);
    
    try {
      if (isLocalServer()) {
        const file = new File([croppedImageBlob], `${characterId || 'new'}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { url } = await Api.uploadFile(file);
        updateCharacter({ avatar_url: url });
      } else {
        const fileName = `${user.id}/${characterId || 'new'}_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, croppedImageBlob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        updateCharacter({ avatar_url: publicUrl });
      }
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setIsUploadingAvatar(false);
      // Pulisci URL temporaneo
      if (selectedImageForCrop) {
        URL.revokeObjectURL(selectedImageForCrop);
        setSelectedImageForCrop('');
      }
    }
  };

  const handleCloseCropper = () => {
    setShowAvatarCropper(false);
    if (selectedImageForCrop) {
      URL.revokeObjectURL(selectedImageForCrop);
      setSelectedImageForCrop('');
    }
  };

  const updateCharacter = (updates: Partial<Character>) => {
    setCharacter(prev => ({
      ...prev,
      ...updates
    }));
  };

  const formatBirthDate = (dRaw: string, mRaw: string, yRaw: string) => {
    const d = String(dRaw ?? '').trim();
    const m = String(mRaw ?? '').trim();
    const y = String(yRaw ?? '').trim();
    if (!d && !m && !y) return '';
    const dn = Number(d);
    const mn = Number(m);
    const yn = Number(y);
    if (!Number.isFinite(dn) || !Number.isFinite(mn) || !Number.isFinite(yn)) return '';
    if (dn < 1 || dn > 31) return '';
    if (mn < 1 || mn > 12) return '';
    if (yn < 1 || yn > 9999) return '';
    return `${String(dn).padStart(2, '0')}/${String(mn).padStart(2, '0')}/${String(yn).padStart(4, '0')}`;
  };

  const scheduleAutoSave = (nextCharacter: Character) => {
    if (!characterId || isNewCharacter) return;
    if (!user?.id) return;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (autoSaveInFlightRef.current) return;
      autoSaveInFlightRef.current = true;
      try {
        const payload: any = {
          ...nextCharacter,
          id: characterId,
          user_id: nextCharacter.user_id || user.id
        };
        await saveCharacter(characterId, payload);
      } finally {
        autoSaveInFlightRef.current = false;
      }
    }, 600);
  };

  const handleSave = async () => {
    if (!character) return;
    
    setIsSaving(true);
    try {
      if (isNewCharacter) {
        const compacted = compactCharacterForStorage(character as any);
        if (isLocalServer()) {
          const created = await Api.createCharacter({
            name: character.name,
            level: character.level,
            avatar_url: character.avatar_url,
            data: compacted,
            user_id: user?.id,
            is_public: isPublic,
          });
          navigate(`/character/${created.id}`, { replace: true });
        } else {
          const { data, error } = await supabase
            .from('characters')
            .insert({
              name: character.name,
              level: character.level,
              avatar_url: character.avatar_url,
              data: compacted,
              user_id: user?.id,
              is_public: isPublic
            })
            .select()
            .single();
          if (error) throw error;
          navigate(`/character/${data.id}`, { replace: true });
        }
      } else {
        // Usa la funzione saveCharacter che gestisce i permessi admin
        const characterWithId = {
          ...character,
          id: characterId!,
          user_id: character.user_id || user?.id || ''
        };
        
        await saveCharacter(characterId!, characterWithId);
        if (isLocalServer()) {
          await Api.updateCharacter(characterId!, { is_public: isPublic });
        } else {
          await supabase
            .from('characters')
            .update({ is_public: isPublic })
            .eq('id', characterId!);
        }
      }
      
    } catch (error) {
      console.error('Error saving character:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCharacterSelect = (newCharacterId: string) => {
    navigate(`/character/${newCharacterId}`);
  };

  const updateBaseStats = (stats: Partial<Stats>) => {
    setCharacter(prev => ({
      ...prev,
      baseStats: { ...prev.baseStats, ...stats }
    }));
  };

  const updateCurrency = (currency: Currency) => {
    setCharacter(prev => {
      if (!prev) return prev;
      const next = { ...prev, currency };
      scheduleAutoSave(next);
      return next;
    });
  };

  // Funzioni per equipaggiamento
  const addEquipmentItem = (item: EquipmentItem) => {
    setCharacter(prev => {
      if (!prev) return prev;
      const next = applyEquipmentPowers({
        ...(prev as any),
        equipment: [...(prev as any).equipment, item]
      } as Character);
      scheduleAutoSave(next);
      return next;
    });
  };

  const updateEquipmentItem = (item: EquipmentItem) => {
    setCharacter(prev => {
      if (!prev) return prev;
      const next = applyEquipmentPowers({
        ...(prev as any),
        equipment: (prev as any).equipment.map((eq: any) => eq.id === item.id ? item : eq)
      } as Character);
      scheduleAutoSave(next);
      return next;
    });
  };

  const removeEquipmentItem = (id: string) => {
    setCharacter(prev => {
      if (!prev) return prev;
      const next = applyEquipmentPowers({
        ...(prev as any),
        equipment: (prev as any).equipment.filter((eq: any) => eq.id !== id)
      } as Character);
      scheduleAutoSave(next);
      return next;
    });
  };

  // Funzioni per inventario
  const addInventoryItem = (item: InventoryItem) => {
    setCharacter(prev => ({
      ...prev,
      inventory: [...prev.inventory, item]
    }));
  };

  const updateInventoryItem = (item: InventoryItem) => {
    setCharacter(prev => ({
      ...prev,
      inventory: prev.inventory.map(inv => inv.id === item.id ? item : inv)
    }));
  };

  const removeInventoryItem = (id: string) => {
    setCharacter(prev => ({
      ...prev,
      inventory: prev.inventory.filter(inv => inv.id !== id)
    }));
  };

  // Funzioni per frecce
  const addArrow = (arrow: Arrow) => {
    setCharacter(prev => ({
      ...prev,
      arrows: [...prev.arrows, arrow]
    }));
  };

  const updateArrow = (arrow: Arrow) => {
    setCharacter(prev => ({
      ...prev,
      arrows: prev.arrows.map(arr => arr.id === arrow.id ? arrow : arr)
    }));
  };

  const removeArrow = (id: string) => {
    setCharacter(prev => ({
      ...prev,
      arrows: prev.arrows.filter(arr => arr.id !== id)
    }));
  };

  // Funzioni per faretra magica
  const removeMagicQuiver = (id: string) => {
    setCharacter(prev => ({
      ...prev,
      magic_quivers: (prev.magic_quivers || []).filter((mq: any) => mq.id !== id)
    }));
  };

  // Funzioni per pozioni
  const addPotion = (potion: Potion) => {
    setCharacter(prev => ({
      ...prev,
      potions: [...prev.potions, potion]
    }));
  };

  const updatePotion = (potion: Potion) => {
    setCharacter(prev => ({
      ...prev,
      potions: prev.potions.map(pot => pot.id === potion.id ? potion : pot)
    }));
  };

  const removePotion = (id: string) => {
    setCharacter(prev => ({
      ...prev,
      potions: prev.potions.filter(pot => pot.id !== id)
    }));
  };

  // Funzioni per anomalie
  const addAnomaly = (anomaly: StatusAnomaly) => {
    setCharacter(prev => ({
      ...prev,
      anomalies: [...prev.anomalies, anomaly]
    }));
  };

  const updateAnomaly = (anomaly: StatusAnomaly) => {
    setCharacter(prev => ({
      ...prev,
      anomalies: prev.anomalies.map(anom => anom.id === anomaly.id ? anomaly : anom)
    }));
  };

  const removeAnomaly = (anomalyId: string) => {
    setCharacter(prev => ({
      ...prev,
      anomalies: prev.anomalies.filter(anom => anom.id !== anomalyId)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <DiceLoader size="lg" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Personaggio non trovato</h2>
            <p className="text-gray-600 mb-4">Il personaggio richiesto non esiste o non hai i permessi per visualizzarlo.</p>
            <Button onClick={() => navigate('/')}>Torna alla Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4">
        <div className="container mx-auto border-b pb-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/')} className="h-9 px-3">← Home</Button>
            <Button onClick={handleSave} disabled={isSaving} className="h-9 px-3 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
          <div className="mt-2">
            <Button 
              variant="ghost"
              onClick={() => setShowCharacterSelector(true)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-0 h-auto"
            >
              <Users className="w-4 h-4" />
              Cambia Personaggio
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar con immagine profilo */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profilo Personaggio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={character.avatar_url} />
                    <AvatarFallback className="text-4xl">
                      {character.name.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="w-full space-y-2">
                    <Label>Immagine Avatar</Label>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                      />
                    </div>
                    {isUploadingAvatar && (
                      <p className="text-sm text-muted-foreground">Caricamento immagine...</p>
                    )}
                  </div>

                  <div className="w-full space-y-2">
                    <Label>Data di nascita</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        inputMode="numeric"
                        value={birthDay}
                        onChange={(e) => {
                          const next = e.target.value;
                          setBirthDay(next);
                          updateCharacter({ birth_date: formatBirthDate(next, birthMonth, birthYear) });
                        }}
                        placeholder="GG"
                        maxLength={2}
                        autoComplete="off"
                      />
                      <div className="text-muted-foreground">/</div>
                      <Input
                        inputMode="numeric"
                        value={birthMonth}
                        onChange={(e) => {
                          const next = e.target.value;
                          setBirthMonth(next);
                          updateCharacter({ birth_date: formatBirthDate(birthDay, next, birthYear) });
                        }}
                        placeholder="MM"
                        maxLength={2}
                        autoComplete="off"
                      />
                      <div className="text-muted-foreground">/</div>
                      <Input
                        inputMode="numeric"
                        value={birthYear}
                        onChange={(e) => {
                          const next = e.target.value;
                          setBirthYear(next);
                          updateCharacter({ birth_date: formatBirthDate(birthDay, birthMonth, next) });
                        }}
                        placeholder="AAAA"
                        maxLength={4}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="character-name">Nome Personaggio</Label>
                  <Input
                    id="character-name"
                    value={character.name}
                    onChange={(e) => updateCharacter({ name: e.target.value })}
                    placeholder="Nome del personaggio"
                    autoComplete="name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="character-level">Livello</Label>
                  <Input
                    id="character-level"
                    type="number"
                    min="1"
                    max="20"
                    value={character.level}
                    onChange={(e) => updateCharacter({ level: parseInt(e.target.value) || 1 })}
                    autoComplete="off"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="is-public">Personaggio pubblico</Label>
                    <p className="text-sm text-muted-foreground">
                      Se attivo, il personaggio è visibile a tutti
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{isPublic ? 'Sì' : 'No'}</span>
                    <Switch id="is-public" checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Contenuto principale */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="scheda" className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-3 mb-10 bg-transparent p-0 border-0 shadow-none">
                <TabsTrigger value="scheda">Scheda Personaggio</TabsTrigger>
                <TabsTrigger value="inventario">Inventario</TabsTrigger>
                <TabsTrigger value="borsello">Borsello</TabsTrigger>
                <TabsTrigger value="anomalie">Anomalie</TabsTrigger>
                <TabsTrigger value="abilita">Abilità</TabsTrigger>
                <TabsTrigger value="magie">Magie</TabsTrigger>
              </TabsList>
              
              <TabsContent value="scheda">
                <CharacterStats
                  character={character}
                  calculations={calculations}
                  onUpdateCharacter={updateCharacter}
                  onUpdateBaseStats={updateBaseStats}
                />
              </TabsContent>

              <TabsContent value="inventario">
                <CharacterInventory
                  equipment={character.equipment}
                  onAddEquipment={addEquipmentItem}
                  onUpdateEquipment={updateEquipmentItem}
                  onRemoveEquipment={removeEquipmentItem}
                  inventory={character.inventory}
                  onAddInventory={addInventoryItem}
                  onUpdateInventory={updateInventoryItem}
                  onRemoveInventory={removeInventoryItem}
                  canEquipItem={calculations?.canEquipItem}
                  onAddAnomaly={addAnomaly}
                  onRemoveAnomaly={removeAnomaly}
                />
              </TabsContent>

              <TabsContent value="borsello">
                <CharacterBag
                  currency={character.currency}
                  arrows={character.arrows}
                  onUpdateCurrency={updateCurrency}
                  onAddArrow={addArrow}
                  onUpdateArrow={updateArrow}
                  onRemoveArrow={removeArrow}
                  potions={character.potions}
                  onAddPotion={addPotion}
                  onUpdatePotion={updatePotion}
                  onRemovePotion={removePotion}
                  magicQuivers={character.magic_quivers}
                  character={character}
                  updateCharacter={updateCharacter}
                  characterId={characterId}
                  onRemoveMagicQuiver={removeMagicQuiver}
                />
              </TabsContent>

              <TabsContent value="anomalie">
                <CharacterAnomalies
                  anomalies={character.anomalies}
                  onAddAnomaly={addAnomaly}
                  onUpdateAnomaly={updateAnomaly}
                  onRemoveAnomaly={removeAnomaly}
                />
              </TabsContent>

              <TabsContent value="abilita">
                <AbilityPage 
                  character={character} 
                  updateCharacter={updateCharacter} 
                />
              </TabsContent>

              <TabsContent value="magie">
                <MagicPage 
                  character={character} 
                  updateCharacter={updateCharacter} 
                />
              </TabsContent>
              
            </Tabs>
          </div>
        </div>
      </div>
      
      <CharacterSelector
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        onCharacterSelect={handleCharacterSelect}
        currentCharacterId={characterId}
      />
      
      {/* Avatar Cropper Modal */}
      <AvatarCropper
        isOpen={showAvatarCropper}
        onClose={handleCloseCropper}
        imageSrc={selectedImageForCrop}
        onCropComplete={handleCroppedImageUpload}
      />
    </div>
  );
};

export default Character;
