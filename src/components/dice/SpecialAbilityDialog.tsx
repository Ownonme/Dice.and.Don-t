import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCharacters } from '@/hooks/useCharacters';

interface SpecialAbilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rollData: any) => void;
  character: any;
}

const SpecialAbilityDialog: React.FC<SpecialAbilityDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  character
}) => {
  const { loadFullCharacter } = useCharacters();
  const [fullCharacter, setFullCharacter] = useState<any>(null);
  const [selectedAbility, setSelectedAbility] = useState<string>('');
  const [assassinioMultiplier, setAssassinioMultiplier] = useState<number>(1);

  // Carica il personaggio completo quando la modale si apre
  useEffect(() => {
    if (isOpen && character?.id) {
      loadFullCharacter(character.id).then(setFullCharacter);
    }
  }, [isOpen, character?.id, loadFullCharacter]);

  // Abilità speciali disponibili
  const specialAbilities = [
    { key: 'contrattacco', name: 'Contrattacco' },
    { key: 'assassinio', name: 'Assassinio' }
  ].filter(ability => {
    const value = fullCharacter?.abilities?.[ability.key] || 0;
    return value > 0;
  });

  const handleConfirm = () => {
    if (selectedAbility) {
      const abilityValue = fullCharacter?.abilities?.[selectedAbility] || 0;
      const rollData = {
        abilityType: selectedAbility,
        abilityValue,
        assassinioMultiplier: selectedAbility === 'assassinio' ? assassinioMultiplier : 1
      };
      onConfirm(rollData);
      onClose();
      resetSelection();
    }
  };

  const resetSelection = () => {
    setSelectedAbility('');
    setAssassinioMultiplier(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetSelection(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abilità Speciali</DialogTitle>
          <DialogDescription>
            Scegli un'abilità speciale da utilizzare
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Abilità Speciale</label>
            <Select value={selectedAbility} onValueChange={setSelectedAbility}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli abilità speciale" />
              </SelectTrigger>
              <SelectContent>
                {specialAbilities.map(ability => {
                  const value = fullCharacter?.abilities?.[ability.key] || 0;
                  return (
                    <SelectItem key={ability.key} value={ability.key}>
                      {ability.name} (d{value})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Moltiplicatore per Assassinio - applicato all'intero tiro */}
          {selectedAbility === 'assassinio' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Moltiplicatore per intero tiro</label>
              <Input
                type="number"
                min="1"
                value={assassinioMultiplier}
                onChange={(e) => setAssassinioMultiplier(parseInt(e.target.value) || 1)}
                placeholder="Moltiplicatore (es. 2)"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => { onClose(); resetSelection(); }}>Annulla</Button>
            <Button onClick={handleConfirm} disabled={!selectedAbility}>
              Conferma
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpecialAbilityDialog;