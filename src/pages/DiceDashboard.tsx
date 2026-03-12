import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CharacterSelector from '@/components/character/CharacterSelector';
import CharacterSheet from '@/components/character/CharacterSheet';
import EnemySheet from '@/components/character/EnemySheet';
import { useCharacters } from '@/hooks/useCharacters';
import { useCharacterCalculations } from '@/hooks/useCharacterCalculations';
import type { CharacterStats, StatusAnomaly, InventoryItem, Potion } from '@/types/character';
import PostureSelectionModal from '@/components/posture/PostureSelectionModal';
import EnemyPostureSelectionModal from '@/components/posture/EnemyPostureSelectionModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import CharacterAnomalies from '@/components/character/CharacterAnomalies';
import StatSelectionDialog from '@/components/dice/StatSelectionDialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useNewRollHistory } from '@/hooks/useNewRollHistory';
import NewRollHistoryPanel from '@/components/dice/NewRollHistoryPanel';
import RollSuccessDialog from '@/components/dice/RollSuccessDialog';
import TargetEditDialog from '@/components/dice/TargetEditDialog';
import DirectModificationModal from '@/components/dice/DirectModificationModal';
import { listEvocationInstancesByCharacter, updateEvocationInstanceTurns, deleteEvocationInstance, createEvocationInstance, listAllEvocationInstances } from '@/integrations/supabase/evocationInstances';
import CharactersSidebar from '@/components/dice/CharactersSidebar';
import { supabase } from '@/integrations/supabase/client';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import EnemiesSidebar from '@/components/dice/EnemiesSidebar';
import EnemyStatSelectionDialog from '@/components/dice/EnemyStatSelectionDialog';
import AddEnemyForm from '@/components/dice/AddEnemyForm';
import { useAuth } from '@/hooks/useAuth';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { Dice6 } from 'lucide-react';
import EnemyDirectModificationModal from '@/components/dice/EnemyDirectModificationModal';

// Solo struttura visuale, nessuna logica funzionale.
// Layout fedele all'immagine, con margini, padding e bordi.

const Box: React.FC<{ title?: string; className?: string; children?: React.ReactNode }> = ({ title, className = '', children }) => (
  <div className={`border rounded-md p-2 bg-background ${className}`}>
    {title ? <div className="text-xs font-semibold mb-1">{title}</div> : null}
    {children}
  </div>
);

  const DiceDashboard: React.FC = () => {
  const {
    characters,
    selectedCharacter,
    setSelectedCharacter,
    userRole,
    loadAllCharacters,
    loadFullCharacter,
    updateCharacter,
  } = useCharacters();
  const { toast } = useToast();
  const [damageEffectNameById, setDamageEffectNameById] = useState<Record<string, string>>({});
  const [damageEffectsLoading, setDamageEffectsLoading] = useState(false);

  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
    const [showCharacterSheet, setShowCharacterSheet] = useState(false);
    const [showEnemySheet, setShowEnemySheet] = useState(false);
  const [showPostureModal, setShowPostureModal] = useState(false);
  const [showAnomaliesModal, setShowAnomaliesModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showActiveEventsModal, setShowActiveEventsModal] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
    const [quantityToUse, setQuantityToUse] = useState<number>(1);
  const [selectedPotionItem, setSelectedPotionItem] = useState<Potion | null>(null);
  const [quantityToUsePotion, setQuantityToUsePotion] = useState<number>(1);
  const [isUsingPotion, setIsUsingPotion] = useState<boolean>(false);
  const [selectedPotionAnomalyDetails, setSelectedPotionAnomalyDetails] = useState<StatusAnomaly | null>(null);
  const [showStatSelectionModal, setShowStatSelectionModal] = useState(false);
  const [showCustomSpecificsModal, setShowCustomSpecificsModal] = useState(false);
  const [isModificationModalOpen, setIsModificationModalOpen] = useState(false);
  const [showPassiveActivationModal, setShowPassiveActivationModal] = useState(false);
  const [passiveActivationTab, setPassiveActivationTab] = useState<'abilities' | 'magic'>('abilities');
  const [passiveActivationQuery, setPassiveActivationQuery] = useState('');
  const [pendingPassiveActivation, setPendingPassiveActivation] = useState<{ sourceType: 'ability' | 'spell'; item: any } | null>(null);
  const [showEvocationsModal, setShowEvocationsModal] = useState(false);
  const [evocationInstances, setEvocationInstances] = useState<any[]>([]);
  const [loadingEvocations, setLoadingEvocations] = useState(false);
  const [currentEvocationForRoll, setCurrentEvocationForRoll] = useState<any | null>(null);
  const [evocationSpellDetailsById, setEvocationSpellDetailsById] = useState<Record<string, any>>({});
  const [evocationAbilityDetailsById, setEvocationAbilityDetailsById] = useState<Record<string, any>>({});
  const [expandedEvocationId, setExpandedEvocationId] = useState<string | null>(null);
  const [allEvocationInstances, setAllEvocationInstances] = useState<any[]>([]);
  const [loadingAllEvocations, setLoadingAllEvocations] = useState(false);
  // Eventi magici a turni (client-side): creati quando si lancia una magia con durata in turni ma senza evocazione
    const [activeSpellEvents, setActiveSpellEvents] = useState<any[]>([]);
    // Nuovo: eventi di Recupero (cooldown uso magia) e mappa cooldown
    const [activeRecoveryEvents, setActiveRecoveryEvents] = useState<any[]>([]);
    const [spellCooldowns, setSpellCooldowns] = useState<Record<string, number>>({});
    const [perTurnUses, setPerTurnUses] = useState<Record<string, number>>({});
  const pendingRecoveryStartsRef = useRef<Record<string, { turns: number; sid: string; name: string; description: string; ownerId: string; ownerName: string }>>({});
  const anomaliesScrollRef = useRef<HTMLDivElement | null>(null);
  const spellsScrollRef = useRef<HTMLDivElement | null>(null);
  const recoveryScrollRef = useRef<HTMLDivElement | null>(null);
  const evocationsScrollRef = useRef<HTMLDivElement | null>(null);
  const evocationsModalScrollRef = useRef<HTMLDivElement | null>(null);
  const [isCharactersSidebarOpen, setIsCharactersSidebarOpen] = useState(false);
  const [selectedPublicCharacterId, setSelectedPublicCharacterId] = useState('');
  const [publicCharacters, setPublicCharacters] = useState<any[]>([]);
  const [isEnemiesSidebarOpen, setIsEnemiesSidebarOpen] = useState(false);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [isAddEnemyModalOpen, setIsAddEnemyModalOpen] = useState(false);
  const [editingEnemy, setEditingEnemy] = useState<any | null>(null);
  const [isEnemySelectionOpen, setIsEnemySelectionOpen] = useState(false);
  const [isEnemyPostureModalOpen, setIsEnemyPostureModalOpen] = useState(false);
  const [isEnemyStatSelectionOpen, setIsEnemyStatSelectionOpen] = useState(false);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string>('');
  const [enemySearchTerm, setEnemySearchTerm] = useState<string>('');
  // Stato anomalie per nemici (in memoria, per sessione)
  const [enemyAnomaliesById, setEnemyAnomaliesById] = useState<Record<string, StatusAnomaly[]>>({});
  const [showMultiShotTargetEdit, setShowMultiShotTargetEdit] = useState<boolean>(false);
  const enemyAnomalies = useMemo(() => enemyAnomaliesById[selectedEnemyId] || [], [enemyAnomaliesById, selectedEnemyId]);
  const [showEnemyAnomaliesModal, setShowEnemyAnomaliesModal] = useState(false);
  const { user } = useAuth();
  const [isEnemyModificationModalOpen, setIsEnemyModificationModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setDamageEffectsLoading(true);
      try {
        const list = await listDamageEffects();
        const next: Record<string, string> = {};
        for (const row of Array.isArray(list) ? list : []) {
          if (row?.id == null) continue;
          const name = String(row?.name || '').trim();
          if (!name) continue;
          next[String(row.id)] = name;
        }
        if (active) setDamageEffectNameById(next);
      } finally {
        if (active) setDamageEffectsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const resolveEffectName = (id: string) =>
    damageEffectNameById[String(id)] ?? (damageEffectsLoading ? 'Caricamento...' : 'Effetto sconosciuto');

  useEffect(() => {
    const loadEvocationRefs = async () => {
      try {
        if (!currentEvocationForRoll) return;
        const level = (currentEvocationForRoll?.details?.level_data || {}) as any;
        const refs: any[] = Array.isArray(level?.energy_embedded_refs) ? level.energy_embedded_refs : [];
        const spellIdsFromRefs = refs
          .filter((r: any) => String(r?.refType || r?.type || '').toLowerCase() === 'spell' || String(r?.refType || r?.type || '').toLowerCase() === 'magic')
          .map((r: any) => String(r?.refId || '').trim())
          .filter(Boolean);
        const abilityIdsFromRefs = refs
          .filter((r: any) => String(r?.refType || r?.type || '').toLowerCase() === 'ability')
          .map((r: any) => String(r?.refId || '').trim())
          .filter(Boolean);

        const spellIdsFromList = Array.isArray(level?.spells)
          ? level.spells.map((s: any) => String(s?.id || '').trim()).filter(Boolean)
          : [];
        const abilityIdsFromList = Array.isArray(level?.abilities)
          ? level.abilities.map((a: any) => String(a?.id || '').trim()).filter(Boolean)
          : [];

        const spellIds = Array.from(new Set([...spellIdsFromRefs, ...spellIdsFromList])).filter((id) => !evocationSpellDetailsById[id]);
        const abilityIds = Array.from(new Set([...abilityIdsFromRefs, ...abilityIdsFromList])).filter((id) => !evocationAbilityDetailsById[id]);

        if (spellIds.length > 0) {
          const { data } = await supabase.from('spells').select('id,name,levels').in('id', spellIds);
          const rows = Array.isArray(data) ? data : [];
          if (rows.length > 0) {
            setEvocationSpellDetailsById((prev) => {
              const next = { ...prev };
              rows.forEach((r: any) => {
                const id = String(r?.id || '').trim();
                if (!id) return;
                next[id] = r;
              });
              return next;
            });
          }
        }

        if (abilityIds.length > 0) {
          const { data } = await supabase.from('abilities').select('id,name,levels').in('id', abilityIds);
          const rows = Array.isArray(data) ? data : [];
          if (rows.length > 0) {
            setEvocationAbilityDetailsById((prev) => {
              const next = { ...prev };
              rows.forEach((r: any) => {
                const id = String(r?.id || '').trim();
                if (!id) return;
                next[id] = r;
              });
              return next;
            });
          }
        }
      } catch (e) {
        console.warn('[DiceDashboard] loadEvocationRefs error:', e);
      }
    };
    loadEvocationRefs();
  }, [currentEvocationForRoll, evocationAbilityDetailsById, evocationSpellDetailsById]);

  const selectedEnemy = useMemo(() => {
    try {
      return (enemies || []).find((e: any) => String(e?.id) === String(selectedEnemyId)) || null;
    } catch {
      return null;
    }
  }, [enemies, selectedEnemyId]);

  useEffect(() => {
    if (!selectedEnemyId) return;
    const raw =
      (selectedEnemy as any)?.enemy_anomalies ??
      (selectedEnemy as any)?.enemyAnomalies ??
      (selectedEnemy as any)?.anomalies ??
      [];
    const list = Array.isArray(raw) ? (raw as StatusAnomaly[]) : [];
    setEnemyAnomaliesById((prev) => ({ ...prev, [selectedEnemyId]: list }));
  }, [selectedEnemyId, selectedEnemy]);

  const persistEnemyAnomalies = async (enemyId: string, list: StatusAnomaly[]) => {
    try {
      const { error } = await supabase
        .from('enemies')
        .update({ enemy_anomalies: list })
        .eq('id', enemyId);
      if (error) throw error;
      setEnemies((prev) =>
        prev.map((e: any) => (String(e?.id) === String(enemyId) ? { ...e, enemy_anomalies: list } : e)),
      );
    } catch (e) {
      console.error('Errore salvataggio anomalie nemico:', e);
      toast({ title: 'Errore', description: 'Impossibile salvare le anomalie del nemico', variant: 'destructive' });
    }
  };

  const appendEnemyAnomalies = (enemyId: string, anomaliesToAdd: StatusAnomaly[]) => {
    const id = String(enemyId || '').trim();
    if (!id) return;
    const list = Array.isArray(anomaliesToAdd) ? anomaliesToAdd : [];
    if (list.length === 0) return;
    setEnemyAnomaliesById((prev) => {
      const prevList = Array.isArray(prev?.[id]) ? prev[id] : [];
      const nextList = [...prevList, ...list];
      void persistEnemyAnomalies(id, nextList);
      return { ...prev, [id]: nextList };
    });
  };

  // Funzioni gestione anomalie nemico (solo client-side in questa fase)
  const addEnemyAnomaly = (anomaly: StatusAnomaly) => {
    if (!selectedEnemyId) return;
    setEnemyAnomaliesById(prev => ({
      ...prev,
      [selectedEnemyId]: (() => {
        const nextList = [...(prev[selectedEnemyId] || []), anomaly];
        void persistEnemyAnomalies(selectedEnemyId, nextList);
        return nextList;
      })(),
    }));
    toast({ title: 'Anomalia aggiunta', description: `Aggiunta al nemico: ${selectedEnemy?.name || ''}` });
  };

  const updateEnemyAnomaly = (anomaly: StatusAnomaly) => {
    if (!selectedEnemyId) return;
    setEnemyAnomaliesById(prev => ({
      ...prev,
      [selectedEnemyId]: (() => {
        const nextList = (prev[selectedEnemyId] || []).map(a => a.id === anomaly.id ? anomaly : a);
        void persistEnemyAnomalies(selectedEnemyId, nextList);
        return nextList;
      })(),
    }));
    toast({ title: 'Anomalia aggiornata', description: `${anomaly.name || ''}` });
  };

  const removeEnemyAnomaly = (id: string) => {
    if (!selectedEnemyId) return;
    setEnemyAnomaliesById(prev => ({
      ...prev,
      [selectedEnemyId]: (() => {
        const nextList = (prev[selectedEnemyId] || []).filter(a => a.id !== id);
        void persistEnemyAnomalies(selectedEnemyId, nextList);
        return nextList;
      })(),
    }));
    toast({ title: 'Anomalia rimossa' });
  };

  const handleEnemyStatConfirm = (payload: any) => {
    try {
      const statLabel = payload?.selectedStat ? `Statistica: ${String(payload.selectedStat)}` : 'Statistica non selezionata';
      let damageLabel = 'Nessun danno';
      const dmg = payload?.damage;
      if (dmg) {
        if (dmg.source === 'equipment') {
          damageLabel = `Arma: ${dmg?.weapon?.name || ''} • ${dmg?.damageType || ''}`;
        } else if (dmg.source === 'magic') {
          damageLabel = `Magia: ${dmg?.spell?.name || ''}`;
        } else if (dmg.source === 'ability') {
          damageLabel = `Abilità: ${dmg?.ability?.name || ''}`;
        }
      }
      toast({
        title: 'Tiro nemico',
        description: `${selectedEnemy?.name || 'Nemico'} • ${statLabel} • ${damageLabel}`,
      });
    } catch (e) {
      toast({ title: 'Errore tiro', description: 'Impossibile registrare il tiro', variant: 'destructive' });
    }
  };

  const reloadAllEvocations = async () => {
    setLoadingAllEvocations(true);
    try {
      const rows = await listAllEvocationInstances();
      setAllEvocationInstances(rows);
    } catch (e) {
      setAllEvocationInstances([]);
    } finally {
      setLoadingAllEvocations(false);
    }
  };

  // Carica tutti i personaggi pubblici (visibili a chiunque)
  const loadPublicCharacters = async () => {
    try {
      const { data } = await supabase
        .from('characters')
        .select('id, name, user_id, avatar_url, is_public, data')
        .eq('is_public', true);
      if (data) {
        const formatted = data.map((char: any) => {
          const rawData = (char?.data || {}) as any;
          const normalizedEquipment = Array.isArray(rawData?.equipment)
            ? rawData.equipment
            : Object.values(rawData?.equipment || {}).filter(Boolean);
          return {
            ...rawData,
            equipment: normalizedEquipment,
            id: char.id,
            name: char.name ?? rawData?.name,
            level: rawData?.level ?? 1,
            avatar_url: char.avatar_url,
            user_id: char.user_id,
            is_public: char.is_public === true,
          };
        });
        setPublicCharacters(formatted);
      } else {
        setPublicCharacters([]);
      }
    } catch (e) {
      setPublicCharacters([]);
    }
  };

  // Carica i nemici (visibili a tutti secondo policy)
  const loadEnemies = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('enemies')
        .select('*')
        .order('name');
      setEnemies(data || []);
    } catch (e) {
      setEnemies([]);
    }
  }, []);

  useEffect(() => {
    if (isEnemySelectionOpen) {
      void loadEnemies();
    }
  }, [isEnemySelectionOpen, loadEnemies]);

  useEffect(() => {
    if (!isLocalServer()) return;
    let t: any = null;
    const schedule = () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        void loadEnemies();
      }, 120);
    };
    const unsub = Api.subscribeEnemies(() => schedule());
    return () => {
      if (t) clearTimeout(t);
      try { unsub?.(); } catch {}
    };
  }, [loadEnemies]);

  const handleSaveEnemy = async (enemyData: any) => {
    try {
      let error: any = null;
      if (editingEnemy?.id) {
        const fallbackAnomalies = Array.isArray(enemyData?.enemy_anomalies)
          ? enemyData.enemy_anomalies
          : (Array.isArray((editingEnemy as any)?.enemy_anomalies)
              ? (editingEnemy as any).enemy_anomalies
              : (enemyAnomaliesById[String(editingEnemy.id)] || []));
        // Aggiornamento consentito a tutti: current_ e campi correlati
        const res = await supabase
          .from('enemies')
          .update({
            name: enemyData.name,
            enemy_level: enemyData.enemy_level ?? 1,
            enemy_max_hp: enemyData.enemy_max_hp,
            enemy_max_armor: enemyData.enemy_max_armor,
            enemy_max_pa: enemyData.enemy_max_pa,
            enemy_current_hp: enemyData.enemy_current_hp ?? enemyData.enemy_max_hp,
            enemy_current_armor: enemyData.enemy_current_armor ?? enemyData.enemy_max_armor,
            enemy_current_pa: enemyData.enemy_current_pa ?? enemyData.enemy_max_pa,
            enemy_forza: enemyData.enemy_forza,
            enemy_percezione: enemyData.enemy_percezione,
            enemy_resistenza: enemyData.enemy_resistenza,
            enemy_intelletto: enemyData.enemy_intelletto,
            enemy_sapienza: enemyData.enemy_sapienza,
            enemy_anima: enemyData.enemy_anima,
            enemy_weapons: enemyData.enemy_weapons,
            enemy_spells: enemyData.enemy_spells,
            enemy_abilities: enemyData.enemy_abilities,
            enemy_anomalies: fallbackAnomalies,
          })
          .eq('id', editingEnemy.id);
        error = res.error;
      } else {
        // Creazione consentita SOLO a admin
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .maybeSingle();
        if (roleError || !roleData || roleData.role !== 'admin') {
          toast({ title: 'Accesso negato', description: 'Solo gli amministratori possono creare nemici', variant: 'destructive' });
          return;
        }
        const res = await supabase
          .from('enemies')
          .insert({
            user_id: user?.id,
            name: enemyData.name,
            enemy_level: enemyData.enemy_level ?? 1,
            enemy_max_hp: enemyData.enemy_max_hp,
            enemy_max_armor: enemyData.enemy_max_armor,
            enemy_max_pa: enemyData.enemy_max_pa,
            enemy_current_hp: enemyData.enemy_current_hp ?? enemyData.enemy_max_hp,
            enemy_current_armor: enemyData.enemy_current_armor ?? enemyData.enemy_max_armor,
            enemy_current_pa: enemyData.enemy_current_pa ?? enemyData.enemy_max_pa,
            enemy_forza: enemyData.enemy_forza,
            enemy_percezione: enemyData.enemy_percezione,
            enemy_resistenza: enemyData.enemy_resistenza,
            enemy_intelletto: enemyData.enemy_intelletto,
            enemy_sapienza: enemyData.enemy_sapienza,
            enemy_anima: enemyData.enemy_anima,
            enemy_weapons: enemyData.enemy_weapons,
            enemy_spells: enemyData.enemy_spells,
            enemy_abilities: enemyData.enemy_abilities,
            enemy_anomalies: Array.isArray(enemyData?.enemy_anomalies) ? enemyData.enemy_anomalies : [],
          });
        error = res.error;
      }

      if (error) throw error;
      await loadEnemies();
      setIsAddEnemyModalOpen(false);
      setEditingEnemy(null);
      toast({ title: 'Successo', description: editingEnemy ? `Nemico "${enemyData.name}" aggiornato con successo!` : `Nemico "${enemyData.name}" creato con successo!` });
    } catch (e) {
      console.error('Errore salvataggio nemico:', e);
      toast({ title: 'Errore', description: 'Errore nel salvataggio del nemico', variant: 'destructive' });
    }
  };

  const handleDeleteSelectedEnemy = async () => {
    try {
      if (!selectedEnemy) {
        toast({ title: 'Nessun nemico selezionato', description: 'Seleziona un nemico da eliminare.', variant: 'destructive' });
        return;
      }

      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (roleError || !userRole || userRole.role !== 'admin') {
        toast({ title: 'Accesso negato', description: 'Solo gli amministratori possono eliminare nemici', variant: 'destructive' });
        return;
      }

      const confirmed = window.confirm(`Confermi l'eliminazione del nemico "${selectedEnemy.name}"?`);
      if (!confirmed) return;

      const { error } = await supabase
        .from('enemies')
        .delete()
        .eq('id', selectedEnemy.id);
      if (error) throw error;

      // Aggiorna stato locale
      setEnemies(prev => prev.filter(e => e.id !== selectedEnemy.id));
      setSelectedEnemyId('');
      // Pulisci eventuali anomalie memorizzate
      setEnemyAnomaliesById(prev => {
        const next = { ...prev };
        delete next[selectedEnemy.id];
        return next;
      });
      toast({ title: 'Nemico eliminato', description: `"${selectedEnemy.name}" è stato rimosso.` });
    } catch (e) {
      console.error('Errore eliminazione nemico:', e);
      toast({ title: 'Errore', description: 'Impossibile eliminare il nemico', variant: 'destructive' });
    }
  };

  const updateEnemyCurrentValues = async (enemyId: string, updates: any) => {
    const attempt = async () => {
      const { error } = await supabase
        .from('enemies')
        .update(updates)
        .eq('id', enemyId);
      if (error) throw error;
    };
    try {
      await attempt();
      setEnemies(prev => prev.map(enemy => enemy.id === enemyId ? { ...enemy, ...updates } : enemy));
      toast({ title: 'Aggiornato', description: 'Valori del nemico aggiornati' });
    } catch (error1) {
      try {
        await attempt();
        setEnemies(prev => prev.map(enemy => enemy.id === enemyId ? { ...enemy, ...updates } : enemy));
        toast({ title: 'Aggiornato', description: 'Valori del nemico aggiornati' });
      } catch (error2) {
        console.error('Error updating enemy values:', error2);
        toast({ title: 'Errore', description: 'Impossibile aggiornare i valori del nemico', variant: 'destructive' });
      }
    }
  };

  const handleEnemyDirectModificationSave = async (newHealth: number, newActionPoints: number, newArmor: number) => {
    if (!selectedEnemyId) return;
    try {
      const updates = {
        enemy_current_hp: newHealth,
        enemy_current_pa: newActionPoints,
        enemy_current_armor: newArmor
      };
      await updateEnemyCurrentValues(selectedEnemyId, updates);
      setIsEnemyModificationModalOpen(false);
      toast({ title: 'Successo', description: 'Valori del nemico aggiornati con successo' });
    } catch (error) {
      console.error('Error saving enemy modifications:', error);
      toast({ title: 'Errore', description: 'Impossibile salvare le modifiche', variant: 'destructive' });
    }
  };

  // Character-like derivato dall'evocazione corrente per l'uso nei dialog di tiro
  const evocationCharacterLike = useMemo(() => {
    if (!currentEvocationForRoll) return null;
    const level = (currentEvocationForRoll?.details?.level_data || {}) as any;
    const n = (v: unknown): number => Number(v ?? 0);
    const baseStats = Array.isArray(level?.energy_stats ?? level?.stats)
      ? (level.energy_stats ?? level.stats).reduce((acc: any, s: any) => { if (s?.statKey) acc[s.statKey] = Number(s.amount || 0); return acc; }, {})
      : {
          forza: n(level?.forza), percezione: n(level?.percezione), resistenza: n(level?.resistenza), intelletto: n(level?.intelletto), agilita: n(level?.agilita), sapienza: n(level?.sapienza), anima: n(level?.anima),
        };
    const healthVal = n(level?.energy_health ?? level?.health);
    const apVal = n(level?.energy_action_points ?? level?.action_points);
    const armourVal = n(level?.energy_armour ?? level?.armour);

    // Magie/Abilità dall'evocazione → custom_spells/custom_abilities
    let custom_spells: any[] = [];
    let custom_abilities: any[] = [];
    if (Array.isArray(level?.spells)) {
      custom_spells = level.spells.map((s: any, i: number) => ({
        ...(evocationSpellDetailsById[String(s?.id || '').trim()] || {}),
        id: s?.id ?? (evocationSpellDetailsById[String(s?.id || '').trim()]?.id ?? `${currentEvocationForRoll?.id}-spell-${i}`),
        name: s?.name ?? (evocationSpellDetailsById[String(s?.id || '').trim()]?.name ?? 'Magia'),
        current_level: Number(s?.level ?? currentEvocationForRoll?.level ?? 1),
        levels: Array.isArray((evocationSpellDetailsById[String(s?.id || '').trim()] || {})?.levels)
          ? (evocationSpellDetailsById[String(s?.id || '').trim()] || {}).levels
          : (Array.isArray(s?.levels) ? s.levels : [
              {
                level: Number(s?.level ?? currentEvocationForRoll?.level ?? 1),
              },
            ]),
      }));
    }
    if (Array.isArray(level?.abilities)) {
      custom_abilities = level.abilities.map((a: any, i: number) => ({
        ...(evocationAbilityDetailsById[String(a?.id || '').trim()] || {}),
        id: a?.id ?? (evocationAbilityDetailsById[String(a?.id || '').trim()]?.id ?? `${currentEvocationForRoll?.id}-ability-${i}`),
        name: a?.name ?? (evocationAbilityDetailsById[String(a?.id || '').trim()]?.name ?? 'Abilità'),
        current_level: Number(a?.level ?? currentEvocationForRoll?.level ?? 1),
        levels: Array.isArray((evocationAbilityDetailsById[String(a?.id || '').trim()] || {})?.levels)
          ? (evocationAbilityDetailsById[String(a?.id || '').trim()] || {}).levels
          : (Array.isArray(a?.levels) ? a.levels : [
              {
                level: Number(a?.level ?? currentEvocationForRoll?.level ?? 1),
              },
            ]),
      }));
    }
    // Fallback: per evocazioni di tipo energia che usano embedded refs
    if (Array.isArray(level?.energy_embedded_refs)) {
      for (let i = 0; i < level.energy_embedded_refs.length; i++) {
        const r = level.energy_embedded_refs[i];
        const name = r?.refName || r?.name || 'Riferimento';
        const lv = Number(r?.refLevel ?? r?.level ?? currentEvocationForRoll?.level ?? 1);
        const refId = String(r?.refId || '').trim();
        if ((r?.refType || r?.type) === 'spell' || (r?.refType || r?.type) === 'magic') {
          const detail = refId ? evocationSpellDetailsById[refId] : null;
          custom_spells.push({
            ...(detail || {}),
            id: refId || (detail?.id ?? `${currentEvocationForRoll?.id}-eref-spell-${i}`),
            name: detail?.name || name,
            current_level: lv,
            levels: Array.isArray(detail?.levels) ? detail.levels : [{ level: lv }],
          });
        } else if ((r?.refType || r?.type) === 'ability') {
          const detail = refId ? evocationAbilityDetailsById[refId] : null;
          custom_abilities.push({
            ...(detail || {}),
            id: refId || (detail?.id ?? `${currentEvocationForRoll?.id}-eref-ability-${i}`),
            name: detail?.name || name,
            current_level: lv,
            levels: Array.isArray(detail?.levels) ? detail.levels : [{ level: lv }],
          });
        }
      }
    }

    // Equipaggiamento snapshot dell'evocazione → equipment
    let equipment: any = {};
    try {
      // Priorità: details.equipment (persistito in istanza) → level.entity.equipment → level.equipment
      const eq = (currentEvocationForRoll?.details?.equipment ?? level?.entity?.equipment ?? level?.equipment) as any;
      if (Array.isArray(eq)) {
        // Se è un array, prendi la prima arma come weapon
        const firstWeapon = eq.find((i: any) => i?.type === 'arma');
        if (firstWeapon) equipment.weapon = firstWeapon;
        const firstArmor = eq.find((i: any) => i?.type === 'armatura');
        if (firstArmor) equipment.armor = firstArmor;
      } else if (eq && typeof eq === 'object') {
        // Se è un oggetto, copia eventuali campi già strutturati
        if (eq?.type === 'arma') {
          equipment.weapon = eq;
        } else if (eq?.type === 'armatura') {
          equipment.armor = eq;
        } else {
          equipment = {
            weapon: eq.weapon || undefined,
            armor: eq.armor || undefined,
            shield: eq.shield || undefined,
            accessory: eq.accessory || undefined,
          };
        }
      }
    } catch {
      equipment = {};
    }

    const characterLike: any = {
      name: currentEvocationForRoll?.name || 'Evocazione',
      level: Number(currentEvocationForRoll?.level || 1),
      baseStats,
      health: { current: healthVal, max: healthVal },
      actionPoints: { current: apVal, max: apVal },
      baseArmor: armourVal,
      currentArmor: armourVal,
      equipment,
      inventory: [], arrows: [], potions: [],
      currency: { bronzo: 0, argento: 0, oro: 0, rosse: 0, bianche: 0 },
      anomalies: [], skills: {}, magic: {}, custom_spells: [], custom_abilities: []
    };
    characterLike.custom_spells = custom_spells;
    characterLike.custom_abilities = custom_abilities;
    return characterLike;
  }, [currentEvocationForRoll, evocationAbilityDetailsById, evocationSpellDetailsById]);

  const { entries: newHistoryEntries, addEntryFromModalRoll, addDamageEntryFromModalRoll, updateEntryBadge, clear: clearNewHistory, addCustomEntry, updateEntryLotteryInfo, appendEntryDamageSources, reload: reloadHistory } = useNewRollHistory();

  // Stato per la modale di conferma successo/critico e tracking dell'entry azione
  const [showRollSuccess, setShowRollSuccess] = useState(false);
  const [terminateHere, setTerminateHere] = useState<boolean>(false);

  const handleRefreshHistory = async () => {
    try {
      await reloadHistory();
      toast({ title: 'Storico aggiornato', description: 'Recupero completato' });
    } catch {
      toast({ title: 'Errore', description: 'Impossibile aggiornare lo storico', variant: 'destructive' });
    }
  };

  const handleClearHistory = async () => {
    try {
      const count = await clearNewHistory();
      await reloadHistory();
      toast({ title: 'Storico eliminato', description: `${count || 0} voci rimosse globalmente` });
    } catch {
      toast({ title: 'Errore', description: 'Impossibile eliminare lo storico', variant: 'destructive' });
    }
  };
  const [pendingRollData, setPendingRollData] = useState<any | null>(null);
  const [pendingActorForRoll, setPendingActorForRoll] = useState<any | null>(null);
  const [pendingSelectedPostureId, setPendingSelectedPostureId] = useState<string | null>(null);
  const [pendingSelectedPostureName, setPendingSelectedPostureName] = useState<string>('');
  const [pendingActionEntryId, setPendingActionEntryId] = useState<string | null>(null);
  const [actionRollRecap, setActionRollRecap] = useState<{ result: number; maxValue: number; statValue: number; competenceTotal: number } | null>(null);
  const [multiShotRollRecaps, setMultiShotRollRecaps] = useState<Record<number, { result: number; maxValue: number; statValue: number; competenceTotal: number }>>({});
  // Multi‑attacchi: coda richieste e stato conferma dell'azione
    const [multiShotItems, setMultiShotItems] = useState<number[]>([]);
    const [actionSuccessResolved, setActionSuccessResolved] = useState<boolean>(false);
    const [defaultCritical, setDefaultCritical] = useState<boolean>(false);
    const [criticalExtraValueGlobal, setCriticalExtraValueGlobal] = useState<number>(0);
    const [criticalExtraPerShot, setCriticalExtraPerShot] = useState<Record<number, number>>({});
    const [shotCriticalPending, setShotCriticalPending] = useState<number | null>(null);
    // Nuovo stato: dal secondo attacco in poi richiedi un ri-tiro con icona dado
    const [multiShotRollStarted, setMultiShotRollStarted] = useState<Record<number, boolean>>({});
  // Tiro percentuale per conferma successo (solo magie con regola attiva)
  const [percentSuccessRoll, setPercentSuccessRoll] = useState<{ result: number; min: number } | null>(null);
  const [pendingLottery, setPendingLottery] = useState<{ diceFaces: number; numericChoices: number; userChoices: number[] } | null>(null);
  const [lotteryPreview, setLotteryPreview] = useState<{ diceFaces: number; items: { roll: number; correct: boolean }[]; choices: number[] } | null>(null);
  const toBool = (v: any) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    }
    return false;
  };

  const extractPhaseFlowInfo = (item: any) => {
    if (!item) return { enabled: false, phases: [] as any[], index: 0, levelData: null as any };
    const levelNum = Number(item?.current_level || item?.level || item?.levels?.[0]?.level || 1) || 1;
    const levelData = Array.isArray(item?.levels)
      ? (item.levels.find((l: any) => Number(l?.level) === levelNum) || item.levels[0])
      : item;

    const directRaw = Array.isArray((levelData as any)?.phases) ? (levelData as any).phases.filter(Boolean) : [];
    const direct = (() => {
      if (directRaw.length === 0) return [];
      const hasNumber = directRaw.some((p: any) => p && (p.phase_number != null || p.phaseNumber != null || p.number != null || p.index != null));
      if (!hasNumber) return directRaw;
      return [...directRaw].sort((a: any, b: any) => {
        const na = Number(a?.phase_number ?? a?.phaseNumber ?? a?.number ?? a?.index ?? 0) || 0;
        const nb = Number(b?.phase_number ?? b?.phaseNumber ?? b?.number ?? b?.index ?? 0) || 0;
        return na - nb;
      });
    })();
    const phases = direct.length > 0 ? direct : (() => {
      const out: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const enabled = !!(levelData as any)?.[`phase${i}_enabled`];
        if (!enabled) continue;
        out.push({
          name: (levelData as any)?.[`phase${i}_name`] ?? `Fase ${i}`,
          guaranteed_damage: (levelData as any)?.[`phase${i}_guaranteed_damage`],
          additional_damage: (levelData as any)?.[`phase${i}_additional_damage`],
          damage_values: (levelData as any)?.[`phase${i}_damage_values`],
          percentage_damage_values: (levelData as any)?.[`phase${i}_percentage_damage_values`],
          action_cost: (levelData as any)?.[`phase${i}_action_cost`],
          punti_azione: (levelData as any)?.[`phase${i}_punti_azione`],
          indicative_action_cost: (levelData as any)?.[`phase${i}_indicative_action_cost`],
          punti_azione_indicativi: (levelData as any)?.[`phase${i}_punti_azione_indicativi`],
        });
      }
      return out;
    })();

    const enabled = !!(
      (levelData as any)?.phase_attack_enabled ||
      (item as any)?.phaseAttack ||
      (item as any)?.phase_attack_enabled ||
      phases.length > 0 ||
      (levelData as any)?.phase1_enabled ||
      (levelData as any)?.phase2_enabled ||
      (levelData as any)?.phase3_enabled
    );
    const rawIndex = Number((item as any)?.__phaseAttack?.index ?? -1);
    const index = Number.isFinite(rawIndex) ? rawIndex : -1;
    return { enabled: enabled && phases.length > 0, phases, index, levelData };
  };

  const applyPhaseToItemForDamage = (item: any, phase: any) => {
    if (!item || !phase) return item;
    const levelNum = Number(item?.current_level || item?.level || item?.levels?.[0]?.level || 1) || 1;
    if (Array.isArray(item?.levels)) {
      const levels = item.levels.map((l: any) => (Number(l?.level) === levelNum ? { ...(l || {}), ...(phase || {}) } : l));
      return { ...item, levels };
    }
    return { ...item, ...(phase || {}) };
  };

  const applyPhaseToRollForProcessing = (rollData: any) => {
    try {
      const d: any = rollData?.damage;
      if (!d) return rollData;
      if (d?.source !== 'magic' && d?.source !== 'ability') return rollData;
      const item = d?.source === 'magic' ? d?.spell : d?.ability;
      if (!item) return rollData;
      const phaseInfo = extractPhaseFlowInfo(item);
      if (!phaseInfo.enabled) return rollData;
      if (Number(phaseInfo.index) < 0) return rollData;
      const phaseData = phaseInfo.phases[phaseInfo.index];
      if (!phaseData) return rollData;
      const next = JSON.parse(JSON.stringify(rollData));
      if (d?.source === 'magic') (next.damage as any).spell = applyPhaseToItemForDamage(item, phaseData);
      else (next.damage as any).ability = applyPhaseToItemForDamage(item, phaseData);
      return next;
    } catch {
      return rollData;
    }
  };

  useEffect(() => {
    loadAllCharacters();
  }, [loadAllCharacters]);

  useEffect(() => {
    // Carica evocazioni globali all'avvio
    reloadAllEvocations();
  }, []);

  // Calcola il tiro percentuale quando si apre la modale di successo, se richiesto dalla magia
  useEffect(() => {
    try {
      if (showRollSuccess && pendingRollData?.damage?.source === 'magic') {
        const spell = pendingRollData?.damage?.spell;
        if (spell) {
          const percentEnabled = toBool(spell?.percentageRollEnabled ?? (spell as any)?.percentage_roll_enabled);
          let minPct = 0;
          if (Array.isArray(spell?.levels) && spell?.current_level != null) {
            const lvl = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level)) || spell.levels[0];
            minPct = Number(lvl?.min_success_percentage ?? (lvl as any)?.minSuccessPercentage ?? spell?.min_success_percentage ?? (spell as any)?.minSuccessPercentage ?? 0);
          } else {
            minPct = Number(spell?.min_success_percentage ?? (spell as any)?.minSuccessPercentage ?? 0);
          }
          if ((percentEnabled || minPct > 0) && !percentSuccessRoll) {
            const res = Math.floor(Math.random() * 100) + 1;
            setPercentSuccessRoll({ result: res, min: minPct });
          }
        }
      } else {
        if (percentSuccessRoll) setPercentSuccessRoll(null);
      }
    } catch {}
  }, [showRollSuccess, pendingRollData, percentSuccessRoll]);

  useEffect(() => {
    try {
      if (showRollSuccess && pendingRollData?.damage?.source === 'magic' && pendingLottery && pendingLottery.numericChoices > 0 && pendingLottery.diceFaces > 0) {
        const rolls = Array.from({ length: pendingLottery.numericChoices }).map(() => Math.floor(Math.random() * Math.max(1, pendingLottery.diceFaces)) + 1);
        const choiceSet = new Set((pendingLottery.userChoices || []).filter((v) => typeof v === 'number' && v > 0));
        const items = rolls.map((roll) => ({ roll, correct: choiceSet.has(roll) }));
        const choices = (pendingLottery.userChoices || []).filter((v) => typeof v === 'number' && v > 0);
        setLotteryPreview({ diceFaces: pendingLottery.diceFaces, items, choices });
        try {
          const correctCount = items.filter(it => it.correct).length;
          const rollValues = items.map(it => it.roll);
          const wrongCount = choices.filter(v => v > 0 && !new Set(rollValues).has(v)).length;
          const targetId = pendingActionEntryId || (newHistoryEntries && newHistoryEntries.length > 0 ? newHistoryEntries[0].id : null);
          if (targetId) updateEntryLotteryInfo(targetId, { rolls: rollValues, correctCount, wrongCount });
        } catch {}
      } else {
        setLotteryPreview(null);
      }
    } catch {}
  }, [showRollSuccess, pendingRollData, pendingLottery, newHistoryEntries, pendingActionEntryId, updateEntryLotteryInfo]);

  useEffect(() => {
    const loadEvocations = async () => {
      if (!selectedCharacter?.id) {
        setEvocationInstances([]);
        return;
      }
      setLoadingEvocations(true);
      try {
        const rows = await listEvocationInstancesByCharacter(selectedCharacter.id);
        setEvocationInstances(rows);
      } catch (e) {
        setEvocationInstances([]);
      } finally {
        setLoadingEvocations(false);
      }
    };
    loadEvocations();
  }, [selectedCharacter?.id]);

  // Inizializza coda multi‑attacchi quando si apre la conferma
  useEffect(() => {
    if (showRollSuccess && pendingRollData?.damage) {
      try {
        const d: any = pendingRollData.damage;
        const shots = Number(d?.triggers?.multipleShots?.selectedShots || 0);
        const isMagic = d?.source === 'magic';
        if (isMagic && shots > 0) {
          setMultiShotItems(Array.from({ length: shots }, (_, i) => i + 1));
          setActionSuccessResolved(false);
          setDefaultCritical(false);
          setCriticalExtraValueGlobal(0);
          setCriticalExtraPerShot({});
          setShotCriticalPending(null);
          setMultiShotRollRecaps({});
          // Prepara la mappa: Attacco #1 confermabile subito, dal #2 in poi mostra icona dado
          const started: Record<number, boolean> = {};
          for (let i = 1; i <= shots; i++) {
            started[i] = i === 1; // il primo attacco ha già conferma immediata
          }
          setMultiShotRollStarted(started);
        } else {
          setMultiShotItems([]);
          setActionSuccessResolved(false);
          setDefaultCritical(false);
          setCriticalExtraValueGlobal(0);
          setCriticalExtraPerShot({});
          setShotCriticalPending(null);
          setMultiShotRollStarted({});
          setMultiShotRollRecaps({});
        }
      } catch {
        setMultiShotItems([]);
        setActionSuccessResolved(false);
        setDefaultCritical(false);
        setCriticalExtraValueGlobal(0);
        setCriticalExtraPerShot({});
        setShotCriticalPending(null);
        setMultiShotRollStarted({});
        setMultiShotRollRecaps({});
      }
    } else {
      // Reset quando si chiude
      setMultiShotItems([]);
      setActionSuccessResolved(false);
      setDefaultCritical(false);
      setCriticalExtraValueGlobal(0);
      setCriticalExtraPerShot({});
      setShotCriticalPending(null);
      setMultiShotRollStarted({});
      setActionRollRecap(null);
      setMultiShotRollRecaps({});
    }
  }, [showRollSuccess, pendingRollData?.damage]);

  const applyActionDurationScalingDashboard = async (isSuccess: boolean) => {
    try {
      const actor = (pendingActorForRoll?.character ?? selectedCharacter) as any;
      const actorId = String(actor?.id || '').trim();
      if (!actorId) return;

      const targetsRaw = (() => {
        try {
          const list = Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : [];
          const single =
            pendingRollData?.target && pendingRollData?.target?.type && pendingRollData?.target?.type !== 'none'
              ? [pendingRollData.target]
              : [];
          return list.length > 0 ? list : single;
        } catch {
          return [];
        }
      })();

      const targetCharacterIds = (Array.isArray(targetsRaw) ? targetsRaw : [])
        .filter((t: any) => t && t.type === 'characters' && String(t?.id || '').trim())
        .map((t: any) => String(t.id));

      const updateCharacterAnomalies = async (characterId: string, actionType: 'executed' | 'submitted') => {
        const character = (Array.isArray(characters) ? characters : []).find((c: any) => String(c?.id) === String(characterId));
        if (!character) return;

        const anomalies = Array.isArray((character as any)?.anomalies) ? ((character as any).anomalies as any[]) : [];
        if (anomalies.length === 0) return;

        let changed = false;
        const nextAnomalies: any[] = [];

        for (const anomaly of anomalies) {
          if (!anomaly) continue;

          const alwaysActive = !!((anomaly as any)?.alwaysActive ?? (anomaly as any)?.always_active);
          if (alwaysActive) {
            nextAnomalies.push(anomaly);
            continue;
          }

          const mode = String(
            (anomaly as any)?.actionDurationMode ??
              (anomaly as any)?.action_duration_mode ??
              (anomaly as any)?.durationMode ??
              (anomaly as any)?.duration_mode ??
              (anomaly as any)?.stats?.action_duration_mode ??
              (anomaly as any)?.stats?.duration_mode ??
              'turns',
          );
          if (mode !== 'actions') {
            nextAnomalies.push(anomaly);
            continue;
          }

          const typRaw = String(
            (anomaly as any)?.actionDurationType ??
              (anomaly as any)?.action_duration_type ??
              (anomaly as any)?.actionsDurationType ??
              (anomaly as any)?.actions_duration_type ??
              (anomaly as any)?.stats?.action_duration_type ??
              (anomaly as any)?.stats?.actions_duration_type ??
              '',
          );
          const typ =
            typRaw === 'performed' ? 'executed'
              : typRaw === 'received' ? 'submitted'
                : typRaw;
          if (typ !== actionType) {
            nextAnomalies.push(anomaly);
            continue;
          }

          const decrementOnFailure = !!((anomaly as any)?.decrementOnFailure ?? (anomaly as any)?.decrement_on_failure);
          const turnsRaw = (anomaly as any)?.turns;
          const turns = typeof turnsRaw === 'number' ? turnsRaw : Number(turnsRaw ?? 0);
          if (!Number.isFinite(turns) || turns <= 0) {
            changed = true;
            continue;
          }

          if (!isSuccess && !decrementOnFailure) {
            nextAnomalies.push(anomaly);
            continue;
          }

          const nextTurns = turns - 1;
          if (nextTurns > 0) {
            nextAnomalies.push({ ...(anomaly as any), turns: nextTurns });
          }
          changed = true;
        }

        if (!changed) return;
        const updatedCharacter = { ...(character as any), anomalies: nextAnomalies } as any;
        const ok = await updateCharacter(updatedCharacter);
        if (ok && selectedCharacter && String((selectedCharacter as any)?.id) === String(characterId)) {
          setSelectedCharacter(updatedCharacter);
        }
      };

      await updateCharacterAnomalies(actorId, 'executed');
      for (const id of targetCharacterIds) {
        if (String(id) === String(actorId)) continue;
        await updateCharacterAnomalies(id, 'submitted');
      }
    } catch {}
  };

  // Gestori conferma azione (No / Sì / Critico)
  const handleActionFailure = async () => {
    await applyActionDurationScalingDashboard(false);
    try {
      const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
      if (pendingRollData && characterForRoll) {
        await applyCustomSpecificsFromRoll(pendingRollData, characterForRoll, 'consume');
      }
    } catch {}
    try {
      if (lotteryPreview && pendingActionEntryId) {
        const correctCount = lotteryPreview.items.filter(it => it.correct).length;
        const rollSet = new Set(lotteryPreview.items.map(it => it.roll));
        const wrongCount = (lotteryPreview.choices || []).filter(v => v > 0 && !rollSet.has(v)).length;
        updateEntryLotteryInfo(pendingActionEntryId, { rolls: lotteryPreview.items.map(it => it.roll), correctCount, wrongCount });
      }
    } catch {}
    try {
      const d: any = pendingRollData?.damage || null;
      const src: string = String(d?.source || '');
      if (selectedCharacter && (src === 'magic' || src === 'ability')) {
        let levelData: any = {};
        if (src === 'magic') {
          const spell = d?.spell;
          if (spell) {
            try {
              if (Array.isArray(spell?.levels) && spell?.current_level != null) {
                levelData = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level)) || {};
              } else {
                levelData = spell || {};
              }
            } catch {}
          }
        } else if (src === 'ability') {
          const ability = d?.ability;
          if (ability) {
            try {
              if (Array.isArray(ability?.levels) && ability?.current_level != null) {
                levelData = ability.levels.find((l: any) => String(l?.level) === String(ability.current_level)) || {};
              } else {
                levelData = ability || {};
              }
            } catch {}
          }
        }
        const failEnabled = Boolean(levelData?.failure_enabled);
        if (failEnabled) {
          const selfSets: any[] = Array.isArray(levelData?.failure_damage_sets) ? levelData.failure_damage_sets : [];
          if (selfSets.length > 0) {
            const res = await applySelfDamageSetsFromLevel(selfSets, String((src === 'magic' ? d?.spell?.name : d?.ability?.name) || 'Fallimento'), true);
            try {
              const total = Number((res as any)?.totalApplied || 0) || 0;
              const msg = `${selectedCharacter.name} fallisce e subisce ${total}!`;
              const damageSources = Array.isArray((res as any)?.sources) ? (res as any).sources.map((r: any) => ({ label: r?.eff || 'Effetto', value: Number(r?.val || 0) })) : [];
              addCustomEntry({ message: msg, characterId: selectedCharacter?.id, characterName: selectedCharacter?.name || '', result: total, entryType: 'damage', damageSources });
            } catch {}
          }
          try {
            const probRaw = Number(levelData?.failure_anomaly_probability ?? 100) || 100;
            const threshold = Math.max(1, 100 - probRaw + 1);
            const roll = Math.floor(Math.random() * 100) + 1;
            const shouldApply = probRaw >= 100 ? true : (roll >= threshold);
            if (shouldApply) {
              const doesDmg = Boolean(levelData?.failure_anomaly_does_damage);
              const perTurn = Number(levelData?.failure_anomaly_damage_per_turn ?? 0) || 0;
              const effId = String(levelData?.failure_anomaly_damage_effect_id || '').trim() || null;
              const effName = String(levelData?.failure_anomaly_damage_effect_name || '').trim() || '';
              const statsModRaw = levelData?.failure_anomaly_stats_modifier || {};
              const statsMod = {
                anima: Number(statsModRaw?.anima ?? 0) || 0,
                forza: Number(statsModRaw?.forza ?? 0) || 0,
                agilita: Number(statsModRaw?.agilita ?? 0) || 0,
                sapienza: Number(statsModRaw?.sapienza ?? 0) || 0,
                intelletto: Number(statsModRaw?.intelletto ?? 0) || 0,
                percezione: Number(statsModRaw?.percezione ?? 0) || 0,
                resistenza: Number(statsModRaw?.resistenza ?? 0) || 0,
              } as any;
              let effectIdToUse = effId;
              if (!effectIdToUse && effName) {
                try {
                  const { data } = await supabase
                    .from('damage_effects')
                    .select('id')
                    .eq('name', effName)
                    .limit(1);
                  effectIdToUse = String(data?.[0]?.id || '').trim() || null;
                } catch {}
              }
              const ds = (doesDmg && perTurn > 0 && effectIdToUse) ? [{ damageEffectId: String(effectIdToUse), guaranteedDamage: perTurn, additionalDamage: 0 }] : [];
              const immunityState = getCharacterImmunityState(selectedCharacter);
              const anomalyName = String(levelData?.failure_anomaly_name ?? 'Anomalia').trim();
              if (isImmuneToAnomaly(immunityState, { name: anomalyName })) return;
              const a: StatusAnomaly = {
                id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `anom_${Date.now()}`,
                name: anomalyName,
                description: String(levelData?.failure_anomaly_description ?? '').trim(),
                statsModifier: statsMod,
                actionPointsModifier: Number(levelData?.failure_anomaly_action_points_modifier ?? 0) || 0,
                healthModifier: Number(levelData?.failure_anomaly_health_modifier ?? 0) || 0,
                turns: Number(levelData?.failure_anomaly_turns ?? 0) || undefined,
                sourceType: src === 'magic' ? 'spell' : 'ability',
                sourceId: String((src === 'magic' ? d?.spell?.id : d?.ability?.id) ?? (src === 'magic' ? d?.spell?.name : d?.ability?.name) ?? ''),
                damageSets: ds,
              } as StatusAnomaly;
              await addAnomaly(a);
            }
          } catch {}
        }
      }
    } catch {}
    if (pendingActionEntryId) updateEntryBadge(pendingActionEntryId, 'Non riuscito');
    setPendingRollData(null);
    setPendingActorForRoll(null);
    setPendingActionEntryId(null);
    setShowRollSuccess(false);
    setCriticalExtraValueGlobal(0);
    setCriticalExtraPerShot({});
    setShotCriticalPending(null);
    setPendingLottery(null);
    setLotteryPreview(null);
  };

  const handlePostureChangeDashboard = async (value: string) => {
    try {
      if (!selectedCharacter) return;
      let newPosture: any = null;
      if (value !== 'none') {
        newPosture = selectedCharacter?.custom_abilities?.find((ability: any) =>
          ability.id === value && (ability.category === 'Posture' || ability.category === 'Tecnico' || ability.subcategory === 'Posture')
        );
      }
      const updatedAbilities = (selectedCharacter.custom_abilities || []).map((ability: any) => {
        if (ability.category === 'Posture' || ability.category === 'Tecnico' || ability.subcategory === 'Posture') {
          return { ...ability, is_active: value !== 'none' && ability.id === value };
        }
        return ability;
      });
      const updatedCharacter = { ...selectedCharacter, custom_abilities: updatedAbilities, selectedPostureId: value === 'none' ? null : value } as typeof selectedCharacter;
      const ok = await updateCharacter(updatedCharacter);
      if (ok) {
        setSelectedCharacter(updatedCharacter);
        toast({ title: 'Postura salvata', description: newPosture ? `Postura "${newPosture.name}" attivata` : 'Postura rimossa', duration: 2000 });
      } else {
        toast({ title: 'Errore', description: 'Impossibile salvare la postura', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[DiceDashboard] Errore nel salvataggio della postura:', error);
      toast({ title: 'Errore', description: 'Impossibile salvare la postura', variant: 'destructive' });
    }
  };

  const handlePostureDecisionDashboard = async (breaks: boolean) => {
    try {
      if (!selectedCharacter) {
        setPendingSelectedPostureId(null);
        setPendingSelectedPostureName('');
        return;
      }
      if (breaks) {
        await handlePostureChangeDashboard('none');
      } else if (pendingSelectedPostureId) {
        await handlePostureChangeDashboard(String(pendingSelectedPostureId));
      }
    } catch {}
    finally {
      setPendingSelectedPostureId(null);
      setPendingSelectedPostureName('');
    }
  };

  const parseDirectBonus = (bonus: string[]) => {
    const mods = { heal: false, pctHealth: 0, pctArmor: 0, pctAP: 0, pctGeneric: 0 } as any;
    for (const raw of (bonus || [])) {
      const s = String(raw || '').toLowerCase().trim();
      if (s.includes('ripristina')) {
        mods.heal = true;
        continue;
      }
      const m = s.match(/([+-]?\d+)\s*%/);
      if (!m) continue;
      const val = Number(m[1] || 0);
      if (s.includes('salute') || s.includes('hp')) mods.pctHealth += val;
      else if (s.includes('armatura') || s.includes('armor') || s.includes('armour')) mods.pctArmor += val;
      else if (s.includes('pa') || s.includes('azione') || s.includes('punti azione') || s.includes('action')) mods.pctAP += val;
      else mods.pctGeneric += val;
    }
    return mods;
  };

  const formatBonusNotes = (bonus: string[], attr: 'classic' | 'health' | 'armor' | 'ap') => {
    try {
      const arr = (bonus || []).map((b) => String(b || '').trim()).filter(Boolean);
      const rel = arr.filter((b) => {
        const s = b.toLowerCase();
        if (attr === 'armor') return s.includes('armatura') || s.includes('armor') || s.includes('armour');
        if (attr === 'health') return s.includes('salute') || s.includes('hp');
        if (attr === 'ap') return s.includes('pa') || s.includes('azione') || s.includes('punti azione') || s.includes('action');
        return true;
      });
      const show = rel.length > 0 ? rel : arr;
      return show.length > 0 ? `Bonus: ${show.join(', ')}` : undefined;
    } catch { return undefined; }
  };

  const normalizeTextKey = (v: any) => String(v ?? '').trim().toLowerCase();

  const addImmunityKey = (set: Set<string>, id?: string, name?: string) => {
    const idNorm = normalizeTextKey(id);
    const nameNorm = normalizeTextKey(name);
    if (idNorm) set.add(idNorm);
    if (nameNorm) set.add(nameNorm);
  };

  const appendImmunityList = (set: Set<string>, raw: any) => {
    const list = Array.isArray(raw) ? raw : [];
    list.forEach((item) => {
      if (typeof item === 'string') addImmunityKey(set, undefined, item);
      else if (item) addImmunityKey(set, item.id, item.name);
    });
  };

  const getCharacterImmunityState = (character: any) => {
    const state = { total: false, anomalies: new Set<string>(), effects: new Set<string>() };
    const spells = Array.isArray(character?.custom_spells) ? character.custom_spells : [];
    const abilities = Array.isArray(character?.custom_abilities) ? character.custom_abilities : [];
    const anomalies = Array.isArray(character?.anomalies) ? character.anomalies : [];
    const normalizeType = (v: any) => String(v ?? '').trim().toLowerCase();
    const resolveLevel = (item: any) => {
      const levelNum = Number(item?.current_level ?? item?.currentLevel ?? item?.level ?? 1) || 1;
      const levels = Array.isArray(item?.levels) ? item.levels : [];
      return levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || item || {};
    };
    const isPassiveAlwaysActive = (item: any) => {
      const t = normalizeType(item?.type ?? item?.spell_type ?? item?.ability_type);
      if (t !== 'passiva') return false;
      const lvl = resolveLevel(item);
      const passive = Array.isArray((lvl as any)?.passive_anomalies) ? (lvl as any).passive_anomalies : [];
      return passive.some((a: any) => !!(a?.alwaysActive ?? a?.always_active));
    };
    [...spells, ...abilities].forEach((s: any) => {
      if (!isPassiveAlwaysActive(s)) return;
      if ((s?.immunity_total ?? s?.immunityTotal) === true) state.total = true;
      appendImmunityList(state.anomalies, s?.immunity_anomalies ?? s?.immunityAnomalies);
      appendImmunityList(state.effects, s?.immunity_damage_effects ?? s?.immunityDamageEffects);
    });
    anomalies.forEach((a: any) => {
      const stats = a?.stats || {};
      if ((a?.immunityTotal ?? a?.immunity_total ?? stats?.immunity_total) === true) state.total = true;
      appendImmunityList(state.anomalies, a?.immunityAnomalies ?? a?.immunity_anomalies ?? stats?.immunity_anomalies);
      appendImmunityList(state.effects, a?.immunityDamageEffects ?? a?.immunity_damage_effects ?? stats?.immunity_damage_effects);
    });
    return state;
  };

  const isImmuneToDamageEffect = (state: { total: boolean; effects: Set<string> }, incoming: { id?: string; name?: string }) => {
    if (state.total) return true;
    const idNorm = normalizeTextKey(incoming?.id);
    const nameNorm = normalizeTextKey(incoming?.name);
    return (idNorm && state.effects.has(idNorm)) || (nameNorm && state.effects.has(nameNorm));
  };

  const isImmuneToAnomaly = (state: { total: boolean; anomalies: Set<string> }, incoming: { id?: string; name?: string }) => {
    if (state.total) return true;
    const idNorm = normalizeTextKey(incoming?.id);
    const nameNorm = normalizeTextKey(incoming?.name);
    return (idNorm && state.anomalies.has(idNorm)) || (nameNorm && state.anomalies.has(nameNorm));
  };

  const matchesDamageEffect = (def: any, incoming: { id?: string; name?: string }) => {
    const isSpecific = !!(def?.isSpecific ?? def?.is_specific);
    if (!isSpecific) return true;
    const ids: string[] = Array.isArray(def?.damageEffectIds)
      ? def.damageEffectIds.map(String)
      : Array.isArray(def?.damage_effect_ids)
        ? def.damage_effect_ids.map(String)
        : [];
    const names: string[] = Array.isArray(def?.damageEffectNames)
      ? def.damageEffectNames.map(String)
      : Array.isArray(def?.damage_effect_names)
        ? def.damage_effect_names.map(String)
        : [];
    const idNorm = normalizeTextKey(incoming?.id);
    const nameNorm = normalizeTextKey(incoming?.name);
    if (!idNorm && !nameNorm) return false;
    return [...ids, ...names].some((v) => {
      const vNorm = normalizeTextKey(v);
      return (idNorm && vNorm === idNorm) || (nameNorm && vNorm === nameNorm);
    });
  };

  const readEffectValueTotals = (
    anomaliesList: any[],
    kind: 'reduction' | 'weakness',
    incoming: { id?: string; name?: string }
  ) => {
    let classic = 0;
    let percentage = 0;
    for (const a of (anomaliesList || [])) {
      const enabled =
        kind === 'reduction'
          ? ((a as any)?.damageReductionEnabled ??
              (a as any)?.damage_reduction_enabled ??
              (a as any)?.stats?.damageReductionEnabled ??
              (a as any)?.stats?.damage_reduction_enabled)
          : ((a as any)?.weaknessEnabled ??
              (a as any)?.weakness_enabled ??
              (a as any)?.stats?.weaknessEnabled ??
              (a as any)?.stats?.weakness_enabled);
      if (enabled === false) continue;
      const def =
        kind === 'reduction'
          ? ((a as any)?.damageReduction ??
              (a as any)?.damage_reduction ??
              (a as any)?.stats?.damageReduction ??
              (a as any)?.stats?.damage_reduction)
          : ((a as any)?.weakness ??
              (a as any)?.weakness_config ??
              (a as any)?.stats?.weakness ??
              (a as any)?.stats?.weakness_config);
      if (!def) continue;
      if (!matchesDamageEffect(def, incoming)) continue;
      const mode = normalizeTextKey(def?.mode);
      const allowClassic = mode !== 'percentage';
      const allowPercentage = mode !== 'classic';
      if (allowClassic) {
        classic +=
          (Number(def?.classicGuaranteed ?? def?.classic_guaranteed ?? 0) || 0) +
          (Number(def?.classicAdditional ?? def?.classic_additional ?? 0) || 0);
      }
      if (allowPercentage) {
        percentage +=
          (Number(def?.percentageGuaranteed ?? def?.percentage_guaranteed ?? 0) || 0) +
          (Number(def?.percentageAdditional ?? def?.percentage_additional ?? 0) || 0);
      }
    }
    return { classic, percentage };
  };

  const applyReductionAndWeakness = (
    baseAmount: number,
    anomaliesList: any[],
    incoming: { id?: string; name?: string }
  ) => {
    const amt = Math.max(0, Math.floor(Number(baseAmount || 0)));
    if (amt <= 0) return 0;
    const red = readEffectValueTotals(anomaliesList, 'reduction', incoming);
    const weak = readEffectValueTotals(anomaliesList, 'weakness', incoming);
    const weakPct = Math.floor((amt * (Number(weak.percentage) || 0)) / 100);
    const redPct = Math.floor((amt * (Number(red.percentage) || 0)) / 100);
    const out = amt + (Number(weak.classic) || 0) + weakPct - (Number(red.classic) || 0) - redPct;
    return Math.max(0, Math.floor(out));
  };

  const computeResWeakAdjustments = (
    adjAmount: number,
    anomaliesList: any[],
    incoming: { id?: string; name?: string }
  ) => {
    const amt = Math.max(0, Math.floor(Number(adjAmount || 0)));
    if (amt <= 0) {
      return {
        base: 0,
        afterReduction: 0,
        afterWeakness: 0,
        final: 0,
        reductionClassic: 0,
        reductionPercent: 0,
        weaknessClassic: 0,
        weaknessPercent: 0,
      };
    }
    const red = readEffectValueTotals(anomaliesList, 'reduction', incoming);
    const weak = readEffectValueTotals(anomaliesList, 'weakness', incoming);
    const redClassic = Number(red.classic || 0) || 0;
    const redPercent = Number(red.percentage || 0) || 0;
    const weakClassic = Number(weak.classic || 0) || 0;
    const weakPercent = Number(weak.percentage || 0) || 0;
    const redPct = Math.floor((amt * redPercent) / 100);
    const weakPct = Math.floor((amt * weakPercent) / 100);
    const afterReduction = Math.max(0, Math.floor(amt - redClassic - redPct));
    const afterWeakness = Math.max(0, Math.floor(afterReduction + weakClassic + weakPct));
    return {
      base: amt,
      afterReduction,
      afterWeakness,
      final: afterWeakness,
      reductionClassic: redClassic,
      reductionPercent: redPercent,
      weaknessClassic: weakClassic,
      weaknessPercent: weakPercent,
    };
  };

  const applyDirectToEnemy = async (
    enemy: any,
    amount: number,
    attr: 'classic' | 'health' | 'armor' | 'ap',
    bonus: string[],
    damageEffect?: { id?: string; name?: string },
    outMeta?: any,
    opts?: { silent?: boolean }
  ) => {
    const mods = parseDirectBonus(bonus);
    let hp = Number(enemy?.enemy_current_hp ?? enemy?.enemy_max_hp ?? 0);
    const hpMax = Number(enemy?.enemy_max_hp ?? 0);
    let ar = Number(enemy?.enemy_current_armor ?? enemy?.enemy_max_armor ?? 0);
    const arMax = Number(enemy?.enemy_max_armor ?? 0);
    let pa = Number(enemy?.enemy_current_pa ?? enemy?.enemy_max_pa ?? 0);
    const paMax = Number(enemy?.enemy_max_pa ?? 0);

    const multHealth = 1 + (mods.pctHealth / 100);
    const multArmor = 1 + (mods.pctArmor / 100);
    const multAP = 1 + (mods.pctAP / 100);
    const adjAmount = Math.floor(Math.max(0, Number(amount || 0)) * (1 + (Number(mods.pctGeneric || 0) / 100)));
    const stateAnoms = (enemyAnomaliesById || {})?.[String(enemy?.id || '')];
    const storedAnoms =
      (enemy as any)?.enemy_anomalies ??
      (enemy as any)?.enemyAnomalies ??
      (enemy as any)?.anomalies ??
      [];
    const enemyAnoms =
      Array.isArray(stateAnoms) && stateAnoms.length > 0
        ? stateAnoms
        : (Array.isArray(storedAnoms) ? storedAnoms : []);
    const incoming = { id: damageEffect?.id, name: damageEffect?.name };
    const rw = mods.heal ? null : computeResWeakAdjustments(adjAmount, enemyAnoms, incoming);
    const finalAmount = mods.heal ? adjAmount : Number(rw?.final || 0);

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    let appliedTotal = 0;

    if (attr === 'classic') {
      if (!mods.heal) {
        const dmgArmor = Math.floor(finalAmount * multArmor);
        const consumedArmor = Math.min(dmgArmor, ar);
        const rest = Math.max(finalAmount - consumedArmor, 0);
        ar = clamp(ar - dmgArmor, 0, arMax);
        const dmgHealth = Math.floor(rest * multHealth);
        const consumedHealth = Math.min(dmgHealth, hp);
        hp = clamp(hp - consumedHealth, 0, hpMax);
        appliedTotal = consumedArmor + consumedHealth;
      } else {
        const healArmor = Math.floor(finalAmount * multArmor);
        const healHealth = Math.floor(finalAmount * multHealth);
        ar = clamp(ar + healArmor, 0, arMax);
        hp = clamp(hp + healHealth, 0, hpMax);
        appliedTotal = healArmor + healHealth;
      }
    } else if (attr === 'health') {
      const delta = Math.floor(finalAmount * multHealth);
      const consumed = mods.heal ? Math.min(delta, hpMax - hp) : Math.min(delta, hp);
      hp = mods.heal ? clamp(hp + consumed, 0, hpMax) : clamp(hp - consumed, 0, hpMax);
      appliedTotal = consumed;
    } else if (attr === 'armor') {
      const delta = Math.floor(finalAmount * multArmor);
      const consumed = mods.heal ? Math.min(delta, arMax - ar) : Math.min(delta, ar);
      ar = mods.heal ? clamp(ar + consumed, 0, arMax) : clamp(ar - consumed, 0, arMax);
      appliedTotal = consumed;
    } else if (attr === 'ap') {
      const delta = Math.floor(finalAmount * multAP);
      const consumed = mods.heal ? Math.min(delta, paMax - pa) : Math.min(delta, pa);
      pa = mods.heal ? clamp(pa + consumed, 0, paMax) : clamp(pa - consumed, 0, paMax);
      appliedTotal = consumed;
    }

    if (outMeta && !mods.heal) {
      outMeta.base = rw?.base || 0;
      outMeta.afterReduction = rw?.afterReduction || 0;
      outMeta.afterWeakness = rw?.afterWeakness || 0;
      outMeta.reductionClassic = rw?.reductionClassic || 0;
      outMeta.reductionPercent = rw?.reductionPercent || 0;
      outMeta.weaknessClassic = rw?.weaknessClassic || 0;
      outMeta.weaknessPercent = rw?.weaknessPercent || 0;
      outMeta.appliedTotal = appliedTotal;
    }

    try {
      const patch: any = {};
      if (attr === 'classic') {
        patch.enemy_current_hp = hp;
        patch.enemy_current_armor = ar;
      } else if (attr === 'health') {
        patch.enemy_current_hp = hp;
      } else if (attr === 'armor') {
        patch.enemy_current_armor = ar;
      } else if (attr === 'ap') {
        patch.enemy_current_pa = pa;
      }
      const res = await supabase
        .from('enemies')
        .update(patch)
        .eq('id', enemy.id);
      if (res.error) throw res.error;
      setEnemies((prev) =>
        (prev || []).map((e: any) => (String(e?.id) === String(enemy?.id) ? { ...e, ...patch } : e)),
      );
      if (!opts?.silent) {
        toast({ title: 'Danno diretto applicato', description: `${enemy?.name || 'Nemico'} aggiornato` });
      }
    } catch (e) {
      console.error('Errore aggiornamento nemico:', e);
      toast({ title: 'Errore', description: 'Impossibile applicare danno al nemico', variant: 'destructive' });
    }
    return appliedTotal;
  };

  const applyDirectToEvocation = async (evocationId: string, amount: number, attr: 'classic' | 'health' | 'armor' | 'ap', bonus: string[]) => {
    try {
      const pool = (evocationInstances || []).concat(allEvocationInstances || []);
      let ev = pool.find((e: any) => String(e?.id) === String(evocationId));
      if (!ev) {
        try { const { data } = await supabase.from('evocation_instances').select('*').eq('id', String(evocationId)).maybeSingle(); ev = data || null; } catch {}
      }
      if (!ev) return 0;
      const details = { ...(ev?.details || {}) } as any;
      const level = { ...(details?.level_data || details?.level || {}) } as any;
      const mods = parseDirectBonus(bonus);
      const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
      let hp = Number(level?.energy_health ?? level?.health ?? 0);
      let ap = Number(level?.energy_action_points ?? level?.action_points ?? 0);
      let armour = Number(level?.energy_armour ?? level?.armour ?? 0);
      const hpMax = Number(level?.health ?? level?.energy_health ?? hp);
      const apMax = Number(level?.action_points ?? level?.energy_action_points ?? ap);
      const armourMax = Number(level?.armour ?? level?.energy_armour ?? armour);
      const multHealth = 1 + (mods.pctHealth / 100);
      const multArmor = 1 + (mods.pctArmor / 100);
      const multAP = 1 + (mods.pctAP / 100);
      let appliedTotal = 0;
      if (attr === 'classic') {
        if (!mods.heal) {
          const dmgArmor = Math.floor(amount * multArmor);
          const consumedArmor = Math.min(dmgArmor, armour);
          const rest = Math.max(amount - consumedArmor, 0);
          armour = clamp(armour - dmgArmor, 0, armourMax);
          const dmgHealth = Math.floor(rest * multHealth);
          const consumedHealth = Math.min(dmgHealth, hp);
          hp = clamp(hp - consumedHealth, 0, hpMax);
          appliedTotal = consumedArmor + consumedHealth;
        } else {
          const healArmor = Math.floor(amount * multArmor);
          const healHealth = Math.floor(amount * multHealth);
          armour = clamp(armour + healArmor, 0, armourMax);
          hp = clamp(hp + healHealth, 0, hpMax);
          appliedTotal = healArmor + healHealth;
        }
      } else if (attr === 'health') {
        const delta = Math.floor(amount * multHealth);
        const consumed = mods.heal ? Math.min(delta, hpMax - hp) : Math.min(delta, hp);
        hp = mods.heal ? clamp(hp + consumed, 0, hpMax) : clamp(hp - consumed, 0, hpMax);
        appliedTotal = consumed;
      } else if (attr === 'armor') {
        const delta = Math.floor(amount * multArmor);
        const consumed = mods.heal ? Math.min(delta, armourMax - armour) : Math.min(delta, armour);
        armour = mods.heal ? clamp(armour + consumed, 0, armourMax) : clamp(armour - consumed, 0, armourMax);
        appliedTotal = consumed;
      } else if (attr === 'ap') {
        const delta = Math.floor(amount * multAP);
        const consumed = mods.heal ? Math.min(delta, apMax - ap) : Math.min(delta, ap);
        ap = mods.heal ? clamp(ap + consumed, 0, apMax) : clamp(ap - consumed, 0, apMax);
        appliedTotal = consumed;
      }
      const newDetails = { ...details, level_data: { ...level, energy_health: hp, energy_action_points: ap, energy_armour: armour } };
      const res = await supabase
        .from('evocation_instances')
        .update({ details: newDetails })
        .eq('id', String(ev?.id));
      if (res.error) throw res.error;
      try { await reloadAllEvocations(); } catch {}
      return appliedTotal;
    } catch { return 0; }
  };

  const applyDirectToCharacter = async (
    charId: string,
    amount: number,
    attr: 'classic' | 'health' | 'armor' | 'ap',
    bonus: string[],
    damageEffect?: { id?: string; name?: string },
    outMeta?: any
  ) => {
    try {
      const mods = parseDirectBonus(bonus);
      let updated: any = null;
      let targetId = String(charId);
      const full = await loadFullCharacter(targetId);
      if (!full) {
        if (selectedCharacter && String(selectedCharacter.id) === targetId) {
          updated = { ...(selectedCharacter as any) };
        } else {
          toast({ title: 'Errore', description: 'Impossibile caricare il personaggio da aggiornare', variant: 'destructive' });
          return;
        }
      } else {
        updated = { ...(full as any), id: targetId };
      }
      // Massimali robusti: usa i calcoli se disponibili, altrimenti non ridurre mai sotto il valore corrente
      const calcForSelected = (selectedCharacter && String(selectedCharacter.id) === targetId) ? (calculations as any) : null;
      const calcMaxHealth = Number(calcForSelected?.maxHealth ?? 0);
      const calcTotalArmor = Number(calcForSelected?.totalArmor ?? 0);
      const calcMaxAP = Number(calcForSelected?.maxActionPoints ?? 0);
      const equipArmor = Array.isArray(updated.equipment)
        ? updated.equipment.filter((i: any) => !!i?.armor).reduce((sum: number, it: any) => sum + Number(it?.armor ?? 0), 0)
        : 0;
      const hpMax = Math.max(
        Number(updated.health ?? 0),
        Number(updated.currentHealth ?? 0),
        calcMaxHealth
      );
      const arMax = Math.max(
        Number(updated.baseArmor ?? 0) + equipArmor,
        Number(updated.currentArmor ?? 0),
        calcTotalArmor
      );
      const paMax = Math.max(
        Number(updated.actionPoints ?? 0),
        Number(updated.currentActionPoints ?? 0),
        calcMaxAP
      );
      let hp = Number(updated.currentHealth ?? updated.health ?? 0);
      let ar = Number(updated.currentArmor ?? updated.baseArmor ?? 0);
      let pa = Number(updated.currentActionPoints ?? updated.actionPoints ?? 0);

      const multHealth = 1 + (mods.pctHealth / 100);
      const multArmor = 1 + (mods.pctArmor / 100);
      const multAP = 1 + (mods.pctAP / 100);
      const adjAmount = Math.floor(Math.max(0, Number(amount || 0)) * (1 + (Number(mods.pctGeneric || 0) / 100)));
      const chAnoms =
        (selectedCharacter && String(selectedCharacter.id) === targetId && Array.isArray((selectedCharacter as any)?.anomalies))
          ? (selectedCharacter as any).anomalies
          : (Array.isArray((updated as any)?.anomalies) ? (updated as any).anomalies : []);
      const incoming = { id: damageEffect?.id, name: damageEffect?.name };
      const rw = mods.heal ? null : computeResWeakAdjustments(adjAmount, chAnoms, incoming);
      const finalAmount = mods.heal ? adjAmount : Number(rw?.final || 0);
      const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
      let appliedTotal = 0;

      if (attr === 'classic') {
        if (!mods.heal) {
          const dmgArmor = Math.floor(finalAmount * multArmor);
          const consumedArmor = Math.min(dmgArmor, ar);
          const rest = Math.max(finalAmount - consumedArmor, 0);
          ar = clamp(ar - dmgArmor, 0, arMax);
          const dmgHealth = Math.floor(rest * multHealth);
          const consumedHealth = Math.min(dmgHealth, hp);
          hp = clamp(hp - consumedHealth, 0, hpMax);
          appliedTotal = consumedArmor + consumedHealth;
        } else {
          const healArmor = Math.floor(finalAmount * multArmor);
          const healHealth = Math.floor(finalAmount * multHealth);
          ar = clamp(ar + healArmor, 0, arMax);
          hp = clamp(hp + healHealth, 0, hpMax);
          appliedTotal = healArmor + healHealth;
        }
      } else if (attr === 'health') {
        const delta = Math.floor(finalAmount * multHealth);
        const consumed = mods.heal ? Math.min(delta, hpMax - hp) : Math.min(delta, hp);
        hp = mods.heal ? clamp(hp + consumed, 0, hpMax) : clamp(hp - consumed, 0, hpMax);
        appliedTotal = consumed;
      } else if (attr === 'armor') {
        const delta = Math.floor(finalAmount * multArmor);
        const consumed = mods.heal ? Math.min(delta, arMax - ar) : Math.min(delta, ar);
        ar = mods.heal ? clamp(ar + consumed, 0, arMax) : clamp(ar - consumed, 0, arMax);
        appliedTotal = consumed;
      } else if (attr === 'ap') {
        const delta = Math.floor(finalAmount * multAP);
        const consumed = mods.heal ? Math.min(delta, paMax - pa) : Math.min(delta, pa);
        pa = mods.heal ? clamp(pa + consumed, 0, paMax) : clamp(pa - consumed, 0, paMax);
        appliedTotal = consumed;
      }

      updated.currentHealth = hp;
      updated.currentArmor = ar;
      updated.currentActionPoints = pa;

      if (outMeta && !mods.heal) {
        outMeta.base = rw?.base || 0;
        outMeta.afterReduction = rw?.afterReduction || 0;
        outMeta.afterWeakness = rw?.afterWeakness || 0;
        outMeta.reductionClassic = rw?.reductionClassic || 0;
        outMeta.reductionPercent = rw?.reductionPercent || 0;
        outMeta.weaknessClassic = rw?.weaknessClassic || 0;
        outMeta.weaknessPercent = rw?.weaknessPercent || 0;
        outMeta.appliedTotal = appliedTotal;
      }

      if (selectedCharacter && String(selectedCharacter.id) === targetId) {
        const ok = await updateCharacter(updated);
        if (!ok) throw new Error('Update character failed');
        setSelectedCharacter(updated);
        setCurrentHealth(hp);
        setCurrentActionPoints(pa);
        setCurrentArmor(ar);
      } else {
        const res = await supabase
          .from('characters')
          .update({ data: updated })
          .eq('id', targetId);
        if (res.error) throw res.error;
        await loadAllCharacters();
      }
      toast({ title: 'Danno diretto applicato', description: `${updated?.name || 'Personaggio'} aggiornato` });
      return appliedTotal;
    } catch (e) {
      console.error('Errore aggiornamento personaggio:', e);
      toast({ title: 'Errore', description: 'Impossibile applicare danno al personaggio', variant: 'destructive' });
      return 0;
    }
  };

  const formatClassicAndPercent = (classic: number, pct: number) => {
    const c = Math.floor(Number(classic || 0));
    const p = Math.floor(Number(pct || 0));
    if (c && p) return `${c} + ${p}%`;
    if (c) return `${c}`;
    if (p) return `${p}%`;
    return '';
  };

  const appendTargetResWeakToHistoryIfNeeded = async (
    rollData: any,
    entry: any,
  ) => {
    try {
      const directEnabled = !!(rollData?.damage?.directApply?.enabled);
      if (directEnabled) return;
      const entryId = String(entry?.id || '').trim();
      if (!entryId) return;
      const baseSources = Array.isArray(entry?.damageSources) ? entry.damageSources : [];
      const targets = Array.isArray(rollData?.targets) ? rollData.targets : (rollData?.target ? [rollData.target] : []);
      if (!targets || targets.length === 0) return;

      const pullEffectNameFromLabel = (label: string): string | undefined => {
        const parts = String(label || '').split('•').map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) return undefined;
        const candidate = parts[1].replace(/\([^)]*\)\s*$/i, '').trim();
        return candidate ? candidate : undefined;
      };

      const extractEffectName = (label: string): string | undefined => {
        const raw = String(label || '').trim();
        if (!raw) return undefined;
        if (/^(resistenza:|debolezza:)/i.test(raw)) return undefined;
        if (
          raw.startsWith('Danno arma') ||
          raw.startsWith('Assicurato') ||
          raw.startsWith('Aggiuntivo') ||
          raw.startsWith('Bonus anomalia') ||
          raw.startsWith('Danno crescente') ||
          /^bonus\b/i.test(raw)
        ) {
          return pullEffectNameFromLabel(raw);
        }
        if (raw.toLowerCase() === 'anima') return undefined;
        if (raw.startsWith('Competenze')) return undefined;
        if (raw.startsWith('Bonus Contrattacco')) return undefined;
        if (raw.startsWith('Bonus Assassinio')) return undefined;
        return undefined;
      };

      const extraHistorySources: Array<{ label: string; value: number; pure?: boolean; detail?: string }> = [];
      const aggByTargetAndEffect = new Map<string, {
        targetName: string;
        effectName: string;
        reductionClassic: number;
        reductionPercent: number;
        weaknessClassic: number;
        weaknessPercent: number;
        base: number;
        afterReduction: number;
        afterWeakness: number;
        final: number;
      }>();

      for (const t of targets) {
        const type = String(t?.type || '').toLowerCase();
        const id = String(t?.id || '');
        const targetName = String(t?.name || '').trim() || String((type === 'enemies' ? 'Nemico' : 'Personaggio'));
        let anomaliesList: any[] = [];
        if (type === 'enemies') {
          anomaliesList = (enemyAnomaliesById || {})[id] || [];
        } else if (type === 'characters') {
          const local = (characters || []).find((c: any) => String(c?.id || '') === id);
          if (Array.isArray((local as any)?.anomalies)) anomaliesList = (local as any).anomalies;
          if (!Array.isArray(anomaliesList) || anomaliesList.length === 0) {
            const full = await loadFullCharacter(id);
            if (full && Array.isArray((full as any)?.anomalies)) anomaliesList = (full as any).anomalies;
          }
        } else {
          continue;
        }
        if (!Array.isArray(anomaliesList) || anomaliesList.length === 0) continue;

        for (const src of baseSources) {
          const rawLabel = String((src as any)?.label || '').trim();
          if (!rawLabel || /^(resistenza:|debolezza:)/i.test(rawLabel)) continue;
          const value = Math.max(0, Math.floor(Number((src as any)?.value || 0)));
          if (!value) continue;
          const effName = extractEffectName(rawLabel) || 'Generico';
          const rw = computeResWeakAdjustments(value, anomaliesList, { name: effName === 'Generico' ? undefined : effName });
          if (
            !(rw?.reductionClassic || rw?.reductionPercent || rw?.weaknessClassic || rw?.weaknessPercent)
          ) continue;
          const key = `${targetName}||${effName}`;
          const prev = aggByTargetAndEffect.get(key) || {
            targetName,
            effectName: effName,
            reductionClassic: 0,
            reductionPercent: 0,
            weaknessClassic: 0,
            weaknessPercent: 0,
            base: 0,
            afterReduction: 0,
            afterWeakness: 0,
            final: 0,
          };
          prev.reductionClassic += Number(rw?.reductionClassic || 0) || 0;
          prev.reductionPercent = Math.max(prev.reductionPercent, Number(rw?.reductionPercent || 0) || 0);
          prev.weaknessClassic += Number(rw?.weaknessClassic || 0) || 0;
          prev.weaknessPercent = Math.max(prev.weaknessPercent, Number(rw?.weaknessPercent || 0) || 0);
          prev.base += Number(rw?.base || 0) || 0;
          prev.afterReduction += Number(rw?.afterReduction || 0) || 0;
          prev.afterWeakness += Number(rw?.afterWeakness || 0) || 0;
          prev.final += Number(rw?.final || 0) || 0;
          aggByTargetAndEffect.set(key, prev);
        }
      }

      if (aggByTargetAndEffect.size > 0) {
        const rows = Array.from(aggByTargetAndEffect.values());
        for (const r of rows) {
          const targetPart = r.targetName ? `${r.targetName}` : '';
          const effectPart = r.effectName ? ` • ${r.effectName}` : '';
          if (r.reductionClassic || r.reductionPercent) {
            const val = formatClassicAndPercent(r.reductionClassic, r.reductionPercent);
            extraHistorySources.push({
              label: `Resistenza: ${val}`,
              value: 0,
              pure: true,
              detail: `${targetPart}${effectPart} • Danno post detrazione: ${Math.max(0, Math.floor(r.afterReduction))} • Danno effettivo: ${Math.max(0, Math.floor(r.final))}`,
            });
          }
          if (r.weaknessClassic || r.weaknessPercent) {
            const val = formatClassicAndPercent(r.weaknessClassic, r.weaknessPercent);
            extraHistorySources.push({
              label: `Debolezza: ${val}`,
              value: 0,
              pure: true,
              detail: `${targetPart}${effectPart} • Danno post aumento: ${Math.max(0, Math.floor(r.afterWeakness))} • Danno effettivo: ${Math.max(0, Math.floor(r.final))}`,
            });
          }
        }
      }

      if (extraHistorySources.length > 0) {
        appendEntryDamageSources(entryId, extraHistorySources, baseSources);
      }
    } catch {}
  };

  const pickDirectAttr = (effects: any[]): 'classic' | 'health' | 'armor' | 'ap' => {
    try {
      if ((effects || []).some(e => e?.affects_classic_damage)) return 'classic';
      if ((effects || []).some(e => e?.affects_health)) return 'health';
      if ((effects || []).some(e => e?.affects_armor)) return 'armor';
      if ((effects || []).some(e => e?.affects_action_points)) return 'ap';
      return 'classic';
    } catch { return 'classic'; }
  };

  const applyDirectDamageFromRoll = async (
    rollData: any,
    totalDamage: number,
    historyEntryId?: string,
    historyBaseSourcesFallback?: { label: string; value: number; pure?: boolean; detail?: string }[]
  ) => {
    try {
      const da = rollData?.damage?.directApply;
      if (!da?.enabled) return;
      const bonus = ([] as string[]).concat(...(da.effects || []).map((e: any) => Array.isArray(e?.bonus_effects) ? e.bonus_effects : [])).filter(Boolean);
      const targets = Array.isArray(rollData?.targets) ? rollData.targets : (rollData?.target ? [rollData.target] : []);
      if (!targets || targets.length === 0) return;

      const effectContribs: Array<{ name: string; amount: number }> = [];
      const effectContribMap = new Map<string, number>();
      const addEffectContrib = (name: any, amount: any) => {
        const n = String(name || '').trim();
        const a = Math.max(0, Number(amount || 0));
        if (!n || !a) return;
        effectContribMap.set(n, (effectContribMap.get(n) || 0) + a);
      };
      const pullEffectNameFromLabel = (label: string): string | null => {
        const parts = label.split('•').map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) return null;
        const candidate = parts[1].replace(/\([^)]*\)\s*$/i, '').trim();
        return candidate ? candidate : null;
      };
      const tryFillContribsFromHistory = () => {
        const sources = Array.isArray(historyBaseSourcesFallback) ? historyBaseSourcesFallback : [];
        for (const src of sources) {
          const label = String((src as any)?.label || '').trim();
          if (!label) continue;
          if (/^(resistenza:|debolezza:)/i.test(label)) continue;
          const value = Math.max(0, Number((src as any)?.value || 0));
          if (!value) continue;
          let name: string | null = null;
          if (label.startsWith('Danno arma')) name = pullEffectNameFromLabel(label);
          else if (label.startsWith('Assicurato')) name = pullEffectNameFromLabel(label);
          else if (label.startsWith('Aggiuntivo')) name = pullEffectNameFromLabel(label);
          else if (label.startsWith('Danno crescente')) name = pullEffectNameFromLabel(label);
          else if (/^bonus\b/i.test(label)) name = pullEffectNameFromLabel(label);
          if (name) addEffectContrib(name, value);
        }
        return effectContribMap.size > 0;
      };
      try {
        const ok = tryFillContribsFromHistory();
        if (!ok) {
          const src = String(rollData?.damage?.source || '').toLowerCase();
          if (src === 'equipment') {
            const weapon = (rollData as any)?.damage?.weapon;
            const dmgType = (rollData as any)?.damage?.damageType || 'veloce';
            const sets: any[] = Array.isArray((weapon as any)?.data?.damage_sets)
              ? (weapon as any).data.damage_sets
              : (Array.isArray((weapon as any)?.damage_sets) ? (weapon as any).damage_sets : []);
            const calcKey = dmgType === 'veloce' ? 'calculated_damage_veloce'
              : dmgType === 'pesante' ? 'calculated_damage_pesante'
              : 'calculated_damage_affondo';
            for (const s of (sets || [])) {
              const v = Number((s as any)?.[calcKey] || 0) || 0;
              addEffectContrib((s as any)?.effect_name || 'Generico', v);
            }
            const arrow = (rollData as any)?.damage?.arrow;
            const aSets: any[] = Array.isArray((arrow as any)?.damage_sets) ? (arrow as any).damage_sets : [];
            for (const s of (aSets || [])) {
              const g = Number((s as any)?.guaranteed_damage || 0) || 0;
              addEffectContrib((s as any)?.effect_name || 'Generico', g);
            }
          } else if (src === 'magic' || src === 'ability') {
            const item = src === 'magic' ? (rollData as any)?.damage?.spell : (rollData as any)?.damage?.ability;
            const lvl = Array.isArray((item as any)?.levels) ? (item as any).levels.find((l: any) => Number(l?.level || 0) === Number((item as any)?.current_level || 1)) || (item as any).levels?.[0] : (item as any);
            const dvs: any[] = Array.isArray((lvl as any)?.damage_values) ? (lvl as any).damage_values : [];
            const triggers = (rollData as any)?.damage?.triggers || {};
            const copies = Math.max(1, Number((triggers as any)?.damagePerSecond?.selectedSeconds || 1))
              * Math.max(1, Number((triggers as any)?.multipleShots?.selectedShots || 1))
              * 1;
            for (const dv of (dvs || [])) {
              const g = Number((dv as any)?.guaranteed_damage || 0) || 0;
              const val = g * copies;
              addEffectContrib((dv as any)?.typeName || (dv as any)?.name || 'Generico', val);
            }
            const useWD = !!((triggers as any)?.useWeaponDamage?.enabled);
            if (useWD) {
              const weapon = (rollData as any)?.damage?.weaponForDamage;
              const dmgType = (rollData as any)?.damage?.weaponDamageType || 'veloce';
              const sets: any[] = Array.isArray((weapon as any)?.data?.damage_sets)
                ? (weapon as any).data.damage_sets
                : (Array.isArray((weapon as any)?.damage_sets) ? (weapon as any).damage_sets : []);
              const calcKey = dmgType === 'veloce' ? 'calculated_damage_veloce'
                : dmgType === 'pesante' ? 'calculated_damage_pesante'
                : 'calculated_damage_affondo';
              for (const s of (sets || [])) {
                const v = Number((s as any)?.[calcKey] || 0) || 0;
                addEffectContrib((s as any)?.effect_name || 'Generico', v);
              }
              const arrow = (rollData as any)?.damage?.arrowForDamage;
              const aSets: any[] = Array.isArray((arrow as any)?.damage_sets) ? (arrow as any).damage_sets : [];
              for (const s of (aSets || [])) {
                const g = Number((s as any)?.guaranteed_damage || 0) || 0;
                addEffectContrib((s as any)?.effect_name || 'Generico', g);
              }
            }
          }
        }
      } catch {}
      for (const [name, amount] of effectContribMap.entries()) {
        effectContribs.push({ name, amount });
      }

      const names = Array.from(new Set(effectContribs.map((c) => String(c.name || '').trim()).filter(Boolean)));
      let effRows: any[] = [];
      if (names.length > 0) {
        try {
          const { data, error } = await supabase
            .from('damage_effects')
            .select('id, name, affects_action_points, affects_health, affects_armor, affects_classic_damage, bonus_effects')
            .in('name', names);
          if (error) throw error;
          effRows = data || [];
        } catch {}
      }
      const effMap = new Map<string, any>();
      for (const r of (effRows || [])) effMap.set(String(r?.name || '').trim(), r);

      const orderedApplications: Array<{
        attr: 'armor' | 'health' | 'ap' | 'classic';
        amount: number;
        damageEffectId?: string;
        damageEffectName?: string;
      }> = [];
      let pureSum = 0;
      const totalDamageInt = Math.max(0, Math.floor(Number(totalDamage || 0)));
      for (const c of (effectContribs || [])) {
        const eff = effMap.get(String(c.name || '').trim()) || {};
        const flags: Array<'armor' | 'health' | 'ap' | 'classic'> = [];
        if (eff?.affects_armor) flags.push('armor');
        if (eff?.affects_health) flags.push('health');
        if (eff?.affects_action_points) flags.push('ap');
        if (eff?.affects_classic_damage) flags.push('classic');
        if (flags.length === 0) flags.push('classic');
        const remaining = Math.max(0, totalDamageInt - pureSum);
        const amt = Math.min(remaining, Math.max(0, Number(c.amount || 0)));
        const dmgEffectId = String(eff?.id || '').trim() || undefined;
        const dmgEffectName = String(eff?.name || c?.name || '').trim() || undefined;
        pureSum += amt;
        for (const f of flags) {
          if (amt > 0) orderedApplications.push({ attr: f, amount: amt, damageEffectId: dmgEffectId, damageEffectName: dmgEffectName });
        }
      }
      const restClassic = Math.max(0, totalDamageInt - pureSum);
      if (restClassic > 0) orderedApplications.push({ attr: 'classic', amount: restClassic });

      const applyOrder: Array<'armor' | 'health' | 'ap' | 'classic'> = ['armor', 'health', 'ap', 'classic'];
      orderedApplications.sort((a, b) => applyOrder.indexOf(a.attr) - applyOrder.indexOf(b.attr));

      const extraHistorySources: Array<{ label: string; value: number; pure?: boolean; detail?: string }> = [];
      const aggByTargetAndEffect = new Map<string, {
        targetName: string;
        effectName: string;
        reductionClassic: number;
        reductionPercent: number;
        weaknessClassic: number;
        weaknessPercent: number;
        base: number;
        afterReduction: number;
        afterWeakness: number;
        applied: number;
      }>();

      const applyOrderedApplicationsToEnemyAtomically = async (
        enemy: any,
        targetName: string,
        applications: Array<{
          attr: 'armor' | 'health' | 'ap' | 'classic';
          amount: number;
          damageEffectId?: string;
          damageEffectName?: string;
        }>,
      ) => {
        const mods = parseDirectBonus(bonus);
        let hp = Number(enemy?.enemy_current_hp ?? enemy?.enemy_max_hp ?? 0);
        const hpMax = Number(enemy?.enemy_max_hp ?? 0);
        let ar = Number(enemy?.enemy_current_armor ?? enemy?.enemy_max_armor ?? 0);
        const arMax = Number(enemy?.enemy_max_armor ?? 0);
        let pa = Number(enemy?.enemy_current_pa ?? enemy?.enemy_max_pa ?? 0);
        const paMax = Number(enemy?.enemy_max_pa ?? 0);
        const multHealth = 1 + (mods.pctHealth / 100);
        const multArmor = 1 + (mods.pctArmor / 100);
        const multAP = 1 + (mods.pctAP / 100);
        const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
        const enemyAnoms = (enemyAnomaliesById || {})?.[String(enemy?.id || '')] || [];

        for (const app of applications) {
          const adjAmount = Math.floor(Math.max(0, Number(app.amount || 0)) * (1 + (Number(mods.pctGeneric || 0) / 100)));
          const incoming = { id: app.damageEffectId, name: app.damageEffectName };
          const rw = mods.heal ? null : computeResWeakAdjustments(adjAmount, enemyAnoms, incoming);
          const finalAmount = mods.heal ? adjAmount : Number(rw?.final || 0);

          let appliedTotal = 0;
          if (app.attr === 'classic') {
            if (!mods.heal) {
              const dmgArmor = Math.floor(finalAmount * multArmor);
              const consumedArmor = Math.min(dmgArmor, ar);
              const rest = Math.max(finalAmount - consumedArmor, 0);
              ar = clamp(ar - dmgArmor, 0, arMax);
              const dmgHealth = Math.floor(rest * multHealth);
              const consumedHealth = Math.min(dmgHealth, hp);
              hp = clamp(hp - consumedHealth, 0, hpMax);
              appliedTotal = consumedArmor + consumedHealth;
            } else {
              const healArmor = Math.floor(finalAmount * multArmor);
              const healHealth = Math.floor(finalAmount * multHealth);
              ar = clamp(ar + healArmor, 0, arMax);
              hp = clamp(hp + healHealth, 0, hpMax);
              appliedTotal = healArmor + healHealth;
            }
          } else if (app.attr === 'health') {
            const delta = Math.floor(finalAmount * multHealth);
            const consumed = mods.heal ? Math.min(delta, hpMax - hp) : Math.min(delta, hp);
            hp = mods.heal ? clamp(hp + consumed, 0, hpMax) : clamp(hp - consumed, 0, hpMax);
            appliedTotal = consumed;
          } else if (app.attr === 'armor') {
            const delta = Math.floor(finalAmount * multArmor);
            const consumed = mods.heal ? Math.min(delta, arMax - ar) : Math.min(delta, ar);
            ar = mods.heal ? clamp(ar + consumed, 0, arMax) : clamp(ar - consumed, 0, arMax);
            appliedTotal = consumed;
          } else if (app.attr === 'ap') {
            const delta = Math.floor(finalAmount * multAP);
            const consumed = mods.heal ? Math.min(delta, paMax - pa) : Math.min(delta, pa);
            pa = mods.heal ? clamp(pa + consumed, 0, paMax) : clamp(pa - consumed, 0, paMax);
            appliedTotal = consumed;
          }

          const effName = String(app.damageEffectName || app.damageEffectId || 'Generico').trim();
          const key = `${targetName}||${effName}`;
          if (!mods.heal && ((rw?.reductionClassic || 0) || (rw?.reductionPercent || 0) || (rw?.weaknessClassic || 0) || (rw?.weaknessPercent || 0))) {
            const prev = aggByTargetAndEffect.get(key) || {
              targetName,
              effectName: effName,
              reductionClassic: 0,
              reductionPercent: 0,
              weaknessClassic: 0,
              weaknessPercent: 0,
              base: 0,
              afterReduction: 0,
              afterWeakness: 0,
              applied: 0,
            };
            prev.reductionClassic += Number(rw?.reductionClassic || 0) || 0;
            prev.reductionPercent = Math.max(prev.reductionPercent, Number(rw?.reductionPercent || 0) || 0);
            prev.weaknessClassic += Number(rw?.weaknessClassic || 0) || 0;
            prev.weaknessPercent = Math.max(prev.weaknessPercent, Number(rw?.weaknessPercent || 0) || 0);
            prev.base += Number(rw?.base || 0) || 0;
            prev.afterReduction += Number(rw?.afterReduction || 0) || 0;
            prev.afterWeakness += Number(rw?.afterWeakness || 0) || 0;
            prev.applied += Number(appliedTotal || 0) || 0;
            aggByTargetAndEffect.set(key, prev);
          }
        }

        try {
          const patch: any = {
            enemy_current_hp: hp,
            enemy_current_armor: ar,
            enemy_current_pa: pa,
          };
          const res = await supabase
            .from('enemies')
            .update(patch)
            .eq('id', enemy.id);
          if (res.error) throw res.error;
          await loadEnemies();
          toast({ title: 'Danno diretto applicato', description: `${enemy?.name || 'Nemico'} aggiornato` });
        } catch (e) {
          console.error('Errore aggiornamento nemico:', e);
          toast({ title: 'Errore', description: 'Impossibile applicare danno al nemico', variant: 'destructive' });
        }
      };

      const applyOrderedApplicationsToCharacterAtomically = async (
        charId: string,
        targetName: string,
        applications: Array<{
          attr: 'armor' | 'health' | 'ap' | 'classic';
          amount: number;
          damageEffectId?: string;
          damageEffectName?: string;
        }>,
      ) => {
        try {
          const mods = parseDirectBonus(bonus);
          let targetId = String(charId);
          let updated: any = null;
          const full = await loadFullCharacter(targetId);
          if (!full) {
            if (selectedCharacter && String(selectedCharacter.id) === targetId) {
              updated = { ...(selectedCharacter as any) };
            } else {
              toast({ title: 'Errore', description: 'Impossibile caricare il personaggio da aggiornare', variant: 'destructive' });
              return;
            }
          } else {
            updated = { ...(full as any), id: targetId };
          }

          const calcForSelected = (selectedCharacter && String(selectedCharacter.id) === targetId) ? (calculations as any) : null;
          const calcMaxHealth = Number(calcForSelected?.maxHealth ?? 0);
          const calcTotalArmor = Number(calcForSelected?.totalArmor ?? 0);
          const calcMaxAP = Number(calcForSelected?.maxActionPoints ?? 0);
          const equipArmor = Array.isArray(updated.equipment)
            ? updated.equipment.filter((i: any) => !!i?.armor).reduce((sum: number, it: any) => sum + Number(it?.armor ?? 0), 0)
            : 0;
          const hpMax = Math.max(
            Number(updated.health ?? 0),
            Number(updated.currentHealth ?? 0),
            calcMaxHealth
          );
          const arMax = Math.max(
            Number(updated.baseArmor ?? 0) + equipArmor,
            Number(updated.currentArmor ?? 0),
            calcTotalArmor
          );
          const paMax = Math.max(
            Number(updated.actionPoints ?? 0),
            Number(updated.currentActionPoints ?? 0),
            calcMaxAP
          );
          let hp = Number(updated.currentHealth ?? updated.health ?? 0);
          let ar = Number(updated.currentArmor ?? updated.baseArmor ?? 0);
          let pa = Number(updated.currentActionPoints ?? updated.actionPoints ?? 0);

          const multHealth = 1 + (mods.pctHealth / 100);
          const multArmor = 1 + (mods.pctArmor / 100);
          const multAP = 1 + (mods.pctAP / 100);
          const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
          const chAnoms =
            (selectedCharacter && String(selectedCharacter.id) === targetId && Array.isArray((selectedCharacter as any)?.anomalies))
              ? (selectedCharacter as any).anomalies
              : (Array.isArray((updated as any)?.anomalies) ? (updated as any).anomalies : []);
          const immunityState = getCharacterImmunityState(updated);

          for (const app of applications) {
            const incoming = { id: app.damageEffectId, name: app.damageEffectName };
            if (isImmuneToDamageEffect(immunityState, incoming)) continue;
            const adjAmount = Math.floor(Math.max(0, Number(app.amount || 0)) * (1 + (Number(mods.pctGeneric || 0) / 100)));
            const rw = mods.heal ? null : computeResWeakAdjustments(adjAmount, chAnoms, incoming);
            const finalAmount = mods.heal ? adjAmount : Number(rw?.final || 0);

            let appliedTotal = 0;
            if (app.attr === 'classic') {
              if (!mods.heal) {
                const dmgArmor = Math.floor(finalAmount * multArmor);
                const consumedArmor = Math.min(dmgArmor, ar);
                const rest = Math.max(finalAmount - consumedArmor, 0);
                ar = clamp(ar - dmgArmor, 0, arMax);
                const dmgHealth = Math.floor(rest * multHealth);
                const consumedHealth = Math.min(dmgHealth, hp);
                hp = clamp(hp - consumedHealth, 0, hpMax);
                appliedTotal = consumedArmor + consumedHealth;
              } else {
                const healArmor = Math.floor(finalAmount * multArmor);
                const healHealth = Math.floor(finalAmount * multHealth);
                ar = clamp(ar + healArmor, 0, arMax);
                hp = clamp(hp + healHealth, 0, hpMax);
                appliedTotal = healArmor + healHealth;
              }
            } else if (app.attr === 'health') {
              const delta = Math.floor(finalAmount * multHealth);
              const consumed = mods.heal ? Math.min(delta, hpMax - hp) : Math.min(delta, hp);
              hp = mods.heal ? clamp(hp + consumed, 0, hpMax) : clamp(hp - consumed, 0, hpMax);
              appliedTotal = consumed;
            } else if (app.attr === 'armor') {
              const delta = Math.floor(finalAmount * multArmor);
              const consumed = mods.heal ? Math.min(delta, arMax - ar) : Math.min(delta, ar);
              ar = mods.heal ? clamp(ar + consumed, 0, arMax) : clamp(ar - consumed, 0, arMax);
              appliedTotal = consumed;
            } else if (app.attr === 'ap') {
              const delta = Math.floor(finalAmount * multAP);
              const consumed = mods.heal ? Math.min(delta, paMax - pa) : Math.min(delta, pa);
              pa = mods.heal ? clamp(pa + consumed, 0, paMax) : clamp(pa - consumed, 0, paMax);
              appliedTotal = consumed;
            }

            const effName = String(app.damageEffectName || app.damageEffectId || 'Generico').trim();
            const key = `${targetName}||${effName}`;
            if (!mods.heal && ((rw?.reductionClassic || 0) || (rw?.reductionPercent || 0) || (rw?.weaknessClassic || 0) || (rw?.weaknessPercent || 0))) {
              const prev = aggByTargetAndEffect.get(key) || {
                targetName,
                effectName: effName,
                reductionClassic: 0,
                reductionPercent: 0,
                weaknessClassic: 0,
                weaknessPercent: 0,
                base: 0,
                afterReduction: 0,
                afterWeakness: 0,
                applied: 0,
              };
              prev.reductionClassic += Number(rw?.reductionClassic || 0) || 0;
              prev.reductionPercent = Math.max(prev.reductionPercent, Number(rw?.reductionPercent || 0) || 0);
              prev.weaknessClassic += Number(rw?.weaknessClassic || 0) || 0;
              prev.weaknessPercent = Math.max(prev.weaknessPercent, Number(rw?.weaknessPercent || 0) || 0);
              prev.base += Number(rw?.base || 0) || 0;
              prev.afterReduction += Number(rw?.afterReduction || 0) || 0;
              prev.afterWeakness += Number(rw?.afterWeakness || 0) || 0;
              prev.applied += Number(appliedTotal || 0) || 0;
              aggByTargetAndEffect.set(key, prev);
            }
          }

          updated.currentHealth = hp;
          updated.currentArmor = ar;
          updated.currentActionPoints = pa;

          if (selectedCharacter && String(selectedCharacter.id) === targetId) {
            const ok = await updateCharacter(updated);
            if (!ok) throw new Error('Update character failed');
            setSelectedCharacter(updated);
            setCurrentHealth(hp);
            setCurrentActionPoints(pa);
            setCurrentArmor(ar);
          } else {
            const res = await supabase
              .from('characters')
              .update({ data: updated })
              .eq('id', targetId);
            if (res.error) throw res.error;
            await loadAllCharacters();
          }
          toast({ title: 'Danno diretto applicato', description: `${updated?.name || 'Personaggio'} aggiornato` });
        } catch (e) {
          console.error('Errore aggiornamento personaggio:', e);
          toast({ title: 'Errore', description: 'Impossibile applicare danno al personaggio', variant: 'destructive' });
        }
      };

      for (const t of targets) {
        const type = String(t?.type || '').toLowerCase();
        const id = String(t?.id || '');
        const targetName = String(t?.name || '').trim() || String((type === 'enemies' ? 'Nemico' : 'Personaggio'));
        if (type === 'enemies') {
          let enemy = (enemies || []).find(e => String(e?.id) === id) || selectedEnemy;
          if (!enemy || String(enemy?.id || '') !== id) {
            try { const { data } = await supabase.from('enemies').select('*').eq('id', id).maybeSingle(); enemy = data || enemy; } catch {}
          }
          if (enemy) {
            await applyOrderedApplicationsToEnemyAtomically(enemy, targetName, orderedApplications);
          }
        } else if (type === 'characters') {
          await applyOrderedApplicationsToCharacterAtomically(id, targetName, orderedApplications);
        } else if (type === 'evocations') {
          const pool = (evocationInstances || []).concat(allEvocationInstances || []);
          const ev = pool.find((e: any) => String(e?.id) === id);
          if (!ev) continue;
          const details = { ...(ev?.details || {}) };
          const level = { ...(details?.level_data || details?.level || {}) } as any;
          const mods = parseDirectBonus(bonus);
          const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
          let hp = Number(level?.energy_health ?? level?.health ?? 0);
          let ap = Number(level?.energy_action_points ?? level?.action_points ?? 0);
          let armour = Number(level?.energy_armour ?? level?.armour ?? 0);
          const hpMax = Number(level?.health ?? level?.energy_health ?? hp);
          const apMax = Number(level?.action_points ?? level?.energy_action_points ?? ap);
          const armourMax = Number(level?.armour ?? level?.energy_armour ?? armour);
          const multHealth = 1 + (mods.pctHealth / 100);
          const multArmor = 1 + (mods.pctArmor / 100);
          const multAP = 1 + (mods.pctAP / 100);
          for (const app of orderedApplications) {
            if (app.attr === 'classic') {
              if (!mods.heal) {
                const dmgArmor = Math.floor(app.amount * multArmor);
                const consumedArmor = Math.min(dmgArmor, armour);
                const rest = Math.max(app.amount - consumedArmor, 0);
                armour = clamp(armour - dmgArmor, 0, armourMax);
                const dmgHealth = Math.floor(rest * multHealth);
                hp = clamp(hp - dmgHealth, 0, hpMax);
              } else {
                const healArmor = Math.floor(app.amount * multArmor);
                armour = clamp(armour + healArmor, 0, armourMax);
                const healHealth = Math.floor(app.amount * multHealth);
                hp = clamp(hp + healHealth, 0, hpMax);
              }
            } else if (app.attr === 'health') {
              const delta = Math.floor(app.amount * multHealth);
              hp = mods.heal ? clamp(hp + delta, 0, hpMax) : clamp(hp - delta, 0, hpMax);
            } else if (app.attr === 'armor') {
              const delta = Math.floor(app.amount * multArmor);
              armour = mods.heal ? clamp(armour + delta, 0, armourMax) : clamp(armour - delta, 0, armourMax);
            } else if (app.attr === 'ap') {
              const delta = Math.floor(app.amount * multAP);
              ap = mods.heal ? clamp(ap + delta, 0, apMax) : clamp(ap - delta, 0, apMax);
            }
          }
          const newDetails = { ...details, level_data: { ...level, energy_health: hp, energy_action_points: ap, energy_armour: armour } };
          try {
            const res = await supabase
              .from('evocation_instances')
              .update({ details: newDetails })
              .eq('id', ev.id);
            if (res.error) throw res.error;
            await reloadAllEvocations();
            if (selectedCharacter?.id) {
              const list = await listEvocationInstancesByCharacter(selectedCharacter.id);
              setEvocationInstances(list);
            }
            toast({ title: 'Danno diretto applicato', description: `Evocazione "${ev?.name || ''}" aggiornata` });
          } catch (e) {
            console.error('Errore aggiornamento evocazione:', e);
            toast({ title: 'Errore', description: 'Impossibile applicare danno alla evocazione', variant: 'destructive' });
          }
        }
      }

      if (aggByTargetAndEffect.size > 0) {
        const rows = Array.from(aggByTargetAndEffect.values());
        for (const r of rows) {
          const targetPart = r.targetName ? `${r.targetName}` : '';
          const effectPart = r.effectName ? ` • ${r.effectName}` : '';
          if (r.reductionClassic || r.reductionPercent) {
            const val = formatClassicAndPercent(r.reductionClassic, r.reductionPercent);
            extraHistorySources.push({
              label: `Resistenza: ${val}`,
              value: 0,
              pure: true,
              detail: `${targetPart}${effectPart} • Danno post detrazione: ${Math.max(0, Math.floor(r.afterReduction))} • Danno effettivo: ${Math.max(0, Math.floor(r.applied))}`,
            });
          }
          if (r.weaknessClassic || r.weaknessPercent) {
            const val = formatClassicAndPercent(r.weaknessClassic, r.weaknessPercent);
            extraHistorySources.push({
              label: `Debolezza: ${val}`,
              value: 0,
              pure: true,
              detail: `${targetPart}${effectPart} • Danno post aumento: ${Math.max(0, Math.floor(r.afterWeakness))} • Danno effettivo: ${Math.max(0, Math.floor(r.applied))}`,
            });
          }
        }
      }
      if (historyEntryId && extraHistorySources.length > 0) {
        appendEntryDamageSources(historyEntryId, extraHistorySources, historyBaseSourcesFallback);
      }
    } catch (e) {
      console.error('Errore applicazione danno diretto:', e);
    }
  };

  const applySelfDamageSetsFromLevel = async (selfSets: any[], spellName?: string, suppressLog?: boolean) => {
    try {
      if (!selectedCharacter) return;
      const names = Array.from(new Set((selfSets || []).map((s: any) => String(s?.effect_name || '').trim()).filter(Boolean)));
      let rows: any[] = [];
      try {
        const { data, error } = await supabase
          .from('damage_effects')
          .select('id, name, affects_action_points, affects_health, affects_armor, affects_classic_damage, bonus_effects')
          .in('name', names);
        if (error) throw error;
        rows = data || [];
      } catch {}
      const map = new Map<string, any>();
      for (const r of rows) map.set(String(r?.name || '').trim(), r);
      const hpMax = Number(calculations?.maxHealth ?? (selectedCharacter as any)?.health?.max ?? (selectedCharacter as any)?.health ?? 0) || 0;
      const apMax = Number(calculations?.maxActionPoints ?? (selectedCharacter as any)?.actionPoints?.max ?? (selectedCharacter as any)?.actionPoints ?? 0) || 0;
      const arMax = Number(calculations?.totalArmor ?? (selectedCharacter as any)?.baseArmor ?? 0) || 0;
      let hp = Number((selectedCharacter as any)?.currentHealth ?? (selectedCharacter as any)?.health ?? 0);
      let ap = Number((selectedCharacter as any)?.currentActionPoints ?? (selectedCharacter as any)?.actionPoints ?? 0);
      let ar = Number((selectedCharacter as any)?.currentArmor ?? (selectedCharacter as any)?.baseArmor ?? 0);
      const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
      const logs: Array<{ eff: string; val: number }> = [];
      const immunityState = getCharacterImmunityState(selectedCharacter);
      for (const s of (selfSets || [])) {
        const effName = String(s?.effect_name || '').trim();
        const eff = map.get(effName) || {};
        const healByName = effName.toLowerCase().includes('cura') || effName.toLowerCase().includes('guarig');
        const bonusArr = Array.isArray(eff?.bonus_effects) ? eff.bonus_effects : [];
        const healFromBonus = bonusArr.some((b: any) => String(b || '').toLowerCase().includes('ripristina'));
        const isHeal = healByName || healFromBonus;
        if (!isHeal && isImmuneToDamageEffect(immunityState, { id: String(eff?.id || '') || undefined, name: effName || undefined })) {
          continue;
        }
        const flags: Array<'classic' | 'health' | 'armor' | 'ap'> = [];
        if (eff?.affects_health) flags.push('health');
        if (eff?.affects_armor) flags.push('armor');
        if (eff?.affects_action_points) flags.push('ap');
        if (eff?.affects_classic_damage) flags.push('classic');
        if (flags.length === 0) flags.push('classic');
        const mode = String(s?.mode || 'classic') === 'percentage' ? 'percentage' : 'classic';
        let totalAppliedForLog = 0;
        if (mode === 'classic') {
          const base = Number(s?.guaranteed_damage ?? 0) || 0;
          const extra = Number(s?.max_damage ?? 0) || 0;
          const amountRaw = Math.max(0, base + (extra > 0 ? Math.floor(Math.random() * (extra + 1)) : 0));
          const amount = isHeal
            ? amountRaw
            : applyReductionAndWeakness(amountRaw, Array.isArray((selectedCharacter as any)?.anomalies) ? (selectedCharacter as any).anomalies : [], {
                id: String(eff?.id || '') || undefined,
                name: String(effName || '') || undefined,
              });
          for (const f of flags) {
            if (f === 'classic') {
              if (!isHeal) {
                const dmgArmor = amount;
                const consumedArmor = Math.min(dmgArmor, ar);
                const rest = Math.max(amount - consumedArmor, 0);
                ar = clamp(ar - dmgArmor, 0, arMax);
                hp = clamp(hp - rest, 0, hpMax);
                totalAppliedForLog += amount;
              } else {
                const healArmor = amount;
                ar = clamp(ar + healArmor, 0, arMax);
                hp = clamp(hp + amount, 0, hpMax);
                totalAppliedForLog += amount;
              }
            } else if (f === 'health') {
              hp = isHeal ? clamp(hp + amount, 0, hpMax) : clamp(hp - amount, 0, hpMax);
              totalAppliedForLog += amount;
            } else if (f === 'armor') {
              ar = isHeal ? clamp(ar + amount, 0, arMax) : clamp(ar - amount, 0, arMax);
              totalAppliedForLog += amount;
            } else if (f === 'ap') {
              ap = isHeal ? clamp(ap + amount, 0, apMax) : clamp(ap - amount, 0, apMax);
              totalAppliedForLog += amount;
            }
          }
        } else {
          const gp = Number(s?.guaranteed_percentage_damage ?? 0) || 0;
          const mp = Number(s?.max_percentage_damage ?? 0) || 0;
          const pctRaw = Math.max(0, gp + (mp > 0 ? Math.floor(Math.random() * (mp + 1)) : 0));
          const pctCapped = Math.min(pctRaw, 100);
          const pctClassic = Math.min(pctRaw, 200);
          for (const f of flags) {
            if (f === 'classic') {
              if (!isHeal) {
                const pctArmor = Math.min(pctClassic, 100);
                const pctHealth = Math.min(Math.max(pctClassic - 100, 0), 100);
                const amountRaw =
                  Math.floor((ar * pctArmor) / 100) +
                  Math.floor((hp * pctHealth) / 100);
                const amount = applyReductionAndWeakness(amountRaw, Array.isArray((selectedCharacter as any)?.anomalies) ? (selectedCharacter as any).anomalies : [], {
                  id: String(eff?.id || '') || undefined,
                  name: String(effName || '') || undefined,
                });
                const dmgArmor = amount;
                const consumedArmor = Math.min(dmgArmor, ar);
                const rest = Math.max(amount - consumedArmor, 0);
                ar = clamp(ar - dmgArmor, 0, arMax);
                hp = clamp(hp - rest, 0, hpMax);
                totalAppliedForLog += amount;
              } else {
                const healArmor = Math.floor((arMax * pctCapped) / 100);
                const healHealth = Math.floor((hpMax * pctCapped) / 100);
                ar = clamp(ar + healArmor, 0, arMax);
                hp = clamp(hp + healHealth, 0, hpMax);
                totalAppliedForLog += healArmor + healHealth;
              }
            } else if (f === 'health') {
              const base = isHeal ? hpMax : hp;
              const amountRaw = Math.floor((base * pctCapped) / 100);
              const amount = isHeal
                ? amountRaw
                : applyReductionAndWeakness(amountRaw, Array.isArray((selectedCharacter as any)?.anomalies) ? (selectedCharacter as any).anomalies : [], {
                    id: String(eff?.id || '') || undefined,
                    name: String(effName || '') || undefined,
                  });
              hp = isHeal ? clamp(hp + amount, 0, hpMax) : clamp(hp - amount, 0, hpMax);
              totalAppliedForLog += amount;
            } else if (f === 'armor') {
              const base = isHeal ? arMax : ar;
              const amountRaw = Math.floor((base * pctCapped) / 100);
              const amount = isHeal
                ? amountRaw
                : applyReductionAndWeakness(amountRaw, Array.isArray((selectedCharacter as any)?.anomalies) ? (selectedCharacter as any).anomalies : [], {
                    id: String(eff?.id || '') || undefined,
                    name: String(effName || '') || undefined,
                  });
              ar = isHeal ? clamp(ar + amount, 0, arMax) : clamp(ar - amount, 0, arMax);
              totalAppliedForLog += amount;
            } else if (f === 'ap') {
              const base = isHeal ? apMax : ap;
              const amountRaw = Math.floor((base * pctCapped) / 100);
              const amount = isHeal
                ? amountRaw
                : applyReductionAndWeakness(amountRaw, Array.isArray((selectedCharacter as any)?.anomalies) ? (selectedCharacter as any).anomalies : [], {
                    id: String(eff?.id || '') || undefined,
                    name: String(effName || '') || undefined,
                  });
              ap = isHeal ? clamp(ap + amount, 0, apMax) : clamp(ap - amount, 0, apMax);
              totalAppliedForLog += amount;
            }
          }
        }
        logs.push({ eff: effName || 'Self', val: Math.max(0, totalAppliedForLog) });
      }
      const updated = { ...(selectedCharacter as any), currentHealth: hp, currentActionPoints: ap, currentArmor: ar } as typeof selectedCharacter;
      const ok = await updateCharacter(updated);
      if (ok) {
        setSelectedCharacter(updated);
        setCurrentHealth(hp);
        setCurrentActionPoints(ap);
        setCurrentArmor(ar);
      }
      const totalRolled = logs.reduce((sum, r) => sum + (Number(r.val) || 0), 0);
      if (!suppressLog) {
        const message = `${updated?.name || ''} applica a sè: ${String(spellName || '').trim()} eseguendo ${logs.map(r => `${r.eff}: ${r.val}`).join(', ')}`;
        addCustomEntry({ message, characterId: updated?.id, characterName: updated?.name || '', result: totalRolled, entryType: 'damage' });
      }
      return {
        totalApplied: totalRolled,
        sources: logs,
        updatedCharacter: updated,
        currentHealth: hp,
        currentActionPoints: ap,
        currentArmor: ar,
      } as any;
    } catch {}
  };

  const buildSelfAnomalyFromLevel = (
    anomaly: any,
    sourceType: 'spell' | 'ability',
    sourceItem: any,
  ): StatusAnomaly | null => {
    try {
      if (!selectedCharacter) return null;
      const anomName = String((anomaly as any)?.name ?? (typeof anomaly === 'string' ? anomaly : '') ?? '').trim().toLowerCase();
      if (anomName === 'nessuna') return null;
      const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `anom_${Date.now()}`;
      const ext = anomaly as any;
      const actionPointsModifier = Number(
        ext?.actionPointsModifier ??
          ext?.action_points_modifier ??
          ext?.temp_action_points ??
          ext?.tempActionPoints ??
          0,
      ) || 0;
      const healthModifier = Number(ext?.healthModifier ?? ext?.health_modifier ?? ext?.temp_health ?? ext?.tempHealth ?? 0) || 0;
      const armorModifier = Number(ext?.armorModifier ?? ext?.armor_modifier ?? ext?.temp_armour ?? ext?.tempArmour ?? 0) || 0;
      const statsSource =
        (typeof ext?.statsModifier === 'object' && ext?.statsModifier) ? ext.statsModifier
        : ((ext?.stats && (ext.stats.stats_modifier || ext.stats.statsModifier)) ? (ext.stats.stats_modifier || ext.stats.statsModifier) : null);
      const statsModifier =
        (typeof statsSource === 'object' && statsSource)
          ? statsSource
          : {};
      const alwaysActive = !!(ext?.alwaysActive ?? ext?.always_active ?? ext?.stats?.always_active ?? ext?.stats?.alwaysActive);

      const resolveFromExtOrStats = (camelKey: string, snakeKey: string) => {
        const v1 = ext?.[camelKey];
        if (v1 !== undefined) return v1;
        const v2 = ext?.[snakeKey];
        if (v2 !== undefined) return v2;
        const st = ext?.stats || {};
        const v3 = st?.[camelKey];
        if (v3 !== undefined) return v3;
        const v4 = st?.[snakeKey];
        if (v4 !== undefined) return v4;
        return undefined;
      };

      const normalizeDamageSets = (): StatusAnomaly['damageSets'] => {
        const raw =
          ext?.damageSets ??
          ext?.damage_sets ??
          ext?.stats?.damage_sets ??
          ext?.stats?.damageSets ??
          null;
        const list = Array.isArray(raw) ? raw : [];
        const out = list.map((s: any) => ({
          damageEffectId: s?.damageEffectId ?? s?.damage_effect_id ?? s?.damageEffectID ?? s?.id ?? undefined,
          effectName: s?.effectName ?? s?.effect_name ?? s?.damageEffectName ?? s?.damage_effect_name ?? undefined,
          guaranteedDamage: Number(s?.guaranteedDamage ?? s?.guaranteed_damage ?? 0) || 0,
          additionalDamage: Number(s?.additionalDamage ?? s?.additional_damage ?? s?.max_damage ?? 0) || 0,
        })).filter((s: any) => String(s?.damageEffectId || '').trim().length > 0);
        if (out.length > 0) return out;

        const doesDamage = !!(ext?.doesDamage ?? ext?.does_damage ?? ext?.stats?.does_damage ?? ext?.stats?.doesDamage);
        const dmgPerTurn = Number(ext?.damagePerTurn ?? ext?.damage_per_turn ?? ext?.damagePerTurn ?? 0) || 0;
        const effId = ext?.damageEffectId ?? ext?.damage_effect_id ?? null;
        const effName = String(ext?.damageEffectName ?? ext?.damage_effect_name ?? '').trim();
        if (doesDamage && (effId || effName) && dmgPerTurn > 0) {
          return [{
            damageEffectId: effId ? String(effId) : undefined,
            effectName: effName || undefined,
            guaranteedDamage: dmgPerTurn,
            additionalDamage: 0,
          }];
        }
        return [];
      };

      const damageBonusEnabled = resolveFromExtOrStats('damageBonusEnabled', 'damage_bonus_enabled');
      const damageBonus = resolveFromExtOrStats('damageBonus', 'damage_bonus');
      const damageReductionEnabled = resolveFromExtOrStats('damageReductionEnabled', 'damage_reduction_enabled');
      const damageReduction = resolveFromExtOrStats('damageReduction', 'damage_reduction');
      const weaknessEnabled = resolveFromExtOrStats('weaknessEnabled', 'weakness_enabled');
      const weakness = resolveFromExtOrStats('weakness', 'weakness') ?? resolveFromExtOrStats('weakness', 'weakness_config');
      const paDiscountEnabled = resolveFromExtOrStats('paDiscountEnabled', 'pa_discount_enabled');
      const paDiscount = resolveFromExtOrStats('paDiscount', 'pa_discount');

      const damageSets = normalizeDamageSets();
      const a: StatusAnomaly = {
        id,
        name: String(anomaly?.name ?? 'Anomalia').trim(),
        description: String(anomaly?.description ?? '').trim(),
        statsModifier,
        actionPointsModifier,
        healthModifier,
        armorModifier,
        turns: Number(anomaly?.turns ?? 0) || undefined,
        ...(alwaysActive ? { alwaysActive: true } : {}),
        sourceType,
        sourceId: String((sourceItem as any)?.id ?? (sourceItem as any)?.name ?? ''),
        ...(damageSets.length > 0 ? { damageSets } : {}),
        ...(damageBonusEnabled != null ? { damageBonusEnabled: !!damageBonusEnabled } : {}),
        ...(damageBonus ? { damageBonus } : {}),
        ...(damageReductionEnabled != null ? { damageReductionEnabled: !!damageReductionEnabled } : {}),
        ...(damageReduction ? { damageReduction } : {}),
        ...(weaknessEnabled != null ? { weaknessEnabled: !!weaknessEnabled } : {}),
        ...(weakness ? { weakness } : {}),
        ...(paDiscountEnabled != null ? { paDiscountEnabled: !!paDiscountEnabled } : {}),
        ...(paDiscount ? { paDiscount } : {}),
      };
      return a;
    } catch {
      return null;
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const applySelfEffectsFromRoll = async (rollData: any) => {
    try {
      const d = rollData?.damage;
      if (!d) return;
      const src = String(d?.source || '').trim().toLowerCase();
      const sourceType: 'spell' | 'ability' = src === 'ability' ? 'ability' : 'spell';
      const sourceItem = sourceType === 'ability' ? d?.ability : d?.spell;
      if (!sourceItem) return;
      let levelData: any = {};
      try {
        if (Array.isArray(sourceItem?.levels) && sourceItem?.current_level != null) {
          levelData = sourceItem.levels.find((l: any) => String(l?.level) === String(sourceItem.current_level)) || {};
        } else {
          levelData = sourceItem || {};
        }
      } catch {}
      const selfBlock = (levelData as any)?.self || {};
      const triggerSelfDamage = (() => {
        try {
          return (d as any)?.triggers?.selfDamage ?? (rollData as any)?.triggers?.selfDamage ?? null;
        } catch {
          return null;
        }
      })();
      const triggerEnabled = !!(triggerSelfDamage as any)?.enabled;
      const triggerVal = (triggerSelfDamage as any)?.value;

      const explicitEnabled =
        !!(selfBlock as any)?.enabled ||
        !!(levelData as any)?.self_effect_enabled ||
        !!(levelData as any)?.self_damage_enabled ||
        triggerEnabled;

      const legacyEffectName = String((levelData as any)?.self_damage_effect ?? '').trim();
      const legacyNumericVal =
        (typeof triggerVal === 'number' ? Number(triggerVal) : Number((levelData as any)?.self_damage ?? 0)) || 0;

      const sets = (() => {
        const fromSelf = Array.isArray((selfBlock as any)?.damage_sets)
        ? (selfBlock as any).damage_sets
        : null;
        if (fromSelf && fromSelf.length > 0) return fromSelf;
        const fromLevel = Array.isArray((levelData as any)?.self_damage_sets) ? (levelData as any).self_damage_sets : [];
        if (fromLevel.length > 0) return fromLevel;
        if (Array.isArray(triggerVal) && triggerVal.length > 0) return triggerVal;
        if (triggerVal && typeof triggerVal === 'object' && Array.isArray((triggerVal as any)?.damage_sets)) return (triggerVal as any).damage_sets;
        if ((legacyEffectName && legacyEffectName !== 'Nessuna') && legacyNumericVal > 0) {
          return [{ effect_name: legacyEffectName, guaranteed_damage: legacyNumericVal, max_damage: 0, mode: 'classic' }];
        }
        return [];
      })();

      const anomalies = (() => {
        const fromSelf = Array.isArray((selfBlock as any)?.anomalies) ? (selfBlock as any).anomalies : [];
        if (fromSelf.length > 0) return fromSelf;
        const fromLevel = Array.isArray((levelData as any)?.self_anomalies) ? (levelData as any).self_anomalies : [];
        if (fromLevel.length > 0) return fromLevel;
        const single = (selfBlock as any)?.anomaly || null;
        if (single) return [single];

        const legacyName = String((levelData as any)?.self_anomaly_name ?? '').trim();
        const legacyDescription = String((levelData as any)?.self_anomaly_description ?? '').trim();
        const legacyTurns = Number((levelData as any)?.self_anomaly_turns ?? 0) || 0;
        const legacyDoesDamage = !!(levelData as any)?.self_anomaly_does_damage;
        const legacyDamagePerTurn = Number((levelData as any)?.self_anomaly_damage_per_turn ?? 0) || 0;
        const legacyDamageEffectId = ((levelData as any)?.self_anomaly_damage_effect_id ?? null) as any;
        const legacyDamageEffectName = String((levelData as any)?.self_anomaly_damage_effect_name ?? '').trim();
        const legacyApMod = Number((levelData as any)?.self_anomaly_action_points_modifier ?? 0) || 0;
        const legacyHpMod = Number((levelData as any)?.self_anomaly_health_modifier ?? 0) || 0;
        const legacyStats =
          (typeof (levelData as any)?.self_anomaly_stats_modifier === 'object' && (levelData as any)?.self_anomaly_stats_modifier)
            ? (levelData as any).self_anomaly_stats_modifier
            : {};

        const hasLegacyStats = Object.values(legacyStats || {}).some((v: any) => Number(v || 0) !== 0);
        const hasLegacy =
          ((legacyName && legacyName !== 'Nessuna') || legacyDescription.length > 0 || legacyTurns > 0) ||
          legacyDoesDamage || legacyDamagePerTurn > 0 || !!legacyDamageEffectId || legacyDamageEffectName.length > 0 ||
          legacyApMod !== 0 || legacyHpMod !== 0 || hasLegacyStats;

        if (!hasLegacy) return [];
        return [{
          name: legacyName && legacyName !== 'Nessuna' ? legacyName : 'Anomalia',
          description: legacyDescription,
          turns: legacyTurns,
          doesDamage: legacyDoesDamage,
          damagePerTurn: legacyDamagePerTurn,
          damageEffectId: legacyDamageEffectId,
          damageEffectName: legacyDamageEffectName,
          actionPointsModifier: legacyApMod,
          healthModifier: legacyHpMod,
          statsModifier: legacyStats,
        }];
      })();
      const cleanedAnomalies = (Array.isArray(anomalies) ? anomalies : []).filter((a: any) => {
        const name = String((a as any)?.name ?? (typeof a === 'string' ? a : '') ?? '').trim().toLowerCase();
        return name !== 'nessuna';
      });
      const enabled =
        explicitEnabled ||
        ((Array.isArray(sets) && sets.length > 0) || cleanedAnomalies.length > 0) ||
        ((legacyEffectName && legacyEffectName !== 'Nessuna') && legacyNumericVal > 0);
      if (!enabled) return;
      let baseCharacterForAnomalies: any = selectedCharacter;
      let currentOverride: { health?: number; actionPoints?: number; armor?: number } | undefined = undefined;
      const hasSelfDamagePotential = Array.isArray(sets) && sets.length > 0 && (sets as any[]).some((s: any) => {
        const mode = String(s?.mode || 'classic') === 'percentage' ? 'percentage' : 'classic';
        if (mode === 'percentage') {
          const gp = Number(s?.guaranteed_percentage_damage ?? 0) || 0;
          const mp = Number(s?.max_percentage_damage ?? 0) || 0;
          return (gp + mp) > 0;
        }
        const base = Number(s?.guaranteed_damage ?? 0) || 0;
        const extra = Number(s?.max_damage ?? 0) || 0;
        return (base + extra) > 0;
      });
      if (hasSelfDamagePotential) {
        const res: any = await applySelfDamageSetsFromLevel(sets, String((sourceItem as any)?.name || '').trim());
        if (res?.updatedCharacter) baseCharacterForAnomalies = res.updatedCharacter;
        currentOverride = {
          health: res?.currentHealth,
          actionPoints: res?.currentActionPoints,
          armor: res?.currentArmor,
        };
      }
      const toAdd: StatusAnomaly[] = [];
      for (const anomaly of cleanedAnomalies) {
        if (!anomaly) continue;
        const built = buildSelfAnomalyFromLevel(anomaly, sourceType, sourceItem);
        if (built) toAdd.push(built);
      }
      if (toAdd.length > 0 && baseCharacterForAnomalies) {
        const nextCurrentHealth =
          (currentOverride?.health != null ? Number(currentOverride.health) : Number((baseCharacterForAnomalies as any)?.currentHealth ?? currentHealth ?? 0)) || 0;
        const nextCurrentActionPoints =
          (currentOverride?.actionPoints != null ? Number(currentOverride.actionPoints) : Number((baseCharacterForAnomalies as any)?.currentActionPoints ?? currentActionPoints ?? 0)) || 0;
        const nextCurrentArmor =
          (currentOverride?.armor != null ? Number(currentOverride.armor) : Number((baseCharacterForAnomalies as any)?.currentArmor ?? currentArmor ?? 0)) || 0;
        const updatedCharacter = {
          ...baseCharacterForAnomalies,
          anomalies: [...((baseCharacterForAnomalies as any).anomalies || []), ...toAdd],
          currentHealth: nextCurrentHealth,
          currentActionPoints: nextCurrentActionPoints,
          currentArmor: nextCurrentArmor,
        } as typeof baseCharacterForAnomalies;
        const ok = await updateCharacter(updatedCharacter);
        if (ok) {
          setSelectedCharacter(updatedCharacter);
          setCurrentHealth(nextCurrentHealth);
          setCurrentActionPoints(nextCurrentActionPoints);
          setCurrentArmor(nextCurrentArmor);
          toast({ title: 'Successo', description: 'Anomalie aggiunte' });
        }
      }
    } catch {}
  };

  const tryApplyLevelAnomaliesToTargetsFromRoll = async (rollData: any, actorOverride?: any) => {
    try {
      const d = rollData?.damage as any;
      if (!d || (d.source !== 'magic' && d.source !== 'ability')) return;
      const sourceType = d.source === 'magic' ? ('spell' as const) : ('ability' as const);
      const sourceItem = d.source === 'magic' ? d.spell : d.ability;
      if (!sourceItem) return;
      let levelData: any = {};
      try {
        const levelNum = Number(sourceItem?.current_level ?? sourceItem?.currentLevel ?? sourceItem?.level ?? 1) || 1;
        if (Array.isArray(sourceItem?.levels)) {
          levelData =
            sourceItem.levels.find((l: any) => Number(l?.level ?? 0) === levelNum) ||
            (sourceItem?.current_level != null ? (sourceItem.levels.find((l: any) => String(l?.level) === String(sourceItem.current_level)) || null) : null) ||
            sourceItem.levels[0] ||
            {};
        } else {
          levelData = sourceItem || {};
        }
      } catch {}
      const removedFromLevel = Array.isArray((levelData as any)?.removed_anomalies) ? (levelData as any).removed_anomalies : [];
      const removedFromTriggers = (() => {
        const tr = (d as any)?.triggers || {};
        if (Array.isArray(tr?.removedAnomalies)) return tr.removedAnomalies;
        if (Array.isArray(tr?.removed_anomalies)) return tr.removed_anomalies;
        return [];
      })();
      const removedSet = new Set(
        [...removedFromLevel, ...removedFromTriggers]
          .map((x) => String(x || '').trim())
          .filter(Boolean)
          .map((x) => x.toLowerCase()),
      );
      const shouldRemove = removedSet.size > 0;

      const targetsListRaw = [
        ...(Array.isArray((rollData as any)?.targets) ? (((rollData as any).targets || []) as any[]) : []),
        ...(((rollData as any)?.target ? [((rollData as any).target as any)] : []) as any[]),
      ];
      const seenTargets = new Set<string>();
      const targets = targetsListRaw
        .map((t: any) => ({ type: String(t?.type || '').toLowerCase(), id: String(t?.id || ''), name: String(t?.name || '') }))
        .filter(t => t.name && t.id)
        .filter((t) => {
          const k = `${t.type}:${t.id}`;
          if (seenTargets.has(k)) return false;
          seenTargets.add(k);
          return true;
        });

      const normName = (s: any) => String(s || '').trim().toLowerCase();
      if (targets.length === 0) {
        if (!shouldRemove) return;
        const actor = actorOverride ?? selectedCharacter;
        if (!actor) return;
        const existing: StatusAnomaly[] = Array.isArray(actor?.anomalies) ? (actor.anomalies || []) : [];
        const filtered = existing.filter((a: any) => !removedSet.has(normName(a?.name)));
        if (filtered.length === existing.length) return;
        const updated = { ...actor, anomalies: filtered } as any;
        if (selectedCharacter && String(selectedCharacter.id) === String(updated.id)) {
          const ok = await updateCharacter(updated);
          if (ok) setSelectedCharacter(updated);
        } else if (updated?.id) {
          await supabase.from('characters').update({ data: updated }).eq('id', updated.id);
          await loadAllCharacters();
        }
        return;
      }

      const cfgs = [
        { type: String(levelData?.anomaly1_type || '').trim(), percentage: Number(levelData?.anomaly1_percentage ?? 0) || 0 },
        { type: String(levelData?.anomaly2_type || '').trim(), percentage: Number(levelData?.anomaly2_percentage ?? 0) || 0 },
        { type: String(levelData?.anomaly3_type || '').trim(), percentage: Number(levelData?.anomaly3_percentage ?? 0) || 0 },
      ].filter(a => a.type && a.type !== 'Nessuna' && a.percentage > 0);

      let anomaliesToApply: StatusAnomaly[] = [];
      let resultsForLog: Array<{ name: string; percent: number; success: boolean; roll: number | null; threshold: number }> = [];
      let succeeded: Array<{ name: string; percent: number; success: boolean; roll: number | null; threshold: number }> = [];

      let rows: any[] = [];
      if (cfgs.length > 0) {
        try {
          const { data, error } = await supabase
            .from('anomalies')
            .select('*')
            .in('name', cfgs.map(c => c.type));
          if (error) throw error;
          rows = data || [];
        } catch {}
        const map = new Map<string, any>();
        for (const r of rows) map.set(String(r?.name || '').trim(), r);
        resultsForLog = cfgs.map(c => {
          if (c.percentage >= 100) {
            return { name: c.type, percent: c.percentage, success: true, roll: null, threshold: 1 };
          }
          const threshold = Math.max(1, 100 - c.percentage + 1);
          const roll = Math.floor(Math.random() * 100) + 1;
          return { name: c.type, percent: c.percentage, success: roll >= threshold, roll, threshold };
        });
        succeeded = resultsForLog.filter(r => r.success);
        anomaliesToApply = succeeded.map(s => {
          const row = map.get(s.name) || {};
          const statsRaw = row?.stats || row || {};
          const sm = (() => {
            try {
              const obj = statsRaw || {};
              const src = (obj?.stats_modifier || obj?.statsModifier || (row as any)?.stats_modifier || (row as any)?.statsModifier || (row as any)?.statsModifier || obj) as any;
              const keys = ['anima','forza','agilita','sapienza','intelletto','percezione','resistenza'];
              const out: Record<string, number> = {};
              for (const k of keys) out[k] = Number(src?.[k] ?? 0) || 0;
              return out;
            } catch { return {}; }
          })();
          const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `anom_${Date.now()}_${Math.floor(Math.random()*1000)}`;
          const turns = Number(row?.turns ?? 0) || undefined;
          const apm = Number(
            (row as any)?.actionPointsModifier ??
              (row as any)?.action_points_modifier ??
              (row as any)?.temp_action_points ??
              (row as any)?.tempActionPoints ??
              0,
          ) || 0;
          const hpm = Number((row as any)?.healthModifier ?? (row as any)?.health_modifier ?? (row as any)?.temp_health ?? (row as any)?.tempHealth ?? 0) || 0;
          const arm = Number((row as any)?.armorModifier ?? (row as any)?.armor_modifier ?? (row as any)?.temp_armour ?? (row as any)?.tempArmour ?? 0) || 0;
          const dsList = Array.isArray((row as any)?.damageSets)
            ? (row as any).damageSets
            : (Array.isArray((statsRaw as any)?.damage_sets) ? (statsRaw as any).damage_sets : []);
          const damageSets = dsList.map((ds: any) => ({
            damageEffectId: String(ds?.damageEffectId || ''),
            guaranteedDamage: Number(ds?.guaranteedDamage || 0) || 0,
            additionalDamage: Number(ds?.additionalDamage || 0) || 0,
          }));
          const damageBonusEnabled = !!(
            (row as any)?.damageBonusEnabled ??
            (row as any)?.damage_bonus_enabled ??
            (statsRaw as any)?.damage_bonus_enabled ??
            (statsRaw as any)?.damageBonusEnabled
          );
          const damageBonus = ((row as any)?.damageBonus ?? (row as any)?.damage_bonus ?? (statsRaw as any)?.damage_bonus ?? (statsRaw as any)?.damageBonus) || undefined;
          const paDiscountEnabled = !!(
            (row as any)?.paDiscountEnabled ??
            (row as any)?.pa_discount_enabled ??
            (statsRaw as any)?.pa_discount_enabled ??
            (statsRaw as any)?.paDiscountEnabled
          );
          const paDiscount = ((row as any)?.paDiscount ?? (row as any)?.pa_discount ?? (statsRaw as any)?.pa_discount ?? (statsRaw as any)?.paDiscount) || undefined;
          const payload = {
            id,
            name: String(row?.name || s.name),
            description: String(row?.description || ''),
            statsModifier: sm,
            actionPointsModifier: apm,
            healthModifier: hpm,
            armorModifier: arm,
            turns,
            sourceType,
            sourceId: String((sourceItem as any)?.id || (sourceItem as any)?.name || ''),
            damageSets,
            damageBonusEnabled,
            damageBonus,
            paDiscountEnabled,
            paDiscount,
          } as StatusAnomaly;
          return payload;
        });
      }

      const enemyTargets = targets.filter((t) => t.type === 'enemies');
      if (enemyTargets.length > 0 && (shouldRemove || anomaliesToApply.length > 0)) {
        setEnemyAnomaliesById((prev) => {
          let changed = false;
          const next = { ...prev } as Record<string, StatusAnomaly[]>;

          for (const t of enemyTargets) {
            const enemyId = String(t.id || '').trim();
            if (!enemyId) continue;
            const fallbackEnemy = (enemies || []).find((e: any) => String(e?.id) === enemyId) || null;
            const fallbackList =
              (fallbackEnemy as any)?.enemy_anomalies ??
              (fallbackEnemy as any)?.enemyAnomalies ??
              (fallbackEnemy as any)?.anomalies ??
              [];
            const prevList = Array.isArray(prev?.[enemyId])
              ? (prev[enemyId] as StatusAnomaly[])
              : (Array.isArray(fallbackList) ? (fallbackList as StatusAnomaly[]) : []);
            let nextList = prevList;
            let didChange = false;
            if (shouldRemove) {
              const filtered = prevList.filter((a: any) => !removedSet.has(normName(a?.name)));
              if (filtered.length !== prevList.length) didChange = true;
              nextList = filtered;
            }
            if (anomaliesToApply.length > 0) {
              nextList = [...nextList, ...anomaliesToApply];
              didChange = true;
            }
            if (!didChange) continue;
            next[enemyId] = nextList;
            changed = true;
            void persistEnemyAnomalies(enemyId, nextList);
          }

          return changed ? next : prev;
        });
      }

      for (const t of targets) {
        if (t.type !== 'characters') continue;
        try {
          const full = (typeof loadFullCharacter === 'function') ? await loadFullCharacter(t.id) : null;
          const base: any =
            full ??
            ((selectedCharacter && String(selectedCharacter.id) === String(t.id)) ? (selectedCharacter as any) : null);
          if (!base) continue;

          const existing: StatusAnomaly[] = Array.isArray(base?.anomalies) ? (base.anomalies || []) : [];
          let nextAnomalies = existing;
          let didChange = false;
          if (shouldRemove) {
            const filtered = existing.filter((a: any) => !removedSet.has(normName(a?.name)));
            if (filtered.length !== existing.length) didChange = true;
            nextAnomalies = filtered;
          }
          if (anomaliesToApply.length > 0) {
            nextAnomalies = [...nextAnomalies, ...anomaliesToApply];
            didChange = true;
          }
          if (!didChange) continue;

          const updated = { ...base, id: String(t.id), anomalies: nextAnomalies } as any;

          if (selectedCharacter && String(selectedCharacter.id) === String(t.id)) {
            const ok = await updateCharacter(updated);
            if (ok) {
              setSelectedCharacter(updated);
              setCurrentHealth(Number(updated.currentHealth ?? updated.health ?? 0) || 0);
              setCurrentActionPoints(Number(updated.currentActionPoints ?? updated.actionPoints ?? 0) || 0);
              setCurrentArmor(Number(updated.currentArmor ?? updated.baseArmor ?? 0) || 0);
            }
          } else {
            await supabase.from('characters').update({ data: updated }).eq('id', t.id);
            await loadAllCharacters();
          }
        } catch {}
      }

      if (anomaliesToApply.length > 0 && succeeded.length > 0) {
        const namesStr = targets.map(t => t.name).join(', ');
        const anomsStr = succeeded.map(s => s.name).join(', ');
        const turnsMax = Math.max(...anomaliesToApply.map(a => Number(a.turns || 0)).filter(n => n > 0));
        const verb = targets.length > 1 ? 'subiscono' : 'subisce';
        const msg = turnsMax > 0
          ? `${namesStr} ${verb} ${anomsStr} per ${turnsMax} turni!`
          : `${namesStr} ${verb} ${anomsStr}!`;
        const sources = resultsForLog.map(r => ({ label: r.name, value: r.percent, detail: r.percent >= 100 ? 'assicurata' : `d100=${r.roll} >= ${r.threshold}: ${r.success ? 'successo' : 'fallito'}` }));
        addCustomEntry({ message: msg, characterId: selectedCharacter?.id, characterName: selectedCharacter?.name || '', result: 0, entryType: 'damage', damageSources: sources });
      }
    } catch {}
  };

  const applyMagicActionCostFromRoll = async (rollData: any, baseCharacter?: any) => {
    try {
      const d = rollData?.damage;
      if (!d?.directApply?.enabled) return;
      if (d?.source !== 'magic') return;
      const ch = baseCharacter ?? selectedCharacter;
      if (!ch) return null;
      const trig = (d as any)?.triggers || {};
      const ac = trig?.actionCostApplied || trig?.actionCost || {};
      const preBase = Number(ac?.base || 0) || 0;
      const preInd = Number(ac?.indicative || ac?.indicativeRoll || 0) || 0;
      const apTrig = trig?.actionPoints || {};
      const preInvestment = (apTrig?.enabled ? (Number(apTrig?.selected || 0) || 0) : 0);
      const alreadyDiscounted = !!ac?.discounted;
      const preSeconds = Number(ac?.seconds || 0) || 0;
      let totalCost = Math.max(0, preBase + preInd + preInvestment + preSeconds);
      let baseCost = preBase;
      let indicativeCost = preInd;
      let investmentCost = preInvestment;
      let secondsCost = preSeconds;
      if (totalCost <= 0) {
        const spell = d?.spell;
        let levelData: any = {};
        try {
          if (Array.isArray(spell?.levels) && spell?.current_level != null) {
            levelData = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level)) || {};
          } else {
            levelData = spell || {};
          }
        } catch {}
        const toNum = (v: any): number => {
          if (typeof v === 'number') return v;
          const s = String(v ?? '').trim().replace(',', '.');
          const m = s.match(/-?\d+(?:\.\d+)?/);
          return m ? parseFloat(m[0]) : 0;
        };
        baseCost = toNum(levelData?.action_cost ?? levelData?.punti_azione ?? spell?.action_cost ?? 0);
        const indicativeMax = toNum(levelData?.indicative_action_cost ?? spell?.indicative_action_cost ?? 0);
        indicativeCost = indicativeMax > 0 ? (Math.floor(Math.random() * Math.max(1, indicativeMax)) + 1) : 0;
        const dps = trig?.damagePerSecond || trig?.seconds || {};
        const selectedSeconds = Math.max(0, Number(dps?.selectedSeconds ?? dps?.selected ?? 0) || 0);
        const paCostPerSecond = Math.max(0, toNum(dps?.paCostPerSecond ?? levelData?.pa_cost_per_second ?? spell?.pa_cost_per_second ?? 0));
        secondsCost = selectedSeconds > 0 && paCostPerSecond > 0 ? (selectedSeconds * paCostPerSecond) : 0;
        totalCost = Math.max(0, baseCost + indicativeCost + investmentCost + secondsCost);
      }
      if (totalCost <= 0) return;

      const spell = d?.spell;
      const anomalies: any[] = Array.isArray((ch as any)?.anomalies) ? ((ch as any).anomalies || []) : [];

      if (alreadyDiscounted && Number(ac?.total || 0) > 0) {
        const apNow = Number((ch as any)?.currentActionPoints ?? (ch as any)?.actionPoints ?? 0);
        const newAp = Math.max(0, apNow - totalCost);
        const chHealth = Number((ch as any)?.currentHealth ?? (ch as any)?.health ?? 0);
        const chArmor = Number((ch as any)?.currentArmor ?? (ch as any)?.baseArmor ?? 0);
        const updated = { ...(ch as any), currentActionPoints: newAp, currentHealth: chHealth, currentArmor: chArmor } as typeof ch;
        const ok = await updateCharacter(updated);
        if (ok) {
          setSelectedCharacter(updated);
          setCurrentActionPoints(newAp);
          toast({ title: 'Punti azione', description: `Costo magia: ${totalCost} (PA: ${apNow} → ${newAp})` });
          return updated;
        }
        return null;
      }

      const matchesPaDiscountTarget = (anom: any): boolean => {
        const enabled = !!(anom?.paDiscountEnabled ?? anom?.pa_discount_enabled);
        const def = (anom?.paDiscount ?? anom?.pa_discount);
        if (!enabled || !def) return false;
        const isSpecific = !!def?.isSpecific;
        if (!isSpecific) return true;
        const mode = (def?.targetMode || 'abilities') as any;
        if (mode === 'magic') return true;
        if (mode === 'abilities') return false;
        const cats: any[] = Array.isArray(def?.categories) ? def.categories : [];
        if (!spell) return false;
        const spellPrimary = String((spell as any)?.primary_branch || '');
        const spellSecondary = String((spell as any)?.secondary_branch || '');
        const spellPrimarySpec = String((spell as any)?.primary_specificity || '');
        const spellSecondarySpec = String((spell as any)?.secondary_specificity || '');
        const spellGrade = String((spell as any)?.grade || '');
        const spellCategory = String((spell as any)?.category || '');
        return cats.some((c) => {
          const s = String(c || '');
          if (s.startsWith('magic:section:')) {
            const sectionKey = s.slice('magic:section:'.length);
            return spellPrimary === sectionKey || spellSecondary === sectionKey || (spellCategory ? spellCategory.startsWith(`${sectionKey}_`) : false);
          }
          if (s.startsWith('magic:category:')) {
            const parts = s.split(':');
            const sectionKey = parts?.[2] || '';
            const categoryKey = parts?.[3] || '';
            const grade = parts?.[4] || '';
            const matchesPrimary = spellPrimary === sectionKey && spellPrimarySpec === categoryKey && spellGrade === grade;
            const matchesSecondary = spellSecondary === sectionKey && spellSecondarySpec === categoryKey && spellGrade === grade;
            const matchesCategoryField = spellCategory === `${sectionKey}_${categoryKey}_${grade}`;
            return matchesPrimary || matchesSecondary || matchesCategoryField;
          }
          return false;
        });
      };

      let totalClassicGuaranteed = 0;
      let totalClassicAdditional = 0;
      let totalPercentageGuaranteed = 0;
      let totalPercentageAdditional = 0;
      anomalies.forEach((anom) => {
        try {
          if (!matchesPaDiscountTarget(anom)) return;
          const def = (anom?.paDiscount ?? anom?.pa_discount) || {};
          const mode = String(def?.mode ?? '').trim().toLowerCase();
          const allowClassic = mode !== 'percentage';
          const allowPercentage = mode !== 'classic';
          if (allowClassic) {
            totalClassicGuaranteed += Number(def?.classicGuaranteed || 0) || 0;
            totalClassicAdditional += Number(def?.classicAdditional || 0) || 0;
          }
          if (allowPercentage) {
            totalPercentageGuaranteed += Number(def?.percentageGuaranteed || 0) || 0;
            totalPercentageAdditional += Number(def?.percentageAdditional || 0) || 0;
          }
        } catch {}
      });

      const applyDiscount = (value: number, classic: number, pct: number) => {
        let out = Number(value || 0) || 0;
        if (classic) out -= Number(classic || 0) || 0;
        if (pct) out -= Math.round(out * ((Number(pct || 0) || 0) / 100));
        return Math.max(0, out);
      };

      const discountedBase = applyDiscount(baseCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      const discountedIndicative = applyDiscount(indicativeCost, totalClassicAdditional, totalPercentageAdditional);
      const discountedInvestment = applyDiscount(investmentCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      const discountedSeconds = applyDiscount(secondsCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      baseCost = discountedBase;
      indicativeCost = discountedIndicative;
      investmentCost = discountedInvestment;
      secondsCost = discountedSeconds;
      totalCost = Math.max(0, baseCost + indicativeCost + investmentCost + secondsCost);

      try { (d as any).triggers = { ...trig, actionCostApplied: { base: baseCost, indicativeRoll: indicativeCost, investment: investmentCost, seconds: secondsCost, total: totalCost, discounted: true } }; } catch {}
      const apNow = Number((ch as any)?.currentActionPoints ?? (ch as any)?.actionPoints ?? 0);
      const newAp = Math.max(0, apNow - totalCost);
      const chHealth = Number((ch as any)?.currentHealth ?? (ch as any)?.health ?? 0);
      const chArmor = Number((ch as any)?.currentArmor ?? (ch as any)?.baseArmor ?? 0);
      const updated = { ...(ch as any), currentActionPoints: newAp, currentHealth: chHealth, currentArmor: chArmor } as typeof ch;
      const ok = await updateCharacter(updated);
      if (ok) {
        setSelectedCharacter(updated);
        setCurrentActionPoints(newAp);
        toast({ title: 'Punti azione', description: `Costo magia: ${totalCost} (PA: ${apNow} → ${newAp})` });
        return updated;
      }
    } catch (e) {
      console.warn('[DiceDashboard] applyMagicActionCostFromRoll error:', e);
    }
    return null;
  };

  const applyAbilityActionCostFromRoll = async (rollData: any, baseCharacter?: any) => {
    try {
      const d = rollData?.damage;
      if (!d?.directApply?.enabled) return;
      if (d?.source !== 'ability') return;
      const ch = baseCharacter ?? selectedCharacter;
      if (!ch) return null;
      const trig = (d as any)?.triggers || {};
      const ac = trig?.actionCostApplied || trig?.actionCost || {};
      const preBase = Number(ac?.base || 0) || 0;
      const preInd = Number(ac?.indicative || ac?.indicativeRoll || 0) || 0;
      const apTrig = trig?.actionPoints || {};
      const preInvestment = (apTrig?.enabled ? (Number(apTrig?.selected || 0) || 0) : 0);
      const alreadyDiscounted = !!ac?.discounted;
      const preSeconds = Number(ac?.seconds || 0) || 0;
      let totalCost = Math.max(0, preBase + preInd + preInvestment + preSeconds);
      let baseCost = preBase;
      let indicativeCost = preInd;
      let investmentCost = preInvestment;
      let secondsCost = preSeconds;
      if (totalCost <= 0) {
        const ability = d?.ability;
        let levelData: any = {};
        try {
          if (Array.isArray(ability?.levels) && ability?.current_level != null) {
            levelData = ability.levels.find((l: any) => String(l?.level) === String(ability.current_level)) || {};
          } else {
            levelData = ability || {};
          }
        } catch {}
        const toNum = (v: any): number => {
          if (typeof v === 'number') return v;
          const s = String(v ?? '').trim().replace(',', '.');
          const m = s.match(/-?\d+(?:\.\d+)?/);
          return m ? parseFloat(m[0]) : 0;
        };
        baseCost = toNum(levelData?.action_cost ?? levelData?.punti_azione ?? ability?.action_cost ?? 0);
        const indicativeMax = toNum(levelData?.indicative_action_cost ?? levelData?.punti_azione_indicativi ?? ability?.indicative_action_cost ?? 0);
        indicativeCost = indicativeMax > 0 ? (Math.floor(Math.random() * Math.max(1, indicativeMax)) + 1) : 0;
        const dps = trig?.damagePerSecond || trig?.seconds || {};
        const selectedSeconds = Math.max(0, Number(dps?.selectedSeconds ?? dps?.selected ?? 0) || 0);
        const paCostPerSecond = Math.max(0, toNum(dps?.paCostPerSecond ?? levelData?.pa_cost_per_second ?? ability?.pa_cost_per_second ?? 0));
        secondsCost = selectedSeconds > 0 && paCostPerSecond > 0 ? (selectedSeconds * paCostPerSecond) : 0;
        totalCost = Math.max(0, baseCost + indicativeCost + investmentCost + secondsCost);
      }
      if (totalCost <= 0) return;

      const ability = d?.ability;
      const anomalies: any[] = Array.isArray((ch as any)?.anomalies) ? ((ch as any).anomalies || []) : [];

      if (alreadyDiscounted && Number(ac?.total || 0) > 0) {
        const apNow = Number((ch as any)?.currentActionPoints ?? (ch as any)?.actionPoints ?? 0);
        const newAp = Math.max(0, apNow - totalCost);
        const chHealth = Number((ch as any)?.currentHealth ?? (ch as any)?.health ?? 0);
        const chArmor = Number((ch as any)?.currentArmor ?? (ch as any)?.baseArmor ?? 0);
        const updated = { ...(ch as any), currentActionPoints: newAp, currentHealth: chHealth, currentArmor: chArmor } as typeof ch;
        const ok = await updateCharacter(updated);
        if (ok) {
          setSelectedCharacter(updated);
          setCurrentActionPoints(newAp);
          toast({ title: 'Punti azione', description: `Costo abilità: ${totalCost} (PA: ${apNow} → ${newAp})` });
          return updated;
        }
        return null;
      }

      const matchesPaDiscountTarget = (anom: any): boolean => {
        const enabled = !!(anom?.paDiscountEnabled ?? anom?.pa_discount_enabled);
        const def = (anom?.paDiscount ?? anom?.pa_discount);
        if (!enabled || !def) return false;
        const isSpecific = !!def?.isSpecific;
        if (!isSpecific) return true;
        const mode = (def?.targetMode || 'abilities') as any;
        if (mode === 'abilities') return true;
        if (mode === 'magic') return false;
        const cats: any[] = Array.isArray(def?.categories) ? def.categories : [];
        if (!ability) return false;
        const abilityCategory = String((ability as any)?.category || '');
        const abilitySubcategory = String((ability as any)?.subcategory || '');
        const abilityGrade = String((ability as any)?.grade || '');
        return cats.some((c) => {
          const s = String(c || '');
          if (s.startsWith('ability:category:')) {
            const parts = s.split(':');
            const categoryKey = parts?.[2] || '';
            const grade = parts?.[3] || '';
            return (abilityCategory === categoryKey || abilitySubcategory === categoryKey) && abilityGrade === grade;
          }
          return false;
        });
      };

      let totalClassicGuaranteed = 0;
      let totalClassicAdditional = 0;
      let totalPercentageGuaranteed = 0;
      let totalPercentageAdditional = 0;
      anomalies.forEach((anom) => {
        try {
          if (!matchesPaDiscountTarget(anom)) return;
          const def = (anom?.paDiscount ?? anom?.pa_discount) || {};
          const mode = String(def?.mode ?? '').trim().toLowerCase();
          const allowClassic = mode !== 'percentage';
          const allowPercentage = mode !== 'classic';
          if (allowClassic) {
            totalClassicGuaranteed += Number(def?.classicGuaranteed || 0) || 0;
            totalClassicAdditional += Number(def?.classicAdditional || 0) || 0;
          }
          if (allowPercentage) {
            totalPercentageGuaranteed += Number(def?.percentageGuaranteed || 0) || 0;
            totalPercentageAdditional += Number(def?.percentageAdditional || 0) || 0;
          }
        } catch {}
      });

      const applyDiscount = (value: number, classic: number, pct: number) => {
        let out = Number(value || 0) || 0;
        if (classic) out -= Number(classic || 0) || 0;
        if (pct) out -= Math.round(out * ((Number(pct || 0) || 0) / 100));
        return Math.max(0, out);
      };

      const discountedBase = applyDiscount(baseCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      const discountedIndicative = applyDiscount(indicativeCost, totalClassicAdditional, totalPercentageAdditional);
      const discountedInvestment = applyDiscount(investmentCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      const discountedSeconds = applyDiscount(secondsCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      baseCost = discountedBase;
      indicativeCost = discountedIndicative;
      investmentCost = discountedInvestment;
      secondsCost = discountedSeconds;
      totalCost = Math.max(0, baseCost + indicativeCost + investmentCost + secondsCost);

      try { (d as any).triggers = { ...trig, actionCostApplied: { base: baseCost, indicativeRoll: indicativeCost, investment: investmentCost, seconds: secondsCost, total: totalCost, discounted: true } }; } catch {}
      const apNow = Number((ch as any)?.currentActionPoints ?? (ch as any)?.actionPoints ?? 0);
      const newAp = Math.max(0, apNow - totalCost);
      const chHealth = Number((ch as any)?.currentHealth ?? (ch as any)?.health ?? 0);
      const chArmor = Number((ch as any)?.currentArmor ?? (ch as any)?.baseArmor ?? 0);
      const updated = { ...(ch as any), currentActionPoints: newAp, currentHealth: chHealth, currentArmor: chArmor } as typeof ch;
      const ok = await updateCharacter(updated);
      if (ok) {
        setSelectedCharacter(updated);
        setCurrentActionPoints(newAp);
        toast({ title: 'Punti azione', description: `Costo abilità: ${totalCost} (PA: ${apNow} → ${newAp})` });
        return updated;
      }
    } catch (e) {
      console.warn('[DiceDashboard] applyAbilityActionCostFromRoll error:', e);
    }
    return null;
  };

  const enrichRollDataWithActionCost = (rollData: any) => {
    try {
      const d = rollData?.damage;
      if (!d || (d?.source !== 'magic' && d?.source !== 'ability')) return rollData;
      const trig = (d as any)?.triggers || {};
      const ac = trig?.actionCostApplied || trig?.actionCost || {};
      if (Number(ac?.total || 0) > 0) return rollData;
      const toNum = (v: any): number => {
        if (typeof v === 'number') return v;
        const s = String(v ?? '').trim().replace(',', '.');
        const m = s.match(/-?\d+(?:\.\d+)?/);
        return m ? parseFloat(m[0]) : 0;
      };

      const isMagic = d?.source === 'magic';
      const item = isMagic ? d?.spell : d?.ability;
      let levelData: any = {};
      try {
        if (Array.isArray(item?.levels) && item?.current_level != null) {
          levelData = item.levels.find((l: any) => String(l?.level) === String(item.current_level)) || {};
        } else {
          levelData = item || {};
        }
      } catch {}

      let baseCost = toNum(levelData?.action_cost ?? levelData?.punti_azione ?? item?.action_cost ?? 0);
      const indicativeMax = isMagic
        ? toNum(levelData?.indicative_action_cost ?? item?.indicative_action_cost ?? 0)
        : toNum(levelData?.indicative_action_cost ?? levelData?.punti_azione_indicativi ?? item?.indicative_action_cost ?? 0);
      let indicativeRoll = indicativeMax > 0 ? (Math.floor(Math.random() * Math.max(1, indicativeMax)) + 1) : 0;

      const apTrig = trig?.actionPoints || {};
      let investmentCost = (apTrig?.enabled ? (Number(apTrig?.selected || 0) || 0) : 0);

      const dps = trig?.damagePerSecond || trig?.seconds || {};
      const selectedSeconds = Math.max(0, Number(dps?.selectedSeconds ?? dps?.selected ?? 0) || 0);
      const paCostPerSecond = Math.max(0, toNum(dps?.paCostPerSecond ?? levelData?.pa_cost_per_second ?? item?.pa_cost_per_second ?? 0));
      let secondsCost = selectedSeconds > 0 && paCostPerSecond > 0 ? (selectedSeconds * paCostPerSecond) : 0;

      const anomalies: any[] = Array.isArray((selectedCharacter as any)?.anomalies) ? ((selectedCharacter as any).anomalies || []) : [];
      if (anomalies.length > 0 && item) {
        const matchesPaDiscountTarget = (anom: any): boolean => {
          const enabled = !!(anom?.paDiscountEnabled ?? anom?.pa_discount_enabled);
          const def = (anom?.paDiscount ?? anom?.pa_discount);
          if (!enabled || !def) return false;
          const isSpecific = !!def?.isSpecific;
          if (!isSpecific) return true;
          const mode = (def?.targetMode || 'abilities') as any;
          if (isMagic) {
            if (mode === 'magic') return true;
            if (mode === 'abilities') return false;
            const cats: any[] = Array.isArray(def?.categories) ? def.categories : [];
            const spellPrimary = String((item as any)?.primary_branch || '');
            const spellSecondary = String((item as any)?.secondary_branch || '');
            const spellPrimarySpec = String((item as any)?.primary_specificity || '');
            const spellSecondarySpec = String((item as any)?.secondary_specificity || '');
            const spellGrade = String((item as any)?.grade || '');
            const spellCategory = String((item as any)?.category || '');
            return cats.some((c) => {
              const s = String(c || '');
              if (s.startsWith('magic:section:')) {
                const sectionKey = s.slice('magic:section:'.length);
                return spellPrimary === sectionKey || spellSecondary === sectionKey || (spellCategory ? spellCategory.startsWith(`${sectionKey}_`) : false);
              }
              if (s.startsWith('magic:category:')) {
                const parts = s.split(':');
                const sectionKey = parts?.[2] || '';
                const categoryKey = parts?.[3] || '';
                const grade = parts?.[4] || '';
                const matchesPrimary = spellPrimary === sectionKey && spellPrimarySpec === categoryKey && spellGrade === grade;
                const matchesSecondary = spellSecondary === sectionKey && spellSecondarySpec === categoryKey && spellGrade === grade;
                const matchesCategoryField = spellCategory === `${sectionKey}_${categoryKey}_${grade}`;
                return matchesPrimary || matchesSecondary || matchesCategoryField;
              }
              return false;
            });
          } else {
            if (mode === 'abilities') return true;
            if (mode === 'magic') return false;
            const cats: any[] = Array.isArray(def?.categories) ? def.categories : [];
            const abilityCategory = String((item as any)?.category || '');
            const abilitySubcategory = String((item as any)?.subcategory || '');
            const abilityGrade = String((item as any)?.grade || '');
            return cats.some((c) => {
              const s = String(c || '');
              if (s.startsWith('ability:category:')) {
                const parts = s.split(':');
                const categoryKey = parts?.[2] || '';
                const grade = parts?.[3] || '';
                return (abilityCategory === categoryKey || abilitySubcategory === categoryKey) && abilityGrade === grade;
              }
              return false;
            });
          }
        };

        let totalClassicGuaranteed = 0;
        let totalClassicAdditional = 0;
        let totalPercentageGuaranteed = 0;
        let totalPercentageAdditional = 0;
        anomalies.forEach((anom) => {
          try {
            if (!matchesPaDiscountTarget(anom)) return;
            const def = (anom?.paDiscount ?? anom?.pa_discount) || {};
            const mode = String(def?.mode ?? '').trim().toLowerCase();
            const allowClassic = mode !== 'percentage';
            const allowPercentage = mode !== 'classic';
            if (allowClassic) {
              totalClassicGuaranteed += Number(def?.classicGuaranteed || 0) || 0;
              totalClassicAdditional += Number(def?.classicAdditional || 0) || 0;
            }
            if (allowPercentage) {
              totalPercentageGuaranteed += Number(def?.percentageGuaranteed || 0) || 0;
              totalPercentageAdditional += Number(def?.percentageAdditional || 0) || 0;
            }
          } catch {}
        });

        const applyDiscount = (value: number, classic: number, pct: number) => {
          let out = Number(value || 0) || 0;
          if (classic) out -= Number(classic || 0) || 0;
          if (pct) out -= Math.round(out * ((Number(pct || 0) || 0) / 100));
          return Math.max(0, out);
        };

        baseCost = applyDiscount(baseCost, totalClassicGuaranteed, totalPercentageGuaranteed);
        indicativeRoll = applyDiscount(indicativeRoll, totalClassicAdditional, totalPercentageAdditional);
        investmentCost = applyDiscount(investmentCost, totalClassicGuaranteed, totalPercentageGuaranteed);
        secondsCost = applyDiscount(secondsCost, totalClassicGuaranteed, totalPercentageGuaranteed);
      }

      const totalCost = Math.max(0, baseCost + indicativeRoll + investmentCost + secondsCost);
      const next = JSON.parse(JSON.stringify(rollData));
      try {
        (next.damage as any).triggers = {
          ...trig,
          actionCostApplied: { base: baseCost, indicativeRoll, investment: investmentCost, seconds: secondsCost, total: totalCost, discounted: true }
        };
      } catch {}
      return next;
    } catch { return rollData; }
  };

  const applyCustomSpecificsFromRoll = async (
    rollData: any,
    baseCharacter: any,
    mode: 'consume' | 'generate' | 'both'
  ) => {
    try {
      const d = rollData?.damage;
      let sourceType = d?.source;
      let item = sourceType === 'magic' ? d?.spell : sourceType === 'ability' ? d?.ability : null;
      if ((!item || !sourceType) && rollData?.actionSource) {
        const src = rollData.actionSource;
        const t = String(src?.type || '').trim();
        if (t === 'magic' || t === 'ability') {
          sourceType = t;
          item = src?.item;
        }
      }
      if (!item || (sourceType !== 'magic' && sourceType !== 'ability')) return null;
      if (!item) return null;
      const ch = baseCharacter ?? selectedCharacter;
      if (!ch) return null;
      const toNum = (v: any): number => {
        if (typeof v === 'number') return v;
        const s = String(v ?? '').trim().replace(',', '.');
        const m = s.match(/-?\d+(?:\.\d+)?/);
        return m ? parseFloat(m[0]) : 0;
      };
      const resolveLevelData = (src: any, gradeNumber?: number) => {
        const lvlNum = toNum(src?.current_level ?? src?.level ?? src?.levels?.[0]?.level ?? 1) || 1;
        const baseLevel = Array.isArray(src?.levels)
          ? (src.levels.find((l: any) => toNum(l?.level) === lvlNum) || src.levels[0] || src)
          : src;
        if (gradeNumber && gradeNumber > 1) {
          const gradesArr = Array.isArray((baseLevel as any)?.grades) ? (baseLevel as any).grades : [];
          if (gradesArr.length > 0) {
            const byNumber = gradesArr.find((g: any) => toNum(g?.grade_number ?? 0) === gradeNumber);
            return byNumber || gradesArr[Math.max(0, gradeNumber - 2)] || baseLevel;
          }
        }
        return baseLevel;
      };
      const gradeNumber = toNum(rollData?.actionSource?.gradeNumber ?? 0);
      const levelData = resolveLevelData(item, sourceType === 'magic' ? gradeNumber : undefined);
      const mapSpecifics = (raw: any[]) =>
        raw.map((r: any) => ({
          id: String(r?.id ?? '').trim(),
          key: String(r?.key ?? '').trim(),
          name: String(r?.name ?? '').trim(),
          value: toNum(r?.value ?? r?.amount ?? 0),
        })).filter((r: any) => r.value > 0 && (r.id || r.key || r.name));
      const consumeRaw = Array.isArray((levelData as any)?.consume_custom_specifics)
        ? (levelData as any).consume_custom_specifics
        : Array.isArray((item as any)?.consume_custom_specifics)
          ? (item as any).consume_custom_specifics
          : [];
      const generateRaw = Array.isArray((levelData as any)?.generate_custom_specifics)
        ? (levelData as any).generate_custom_specifics
        : Array.isArray((item as any)?.generate_custom_specifics)
          ? (item as any).generate_custom_specifics
          : [];
      const toConsume = mapSpecifics(consumeRaw);
      const toGenerate = mapSpecifics(generateRaw);
      if (mode === 'consume' && toConsume.length === 0) return null;
      if (mode === 'generate' && toGenerate.length === 0) return null;
      if (mode === 'both' && toConsume.length === 0 && toGenerate.length === 0) return null;
      const list = Array.isArray((ch as any)?.specifics) ? (ch as any).specifics : [];
      const applyDelta = (arr: any[], reqs: any[], dir: 1 | -1) => {
        if (reqs.length === 0) return arr;
        return arr.map((item: any) => {
          const norm = (v: any) => String(v ?? '').trim().toLowerCase();
          const itemId = norm(item?.id ?? item?.key ?? '');
          const itemName = norm(item?.name ?? '');
          const req = reqs.find((r: any) => {
            const reqId = norm(r?.id ?? r?.key ?? '');
            const reqName = norm(r?.name ?? '');
            if (reqId && itemId && reqId === itemId) return true;
            if (reqName && itemName && reqName === itemName) return true;
            if (reqId && !itemId && itemName && reqId === itemName) return true;
            return false;
          });
          if (!req) return item;
          const current = toNum(item?.current ?? 0);
          const max = toNum(item?.max ?? 0);
          const nextValue = dir === -1
            ? Math.max(0, current - req.value)
            : (max > 0 ? Math.min(max, current + req.value) : Math.max(0, current + req.value));
          if (nextValue === current) return item;
          return { ...item, current: nextValue };
        });
      };
      let nextList = list;
      if (mode === 'consume' || mode === 'both') nextList = applyDelta(nextList, toConsume, -1);
      if (mode === 'generate' || mode === 'both') nextList = applyDelta(nextList, toGenerate, 1);
      const changed = JSON.stringify(nextList) !== JSON.stringify(list);
      if (!changed) return null;
      let updatedCharacter = { ...(ch as any), specifics: nextList } as any;
      if (selectedCharacter && String((selectedCharacter as any)?.id) === String(updatedCharacter?.id)) {
        updatedCharacter = {
          ...updatedCharacter,
          currentHealth: Number(currentHealth ?? updatedCharacter.currentHealth ?? (selectedCharacter as any)?.currentHealth ?? (selectedCharacter as any)?.health ?? 0) || 0,
          currentActionPoints: Number(currentActionPoints ?? updatedCharacter.currentActionPoints ?? (selectedCharacter as any)?.currentActionPoints ?? (selectedCharacter as any)?.actionPoints ?? 0) || 0,
          currentArmor: Number(currentArmor ?? updatedCharacter.currentArmor ?? (selectedCharacter as any)?.currentArmor ?? (selectedCharacter as any)?.baseArmor ?? 0) || 0,
        } as any;
      }
      const ok = await updateCharacter(updatedCharacter);
      if (ok) {
        if (selectedCharacter && String((selectedCharacter as any)?.id) === String(updatedCharacter?.id)) {
          setSelectedCharacter(updatedCharacter);
        }
        return updatedCharacter;
      }
    } catch {}
    return null;
  };

  const handleActionSuccessStart = (isCritical: boolean) => {
    void applyActionDurationScalingDashboard(true);
    if (pendingActionEntryId) updateEntryBadge(pendingActionEntryId, isCritical ? 'Critico!' : 'riuscito');
    setActionSuccessResolved(true);
    setDefaultCritical(isCritical);
    if (pendingRollData && getLaunchDelayTurnsFromRoll(pendingRollData) > 0) {
      try {
        const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
        if (pendingRollData && characterForRoll) {
          void applyCustomSpecificsFromRoll(pendingRollData, characterForRoll, 'both');
        }
      } catch {}
      try { scheduleLaunchDelayEventFromRoll(pendingRollData, { isCritical }); } catch {}
      setPendingRollData(null);
      setPendingActorForRoll(null);
      setPendingActionEntryId(null);
      setPendingLottery(null);
      setLotteryPreview(null);
      setMultiShotItems([]);
      setMultiShotRollStarted({});
      setMultiShotRollRecaps({});
      setShowRollSuccess(false);
      setCriticalExtraValueGlobal(0);
      setCriticalExtraPerShot({});
      setShotCriticalPending(null);
      setActionSuccessResolved(false);
      return;
    }
    try {
      if (pendingRollData) {
        tryCreateEvocationInstanceFromRoll(pendingRollData);
        tryAddLevelWarningAnomalyFromRoll(pendingRollData);
        tryAddActiveSpellEventFromRoll(pendingRollData);
        applySelfEffectsFromRoll(pendingRollData);
        try {
          const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
          if (pendingRollData && characterForRoll) {
            void applyCustomSpecificsFromRoll(pendingRollData, characterForRoll, 'both');
          }
        } catch {}
      }
    } catch {}
  };

  // Ri-esegue il tiro di riuscita (statistica + competenze o percentuale se attiva) per un singolo attacco
  const handleShotRollStart = (shotIndex: number) => {
    try {
      const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
      const calculationsForRoll = pendingActorForRoll?.calculations ?? calculations;
      if (!characterForRoll || !pendingRollData) return;
      // Esegui un tiro di azione e registralo nello storico
      const rollDataForShot: any = JSON.parse(JSON.stringify(pendingRollData));
      try {
        const trig = (rollDataForShot?.damage as any)?.triggers ?? {};
        const ms = trig?.multipleShots ?? {};
        if (rollDataForShot?.damage) {
          (rollDataForShot.damage as any).triggers = { ...trig, multipleShots: { ...ms, currentShotIndex: shotIndex } };
        }
      } catch {}
      const created = addEntryFromModalRoll(characterForRoll, rollDataForShot, calculationsForRoll);
      try {
        if (created) {
          const competenceTotal = Array.isArray((created as any)?.competenceDetails)
            ? (created as any).competenceDetails.reduce((sum: number, c: any) => sum + (Number(c?.roll || 0) || 0), 0)
            : 0;
          setMultiShotRollRecaps(prev => ({
            ...prev,
            [shotIndex]: {
              result: Number((created as any)?.result ?? 0) || 0,
              maxValue: Number((created as any)?.diceMax ?? 0) || 0,
              statValue: Number((created as any)?.statValue ?? 0) || 0,
              competenceTotal,
            },
          }));
        }
      } catch {}
      setMultiShotRollStarted(prev => ({ ...prev, [shotIndex]: true }));
      toast({ title: `Attacco #${shotIndex}`, description: 'Tiro di riuscita eseguito. Conferma disponibile.' });
    } catch (err) {
      console.warn('[DiceDashboard] handleShotRollStart error:', err);
    }
  };

  // Conferma per un singolo attacco; rimuove dalla coda e chiude quando finiti
  const handleShotResponse = async (shotIndex: number, type: 'failure' | 'success' | 'critical') => {
    try {
      const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
      const calculationsForRoll = pendingActorForRoll?.calculations ?? calculations;
      const remainingShots = (multiShotItems || []).filter(i => i !== shotIndex);
      if (!characterForRoll || !pendingRollData) {
        setMultiShotItems(remainingShots);
      } else {
        if (type !== 'failure') {
          // Danno per singolo attacco: clona rollData e forza selectedShots=1
          const shotRollData: any = JSON.parse(JSON.stringify(pendingRollData));
          try {
            const sts: any[][] = Array.isArray((pendingRollData as any)?.shotsTargets) ? (pendingRollData as any).shotsTargets : [];
            const listForShot = (sts && sts[shotIndex - 1]) ? sts[shotIndex - 1] : (Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : []);
            shotRollData.targets = Array.isArray(listForShot) ? listForShot : [];
            shotRollData.target = (shotRollData.targets[0]) ? { type: shotRollData.targets[0].type, id: shotRollData.targets[0].id, name: shotRollData.targets[0].name } : { type: 'none' };
          } catch {}
          const trig = (shotRollData?.damage as any)?.triggers ?? {};
          const ms = trig?.multipleShots ?? {};
          const newTrig = { ...trig, multipleShots: { ...ms, enabled: true, selectedShots: 1, currentShotIndex: shotIndex } };
          (shotRollData.damage as any).triggers = newTrig;
          const isCrit = type === 'critical' || defaultCritical;
          const extraPure = (() => {
            if (type === 'critical') return Number(criticalExtraPerShot[shotIndex] || criticalExtraValueGlobal || 0);
            if (type === 'success' && defaultCritical) return Number(criticalExtraValueGlobal || 0);
            return 0;
          })();
          (shotRollData.damage as any).criticalExtraPureValue = extraPure;
          const rollForProcessing = applyPhaseToRollForProcessing(shotRollData);
          if (getLaunchDelayTurnsFromRoll(rollForProcessing) > 0) {
            try { scheduleLaunchDelayEventFromRoll(rollForProcessing, { isCritical: isCrit, label: `Attacco #${shotIndex}` }); } catch {}
          } else {
            const entry = addDamageEntryFromModalRoll(characterForRoll, rollForProcessing, isCrit, calculationsForRoll);
            try { await appendTargetResWeakToHistoryIfNeeded(rollForProcessing, entry); } catch {}
            try {
              const totalDamage = Number(entry?.result ?? 0);
              if (totalDamage > 0) {
                await applyDirectDamageFromRoll(rollForProcessing, totalDamage, entry?.id, entry?.damageSources);
              }
            } catch {}
            try {
              void tryApplyLevelAnomaliesToTargetsFromRoll(rollForProcessing, characterForRoll);
            } catch {}
          }
        }
        try {
          const mode = type === 'failure' ? 'consume' : 'both';
          await applyCustomSpecificsFromRoll(pendingRollData, characterForRoll, mode);
        } catch {}
        setMultiShotItems(remainingShots);
        if (remainingShots.length === 0) {
          try {
            const srcD: any = pendingRollData?.damage;
            const activeItem =
              srcD?.source === 'magic'
                ? srcD?.spell
                : srcD?.source === 'ability'
                  ? srcD?.ability
                  : null;
            const info = extractPhaseFlowInfo(activeItem);
            const canContinue = !!(info.enabled && info.index < (info.phases?.length ?? 0) - 1);
            if (canContinue && !terminateHere) {
              const nextItem = { ...(activeItem || {}), __phaseAttack: { index: Number(info.index ?? -1) + 1 } };
              const nextInfo = extractPhaseFlowInfo(nextItem);
              const nextPhaseData = (nextInfo.phases || [])[nextInfo.index] || null;
              const nextItemForRoll = nextPhaseData ? applyPhaseToItemForDamage(nextItem, nextPhaseData) : nextItem;

              const nextPending = JSON.parse(JSON.stringify(pendingRollData));
              if (srcD?.source === 'magic') (nextPending.damage as any).spell = nextItemForRoll;
              else if (srcD?.source === 'ability') (nextPending.damage as any).ability = nextItemForRoll;
              delete (nextPending.damage as any).criticalExtraPureValue;

              const nextWithCost = enrichRollDataWithActionCost(nextPending);
              try {
                const trig = (nextWithCost?.damage as any)?.triggers;
                const lot = trig?.lottery;
                if (lot && toBool(lot.enabled) && Number(lot.diceFaces || 0) > 0 && Number(lot.numericChoices || 0) > 0) {
                  const df = Number(lot.diceFaces || 0) || 0;
                  const nc = Number(lot.numericChoices || 0) || 0;
                  const uc = Array.isArray(lot.userChoices) ? lot.userChoices.filter((x: any) => typeof x === 'number') : [];
                  setPendingLottery({ diceFaces: df, numericChoices: nc, userChoices: uc });
                } else {
                  setPendingLottery(null);
                }
              } catch {
                setPendingLottery(null);
              }
              setLotteryPreview(null);
              setTerminateHere(false);
              setActionSuccessResolved(false);
              setMultiShotRollStarted({});
              setMultiShotRollRecaps({});
              setDefaultCritical(false);
              setCriticalExtraValueGlobal(0);
              setCriticalExtraPerShot({});
              setShotCriticalPending(null);

              try {
                if (srcD?.source === 'magic') {
                  await applyMagicActionCostFromRoll(nextWithCost, characterForRoll);
                } else if (srcD?.source === 'ability') {
                  await applyAbilityActionCostFromRoll(nextWithCost, characterForRoll);
                }
              } catch {}

              const created = addEntryFromModalRoll(characterForRoll, nextWithCost, calculationsForRoll);
              setPendingActionEntryId(created?.id || null);
              try {
                if (created) {
                  const competenceTotal = Array.isArray((created as any)?.competenceDetails)
                    ? (created as any).competenceDetails.reduce((sum: number, c: any) => sum + (Number(c?.roll || 0) || 0), 0)
                    : 0;
                  setActionRollRecap({
                    result: Number((created as any)?.result ?? 0) || 0,
                    maxValue: Number((created as any)?.diceMax ?? 0) || 0,
                    statValue: Number((created as any)?.statValue ?? 0) || 0,
                    competenceTotal,
                  });
                } else {
                  setActionRollRecap(null);
                }
              } catch {
                setActionRollRecap(null);
              }

              setPendingRollData(nextWithCost);
              return;
            }
          } catch {}
          setPendingRollData(null);
          setPendingActorForRoll(null);
          setPendingActionEntryId(null);
          setShowRollSuccess(false);
          setCriticalExtraValueGlobal(0);
          setCriticalExtraPerShot({});
        }
        setShotCriticalPending((curr) => (curr === shotIndex ? null : curr));
      }
    } catch {
      // In caso di errore, rimuove comunque l'elemento per evitare blocchi
      const remainingShots = (multiShotItems || []).filter(i => i !== shotIndex);
      setMultiShotItems(remainingShots);
      if (remainingShots.length === 0) {
        setPendingRollData(null);
        setPendingActorForRoll(null);
        setPendingActionEntryId(null);
        setShowRollSuccess(false);
        setCriticalExtraValueGlobal(0);
        setCriticalExtraPerShot({});
      }
      setShotCriticalPending((curr) => (curr === shotIndex ? null : curr));
    }
  };

  // Lista eventi attivi globali: anomalie a turni per tutti i personaggi
  const activeAnomalyEvents = useMemo(() => {
    try {
      const list = (characters || []).flatMap((c: any) => {
        const ownerName = c?.name || 'Sconosciuto';
        const ownerId = c?.id || '';
        return (c?.anomalies || [])
          .filter((a: StatusAnomaly) => Number(a?.turns ?? 0) > 0)
          .map((a: StatusAnomaly) => ({ ...a, ownerId, ownerName }));
      });
      return list.sort((a: any, b: any) => {
        const ta = Number(a?.turns ?? 0);
        const tb = Number(b?.turns ?? 0);
        if (tb !== ta) return tb - ta;
        return String(b?.ownerName || '').localeCompare(String(a?.ownerName || ''));
      });
    } catch {
      return [] as Array<StatusAnomaly & { ownerId: string; ownerName: string }>;
    }
  }, [characters]);

  const activeEnemyAnomalyEvents = useMemo(() => {
    try {
      const list = (enemies || []).flatMap((e: any) => {
        const ownerName = e?.name || 'Nemico';
        const ownerId = String(e?.id || '');
        const raw =
          e?.enemy_anomalies ??
          e?.enemyAnomalies ??
          e?.anomalies ??
          (enemyAnomaliesById?.[ownerId] ?? []);
        const anomalies = Array.isArray(raw) ? (raw as StatusAnomaly[]) : [];
        return anomalies
          .filter((a: StatusAnomaly) => Number(a?.turns ?? 0) > 0)
          .map((a: StatusAnomaly) => ({ ...a, ownerId, ownerName }));
      });
      return list.sort((a: any, b: any) => {
        const ta = Number(a?.turns ?? 0);
        const tb = Number(b?.turns ?? 0);
        if (tb !== ta) return tb - ta;
        return String(b?.ownerName || '').localeCompare(String(a?.ownerName || ''));
      });
    } catch {
      return [] as Array<StatusAnomaly & { ownerId: string; ownerName: string }>;
    }
  }, [enemies, enemyAnomaliesById]);

  // Lista evocazioni attive globali da Supabase
  const activeGlobalEvocations = useMemo(() => {
    try {
      const list = (allEvocationInstances || [])
        .filter((e: any) => Number(e?.remaining_turns ?? 0) > 0)
        .map((e: any) => {
          const owner = (characters || []).find((c: any) => c?.id === e?.character_id);
          return {
            ...e,
            ownerId: e?.character_id || '',
            ownerName: owner?.name || 'Sconosciuto',
          };
        });
      return list.sort((a: any, b: any) => {
        const ra = Number(a?.remaining_turns ?? 0);
        const rb = Number(b?.remaining_turns ?? 0);
        if (rb !== ra) return rb - ra;
        const ta = Number(new Date(a?.created_at || 0).getTime() || 0);
        const tb = Number(new Date(b?.created_at || 0).getTime() || 0);
        return tb - ta;
      });
    } catch {
      return [] as any[];
    }
  }, [allEvocationInstances, characters]);

  const sortedActiveSpellEvents = useMemo(() => {
    const arr = [...(activeSpellEvents || [])];
    arr.sort((a: any, b: any) => {
      const ra = Number(a?.remaining_turns ?? a?.turns ?? 0);
      const rb = Number(b?.remaining_turns ?? b?.turns ?? 0);
      if (rb !== ra) return rb - ra;
      const ta = Number(a?.created_at ?? 0);
      const tb = Number(b?.created_at ?? 0);
      return tb - ta;
    });
    return arr;
  }, [activeSpellEvents]);

  const sortedActiveRecoveryEvents = useMemo(() => {
    const arr = [...(activeRecoveryEvents || [])];
    arr.sort((a: any, b: any) => {
      const ra = Number(a?.remaining_turns ?? a?.turns ?? 0);
      const rb = Number(b?.remaining_turns ?? b?.turns ?? 0);
      if (rb !== ra) return rb - ra;
      const ta = Number(a?.created_at ?? 0);
      const tb = Number(b?.created_at ?? 0);
      return tb - ta;
    });
    return arr;
  }, [activeRecoveryEvents]);

  useEffect(() => {
    const el = anomaliesScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [showActiveEventsModal, activeAnomalyEvents]);

  useEffect(() => {
    if (!showActiveEventsModal) return;
    void loadEnemies();
  }, [showActiveEventsModal, loadEnemies]);

  useEffect(() => {
    const el = spellsScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [showActiveEventsModal, activeSpellEvents]);

  useEffect(() => {
    const el = recoveryScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [showActiveEventsModal, activeRecoveryEvents]);

  useEffect(() => {
    try {
      const p = selectedPotionItem;
      if (!p) { setSelectedPotionAnomalyDetails(null); return; }
      if (p.anomaly) { setSelectedPotionAnomalyDetails(p.anomaly as any); return; }
      if (p.anomalyId) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('anomalies')
              .select('*')
              .eq('id', String(p.anomalyId))
              .maybeSingle();
            if (error) throw error;
            const row: any = data || null;
            if (!row) { setSelectedPotionAnomalyDetails(null); return; }
            const stats = row?.stats || {};
            const actionPointsModifier = Number(
              row?.actionPointsModifier ??
                row?.action_points_modifier ??
                row?.temp_action_points ??
                row?.tempActionPoints ??
                0,
            ) || 0;
            const healthModifier = Number(row?.healthModifier ?? row?.health_modifier ?? row?.temp_health ?? row?.tempHealth ?? 0) || 0;
            const armorModifier = Number(row?.armorModifier ?? row?.armor_modifier ?? row?.temp_armour ?? row?.tempArmour ?? 0) || 0;
            const statsModifier = (stats?.stats_modifier || stats?.statsModifier || row?.statsModifier || row?.stats_modifier || {
              forza: 0, percezione: 0, resistenza: 0,
              intelletto: 0, agilita: 0, sapienza: 0, anima: 0,
            });
            const damageSets = Array.isArray(row?.damageSets)
              ? row.damageSets
              : (Array.isArray(stats?.damage_sets) ? stats.damage_sets : undefined);
            const damageBonusEnabled = !!(row?.damageBonusEnabled ?? row?.damage_bonus_enabled ?? stats?.damage_bonus_enabled ?? stats?.damageBonusEnabled);
            const damageBonus = (row?.damageBonus ?? row?.damage_bonus ?? stats?.damage_bonus ?? stats?.damageBonus) || undefined;
            const paDiscountEnabled = !!(row?.paDiscountEnabled ?? row?.pa_discount_enabled ?? stats?.pa_discount_enabled ?? stats?.paDiscountEnabled);
            const paDiscount = (row?.paDiscount ?? row?.pa_discount ?? stats?.pa_discount ?? stats?.paDiscount) || undefined;
            const a: StatusAnomaly = {
              id: String(row?.id || p.anomalyId),
              name: String(row?.name || ''),
              description: String(row?.description || ''),
              actionPointsModifier,
              healthModifier,
              armorModifier,
              turns: row?.turns ?? undefined,
              statsModifier,
              damageSets: Array.isArray(damageSets) ? damageSets.map((ds: any) => ({
                damageEffectId: ds.damageEffectId ?? ds.damage_effect_id,
                effectName: ds.effect_name ?? ds.effectName,
                guaranteedDamage: Number(ds.guaranteedDamage ?? ds.guaranteed_damage ?? 0) || 0,
                additionalDamage: Number(ds.additionalDamage ?? ds.additional_damage ?? 0) || 0,
              })) : undefined,
              damageBonusEnabled,
              damageBonus,
              paDiscountEnabled,
              paDiscount,
            } as any;
            setSelectedPotionAnomalyDetails(a);
          } catch { setSelectedPotionAnomalyDetails(null); }
        })();
      } else {
        setSelectedPotionAnomalyDetails(null);
      }
    } catch { setSelectedPotionAnomalyDetails(null); }
  }, [selectedPotionItem, selectedPotionItem?.id, selectedPotionItem?.anomalyId]);

  useEffect(() => {
    const el = evocationsScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [showActiveEventsModal, activeGlobalEvocations, loadingAllEvocations]);

  useEffect(() => {
    const el = evocationsModalScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [showEvocationsModal, evocationInstances, expandedEvocationId]);

  // Crea evento magico a turni se la magia ha durata in turni ma non è una evocazione
  const tryAddActiveSpellEventFromRoll = async (rollData: any) => {
    try {
      const d = (rollData?.damage || {}) as any;
      if (!d || d.source !== 'magic') return;
      const spell = d.spell;
      if (!spell || !selectedCharacter?.id) return;

      // Estrai level data e durata
      let levelData: any = {};
      try {
        if (Array.isArray(spell?.levels) && spell?.current_level != null) {
          levelData = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level)) || {};
        }
      } catch {}

      const duration = Number(levelData?.turn_duration_rounds ?? (spell as any)?.turn_duration_rounds ?? 0);
      const evEnabled = Boolean(levelData?.evocation_enabled ?? (spell as any)?.evocation_enabled);
      const evType = (levelData?.evocation_type ?? (spell as any)?.evocation_type);

      // Se è un'evocazione, non creare evento locale (già gestito su Supabase)
      if (evEnabled && evType) return;
      if (!duration || duration <= 0) return;

      // Bersagli selezionati nel tiro: mostriamo su chi è attivo
      const targetsList = Array.isArray((rollData as any)?.targets) ? ((rollData as any)?.targets || []) : [];
      const targets = targetsList.map((t: any) => ({
        type: String(t?.type || ''),
        id: String(t?.id || ''),
        name: String(t?.name || ''),
      })).filter(t => t.name && t.name.trim().length > 0);
      const name = String(spell?.name || 'Magia');
      const description = String(levelData?.description ?? spell?.description ?? '');

      // Danni per turno ed effetti di danno (non usare campi self_)
      const hasDps = Boolean(levelData?.does_damage);
      const damagePerTurn = hasDps ? Number(levelData?.damage_per_turn ?? 0) : 0;
      const effectsFromLevelValues: string[] = Array.isArray(levelData?.damage_values)
        ? (levelData.damage_values as any[])
            .map((dv: any) => String(dv?.typeName || dv?.name || '').trim())
            .filter((n: string) => !!n)
        : [];
      const damageEffects = Array.from(new Set(effectsFromLevelValues));
      const damageEffectsDetails = Array.isArray(levelData?.damage_values)
        ? (levelData.damage_values as any[])
            .map((dv: any) => ({
              name: String(dv?.typeName || dv?.name || '').trim(),
              guaranteed: Number(dv?.guaranteed_damage ?? 0) || 0,
              additional: Number(dv?.additional_damage ?? 0) || 0,
            }))
            .filter((e: any) => !!e.name)
        : [];

      // Seleziona: una istanza per ogni bersaglio (evita colonna di badge)
      if (targets.length > 0) {
        const baseId = `spell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const perTargetEvents = targets.map((t: any, idx: number) => ({
          id: `${baseId}-${t.id || idx}`,
          spellId: String(spell?.id ?? ''),
          name,
          description,
          remaining_turns: duration,
          targets: [t],
          damage_per_turn: damagePerTurn,
          damage_effects: damageEffects,
          damage_effects_details: damageEffectsDetails,
          created_at: Date.now(),
        }));
        setActiveSpellEvents(prev => [...prev, ...perTargetEvents]);
      } else {
        const event = {
          id: `spell-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          spellId: String(spell?.id ?? ''),
          name,
          description,
          remaining_turns: duration,
          targets: [],
          damage_per_turn: damagePerTurn,
          damage_effects: damageEffects,
          damage_effects_details: damageEffectsDetails,
          created_at: Date.now(),
        };
    setActiveSpellEvents(prev => [...prev, event]);
      }
    } catch (error) {
      console.warn('[DiceDashboard] Impossibile creare evento magia a turni:', error);
    }
  };

  // Nuovo: crea evento di Recupero e avvia cooldown per la magia usata
  const tryAddRecoveryEventFromRoll = (rollData: any) => {
    try {
      const damage = rollData?.damage;
      const src = String(damage?.source || '');
      if (!damage || (src !== 'magic' && src !== 'ability')) return;
      const item = src === 'magic' ? damage.spell : damage.ability;
      if (!item || !selectedCharacter) return;
      // Recupero: supporta sia triggers.usageEveryNTurns sia i campi livello usage_interval_turns / usage_every_n_turns
      const usageTrig = damage?.triggers?.usageEveryNTurns;
      let turns = Number(usageTrig?.turns ?? 0) || 0;
      let enabled = Boolean(usageTrig?.enabled) && turns >= 1;

      // Fallback: leggi dal livello dell'elemento
      try {
        const levelNum = Number((item as any)?.current_level) || Number((item as any)?.level) || 1;
        const lvl = Array.isArray((item as any)?.levels)
          ? ((item as any).levels.find((l: any) => Number(l?.level) === levelNum) || (item as any).levels[0] || {})
          : (item as any);
        const intervalTurns = Number((lvl as any)?.usage_interval_turns ?? (item as any)?.usage_interval_turns ?? 0) || 0;
        const everyNEnabled = !!((lvl as any)?.usage_every_n_turns_enabled || (item as any)?.usage_every_n_turns_enabled);
        const everyNTurns = Number((lvl as any)?.usage_every_n_turns ?? (item as any)?.usage_every_n_turns ?? 0) || 0;
        // Se i triggers non sono abilitati, usa i fallback
        if (!enabled) {
          if (everyNEnabled && everyNTurns >= 1) {
            turns = everyNTurns;
            enabled = true;
          } else if (intervalTurns >= 1) {
            turns = intervalTurns;
            enabled = true;
          }
        }
      } catch {}

      if (!enabled) return;
      const sid = String(item?.id ?? item?.name ?? '');
      if (!sid) return;
      const maxUses = getMaxUsesPerTurnFromItem(item);
      const name = `${item?.name || (src === 'magic' ? 'Magia' : 'Abilità')} (recupero)`;
      const description = src === 'magic' ? 'Cooldown uso magia' : 'Cooldown uso abilità';
      const key = `${selectedCharacter.id}:${sid}`;
      if (maxUses >= 2) {
        const curr = pendingRecoveryStartsRef.current || {};
        const prevTurns = Number(curr[key]?.turns ?? 0) || 0;
        const nextTurns = Math.max(prevTurns, turns);
        pendingRecoveryStartsRef.current = {
          ...curr,
          [key]: {
            turns: nextTurns,
            sid,
            name,
            description,
            ownerId: selectedCharacter.id,
            ownerName: selectedCharacter.name,
          },
        };
      } else {
        const ev = {
          id: `recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          spellId: sid,
          name,
          description,
          remaining_turns: turns,
          ownerId: selectedCharacter.id,
          ownerName: selectedCharacter.name,
          created_at: Date.now(),
        };
        setActiveRecoveryEvents((prev) => [...(prev || []), ev]);
        setSpellCooldowns((prev) => ({ ...(prev || {}), [key]: turns }));
      }
    } catch (error) {
      console.warn('[DiceDashboard] Impossibile creare evento Recupero:', error);
    }
  };

  function getMaxUsesPerTurnFromItem(item: any): number {
    try {
      if (!item) return 0;
      const levelNum = Number((item as any)?.current_level ?? (item as any)?.level ?? 1) || 1;
      const levelObj = Array.isArray((item as any)?.levels)
        ? ((item as any).levels.find((l: any) => Number(l?.level) === levelNum) || (item as any).levels[0] || {})
        : item;
      const fromLevel = Number((levelObj as any)?.max_uses_per_turn ?? (levelObj as any)?.maxUsesPerTurn ?? 0) || 0;
      const fromItem = Number((item as any)?.max_uses_per_turn ?? (item as any)?.maxUsesPerTurn ?? 0) || 0;
      const limit = Math.max(0, Math.floor(fromLevel || fromItem || 0));
      const flag = (item as any)?.hasMaxUsesPerTurn ?? (item as any)?.has_max_uses_per_turn;
      const enabled = typeof flag === 'boolean' ? flag : limit > 0;
      return enabled ? limit : 0;
    } catch {
      return 0;
    }
  }

  const getPerTurnUseInfoFromRoll = (rollData: any) => {
    try {
      if (!selectedCharacter?.id) return null;
      const d = (rollData?.damage || {}) as any;
      const src = String(d?.source || '');
      if (src !== 'magic' && src !== 'ability') return null;
      const item = src === 'magic' ? d?.spell : d?.ability;
      if (!item) return null;
      const itemId = String(item?.id ?? item?.name ?? '').trim();
      if (!itemId) return null;
      const limit = getMaxUsesPerTurnFromItem(item);
      if (limit <= 0) return null;
      const kind = src === 'magic' ? 'spell' : 'ability';
      const key = `${String(selectedCharacter.id)}:${kind}:${itemId}`;
      const used = Number((perTurnUses || {})[key] ?? 0) || 0;
      const name = String(item?.name || (src === 'magic' ? 'Magia' : 'Abilità'));
      return { key, used, limit, name };
    } catch {
      return null;
    }
  };

  const tryConsumePerTurnUseFromRoll = (rollData: any) => {
    const info = getPerTurnUseInfoFromRoll(rollData);
    if (!info) return;
    if (info.used >= info.limit) return;
    setPerTurnUses((prev) => {
      const next = { ...(prev || {}) };
      next[info.key] = (Number(next[info.key] ?? 0) || 0) + 1;
      return next;
    });
  };

  const getLaunchDelayTurnsFromRoll = (rollData: any): number => {
    try {
      const trig = (rollData?.damage as any)?.triggers ?? {};
      const ld =
        (trig as any)?.launchDelay ??
        (trig as any)?.launch_delay ??
        (trig as any)?.activationDelay ??
        (trig as any)?.activation_delay ??
        null;
      const enabled = Boolean(ld?.enabled);
      const turns = Number(ld?.turns ?? 0) || 0;
      if (enabled && turns > 0) return turns;
    } catch {}
    try {
      const dmg = rollData?.damage;
      const src = String(dmg?.source || '');
      const item = src === 'magic'
        ? dmg?.spell
        : src === 'ability'
          ? dmg?.ability
          : null;
      if (!item) return 0;
      let lvl: any = null;
      if (Array.isArray(item?.levels) && item.levels.length > 0) {
        const levelNum = Number((item as any)?.current_level ?? (item as any)?.level ?? 1) || 1;
        lvl = item.levels.find((l: any) => Number(l?.level) === levelNum) || item.levels[0] || null;
      }
      const turns = Number((lvl as any)?.activation_delay_turns ?? (item as any)?.activation_delay_turns ?? 0) || 0;
      return turns > 0 ? turns : 0;
    } catch {}
    return 0;
  };

  const scheduleLaunchDelayEventFromRoll = (rollData: any, opts: { isCritical: boolean; castId?: string; label?: string }) => {
    const delayTurns = getLaunchDelayTurnsFromRoll(rollData);
    if (delayTurns <= 0) return false;
    const d = (rollData?.damage || {}) as any;
    const baseName = d?.source === 'magic'
      ? String(d?.spell?.name || 'Magia')
      : d?.source === 'ability'
        ? String(d?.ability?.name || 'Abilità')
        : 'Azione';
    const targetsList = Array.isArray((rollData as any)?.targets)
      ? ((rollData as any).targets || [])
      : ((rollData as any)?.target && (rollData as any).target.type && (rollData as any).target.type !== 'none')
        ? [(rollData as any).target]
        : [];
    const targets = (targetsList || []).map((t: any) => ({
      type: String(t?.type || ''),
      id: String(t?.id || ''),
      name: String(t?.name || ''),
    })).filter((t: any) => t.name && t.name.trim().length > 0);
    const castId = String(opts.castId || `delaycast-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const id = `delay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const name = opts.label ? `${baseName} (ritardo) • ${opts.label}` : `${baseName} (ritardo)`;
    setActiveSpellEvents(prev => [
      ...(prev || []),
      {
        id,
        kind: 'launch_delay',
        castId,
        name,
        description: `Si attiva tra ${delayTurns} turni`,
        remaining_turns: delayTurns,
        targets,
        ownerId: selectedCharacter?.id,
        ownerName: selectedCharacter?.name,
        created_at: Date.now(),
        delayed_roll: {
          rollData: JSON.parse(JSON.stringify(rollData)),
          isCritical: Boolean(opts.isCritical),
        },
      }
    ]);
    toast({
      title: 'Ritardo di lancio',
      description: `${baseName}: attivazione tra ${delayTurns} turni`,
    });
    return true;
  };

  const calculations = useCharacterCalculations(selectedCharacter);
  const totalStats: Partial<CharacterStats> | undefined = calculations?.totalStats;
  const maxHealth = calculations?.maxHealth ?? 0;
  const maxActionPoints = calculations?.maxActionPoints ?? 0;
  const totalArmor = calculations?.totalArmor ?? 0;
  
  // Stati correnti per specifiche personaggio (replica logica di #Dice)
  const [currentHealth, setCurrentHealth] = useState<number>(0);
  const [currentActionPoints, setCurrentActionPoints] = useState<number>(0);
  const [currentArmor, setCurrentArmor] = useState<number>(0);

  // Sincronizza i cooldown delle magie su localStorage per condividerli con altre pagine (es. Dice.tsx)
  useEffect(() => {
    try {
      localStorage.setItem('spellCooldowns', JSON.stringify(spellCooldowns || {}));
    } catch {}
  }, [spellCooldowns]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('perTurnUses');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setPerTurnUses(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('perTurnUses', JSON.stringify(perTurnUses || {}));
    } catch {}
  }, [perTurnUses]);

  const userSpellCooldowns: Record<string, number> = React.useMemo(() => {
    if (!selectedCharacter?.id) return {};
    const prefix = `${selectedCharacter.id}:`;
    const entries = Object.entries(spellCooldowns || {})
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]);
    return Object.fromEntries(entries as any);
  }, [spellCooldowns, selectedCharacter?.id]);
  useEffect(() => {
    try {
      const spells = Array.isArray((selectedCharacter as any)?.activeSpellEvents) ? ((selectedCharacter as any).activeSpellEvents || []) : [];
      const recovs = Array.isArray((selectedCharacter as any)?.activeRecoveryEvents) ? ((selectedCharacter as any).activeRecoveryEvents || []) : [];
      setActiveSpellEvents(spells);
      setActiveRecoveryEvents(recovs);
    } catch {}
  }, [selectedCharacter, selectedCharacter?.id]);
  useEffect(() => {
    try {
      if (!selectedCharacter?.id) return;
      const currSp = Array.isArray((selectedCharacter as any)?.activeSpellEvents) ? ((selectedCharacter as any).activeSpellEvents || []) : [];
      const currRec = Array.isArray((selectedCharacter as any)?.activeRecoveryEvents) ? ((selectedCharacter as any).activeRecoveryEvents || []) : [];
      const needSp = JSON.stringify(currSp) !== JSON.stringify(activeSpellEvents || []);
      const needRec = JSON.stringify(currRec) !== JSON.stringify(activeRecoveryEvents || []);
      if (!needSp && !needRec) return;
      const updatedCharacter = { ...(selectedCharacter as any), activeSpellEvents: (activeSpellEvents || []), activeRecoveryEvents: (activeRecoveryEvents || []) } as typeof selectedCharacter;
      (async () => { await updateCharacter(updatedCharacter); })();
    } catch {}
  }, [selectedCharacter, selectedCharacter?.id, activeSpellEvents, activeRecoveryEvents, updateCharacter]);

  const selectedPosture = useMemo(() => {
    if (!selectedCharacter?.custom_abilities) return null;
    const activeId = selectedCharacter?.selectedPostureId;
    const active = selectedCharacter.custom_abilities.find((a: any) =>
      (a.category === 'Posture' || a.category === 'Tecnico' || a.subcategory === 'Posture') && (a.is_active || a.id === activeId)
    );
    return active || null;
  }, [selectedCharacter?.custom_abilities, selectedCharacter?.selectedPostureId]);
  useEffect(() => {
    if (selectedCharacter) {
      setCurrentHealth(
        (selectedCharacter as any).currentHealth ?? (selectedCharacter as any).health ?? 0
      );
      setCurrentActionPoints(
        (selectedCharacter as any).currentActionPoints ?? (selectedCharacter as any).actionPoints ?? 0
      );
      setCurrentArmor(
        (selectedCharacter as any).currentArmor ?? (selectedCharacter as any).baseArmor ?? 0
      );
    } else {
      setCurrentHealth(0);
      setCurrentActionPoints(0);
      setCurrentArmor(0);
    }
  }, [selectedCharacter, selectedCharacter?.id]);

  const addAnomaly = async (
    anomaly: StatusAnomaly,
    baseCharacterOverride?: any,
    currentOverride?: { health?: number; actionPoints?: number; armor?: number },
  ) => {
    const baseCharacter = baseCharacterOverride ?? selectedCharacter;
    if (!baseCharacter) return;
    const nextCurrentHealth =
      (currentOverride?.health != null ? Number(currentOverride.health) : Number((baseCharacter as any)?.currentHealth ?? currentHealth ?? 0)) || 0;
    const nextCurrentActionPoints =
      (currentOverride?.actionPoints != null ? Number(currentOverride.actionPoints) : Number((baseCharacter as any)?.currentActionPoints ?? currentActionPoints ?? 0)) || 0;
    const nextCurrentArmor =
      (currentOverride?.armor != null ? Number(currentOverride.armor) : Number((baseCharacter as any)?.currentArmor ?? currentArmor ?? 0)) || 0;
    const updatedCharacter = {
      ...baseCharacter,
      anomalies: [...((baseCharacter as any).anomalies || []), anomaly],
      currentHealth: nextCurrentHealth,
      currentActionPoints: nextCurrentActionPoints,
      currentArmor: nextCurrentArmor,
    } as typeof baseCharacter;
    const ok = await updateCharacter(updatedCharacter);
    if (ok) {
      setSelectedCharacter(updatedCharacter);
      setCurrentHealth(nextCurrentHealth);
      setCurrentActionPoints(nextCurrentActionPoints);
      setCurrentArmor(nextCurrentArmor);
      toast({ title: 'Successo', description: 'Anomalia aggiunta' });
      return updatedCharacter;
    } else {
      toast({ title: 'Errore', description: 'Impossibile aggiungere l\'anomalia', variant: 'destructive' });
      return null;
    }
  };

  const updateAnomaly = async (anomaly: StatusAnomaly) => {
    if (!selectedCharacter) return;
    const updatedAnomalies = (selectedCharacter.anomalies || []).map(a => a.id === anomaly.id ? anomaly : a);
    const nextCurrentHealth = Number((selectedCharacter as any)?.currentHealth ?? currentHealth ?? 0) || 0;
    const nextCurrentActionPoints = Number((selectedCharacter as any)?.currentActionPoints ?? currentActionPoints ?? 0) || 0;
    const nextCurrentArmor = Number((selectedCharacter as any)?.currentArmor ?? currentArmor ?? 0) || 0;
    const updatedCharacter = { ...selectedCharacter, anomalies: updatedAnomalies, currentHealth: nextCurrentHealth, currentActionPoints: nextCurrentActionPoints, currentArmor: nextCurrentArmor } as typeof selectedCharacter;
    const ok = await updateCharacter(updatedCharacter);
    if (ok) {
      setSelectedCharacter(updatedCharacter);
      setCurrentHealth(nextCurrentHealth);
      setCurrentActionPoints(nextCurrentActionPoints);
      setCurrentArmor(nextCurrentArmor);
      toast({ title: 'Successo', description: 'Anomalia aggiornata' });
    } else {
      toast({ title: 'Errore', description: 'Impossibile aggiornare l\'anomalia', variant: 'destructive' });
    }
  };

  const removeAnomaly = async (id: string) => {
    if (!selectedCharacter) return;
    const updatedAnomalies = (selectedCharacter.anomalies || []).filter(a => a.id !== id);
    const nextCurrentHealth = Number((selectedCharacter as any)?.currentHealth ?? currentHealth ?? 0) || 0;
    const nextCurrentActionPoints = Number((selectedCharacter as any)?.currentActionPoints ?? currentActionPoints ?? 0) || 0;
    const nextCurrentArmor = Number((selectedCharacter as any)?.currentArmor ?? currentArmor ?? 0) || 0;
    const updatedCharacter = { ...selectedCharacter, anomalies: updatedAnomalies, currentHealth: nextCurrentHealth, currentActionPoints: nextCurrentActionPoints, currentArmor: nextCurrentArmor } as typeof selectedCharacter;
    const ok = await updateCharacter(updatedCharacter);
    if (ok) {
      setSelectedCharacter(updatedCharacter);
      setCurrentHealth(nextCurrentHealth);
      setCurrentActionPoints(nextCurrentActionPoints);
      setCurrentArmor(nextCurrentArmor);
      toast({ title: 'Successo', description: 'Anomalia rimossa' });
    } else {
      toast({ title: 'Errore', description: 'Impossibile rimuovere l\'anomalia', variant: 'destructive' });
    }
  };

  const applyPassiveEffectsDirectly = async (sourceType: 'ability' | 'spell', item: any, opts?: { skipLog?: boolean; silent?: boolean }) => {
    if (!selectedCharacter) return;
    try {
      const sourceId = String(item?.id ?? item?.name ?? '').trim();
      if (!sourceId) return;

      const levelNum = Number(item?.current_level ?? item?.currentLevel ?? item?.level ?? 1) || 1;
      const levels = Array.isArray(item?.levels) ? item.levels : [];
      const levelObj = levels.find((l: any) => Number(l?.level ?? 0) === levelNum) || levels[0] || item || {};
      const passive = Array.isArray((levelObj as any)?.passive_anomalies) ? (levelObj as any).passive_anomalies : [];

      const nextAnomalies = Array.isArray((selectedCharacter as any)?.anomalies)
        ? ([...(selectedCharacter as any).anomalies] as StatusAnomaly[])
        : ([] as StatusAnomaly[]);
      let didChange = false;

      const upsert = (anom: StatusAnomaly) => {
        const idx = nextAnomalies.findIndex((a: any) => String(a?.id || '') === String((anom as any)?.id || ''));
        if (idx >= 0) {
          nextAnomalies[idx] = anom;
          didChange = true;
        } else {
          nextAnomalies.push(anom);
          didChange = true;
        }
      };

      for (let i = 0; i < passive.length; i++) {
        const a = passive[i] || {};
        const id = `passive:${sourceType}:${sourceId}:${levelNum}:${i}`;
        const name = String(a?.name ?? 'Anomalia').trim() || 'Anomalia';
        const description = String(a?.description ?? '');
        const statsModifier = (typeof a?.statsModifier === 'object' && a?.statsModifier) ? a.statsModifier : {};
        const actionPointsModifier = Number(a?.actionPointsModifier ?? 0) || 0;
        const healthModifier = Number(a?.healthModifier ?? 0) || 0;
        const armorModifier = Number(a?.armorModifier ?? (a as any)?.armor_modifier ?? (a as any)?.temp_armour ?? (a as any)?.tempArmour ?? 0) || 0;
        const turnsRaw = Number(a?.turns ?? 0) || 0;
        const turns = turnsRaw > 0 ? turnsRaw : undefined;

        const doesDamage = !!(a?.doesDamage ?? a?.does_damage);
        const damagePerTurn = Number(a?.damagePerTurn ?? a?.damage_per_turn ?? 0) || 0;
        const damageEffectId = a?.damageEffectId ?? a?.damage_effect_id ?? null;
        const damageEffectName = String(a?.damageEffectName ?? a?.damage_effect_name ?? '');

        const damageBonusEnabled = a?.damageBonusEnabled ?? a?.damage_bonus_enabled;
        const damageBonus = a?.damageBonus ?? a?.damage_bonus;
        const paDiscountEnabled = a?.paDiscountEnabled ?? a?.pa_discount_enabled;
        const paDiscount = a?.paDiscount ?? a?.pa_discount;

        const built: StatusAnomaly = {
          id,
          name,
          description,
          statsModifier,
          actionPointsModifier,
          healthModifier,
          armorModifier,
          turns,
          alwaysActive: false,
          sourceType,
          sourceId,
          ...(doesDamage && damageEffectId ? {
            damageSets: [{ damageEffectId: String(damageEffectId), effectName: damageEffectName, guaranteedDamage: damagePerTurn, additionalDamage: 0 }],
          } : {}),
          ...(damageBonusEnabled != null ? { damageBonusEnabled: !!damageBonusEnabled } : {}),
          ...(damageBonus ? { damageBonus } : {}),
          ...(paDiscountEnabled != null ? { paDiscountEnabled: !!paDiscountEnabled } : {}),
          ...(paDiscount ? { paDiscount } : {}),
        };

        upsert(built);
      }

      if (!didChange) {
        if (!opts?.skipLog) {
          const label = String(item?.name || '').trim() || (sourceType === 'ability' ? 'Abilità passiva' : 'Magia passiva');
          addCustomEntry({
            message: `${String(selectedCharacter.name || '')} attiva ${label}`,
            characterId: selectedCharacter.id,
            characterName: selectedCharacter.name,
            result: 0,
            entryType: 'action',
          });
        }
        if (!opts?.silent) toast({ title: 'Successo', description: 'Passiva attivata' });
        return selectedCharacter;
      }

      const updatedCharacter = {
        ...selectedCharacter,
        anomalies: nextAnomalies,
        currentHealth,
        currentActionPoints,
        currentArmor,
      } as typeof selectedCharacter;

      const ok = await updateCharacter(updatedCharacter);
      if (ok) {
        setSelectedCharacter(updatedCharacter);
        if (!opts?.skipLog) {
          const label = String(item?.name || '').trim() || (sourceType === 'ability' ? 'Abilità passiva' : 'Magia passiva');
          addCustomEntry({
            message: `${String(selectedCharacter.name || '')} attiva ${label}`,
            characterId: selectedCharacter.id,
            characterName: selectedCharacter.name,
            result: 0,
            entryType: 'action',
          });
        }
        if (!opts?.silent) toast({ title: 'Successo', description: 'Passiva applicata direttamente' });
        return updatedCharacter;
      } else {
        toast({ title: 'Errore', description: 'Impossibile applicare la passiva', variant: 'destructive' });
        return null;
      }
    } catch {
      toast({ title: 'Errore', description: 'Impossibile applicare la passiva', variant: 'destructive' });
      return null;
    }
  };

  const handleDirectModificationSave = async (newHealth: number, newActionPoints: number, newArmor: number) => {
    if (!selectedCharacter) return;
    const updated = { ...selectedCharacter, currentHealth: newHealth, currentActionPoints: newActionPoints, currentArmor: newArmor } as typeof selectedCharacter;
    const ok = await updateCharacter(updated);
    if (ok) {
      setSelectedCharacter(updated);
      setCurrentHealth(newHealth);
      setCurrentActionPoints(newActionPoints);
      setCurrentArmor(newArmor);
      toast({ title: 'Successo', description: 'Modifiche salvate' });
    } else {
      toast({ title: 'Errore', description: 'Impossibile salvare le modifiche', variant: 'destructive' });
    }
  };

  const handleAddDiceRollFromDirect = (roll: any) => {
    const msg = roll?.isSpecialMessage ? String(roll?.specialMessage || '') : String(roll?.description || '') || 'Modifica diretta';
    const characterId = String(roll?.characterId ?? selectedCharacter?.id ?? '');
    const characterName = String(roll?.characterName ?? selectedCharacter?.name ?? '');
    const result = Number(roll?.totalResult ?? roll?.result ?? 0) || 0;
    const diceMax = Number(roll?.maxValue ?? roll?.diceMax ?? 0) || 0;
    addCustomEntry({ message: msg, characterId, characterName, result, diceMax, entryType: 'action' });
  };

  // Helper: crea un'istanza di evocazione solo dopo conferma di successo/critico
  const tryCreateEvocationInstanceFromRoll = async (rollData: any) => {
    try {
      if (rollData?.actor?.kind === 'evocation') return;
      const damage = rollData?.damage;
      const spell = damage?.source === 'magic' ? damage?.spell : null;
      if (spell && selectedCharacter?.id) {
        const levelNum = Number(spell?.current_level) || Number(spell?.level) || Number(spell?.levels?.[0]?.level) || 1;
        const levelData = Array.isArray(spell?.levels)
          ? (spell.levels.find((l: any) => Number(l.level) === levelNum) || spell.levels[0])
          : spell;
        const evEnabled = Boolean(levelData?.evocation_enabled);
        const evTypeRaw = (levelData?.evocation_type as 'weapon' | 'entity' | 'replica' | 'energy') || undefined;
        const evType = (evTypeRaw === 'energy' ? 'entity' : evTypeRaw) as 'weapon' | 'entity' | 'replica' | undefined;
        const duration = Number(levelData?.turn_duration_rounds || 0);
        const actionCost = Number(levelData?.action_cost ?? levelData?.punti_azione ?? levelData?.indicative_action_cost ?? 0) || null;

        if (evEnabled && evType && duration > 0) {
          const payload = {
            character_id: selectedCharacter.id,
            evocation_id: null,
            name: spell?.name || 'Evocazione',
            evocation_type: evType as any,
            level: Number(levelNum || 1),
            remaining_turns: duration,
            source_type: 'magic' as const,
            source_id: String(spell?.id || ''),
            details: {
              action_cost: actionCost,
              level_data: levelData,
              equipment: (levelData as any)?.equipment ?? (levelData as any)?.entity?.equipment ?? null,
            },
          };
          try {
            const createdInstance = await createEvocationInstance(payload as any);
            toast({
              title: 'Evocazione creata',
              description: `${createdInstance.name} (${createdInstance.evocation_type}) per ${createdInstance.remaining_turns} turni`,
            });
            // Se arma evocata: equipaggia come oggetto
            if (createdInstance.evocation_type === 'weapon' && selectedCharacter) {
              const lvl = (createdInstance.details?.level_data || {}) as any;
              const weaponItem: any = {
                id: `evoked_weapon:${createdInstance.id}`,
                name: createdInstance.name || 'Arma evocata',
                type: 'arma',
                subtype: (lvl?.weapon_subtype as string) || 'una_mano',
                stats: Array.isArray(lvl?.weapon_stats)
                  ? (lvl.weapon_stats || []).reduce((acc: any, s: any) => {
                      if (s?.statKey) acc[s.statKey] = Number(s.amount || 0);
                      return acc;
                    }, {})
                  : {},
                weight: Number(lvl?.weapon_weight || 0),
                description: (lvl?.weapon_description as string) || createdInstance.name,
                damageVeloce: Number(lvl?.weapon_light_damage || 0),
                damagePesante: Number(lvl?.weapon_heavy_damage || 0),
                damageAffondo: Number(lvl?.weapon_thrust_damage || 0),
                calculatedDamageVeloce: Number(lvl?.weapon_damage_sets?.[0]?.calculated_damage_veloce || 0),
                calculatedDamagePesante: Number(lvl?.weapon_damage_sets?.[0]?.calculated_damage_pesante || 0),
                calculatedDamageAffondo: Number(lvl?.weapon_damage_sets?.[0]?.calculated_damage_affondo || 0),
                statusAnomalies: [],
                data: {
                  damage_sets: Array.isArray(lvl?.weapon_damage_sets) ? lvl.weapon_damage_sets : [],
                },
              };
              const nextEquipmentArr = Array.isArray(selectedCharacter.equipment)
                ? [...selectedCharacter.equipment, weaponItem]
                : [...Object.values((selectedCharacter as any).equipment || {}).filter(Boolean), weaponItem];
              const updatedCharacter = { ...selectedCharacter, equipment: nextEquipmentArr } as typeof selectedCharacter;
              const ok = await updateCharacter(updatedCharacter);
              if (ok) {
                setSelectedCharacter(updatedCharacter);
                toast({ title: 'Arma evocata equipaggiata', description: `${weaponItem.name} aggiunta all'equipaggiamento` });
              } else {
                toast({ title: 'Equipaggiamento non aggiornato', description: 'Impossibile equipaggiare arma evocata', variant: 'destructive' });
              }
            }
            try {
              const rows = await listEvocationInstancesByCharacter(selectedCharacter.id);
              setEvocationInstances(rows);
            } catch (e) {
              console.warn('[DiceDashboard] Reload evocations failed:', e);
            }
            await reloadAllEvocations();
          } catch (err) {
            console.error('[DiceDashboard] Errore creazione evocazione su Supabase (post-success):', err);
            toast({ title: 'Errore', description: 'Impossibile creare l\'evocazione', variant: 'destructive' });
          }
        }
      }
    } catch (e) {
      console.error('[DiceDashboard] Errore logica evocazione post-success:', e);
    }
  };

  // Crea un'anomalia di avviso livello valida per 1 turno (se presente nel tiro)
  const tryAddLevelWarningAnomalyFromRoll = async (rollData: any) => {
    try {
      const d = rollData?.damage as any;
      if (!d || d.source !== 'magic') return;
      const spell = d.spell;
      if (!spell || !selectedCharacter) return;
      let warningText: string | undefined;
      try {
        if (Array.isArray(spell?.levels) && spell?.current_level != null) {
          const lvl = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level));
          const w = (lvl?.level_warning || (lvl as any)?.levelWarning);
          warningText = (typeof w === 'string' && w.trim().length > 0) ? w : undefined;
        } else {
          const w2 = (spell?.level_warning || (spell as any)?.levelWarning);
          warningText = (typeof w2 === 'string' && w2.trim().length > 0) ? w2 : undefined;
        }
      } catch {}
      if (!warningText) return;

      const anomalyId = (typeof crypto !== 'undefined' && (crypto as any)?.randomUUID) ? (crypto as any).randomUUID() : `warning-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const anomaly = {
        id: anomalyId,
        name: spell?.name ? `Avviso: ${spell.name}` : 'Avviso livello',
        description: warningText,
        statsModifier: {},
        actionPointsModifier: 0,
        healthModifier: 0,
        turns: 1,
        sourceType: 'spell' as const,
        sourceId: String((spell as any)?.id || (spell as any)?.name || ''),
      } as StatusAnomaly;

      const updatedCharacter = {
        ...selectedCharacter,
        anomalies: [...(selectedCharacter.anomalies || []), anomaly],
        currentHealth,
        currentActionPoints,
        currentArmor,
      } as typeof selectedCharacter;
      const ok = await updateCharacter(updatedCharacter);
      if (ok) {
        setSelectedCharacter(updatedCharacter);
        toast({ title: 'Avviso livello', description: 'Warning salvato per 1 turno' });
      }
    } catch (error) {
      console.warn('[DiceDashboard] Impossibile creare anomalia warning:', error);
    }
  };

  const handleEndTurn = async () => {
    if (!selectedCharacter) {
      toast({ title: 'Termina turno', description: 'Applicazione effetti globale eseguita' });
    }
    setPerTurnUses({});
    const anomalies = selectedCharacter ? (selectedCharacter.anomalies || []) : [];
    const nextEnemyAnomsById: Record<string, StatusAnomaly[]> = {};
    const getEnemiesSnapshot = async (): Promise<any[]> => {
      let list: any[] = Array.isArray(enemies) ? enemies : [];
      if (list.length > 0) return list;
      try {
        const { data } = await supabase
          .from('enemies')
          .select('*')
          .order('name');
        list = data || [];
        setEnemies(list);
      } catch {}
      return list;
    };
    try {
      const allChars = Array.isArray(characters) ? characters : [];
      for (const ch of allChars) {
        if (selectedCharacter && String(ch.id) === String(selectedCharacter.id)) continue;
        const chAnoms = (ch.anomalies || []).filter(a => Number(a?.turns ?? 0) > 0);
        if (chAnoms.length === 0) continue;
        const names = Array.from(new Set(chAnoms.map(a => String(a?.name || '').trim()).filter(Boolean)));
        let rows: any[] = [];
        if (names.length > 0) {
          try {
            const { data } = await supabase
              .from('anomalies')
              .select('*')
              .in('name', names);
            rows = data || [];
          } catch {}
        }
        const aMap = new Map<string, any>();
        for (const r of rows) aMap.set(String(r?.name || '').trim(), r);
        const sets = chAnoms.flatMap(a => {
          const local = Array.isArray((a as any)?.damageSets) ? ((a as any).damageSets || []) : [];
          if (local.length > 0) {
            return local.map((s: any) => ({
              anomalyName: String(a?.name || ''),
              effectId: String(s?.damageEffectId || ''),
              guaranteed: Number(s?.guaranteedDamage || 0) || 0,
              additional: Number(s?.additionalDamage || 0) || 0,
            }));
          }
          const def = aMap.get(String(a?.name || '').trim());
          const stats = def?.stats || {};
          const ds = Array.isArray(stats?.damage_sets) ? stats.damage_sets : [];
          return ds.map((s: any) => ({
            anomalyName: String(a?.name || ''),
            effectId: String(s?.damageEffectId || ''),
            guaranteed: Number(s?.guaranteedDamage || 0) || 0,
            additional: Number(s?.additionalDamage || 0) || 0,
          }));
        }).filter((x: any) => x.effectId);
        let effRows: any[] = [];
        if (sets.length > 0) {
          const ids = Array.from(new Set(sets.map(s => s.effectId)));
          try {
            const { data } = await supabase
              .from('damage_effects')
              .select('*')
              .in('id', ids);
            effRows = data || [];
          } catch {}
        }
        const eMap = new Map<string, any>();
        for (const e of effRows) eMap.set(String(e?.id || ''), e);
        const sources: any[] = [];
        for (const s of sets) {
          const eff = eMap.get(s.effectId) || {};
          const amount = Math.max(0, s.guaranteed + (s.additional > 0 ? Math.floor(Math.random() * (s.additional + 1)) : 0));
          const flags: Array<'classic' | 'health' | 'armor' | 'ap'> = [];
          if (eff?.affects_health) flags.push('health');
          if (eff?.affects_armor) flags.push('armor');
          if (eff?.affects_action_points) flags.push('ap');
          if (eff?.affects_classic_damage) flags.push('classic');
          if (flags.length === 0) flags.push('classic');
          const bonus = Array.isArray(eff?.bonus_effects) ? eff.bonus_effects : [];
          if (amount > 0) {
            let appliedTotal = 0;
            for (const f of flags) {
              appliedTotal += await applyDirectToCharacter(String(ch.id), amount, f, bonus, {
                id: String(eff?.id || '') || undefined,
                name: String(eff?.name || '') || undefined,
              });
            }
            const notes = formatBonusNotes(bonus, 'classic');
            const effLabel = String(eff?.name || s.anomalyName);
            sources.push({ label: `${effLabel} ${amount}`, value: appliedTotal, detail: `Anomalia: ${s.anomalyName}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` });
          }
        }
        if (sources.length > 0) {
          const msg = `${String(ch.name || 'Personaggio')} subisce ${chAnoms.map(a => a.name).join(', ')}`;
          const total = sources.reduce((sum, src) => sum + Number(src?.value || 0), 0);
          addCustomEntry({ message: msg, characterId: ch.id, characterName: String(ch.name || ''), result: total, entryType: 'damage', damageSources: sources });
        }
        const nextList: StatusAnomaly[] = [];
        for (const a of (ch.anomalies || [])) {
          if (a.turns == null) { nextList.push(a); continue; }
          const nt = (a.turns || 0) - 1;
          if (nt > 0) nextList.push({ ...a, turns: nt });
        }
        try {
          const base = await loadFullCharacter(ch.id);
          const updatedCh = { ...(base ? (base as any) : (ch as any)), id: ch.id, anomalies: nextList } as any;
          await updateCharacter(updatedCh);
        } catch {}
      }
      const charActive = anomalies.filter(a => Number(a?.turns ?? 0) > 0);
      const charNames = Array.from(new Set(charActive.map(a => String(a?.name || '').trim()).filter(Boolean)));
      let charRows: any[] = [];
      if (charNames.length > 0) {
        try {
          const { data } = await supabase
            .from('anomalies')
            .select('*')
            .in('name', charNames);
          charRows = data || [];
        } catch {}
      }
      const charMap = new Map<string, any>();
      for (const r of charRows) charMap.set(String(r?.name || '').trim(), r);
      const charSets = charActive.flatMap(a => {
        const local = Array.isArray((a as any)?.damageSets) ? ((a as any).damageSets || []) : [];
        if (local.length > 0) {
          return local.map((s: any) => ({
            anomalyName: String(a?.name || ''),
            effectId: String(s?.damageEffectId || ''),
            guaranteed: Number(s?.guaranteedDamage || 0) || 0,
            additional: Number(s?.additionalDamage || 0) || 0,
          }));
        }
        const def = charMap.get(String(a?.name || '').trim());
        const stats = def?.stats || {};
        const ds = Array.isArray(stats?.damage_sets) ? stats.damage_sets : [];
        return ds.map((s: any) => ({
          anomalyName: String(a?.name || ''),
          effectId: String(s?.damageEffectId || ''),
          guaranteed: Number(s?.guaranteedDamage || 0) || 0,
          additional: Number(s?.additionalDamage || 0) || 0,
        }));
      }).filter((x: any) => x.effectId);
      let effectRows: any[] = [];
      if (charSets.length > 0) {
        const ids = Array.from(new Set(charSets.map(s => s.effectId)));
        try {
          const { data } = await supabase
            .from('damage_effects')
            .select('*')
            .in('id', ids);
          effectRows = data || [];
        } catch {}
      }
      const effMap = new Map<string, any>();
      for (const e of effectRows) effMap.set(String(e?.id || ''), e);
      const charSources: any[] = [];
      for (const s of charSets) {
        const eff = effMap.get(s.effectId) || {};
        const amount = Math.max(0, s.guaranteed + (s.additional > 0 ? Math.floor(Math.random() * (s.additional + 1)) : 0));
        const flags: Array<'classic' | 'health' | 'armor' | 'ap'> = [];
        if (eff?.affects_health) flags.push('health');
        if (eff?.affects_armor) flags.push('armor');
        if (eff?.affects_action_points) flags.push('ap');
        if (eff?.affects_classic_damage) flags.push('classic');
        if (flags.length === 0) flags.push('classic');
        const bonus = Array.isArray(eff?.bonus_effects) ? eff.bonus_effects : [];
        if (amount > 0) {
          let appliedTotal = 0;
          for (const f of flags) {
            appliedTotal += await applyDirectToCharacter(String(selectedCharacter.id), amount, f, bonus, {
              id: String(eff?.id || '') || undefined,
              name: String(eff?.name || '') || undefined,
            });
          }
          const notes = formatBonusNotes(bonus, 'classic');
          const effLabel = String(eff?.name || s.anomalyName);
          charSources.push({ label: `${effLabel} ${amount}`, value: appliedTotal, detail: `Anomalia: ${s.anomalyName}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` });
        }
      }
      if (charSources.length > 0) {
        const msg = `${selectedCharacter.name} subisce ${charActive.map(a => a.name).join(', ')}`;
        const total = charSources.reduce((sum, src) => sum + Number(src?.value || 0), 0);
        addCustomEntry({ message: msg, characterId: selectedCharacter?.id, characterName: selectedCharacter?.name || '', result: total, entryType: 'damage', damageSources: charSources });
      }

      const spellsActive = (activeSpellEvents || [])
        .filter((s: any) => Number(s?.remaining_turns ?? s?.turns ?? 0) > 0)
        .filter((s: any) => String(s?.kind || '') !== 'launch_delay');
      for (const s of spellsActive) {
        const targets = Array.isArray(s?.targets) ? s.targets : [];
        if (targets.length === 0) continue;
        const dets = Array.isArray(s?.damage_effects_details) ? s.damage_effects_details : [];
        if (dets.length > 0) {
          const names = Array.from(new Set(dets.map((d: any) => String(d?.name || '').trim()).filter(Boolean)));
          let rows: any[] = [];
          if (names.length > 0) {
            try {
              const { data } = await supabase
                .from('damage_effects')
                .select('*')
                .in('name', names);
              rows = data || [];
            } catch {}
          }
          const map = new Map<string, any>();
          for (const r of rows) map.set(String(r?.name || '').trim(), r);
          for (const t of targets) {
            const sources: any[] = [];
            for (const d of dets) {
              const eff = map.get(String(d?.name || '').trim()) || {};
              const amount = Math.max(0, Number(d?.guaranteed || 0) + (Number(d?.additional || 0) > 0 ? Math.floor(Math.random() * (Number(d?.additional || 0) + 1)) : 0));
              const flags: Array<'classic' | 'health' | 'armor' | 'ap'> = [];
              if (eff?.affects_health) flags.push('health');
              if (eff?.affects_armor) flags.push('armor');
              if (eff?.affects_action_points) flags.push('ap');
              if (eff?.affects_classic_damage) flags.push('classic');
              if (flags.length === 0) flags.push('classic');
              const bonus = Array.isArray(eff?.bonus_effects) ? eff.bonus_effects : [];
              if (amount > 0) {
                if (String(t?.type || '') === 'enemies') {
                  const enemy = (enemies || []).find((e: any) => String(e?.id) === String(t?.id)) || selectedEnemy;
                  if (enemy) {
                    let appliedTotal = 0;
                    for (const f of flags) {
                      appliedTotal += await applyDirectToEnemy(enemy, amount, f, bonus, {
                        id: String(eff?.id || '') || undefined,
                        name: String(eff?.name || d?.name || '') || undefined,
                      }, undefined, { silent: true });
                    }
                    const notes = formatBonusNotes(bonus, 'classic');
                    const effLabel = String(eff?.name || d?.name || 'Effetto');
                    sources.push({ label: `${effLabel} ${amount}`, value: appliedTotal, detail: `Magia: ${String(s?.name || '')}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` });
                  }
                } else if (String(t?.type || '') === 'characters') {
                  let appliedTotal = 0;
                  for (const f of flags) {
                    appliedTotal += await applyDirectToCharacter(String(t?.id || ''), amount, f, bonus, {
                      id: String(eff?.id || '') || undefined,
                      name: String(eff?.name || d?.name || '') || undefined,
                    });
                  }
                  const notes = formatBonusNotes(bonus, 'classic');
                  const effLabel = String(eff?.name || d?.name || 'Effetto');
                  sources.push({ label: `${effLabel} ${amount}`, value: appliedTotal, detail: `Magia: ${String(s?.name || '')}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` });
                } else if (String(t?.type || '') === 'evocations') {
                  let appliedTotal = 0;
                  for (const f of flags) {
                    appliedTotal += await applyDirectToEvocation(String(t?.id || ''), amount, f, bonus);
                  }
                  const notes = formatBonusNotes(bonus, 'classic');
                  const effLabel = String(eff?.name || d?.name || 'Effetto');
                  sources.push({ label: `${effLabel} ${amount}`, value: appliedTotal, detail: `Magia: ${String(s?.name || '')}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` });
                }
              }
            }
            if (sources.length > 0) {
              const msg = `${String(t?.name || '')} subisce ${String(s?.name || 'Magia')} (danno per turno)`;
              const total = sources.reduce((sum, src) => sum + Number(src?.value || 0), 0);
              addCustomEntry({ message: msg, characterId: selectedCharacter?.id, characterName: selectedCharacter?.name || '', result: total, entryType: 'damage', damageSources: sources });
            }
          }
        } else {
          const amount = Number(s?.damage_per_turn ?? 0) || 0;
          if (amount <= 0) continue;
          const effNames = Array.isArray(s?.damage_effects) ? s.damage_effects : [];
          let effRows: any[] = [];
          if (effNames.length > 0) {
            try {
              const { data } = await supabase
                .from('damage_effects')
                .select('*')
                .in('name', effNames);
              effRows = data || [];
            } catch {}
          }
          const flagsAll: Array<'classic' | 'health' | 'armor' | 'ap'> = [];
          for (const e of effRows) {
            if (e?.affects_health) flagsAll.push('health');
            if (e?.affects_armor) flagsAll.push('armor');
            if (e?.affects_action_points) flagsAll.push('ap');
            if (e?.affects_classic_damage) flagsAll.push('classic');
          }
          if (flagsAll.length === 0) flagsAll.push('classic');
          const bonus = ([] as string[]).concat(...effRows.map((e: any) => Array.isArray(e?.bonus_effects) ? e.bonus_effects : [])).filter(Boolean);
          const effForMods =
            effRows.length === 1
              ? {
                  id: String((effRows[0] as any)?.id || '') || undefined,
                  name: String((effRows[0] as any)?.name || '') || undefined,
                }
              : undefined;
          for (const t of targets) {
            let appliedAmt = 0;
            for (const f of flagsAll) {
              if (String(t?.type || '') === 'enemies') {
                const enemy = (enemies || []).find((e: any) => String(e?.id) === String(t?.id)) || selectedEnemy;
                if (enemy) appliedAmt += await applyDirectToEnemy(enemy, amount, f, bonus, effForMods, undefined, { silent: true });
              } else if (String(t?.type || '') === 'characters') {
                appliedAmt += await applyDirectToCharacter(String(t?.id || ''), amount, f, bonus, effForMods);
              } else if (String(t?.type || '') === 'evocations') {
                appliedAmt += await applyDirectToEvocation(String(t?.id || ''), amount, f, bonus);
              }
            }
            const notes = formatBonusNotes(bonus, 'classic');
            addCustomEntry({ message: `${String(t?.name || '')} subisce ${String(s?.name || 'Magia')} (danno per turno)`, characterId: selectedCharacter?.id, characterName: selectedCharacter?.name || '', result: appliedAmt, entryType: 'damage', damageSources: [{ label: `Danno/turno ${amount}`, value: appliedAmt, detail: `Magia: ${String(s?.name || '')}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` }] });
          }
        }
      }

      const enemiesForEnemyAnoms = await getEnemiesSnapshot();
      const enemiesById = new Map<string, any>();
      for (const e of (enemiesForEnemyAnoms || [])) enemiesById.set(String(e?.id || ''), e);
      const enemyIds = Array.from(
        new Set([...(Array.from(enemiesById.keys()) || []), ...Object.keys(enemyAnomaliesById || {})].filter(Boolean)),
      );
      for (const eid of enemyIds) {
        const enemy =
          enemiesById.get(String(eid)) ||
          ((selectedEnemy && String((selectedEnemy as any)?.id) === String(eid)) ? selectedEnemy : null);
        if (!enemy) continue;
        const stateList = (enemyAnomaliesById || {})?.[String(eid)];
        const storedList =
          (enemy as any)?.enemy_anomalies ??
          (enemy as any)?.enemyAnomalies ??
          (enemy as any)?.anomalies ??
          [];
        const fullList: StatusAnomaly[] =
          Array.isArray(stateList) && stateList.length > 0
            ? (stateList as StatusAnomaly[])
            : (Array.isArray(storedList) ? (storedList as StatusAnomaly[]) : []);
        const eAnoms = (fullList || []).filter((a: any) => Number(a?.turns ?? 0) > 0) as StatusAnomaly[];
        if (eAnoms.length === 0) {
          continue;
        }
          const eNames = Array.from(new Set(eAnoms.map(a => String(a?.name || '').trim()).filter(Boolean)));
          let eRows: any[] = [];
          try {
            const { data } = await supabase
              .from('anomalies')
              .select('*')
              .in('name', eNames);
            eRows = data || [];
          } catch {}
          const eMap = new Map<string, any>();
          for (const r of eRows) eMap.set(String(r?.name || '').trim(), r);
          const eSets = eAnoms.flatMap(a => {
            const local = Array.isArray((a as any)?.damageSets) ? ((a as any).damageSets || []) : [];
            if (local.length > 0) {
              return local.map((s: any) => ({
                anomalyName: String(a?.name || ''),
                effectId: String(s?.damageEffectId || ''),
                guaranteed: Number(s?.guaranteedDamage || 0) || 0,
                additional: Number(s?.additionalDamage || 0) || 0,
              }));
            }
            const def = eMap.get(String(a?.name || '').trim());
            const stats = def?.stats || {};
            const ds = Array.isArray(stats?.damage_sets) ? stats.damage_sets : [];
            return ds.map((s: any) => ({
              anomalyName: String(a?.name || ''),
              effectId: String(s?.damageEffectId || ''),
              guaranteed: Number(s?.guaranteedDamage || 0) || 0,
              additional: Number(s?.additionalDamage || 0) || 0,
            }));
          }).filter((x: any) => x.effectId);
          let eEffRows: any[] = [];
          if (eSets.length > 0) {
            const ids2 = Array.from(new Set(eSets.map(s => s.effectId)));
            try {
              const { data } = await supabase
                .from('damage_effects')
                .select('*')
                .in('id', ids2);
              eEffRows = data || [];
            } catch {}
          }
          const eEffMap = new Map<string, any>();
          for (const er of eEffRows) eEffMap.set(String(er?.id || ''), er);
          const eSources: any[] = [];
          for (const s of eSets) {
            const eff = eEffMap.get(s.effectId) || {};
            const amount = Math.max(0, s.guaranteed + (s.additional > 0 ? Math.floor(Math.random() * (s.additional + 1)) : 0));
            const flags: Array<'classic' | 'health' | 'armor' | 'ap'> = [];
            if (eff?.affects_health) flags.push('health');
            if (eff?.affects_armor) flags.push('armor');
            if (eff?.affects_action_points) flags.push('ap');
            if (eff?.affects_classic_damage) flags.push('classic');
            if (flags.length === 0) flags.push('classic');
            const bonus = Array.isArray(eff?.bonus_effects) ? eff.bonus_effects : [];
            if (amount > 0) {
              let appliedTotal = 0;
              for (const f of flags) {
                appliedTotal += await applyDirectToEnemy(enemy, amount, f, bonus, {
                  id: String(eff?.id || '') || undefined,
                  name: String(eff?.name || '') || undefined,
                });
              }
              const notes = formatBonusNotes(bonus, 'classic');
              const effLabel = String(eff?.name || s.anomalyName);
              eSources.push({ label: `${effLabel} ${amount}`, value: appliedTotal, detail: `Anomalia: ${s.anomalyName}${notes ? ` - ${notes.replace(/^Bonus:\s*/, '')}` : ''}` });
            }
          }
          if (eSources.length > 0) {
            const msg2 = `${enemy?.name || 'Nemico'} subisce ${eAnoms.map(a => a.name).join(', ')}`;
            const total2 = eSources.reduce((sum, src) => sum + Number(src?.value || 0), 0);
            addCustomEntry({ message: msg2, characterId: selectedCharacter?.id, characterName: selectedCharacter?.name || '', result: total2, entryType: 'damage', damageSources: eSources });
          }
          const nextList: StatusAnomaly[] = [];
          let changed = false;
          for (const a of (fullList || [])) {
            if (a?.turns == null) {
              nextList.push(a);
              continue;
            }
            const nt = (Number(a.turns || 0) || 0) - 1;
            changed = true;
            if (nt > 0) nextList.push({ ...a, turns: nt });
          }
          if (changed) {
            nextEnemyAnomsById[String(eid)] = nextList;
            await persistEnemyAnomalies(String(eid), nextList);
          }
      }
    } catch {}
    if (Object.keys(nextEnemyAnomsById).length > 0) {
      setEnemyAnomaliesById((prev) => ({ ...(prev || {}), ...nextEnemyAnomsById }));
    }
    let evocations: any[] = Array.isArray(allEvocationInstances) ? (allEvocationInstances || []) : [];
    try {
      const fresh = await listAllEvocationInstances();
      if (Array.isArray(fresh)) {
        evocations = fresh;
        setAllEvocationInstances(fresh);
      }
    } catch {}
    const spells = activeSpellEvents || [];
    const recoveries = activeRecoveryEvents || [];
    if (anomalies.length === 0 && evocations.length === 0 && spells.length === 0 && recoveries.length === 0) {
      toast({ title: 'Nessun effetto', description: 'Non ci sono anomalie, evocazioni, magie o recuperi da aggiornare' });
      return;
    }
    const expired: StatusAnomaly[] = [];
    const updatedAnomalies: StatusAnomaly[] = [];
    for (const a of anomalies) {
      if (a.turns == null) {
        updatedAnomalies.push(a);
        continue;
      }
      const newTurns = (a.turns || 0) - 1;
      if (newTurns <= 0) {
        expired.push(a);
      } else {
        updatedAnomalies.push({ ...a, turns: newTurns });
      }
    }
    // Gestione magie a turni (client-side): decrementa e rimuovi scadute
    const expiredSpells: any[] = [];
    const updatedSpells: any[] = [];
    for (const s of spells) {
      const curr = Number(s.remaining_turns ?? s.turns ?? 0);
      const newTurns = curr - 1;
      if (newTurns <= 0) {
        expiredSpells.push(s);
      } else {
        updatedSpells.push({ ...s, remaining_turns: newTurns });
      }
    }
    setActiveSpellEvents(updatedSpells);
    const expiredLaunchDelay = expiredSpells.filter((s: any) => String(s?.kind || '') === 'launch_delay' && (s as any)?.delayed_roll?.rollData);
    for (const ev of expiredLaunchDelay) {
      try {
        if (!selectedCharacter) continue;
        const stored = (ev as any)?.delayed_roll || {};
        const raw = stored?.rollData;
        if (!raw) continue;
        const isCrit = Boolean(stored?.isCritical);
        const rollData = JSON.parse(JSON.stringify(raw));
        const entry = addDamageEntryFromModalRoll(selectedCharacter as any, rollData, isCrit, calculations);
        try { await appendTargetResWeakToHistoryIfNeeded(rollData, entry); } catch {}
        try {
          const totalDamage = Number(entry?.result ?? 0);
          if (totalDamage > 0) {
            await applyDirectDamageFromRoll(rollData, totalDamage, entry?.id, entry?.damageSources);
          }
        } catch {}
        try { await tryCreateEvocationInstanceFromRoll(rollData); } catch {}
        try { await tryAddLevelWarningAnomalyFromRoll(rollData); } catch {}
        try { await tryAddActiveSpellEventFromRoll(rollData); } catch {}
        try { await applySelfEffectsFromRoll(rollData); } catch {}
        try { await tryApplyLevelAnomaliesToTargetsFromRoll(rollData, selectedCharacter); } catch {}
        toast({ title: 'Ritardo di lancio', description: `${String(ev?.name || 'Effetto')} attivato` });
      } catch {}
    }
    // Gestione Recupero (client-side): decrementa cooldown e rimuovi scaduti
    const expiredRecoveries: any[] = [];
    const updatedRecoveries: any[] = [];
    let nextCooldowns: Record<string, number> = { ...spellCooldowns };
    for (const r of recoveries) {
      const curr = Number(r.remaining_turns ?? 0);
      const newTurns = curr - 1;
      const sid = String(r.spellId ?? '');
      // Chiave per cooldown specifico del proprietario
      const key = r.ownerId && sid ? `${r.ownerId}:${sid}` : '';
      if (key) {
        const currCd = Number(nextCooldowns[key] ?? 0);
        const nextCd = Math.max(0, currCd - 1);
        if (nextCd <= 0) {
          delete nextCooldowns[key];
        } else {
          nextCooldowns[key] = nextCd;
        }
      }
      if (newTurns <= 0) {
        expiredRecoveries.push(r);
      } else {
        updatedRecoveries.push({ ...r, remaining_turns: newTurns });
      }
    }
    const pendingStarts = pendingRecoveryStartsRef.current || {};
    const pendingValues = Object.values(pendingStarts).filter((p) => (Number((p as any)?.turns ?? 0) || 0) > 0);
    if (pendingValues.length > 0) {
      const now = Date.now();
      const pendingEvents = pendingValues.map((p: any, idx: number) => ({
        id: `recovery-${now}-${Math.random().toString(36).slice(2)}`,
        spellId: String(p?.sid ?? ''),
        name: String(p?.name ?? 'Recupero'),
        description: String(p?.description ?? 'Cooldown'),
        remaining_turns: Number(p?.turns ?? 0) || 0,
        ownerId: String(p?.ownerId ?? ''),
        ownerName: String(p?.ownerName ?? ''),
        created_at: now + idx,
      }));
      for (const p of pendingValues as any[]) {
        const k = p?.ownerId && p?.sid ? `${String(p.ownerId)}:${String(p.sid)}` : '';
        if (!k) continue;
        const nt = Number(p?.turns ?? 0) || 0;
        if (nt <= 0) continue;
        nextCooldowns[k] = Math.max(Number(nextCooldowns[k] ?? 0) || 0, nt);
      }
      pendingRecoveryStartsRef.current = {};
      setActiveRecoveryEvents([...updatedRecoveries, ...pendingEvents]);
    } else {
      setActiveRecoveryEvents(updatedRecoveries);
    }
    setSpellCooldowns(nextCooldowns);
    // Gestione evocazioni su Supabase: decrementa e rimuovi scadute (globalmente)
    const expiredEvocations: any[] = [];
    const expiredEvokedWeaponItemIdsByCharacter = new Map<string, string[]>();
    for (const e of evocations) {
      const curr = Number(e.remaining_turns ?? e.remainingTurns ?? 0);
      const newTurns = curr - 1;
      if (newTurns <= 0) {
        try { await deleteEvocationInstance(e.id); } catch {}
        expiredEvocations.push(e);
        if (String(e.evocation_type) === 'weapon') {
          const charId = String(e.character_id || '');
          if (charId) {
            const list = expiredEvokedWeaponItemIdsByCharacter.get(charId) || [];
            list.push(`evoked_weapon:${e.id}`);
            expiredEvokedWeaponItemIdsByCharacter.set(charId, list);
          }
        }
      } else {
        try { await updateEvocationInstanceTurns(e.id, newTurns); } catch {}
      }
    }

    const cleanupExpiredEvokedWeaponsForOtherCharacters = async () => {
      for (const [characterId, itemIds] of expiredEvokedWeaponItemIdsByCharacter.entries()) {
        if (!characterId || itemIds.length === 0) continue;
        if (selectedCharacter && String(selectedCharacter.id) === String(characterId)) continue;
        try {
          const base = await loadFullCharacter(characterId);
          if (!base) continue;
          const currEquipment = Array.isArray((base as any)?.equipment)
            ? (base as any).equipment
            : Object.values((base as any)?.equipment || {}).filter(Boolean);
          const nextEquipment = (currEquipment || []).filter((it: any) => !itemIds.includes(String(it?.id || '')));
          if (nextEquipment.length === (currEquipment || []).length) continue;
          const updated = { ...(base as any), id: characterId, equipment: nextEquipment } as any;
          await updateCharacter(updated);
        } catch {}
      }
    };
    await cleanupExpiredEvokedWeaponsForOtherCharacters();

    if (!selectedCharacter) {
      await reloadAllEvocations();
      const expiredEvocNames = expiredEvocations.map((e: any) => e.name).filter(Boolean).join(', ');
      toast({
        title: 'Turno terminato',
        description: expiredEvocations.length ? `Evocazioni scadute: ${expiredEvocations.length}${expiredEvocNames ? ` (${expiredEvocNames})` : ''}` : 'Effetti aggiornati',
      });
      return;
    }

    const expiredWeaponItemIdsForSelected = expiredEvokedWeaponItemIdsByCharacter.get(String(selectedCharacter.id)) || [];
    const currSelEquipment = Array.isArray((selectedCharacter as any).equipment)
      ? [...((selectedCharacter as any).equipment || [])]
      : (Object.values((selectedCharacter as any).equipment || {}).filter(Boolean) as any[]);
    const nextEquipmentArr = expiredWeaponItemIdsForSelected.length > 0
      ? currSelEquipment.filter((it: any) => !expiredWeaponItemIdsForSelected.includes(String(it?.id || '')))
      : currSelEquipment;

    const baseChar = await loadFullCharacter(selectedCharacter.id);
    const updatedCharacter = { ...(baseChar ? (baseChar as any) : (selectedCharacter as any)), id: selectedCharacter.id, anomalies: updatedAnomalies, equipment: nextEquipmentArr } as typeof selectedCharacter;
    const ok = await updateCharacter(updatedCharacter);
    if (ok) {
      setSelectedCharacter(updatedCharacter);
      try {
        const rows = await listEvocationInstancesByCharacter(selectedCharacter.id);
        setEvocationInstances(rows);
      } catch {}
      await reloadAllEvocations();
      const expiredNames = expired.map(e => e.name).filter(Boolean).join(', ');
      const expiredEvocNames = expiredEvocations.map((e: any) => e.name).filter(Boolean).join(', ');
      const expiredSpellNames = expiredSpells.map((e: any) => e.name).filter(Boolean).join(', ');
      const expiredRecoveryNames = expiredRecoveries.map((e: any) => e.name).filter(Boolean).join(', ');
      toast({
        title: 'Turno terminato',
        description: (expired.length || expiredEvocations.length || expiredSpells.length || expiredRecoveries.length)
          ? `Anomalie scadute: ${expired.length}${expiredNames ? ` (${expiredNames})` : ''}. Evocazioni scadute: ${expiredEvocations.length}${expiredEvocNames ? ` (${expiredEvocNames})` : ''}. Magie scadute: ${expiredSpells.length}${expiredSpellNames ? ` (${expiredSpellNames})` : ''}. Recuperi scaduti: ${expiredRecoveries.length}${expiredRecoveryNames ? ` (${expiredRecoveryNames})` : ''}`
          : 'Effetti aggiornati',
      });
    } else {
      toast({ title: 'Errore', description: 'Impossibile terminare il turno', variant: 'destructive' });
    }
  };

  const useSelectedInventoryItem = async () => {
    if (!selectedCharacter || !selectedInventoryItem) {
      toast({ title: 'Nessun oggetto', description: 'Seleziona un oggetto da usare', variant: 'destructive' });
      return;
    }
    const qty = Math.max(1, Math.floor(quantityToUse || 1));
    const currentQty = selectedInventoryItem.quantity || 0;
    if (qty > currentQty) {
      toast({ title: 'Quantità non valida', description: `Disponibili: ${currentQty}`, variant: 'destructive' });
      return;
    }
    const updatedInventory = (selectedCharacter.inventory || [])
      .map(item => {
        if (item.id !== selectedInventoryItem.id) return item;
        const newQty = (item.quantity || 0) - qty;
        return { ...item, quantity: newQty };
      })
      .filter(item => (item.quantity || 0) > 0);

    const updatedCharacter = { ...selectedCharacter, inventory: updatedInventory } as typeof selectedCharacter;
    const ok = await updateCharacter(updatedCharacter);
    if (ok) {
      setSelectedCharacter(updatedCharacter);
      setSelectedInventoryItem(null);
      setQuantityToUse(1);
      setShowInventoryModal(false);
      toast({ title: 'Oggetto usato', description: `${selectedInventoryItem.name} x${qty} usato` });
    } else {
      toast({ title: 'Errore', description: 'Impossibile usare l\'oggetto', variant: 'destructive' });
    }
  };

  const useSelectedPotionItem = async () => {
    if (!selectedCharacter || !selectedPotionItem) {
      toast({ title: 'Nessuna pozione', description: 'Seleziona una pozione da usare', variant: 'destructive' });
      return;
    }
    if (isUsingPotion) return;
    setIsUsingPotion(true);
    const immunityState = getCharacterImmunityState(selectedCharacter);
    const qty = Math.max(1, Math.floor(quantityToUsePotion || 1));
    const currentQty = selectedPotionItem.quantity || 0;
    if (qty > currentQty) {
      toast({ title: 'Quantità non valida', description: `Disponibili: ${currentQty}`, variant: 'destructive' });
      setIsUsingPotion(false);
      return;
    }
    try {
      let totalApplied = 0;
      const agg: Record<string, number> = {};
      const sets = Array.isArray(selectedPotionItem.damageSets) ? (selectedPotionItem.damageSets || []) : [];
      const ids = Array.from(new Set(sets.map((s: any) => String(s?.damageEffectId || '')).filter(Boolean)));
      let idMap: Record<string, any> = {};
      if (ids.length > 0) {
        try {
          const { data, error } = await supabase
            .from('damage_effects')
            .select('id, name, affects_action_points, affects_health, affects_armor, affects_classic_damage, bonus_effects')
            .in('id', ids);
          if (error) throw error;
          for (const r of (data || [])) idMap[String(r.id)] = r;
        } catch {}
      }
      const toSelfSets = ((): any[] => {
        const arr: any[] = [];
        for (const s of sets) {
          const effName = s.effect_name || (idMap[String(s.damageEffectId || '')]?.name);
          if (!effName) continue;
          arr.push({
            effect_name: String(effName),
            mode: 'classic',
            guaranteed_damage: Number((s as any).guaranteedDamage ?? 0) || 0,
            max_damage: Number((s as any).additionalDamage ?? 0) || 0,
          });
        }
        return arr;
      })();
      const effectsNames = Array.from(new Set(toSelfSets.map((x: any) => String(x.effect_name || '').trim()).filter(Boolean)));
      if (toSelfSets.length > 0) {
        for (let i = 0; i < qty; i++) {
          const res = await applySelfDamageSetsFromLevel(toSelfSets, selectedPotionItem.name, true);
          totalApplied += Number((res as any)?.totalApplied || 0);
          const srcs: Array<{ eff: string; val: number }> = ((res as any)?.sources || []);
          for (const s of srcs) {
            const k = String(s.eff || '').trim();
            if (!k) continue;
            agg[k] = (agg[k] || 0) + (Number(s.val || 0) || 0);
          }
        }
      }
      const anomalyNames: string[] = [];
      if (selectedPotionItem.anomaly) {
        const a = selectedPotionItem.anomaly as StatusAnomaly;
        const payload = {
          ...a,
          id: String(a.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
          sourceType: 'manual' as const,
          sourceId: String(selectedPotionItem.id),
        } as StatusAnomaly;
        if (!isImmuneToAnomaly(immunityState, { id: payload.id, name: String(payload.name || '').trim() })) {
          await addAnomaly(payload);
          anomalyNames.push(String(payload.name || '').trim());
        }
      } else if (selectedPotionItem.anomalyId) {
        try {
          const row = await (async () => {
            const { data, error } = await supabase
              .from('anomalies')
              .select('*')
              .eq('id', String(selectedPotionItem.anomalyId))
              .maybeSingle();
            if (error) throw error;
            return data;
          })();
          const stats = (row as any)?.stats || {};
          const actionPointsModifier = Number(
            (row as any)?.actionPointsModifier ??
              (row as any)?.action_points_modifier ??
              (row as any)?.temp_action_points ??
              (row as any)?.tempActionPoints ??
              0,
          ) || 0;
          const healthModifier = Number((row as any)?.healthModifier ?? (row as any)?.health_modifier ?? (row as any)?.temp_health ?? (row as any)?.tempHealth ?? 0) || 0;
          const armorModifier = Number((row as any)?.armorModifier ?? (row as any)?.armor_modifier ?? (row as any)?.temp_armour ?? (row as any)?.tempArmour ?? 0) || 0;
          const statsModifier = (stats?.stats_modifier || stats?.statsModifier || (row as any)?.statsModifier || (row as any)?.stats_modifier || {
            forza: 0, percezione: 0, resistenza: 0,
            intelletto: 0, agilita: 0, sapienza: 0, anima: 0,
          });
          const damageSets = Array.isArray((row as any)?.damageSets)
            ? (row as any).damageSets
            : (Array.isArray(stats?.damage_sets) ? stats.damage_sets : undefined);
          const damageBonusEnabled = !!(((row as any)?.damageBonusEnabled ?? (row as any)?.damage_bonus_enabled) ?? (stats?.damage_bonus_enabled ?? stats?.damageBonusEnabled));
          const damageBonus = ((row as any)?.damageBonus ?? (row as any)?.damage_bonus ?? stats?.damage_bonus ?? stats?.damageBonus) || undefined;
          const paDiscountEnabled = !!(((row as any)?.paDiscountEnabled ?? (row as any)?.pa_discount_enabled) ?? (stats?.pa_discount_enabled ?? stats?.paDiscountEnabled));
          const paDiscount = ((row as any)?.paDiscount ?? (row as any)?.pa_discount ?? stats?.pa_discount ?? stats?.paDiscount) || undefined;
          const a: StatusAnomaly = {
            id: String(row?.id || selectedPotionItem.anomalyId),
            name: String(row?.name || ''),
            description: String(row?.description || ''),
            actionPointsModifier,
            healthModifier,
            armorModifier,
            turns: (row as any)?.turns ?? undefined,
            statsModifier,
            damageSets: Array.isArray(damageSets) ? damageSets.map((ds: any) => ({
              damageEffectId: ds.damageEffectId ?? ds.damage_effect_id,
              effectName: ds.effect_name ?? ds.effectName,
              guaranteedDamage: Number(ds.guaranteedDamage ?? ds.guaranteed_damage ?? 0) || 0,
              additionalDamage: Number(ds.additionalDamage ?? ds.additional_damage ?? 0) || 0,
            })) : undefined,
            sourceType: 'manual',
            sourceId: String(selectedPotionItem.id),
            damageBonusEnabled,
            damageBonus,
            paDiscountEnabled,
            paDiscount,
          } as any;
          if (!isImmuneToAnomaly(immunityState, { id: a.id, name: String(a.name || '').trim() })) {
            await addAnomaly(a);
            anomalyNames.push(String(a.name || '').trim());
          }
        } catch {}
      }
      const parts: string[] = [];
      const charName = String(selectedCharacter.name || '').trim();
      const potName = String(selectedPotionItem.name || '').trim();
      parts.push(`${charName} usa ${potName}`);
      if (effectsNames.length > 0) parts.push(`applicando ${effectsNames.join(', ')}`);
      if (anomalyNames.length > 0) parts.push(`Anomalie ${anomalyNames.join(', ')}`);
      if (totalApplied > 0) parts.push(`Risultato ${totalApplied}`);
      const msg = parts.join(', ') + '.';
      const damageSources = Object.entries(agg).map(([label, value]) => ({ label, value }));
      addCustomEntry({ message: msg, characterId: selectedCharacter.id, characterName: selectedCharacter.name, result: totalApplied, entryType: 'damage', damageSources });

      const updatedPotions = (selectedCharacter.potions || [])
        .map(p => {
          if (p.id !== selectedPotionItem.id) return p;
          const newQty = (p.quantity || 0) - qty;
          return { ...p, quantity: newQty } as Potion;
        })
        .filter(p => (p.quantity || 0) > 0);
      const updatedCharacter = { ...selectedCharacter, potions: updatedPotions } as typeof selectedCharacter;
      const ok = await updateCharacter(updatedCharacter);
      if (ok) {
        setSelectedCharacter(updatedCharacter);
        setSelectedPotionItem(null);
        setQuantityToUsePotion(1);
        setShowInventoryModal(false);
        toast({ title: 'Pozione usata', description: `${selectedPotionItem.name} x${qty} usata` });
      } else {
        toast({ title: 'Errore', description: 'Impossibile usare la pozione', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Errore', description: 'Uso pozione non riuscito', variant: 'destructive' });
    } finally {
      setIsUsingPotion(false);
    }
  };

  return (
    <div className="w-full px-4 md:px-6 py-4 space-y-4">
      {/* Barra superiore con due pulsanti */}
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="secondary">Torna alla home</Button>
        </Link>
        <Link to="/character">
          <Button variant="secondary">Personaggi</Button>
        </Link>
      </div>

      {/* Pannello grande: Statistiche totali */}
      <Box className="w-full">
        <div className="text-center font-medium mb-4">Statistiche totali</div>
        {selectedCharacter && totalStats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Forza</p>
              <p className="text-sm text-muted-foreground">{totalStats.forza ?? 0}</p>
            </div>
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Percezione</p>
              <p className="text-sm text-muted-foreground">{totalStats.percezione ?? 0}</p>
            </div>
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Resistenza</p>
              <p className="text-sm text-muted-foreground">{totalStats.resistenza ?? 0}</p>
            </div>
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Intelletto</p>
              <p className="text-sm text-muted-foreground">{totalStats.intelletto ?? 0}</p>
            </div>
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Agilità</p>
              <p className="text-sm text-muted-foreground">{totalStats.agilita ?? 0}</p>
            </div>
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Sapienza</p>
              <p className="text-sm text-muted-foreground">{totalStats.sapienza ?? 0}</p>
            </div>
            <div className="bg-muted p-2 rounded">
              <p className="font-semibold">Anima</p>
              <p className="text-sm text-muted-foreground">{totalStats.anima ?? 0}</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center">
            Seleziona un personaggio per vedere le statistiche totali
          </div>
        )}
      </Box>

      {/* Barra azioni sotto statistiche totali */}
      <div className="border rounded-md p-3 flex flex-wrap gap-3 bg-background">
        <Button size="sm" variant="default" onClick={() => setShowCharacterSelector(true)}>Personaggio</Button>
        <Button size="sm" variant="default" onClick={() => setShowCharacterSheet(true)}>Scheda</Button>
        <Button size="sm" variant="default" onClick={() => setShowPostureModal(true)}>Postura</Button>
        <Button size="sm" variant="default" onClick={() => setShowAnomaliesModal(true)}>Anomalie</Button>
        <Button size="sm" variant="default" onClick={() => setShowInventoryModal(true)}>Inventario</Button>
        <Button size="sm" variant="default" onClick={() => setShowStatSelectionModal(true)}>Lancio dado</Button>
        <Button size="sm" variant="secondary" onClick={() => setIsModificationModalOpen(true)}>Modifica diretta</Button>
        <Button size="sm" variant="secondary" onClick={() => setShowPassiveActivationModal(true)}>Attiva passiva</Button>
        <div className="ml-auto flex gap-3">
          <Button size="sm" variant="default" onClick={handleEndTurn}>Termina turno</Button>
          <Button size="sm" variant="destructive" onClick={handleClearHistory}>Elimina</Button>
          <Button size="sm" variant="secondary" onClick={handleRefreshHistory}>Aggiorna</Button>
      </div>
      </div>

      {/* Lista eventi attivi spostata in modale: qui rimossa */}

      <CharacterSelector
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        currentCharacterId={selectedCharacter?.id}
        onCharacterSelect={(characterId) => {
          const char = characters.find((c) => c.id === characterId);
          if (char) {
            setSelectedCharacter(char);
          } else {
            loadFullCharacter(characterId).then((full) => {
              if (full) setSelectedCharacter({ ...full, id: characterId } as any);
            });
          }
        }}
      />

      <CharacterSheet
        open={showCharacterSheet}
        onOpenChange={setShowCharacterSheet}
        character={selectedCharacter ?? null}
      />

      <PostureSelectionModal
        isOpen={showPostureModal}
        onOpenChange={setShowPostureModal}
        character={selectedCharacter ?? null}
        characterId={selectedCharacter?.id}
        onCharacterUpdate={(updated) => setSelectedCharacter(updated)}
      />

      <DirectModificationModal
        isOpen={isModificationModalOpen}
        onClose={() => setIsModificationModalOpen(false)}
        character={selectedCharacter ?? null}
        currentHealth={currentHealth}
        currentActionPoints={currentActionPoints}
        currentArmor={currentArmor}
        maxHealth={maxHealth}
        maxActionPoints={maxActionPoints}
        totalArmor={totalArmor}
        onSave={handleDirectModificationSave}
        onAddDiceRoll={handleAddDiceRollFromDirect}
      />

      <Dialog open={showPassiveActivationModal} onOpenChange={setShowPassiveActivationModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attiva passiva</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                variant={passiveActivationTab === 'abilities' ? 'default' : 'secondary'}
                onClick={() => setPassiveActivationTab('abilities')}
              >
                Abilità
              </Button>
              <Button
                size="sm"
                variant={passiveActivationTab === 'magic' ? 'default' : 'secondary'}
                onClick={() => setPassiveActivationTab('magic')}
              >
                Magie
              </Button>
              <div className="flex-1 min-w-[200px]">
                <Input
                  value={passiveActivationQuery}
                  onChange={(e) => setPassiveActivationQuery(e.target.value)}
                  placeholder="Cerca..."
                />
              </div>
            </div>

            <ScrollArea className="max-h-[65vh] pr-2">
              {(() => {
                const q = passiveActivationQuery.trim().toLowerCase();
                const list = passiveActivationTab === 'abilities'
                  ? (Array.isArray((selectedCharacter as any)?.custom_abilities) ? (selectedCharacter as any).custom_abilities : []).filter((a: any) => String(a?.type || '').toLowerCase() === 'passiva')
                  : (Array.isArray((selectedCharacter as any)?.custom_spells) ? (selectedCharacter as any).custom_spells : []).filter((s: any) => String(s?.type || '').toLowerCase() === 'passiva');
                const filtered = list.filter((it: any) => {
                  if (!q) return true;
                  const name = String(it?.name || '').toLowerCase();
                  const desc = String(it?.description || '').toLowerCase();
                  return name.includes(q) || desc.includes(q);
                });
                const sorted = [...filtered].sort((a: any, b: any) =>
                  String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' })
                );
                if (!selectedCharacter) {
                  return <div className="text-sm text-muted-foreground">Seleziona un personaggio.</div>;
                }
                if (sorted.length === 0) {
                  return <div className="text-sm text-muted-foreground">Nessuna passiva trovata.</div>;
                }
                return (
                  <div className="space-y-2">
                    {sorted.map((it: any, idx: number) => (
                      <div key={`${String(it?.id || it?.name || idx)}`} className="border rounded p-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{String(it?.name || 'Senza nome')}</div>
                          {String(it?.description || '').trim() ? (
                            <div className="text-xs text-muted-foreground line-clamp-2">{String(it?.description || '')}</div>
                          ) : null}
                        </div>
                        {(() => {
                          const sourceType = passiveActivationTab === 'abilities' ? 'ability' : 'spell';
                          const itemId = String(it?.id ?? it?.name ?? '').trim();
                          const limit = getMaxUsesPerTurnFromItem(it);
                          const usesKey = itemId && selectedCharacter?.id ? `${String(selectedCharacter.id)}:${sourceType}:${itemId}` : '';
                          const used = usesKey ? (Number((perTurnUses || {})[usesKey] ?? 0) || 0) : 0;
                          const isPerTurnBlocked = limit > 0 && used >= limit;
                          const cdKey = sourceType === 'spell' && itemId && selectedCharacter?.id ? `${String(selectedCharacter.id)}:${itemId}` : '';
                          const cdTurns = cdKey ? (Number((spellCooldowns || {})[cdKey] ?? 0) || 0) : 0;
                          const isCooldownBlocked = sourceType === 'spell' && cdTurns > 0;
                          const disabled = isPerTurnBlocked || isCooldownBlocked;
                          return (
                            <div className="flex items-center gap-2">
                              {isCooldownBlocked ? (<Badge variant="secondary" className="text-xs">in recupero: {cdTurns}</Badge>) : null}
                              {limit > 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  usi turno: {Math.max(0, Math.floor(used))}/{limit}
                                </Badge>
                              ) : null}
                              {isPerTurnBlocked ? (<Badge variant="secondary" className="text-xs">limite turno</Badge>) : null}
                              <Button
                                size="sm"
                                variant="default"
                                disabled={disabled}
                                onClick={() => {
                                  if (disabled) return;
                                  setPendingPassiveActivation({ sourceType, item: it });
                                  setShowPassiveActivationModal(false);
                                  setShowStatSelectionModal(true);
                                }}
                              >
                                Usa
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnomaliesModal} onOpenChange={setShowAnomaliesModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Anomalie</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-2">
            <CharacterAnomalies
              anomalies={selectedCharacter?.anomalies || []}
              onAddAnomaly={addAnomaly}
              onUpdateAnomaly={updateAnomaly}
              onRemoveAnomaly={removeAnomaly}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modale Eventi attivi (anomalie a turni + evocazioni globali) */}
      <Dialog open={showActiveEventsModal} onOpenChange={(v) => { setShowActiveEventsModal(v); if (v) reloadAllEvocations(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Eventi attivi</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Anomalie a turni</div>
                <Badge variant="secondary">{activeAnomalyEvents.length}</Badge>
              </div>
              {activeAnomalyEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessuna anomalia a turni attiva</div>
              ) : (
                <div ref={anomaliesScrollRef} className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                  {activeAnomalyEvents.map((a, idx) => (
                    <div key={`${a.id || idx}-${a.ownerId}`} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">Turni rimanenti: {Number(a.turns ?? 0)}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground mt-1">{String(a.description)}</div>
                        )}
                      </div>
                      <Badge variant="outline">{a.ownerName}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Anomalie nemici a turni</div>
                <Badge variant="secondary">{activeEnemyAnomalyEvents.length}</Badge>
              </div>
              {activeEnemyAnomalyEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessuna anomalia nemico a turni attiva</div>
              ) : (
                <div className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                  {activeEnemyAnomalyEvents.map((a, idx) => (
                    <div key={`${a.id || idx}-${a.ownerId}`} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">Turni rimanenti: {Number(a.turns ?? 0)}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground mt-1">{String(a.description)}</div>
                        )}
                      </div>
                      <Badge variant="outline">{a.ownerName}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Magie a turni</div>
                <Badge variant="secondary">{activeSpellEvents.length}</Badge>
              </div>
              {activeSpellEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessuna magia a turni attiva</div>
              ) : (
                <div ref={spellsScrollRef} className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                  {sortedActiveSpellEvents.map((s: any, idx: number) => {
                    const targets = Array.isArray(s?.targets) ? s.targets : [];
                    return (
                      <div key={`${s.id || idx}`} className="border rounded p-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">Turni rimanenti: {Number(s.remaining_turns ?? 0)}</div>
                          {s.description && (
                            <div className="text-xs text-muted-foreground mt-1">{String(s.description)}</div>
                          )}
                          {Number(s?.damage_per_turn ?? 0) > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">Danno/turno: {Number(s.damage_per_turn)}</div>
                          )}
                          {Array.isArray(s?.damage_effects_details) && s.damage_effects_details.length > 0 ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              Effetti:
                              {s.damage_effects_details.map((e: any, i: number) => {
                                const parts: string[] = [];
                                if (Number(e?.guaranteed || 0) > 0) parts.push(`Assicurato: ${Number(e.guaranteed)}`);
                                if (Number(e?.additional || 0) > 0) parts.push(`Aggiuntivo: ${Number(e.additional)}`);
                                const suffix = parts.length ? ` — ${parts.join(' • ')}` : '';
                                return (
                                  <div key={`${e?.name || i}`}>{String(e?.name || 'Effetto')}{suffix}</div>
                                );
                              })}
                            </div>
                          ) : (
                            Array.isArray(s?.damage_effects) && s.damage_effects.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">Effetto: {s.damage_effects.join(', ')}</div>
                            )
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          {targets.length > 0 ? (
                            targets.map((t: any, i: number) => (
                              <Badge key={`${t.id || i}`} variant="outline">{t.name}</Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Nessun bersaglio</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Recupero</div>
                <Badge variant="secondary">{activeRecoveryEvents.length}</Badge>
              </div>
              {activeRecoveryEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessun recupero attivo</div>
              ) : (
                <div ref={recoveryScrollRef} className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                  {sortedActiveRecoveryEvents.map((r: any, idx: number) => (
                    <div key={`${r.id || idx}`} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">Turni rimanenti: {Number(r.remaining_turns ?? 0)}</div>
                        {r.description && (
                          <div className="text-xs text-muted-foreground mt-1">{String(r.description)}</div>
                        )}
                      </div>
                      <Badge variant="outline">{r.ownerName}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Evocazioni</div>
                <Badge variant="secondary">{activeGlobalEvocations.length}</Badge>
              </div>
              {loadingAllEvocations ? (
                <div className="text-sm text-muted-foreground">Caricamento evocazioni...</div>
              ) : activeGlobalEvocations.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessuna evocazione attiva</div>
              ) : (
                <div ref={evocationsScrollRef} className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                  {activeGlobalEvocations.map((ev: any) => {
                    const level = (ev?.details?.level_data || {}) as any;
                    const n = (v: unknown): number => Number(v ?? 0);
                    const gt0 = (v: unknown): boolean => n(v) > 0;
                    const prettyStatLabel = (key: string): string => {
                      const map: Record<string, string> = {
                        forza: 'Forza', percezione: 'Percezione', resistenza: 'Resistenza', intelletto: 'Intelletto', agilita: 'Agilità', sapienza: 'Sapienza', anima: 'Anima',
                      };
                      return map[key] || key;
                    };
                    // Postura detection
                    let postureName: string | null = null;
                    try {
                      const abilities: any[] = Array.isArray((level as any)?.abilities) ? (level as any).abilities : [];
                      const postureAbility = abilities.find((a: any) => {
                        const cat = String(a?.category || '').toLowerCase();
                        const nm = String(a?.name || '').toLowerCase();
                        return cat === 'tecnico' || cat === 'posture' || nm.includes('postura');
                      });
                      if (postureAbility) postureName = postureAbility.name || null;
                      if (!postureName && Array.isArray((level as any)?.energy_embedded_refs)) {
                        const ref = (level as any).energy_embedded_refs.find((r: any) => {
                          const t = String(r?.refType || r?.type || '').toLowerCase();
                          const nm = String(r?.refName || r?.name || '').toLowerCase();
                          const cat = String(r?.category || '').toLowerCase();
                          return t === 'ability' && (cat === 'tecnico' || cat === 'posture' || nm.includes('postura'));
                        });
                        if (ref) postureName = ref?.refName || ref?.name || null;
                      }
                    } catch {}

                    const hp = n(level?.energy_health ?? level?.health);
                    const ap = n(level?.energy_action_points ?? level?.action_points);
                    const armour = n(level?.energy_armour ?? level?.armour);
                    const hpPercentage = hp > 0 ? 100 : 0;
                    const apPercentage = ap > 0 ? 100 : 0;
                    const armourPercentage = armour > 0 ? 100 : 0;

                    return (
                      <div key={ev.id} className="border rounded p-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{ev.name}</div>
                            <div className="text-xs text-muted-foreground">Tipo: {ev.evocation_type} • Turni rimanenti: {Number(ev.remaining_turns ?? 0)}</div>
                          </div>
                          <Badge variant="outline">{ev.ownerName}</Badge>
                        </div>
                        {(ev.evocation_type === 'entity' || ev.evocation_type === 'replica') && (
                          <div className="mt-2 space-y-2">
                            {gt0(hp) && (
                              <div>
                                <div className="flex justify-between text-xs"><span className="font-medium">Salute</span><span>{hp}</span></div>
                                <Progress value={hpPercentage} style={{ '--progress-background': '#22c55e' } as React.CSSProperties} />
                              </div>
                            )}
                            {gt0(ap) && (
                              <div>
                                <div className="flex justify-between text-xs"><span className="font-medium">PA</span><span>{ap}</span></div>
                                <Progress value={apPercentage} style={{ '--progress-background': '#38bdf8' } as React.CSSProperties} />
                              </div>
                            )}
                            {gt0(armour) && (
                              <div>
                                <div className="flex justify-between text-xs"><span className="font-medium">Armatura</span><span>{armour}</span></div>
                                <Progress value={armourPercentage} style={{ '--progress-background': '#6b7280' } as React.CSSProperties} />
                              </div>
                            )}
                            {/* Statistiche rimosse in Eventi attivi: mostriamo solo barre e postura */}
                            <div className="text-xs"><span className="font-medium">Postura:</span> <span>{postureName || 'Nessuna'}</span></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modale Evocazioni */}
      <Dialog open={showEvocationsModal} onOpenChange={(v) => { setShowEvocationsModal(v); if (!v) { setCurrentEvocationForRoll(null); setExpandedEvocationId(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evocazioni attive</DialogTitle>
          </DialogHeader>
          {!selectedCharacter?.id ? (
            <div className="text-sm text-muted-foreground">Seleziona un personaggio per vedere le evocazioni.</div>
          ) : loadingEvocations ? (
            <div className="text-sm text-muted-foreground">Caricamento…</div>
          ) : ((evocationInstances.filter(e => e.evocation_type === 'entity' || e.evocation_type === 'replica').length) === 0 ? (
            <div className="text-sm text-muted-foreground">Nessuna evocazione attiva.</div>
          ) : (
            <div ref={evocationsModalScrollRef} className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {evocationInstances
                .filter((evc) => evc.evocation_type === 'entity' || evc.evocation_type === 'replica')
                .map((evc) => (
                  <div key={evc.id} className="border rounded-md">
                    <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setExpandedEvocationId(expandedEvocationId === evc.id ? null : evc.id)}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{evc.name}</span>
                        <span className="text-xs text-muted-foreground">Tipo: {evc.evocation_type} • Livello: {evc.level} • Turni rimanenti: {evc.remaining_turns}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setCurrentEvocationForRoll(evc); setShowStatSelectionModal(true); }}>Tira con evocazione</Button>
                      </div>
                    </div>
                    {expandedEvocationId === evc.id && (
                      <div className="border-t p-3 text-sm">
                        {(() => {
                          const level = (evc.details?.level_data || {}) as any;
                          const n = (v: unknown): number => Number(v ?? 0);
                          const gt0 = (v: unknown): boolean => n(v) > 0;
                          const hasText = (v?: string | null): boolean => !!(v && v.trim().length);
                          const prettyStatLabel = (key: string): string => {
                            const map: Record<string, string> = {
                              forza: 'Forza', percezione: 'Percezione', resistenza: 'Resistenza', intelletto: 'Intelletto', agilita: 'Agilità', sapienza: 'Sapienza', anima: 'Anima',
                            };
                            return map[key] || key;
                          };
                          // Mappa proprietà stile Character basate sull'istanza di evocazione
                          const characterLike = {
                            name: evc.name,
                            level: Number(evc.level || 1),
                            baseStats: (Array.isArray(level?.energy_stats ?? level?.stats)
                              ? (level.energy_stats ?? level.stats).reduce((acc: any, s: any) => { if (s?.statKey) acc[s.statKey] = Number(s.amount || 0); return acc; }, {})
                              : {
                                forza: Number(level?.forza || 0), percezione: Number(level?.percezione || 0), resistenza: Number(level?.resistenza || 0), intelletto: Number(level?.intelletto || 0), agilita: Number(level?.agilita || 0), sapienza: Number(level?.sapienza || 0), anima: Number(level?.anima || 0),
                              }),
                            health: { current: n(level?.energy_health ?? level?.health), max: n(level?.energy_health ?? level?.health) },
                            actionPoints: { current: n(level?.energy_action_points ?? level?.action_points), max: n(level?.energy_action_points ?? level?.action_points) },
                            baseArmor: n(level?.energy_armour ?? level?.armour),
                          };
                          return (
                            <div className="space-y-2">
                              {hasText(level?.level_description) && (<div><span className="font-medium">Descrizione:</span> <span>{level.level_description}</span></div>)}
                              {Array.isArray(level?.damage_values) && level.damage_values.length > 0 && (
                                <div>
                                  <span className="font-medium">Danni:</span>
                                  <div className="ml-2">
                                    {level.damage_values.map((d: any, i: number) => (
                                      <div key={i}>• {d.typeName}: {n(d.guaranteed_damage)} (garantiti), {n(d.additional_damage)} (addizionali)</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Evocazione:</span>
                                <div className="ml-2">
                                  <div>• Tipo: {evc.evocation_type === 'replica' ? 'Replica' : 'Entità'}</div>
                                  {/* Sezione dettagli con barre di progresso per entità e replica */}
                                  {(
                                    <div className="ml-2 space-y-2">
                                      {(() => {
                                        const hp = n(level?.energy_health ?? level?.health);
                                        const ap = n(level?.energy_action_points ?? level?.action_points);
                                        const armour = n(level?.energy_armour ?? level?.armour);
                                        const hpPercentage = hp > 0 ? 100 : 0;
                                        const apPercentage = ap > 0 ? 100 : 0;
                                        const armourPercentage = armour > 0 ? 100 : 0;
                                        return (
                                          <>
                                            {gt0(hp) && (
                                              <div>
                                                <div className="flex justify-between text-xs"><span className="font-medium">Salute</span><span>{hp}</span></div>
                                                <Progress value={hpPercentage} style={{ '--progress-background': '#22c55e' } as React.CSSProperties} />
                                              </div>
                                            )}
                                            {gt0(ap) && (
                                              <div>
                                                <div className="flex justify-between text-xs"><span className="font-medium">PA</span><span>{ap}</span></div>
                                                <Progress value={apPercentage} style={{ '--progress-background': '#38bdf8' } as React.CSSProperties} />
                                              </div>
                                            )}
                                            {gt0(armour) && (
                                              <div>
                                                <div className="flex justify-between text-xs"><span className="font-medium">Armatura</span><span>{armour}</span></div>
                                                <Progress value={armourPercentage} style={{ '--progress-background': '#6b7280' } as React.CSSProperties} />
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                      {Array.isArray(level?.energy_stats ?? level?.stats) && (level.energy_stats ?? level.stats).filter((s: any) => gt0(s?.amount)).length > 0 && (
                                        <div>
                                          <span>• Statistiche:</span>
                                          <div className="ml-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                            {(level.energy_stats ?? level.stats)
                                              .filter((s: any) => gt0(s?.amount))
                                              .map((s: any, i: number) => (
                                                <div key={i} className="flex justify-between">
                                                  <span className="font-medium">{prettyStatLabel(s.statKey)}</span>
                                                  <span>{n(s.amount)}</span>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                      {(() => {
                                        // Postura: cerca in abilities o embedded refs con tipo 'ability'
                                        let postureName: string | null = null;
                                        try {
                                          const abilities: any[] = Array.isArray((level as any)?.abilities) ? (level as any).abilities : [];
                                          const postureAbility = abilities.find((a: any) => {
                                            const cat = String(a?.category || '').toLowerCase();
                                            const nm = String(a?.name || '').toLowerCase();
                                            return cat === 'tecnico' || cat === 'posture' || nm.includes('postura');
                                          });
                                          if (postureAbility) postureName = postureAbility.name || null;
                                          if (!postureName && Array.isArray((level as any)?.energy_embedded_refs)) {
                                            const ref = (level as any).energy_embedded_refs.find((r: any) => {
                                              const t = String(r?.refType || r?.type || '').toLowerCase();
                                              const nm = String(r?.refName || r?.name || '').toLowerCase();
                                              const cat = String(r?.category || '').toLowerCase();
                                              return t === 'ability' && (cat === 'tecnico' || cat === 'posture' || nm.includes('postura'));
                                            });
                                            if (ref) postureName = ref?.refName || ref?.name || null;
                                          }
                                        } catch {}
                                        return (
                                          <div>
                                            <span className="font-medium">Postura:</span> <span>{postureName || 'Nessuna'}</span>
                                          </div>
                                        );
                                      })()}
                                      {Array.isArray(level?.energy_embedded_refs) && level.energy_embedded_refs.length > 0 && (
                                        <div>
                                          <span>• Magie:</span>
                                          <div className="ml-2">
                                            {level.energy_embedded_refs.map((r: any, i: number) => {
                                              const name = r.refName || r.name || null;
                                              const levelVal = (r.refLevel ?? r.level ?? null);
                                              if (!name && !levelVal) return null;
                                              return (
                                                <div key={i}>{name ?? 'Magia'}{levelVal ? ` (Livello ${levelVal})` : ''}</div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      {level?.energy_can_create_equipment && <div>• Può creare equipaggiamento</div>}
                                      {evc.evocation_type === 'replica' && (
                                        <div>
                                          {gt0(level?.max_replicas) && (<div>• Massimo repliche: {n(level.max_replicas)}</div>)}
                                          {hasText(level?.replica_source_character_id) && (<div>• Sorgente: {level.replica_source_character_id}</div>)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Equipaggiamento dell'istanza (strutturato) */}
                              {(() => {
                                const eq = (evc?.details?.equipment ?? level?.equipment ?? level?.entity?.equipment) as any;
                                if (!eq) return null;
                                // Se array, prova a dedurre arma/armatura; se oggetto, usa campi noti
                                const equipment = Array.isArray(eq)
                                  ? {
                                      weapon: eq.find((i: any) => i?.type === 'arma'),
                                      armor: eq.find((i: any) => i?.type === 'armatura'),
                                    }
                                  : (eq?.type === 'arma' || eq?.type === 'armatura')
                                    ? {
                                        weapon: eq?.type === 'arma' ? eq : null,
                                        armor: eq?.type === 'armatura' ? eq : null,
                                      }
                                    : {
                                        weapon: eq?.weapon ?? null,
                                        armor: eq?.armor ?? null,
                                      };
                                const weapon = equipment.weapon as any;
                                const armor = equipment.armor as any;
                                const n = (v: unknown): number => Number(v ?? 0);
                                return (
                                  <div>
                                    <span className="font-medium">Equipaggiamento:</span>
                                    <div className="ml-2 space-y-2">
                                      {weapon ? (
                                        <div>
                                          <div className="font-medium">Arma</div>
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="font-medium">Nome:</span> {weapon.name ?? '—'}</div>
                                            <div><span className="font-medium">Tipo:</span> {weapon.type ?? '—'}</div>
                                            <div><span className="font-medium">Categoria:</span> {weapon?.data?.weapon_type_category ?? '—'}</div>
                                            <div><span className="font-medium">Tipo arma:</span> {weapon?.data?.weapon_type_name ?? '—'}</div>
                                            <div><span className="font-medium">Sottotipo:</span> {weapon.subtype ?? '—'}</div>
                                            <div><span className="font-medium">Materiale:</span> {weapon?.data?.material_name ?? '—'}</div>
                                            <div><span className="font-medium">Peso:</span> {n(weapon.weight)}</div>
                                          </div>
                                          {Array.isArray(weapon?.data?.damage_sets) && weapon.data.damage_sets.length > 0 ? (
                                            <div className="mt-2">
                                              <div className="font-medium">Set Danni</div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {weapon.data.damage_sets.map((ds: any, i: number) => {
                                                  const dmgV = n(ds?.calculated_damage_veloce ?? ds?.damage_veloce);
                                                  const dmgP = n(ds?.calculated_damage_pesante ?? ds?.damage_pesante);
                                                  const dmgA = n(ds?.calculated_damage_affondo ?? ds?.damage_affondo);
                                                  return (
                                                    <div key={i} className="border rounded p-2">
                                                      <div className="text-xs text-muted-foreground">{ds?.effect_name ?? `Set ${i+1}`}</div>
                                                      <div className="text-sm">Veloce: {dmgV} • Pesante: {dmgP} • Affondo: {dmgA}</div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : null}
                                          {weapon?.stats && typeof weapon.stats === 'object' && Object.keys(weapon.stats).length > 0 ? (
                                            <div className="mt-2">
                                              <div className="font-medium">Statistiche</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(weapon.stats).map(([k, v]) => (
                                                  <div key={k} className="flex justify-between text-sm"><span className="font-medium">{k}</span><span>{n(v as any)}</span></div>
                                                ))}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}
                                      {armor ? (
                                        <div>
                                          <div className="font-medium">Armatura</div>
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="font-medium">Nome:</span> {armor.name ?? '—'}</div>
                                            <div><span className="font-medium">Tipo:</span> {armor.type ?? '—'}</div>
                                            <div><span className="font-medium">Materiale:</span> {armor?.data?.material_name ?? '—'}</div>
                                            <div><span className="font-medium">Peso:</span> {n(armor.weight)}</div>
                                          </div>
                                          {armor?.stats && typeof armor.stats === 'object' && Object.keys(armor.stats).length > 0 ? (
                                            <div className="mt-2">
                                              <div className="font-medium">Statistiche</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(armor.stats).map(([k, v]) => (
                                                  <div key={k} className="flex justify-between text-sm"><span className="font-medium">{k}</span><span>{n(v as any)}</span></div>
                                                ))}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}
                                      {!weapon && !armor ? (
                                        <div className="text-sm text-muted-foreground">Nessun dettaglio equipaggiamento disponibile.</div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })()}
                              <div>
                                <span className="font-medium">Proprietà (stile Personaggio):</span>
                                <div className="ml-2">
                                  <div>• Livello: {characterLike.level}</div>
                                  <div>• Salute: {characterLike.health.current}/{characterLike.health.max}</div>
                                  <div>• Punti Azione: {characterLike.actionPoints.current}/{characterLike.actionPoints.max}</div>
                                  <div>• Armatura Base: {characterLike.baseArmor}</div>
                                  <div>• Statistiche Base:</div>
                                  <div className="ml-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {Object.entries(characterLike.baseStats || {}).map(([k, v]) => (
                                      <div key={k} className="flex justify-between"><span className="font-medium">{prettyStatLabel(k)}</span><span>{v as number}</span></div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </DialogContent>
      </Dialog>

      {/* Modal Inventario */}
      <Dialog open={showInventoryModal} onOpenChange={setShowInventoryModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Inventario</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScrollArea className="max-h-[50vh] pr-2">
              <div className="space-y-2">
                {((selectedCharacter?.inventory || []).length === 0) ? (
                  <div className="text-sm text-muted-foreground">Nessun oggetto in inventario.</div>
                ) : (
                  (selectedCharacter!.inventory).map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between border rounded-md p-2 cursor-pointer ${selectedInventoryItem?.id === item.id ? 'bg-muted' : ''}`}
                      onClick={() => { setSelectedInventoryItem(item); setQuantityToUse(1); }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.description ? <span className="text-xs text-muted-foreground">{item.description}</span> : null}
                      </div>
                      <Badge variant="secondary">x{item.quantity || 0}</Badge>
                    </div>
                  ))
                )}

                {/* Pozioni */}
                {Array.isArray(selectedCharacter?.potions) && (selectedCharacter!.potions).length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-sm font-semibold">Pozioni</div>
                    {(selectedCharacter!.potions).map(potion => (
                      <div
                        key={potion.id}
                        className={`flex items-center justify-between border rounded-md p-2 cursor-pointer ${selectedPotionItem?.id === potion.id ? 'bg-muted' : ''}`}
                        onClick={() => { setSelectedPotionItem(potion); setQuantityToUsePotion(1); setSelectedInventoryItem(null); }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{potion.name}</span>
                          {potion.description ? <span className="text-xs text-muted-foreground">{potion.description}</span> : null}
                          {Array.isArray(potion.damageSets) && potion.damageSets.length > 0 ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <div>Effetti:</div>
                              <div className="ml-2">
                                {potion.damageSets.map((ds, i) => (
                                  <div key={`pd:${potion.id}:${i}`}>
                                    {(ds as any).effect_name || 'Effetto'}{(ds as any).guaranteedDamage ? ` assicurato ${(ds as any).guaranteedDamage}` : ''}{(ds as any).additionalDamage ? `${(ds as any).guaranteedDamage ? ',' : ''} aggiuntivo ${(ds as any).additionalDamage}` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {(potion as any).hasAnomaly || potion.anomaly || potion.anomalyId ? (
                            <div className="mt-1 text-xs"><span className="px-1 py-0.5 border rounded">Anomalia</span></div>
                          ) : null}
                        </div>
                        <Badge variant="secondary">x{potion.quantity || 0}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Frecce */}
                {Array.isArray(selectedCharacter?.arrows) && (selectedCharacter!.arrows).length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-sm font-semibold">Frecce</div>
                    {(selectedCharacter!.arrows).map(arrow => (
                      <div key={arrow.id} className="flex items-center justify-between border rounded-md p-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{arrow.name}</span>
                        </div>
                        <Badge variant="secondary">x{arrow.quantity || 0}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="space-y-3">
              {selectedInventoryItem ? (
                <>
                  <div className="text-sm font-medium">{selectedInventoryItem.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedInventoryItem.description || ''}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={selectedInventoryItem.quantity || 0}
                      value={quantityToUse}
                      onChange={(e) => setQuantityToUse(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">/ {selectedInventoryItem.quantity || 0} disponibili</span>
                  </div>
                  <Button size="sm" variant="default" onClick={useSelectedInventoryItem}>Usa</Button>
                </>
              ) : selectedPotionItem ? (
                <>
                  <div className="text-sm font-medium">{selectedPotionItem.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedPotionItem.description || ''}</div>
                  {Array.isArray(selectedPotionItem.damageSets) && selectedPotionItem.damageSets.length > 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div className="font-medium">Effetti</div>
                      <div className="ml-2">
                        {selectedPotionItem.damageSets.map((ds, i) => (
                          <div key={`spds:${selectedPotionItem.id}:${i}`}>
                            {(ds as any).effect_name || 'Effetto'}{(ds as any).guaranteedDamage ? ` assicurato ${(ds as any).guaranteedDamage}` : ''}{(ds as any).additionalDamage ? `${(ds as any).guaranteedDamage ? ',' : ''} aggiuntivo ${(ds as any).additionalDamage}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedPotionItem.anomaly || selectedPotionItem.anomalyId ? (
                    <div className="mt-2 text-xs">
                      <div className="font-medium">Anomalia</div>
                      <div className="ml-2">
                        {selectedPotionAnomalyDetails ? (
                          <div>
                            <div className="font-medium text-sm">{selectedPotionAnomalyDetails.name}</div>
                            {selectedPotionAnomalyDetails.description ? <div className="text-xs text-muted-foreground">{selectedPotionAnomalyDetails.description}</div> : null}
                            {(() => {
                              const anomaly: any = selectedPotionAnomalyDetails as any;
                              const enabled = !!(anomaly?.damageBonusEnabled ?? anomaly?.damage_bonus_enabled);
                              if (!enabled) return null;
                              const db = (anomaly?.damageBonus ?? anomaly?.damage_bonus) || {};
                              const mode = String(db?.mode || '').toLowerCase();
                              const isSpecific = !!db?.isSpecific;
                              const effectNames = Array.isArray(db?.damageEffectNames) ? db.damageEffectNames.map(String).filter(Boolean) : [];
                              const effectIds = Array.isArray(db?.damageEffectIds) ? db.damageEffectIds.map(String).filter(Boolean) : [];
                              const targets = (isSpecific && (effectNames.length || effectIds.length))
                                ? (effectNames.length ? effectNames : effectIds.map(resolveEffectName))
                                : [null];
                              const mk = (target: string | null, kind: string) => `${anomaly.name}${target ? ` • ${target}` : ''} • ${kind}`;
                              const out: string[] = [];
                              const addNum = (target: string | null, kind: string, v: any, unit?: string) => {
                                const n = Number(v || 0) || 0;
                                if (!n) return;
                                const sign = n >= 0 ? '+' : '-';
                                const abs = Math.abs(Math.round(n));
                                out.push(`Bonus danni: ${sign} '${mk(target, kind)}' (${abs}${unit || ''})`);
                              };

                              const classicG = db?.classicGuaranteed;
                              const classicA = db?.classicAdditional;
                              const percG = db?.percentageGuaranteed;
                              const percA = db?.percentageAdditional;

                              targets.forEach((t: any) => {
                                if (mode !== 'percentage') {
                                  addNum(t, 'Assicurato', classicG);
                                  addNum(t, 'Aggiuntivo', classicA);
                                }
                                if (mode !== 'classic') {
                                  addNum(t, 'Assicurato %', percG, '%');
                                  addNum(t, 'Aggiuntivo %', percA, '%');
                                }
                              });

                              if (out.length === 0) return null;
                              return (
                                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                  {out.map((l, i) => (
                                    <div key={`spadbl:${i}`}>{l}</div>
                                  ))}
                                </div>
                              );
                            })()}
                            {(selectedPotionAnomalyDetails.turns || 0) > 0 ? <div>Durata: {selectedPotionAnomalyDetails.turns}</div> : null}
                            {(selectedPotionAnomalyDetails.healthModifier || 0) !== 0 ? <div>Salute: {selectedPotionAnomalyDetails.healthModifier > 0 ? '+' : ''}{selectedPotionAnomalyDetails.healthModifier}</div> : null}
                            {(selectedPotionAnomalyDetails.actionPointsModifier || 0) !== 0 ? <div>PA: {selectedPotionAnomalyDetails.actionPointsModifier > 0 ? '+' : ''}{selectedPotionAnomalyDetails.actionPointsModifier}</div> : null}
                            {selectedPotionAnomalyDetails.statsModifier ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(selectedPotionAnomalyDetails.statsModifier)
                                  .filter(([_, v]) => (Number(v) || 0) !== 0)
                                  .map(([k, v]) => (
                                    <span key={`spasm:${k}`} className="px-2 py-1 rounded text-xs border">{k}: {Number(v) > 0 ? '+' : ''}{Number(v)}</span>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">Definizione importata</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={selectedPotionItem.quantity || 0}
                      value={quantityToUsePotion}
                      onChange={(e) => setQuantityToUsePotion(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">/ {selectedPotionItem.quantity || 0} disponibili</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="default" onClick={useSelectedPotionItem} disabled={isUsingPotion || (selectedPotionItem.quantity || 0) < 1}>Usa Pozione</Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Seleziona un oggetto o una pozione per usarlo.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomSpecificsModal} onOpenChange={setShowCustomSpecificsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Specifiche custom</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-2">
              {(!selectedCharacter || (selectedCharacter.specifics || []).length === 0) ? (
                <div className="text-sm text-muted-foreground">Nessuna specifica impostata.</div>
              ) : (
                (selectedCharacter.specifics || []).map((item: any) => {
                  const current = Number(item?.current ?? 0) || 0;
                  const max = Number(item?.max ?? 0) || 0;
                  const pct = max > 0 ? (current / max) * 100 : 0;
                  const color = item?.color || '#22c55e';
                  return (
                    <div key={item?.id ?? item?.name} className="border rounded-md p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{item?.name || 'Specifica'}</span>
                        <span className="text-muted-foreground">{current}/{max || 0}</span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-1.5 mt-1"
                        style={{ '--progress-background': color } as React.CSSProperties}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      

      <StatSelectionDialog
        isOpen={showStatSelectionModal}
        onClose={() => { setShowStatSelectionModal(false); setPendingPassiveActivation(null); }}
        character={currentEvocationForRoll ? (evocationCharacterLike as any) : (selectedCharacter ?? null)}
        calculations={currentEvocationForRoll ? { totalStats: evocationCharacterLike?.baseStats } : { totalStats }}
        spellCooldowns={userSpellCooldowns}
        perTurnUses={perTurnUses}
        activationOnly={!!pendingPassiveActivation}
        activationPreset={pendingPassiveActivation ? { type: pendingPassiveActivation.sourceType === 'spell' ? 'magic' : 'ability', item: pendingPassiveActivation.item } : null}
        onConfirm={async (rollData: any) => {
          try {
            if (!currentEvocationForRoll && selectedCharacter) {
              const d = (rollData?.damage || {}) as any;
              if (d?.source === 'magic' && d?.spell) {
                const sid = String(d?.spell?.id ?? d?.spell?.name ?? '').trim();
                if (sid) {
                  const cdKey = `${String(selectedCharacter.id)}:${sid}`;
                  const cdTurns = Number((spellCooldowns || {})[cdKey] ?? 0) || 0;
                  if (cdTurns > 0) {
                    toast({ title: 'Bloccato', description: `Magia in recupero (${cdTurns} turni)`, variant: 'destructive' });
                    return;
                  }
                }
              } else if (d?.source === 'ability' && d?.ability) {
                const aid = String(d?.ability?.id ?? d?.ability?.name ?? '').trim();
                if (aid) {
                  const cdKey = `${String(selectedCharacter.id)}:${aid}`;
                  const cdTurns = Number((spellCooldowns || {})[cdKey] ?? 0) || 0;
                  if (cdTurns > 0) {
                    toast({ title: 'Bloccato', description: `Abilità in recupero (${cdTurns} turni)`, variant: 'destructive' });
                    return;
                  }
                }
              }
              const info = getPerTurnUseInfoFromRoll(rollData);
              if (info && info.used >= info.limit) {
                toast({ title: 'Bloccato', description: `${info.name}: limite utilizzi a turno (${info.used}/${info.limit})`, variant: 'destructive' });
                return;
              }
              tryConsumePerTurnUseFromRoll(rollData);
            }
          } catch {}
          setShowStatSelectionModal(false);
          const passiveActivation = pendingPassiveActivation;
          setPendingPassiveActivation(null);
          setPendingSelectedPostureId(rollData?.selectedPostureId ?? null);
          setPendingSelectedPostureName(rollData?.selectedPostureName ?? '');
          const actorCharacterForRoll = currentEvocationForRoll ? (evocationCharacterLike as any) : selectedCharacter;
          const actorCalculationsForRoll = currentEvocationForRoll ? { totalStats: (evocationCharacterLike as any)?.baseStats } : calculations;
          setPendingActorForRoll(actorCharacterForRoll ? { kind: currentEvocationForRoll ? 'evocation' : 'character', character: actorCharacterForRoll, calculations: actorCalculationsForRoll } : null);
          if (currentEvocationForRoll) {
            rollData = { ...rollData, actor: { kind: 'evocation', id: String(currentEvocationForRoll?.id || ''), name: String(currentEvocationForRoll?.name || '') } };
            setCurrentEvocationForRoll(null);
          }
          // Sanificazione trigger PA: abilita solo se consentito dai dati di Supabase; altrimenti azzera
          try {
            const d: any = rollData?.damage;
            if (d && d.triggers && d.triggers.actionPoints) {
              const apTrig = d.triggers.actionPoints || {};
              let paEnabled = false;
              let maxPa = Number(apTrig?.max || 0) || 0;
              let ratePa = Number(apTrig?.damageIncreasePerPa?.rate || 0) || 0;

              if (d.source === 'magic' && d.spell) {
                const spell = d.spell as any;
                const levelNum = Number(spell?.current_level) || Number(spell?.level) || 1;
                const lvl = Array.isArray(spell?.levels)
                  ? (spell.levels.find((l: any) => Number(l?.level) === levelNum) || spell.levels[0] || {})
                  : (spell || {});
                const explicitFlag = !!(lvl?.paInvestmentEnabled || spell?.paInvestmentEnabled);
                const dmgIncEnabled = !!(lvl?.damageIncreasePerPaEnabled || spell?.damageIncreasePerPaEnabled);
                const maxFromData = Number(lvl?.max_pa_investment || spell?.max_pa_investment || 0) || 0;
                const rateFromData = Number(lvl?.increasing_damage_per_pa || spell?.increasing_damage_per_pa || spell?.increase_damage_per_pa || 0) || 0;
                const succEveryFromData = Number(lvl?.success_roll_increase_every_pa || spell?.success_roll_increase_every_pa || 0) || 0;
                maxPa = maxFromData;
                ratePa = rateFromData;
                paEnabled = explicitFlag || (maxFromData > 0) || dmgIncEnabled || (rateFromData > 0) || (succEveryFromData > 0);
              } else if (d.source === 'ability' && d.ability) {
                const ability = d.ability as any;
                const lvl = Array.isArray(ability?.levels) ? (ability.levels[0] || {}) : (ability || {});
                const explicitFlag = !!(lvl?.paInvestmentEnabled || ability?.paInvestmentEnabled);
                const dmgIncEnabled = !!(lvl?.damageIncreasePerPaEnabled || ability?.damageIncreasePerPaEnabled);
                const maxFromData = Number(lvl?.max_pa_investment || ability?.max_pa_investment || 0) || 0;
                const rateFromData = Number(lvl?.increasing_damage_per_pa || ability?.increasing_damage_per_pa || 0) || 0;
                const succEveryFromData = Number(lvl?.success_roll_increase_every_pa || ability?.success_roll_increase_every_pa || 0) || 0;
                maxPa = maxFromData;
                ratePa = rateFromData;
                paEnabled = explicitFlag || (maxFromData > 0) || dmgIncEnabled || (rateFromData > 0) || (succEveryFromData > 0);
              } else {
                // per weapon/equipment o altri casi, non abilitare PA salvo esplicito (non previsto)
                paEnabled = false;
                maxPa = 0;
                ratePa = 0;
              }

              if (!paEnabled) {
                d.triggers.actionPoints = {
                  enabled: false,
                  max: 0,
                  selected: 0,
                  damageIncreasePerPa: { enabled: false, rate: 0 },
                };
              } else {
                const sel = Number(apTrig?.selected || 0) || 0;
                const clampedSel = maxPa > 0 ? Math.min(Math.max(0, sel), maxPa) : Math.max(0, sel);
                d.triggers.actionPoints = {
                  enabled: true,
                  max: maxPa,
                  selected: clampedSel,
                  damageIncreasePerPa: { enabled: (ratePa > 0) || !!(apTrig?.damageIncreasePerPa?.enabled), rate: ratePa },
                };
              }
            }
          } catch (err) {
            console.warn('[DiceDashboard] Sanificazione PA fallita:', err);
          }
          const compCount = rollData?.selectedCompetences?.length || 0;
          const target = rollData?.target;
          const targetLabel = target?.type === 'none'
            ? 'Nessun bersaglio'
            : target?.name
              ? `${target.type === 'characters' ? 'Personaggio' : 'Nemico'}: ${target.name}`
              : '—';
          toast({
            title: 'Lancio dado',
            description: `Statistica: ${rollData?.selectedStat || '-'}; Competenze: ${compCount}; Bersaglio: ${targetLabel}`,
          });

          // Registra nello storico nuovo secondo le regole
          const phasePrepared = (() => {
            try {
              const d: any = rollData?.damage;
              if (!d || (d?.source !== 'magic' && d?.source !== 'ability')) return rollData;
              const item = d?.source === 'magic' ? d?.spell : d?.ability;
              if (!item) return rollData;
              const phase = extractPhaseFlowInfo(item);
              if (!phase.enabled) return rollData;
              if ((item as any)?.__phaseAttack?.index == null) {
                const next = JSON.parse(JSON.stringify(rollData));
                const nextItem = { ...(item || {}), __phaseAttack: { index: -1 } };
                if (d?.source === 'magic') (next.damage as any).spell = nextItem;
                else (next.damage as any).ability = nextItem;
                return next;
              }
            } catch {}
            return rollData;
          })();
          const rollDataWithCost = enrichRollDataWithActionCost(phasePrepared);
          const created = addEntryFromModalRoll(
            actorCharacterForRoll,
            rollDataWithCost,
            actorCalculationsForRoll
          );
          setPendingActionEntryId(created?.id || null);
          let workingCharacter: any | null = selectedCharacter;
          if (passiveActivation) {
            const next = await applyPassiveEffectsDirectly(passiveActivation.sourceType, passiveActivation.item, { skipLog: true, silent: true });
            if (next) workingCharacter = next;
          }
          try {
            if (created) {
              const competenceTotal = Array.isArray((created as any)?.competenceDetails)
                ? (created as any).competenceDetails.reduce((sum: number, c: any) => sum + (Number(c?.roll || 0) || 0), 0)
                : 0;
              setActionRollRecap({
                result: Number((created as any)?.result ?? 0) || 0,
                maxValue: Number((created as any)?.diceMax ?? 0) || 0,
                statValue: Number((created as any)?.statValue ?? 0) || 0,
                competenceTotal,
              });
            } else {
              setActionRollRecap(null);
            }
          } catch {
            setActionRollRecap(null);
          }
          setMultiShotRollRecaps({});

          // Creazione evocazione spostata nei gestori di successo/critico
          if (!rollDataWithCost?.damage) setPendingActorForRoll(null);

          try {
            const damage = rollData?.damage;
            if (damage?.consumeArrow && damage?.arrow && workingCharacter) {
              const arrowSel = damage.arrow;
              const currentArrows = [...(workingCharacter.arrows || [])];
              let updated = false;
              const updatedArrows = currentArrows
                .map(a => {
                  const matches = arrowSel?.id != null
                    ? String(a.id) === String(arrowSel.id)
                    : arrowSel?.name && a.name === arrowSel.name;
                  if (!matches) return a;
                  const newQty = Math.max(0, (a.quantity || 0) - 1);
                  updated = true;
                  return { ...a, quantity: newQty };
                })
                .filter(a => (a.quantity || 0) > 0);

              if (updated) {
                const updatedCharacter = { ...workingCharacter, arrows: updatedArrows } as typeof workingCharacter;
                const ok = await updateCharacter(updatedCharacter);
                if (ok) {
                  setSelectedCharacter(updatedCharacter);
                  workingCharacter = updatedCharacter;
                  toast({
                    title: 'Freccia utilizzata',
                    description: `${arrowSel.name || 'Freccia'} consumata (x1)`,
                  });
                } else {
                  toast({ title: 'Avviso', description: 'Impossibile aggiornare le frecce', variant: 'destructive' });
                }
              }
            }

            // Consuma freccia anche quando si usa "+danno arma" sotto magia/abilità
            if ((damage as any)?.consumeArrowForDamage && (damage as any)?.arrowForDamage && workingCharacter) {
              const arrowSel = (damage as any).arrowForDamage;
              const currentArrows = [...(workingCharacter.arrows || [])];
              let updated = false;
              const updatedArrows = currentArrows
                .map(a => {
                  const matches = arrowSel?.id != null
                    ? String(a.id) === String(arrowSel.id)
                    : arrowSel?.name && a.name === arrowSel.name;
                  if (!matches) return a;
                  const newQty = Math.max(0, (a.quantity || 0) - 1);
                  updated = true;
                  return { ...a, quantity: newQty };
                })
                .filter(a => (a.quantity || 0) > 0);

              if (updated) {
                const updatedCharacter = { ...workingCharacter, arrows: updatedArrows } as typeof workingCharacter;
                const ok = await updateCharacter(updatedCharacter);
                if (ok) {
                  setSelectedCharacter(updatedCharacter);
                  workingCharacter = updatedCharacter;
                  toast({
                    title: 'Freccia utilizzata',
                    description: `${arrowSel.name || 'Freccia'} consumata (x1)`,
                  });
                } else {
                  toast({ title: 'Avviso', description: 'Impossibile aggiornare le frecce', variant: 'destructive' });
                }
              }
            }
          } catch (error) {
            console.error('Errore nella rimozione della freccia:', error);
            toast({ title: 'Avviso', description: 'Errore nella rimozione della freccia', variant: 'destructive' });
          }

          // Se è stata attivata la compilazione del danno
          if (rollDataWithCost?.damage) {
            // Applica subito l'evento di Recupero (cooldown) indipendentemente dalla conferma di riuscita
            try {
              tryAddRecoveryEventFromRoll(rollDataWithCost);
            } catch {}
            try {
              const next = await applyMagicActionCostFromRoll(rollDataWithCost, workingCharacter || undefined);
              if (next) workingCharacter = next;
            } catch {}
            try {
              const next = await applyAbilityActionCostFromRoll(rollDataWithCost, workingCharacter || undefined);
              if (next) workingCharacter = next;
            } catch {}
            // Apri la modale di conferma successo/critico
            const rollDataForDamage = (() => {
              try {
                const d: any = rollDataWithCost?.damage;
                if (!d || (d.source !== 'magic' && d.source !== 'ability')) return rollDataWithCost;
                const item = d.source === 'magic' ? d.spell : d.ability;
                if (!item) return rollDataWithCost;
                const info = extractPhaseFlowInfo(item);
                if (!info.enabled) return rollDataWithCost;
                const idx = Number((item as any)?.__phaseAttack?.index ?? -1);
                if (idx >= 0) return rollDataWithCost;
                const next = JSON.parse(JSON.stringify(rollDataWithCost));
                const nextItem = { ...(item || {}), __phaseAttack: { index: -1 } };
                if (d.source === 'magic') (next.damage as any).spell = nextItem;
                else (next.damage as any).ability = nextItem;
                return next;
              } catch {
                return rollDataWithCost;
              }
            })();
            setPendingRollData(rollDataForDamage);
            try {
              const trig = (rollData?.damage as any)?.triggers;
              const lot = trig?.lottery;
              if (lot && toBool(lot.enabled) && Number(lot.diceFaces || 0) > 0 && Number(lot.numericChoices || 0) > 0) {
                const df = Number(lot.diceFaces || 0) || 0;
                const nc = Number(lot.numericChoices || 0) || 0;
                const uc = Array.isArray(lot.userChoices) ? lot.userChoices.filter((x: any) => typeof x === 'number') : [];
                setPendingLottery({ diceFaces: df, numericChoices: nc, userChoices: uc });
              } else {
                setPendingLottery(null);
              }
            } catch {
              setPendingLottery(null);
            }
            setShowRollSuccess(true);
          } else {
            // Nessuna compilazione danno: non fare altro
          }
        }}
      />

      

      {/* Modale conferma successo/critico con supporto ai tiri multipli */}
      {(() => {
        const d = pendingRollData?.damage as any;
        const isMagic = d?.source === 'magic';
        const selectedShots = Number(d?.triggers?.multipleShots?.selectedShots || 0);
        const isMultiShotFlow = showRollSuccess && isMagic && selectedShots > 0;
        const spellOrAbilityName = (() => {
          if (!d) return undefined;
          if (d.source === 'magic') return d.spell?.name || 'Magia';
          if (d.source === 'ability') return d.ability?.name || 'Abilità';
          if (d.source === 'equipment') return d.weapon?.name || 'Arma';
          return undefined;
        })();
        const phaseInfo = (() => {
          try {
            if (!d || (d.source !== 'magic' && d.source !== 'ability')) return null;
            const item = d.source === 'magic' ? d.spell : d.ability;
            return item ? extractPhaseFlowInfo(item) : null;
          } catch {
            return null;
          }
        })();
        const showTerminateHere = (() => {
          const idx = Number(phaseInfo?.index ?? -1);
          return !!(phaseInfo?.enabled && idx < (phaseInfo?.phases?.length ?? 0) - 1);
        })();
        const phaseWarningText = (() => {
          try {
            if (!showTerminateHere || !phaseInfo) return undefined;
            const idx = Number(phaseInfo.index ?? -1);
            const nextPhase = (phaseInfo.phases || [])[idx + 1] || null;
            const nextPhaseNumber = idx + 2;
            const nextCost = Number((nextPhase as any)?.action_cost ?? (nextPhase as any)?.punti_azione ?? (nextPhase as any)?.indicative_action_cost ?? (nextPhase as any)?.punti_azione_indicativi ?? 0) || 0;
            return `Attacco a fasi: dopo questo tiro ci sarà la fase ${nextPhaseNumber}${nextCost > 0 ? ` (costo PA: ${nextCost})` : ''}.\nPremi "Termina qui" per non tirare la fase successiva.`;
          } catch {
            return undefined;
          }
        })();
        const warningText = (() => {
          const out: string[] = [];
          if (phaseWarningText) out.push(phaseWarningText);
          try {
            if (!d || d.source !== 'magic') return out.length > 0 ? out.join('\n') : undefined;
            const spell = d.spell;
            if (!spell) return out.length > 0 ? out.join('\n') : undefined;
            if (Array.isArray(spell?.levels) && spell?.current_level != null) {
              const lvl = spell.levels.find((l: any) => String(l?.level) === String(spell.current_level));
              const w = (lvl?.level_warning || (lvl as any)?.levelWarning);
              if (typeof w === 'string' && w.trim().length > 0) out.push(w);
            } else {
              const w2 = (spell?.level_warning || (spell as any)?.levelWarning);
              if (typeof w2 === 'string' && w2.trim().length > 0) out.push(w2);
            }
          } catch {}
          return out.length > 0 ? out.join('\n') : undefined;
        })();

        if (!isMultiShotFlow) {
          return (
            <RollSuccessDialog
              isOpen={showRollSuccess}
              onClose={() => setShowRollSuccess(false)}
              onPostureBreak={handlePostureDecisionDashboard}
              spellOrAbilityName={spellOrAbilityName}
              selectedShots={selectedShots > 0 ? selectedShots : undefined}
              warningText={warningText}
              showTerminateHere={showTerminateHere}
              onTerminateHereChange={setTerminateHere}
              usePercentRoll={!!percentSuccessRoll}
              percentResult={percentSuccessRoll?.result}
              percentMinRequired={percentSuccessRoll?.min}
              actionRollRecap={actionRollRecap}
              lotteryPreview={lotteryPreview}
              targets={(() => { try { const list = Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : []; const single = (pendingRollData?.target && pendingRollData?.target?.type && pendingRollData?.target?.type !== 'none') ? [pendingRollData.target] : []; const merged = list.length > 0 ? list : single; return merged; } catch { return []; } })()}
              shotsTargets={Array.isArray((pendingRollData as any)?.shotsTargets) ? (pendingRollData as any).shotsTargets : undefined}
              availableCharacters={(characters || []).map((c: any) => ({ id: String(c?.id || ''), name: String(c?.name || '') }))}
              availableEnemies={(enemies || []).map((e: any) => ({ id: String(e?.id || ''), name: String(e?.name || '') }))}
              availableEvocations={(allEvocationInstances || []).map((ev: any) => ({ id: String(ev?.id || ''), name: String(ev?.name || '') }))}
              onTargetsUpdate={(updated) => {
                try {
                  setPendingRollData(prev => {
                    if (!prev) return prev;
                    const next: any = JSON.parse(JSON.stringify(prev));
                    next.targets = Array.isArray(updated) ? updated : [];
                    next.target = (updated && updated[0]) ? { type: updated[0].type, id: updated[0].id, name: updated[0].name } : { type: 'none' };
                    return next;
                  });
                } catch {}
              }}
              onShotsTargetsUpdate={(sts) => {
                try {
                  setPendingRollData(prev => {
                    if (!prev) return prev;
                    const next: any = JSON.parse(JSON.stringify(prev));
                    next.shotsTargets = Array.isArray(sts) ? sts : [];
                    // Sincronizza target principale con il primo shot
                    const first = (next.shotsTargets[0] || [])[0];
                    next.target = first ? { type: first.type, id: first.id, name: first.name } : (next.target || { type: 'none' });
                    return next;
                  });
                } catch {}
              }}
              onFailure={handleActionFailure}
              onSuccess={async () => {
                await applyActionDurationScalingDashboard(true);
                try {
                  if (lotteryPreview) {
                    const correctCount = lotteryPreview.items.filter(it => it.correct).length;
                    const rollSet = new Set(lotteryPreview.items.map(it => it.roll));
                    const wrongCount = (lotteryPreview.choices || []).filter(v => v > 0 && !rollSet.has(v)).length;
                    try {
                      if (pendingRollData?.damage?.triggers?.lottery) {
                        (pendingRollData.damage as any).triggers.lottery.correctCount = correctCount;
                        (pendingRollData.damage as any).triggers.lottery.wrongCount = wrongCount;
                      }
                    } catch {}
                    const targetId = pendingActionEntryId || (newHistoryEntries && newHistoryEntries.length > 0 ? newHistoryEntries[0].id : null);
                    if (targetId) updateEntryLotteryInfo(targetId, { rolls: lotteryPreview.items.map(it => it.roll), correctCount, wrongCount });
                  }
                } catch {}
                // Flusso standard: un solo danno
                if (pendingActionEntryId) updateEntryBadge(pendingActionEntryId, 'riuscito');
                const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
                const calculationsForRoll = pendingActorForRoll?.calculations ?? calculations;
                if (characterForRoll && pendingRollData) {
                  const rollForProcessing = applyPhaseToRollForProcessing(pendingRollData);
                  if (getLaunchDelayTurnsFromRoll(rollForProcessing) > 0) {
                    try { scheduleLaunchDelayEventFromRoll(rollForProcessing, { isCritical: false }); } catch {}
                    setPendingRollData(null);
                    setPendingActorForRoll(null);
                    setPendingActionEntryId(null);
                    setPendingLottery(null);
                    setLotteryPreview(null);
                    return;
                  }
                  const entry = addDamageEntryFromModalRoll(characterForRoll, rollForProcessing, false, calculationsForRoll);
                  try { await appendTargetResWeakToHistoryIfNeeded(rollForProcessing, entry); } catch {}
                  try {
                    const totalDamage = Number(entry?.result ?? 0);
                    if (totalDamage > 0) {
                      await applyDirectDamageFromRoll(rollForProcessing, totalDamage, entry?.id, entry?.damageSources);
                    }
                  } catch {}
                  await tryCreateEvocationInstanceFromRoll(rollForProcessing);
                  await tryAddLevelWarningAnomalyFromRoll(rollForProcessing);
                  await tryAddActiveSpellEventFromRoll(rollForProcessing);
                  await applySelfEffectsFromRoll(rollForProcessing);
                  await tryApplyLevelAnomaliesToTargetsFromRoll(rollForProcessing, characterForRoll);
                  try {
                    if (characterForRoll && pendingRollData) {
                      await applyCustomSpecificsFromRoll(pendingRollData, characterForRoll, 'both');
                    }
                  } catch {}

                  try {
                    const d: any = pendingRollData?.damage;
                    if (d && (d.source === 'magic' || d.source === 'ability')) {
                      const item = d.source === 'magic' ? d.spell : d.ability;
                      const phase = extractPhaseFlowInfo(item);
                      const canContinue = phase.enabled && phase.index < phase.phases.length - 1;
                      if (canContinue && !terminateHere) {
                        const nextIndex = phase.index + 1;
                        const nextItem = { ...(item || {}), __phaseAttack: { index: nextIndex } };
                        const nextInfo = extractPhaseFlowInfo(nextItem);
                        const nextPhaseData = (nextInfo.phases || [])[nextInfo.index] || null;
                        const nextItemForRoll = nextPhaseData ? applyPhaseToItemForDamage(nextItem, nextPhaseData) : nextItem;
                        const nextPending = JSON.parse(JSON.stringify(pendingRollData));
                        if (d.source === 'magic') (nextPending.damage as any).spell = nextItemForRoll;
                        else (nextPending.damage as any).ability = nextItemForRoll;
                        delete (nextPending.damage as any).criticalExtraPureValue;

                        const nextWithCost = enrichRollDataWithActionCost(nextPending);
                        try {
                          const trig = (nextWithCost?.damage as any)?.triggers;
                          const lot = trig?.lottery;
                          if (lot && toBool(lot.enabled) && Number(lot.diceFaces || 0) > 0 && Number(lot.numericChoices || 0) > 0) {
                            const df = Number(lot.diceFaces || 0) || 0;
                            const nc = Number(lot.numericChoices || 0) || 0;
                            const uc = Array.isArray(lot.userChoices) ? lot.userChoices.filter((x: any) => typeof x === 'number') : [];
                            setPendingLottery({ diceFaces: df, numericChoices: nc, userChoices: uc });
                          } else {
                            setPendingLottery(null);
                          }
                        } catch {
                          setPendingLottery(null);
                        }
                        setLotteryPreview(null);
                        setTerminateHere(false);
                        try {
                          if (d.source === 'magic') {
                            await applyMagicActionCostFromRoll(nextWithCost, characterForRoll);
                          } else {
                            await applyAbilityActionCostFromRoll(nextWithCost, characterForRoll);
                          }
                        } catch {}
                        const created = addEntryFromModalRoll(characterForRoll, nextWithCost, calculationsForRoll);
                        setPendingActionEntryId(created?.id || null);
                        let nextRecap: { result: number; maxValue: number; statValue: number; competenceTotal: number } | null = null;
                        try {
                          if (created) {
                            const competenceTotal = Array.isArray((created as any)?.competenceDetails)
                              ? (created as any).competenceDetails.reduce((sum: number, c: any) => sum + (Number(c?.roll || 0) || 0), 0)
                              : 0;
                            nextRecap = {
                              result: Number((created as any)?.result ?? 0) || 0,
                              maxValue: Number((created as any)?.diceMax ?? 0) || 0,
                              statValue: Number((created as any)?.statValue ?? 0) || 0,
                              competenceTotal,
                            };
                          }
                        } catch {
                          nextRecap = null;
                        }
                        setActionRollRecap(nextRecap);
                        setPendingRollData(nextWithCost);
                        setTimeout(() => {
                          setActionRollRecap(nextRecap);
                          setShowRollSuccess(true);
                        }, 50);
                        return;
                      }
                    }
                  } catch {}
                }
                setPendingRollData(null);
                setPendingActorForRoll(null);
                setPendingActionEntryId(null);
                setPendingLottery(null);
                setLotteryPreview(null);
              }}
              onCriticalSuccess={async (extraPure) => {
                try {
                  if (lotteryPreview) {
                    const correctCount = lotteryPreview.items.filter(it => it.correct).length;
                    const rollSet = new Set(lotteryPreview.items.map(it => it.roll));
                    const wrongCount = (lotteryPreview.choices || []).filter(v => v > 0 && !rollSet.has(v)).length;
                    try {
                      if (pendingRollData?.damage?.triggers?.lottery) {
                        (pendingRollData.damage as any).triggers.lottery.correctCount = correctCount;
                        (pendingRollData.damage as any).triggers.lottery.wrongCount = wrongCount;
                      }
                    } catch {}
                    const targetId = pendingActionEntryId || (newHistoryEntries && newHistoryEntries.length > 0 ? newHistoryEntries[0].id : null);
                    if (targetId) updateEntryLotteryInfo(targetId, { rolls: lotteryPreview.items.map(it => it.roll), correctCount, wrongCount });
                  }
                } catch {}
                if (pendingActionEntryId) updateEntryBadge(pendingActionEntryId, 'Critico!');
                const characterForRoll = (pendingActorForRoll?.character ?? selectedCharacter) as any;
                const calculationsForRoll = pendingActorForRoll?.calculations ?? calculations;
                if (characterForRoll && pendingRollData) {
                  const d = JSON.parse(JSON.stringify(pendingRollData));
                  (d.damage as any).criticalExtraPureValue = Number(extraPure || 0);
                  const rollForProcessing = applyPhaseToRollForProcessing(d);
                  if (getLaunchDelayTurnsFromRoll(rollForProcessing) > 0) {
                    try { scheduleLaunchDelayEventFromRoll(rollForProcessing, { isCritical: true }); } catch {}
                    setPendingRollData(null);
                    setPendingActorForRoll(null);
                    setPendingActionEntryId(null);
                    setPendingLottery(null);
                    setLotteryPreview(null);
                    return;
                  }
                  const entry = addDamageEntryFromModalRoll(characterForRoll, rollForProcessing, true, calculationsForRoll);
                  try { await appendTargetResWeakToHistoryIfNeeded(rollForProcessing, entry); } catch {}
                  try {
                    const totalDamage = Number(entry?.result ?? 0);
                    if (totalDamage > 0) {
                      await applyDirectDamageFromRoll(rollForProcessing, totalDamage, entry?.id, entry?.damageSources);
                    }
                  } catch {}
                  await tryCreateEvocationInstanceFromRoll(rollForProcessing);
                  await tryAddLevelWarningAnomalyFromRoll(rollForProcessing);
                  await tryAddActiveSpellEventFromRoll(rollForProcessing);
                  await applySelfEffectsFromRoll(rollForProcessing);
                  await tryApplyLevelAnomaliesToTargetsFromRoll(rollForProcessing, characterForRoll);

                  try {
                    const srcD: any = pendingRollData?.damage;
                    if (srcD && (srcD.source === 'magic' || srcD.source === 'ability')) {
                      const item = srcD.source === 'magic' ? srcD.spell : srcD.ability;
                      const phase = extractPhaseFlowInfo(item);
                      const canContinue = phase.enabled && phase.index < phase.phases.length - 1;
                      if (canContinue && !terminateHere) {
                        const nextIndex = phase.index + 1;
                        const nextItem = { ...(item || {}), __phaseAttack: { index: nextIndex } };
                        const nextInfo = extractPhaseFlowInfo(nextItem);
                        const nextPhaseData = (nextInfo.phases || [])[nextInfo.index] || null;
                        const nextItemForRoll = nextPhaseData ? applyPhaseToItemForDamage(nextItem, nextPhaseData) : nextItem;
                        const nextPending = JSON.parse(JSON.stringify(pendingRollData));
                        if (srcD.source === 'magic') (nextPending.damage as any).spell = nextItemForRoll;
                        else (nextPending.damage as any).ability = nextItemForRoll;
                        delete (nextPending.damage as any).criticalExtraPureValue;

                        const nextWithCost = enrichRollDataWithActionCost(nextPending);
                        try {
                          const trig = (nextWithCost?.damage as any)?.triggers;
                          const lot = trig?.lottery;
                          if (lot && toBool(lot.enabled) && Number(lot.diceFaces || 0) > 0 && Number(lot.numericChoices || 0) > 0) {
                            const df = Number(lot.diceFaces || 0) || 0;
                            const nc = Number(lot.numericChoices || 0) || 0;
                            const uc = Array.isArray(lot.userChoices) ? lot.userChoices.filter((x: any) => typeof x === 'number') : [];
                            setPendingLottery({ diceFaces: df, numericChoices: nc, userChoices: uc });
                          } else {
                            setPendingLottery(null);
                          }
                        } catch {
                          setPendingLottery(null);
                        }
                        setLotteryPreview(null);
                        setTerminateHere(false);
                        try {
                          if (srcD.source === 'magic') {
                            await applyMagicActionCostFromRoll(nextWithCost, characterForRoll);
                          } else {
                            await applyAbilityActionCostFromRoll(nextWithCost, characterForRoll);
                          }
                        } catch {}
                        const created = addEntryFromModalRoll(characterForRoll, nextWithCost, calculationsForRoll);
                        setPendingActionEntryId(created?.id || null);
                        let nextRecap: { result: number; maxValue: number; statValue: number; competenceTotal: number } | null = null;
                        try {
                          if (created) {
                            const competenceTotal = Array.isArray((created as any)?.competenceDetails)
                              ? (created as any).competenceDetails.reduce((sum: number, c: any) => sum + (Number(c?.roll || 0) || 0), 0)
                              : 0;
                            nextRecap = {
                              result: Number((created as any)?.result ?? 0) || 0,
                              maxValue: Number((created as any)?.diceMax ?? 0) || 0,
                              statValue: Number((created as any)?.statValue ?? 0) || 0,
                              competenceTotal,
                            };
                          }
                        } catch {
                          nextRecap = null;
                        }
                        setActionRollRecap(nextRecap);
                        setPendingRollData(nextWithCost);
                        setTimeout(() => {
                          setActionRollRecap(nextRecap);
                          setShowRollSuccess(true);
                        }, 50);
                        return;
                      }
                    }
                  } catch {}
                }
                setPendingRollData(null);
                setPendingActorForRoll(null);
                setPendingActionEntryId(null);
                setPendingLottery(null);
                setLotteryPreview(null);
              }}
            />
          );
        }

        // Dialog custom: conferma dell'azione + coda di richieste per ogni attacco
        return (
          <Dialog open={showRollSuccess} onOpenChange={setShowRollSuccess}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Risultato del Tiro</DialogTitle>
                <div className="text-sm text-muted-foreground">
                  {spellOrAbilityName && `Hai utilizzato: ${spellOrAbilityName}${selectedShots > 0 ? `, ${selectedShots} colpi.` : ''}`}
                  <br />
                  Il tiro è riuscito?
                  {warningText && (
                    <>
                      <br />
                      <span className="text-destructive font-medium">Avviso livello:</span>
                      <br />
                      <span className="text-destructive">{warningText}</span>
                    </>
                  )}
                  {showTerminateHere && (
                    <>
                      <br />
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant={terminateHere ? 'default' : 'outline'}
                          className={terminateHere ? 'bg-red-600 hover:bg-red-700' : ''}
                          onClick={() => {
                            const next = !terminateHere;
                            setTerminateHere(next);
                          }}
                        >
                          Termina qui
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogHeader>
              {actionRollRecap && (
                <div className="mt-3 p-2 border rounded">
                  <div className="text-sm font-medium">Tiro di azione</div>
                  <div className="mt-1 text-sm">
                    Risultato: <span className="font-semibold">{actionRollRecap.result}</span>
                    {actionRollRecap.maxValue ? (
                      <span className="text-muted-foreground"> / d{actionRollRecap.maxValue}</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Stat: {actionRollRecap.statValue} • Competenze: {actionRollRecap.competenceTotal}
                  </div>
                </div>
              )}
              {!actionSuccessResolved ? (
                <div className="mt-3 p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Bersagli selezionati</div>
                    <Button size="sm" variant="outline" onClick={() => setShowMultiShotTargetEdit(true)}>Modifica bersagli</Button>
                  </div>
                  <div className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
                    {(() => { const list = Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : []; const single = (pendingRollData?.target && pendingRollData?.target?.type && pendingRollData?.target?.type !== 'none') ? [pendingRollData.target] : []; const merged = list.length > 0 ? list : single; return (merged.length > 0) ? merged.map((t: any, idx: number) => (<div key={`tgt-ms-${idx}`} className="text-sm">{t?.name || 'Sconosciuto'}<span className="text-muted-foreground ml-2">{t?.type}</span></div>)) : (<div className="text-xs text-muted-foreground">Nessun bersaglio selezionato</div>); })()}
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowMultiShotTargetEdit(true)}>Modifica bersagli</Button>
                </div>
              )}
              <TargetEditDialog
                isOpen={showMultiShotTargetEdit}
                onOpenChange={setShowMultiShotTargetEdit}
                selectedTargets={(() => { try { const list = Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : []; const single = (pendingRollData?.target && pendingRollData?.target?.type && pendingRollData?.target?.type !== 'none') ? [pendingRollData.target] : []; const merged = list.length > 0 ? list : single; return merged; } catch { return []; } })()}
                selectedShots={selectedShots}
                shotsTargets={Array.isArray((pendingRollData as any)?.shotsTargets) ? (pendingRollData as any).shotsTargets : undefined}
                availableCharacters={(characters || []).map((c: any) => ({ id: String(c?.id || ''), name: String(c?.name || '') }))}
                availableEnemies={(enemies || []).map((e: any) => ({ id: String(e?.id || ''), name: String(e?.name || '') }))}
                availableEvocations={(allEvocationInstances || []).map((ev: any) => ({ id: String(ev?.id || ''), name: String(ev?.name || '') }))}
                onSave={(updated) => {
                  try {
                    setPendingRollData(prev => {
                      if (!prev) return prev;
                      const next: any = JSON.parse(JSON.stringify(prev));
                      next.targets = Array.isArray(updated) ? updated : [];
                      next.target = (updated && updated[0]) ? { type: updated[0].type, id: updated[0].id, name: updated[0].name } : { type: 'none' };
                      return next;
                    });
                    setShowMultiShotTargetEdit(false);
                  } catch {}
                }}
                onSaveShotsTargets={(sts) => {
                  try {
                    setPendingRollData(prev => {
                      if (!prev) return prev;
                      const next: any = JSON.parse(JSON.stringify(prev));
                      next.shotsTargets = Array.isArray(sts) ? sts : [];
                      setShowMultiShotTargetEdit(false);
                      return next;
                    });
                  } catch {}
                }}
              />
              {!actionSuccessResolved ? (
                <div className="flex gap-3 justify-center mt-4">
                  <Button variant="destructive" className="flex-1" onClick={handleActionFailure}>No</Button>
                  <Button className="flex-1" onClick={() => handleActionSuccessStart(false)}>Sì</Button>
                  <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={() => handleActionSuccessStart(true)}>Sì con critico</Button>
                </div>
              ) : (
                <div className="mt-6">
                  <div className="font-medium mb-2">Conferma attacchi multipli</div>
                  {defaultCritical && (
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground mb-1">Valore critico puro (tutti i colpi)</div>
                      <Input
                        type="number"
                        value={criticalExtraValueGlobal}
                        onChange={(e) => setCriticalExtraValueGlobal(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-32"
                      />
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mb-3">Attacchi da risolvere: {multiShotItems.length}</div>
                  <div className="sm:hidden">
                    {(() => {
                      const idx = (Array.isArray(multiShotItems) && multiShotItems.length > 0) ? multiShotItems[0] : null;
                      if (!idx) return <div className="text-xs text-muted-foreground">Tutti gli attacchi sono stati risolti.</div>;
                      const recap = idx === 1 ? (multiShotRollRecaps[idx] || actionRollRecap) : multiShotRollRecaps[idx];
                      const list = (() => {
                        try {
                          const shots = Array.isArray((pendingRollData as any)?.shotsTargets) ? (pendingRollData as any).shotsTargets : [];
                          const fromShots = shots && shots[idx - 1] ? shots[idx - 1] : null;
                          if (Array.isArray(fromShots) && fromShots.length > 0) return fromShots;
                          return Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : [];
                        } catch {
                          return [];
                        }
                      })();
                      const canConfirm = (idx === 1 || multiShotRollStarted[idx]);
                      return (
                        <div className="border rounded p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Attacco #{idx}</div>
                            <div className="text-xs text-muted-foreground">
                              {multiShotItems.length} rimasti
                            </div>
                          </div>

                          <div className="text-sm">
                            <span className="text-muted-foreground">Tiro: </span>
                            {recap ? (
                              <>
                                <span className="font-medium">{recap.result}</span>
                                {recap.maxValue ? <span className="text-muted-foreground">{` / d${recap.maxValue}`}</span> : null}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="text-sm font-medium">Bersagli</div>
                            <div className="flex flex-wrap items-center gap-1 text-xs">
                              {(list || []).length > 0 ? (
                                (list || []).map((t: any, i: number) => (
                                  <span key={`shot-mobile-${idx}-t-${i}`} className="px-2 py-1 border rounded">
                                    {(t?.name || 'Sconosciuto')}
                                    <span className="text-muted-foreground ml-1">{t?.type}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground">Nessun bersaglio</span>
                              )}
                            </div>
                          </div>

                          {!defaultCritical && shotCriticalPending === idx && canConfirm && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Valore critico puro</div>
                              <Input
                                type="number"
                                value={criticalExtraPerShot[idx] ?? 0}
                                onChange={(e) => setCriticalExtraPerShot(prev => ({ ...prev, [idx]: Number(e.target.value) || 0 }))}
                                placeholder="0"
                              />
                            </div>
                          )}

                          {canConfirm ? (
                            <div className="grid grid-cols-1 gap-2">
                              <Button variant="destructive" onClick={() => handleShotResponse(idx, 'failure')}>No</Button>
                              <Button onClick={() => handleShotResponse(idx, 'success')}>Sì</Button>
                              {shotCriticalPending === idx && !defaultCritical ? (
                                <Button className="bg-yellow-700 hover:bg-yellow-800" onClick={() => handleShotResponse(idx, 'critical')}>Conferma critico</Button>
                              ) : (
                                <Button
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                  onClick={() => setShotCriticalPending(idx)}
                                  disabled={defaultCritical}
                                  title={defaultCritical ? 'Critico globale attivo' : undefined}
                                >
                                  Critico
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                variant="default"
                                className="bg-secondary"
                                onClick={() => handleShotRollStart(idx)}
                                title="Esegui tiro di riuscita"
                              >
                                <Dice6 className="w-4 h-4 mr-1" /> Tira
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="hidden sm:block space-y-2">
                    {multiShotItems.map((idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="text-sm w-32">Attacco #{idx}</div>
                        <div className="text-xs text-muted-foreground w-36">
                          {(() => {
                            const recap = idx === 1 ? (multiShotRollRecaps[idx] || actionRollRecap) : multiShotRollRecaps[idx];
                            if (!recap) return <>Tiro: -</>;
                            return (
                              <>
                                Tiro: {recap.result}
                                {recap.maxValue ? ` / d${recap.maxValue}` : ''}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                          {(() => {
                            try {
                              const shots = Array.isArray((pendingRollData as any)?.shotsTargets) ? (pendingRollData as any).shotsTargets : [];
                              const list = shots && shots[idx - 1] ? shots[idx - 1] : (
                                Array.isArray(pendingRollData?.targets) ? (pendingRollData?.targets || []) : []
                              );
                              return (list || []).length > 0 ? (
                                (list || []).map((t: any, i: number) => (
                                  <span key={`shot-${idx}-t-${i}`} className="px-2 py-1 border rounded">
                                    {(t?.name || 'Sconosciuto')}
                                    <span className="text-muted-foreground ml-1">{t?.type}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground">Nessun bersaglio</span>
                              );
                            } catch {
                              return <span className="text-muted-foreground">Nessun bersaglio</span>;
                            }
                          })()}
                        </div>
                        {!defaultCritical && shotCriticalPending === idx && (multiShotRollStarted[idx] || idx === 1) && (
                          <Input
                            type="number"
                            value={criticalExtraPerShot[idx] ?? 0}
                            onChange={(e) => setCriticalExtraPerShot(prev => ({ ...prev, [idx]: Number(e.target.value) || 0 }))}
                            placeholder="Valore critico puro"
                            className="w-36"
                          />
                        )}
                        <div className="flex gap-2 ml-auto">
                          {(idx === 1 || multiShotRollStarted[idx]) ? (
                            <>
                              <Button size="sm" variant="destructive" onClick={() => handleShotResponse(idx, 'failure')}>No</Button>
                              <Button size="sm" onClick={() => handleShotResponse(idx, 'success')}>Sì</Button>
                              {shotCriticalPending === idx && !defaultCritical ? (
                                <Button size="sm" className="bg-yellow-700 hover:bg-yellow-800" onClick={() => handleShotResponse(idx, 'critical')}>Conferma critico</Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                  onClick={() => setShotCriticalPending(idx)}
                                  disabled={defaultCritical}
                                  title={defaultCritical ? 'Critico globale attivo' : undefined}
                                >
                                  Critico
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-secondary"
                              onClick={() => handleShotRollStart(idx)}
                              title="Esegui tiro di riuscita"
                            >
                              <Dice6 className="w-4 h-4 mr-1" /> Tira
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {multiShotItems.length === 0 && (
                      <div className="text-xs text-muted-foreground">Tutti gli attacchi sono stati risolti.</div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}




{/* Corpo principale: colonna sinistra + area centrale */}
      <div className="grid grid-cols-12 md:grid-rows-[auto_auto] gap-4">
        {/* Colonna sinistra - selezione e specifiche */}
        <div className="col-span-12 md:col-span-3 md:row-start-1 space-y-4">
          <Box title="Personaggio attivo">
            <p className="text-sm text-muted-foreground">
              {userRole === 'admin' ? 'Seleziona qualsiasi personaggio (admin)' : 'Seleziona uno dei tuoi personaggi'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Usa il pulsante “Personaggio” sopra per scegliere.</p>
            {selectedCharacter && (
              <div className="flex items-center gap-2 pt-2">
                <span className="font-medium">{selectedCharacter.name}</span>
                <Badge variant="secondary">Lv. {selectedCharacter.level ?? 1}</Badge>
              </div>
            )}
          </Box>

          <div className="space-y-2">
            <Box title="Salute:" className="text-center text-xs">
              <div className="text-xs">{selectedCharacter ? `${currentHealth}/${maxHealth}` : 'x/x'}</div>
              <Progress
                value={selectedCharacter ? (Number(currentHealth || 0) / Math.max(1, Number(maxHealth || 0))) * 100 : 0}
                className="h-1.5 mt-1"
                style={{ '--progress-background': '#22c55e' } as React.CSSProperties}
              />
            </Box>
            <Box title="Armatura" className="text-center text-xs">
              <div className="text-xs">{selectedCharacter ? `${currentArmor}/${totalArmor}` : 'x/x'}</div>
              <Progress
                value={selectedCharacter ? (Number(currentArmor || 0) / Math.max(1, Number(totalArmor || 0))) * 100 : 0}
                className="h-1.5 mt-1"
                style={{ '--progress-background': '#6b7280' } as React.CSSProperties}
              />
            </Box>
            <Box title="Punti azione:" className="text-center text-xs">
              <div className="text-xs">{selectedCharacter ? `${currentActionPoints}/${maxActionPoints}` : 'x/x'}</div>
              <Progress
                value={selectedCharacter ? (Number(currentActionPoints || 0) / Math.max(1, Number(maxActionPoints || 0))) * 100 : 0}
                className="h-1.5 mt-1"
                style={{ '--progress-background': '#38bdf8' } as React.CSSProperties}
              />
            </Box>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowCustomSpecificsModal(true)}
            disabled={!selectedCharacter}
          >
            Specifiche custom
          </Button>
        </div>

        {/* Colonna sinistra - spiegazione postura */}
        <div className="col-span-12 md:col-span-3 md:row-start-2">
          <Box title="Spiegazione Postura" className="min-h-[140px]">
            {selectedPosture ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedPosture.name}</span>
                  {selectedPosture.current_level && (
                    <Badge variant="outline" className="text-xs">Lv. {selectedPosture.current_level}</Badge>
                  )}
                </div>
                {selectedPosture.description && (
                  <p className="text-muted-foreground">{selectedPosture.description}</p>
                )}
                {selectedPosture.level_description && (
                  <p className="text-muted-foreground">{selectedPosture.level_description}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nessuna postura attiva. Apri il selettore per impostarne una.</div>
            )}
          </Box>
        </div>

        {/* Area centrale grande: deve estendersi fino alla spiegazione postura */}
        <div className="col-span-12 md:col-span-9 md:row-span-2">
          <Box className="h-[60vh] max-h-[60vh] overflow-hidden">
            <NewRollHistoryPanel entries={newHistoryEntries} onClear={clearNewHistory} />
          </Box>
        </div>
      </div>

      {/* Barra inferiore di liste */}
      <div className="border rounded-md p-4 bg-background">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[140px]">
          <Button
            className="w-full h-full text-base py-6"
            variant="secondary"
            onClick={() => { setIsCharactersSidebarOpen(true); loadPublicCharacters(); }}
          >
            Lista personaggi
          </Button>
          <Button className="w-full h-full text-base py-6" variant="secondary" onClick={() => { setShowActiveEventsModal(true); reloadAllEvocations(); }}>Eventi attivi</Button>
          <Button className="w-full h-full text-base py-6" variant="secondary" onClick={() => setShowEvocationsModal(true)}>Lista Evocazioni</Button>
          <Button
            className="w-full h-full text-base py-6"
            variant="secondary"
            onClick={() => { setIsEnemiesSidebarOpen(true); loadEnemies(); }}
          >
            Lista nemici
          </Button>
          <Button className="w-full h-full text-base py-6" asChild variant="secondary"><Link to="/collected-items">Oggetti raccolti</Link></Button>
        </div>
      </div>

      {/* Sidebar lista personaggi pubblici */}
      <CharactersSidebar
        isOpen={isCharactersSidebarOpen}
        onClose={() => setIsCharactersSidebarOpen(false)}
        characters={publicCharacters as any}
        selectedCharacterId={selectedPublicCharacterId}
        onCharacterSelect={(id: string) => {
          // Manteniamo la selezione del personaggio se appartiene all'utente
          const found = publicCharacters.find((c: any) => c.id === id);
          if (found) {
            // Non cambiamo selectedCharacter locale del dashboard per evitare inconsistenze
            // La sidebar serve come consultazione dei pubblici
            setSelectedPublicCharacterId(id);
          }
        }}
      />

      {/* Sidebar lista nemici */}
      <EnemiesSidebar
        isOpen={isEnemiesSidebarOpen}
        onClose={() => setIsEnemiesSidebarOpen(false)}
        enemies={enemies}
        selectedEnemyId={selectedEnemyId}
        onEnemySelect={(id?: string) => {
          if (id) setSelectedEnemyId(String(id));
          setIsEnemiesSidebarOpen(false);
        }}
      />

      {/* Sezione inferiore: tre colonne */}
      <div className="grid grid-cols-12 gap-4">
        {/* Colonna sinistra: Nemico */}
        <div className="col-span-12 md:col-span-3 space-y-4">
          <Box className="min-h-[300px] flex flex-col">
            <div className="text-center font-semibold mb-2">Nemico</div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 max-w-[220px] mx-auto w-full">
              <Button className="w-full" variant="secondary" onClick={() => setIsAddEnemyModalOpen(true)}>Crea nemico</Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  if (!selectedEnemy) {
                    toast({ title: 'Nessun nemico selezionato', description: 'Seleziona un nemico da modificare.', variant: 'destructive' });
                    return;
                  }
                  setEditingEnemy(selectedEnemy);
                  setIsAddEnemyModalOpen(true);
                }}
              >
                Modifica nemico
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  if (!selectedEnemy) {
                    toast({ title: 'Nessun nemico selezionato', description: 'Seleziona un nemico per tirare un dado.', variant: 'destructive' });
                    return;
                  }
                  setIsEnemyStatSelectionOpen(true);
              }}
            >
              Tira dado N
            </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  if (!selectedEnemy) {
                    toast({ title: 'Nessun nemico selezionato', description: 'Seleziona un nemico per impostare la postura.', variant: 'destructive' });
                    return;
                  }
                  setIsEnemyPostureModalOpen(true);
                }}
              >
                Postura N
              </Button>
            </div>
          </Box>
        </div>

        {/* Colonna centrale: Specifiche nemico + azioni in colonne affiancate */}
        <div className="col-span-12 md:col-span-5">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-7 space-y-4 h-[300px] flex flex-col">
              <Box title="Selezione nemico" className="flex items-center justify-between p-2 min-h-[64px]">
                <div className="text-sm">
                  {selectedEnemy ? (
                    <span>
                      Nemico selezionato: <span className="font-medium">{selectedEnemy?.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Nessun nemico selezionato</span>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setIsEnemySelectionOpen(true)}>Seleziona nemico</Button>
              </Box>
              <Box title="Specifiche nemico" className="flex-1 p-3">
                <div className="h-full flex flex-col items-center justify-center text-center">
                  {!selectedEnemy ? (
                    <div className="text-sm text-muted-foreground">Seleziona un nemico per vedere le specifiche.</div>
                  ) : (
                    (() => {
                      const n = (v: unknown): number => Number(v ?? 0);
                      const hpCur = n(selectedEnemy?.enemy_current_hp ?? selectedEnemy?.enemy_max_hp ?? 0);
                      const hpMax = n(selectedEnemy?.enemy_max_hp ?? selectedEnemy?.enemy_current_hp ?? 0);
                      const arCur = n(selectedEnemy?.enemy_current_armor ?? selectedEnemy?.enemy_max_armor ?? 0);
                      const arMax = n(selectedEnemy?.enemy_max_armor ?? selectedEnemy?.enemy_current_armor ?? 0);
                      const paCur = n(selectedEnemy?.enemy_current_pa ?? selectedEnemy?.enemy_max_pa ?? 0);
                      const paMax = n(selectedEnemy?.enemy_max_pa ?? selectedEnemy?.enemy_current_pa ?? 0);
                      return (
                        <div className="flex flex-col items-center justify-center gap-4 text-sm mx-auto">
                          <div className="flex flex-col items-center">
                            <div className="font-medium">Salute:</div>
                            <div>{hpCur}/{hpMax}</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="font-medium">Armatura:</div>
                            <div>{arCur}/{arMax}</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="font-medium">Punti azione:</div>
                            <div>{paCur}/{paMax}</div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </Box>
            </div>
            <div className="col-span-5">
      <Box title="Azioni nemico" className="min-h-[300px] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 max-w-[220px] mx-auto w-full">
          <Button className="w-full" variant="secondary" onClick={() => setShowEnemySheet(true)}>Scheda nemico</Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              if (!selectedEnemy) {
                toast({ title: 'Nessun nemico selezionato', description: 'Seleziona un nemico da modificare.', variant: 'destructive' });
                return;
              }
              setIsEnemyModificationModalOpen(true);
            }}
          >
            Modifica specifiche
          </Button>
          <Button className="w-full" variant="destructive" onClick={handleDeleteSelectedEnemy}>Elimina nemico</Button>
          <Button className="w-full" variant="secondary" onClick={() => {
            if (!selectedEnemy) {
              toast({ title: 'Nessun nemico selezionato', description: 'Seleziona un nemico per gestire le anomalie.', variant: 'destructive' });
              return;
            }
            setShowEnemyAnomaliesModal(true);
          }}>Anomalie nemico</Button>
        </div>
      </Box>
            </div>
          </div>
        </div>

        {/* Colonna destra: Anomalie di stato nemico */}
        <div className="col-span-12 md:col-span-4">
          <Box title="Anomalie di stato nemico:" className="min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Attive</div>
              <Badge variant="secondary">{enemyAnomalies.length}</Badge>
            </div>
            {enemyAnomalies.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nessuna anomalia per il nemico selezionato</div>
            ) : (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {enemyAnomalies.map((a, idx) => (
                  <div key={a.id || idx} className="border rounded p-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      {a.turns != null && <div className="text-xs text-muted-foreground">Turni rimanenti: {Number(a.turns ?? 0)}</div>}
                    </div>
                    <Badge variant="outline">{selectedEnemy?.name || 'Nemico'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Box>
        </div>
      </div>
      {/* Modale Aggiungi Nemico */}
      <Dialog open={isAddEnemyModalOpen} onOpenChange={(open) => { setIsAddEnemyModalOpen(open); if (!open) setEditingEnemy(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEnemy ? 'Modifica Nemico' : 'Aggiungi Nuovo Nemico'}</DialogTitle>
          </DialogHeader>
          <AddEnemyForm initialData={editingEnemy || undefined} onSave={handleSaveEnemy} onCancel={() => { setIsAddEnemyModalOpen(false); setEditingEnemy(null); }} />
        </DialogContent>
      </Dialog>

      {/* Modale Postura Nemico */}
      <EnemyPostureSelectionModal
        isOpen={isEnemyPostureModalOpen}
        onOpenChange={setIsEnemyPostureModalOpen}
        enemy={selectedEnemy || null}
        onEnemyUpdate={(updatedEnemy) => {
          setEnemies(prev => prev.map(e => e.id === updatedEnemy.id ? updatedEnemy : e));
        }}
      />

      {/* Modale Anomalie Nemico */}
      <Dialog open={showEnemyAnomaliesModal} onOpenChange={setShowEnemyAnomaliesModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Anomalie nemico</DialogTitle>
          </DialogHeader>
          <CharacterAnomalies
            anomalies={enemyAnomalies}
            onAddAnomaly={addEnemyAnomaly}
            onUpdateAnomaly={updateEnemyAnomaly}
            onRemoveAnomaly={removeEnemyAnomaly}
          />
        </DialogContent>
      </Dialog>

      {/* Modale Stat + Danno Nemico */}
      <EnemyStatSelectionDialog
        isOpen={isEnemyStatSelectionOpen}
        onClose={() => setIsEnemyStatSelectionOpen(false)}
        enemy={selectedEnemy || null}
        onConfirm={handleEnemyStatConfirm}
      />

      <EnemyDirectModificationModal
        isOpen={isEnemyModificationModalOpen}
        onClose={() => setIsEnemyModificationModalOpen(false)}
        enemy={selectedEnemy || null}
        onSave={handleEnemyDirectModificationSave}
        onAddDiceRoll={(roll: any) => {
          try {
            const modLabel = (() => {
              const t = String(roll?.modificationType || '');
              if (t === 'salute') return 'Salute';
              if (t === 'puntiAzione') return 'Punti Azione';
              if (t === 'armatura') return 'Armatura';
              return 'Modifica';
            })();
            const dirSign = String(roll?.modificationDirection || '') === 'negativo' ? '-' : '+';
            const orig = Number(roll?.originalValue ?? 0);
            const next = Number(roll?.newValue ?? 0);
            const who = selectedEnemy?.name || String(roll?.character || 'Nemico');
            const msg = `${who} — ${modLabel} ${dirSign}${Math.abs(Number(roll?.result || 0))} (${orig} → ${next})`;
            addCustomEntry({
              message: msg,
              characterId: selectedEnemy ? String(selectedEnemy.id) : undefined,
              characterName: who,
              result: Math.round(Number(roll?.result || 0)),
              diceMax: 0,
              entryType: 'action'
            });
          } catch {}
        }}
      />

      {/* Scheda Nemico (layout ridotto stile Character) */}
      <EnemySheet
        open={showEnemySheet}
        onOpenChange={setShowEnemySheet}
        enemy={selectedEnemy || null}
      />

      {/* Finestra selezione nemico */}
      <Dialog open={isEnemySelectionOpen} onOpenChange={setIsEnemySelectionOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seleziona Nemico</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Cerca nemico..."
              value={enemySearchTerm}
              onChange={(e) => setEnemySearchTerm(e.target.value)}
            />
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {enemies
                .filter((e: any) => String(e?.name || '')
                  .toLowerCase()
                  .includes(enemySearchTerm.toLowerCase()))
                .map((e: any) => (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between border rounded-md p-2 ${selectedEnemyId === e.id ? 'bg-muted' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{e?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Lv {e?.enemy_level ?? 1} • HP {e?.enemy_current_hp ?? e?.enemy_max_hp ?? 0} • PA {e?.enemy_current_pa ?? e?.enemy_max_pa ?? 0}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setSelectedEnemyId(String(e.id)); setIsEnemySelectionOpen(false); }}
                    >
                      Seleziona
                    </Button>
                  </div>
                ))}
              {enemies.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessun nemico disponibile.</div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiceDashboard;
