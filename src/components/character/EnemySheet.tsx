import React, { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { ScrollArea } from "../ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"

interface EnemySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enemy: any | null
}

const n = (v: unknown): number => Number(v ?? 0)
const gt0 = (v: unknown): boolean => n(v) > 0
const hasText = (v?: string | null): boolean => !!(v && v.trim().length)

const statKeyMap: { key: keyof any; label: string }[] = [
  { key: 'enemy_forza', label: 'Forza' },
  { key: 'enemy_percezione', label: 'Percezione' },
  { key: 'enemy_resistenza', label: 'Resistenza' },
  { key: 'enemy_intelletto', label: 'Intelletto' },
  { key: 'enemy_sapienza', label: 'Sapienza' },
  { key: 'enemy_anima', label: 'Anima' },
]

export default function EnemySheet({ open, onOpenChange, enemy }: EnemySheetProps) {
  const nameInitial = useMemo(() => enemy?.name?.[0]?.toUpperCase() ?? '?', [enemy?.name])

  if (!enemy) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Seleziona un nemico</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            Per visualizzare la scheda, seleziona un nemico dalla lista.
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const hpCur = n(enemy?.enemy_current_hp ?? enemy?.enemy_max_hp)
  const hpMax = n(enemy?.enemy_max_hp ?? enemy?.enemy_current_hp)
  const arCur = n(enemy?.enemy_current_armor ?? enemy?.enemy_max_armor)
  const arMax = n(enemy?.enemy_max_armor ?? enemy?.enemy_current_armor)
  const paCur = n(enemy?.enemy_current_pa ?? enemy?.enemy_max_pa)
  const paMax = n(enemy?.enemy_max_pa ?? enemy?.enemy_current_pa)

  const weapons: any[] = Array.isArray(enemy?.enemy_weapons) ? enemy.enemy_weapons : []
  const spells: any[] = Array.isArray(enemy?.enemy_spells) ? enemy.enemy_spells : []
  const abilities: any[] = Array.isArray(enemy?.enemy_abilities) ? enemy.enemy_abilities : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {/* Non abbiamo avatar per i nemici: usiamo solo il fallback */}
              <AvatarFallback>{nameInitial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-lg font-semibold">{enemy?.name ?? 'Nemico'}</span>
              {gt0(enemy?.enemy_level) && (
                <span className="text-sm text-muted-foreground">Livello {n(enemy?.enemy_level)}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[80vh]">
          <div className="space-y-6 p-6">
            {/* Barre rapide */}
            <Card>
              <CardHeader>
                <CardTitle>Stato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">Salute</span><Badge variant="secondary">{hpCur}/{hpMax}</Badge></div>
                  </div>
                  <div className="flex flex-col rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">Armatura</span><Badge variant="secondary">{arCur}/{arMax}</Badge></div>
                  </div>
                  <div className="flex flex-col rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">Punti azione</span><Badge variant="secondary">{paCur}/{paMax}</Badge></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistiche base */}
            <Card>
              <CardHeader>
                <CardTitle>Statistiche</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {statKeyMap.map(({ key, label }) => (
                    <div key={String(key)} className="flex flex-col rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{label}</span>
                        <Badge variant="secondary">{n((enemy as any)[key])}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Armi */}
            <Card>
              <CardHeader>
                <CardTitle>Armi</CardTitle>
              </CardHeader>
              <CardContent>
                {weapons.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessuna arma registrata.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {weapons.map((w, i) => (
                      <div key={i} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{w?.name ?? 'Arma'}</span>
                        </div>
                        {Array.isArray(w?.damage_sets) && w.damage_sets.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            <div className="text-xs font-medium">Set Danni</div>
                            <div className="space-y-2">
                              {w.damage_sets.map((ds: any, idx: number) => (
                                <div key={idx} className="rounded bg-muted p-2">
                                  <div className="text-xs font-medium">{ds?.effect_name || `Effetto ${idx + 1}`}</div>
                                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                                    <div className="rounded bg-background p-2 flex flex-col items-center">
                                      <span className="font-medium">Leggero</span>
                                      <span>{`d${n(ds?.damage_veloce || 0)} + ${n(ds?.calculated_damage_veloce || 0)}`}</span>
                                    </div>
                                    <div className="rounded bg-background p-2 flex flex-col items-center">
                                      <span className="font-medium">Pesante</span>
                                      <span>{`d${n(ds?.damage_pesante || 0)} + ${n(ds?.calculated_damage_pesante || 0)}`}</span>
                                    </div>
                                    <div className="rounded bg-background p-2 flex flex-col items-center">
                                      <span className="font-medium">Affondo</span>
                                      <span>{`d${n(ds?.damage_affondo || 0)} + ${n(ds?.calculated_damage_affondo || 0)}`}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded bg-muted p-2 flex flex-col items-center">
                              <span className="font-medium">Leggero</span>
                              <span>{n(w?.enemy_damage_leggero)}</span>
                            </div>
                            <div className="rounded bg-muted p-2 flex flex-col items-center">
                              <span className="font-medium">Pesante</span>
                              <span>{n(w?.enemy_damage_pesante)}</span>
                            </div>
                            <div className="rounded bg-muted p-2 flex flex-col items-center">
                              <span className="font-medium">Affondo</span>
                              <span>{n(w?.enemy_damage_affondo)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Magie */}
            <Card>
              <CardHeader>
                <CardTitle>Magie</CardTitle>
              </CardHeader>
              <CardContent>
                {spells.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessuna magia registrata.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {spells.map((sp, i) => (
                      <div key={i} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{sp?.name ?? 'Magia'}</span>
                          {gt0(sp?.current_level ?? sp?.level) && (
                            <Badge variant="outline">Lv. {n(sp?.current_level ?? sp?.level)}</Badge>
                          )}
                        </div>
                        {hasText(sp?.description) && (
                          <p className="mt-1 text-xs text-muted-foreground">{sp.description}</p>
                        )}
                        {hasText(sp?.type) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <Badge className="text-xs" variant="outline">{sp.type}</Badge>
                          </div>
                        )}
                        {(() => {
                          // Mostra danni o specifiche del livello corrente
                          const currentLevel = Array.isArray(sp?.levels)
                            ? (sp.levels.find((l: any) => n(l?.level) === n(sp?.current_level ?? sp?.level ?? 1)) || sp)
                            : sp;
                          const dmgValues: any[] = Array.isArray((currentLevel as any)?.damage_values) ? (currentLevel as any).damage_values : [];
                          const hasLegacyDamage = (gt0((currentLevel as any)?.guaranteed_damage) || gt0((currentLevel as any)?.additional_damage));
                          const hasAnyDamage = (Array.isArray(dmgValues) && dmgValues.length > 0) || hasLegacyDamage;
                          const showPA = gt0((currentLevel as any)?.action_cost);
                          const showIndicative = gt0((currentLevel as any)?.indicative_action_cost);
                          const showDuration = hasText((currentLevel as any)?.duration);
                          const showRange = hasText((currentLevel as any)?.range);
                          const showTurnDuration = gt0((currentLevel as any)?.turn_duration_rounds);
                          if (!(hasAnyDamage || showPA || showIndicative || showDuration || showRange || showTurnDuration)) return null;
                          return (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {hasAnyDamage && (
                                <div className="mb-1">
                                  <span className="font-medium">Danni:</span>
                                  <div className="ml-2 space-y-0.5">
                                    {Array.isArray(dmgValues) && dmgValues.length > 0 ? (
                                      dmgValues.map((d: any, di: number) => {
                                        const label = (d?.effect_name ?? d?.typeName ?? '').trim();
                                        const gd = n(d?.guaranteed_damage);
                                        const ad = n(d?.additional_damage);
                                        return (
                                          <div key={di}>• {label || `Effetto ${di + 1}`}: {gd} (garantiti){gt0(ad) ? `, ${ad} (addizionali)` : ''}</div>
                                        );
                                      })
                                    ) : (
                                      <div>
                                        {gt0((currentLevel as any)?.guaranteed_damage) && (
                                          <div>• Garantiti: {n((currentLevel as any)?.guaranteed_damage)}</div>
                                        )}
                                        {gt0((currentLevel as any)?.additional_damage) && (
                                          <div>• Addizionali: {n((currentLevel as any)?.additional_damage)}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {(showPA || showIndicative || showDuration || showRange || showTurnDuration) && (
                                <div>
                                  <span className="font-medium">Specifiche:</span>
                                  <div className="ml-2 space-y-0.5">
                                    {showPA && (<div>• Costo PA: {n((currentLevel as any)?.action_cost)}</div>)}
                                    {showIndicative && (<div>• PA indicativi: {n((currentLevel as any)?.indicative_action_cost)}</div>)}
                                    {showDuration && (<div>• Durata: {(currentLevel as any)?.duration}</div>)}
                                    {showRange && (<div>• Raggio: {(currentLevel as any)?.range}</div>)}
                                    {showTurnDuration && (<div>• Durata in turni: {n((currentLevel as any)?.turn_duration_rounds)}</div>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {/* Mostriamo solo il livello corrente della magia, niente elenco livelli */}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Abilità */}
            <Card>
              <CardHeader>
                <CardTitle>Abilità</CardTitle>
              </CardHeader>
              <CardContent>
                {abilities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessuna abilità registrata.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {abilities.map((ab, i) => (
                      <div key={i} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{ab?.name ?? 'Abilità'}</span>
                          <div className="flex items-center gap-1">
                            {hasText(ab?.category) && <Badge variant="outline">{ab.category}</Badge>}
                            {gt0(ab?.current_level ?? ab?.level) && (
                              <Badge variant="outline">Lv. {n(ab?.current_level ?? ab?.level)}</Badge>
                            )}
                          </div>
                        </div>
                        {hasText(ab?.description) && (
                          <p className="mt-1 text-xs text-muted-foreground">{ab.description}</p>
                        )}
                        {(() => {
                          // Mostra solo il livello corrente dell'abilità
                          const currentLevel = Array.isArray(ab?.levels)
                            ? (ab.levels.find((l: any) => n(l?.level) === n(ab?.current_level ?? ab?.level ?? 1)) || ab)
                            : ab;

                          const dmgValues: any[] = Array.isArray((currentLevel as any)?.damage_values) ? (currentLevel as any).damage_values : [];
                          const hasLegacyDamage = (
                            gt0((currentLevel as any)?.danno_assicurato) ||
                            gt0((currentLevel as any)?.danno_aggiuntivo) ||
                            gt0((currentLevel as any)?.guaranteed_damage) ||
                            gt0((currentLevel as any)?.additional_damage)
                          );
                          const hasAnyDamage = (Array.isArray(dmgValues) && dmgValues.length > 0) || hasLegacyDamage;
                          const showPA = gt0((currentLevel as any)?.punti_azione ?? (currentLevel as any)?.action_cost);
                          const showIndicative = gt0((currentLevel as any)?.punti_azione_indicativi ?? (currentLevel as any)?.indicative_action_cost);
                          const showTurnDuration = gt0((currentLevel as any)?.turn_duration_rounds);
                          const showMaxTargets = gt0((currentLevel as any)?.max_targets);
                          const showUsageInterval = gt0((currentLevel as any)?.usage_interval_turns);
                          if (!(hasAnyDamage || showPA || showIndicative || showTurnDuration || showMaxTargets || showUsageInterval)) return null;
                          return (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {hasAnyDamage && (
                                <div className="mb-1">
                                  <span className="font-medium">Danni:</span>
                                  <div className="ml-2 space-y-0.5">
                                    {Array.isArray(dmgValues) && dmgValues.length > 0 ? (
                                      dmgValues.map((d: any, di: number) => {
                                        const label = (d?.effect_name ?? d?.typeName ?? '').trim();
                                        const gd = n(d?.guaranteed_damage);
                                        const ad = n(d?.additional_damage);
                                        return (
                                          <div key={di}>• {label || `Effetto ${di + 1}`}: {gd} (garantiti){gt0(ad) ? `, ${ad} (addizionali)` : ''}</div>
                                        );
                                      })
                                    ) : (
                                      <div>
                                        {gt0((currentLevel as any)?.danno_assicurato ?? (currentLevel as any)?.guaranteed_damage) && (
                                          <div>• Garantiti: {n((currentLevel as any)?.danno_assicurato ?? (currentLevel as any)?.guaranteed_damage)}</div>
                                        )}
                                        {gt0((currentLevel as any)?.danno_aggiuntivo ?? (currentLevel as any)?.additional_damage) && (
                                          <div>• Addizionali: {n((currentLevel as any)?.danno_aggiuntivo ?? (currentLevel as any)?.additional_damage)}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {(showPA || showIndicative || showTurnDuration || showMaxTargets || showUsageInterval) && (
                                <div>
                                  <span className="font-medium">Specifiche:</span>
                                  <div className="ml-2 space-y-0.5">
                                    {showPA && (<div>• Costo PA: {n((currentLevel as any)?.punti_azione ?? (currentLevel as any)?.action_cost)}</div>)}
                                    {showIndicative && (<div>• PA indicativi: {n((currentLevel as any)?.punti_azione_indicativi ?? (currentLevel as any)?.indicative_action_cost)}</div>)}
                                    {showTurnDuration && (<div>• Durata in turni: {n((currentLevel as any)?.turn_duration_rounds)}</div>)}
                                    {showMaxTargets && (<div>• Max bersagli: {n((currentLevel as any)?.max_targets)}</div>)}
                                    {showUsageInterval && (<div>• Intervallo utilizzo (turni): {n((currentLevel as any)?.usage_interval_turns)}</div>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}