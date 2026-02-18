import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Api from '@/integrations/localserver/api';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { GlossarySection } from '@/types/glossary';

interface DeleteSectionConfirmDialogProps {
  isOpen: boolean;
  section: GlossarySection;
  onClose: () => void;
  onSectionDeleted: () => void;
}

const DeleteSectionConfirmDialog = ({
  isOpen,
  section,
  onClose,
  onSectionDeleted
}: DeleteSectionConfirmDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [entriesCount, setEntriesCount] = useState<number | null>(null);
  const { toast } = useToast();

  const loadEntriesCount = useCallback(async () => {
    try {
      const entries = await Api.listGlossaryEntries(section.id);
      setEntriesCount(entries?.length || 0);
    } catch {
      setEntriesCount(0);
    }
  }, [section.id]);

  // Carica il numero di voci quando si apre il dialog
  useEffect(() => {
    if (isOpen && section) {
      void loadEntriesCount();
    }
  }, [isOpen, section, loadEntriesCount]);

  const handleDelete = async () => {
    if (confirmText !== section.name) {
      toast({
        title: 'Errore',
        description: 'Il nome della sezione non corrisponde',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      await Api.deleteGlossarySection(section.id);

      toast({
        title: 'Successo',
        description: `Sezione "${section.name}" eliminata con successo`
      });

      onSectionDeleted();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la sezione',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canDelete = confirmText === section.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Elimina Sezione
          </DialogTitle>
          <DialogDescription>
            Questa azione è irreversibile e eliminerà permanentemente la sezione e tutte le sue voci.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h4 className="font-semibold text-destructive mb-2">
              Stai per eliminare: "{section.name}"
            </h4>
            {entriesCount !== null && (
              <p className="text-sm text-muted-foreground">
                {entriesCount > 0 
                  ? `Questa sezione contiene ${entriesCount} ${entriesCount === 1 ? 'voce' : 'voci'} che ${entriesCount === 1 ? 'sarà eliminata' : 'saranno eliminate'}.`
                  : 'Questa sezione non contiene voci.'
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Per confermare, digita il nome della sezione: <strong>{section.name}</strong>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digita il nome della sezione"
              className={confirmText && !canDelete ? 'border-destructive' : ''}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Elimina Definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSectionConfirmDialog;
