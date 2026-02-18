import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DiceRollButtonProps {
  onRoll: () => void;
  disabled: boolean;
}

const DiceRollButton: React.FC<DiceRollButtonProps> = ({ onRoll, disabled }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Lancia Dado</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Button 
          onClick={onRoll} 
          disabled={disabled}
          size="lg"
          className="w-full"
        >
          Lancia Dado
        </Button>
      </CardContent>
    </Card>
  );
};

export default DiceRollButton;