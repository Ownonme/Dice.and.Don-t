import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isAllZeroStats = (v: any): boolean => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return true;
  return Object.values(v).every((x) => (typeof x === 'number' ? x : Number(x) || 0) === 0);
};

export const pruneEmptyFields = <T = any>(
  value: T,
  options?: { dropZero?: boolean }
): T | undefined => {
  const dropZero = !!options?.dropZero;

  const prune = (v: any): any => {
    if (v == null) return undefined;
    if (typeof v === 'string') return v.trim().length === 0 ? undefined : v;
    if (typeof v === 'number') return dropZero && v === 0 ? undefined : v;
    if (typeof v === 'boolean') return v;
    if (Array.isArray(v)) {
      const out = v.map(prune).filter((x) => x !== undefined);
      return out.length > 0 ? out : undefined;
    }
    if (typeof v === 'object') {
      if (v instanceof Date) return v;
      const out: any = {};
      for (const [k, vv] of Object.entries(v)) {
        const next = prune(vv);
        if (next !== undefined) out[k] = next;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    }
    return v;
  };

  return prune(value);
};
