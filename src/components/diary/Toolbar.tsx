import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Toolbar(props: any) {
  const [isPortrait, setIsPortrait] = React.useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: portrait)').matches
      : true
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
    else mq.addListener(handler as any);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handler);
      else mq.removeListener(handler as any);
    };
  }, []);
  const isMobile = useIsMobile();
  const shouldScroll = isMobile && isPortrait;

  // Dimensioni maggiorate dei picker colore su mobile (quadrato)
  const colorSize = (isMobile && isPortrait) ? 31 : 31;
  const colorInputStyle: React.CSSProperties = {
    width: colorSize,
    height: colorSize,
    padding: 0,
    borderRadius: 6 ,
    border: '1px solid #3a3a3a',
    background: '#2a2a2a',
    boxSizing: 'border-box',
    display: 'inline-block',
    aspectRatio: '1 / 1',
  };
  const barStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '8px 12px',
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap',
    width: '100%',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    height: 30,
    padding: '0 10px',
    borderRadius: 6,
    background: '#2a2a2a',
    color: '#eaeaea',
    border: '1px solid #3a3a3a'
  };
  const selectStyle: React.CSSProperties = {
    height: 30,
    borderRadius: 6,
    background: '#2a2a2a',
    color: '#eaeaea',
    border: '1px solid #3a3a3a'
  };

  const FONT_OPTIONS: { name: string; fallback: string }[] = [
    { name: 'Merriweather', fallback: 'serif' },
    { name: 'Lora', fallback: 'serif' },
    { name: 'Playfair Display', fallback: 'serif' },
    { name: 'Roboto Slab', fallback: 'serif' },
    { name: 'Open Sans', fallback: 'sans-serif' },
    { name: 'Roboto', fallback: 'sans-serif' },
    { name: 'Montserrat', fallback: 'sans-serif' },
    { name: 'Poppins', fallback: 'sans-serif' },
    { name: 'UnifrakturMaguntia', fallback: 'serif' },
    { name: 'Allura', fallback: 'cursive' },
    { name: 'Archivo Black', fallback: 'sans-serif' },
    { name: 'Great Vibes', fallback: 'cursive' },
    { name: 'Ms Madi', fallback: 'cursive' },
    { name: 'Oswald', fallback: 'sans-serif' },
    { name: 'Sacramento', fallback: 'cursive' },
    { name: 'Zalando Sans', fallback: 'sans-serif' },
    { name: 'Zeyada', fallback: 'cursive' },
    { name: 'Lavishly Yours', fallback: 'cursive' },
    { name: 'Are You Serious', fallback: 'cursive' },
    { name: 'Finger Paint', fallback: 'cursive' },
    { name: 'Flow Circular', fallback: 'cursive' },
    { name: 'Henny Penny', fallback: 'cursive' },
    { name: 'Italianno', fallback: 'cursive' },
    { name: 'Kablammo', fallback: 'cursive' },
    { name: 'Lacquer', fallback: 'sans-serif' },
    { name: 'Love Light', fallback: 'cursive' },
    { name: 'Mea Culpa', fallback: 'cursive' },
    { name: 'MedievalSharp', fallback: 'cursive' },
    { name: 'Monsieur La Doulaise', fallback: 'cursive' },
    { name: 'Permanent Marker', fallback: 'cursive' },
    { name: 'Reenie Beanie', fallback: 'cursive' },
    { name: 'The Girl Next Door', fallback: 'cursive' },
    { name: 'Twinkle Star', fallback: 'cursive' },
    { name: 'Pompiere', fallback: 'cursive' },
    { name: 'Nosifer', fallback: 'cursive' },
    { name: 'Ruthie', fallback: 'cursive' },
    { name: 'Beau Rivage', fallback: 'cursive' },
    { name: 'Norican', fallback: 'cursive' },
    { name: 'WindSong', fallback: 'cursive' },
    { name: 'Pirata One', fallback: 'cursive' },
    { name: 'New Rocker', fallback: 'cursive' },
    { name: 'Tangerine', fallback: 'cursive' },
    { name: 'Mystery Quest', fallback: 'cursive' },
  ];
  const FONT_SIZES = ['10px','11px','12px','13px','14px','15px','16px','18px','20px','22px','24px','26px','28px','30px','32px','36px','40px','44px','48px','56px','64px','72px'];

  const ensureFontLoaded = (family: string) => {
    const id = `gf-${family.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g,'+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  };

  const exec = (cmd: string) => props.onCommand?.(cmd);
  const setBlock = (tag: string) => props.onCommand?.('formatBlock', tag);
  const handleBlockChange = (value: string) => {
    setBlock(value);
    if (value === 'h1' || value === 'h2') exec('justifyCenter');
  };

  // 👇 NEW: impedisce che i bottoni rubino il focus dall'editor (preserva la selezione)
  const noBlur = { onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault() };
  const saveLabel = props.isSaving ? 'Salvataggio...' : 'Salva';
  const saveTitle = props.lastSavedAt
    ? `Salvato alle ${new Date(props.lastSavedAt).toLocaleTimeString()}`
    : 'Salva';
  const fontValue = FONT_OPTIONS.find((f) => f.name === props.fontFamilyValue)?.name || FONT_OPTIONS[0].name;
  const sizeValue = FONT_SIZES.includes(props.fontSizeValue) ? props.fontSizeValue : '16px';

  return (
    <>
      <style>{`
        .diary-toolbar { -ms-overflow-style: none; scrollbar-width: none; }
        .diary-toolbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="diary-toolbar" style={barStyle}>
        {/* Hamburger: mostra/nasconde la sidebar Pagine (utile su mobile) */}
        <button
          {...noBlur}
          style={btnStyle}
          onClick={() => props.onToggleSidebar?.()}
          title="Menu"
          aria-label="Apri/Chiudi menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="#eaeaea" strokeWidth="2"/>
          </svg>
        </button>

        {/* Salva manuale */}
        <button
          {...noBlur}
          style={btnStyle}
          onClick={() => props.onSave?.()}
          title={saveTitle}
          aria-label="Salva"
          disabled={props.isSaving}
        >
          {saveLabel}
        </button>

        {/* Blocco: Paragrafo/Titolo/Sottotitolo */}
        <select style={selectStyle} onChange={(e) => handleBlockChange(e.target.value)} defaultValue={'p'}>
          <option value="p">Paragrafo</option>
          <option value="h1">Titolo</option>
          <option value="h2">Sottotitolo</option>
        </select>

        {/* Selezione Font con preview e applicazione inline */}
        <select
          style={selectStyle}
          onChange={(e) => {
            const family = e.target.value;
            const fallback = FONT_OPTIONS.find(f => f.name === family)?.fallback || 'serif';
            ensureFontLoaded(family);
            props.onCommand?.('fontFamilyInline', `${family}, ${fallback}`);
          }}
          value={fontValue}
          title="Font"
        >
          {FONT_OPTIONS.map(f => (
            <option key={f.name} value={f.name} style={{ fontFamily: `${f.name}, ${f.fallback}` }}>
              {f.name}
            </option>
          ))}
        </select>

        {/* Dimensione Font */}
        <select style={selectStyle} onChange={(e) => props.onCommand?.('fontSizePx', e.target.value)} value={sizeValue} title="Dimensione">
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Icone formattazione */}
        <button {...noBlur} style={btnStyle} onClick={() => exec('bold')} title="Grassetto" aria-label="Grassetto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 4h7a4 4 0 010 8H7zM7 12h8a4 4 0 010 8H7z" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => exec('italic')} title="Italico" aria-label="Italico">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 4h8M6 20h8M14 4l-4 16" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => exec('underline')} title="Sottolineato" aria-label="Sottolineato">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4v7a6 6 0 0012 0V4M4 20h16" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => exec('strikeThrough')} title="Barrato" aria-label="Barrato">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M8 8a4 4 0 014-4h0a4 4 0 014 4M8 16a4 4 0 004 4h0a4 4 0 004-4" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>

        {/* Allineamenti */}
        <button {...noBlur} style={btnStyle} onClick={() => exec('justifyLeft')} title="Allinea a sinistra" aria-label="Allinea a sinistra">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h12M4 18h10" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => exec('justifyCenter')} title="Centra" aria-label="Centra">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M6 12h12M7 18h10" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => exec('justifyRight')} title="Allinea a destra" aria-label="Allinea a destra">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M8 12h12M10 18h10" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>

        {/* Inserisci immagine */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('pickImage')} title="Inserisci immagine" aria-label="Inserisci immagine">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="#eaeaea" strokeWidth="2"/>
            <path d="M7 15l3-3 3 3 4-5 4 5" stroke="#eaeaea" strokeWidth="2" fill="none"/>
            <circle cx="9" cy="9" r="2" stroke="#eaeaea" strokeWidth="2"/>
          </svg>
        </button>

        {/* Nuovi controlli immagine: ingrandisci/riduci oltre l’originale */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('imageGrow')} title="Ingrandisci immagine" aria-label="Ingrandisci immagine">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('imageShrink')} title="Riduci immagine" aria-label="Riduci immagine">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('imageFitOriginal')} title="Larghezza originale" aria-label="Larghezza originale">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="10" stroke="#eaeaea" strokeWidth="2"/></svg>
        </button>

        {/* Esporta PDF */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('exportPdf')} title="Esporta PDF" aria-label="Esporta PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 3h8l5 5v13H6z" stroke="#eaeaea" strokeWidth="2"/>
            <path d="M14 3v6h6" stroke="#eaeaea" strokeWidth="2"/>
            <text x="8" y="16" fill="#eaeaea" fontSize="8">PDF</text>
          </svg>
        </button>

        {/* Colore del testo */}
        <input
          type="color"
          title="Colore del testo"
          onChange={(e) => props.onCommand?.('fontColor', e.target.value)}
          style={colorInputStyle}
        />

        {/* Bottone margini (dialog) */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('openMarginsDialog')} title="Margini" aria-label="Margini">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#eaeaea" strokeWidth="2"/>
            <path d="M12 7v10M7 12h10" stroke="#eaeaea" strokeWidth="2"/>
          </svg>
        </button>

        {/* Cancella formattazione */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('clearFormatting')} title="Cancella formattazione" aria-label="Cancella formattazione">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 7l5-5h6l5 5-8 8H12L4 7z" stroke="#eaeaea" strokeWidth="2"/>
            <path d="M12 15v4M9 19h6" stroke="#eaeaea" strokeWidth="2"/>
          </svg>
        </button>

        {/* Sfondo pagina: colore */}
        <input
          type="color"
          title="Colore sfondo pagina"
          onChange={(e) => props.onCommand?.('setBackgroundColor', e.target.value)}
          style={colorInputStyle}
        />

        {/* Sfondo pagina: immagine */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('pickBackgroundImage')} title="Sfondo immagine" aria-label="Sfondo immagine">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16v12H4z" stroke="#eaeaea" strokeWidth="2"/>
            <path d="M6 14l3-3 3 3 4-5 2 3" stroke="#eaeaea" strokeWidth="2" fill="none"/>
          </svg>
        </button>

        {/* Scala sfondo (50%-200%) */}
        <input
          type="range"
          min="50"
          max="200"
          defaultValue="100"
          title="Scala sfondo"
          onChange={(e) => props.onCommand?.('setBackgroundScale', e.target.value)}
          style={{ width: 120 }}
        />

        {/* Posizione sfondo */}
        <select
          style={selectStyle}
          title="Posizione sfondo"
          defaultValue={'center'}
          onChange={(e) => props.onCommand?.('setBackgroundPosition', e.target.value)}
        >
          <option value="center">Centro</option>
          <option value="top">Alto</option>
          <option value="bottom">Basso</option>
          <option value="left">Sinistra</option>
          <option value="right">Destra</option>
          <option value="top left">Alto/Sinistra</option>
          <option value="top right">Alto/Destra</option>
          <option value="bottom left">Basso/Sinistra</option>
          <option value="bottom right">Basso/Destra</option>
        </select>

        {/* Rimuovi sfondo */}
        <button {...noBlur} style={btnStyle} onClick={() => props.onCommand?.('clearBackground')} title="Rimuovi sfondo" aria-label="Rimuovi sfondo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 5l14 14" stroke="#eaeaea" strokeWidth="2"/>
            <path d="M4 6h16v12H4z" stroke="#eaeaea" strokeWidth="2"/>
          </svg>
        </button>

      </div> </>
  );
};
