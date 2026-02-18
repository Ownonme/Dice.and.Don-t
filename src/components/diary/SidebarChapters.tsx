import React from 'react';

export type ChapterItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

interface SidebarChaptersProps {
  chapters: ChapterItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarChapters({ chapters, isOpen, onToggle }: SidebarChaptersProps) {
  // ... existing code ...
  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 z-40 bg-background border-r transition-transform duration-200 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="font-medium">Indice</span>
        <button onClick={onToggle}>Chiudi</button>
      </div>
      <nav className="overflow-y-auto h-full p-3 space-y-2">
        {chapters.length === 0 && (
          <div className="text-sm opacity-60">Nessun titolo rilevato</div>
        )}
        {chapters.map((ch) => (
          <button
            key={ch.id}
            className={`block w-full text-left text-sm px-2 py-1 rounded ${ch.level === 2 ? 'font-semibold' : 'pl-4'}`}
            onClick={() => {
              const el = document.getElementById(ch.id);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {ch.title}
          </button>
        ))}
      </nav>
    </aside>
  );
  // ... existing code ...
}