import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Search } from 'lucide-react';
import { GlossarySection } from '@/types/glossary';

interface CreateGlossarySectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSectionCreated: () => void;
  editingSection?: GlossarySection | null;
  mode?: 'create' | 'edit';
}

// Icone organizzate per categoria
const ICON_CATEGORIES = {
  'Libri e Conoscenza': ['📖', '📚', '📜', '📿', '🎓', '🔍', '📋', '📝'],
  'Persone e Società': ['👥', '👑', '🎭', '🏛️', '🏺', '⚖️', '🎪', '🎨'],
  'Luoghi e Strutture': ['🏰', '🏔️', '🌲', '🏛️', '🏺', '🗿', '🏟️', '🏗️'],
  'Combattimento': ['⚔️', '🛡️', '🗡️', '🏹', '🔫', '💣', '⚡', '🔥'],
  'Magia e Mistero': ['🔮', '💎', '🌟', '⚡', '🔥', '❄️', '🌊', '🌙'],
  'Natura e Animali': ['🦅', '🐺', '🦁', '🐻', '🦌', '🐉', '🌍', '☀️'],
  'Oggetti e Tesori': ['🗝️', '💎', '👑', '💰', '🏆', '🎁', '📿', '⚱️']
};

const CreateGlossarySectionModal = ({ 
  isOpen, 
  onClose, 
  onSectionCreated, 
  editingSection, 
  mode = 'create' 
}: CreateGlossarySectionModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Libri e Conoscenza');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📖',
    color: '#6366F1',
    sort_order: 0
  });

  useEffect(() => {
    if (editingSection && mode === 'edit') {
      setFormData({
        name: editingSection.name,
        description: editingSection.description || '',
        icon: editingSection.icon || '📖',
        color: editingSection.color || '#6366F1',
        sort_order: editingSection.sort_order
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '📖',
        color: '#6366F1',
        sort_order: 0
      });
    }
  }, [editingSection, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      if (mode === 'edit' && editingSection) {
        await Api.updateGlossarySection(editingSection.id, {
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          sort_order: formData.sort_order,
          updated_at: new Date().toISOString()
        });

        toast({
          title: "Successo",
          description: "Sezione aggiornata con successo"
        });
      } else {
        // Get next sort order
        const nextOrder = 0;

        await Api.createGlossarySection({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          sort_order: formData.sort_order || nextOrder,
          created_by: user.id
        });

        toast({
          title: "Successo",
          description: "Sezione creata con successo"
        });
      }

      onSectionCreated();
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la sezione",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtra le icone in base alla ricerca
  const getFilteredIcons = () => {
    const categoryIcons = ICON_CATEGORIES[selectedCategory] || [];
    if (!searchTerm) return categoryIcons;
    
    // Cerca in tutte le categorie se c'è un termine di ricerca
    const allIcons = Object.values(ICON_CATEGORIES).flat();
    return allIcons.filter(icon => {
      // Qui potresti aggiungere una logica di ricerca più sofisticata
      // Per ora restituisce tutte le icone se c'è un termine di ricerca
      return true;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Modifica Sezione' : 'Crea Nuova Sezione'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifica i dettagli della sezione del glossario.' 
              : 'Crea una nuova sezione per organizzare le voci del glossario.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Sezione *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Es. Regole di Base, Equipaggiamento, Magia..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione opzionale della sezione..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Selezione Icona</Label>
              
              {/* Ricerca icone */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca icone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Categorie */}
              {!searchTerm && (
                <div className="space-y-2">
                  <Label className="text-sm">Categoria</Label>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.keys(ICON_CATEGORIES).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={`p-2 text-left text-sm rounded transition-colors ${
                          selectedCategory === category 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-accent'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Griglia icone */}
              <div className="space-y-2">
                <Label className="text-sm">
                  {searchTerm ? 'Risultati ricerca' : selectedCategory}
                </Label>
                <div className="grid grid-cols-8 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto bg-muted/30">
                  {getFilteredIcons().map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      className={`p-3 text-xl hover:bg-accent rounded-md transition-all duration-200 transform hover:scale-110 ${
                        formData.icon === icon 
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                          : 'bg-background'
                      }`}
                      title={`Seleziona ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icona selezionata */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Icona selezionata:</span>
                <span className="text-2xl">{formData.icon}</span>
                <span className="text-sm text-muted-foreground">({formData.icon})</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="color">Colore Tema</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#6366F1"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordine di Visualizzazione</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* Anteprima */}
              <div className="space-y-2">
                <Label>Anteprima</Label>
                <div 
                  className="p-4 rounded-md border-2 transition-colors"
                  style={{ 
                    borderColor: formData.color,
                    backgroundColor: `${formData.color}10`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{formData.icon}</span>
                    <div>
                      <div className="font-semibold" style={{ color: formData.color }}>
                        {formData.name || 'Nome Sezione'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formData.description || 'Descrizione sezione'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'edit' ? 'Aggiorna' : 'Crea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGlossarySectionModal;
