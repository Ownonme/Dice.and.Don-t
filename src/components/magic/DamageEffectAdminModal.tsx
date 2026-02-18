import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { AdminDamageEffectDefinition } from '@/integrations/supabase/damageEffects';

interface DamageEffectAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (def: AdminDamageEffectDefinition) => void;
}

export const DamageEffectAdminModal = ({ isOpen, onClose, onSave }: DamageEffectAdminModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [affects, setAffects] = useState({ actionPoints: false, health: false, armor: false, classicDamage: false });
  const [bonusEffects, setBonusEffects] = useState<string[]>([]);
  const [newBonus, setNewBonus] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setAffects({ actionPoints: false, health: false, armor: false });
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

  const canSave = name.trim().length > 0 && (affects.actionPoints || affects.health || affects.armor || affects.classicDamage);

  const handleSave = () => {
    const def: AdminDamageEffectDefinition = {
      name: name.trim(),
      description: description.trim(),
      affects: { actionPoints: affects.actionPoints, health: affects.health, armor: affects.armor, classicDamage: affects.classicDamage },
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
          <DialogTitle>Crea Tipo Danno/Effetto</DialogTitle>
          <DialogDescription>Definisci nome, descrizione, cosa colpisce ed eventuali effetti bonus.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="damage-name">Nome danno *</Label>
            <Input id="damage-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Perforante" />
          </div>

          <div>
            <Label htmlFor="damage-desc">Descrizione</Label>
            <Textarea id="damage-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione dell'effetto o del tipo di danno" />
          </div>

          <div>
            <Label>Cosa colpisce?</Label>
            <div className="mt-2 grid grid-cols-4 gap-3">
              <label className="flex items-center gap-2">
                <Checkbox checked={affects.actionPoints} onCheckedChange={(c) => setAffects(p => ({ ...p, actionPoints: !!c }))} />
                Punti Azione
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={affects.health} onCheckedChange={(c) => setAffects(p => ({ ...p, health: !!c }))} />
                Salute
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={affects.armor} onCheckedChange={(c) => setAffects(p => ({ ...p, armor: !!c }))} />
                Armatura
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={affects.classicDamage} onCheckedChange={(c) => setAffects(p => ({ ...p, classicDamage: !!c }))} />
                Danno classico
              </label>
            </div>
          </div>

          <div>
            <Label>Effetti bonus (opzionali)</Label>
            <div className="flex gap-2 mt-2">
              <Input value={newBonus} onChange={(e) => setNewBonus(e.target.value)} placeholder="Es. Danni doppi contro armatura" />
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