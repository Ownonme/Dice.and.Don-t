import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus } from 'lucide-react';
import { StatusAnomaly } from '@/types/character';
import AnomalyModal from './modals/AnomalyModal';
import { listDamageEffects } from '@/integrations/supabase/damageEffects';

const getAnomalyDamageBonusLines = (anomaly: StatusAnomaly, resolveEffectName: (id: string) => string) => {
  const enabled = !!((anomaly as any)?.damageBonusEnabled ?? (anomaly as any)?.damage_bonus_enabled);
  if (!enabled) return [] as string[];

  const db = ((anomaly as any)?.damageBonus ?? (anomaly as any)?.damage_bonus) || {};
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

  targets.forEach((t) => {
    if (mode !== 'percentage') {
      addNum(t, 'Assicurato', classicG);
      addNum(t, 'Aggiuntivo', classicA);
    }
    if (mode !== 'classic') {
      addNum(t, 'Assicurato %', percG, '%');
      addNum(t, 'Aggiuntivo %', percA, '%');
    }
  });

  return out;
};

interface CharacterAnomaliesProps {
  anomalies: StatusAnomaly[];
  onAddAnomaly: (anomaly: StatusAnomaly) => void;
  onUpdateAnomaly: (anomaly: StatusAnomaly) => void;
  onRemoveAnomaly: (id: string) => void;
}

