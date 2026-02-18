import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { isLocalDb } from '@/integrations/localdb';
import * as LocalDice from '@/integrations/localdb/diceRolls';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';

export interface DiceRoll {
  id: string;
  user_id: string;
  character_name: string;
  dice_type: string;
  dice_count: number;
  result: number;
  modifier: number;
  total_result: number;
  roll_type?: string;
  details?: any;
  created_at: string;
}

export const useDiceHistory = () => {
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const loadHistory = useCallback(async () => {
    try {
      if (isLocalServer()) {
        const data = await Api.listDiceRolls(100);
        setRolls((data || []) as DiceRoll[]);
        return;
      }
      if (isLocalDb()) {
        const data = LocalDice.list(100) as any as DiceRoll[];
        setRolls(data || []);
        return;
      }

      const { data, error } = await supabase
        .from('dice_rolls')
        .select('id, user_id, character_name, dice_type, dice_count, result, modifier, total_result, roll_type, details, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRolls(data || []);
    } catch (error) {
      console.error('Error loading dice history:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare lo storico dei tiri",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carica storico iniziale
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return;
    if (isLocalServer()) {
      const unsub = Api.subscribeDiceRolls((ev) => {
        if (ev.type === 'INSERT' && ev.new) {
          setRolls(prev => [ev.new as DiceRoll, ...prev]);
        } else if (ev.type === 'CLEAR') {
          setRolls([]);
        }
      });
      return () => unsub();
    }
    if (isLocalDb()) {
      const unsub = LocalDice.subscribe((ev) => {
        if (ev.type === 'INSERT' && ev.new) {
          setRolls(prev => [ev.new as any as DiceRoll, ...prev]);
        } else if (ev.type === 'CLEAR') {
          setRolls([]);
        }
      });
      return () => unsub();
    }

    const channel = supabase
      .channel('dice_rolls_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dice_rolls',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRolls(prev => [payload.new as DiceRoll, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setRolls(prev => prev.filter(roll => roll.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addRoll = async (rollData: Omit<DiceRoll, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    try {
      if (isLocalServer()) {
        await Api.addDiceRoll({
          ...rollData,
          user_id: user.id,
        });
        return;
      }
      if (isLocalDb()) {
        LocalDice.insert({
          ...rollData,
          user_id: user.id,
        } as any);
        return;
      }

      const { error } = await supabase
        .from('dice_rolls')
        .insert({
          ...rollData,
          user_id: user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding dice roll:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il tiro",
        variant: "destructive"
      });
    }
  };

  const clearHistory = async () => {
    // Verifica doppia autorizzazione admin (bypass in server locale)
    if (!user || (!isLocalServer() && !isAdmin)) {
      toast({
        title: "Accesso negato",
        description: "Solo gli amministratori possono pulire lo storico",
        variant: "destructive"
      });
      return;
    }

    setIsClearing(true);
    
    try {
      if (isLocalServer()) {
        const r = await Api.clearDiceRolls();
        toast({ title: 'Storico pulito', description: `${r.count} tiri eliminati` });
        setIsClearing(false);
        return;
      }
      if (isLocalDb()) {
        const count = LocalDice.clear();
        toast({ title: 'Storico pulito', description: `${count} tiri eliminati` });
        setIsClearing(false);
        return;
      }

      // Verifica ruolo admin nel database come sicurezza aggiuntiva
      const { data: adminCheck, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminError || !adminCheck) {
        throw new Error('Autorizzazione admin non verificata');
      }

      // Conta i tiri prima della cancellazione per feedback
      const { count } = await supabase
        .from('dice_rolls')
        .select('*', { count: 'exact', head: true });

      // Cancella tutti i tiri
      const { error } = await supabase
        .from('dice_rolls')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      
      toast({
        title: "Storico pulito",
        description: `${count || 0} tiri sono stati eliminati con successo`
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: "Errore",
        description: "Impossibile pulire lo storico. Verifica i tuoi permessi.",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  return {
    rolls,
    loading,
    isClearing,
    addRoll,
    clearHistory,
    refreshHistory: loadHistory
  };
};
