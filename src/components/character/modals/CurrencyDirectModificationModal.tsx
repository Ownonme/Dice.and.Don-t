import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Currency } from '@/types/character';

type CurrencyType = 'bronzo' | 'argento' | 'oro' | 'rosse' | 'bianche';
type ModificationDirection = 'positivo' | 'negativo';

interface CurrencyDirectModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  onSave: (newCurrency: Currency) => void;
}

const CurrencyDirectModificationModal: React.FC<CurrencyDirectModificationModalProps> = ({
  isOpen,
  onClose,
  currency,
  onSave
}) => {
  const [step, setStep] = useState<'type' | 'direction' | 'value'>('type');
  const [modificationType, setModificationType] = useState<CurrencyType | null>(null);
  const [modificationDirection, setModificationDirection] = useState<ModificationDirection | null>(null);
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

  const handleTypeSelection = (type: CurrencyType) => {
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
    
    let newCurrency = { ...currency };
    const currentValue = newCurrency[modificationType];
    const newValue = Math.max(0, currentValue + modifier);
    
    // Applica la modifica
    if (modificationType === 'bianche') {
      newCurrency[modificationType] = Math.min(999, newValue);
    } else {
      newCurrency[modificationType] = newValue;
    }
    
    // Applica la logica di conversione automatica (stesso codice di CharacterBag)
    if (newCurrency.bronzo >= 100) {
      const extra = Math.floor(newCurrency.bronzo / 100);
      newCurrency.argento += extra;
      newCurrency.bronzo = newCurrency.bronzo % 100; // Mantiene il resto
    }
    
    if (newCurrency.argento >= 100) {
      const extra = Math.floor(newCurrency.argento / 100);
      newCurrency.oro += extra;
      newCurrency.argento = newCurrency.argento % 100; // Mantiene il resto
    }
    
    if (newCurrency.oro >= 100) {
      const extra = Math.floor(newCurrency.oro / 100);
      newCurrency.rosse += extra;
      newCurrency.oro = newCurrency.oro % 100; // Mantiene il resto
    }
    
    if (newCurrency.rosse >= 100) {
      const extra = Math.floor(newCurrency.rosse / 100);
      newCurrency.bianche += extra;
      newCurrency.rosse = newCurrency.rosse % 100; // Mantiene il resto
    }
    
    // Limite massimo per corone bianche
    if (newCurrency.bianche > 999) {
      newCurrency.bianche = 999;
    }
    
    onSave(newCurrency);
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

  const getTypeLabel = (type: CurrencyType) => {
    switch (type) {
      case 'bronzo': return 'Corone di Bronzo';
      case 'argento': return 'Corone d\'Argento';
      case 'oro': return 'Corone d\'Oro';
      case 'rosse': return 'Corone Rosse';
      case 'bianche': return 'Corone Bianche';
      default: return '';
    }
  };

  const getCurrentValue = () => {
    return modificationType ? currency[modificationType] : 0;
  };

  const getMaxValue = (type: CurrencyType) => {
    return type === 'bianche' ? 999 : Number.MAX_SAFE_INTEGER;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Diretta Denari</DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Quale valuta vuoi modificare?'}
            {step === 'direction' && `Modificare ${getTypeLabel(modificationType!)} in positivo o negativo?`}
            {step === 'value' && `Inserisci il valore per ${getTypeLabel(modificationType!)}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Step 1: Selezione tipo */}
          {step === 'type' && (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('bronzo')}
              >
                Corone di Bronzo (Attuale: {currency.bronzo})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('argento')}
              >
                Corone d'Argento (Attuale: {currency.argento})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('oro')}
              >
                Corone d'Oro (Attuale: {currency.oro})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('rosse')}
              >
                Corone Rosse (Attuale: {currency.rosse})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleTypeSelection('bianche')}
              >
                Corone Bianche (Attuale: {currency.bianche}/999)
              </Button>
            </div>
          )}

          {/* Step 2: Selezione direzione */}
          {step === 'direction' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {getTypeLabel(modificationType!)}: {getCurrentValue()}
                {modificationType === 'bianche' && '/999'}
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
                {getTypeLabel(modificationType!)}: {getCurrentValue()}
                {modificationType === 'bianche' && '/999'}
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
                      const result = Math.max(0, currentVal + modifier);
                      
                      if (modificationType === 'bianche') {
                        return Math.min(999, result);
                      }
                      return result;
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

export default CurrencyDirectModificationModal;