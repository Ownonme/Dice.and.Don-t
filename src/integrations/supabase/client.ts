import { apiBase } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';

type QueryState = {
  table: string;
  filters: Record<string, any>;
  order?: { field: string; dir: 'asc' | 'desc' };
  limit?: number;
  action?: 'select' | 'insert' | 'update' | 'delete';
  payload?: any;
  expect?: 'single' | 'maybeSingle' | null;
};

function buildQuery(state: QueryState) {
  const params = new URLSearchParams();
  Object.entries(state.filters).forEach(([k, v]) => {
    if (Array.isArray(v)) params.append(`in_${k}`, v.join(','));
    else if (typeof v === 'string' && v.includes('%')) params.append(`ilike_${k}`, v);
    else params.append(`eq_${k}`, String(v));
  });
  if (state.order) params.append('order', `${state.order.field}:${state.order.dir}`);
  if (state.limit) params.append('limit', String(state.limit));
  return `${apiBase()}/api/${state.table}?${params.toString()}`;
}

function localFrom(table: string) {
  const state: QueryState = { table, filters: {} };
  const execute = async () => {
    try {
      const action = state.action ?? 'select';

      if (action === 'select') {
        const url = buildQuery(state);
        const res = await fetch(url);
        if (!res.ok) return { data: null, error: new Error(`Select failed (${res.status})`) };
        const data = await res.json();
        return { data, error: null };
      }

      if (action === 'insert') {
        const res = await fetch(`${apiBase()}/api/${table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.payload),
        });
        if (!res.ok) return { data: null, error: new Error(`Insert failed (${res.status})`) };
        const data = await res.json();
        return { data, error: null };
      }

      if (action === 'update') {
        const id = state.filters['id'];
        if (!id) return { data: null, error: new Error('Update requires eq("id", ...)') };
        const res = await fetch(`${apiBase()}/api/${table}/${encodeURIComponent(String(id))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.payload),
        });
        if (!res.ok) return { data: null, error: new Error(`Update failed (${res.status})`) };
        const data = await res.json();
        return { data, error: null };
      }

      if (action === 'delete') {
        const id = state.filters['id'];
        if (!id) return { data: null, error: new Error('Delete requires eq("id", ...)') };
        const url = `${apiBase()}/api/${table}?eq_id=${encodeURIComponent(String(id))}`;
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) return { data: null, error: new Error(`Delete failed (${res.status})`) };
        const data = await res.json().catch(() => null);
        return { data, error: null };
      }

      return { data: null, error: new Error('Unsupported action') };
    } finally {
      state.action = undefined;
      state.payload = undefined;
      state.expect = null;
    }
  };

  const normalizeSingle = (data: any) => {
    if (Array.isArray(data)) return data?.[0] ?? null;
    return data ?? null;
  };

  const chain: any = {
    select: (_cols?: string, _options?: any) => {
      if (!state.action) state.action = 'select';
      return chain;
    },
    then: async (resolve: any, reject: any) => {
      try {
        const { data, error } = await execute();
        resolve({ data, error });
      } catch (e) {
        reject(e);
      }
    },
    order: (field: string, opts: { ascending: boolean }) => {
      state.order = { field, dir: opts?.ascending === false ? 'desc' : 'asc' };
      return chain;
    },
    limit: (n: number) => {
      state.limit = n;
      return chain;
    },
    eq: (field: string, value: any) => {
      state.filters[field] = value;
      return chain;
    },
    in: (field: string, values: any[]) => {
      state.filters[field] = values;
      return chain;
    },
    ilike: (field: string, pattern: string) => {
      state.filters[field] = pattern;
      return chain;
    },
    single: async () => {
      state.expect = 'single';
      const { data, error } = await execute();
      const singleData = normalizeSingle(data);
      return { data: singleData, error };
    },
    maybeSingle: async () => {
      state.expect = 'maybeSingle';
      const { data, error } = await execute();
      const singleData = normalizeSingle(data);
      return { data: singleData, error };
    },
    insert: (payload: any) => {
      state.action = 'insert';
      state.payload = payload;
      return chain;
    },
    update: (patch: any) => {
      state.action = 'update';
      state.payload = patch;
      return chain;
    },
    delete: () => {
      state.action = 'delete';
      return chain;
    },
  };
  return chain;
}

export const supabase = {
  from: localFrom,
  auth: {
    getUser: async () => {
      const token = localStorage.getItem('LOCAL_AUTH_TOKEN');
      if (!token) return { data: { user: null }, error: null };
      try {
        const { user } = await Api.me(token);
        return { data: { user: { id: user.id, email: user.email } }, error: null };
      } catch (e) {
        return { data: { user: null }, error: e };
      }
    },
  },
} as any;
