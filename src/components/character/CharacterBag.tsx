import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Currency, Arrow, Potion, MagicQuiverItem } from '@/types/character';
import ArrowModal from './modals/ArrowModal';
import PotionModal from './modals/PotionModal';
import CurrencyDirectModificationModal from './modals/CurrencyDirectModificationModal';
import ImportMagicQuiverModal from '@/components/magic/ImportMagicQuiverModal';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';

interface CharacterBagProps {
  currency: Currency;
  arrows: Arrow[];
  potions: Potion[];
  magicQuivers?: MagicQuiverItem[];
  onUpdateCurrency: (currency: Currency) => void;
  onAddArrow: (arrow: Arrow) => void;
  onUpdateArrow: (arrow: Arrow) => void;
  onRemoveArrow: (id: string) => void;
  onAddPotion: (potion: Potion) => void;
  onUpdatePotion: (potion: Potion) => void;
  onRemovePotion: (id: string) => void;
  // Per import modale
  character?: any;
  updateCharacter?: (updates: any) => void;
  characterId?: string;
  // gestione rimozione elementi dalla faretra magica
  onRemoveMagicQuiver?: (id: string) => void;
}

const CharacterBag = ({
  currency,
  arrows,
  potions,
  magicQuivers = [],
  onUpdateCurrency,
  onAddArrow,
  onUpdateArrow,
  onRemoveArrow,
  onAddPotion,
  onUpdatePotion,
  onRemovePotion,
  character,
  updateCharacter,
  characterId,
  onRemoveMagicQuiver
}: CharacterBagProps) => {
  const [arrowModalOpen, setArrowModalOpen] = useState(false);
  const [potionModalOpen, setPotionModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [editingArrow, setEditingArrow] = useState<Arrow | null>(null);
  const [editingPotion, setEditingPotion] = useState<Potion | null>(null);
  const [magicQuiverModalOpen, setMagicQuiverModalOpen] = useState(false);
  const [damageEffectNameById, setDamageEffectNameById] = useState<Record<string, string>>({});
  const [damageEffectsLoading, setDamageEffectsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setDamageEffectsLoading(true);
      try {
        const list = await listDamageEffects();
        const next: Record<string, string> = {};
        for (const row of Array.isArray(list) ? list : []) {
          if (row?.id == null) continue;
          const name = String(row?.name || '').trim();
          if (!name) continue;
          next[String(row.id)] = name;
        }
        if (active) setDamageEffectNameById(next);
      } finally {
        if (active) setDamageEffectsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const resolveEffectName = (id: string) =>
    damageEffectNameById[String(id)] ?? (damageEffectsLoading ? 'Caricamento...' : 'Effetto sconosciuto');

  // Gestione conversione automatica valute
  const updateCurrency = (newCurrency: Partial<Currency>) => {
    let updated = { ...currency, ...newCurrency };
    
    // Conversione automatica ogni 100 - mantiene il resto
    if (updated.bronzo >= 100) {
      const extra = Math.floor(updated.bronzo / 100);
      updated.argento += extra;
      updated.bronzo = updated.bronzo % 100; // Mantiene il resto
    }
    
    if (updated.argento >= 100) {
      const extra = Math.floor(updated.argento / 100);
      updated.oro += extra;
      updated.argento = updated.argento % 100; // Mantiene il resto
    }
    
    if (updated.oro >= 100) {
      const extra = Math.floor(updated.oro / 100);
      updated.rosse += extra;
      updated.oro = updated.oro % 100; // Mantiene il resto
    }
    
    if (updated.rosse >= 100) {
      const extra = Math.floor(updated.rosse / 100);
      updated.bianche += extra;
      updated.rosse = updated.rosse % 100; // Mantiene il resto
    }
    
    // Limite massimo per corone bianche
    if (updated.bianche > 999) {
      updated.bianche = 999;
    }
    
    onUpdateCurrency(updated);
  };

  // Gestione frecce
  const handleSaveArrow = (arrow: Arrow) => {
    if (editingArrow) {
      onUpdateArrow(arrow);
    } else {
      onAddArrow(arrow);
    }
    setEditingArrow(null);
  };

  const handleEditArrow = (arrow: Arrow) => {
    setEditingArrow(arrow);
    setArrowModalOpen(true);
  };

  const handleDeleteArrow = (id: string) => {
    onRemoveArrow(id);
  };

  // Gestione pozioni
  const handleSavePotion = (potion: Potion) => {
    if (editingPotion) {
      onUpdatePotion(potion);
    } else {
      onAddPotion(potion);
    }
    setEditingPotion(null);
  };

  const handleEditPotion = (potion: Potion) => {
    setEditingPotion(potion);
    setPotionModalOpen(true);
  };

  const handleDeletePotion = (id: string) => {
    onRemovePotion(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borselli</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="currency" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="currency">Denari</TabsTrigger>
            <TabsTrigger value="arrows">Proiettili</TabsTrigger>
            <TabsTrigger value="potions">Pozioni</TabsTrigger>
            <TabsTrigger value="magic-quiver">Faretra Magica</TabsTrigger>
          </TabsList>

          {/* Denari */}
          <TabsContent value="currency" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Gestione Valute</h3>
              <Button 
                onClick={() => setCurrencyModalOpen(true)}
                size="sm"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Modifica Diretta
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bronzo">Corone di Bronzo</Label>
                <Input
                  id="bronzo"
                  type="number"
                  value={currency.bronzo}
                  onChange={(e) => updateCurrency({ bronzo: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="99"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ogni 100 si converte in 1 Corona d'Argento
                </p>
              </div>
              
              <div>
                <Label htmlFor="argento">Corone d'Argento</Label>
                <Input
                  id="argento"
                  type="number"
                  value={currency.argento}
                  onChange={(e) => updateCurrency({ argento: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="99"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ogni 100 si converte in 1 Corona d'Oro
                </p>
              </div>
              
              <div>
                <Label htmlFor="oro">Corone d'Oro</Label>
                <Input
                  id="oro"
                  type="number"
                  value={currency.oro}
                  onChange={(e) => updateCurrency({ oro: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="99"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ogni 100 si converte in 1 Corona Rossa
                </p>
              </div>
              
              <div>
                <Label htmlFor="rosse">Corone Rosse</Label>
                <Input
                  id="rosse"
                  type="number"
                  value={currency.rosse}
                  onChange={(e) => updateCurrency({ rosse: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="99"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ogni 100 si converte in 1 Corona Bianca
                </p>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="bianche">Corone Bianche</Label>
                <Input
                  id="bianche"
                  type="number"
                  value={currency.bianche}
                  onChange={(e) => updateCurrency({ bianche: Math.min(999, parseInt(e.target.value) || 0) })}
                  min="0"
                  max="999"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Massimo 999 corone bianche
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Faretra */}
          <TabsContent value="arrows" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Proiettili</h3>
              <Button 
                onClick={() => {
                  setEditingArrow(null);
                  setArrowModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Proiettile
              </Button>
            </div>

            <div className="space-y-2">
              {arrows.map((arrow) => (
                <div key={arrow.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold">{arrow.name || 'Freccia senza nome'}</h5>
                      <Badge variant="secondary">Danno: {arrow.damage}</Badge>
                      <Badge variant="outline">Qty: {arrow.quantity}</Badge>
                    </div>
                    {arrow.description && (
                      <p className="text-sm text-muted-foreground mt-1">{arrow.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditArrow(arrow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteArrow(arrow.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {arrows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessun proiettile nella faretra</p>
                <p className="text-sm">Clicca "Aggiungi Proiettile" per iniziare</p>
              </div>
            )}
          </TabsContent>

          {/* Pozioni */}
          <TabsContent value="potions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pozioni</h3>
              <Button 
                onClick={() => {
                  setEditingPotion(null);
                  setPotionModalOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Pozione
              </Button>
            </div>

            <div className="space-y-2">
              {potions.map((potion) => (
                <div key={potion.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold">{potion.name || 'Pozione senza nome'}</h5>
                      {potion.isRestore && (
                        <Badge variant="outline" className="text-xs">Ripristina</Badge>
                      )}
                      <Badge variant="outline">Qty: {potion.quantity}</Badge>
                    </div>
                    {potion.description && (
                      <p className="text-sm text-muted-foreground mt-1">{potion.description}</p>
                    )}
                    {potion.isRestore && Array.isArray(potion.damageSets) && potion.damageSets.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {potion.damageSets.map((ds, idx) => {
                          const gVal = (ds as any).guaranteedDamage ?? (ds as any).guaranteed_damage;
                          const aVal = (ds as any).additionalDamage ?? (ds as any).additional_damage;
                          const effLabel = (ds as any).effect_name ?? (ds as any).effectName ?? (ds as any).damageEffectId ?? 'Effetto';
                          return (
                            <div key={`pds:${potion.id}:${idx}`}>
                              <span className="font-medium">{effLabel}:</span>
                              {gVal !== undefined && (
                                <span className="ml-1">Assicurato {Number(gVal ?? 0)}</span>
                              )}
                              {aVal !== undefined && (
                                <span className="ml-2">Aggiuntivo {Number(aVal ?? 0)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {potion.anomaly && (
                      <div className="mt-2 text-xs text-muted-foreground">
                            <div>
                            <div className="font-medium">{potion.anomaly.name}</div>
                            {potion.anomaly.description && (
                              <div className="mt-1">{potion.anomaly.description}</div>
                            )}
                            {(() => {
                              const anomaly: any = potion.anomaly as any;
                              const enabled = !!(anomaly?.damageBonusEnabled ?? anomaly?.damage_bonus_enabled);
                              if (!enabled) return null;
                              const db = (anomaly?.damageBonus ?? anomaly?.damage_bonus) || {};
                              const mode = String(db?.mode || '').toLowerCase();
                              const isSpecific = !!db?.isSpecific;
                              const effectNames = Array.isArray(db?.damageEffectNames) ? db.damageEffectNames.map(String).filter(Boolean) : [];
                              const effectIds = Array.isArray(db?.damageEffectIds) ? db.damageEffectIds.map(String).filter(Boolean) : [];
                              const targets = (isSpecific && (effectNames.length || effectIds.length))
                                ? (effectNames.length ? effectNames : effectIds.map(resolveEffectName))
                                : [null];
                              const mk = (target: string | null, kind: string) => `${anomaly.name}${target ? ` • ${target}` : ''} • ${kind}`;
                              const out: string[] = [];
                              const addNum = (target: string | null, kind: string, v: any, unit?: string) => {
                                const n = Number(v || 0) || 0;
                                if (!n) return;
                                const sign = n >= 0 ? '+' : '-';
                                const abs = Math.abs(Math.round(n));
                                out.push(`Bonus danni: ${sign} '${mk(target, kind)}' (${abs}${unit || ''})`);
                              };

                              const classicG = db?.classicGuaranteed;
                              const classicA = db?.classicAdditional;
                              const percG = db?.percentageGuaranteed;
                              const percA = db?.percentageAdditional;

                              targets.forEach((t: any) => {
                                if (mode !== 'percentage') {
                                  addNum(t, 'Assicurato', classicG);
                                  addNum(t, 'Aggiuntivo', classicA);
                                }
                                if (mode !== 'classic') {
                                  addNum(t, 'Assicurato %', percG, '%');
                                  addNum(t, 'Aggiuntivo %', percA, '%');
                                }
                              });

                              if (out.length === 0) return null;
                              return (
                                <div className="mt-1 space-y-0.5">
                                  {out.map((l, i) => (
                                    <div key={`panomb:${potion.id}:${i}`}>{l}</div>
                                  ))}
                                </div>
                              );
                            })()}
                            {typeof potion.anomaly.turns === 'number' && (
                              <div>Durata: {potion.anomaly.turns} turni</div>
                            )}
                            {(potion.anomaly.healthModifier || 0) !== 0 && (
                              <div>Salute: {potion.anomaly.healthModifier > 0 ? '+' : ''}{potion.anomaly.healthModifier}</div>
                            )}
                            {(potion.anomaly.actionPointsModifier || 0) !== 0 && (
                              <div>PA: {potion.anomaly.actionPointsModifier > 0 ? '+' : ''}{potion.anomaly.actionPointsModifier}</div>
                            )}
                            {potion.anomaly.statsModifier && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(potion.anomaly.statsModifier)
                                  .filter(([, v]) => (v as number || 0) !== 0)
                                  .map(([k, v]) => (
                                    <span key={`panomstat:${k}`} className="px-2 py-1 rounded text-xs border">
                                      {k}: {Number(v) > 0 ? '+' : ''}{Number(v)}
                                    </span>
                                  ))}
                              </div>
                            )}
                            {Array.isArray(potion.anomaly.damageSets) && potion.anomaly.damageSets.length > 0 && (
                              <div className="mt-1">
                                {potion.anomaly.damageSets.map((ads, i) => (
                                  <div key={`pdam:${potion.id}:${i}`}>
                                    {((ads as any).effectName ?? (ads as any).effect_name ?? 'Tipo') + ':'}
                                    {(ads.guaranteedDamage || 0) > 0 ? ` assicurato ${Number(ads.guaranteedDamage || 0)}` : ''}
                                    {(ads.additionalDamage || 0) > 0 ? `${(ads.guaranteedDamage || 0) > 0 ? ',' : ''} aggiuntivo ${Number(ads.additionalDamage || 0)}` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditPotion(potion)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeletePotion(potion.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {potions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessuna pozione disponibile</p>
                <p className="text-sm">Clicca "Aggiungi Pozione" per iniziare</p>
              </div>
            )}
          </TabsContent>

          {/* Faretra Magica */}
          <TabsContent value="magic-quiver" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Faretra Magica</h3>
              <Button 
                onClick={() => setMagicQuiverModalOpen(true)}
                size="sm"
                className="bg-purple-500 text-white hover:bg-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Importa Frecce Magiche
              </Button>
            </div>

            <div className="space-y-2">
              {magicQuivers.map((mq) => (
                <div key={mq.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold">{mq.name}</h5>
                      {mq.action_points_cost !== null && mq.action_points_cost !== undefined && (
                        <Badge variant="secondary">PA: {Number(mq.action_points_cost || 0)}</Badge>
                      )}
                      {mq.indicative_action_points_cost !== null && mq.indicative_action_points_cost !== undefined && (
                        <Badge variant="outline">PA Max: {Number(mq.indicative_action_points_cost || 0)}</Badge>
                      )}
                    </div>
                    {mq.description && (
                      <p className="text-sm text-muted-foreground mt-1">{mq.description}</p>
                    )}
                    {mq.warnings && (
                      <p className="text-xs text-yellow-700 mt-1">Avvertenze: {mq.warnings}</p>
                    )}
                    {Array.isArray(mq.damage_sets) && mq.damage_sets.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {mq.damage_sets.map((ds, idx) => {
                          const gVal = (ds as any).guaranteed_damage ?? (ds as any).guaranteedDamage;
                          const aVal = (ds as any).additional_damage ?? (ds as any).additionalDamage;
                          const effLabel = ds.effect_name || (ds as any).damageEffectId || 'Effetto';
                          return (
                            <div key={`mqds:${mq.id}:${idx}`}>
                              <span className="font-medium">{effLabel}:</span>
                              {gVal !== undefined && (
                                <span className="ml-1">Assicurato {Number(gVal ?? 0)}</span>
                              )}
                              {aVal !== undefined && (
                                <span className="ml-2">Aggiuntivo {Number(aVal ?? 0)}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {Array.isArray(mq.anomalies) && mq.anomalies.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Anomalie:</span>
                        <span className="ml-1">
                          {mq.anomalies.slice(0,3).map((a, i) => `${a.name || a.anomalyId || 'Anomalia'} ${typeof a.percent === 'number' ? `(${a.percent}%)` : ''}`).join(', ')}
                        </span>
                        {mq.anomalies.length > 3 && (
                          <span className="ml-1">+{mq.anomalies.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {onRemoveMagicQuiver && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => onRemoveMagicQuiver(mq.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(!magicQuivers || magicQuivers.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessuna freccia magica presente</p>
                <p className="text-sm">Clicca "Importa Frecce Magiche" per aggiungerne una</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modali */}
        <ArrowModal
          isOpen={arrowModalOpen}
          onClose={() => {
            setArrowModalOpen(false);
            setEditingArrow(null);
          }}
          onSave={handleSaveArrow}
          editingArrow={editingArrow}
        />

        <PotionModal
          isOpen={potionModalOpen}
          onClose={() => {
            setPotionModalOpen(false);
            setEditingPotion(null);
          }}
          onSave={handleSavePotion}
          editingPotion={editingPotion}
        />

        <CurrencyDirectModificationModal
          isOpen={currencyModalOpen}
          onClose={() => setCurrencyModalOpen(false)}
          currency={currency}
          onSave={onUpdateCurrency}
        />

        {/* Modale: Import Frecce Magiche */}
        <ImportMagicQuiverModal
          isOpen={magicQuiverModalOpen}
          onOpenChange={setMagicQuiverModalOpen}
          character={character}
          updateCharacter={updateCharacter}
          characterId={characterId}
        />
      </CardContent>
    </Card>
  );
};

export default CharacterBag;
