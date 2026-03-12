import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { StatusAnomaly } from '@/types/character';

interface SpellLevel {
  level: number;
  guaranteed_damage?: number | string | null;
  additional_damage?: number | string | null;
  action_cost?: number | string | null;
  indicative_action_cost?: number | string | null;
  duration?: string | null;
  range?: string | null;
  special_effect?: string | null;
  level_description?: string | null;
  // compatibilità legacy
  damage?: number | string | null;
  mana_cost?: number | string | null;
  // anomalie
  anomaly1_percentage?: number | string | null;
  anomaly1_type?: string | null;
  anomaly2_percentage?: number | string | null;
  anomaly2_type?: string | null;
  anomaly3_percentage?: number | string | null;
  anomaly3_type?: string | null;

  // nuovi campi dalla modale
  damage_values?: { typeName: string; guaranteed_damage?: number | string | null; additional_damage?: number | string | null }[];
  damage_shape?: 'area' | 'cone' | 'single' | 'chain';
  area_or_cone_value?: number | string | null;
  chain_targets?: number | string | null;

  // danni al secondo
  max_seconds?: number | string | null;
  pa_cost_per_second?: number | string | null;
  increasing_damage_per_second?: number | string | null;

  // tiri multipli
  max_projectiles?: number | string | null;
  increasing_damage_per_projectile?: number | string | null;

  // flag e durate
  conditional_additional_damage?: boolean;
  turn_duration_rounds?: number | string | null;
  usage_interval_turns?: number | string | null;
  max_uses_per_turn?: number | string | null;
  usage_every_n_turns_enabled?: boolean;
  usage_every_n_turns?: number | string | null;

  // danni su utilizzatore (self)
  self_effect_enabled?: boolean;
  self_damage_sets?: { effect_name?: string | null; guaranteed_damage?: number | string | null; max_damage?: number | string | null }[];
  self?: any;
  // campi legacy (singoli)
  self_damage_enabled?: boolean;
  self_damage?: number | string | null;
  self_damage_effect?: string | null;

  // evocazione
  evocation_enabled?: boolean;
  evocation_type?: 'weapon' | 'replica' | 'energy';

  // evocazione arma
  weapon_light_damage?: number | string | null;
  weapon_heavy_damage?: number | string | null;
  weapon_thrust_damage?: number | string | null;
  weapon_subtype?: string | null;
  weapon_weight?: number | string | null;
  weapon_description?: string | null;
  weapon_damage_sets?: { effect_name?: string | null; damage_veloce?: number | string | null; damage_pesante?: number | string | null; damage_affondo?: number | string | null; calculated_damage_veloce?: number | string | null; calculated_damage_pesante?: number | string | null; calculated_damage_affondo?: number | string | null }[];
  weapon_stats?: { statKey: string; amount: number | string | null }[];

  // evocazione replica
  max_replicas?: number | string | null;
  replica_source_character_id?: string | null;

  // evocazione energia
  energy_health?: number | string | null;
  energy_action_points?: number | string | null;
  energy_armour?: number | string | null;
  energy_stats?: { statKey: string; amount: number | string | null }[];
  energy_embedded_refs?: { refId: string; refType: string }[];
  energy_can_create_equipment?: boolean;
  // evocazione entità: snapshot di equipment importato (se presente)
  equipment?: any;
}

interface Spell {
  id: string;
  name: string;
  type: string;
  category?: string;
  grade: string;
  difficulty?: number | string | null;
  description: string;
  current_level?: number;
  primary_branch?: string | null;
  secondary_branch?: string | null;
  primary_specificity?: string | null;
  secondary_specificity?: string | null;
  additional_description?: string | null;
  story_1?: string | null;
  story_2?: string | null;
  immunity_total?: boolean;
  immunity_anomalies?: Array<{ id?: string; name?: string } | string>;
  immunity_damage_effects?: Array<{ id?: string; name?: string } | string>;
  levels?: SpellLevel[];
  usage_every_n_turns_enabled?: boolean;
  usage_every_n_turns?: number | string | null;
}

interface MagicDetailsProps {
  spell: Spell | null;
}

/** Helpers numerici sicuri */
const n = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const normalized = s.replace(',', '.');
  const m = normalized.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};
const gt0 = (v: unknown): boolean => n(v) > 0;
const hasText = (v?: string | null): boolean => !!(v && v.trim().length);
const mapSpecifics = (raw: any[]) =>
  (Array.isArray(raw) ? raw : [])
    .map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      value: n(r?.value ?? r?.amount ?? 0),
    }))
    .filter((r: any) => r.value > 0 && (r.id || r.name));
const mapMaxSpecifics = (raw: any[]) =>
  (Array.isArray(raw) ? raw : [])
    .map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      max: n(r?.max ?? r?.value ?? 0),
    }))
    .filter((r: any) => r.max > 0 && (r.id || r.name));
const getLevelSpecifics = (level: any, spell: any, key: 'consume_custom_specifics' | 'generate_custom_specifics') => {
  const fromLevel = Array.isArray(level?.[key]) ? level[key] : null;
  const fromSpell = Array.isArray(spell?.[key]) ? spell[key] : null;
  return mapSpecifics(fromLevel && fromLevel.length > 0 ? fromLevel : (fromSpell || []));
};
const getLevelPassiveCustomSpecifics = (level: any, spell: any) => {
  const fromLevel = Array.isArray((level as any)?.passive_custom_specifics) ? (level as any).passive_custom_specifics : null;
  const fromSpell = Array.isArray((spell as any)?.passive_custom_specifics) ? (spell as any).passive_custom_specifics : null;
  return mapMaxSpecifics(fromLevel && fromLevel.length > 0 ? fromLevel : (fromSpell || []));
};
// Aggiunta: label leggibile per statistiche
const prettyStatLabel = (key: string): string => {
  const map: Record<string, string> = {
    'forza': 'Forza',
    'percezione': 'Percezione',
    'resistenza': 'Resistenza',
    'intelletto': 'Intelletto',
    'agilità': 'Agilità',
    'agilita': 'Agilità',
    'sapienza': 'Sapienza',
    'anima': 'Anima',
  };
  const normalized = (key || '').toString().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  const lowered = normalized.toLowerCase();
  if (map[lowered]) return map[lowered];
  return lowered.replace(/\b\w/g, (c) => c.toUpperCase());
};

