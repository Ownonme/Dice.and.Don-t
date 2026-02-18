import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EquipmentItem, InventoryItem, WeaponDamageSet } from '@/types/character';
import { supabase } from '@/integrations/supabase/client';

interface EquipmentDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // Può arrivare direttamente un EquipmentItem (equipaggiato) oppure inventory.equipmentData
  item: EquipmentItem | Partial<EquipmentItem> | InventoryItem | null;
}

const humanizeSubtype = (subtype?: string) => {
  if (!subtype) return '';
  return subtype.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const EquipmentDetailsDialog = ({ isOpen, onClose, item }: EquipmentDetailsDialogProps) => {
  const meta: Partial<EquipmentItem> | null = useMemo(() => {
    if (!item) return null;
    // Se viene da inventario e contiene equipmentData, usa quello; altrimenti usa l'oggetto direttamente
    const inv = item as InventoryItem;
    if ((inv as any)?.equipmentData) return (inv as any).equipmentData as Partial<EquipmentItem>;
    return item as Partial<EquipmentItem>;
  }, [item]);

  const [materialDetails, setMaterialDetails] = useState<any | null>(null);
  const [damageEffectDetails, setDamageEffectDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadExtraDetails = async () => {
      if (!meta) return;
      // Materiale: recupera descrizione e bonus_effects se possibile
      const matName = (meta as any)?.data?.material_name as string | null;
      if (matName) {
        const { data: materials } = await supabase
          .from('materials')
          .select('id, name, description, ingot_weight, bonus_effects')
          .eq('name', matName);
        setMaterialDetails(materials && materials[0] ? materials[0] : null);
      } else {
        setMaterialDetails(null);
      }

      // Damage effects: recupera descrizione/bonus per ciascun effect_name se presenti
      const sets: WeaponDamageSet[] = (((meta as any)?.data?.damage_sets || []) as WeaponDamageSet[]);
      const names = Array.from(new Set((sets || []).map(s => s.effect_name).filter(Boolean)));
      if (names.length > 0) {
        const { data: effects } = await supabase
          .from('damage_effects')
          .select('id, name, description, bonus_effects, affects_action_points, affects_health, affects_armor, affects_classic_damage')
          .in('name', names);
        const dict: Record<string, any> = {};
        (effects || []).forEach((e: any) => { dict[e.name] = e; });
        setDamageEffectDetails(dict);
      } else {
        setDamageEffectDetails({});
      }
    };
    if (isOpen) loadExtraDetails();
  }, [isOpen, meta]);

  if (!meta) return null;

  const isWeapon = meta.type === 'arma';
  const isArmor = meta.type === 'armatura';

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{meta.name}</span>
            {meta.type && <Badge variant="outline">{meta.type.toUpperCase()}</Badge>}
            {meta.subtype && <Badge variant="secondary">{humanizeSubtype(meta.subtype)}</Badge>}
          </DialogTitle>
          {meta.description && (
            <DialogDescription>{meta.description}</DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4">
            {/* Materiale / Tipo arma */}
            {(meta as any)?.data && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(meta as any).data?.weapon_type_name && (
                    <Badge variant="outline">{(meta as any).data.weapon_type_name}</Badge>
                  )}
                  {(meta as any).data?.material_name && (
                    <Badge variant="secondary">{(meta as any).data.material_name}</Badge>
                  )}
                </div>
                {materialDetails && (
                  <div className="text-sm text-muted-foreground">
                    {materialDetails.description && (
                      <div>
                        <span className="font-medium">Materiale:</span> {materialDetails.description}
                      </div>
                    )}
                    {Array.isArray(materialDetails.bonus_effects) && materialDetails.bonus_effects.length > 0 && (
                      <div>
                        <span className="font-medium">Bonus materiale:</span> {materialDetails.bonus_effects.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Danni per arma */}
            {isWeapon && (
              <div className="space-y-2">
                <div className="font-medium">Danni</div>
                {Array.isArray((meta as any).data?.damage_sets) && (((meta as any).data?.damage_sets?.length) || 0) > 0 ? (
                  <div className="space-y-2">
                    {(meta as any).data.damage_sets.map((set: any, i: number) => {
                      const eff = damageEffectDetails[set.effect_name];
                      return (
                        <div key={i} className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">Tipo di danno:</span> {set.effect_name}
                          </div>
                          {eff?.description && (
                            <div className="text-sm text-muted-foreground">{eff.description}</div>
                          )}
                          {Array.isArray(eff?.bonus_effects) && eff.bonus_effects.length > 0 && (
                            <div className="text-sm text-muted-foreground">Bonus: {eff.bonus_effects.join(', ')}</div>
                          )}
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
                          <Separator className="my-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(meta.damageVeloce ?? 0) > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Danno veloce:</span> {meta.damageVeloce} (Assicurato: {meta.calculatedDamageVeloce ?? Math.floor((meta.damageVeloce || 0) * 0.33)})
                      </div>
                    )}
                    {(meta.damagePesante ?? 0) > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Danno pesante:</span> {meta.damagePesante} (Assicurato: {meta.calculatedDamagePesante ?? Math.floor((meta.damagePesante || 0) * 0.33)})
                      </div>
                    )}
                    {(meta.damageAffondo ?? 0) > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Danno affondo:</span> {meta.damageAffondo} (Assicurato: {meta.calculatedDamageAffondo ?? Math.floor((meta.damageAffondo || 0) * 0.33)})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Armatura */}
            {isArmor && typeof meta.armor === 'number' && (
              <div className="space-y-1">
                <div className="font-medium">Armatura</div>
                <div className="text-sm">Fornisce: +{meta.armor}</div>
              </div>
            )}

            {/* Stats */}
            {meta.stats && (
              <div className="space-y-1">
                <div className="font-medium">Statistiche</div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {Object.entries(meta.stats).filter(([_, v]) => (v || 0) !== 0).map(([k, v]) => (
                    <span key={k}>{k}: {(v as number) > 0 ? '+' : ''}{v}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalie */}
            {Array.isArray(meta.statusAnomalies) && meta.statusAnomalies.length > 0 && (
              <div className="space-y-1">
                <div className="font-medium">Anomalie</div>
                <div className="space-y-2 text-sm">
                  {meta.statusAnomalies.map(a => (
                    <div key={a.id} className="space-y-0.5">
                      <div>
                        <span className="font-medium">{a.name}</span>
                        {a.description && (
                          <span className="text-muted-foreground"> — {a.description}</span>
                        )}
                      </div>
                      {/* Modifiche alle statistiche */}
                      {a.statsModifier && (
                        <div className="text-muted-foreground">
                          {Object.entries(a.statsModifier)
                            .filter(([, v]) => (v || 0) !== 0)
                            .map(([k, v]) => `${k}: ${(v as number) > 0 ? '+' : ''}${v}`)
                            .join(', ') || null}
                        </div>
                      )}
                      {/* Modifica Punti Azione */}
                      {(a.actionPointsModifier || 0) !== 0 && (
                        <div className="text-muted-foreground">
                          Punti Azione: {(a.actionPointsModifier > 0 ? '+' : '') + a.actionPointsModifier}
                        </div>
                      )}
                      {/* Modifica Salute */}
                      {(a.healthModifier || 0) !== 0 && (
                        <div className="text-muted-foreground">
                          Salute: {(a.healthModifier > 0 ? '+' : '') + a.healthModifier}
                        </div>
                      )}
                      {(a.armorModifier || 0) !== 0 && (
                        <div className="text-muted-foreground">
                          Armatura: {((a.armorModifier || 0) > 0 ? '+' : '') + (a.armorModifier || 0)}
                        </div>
                      )}
                      {/* Durata in turni */}
                      {typeof a.turns === 'number' && (
                        <div className="text-muted-foreground">
                          Durata: {a.turns} turno{a.turns === 1 ? '' : 'i'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentDetailsDialog;
