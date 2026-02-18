import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  diary: { id: string; title: string; is_public: boolean; owner_id: string; created_at: string; owner_name?: string | null };
  onRead: () => void;
  onEdit: () => void;
}

export default function DiaryCard({ diary, onRead, onEdit }: Props) {
  const { user, isAdmin } = useAuth();
  const isOwner = user?.id === diary.owner_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{diary.title}</span>
          {diary.is_public && <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Pubblico</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {diary.character_name && <p className="text-sm text-muted-foreground">Personaggio: {diary.character_name}</p>}
        <div className="flex gap-2">
          <Button onClick={onRead}>Leggi</Button>
          {(isOwner || isAdmin) && <Button variant="outline" onClick={onEdit}>Modifica / Aggiungi pagina</Button>}
        </div>
      </CardContent>
    </Card>
  );
}