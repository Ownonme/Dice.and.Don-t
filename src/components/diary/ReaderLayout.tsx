import React, { useMemo, useState, useEffect } from 'react';
import { SidebarChapters, ChapterItem } from './SidebarChapters';
import { useIsMobile } from '@/hooks/use-mobile';

export interface DiaryPage {
  id: string;
  page_number: number;
  title?: string;
  content_html: string;
  background_image_url?: string | null;
  background_color?: string | null;
}

interface ReaderLayoutProps {
  diaryTitle?: string;
  coverUrl?: string | null;
  pages: DiaryPage[];
  onUploadCover?: (file: File) => Promise<void>; // integrazione reale
  canEdit?: boolean;
  onEdit?: () => void;
}

export function ReaderLayout(props: any) {
  const { diaryTitle, coverUrl, pages, onUploadCover, canEdit, onEdit } = props;
  const isMobile = useIsMobile();
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Funzione per caricare margini globali dalla localStorage
  const loadGlobalMargins = () => {
    try {
      const raw = localStorage.getItem('diary.globalMargins');
      if (raw) {
        const m = JSON.parse(raw);
        return {
          top: typeof m.top === 'number' ? m.top : 20,
          right: typeof m.right === 'number' ? m.right : 18,
          bottom: typeof m.bottom === 'number' ? m.bottom : 20,
          left: typeof m.left === 'number' ? m.left : 18,
        };
      }
    } catch {}
    return { top: 20, right: 18, bottom: 20, left: 18 };
  };

  // Prepara headings e aggiunge id a h2/h3 per scroll
  const { pagesWithAnchors, chapters } = useMemo(() => {
    const chapters: ChapterItem[] = [];
    const processed = pages.map((p) => {
      let idxH2 = 0;
      let idxH3 = 0;
      const html = p.content_html
        .replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_m, attrs, text) => {
          const id = `h2-${p.page_number}-${idxH2++}`;
          chapters.push({ id, title: stripHtml(text), level: 2 });
          return `<h2 id="${id}"${attrs}>${text}</h2>`;
        })
        .replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi, (_m, attrs, text) => {
          const id = `h3-${p.page_number}-${idxH3++}`;
          chapters.push({ id, title: stripHtml(text), level: 3 });
          return `<h3 id="${id}"${attrs}>${text}</h3>`;
        });
      return { ...p, content_html: html };
    });
    return { pagesWithAnchors: processed, chapters };
  }, [pages]);

  const readerPageBaseStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 600,
    minWidth: 0,
    minHeight: '297mm',
    margin: '24px auto',
    padding: '20mm 18mm',
    backgroundColor: '#ffffff',
    color: '#222',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    borderRadius: 2,
    lineHeight: 1.6,
    fontFamily: "system-ui, 'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 16,
    overflowX: 'hidden',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    hyphens: 'auto',
    whiteSpace: 'normal',
  };

  const pageContentStyle: React.CSSProperties = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    hyphens: 'auto',
    whiteSpace: 'normal',
    maxWidth: '100%',
  };

  function parseMeta(raw?: string | null): { size: number; position: string; margins?: { top: number; right: number; bottom: number; left: number } } {
    if (raw && raw.trim().startsWith('{')) {
      try {
        const m = JSON.parse(raw);
        const margins = m.margins && typeof m.margins === 'object'
          ? {
              top: typeof m.margins.top === 'number' ? m.margins.top : 20,
              right: typeof m.margins.right === 'number' ? m.margins.right : 18,
              bottom: typeof m.margins.bottom === 'number' ? m.margins.bottom : 20,
              left: typeof m.margins.left === 'number' ? m.margins.left : 18,
            }
          : undefined;
        return {
          size: typeof m.size === 'number' ? m.size : 100,
          position: typeof m.position === 'string' ? m.position : 'center',
          margins,
        };
      } catch {}
    }
    return { size: 100, position: 'center' };
  }

  useEffect(() => {
    // Mantieni nel Reader la stessa resa dei frame immagine dell’editor
    const pagesEls = document.querySelectorAll('.reader-page');
    pagesEls.forEach((pageEl) => {
      const wrappers = pageEl.querySelectorAll('div[data-img-wrapper], div[style*="resize"]');
      wrappers.forEach((el) => {
        const he = el as HTMLElement;
        const img = he.querySelector('img') as HTMLImageElement | null;
        // disabilita resize/drag in lettura
        he.style.resize = 'none';
        he.style.border = 'none';
        he.setAttribute('draggable', 'false');
        // se il wrapper non ha una width, prova a usare quella salvata sull’immagine
        if (!he.style.width) {
          const savedImgWidth = img?.style.width || '';
          if (savedImgWidth && /px|%/.test(savedImgWidth)) {
            he.style.width = savedImgWidth;
          } else {
            he.style.width = '240px';
          }
        }
        he.style.display = he.style.display || 'inline-block';
        he.style.overflow = 'hidden';
        he.style.maxWidth = '100%';
        // immagine sempre adattata al frame (ma rispettando l’altezza auto)
        if (img) {
          img.style.width = '100%';
          img.style.height = 'auto';
          img.draggable = false;
        }
      });
    });
  }, [pagesWithAnchors]);

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar sinistra: Indice capitoli */}
      <SidebarChapters chapters={chapters} isOpen={chaptersOpen} onToggle={() => setChaptersOpen((v) => !v)} />

      {/* Contenuto centrale */}
      <main className="flex-1 max-w-4xl mx-auto w-full">
        <style>{`.reader-page, .reader-page * { overflow-wrap: anywhere; word-break: break-word; hyphens: auto; } .reader-page p, .reader-page h1, .reader-page h2, .reader-page h3 { max-width: 100%; } .reader-page img { max-width: 100%; height: auto; }`}</style>
        {/* Header lettura compatto con hamburger sinistra/dx */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2">
          <button
            className="inline-flex items-center gap-2"
            onClick={() => setChaptersOpen((v) => !v)}
            aria-label="Apri/Chiudi indice"
            title="Indice"
          >
            <span className="text-xl">☰</span>
          </button>
          <div className="truncate font-medium">{diaryTitle ?? 'Documento'}</div>
          <button
            className="inline-flex items-center gap-2"
            onClick={() => setActionsOpen((v) => !v)}
            aria-label="Apri/Chiudi azioni"
            title="Azioni"
          >
            <span className="text-xl">☰</span>
          </button>
        </div>

        {/* Copertina */}
        {coverUrl && (
          <section className="w-full flex justify-center px-3 py-4">
            <div className="w-full max-w-3xl">
              <div className="w-full h-64 overflow-hidden">
                <img src={coverUrl ?? ''} alt="Copertina" className="w-full h-full object-contain" />
              </div>
            </div>
          </section>
        )}

        {/* Pagine */}
        <article className="px-3 pb-12 space-y-8">
          {pagesWithAnchors.map((p) => {
            const style: React.CSSProperties = { ...readerPageBaseStyle };
            const gm = loadGlobalMargins();
            if (p.background_image_url) {
              const meta = parseMeta(p.background_color);
              style.backgroundImage = `url('${p.background_image_url}')`;
              style.backgroundSize = `${meta.size}%`;
              style.backgroundPosition = meta.position;
              style.backgroundRepeat = 'no-repeat';
            } else if (p.background_color) {
              const raw = String(p.background_color).trim();
              if (raw.startsWith('{')) { try { const meta = JSON.parse(raw); style.backgroundColor = typeof meta.color === 'string' ? meta.color : '#ffffff'; } catch { style.backgroundColor = raw || '#ffffff'; } }
              else { style.backgroundColor = raw || '#ffffff'; }
            }
            style.padding = `${gm.top}mm ${gm.right}mm ${gm.bottom}mm ${gm.left}mm`;
            return (
              <div key={p.id} className="reader-page" style={style}>
                <div style={pageContentStyle} dangerouslySetInnerHTML={{ __html: p.content_html || '<p>&nbsp;</p>' }} />
              </div>
            );
          })}
        </article>
      </main>

      {/* Sidebar destra: Azioni (overlay) */}
      <aside
        className={`fixed right-0 top-0 h-screen w-64 z-40 bg-background border-l transition-transform duration-200 ease-out ${actionsOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-medium">Azioni</span>
          <button onClick={() => setActionsOpen((v) => !v)}>Chiudi</button>
        </div>
        <nav className="overflow-y-auto h-full p-3 space-y-3">
          {canEdit ? (
            <>
              <button className="w-full text-left px-2 py-1 rounded hover:bg-muted" onClick={onEdit}>Modifica</button>
              {onUploadCover && (
                <label className="cursor-pointer inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-muted w-full">
                  <span>Copertina</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadCover(file);
                    }}
                  />
                </label>
              )}
            </>
          ) : (
            <div className="text-sm opacity-60">Disponibile solo a proprietario o admin</div>
          )}
        </nav>
      </aside>
    </div>
  );
}

function stripHtml(input: string) {
  const div = document.createElement('div');
  div.innerHTML = input;
  return (div.textContent || div.innerText || '').trim();
}

// Rende disponibile sia l’export nominativo che quello di default
export default ReaderLayout;
