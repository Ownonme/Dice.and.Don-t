import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AnomalyModal from '@/components/character/modals/AnomalyModal';
import { StatusAnomaly } from '@/types/character';

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim().replace(',', '.');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};

const gt0 = (v: unknown): boolean => toNum(v) > 0;

const hasText = (v: unknown): boolean => String(v ?? '').trim().length > 0;

interface AbilityLevel {
  level: number;
  danno_assicurato?: number;
  danno_aggiuntivo?: number;
  punti_azione?: number;
  punti_azione_indicativi?: number;
  action_cost?: number | string | null;
  indicative_action_cost?: number | string | null;
  special_effect?: string | null;
  level_description?: string | null;
  max_uses_per_turn?: number;
  self_effect_enabled?: boolean;
  self_damage_sets?: { effect_name?: string | null; guaranteed_damage?: number | string | null; max_damage?: number | string | null }[];
  damage_values?: { typeName?: string; name?: string; guaranteed_damage?: number | string | null; additional_damage?: number | string | null }[];
  percentage_damage_values?: { typeName?: string; name?: string; guaranteed_percentage_damage?: number | string | null; additional_percentage_damage?: number | string | null }[];
}

interface Ability {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string;
  grade: string;
  description: string;
  additional_description?: string;
  story1?: string;
  story2?: string;
  levels: AbilityLevel[];
  created_by: string;
  created_at: string;
}

interface AbilityDetailsProps {
  ability: Ability | null;
  onEdit?: (ability: Ability) => void;
  onDelete?: (abilityId: string) => void;
  hideHeader?: boolean;
  scrollAreaClassName?: string;
}

