import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CriticalResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCritical: () => void;
  onNormal: () => void;
  spellOrAbilityName?: string;
}

const CriticalResultDialog: React.FC<CriticalResultDialogProps> = ({
  isOpen,
  onClose,
  onCritical,
  onNormal,
  spellOrAbilityName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tipo di Successo</DialogTitle>
          <DialogDescription>
            {spellOrAbilityName && `${spellOrAbilityName} è riuscita!`}
            <br />
            Il risultato è un critico?
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 justify-center mt-6">
          <Button 
            variant="outline" 
            onClick={() => {
              onNormal();
              onClose();
            }}
            className="flex-1"
          >
            No (Danno Normale)
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              onCritical();
              onClose();
            }}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700"
          >
            Sì (Danno Critico)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CriticalResultDialog;