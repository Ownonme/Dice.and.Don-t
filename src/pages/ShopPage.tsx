import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiBase } from '@/integrations/localserver';
import { useAuth } from '../hooks/useAuth';
import { useCharacters } from '../hooks/useCharacters';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import CreateItemModal from '../components/market/CreateItemModal';
import MarketItemCard from '../components/market/MarketItemCard';
import ShoppingCartManager, { CartItem } from '../components/market/ShoppingCartManager';
import { toast } from '../hooks/use-toast';
import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react';
import { MarketItem } from '../types/market';
import { Currency } from '../types/character';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  city: {
    id: string;
    name: string;
  };
}

export default function ShopPage() {
  const { cityId, shopId } = useParams<{ cityId: string; shopId: string }>();
  const { isAdmin, user } = useAuth();
  const { characters, selectedCharacter, setSelectedCharacter, updateCharacter } = useCharacters();
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const fetchShopAndItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch shop details with city info
      const shopRes = await fetch(`${apiBase()}/api/shops?eq_id=${shopId}`);
      const shopArr = await shopRes.json();
      const shopData = shopArr?.[0] ? { ...shopArr[0], city: shopArr[0].city || { id: cityId, name: '' } } : null;

      setShop(shopData);

      // Fetch items with new currency fields
      const itemsRes = await fetch(`${apiBase()}/api/market_items?eq_shop_id=${shopId}`);
      const itemsData = await itemsRes.json();

      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching shop and items:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati del negozio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [shopId, cityId]);

  useEffect(() => {
    if (shopId && cityId) {
      fetchShopAndItems();
    }
  }, [shopId, cityId, fetchShopAndItems]);

  const handleItemCreated = () => {
    fetchShopAndItems();
    setShowCreateModal(false);
  };

  const addToCart = (item: MarketItem) => {
    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem.item.id === item.id);
      if (existingItem) {
        return prev.map(cartItem => 
          cartItem.item.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { item, quantity: 1 }];
      }
    });
    
    toast({
      title: "Aggiunto al carrello",
      description: `${item.name} è stato aggiunto al carrello`
    });
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prev => 
      prev.map(cartItem => 
        cartItem.item.id === itemId 
          ? { ...cartItem, quantity }
          : cartItem
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(cartItem => cartItem.item.id !== itemId));
    toast({
      title: "Rimosso dal carrello",
      description: "L'oggetto è stato rimosso dal carrello"
    });
  };

  const clearCart = () => {
    setCartItems([]);
    toast({
      title: "Carrello svuotato",
      description: "Tutti gli oggetti sono stati rimossi dal carrello"
    });
  };

  const handleItemDeleted = (itemId: string) => {
    setItems(prev => prev.filter(it => it.id !== itemId));
    setCartItems(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  const handleItemUpdated = (updatedAny: MarketItem | MarketItem[]) => {
    const updated: MarketItem = Array.isArray(updatedAny) ? updatedAny[0] : updatedAny;
    if (!updated || !updated.id) return;
    setItems(prev => prev.map(it => it.id === updated.id ? { ...it, ...updated } : it));
    setCartItems(prev => prev.map(ci => ci.item.id === updated.id ? { ...ci, item: { ...ci.item, ...updated } } : ci));
  };

  const handlePurchase = async () => {
    if (!selectedCharacter || !user) {
      toast({
        title: "Errore",
        description: "Devi selezionare un personaggio per effettuare acquisti",
        variant: "destructive"
      });
      return;
    }

    try {
      const totalCost = cartItems.reduce((total, cartItem) => {
        const itemCost = 
          (cartItem.item.price_bronzo || 0) +
          (cartItem.item.price_argento || 0) * 100 +
          (cartItem.item.price_oro || 0) * 10000 +
          (cartItem.item.price_rosse || 0) * 1000000 +
          (cartItem.item.price_bianche || 0) * 100000000;
        return total + (itemCost * cartItem.quantity);
      }, 0);

      // Calcola il denaro totale del personaggio
      const totalPlayerCurrency = 
        selectedCharacter.currency.bronzo + 
        (selectedCharacter.currency.argento * 100) + 
        (selectedCharacter.currency.oro * 10000) + 
        (selectedCharacter.currency.rosse * 1000000) + 
        (selectedCharacter.currency.bianche * 100000000);

      if (totalPlayerCurrency < totalCost) {
        toast({
          title: "Fondi insufficienti",
          description: "Non hai abbastanza denaro per completare l'acquisto",
          variant: "destructive"
        });
        return;
      }

      // Calcola il nuovo denaro dopo l'acquisto
      // Converti tutto in bronzo, sottrai il costo, poi riconverti
      let remainingBronzo = totalPlayerCurrency - totalCost;
      
      const newCurrency: Currency = {
        bronzo: 0,
        argento: 0,
        oro: 0,
        rosse: 0,
        bianche: 0
      };

      // Riconverti il bronzo rimanente nelle valute appropriate
      // Bianche (100.000.000 bronzo = 1 bianche)
      if (remainingBronzo >= 100000000) {
        newCurrency.bianche = Math.floor(remainingBronzo / 100000000);
        remainingBronzo = remainingBronzo % 100000000;
      }
      
      // Rosse (1.000.000 bronzo = 1 rosse)
      if (remainingBronzo >= 1000000) {
        newCurrency.rosse = Math.floor(remainingBronzo / 1000000);
        remainingBronzo = remainingBronzo % 1000000;
      }
      
      // Oro (10.000 bronzo = 1 oro)
      if (remainingBronzo >= 10000) {
        newCurrency.oro = Math.floor(remainingBronzo / 10000);
        remainingBronzo = remainingBronzo % 10000;
      }
      
      // Argento (100 bronzo = 1 argento)
      if (remainingBronzo >= 100) {
        newCurrency.argento = Math.floor(remainingBronzo / 100);
        remainingBronzo = remainingBronzo % 100;
      }
      
      // Bronzo rimanente
      newCurrency.bronzo = remainingBronzo;

      const newInventory = [...(selectedCharacter.inventory || [])];
      const newEquipment = [...(selectedCharacter.equipment || [])];
      const newArrows = [...(selectedCharacter.arrows || [])];
      const newPotions = [...(selectedCharacter.potions || [])];

      cartItems.forEach(cartItem => {
        const itemType = cartItem.item.type;
        
        // Escludi i servizi
        if (itemType === 'servizio') {
          return;
        }
        
        if (itemType === 'arma' || itemType === 'armatura') {
          // Inserisci in inventario senza arricchire descrizione, con meta completo
          const existingItem = newInventory.find(item => item.name === cartItem.item.name);
          const dmgAny = cartItem.item.damage as any;
          const itemDataAny = (cartItem.item as any)?.item_data || {};
          const equipMetaAny = (itemDataAny as any)?.equipment_meta || {};
          const equipmentMeta = {
            type: itemType as 'arma' | 'armatura',
            subtype: cartItem.item.subtype || '',
            stats: cartItem.item.stats || {},
            weight: cartItem.item.weight || 1,
            description: cartItem.item.description || '',
            armor: cartItem.item.armor,
            damageVeloce: cartItem.item.damage_veloce ?? (dmgAny?.veloce),
            damagePesante: cartItem.item.damage_pesante ?? (dmgAny?.pesante),
            damageAffondo: cartItem.item.damage_affondo ?? (dmgAny?.affondo),
            damage: typeof cartItem.item.damage === 'number' ? cartItem.item.damage : undefined,
            statusAnomalies: Array.isArray((equipMetaAny as any)?.statusAnomalies) ? (equipMetaAny as any).statusAnomalies : [],
            unlockedPowers: (equipMetaAny as any)?.unlockedPowers,
            custom_specifics: Array.isArray((equipMetaAny as any)?.custom_specifics) ? (equipMetaAny as any).custom_specifics : [],
            data: itemType === 'arma' ? {
              material_id: (equipMetaAny as any)?.material_id ?? null,
              material_name: (equipMetaAny as any)?.material_name ?? null,
              weapon_type_id: (equipMetaAny as any)?.weapon_type_id ?? null,
              weapon_type_name: (equipMetaAny as any)?.weapon_type_name ?? null,
              weapon_type_category: (equipMetaAny as any)?.weapon_type_category ?? null,
              weapon_subtype_detail: (equipMetaAny as any)?.weapon_subtype_detail ?? null,
              damage_sets: Array.isArray((equipMetaAny as any)?.damage_sets) ? (equipMetaAny as any).damage_sets : [],
              alternate_damages: Array.isArray((equipMetaAny as any)?.alternate_damages) ? (equipMetaAny as any).alternate_damages : undefined,
              alternate_damage: (equipMetaAny as any)?.alternate_damage ?? undefined,
            } : undefined,
          };

          if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 0) + cartItem.quantity;
            // Non toccare la descrizione; se manca equipmentData, aggiungilo
            if (!existingItem.equipmentData) {
              existingItem.equipmentData = equipmentMeta;
            } else if (!(existingItem.equipmentData as any)?.unlockedPowers && (equipmentMeta as any)?.unlockedPowers) {
              (existingItem.equipmentData as any).unlockedPowers = (equipmentMeta as any).unlockedPowers;
            } else if ((!(existingItem.equipmentData as any)?.custom_specifics || (existingItem.equipmentData as any)?.custom_specifics?.length === 0) && (equipmentMeta as any)?.custom_specifics?.length > 0) {
              (existingItem.equipmentData as any).custom_specifics = (equipmentMeta as any).custom_specifics;
            }
          } else {
            newInventory.push({
              id: `${cartItem.item.id}_${Date.now()}`,
              name: cartItem.item.name,
              type: 'oggetto',
              description: cartItem.item.description || '',
              weight: cartItem.item.weight || 1,
              quantity: cartItem.quantity,
              equipmentData: equipmentMeta,
            });
          }
        } else if (itemType === 'freccia' || itemType === 'proiettile') {
          // Aggiungi alle frecce
          const existingArrow = newArrows.find(arrow => arrow.name === cartItem.item.name);
          if (existingArrow) {
            existingArrow.quantity += cartItem.quantity;
          } else {
            newArrows.push({
              id: `${cartItem.item.id}_${Date.now()}`,
              name: cartItem.item.name,
              damage: cartItem.item.damage || 0,
              quantity: cartItem.quantity,
              description: cartItem.item.description || ''
            });
          }
        } else if (itemType === 'pozione') {
          // Aggiungi alle pozioni
          const existingPotion = newPotions.find(potion => potion.name === cartItem.item.name);
          if (existingPotion) {
            existingPotion.quantity += cartItem.quantity;
          } else {
            newPotions.push({
              id: `${cartItem.item.id}_${Date.now()}`,
              name: cartItem.item.name,
              effect: cartItem.item.effect || '',
              quantity: cartItem.quantity,
              description: cartItem.item.description || ''
            });
          }
        } else {
          // Oggetti generici in inventario come oggetto, descrizione pulita
          const itemDataAny = (cartItem.item as any)?.item_data || {};
          const customSpecifics = Array.isArray((itemDataAny as any)?.custom_specifics) ? (itemDataAny as any).custom_specifics : [];
          const existingItem = newInventory.find(item => item.name === cartItem.item.name);
          if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 0) + cartItem.quantity;
            if ((existingItem as any).custom_specifics?.length === 0 && customSpecifics.length > 0) {
              (existingItem as any).custom_specifics = customSpecifics;
            }
          } else {
            newInventory.push({
              id: `${cartItem.item.id}_${Date.now()}`,
              name: cartItem.item.name,
              type: 'oggetto',
              description: cartItem.item.description || '',
              weight: cartItem.item.weight || 1,
              quantity: cartItem.quantity,
              custom_specifics: customSpecifics,
            });
          }
        }
      });

      // Aggiorna il personaggio
      const updatedCharacter = {
        ...selectedCharacter,
        id: selectedCharacter.id,
        currency: newCurrency,
        inventory: newInventory,
        equipment: newEquipment,
        arrows: newArrows,
        potions: newPotions
      };

      await updateCharacter(updatedCharacter);

      // Registra la cronologia degli acquisti
      const purchaseItems = cartItems.map(cartItem => ({
        id: cartItem.item.id,
        name: cartItem.item.name,
        type: cartItem.item.type,
        quantity: cartItem.quantity,
        price_bronzo: cartItem.item.price_bronzo || 0,
        price_argento: cartItem.item.price_argento || 0,
        price_oro: cartItem.item.price_oro || 0,
        price_rosse: cartItem.item.price_rosse || 0,
        price_bianche: cartItem.item.price_bianche || 0
      }));

      await fetch(`${apiBase()}/api/purchase_history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          character_id: selectedCharacter.id,
          items: purchaseItems,
          total_bronzo: Math.floor(totalCost % 100),
          total_argento: Math.floor((totalCost / 100) % 100),
          total_oro: Math.floor((totalCost / 10000) % 100),
          total_rosse: Math.floor((totalCost / 1000000) % 100),
          total_bianche: Math.floor(totalCost / 100000000)
        }),
      });
      toast({
        title: "Acquisto completato!",
        description: `Hai acquistato ${cartItems.length} oggetti per un totale di ${formatCurrency(totalCost)}`
      });

      // Svuota il carrello
      setCartItems([]);
      setShowCart(false);
      
    } catch (error) {
      console.error('Error during purchase:', error);
      toast({
        title: "Errore durante l'acquisto",
        description: "Si è verificato un errore durante l'elaborazione dell'acquisto",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      const bianche = Math.floor(amount / 100000);
      const remainder = amount % 100000;
      let result = `${bianche} Bianche`;
      if (remainder > 0) result += ` + ${formatCurrency(remainder)}`;
      return result;
    } else if (amount >= 10000) {
      const rosse = Math.floor(amount / 10000);
      const remainder = amount % 10000;
      let result = `${rosse} Rosse`;
      if (remainder > 0) result += ` + ${formatCurrency(remainder)}`;
      return result;
    } else if (amount >= 1000) {
      const oro = Math.floor(amount / 1000);
      const remainder = amount % 1000;
      let result = `${oro} Oro`;
      if (remainder > 0) result += ` + ${formatCurrency(remainder)}`;
      return result;
    } else if (amount >= 100) {
      const argento = Math.floor(amount / 100);
      const remainder = amount % 100;
      let result = `${argento} Argento`;
      if (remainder > 0) result += ` + ${remainder} Bronzo`;
      return result;
    } else {
      return `${amount} Bronzo`;
    }
  };

  const getCartQuantity = (itemId: string) => {
    const cartItem = cartItems.find(item => item.item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Negozio non trovato</div>
        </div>
      </div>
    );
  }

  // Filtro gli oggetti e servizi prima del render
  const objects = items.filter(item => item.type !== 'servizio');
  const services = items.filter(item => item.type === 'servizio');

  return (
    <div className="container mx-auto p-6">
      {/* Mobile Cart - Appears at top on mobile devices */}
      <div className={`lg:hidden mb-6 ${showCart ? 'block' : 'hidden'}`}>
        <ShoppingCartManager
          cartItems={cartItems}
          playerCurrency={selectedCharacter?.currency || { bronzo: 0, argento: 0, oro: 0, rosse: 0, bianche: 0 }}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onPurchase={handlePurchase}
          onClearCart={clearCart}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to={`/market/city/${cityId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna a {shop.city.name}
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">{shop.name}</h1>
                <p className="text-muted-foreground">{shop.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {cartItems.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCart(!showCart)}
                  className="lg:hidden"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Carrello ({cartItems.length})
                </Button>
              )}
              
              {isAdmin && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Oggetto
                </Button>
              )}
            </div>
          </div>

          {/* Character Selection */}
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seleziona Personaggio</CardTitle>
                <CardDescription>
                  Scegli il personaggio che effettuerà gli acquisti
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1">
                    <Select 
                      value={selectedCharacter?.id || ""} 
                      onValueChange={(value) => {
                        const character = characters.find(c => c.id === value);
                        if (character) {
                          setSelectedCharacter(character);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona un personaggio" />
                      </SelectTrigger>
                      <SelectContent>
                        {characters.map((character) => (
                          <SelectItem key={character.id} value={character.id}>
                            {character.name} - Livello {character.level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedCharacter && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {selectedCharacter.currency.bronzo} Bronzo
                      </Badge>
                      <Badge variant="outline">
                        {selectedCharacter.currency.argento} Argento
                      </Badge>
                      <Badge variant="outline">
                        {selectedCharacter.currency.oro} Oro
                      </Badge>
                      <Badge variant="outline">
                        {selectedCharacter.currency.rosse} Rosse
                      </Badge>
                      <Badge variant="outline">
                        {selectedCharacter.currency.bianche} Bianche
                      </Badge>
                    </div>
                  )}
                </div>
                
                {!selectedCharacter && (
                  <div className="mt-4 p-3 bg-secondary border border-border rounded-md">
                    <p className="text-sm text-secondary-foreground">
                      ⚠️ Devi selezionare un personaggio per poter effettuare acquisti
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items Grid */}
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun oggetto disponibile</h3>
              <p className="text-muted-foreground">
                {isAdmin 
                  ? "Aggiungi il primo oggetto a questo negozio" 
                  : "Non ci sono ancora oggetti in questo negozio"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Sezione Oggetti */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Oggetti</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {objects.map((item) => (
                    <MarketItemCard key={item.id} item={item} onAddToCart={addToCart} onItemDeleted={handleItemDeleted} onItemUpdated={handleItemUpdated} />
                  ))}
                </div>
              </div>
              
              {/* Sezione Servizi */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Servizi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((item) => (
                    <MarketItemCard key={item.id} item={item} onAddToCart={addToCart} onItemDeleted={handleItemDeleted} onItemUpdated={handleItemUpdated} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shopping Cart Sidebar - Desktop only */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <ShoppingCartManager
              cartItems={cartItems}
              playerCurrency={selectedCharacter?.currency || { bronzo: 0, argento: 0, oro: 0, rosse: 0, bianche: 0 }}
              onUpdateQuantity={updateCartQuantity}
              onRemoveItem={removeFromCart}
              onPurchase={handlePurchase}
              onClearCart={clearCart}
            />
          </div>
        </div>
      </div>

      {/* Create Item Modal */}
      {showCreateModal && (
        <CreateItemModal
          shopId={shopId!}
          onClose={() => setShowCreateModal(false)}
          onItemCreated={handleItemCreated}
        />
      )}
    </div>
  );
}
