import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CreateDiaryModal from '@/components/diary/CreateDiaryModal';
import CharacterDiaryCard from '@/components/diary/CharacterDiaryCard';

export default function DiaryIndex() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [charactersWithDiaries, setCharactersWithDiaries] = useState<{
    id: string; name: string; user_id: string; avatar_url?: string | null;
    diaries: { id: string; title: string; is_public: boolean; owner_id: string; created_at: string; cover_image_url?: string | null }[];
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('characters')
          .select('id, name, user_id, avatar_url, diaries(id, title, is_public, owner_id, created_at)');
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;

        const baseCharacters = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          user_id: c.user_id,
          avatar_url: c.avatar_url ?? null,
          diaries: (c.diaries || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        }));

        // Prendi tutti gli ID dei diari e carica la prima pagina (page_number = 1)
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

        // Applica cover_image_url ai diari
        const withCovers = baseCharacters.map((c) => ({
          ...c,
          diaries: c.diaries.map((d: any) => ({
            ...d,
            cover_image_url: coverMap[d.id] ?? null,
          })),
        }));

        setCharactersWithDiaries(withCovers);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, user]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Diario & Note</h2>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per titolo..." />
          {user && (
            <Button onClick={() => setIsCreateOpen(true)}>Crea Libro</Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {charactersWithDiaries
            .filter(c =>
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.diaries.some(d => d.title.toLowerCase().includes(search.toLowerCase()))
            )
            .map(c => (
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
                <p className="text-muted-foreground">Crea il tuo primo libro con il pulsante in alto.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <CreateDiaryModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(newDiary) => {
          // nuovo: inserisci il diario nel personaggio corretto
          setCharactersWithDiaries(prev =>
            prev.map(c =>
              // @ts-expect-error: character_id è appena stato aggiunto al payload
              c.id === newDiary.character_id
                ? { ...c, diaries: [{ id: newDiary.id, title: newDiary.title, is_public: newDiary.is_public, owner_id: newDiary.owner_id, created_at: newDiary.created_at }, ...c.diaries] }
                : c
            )
          );
        }}
      />
    </div>
  );
}
