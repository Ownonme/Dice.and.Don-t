import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export interface AdminMaterialDefinition {
  name: string;
  description?: string;
  ingotWeight?: number | null;
  bonusEffects: string[];
}

interface MaterialAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (def: AdminMaterialDefinition) => void;
}

export const MaterialAdminModal = ({ isOpen, onClose, onSave }: MaterialAdminModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingotWeight, setIngotWeight] = useState('');
  const [bonusEffects, setBonusEffects] = useState<string[]>([]);
  const [newBonus, setNewBonus] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setIngotWeight('');
    setBonusEffects([]);
    setNewBonus('');
  };

  const addBonus = () => {
    const trimmed = newBonus.trim();
    if (!trimmed) return;
    if (bonusEffects.includes(trimmed)) return;
    setBonusEffects(prev => [...prev, trimmed]);
    setNewBonus('');
  };

  const removeBonus = (idx: number) => {
    setBonusEffects(prev => prev.filter((_, i) => i !== idx));
  };

  const canSave = name.trim().length > 0 && ingotWeight.trim().length > 0;

  const handleSave = () => {
    const def: AdminMaterialDefinition = {
      name: name.trim(),
      description: description.trim(),
      ingotWeight: ingotWeight === '' ? null : (Number(ingotWeight) || 0),
      bonusEffects,
    };
    onSave(def);
    onClose();
    reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Creazione Materiale</DialogTitle>
          <DialogDescription>Definisci nome, peso per lingotto, descrizione e bonus.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="mat-name">Nome *</Label>
            <Input id="mat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Mithril" />
          </div>

          <div>
            <Label htmlFor="mat-weight">Peso per lingotto *</Label>
            <Input id="mat-weight" type="number" value={ingotWeight} onChange={(e) => setIngotWeight(e.target.value)} placeholder="Es. 1.5" />
            <p className="text-xs text-muted-foreground mt-1">Unità libera (es. kg). Decidi lo standard in seguito.</p>
          </div>

          <div>
            <Label htmlFor="mat-desc">Descrizione</Label>
            <Textarea id="mat-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione del materiale" />
          </div>

          <div>
            <Label>Bonus (come per i danni)</Label>
            <div className="flex gap-2 mt-2">
              <Input value={newBonus} onChange={(e) => setNewBonus(e.target.value)} placeholder="Es. +2 alla resistenza" />
              <Button variant="secondary" onClick={addBonus}>Aggiungi</Button>
            </div>
            {bonusEffects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {bonusEffects.map((be, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Badge variant="outline">{be}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeBonus(i)} className="h-6 px-2">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Annulla</Button>
          <Button onClick={handleSave} disabled={!canSave}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};