export const AbilityDetails = ({ ability, onEdit, onDelete, hideHeader, scrollAreaClassName }: AbilityDetailsProps) => {
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<StatusAnomaly | null>(null);

  const openAnomaly = (a: any) => {
    if (!a) return;
    const name = String(a?.name ?? 'Anomalia').trim() || 'Anomalia';
    setSelectedAnomaly({ ...a, name } as StatusAnomaly);
    setIsAnomalyModalOpen(true);
  };

  const getTargetAnomalies = (level: any): Array<{ type: string; percentage: number }> => {
    const triplet = [
      { percentage: toNum(level?.anomaly1_percentage), type: String(level?.anomaly1_type ?? '').trim() },
      { percentage: toNum(level?.anomaly2_percentage), type: String(level?.anomaly2_type ?? '').trim() },
      { percentage: toNum(level?.anomaly3_percentage), type: String(level?.anomaly3_type ?? '').trim() },
    ].filter((a) => a.percentage > 0 && a.type && a.type !== 'Nessuna');
    if (triplet.length > 0) return triplet;

    const list: any[] = Array.isArray(level?.target_anomalies)
      ? level.target_anomalies
      : (Array.isArray(level?.targetAnomalies) ? level.targetAnomalies : (Array.isArray(level?.anomalies) ? level.anomalies : []));

    const mapped = (Array.isArray(list) ? list : [])
      .map((a: any) => {
        if (typeof a === 'string') {
          return { type: a.trim(), percentage: 0 };
        }
        const type = String(a?.type ?? a?.name ?? '').trim();
        const percentage = toNum(a?.percentage ?? a?.probability ?? a?.chance ?? 0);
        return { type, percentage };
      })
      .filter((a) => a.type && a.type !== 'Nessuna' && (a.percentage > 0 || (a.percentage === 0 && (list.length > 0))));

    return mapped;
  };

  if (!ability) {
    return (
      <Card className="h-full">
        {!hideHeader && (
          <CardHeader>
            <CardTitle>Dettagli Abilità</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Seleziona un'abilità per visualizzare i dettagli
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      {!hideHeader && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{ability.name}</span>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(ability)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(ability.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className={scrollAreaClassName || "h-[calc(100vh-200px)]"}>
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex gap-2">
              <Badge variant="secondary">{ability.type}</Badge>
              <Badge variant="outline">{ability.grade}</Badge>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-sm">Categoria</h4>
                <p className="text-sm text-muted-foreground">{ability.category}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Sottocategoria</h4>
                <p className="text-sm text-muted-foreground">{ability.subcategory}</p>
              </div>
            </div>

            <Separator />

            {/* Descrizione */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Descrizione</h4>
              <p className="text-sm">{ability.description}</p>
            </div>

            {ability.levels && ability.levels.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-3">Livelli</h4>
                  <div className="space-y-3">
                    {ability.levels.map((level) => (
                      <div key={level.level} className="border-l-2 border-primary pl-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Livello {level.level}</span>
                        </div>

                        {(() => {
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
                          if (appliedAnomalies.length === 0) return null;
                          return (
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
                          );
                        })()}

                        {(() => {
                          const anomalies = getTargetAnomalies(level as any).filter((a) => a.percentage > 0);
                          if (anomalies.length === 0) return null;
                          return (
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
                          );
                        })()}
                        
                        {(() => {
                          const vals = Array.isArray((level as any)?.damage_values) ? ((level as any).damage_values as any[]) : [];
                          const shown = vals.filter((v) => gt0(v?.guaranteed_damage) || gt0(v?.additional_damage));
                          if (shown.length === 0) return null;
                          return (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Danni per tipo:</span>
                              <div className="ml-2">
                                {shown.map((v, i) => (
                                  <div key={i}>
                                    • {String(v?.typeName || v?.name || 'Tipo')}:{gt0(v?.guaranteed_damage) ? ` assicurato ${toNum(v.guaranteed_damage)}` : ''}{gt0(v?.additional_damage) ? `${gt0(v?.guaranteed_damage) ? ',' : ''} aggiuntivo ${toNum(v.additional_damage)}` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const vals = Array.isArray((level as any)?.percentage_damage_values) ? ((level as any).percentage_damage_values as any[]) : [];
                          const shown = vals.filter((v) => gt0(v?.guaranteed_percentage_damage) || gt0(v?.additional_percentage_damage));
                          if (shown.length === 0) return null;
                          return (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Danni percentuali:</span>
                              <div className="ml-2">
                                {shown.map((v, i) => (
                                  <div key={i}>
                                    • {String(v?.typeName || v?.name || 'Tipo')}:{gt0(v?.guaranteed_percentage_damage) ? ` assicurato ${toNum(v.guaranteed_percentage_damage)}%` : ''}{gt0(v?.additional_percentage_damage) ? `${gt0(v?.guaranteed_percentage_damage) ? ',' : ''} aggiuntivo ${toNum(v.additional_percentage_damage)}%` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const gradesArr = Array.isArray((level as any)?.grades) ? ((level as any).grades as any[]) : [];
                          if (gradesArr.length === 0) return null;
                          return (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Gradi:</span>
                              <div className="ml-2 space-y-1">
                                {gradesArr.map((g: any, i: number) => {
                                  const num = Number(g?.grade_number || 0) || (i + 2);
                                  const title = hasText(g?.title) ? String(g.title) : `Grado ${num}`;
                                  const effects = Array.isArray(g?.effects) ? g.effects : [];
                                  const damages =
                                    (gt0(g?.guaranteed_damage) || gt0(g?.additional_damage))
                                      ? ` — ${gt0(g.guaranteed_damage) ? `assicurato ${toNum(g.guaranteed_damage)}` : ''}${gt0(g.additional_damage) ? `${gt0(g.guaranteed_damage) ? ', ' : ''} aggiuntivo ${toNum(g.additional_damage)}` : ''}`
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
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const phasesArr = Array.isArray((level as any)?.phases) ? ((level as any).phases as any[]) : [];
                          const enabledPhases = phasesArr.filter((p: any) => {
                            const enabled = (p?.enabled === undefined) ? true : !!p.enabled;
                            const effects = Array.isArray(p?.effects) ? p.effects : [];
                            return enabled || effects.length > 0 || gt0(p?.guaranteed_damage) || gt0(p?.additional_damage);
                          });
                          if (enabledPhases.length === 0) return null;
                          return (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Attacco a fasi:</span>
                              <div className="ml-2 space-y-1">
                                {enabledPhases.map((p: any, i: number) => {
                                  const title = hasText(p?.title) ? String(p.title) : (hasText(p?.name) ? String(p.name) : `Fase ${i + 1}`);
                                  const effects = Array.isArray(p?.effects) ? p.effects : [];
                                  const damages =
                                    (gt0(p?.guaranteed_damage) || gt0(p?.additional_damage))
                                      ? ` — ${gt0(p.guaranteed_damage) ? `assicurato ${toNum(p.guaranteed_damage)}` : ''}${gt0(p.additional_damage) ? `${gt0(p.guaranteed_damage) ? ', ' : ''} aggiuntivo ${toNum(p.additional_damage)}` : ''}`
                                      : '';
                                  return (
                                    <div key={i}>
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
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Danni su utilizzatore (self) - mostra set con assicurato/aggiuntivo */}
                        {Array.isArray(level.self_damage_sets) && level.self_damage_sets.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Danni su utilizzatore (self):</span>
                            <div className="ml-2">
                              {level.self_damage_sets.map((s, i) => (
                                <div key={i}>
                                  • {(s?.effect_name ? s.effect_name : 'Effetto')}:{Number(s?.guaranteed_damage || 0) > 0 ? ` assicurato ${Number(s!.guaranteed_damage as any)}` : ''}{Number(s?.max_damage || 0) > 0 ? `${Number(s?.guaranteed_damage || 0) > 0 ? ',' : ''} aggiuntivo ${Number(s!.max_damage as any)}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray((level as any)?.failure_damage_sets) && (level as any).failure_damage_sets.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Danni da fallimento:</span>
                            <div className="ml-2">
                              {(level as any).failure_damage_sets.map((s: any, i: number) => (
                                <div key={i}>
                                  • {(s?.effect_name ? s.effect_name : 'Effetto')}:{Number(s?.guaranteed_damage || 0) > 0 ? ` assicurato ${Number(s?.guaranteed_damage || 0)}` : ''}{Number(s?.max_damage || 0) > 0 ? `${Number(s?.guaranteed_damage || 0) > 0 ? ',' : ''} aggiuntivo ${Number(s?.max_damage || 0)}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Costi Punti Azione - mostra solo se ci sono valori */}
                        {(gt0(level.punti_azione) || gt0(level.punti_azione_indicativi) || gt0((level as any)?.action_cost) || gt0((level as any)?.indicative_action_cost)) && (
                          <div className="text-xs text-muted-foreground">
                            {gt0(level.punti_azione) && (<span className="font-medium">Costo Punti Azione: {toNum(level.punti_azione)}</span>)}
                            {gt0((level as any)?.action_cost) && (<span className={gt0(level.punti_azione) ? "ml-2" : ""}><span className="font-medium">Costo Punti Azione:</span> {toNum((level as any).action_cost)}</span>)}
                            {gt0(level.punti_azione_indicativi) && (
                              <span className={(gt0(level.punti_azione) || gt0((level as any)?.action_cost)) ? "ml-2" : ""}>
                                <span className="font-medium">PA Indicativi:</span> {toNum(level.punti_azione_indicativi)}
                              </span>
                            )}
                            {gt0((level as any)?.indicative_action_cost) && (
                              <span className={(gt0(level.punti_azione) || gt0((level as any)?.action_cost) || gt0(level.punti_azione_indicativi)) ? "ml-2" : ""}>
                                <span className="font-medium">PA Indicativi:</span> {toNum((level as any).indicative_action_cost)}
                              </span>
                            )}
                          </div>
                        )}

                        {Number((level as any)?.usage_interval_turns || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Intervallo di utilizzo (turni):</span> {Number((level as any).usage_interval_turns || 0)}
                          </div>
                        )}
                        {toNum((level as any)?.max_uses_per_turn ?? (level as any)?.maxUsesPerTurn ?? 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Massimi utilizzi per turno:</span> {toNum((level as any).max_uses_per_turn ?? (level as any).maxUsesPerTurn)}
                          </div>
                        )}
                        {Number((level as any)?.max_targets || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Bersagli massimi:</span> {Number((level as any).max_targets || 0)}
                          </div>
                        )}
                        {Number((level as any)?.turn_duration_rounds || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Durata in turni:</span> {Number((level as any).turn_duration_rounds || 0)}
                          </div>
                        )}
                        {Number((level as any)?.min_success_percentage || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Percentuale di successo minima:</span> {Number((level as any).min_success_percentage || 0)}%
                          </div>
                        )}
                        {Number((level as any)?.extra_action_cost || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Costo azione extra:</span> {Number((level as any).extra_action_cost || 0)}
                          </div>
                        )}
                        {((level as any)?.failure_enabled) && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Fallimento:</span> Abilitato
                          </div>
                        )}
                        {((level as any)?.self_effect_enabled) && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Effetti su utilizzatore:</span> Abilitati
                          </div>
                        )}
                        {((level as any)?.lottery_enabled) && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Lotteria:</span> Abilitata
                          </div>
                        )}
                        
                        {/* Descrizione del livello - mostra solo se presente */}
                        {hasText(level.level_description) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {String(level.level_description)}
                          </p>
                        )}
                        {((level as any)?.level_warning) && (
                          <p className="text-xs text-red-600 mt-1">
                            {(level as any).level_warning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Descrizione aggiuntiva */}
            {ability.additional_description && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Descrizione Aggiuntiva</h4>
                  <p className="text-sm">{ability.additional_description}</p>
                </div>
              </>
            )}

            {/* Storie */}
            {(ability.story1 || ability.story2) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {ability.story1 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Storia 1</h4>
                      <p className="text-sm text-muted-foreground">{ability.story1}</p>
                    </div>
                  )}
                  {ability.story2 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Storia 2</h4>
                      <p className="text-sm text-muted-foreground">{ability.story2}</p>
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
