import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DiceTypeSelectorProps {
  diceType: string;
  onDiceTypeChange: (type: string) => void;
  onOpenAbilitiesSidebar?: () => void;
}

const DiceTypeSelector: React.FC<DiceTypeSelectorProps> = ({ 
  diceType, 
  onDiceTypeChange, 
  onOpenAbilitiesSidebar 
}) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Tipo di Dado
          {onOpenAbilitiesSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenAbilitiesSidebar}
              className="h-8 w-8 p-0"
              title="Visualizza Magie & Abilità"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={diceType} onValueChange={onDiceTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona tipo di dado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="azioni">Azioni</SelectItem>
            <SelectItem value="danno">Danno</SelectItem>
            <SelectItem value="danno_critico">Danno Critico</SelectItem>
            <SelectItem value="percentuale">Percentuale</SelectItem>
            <SelectItem value="tiro_libero">Tiro Libero</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default DiceTypeSelector;