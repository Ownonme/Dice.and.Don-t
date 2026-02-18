import { useState } from 'react';
import { apiBase } from '@/integrations/localserver';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateShopModalProps {
  cityId: string;
  onClose: () => void;
  onShopCreated: () => void;
}

const SHOP_CATEGORIES = [
  { value: 'weapons', label: 'Armi' },
  { value: 'armor', label: 'Armature' },
  { value: 'potions', label: 'Pozioni' },
  { value: 'services', label: 'Servizi' },
  { value: 'general', label: 'Generale' }
];

export function CreateShopModal({ cityId, onClose, onShopCreated }: CreateShopModalProps) {
  const { user } = useAuth(); // Aggiunto hook per ottenere l'utente
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.category) {
      toast({
        title: "Errore",
        description: "Nome e categoria sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Check if shop name already exists in this city
      const res = await fetch(`${apiBase()}/api/shops?eq_city_id=${cityId}&eq_name=${encodeURIComponent(formData.name.trim())}&limit=1`);
      const arr = await res.json();
      const existingShop = arr?.[0] || null;

      if (existingShop) {
        toast({
          title: "Errore",
          description: "Esiste già un negozio con questo nome in questa città",
          variant: "destructive"
        });
        return;
      }

      await fetch(`${apiBase()}/api/shops`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          city_id: cityId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          created_by: user?.id
        })
      });

      toast({
        title: "Successo",
        description: "Negozio creato con successo"
      });
      
      onShopCreated();
    } catch (error) {
      console.error('Error creating shop:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il negozio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Negozio</DialogTitle>
          <DialogDescription>
            Aggiungi un nuovo negozio a questa città. Inserisci nome, categoria e descrizione.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Negozio *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Es. Armeria del Drago"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Es. Armeria, Alchimia, Servizi..."
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione del negozio..."
              disabled={loading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Negozio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
