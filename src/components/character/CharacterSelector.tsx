import { DiceLoader } from '@/components/ui/dice-loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useCharacters } from '@/hooks/useCharacters';

interface CharacterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterSelect: (characterId: string) => void;
  currentCharacterId?: string;
}

const CharacterSelector = ({ isOpen, onClose, onCharacterSelect, currentCharacterId }: CharacterSelectorProps) => {
  const { characters, isLoading } = useCharacters();

  const handleCharacterSelect = (characterId: string) => {
    onCharacterSelect(characterId);
    onClose();
  };

  

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seleziona Personaggio</DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <DiceLoader size="lg" text="Don't" label="Caricamento personaggi..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {characters.map((character) => (
                <Card
                  key={character.id}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors relative ${
                    character.id === currentCharacterId ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleCharacterSelect(character.id)}
                >
                  <CardContent className="flex items-center space-x-4 p-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={character.avatar_url} />
                      <AvatarFallback>
                        {character.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{character.name}</h3>
                      <p className="text-sm text-muted-foreground">Livello {character.level}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {characters.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun personaggio trovato. Crea il tuo primo personaggio!
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CharacterSelector;
