import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCharacters } from '@/hooks/useCharacters';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CharacterStats } from '@/types/character';

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: () => void;
}

// Tipi di oggetto - aggiorno i valori per corrispondere al database
const ITEM_TYPES = [
  { value: 'arma', label: 'Arma' },
  { value: 'armatura', label: 'Armatura' },
  { value: 'oggetto', label: 'Oggetto' },
  { value: 'pozione', label: 'Pozione' }
];

// Sottotipi per armi
const WEAPON_SUBTYPES = [
  { value: 'una_mano', label: 'Una Mano' },
  { value: 'due_mani', label: 'Due Mani' },
  { value: 'a_distanza', label: 'A Distanza' }
];

// Sottotipi per armature
const ARMOR_SUBTYPES = [
  { value: 'anello', label: 'Anello' },
  { value: 'amuleto', label: 'Amuleto' },
  { value: 'veste', label: 'Veste' },
  { value: 'armatura', label: 'Armatura' },
  { value: 'sotto_corazza', label: 'Sotto Corazza' },
  { value: 'mantello', label: 'Mantello' },
  { value: 'testa', label: 'Testa' },
  { value: 'maschera', label: 'Maschera' },
  { value: 'spallacci', label: 'Spallacci' }
];

interface FormData {
  name: string;
  type: string;
  subtype: string;
  description: string;
  weight: number;
  quantity: number;
  armor: number;
  damageVeloce: number;
  damagePesante: number;
  damageAffondo: number;
  potionEffect: string;
  stats: CharacterStats;
}

const CreateItemModal = ({ isOpen, onClose, onItemCreated }: CreateItemModalProps) => {
  const { characters } = useCharacters();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'arma',
    subtype: '',
    description: '',
    weight: 0,
    quantity: 1,
    armor: 0,
    damageVeloce: 0,
    damagePesante: 0,
    damageAffondo: 0,
    potionEffect: '',
    stats: {
      anima: 0,
      forza: 0,
      agilita: 0,
      sapienza: 0,
      intelletto: 0,
      percezione: 0,
      resistenza: 0
    }
  });

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatChange = (stat: keyof CharacterStats, value: string) => {
    setFormData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: parseInt(value) || 0
      }
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      type: value,
      subtype: ''
    }));
  };

  const handleSubtypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      subtype: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'arma',
      subtype: '',
      description: '',
      weight: 0,
      quantity: 1,
      armor: 0,
      damageVeloce: 0,
      damagePesante: 0,
      damageAffondo: 0,
      potionEffect: '',
      stats: {
        anima: 0,
        forza: 0,
        agilita: 0,
        sapienza: 0,
        intelletto: 0,
        percezione: 0,
        resistenza: 0
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Errore",
          description: "Il nome dell'oggetto è obbligatorio",
          variant: "destructive"
        });
        return;
      }
  
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Errore",
          description: "Devi essere autenticato per creare oggetti",
          variant: "destructive"
        });
        return;
      }
  
      const itemData: any = {
        name: formData.name.trim(),
        type: formData.type,
        subtype: formData.subtype || null,
        description: formData.description || null,
        weight: formData.weight || 0,
        user_id: user.id,
        stats: {
          anima: formData.stats.anima || 0,
          forza: formData.stats.forza || 0,
          agilita: formData.stats.agilita || 0,
          sapienza: formData.stats.sapienza || 0,
          intelletto: formData.stats.intelletto || 0,
          percezione: formData.stats.percezione || 0,
          resistenza: formData.stats.resistenza || 0
        }
      };
  
      if (formData.type === 'armatura') {
        itemData.armor = formData.armor || 0;
      }
  
      if (formData.type === 'arma') {
        itemData.damage = {
          veloce: formData.damageVeloce || 0,
          pesante: formData.damagePesante || 0,
          affondo: formData.damageAffondo || 0
        };
      }
  
      if (formData.type === 'pozione') {
        itemData.effect = formData.potionEffect || '';
      }
  
      const { error } = await supabase
        .from('collected_items')
        .insert([itemData]);
  
      if (error) {
        console.error('Errore durante la creazione dell\'oggetto:', error);
        toast({
          title: "Errore",
          description: `Errore durante la creazione dell'oggetto: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
  
      toast({
        title: "Successo",
        description: "Oggetto creato con successo!"
      });
  
      onItemCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Errore durante la creazione dell\'oggetto:', error);
      toast({
        title: "Errore",
        description: "Errore imprevisto durante la creazione",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableSubtypes = () => {
    if (formData.type === 'arma') return WEAPON_SUBTYPES;
    if (formData.type === 'armatura') return ARMOR_SUBTYPES;
    return [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Oggetto</DialogTitle>
          <DialogDescription>
            Crea un nuovo oggetto e assegnalo direttamente a un personaggio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome dell'oggetto"
            />
          </div>

          <div>
            <Label htmlFor="type">Tipologia *</Label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.type === 'arma' || formData.type === 'armatura') && (
            <div>
              <Label htmlFor="subtype">Sottotipo *</Label>
              <Select value={formData.subtype} onValueChange={(value) => setFormData(prev => ({ ...prev, subtype: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sottotipo" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubtypes().map((subtype) => (
                    <SelectItem key={subtype.value} value={subtype.value}>
                      {subtype.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione dell'oggetto"
            />
          </div>

          {formData.type === 'arma' && (
            <div className="space-y-4">
              <h4 className="font-semibold">Danni Arma</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="damageVeloce">Danno Veloce</Label>
                  <Input
                    id="damageVeloce"
                    type="number"
                    value={formData.damageVeloce}
                    onChange={(e) => setFormData(prev => ({ ...prev, damageVeloce: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="damagePesante">Danno Pesante</Label>
                  <Input
                    id="damagePesante"
                    type="number"
                    value={formData.damagePesante}
                    onChange={(e) => setFormData(prev => ({ ...prev, damagePesante: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="damageAffondo">Danno Affondo</Label>
                  <Input
                    id="damageAffondo"
                    type="number"
                    value={formData.damageAffondo}
                    onChange={(e) => setFormData(prev => ({ ...prev, damageAffondo: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="weaponWeight">Peso</Label>
                <Input
                  id="weaponWeight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {formData.type === 'armatura' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="armor">Valore Armatura</Label>
                <Input
                  id="armor"
                  type="number"
                  value={formData.armor}
                  onChange={(e) => setFormData(prev => ({ ...prev, armor: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="armorWeight">Peso</Label>
                <Input
                  id="armorWeight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {formData.type === 'oggetto' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Peso</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.1"
                />
              </div>
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
            </div>
          )}

          {formData.type === 'pozione' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="potionEffect">Effetto Pozione</Label>
                <Textarea
                  id="potionEffect"
                  value={formData.potionEffect}
                  onChange={(e) => setFormData(prev => ({ ...prev, potionEffect: e.target.value }))}
                  placeholder="Descrivi l'effetto della pozione"
                />
              </div>
              <div>
                <Label htmlFor="potionWeight">Peso</Label>
                <Input
                  id="potionWeight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Statistiche</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {Object.entries(formData.stats).map(([stat, value]) => (
                <div key={stat}>
                  <Label htmlFor={stat} className="text-sm capitalize">
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </Label>
                  <Input
                    id={stat}
                    type="number"
                    value={value}
                    onChange={(e) => handleStatChange(stat as keyof CharacterStats, e.target.value)}
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creazione...' : 'Crea Oggetto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateItemModal;
