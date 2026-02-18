import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Sword, Package, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EquipmentItem, InventoryItem, StatusAnomaly } from '@/types/character';
import EquipmentModal from './modals/EquipmentModal';
import InventoryModal from './modals/InventoryModal';
import EquipmentDetailsDialog from './modals/EquipmentDetailsDialog';

interface CharacterInventoryProps {
  equipment: EquipmentItem[];
  inventory: InventoryItem[];
  onAddEquipment: (item: EquipmentItem) => void;
  onUpdateEquipment: (item: EquipmentItem) => void;
  onRemoveEquipment: (id: string) => void;
  onAddInventory: (item: InventoryItem) => void;
  onUpdateInventory: (item: InventoryItem) => void;
  onRemoveInventory: (id: string) => void;
  canEquipItem?: (item: EquipmentItem) => boolean;
  onAddAnomaly: (anomaly: StatusAnomaly) => void;
  onRemoveAnomaly: (id: string) => void;
}

const CharacterInventory = ({ equipment, inventory, onAddEquipment, onUpdateEquipment, onRemoveEquipment, onAddInventory, onUpdateInventory, onRemoveInventory, canEquipItem, onAddAnomaly, onRemoveAnomaly }: CharacterInventoryProps) => {
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [equipSourceInventory, setEquipSourceInventory] = useState<InventoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<EquipmentItem | Partial<EquipmentItem> | InventoryItem | null>(null);

  const equipmentDetailsToText = (eq: EquipmentItem) => {
    const parts: string[] = [];
    if (eq.type === 'armatura' && eq.armor) parts.push(`Armatura: +${eq.armor}`);
    if (eq.type === 'arma') {
      if (Array.isArray(eq.data?.damage_sets) && (eq.data?.damage_sets?.length || 0) > 0) {
        eq.data!.damage_sets!.forEach(set => {
          const segs: string[] = [];
          if (set.damage_veloce) segs.push(`V:${set.damage_veloce} (Ass.: ${set.calculated_damage_veloce ?? Math.floor(set.damage_veloce * 0.33)})`);
          if (set.damage_pesante) segs.push(`P:${set.damage_pesante} (Ass.: ${set.calculated_damage_pesante ?? Math.floor(set.damage_pesante * 0.33)})`);
          if (set.damage_affondo) segs.push(`A:${set.damage_affondo} (Ass.: ${set.calculated_damage_affondo ?? Math.floor(set.damage_affondo * 0.33)})`);
          parts.push(`${set.effect_name}: ${segs.join(' · ')}`);
        });
      } else {
        if (eq.damageVeloce) parts.push(`D.Veloce: ${eq.damageVeloce} (Ass.: ${eq.calculatedDamageVeloce || Math.floor((eq.damageVeloce || 0) * 0.33)})`);
        if (eq.damagePesante) parts.push(`D.Pesante: ${eq.damagePesante} (Ass.: ${eq.calculatedDamagePesante || Math.floor((eq.damagePesante || 0) * 0.33)})`);
        if (eq.damageAffondo) parts.push(`D.Affondo: ${eq.damageAffondo} (Ass.: ${eq.calculatedDamageAffondo || Math.floor((eq.damageAffondo || 0) * 0.33)})`);
      }
    }
    const stats = Object.entries(eq.stats || {})
      .filter(([, v]) => (v || 0) !== 0)
      .map(([k, v]) => `${k}: ${(v as number) > 0 ? '+' : ''}${v}`);
    if (stats.length) parts.push(`Stats: ${stats.join(', ')}`);
    return parts.join(' | ');
  };

  // Nuovo: conversione dall’inventario a draft equip (per precompilare la modal)
  const convertInventoryToEquipmentDraft = (inv: InventoryItem): EquipmentItem => {
    const fromMeta = (inv as any).equipmentData;
    if (fromMeta) {
      return {
        id: inv.id,
        name: (fromMeta.name as string) || inv.name,
        type: (fromMeta.type as 'armatura' | 'arma') || 'armatura',
        subtype: fromMeta.subtype || '',
        description: (fromMeta.description as string) ?? inv.description ?? '',
        weight: (fromMeta.weight as number) ?? inv.weight ?? 0,
        stats: fromMeta.stats || {
          forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0
        },
        unlockedPowers: (fromMeta as any).unlockedPowers,
        data: (fromMeta as any).data,
        ...(fromMeta.type === 'armatura'
          ? { armor: (fromMeta.armor as number) || 0 }
          : {
              damageVeloce: (fromMeta.damageVeloce as number) || 0,
              damagePesante: (fromMeta.damagePesante as number) || 0,
              damageAffondo: (fromMeta.damageAffondo as number) || 0,
              calculatedDamageVeloce: (fromMeta.calculatedDamageVeloce as number) ?? Math.floor(((fromMeta.damageVeloce as number) || 0) * 0.33),
              calculatedDamagePesante: (fromMeta.calculatedDamagePesante as number) ?? Math.floor(((fromMeta.damagePesante as number) || 0) * 0.33),
              calculatedDamageAffondo: (fromMeta.calculatedDamageAffondo as number) ?? Math.floor(((fromMeta.damageAffondo as number) || 0) * 0.33),
            })
      };
    }

    // Fallback senza metadata
    const anyInv = inv as any;
    const hasWeaponDamage = (anyInv.damageVeloce ?? 0) || (anyInv.damagePesante ?? 0) || (anyInv.damageAffondo ?? 0) || (anyInv.damage ?? 0);
    const hasArmor = (anyInv.armor ?? 0) > 0;
    const type: 'armatura' | 'arma' = hasWeaponDamage && !hasArmor ? 'arma' : 'armatura';

    const subtype = (anyInv.subtype as string) || '';
    const stats = (anyInv.stats as Partial<any>) || {
      forza: 0,
      percezione: 0,
      resistenza: 0,
      intelletto: 0,
      agilita: 0,
      sapienza: 0,
      anima: 0
    };

    const draft: EquipmentItem = {
      id: inv.id,
      name: inv.name,
      type,
      subtype,
      description: inv.description || '',
      weight: inv.weight || 0,
      stats,
      ...(type === 'armatura'
        ? { armor: (anyInv.armor ?? 0) || 0 }
        : {
            damageVeloce: (anyInv.damageVeloce ?? 0) || 0,
            damagePesante: (anyInv.damagePesante ?? 0) || 0,
            damageAffondo: (anyInv.damageAffondo ?? 0) || 0,
            calculatedDamageVeloce: Math.floor(((anyInv.damageVeloce ?? 0) || 0) * 0.33),
            calculatedDamagePesante: Math.floor(((anyInv.damagePesante ?? 0) || 0) * 0.33),
            calculatedDamageAffondo: Math.floor(((anyInv.damageAffondo ?? 0) || 0) * 0.33),
          })
    };

    return draft;
  };

  const convertEquipmentToInventory = (eq: EquipmentItem): InventoryItem => {
    return {
      id: eq.id,
      name: eq.name,
      type: 'oggetto',
      weight: eq.weight,
      // Descrizione ora senza dettagli aggiuntivi
      description: eq.description || '',
      quantity: 1,
      equipmentData: {
        id: eq.id,
        name: eq.name,
        type: eq.type,
        subtype: eq.subtype,
        description: eq.description,
        weight: eq.weight,
        stats: eq.stats,
        armor: eq.armor,
        damageVeloce: eq.damageVeloce,
        damagePesante: eq.damagePesante,
        damageAffondo: eq.damageAffondo,
        calculatedDamageVeloce: eq.calculatedDamageVeloce,
        calculatedDamagePesante: eq.calculatedDamagePesante,
        calculatedDamageAffondo: eq.calculatedDamageAffondo,
        statusAnomalies: eq.statusAnomalies,
        unlockedPowers: (eq as any).unlockedPowers,
        data: eq.data,
      }
    };
  };

  const startEquipFromInventory = (invItem: InventoryItem) => {
    const hasMeta = (invItem as any).equipmentData;
    const draft: EquipmentItem = hasMeta
      ? {
          ...(invItem.equipmentData as EquipmentItem),
          id: crypto.randomUUID(),
          name: invItem.name,
          description: invItem.description || '',
          weight: invItem.weight || 0
        }
      : {
          id: crypto.randomUUID(),
          name: invItem.name,
          description: invItem.description || '',
          weight: invItem.weight || 0,
          type: 'armatura',
          subtype: '',
          stats: { forza: 0, percezione: 0, resistenza: 0, intelletto: 0, agilita: 0, sapienza: 0, anima: 0 },
          armor: 0
        };

    setEditingEquipment(draft);
    setEquipSourceInventory(invItem);
    setEquipmentModalOpen(true);
  };

  const handleMoveEquipmentToInventory = (eq: EquipmentItem) => {
    if (eq.statusAnomalies && eq.statusAnomalies.length > 0) {
      eq.statusAnomalies
        .filter(a => a.sourceType === 'equipment')
        .forEach(a => onRemoveAnomaly(a.id));
    }
    const inv = convertEquipmentToInventory(eq);
    onAddInventory(inv);
    onRemoveEquipment(eq.id);
  };

  // Gestione equipaggiamento
  const handleSaveEquipment = (item: EquipmentItem) => {
    // Se l'equip proviene dall'inventario, trattalo come nuova aggiunta
    if (equipSourceInventory) {
      onAddEquipment(item);
      onRemoveInventory(equipSourceInventory.id);
      setEquipSourceInventory(null);
      if (item.statusAnomalies && item.statusAnomalies.length > 0) {
        item.statusAnomalies.forEach(a => {
          onAddAnomaly({ ...a, sourceType: 'equipment', sourceId: item.id });
        });
      }
    } else if (editingEquipment) {
      if (editingEquipment.statusAnomalies && editingEquipment.statusAnomalies.length > 0) {
        editingEquipment.statusAnomalies
          .filter(a => a.sourceType === 'equipment')
          .forEach(a => onRemoveAnomaly(a.id));
      }
      onUpdateEquipment(item);
      if (item.statusAnomalies && item.statusAnomalies.length > 0) {
        item.statusAnomalies.forEach(a => {
          onAddAnomaly({ ...a, sourceType: 'equipment', sourceId: item.id });
        });
      }
    } else {
      onAddEquipment(item);
      if (item.statusAnomalies && item.statusAnomalies.length > 0) {
        item.statusAnomalies.forEach(a => {
          onAddAnomaly({ ...a, sourceType: 'equipment', sourceId: item.id });
        });
      }
    }
    setEditingEquipment(null);
  };

  const handleEditEquipment = (item: EquipmentItem) => {
    setEditingEquipment(item);
    setEquipmentModalOpen(true);
  };

  const handleDeleteEquipment = (id: string) => {
    const eq = equipment.find(e => e.id === id);
    if (eq?.statusAnomalies && eq.statusAnomalies.length > 0) {
      eq.statusAnomalies
        .filter(a => a.sourceType === 'equipment')
        .forEach(a => onRemoveAnomaly(a.id));
    }
    onRemoveEquipment(id);
  };

  // Gestione inventario
  const handleSaveInventory = (item: InventoryItem) => {
    if (editingInventory) {
      onUpdateInventory(item);
    } else {
      onAddInventory(item);
    }
    setEditingInventory(null);
  };

  const handleEditInventory = (item: InventoryItem) => {
    setEditingInventory(item);
    setInventoryModalOpen(true);
  };

  const handleDeleteInventory = (id: string) => {
    onRemoveInventory(id);
  };

  const openDetails = (it: EquipmentItem | InventoryItem) => {
    setDetailsItem(it);
    setDetailsOpen(true);
  };

  // Raggruppa equipaggiamento per tipo
  const groupedEquipment = equipment.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, EquipmentItem[]>);

  const getSubtypeLabel = (subtype: string) => {
    return subtype.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="equipment" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="equipment">Equipaggiamento</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
          </TabsList>

          {/* Equipaggiamento */}
          <TabsContent value="equipment" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Oggetti Equipaggiati</h3>
              <Button 
                onClick={() => {
                  setEditingEquipment(null);
                  setEquipmentModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Equipaggiamento
              </Button>
            </div>

            {/* Armature */}
            {groupedEquipment.armatura && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">ARMATURE</h4>
                <div className="space-y-2">
                  {groupedEquipment.armatura.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold">{item.name}</h5>
                          <Badge variant="outline">{getSubtypeLabel(item.subtype)}</Badge>
                          {item.armor && <Badge variant="secondary">Armatura: +{item.armor}</Badge>}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Peso: {item.weight}</span>
                          {Object.entries(item.stats || {}).filter(([_, value]) => value !== 0).map(([stat, value]) => (
                            <span key={stat} className="text-xs text-muted-foreground">
                              {stat}: {value > 0 ? '+' : ''}{value}
                            </span>
                          ))}
                        </div>
                        {item.statusAnomalies && item.statusAnomalies.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Anomalie: {item.statusAnomalies.map(a => a.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditEquipment(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Sposta nell'Inventario"
                          onClick={() => handleMoveEquipmentToInventory(item)}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openDetails(item)}
                          title="Dettagli"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteEquipment(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Armi */}
            {groupedEquipment.arma && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">ARMI</h4>
                <div className="space-y-2">
                  {groupedEquipment.arma.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold">{item.name}</h5>
                          <Badge variant="outline">{getSubtypeLabel(item.subtype)}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        {item.type === 'arma' && (
                          <div className="mt-1 space-y-1">
                            <div className="flex flex-wrap gap-2">
                              {item.data?.weapon_type_name && <Badge variant="outline">{item.data.weapon_type_name}</Badge>}
                              {item.data?.material_name && <Badge variant="secondary">{item.data.material_name}</Badge>}
                            </div>

                            {Array.isArray(item.data?.damage_sets) && (item.data?.damage_sets?.length || 0) > 0 ? (
                              <div className="space-y-1">
                                {item.data!.damage_sets!.map((set, i) => (
                                  <div key={i} className="space-y-0.5">
                                    <div className="text-sm">
                                      <span className="font-medium">Tipo di danno:</span> {set.effect_name}
                                    </div>
                                    {set.damage_veloce ? (
                                      <div className="text-sm">
                                        <span className="font-medium">Danno veloce:</span> {set.damage_veloce} (Assicurato: {set.calculated_damage_veloce ?? Math.floor(set.damage_veloce * 0.33)})
                                      </div>
                                    ) : null}
                                    {set.damage_pesante ? (
                                      <div className="text-sm">
                                        <span className="font-medium">Danno pesante:</span> {set.damage_pesante} (Assicurato: {set.calculated_damage_pesante ?? Math.floor(set.damage_pesante * 0.33)})
                                      </div>
                                    ) : null}
                                    {set.damage_affondo ? (
                                      <div className="text-sm">
                                        <span className="font-medium">Danno affondo:</span> {set.damage_affondo} (Assicurato: {set.calculated_damage_affondo ?? Math.floor(set.damage_affondo * 0.33)})
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {item.damageVeloce > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Danno veloce:</span> {item.damageVeloce} (Assicurato: {item.calculatedDamageVeloce ?? Math.floor(item.damageVeloce * 0.33)})
                                  </div>
                                )}
                                {item.damagePesante > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Danno pesante:</span> {item.damagePesante} (Assicurato: {item.calculatedDamagePesante ?? Math.floor(item.damagePesante * 0.33)})
                                  </div>
                                )}
                                {item.damageAffondo > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Danno affondo:</span> {item.damageAffondo} (Assicurato: {item.calculatedDamageAffondo ?? Math.floor(item.damageAffondo * 0.33)})
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Peso: {item.weight}</span>
                          {Object.entries(item.stats || {}).filter(([_, value]) => value !== 0).map(([stat, value]) => (
                            <span key={stat} className="text-xs text-muted-foreground">
                              {stat}: {value > 0 ? '+' : ''}{value}
                            </span>
                          ))}
                        </div>
                        {item.statusAnomalies && item.statusAnomalies.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Anomalie: {item.statusAnomalies.map(a => a.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditEquipment(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleMoveEquipmentToInventory(item)}
                          title="Sposta nell'Inventario"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openDetails(item)}
                          title="Dettagli"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteEquipment(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {equipment.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessun oggetto equipaggiato</p>
                <p className="text-sm">Clicca "Aggiungi Equipaggiamento" per iniziare</p>
              </div>
            )}
          </TabsContent>

          {/* Inventario */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Oggetti Inventario</h3>
              <Button 
                onClick={() => {
                  setEditingInventory(null);
                  setInventoryModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Oggetto
              </Button>
            </div>

            <div className="space-y-2">
              {inventory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold">{item.name || 'Oggetto senza nome'}</h5>
                      <Badge variant="outline">Oggetto</Badge>
                      <Badge variant="secondary">Qty: {item.quantity}</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.equipmentData && (
                      <div className="mt-1 space-y-1">
                        <div className="flex flex-wrap gap-2">
                          {item.equipmentData.subtype && <Badge variant="outline">{getSubtypeLabel(item.equipmentData.subtype as string)}</Badge>}
                          {(item.equipmentData as any).data?.weapon_type_name && <Badge variant="outline">{(item.equipmentData as any).data.weapon_type_name}</Badge>}
                          {(item.equipmentData as any).data?.material_name && <Badge variant="secondary">{(item.equipmentData as any).data.material_name}</Badge>}
                        </div>
                        {(item.equipmentData as any).type === 'arma' && (
                          <>
                            {Array.isArray((item.equipmentData as any).data?.damage_sets) && (((item.equipmentData as any).data?.damage_sets?.length) || 0) > 0 ? (
                              <div className="space-y-1">
                                {(item.equipmentData as any).data.damage_sets.map((set: any, i: number) => (
                                  <div key={i} className="space-y-0.5">
                                    <div className="text-sm">
                                      <span className="font-medium">Tipo di danno:</span> {set.effect_name}
                                    </div>
                                    {set.damage_veloce ? (
                                      <div className="text-sm">
                                        <span className="font-medium">Danno veloce:</span> {set.damage_veloce} (Assicurato: {set.calculated_damage_veloce ?? Math.floor(set.damage_veloce * 0.33)})
                                      </div>
                                    ) : null}
                                    {set.damage_pesante ? (
                                      <div className="text-sm">
                                        <span className="font-medium">Danno pesante:</span> {set.damage_pesante} (Assicurato: {set.calculated_damage_pesante ?? Math.floor(set.damage_pesante * 0.33)})
                                      </div>
                                    ) : null}
                                    {set.damage_affondo ? (
                                      <div className="text-sm">
                                        <span className="font-medium">Danno affondo:</span> {set.damage_affondo} (Assicurato: {set.calculated_damage_affondo ?? Math.floor(set.damage_affondo * 0.33)})
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {(item.equipmentData.damageVeloce ?? 0) > 0 ? (
                                  <div className="text-sm">
                                    <span className="font-medium">Danno veloce:</span> {item.equipmentData.damageVeloce} (Assicurato: {item.equipmentData.calculatedDamageVeloce ?? Math.floor((item.equipmentData.damageVeloce || 0) * 0.33)})
                                  </div>
                                ) : null}
                                {(item.equipmentData.damagePesante ?? 0) > 0 ? (
                                  <div className="text-sm">
                                    <span className="font-medium">Danno pesante:</span> {item.equipmentData.damagePesante} (Assicurato: {item.equipmentData.calculatedDamagePesante ?? Math.floor((item.equipmentData.damagePesante || 0) * 0.33)})
                                  </div>
                                ) : null}
                                {(item.equipmentData.damageAffondo ?? 0) > 0 ? (
                                  <div className="text-sm">
                                    <span className="font-medium">Danno affondo:</span> {item.equipmentData.damageAffondo} (Assicurato: {item.equipmentData.calculatedDamageAffondo ?? Math.floor((item.equipmentData.damageAffondo || 0) * 0.33)})
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Peso: {item.weight} (Tot: {item.weight * item.quantity})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditInventory(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDetails(item)}
                      title="Dettagli"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => startEquipFromInventory(item)}
                      title="Equipaggia"
                    >
                      <Sword className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteInventory(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {inventory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessun oggetto nell'inventario</p>
                <p className="text-sm">Clicca "Aggiungi Oggetto" per iniziare</p>
              </div>
            )}
          </TabsContent>

          {/* Borselli - placeholder per ora */}
          <TabsContent value="bags" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Sezione Borselli</p>
              <p className="text-sm">Denari, Frecce e Pozioni verranno implementati qui</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modali */}
        <EquipmentModal
          isOpen={equipmentModalOpen}
          onClose={() => {
            setEquipmentModalOpen(false);
            setEditingEquipment(null);
            setEquipSourceInventory(null);
          }}
          onSave={handleSaveEquipment}
          editingItem={editingEquipment}
          canEquipItem={canEquipItem}
        />

        <InventoryModal
          isOpen={inventoryModalOpen}
          onClose={() => {
            setInventoryModalOpen(false);
            setEditingInventory(null);
          }}
          onSave={handleSaveInventory}
          editingItem={editingInventory}
        />
        <EquipmentDetailsDialog
          isOpen={detailsOpen}
          onClose={() => { setDetailsOpen(false); setDetailsItem(null); }}
          item={detailsItem}
        />
      </CardContent>
    </Card>
  );
};

export default CharacterInventory;
