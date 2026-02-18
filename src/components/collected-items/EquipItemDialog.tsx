import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield } from 'lucide-react';

interface CollectedItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'item';
  description: string;
  stats?: string;
  effect?: string;
}

interface EquipItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: CollectedItem | null;
  characterName: string;
  onConfirm: (shouldEquip: boolean) => void;
}

const EquipItemDialog = ({ isOpen, onClose, item, characterName, onConfirm }: EquipItemDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!item) return null;

  const handleConfirm = async (shouldEquip: boolean) => {
    setIsProcessing(true);
    await onConfirm(shouldEquip);
    setIsProcessing(false);
    onClose();
  };

  const getTypeIcon = () => {
    return item.type === 'weapon' ? <Sword className="h-6 w-6" /> : <Shield className="h-6 w-6" />;
  };

  const getTypeLabel = () => {
    return item.type === 'weapon' ? 'Arma' : 'Armatura';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            Equipaggiare Oggetto?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="secondary">{getTypeLabel()}</Badge>
            </div>
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              Vuoi equipaggiare questo oggetto su <span className="font-semibold">{characterName}</span>?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Potrai sempre equipaggiarlo in seguito dall'inventario del personaggio.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleConfirm(false)}
            disabled={isProcessing}
          >
            Solo Raccogliere
          </Button>
          <Button 
            onClick={() => handleConfirm(true)}
            disabled={isProcessing}
          >
            {isProcessing ? 'Equipaggiando...' : 'Raccogli ed Equipaggia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipItemDialog;