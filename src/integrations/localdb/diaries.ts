type Diary = {
  id: string;
  title: string;
  is_public: boolean;
  owner_id: string;
};

type DiaryPage = {
  id: string;
  diary_id: string;
  page_number: number;
  content_html: string;
  background_color?: string | null;
  background_image_url?: string | null;
};

const DIARY_KEY = 'local_diaries';
const PAGES_KEY = 'local_diary_pages';

const readDiaries = (): Diary[] => {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    const arr = raw ? (JSON.parse(raw) as Diary[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeDiaries = (arr: Diary[]) => localStorage.setItem(DIARY_KEY, JSON.stringify(arr));

const readPages = (): DiaryPage[] => {
  try {
    const raw = localStorage.getItem(PAGES_KEY);
    const arr = raw ? (JSON.parse(raw) as DiaryPage[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writePages = (arr: DiaryPage[]) => localStorage.setItem(PAGES_KEY, JSON.stringify(arr));

export const getDiary = (id: string): Diary | null => readDiaries().find(d => d.id === id) || null;

export const listDiaries = (userId?: string): Diary[] => {
  const arr = readDiaries();
  if (!userId) return arr.filter(d => d.is_public);
  return arr.filter(d => d.is_public || d.owner_id === userId);
};

export const ensureDiary = (owner_id: string, title = 'Diario'): Diary => {
  const arr = readDiaries();
  const existing = arr.find(d => d.owner_id === owner_id);
  if (existing) return existing;
  const d: Diary = { id: crypto.randomUUID(), title, is_public: true, owner_id };
  arr.unshift(d);
  writeDiaries(arr);
  return d;
};

export const listPages = (diary_id: string): DiaryPage[] => {
  return readPages()
    .filter(p => p.diary_id === diary_id)
    .sort((a, b) => a.page_number - b.page_number);
};

export const upsertPage = (page: Omit<DiaryPage, 'id'>): DiaryPage => {
  const arr = readPages();
  const existingIdx = arr.findIndex(p => p.diary_id === page.diary_id && p.page_number === page.page_number);
  if (existingIdx >= 0) {
    const updated = { ...arr[existingIdx], ...page } as DiaryPage;
    arr[existingIdx] = updated;
    writePages(arr);
    return updated;
  }
  const created: DiaryPage = { ...page, id: crypto.randomUUID() };
  arr.push(created);
  writePages(arr);
  return created;
};

export const toDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

