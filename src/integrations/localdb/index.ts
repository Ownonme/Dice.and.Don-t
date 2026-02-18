export const isLocalDb = () => import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_DB === 'true';