const getTargetAnomalies = (level: any): Array<{ type: string; percentage: number }> => {
  const base = [
    { idx: 1, percentage: n(level?.anomaly1_percentage), type: String(level?.anomaly1_type ?? '').trim() },
    { idx: 2, percentage: n(level?.anomaly2_percentage), type: String(level?.anomaly2_type ?? '').trim() },
    { idx: 3, percentage: n(level?.anomaly3_percentage), type: String(level?.anomaly3_type ?? '').trim() },
  ]
    .filter((a) => a.percentage > 0 && a.type && a.type !== 'Nessuna')
    .map(({ idx: _, ...rest }) => rest);

  const keyed: Array<{ idx: number; type: string; percentage: number }> = [];
  if (level && typeof level === 'object') {
    for (const k of Object.keys(level)) {
      const m = /^anomaly(\d+)_percentage$/.exec(k);
      if (!m) continue;
      const idx = Number(m[1]);
      if (!Number.isFinite(idx) || idx <= 3) continue;
      const percentage = n((level as any)[k]);
      const type = String((level as any)[`anomaly${idx}_type`] ?? '').trim();
      if (percentage > 0 && type && type !== 'Nessuna') keyed.push({ idx, type, percentage });
    }
  }

  if (keyed.length > 0) {
    return [...base, ...keyed.sort((a, b) => a.idx - b.idx).map(({ idx: _, ...rest }) => rest)];
  }

  if (base.length > 0) return base;

  const list: any[] = Array.isArray(level?.target_anomalies)
    ? level.target_anomalies
    : (Array.isArray(level?.targetAnomalies) ? level.targetAnomalies : (Array.isArray(level?.anomalies) ? level.anomalies : []));

  return (Array.isArray(list) ? list : [])
    .map((a: any) => {
      if (typeof a === 'string') return { type: a.trim(), percentage: 0 };
      const type = String(a?.type ?? a?.name ?? '').trim();
      const percentage = n(a?.percentage ?? a?.probability ?? a?.chance ?? 0);
      return { type, percentage };
    })
    .filter((a) => a.type && a.type !== 'Nessuna' && a.percentage > 0);
};

