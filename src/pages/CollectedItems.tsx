import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCharacters } from '@/hooks/useCharacters';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Package, Plus, Sword, Shield, FlaskConical, Gem, Trash2, User } from 'lucide-react';
import CharacterSelector from '@/components/character/CharacterSelector';
import CreateItemModal from '@/components/collected-items/CreateItemModal';
import { EquipmentItem, Character } from '@/types/character';

// Aggiorno l'interfaccia per riflettere la struttura corretta
interface CollectedItem {
  id: string;
  name: string;
  type: 'arma' | 'armatura' | 'oggetto' | 'pozione';
  subtype?: string;
  description?: string;
  armor?: number;
  stats?: {
    anima?: number;
    forza?: number;
    agilita?: number;
    sapienza?: number;
    intelletto?: number;
    percezione?: number;
    resistenza?: number;
  };
  weight?: number;
  damage?: {
    veloce?: number;
    pesante?: number;
    affondo?: number;
  };
  effect?: string;
  user_id: string;
  collected_by?: string;
  created_at: string;
  updated_at: string;
}

interface EquipDialog {
  isOpen: boolean;
  item: CollectedItem | null;
  characterName: string;
}

const CollectedItems = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { characters, selectedCharacter, setSelectedCharacter, loadFullCharacter, updateCharacter } = useCharacters();
  
  // Stati principali
  const [items, setItems] = useState<CollectedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'arma' | 'armatura' | 'pozione' | 'oggetto'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userItems, setUserItems] = useState<string[]>([]);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  
  // Stati per il dialog di equipaggiamento
  const [equipDialog, setEquipDialog] = useState<EquipDialog>({
    isOpen: false,
    item: null,
    characterName: ''
  });
  const [isProcessingEquip, setIsProcessingEquip] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('collected_items')
        .select('*')
        // Rimuovo questo filtro per permettere a tutti di vedere tutti gli oggetti
        // .eq('user_id', user.id)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Errore nel caricamento degli oggetti:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli oggetti",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadUserItems = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_collected_items')
        .select('item_id')
        .eq('user_id', userId);

      if (error) throw error;
      setUserItems(data?.map(item => item.item_id) || []);
    } catch (error) {
      console.error('Errore nel caricamento degli oggetti utente:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadItems();
    if (user) {
      void loadUserItems();
    }
  }, [user, loadItems, loadUserItems]);

  const handleCharacterSelect = async (characterId: string) => {
    try {
      const character = await loadFullCharacter(characterId);
      if (character) {
        setSelectedCharacter(character);
        setShowCharacterSelector(false);
      }
    } catch (error) {
      console.error('Errore nel caricamento del personaggio:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il personaggio",
        variant: "destructive"
      });
    }
  };

  const collectItem = async (item: CollectedItem, shouldEquip: boolean = false) => {
    if (!user) return;

    try {
      setIsProcessingEquip(true);
      
      // Prima raccogli l'oggetto
      const { error: collectError } = await supabase
        .from('user_collected_items')
        .insert([{ user_id: user.id, item_id: item.id }]);

      if (collectError) throw collectError;

      // Se deve essere equipaggiato e abbiamo un personaggio selezionato
      if (shouldEquip && selectedCharacter && (item.type === 'arma' || item.type === 'armatura')) {
        await equipItemToCharacter(item);
      }

      // Elimina l'oggetto dal database dopo averlo raccolto
      const { error: deleteError } = await supabase
        .from('collected_items')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        console.error('Errore nell\'eliminazione dell\'oggetto:', deleteError);
        // Non bloccare il processo se l'eliminazione fallisce
      }

      toast({
        title: "Successo",
        description: shouldEquip ? "Oggetto raccolto ed equipaggiato!" : "Oggetto raccolto!"
      });

      // Ricarica la lista degli oggetti per rimuovere quello raccolto
      loadItems();
      loadUserItems();
    } catch (error) {
      console.error('Errore nella raccolta dell\'oggetto:', error);
      toast({
        title: "Errore",
        description: "Impossibile raccogliere l'oggetto",
        variant: "destructive"
      });
    } finally {
      setIsProcessingEquip(false);
      setEquipDialog({ isOpen: false, item: null, characterName: '' });
    }
  };

  const equipItemToCharacter = async (item: CollectedItem) => {
    if (!selectedCharacter) return;

    try {
      // Converti l'oggetto raccolto in un EquipmentItem
      const equipmentItem: EquipmentItem = {
        id: crypto.randomUUID(),
        name: item.name,
        type: item.type === 'arma' ? 'arma' : 'armatura',
        subtype: getCorrectSubtype(item),
        description: item.description,
        weight: 0,
        stats: parseStatsCorrectly(item.stats),
        ...(item.type === 'armatura' && { armor: item.armor || 0 }),
        ...(item.type === 'arma' && item.damage && {
          damageVeloce: item.damage.veloce || 10,
          damagePesante: item.damage.pesante || 15,
          damageAffondo: item.damage.affondo || 12,
          calculatedDamageVeloce: Math.floor((item.damage.veloce || 10) / 3),
          calculatedDamagePesante: Math.floor((item.damage.pesante || 15) / 3),
          calculatedDamageAffondo: Math.floor((item.damage.affondo || 12) / 3)
        })
      };
  
      // Aggiungi l'oggetto all'equipaggiamento del personaggio
      const updatedCharacter = {
        ...selectedCharacter,
        equipment: [...(selectedCharacter.equipment || []), equipmentItem]
      };
  
      // Salva il personaggio aggiornato
      const success = await updateCharacter(updatedCharacter);
      if (success) {
        setSelectedCharacter(updatedCharacter);
      }
    } catch (error) {
      console.error('Errore nell\'equipaggiamento:', error);
      throw error;
    }
  };

  const getCorrectSubtype = (item: CollectedItem): string => {
    if (item.type === 'arma') {
      return item.subtype || 'una_mano';
    } else if (item.type === 'armatura') {
      return item.subtype || 'armatura';
    }
    return '';
  };
  
  // Funzione per parsare correttamente le statistiche nel formato del file UTILE.txt
  const parseStatsCorrectly = (stats?: any): Partial<Character['baseStats']> => {
    if (!stats) {
      // Restituisci la struttura corretta con tutti i campi a 0
      return {
        anima: 0,
        forza: 0,
        agilita: 0,
        sapienza: 0,
        intelletto: 0,
        percezione: 0,
        resistenza: 0
      };
    }
    
    // Se è già un oggetto, usalo direttamente
    if (typeof stats === 'object') {
      return {
        anima: stats.anima || 0,
        forza: stats.forza || 0,
        agilita: stats.agilita || 0,
        sapienza: stats.sapienza || 0,
        intelletto: stats.intelletto || 0,
        percezione: stats.percezione || 0,
        resistenza: stats.resistenza || 0
      };
    }
    
    // Se è una stringa, prova a parsarla come JSON
    if (typeof stats === 'string') {
      try {
        const parsed = JSON.parse(stats);
        return {
          anima: parsed.anima || 0,
          forza: parsed.forza || 0,
          agilita: parsed.agilita || 0,
          sapienza: parsed.sapienza || 0,
          intelletto: parsed.intelletto || 0,
          percezione: parsed.percezione || 0,
          resistenza: parsed.resistenza || 0
        };
      } catch {
        // Se non è JSON valido, restituisci la struttura di default
        return {
          anima: 0,
          forza: 0,
          agilita: 0,
          sapienza: 0,
          intelletto: 0,
          percezione: 0,
          resistenza: 0
        };
      }
    }
    
    // Fallback per altri tipi
    return {
      anima: 0,
      forza: 0,
      agilita: 0,
      sapienza: 0,
      intelletto: 0,
      percezione: 0,
      resistenza: 0
    };
  };

  const handleCollectClick = (item: CollectedItem) => {
    // Se non c'è un personaggio selezionato, chiedi di selezionarne uno
    if (!selectedCharacter) {
      toast({
        title: "Seleziona un personaggio",
        description: "Devi selezionare un personaggio prima di raccogliere oggetti",
        variant: "destructive"
      });
      setShowCharacterSelector(true);
      return;
    }
  
    // Se è un'arma o un'armatura, chiedi se equipaggiare
    if (item.type === 'arma' || item.type === 'armatura') {
      setEquipDialog({
        isOpen: true,
        item: item,
        characterName: selectedCharacter.name
      });
    } else {
      // Per pozioni e oggetti, raccogli direttamente
      collectItem(item, false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('collected_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Oggetto eliminato"
      });

      loadItems();
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'oggetto:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'oggetto",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: CollectedItem['type']) => {
    switch (type) {
      case 'arma': return <Sword className="h-4 w-4" />;
      case 'armatura': return <Shield className="h-4 w-4" />;
      case 'pozione': return <FlaskConical className="h-4 w-4" />;
      case 'oggetto': return <Gem className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: CollectedItem['type']) => {
    switch (type) {
      case 'arma': return 'Arma';
      case 'armatura': return 'Armatura';
      case 'pozione': return 'Pozione';
      case 'oggetto': return 'Oggetto';
      default: return 'Sconosciuto';
    }
  };

  const filteredItems = items.filter(item => 
    filter === 'all' || item.type === filter
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dice-dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna ai Dadi
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Oggetti Raccolti</h1>
          </div>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crea Oggetto
          </Button>
        )}
      </div>

      {/* Selezione Personaggio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personaggio Selezionato
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCharacter ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {selectedCharacter.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{selectedCharacter.name}</p>
                  <p className="text-sm text-muted-foreground">Livello {selectedCharacter.level}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowCharacterSelector(true)}
              >
                Cambia Personaggio
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">
                Seleziona un personaggio per raccogliere oggetti
              </p>
              <Button onClick={() => setShowCharacterSelector(true)}>
                <User className="h-4 w-4 mr-2" />
                Seleziona Personaggio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Tutti
        </Button>
        <Button
          variant={filter === 'arma' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('arma')}
        >
          <Sword className="h-4 w-4 mr-1" />
          Armi
        </Button>
        <Button
          variant={filter === 'armatura' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('armatura')}
        >
          <Shield className="h-4 w-4 mr-1" />
          Armature
        </Button>
        <Button
          variant={filter === 'pozione' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pozione')}
        >
          <FlaskConical className="h-4 w-4 mr-1" />
          Pozioni
        </Button>
        <Button
          variant={filter === 'oggetto' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('oggetto')}
        >
          <Gem className="h-4 w-4 mr-1" />
          Oggetti
        </Button>
      </div>

      {/* Lista Oggetti */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isCollected = userItems.includes(item.id);
          
          return (
            <Card key={item.id} className={`relative ${isCollected ? 'ring-2 ring-green-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(item.type)}
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getTypeLabel(item.type)}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                
                {/* Visualizzazione danno per armi */}
                {item.type === 'arma' && item.damage && (
                  <div>
                    <p className="text-sm font-medium">Danno:</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {item.damage.veloce && item.damage.veloce > 0 && (
                        <div>Veloce: {item.damage.veloce}</div>
                      )}
                      {item.damage.pesante && item.damage.pesante > 0 && (
                        <div>Pesante: {item.damage.pesante}</div>
                      )}
                      {item.damage.affondo && item.damage.affondo > 0 && (
                        <div>Affondo: {item.damage.affondo}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Visualizzazione armatura per armature */}
                {item.type === 'armatura' && item.armor && item.armor > 0 && (
                  <div>
                    <p className="text-sm font-medium">Armatura:</p>
                    <p className="text-sm text-muted-foreground">{item.armor}</p>
                  </div>
                )}
                
                {item.stats && (
                  <div>
                    <p className="text-sm font-medium">Statistiche:</p>
                    <div className="text-sm text-muted-foreground">
                      {typeof item.stats === 'object' ? (
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(item.stats).map(([key, value]) => (
                            <span key={key} className="text-xs">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>{String(item.stats)}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {item.effect && (
                  <div>
                    <p className="text-sm font-medium">Effetto:</p>
                    <p className="text-sm text-muted-foreground">{item.effect}</p>
                  </div>
                )}
                
                {user && (
                  <div className="pt-2">
                    {isCollected ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        ✓ Raccolto
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCollectClick(item)}
                        className="w-full"
                        disabled={!selectedCharacter}
                      >
                        {selectedCharacter ? 'Raccogli Oggetto' : 'Seleziona Personaggio'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'all' ? 'Nessun oggetto disponibile' : `Nessun oggetto di tipo "${getTypeLabel(filter as CollectedItem['type'])}" disponibile`}
            </p>
            {isAdmin && (
              <Button
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea il primo oggetto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog per equipaggiamento */}
      <Dialog open={equipDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setEquipDialog({ isOpen: false, item: null, characterName: '' });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {equipDialog.item && getTypeIcon(equipDialog.item.type)}
              Equipaggiare Oggetto?
            </DialogTitle>
            <DialogDescription>
              Scegli se equipaggiare l'oggetto direttamente sul personaggio o aggiungerlo solo all'inventario.
            </DialogDescription>
          </DialogHeader>
          
          {equipDialog.item && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="secondary">{getTypeLabel(equipDialog.item.type)}</Badge>
                </div>
                <h3 className="font-semibold text-lg">{equipDialog.item.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{equipDialog.item.description}</p>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  Vuoi equipaggiare questo oggetto su <span className="font-semibold">{equipDialog.characterName}</span>?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Potrai sempre equipaggiarlo in seguito dall'inventario del personaggio.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => equipDialog.item && collectItem(equipDialog.item, false)}
              disabled={isProcessingEquip}
            >
              Solo Raccogliere
            </Button>
            <Button 
              onClick={() => equipDialog.item && collectItem(equipDialog.item, true)}
              disabled={isProcessingEquip}
            >
              {isProcessingEquip ? 'Equipaggiando...' : 'Raccogli ed Equipaggia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selettore Personaggio */}
      <CharacterSelector
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        onCharacterSelect={handleCharacterSelect}
        currentCharacterId={selectedCharacter?.id}
      />

      {/* Modal Creazione Oggetto */}
      <CreateItemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onItemCreated={loadItems}
      />
    </div>
  );
};

export default CollectedItems;

// ... Funzione helper per formattare le statistiche
const formatStats = (stats: any): string => {
  if (!stats) return '';
  
  if (typeof stats === 'string') {
    try {
      const parsed = JSON.parse(stats);
      return Object.entries(parsed)
        .filter(([_, value]) => value && value !== 0)
        .map(([key, value]) => `${key}: +${value}`)
        .join(', ');
    } catch {
      return stats;
    }
  }
  
  if (typeof stats === 'object') {
    return Object.entries(stats)
      .filter(([_, value]) => value && value !== 0)
      .map(([key, value]) => `${key}: +${value}`)
      .join(', ');
  }
  
  return String(stats);
};
