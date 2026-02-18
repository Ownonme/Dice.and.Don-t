type DiceRoll = {
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
};

const KEY = 'local_dice_rolls';
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('local_dice_rolls')
  : null;

const readAll = (): DiceRoll[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as DiceRoll[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeAll = (arr: DiceRoll[]) => {
  localStorage.setItem(KEY, JSON.stringify(arr));
};

export const list = (limit = 100): DiceRoll[] => {
  const arr = readAll();
  arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return arr.slice(0, limit);
};

export const insert = (roll: Omit<DiceRoll, 'id' | 'created_at'>): DiceRoll => {
  const newRoll: DiceRoll = {
    ...roll,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const arr = readAll();
  arr.unshift(newRoll);
  writeAll(arr);
  channel?.postMessage({ type: 'INSERT', new: newRoll });
  return newRoll;
};

export const clear = (): number => {
  const count = readAll().length;
  writeAll([]);
  channel?.postMessage({ type: 'CLEAR', count });
  return count;
};

export const subscribe = (
  handler: (event: { type: 'INSERT' | 'DELETE' | 'CLEAR'; new?: DiceRoll; count?: number }) => void
) => {
  if (channel) {
    const cb = (ev: MessageEvent) => handler(ev.data);
    channel.addEventListener('message', cb);
    return () => channel.removeEventListener('message', cb);
  }
  const storageHandler = (ev: StorageEvent) => {
    if (ev.key === KEY) handler({ type: 'CLEAR' });
  };
  window.addEventListener('storage', storageHandler);
  return () => window.removeEventListener('storage', storageHandler);
};