/** Badge styles */
const getTypeColor = (type: string) => {
  switch (type) {
    case 'Attiva': return 'bg-red-500 text-white';
    case 'Passiva': return 'bg-blue-500 text-white';
    case 'Suprema': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'Semplice': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Avanzata': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Suprema': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const MagicDetails = ({ spell }: MagicDetailsProps) => {
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<StatusAnomaly | null>(null);

  const openAnomaly = (a: any) => {
    if (!a) return;
    const name = String(a?.name ?? 'Anomalia').trim() || 'Anomalia';
    setSelectedAnomaly({ ...a, name } as StatusAnomaly);
    setIsAnomalyModalOpen(true);
  };

  if (!spell) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Dettagli Magia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Quando apri una magia verrà mostrata qui
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentLevel = spell.levels?.find(l => l.level === spell.current_level);
  const immunityTotal = !!((spell as any)?.immunity_total ?? (spell as any)?.immunityTotal);
  const immunityAnomsRaw = (spell as any)?.immunity_anomalies ?? (spell as any)?.immunityAnomalies ?? [];
  const immunityEffectsRaw = (spell as any)?.immunity_damage_effects ?? (spell as any)?.immunityDamageEffects ?? [];
  const mapImmunityLabel = (v: any) => {
    if (typeof v === 'string') return v;
    return String(v?.name ?? v?.id ?? '').trim();
  };
  const immunityAnoms = (Array.isArray(immunityAnomsRaw) ? immunityAnomsRaw : []).map(mapImmunityLabel).filter(Boolean);
  const immunityEffects = (Array.isArray(immunityEffectsRaw) ? immunityEffectsRaw : []).map(mapImmunityLabel).filter(Boolean);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{spell.name}</span>
            {Number((spell as any)?.difficulty || 0) > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-500 text-white border-yellow-600">
                Diff {Number((spell as any).difficulty || 0)}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Badge className={getTypeColor(spell.type)}>{spell.type}</Badge>
            <Badge className={getGradeColor(spell.grade)} variant="outline">{spell.grade}</Badge>
            {currentLevel?.evocation_enabled && (
              <Badge
                className={
                  currentLevel.evocation_type === 'energy'
                    ? 'bg-purple-600 text-white'
                    : currentLevel.evocation_type === 'weapon'
                    ? 'bg-gray-600 text-white'
                    : currentLevel.evocation_type === 'replica'
                    ? 'bg-amber-700 text-white'
                    : 'bg-gray-400 text-white'
                }
              >
                {currentLevel.evocation_type === 'weapon'
                  ? 'Arma'
                  : currentLevel.evocation_type === 'replica'
                  ? 'Replica'
                  : currentLevel.evocation_type === 'energy'
                  ? 'Energia'
                  : '—'}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {/* Rami */}
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-sm">Ramo Principale</h4>
                <p className="text-sm text-muted-foreground">{spell.primary_branch}</p>
              </div>
              {hasText(spell.secondary_branch) && (
                <div>
                  <h4 className="font-semibold text-sm">Ramo Secondario</h4>
                  <p className="text-sm text-muted-foreground">{spell.secondary_branch}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Specificità */}
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-sm">Specificità Principale</h4>
                <p className="text-sm text-muted-foreground">{spell.primary_specificity}</p>
              </div>
              {hasText(spell.secondary_specificity) && (
                <div>
                  <h4 className="font-semibold text-sm">Specificità Secondaria</h4>
                  <p className="text-sm text-muted-foreground">{spell.secondary_specificity}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Descrizione */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Descrizione</h4>
              <p className="text-sm">{spell.description}</p>
            </div>

            {(immunityTotal || immunityAnoms.length > 0 || immunityEffects.length > 0) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Immunità</h4>
                  {immunityTotal ? (
                    <p className="text-sm text-muted-foreground">Totale</p>
                  ) : (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {immunityAnoms.length > 0 && (
                        <div>• Anomalie: {immunityAnoms.join(', ')}</div>
                      )}
                      {immunityEffects.length > 0 && (
                        <div>• Effetti danno: {immunityEffects.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Livelli */}
            {spell.levels && spell.levels.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-3">Livelli</h4>
                  <div className="space-y-3">
                    {spell.levels.map((level) => {
                      const showMana = gt0(level.mana_cost);
                      const showPA = gt0(level.action_cost);
                      const showIndicative = gt0(level.indicative_action_cost);
                      const consumeSpecifics = getLevelSpecifics(level, spell, 'consume_custom_specifics');
                      const generateSpecifics = getLevelSpecifics(level, spell, 'generate_custom_specifics');
                      const passiveCustomSpecifics = getLevelPassiveCustomSpecifics(level, spell);

                      const anomalies = getTargetAnomalies(level as any);

                      const passiveAnomalies: any[] = Array.isArray((level as any)?.passive_anomalies)
                        ? ((level as any).passive_anomalies as any[])
                        : [];
                      const selfAnomalies: any[] = Array.isArray((level as any)?.self_anomalies)
                        ? ((level as any).self_anomalies as any[])
                        : (Array.isArray((level as any)?.self?.anomalies) ? ((level as any).self.anomalies as any[]) : []);
                      const appliedAnomalies = [...selfAnomalies, ...passiveAnomalies].filter((a: any) => {
                        const name = String(a?.name ?? '').trim();
                        return name.length > 0 && name !== 'Nessuna';
                      });

                      return (
                        <div key={level.level} className="border-l-2 border-primary pl-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Livello {level.level}</span>
                            {spell.current_level === level.level && (
                              <Badge variant="default" className="text-xs">Corrente</Badge>
                            )}
                          </div>

                          {/* Mana */}
                          {showMana && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Costo Mana:</span> {n(level.mana_cost)}
                            </div>
                          )}

                          {/* PA */}
                          {showPA && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Costo PA:</span> {n(level.action_cost)}
                              {showIndicative ? ` (indicativo: ${n(level.indicative_action_cost)})` : ''}
                            </div>
                          )}

                          {/* Durata */}
                          {hasText(level.duration) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Durata:</span> {level.duration}
                            </div>
                          )}

                          {/* Raggio */}
                          {hasText(level.range) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Raggio:</span> {level.range}
                            </div>
                          )}

                          {/* Effetto Speciale */}
                          {hasText(level.special_effect) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Effetto Speciale:</span> {level.special_effect}
                            </div>
                          )}

                          {consumeSpecifics.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Specifiche consumate:</span>
                              <div className="ml-2">
                                {consumeSpecifics.map((s: any, i: number) => (
                                  <div key={`${String(s?.id || s?.name || i)}`}>• {String(s?.name || s?.id || 'Specifica')}: {n(s?.value ?? 0)}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {generateSpecifics.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Specifiche generate:</span>
                              <div className="ml-2">
                                {generateSpecifics.map((s: any, i: number) => (
                                  <div key={`${String(s?.id || s?.name || i)}`}>• {String(s?.name || s?.id || 'Specifica')}: {n(s?.value ?? 0)}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {passiveCustomSpecifics.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Specifiche sbloccate:</span>
                              <div className="ml-2">
                                {passiveCustomSpecifics.map((s: any, i: number) => (
                                  <div key={`${String(s?.id || s?.name || i)}`}>• {String(s?.name || s?.id || 'Specifica')}: {n(s?.max ?? 0)}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Anomalie */}
                          {anomalies.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Anomalie applicate ai bersagli:</span>
                              <div className="ml-2 flex flex-wrap gap-x-2 gap-y-1">
                                {anomalies.map((a, i) => (
                                  <Button
                                    key={`${a.type}-${i}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs rounded-full"
                                    onClick={() => openAnomaly({ name: a.type, percentage: a.percentage })}
                                  >
                                    {a.type} ({a.percentage}%)
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {appliedAnomalies.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Anomalie applicate al lanciatore:</span>
                              <div className="ml-2 flex flex-wrap gap-x-2 gap-y-1">
                                {appliedAnomalies.map((a: any, i: number) => (
                                  <Button
                                    key={`${String(a?.id ?? a?.name ?? i)}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs rounded-full"
                                    onClick={() => openAnomaly(a)}
                                  >
                                    {String(a?.name ?? 'Anomalia').trim() || 'Anomalia'}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Danni per tipo */}
                          {Array.isArray(level.damage_values) && level.damage_values.some(dv => (gt0(dv.guaranteed_damage) || gt0(dv.additional_damage))) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Danni per tipo:</span>
                              <div className="ml-2">
                                {level.damage_values
                                  .filter(dv => (gt0(dv.guaranteed_damage) || gt0(dv.additional_damage)))
                                  .map((dv, i) => (
                                    <div key={i}>• {(dv.typeName?.trim() || 'Tipo')}:{gt0(dv.guaranteed_damage) ? ` assicurato ${n(dv.guaranteed_damage)}` : ''}{gt0(dv.additional_damage) ? `${gt0(dv.guaranteed_damage) ? ',' : ''} aggiuntivo ${n(dv.additional_damage)}` : ''}</div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const everyHp = Number((level as any)?.less_health_more_damage_every_hp ?? (level as any)?.lessHealthMoreDamageEveryHp ?? 0) || 0;
                            const rows = Array.isArray((level as any)?.damage_values) ? (level as any).damage_values : [];
                            const incRows = rows.filter((dv: any) => gt0(dv?.less_health_more_damage_guaranteed_increment) || gt0(dv?.less_health_more_damage_additional_increment));
                            if (!(everyHp > 0 && incRows.length > 0)) return null;
                            return (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Salute mancante:</span>
                                <div className="ml-2">
                                  {incRows.map((dv: any, i: number) => (
                                    <div key={`mh-${i}`}>
                                      • {(dv.typeName?.trim() || dv.name || 'Tipo')} ogni {everyHp} HP:{gt0(dv?.less_health_more_damage_guaranteed_increment) ? ` +${n(dv.less_health_more_damage_guaranteed_increment)} garantiti` : ''}{gt0(dv?.less_health_more_damage_additional_increment) ? `${gt0(dv?.less_health_more_damage_guaranteed_increment) ? ',' : ''} +${n(dv.less_health_more_damage_additional_increment)} addizionali` : ''}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {Array.isArray((level as any).percentage_damage_values) && (level as any).percentage_damage_values.some((dv: any) => (gt0(dv.guaranteed_percentage_damage) || gt0(dv.additional_percentage_damage))) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Danni percentuali:</span>
                              <div className="ml-2">
                                {(level as any).percentage_damage_values
                                  .filter((dv: any) => (gt0(dv.guaranteed_percentage_damage) || gt0(dv.additional_percentage_damage)))
                                  .map((dv: any, i: number) => (
                                    <div key={i}>• {(dv.typeName?.trim() || 'Tipo')}:{gt0(dv.guaranteed_percentage_damage) ? ` assicurato ${n(dv.guaranteed_percentage_damage)}%` : ''}{gt0(dv.additional_percentage_damage) ? `${gt0(dv.guaranteed_percentage_damage) ? ',' : ''} aggiuntivo ${n(dv.additional_percentage_damage)}%` : ''}</div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const selfSets = Array.isArray(level?.self?.damage_sets)
                              ? (level as any).self.damage_sets
                              : (Array.isArray(level?.self_damage_sets) ? level.self_damage_sets : []);
                            const hasLegacy = !!level.self_damage_enabled || !!level.self_effect_enabled || gt0(level.self_damage) || hasText(level.self_damage_effect);
                            if (!(Array.isArray(selfSets) && selfSets.length > 0) && !hasLegacy) return null;
                            return (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Danni su utilizzatore (self):</span>
                                <div className="ml-2">
                                  {Array.isArray(selfSets) && selfSets.length > 0 ? (
                                    (selfSets as any[]).map((s: any, i: number) => (
                                      <div key={i}>
                                        • {hasText(s?.effect_name) ? s.effect_name : 'Effetto'}:{gt0(s?.guaranteed_damage) ? ` assicurato ${n(s.guaranteed_damage)}` : ''}{gt0(s?.max_damage) ? `${gt0(s?.guaranteed_damage) ? ',' : ''} aggiuntivo ${n(s.max_damage)}` : ''}
                                      </div>
                                    ))
                                  ) : (
                                    <div>
                                      • {hasText(level.self_damage_effect) ? level.self_damage_effect : 'Effetto'}{gt0(level.self_damage) ? `: assicurato ${n(level.self_damage)}` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Forma del danno */}
                          {level.damage_shape && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Forma del danno:</span> {level.damage_shape === 'area' ? 'Area' : level.damage_shape === 'cone' ? 'Cono' : level.damage_shape === 'chain' ? 'Catena' : 'Singolo'}
                            </div>
                          )}
                          {(level.damage_shape === 'area' || level.damage_shape === 'cone') && gt0(level.area_or_cone_value) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Valore:</span> {n(level.area_or_cone_value)}
                            </div>
                          )}
                          {level.damage_shape === 'chain' && gt0(level.chain_targets) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Bersagli in catena:</span> {n(level.chain_targets)}
                            </div>
                          )}

                          {/* Danni al secondo */}
                          {(gt0(level.max_seconds) || gt0(level.pa_cost_per_second) || gt0(level.increasing_damage_per_second)) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Danni al secondo:</span>
                              <div className="ml-2">
                                {gt0(level.max_seconds) && (<div>• Max secondi: {n(level.max_seconds)}</div>)}
                                {gt0(level.pa_cost_per_second) && (<div>• Costo PA/sec: {n(level.pa_cost_per_second)}</div>)}
                                {gt0(level.increasing_damage_per_second) && (<div>• Danno crescente/sec: {n(level.increasing_damage_per_second)}</div>)}
                              </div>
                            </div>
                          )}

                          {/* Tiri multipli */}
                          {(gt0(level.max_projectiles) || gt0(level.increasing_damage_per_projectile)) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Tiri multipli:</span>
                              <div className="ml-2">
                                {gt0(level.max_projectiles) && (<div>• Proiettili massimi: {n(level.max_projectiles)}</div>)}
                                {gt0(level.increasing_damage_per_projectile) && (<div>• Danno crescente/proiettile: {n(level.increasing_damage_per_projectile)}</div>)}
                              </div>
                            </div>
                          )}

                          {/* Flag e durate */}
                          {level.conditional_additional_damage && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Danno aggiuntivo condizionale:</span> Sì
                            </div>
                          )}
                          {gt0(level.turn_duration_rounds) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Durata in turni:</span> {n(level.turn_duration_rounds)}
                            </div>
                          )}
                          {gt0((level as any).usage_interval_turns) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Intervallo di utilizzo (turni):</span> {n((level as any).usage_interval_turns)}
                            </div>
                          )}
                          {(() => {
                            const enabled = !!(((level as any).usage_every_n_turns_enabled ?? (spell as any).usage_every_n_turns_enabled) as any);
                            const turns = n(((level as any).usage_every_n_turns ?? (spell as any).usage_every_n_turns) as any);
                            if (!enabled || turns <= 0) return null;
                            return (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Utilizzo ogni N turni:</span> {turns}
                              </div>
                            );
                          })()}
                          {gt0((level as any).max_uses_per_turn ?? (level as any).maxUsesPerTurn) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Massimi utilizzi per turno:</span> {n((level as any).max_uses_per_turn ?? (level as any).maxUsesPerTurn)}
                            </div>
                          )}
                          {gt0((level as any).max_targets) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Bersagli massimi:</span> {n((level as any).max_targets)}
                            </div>
                          )}
                          {gt0((level as any).max_multiple_attacks) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Attacchi multipli massimi:</span> {n((level as any).max_multiple_attacks)}
                            </div>
                          )}
                          {gt0((level as any).min_success_percentage) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Percentuale di successo minima:</span> {n((level as any).min_success_percentage)}%
                            </div>
                          )}
                          {gt0((level as any).extra_action_cost) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Costo azione extra:</span> {n((level as any).extra_action_cost)}{hasText((level as any).extra_cost_effect_name) ? ` • Effetto: ${(level as any).extra_cost_effect_name}` : ''}
                            </div>
                          )}

                          {/* Evocazione */}
                          {level.evocation_enabled && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Evocazione:</span>
                              <div className="ml-2">
                                {level.evocation_type === 'weapon' && (
                                  <div className="ml-2">
                                    {hasText(level.weapon_description) && (<div>• Descrizione: {level.weapon_description}</div>)}
                                    {hasText(level.weapon_subtype) && (<div>• Sottotipo: {level.weapon_subtype}</div>)}
                                    {gt0(level.weapon_weight) && (<div>• Peso: {n(level.weapon_weight)}</div>)}
                                    {Array.isArray(level.weapon_stats) && level.weapon_stats.length > 0 && (
                                      <div>
                                        <span>• Statistiche:</span>
                                        <div className="ml-2 grid grid-cols-2 gap-x-3 gap-y-1">
                                          {level.weapon_stats.map((s: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <span className="font-medium">{prettyStatLabel(String(s?.statKey ?? ''))}</span>
                                              <span>{n(s?.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {Array.isArray(level.weapon_damage_sets) && level.weapon_damage_sets.length > 0 && (
                                      <div>
                                        <span>• Set di danno:</span>
                                        <div className="ml-2">
                                          {level.weapon_damage_sets.map((ds: any, i: number) => (
                                            (() => {
                                              const name = ds?.effect_name?.trim?.() || null;
                                              const dv = (v: unknown) => Number(v ?? 0);
                                              const lv = dv(ds?.damage_veloce);
                                              const hv = dv(ds?.damage_pesante);
                                              const tv = dv(ds?.damage_affondo);
                                              const clv = dv(ds?.calculated_damage_veloce) || (lv > 0 ? Math.floor(lv * 0.33) : 0);
                                              const chv = dv(ds?.calculated_damage_pesante) || (hv > 0 ? Math.floor(hv * 0.33) : 0);
                                              const ctv = dv(ds?.calculated_damage_affondo) || (tv > 0 ? Math.floor(tv * 0.33) : 0);
                                              if (!name && lv <= 0 && hv <= 0 && tv <= 0) return null;
                                              return (
                                                <div key={i}>
                                                  {(name || lv > 0 || hv > 0 || tv > 0) && (
                                                    <div>
                                                      {name ? `${name}: ` : ''}
                                                      {lv > 0 ? `Veloce ${lv} (Calcolato ${clv})` : ''}
                                                      {lv > 0 && (hv > 0 || tv > 0) ? ' | ' : ''}
                                                      {hv > 0 ? `Pesante ${hv} (Calcolato ${chv})` : ''}
                                                      {hv > 0 && tv > 0 ? ' | ' : ''}
                                                      {tv > 0 ? `Affondo ${tv} (Calcolato ${ctv})` : ''}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {anomalies.length > 0 && (
                                      <div>
                                        <span>• Anomalie per le armi:</span>
                                        <div className="ml-2">
                                          {anomalies.map((a, i) => (
                                            <div key={i}>• {a.type}: {a.percentage}%</div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {level.evocation_type === 'replica' && (
                                  <div className="ml-2">
                                    {gt0(level.max_replicas) && (<div>• Massimo repliche: {n(level.max_replicas)}</div>)}
                                    {hasText(level.replica_source_character_id) && (<div>• Sorgente: {level.replica_source_character_id}</div>)}
                                  </div>
                                )}
                                {level.evocation_type === 'energy' && (
                                  <div className="ml-2">
                                    {gt0(level.energy_health) && (<div>• Salute: {n(level.energy_health)}</div>)}
                                    {gt0(level.energy_action_points) && (<div>• PA: {n(level.energy_action_points)}</div>)}
                                    {gt0(level.energy_armour) && (<div>• Armatura: {n(level.energy_armour)}</div>)}
                                    {Array.isArray(level.energy_stats) && level.energy_stats.length > 0 && (
                                      <div>
                                        <span>• Statistiche:</span>
                                        <div className="ml-2 grid grid-cols-2 gap-x-3 gap-y-1">
                                          {level.energy_stats.map((s: any, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <span className="font-medium">{prettyStatLabel(s.statKey)}</span>
                                              <span>{n(s.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {Array.isArray(level.energy_embedded_refs) && level.energy_embedded_refs.length > 0 && (
                                      <div>
                                        <span>• Magie:</span>
                                        <div className="ml-2">
                                          {level.energy_embedded_refs.map((r: any, i) => (
                                            (() => {
                                              const name = (r?.refName ?? r?.name ?? null);
                                              const lvl = (r?.refLevel ?? r?.level ?? null);
                                              if (!name && !lvl) return null;
                                              return (
                                                <div key={i}>{name ?? 'Magia'}{lvl ? ` (Livello ${lvl})` : ''}</div>
                                              );
                                            })()
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {level.equipment && (() => {
                                      const eq: any = level.equipment;
                                      const data: any = eq?.data || {};
                                      const statsEntries = Object.entries(eq?.stats || {}).filter(([, v]) => Number(v || 0) !== 0);
                                      const leftStats = statsEntries.slice(0, 4);
                                      const rightStats = statsEntries.slice(4, 7);
                                      const dmgSets: any[] = Array.isArray(data?.damage_sets) ? data.damage_sets : [];
                                      const hasFallbackDamage = (Number(eq?.damageVeloce || 0) + Number(eq?.damagePesante || 0) + Number(eq?.damageAffondo || 0)) > 0;

                                      const calcOr = (value?: number) => Number(value || 0);
                                      const assure = (base?: number, calculated?: number) => (calculated ?? Math.floor(calcOr(base) * 0.33));

                                      return (
                                        <div className="mt-2 space-y-2">
                                          <div className="text-sm"><span className="font-medium">Nome equipaggiamento:</span> {eq?.name ?? '—'}</div>
                                          <div className="text-sm"><span className="font-medium">Tipo:</span> {eq?.type ?? '—'}</div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="text-sm"><span className="font-medium">Categoria:</span> {data?.weapon_type_category ?? '—'}</div>
                                            <div className="text-sm"><span className="font-medium">Tipo arma:</span> {data?.weapon_type_name ?? '—'}</div>
                                            <div className="text-sm"><span className="font-medium">Sottotipo:</span> {eq?.subtype ?? data?.weapon_subtype_detail ?? '—'}</div>
                                            <div className="text-sm"><span className="font-medium">Materiale:</span> {data?.material_name ?? '—'}</div>
                                            <div className="text-sm"><span className="font-medium">Peso:</span> {typeof eq?.weight === 'number' ? eq.weight : '—'}</div>
                                          </div>

                                          {(dmgSets.length > 0 || hasFallbackDamage) && (
                                            <div className="space-y-2">
                                              <div className="font-medium">Set danni</div>
                                              {dmgSets.length > 0 ? (
                                                <div className="space-y-1">
                                                  {dmgSets.map((set: any, i: number) => (
                                                    <div key={i} className="space-y-0.5">
                                                      {set?.effect_name && (
                                                        <div className="text-sm"><span className="font-medium">Tipo di danno:</span> {set.effect_name}</div>
                                                      )}
                                                      {calcOr(set?.damage_veloce) > 0 && (
                                                        <div className="text-sm">Veloce: {calcOr(set.damage_veloce)} (Calcolato: {assure(set.damage_veloce, set?.calculated_damage_veloce)})</div>
                                                      )}
                                                      {calcOr(set?.damage_pesante) > 0 && (
                                                        <div className="text-sm">Pesante: {calcOr(set.damage_pesante)} (Calcolato: {assure(set.damage_pesante, set?.calculated_damage_pesante)})</div>
                                                      )}
                                                      {calcOr(set?.damage_affondo) > 0 && (
                                                        <div className="text-sm">Affondo: {calcOr(set.damage_affondo)} (Calcolato: {assure(set.damage_affondo, set?.calculated_damage_affondo)})</div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="space-y-0.5">
                                                  {calcOr(eq?.damageVeloce) > 0 && (
                                                    <div className="text-sm">Veloce: {calcOr(eq.damageVeloce)} (Calcolato: {assure(eq.damageVeloce, eq?.calculatedDamageVeloce)})</div>
                                                  )}
                                                  {calcOr(eq?.damagePesante) > 0 && (
                                                    <div className="text-sm">Pesante: {calcOr(eq.damagePesante)} (Calcolato: {assure(eq.damagePesante, eq?.calculatedDamagePesante)})</div>
                                                  )}
                                                  {calcOr(eq?.damageAffondo) > 0 && (
                                                    <div className="text-sm">Affondo: {calcOr(eq.damageAffondo)} (Calcolato: {assure(eq.damageAffondo, eq?.calculatedDamageAffondo)})</div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {statsEntries.length > 0 && (
                                            <div className="space-y-1">
                                              <div className="font-medium">Statistiche arma</div>
                                              <div className="grid grid-cols-7 gap-2">
                                                <div className="col-span-4 space-y-1">
                                                  {leftStats.map(([k, v], i) => (
                                                    <div key={i} className="text-sm">
                                                      <span className="font-medium">{prettyStatLabel(String(k))}:</span> {Number(v)}
                                                    </div>
                                                  ))}
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                  {rightStats.map(([k, v], i) => (
                                                    <div key={i} className="text-sm">
                                                      <span className="font-medium">{prettyStatLabel(String(k))}:</span> {Number(v)}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {((level as any).lottery_enabled || gt0((level as any).lottery_dice_faces) || gt0((level as any).lottery_numeric_choices) || (Array.isArray((level as any).lottery_correct_instances) && (level as any).lottery_correct_instances.length > 0) || (Array.isArray((level as any).lottery_wrong_instances) && (level as any).lottery_wrong_instances.length > 0)) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Lotteria:</span>
                              <div className="ml-2">
                                {((level as any).lottery_enabled) ? (<div>• Abilitata</div>) : null}
                                {gt0((level as any).lottery_dice_faces) && (<div>• Facce dado: {n((level as any).lottery_dice_faces)}</div>)}
                                {gt0((level as any).lottery_numeric_choices) && (<div>• Scelte numeriche: {n((level as any).lottery_numeric_choices)}</div>)}
                                {Array.isArray((level as any).lottery_correct_instances) && (level as any).lottery_correct_instances.length > 0 && (
                                  <div>
                                    <span>• Casi corretti:</span>
                                    <div className="ml-2">
                                      {(level as any).lottery_correct_instances.map((x: any, i: number) => (<div key={i}>{String(x)}</div>))}
                                    </div>
                                  </div>
                                )}
                                {Array.isArray((level as any).lottery_wrong_instances) && (level as any).lottery_wrong_instances.length > 0 && (
                                  <div>
                                    <span>• Casi sbagliati:</span>
                                    <div className="ml-2">
                                      {(level as any).lottery_wrong_instances.map((x: any, i: number) => (<div key={i}>{String(x)}</div>))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {hasText((level as any).level_warning) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Avvertimento:</span> {(level as any).level_warning}
                            </div>
                          )}

                          {(() => {
                            const gradesArr = Array.isArray((level as any).grades) ? ((level as any).grades as any[]) : [];
                            const hasGradesArr = gradesArr.length > 0;
                            const legacyCharged = !!((level as any).charged_attack_enabled);
                            const legacyAnyGradeEnabled = !!((level as any).grade1_enabled || (level as any).grade2_enabled || (level as any).grade3_enabled);
                            const hasLegacyGrades = legacyCharged || legacyAnyGradeEnabled
                              || gt0((level as any).grade1_guaranteed_damage) || gt0((level as any).grade1_additional_damage)
                              || gt0((level as any).grade2_guaranteed_damage) || gt0((level as any).grade2_additional_damage)
                              || gt0((level as any).grade3_guaranteed_damage) || gt0((level as any).grade3_additional_damage);

                            if (!hasGradesArr && !hasLegacyGrades) return null;

                            const legacyRows = [
                              {
                                enabled: !!(legacyCharged ? (level as any).grade1_enabled : (level as any).grade1_enabled),
                                title: hasText((level as any).grade1_title) ? String((level as any).grade1_title) : 'Grado 1',
                                guaranteed_damage: (level as any).grade1_guaranteed_damage,
                                additional_damage: (level as any).grade1_additional_damage,
                                effects: Array.isArray((level as any).grade1_effects) ? (level as any).grade1_effects : [],
                              },
                              {
                                enabled: !!(level as any).grade2_enabled,
                                title: hasText((level as any).grade2_title) ? String((level as any).grade2_title) : 'Grado 2',
                                guaranteed_damage: (level as any).grade2_guaranteed_damage,
                                additional_damage: (level as any).grade2_additional_damage,
                                effects: Array.isArray((level as any).grade2_effects) ? (level as any).grade2_effects : [],
                              },
                              {
                                enabled: !!(level as any).grade3_enabled,
                                title: hasText((level as any).grade3_title) ? String((level as any).grade3_title) : 'Grado 3',
                                guaranteed_damage: (level as any).grade3_guaranteed_damage,
                                additional_damage: (level as any).grade3_additional_damage,
                                effects: Array.isArray((level as any).grade3_effects) ? (level as any).grade3_effects : [],
                              },
                            ].filter((x) => x.enabled || gt0(x.guaranteed_damage) || gt0(x.additional_damage) || (Array.isArray(x.effects) && x.effects.length > 0));

                            return (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Gradi:</span>
                                <div className="ml-2 space-y-1">
                                  {hasGradesArr ? (
                                    gradesArr.map((g: any, i: number) => {
                                      const num = Number(g?.grade_number || 0) || (i + 2);
                                      const title = hasText(g?.title) ? String(g.title) : `Grado ${num}`;
                                      const effects = Array.isArray(g?.effects) ? g.effects : [];
                                      const damages =
                                        (gt0(g?.guaranteed_damage) || gt0(g?.additional_damage))
                                          ? ` — ${gt0(g.guaranteed_damage) ? `assicurato ${n(g.guaranteed_damage)}` : ''}${gt0(g.additional_damage) ? `${gt0(g.guaranteed_damage) ? ', ' : ''} aggiuntivo ${n(g.additional_damage)}` : ''}`
                                          : '';
                                      return (
                                        <div key={`${num}-${i}`}>
                                          <div>
                                            {title}{damages}
                                          </div>
                                          {effects.length > 0 && (
                                            <div className="ml-2">
                                              {effects.map((e: any, ei: number) => (
                                                <div key={ei}>• {String(e)}</div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    legacyRows.map((g: any, i: number) => {
                                      const effects = Array.isArray(g?.effects) ? g.effects : [];
                                      const damages =
                                        (gt0(g?.guaranteed_damage) || gt0(g?.additional_damage))
                                          ? ` — ${gt0(g.guaranteed_damage) ? `assicurato ${n(g.guaranteed_damage)}` : ''}${gt0(g.additional_damage) ? `${gt0(g.guaranteed_damage) ? ', ' : ''} aggiuntivo ${n(g.additional_damage)}` : ''}`
                                          : '';
                                      return (
                                        <div key={i}>
                                          <div>
                                            {String(g.title)}{damages}
                                          </div>
                                          {effects.length > 0 && (
                                            <div className="ml-2">
                                              {effects.map((e: any, ei: number) => (
                                                <div key={ei}>• {String(e)}</div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {((level as any).phase_attack_enabled || (Array.isArray((level as any).phases) && (level as any).phases.length > 0) || (level as any).phase1_enabled || (level as any).phase2_enabled || (level as any).phase3_enabled) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Attacco a fasi:</span>
                              <div className="ml-2">
                                {Array.isArray((level as any).phases) && (level as any).phases.length > 0 ? (
                                  <div>
                                    {((level as any).phases as any[]).map((p: any, i: number) => (
                                      <div key={i}>
                                        {(p?.name || `Fase ${i + 1}`)}{(gt0(p?.guaranteed_damage) || gt0(p?.additional_damage)) ? ` — ${gt0(p.guaranteed_damage) ? `assicurato ${n(p.guaranteed_damage)}` : ''}${gt0(p.additional_damage) ? `${gt0(p.guaranteed_damage) ? ', ' : ''} aggiuntivo ${n(p.additional_damage)}` : ''}` : ''}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {(level as any).phase1_enabled && (
                                      <div>Fase 1{(gt0((level as any).phase1_guaranteed_damage) || gt0((level as any).phase1_additional_damage)) ? ` — ${gt0((level as any).phase1_guaranteed_damage) ? `assicurato ${n((level as any).phase1_guaranteed_damage)}` : ''}${gt0((level as any).phase1_additional_damage) ? `${gt0((level as any).phase1_guaranteed_damage) ? ', ' : ''} aggiuntivo ${n((level as any).phase1_additional_damage)}` : ''}` : ''}</div>
                                    )}
                                    {(level as any).phase2_enabled && (
                                      <div>Fase 2{(gt0((level as any).phase2_guaranteed_damage) || gt0((level as any).phase2_additional_damage)) ? ` — ${gt0((level as any).phase2_guaranteed_damage) ? `assicurato ${n((level as any).phase2_guaranteed_damage)}` : ''}${gt0((level as any).phase2_additional_damage) ? `${gt0((level as any).phase2_guaranteed_damage) ? ', ' : ''} aggiuntivo ${n((level as any).phase2_additional_damage)}` : ''}` : ''}</div>
                                    )}
                                    {(level as any).phase3_enabled && (
                                      <div>Fase 3{(gt0((level as any).phase3_guaranteed_damage) || gt0((level as any).phase3_additional_damage)) ? ` — ${gt0((level as any).phase3_guaranteed_damage) ? `assicurato ${n((level as any).phase3_guaranteed_damage)}` : ''}${gt0((level as any).phase3_additional_damage) ? `${gt0((level as any).phase3_guaranteed_damage) ? ', ' : ''} aggiuntivo ${n((level as any).phase3_additional_damage)}` : ''}` : ''}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Descrizione livello */}
                          {hasText(level.level_description) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {level.level_description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Statistiche del livello corrente */}
                {spell.current_level && spell.levels && currentLevel && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Livello {spell.current_level}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {gt0(currentLevel.action_cost) && (
                          <div>
                            <span className="font-medium">Costo Azione:</span>
                            <span className="ml-2">{n(currentLevel.action_cost)}</span>
                          </div>
                        )}
                        {gt0(currentLevel.indicative_action_cost) && (
                          <div>
                            <span className="font-medium">Costo Indicativo:</span>
                            <span className="ml-2">{n(currentLevel.indicative_action_cost)}</span>
                          </div>
                        )}
                      </div>

                      {Array.isArray(currentLevel.damage_values) && currentLevel.damage_values.some(dv => (gt0(dv.guaranteed_damage) || gt0(dv.additional_damage))) && (
                        <div className="mt-3">
                          <span className="font-medium">Danni per tipo:</span>
                          <div className="mt-1 space-y-1">
                            {currentLevel.damage_values
                              .filter(dv => (gt0(dv.guaranteed_damage) || gt0(dv.additional_damage)))
                              .map((dv, i) => (
                                <div key={i} className="text-sm text-muted-foreground">
                                  {(dv.typeName?.trim() || 'Tipo')}:
                                  {gt0(dv.guaranteed_damage) ? ` assicurato ${n(dv.guaranteed_damage)}` : ''}
                                  {gt0(dv.additional_damage) ? `${gt0(dv.guaranteed_damage) ? ',' : ''} aggiuntivo ${n(dv.additional_damage)}` : ''}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const everyHp = Number((currentLevel as any)?.less_health_more_damage_every_hp ?? (currentLevel as any)?.lessHealthMoreDamageEveryHp ?? 0) || 0;
                        const rows = Array.isArray(currentLevel?.damage_values) ? currentLevel.damage_values : [];
                        const incRows = rows.filter((dv: any) => gt0(dv?.less_health_more_damage_guaranteed_increment) || gt0(dv?.less_health_more_damage_additional_increment));
                        if (!(everyHp > 0 && incRows.length > 0)) return null;
                        return (
                          <div className="mt-3">
                            <span className="font-medium">Salute mancante:</span>
                            <div className="mt-1 space-y-1">
                              {incRows.map((dv: any, i: number) => (
                                <div key={`mhc-${i}`} className="text-sm text-muted-foreground">
                                  {(dv.typeName?.trim() || dv.name || 'Tipo')} ogni {everyHp} HP:{gt0(dv?.less_health_more_damage_guaranteed_increment) ? ` +${n(dv.less_health_more_damage_guaranteed_increment)} garantiti` : ''}{gt0(dv?.less_health_more_damage_additional_increment) ? `${gt0(dv?.less_health_more_damage_guaranteed_increment) ? ',' : ''} +${n(dv.less_health_more_damage_additional_increment)} addizionali` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const selfSets = Array.isArray(currentLevel?.self?.damage_sets)
                          ? (currentLevel.self!.damage_sets as any[])
                          : (Array.isArray((currentLevel as any)?.self_damage_sets) ? (currentLevel as any).self_damage_sets as any[] : []);
                        const selfEnabled = !!(currentLevel?.self?.enabled || (currentLevel as any)?.self_damage_enabled || (currentLevel as any)?.self_effect_enabled);
                        const legacyVal = n((currentLevel as any)?.self_damage ?? 0);
                        const hasEffectText = hasText((currentLevel as any)?.self_damage_effect);
                        if (!(selfSets.length > 0 || selfEnabled || legacyVal > 0 || hasEffectText)) return null;
                        return (
                          <div className="mt-3">
                            <span className="font-medium">Danni su utilizzatore (self):</span>
                            <div className="mt-1 space-y-1">
                              {selfSets.length > 0 ? (
                                selfSets.map((s: any, i: number) => (
                                  <div key={i} className="text-sm text-muted-foreground">
                                    {(hasText(s?.effect_name) ? s.effect_name : 'Effetto')}:
                                    {((s?.mode ?? 'classic') === 'percentage') ? (
                                      <>
                                        {gt0(s?.guaranteed_percentage_damage) ? ` assicurato ${n(s.guaranteed_percentage_damage)}%` : ''}
                                        {gt0(s?.max_percentage_damage) ? `${gt0(s?.guaranteed_percentage_damage) ? ',' : ''} aggiuntivo ${n(s.max_percentage_damage)}%` : ''}
                                      </>
                                    ) : (
                                      <>
                                        {gt0(s?.guaranteed_damage) ? ` assicurato ${n(s.guaranteed_damage)}` : ''}
                                        {gt0(s?.max_damage) ? `${gt0(s?.guaranteed_damage) ? ',' : ''} aggiuntivo ${n(s.max_damage)}` : ''}
                                      </>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  {(hasEffectText ? (currentLevel as any).self_damage_effect : 'Effetto')}{legacyVal > 0 ? `: assicurato ${legacyVal}` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const anom = (currentLevel as any)?.self?.anomaly;
                        if (!anom) return null;
                        const name = (anom.name ?? '').toString().trim();
                        const desc = (anom.description ?? '').toString().trim();
                        const turns = Number(anom.turns || 0);
                        const doesDamage = !!anom.doesDamage;
                        const dmgPerTurn = Number(anom.damagePerTurn || 0);
                        const effectName = (anom.damageEffectName ?? '').toString().trim();
                        const apMod = Number(anom.actionPointsModifier || 0);
                        const hpMod = Number(anom.healthModifier || 0);
                        const statsMod = (anom.statsModifier || {}) as Record<string, number>;
                        const statsEntries = Object.entries(statsMod).filter(([_, v]) => Number(v || 0) !== 0);
                        if (!(hasText(name) || hasText(desc) || turns > 0 || doesDamage || apMod !== 0 || hpMod !== 0 || statsEntries.length > 0)) return null;
                        return (
                          <div className="mt-3">
                            <span className="font-medium">Anomalia su utilizzatore:</span>
                            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {hasText(name) && <div>Nome: {name}</div>}
                              {hasText(desc) && <div>Descrizione: {desc}</div>}
                              {turns > 0 && <div>Turni: {turns}</div>}
                              {doesDamage && (
                                <div>
                                  Danno per turno: {n(dmgPerTurn)}{hasText(effectName) ? ` (${effectName})` : ''}
                                </div>
                              )}
                              {apMod !== 0 && <div>Mod. Punti Azione: {n(apMod)}</div>}
                              {hpMod !== 0 && <div>Mod. Salute: {n(hpMod)}</div>}
                              {statsEntries.length > 0 && (
                                <div>
                                  <span>Mod. Statistiche:</span>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                                    {statsEntries.map(([k, v], i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <span className="font-medium">{prettyStatLabel(String(k))}</span>
                                        <span>{n(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {hasText(currentLevel.special_effect) && (
                        <div className="mt-3">
                          <span className="font-medium">Effetto Speciale:</span>
                          <p className="text-muted-foreground mt-1">{currentLevel.special_effect}</p>
                        </div>
                      )}

                      {hasText(currentLevel.level_description) && (
                        <div className="mt-3">
                          <span className="font-medium">Descrizione Livello:</span>
                          <p className="text-muted-foreground mt-1">{currentLevel.level_description}</p>
                        </div>
                      )}

                      {(() => {
                        const anomalies = getTargetAnomalies(currentLevel as any);

                        const isWeaponEvocation = currentLevel.evocation_enabled && currentLevel.evocation_type === 'weapon';

                        const weaponAnomaliesBlock = isWeaponEvocation && anomalies.length > 0 ? (
                          <div className="mt-3">
                            <span className="font-medium">Anomalie per le armi:</span>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                              {anomalies.map((a, i) => (
                                <Button
                                  key={`${a.type}-${i}`}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs rounded-full"
                                  onClick={() => openAnomaly({ name: a.type, percentage: a.percentage })}
                                >
                                  {a.type} ({a.percentage}%)
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : null;

                        return anomalies.length > 0 ? (
                          <div className="mt-3">
                            <span className="font-medium">Anomalie applicate ai bersagli:</span>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                              {anomalies.map((a, i) => (
                                <Button
                                  key={`${a.type}-${i}`}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs rounded-full"
                                  onClick={() => openAnomaly({ name: a.type, percentage: a.percentage })}
                                >
                                  {a.type} ({a.percentage}%)
                                </Button>
                              ))}
                            </div>
                            {weaponAnomaliesBlock}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Descrizione aggiuntiva */}
            {hasText(spell.additional_description) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Descrizione Aggiuntiva</h4>
                  <p className="text-sm">{spell.additional_description}</p>
                </div>
              </>
            )}

            {/* Storie */}
            {(hasText(spell.story_1) || hasText(spell.story_2)) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {hasText(spell.story_1) && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Storia 1</h4>
                      <p className="text-sm text-muted-foreground">{spell.story_1}</p>
                    </div>
                  )}
                  {hasText(spell.story_2) && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Storia 2</h4>
                      <p className="text-sm text-muted-foreground">{spell.story_2}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <AnomalyModal
          isOpen={isAnomalyModalOpen}
          onClose={() => setIsAnomalyModalOpen(false)}
          onSave={() => {}}
          editingAnomaly={selectedAnomaly}
          readOnly
        />
      </CardContent>
    </Card>
  );
};
