import { apiBase } from './index';

const base = () => apiBase();
async function doFetch(path: string, options?: RequestInit) {
  const b = base();
  const primary = `${b}${path}`;
  const alt = b.includes('localhost') ? b.replace('localhost', '127.0.0.1') : undefined;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10000);
  const merged: RequestInit = { ...options, mode: 'cors', cache: 'no-store', credentials: 'same-origin', signal: ctrl.signal };
  try {
    const res = await fetch(primary, merged);
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    if (alt) {
      try {
        const res2 = await fetch(`${alt}${path}`, merged);
        return res2;
      } catch (_e) { void 0; }
    }
    throw e;
  }
}

export async function listDiceRolls(limit = 100) {
  const res = await doFetch(`/api/dice_rolls?limit=${limit}`);
  return res.json();
}

export async function addDiceRoll(payload: any) {
  const res = await doFetch(`/api/dice_rolls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to add dice roll');
}

export async function clearDiceRolls() {
  const res = await doFetch(`/api/dice_rolls`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear dice rolls');
  return res.json();
}

export function subscribeDiceRolls(handler: (ev: any) => void) {
  const b = base();
  const fixed = b.includes('localhost') ? b.replace('localhost', '127.0.0.1') : b;
  const url = `${fixed}/api/dice_rolls/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try { handler(JSON.parse(e.data)); } catch (_e) { void 0; }
  };
  return () => es.close();
}

export function subscribeRollHistory(handler: (ev: any) => void) {
  const b = base();
  const fixed = b.includes('localhost') ? b.replace('localhost', '127.0.0.1') : b;
  const url = `${fixed}/api/roll_history/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try { handler(JSON.parse(e.data)); } catch (_e) { void 0; }
  };
  return () => es.close();
}

export function subscribeEnemies(handler: (ev: any) => void) {
  const b = base();
  const fixed = b.includes('localhost') ? b.replace('localhost', '127.0.0.1') : b;
  const url = `${fixed}/api/enemies/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try { handler(JSON.parse(e.data)); } catch (_e) { void 0; }
  };
  return () => es.close();
}

export function subscribeCharacters(handler: (ev: any) => void) {
  const b = base();
  const fixed = b.includes('localhost') ? b.replace('localhost', '127.0.0.1') : b;
  const url = `${fixed}/api/characters/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try { handler(JSON.parse(e.data)); } catch (_e) { void 0; }
  };
  return () => es.close();
}

export async function deleteTableRow(table: string, id: string) {
  const res = await doFetch(`/api/${encodeURIComponent(table)}?eq_id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete row');
  return res.json();
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await doFetch(`/api/uploads`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function getDiary(id: string, userId?: string | null) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const res = await doFetch(`/api/diaries/${id}${q}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function listDiaryPages(diary_id: string, userId?: string | null) {
  const q = userId ? `&user_id=${encodeURIComponent(userId)}` : '';
  const res = await doFetch(`/api/diary_pages?diary_id=${encodeURIComponent(diary_id)}${q}`);
  return res.json();
}

export async function upsertDiaryPage(page: any, userId?: string | null) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const res = await doFetch(`/api/diary_pages${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(page),
  });
  return res.json();
}

export async function listCharacters(userId?: string) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const res = await doFetch(`/api/characters${q}`);
  return res.json();
}

export async function getCharacter(id: string, userId?: string | null) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const res = await doFetch(`/api/characters/${id}${q}`);
  if (res.status === 404) return null;
  if (res.status === 403) return null;
  if (!res.ok) throw new Error('Failed to load character');
  return res.json();
}

export async function createCharacter(payload: any) {
  const res = await doFetch(`/api/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateCharacter(id: string, patch: any) {
  const res = await doFetch(`/api/characters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Update failed');
}

export async function deleteCharacter(id: string) {
  const res = await doFetch(`/api/characters/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

// Auth
export async function signup(email: string, password: string, username?: string) {
  const res = await doFetch(`/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });
  if (!res.ok) throw new Error('Signup failed');
  return res.json();
}
export async function login(email: string, password: string) {
  const res = await doFetch(`/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let msg = 'Login failed';
    try { const j = await res.json(); msg = j?.error || msg; } catch (_e) { void 0; }
    throw new Error(msg);
  }
  return res.json();
}
export async function me(token: string) {
  const res = await doFetch(`/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Auth failed');
  return res.json();
}

// Glossary
export async function listGlossarySections() {
  const res = await doFetch(`/api/glossary_sections`);
  return res.json();
}
export async function listGlossaryEntries(sectionId?: string) {
  const q = sectionId ? `?section_id=${encodeURIComponent(sectionId)}` : '';
  const res = await doFetch(`/api/glossary_entries${q}`);
  return res.json();
}
export async function createGlossaryEntry(entry: any) {
  const res = await doFetch(`/api/glossary_entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return res.json();
}
export async function updateGlossaryEntry(id: string, patch: any) {
  const res = await doFetch(`/api/glossary_entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.json();
}
export async function deleteGlossaryEntry(id: string) {
  const res = await doFetch(`/api/glossary_entries/${id}`, { method: 'DELETE' });
  return res.json();
}
export async function createGlossarySection(section: any) {
  const res = await doFetch(`/api/glossary_sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(section),
  });
  return res.json();
}
export async function updateGlossarySection(id: string, patch: any) {
  const res = await doFetch(`/api/glossary_sections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.json();
}
export async function deleteGlossarySection(id: string) {
  const res = await doFetch(`/api/glossary_sections/${id}`, { method: 'DELETE' });
  return res.json();
}
