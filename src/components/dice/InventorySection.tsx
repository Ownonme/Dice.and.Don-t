import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2 } from 'lucide-react';
import { Character, InventoryItem, Arrow, Potion, Currency } from '@/types/character';

interface InventorySectionProps {
  inventory: any[];
  statusAnomalies: string[];
  onOpenInventoryModal: () => void;
  onOpenAnomalyModal: () => void;
  onRemoveAnomaly: (index: number) => void;
  selectedCharacter: Character | null;
}

const InventorySection: React.FC<InventorySectionProps> = ({
  selectedCharacter,
  onOpenInventoryModal
}) => {
  return (
    <div className="w-1/3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Usa Oggetto
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenInventoryModal}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Cerca Oggetto
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <p className="text-sidebar-muted">Implementazione ricerca oggetti in corso...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente separato per la visualizzazione dell'inventario
export const InventoryDisplay: React.FC<{ selectedCharacter: Character | null }> = ({ 
  selectedCharacter 
}) => {
  return (
    <div className="w-2/3">
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-40 overflow-y-auto">
            {selectedCharacter ? (
              <>
                {/* Valute */}
                {selectedCharacter.currency && (
                  <div className="border-b pb-2">
                    <h4 className="font-semibold text-sm mb-2">Valute</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCharacter.currency.bronzo > 0 && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          Bronzo: {selectedCharacter.currency.bronzo}
                        </Badge>
                      )}
                      {selectedCharacter.currency.argento > 0 && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          Argento: {selectedCharacter.currency.argento}
                        </Badge>
                      )}
                      {selectedCharacter.currency.oro > 0 && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Oro: {selectedCharacter.currency.oro}
                        </Badge>
                      )}
                      {selectedCharacter.currency.rosse > 0 && (
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          Rosse: {selectedCharacter.currency.rosse}
                        </Badge>
                      )}
                      {selectedCharacter.currency.bianche > 0 && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Bianche: {selectedCharacter.currency.bianche}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Oggetti Inventario */}
                {selectedCharacter.inventory && selectedCharacter.inventory.length > 0 && (
                  <div className="border-b pb-2">
                    <h4 className="font-semibold text-sm mb-2">Oggetti</h4>
                    <div className="space-y-1">
                      {selectedCharacter.inventory.map((item: InventoryItem) => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-sidebar-accent rounded">
                          <div className="flex-1">
                            <span className="font-medium text-sm text-sidebar-foreground">{item.name}</span>
                            {item.quantity > 1 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                x{item.quantity}
                              </Badge>
                            )}
                            {item.description && (
                              <p className="text-xs text-sidebar-muted mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-xs text-sidebar-muted">
                            {item.weight}kg
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Frecce */}
                {selectedCharacter.arrows && selectedCharacter.arrows.length > 0 && (
                  <div className="border-b pb-2">
                    <h4 className="font-semibold text-sm mb-2">Frecce</h4>
                    <div className="space-y-1">
                      {selectedCharacter.arrows.map((arrow: Arrow) => (
                        <div key={arrow.id} className="flex justify-between items-center p-2 bg-sidebar-accent rounded">
                          <div className="flex-1">
                            <span className="font-medium text-sm text-sidebar-foreground">{arrow.name}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              x{arrow.quantity}
                            </Badge>
                            <Badge variant="outline" className="ml-2 text-xs bg-red-100 text-red-800">
                              Danno: {typeof arrow.damage === 'object' ? 
                                (arrow.damage?.veloce || arrow.damage?.pesante || arrow.damage?.affondo || 0) : 
                                (arrow.damage || 0)
                              }
                            </Badge>
                            {arrow.description && (
                              <p className="text-xs text-sidebar-muted mt-1">{arrow.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Pozioni */}
                {selectedCharacter.potions && selectedCharacter.potions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Pozioni</h4>
                    <div className="space-y-1">
                      {selectedCharacter.potions.map((potion: Potion) => (
                        <div key={potion.id} className="flex justify-between items-center p-2 bg-sidebar-accent rounded">
                          <div className="flex-1">
                            <span className="font-medium text-sm text-sidebar-foreground">{potion.name}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              x{potion.quantity}
                            </Badge>
                            {potion.effect && (
                              <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-800">
                                {potion.effect}
                              </Badge>
                            )}
                            {potion.description && (
                              <p className="text-xs text-sidebar-muted mt-1">{potion.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Messaggio se inventario vuoto */}
                {(!selectedCharacter.inventory || selectedCharacter.inventory.length === 0) &&
                 (!selectedCharacter.arrows || selectedCharacter.arrows.length === 0) &&
                 (!selectedCharacter.potions || selectedCharacter.potions.length === 0) &&
                 (!selectedCharacter.currency || 
                  (selectedCharacter.currency.bronzo === 0 && 
                   selectedCharacter.currency.argento === 0 && 
                   selectedCharacter.currency.oro === 0 && 
                   selectedCharacter.currency.rosse === 0 && 
                   selectedCharacter.currency.bianche === 0)) && (
                  <p className="text-sidebar-muted text-center py-4">Inventario vuoto</p>
                )}
              </>
            ) : (
              <p className="text-sidebar-muted text-center py-4">Seleziona un personaggio per visualizzare l'inventario</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventorySection;
