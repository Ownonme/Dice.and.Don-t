import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CharacterDiaryCard from '@/components/diary/CharacterDiaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function DiaryPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [charactersWithDiaries, setCharactersWithDiaries] = useState<Array<{
    id: string;
    name: string;
    user_id: string;
    avatar_url?: string | null;
    diaries: Array<{
      id: string;
      title: string;
      is_public: boolean;
      owner_id: string;
      created_at: string;
      cover_image_url?: string | null;
    }>;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('characters')
          .select('id, name, user_id, avatar_url, diaries(id, title, is_public, owner_id, created_at)');
        // Rimuove il filtro client: la SELECT è pubblica via RLS
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;

        const baseCharacters = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          user_id: c.user_id,
          avatar_url: c.avatar_url ?? null,
          diaries: (c.diaries || []).sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        }));

        const allDiaryIds = baseCharacters.flatMap((c) => c.diaries.map((d: any) => d.id));
        let coverMap: Record<string, string | null> = {};
        if (allDiaryIds.length > 0) {
          const { data: pages, error: pagesErr } = await supabase
            .from('diary_pages')
            .select('diary_id, page_number, background_image_url')
            .in('diary_id', allDiaryIds)
            .eq('page_number', 1);
          if (pagesErr) throw pagesErr;
          coverMap = (pages || []).reduce((acc: Record<string, string | null>, p: any) => {
            acc[p.diary_id] = p.background_image_url || null;
            return acc;
          }, {});
        }

        const withCovers = baseCharacters.map((c) => ({
          ...c,
          diaries: c.diaries.map((d: any) => ({
            ...d,
            cover_image_url: coverMap[d.id] ?? null,
          })),
        }));

        setCharactersWithDiaries(withCovers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isAdmin]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Diario &amp; Note</h2>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo..."
          />
          <Button onClick={() => navigate('/diary/create')}>Crea Libro</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {charactersWithDiaries
            .filter(
              (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.diaries.some((d) => d.title.toLowerCase().includes(search.toLowerCase()))
            )
            .map((c) => (
              <CharacterDiaryCard
                key={c.id}
                character={{ id: c.id, name: c.name, avatar_url: c.avatar_url || undefined }}
                diaries={c.diaries}
                onRead={(diaryId) => navigate(`/diary/${diaryId}/read`)}
                onEdit={(diaryId) => navigate(`/diary/${diaryId}/edit`)}
              />
            ))}
          {charactersWithDiaries.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nessun libro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Crea il tuo primo libro.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default DiaryPage;
