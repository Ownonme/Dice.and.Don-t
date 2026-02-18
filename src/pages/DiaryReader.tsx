import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ReaderLayout from '@/components/diary/ReaderLayout';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { isLocalDb } from '@/integrations/localdb';
import * as LocalDiaries from '@/integrations/localdb/diaries';

interface Diary { id: string; title: string; is_public: boolean; owner_id: string; }
interface DiaryPage {
  id: string;
  diary_id: string;
  page_number: number;
  content_html: string;
  background_color?: string | null;
  background_image_url?: string | null;
}

export default function DiaryReader() {
  const { diaryId } = useParams();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [pages, setPages] = useState<DiaryPage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!diaryId) return;
      if (isLocalServer()) {
        const d = await Api.getDiary(diaryId, user?.id);
        setDiary(d || null);
        const p = await Api.listDiaryPages(diaryId, user?.id);
        setPages(p || []);
        return;
      }
      if (isLocalDb()) {
        const d = LocalDiaries.getDiary(diaryId) || null;
        setDiary(d);
        const p = LocalDiaries.listPages(diaryId);
        setPages(p || []);
        return;
      }
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
      setPages(p || []);
    })();
  }, [diaryId, user?.id]);

  const exportPDF = async () => {
    // Lazy import per evitare pesi fino a quando non serve
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    if (!containerRef.current) return;
    const pdf = new jsPDF('p', 'pt', 'a4');
    for (let i = 0; i < pages.length; i++) {
      const pageEl = containerRef.current.querySelector(`#page-${pages[i].id}`) as HTMLElement | null;
      if (!pageEl) continue;
      const canvas = await html2canvas(pageEl, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      if (i < pages.length - 1) pdf.addPage();
    }
    pdf.save(`${diary?.title || 'diario'}.pdf`);
  };

  const canEdit = !!(user && diary && (user.id === diary.owner_id || isAdmin));

  const uploadCover = async (file: File) => {
    if (!diary) return;
      if (isLocalServer()) {
        const { url } = await Api.uploadFile(file);
        let firstPage = pages.find(p => p.page_number === 1) || null;
        if (!firstPage) {
          const created = await Api.upsertDiaryPage({ diary_id: diary.id, page_number: 1, content_html: '', background_image_url: url }, user?.id);
          setPages(prev => [created, ...prev]);
          return;
        }
        const updated = await Api.upsertDiaryPage({ diary_id: diary.id, page_number: 1, content_html: firstPage.content_html, background_image_url: url }, user?.id);
        setPages(prev => prev.map(p => p.page_number === 1 ? updated : p));
        return;
      }
    if (isLocalDb()) {
      const url = await LocalDiaries.toDataUrl(file);
      let firstPage = pages.find(p => p.page_number === 1) || null;
      if (!firstPage) {
        const created = LocalDiaries.upsertPage({ diary_id: diary.id, page_number: 1, content_html: '', background_image_url: url });
        setPages(prev => [created, ...prev]);
        return;
      }
      const updated = LocalDiaries.upsertPage({ diary_id: diary.id, page_number: 1, content_html: firstPage.content_html, background_image_url: url });
      setPages(prev => prev.map(p => p.page_number === 1 ? updated : p));
      return;
    }
    const path = `${diary.id}/cover-${Date.now()}-${file.name}`;
    const { data } = await supabase.storage.from('diary_images').upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '31536000',
    });
    if (!data) return;
    const { data: pub } = supabase.storage.from('diary_images').getPublicUrl(path);
    const url = pub.publicUrl;

    // aggiorna pagina 1 (crea se manca)
    let firstPage = pages.find(p => p.page_number === 1) || null;
    if (!firstPage) {
      const { data: created } = await supabase
        .from('diary_pages')
        .insert({ diary_id: diary.id, page_number: 1, content_html: '', background_image_url: url })
        .select('*')
        .maybeSingle();
      if (created) {
        setPages(prev => [created, ...prev]);
      }
      return;
    }

    const { data: updated } = await supabase
      .from('diary_pages')
      .update({ background_image_url: url })
      .eq('id', firstPage.id)
      .select('*')
      .maybeSingle();
    if (updated) {
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  const coverUrl = pages.find(p => p.page_number === 1)?.background_image_url || null;
  const handleUploadCover = (file: File) => uploadCover(file);

  return (
    <ReaderLayout
      diaryTitle={diary?.title}
      coverUrl={coverUrl}
      pages={pages}
      onUploadCover={handleUploadCover}
      canEdit={canEdit}
      onEdit={() => navigate(`/diary/${diaryId}/edit`)}
    />
  );
}
