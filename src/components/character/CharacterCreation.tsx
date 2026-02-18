import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { useCharacters } from '@/hooks/useCharacters';
import { Character } from '@/types/character';

interface CharacterCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated: (characterId: string) => void;
}

const CharacterCreation = ({ isOpen, onClose, onCharacterCreated }: CharacterCreationProps) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createCharacter } = useCharacters(); // ✅ Ora corrisponde al nome della funzione

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    
    try {
      // Usa createCharacter per creare un nuovo personaggio
      const characterId = await createCharacter(name.trim(), avatarUrl || undefined);
      if (characterId) {
        onCharacterCreated(characterId);
        setName('');
        setAvatarUrl('');
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Personaggio</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli base per creare un nuovo personaggio. Potrai completare la scheda successivamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">
                {name.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="w-full">
              <Label htmlFor="avatar">URL Immagine Profilo (opzionale)</Label>
              <Input
                id="avatar"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://esempio.com/immagine.jpg"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="name">Nome Personaggio *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il nome del personaggio"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Creazione...' : 'Crea Personaggio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CharacterCreation;