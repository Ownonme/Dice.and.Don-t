import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface FreeDiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rollData: any) => void;
}

interface ExpressionEntry {
  id: string;
  type: 'assicurato' | 'massimale';
  value: number;
}

const FreeDiceDialog: React.FC<FreeDiceDialogProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [entries, setEntries] = useState<ExpressionEntry[]>([]);
  const [newEntryType, setNewEntryType] = useState<'assicurato' | 'massimale'>('assicurato');
  const [newEntryValue, setNewEntryValue] = useState<number>(1);

  const addEntry = () => {
    if (newEntryValue > 0) {
      const newEntry: ExpressionEntry = {
        id: Date.now().toString(),
        type: newEntryType,
        value: newEntryValue
      };
      setEntries(prev => [...prev, newEntry]);
      setNewEntryValue(1);
    }
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const generateExpression = () => {
    return entries.map(entry => {
      if (entry.type === 'assicurato') {
        return `(${entry.value})`; // Numero puro
      } else {
        return `[d${entry.value}]`; // Tiro di dado
      }
    }).join(' + ');
  };

  const handleConfirm = () => {
    if (entries.length > 0) {
      onConfirm({ entries, expression: generateExpression() });
      onClose();
      resetDialog();
    }
  };

  const resetDialog = () => {
    setEntries([]);
    setNewEntryType('assicurato');
    setNewEntryValue(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetDialog(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tiro Libero</DialogTitle>
          <DialogDescription>
            Componi la tua espressione con numeri assicurati e tiri di dado
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Aggiungi nuovo valore */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Valore?</label>
            <div className="flex space-x-2">
              <Select value={newEntryType} onValueChange={(value: 'assicurato' | 'massimale') => setNewEntryType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assicurato">Assicurato</SelectItem>
                  <SelectItem value="massimale">Massimale</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={newEntryValue}
                onChange={(e) => setNewEntryValue(parseInt(e.target.value) || 1)}
                placeholder={newEntryType === 'assicurato' ? 'Numero' : 'Facce dado'}
                className="flex-1"
              />
              <Button onClick={addEntry} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {newEntryType === 'assicurato' ? 'Numero puro (garantito)' : 'Tiro di dado (1 a N facce)'}
            </p>
          </div>

          {/* Lista valori aggiunti */}
          {entries.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Valori aggiunti:</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">
                      {entry.type === 'assicurato' ? `Assicurato: ${entry.value}` : `Massimale: d${entry.value}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Espressione finale */}
          {entries.length > 0 && (
            <div className="p-3 bg-muted rounded">
              <label className="text-sm font-medium block mb-1">Espressione:</label>
              <code className="text-sm">{generateExpression()}</code>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => { onClose(); resetDialog(); }}>Annulla</Button>
            <Button onClick={handleConfirm} disabled={entries.length === 0}>
              Conferma
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FreeDiceDialog;