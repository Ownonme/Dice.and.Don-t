import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
 
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  character?: any
  spellCooldowns?: Record<string, number>
  perTurnUses?: Record<string, number>
  initialSearchTerm?: string
  onConfirm?: (payload: { spell: any; level: number }) => void
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  const s = String(v ?? '').trim().replace(',', '.')
  const m = s.match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : 0
}

const hasText = (v: unknown): boolean => {
  return String(v ?? '').trim().length > 0
}

export function SpellSelectModal({ isOpen, onOpenChange, character, spellCooldowns, perTurnUses, initialSearchTerm, onConfirm }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [spells, setSpells] = useState<any[]>([])
  const [filteredSpells, setFilteredSpells] = useState<any[]>([])
  const [selectedSpell, setSelectedSpell] = useState<any | null>(null)
  

  useEffect(() => {
    if (isOpen) {
      const list = Array.isArray((character as any)?.custom_spells) ? (character as any).custom_spells : []
      setSpells(list)
      setSelectedSpell(null)

      setSearchTerm(String(initialSearchTerm ?? ''))
    }
  }, [isOpen, character, initialSearchTerm])

  useEffect(() => {
    let f = spells
    const q = searchTerm.trim().toLowerCase()
    if (q.length > 0) {
      f = f.filter(s => String(s?.name || '').toLowerCase().includes(q) || String(s?.description || '').toLowerCase().includes(q))
    }
    setFilteredSpells(f)
  }, [spells, searchTerm])

  const selectedLevelData = useMemo(() => {
    if (!selectedSpell) return null
    const levelNum = toNum((selectedSpell as any)?.current_level || (selectedSpell as any)?.levels?.[0]?.level || 1)
    const levelObj = Array.isArray((selectedSpell as any)?.levels)
      ? (selectedSpell as any).levels.find((l: any) => toNum((l as any)?.level) === levelNum) || (selectedSpell as any).levels[0]
      : selectedSpell
    return levelObj || null
  }, [selectedSpell])

  const getLevelData = (spell: any) => {
    const levelNum = toNum((spell as any)?.current_level || (spell as any)?.levels?.[0]?.level || 1)
    if (Array.isArray((spell as any)?.levels)) {
      return (spell as any).levels.find((l: any) => toNum((l as any)?.level) === levelNum) || (spell as any).levels[0] || spell
    }
    return spell
  }

  const getConsumeSpecifics = (spell: any) => {
    const lvl = getLevelData(spell)
    const fromLevel = Array.isArray((lvl as any)?.consume_custom_specifics) ? (lvl as any).consume_custom_specifics : []
    const fromSpell = Array.isArray((spell as any)?.consume_custom_specifics) ? (spell as any).consume_custom_specifics : []
    const raw = fromLevel.length > 0 ? fromLevel : fromSpell
    return raw.map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      value: toNum(r?.value ?? r?.amount ?? 0),
    })).filter((r: any) => r.value > 0 && (r.id || r.name))
  }
  const getGenerateSpecifics = (spell: any) => {
    const lvl = getLevelData(spell)
    const fromLevel = Array.isArray((lvl as any)?.generate_custom_specifics) ? (lvl as any).generate_custom_specifics : []
    const fromSpell = Array.isArray((spell as any)?.generate_custom_specifics) ? (spell as any).generate_custom_specifics : []
    const raw = fromLevel.length > 0 ? fromLevel : fromSpell
    return raw.map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      value: toNum(r?.value ?? r?.amount ?? 0),
    })).filter((r: any) => r.value > 0 && (r.id || r.name))
  }

  const canConsumeSpecifics = (spell: any) => {
    const requirements = getConsumeSpecifics(spell)
    if (requirements.length === 0) return true
    const list = Array.isArray((character as any)?.specifics) ? (character as any).specifics : []
    return requirements.every((req: any) => {
      const byId = req.id ? list.find((s: any) => String(s?.id) === req.id) : null
      const byName = !byId && req.name ? list.find((s: any) => String(s?.name || '').toLowerCase() === req.name.toLowerCase()) : null
      const item = byId || byName
      const current = toNum(item?.current ?? 0)
      return current >= req.value
    })
  }

  const getMaxUsesPerTurn = (spell: any): number => {
    try {
      const levelNum = toNum((spell as any)?.current_level || (spell as any)?.levels?.[0]?.level || 1)
      const levelObj = Array.isArray((spell as any)?.levels)
        ? (spell as any).levels.find((l: any) => toNum((l as any)?.level) === levelNum) || (spell as any).levels[0]
        : spell
      const fromLevel = toNum((levelObj as any)?.max_uses_per_turn ?? (levelObj as any)?.maxUsesPerTurn ?? 0)
      const fromSpell = toNum((spell as any)?.max_uses_per_turn ?? (spell as any)?.maxUsesPerTurn ?? 0)
      const limit = Math.max(0, Math.floor(fromLevel || fromSpell || 0))
      const flag = (spell as any)?.hasMaxUsesPerTurn ?? (spell as any)?.has_max_uses_per_turn
      const enabled = typeof flag === 'boolean' ? flag : limit > 0
      return enabled ? limit : 0
    } catch {
      return 0
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleziona Magia</DialogTitle>
          <DialogDescription>
            Cerca tra le magie del personaggio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label htmlFor="search-spell">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="search-spell" placeholder="Cerca magie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[60vh] md:h-[400px] w-full">
              {filteredSpells.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nessuna magia disponibile</div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredSpells.map(spell => {
                    const sid = String(spell.id ?? spell.name)
                    const cdTurns = toNum(spellCooldowns?.[sid] ?? 0)
                    const isBlocked = cdTurns > 0
                    const limit = getMaxUsesPerTurn(spell)
                    const usedKey = `${String((character as any)?.id ?? '')}:spell:${sid}`
                    const used = toNum((perTurnUses as any)?.[usedKey] ?? 0)
                    const isPerTurnBlocked = limit > 0 && used >= limit
                    const hasSpecifics = canConsumeSpecifics(spell)
                    const isSpecificBlocked = !hasSpecifics
                    return (
                      <Card key={sid} className={`transition-all duration-200 hover:shadow-md ${selectedSpell?.id === spell.id ? 'ring-2 ring-primary bg-primary/5 shadow-md' : 'hover:bg-muted/50'} ${isSpecificBlocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} onClick={() => { if (isSpecificBlocked) return; setSelectedSpell(spell) }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-base">{spell.name}</h3>
                                {toNum((spell as any)?.difficulty || 0) > 0 && (
                                  <Badge variant="outline" className="text-xs bg-yellow-500 text-white border-yellow-600">
                                    Diff {toNum((spell as any).difficulty || 0)}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">{spell.type || '-'}</Badge>
                                <Badge variant="outline" className="text-xs">{spell.grade || '-'}</Badge>
                                {isBlocked && (<Badge variant="secondary" className="text-xs">in recupero: {cdTurns}</Badge>)}
                                {limit > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    usi turno: {Math.max(0, Math.floor(used))}/{limit}
                                  </Badge>
                                )}
                                {isPerTurnBlocked && (<Badge variant="secondary" className="text-xs">limite turno</Badge>)}
                                {isSpecificBlocked && (<Badge variant="secondary" className="text-xs">specifiche insufficienti</Badge>)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{spell.category || '-'}</p>
                              <p className="text-sm line-clamp-2">{spell.description || ''}</p>
                              {(() => {
                                const lvl: any = getLevelData(spell)
                                const everyHp = toNum(lvl?.less_health_more_damage_every_hp ?? lvl?.lessHealthMoreDamageEveryHp ?? 0)
                                const vals = Array.isArray(lvl?.damage_values) ? lvl.damage_values : []
                                const inc = vals.filter((v: any) => toNum(v?.less_health_more_damage_guaranteed_increment ?? 0) > 0 || toNum(v?.less_health_more_damage_additional_increment ?? 0) > 0)
                                if (!(everyHp > 0 && inc.length > 0)) return null
                                return (
                                  <div className="text-xs text-muted-foreground mt-2">
                                    {inc.map((v: any, i: number) => (
                                      <div key={`mh-${i}`}>
                                        Salute mancante: {String(v?.typeName || v?.name || 'Tipo')} ogni {everyHp} HP{toNum(v?.less_health_more_damage_guaranteed_increment ?? 0) > 0 ? ` +${toNum(v.less_health_more_damage_guaranteed_increment)} garantiti` : ''}{toNum(v?.less_health_more_damage_additional_increment ?? 0) > 0 ? `${toNum(v?.less_health_more_damage_guaranteed_increment ?? 0) > 0 ? ',' : ''} +${toNum(v.less_health_more_damage_additional_increment)} addizionali` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedSpell && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Livello</Label>
                  <div className="mt-1 text-sm">{toNum((selectedSpell as any)?.current_level || (selectedSpell as any)?.levels?.[0]?.level || 1)}</div>
                  <div className="mt-3">
                    <Label>Grado</Label>
                    <div className="mt-1 text-sm">{String((selectedSpell as any)?.grade || '-')}</div>
                  </div>
                </div>
                <div>
                  <Label>Dettagli livello {toNum((selectedSpell as any)?.current_level || (selectedSpell as any)?.levels?.[0]?.level || 1)}</Label>
                  {selectedLevelData ? (
                    <div className="text-sm space-y-1 mt-1">
                      {toNum((selectedLevelData as any)?.action_cost || (selectedLevelData as any)?.punti_azione) > 0 && (
                        <div>Punti azione: {toNum((selectedLevelData as any)?.action_cost || (selectedLevelData as any)?.punti_azione)}</div>
                      )}
                      {(() => {
                        const reqs = selectedSpell ? getConsumeSpecifics(selectedSpell) : []
                        if (reqs.length === 0) return null
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Specifiche richieste</div>
                            <div className="space-y-0.5">
                              {reqs.map((r, i) => (
                                <div key={`${String(r?.id || r?.name || i)}`}>
                                  • {String(r?.name || r?.id || 'Specifica')}: {toNum(r?.value ?? 0)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const gens = selectedSpell ? getGenerateSpecifics(selectedSpell) : []
                        if (gens.length === 0) return null
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Specifiche generate</div>
                            <div className="space-y-0.5">
                              {gens.map((r, i) => (
                                <div key={`${String(r?.id || r?.name || i)}`}>
                                  • {String(r?.name || r?.id || 'Specifica')}: {toNum(r?.value ?? 0)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      {toNum((selectedLevelData as any)?.indicative_action_cost) > 0 && (
                        <div>PA indicativi: {toNum((selectedLevelData as any)?.indicative_action_cost)}</div>
                      )}
                      {hasText((selectedLevelData as any)?.duration) && (
                        <div>Durata: {String((selectedLevelData as any)?.duration)}</div>
                      )}
                      {hasText((selectedLevelData as any)?.range) && (
                        <div>Raggio: {String((selectedLevelData as any)?.range)}</div>
                      )}
                      {hasText((selectedLevelData as any)?.damage_shape) && (
                        <div>Forma del danno: {String((selectedLevelData as any)?.damage_shape)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.area_or_cone_value) > 0 && (
                        <div>Valore area/cono: {toNum((selectedLevelData as any)?.area_or_cone_value)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.chain_targets) > 0 && (
                        <div>Bersagli catena: {toNum((selectedLevelData as any)?.chain_targets)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.max_projectiles) > 0 && (
                        <div>Max proiettili: {toNum((selectedLevelData as any)?.max_projectiles)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.increasing_damage_per_projectile) > 0 && (
                        <div>Danno crescente/proiettile: {toNum((selectedLevelData as any)?.increasing_damage_per_projectile)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.max_seconds) > 0 && (
                        <div>Max secondi: {toNum((selectedLevelData as any)?.max_seconds)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.pa_cost_per_second) > 0 && (
                        <div>Costo PA/secondo: {toNum((selectedLevelData as any)?.pa_cost_per_second)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.increasing_damage_per_second) > 0 && (
                        <div>Danno crescente/secondo: {toNum((selectedLevelData as any)?.increasing_damage_per_second)}</div>
                      )}
                      {(() => {
                        const rows = Array.isArray((selectedLevelData as any)?.damage_values)
                          ? ((selectedLevelData as any).damage_values as any[])
                          : []
                        const shown = rows.filter((r) => toNum(r?.guaranteed_damage) > 0 || toNum(r?.additional_damage) > 0)
                        if (shown.length === 0) return null
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Danni per tipo</div>
                            <div className="space-y-0.5">
                              {shown.map((r, i) => (
                                <div key={i}>
                                  • {String(r?.typeName || r?.name || 'Tipo')}: {toNum(r?.guaranteed_damage)}{toNum(r?.additional_damage) > 0 ? ` + d${toNum(r?.additional_damage)}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const rows = Array.isArray((selectedLevelData as any)?.percentage_damage_values)
                          ? ((selectedLevelData as any).percentage_damage_values as any[])
                          : []
                        const shown = rows.filter((r) => toNum(r?.guaranteed_percentage_damage) > 0 || toNum(r?.additional_percentage_damage) > 0)
                        if (shown.length === 0) return null
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Danni percentuali</div>
                            <div className="space-y-0.5">
                              {shown.map((r, i) => (
                                <div key={i}>
                                  • {String(r?.typeName || r?.name || 'Tipo')}: {toNum(r?.guaranteed_percentage_damage)}%{toNum(r?.additional_percentage_damage) > 0 ? ` + ${toNum(r?.additional_percentage_damage)}%` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const level = selectedLevelData as any
                        const phasesArr = Array.isArray(level?.phases) ? (level.phases as any[]) : []
                        const legacyPhases = [
                          { enabled: !!level?.phase1_enabled, name: level?.phase1_name || 'Fase 1', guaranteed: level?.phase1_guaranteed_damage, additional: level?.phase1_additional_damage },
                          { enabled: !!level?.phase2_enabled, name: level?.phase2_name || 'Fase 2', guaranteed: level?.phase2_guaranteed_damage, additional: level?.phase2_additional_damage },
                          { enabled: !!level?.phase3_enabled, name: level?.phase3_name || 'Fase 3', guaranteed: level?.phase3_guaranteed_damage, additional: level?.phase3_additional_damage },
                        ].filter((p) => p.enabled)
                        const show = phasesArr.length > 0 || legacyPhases.length > 0 || !!level?.phase_attack_enabled
                        if (!show) return null
                        const list = phasesArr.length > 0
                          ? phasesArr.map((p, i) => ({
                            name: String(p?.title || p?.name || `Fase ${i + 1}`),
                            guaranteed: p?.guaranteed_damage,
                            additional: p?.additional_damage,
                          }))
                          : legacyPhases.map((p) => ({
                            name: String(p.name || ''),
                            guaranteed: p.guaranteed,
                            additional: p.additional,
                          }))
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Fasi</div>
                            <div className="space-y-0.5">
                              {list.map((p, i) => {
                                const g = toNum(p.guaranteed)
                                const a = toNum(p.additional)
                                const dmg = (g > 0 || a > 0) ? `: ${g}${a > 0 ? ` + d${a}` : ''}` : ''
                                return (
                                  <div key={i}>
                                    • {p.name}{dmg}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const level = selectedLevelData as any
                        const enabled = !!level?.lottery_enabled
                        const diceFaces = toNum(level?.lottery_dice_faces)
                        const choices = toNum(level?.lottery_numeric_choices)
                        const correct = Array.isArray(level?.lottery_correct_instances) ? (level.lottery_correct_instances as any[]) : []
                        const wrong = Array.isArray(level?.lottery_wrong_instances) ? (level.lottery_wrong_instances as any[]) : []
                        const show = enabled || diceFaces > 0 || choices > 0 || correct.length > 0 || wrong.length > 0
                        if (!show) return null
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Tiro tombola</div>
                            <div className="space-y-0.5">
                              <div>• Abilitata: {enabled ? 'Sì' : 'No'}</div>
                              {diceFaces > 0 && (<div>• Facce dado: d{diceFaces}</div>)}
                              {choices > 0 && (<div>• Scelte numeriche: {choices}</div>)}
                              {correct.length > 0 && (<div>• Casi corretti: {correct.map((x) => String(x)).join(', ')}</div>)}
                              {wrong.length > 0 && (<div>• Casi sbagliati: {wrong.map((x) => String(x)).join(', ')}</div>)}
                            </div>
                          </div>
                        )
                      })()}
                      {hasText((selectedLevelData as any)?.special_effect) && (
                        <div>Effetto: {String((selectedLevelData as any)?.special_effect)}</div>
                      )}
                      {((selectedLevelData as any)?.level_description) && (
                        <div>Descrizione: {(selectedLevelData as any)?.level_description}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-1">Nessun dettaglio disponibile</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          {(() => {
            const sid = String((selectedSpell as any)?.id ?? (selectedSpell as any)?.name)
            const cdTurns = Number(spellCooldowns?.[sid] ?? 0) || 0
            const limit = selectedSpell ? getMaxUsesPerTurn(selectedSpell) : 0
            const usedKey = `${String((character as any)?.id ?? '')}:spell:${sid}`
            const used = toNum((perTurnUses as any)?.[usedKey] ?? 0)
            const hasSpecifics = selectedSpell ? canConsumeSpecifics(selectedSpell) : true
            const disabled = !selectedSpell || cdTurns > 0 || (limit > 0 && used >= limit) || !hasSpecifics
            return (
              <Button onClick={() => { if (!selectedSpell || cdTurns > 0) return; if (limit > 0 && used >= limit) return; if (!hasSpecifics) return; const lvl = toNum((selectedSpell as any)?.current_level || (selectedSpell as any)?.levels?.[0]?.level || 1); onConfirm?.({ spell: selectedSpell, level: lvl }); onOpenChange(false) }} disabled={disabled}>Seleziona</Button>
            )
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SpellSelectModal
