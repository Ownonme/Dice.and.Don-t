import type { Character } from '@/types/character';

type Row = {
  id: string;
  user_id: string;
  name: string;
  level: number;
  data: Character;
  avatar_url?: string | null;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
};

const KEY = 'local_characters';
const ROLE_KEY = 'local_user_role';

const readAll = (): Row[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Row[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeAll = (arr: Row[]) => {
  localStorage.setItem(KEY, JSON.stringify(arr));
};

export const list = (userId?: string, role?: 'admin' | 'personale'): Row[] => {
  const arr = readAll();
  if (role === 'admin') return arr;
  return userId ? arr.filter(c => c.user_id === userId) : [];
};

export const getById = (id: string): Row | null => {
  return readAll().find(c => c.id === id) || null;
};

export const insert = (rec: Omit<Row, 'id' | 'created_at' | 'updated_at'>): Row => {
  const now = new Date().toISOString();
  const row: Row = { ...rec, id: crypto.randomUUID(), created_at: now, updated_at: now };
  const arr = readAll();
  arr.unshift(row);
  writeAll(arr);
  return row;
};

export const update = (id: string, patch: Partial<Row>) => {
  const arr = readAll();
  const idx = arr.findIndex(c => c.id === id);
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], ...patch, updated_at: new Date().toISOString() };
    writeAll(arr);
    return true;
  }
  return false;
};

export const remove = (id: string) => {
  const arr = readAll().filter(c => c.id !== id);
  writeAll(arr);
  return true;
};

export const getUserRole = (userId: string): 'admin' | 'personale' => {
  const role = localStorage.getItem(ROLE_KEY);
  return role === 'admin' ? 'admin' : 'personale';
};

export const setUserRole = (role: 'admin' | 'personale') => {
  localStorage.setItem(ROLE_KEY, role);
};

