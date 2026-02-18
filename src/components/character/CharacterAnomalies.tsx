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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Anomalie di Stato</CardTitle>
        <Button 
          onClick={() => {
            setEditingAnomaly(null);
            setModalOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Anomalia
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{anomaly.name || 'Anomalia senza nome'}</h4>
                  <div className="flex gap-1">
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
                    {typeof anomaly.turns === 'number' && (
                      <Badge variant="outline">Turni: {anomaly.turns}</Badge>
                    )}
                  </div>
                </div>
                
                {anomaly.description && (
                  <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                )}

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
                
                {/* Modificatori statistiche */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(anomaly.statsModifier || {})
                    .filter(([_, value]) => value !== 0)
                    .map(([stat, value]) => (
                      <Badge key={stat} variant="outline" className="text-xs">
                        {stat}: {value > 0 ? '+' : ''}{value}
                      </Badge>
                    ))}
                </div>

                {typeof anomaly.turns === 'number' && (
                  <p className="text-xs text-muted-foreground mt-2">Turni rimasti: {anomaly.turns}</p>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
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
