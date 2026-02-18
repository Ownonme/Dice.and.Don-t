import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Character } from '@/types/character';

interface DirectModificationProps {
  character: Character | null;
  onOpenModal: () => void;
}

const DirectModification: React.FC<DirectModificationProps> = ({ character, onOpenModal }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Modifica Diretta</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Button 
          onClick={onOpenModal}
          disabled={!character}
          variant="outline"
          className="w-full"
        >
          Modifica Valori
        </Button>
      </CardContent>
    </Card>
  );
};

export default DirectModification;