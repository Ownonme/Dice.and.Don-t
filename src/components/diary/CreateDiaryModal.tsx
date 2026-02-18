import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (diary: {
    id: string;
    title: string;
    is_public: boolean;
    owner_id: string;
    created_at: string;
    owner_name?: string | null;
    character_id: string; // aggiunto
  }) => void;
}

export default function CreateDiaryModal({ open, onOpenChange, onCreated }: Props) {
  const { user, isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState<'si' | 'no'>('no');

  // NUOVO: elenco personaggi e selezione
  const [characters, setCharacters] = useState<{ id: string; name: string; user_id: string }[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      try {
        let query = supabase.from('characters').select('id, name, user_id');
        if (!isAdmin) {
          query = query.eq('user_id', user.id);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        setCharacters(data || []);
        setSelectedCharacterId((data && data[0]?.id) || null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open, user, isAdmin]);

  const handleCreate = async () => {
    if (!user || !selectedCharacterId || title.trim().length === 0) return;
    setSaving(true);
    try {
      const chosen = characters.find(c => c.id === selectedCharacterId);
      if (!chosen) throw new Error('Nessun personaggio selezionato');

      const { data, error } = await supabase
        .from('diaries')
        .insert({
          title: title.trim(),
          is_public: isPublic === 'si',
          owner_id: chosen.user_id,         // manteniamo l’owner come user
          character_id: chosen.id,          // nuovo: collega il diario al personaggio
        })
        .select('id, title, is_public, owner_id, character_id, created_at, characters(name)')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        onCreated({
          id: data.id,
          title: data.title,
          is_public: data.is_public,
          owner_id: data.owner_id,
          created_at: data.created_at,
          owner_name: data.characters?.name ?? null,
          character_id: data.character_id, // aggiunto
        });
        onOpenChange(false);
        setTitle('');
        setIsPublic('no');
        setSelectedCharacterId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crea nuovo libro</DialogTitle>
          <DialogDescription>Imposta titolo, visibilità e personaggio proprietario</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titolo del libro</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Diario di campagna" />
          </div>
          <div>
            <Label>Pubblico</Label>
            <Select value={isPublic} onValueChange={(v) => setIsPublic(v as 'si' | 'no')}>
              <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sì</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Personaggio</Label>
            <Select value={selectedCharacterId ?? ''} onValueChange={(v) => setSelectedCharacterId(v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona personaggio" /></SelectTrigger>
              <SelectContent>
                {characters.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annulla</Button>
          <Button onClick={handleCreate} disabled={saving || !title.trim() || !selectedCharacterId}>Crea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
