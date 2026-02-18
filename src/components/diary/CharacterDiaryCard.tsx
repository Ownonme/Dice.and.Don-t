export default function CharacterDiaryCard({
  character,
  diaries,
  onRead,
  onEdit,
}: {
  character: { id: string; name: string; avatar_url?: string };
  diaries: { id: string; title: string; is_public: boolean; owner_id: string; created_at: string; cover_image_url?: string | null }[];
  onRead: (diaryId: string) => void;
  onEdit: (diaryId: string) => void;
}) {
  const coverUrl = character.avatar_url; // fallback: copertina generale della card (personaggio)

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      {/* Copertina */}
      <div
        className="h-28 w-full bg-muted relative"
        style={{
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Avatar sovrapposto */}
      <div className="relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full ring-2 ring-background overflow-hidden shadow-md">
            <img
              src={character.avatar_url || ''}
              alt={character.name}
              className="w-full h-full object-cover"
              onError={(e) => ((e.currentTarget.src = ''))}
            />
          </div>
        </div>
      </div>

      {/* Contenuto */}
      <div className="pt-14 px-4 pb-4">
        <div className="text-center mb-3">
          <div className="text-lg font-semibold">{character.name}</div>
        </div>

        <ul className="space-y-2">
          {diaries.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nessun libro per questo personaggio</li>
          ) : (
            diaries.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">•</span>
                  <button
                    className="text-sm hover:underline text-foreground"
                    onClick={() => onRead(d.id)}
                    title="Leggi"
                  >
                    {d.title}
                  </button>
                  {d.is_public && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700">Pubblico</span>
                  )}
                </div>

                {/* Miniatura copertina (prima pagina del diario) */}
                <div className="w-10 h-14 rounded-sm overflow-hidden border bg-muted shrink-0">
                  {d.cover_image_url ? (
                    <img
                      src={d.cover_image_url}
                      alt={`Copertina ${d.title}`}
                      className="w-full h-full object-cover"
                      onClick={() => onRead(d.id)}
                      title="Apri"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                      n/a
                    </div>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}