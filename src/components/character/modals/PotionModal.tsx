import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';
import { listAnomalies, getAnomalyById } from '@/integrations/supabase/anomalies';
import { Potion, StatusAnomaly } from '@/types/character';

interface PotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (potion: Potion) => void;
  editingPotion?: Potion | null;
}

const PotionModal = ({ isOpen, onClose, onSave, editingPotion }: PotionModalProps) => {
  const [formData, setFormData] = useState<Partial<Potion>>({
    name: '',
    description: '',
    effect: '',
    quantity: 1,
    isRestore: false,
    hasAnomaly: false
  });
  const [damageEffectOptions, setDamageEffectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDamageSets, setSelectedDamageSets] = useState<Array<{ damageEffectId: string; effect_name: string; guaranteedDamage: number; additionalDamage: number }>>([]);
  const [anomalyOptions, setAnomalyOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [potionAnomaly, setPotionAnomaly] = useState<StatusAnomaly | null>(null);
  const [importedAnomalyId, setImportedAnomalyId] = useState<string | null>(null);

  useEffect(() => {
    if (editingPotion) {
      setFormData({
        name: editingPotion.name || '',
        description: editingPotion.description || '',
        effect: editingPotion.effect || '',
        quantity: editingPotion.quantity || 1,
        isRestore: !!editingPotion.isRestore,
        hasAnomaly: !!editingPotion.hasAnomaly || !!editingPotion.anomaly
      });
      const ds = Array.isArray((editingPotion as any)?.damageSets)
        ? ((editingPotion as any).damageSets as any[]).map((d: any) => ({
            damageEffectId: String((d?.damageEffectId ?? d?.damage_effect_id ?? d?.effect_id ?? '') || ''),
            effect_name: String((d?.effect_name ?? d?.name ?? '') || ''),
            guaranteedDamage: Number(d?.guaranteedDamage ?? d?.guaranteed_damage ?? 0) || 0,
            additionalDamage: Number(d?.additionalDamage ?? d?.additional_damage ?? 0) || 0,
          }))
        : [];
      setSelectedDamageSets(ds);
      const anom = (editingPotion as any)?.anomaly || null;
      setPotionAnomaly(anom || null);
      const aid = String((editingPotion as any)?.anomalyId || '').trim();
      setImportedAnomalyId(aid || null);
    } else {
      setFormData({
        name: '',
        description: '',
        effect: '',
        quantity: 1,
        isRestore: false,
        hasAnomaly: false
      });
      setSelectedDamageSets([]);
      setPotionAnomaly(null);
      setImportedAnomalyId(null);
    }
  }, [editingPotion]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const dmg = await listDamageEffects();
        const dmgOpts = (Array.isArray(dmg) ? dmg : []).map((d: any) => ({ id: String(d.id), name: d.name }));
        setDamageEffectOptions(dmgOpts);
      } catch {
        setDamageEffectOptions([]);
      }
      try {
        const anoms = await listAnomalies();
        const anOpts = (Array.isArray(anoms) ? anoms : []).map((a: any) => ({ id: String(a.id), name: a.name }));
        setAnomalyOptions(anOpts);
      } catch {
        setAnomalyOptions([]);
      }
    };
    if (isOpen) loadOptions();
  }, [isOpen]);

  const handleSave = () => {
    const potion: Potion = {
      id: editingPotion?.id || crypto.randomUUID(),
      name: formData.name || '',
      description: formData.description || '',
      effect: formData.effect || '',
      quantity: formData.quantity || 1,
      isRestore: !!formData.isRestore,
      damageSets: selectedDamageSets.map((d) => ({
        damageEffectId: d.damageEffectId,
        effect_name: d.effect_name,
        guaranteedDamage: Number(d.guaranteedDamage) || 0,
        additionalDamage: Number(d.additionalDamage) || 0,
      })),
      hasAnomaly: !!formData.hasAnomaly,
      anomaly: formData.hasAnomaly ? (potionAnomaly || null) : null,
      anomalyId: formData.hasAnomaly ? (importedAnomalyId || null) : null,
    };

    onSave(potion);
    onClose();
    setFormData({
      name: '',
      description: '',
      effect: '',
      quantity: 1,
      isRestore: false,
      hasAnomaly: false
    });
    setSelectedDamageSets([]);
    setPotionAnomaly(null);
    setImportedAnomalyId(null);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPotion ? 'Modifica Pozione' : 'Aggiungi Pozione'}
          </DialogTitle>
          <DialogDescription>
            {editingPotion ? 'Modifica le proprietà della pozione selezionata.' : 'Crea una nuova pozione per il tuo inventario.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome pozione"
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

          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrizione pozione"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Ripristina?</Label>
            </div>
            <Switch checked={!!formData.isRestore} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRestore: checked }))} />
          </div>

          {formData.isRestore && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aggiungi effetto danno</Label>
              </div>
              <Select
                value={''}
                onValueChange={(value) => {
                  const opt = damageEffectOptions.find(o => o.id === value);
                  const exists = selectedDamageSets.some(d => d.damageEffectId === value);
                  if (!exists && opt) {
                    setSelectedDamageSets(prev => ([...prev, { damageEffectId: opt.id, effect_name: opt.name, guaranteedDamage: 0, additionalDamage: 0 }]));
                  }
                  
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aggiungi effetto danno" />
                </SelectTrigger>
                <SelectContent>
                  {damageEffectOptions.map(opt => (
                    <SelectItem key={`dmgsel:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDamageSets.length > 0 && (
                <div className="space-y-2">
                  {selectedDamageSets.map((d) => (
                    <div key={`set:${d.damageEffectId}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <div className="text-sm font-medium">{d.effect_name}</div>
                      </div>
                      <div>
                        <Label className="text-xs">Assicurato</Label>
                        <Input
                          type="number"
                          min="0"
                          value={d.guaranteedDamage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSelectedDamageSets(prev => prev.map(x => x.damageEffectId === d.damageEffectId ? { ...x, guaranteedDamage: val } : x));
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Aggiuntivo</Label>
                        <Input
                          type="number"
                          min="0"
                          value={d.additionalDamage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSelectedDamageSets(prev => prev.map(x => x.damageEffectId === d.damageEffectId ? { ...x, additionalDamage: val } : x));
                          }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setSelectedDamageSets(prev => prev.filter(x => x.damageEffectId !== d.damageEffectId))}>Rimuovi</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Anomalia?</Label>
              <Switch
                checked={!!formData.hasAnomaly}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({ ...prev, hasAnomaly: checked }));
                  if (!checked) {
                    setPotionAnomaly(null);
                    setImportedAnomalyId(null);
                  }
                }}
              />
            </div>

            {formData.hasAnomaly && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setAnomalyModalOpen(true)}>Crea Anomalia</Button>
                  <div className="flex-1">
                    <Label>Importa anomalia</Label>
                    <Select
                      value={importedAnomalyId ?? ''}
                      onValueChange={async (value) => {
                        if (value === 'none') {
                          setImportedAnomalyId(null);
                          setPotionAnomaly(null);
                          setFormData(prev => ({ ...prev, hasAnomaly: false }));
                          return;
                        }
                        setImportedAnomalyId(value);
                        try {
                          const row = await getAnomalyById(value);
                          const stats = (row as any)?.stats || {};
                          const a: StatusAnomaly = {
                            id: String(row?.id || value),
                            name: String(row?.name || ''),
                            description: String(row?.description || ''),
                            actionPointsModifier: Number((row as any)?.temp_action_points ?? 0) || 0,
                            healthModifier: Number((row as any)?.temp_health ?? 0) || 0,
                            armorModifier: Number((row as any)?.temp_armour ?? 0) || 0,
                            turns: (row as any)?.turns ?? undefined,
                            statsModifier: (stats?.stats_modifier || stats?.statsModifier || {
                              forza: 0, percezione: 0, resistenza: 0,
                              intelletto: 0, agilita: 0, sapienza: 0, anima: 0,
                            }),
                            damageSets: Array.isArray(stats?.damage_sets) ? stats.damage_sets.map((s: any) => ({
                              damageEffectId: s.damageEffectId ?? s.damage_effect_id,
                              effectName: s.effect_name,
                              guaranteedDamage: Number(s.guaranteedDamage ?? s.guaranteed_damage ?? 0) || 0,
                              additionalDamage: Number(s.additionalDamage ?? s.additional_damage ?? 0) || 0,
                            })) : undefined,
                            damageBonusEnabled: !!(stats?.damage_bonus_enabled ?? stats?.damageBonusEnabled),
                            damageBonus: (stats?.damage_bonus ?? stats?.damageBonus) || undefined,
                            paDiscountEnabled: !!(stats?.pa_discount_enabled ?? stats?.paDiscountEnabled),
                            paDiscount: (stats?.pa_discount ?? stats?.paDiscount) || undefined,
                          };
                          setPotionAnomaly(a);
                        } catch {
                          setPotionAnomaly(null);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona anomalia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna</SelectItem>
                        {anomalyOptions.map((opt) => (
                          <SelectItem key={`anom:${opt.id}`} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {potionAnomaly && (
                  <div className="p-3 border rounded-md space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-base font-semibold">{potionAnomaly.name}</div>
                        {potionAnomaly.description && (
                          <div className="text-sm text-muted-foreground mt-1">{potionAnomaly.description}</div>
                        )}
                        <div className="mt-2 text-sm">
                          <div>Durata: {typeof potionAnomaly.turns === 'number' ? potionAnomaly.turns : 0} turni</div>
                          {(potionAnomaly.healthModifier || 0) !== 0 && (
                            <div>Salute: {potionAnomaly.healthModifier > 0 ? '+' : ''}{potionAnomaly.healthModifier}</div>
                          )}
                          {(potionAnomaly.actionPointsModifier || 0) !== 0 && (
                            <div>PA: {potionAnomaly.actionPointsModifier > 0 ? '+' : ''}{potionAnomaly.actionPointsModifier}</div>
                          )}
                          {(potionAnomaly.armorModifier || 0) !== 0 && (
                            <div>Armatura: {(potionAnomaly.armorModifier || 0) > 0 ? '+' : ''}{(potionAnomaly.armorModifier || 0)}</div>
                          )}
                        </div>
                        {potionAnomaly.statsModifier && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(potionAnomaly.statsModifier)
                              .filter(([_, v]) => (v || 0) !== 0)
                              .map(([k, v]) => (
                                <span key={`s:${k}`} className="px-2 py-1 rounded text-xs border">
                                  {k}: {Number(v) > 0 ? '+' : ''}{Number(v)}
                                </span>
                              ))}
                          </div>
                        )}
                        {Array.isArray(potionAnomaly.damageSets) && potionAnomaly.damageSets.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <div className="font-medium">Danni per tipo:</div>
                            <div className="ml-2">
                              {potionAnomaly.damageSets.map((ds, i) => (
                                <div key={`ads:${i}`}>
                                  {(ds as any).effectName || (ds as any).effect_name || 'Tipo'}:
                                  {(ds.guaranteedDamage || 0) > 0 ? ` assicurato ${Number(ds.guaranteedDamage || 0)}` : ''}
                                  {(ds.additionalDamage || 0) > 0 ? `${(ds.guaranteedDamage || 0) > 0 ? ',' : ''} aggiuntivo ${Number(ds.additionalDamage || 0)}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            {editingPotion ? 'Salva Modifiche' : 'Aggiungi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AnomalyModal
      isOpen={anomalyModalOpen}
      onClose={() => setAnomalyModalOpen(false)}
      onSave={(anom) => {
        setPotionAnomaly(anom);
        setImportedAnomalyId(null);
        setFormData(prev => ({ ...prev, hasAnomaly: true }));
        setAnomalyModalOpen(false);
      }}
      editingAnomaly={null}
    />
    </>
  );
};

export default PotionModal;
