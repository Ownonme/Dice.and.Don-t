import { supabase } from '@/integrations/supabase/client';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';

export interface AdminEvocationDefinition {
  name: string;
  type: 'weapon' | 'entity' | 'replica';
  levels: any[];
}

export async function createEvocation(payload: AdminEvocationDefinition) {
  const allowedTypes = ['weapon', 'entity', 'replica'] as const;
  if (!allowedTypes.includes(payload.type as any)) {
    throw new Error(`Tipo evocazione non valido: ${payload.type}. Ammessi: weapon, entity, replica.`);
  }

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
    name: payload.name,
    evocation_type: payload.type, // usa solo la colonna definitiva
    levels: payload.levels,
    created_by: userId,
  };

  if (localMode) {
    const { data, error } = await supabase.from('evocations').insert(row);
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from('evocations').insert(row).select('*').maybeSingle();

  if (error) throw error;
  return data;
}

export async function listEvocations() {
  const { data, error } = await supabase
    .from('evocations')
    .select('id, name, evocation_type, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEvocationById(id: string) {
  const { data, error } = await supabase
    .from('evocations')
    .select('id, name, evocation_type, levels')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
