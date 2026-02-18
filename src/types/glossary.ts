export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  category?: string;
  description?: string;
  examples?: string;
  related_terms?: string[];
  image_url?: string;
  section_id?: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GlossarySection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  entries_count?: number;
}

export interface GlossaryCategory {
  name: string;
  count: number;
}