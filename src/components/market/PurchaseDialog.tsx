import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Sword, Shield } from 'lucide-react';
import { MarketItem } from '@/types/market';

interface PurchaseDialogProps {
  isOpen: boolean;
  items: MarketItem[];
  onClose: () => void;
  onAddToInventory: (items: MarketItem[]) => void;
  onEquipItems: (items: MarketItem[]) => void;
}

export const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
  isOpen,
  items,
  onClose,
  onAddToInventory,
  onEquipItems
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const weaponsAndArmor = items.filter(item => item.type === 'arma' || item.type === 'armatura');
  const otherItems = items.filter(item => item.type !== 'arma' && item.type !== 'armatura');
  
  const handleAddToInventory = async () => {
    setIsProcessing(true);
    await onAddToInventory(items);
    setIsProcessing(false);
    onClose();
  };
  
  const handleEquipItems = async () => {
    setIsProcessing(true);
    await onEquipItems(weaponsAndArmor);
    // Gli altri oggetti vanno comunque nell'inventario
    if (otherItems.length > 0) {
      await onAddToInventory(otherItems);
    }
    setIsProcessing(false);
    onClose();
  };
  
  if (weaponsAndArmor.length === 0) {
    // Se non ci sono armi o armature, aggiungi tutto all'inventario automaticamente
    handleAddToInventory();
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acquisto Completato!</DialogTitle>
          <DialogDescription>
            Hai acquistato {weaponsAndArmor.length} armi/armature. Dove vuoi aggiungerle?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Armi e Armature:</h4>
            {weaponsAndArmor.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                {item.type === 'arma' ? <Sword className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                <span className="flex-1">{item.name}</span>
                <Badge variant="outline">{item.type}</Badge>
              </div>
            ))}
          </div>
          
          {otherItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Altri oggetti (andranno nell'inventario):</h4>
              {otherItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Package className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleAddToInventory}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            <Package className="h-4 w-4 mr-2" />
            Aggiungi all'Inventario
          </Button>
          <Button
            onClick={handleEquipItems}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {item.type === 'arma' ? <Sword className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Equipaggia Subito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};