import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AnomalyAdminModal, type AdminAnomalyDefinition } from '@/components/magic/AnomalyAdminModal';
import { MagicQuiverAdminModal } from '@/components/magic/MagicQuiverAdminModal';
import { DamageEffectAdminModal } from '@/components/magic/DamageEffectAdminModal';
import { createAnomaly, deleteAnomaly, getAnomalyById, listAnomalies, updateAnomaly } from '@/integrations/supabase/anomalies';
import { createDamageEffect, deleteDamageEffect, listDamageEffects } from '@/integrations/supabase/damageEffects';
import { createMagicQuiver } from '@/integrations/supabase/magicQuivers';
import { ShieldAlert, Flame, Wrench, Database, Package, Sword } from 'lucide-react';
import { MaterialAdminModal } from '@/components/admin/MaterialAdminModal';
import { createMaterial } from '@/integrations/supabase/materials';
import { WeaponTypeAdminModal } from '@/components/admin/WeaponTypeAdminModal';
import { createWeaponType } from '@/integrations/supabase/weaponTypes';
import { EvocationAdminModal } from '@/components/admin/EvocationAdminModal';
import { createEvocation } from '@/integrations/supabase/evocations';
import { useCharacters } from '@/hooks/useCharacters';
import { readSpecificCatalog, writeSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';

export default function AdminConsole() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { characters, deleteCharacter, loadAllCharacters } = useCharacters();

  const [openAnomalyModal, setOpenAnomalyModal] = useState(false);
  const [editingAnomalyId, setEditingAnomalyId] = useState<string | null>(null);
  const [editingAnomalyDef, setEditingAnomalyDef] = useState<AdminAnomalyDefinition | null>(null);
  const [openDamageEffectModal, setOpenDamageEffectModal] = useState(false);
  const [openMaterialModal, setOpenMaterialModal] = useState(false);
  const [openWeaponTypeModal, setOpenWeaponTypeModal] = useState(false);
  const [openEvocationModal, setOpenEvocationModal] = useState(false);
  const [openMagicQuiverModal, setOpenMagicQuiverModal] = useState(false);
  const [openSpecificModal, setOpenSpecificModal] = useState(false);
  const [specificName, setSpecificName] = useState('');
  const [specificColor, setSpecificColor] = useState('#3b82f6');

  const [anomalies, setAnomalies] = useState<Array<{ id: string; name: string }>>([]);
  const [damageEffects, setDamageEffects] = useState<Array<{ id: string; name: string }>>([]);
  const [specificCatalog, setSpecificCatalog] = useState<CharacterSpecificCatalogItem[]>(() => readSpecificCatalog());
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [damageEffectsLoading, setDamageEffectsLoading] = useState(false);
  const [anomalyQuery, setAnomalyQuery] = useState('');
  const [damageEffectQuery, setDamageEffectQuery] = useState('');
  const [characterQuery, setCharacterQuery] = useState('');
  const [specificQuery, setSpecificQuery] = useState('');
  const [deletingAnomalyIds, setDeletingAnomalyIds] = useState<Record<string, boolean>>({});
  const [deletingDamageEffectIds, setDeletingDamageEffectIds] = useState<Record<string, boolean>>({});
  const [deletingCharacterIds, setDeletingCharacterIds] = useState<Record<string, boolean>>({});

  const reloadAnomalies = useCallback(async () => {
    setAnomaliesLoading(true);
    try {
      const data = await listAnomalies();
      const mapped = Array.isArray(data) ? data.map((a: any) => ({ id: String(a.id), name: String(a.name ?? '') })) : [];
      setAnomalies(mapped);
    } catch (error: any) {
      console.error('Errore caricamento anomalie', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile caricare le anomalie',
        variant: 'destructive',
      });
    } finally {
      setAnomaliesLoading(false);
    }
  }, [toast]);

  const reloadDamageEffects = useCallback(async () => {
    setDamageEffectsLoading(true);
    try {
      const data = await listDamageEffects();
      const mapped = Array.isArray(data) ? data.map((d: any) => ({ id: String(d.id), name: String(d.name ?? '') })) : [];
      setDamageEffects(mapped);
    } catch (error: any) {
      console.error('Errore caricamento damage effects', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile caricare i damage effects',
        variant: 'destructive',
      });
    } finally {
      setDamageEffectsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) return;
    reloadAnomalies();
    reloadDamageEffects();
  }, [isAdmin, reloadAnomalies, reloadDamageEffects]);

  useEffect(() => {
    if (!openSpecificModal) return;
    setSpecificCatalog(readSpecificCatalog());
  }, [openSpecificModal]);

  const filteredAnomalies = useMemo(() => {
    const q = anomalyQuery.trim().toLowerCase();
    if (!q) return anomalies;
    return anomalies.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
  }, [anomalies, anomalyQuery]);

  const filteredDamageEffects = useMemo(() => {
    const q = damageEffectQuery.trim().toLowerCase();
    if (!q) return damageEffects;
    return damageEffects.filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
  }, [damageEffects, damageEffectQuery]);

  const filteredSpecificCatalog = useMemo(() => {
    const q = specificQuery.trim().toLowerCase();
    if (!q) return specificCatalog;
    return specificCatalog.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [specificCatalog, specificQuery]);

  const filteredCharacters = useMemo(() => {
    const q = characterQuery.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter((c: any) => {
      const name = String((c as any)?.name ?? '').toLowerCase();
      const id = String((c as any)?.id ?? '').toLowerCase();
    return name.includes(q) || id.includes(q);
  });
  }, [characters, characterQuery]);

  const closeAnomalyModal = () => {
    setOpenAnomalyModal(false);
    setEditingAnomalyId(null);
    setEditingAnomalyDef(null);
  };

  const mapAnomalyRowToDefinition = (row: any): AdminAnomalyDefinition => {
    const stats = (row as any)?.stats ?? {};
    const statsModifierRaw =
      stats?.stats_modifier ??
      stats?.statsModifier ??
      (row as any)?.stats_modifier ??
      (row as any)?.statsModifier ??
      null;

    const baseStats = {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0,
    };

    const statsModifier =
      typeof statsModifierRaw === 'object' && statsModifierRaw
        ? { ...baseStats, ...(statsModifierRaw as any) }
        : baseStats;

    const rawDamageSets =
      stats?.damage_sets ??
      stats?.damageSets ??
      (row as any)?.damage_sets ??
      (row as any)?.damageSets ??
      null;

    const legacyDamageSets =
      (row as any)?.damage_per_turn && (row as any)?.damage_effect_id
        ? [
            {
              damageEffectId: String((row as any).damage_effect_id),
              guaranteedDamage: Number((row as any).damage_per_turn) || 0,
              additionalDamage: 0,
            },
          ]
        : [];

    const damageSets = (Array.isArray(rawDamageSets) ? rawDamageSets : legacyDamageSets).map((r: any) => ({
      damageEffectId: String(r?.damageEffectId ?? r?.damage_effect_id ?? ''),
      guaranteedDamage: Number(r?.guaranteedDamage ?? r?.guaranteed_damage ?? 0) || 0,
      additionalDamage: Number(r?.additionalDamage ?? r?.additional_damage ?? 0) || 0,
    }));

    const inferredDoesDamage =
      !!((row as any)?.does_damage ?? (row as any)?.doesDamage) ||
      damageSets.length > 0;

    const tempHealthValue = (row as any)?.temp_health ?? (row as any)?.tempHealth ?? null;
    const tempActionPointsValue = (row as any)?.temp_action_points ?? (row as any)?.tempActionPoints ?? null;
    const tempArmourValue = (row as any)?.temp_armour ?? (row as any)?.tempArmour ?? null;

    const inferredModifiesSpecifics =
      !!((row as any)?.modifies_specifics ?? (row as any)?.modifiesSpecifics) ||
      tempHealthValue !== null ||
      tempActionPointsValue !== null ||
      tempArmourValue !== null;

    const damageBonusObj =
      (row as any)?.damageBonus ??
      (row as any)?.damage_bonus ??
      stats?.damage_bonus ??
      stats?.damageBonus ??
      undefined;
    const damageReductionObj =
      (row as any)?.damageReduction ??
      (row as any)?.damage_reduction ??
      stats?.damage_reduction ??
      stats?.damageReduction ??
      undefined;
    const weaknessObj =
      (row as any)?.weakness ??
      (row as any)?.weakness_config ??
      (row as any)?.weaknessConfig ??
      stats?.weakness ??
      stats?.weakness_config ??
      stats?.weaknessConfig ??
      undefined;
    const paDiscountObj =
      (row as any)?.paDiscount ??
      (row as any)?.pa_discount ??
      stats?.pa_discount ??
      stats?.paDiscount ??
      undefined;

    const damageBonusEnabledRaw =
      (row as any)?.damageBonusEnabled ??
      (row as any)?.damage_bonus_enabled ??
      stats?.damage_bonus_enabled ??
      stats?.damageBonusEnabled ??
      null;
    const damageReductionEnabledRaw =
      (row as any)?.damageReductionEnabled ??
      (row as any)?.damage_reduction_enabled ??
      stats?.damage_reduction_enabled ??
      stats?.damageReductionEnabled ??
      null;
    const weaknessEnabledRaw =
      (row as any)?.weaknessEnabled ??
      (row as any)?.weakness_enabled ??
      stats?.weakness_enabled ??
      stats?.weaknessEnabled ??
      null;
    const paDiscountEnabledRaw =
      (row as any)?.paDiscountEnabled ??
      (row as any)?.pa_discount_enabled ??
      stats?.pa_discount_enabled ??
      stats?.paDiscountEnabled ??
      null;

    const durationModeRaw =
      (row as any)?.durationMode ??
      (row as any)?.duration_mode ??
      (row as any)?.action_duration_mode ??
      stats?.duration_mode ??
      stats?.action_duration_mode ??
      stats?.durationMode ??
      stats?.actionDurationMode ??
      null;
    const actionsDurationTypeRaw =
      (row as any)?.actionsDurationType ??
      (row as any)?.actions_duration_type ??
      (row as any)?.action_duration_type ??
      stats?.actions_duration_type ??
      stats?.action_duration_type ??
      stats?.actionsDurationType ??
      stats?.actionDurationType ??
      null;
    const decrementOnFailureRaw =
      (row as any)?.decrementOnFailure ??
      (row as any)?.decrement_on_failure ??
      stats?.decrement_on_failure ??
      stats?.decrementOnFailure ??
      null;

    return {
      name: String((row as any)?.name ?? ''),
      turns: (row as any)?.turns ?? null,
      durationMode: durationModeRaw === 'actions' || durationModeRaw === 'turns' ? durationModeRaw : undefined,
      actionsDurationType: actionsDurationTypeRaw === 'received' || actionsDurationTypeRaw === 'performed' ? actionsDurationTypeRaw : undefined,
      decrementOnFailure: typeof decrementOnFailureRaw === 'boolean' ? decrementOnFailureRaw : undefined,
      description: String((row as any)?.description ?? ''),
      malus: String((row as any)?.malus ?? ''),
      doesDamage: inferredDoesDamage,
      damageSets,
      statsModifier,
      modifiesSpecifics: inferredModifiesSpecifics,
      tempHealth: inferredModifiesSpecifics ? tempHealthValue : null,
      tempActionPoints: inferredModifiesSpecifics ? tempActionPointsValue : null,
      tempArmour: inferredModifiesSpecifics ? tempArmourValue : null,
      damageBonusEnabled: damageBonusEnabledRaw !== null ? !!damageBonusEnabledRaw : !!damageBonusObj,
      damageBonus: damageBonusObj,
      damageReductionEnabled: damageReductionEnabledRaw !== null ? !!damageReductionEnabledRaw : !!damageReductionObj,
      damageReduction: damageReductionObj,
      weaknessEnabled: weaknessEnabledRaw !== null ? !!weaknessEnabledRaw : !!weaknessObj,
      weakness: weaknessObj,
      paDiscountEnabled: paDiscountEnabledRaw !== null ? !!paDiscountEnabledRaw : !!paDiscountObj,
      paDiscount: paDiscountObj,
    };
  };

  const handleSaveAnomaly = async (def: any) => {
    try {
      if (editingAnomalyId) {
        await updateAnomaly(editingAnomalyId, def);
        toast({ title: 'Anomalia aggiornata', description: 'Modifiche salvate correttamente.' });
      } else {
        await createAnomaly(def);
        toast({ title: 'Anomalia creata', description: 'Definizione salvata correttamente.' });
      }
      closeAnomalyModal();
      reloadAnomalies();
    } catch (error: any) {
      console.error('Errore salvataggio anomalia', error);
      toast({ title: 'Errore', description: error?.message || 'Impossibile salvare l\'anomalia', variant: 'destructive' });
    }
  };

  const handleEditAnomaly = async (id: string) => {
    try {
      const row = await getAnomalyById(id);
      const def = mapAnomalyRowToDefinition(row);
      setEditingAnomalyId(id);
      setEditingAnomalyDef(def);
      setOpenAnomalyModal(true);
    } catch (error: any) {
      console.error('Errore caricamento anomalia per modifica', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile caricare l\'anomalia per la modifica',
        variant: 'destructive',
      });
    }
  };

  const handleSaveMagicQuiver = async (def: any) => {
    try {
      await createMagicQuiver(def);
      toast({ title: 'Faretra Magica creata', description: 'Pacchetto di proiettili salvato correttamente.' });
      setOpenMagicQuiverModal(false);
    } catch (error: any) {
      console.error('Errore salvataggio faretra', error);
      toast({ title: 'Errore', description: error?.message || 'Impossibile creare la faretra magica (verifica tabella magic_quivers)', variant: 'destructive' });
    }
  };

  const handleSaveDamageEffect = async (def: any) => {
    try {
      await createDamageEffect(def);
      toast({ title: 'Tipo danno creato', description: 'Definizione salvata correttamente.' });
      setOpenDamageEffectModal(false);
      reloadDamageEffects();
    } catch (error: any) {
      console.error('Errore salvataggio tipo danno', error);
      toast({ title: 'Errore', description: error?.message || 'Impossibile creare il tipo di danno', variant: 'destructive' });
    }
  };

  const handleSaveMaterial = async (def: any) => {
    try {
      await createMaterial(def);
      toast({ title: 'Materiale creato', description: 'Definizione salvata correttamente.' });
      setOpenMaterialModal(false);
    } catch (error: any) {
      console.error('Errore salvataggio materiale', error);
      toast({ title: 'Errore', description: error?.message || 'Impossibile creare il materiale (verifica tabella materials)', variant: 'destructive' });
    }
  };

  const handleSaveWeaponType = async (def: any) => {
    try {
      await createWeaponType(def);
      toast({ title: 'Tipo arma creato', description: 'Definizione salvata correttamente.' });
      setOpenWeaponTypeModal(false);
    } catch (error: any) {
      console.error('Errore salvataggio tipo arma', error);
      toast({ title: 'Errore', description: error?.message || 'Impossibile creare il tipo di arma (verifica tabella weapon_types)', variant: 'destructive' });
    }
  };

  const handleSaveEvocation = async (def: any) => {
    try {
      // Valida tipo ammesso
      const allowed = ['weapon', 'entity', 'replica'];
      if (!allowed.includes(def.type)) {
        throw new Error(`Tipo evocazione non ammesso: ${def.type}`);
      }

      await createEvocation({
        name: def.name,
        type: def.type,
        levels: def.levels,
      });

      toast({ title: 'Evocazione creata', description: 'Definizione salvata su Supabase.' });
      setOpenEvocationModal(false);
    } catch (error: any) {
      console.error('Errore salvataggio evocazione', error);
      toast({ title: 'Errore', description: error?.message || 'Impossibile creare l\'evocazione', variant: 'destructive' });
    }
  };

  // Sezione Evocazioni arma rimossa finché non implementata

  const handleDeleteAnomaly = async (id: string) => {
    setDeletingAnomalyIds((p) => ({ ...p, [id]: true }));
    try {
      await deleteAnomaly(id);
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
      toast({ title: 'Anomalia eliminata', description: 'Record rimosso correttamente.' });
    } catch (error: any) {
      console.error('Errore eliminazione anomalia', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare l\'anomalia (potrebbe essere referenziata altrove).',
        variant: 'destructive',
      });
    } finally {
      setDeletingAnomalyIds((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDeleteDamageEffect = async (id: string) => {
    setDeletingDamageEffectIds((p) => ({ ...p, [id]: true }));
    try {
      await deleteDamageEffect(id);
      setDamageEffects((prev) => prev.filter((d) => d.id !== id));
      toast({ title: 'Damage effect eliminato', description: 'Record rimosso correttamente.' });
    } catch (error: any) {
      console.error('Errore eliminazione damage effect', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare il damage effect (potrebbe essere referenziato altrove).',
        variant: 'destructive',
      });
    } finally {
      setDeletingDamageEffectIds((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    setDeletingCharacterIds((p) => ({ ...p, [id]: true }));
    try {
      await deleteCharacter(id);
    } finally {
      setDeletingCharacterIds((p) => ({ ...p, [id]: false }));
    }
  };

  const handleAddSpecific = () => {
    const name = specificName.trim();
    if (!name) {
      toast({
        title: 'Nome mancante',
        description: 'Inserisci un nome per la specifica.',
        variant: 'destructive',
      });
      return;
    }
    const exists = specificCatalog.some((item) => item.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast({
        title: 'Specifica già presente',
        description: 'Esiste già una specifica con questo nome.',
        variant: 'destructive',
      });
      return;
    }
    const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `spec_${Date.now()}`;
    const next = [...specificCatalog, { id, name, color: specificColor.trim() }];
    setSpecificCatalog(next);
    writeSpecificCatalog(next);
    setSpecificName('');
  };

  const handleDeleteSpecific = (id: string) => {
    const next = specificCatalog.filter((item) => item.id !== id);
    setSpecificCatalog(next);
    writeSpecificCatalog(next);
  };

  const handleUpdateSpecificColor = (id: string, color: string) => {
    const next = specificCatalog.map((item) => (item.id === id ? { ...item, color } : item));
    setSpecificCatalog(next);
    writeSpecificCatalog(next);
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accesso Negato</CardTitle>
            <CardDescription>Questa pagina è riservata agli admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Contatta un amministratore per ottenere i permessi.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Console Amministratore</h1>
        <p className="text-muted-foreground">Gestisci anomalie e definizioni dei tipi di danno. Altre funzioni in arrivo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gestisci Anomalie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Gestisci Anomalie</CardTitle>
            <CardDescription>Crea e definisci anomalie applicabili a magie o regole.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => { setEditingAnomalyId(null); setEditingAnomalyDef(null); setOpenAnomalyModal(true); }}>Apri modale anomalie</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Specifiche Personaggio</CardTitle>
            <CardDescription>Aggiungi nuove specifiche personalizzate.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenSpecificModal(true)}>Gestisci specifiche</Button>
          </CardContent>
        </Card>

        {/* Creazione Proiettili Magici (Faretra) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Creazione Proiettili Magici</CardTitle>
            <CardDescription>Definisci pacchetti di frecce magiche (Faretra Magica).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenMagicQuiverModal(true)}>Apri modale faretra</Button>
          </CardContent>
        </Card>

        {/* Crea Tipo Danno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Crea Tipo Danno</CardTitle>
            <CardDescription>Definisci un nuovo tipo di danno/effetto.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenDamageEffectModal(true)}>Apri modale tipo danno</Button>
          </CardContent>
        </Card>

        {/* Creazione Materiale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Creazione Materiale</CardTitle>
            <CardDescription>Definisci materiale: nome, peso per lingotto, descrizione e bonus.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenMaterialModal(true)}>Apri modale materiale</Button>
          </CardContent>
        </Card>

        {/* Creazione Tipo Arma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Creazione Tipo Arma</CardTitle>
            <CardDescription>Definisci nome e tipologia (mischia o distanza).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenWeaponTypeModal(true)}>Apri modale tipo arma</Button>
          </CardContent>
        </Card>

        {/* Creazione Evocazione */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sword className="h-5 w-5" /> Creazione Evocazione</CardTitle>
            <CardDescription>Definisci arma evocata o entità con 10 livelli.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenEvocationModal(true)}>Apri modale evocazione</Button>
          </CardContent>
        </Card>

        {/* Evocazioni Arma - funzione in sviluppo, sezione temporaneamente disabilitata */}
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder per future funzioni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Strumenti Admin</CardTitle>
            <CardDescription>Funzioni aggiuntive in sviluppo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Presto: gestione magie, abilità, pulizia dati.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Storico Acquisti</CardTitle>
            <CardDescription>Visualizza lo storico acquisti degli utenti.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = '/admin/purchase-history'}>Apri storico acquisti</Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Elimina Anomalie</CardTitle>
            <CardDescription>Rimuovi definizioni di anomalie già create.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={anomalyQuery} onChange={(e) => setAnomalyQuery(e.target.value)} placeholder="Cerca per nome o ID..." />
              <Button variant="outline" onClick={reloadAnomalies} disabled={anomaliesLoading}>Ricarica</Button>
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {filteredAnomalies.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.name || '(Senza nome)'}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEditAnomaly(a.id)}>Modifica</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={!!deletingAnomalyIds[a.id]}>Elimina</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare questa anomalia?</AlertDialogTitle>
                          <AlertDialogDescription>
                            L'operazione è irreversibile. Se l'anomalia è usata altrove, l'eliminazione potrebbe fallire.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAnomaly(a.id)}>Conferma</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {!anomaliesLoading && filteredAnomalies.length === 0 && (
                <div className="text-sm text-muted-foreground">Nessuna anomalia trovata.</div>
              )}
              {anomaliesLoading && (
                <div className="text-sm text-muted-foreground">Caricamento...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Elimina Damage Effects</CardTitle>
            <CardDescription>Rimuovi tipi di danno/effetto già creati.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={damageEffectQuery} onChange={(e) => setDamageEffectQuery(e.target.value)} placeholder="Cerca per nome o ID..." />
              <Button variant="outline" onClick={reloadDamageEffects} disabled={damageEffectsLoading}>Ricarica</Button>
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {filteredDamageEffects.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.name || '(Senza nome)'}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.id}</div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={!!deletingDamageEffectIds[d.id]}>Elimina</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo damage effect?</AlertDialogTitle>
                        <AlertDialogDescription>
                          L'operazione è irreversibile. Se il damage effect è usato altrove, l'eliminazione potrebbe fallire.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDamageEffect(d.id)}>Conferma</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {!damageEffectsLoading && filteredDamageEffects.length === 0 && (
                <div className="text-sm text-muted-foreground">Nessun damage effect trovato.</div>
              )}
              {damageEffectsLoading && (
                <div className="text-sm text-muted-foreground">Caricamento...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Elimina Personaggi</CardTitle>
            <CardDescription>Rimuovi personaggi salvati (anche di altri utenti se admin).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={characterQuery} onChange={(e) => setCharacterQuery(e.target.value)} placeholder="Cerca per nome o ID..." />
              <Button variant="outline" onClick={loadAllCharacters}>Ricarica</Button>
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {filteredCharacters.map((c: any) => (
                <div key={String(c?.id)} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{String(c?.name ?? '(Senza nome)')}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {String(c?.id)} · Lv {Number(c?.level ?? 1) || 1}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={!!deletingCharacterIds[String(c?.id)]}>Elimina</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo personaggio?</AlertDialogTitle>
                        <AlertDialogDescription>L'operazione è irreversibile.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCharacter(String(c?.id))}>Conferma</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {filteredCharacters.length === 0 && (
                <div className="text-sm text-muted-foreground">Nessun personaggio trovato.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Evocazioni arma - in sviluppo, sezione temporaneamente disabilitata */}

      {/* Modali */}
      <AnomalyAdminModal
        key={editingAnomalyId ?? 'new-anomaly'}
        isOpen={openAnomalyModal}
        onClose={closeAnomalyModal}
        onSave={handleSaveAnomaly}
        initialDef={editingAnomalyDef}
        saveLabel={editingAnomalyId ? 'Aggiorna' : 'Salva'}
      />
      <MagicQuiverAdminModal isOpen={openMagicQuiverModal} onClose={() => setOpenMagicQuiverModal(false)} onSave={handleSaveMagicQuiver} />
      <DamageEffectAdminModal isOpen={openDamageEffectModal} onClose={() => setOpenDamageEffectModal(false)} onSave={handleSaveDamageEffect} />
      <MaterialAdminModal isOpen={openMaterialModal} onClose={() => setOpenMaterialModal(false)} onSave={handleSaveMaterial} />
      <WeaponTypeAdminModal isOpen={openWeaponTypeModal} onClose={() => setOpenWeaponTypeModal(false)} onSave={handleSaveWeaponType} />
      <EvocationAdminModal isOpen={openEvocationModal} onClose={() => setOpenEvocationModal(false)} onSave={handleSaveEvocation} />

      <Dialog open={openSpecificModal} onOpenChange={setOpenSpecificModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Specifiche Personaggio</DialogTitle>
            <DialogDescription>Aggiungi o rimuovi specifiche personalizzate disponibili.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={specificName}
                onChange={(e) => setSpecificName(e.target.value)}
                placeholder="Nome specifica"
              />
              <Input
                type="color"
                value={specificColor}
                onChange={(e) => setSpecificColor(e.target.value)}
                className="w-14 px-1"
                aria-label="Colore specifica"
              />
              <Button onClick={handleAddSpecific}>Aggiungi</Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={specificQuery}
                onChange={(e) => setSpecificQuery(e.target.value)}
                placeholder="Cerca per nome o ID..."
              />
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {filteredSpecificCatalog.map((spec) => (
                <div key={spec.id} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-2.5 w-2.5 rounded-full border"
                        style={{ backgroundColor: spec.color || '#e5e7eb', borderColor: spec.color || '#e5e7eb' }}
                      />
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                        style={{
                          color: spec.color || '#6b7280',
                          borderColor: spec.color || '#e5e7eb',
                          backgroundColor: spec.color ? `${spec.color}20` : '#f3f4f6',
                        }}
                      >
                        {spec.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{spec.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={spec.color || '#e5e7eb'}
                      onChange={(e) => handleUpdateSpecificColor(spec.id, e.target.value)}
                      className="h-8 w-10 p-1"
                      aria-label="Colore specifica"
                    />
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSpecific(spec.id)}>Elimina</Button>
                  </div>
                </div>
              ))}
              {filteredSpecificCatalog.length === 0 && (
                <div className="text-sm text-muted-foreground">Nessuna specifica trovata.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
