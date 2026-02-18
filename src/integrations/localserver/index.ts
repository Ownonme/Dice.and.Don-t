let __enabled: boolean | undefined = undefined;
export const apiBase = () => {
  const envUrl = String(import.meta.env.VITE_LOCAL_SERVER_URL ?? '').trim();
  if (envUrl) {
    const isLocalUrl = envUrl.includes('127.0.0.1') || envUrl.includes('localhost');
    if (!import.meta.env.DEV && isLocalUrl) return '';
    return envUrl;
  }
  const useLocal = import.meta.env.VITE_USE_LOCAL_SERVER === 'true';
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const hasSupabaseConfig = !!supabaseUrl && !!supabaseAnonKey;
  const shouldUseLocalServer = useLocal || !hasSupabaseConfig;
  if (import.meta.env.DEV && shouldUseLocalServer) return 'http://127.0.0.1:4000';
  return '';
};
export const isLocalServer = () => {
  if (typeof __enabled === 'boolean') return __enabled;
  const flag = import.meta.env.VITE_USE_LOCAL_SERVER === 'true';
  const url = String(import.meta.env.VITE_LOCAL_SERVER_URL ?? '').trim();
  const hasUrl = !!url;
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const hasSupabaseConfig = !!supabaseUrl && !!supabaseAnonKey;
  __enabled = flag || hasUrl || !hasSupabaseConfig;
  return __enabled;
};
export const enableLocalServer = () => { __enabled = true; };
