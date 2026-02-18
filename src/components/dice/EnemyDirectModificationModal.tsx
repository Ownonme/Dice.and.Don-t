import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ModificationType = 'salute' | 'puntiAzione' | 'armatura' | null;
type ModificationDirection = 'positivo' | 'negativo' | null;

interface EnemyDirectModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  enemy: any;
  onSave: (health: number, actionPoints: number, armor: number) => void;
  onAddDiceRoll: (roll: any) => void;
}

const EnemyDirectModificationModal: React.FC<EnemyDirectModificationModalProps> = ({
  isOpen,
  onClose,
  enemy,
  onSave,
  onAddDiceRoll
}) => {
  const [step, setStep] = useState<'type' | 'direction' | 'value'>('type');
  const [modificationType, setModificationType] = useState<ModificationType>(null);
  const [modificationDirection, setModificationDirection] = useState<ModificationDirection>(null);
  const [value, setValue] = useState('');

  const currentHealth = Number(enemy?.enemy_current_hp ?? enemy?.enemy_max_hp ?? 0) || 0;
  const currentActionPoints = Number(enemy?.enemy_current_pa ?? enemy?.enemy_max_pa ?? 0) || 0;
  const currentArmor = Number(enemy?.enemy_current_armor ?? enemy?.enemy_max_armor ?? 0) || 0;
  const maxHealth = Number(enemy?.enemy_max_hp ?? 0) || 0;
  const maxActionPoints = Number(enemy?.enemy_max_pa ?? 0) || 0;
  const totalArmor = Number(enemy?.enemy_max_armor ?? 0) || 0;

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
        newHealth = Math.max(0, Math.min(maxHealth, currentHealth + modifier));
        break;
      case 'puntiAzione':
        newActionPoints = Math.max(0, Math.min(maxActionPoints, currentActionPoints + modifier));
        break;
      case 'armatura':
        newArmor = Math.max(0, Math.min(totalArmor, currentArmor + modifier));
        break;
    }
    
    // Aggiungi il tiro ai dadi
    const diceRoll = {
      id: Date.now().toString(),
      type: 'modifica_diretta_nemico',
      result: modifier,
      timestamp: new Date(),
      character: enemy?.name || 'Nemico',
      modificationType,
      modificationDirection,
      originalValue: getCurrentValue(),
      newValue: getNewValue(modifier)
    };
    
    onAddDiceRoll(diceRoll);
    onSave(newHealth, newActionPoints, newArmor);
    handleClose();
  };

  const handleClose = () => {
    setStep('type');
    setModificationType(null);
    setModificationDirection(null);
    setValue('');
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

  const getNewValue = (modifier: number) => {
    const currentVal = getCurrentValue();
    const maxVal = getMaxValue();
    return Math.max(0, Math.min(maxVal, currentVal + modifier));
  };

  if (!enemy) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Diretta - {enemy.name}</DialogTitle>
          <DialogDescription>
            Modifica direttamente i valori del nemico
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="modification-value">Valore modifica</Label>
                <Input
                  id="modification-value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Inserisci il valore"
                  min="1"
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
                      return Math.max(0, Math.min(maxVal, currentVal + modifier));
                    })()
                  }
                </p>
              )}
            </div>
          )}

          {/* Pulsanti di controllo */}
          <div className="flex justify-between pt-4">
            {step !== 'type' && (
              <Button variant="outline" onClick={handleBack}>
                Indietro
              </Button>
            )}
            
            <div className="flex space-x-2 ml-auto">
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              
              {step === 'value' && (
                <Button 
                  onClick={handleApply}
                  disabled={!value}
                >
                  Applica
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnemyDirectModificationModal;
