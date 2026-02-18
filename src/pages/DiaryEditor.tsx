import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import EditorLayout from '@/components/diary/EditorLayout';

interface Diary {
  id: string;
  title: string;
  is_public: boolean;
  owner_id: string;
}

interface DiaryPage {
  id: string;
  diary_id: string;
  page_number: number;
  content_html: string;
  background_color?: string | null;
  background_image_url?: string | null;
}

export default function DiaryEditor() {
  const { diaryId } = useParams();
  const { user, isAdmin } = useAuth();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [pages, setPages] = useState<DiaryPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const canEdit = user && diary && (user.id === diary.owner_id || isAdmin);

  useEffect(() => {
    const load = async () => {
      if (!diaryId) return;
      const { data: d } = await supabase
        .from('diaries')
        .select('id, title, is_public, owner_id')
        .eq('id', diaryId)
        .maybeSingle();
      setDiary(d || null);

      const { data: p } = await supabase
        .from('diary_pages')
        .select('*')
        .eq('diary_id', diaryId)
        .order('page_number', { ascending: true });
      const loadedPages = p || [];
      setPages(loadedPages);
      setSelectedPageId(loadedPages[0]?.id ?? null);
    };
    load();
  }, [diaryId]);

  const onSelectPage = (id: string) => {
    setSelectedPageId(id);
  };

  const onAddPage = async () => {
    if (!diary || !canEdit) return;
    const nextNum = (pages[pages.length - 1]?.page_number ?? 0) + 1;
    const { data } = await supabase
      .from('diary_pages')
      .insert({
        diary_id: diary.id,
        page_number: nextNum,
        content_html: '',
      })
      .select('*')
      .maybeSingle();
    if (data) {
      setPages(prev => [...prev, data]);
      setSelectedPageId(data.id);
    }
  };

  const onRenamePage = async (id: string, newName: string) => {
    // Non esiste un titolo pagina nel modello; gestiamo solo il cambio del numero pagina se il nome è numerico.
    if (!canEdit) return;
    const target = pages.find(p => p.id === id);
    if (!target) return;

    if (/^\d+$/.test(newName)) {
      const newNumber = parseInt(newName, 10);
      const { data } = await supabase
        .from('diary_pages')
        .update({ page_number: newNumber })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (data) {
        setPages(prev => {
          const next = prev.map(p => (p.id === id ? data : p));
          // Riordina localmente dopo cambio numero
          next.sort((a, b) => a.page_number - b.page_number);
          return next;
        });
      }
    } else {
      // Se non numerico, non possiamo salvarlo nel DB perché non esiste un campo titolo per le pagine.
      console.warn('Rename page non supportato: accettato solo valore numerico per page_number');
    }
  };

  const onReorderPages = async (nextOrder: any) => {
    if (!canEdit) return;
    // nextOrder atteso come array di id nel nuovo ordine
    if (!Array.isArray(nextOrder)) return;
    const idToPage: Record<string, DiaryPage> = Object.fromEntries(pages.map(p => [p.id, p]));
    const reordered = nextOrder
      .map((id: string, idx: number) => ({ ...idToPage[id], page_number: idx + 1 }))
      .filter(Boolean);

    // Aggiorna DB in batch (sequenziale per semplicità)
    for (const p of reordered) {
      await supabase.from('diary_pages').update({ page_number: p.page_number }).eq('id', p.id);
    }

    setPages(reordered);
  };

  const onChangeContent = (id: string, html: string) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, content_html: html } : p)));
  };

  const onChangeBackground = (id: string, data: { color?: string | null; imageUrl?: string | null }) => {
    setPages(prev => prev.map(p => (
      p.id === id
        ? { ...p, background_color: data.color ?? null, background_image_url: data.imageUrl ?? null }
        : p
    )));
  };

  const saveAll = async (pagesOverride?: DiaryPage[]) => {
    if (!canEdit) return;
    const pagesToSave = pagesOverride ?? pages;
    await Promise.all(
      pagesToSave.map(p =>
        supabase
          .from('diary_pages')
          .update({
            content_html: p.content_html,
            background_color: p.background_color ?? null,
            background_image_url: p.background_image_url ?? null,
            page_number: p.page_number,
          })
          .eq('id', p.id)
      )
    );
  };

  const onAddPageWithHtml = async (html: string) => {
    if (!diary || !canEdit) return;
    const nextNum = (pages[pages.length - 1]?.page_number ?? 0) + 1;
    const { data } = await supabase
      .from('diary_pages')
      .insert({
        diary_id: diary.id,
        page_number: nextNum,
        content_html: html,
      })
      .select('*')
      .maybeSingle();
    if (data) {
      setPages(prev => [...prev, data]);
      setSelectedPageId(data.id);
    }
  };

  if (!diary) return <div className="container mx-auto p-4">Caricamento...</div>;
  if (!canEdit) return <div className="container mx-auto p-4">Non hai i permessi per modificare questo diario.</div>;

  return (
    <EditorLayout
      pages={pages}
      selectedPageId={selectedPageId}
      onSelectPage={onSelectPage}
      onAddPage={onAddPage}
      onRenamePage={onRenamePage}
      onReorderPages={onReorderPages}
      onChangeContent={onChangeContent}
      onSave={saveAll}
      readOnly={!canEdit}
      onAddPageWithHtml={onAddPageWithHtml}
      onChangeBackground={onChangeBackground}
    />
  );
}
