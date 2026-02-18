import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import type { DiaryPage } from './ReaderLayout';
import SidebarPages from './SidebarPages';
import Toolbar from './Toolbar';

interface EditorLayoutProps {
  pages: DiaryPage[];
  selectedPageId?: string;
  onSelectPage: (id: string) => void; // integrazione reale
  onAddPage: () => void; // integrazione reale
  onRenamePage: (id: string, title: string) => void; // integrazione reale
  onReorderPages: (orderedIds: string[]) => void; // integrazione reale
  onChangeContent: (id: string, html: string) => void; // integrazione reale
  onSave?: (pages?: DiaryPage[]) => void | Promise<void>; // integrazione reale
  readOnly?: boolean;
  onAddPageWithHtml?: (html: string) => Promise<void>; // integrazione reale
  onChangeBackground?: (id: string, payload: { color: string | null; imageUrl: string | null }) => void; // integrazione reale
}

export default function EditorLayout(props: any) {
  const { pages, selectedPageId, onSelectPage, onAddPage, onRenamePage, onReorderPages, onChangeContent, onSave, readOnly, onAddPageWithHtml } = props;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: portrait)').matches
      : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
    else (mq as any).addListener(handler as any);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handler);
      else (mq as any).removeListener(handler as any);
    };
  }, []);
  const isMobilePortrait = isMobile && isPortrait;
  const [showPagesSidebar, setShowPagesSidebar] = useState(false);
  const [toolbarCompact, setToolbarCompact] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const loadEditorPrefs = () => {
    try {
      const raw = localStorage.getItem('diary.editorPrefs');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fontFamily: typeof parsed.fontFamily === 'string' ? parsed.fontFamily : '',
          fontFamilyName: typeof parsed.fontFamilyName === 'string' ? parsed.fontFamilyName : '',
          fontSize: typeof parsed.fontSize === 'string' ? parsed.fontSize : ''
        };
      }
    } catch {}
    return { fontFamily: '', fontFamilyName: '', fontSize: '' };
  };
  const [editorPrefs, setEditorPrefs] = useState(loadEditorPrefs());

  // Stato e util per margini globali
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
  const saveGlobalMargins = (m: {top:number;right:number;bottom:number;left:number}) => {
    localStorage.setItem('diary.globalMargins', JSON.stringify(m));
  };
  const [globalMargins, setGlobalMargins] = React.useState(loadGlobalMargins());
  const [showMarginsDialog, setShowMarginsDialog] = React.useState(false);
  const [marginDraft, setMarginDraft] = React.useState(globalMargins);

  // Pagina attiva e refs per editor/pagina
  const [activePageId, setActivePageId] = useState<string>(() => pages[0]?.id);
  useEffect(() => {
    if (!activePageId && pages[0]) setActivePageId(pages[0].id);
  }, [activePageId, pages]);

  // (RIMOSSO) l'effetto che sincronizza con selectedPageId perché creava conflitti di focus
  // useEffect(() => {
  //   if (selectedPageId) setActivePageId(selectedPageId);
  //   else if (!activePageId && pages[0]) setActivePageId(pages[0].id);
  // }, [selectedPageId, pages]);

  const editorsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setEditorRef = (id: string) => (el: HTMLDivElement | null) => {
    const m = editorsRef.current;
    if (el) m.set(id, el);
    else m.delete(id);
  };
  const setPageRef = (id: string) => (el: HTMLDivElement | null) => {
    const m = pageRefs.current;
    if (el) m.set(id, el);
    else m.delete(id);
  };

  // currentPage ora è la pagina attiva
  const currentPage = useMemo(() => pages.find((p) => p.id === activePageId) ?? pages[0], [pages, activePageId]);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const dbSaveTimer = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const draggedElRef = useRef<HTMLElement | null>(null);
  const selectedImageWrapperRef = useRef<HTMLElement | null>(null);
  const wrappersRORef = useRef<Map<HTMLElement, ResizeObserver>>(new Map());
  const pageRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && currentPage) {
      editorRef.current.innerHTML = currentPage.content_html ?? '';
    }
  }, [currentPage]);

  // Inizializza il DOM di ogni editor con l'HTML della pagina
  useEffect(() => {
    pages.forEach((p) => {
      const el = editorsRef.current.get(p.id);
      if (el && el.innerHTML !== (p.content_html ?? '')) {
        el.innerHTML = p.content_html ?? '';
      }
    });
  }, [pages]);

  useEffect(() => {
    const all = Array.from(editorsRef.current.values());
    all.forEach((el) => applyEditorPrefsToEditor(el, editorPrefs));
  }, [editorPrefs, pages]);

  useEffect(() => {
    // normalizza immagini già presenti nella pagina caricata
    const root = editorRef.current;
    if (!root) return;
    const wrappers = Array.from(root.querySelectorAll('div')) as HTMLElement[];
    wrappers.forEach((w) => {
      if ((w as HTMLElement).style && (w as HTMLElement).style.resize) {
        // assicurati che il wrapper sia marcato per le funzionalità dell'editor
        w.setAttribute('data-img-wrapper', '1');
        attachResizeSync(w as HTMLElement);
      }
    });
    const roMap = wrappersRORef.current;
    return () => {
      // pulizia observers quando si cambia pagina
      roMap.forEach((ro) => {
        try { ro.disconnect(); } catch {}
      });
      roMap.clear();
    };
  }, [currentPage?.id]);

  // Normalizza i frame immagine per TUTTE le pagine
  useEffect(() => {
    const allRoots = Array.from(editorsRef.current.values());
    allRoots.forEach((root) => {
      const wrappers = Array.from(root.querySelectorAll('div')) as HTMLElement[];
      wrappers.forEach((w) => {
        if ((w as HTMLElement).style && (w as HTMLElement).style.resize) {
          w.setAttribute('data-img-wrapper', '1');
          attachResizeSync(w as HTMLElement);
        }
      });
    });
    const roMap = wrappersRORef.current;
    return () => {
      roMap.forEach((ro) => { try { ro.disconnect(); } catch {} });
      roMap.clear();
    };
  }, [pages]);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const isInside = Array.from(editorsRef.current.values()).some((el) => el.contains(node));
      if (isInside) selectionRef.current = range.cloneRange();
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  function ensureFontLoaded(family: string) {
    const id = `gf-${family.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }

  function applyEditorPrefsToEditor(el: HTMLDivElement | null, prefs: { fontFamily: string; fontSize: string }) {
    if (!el) return;
    if (prefs.fontFamily) el.style.fontFamily = prefs.fontFamily;
    if (prefs.fontSize) el.style.fontSize = prefs.fontSize;
  }

  function persistEditorPrefs(next: { fontFamily: string; fontFamilyName: string; fontSize: string }) {
    setEditorPrefs(next);
    localStorage.setItem('diary.editorPrefs', JSON.stringify(next));
  }

  function restoreSelectionIfNeeded() {
    const sel = window.getSelection();
    if (!sel) return;
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const isInside = Array.from(editorsRef.current.values()).some((el) => el.contains(node));
      if (isInside) return;
    }
    if (selectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(selectionRef.current);
    }
  }

  function applyInlineStyle(style: Partial<CSSStyleDeclaration>) {
    restoreSelectionIfNeeded();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    Object.assign(span.style, style);

    if (range.collapsed) {
      span.appendChild(document.createTextNode('\u200B'));
      range.insertNode(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      newRange.collapse(false);
      sel.addRange(newRange);
      return;
    }

    const contents = range.cloneContents();
    span.appendChild(contents);
    range.deleteContents();
    range.insertNode(span);
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false);
    sel.addRange(newRange);
  }

  function getCaretRangeFromPoint(x: number, y: number): Range | null {
    const anyDoc: any = document as any;
    if (typeof anyDoc.caretRangeFromPoint === 'function') {
      return anyDoc.caretRangeFromPoint(x, y);
    }
    if (typeof anyDoc.caretPositionFromPoint === 'function') {
      const pos = anyDoc.caretPositionFromPoint(x, y);
      if (pos) {
        const r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse(true);
        return r;
      }
    }
    return null;
  }

  // Nuovo: posiziona il caret alla fine dell’editor e mette focus
  function placeCaretAtEnd(el: HTMLElement) {
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      el.focus();
    } catch {}
  }

  // 👇 NEW: utility per non toccare il caret quando c'è una selezione attiva
  function hasActiveSelection(): boolean {
    const sel = window.getSelection?.();
    return !!(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
  }

  function attachResizeSync(wrapper: HTMLElement) {
    const img = wrapper.querySelector('img') as HTMLImageElement | null;
    if (!img) return;
    // forza l’immagine a seguire il frame
    img.style.width = '100%';
    img.style.height = 'auto';
    // osserva i cambi di dimensione del frame
    let ro = wrappersRORef.current.get(wrapper);
    if (!ro) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          // imposta esplicitamente la larghezza in px per sovrascrivere eventuali inline vecchi
          img.style.width = `${w}px`;
          img.style.height = 'auto';
        }
      });
      ro.observe(wrapper);
      wrappersRORef.current.set(wrapper, ro);
    }
  }

  function insertImage(src: string) {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-img-wrapper', '1');
    wrapper.draggable = true;
    wrapper.contentEditable = 'false';
    wrapper.tabIndex = 0; // focusabile per selezione dalla toolbar
    wrapper.style.display = 'inline-block';
    wrapper.style.resize = 'both';
    wrapper.style.overflow = 'hidden';
    wrapper.style.margin = '8px';
    wrapper.style.width = '240px'; // controlliamo la larghezza del wrapper
    wrapper.style.maxWidth = '100%';
    wrapper.style.border = '1px solid #ddd';
    wrapper.style.borderRadius = '4px';
    wrapper.style.background = '#fff';

    const img = document.createElement('img');
    img.src = src;
    img.style.display = 'block';
    img.style.width = '100%'; // riempie il frame e può superare l’originale
    img.style.height = 'auto';
    img.style.pointerEvents = 'none';

    wrapper.appendChild(img);

    wrapper.addEventListener('dragstart', (ev) => {
      draggedElRef.current = wrapper;
      ev.dataTransfer?.setData('text/plain', 'image');
    });
    wrapper.addEventListener('dragend', () => {
      draggedElRef.current = null;
      // salva dopo spostamento
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
    });
    // selezione dell’immagine per comandi grow/shrink
    wrapper.addEventListener('click', () => { selectedImageWrapperRef.current = wrapper; });
    wrapper.addEventListener('focus', () => { selectedImageWrapperRef.current = wrapper; });
    // salva dopo resize manuale (rilascio del mouse)
    wrapper.addEventListener('mouseup', () => {
      // normalizza l’immagine dopo il resize manuale
      attachResizeSync(wrapper);
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
    });

    // collega il sync sul resize
    attachResizeSync(wrapper);

    if (range) {
      range.insertNode(wrapper);
    } else {
      editorRef.current?.appendChild(wrapper);
    }
  }

  function adjustSelectedImageWidth(delta: number) {
    const el = selectedImageWrapperRef.current;
    if (!el) return;
    const cur = parseInt(el.style.width || '240', 10);
    const next = Math.max(60, cur + delta);
    el.style.width = `${next}px`;
    attachResizeSync(el);
    scheduleAutosave();
    const html = editorRef.current?.innerHTML ?? '';
    if (currentPage) onChangeContent(currentPage.id, html);
  }

  function resetSelectedImageToOriginal() {
    const el = selectedImageWrapperRef.current;
    if (!el) return;
    const img = el.querySelector('img') as HTMLImageElement | null;
    if (!img) return;
    const naturalWidth = img.naturalWidth || 240;
    el.style.width = `${naturalWidth}px`;
    img.style.width = '100%';
    img.style.height = 'auto';
    scheduleAutosave();
    const html = editorRef.current?.innerHTML ?? '';
    if (currentPage) onChangeContent(currentPage.id, html);
  }

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  function openBackgroundPicker() {
    bgImageInputRef.current?.click();
  }

  function parseBgMeta(): { size: number; position: string; margins?: { top: number; right: number; bottom: number; left: number } } {
    const raw = currentPage?.background_color ?? null;
    if (currentPage?.background_image_url && raw && raw.trim().startsWith('{')) {
      try {
        const m = JSON.parse(raw as string);
        const size = typeof m.size === 'number' ? m.size : 100;
        const position = typeof m.position === 'string' ? m.position : 'center';
        const margins = m.margins && typeof m.margins === 'object'
          ? {
              top: typeof m.margins.top === 'number' ? m.margins.top : 20,
              right: typeof m.margins.right === 'number' ? m.margins.right : 18,
              bottom: typeof m.margins.bottom === 'number' ? m.margins.bottom : 20,
              left: typeof m.margins.left === 'number' ? m.margins.left : 18
            }
          : undefined;
        return { size, position, margins };
      } catch {}
    }
    return { size: 100, position: 'center' };
  }

  function updateBgMeta(next: { size: number; position: string; margins?: { top: number; right: number; bottom: number; left: number } }) {
    if (!currentPage || !props.onChangeBackground) return;
    const imageUrl = currentPage.background_image_url || null;
    let prevColor: string | null = null;
    const raw = currentPage?.background_color ?? null;
    if (!imageUrl && raw && !String(raw).trim().startsWith('{')) prevColor = String(raw);
    const payload: any = { size: next.size, position: next.position };
    if (next.margins) payload.margins = next.margins;
    if (prevColor) payload.color = prevColor;
    const color = JSON.stringify(payload);
    props.onChangeBackground(currentPage.id, { imageUrl, color });
  }

  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertImage(String(reader.result));
      // Aggiorna stato pagina per salvataggio DB
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function onBackgroundSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (currentPage && props.onChangeBackground) {
        props.onChangeBackground(currentPage.id, { imageUrl: String(reader.result), color: JSON.stringify({ size: 100, position: 'center' }) });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function exportPdfCurrentPage() {
    const el = pageRef.current;
    if (!el) return;
    const html2canvasMod = await import('html2canvas');
    const jspdfMod: any = await import('jspdf');
    const html2canvas = (html2canvasMod as any).default || html2canvasMod;
    const { jsPDF } = jspdfMod;

    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null });
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    pdf.save('Pagina.pdf');
  }

  function execCommand(cmd: string, value?: any) {
    restoreSelectionIfNeeded();
    try { document.execCommand('styleWithCSS', false, true); } catch {}
    if (cmd === 'exportPdf') { exportPdfCurrentPage(); return; }
    if (cmd === 'pickImage') { openImagePicker(); return; }
    if (cmd === 'pickBackgroundImage') { openBackgroundPicker(); return; }
    if (cmd === 'imageGrow') { adjustSelectedImageWidth(80); return; }
    if (cmd === 'imageShrink') { adjustSelectedImageWidth(-80); return; }
    if (cmd === 'imageFitOriginal') { resetSelectedImageToOriginal(); return; }
    if (cmd === 'clearBackground') {
      if (currentPage && props.onChangeBackground) props.onChangeBackground(currentPage.id, { color: null, imageUrl: null });
      return;
    }
    if (cmd === 'setBackgroundColor' && value) {
      if (currentPage && props.onChangeBackground) props.onChangeBackground(currentPage.id, { color: value, imageUrl: null });
      return;
    }
    if (cmd === 'setBackgroundScale' && value) {
      const current = parseBgMeta();
      const sizeNum = parseInt(String(value), 10);
      updateBgMeta({ ...current, size: isNaN(sizeNum) ? 100 : sizeNum });
      return;
    }
    if (cmd === 'setBackgroundPosition' && value) {
      const current = parseBgMeta();
      updateBgMeta({ ...current, position: String(value) });
      return;
    }
    // Nuovo: apri dialog margini
    if (cmd === 'openMarginsDialog') { setShowMarginsDialog(true); return; }

    // New: font color inline
    if (cmd === 'fontColor' && value) {
      applyInlineStyle({ color: value });
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
      return;
    }

    // New: clear formatting
    if (cmd === 'clearFormatting') {
      document.execCommand('removeFormat');
      document.execCommand('unlink');
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
      return;
    }
    if (cmd === 'fontSizePx' && value) {
      const size = String(value);
      applyInlineStyle({ fontSize: value });
      const next = { ...editorPrefs, fontSize: size };
      persistEditorPrefs(next);
      applyEditorPrefsToEditor(editorRef.current, next);
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
      return;
    }
    if (cmd === 'fontFamilyInline' && value) {
      const [family, fallback] = String(value).split(',');
      const familyName = String(family || '').trim();
      const familyValue = `${familyName}, ${String(fallback || 'serif').trim()}`;
      if (familyName) ensureFontLoaded(familyName);
      applyInlineStyle({ fontFamily: familyValue });
      const next = { ...editorPrefs, fontFamily: familyValue, fontFamilyName: familyName };
      persistEditorPrefs(next);
      applyEditorPrefsToEditor(editorRef.current, next);
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
      return;
    }
    if (cmd === 'formatBlock') {
      document.execCommand('formatBlock', false, value);
      if (value === 'h1' || value === 'h2') document.execCommand('justifyCenter');
      scheduleAutosave();
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
      return;
    }
    document.execCommand(cmd, false, value);
  }

  const PAGE_WIDTH = 816; // ~A4
  const PAGE_HEIGHT = 1120; // altezza pagina fissa

  const canvasStyle: React.CSSProperties = isMobilePortrait
  ? {
      display: 'block',
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: '#121212'
    }
  : {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      height: 'calc(100vh - 0px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: '#121212'
    };
  const pageStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 600,
    minWidth: 0,
    minHeight: '297mm',
    backgroundColor: '#ffffff',
    color: '#222',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    borderRadius: 2,
    margin: '24px auto', // centra il foglio su schermi orizzontali
    padding: '20mm 18mm',
    fontFamily: "system-ui, 'Segoe UI', Roboto, Arial, sans-serif",
    lineHeight: 1.6,
    fontSize: 16
  };
  const computedPageStyle: React.CSSProperties = pageStyle;

  // Stile per ogni pagina (background + margini globali)
  function getComputedPageStyle(p: DiaryPage): React.CSSProperties {
    const base: React.CSSProperties = { ...pageStyle };
    const img = p?.background_image_url || null;
    const colorOrMeta = p?.background_color || null;

    if (img) {
      let size = 100;
      let position = 'center';
      const raw = String(colorOrMeta || '').trim();
      if (raw.startsWith('{')) {
        try {
          const meta = JSON.parse(raw);
          size = typeof meta.size === 'number' ? meta.size : 100;
          position = typeof meta.position === 'string' ? meta.position : 'center';
        } catch {}
      }
      base.backgroundImage = `url('${img}')`;
      base.backgroundSize = `${size}%`;
      base.backgroundPosition = position;
      base.backgroundRepeat = 'no-repeat';
    } else if (colorOrMeta) {
      const raw = String(colorOrMeta).trim();
      if (raw.startsWith('{')) {
        try {
          const meta = JSON.parse(raw);
          base.backgroundColor = meta.color ?? '#ffffff';
        } catch {
          base.backgroundColor = raw;
        }
      } else {
        base.backgroundColor = raw;
      }
    }
    base.padding = `${globalMargins.top}mm ${globalMargins.right}mm ${globalMargins.bottom}mm ${globalMargins.left}mm`;
    return base;
  }

  const editableStyle: React.CSSProperties = {
    minHeight: '100%',
    outline: 'none'
  };

  const headingCss = `
    .doc-page h1 { font-size: 28px; text-align: center; color: #222; font-weight: 700; margin: 0 0 12px; }
    .doc-page h2 { font-size: 22px; text-align: center; color: #222; font-weight: 600; margin: 0 0 10px; }
    .doc-page p  { margin: 0 0 10px; }
  `;
  // CSS responsive per schermi stretti
  const responsiveCss = `
    @media (max-width: 800px) and (orientation: portrait) {
      .doc-page {
        width: 100vw !important;
        max-width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        padding: 12px !important;
        box-shadow: none !important;
        min-height: calc(100vh - 56px) !important;
      }
      body, html { height: 100%; }
    }
  `;

  // ============== PAGINAZIONE INTELLIGENTE ==============
  async function checkOverflowAndPaginate() {
    if (!editorRef.current || readOnly) return;

    const currentEditor = editorRef.current;
    const currentId = activePageId || currentPage?.id;
    if (!currentId) return;

    // Limite "utile" dell'editor dentro la pagina (sottraggo un cuscinetto per non tagliare a filo)
    const maxHeight = PAGE_HEIGHT - 80;

    // Se non overflowa, esci
    if (currentEditor.scrollHeight <= maxHeight) return;

    // Trova il primo child che sfora e sposta tutto ciò che segue
    const children = Array.from(currentEditor.children) as HTMLElement[];
    let overflowStartIndex: number | null = null;

    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const parentRect = currentEditor.getBoundingClientRect();
      const relativeBottom = rect.bottom - parentRect.top;
      if (relativeBottom > maxHeight) {
        overflowStartIndex = i;
        break;
      }
    }
    if (overflowStartIndex === null) return;

    // Prova anche a spezzare il blocco precedente se "passa" il bordo
    let overflowHtml = '';
    const prev = overflowStartIndex > 0 ? children[overflowStartIndex - 1] : null;
    if (prev && (prev.offsetTop + prev.offsetHeight > maxHeight)) {
      const overflowText = splitTextNodeIfNeeded(prev, currentEditor, maxHeight);
      if (overflowText && overflowText.trim().length > 0) {
        const newP = document.createElement('p');
        newP.textContent = overflowText;
        overflowHtml += newP.outerHTML;
      }
    }

    // Sposta tutti gli elementi eccedenti
    const moved = children.slice(overflowStartIndex);
    moved.forEach((el) => {
      currentEditor.removeChild(el);
      overflowHtml += el.outerHTML;
    });

    // Aggiorna la pagina corrente
    onChangeContent(currentId, currentEditor.innerHTML);

    // Trova o crea pagina successiva
    const currentIndex = pages.findIndex((p) => p.id === currentId);
    const nextPage = pages[currentIndex + 1];

    if (overflowHtml && overflowHtml.trim().length > 0) {
      if (nextPage) {
        const nextEditor = editorsRef.current.get(nextPage.id);
        if (nextEditor) {
          nextEditor.innerHTML = overflowHtml + nextEditor.innerHTML;
          onChangeContent(nextPage.id, nextEditor.innerHTML);
        }
      } else {
        if (onAddPageWithHtml) await onAddPageWithHtml(overflowHtml);
        else onAddPage?.();
      }
    }

    // Se la pagina successiva ora overflowa, prosegui ricorsivamente
    const nextId = (pages[currentIndex + 1] && pages[currentIndex + 1].id) || null;
    const nextEditor = nextId ? editorsRef.current.get(nextId) : null;
    if (nextEditor && nextEditor.scrollHeight > maxHeight) {
      editorRef.current = nextEditor;
      setActivePageId(nextId!);
      await checkOverflowAndPaginate();
    } else {
      // Rimetti il riferimento all'editor corrente
      editorRef.current = editorsRef.current.get(currentId) || currentEditor;
      setActivePageId(currentId);
    }
  }

  // Spezza testo in modo "prudente" quando un blocco sfora il limite
  function splitTextNodeIfNeeded(el: HTMLElement, container: HTMLElement, limitY: number): string | null {
    try {
      // Se il nodo è "blocco immagine" non spezzare
      if (el.hasAttribute('data-img-wrapper')) return null;

      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects());
      const overflowRect = rects.find((r) => r.bottom > limitY);
      if (!overflowRect) return null;

      // Walker sul testo
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        if (!textNode.textContent || !textNode.textContent.trim()) continue;

        const testRange = document.createRange();
        testRange.selectNodeContents(textNode);
        const segments = Array.from(testRange.getClientRects());
        const segOverflow = segments.find((r) => r.bottom > limitY);
        if (!segOverflow) continue;

        // Ricerca binaria del punto di split per ridurre il costo
        let lo = 0;
        let hi = textNode.length;
        let splitAt = Math.floor((lo + hi) / 2);

        const measure = (idx: number) => {
          const r = document.createRange();
          r.setStart(textNode, 0);
          r.setEnd(textNode, Math.max(1, idx));
          const rects = Array.from(r.getClientRects());
          const bottom = rects.length ? rects[rects.length - 1].bottom : 0;
          return bottom;
        };

        // limita numero di iterazioni
        for (let iter = 0; iter < 20 && lo < hi; iter++) {
          const bottom = measure(splitAt);
          if (bottom > limitY) {
            hi = splitAt - 1;
          } else {
            lo = splitAt + 1;
          }
          splitAt = Math.floor((lo + hi) / 2);
        }

        // evita spezzature nel mezzo di una parola (rudimentale)
        const content = textNode.textContent;
        let safe = splitAt;
        while (safe > 0 && /\S/.test(content![safe]) && /\S/.test(content![safe - 1])) {
          safe--;
          if (safe < 1) break;
        }
        if (safe < 1) safe = splitAt; // ripiego

        const overflowText = content!.slice(safe);
        textNode.textContent = content!.slice(0, safe);
        return overflowText;
      }
    } catch (err) {
      console.warn('splitTextNodeIfNeeded error:', err);
    }
    return null;
  }
  // ============ /PAGINAZIONE INTELLIGENTE ============

  function scheduleAutosave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const html = editorRef.current?.innerHTML ?? '';
      if (currentPage) onChangeContent(currentPage.id, html);
      if (props.onSave) {
        if (dbSaveTimer.current) window.clearTimeout(dbSaveTimer.current);
        dbSaveTimer.current = window.setTimeout(() => {
          const snapshot = buildPagesSnapshot();
          props.onSave?.(snapshot);
        }, 1200);
      }
    }, 600);
  }

  function buildPagesSnapshot() {
    return pages.map((p) => {
      const el = editorsRef.current.get(p.id);
      const html = el ? el.innerHTML : p.content_html ?? '';
      return { ...p, content_html: html };
    });
  }

  function handleManualSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (dbSaveTimer.current) window.clearTimeout(dbSaveTimer.current);
    const snapshot = buildPagesSnapshot();
    snapshot.forEach((p) => {
      const prev = pages.find((prevPage) => prevPage.id === p.id);
      if (prev && prev.content_html !== p.content_html) onChangeContent?.(p.id, p.content_html);
    });
    setIsSaving(true);
    Promise.resolve(props.onSave?.(snapshot))
      .then(() => {
        setLastSavedAt(Date.now());
        toast({ title: 'Diario salvato' });
      })
      .catch(() => {
        toast({ title: 'Salvataggio fallito' });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  // Sanitizzazione incolla
  function sanitizeHtml(input: string): string {
    const allowed = new Set(['p','br','strong','b','em','i','u','h1','h2','h3','ul','ol','li','a']);
    const container = document.createElement('div');
    container.innerHTML = input;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
    const toRemove: Element[] = [];
    while (walker.nextNode()) {
      const el = walker.currentNode as Element;
      const tag = el.tagName.toLowerCase();
      if (!allowed.has(tag)) toRemove.push(el);
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
      // Rimuove event handlers
      [...el.attributes].forEach(a => { if (a.name.startsWith('on')) el.removeAttribute(a.name); });
      // Link: mantieni solo href
      if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        el.getAttributeNames().forEach(n => { if (n !== 'href') el.removeAttribute(n); });
        if (!href) el.remove();
      }
    }
    toRemove.forEach(el => el.replaceWith(...Array.from(el.childNodes)));
    return container.innerHTML;
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar Pagine come indice/ancora */}
      {showPagesSidebar && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}>
          <SidebarPages
            pages={pages}
            selectedPageId={currentPage?.id}
            onSelectPage={(id: string) => {
              setActivePageId(id);
              const pageEl = pageRefs.current.get(id);
              const editorEl = editorsRef.current.get(id);
              pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              pageRef.current = pageEl || null;
              editorRef.current = editorEl || null;
              onSelectPage?.(id);
            }}
            onAddPage={onAddPage}
            onRenamePage={onRenamePage}
            onReorderPages={onReorderPages}
            onClose={() => setShowPagesSidebar(false)}
          />
        </div>
      )}

      <main className="flex-1 min-h-screen flex flex-col" style={{ overflowX: 'hidden' }}>
        {/* Toolbar: su desktop 100% larghezza, su mobile limitata al foglio */}
        {!readOnly && (
          <div style={{ width: '100%', maxWidth: isMobile ? 600 : undefined, margin: isMobile ? '0 auto' : '0' }}>
            <Toolbar
              onSave={handleManualSave}
              onCommand={(cmd, val) => execCommand(cmd, val)}
              isSaving={isSaving}
              lastSavedAt={lastSavedAt}
              fontFamilyValue={editorPrefs.fontFamilyName || undefined}
              fontSizeValue={editorPrefs.fontSize || undefined}
              isCompact={toolbarCompact}
              onToggleCompact={() => setToolbarCompact((v) => !v)}
              onToggleSidebar={() => setShowPagesSidebar((v) => !v)}
            />
          </div>
        )}

        {!readOnly && showMarginsDialog && (
          <div style={{ position: 'fixed', top: 60, right: 16, background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, zIndex: 50, width: 280 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Margini pagina (mm)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ color: '#ccc' }}>Top<input type="number" min={0} max={60} value={marginDraft.top} onChange={(e) => setMarginDraft({ ...marginDraft, top: parseInt(e.target.value || '0', 10) })} style={{ width: '100%' }} /></label>
              <label style={{ color: '#ccc' }}>Right<input type="number" min={0} max={60} value={marginDraft.right} onChange={(e) => setMarginDraft({ ...marginDraft, right: parseInt(e.target.value || '0', 10) })} style={{ width: '100%' }} /></label>
              <label style={{ color: '#ccc' }}>Bottom<input type="number" min={0} max={60} value={marginDraft.bottom} onChange={(e) => setMarginDraft({ ...marginDraft, bottom: parseInt(e.target.value || '0', 10) })} style={{ width: '100%' }} /></label>
              <label style={{ color: '#ccc' }}>Left<input type="number" min={0} max={60} value={marginDraft.left} onChange={(e) => setMarginDraft({ ...marginDraft, left: parseInt(e.target.value || '0', 10) })} style={{ width: '100%' }} /></label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setShowMarginsDialog(false)} style={{ padding: '6px 10px', borderRadius: 6, background: '#2a2a2a', border: '1px solid #3a2a2a', color: '#eaeaea' }}>Annulla</button>
              <button onClick={() => { saveGlobalMargins(marginDraft); setGlobalMargins(marginDraft); setShowMarginsDialog(false); }} style={{ padding: '6px 10px', borderRadius: 6, background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#eaeaea' }}>Applica</button>
            </div>
            <div style={{ color: '#aaaaaa', fontSize: 12, marginTop: 6 }}>Si applica a tutte le pagine e resta salvato.</div>
          </div>
        )}

        <style>{headingCss + responsiveCss}</style>

        <div style={canvasStyle}>
          <div
            ref={pageRef}
            style={computedPageStyle}
            className="doc-page"
            onClick={(e) => {
              if (hasActiveSelection()) return; // 👈 NEW: non collassare la selezione
              if (readOnly) return;
              const editor = editorRef.current;
              if (!editor) return;
              const target = e.target as HTMLElement;
              // Clic fuori dall'editor (margini/padding): caret alla fine
              if (!editor.contains(target)) {
                placeCaretAtEnd(editor);
                return;
              }
              // Editor vuoto (nessuna riga): caret alla fine
              const last = editor.lastElementChild as HTMLElement | null;
              if (!last) {
                placeCaretAtEnd(editor);
                return;
              }
              // Clic sotto l'ultima riga: caret alla fine
              const rect = last.getBoundingClientRect();
              if (e.clientY > rect.bottom - 2) {
                placeCaretAtEnd(editor);
              }
            }}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onImageSelected}
            />
            <input
              ref={bgImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onBackgroundSelected}
            />
            {pages.map((p) => (
              <div
                key={p.id}
                ref={setPageRef(p.id)}
                style={getComputedPageStyle(p)}
                className="doc-page"
                onClick={(e) => {
                  if (hasActiveSelection()) return; // 👈 NEW
                  if (readOnly) return;
                  setActivePageId(p.id);
                  editorRef.current = editorsRef.current.get(p.id) || null;
                  pageRef.current = pageRefs.current.get(p.id) || null;
              
                  const editor = editorsRef.current.get(p.id);
                  if (!editor) return;
                  const target = e.target as HTMLElement;
                  if (!editor.contains(target)) {
                    placeCaretAtEnd(editor);
                    return;
                  }
                  const last = editor.lastElementChild as HTMLElement | null;
                  if (!last) {
                    placeCaretAtEnd(editor);
                    return;
                  }
                  const rect = last.getBoundingClientRect();
                  if (e.clientY > rect.bottom - 2) {
                    placeCaretAtEnd(editor);
                    return;
                  }
                }}
              >
                <div
                  ref={setEditorRef(p.id)}
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  aria-readonly={readOnly ? 'true' : 'false'}
                  style={editableStyle}
                  className="outline-none"
                  onFocus={() => {
                    setActivePageId(p.id);
                    editorRef.current = editorsRef.current.get(p.id) || null;
                    pageRef.current = pageRefs.current.get(p.id) || null;
                  }}
                  onPaste={(e) => {
                    if (readOnly) return;
                    setActivePageId(p.id);
                    editorRef.current = editorsRef.current.get(p.id) || null;
                    e.preventDefault();
                    const html = e.clipboardData.getData('text/html');
                    const text = e.clipboardData.getData('text/plain');
                    const toInsert = html ? sanitizeHtml(html) : text.replace(/\n/g, '<br/>');
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) return;
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const frag = range.createContextualFragment(toInsert);
                    range.insertNode(frag);
                    range.collapse(false);
                    scheduleAutosave();
                    void checkOverflowAndPaginate();
                    const updated = editorsRef.current.get(p.id)?.innerHTML ?? '';
                    onChangeContent?.(p.id, updated);
                  }}
                  onClick={(e) => {
                    if (hasActiveSelection()) return; // 👈 NEW
                    const target = e.target as HTMLElement;
                    const candidate = target.closest('div');
                    if (candidate && (candidate as HTMLElement).style && (candidate as HTMLElement).style.resize) {
                      selectedImageWrapperRef.current = candidate as HTMLElement;
                      return;
                    }
                    const ed = editorsRef.current.get(p.id);
                    if (!ed) return;
                    if (target === ed) {
                      placeCaretAtEnd(ed);
                      return;
                    }
                    const last = ed.lastElementChild as HTMLElement | null;
                    if (!last) {
                      placeCaretAtEnd(ed);
                      return;
                    }
                    const rect = last.getBoundingClientRect();
                    if (e.clientY > rect.bottom - 2) {
                      placeCaretAtEnd(ed);
                      return;
                    }
                  }}
                  onInput={(e) => {
                    setActivePageId(p.id);
                    editorRef.current = editorsRef.current.get(p.id) || null;
                    scheduleAutosave();
                    void checkOverflowAndPaginate();
                    onChangeContent?.(p.id, (e.target as HTMLElement).innerHTML);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const el = draggedElRef.current;
                    if (!el) return;
                    const range = getCaretRangeFromPoint(e.clientX, e.clientY);
                    if (!range) return;
                    el.parentElement?.removeChild(el);
                    range.insertNode(el);
                    scheduleAutosave();
                    void checkOverflowAndPaginate();
                    const html = editorsRef.current.get(p.id)?.innerHTML ?? '';
                    onChangeContent?.(p.id, html);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export { EditorLayout };
