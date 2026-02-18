import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Character } from '@/types/character';

interface DirectModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: any;
  currentHealth: number;
  currentActionPoints: number;
  currentArmor: number;
  maxHealth: number;
  maxActionPoints: number;
  totalArmor: number;
  onSave: (health: number, actionPoints: number, armor: number) => void;
  onAddDiceRoll: (roll: any) => void; // Nuova prop
}

const DirectModificationModal: React.FC<DirectModificationModalProps> = ({
  isOpen,
  onClose,
  character,
  currentHealth,
  currentActionPoints,
  currentArmor,
  maxHealth,
  maxActionPoints,
  totalArmor,
  onSave,
  onAddDiceRoll // Nuova prop
}) => {
  const [step, setStep] = useState<'type' | 'direction' | 'value'>('type');
  const [modificationType, setModificationType] = useState<ModificationType>(null);
  const [modificationDirection, setModificationDirection] = useState<ModificationDirection>(null);
  const [value, setValue] = useState<string>('');

  // Reset quando si apre la modale
  React.useEffect(() => {
    if (isOpen) {
      setStep('type');
      setModificationType(null);
      setModificationDirection(null);
      setValue('');
    }
  }, [isOpen]);

  const handleTypeSelection = (type: ModificationType) => {
    setModificationType(type);
    setStep('direction');
  };

  const handleDirectionSelection = (direction: ModificationDirection) => {
    setModificationDirection(direction);
    setStep('value');
  };

  const handleApply = () => {
    if (!value || !modificationType || !modificationDirection) return;
    
    const numValue = parseInt(value) || 0;
    const modifier = modificationDirection === 'positivo' ? numValue : -numValue;
    
    let newHealth = currentHealth;
    let newActionPoints = currentActionPoints;
    let newArmor = currentArmor;
    
    switch (modificationType) {
      case 'salute':
        newHealth = Math.min(currentHealth + modifier, maxHealth);
        // Permetti valori negativi per la salute
        break;
      case 'puntiAzione':
        newActionPoints = Math.min(currentActionPoints + modifier, maxActionPoints);
        // Permetti valori negativi per i punti azione
        
        // Se i punti azione scendono sotto 0, aggiungi messaggio allo storico
        if (newActionPoints < 0 && currentActionPoints >= 0) {
          const debtMessage = {
            id: Date.now().toString(),
            characterId: character.id,
            characterName: character.name,
            diceType: 'azioni' as const,
            result: 0,
            maxValue: 0,
            timestamp: new Date(),
            isHidden: false,
            isSpecialMessage: true,
            specialMessage: `${character.name} è in debito energetico!`
          };
          onAddDiceRoll(debtMessage);
        }
        break;
      case 'armatura':
        newArmor = Math.min(Math.max(0, currentArmor + modifier), totalArmor);
        // L'armatura non può andare sotto 0
        break;
    }
    
    onSave(newHealth, newActionPoints, newArmor);
    onClose();
  };

  const handleBack = () => {
    if (step === 'direction') {
      setStep('type');
      setModificationType(null);
    } else if (step === 'value') {
      setStep('direction');
      setModificationDirection(null);
      setValue('');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const getTypeLabel = (type: ModificationType) => {
    switch (type) {
      case 'salute': return 'Salute';
      case 'puntiAzione': return 'Punti Azione';
      case 'armatura': return 'Armatura';
      default: return '';
    }
  };

  const getCurrentValue = () => {
    switch (modificationType) {
      case 'salute': return currentHealth;
      case 'puntiAzione': return currentActionPoints;
      case 'armatura': return currentArmor;
      default: return 0;
    }
  };

  const getMaxValue = () => {
    switch (modificationType) {
      case 'salute': return maxHealth;
      case 'puntiAzione': return maxActionPoints;
      case 'armatura': return totalArmor;
      default: return 0;
    }
  };

  if (!character) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Diretta - {character.name}</DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Cosa vuoi modificare?'}
            {step === 'direction' && `Modificare ${getTypeLabel(modificationType)} in positivo o negativo?`}
            {step === 'value' && `Inserisci il valore per ${getTypeLabel(modificationType)}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Step 1: Selezione tipo */}
          {step === 'type' && (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('salute')}
              >
                Salute (Attuale: {currentHealth}/{maxHealth})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('puntiAzione')}
              >
                Punti Azione (Attuale: {currentActionPoints}/{maxActionPoints})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('armatura')}
              >
                Armatura (Attuale: {currentArmor}/{totalArmor})
              </Button>
            </div>
          )}

          {/* Step 2: Selezione direzione */}
          {step === 'direction' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {getTypeLabel(modificationType)}: {getCurrentValue()}/{getMaxValue()}
              </p>
              <Button 
                variant="outline" 
                className="w-full justify-start text-green-600"
                onClick={() => handleDirectionSelection('positivo')}
              >
                ➕ Positivo (Aumenta)
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600"
                onClick={() => handleDirectionSelection('negativo')}
              >
                ➖ Negativo (Diminuisce)
              </Button>
            </div>
          )}

          {/* Step 3: Inserimento valore */}
          {step === 'value' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {getTypeLabel(modificationType)}: {getCurrentValue()}/{getMaxValue()}
              </p>
              <p className="text-sm">
                Modifica: {modificationDirection === 'positivo' ? '+' : '-'}
              </p>
              <div className="space-y-2">
                <Label htmlFor="value">Valore</Label>
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  min={1}
                  placeholder="Inserisci il valore"
                  autoFocus
                />
              </div>
              {value && (
                <p className="text-sm text-muted-foreground">
                  Risultato: {getCurrentValue()} {modificationDirection === 'positivo' ? '+' : '-'} {value} = {
                    (() => {
                      const numValue = parseInt(value) || 0;
                      const modifier = modificationDirection === 'positivo' ? numValue : -numValue;
                      const currentVal = getCurrentValue();
                      const maxVal = getMaxValue();
                      
                      switch (modificationType) {
                        case 'salute':
                        case 'puntiAzione':
                          // Possono andare in negativo
                          return Math.min(currentVal + modifier, maxVal);
                        case 'armatura':
                          // Non può andare sotto 0
                          return Math.min(Math.max(0, currentVal + modifier), maxVal);
                        default:
                          return currentVal;
                      }
                    })()
                  }
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <div>
            {step !== 'type' && (
              <Button variant="outline" onClick={handleBack}>
                Indietro
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Annulla
            </Button>
            {step === 'value' && (
              <Button onClick={handleApply} disabled={!value}>
                Applica
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DirectModificationModal;