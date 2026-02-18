import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Arrow } from '@/types/character';

interface ArrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (arrow: Arrow) => void;
  editingArrow?: Arrow | null;
}

const ArrowModal = ({ isOpen, onClose, onSave, editingArrow }: ArrowModalProps) => {
  const [formData, setFormData] = useState<Partial<Arrow>>({
    name: '',
    description: '',
    damage: 0,
    quantity: 1
  });

  // Aggiungo useEffect per sincronizzare lo stato con editingArrow
  useEffect(() => {
    if (editingArrow) {
      setFormData({
        name: editingArrow.name || '',
        description: editingArrow.description || '',
        damage: editingArrow.damage || 0,
        quantity: editingArrow.quantity || 1
      });
    } else {
      // Reset form quando non c'è editingArrow (nuovo proiettile)
      setFormData({
        name: '',
        description: '',
        damage: 0,
        quantity: 1
      });
    }
  }, [editingArrow]);

  const handleSave = () => {
    const arrow: Arrow = {
      id: editingArrow?.id || crypto.randomUUID(),
      name: formData.name || '',
      description: formData.description || '',
      damage: formData.damage || 0,
      quantity: formData.quantity || 1
    };

    onSave(arrow);
    onClose();
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      damage: 0,
      quantity: 1
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingArrow ? 'Modifica Proiettile' : 'Aggiungi Proiettile'}
          </DialogTitle>
          <DialogDescription>
            {editingArrow ? 'Modifica le proprietà del proiettile selezionato.' : 'Crea un nuovo proiettile per il tuo inventario.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome freccia"
            />
          </div>

          {/* Danno */}
          <div>
            <Label htmlFor="damage">Danno</Label>
            <Input
              id="damage"
              type="number"
              value={formData.damage}
              onChange={(e) => setFormData(prev => ({ ...prev, damage: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          {/* Quantità */}
          <div>
            <Label htmlFor="quantity">Quantità</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              min="1"
            />
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione freccia"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            {editingArrow ? 'Salva Modifiche' : 'Aggiungi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArrowModal;