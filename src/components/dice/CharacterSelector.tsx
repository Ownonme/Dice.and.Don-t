import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Character } from '@/types/character';

interface CharacterSelectorProps {
  characters: Character[];
  selectedCharacterId: string;
  onCharacterSelect: (id: string) => void;
}

const CharacterSelector: React.FC<CharacterSelectorProps> = ({ 
  characters, 
  selectedCharacterId, 
  onCharacterSelect 
}) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Selezione Personaggio</CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedCharacterId} onValueChange={onCharacterSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un personaggio" />
          </SelectTrigger>
          <SelectContent>
            {characters.map((character) => (
              <SelectItem key={character.id} value={character.id!}>
                <div className="flex items-center gap-2">
                  <span>{character.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    Lv. {character.level}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default CharacterSelector;