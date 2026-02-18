import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { MarketItem } from '@/types/market';
import { Currency } from '@/types/character';

export interface CartItem {
  item: MarketItem;
  quantity: number;
}

interface ShoppingCartManagerProps {
  cartItems: CartItem[];
  playerCurrency: Currency;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPurchase: () => void;
  onClearCart: () => void;
}

const ShoppingCartManager: React.FC<ShoppingCartManagerProps> = ({
  cartItems,
  playerCurrency,
  onUpdateQuantity,
  onRemoveItem,
  onPurchase,
  onClearCart
}) => {
  const calculateTotal = () => {
    return cartItems.reduce((total, cartItem) => {
      const itemTotal = {
        bronzo: (cartItem.item.price_bronzo || 0) * cartItem.quantity,
        argento: (cartItem.item.price_argento || 0) * cartItem.quantity,
        oro: (cartItem.item.price_oro || 0) * cartItem.quantity,
        rosse: (cartItem.item.price_rosse || 0) * cartItem.quantity,
        bianche: (cartItem.item.price_bianche || 0) * cartItem.quantity
      };
      
      return {
        bronzo: total.bronzo + itemTotal.bronzo,
        argento: total.argento + itemTotal.argento,
        oro: total.oro + itemTotal.oro,
        rosse: total.rosse + itemTotal.rosse,
        bianche: total.bianche + itemTotal.bianche
      };
    }, { bronzo: 0, argento: 0, oro: 0, rosse: 0, bianche: 0 });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000000) {
      const bianche = Math.floor(amount / 100000000);
      const remainder = amount % 100000000;
      let result = `${bianche} Bianche`;
      if (remainder > 0) result += ` + ${formatCurrency(remainder)}`;
      return result;
    } else if (amount >= 1000000) {
      const rosse = Math.floor(amount / 1000000);
      const remainder = amount % 1000000;
      let result = `${rosse} Rosse`;
      if (remainder > 0) result += ` + ${formatCurrency(remainder)}`;
      return result;
    } else if (amount >= 10000) {
      const oro = Math.floor(amount / 10000);
      const remainder = amount % 10000;
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

  // Funzione per mostrare il prezzo di un singolo oggetto con tutte le valute
  const formatItemPrice = (item: MarketItem) => {
    const prices = [];
    if (item.price_bianche && item.price_bianche > 0) prices.push(`${item.price_bianche} Bianche`);
    if (item.price_rosse && item.price_rosse > 0) prices.push(`${item.price_rosse} Rosse`);
    if (item.price_oro && item.price_oro > 0) prices.push(`${item.price_oro} Oro`);
    if (item.price_argento && item.price_argento > 0) prices.push(`${item.price_argento} Argento`);
    if (item.price_bronzo && item.price_bronzo > 0) prices.push(`${item.price_bronzo} Bronzo`);

    return prices.length > 0 ? prices.join(' + ') : '0 Bronzo';
  };

  // Funzione per mostrare le valute del giocatore
  const formatPlayerCurrency = (currency: Currency) => {
    const currencies = [];
    if (currency.bianche > 0) currencies.push(`${currency.bianche} Bianche`);
    if (currency.rosse > 0) currencies.push(`${currency.rosse} Rosse`);
    if (currency.oro > 0) currencies.push(`${currency.oro} Oro`);
    if (currency.argento > 0) currencies.push(`${currency.argento} Argento`);
    if (currency.bronzo > 0) currencies.push(`${currency.bronzo} Bronzo`);

    return currencies.length > 0 ? currencies.join(', ') : '0 Bronzo';
  };

  const getTotalPlayerCurrency = () => {
    return playerCurrency.bronzo +
           (playerCurrency.argento * 100) +
           (playerCurrency.oro * 10000) +
           (playerCurrency.rosse * 1000000) +
           (playerCurrency.bianche * 100000000);
  };

  const canAfford = () => {
    const totalCost = calculateTotal();
    const costInBronzo = 
      totalCost.bronzo +
      totalCost.argento * 100 +
      totalCost.oro * 10000 +
      totalCost.rosse * 1000000 +
      totalCost.bianche * 100000000;
      
    return getTotalPlayerCurrency() >= costInBronzo;
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'weapon':
        return 'Arma';
      case 'armor':
        return 'Armatura';
      case 'potion':
        return 'Pozione';
      case 'service':
        return 'Servizio';
      default:
        return 'Oggetto';
    }
  };

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrello
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Il carrello è vuoto</p>
            <p className="text-sm">Aggiungi oggetti per iniziare</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrello ({cartItems.length})
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearCart}
          >
            Svuota
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista oggetti nel carrello */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {cartItems.map((cartItem) => (
            <div key={cartItem.item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold">{cartItem.item.name}</h5>
                  <Badge variant="outline">
                    {getItemTypeLabel(cartItem.item.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatItemPrice(cartItem.item)} × {cartItem.quantity}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-2 py-1 bg-muted rounded text-sm font-medium min-w-[2rem] text-center">
                  {cartItem.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveItem(cartItem.item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Riepilogo */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Totale:</span>
            <span className="font-bold text-lg">{formatTotalCurrency(calculateTotal())}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span>Denaro disponibile:</span>
            <div className={canAfford() ? 'text-green-600' : 'text-red-600'}>
              <div className="text-xs">{formatPlayerCurrency(playerCurrency)}</div>
            </div>
          </div>

          <Button
            onClick={onPurchase}
            disabled={!canAfford() || cartItems.length === 0}
            className="w-full"
            size="lg"
          >
            {canAfford() ? 'Acquista' : 'Fondi Insufficienti'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShoppingCartManager;

  // Funzione per formattare il totale del carrello con conversioni automatiche
  const formatTotalCurrency = (total: {bronzo: number, argento: number, oro: number, rosse: number, bianche: number}) => {
    // Converti tutto in bronzo prima
    let totalBronzo = total.bronzo + 
                     (total.argento * 100) + 
                     (total.oro * 10000) + 
                     (total.rosse * 1000000) + 
                     (total.bianche * 100000000);
    
    // Ora converti di nuovo nelle valute appropriate
    const currencies = [];
    
    // Bianche (100.000.000 bronzo = 1 bianche)
    if (totalBronzo >= 100000000) {
      const bianche = Math.floor(totalBronzo / 100000000);
      currencies.push(`${bianche} Bianche`);
      totalBronzo = totalBronzo % 100000000;
    }
    
    // Rosse (1.000.000 bronzo = 1 rosse)
    if (totalBronzo >= 1000000) {
      const rosse = Math.floor(totalBronzo / 1000000);
      currencies.push(`${rosse} Rosse`);
      totalBronzo = totalBronzo % 1000000;
    }
    
    // Oro (10.000 bronzo = 1 oro)
    if (totalBronzo >= 10000) {
      const oro = Math.floor(totalBronzo / 10000);
      currencies.push(`${oro} Oro`);
      totalBronzo = totalBronzo % 10000;
    }
    
    // Argento (100 bronzo = 1 argento)
    if (totalBronzo >= 100) {
      const argento = Math.floor(totalBronzo / 100);
      currencies.push(`${argento} Argento`);
      totalBronzo = totalBronzo % 100;
    }
    
    // Bronzo rimanente
    if (totalBronzo > 0) {
      currencies.push(`${totalBronzo} Bronzo`);
    }
    
    return currencies.length > 0 ? currencies.join(' + ') : '0 Bronzo';
  };