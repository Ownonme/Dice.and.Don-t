import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AdminWeaponTypeDefinition {
  name: string;
  category: 'mischia' | 'distanza';
}

interface WeaponTypeAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (def: AdminWeaponTypeDefinition) => void;
}

export const WeaponTypeAdminModal = ({ isOpen, onClose, onSave }: WeaponTypeAdminModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'mischia' | 'distanza' | ''>('');

  const canSave = name.trim().length > 0 && (category === 'mischia' || category === 'distanza');

  const handleSave = () => {
    if (!canSave) return;
    const def: AdminWeaponTypeDefinition = {
      name: name.trim(),
      category: category as 'mischia' | 'distanza',
    };
    onSave(def);
    onClose();
    setName('');
    setCategory('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crea Tipo di Arma</DialogTitle>
          <DialogDescription>Definisci nome e tipologia (da mischia o a distanza).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="weapon-type-name">Nome *</Label>
            <Input id="weapon-type-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Spada lunga" />
          </div>

          <div>
            <Label>Tipologia *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mischia">Da mischia</SelectItem>
                <SelectItem value="distanza">Distanza</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={!canSave}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};