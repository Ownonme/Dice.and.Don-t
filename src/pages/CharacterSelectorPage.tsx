import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCharacters } from '@/hooks/useCharacters';
import { DiceLoader } from '@/components/ui/dice-loader';
import { Plus } from 'lucide-react';
import CharacterCreation from '@/components/character/CharacterCreation';

const CharacterSelectorPage = () => {
  const { characters, isLoading } = useCharacters();
  const navigate = useNavigate();
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

  const handleCharacterCreated = (characterId: string) => {
    // Naviga al personaggio appena creato
    navigate(`/character/${characterId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <DiceLoader size="xl" text="Don't" label="Caricamento personaggi..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              ← Home
            </Button>
            <h1 className="text-2xl font-bold">Seleziona Personaggio</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Bottone per creare nuovo personaggio */}
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsCreationModalOpen(true)}>
            <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
              <Plus className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">Nuovo Personaggio</h3>
              <p className="text-sm text-muted-foreground text-center">Crea un nuovo personaggio</p>
            </CardContent>
          </Card>

          {/* Lista personaggi esistenti */}
          {characters.map((character) => (
            <Card key={character.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/character/${character.id}`)}>
              <CardContent className="flex flex-col items-center p-6">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarImage src={character.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {character.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-center">{character.name}</h3>
                <p className="text-sm text-muted-foreground">Livello {character.level}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modale per la creazione del personaggio */}
      <CharacterCreation
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        onCharacterCreated={handleCharacterCreated}
      />
    </div>
  );
};

export default CharacterSelectorPage;
