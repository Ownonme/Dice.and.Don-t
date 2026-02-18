import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Edit } from 'lucide-react';
import { MarketItem } from '@/types/market';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EditItemModal from '@/components/market/EditItemModal';

interface MarketItemCardProps {
  item: MarketItem;
  quantity?: number;
  onAddToCart: (item: MarketItem) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  showQuantityControls?: boolean;
  onItemDeleted?: (itemId: string) => void;
  onItemUpdated?: (updated: MarketItem) => void;
}

const MarketItemCard: React.FC<MarketItemCardProps> = ({
  item,
  quantity = 0,
  onAddToCart,
  onUpdateQuantity,
  showQuantityControls = false,
  onItemDeleted,
  onItemUpdated
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'arma':
        return 'bg-red-100 text-red-800';
      case 'armatura':
        return 'bg-blue-100 text-blue-800';
      case 'pozione':
        return 'bg-green-100 text-green-800';
      case 'servizio':
        return 'bg-purple-100 text-purple-800';
      case 'proiettile':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'arma':
        return 'Arma';
      case 'armatura':
        return 'Armatura';
      case 'pozione':
        return 'Pozione';
      case 'servizio':
        return 'Servizio';
      case 'proiettile':
        return 'Proiettile';
      default:
        return 'Oggetto';
    }
  };

  const humanizeSubtype = (subtype?: string) => {
    if (!subtype) return '';
    const spaced = subtype.replace(/_/g, ' ');
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatPrice = (item: MarketItem) => {
    const prices = [];
    
    if (item.price_bianche > 0) prices.push(`${item.price_bianche} Bianche`);
    if (item.price_rosse > 0) prices.push(`${item.price_rosse} Rosse`);
    if (item.price_oro > 0) prices.push(`${item.price_oro} Oro`);
    if (item.price_argento > 0) prices.push(`${item.price_argento} Argento`);
    if (item.price_bronzo > 0) prices.push(`${item.price_bronzo} Bronzo`);
    
    return prices.length > 0 ? prices.join(' + ') : 'Gratuito';
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (onUpdateQuantity && newQuantity >= 0) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const formatStats = (stats: any): string => {
    if (!stats || typeof stats !== 'object') return '';
    
    return Object.entries(stats)
      .filter(([_, value]) => value && value !== 0)
      .map(([key, value]) => `${key}: +${value}`)
      .join(', ');
  };

  const formatDamage = (damage: any): string => {
    if (!damage || typeof damage !== 'object') return '';
    
    const damageTypes = [];
    if (damage.veloce) damageTypes.push(`Veloce: ${damage.veloce}`);
    if (damage.pesante) damageTypes.push(`Pesante: ${damage.pesante}`);
    if (damage.affondo) damageTypes.push(`Affondo: ${damage.affondo}`);
    
    return damageTypes.join(', ');
  };

  const reopenGuardUntil = useRef<number>(0);
  const handleOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      reopenGuardUntil.current = Date.now() + 300;
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('market_items')
        .delete()
        .eq('id', item.id);
      if (error) throw error;
      toast({ title: 'Oggetto eliminato', description: `${item.name} è stato rimosso` });
      setConfirmDeleteOpen(false);
      if (onItemDeleted) onItemDeleted(item.id);
    } catch (error) {
      toast({ title: 'Errore', description: "Impossibile eliminare l'oggetto", variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card
      className="h-full flex flex-col cursor-pointer relative group"
      onClick={() => {
        if (Date.now() < reopenGuardUntil.current) return;
        setDetailsOpen(true);
      }}
    >
      {isAdmin && (
        <div className="absolute top-2 right-2 opacity-100 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteOpen(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <CardContent className="p-4 flex-1">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 cursor-pointer hover:underline">{item.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getItemTypeColor(item.type)}>
                  {getItemTypeLabel(item.type)}
                </Badge>
                {item.subtype && (
                  <Badge variant="outline">
                    {humanizeSubtype(item.subtype)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground">
              {item.description}
            </p>
          )}

          {/* Dettagli specifici per tipo */}
          <div className="space-y-2 text-sm">
            {item.type === 'arma' && item.damage && formatDamage(item.damage) && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Danni:</span>
                <span>{formatDamage(item.damage)}</span>
              </div>
            )}
            
            {item.type === 'armatura' && item.armor && item.armor > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Armatura:</span>
                <span>+{item.armor}</span>
              </div>
            )}
            
            {item.type === 'pozione' && item.effect && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Effetto:</span>
                <span>{item.effect}</span>
              </div>
            )}
            
            {item.stats && formatStats(item.stats) && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Statistiche:</span>
                <span>{formatStats(item.stats)}</span>
              </div>
            )}

            {Array.isArray((item as any)?.item_data?.equipment_meta?.damage_sets) && ((item as any).item_data.equipment_meta.damage_sets.length > 0) && (
              <div className="space-y-1">
                <span className="font-medium">Effetti Danno:</span>
                <div className="space-y-1">
                  {((item as any).item_data.equipment_meta.damage_sets as any[]).map((ds, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      {ds?.effect_name ? (
                        <Badge variant="outline" className="text-xs">{ds.effect_name}</Badge>
                      ) : null}
                      {Number(ds?.damage_veloce) > 0 && (<span className="text-xs">Veloce: {Number(ds.damage_veloce)}</span>)}
                      {Number(ds?.damage_pesante) > 0 && (<span className="text-xs">Pesante: {Number(ds.damage_pesante)}</span>)}
                      {Number(ds?.damage_affondo) > 0 && (<span className="text-xs">Affondo: {Number(ds.damage_affondo)}</span>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray((item as any)?.item_data?.equipment_meta?.statusAnomalies) && ((item as any).item_data.equipment_meta.statusAnomalies.length > 0) && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Anomalie:</span>
                <div className="flex flex-wrap gap-1">
                  {((item as any).item_data.equipment_meta.statusAnomalies as any[]).map((a) => (
                    <Badge key={String(a?.id ?? a?.name)} variant="secondary" className="text-xs">{String(a?.name ?? '')}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {item.weight && item.weight > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Peso:</span>
                <span>{item.weight} kg</span>
              </div>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="text-lg font-bold text-primary mb-3">
              {formatPrice(item)}
            </div>
            
            {/* Controlli carrello */}
            {showQuantityControls && quantity > 0 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); handleQuantityChange(quantity - 1); }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-1 bg-muted rounded text-sm font-medium">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); handleQuantityChange(quantity + 1); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  size="sm"
                  className="flex-1 flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Aggiungi al Carrello
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <Dialog open={detailsOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>Dettagli completi dell'oggetto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={getItemTypeColor(item.type)}>{getItemTypeLabel(item.type)}</Badge>
              {item.subtype && (<Badge variant="outline">{humanizeSubtype(item.subtype)}</Badge>)}
            </div>
            {item.description && (<p className="text-muted-foreground">{item.description}</p>)}
            <div className="space-y-2">
              {item.stats && formatStats(item.stats) && (
                <div className="flex items-center gap-2"><span className="font-medium">Statistiche:</span><span>{formatStats(item.stats)}</span></div>
              )}
              {item.weight && item.weight > 0 && (
                <div className="flex items-center gap-2"><span className="font-medium">Peso:</span><span>{item.weight} kg</span></div>
              )}
              {item.type === 'armatura' && item.armor && item.armor > 0 && (
                <div className="flex items-center gap-2"><span className="font-medium">Armatura:</span><span>+{item.armor}</span></div>
              )}
              {item.type === 'arma' && (
                <div className="space-y-1">
                  {item.damage && formatDamage(item.damage) && (
                    <div className="flex items-center gap-2"><span className="font-medium">Danni:</span><span>{formatDamage(item.damage)}</span></div>
                  )}
                  {Array.isArray((item as any)?.item_data?.equipment_meta?.damage_sets) && ((item as any).item_data.equipment_meta.damage_sets.length > 0) && (
                    <div className="space-y-1">
                      <span className="font-medium">Set Danni:</span>
                      <div className="space-y-1">
                        {((item as any).item_data.equipment_meta.damage_sets as any[]).map((ds, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-2">
                            {ds?.effect_name ? (<Badge variant="outline" className="text-xs">{ds.effect_name}</Badge>) : null}
                            {Number(ds?.damage_veloce) > 0 && (<span className="text-xs">Veloce: {Number(ds.damage_veloce)}</span>)}
                            {Number(ds?.damage_pesante) > 0 && (<span className="text-xs">Pesante: {Number(ds.damage_pesante)}</span>)}
                            {Number(ds?.damage_affondo) > 0 && (<span className="text-xs">Affondo: {Number(ds.damage_affondo)}</span>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {Array.isArray((item as any)?.item_data?.equipment_meta?.statusAnomalies) && ((item as any).item_data.equipment_meta.statusAnomalies.length > 0) && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Anomalie:</span>
                  <div className="flex flex-wrap gap-1">
                    {((item as any).item_data.equipment_meta.statusAnomalies as any[]).map((a) => (
                      <Badge key={String(a?.id ?? a?.name)} variant="secondary" className="text-xs">{String(a?.name ?? '')}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          <div className="border-t pt-2">
            <div className="font-medium">Costo</div>
            <div>{formatPrice(item)}</div>
          </div>
          {isAdmin && (
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setEditOpen(true)} className="mr-2">
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </Button>
              <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Oggetto</DialogTitle>
            <DialogDescription>
              Confermi l'eliminazione di "{item.name}"? Questa azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {editOpen && (
        <EditItemModal
          item={item}
          onClose={() => setEditOpen(false)}
          onItemUpdated={(updated) => { if (onItemUpdated) onItemUpdated(updated); setEditOpen(false); }}
        />
      )}
    </Card>
  );
};

export default MarketItemCard;
