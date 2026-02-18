import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

type TargetType = 'characters' | 'enemies' | 'evocations';
interface SimpleEntity { id: string; name: string }
interface TargetItem { type: TargetType; id?: string; name?: string }

interface TargetEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTargets: TargetItem[];
  onSave: (targets: TargetItem[]) => void;
  selectedShots?: number;
  availableCharacters?: SimpleEntity[];
  availableEnemies?: SimpleEntity[];
  availableEvocations?: SimpleEntity[];
  shotsTargets?: TargetItem[][];
  onSaveShotsTargets?: (shotsTargets: TargetItem[][]) => void;
}

const typeLabel = (t: TargetType): string => {
  if (t === 'characters') return 'Personaggi';
  if (t === 'enemies') return 'Nemici';
  return 'Evocazioni';
};

const TargetEditDialog: React.FC<TargetEditDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedTargets,
  onSave,
  selectedShots = 1,
  availableCharacters = [],
  availableEnemies = [],
  availableEvocations = [],
  shotsTargets,
  onSaveShotsTargets,
}) => {
  const [localTargets, setLocalTargets] = React.useState<TargetItem[]>(selectedTargets || []);
  const [activeShot, setActiveShot] = React.useState<number>(1);
  const [localShotsTargets, setLocalShotsTargets] = React.useState<TargetItem[][]>([]);
  const [addType, setAddType] = React.useState<TargetType>('characters');
  const [addId, setAddId] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setLocalTargets((selectedTargets || []).slice());
      const shots = Math.max(1, Number(selectedShots || 1));
      let init: TargetItem[][] = [];
      if (Array.isArray(shotsTargets) && shotsTargets.length > 0) {
        init = Array.from({ length: shots }, (_, i) => (shotsTargets[i] || []).slice());
      } else {
        const base = (selectedTargets || []).slice();
        init = Array.from({ length: shots }, () => base.slice());
      }
      setLocalShotsTargets(init);
      setActiveShot(1);
      setAddType('characters');
      setAddId('');
    }
  }, [isOpen, selectedTargets, shotsTargets, selectedShots]);

  const optionsForType = (t: TargetType): SimpleEntity[] => {
    if (t === 'characters') return availableCharacters || [];
    if (t === 'enemies') return availableEnemies || [];
    return availableEvocations || [];
  };

  const addSelected = () => {
    if (!addId) return;
    const list = optionsForType(addType);
    const item = list.find(x => String(x.id) === String(addId));
    const name = item?.name || '';
    const idx = Math.max(0, activeShot - 1);
    const exists = (localShotsTargets[idx] || []).some(t => String(t.id) === String(addId) && String(t.type) === String(addType));
    if (exists) return;
    setLocalShotsTargets(prev => {
      const next = prev.map(arr => arr.slice());
      next[idx] = [...(next[idx] || []), { type: addType, id: addId, name }];
      return next;
    });
    setAddId('');
  };

  const removeTarget = (idx: number) => {
    const shotIdx = Math.max(0, activeShot - 1);
    setLocalShotsTargets(prev => {
      const next = prev.map(arr => arr.slice());
      next[shotIdx] = (next[shotIdx] || []).filter((_, i) => i !== idx);
      return next;
    });
  };

  const handleConfirm = () => {
    const shots = Math.max(1, Number(selectedShots || 1));
    const normalized = Array.from({ length: shots }, (_, i) => (localShotsTargets[i] || []));
    const merged = normalized.flat();
    onSave(merged);
    onSaveShotsTargets?.(normalized);
    onOpenChange(false);
  };

  const shots = Math.max(1, Number(selectedShots || 1));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Modifica bersagli</DialogTitle>
          <DialogDescription>Gestisci bersagli e visualizza i tiri correnti.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-sm font-medium">Bersagli selezionati</div>
            <div className="space-y-2">
              {((localShotsTargets[Math.max(0, activeShot - 1)] || []).length > 0) ? (
                (localShotsTargets[Math.max(0, activeShot - 1)] || []).map((t, idx) => (
                  <div key={`${t.type}-${t.id}-${idx}`} className="flex items-center justify-between border rounded p-2">
                    <div className="text-sm">
                      <span className="font-medium">{t.name || 'Sconosciuto'}</span>
                      <span className="text-muted-foreground ml-2">{typeLabel(t.type)}</span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeTarget(idx)}>Rimuovi</Button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">Nessun bersaglio selezionato</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="col-span-1">
                <Label>Tipo</Label>
                <Select value={addType} onValueChange={(v) => setAddType(v as TargetType)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="characters">Personaggi</SelectItem>
                    <SelectItem value="enemies">Nemici</SelectItem>
                    <SelectItem value="evocations">Evocazioni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Elemento</Label>
                <Select value={addId} onValueChange={(v) => setAddId(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona elemento" /></SelectTrigger>
                  <SelectContent>
                    {optionsForType(addType).map((opt) => (
                      <SelectItem key={`${addType}-${opt.id}`} value={String(opt.id)}>{opt.name}</SelectItem>
                    ))}
                    {optionsForType(addType).length === 0 && (
                      <SelectItem value="no-item" disabled>Nessun elemento disponibile</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Button onClick={addSelected} disabled={!addId}>Aggiungi bersaglio</Button>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button onClick={handleConfirm}>Conferma</Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Tiri</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: shots }).map((_, i) => {
                const selected = activeShot === (i + 1);
                const count = (localShotsTargets[i] || []).length;
                return (
                  <button
                    type="button"
                    key={`shot-${i+1}`}
                    className={`border rounded p-3 flex items-center justify-between ${selected ? 'bg-secondary' : ''}`}
                    onClick={() => setActiveShot(i + 1)}
                  >
                    <div className="text-sm">Tiro {i + 1}</div>
                    <div className="text-xs text-muted-foreground">{count > 0 ? `${count} bersagli` : 'nessun bersaglio'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TargetEditDialog;
