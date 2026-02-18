import { supabase } from '@/integrations/supabase/client';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';

export type EvocationInstanceRow = {
  id: string;
  character_id: string;
  evocation_id?: string | null;
  name: string;
  evocation_type: 'weapon' | 'entity' | 'replica' | 'energy';
  level: number;
  remaining_turns: number;
  source_type?: 'magic' | 'ability' | null;
  source_id?: string | null;
  details?: any;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function listEvocationInstancesByCharacter(characterId: string) {
  const { data, error } = await supabase
    .from('evocation_instances')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as EvocationInstanceRow[];
}

// Elenca tutte le istanze di evocazione presenti (tipicamente attive perché le scadute vengono cancellate)
export async function listAllEvocationInstances() {
  const { data, error } = await supabase
    .from('evocation_instances')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as EvocationInstanceRow[];
}

export async function createEvocationInstance(payload: Omit<EvocationInstanceRow, 'id' | 'created_by' | 'created_at' | 'updated_at'>) {
  const hasAuthGetUser = typeof (supabase as any)?.auth?.getUser === 'function';
  const localMode = isLocalServer() || !hasAuthGetUser;

  let userId: string | null = null;
  if (!localMode) {
    const { data: userData, error: userError } = await (supabase as any).auth.getUser();
    if (userError) throw userError;
    userId = userData?.user?.id ?? null;
  } else {
    const token = localStorage.getItem('LOCAL_AUTH_TOKEN');
    if (token) {
      try {
        const me = await Api.me(token);
        userId = me?.user?.id ?? null;
      } catch {
        userId = null;
      }
    }
  }

  const row = {
    ...payload,
    created_by: userId,
  };

  if (localMode) {
    const { data, error } = await supabase.from('evocation_instances').insert(row);
    if (error) throw error;
    return data as EvocationInstanceRow;
  }

  const { data, error } = await supabase.from('evocation_instances').insert(row).select('*').maybeSingle();
  if (error) throw error;
  return data as EvocationInstanceRow;
}

export async function updateEvocationInstanceTurns(id: string, remainingTurns: number) {
  const { data, error } = await supabase
    .from('evocation_instances')
    .update({ remaining_turns: remainingTurns })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as EvocationInstanceRow;
}

export async function deleteEvocationInstance(id: string) {
  const { error } = await supabase
    .from('evocation_instances')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