const CharacterAnomalies = ({ anomalies, onAddAnomaly, onUpdateAnomaly, onRemoveAnomaly }: CharacterAnomaliesProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnomaly, setEditingAnomaly] = useState<StatusAnomaly | null>(null);
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

  const formatModeValue = (mode: string, classicG?: number, classicA?: number, percG?: number, percA?: number) => {
    const out: string[] = [];
    if (mode !== 'percentage') {
      if (classicG) out.push(`assicurato ${classicG}`);
      if (classicA) out.push(`aggiuntivo ${classicA}`);
    }
    if (mode !== 'classic') {
      if (percG) out.push(`assicurato ${percG}%`);
      if (percA) out.push(`aggiuntivo ${percA}%`);
    }
    return out.join(', ');
  };

  const handleSaveAnomaly = (anomaly: StatusAnomaly) => {
    if (editingAnomaly) {
      onUpdateAnomaly(anomaly);
    } else {
      onAddAnomaly(anomaly);
    }
    setEditingAnomaly(null);
  };

  const handleEditAnomaly = (anomaly: StatusAnomaly) => {
    setEditingAnomaly(anomaly);
    setModalOpen(true);
  };

  const handleDeleteAnomaly = (id: string) => {
    onRemoveAnomaly(id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle>Anomalie di Stato</CardTitle>
        <Button 
          onClick={() => {
            setEditingAnomaly(null);
            setModalOpen(true);
          }}
          size="sm"
          className="w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Anomalia
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="space-y-1">
                  <h4 className="font-semibold">{anomaly.name || 'Anomalia senza nome'}</h4>
                  <div className="flex flex-wrap gap-1">
                    {anomaly.healthModifier !== 0 && (
                      <Badge variant={anomaly.healthModifier > 0 ? 'default' : 'destructive'}>
                        Salute: {anomaly.healthModifier > 0 ? '+' : ''}{anomaly.healthModifier}
                      </Badge>
                    )}
                    {anomaly.actionPointsModifier !== 0 && (
                      <Badge variant={anomaly.actionPointsModifier > 0 ? 'default' : 'destructive'}>
                        PA: {anomaly.actionPointsModifier > 0 ? '+' : ''}{anomaly.actionPointsModifier}
                      </Badge>
                    )}
                    {(anomaly.armorModifier || 0) !== 0 && (
                      <Badge variant={(anomaly.armorModifier || 0) > 0 ? 'default' : 'destructive'}>
                        Armatura: {(anomaly.armorModifier || 0) > 0 ? '+' : ''}{(anomaly.armorModifier || 0)}
                      </Badge>
                    )}
                    {anomaly.sourceType === 'equipment' && anomaly.sourceName && (
                      <Badge variant="secondary">
                        {anomaly.sourceName}
                      </Badge>
                    )}
                    {typeof anomaly.turns === 'number' && (
                      <Badge variant="outline">Turni: {anomaly.turns}</Badge>
                    )}
                    {Object.entries(anomaly.statsModifier || {})
                      .filter(([_, value]) => value !== 0)
                      .map(([stat, value]) => (
                        <Badge key={stat} variant="outline" className="text-xs">
                          {stat}: {value > 0 ? '+' : ''}{value}
                        </Badge>
                      ))}
                  </div>
                </div>
                
                {anomaly.description && (
                  <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                )}

                {(() => {
                  const parts: string[] = [];
                  if (anomaly.sourceType) parts.push(`Origine: ${anomaly.sourceType}`);
                  if (anomaly.sourceName) parts.push(`Sorgente: ${anomaly.sourceName}`);
                  if (anomaly.alwaysActive) parts.push('Sempre attiva');
                  if (anomaly.durationMode) parts.push(`Durata: ${anomaly.durationMode === 'actions' ? 'azioni' : 'turni'}`);
                  if (anomaly.actionsDurationType) parts.push(`Azioni: ${anomaly.actionsDurationType === 'performed' ? 'eseguite' : 'ricevute'}`);
                  if (anomaly.decrementOnFailure) parts.push('Scala su fallimento');
                  return parts.length > 0 ? (
                    <div className="text-xs text-muted-foreground mb-2">{parts.join(' • ')}</div>
                  ) : null;
                })()}

                {(() => {
                  const immunityTotal = !!((anomaly as any)?.immunityTotal ?? (anomaly as any)?.immunity_total ?? (anomaly as any)?.stats?.immunity_total);
                  const immunityAnomsRaw = (anomaly as any)?.immunityAnomalies ?? (anomaly as any)?.immunity_anomalies ?? (anomaly as any)?.stats?.immunity_anomalies ?? [];
                  const immunityEffectsRaw = (anomaly as any)?.immunityDamageEffects ?? (anomaly as any)?.immunity_damage_effects ?? (anomaly as any)?.stats?.immunity_damage_effects ?? [];
                  const mapAnomLabel = (v: any) => {
                    if (typeof v === 'string') return v;
                    return String(v?.name ?? v?.id ?? '').trim();
                  };
                  const mapEffectLabel = (v: any) => {
                    if (typeof v === 'string') return resolveEffectName(v);
                    const name = String(v?.name ?? '').trim();
                    if (name) return name;
                    const id = String(v?.id ?? '').trim();
                    return id ? resolveEffectName(id) : '';
                  };
                  const anoms = (Array.isArray(immunityAnomsRaw) ? immunityAnomsRaw : []).map(mapAnomLabel).filter(Boolean);
                  const effects = (Array.isArray(immunityEffectsRaw) ? immunityEffectsRaw : []).map(mapEffectLabel).filter(Boolean);
                  if (!immunityTotal && anoms.length === 0 && effects.length === 0) return null;
                  return (
                    <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                      <div><span className="font-medium">Immunità:</span> {immunityTotal ? 'Totale' : 'Selettiva'}</div>
                      {!immunityTotal && anoms.length > 0 && (
                        <div>• Anomalie: {anoms.join(', ')}</div>
                      )}
                      {!immunityTotal && effects.length > 0 && (
                        <div>• Effetti danno: {effects.join(', ')}</div>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const lines = getAnomalyDamageBonusLines(anomaly, resolveEffectName);
                  if (lines.length === 0) return null;
                  return (
                    <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                      {lines.map((l, i) => (
                        <div key={`${anomaly.id}:dbl:${i}`}>{l}</div>
                      ))}
                    </div>
                  );
                })()}

                {(() => {
                  const enabled = !!((anomaly as any)?.extraDamageEnabled ?? (anomaly as any)?.extra_damage_enabled);
                  const list = (anomaly as any)?.extraDamage?.effects || (anomaly as any)?.extra_damage?.effects || [];
                  const rows = Array.isArray(list) ? list : [];
                  if (!enabled || rows.length === 0) return null;
                  return (
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="font-medium">Danni extra:</div>
                      <div className="ml-2 space-y-0.5">
                        {rows.map((e: any, i: number) => (
                          <div key={`exd:${i}`}>
                            {e?.damageEffectName || (e?.damageEffectId ? resolveEffectName(String(e.damageEffectId)) : 'Effetto')}:{' '}
                            {Number(e?.min ?? 0) > 0 ? `min ${Number(e.min)}` : ''}{Number(e?.max ?? 0) > 0 ? `${Number(e?.min ?? 0) > 0 ? ', ' : ''}max ${Number(e.max)}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const rows = Array.isArray(anomaly.damageSets) ? anomaly.damageSets : [];
                  if (rows.length === 0) return null;
                  return (
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="font-medium">Danni per tipo:</div>
                      <div className="ml-2 space-y-0.5">
                        {rows.map((ds: any, i: number) => (
                          <div key={`ads:${i}`}>
                            {ds?.effectName || ds?.effect_name || (ds?.damageEffectId ? resolveEffectName(String(ds.damageEffectId)) : 'Tipo')}:
                            {Number(ds?.guaranteedDamage || ds?.guaranteed_damage || 0) > 0 ? ` assicurato ${Number(ds.guaranteedDamage ?? ds.guaranteed_damage)}` : ''}
                            {Number(ds?.additionalDamage || ds?.additional_damage || 0) > 0 ? `${Number(ds?.guaranteedDamage || ds?.guaranteed_damage || 0) > 0 ? ',' : ''} aggiuntivo ${Number(ds.additionalDamage ?? ds.additional_damage)}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const enabled = !!((anomaly as any)?.damageReductionEnabled ?? (anomaly as any)?.damage_reduction_enabled);
                  const def = (anomaly as any)?.damageReduction ?? (anomaly as any)?.damage_reduction;
                  if (!enabled || !def) return null;
                  const mode = String(def?.mode || '').toLowerCase();
                  const isSpecific = !!def?.isSpecific;
                  const targets = (isSpecific && (def?.damageEffectNames?.length || def?.damageEffectIds?.length))
                    ? (def?.damageEffectNames?.length ? def.damageEffectNames : def.damageEffectIds.map(resolveEffectName))
                    : [];
                  const values = formatModeValue(mode, def?.classicGuaranteed, def?.classicAdditional, def?.percentageGuaranteed, def?.percentageAdditional);
                  return (
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="font-medium">Riduzione danni:</div>
                      <div className="ml-2">
                        {targets.length > 0 ? targets.map((t: string, i: number) => (
                          <div key={`dr:${i}`}>{t}: {values || '—'}</div>
                        )) : <div>Generale: {values || '—'}</div>}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const enabled = !!((anomaly as any)?.weaknessEnabled ?? (anomaly as any)?.weakness_enabled);
                  const def = (anomaly as any)?.weakness;
                  if (!enabled || !def) return null;
                  const mode = String(def?.mode || '').toLowerCase();
                  const isSpecific = !!def?.isSpecific;
                  const targets = (isSpecific && (def?.damageEffectNames?.length || def?.damageEffectIds?.length))
                    ? (def?.damageEffectNames?.length ? def.damageEffectNames : def.damageEffectIds.map(resolveEffectName))
                    : [];
                  const values = formatModeValue(mode, def?.classicGuaranteed, def?.classicAdditional, def?.percentageGuaranteed, def?.percentageAdditional);
                  return (
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="font-medium">Debolezza:</div>
                      <div className="ml-2">
                        {targets.length > 0 ? targets.map((t: string, i: number) => (
                          <div key={`wk:${i}`}>{t}: {values || '—'}</div>
                        )) : <div>Generale: {values || '—'}</div>}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const enabled = !!((anomaly as any)?.paDiscountEnabled ?? (anomaly as any)?.pa_discount_enabled);
                  const def = (anomaly as any)?.paDiscount ?? (anomaly as any)?.pa_discount;
                  if (!enabled || !def) return null;
                  const mode = String(def?.mode || '').toLowerCase();
                  const values = formatModeValue(mode, def?.classicGuaranteed, def?.classicAdditional, def?.percentageGuaranteed, def?.percentageAdditional);
                  const targetMode = String(def?.targetMode || def?.target_mode || '');
                  const cats = Array.isArray(def?.categories) ? def.categories : [];
                  return (
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="font-medium">Sconto PA:</div>
                      <div className="ml-2">
                        <div>Valori: {values || '—'}</div>
                        {targetMode && <div>Target: {targetMode}</div>}
                        {cats.length > 0 && <div>Categorie: {cats.join(', ')}</div>}
                      </div>
                    </div>
                  );
                })()}
                
                {typeof anomaly.turns === 'number' && (
                  <p className="text-xs text-muted-foreground mt-2">Turni rimasti: {anomaly.turns}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 md:ml-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditAnomaly(anomaly)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteAnomaly(anomaly.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {anomalies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nessuna anomalia di stato attiva</p>
            <p className="text-sm">Clicca "Aggiungi Anomalia" per iniziare</p>
          </div>
        )}

        <AnomalyModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingAnomaly(null);
          }}
          onSave={handleSaveAnomaly}
          editingAnomaly={editingAnomaly}
        />
      </CardContent>
    </Card>
  );
};

export default CharacterAnomalies;
