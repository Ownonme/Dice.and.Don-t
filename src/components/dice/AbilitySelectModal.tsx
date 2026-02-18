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
  onConfirm?: (payload: { ability: any; level: number }) => void
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

export function AbilitySelectModal({ isOpen, onOpenChange, character, spellCooldowns, perTurnUses, onConfirm }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [abilities, setAbilities] = useState<any[]>([])
  const [filteredAbilities, setFilteredAbilities] = useState<any[]>([])
  const [selectedAbility, setSelectedAbility] = useState<any | null>(null)
  

  useEffect(() => {
    if (isOpen) {
      const list = Array.isArray((character as any)?.custom_abilities) ? (character as any).custom_abilities : []
      setAbilities(list)
      setSelectedAbility(null)
      
      setSearchTerm('')
    }
  }, [isOpen, character])

  useEffect(() => {
    let f = abilities
    const q = searchTerm.trim().toLowerCase()
    if (q.length > 0) {
      f = f.filter(a => String(a?.name || '').toLowerCase().includes(q) || String(a?.description || '').toLowerCase().includes(q))
    }
    setFilteredAbilities(f)
  }, [abilities, searchTerm])

  const selectedLevelData = useMemo(() => {
    if (!selectedAbility) return null
    const levelNum = toNum((selectedAbility as any)?.current_level || (selectedAbility as any)?.levels?.[0]?.level || 1)
    const levelObj = Array.isArray((selectedAbility as any)?.levels)
      ? (selectedAbility as any).levels.find((l: any) => toNum((l as any)?.level) === levelNum) || (selectedAbility as any).levels[0]
      : selectedAbility
    return levelObj || null
  }, [selectedAbility])

  const getMaxUsesPerTurn = (ability: any): number => {
    try {
      const levelNum = toNum((ability as any)?.current_level || (ability as any)?.levels?.[0]?.level || 1)
      const levelObj = Array.isArray((ability as any)?.levels)
        ? (ability as any).levels.find((l: any) => toNum((l as any)?.level) === levelNum) || (ability as any).levels[0]
        : ability
      const fromLevel = toNum((levelObj as any)?.max_uses_per_turn ?? (levelObj as any)?.maxUsesPerTurn ?? 0)
      const fromAbility = toNum((ability as any)?.max_uses_per_turn ?? (ability as any)?.maxUsesPerTurn ?? 0)
      const limit = Math.max(0, Math.floor(fromLevel || fromAbility || 0))
      const flag = (ability as any)?.hasMaxUsesPerTurn ?? (ability as any)?.has_max_uses_per_turn
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
          <DialogTitle>Seleziona Abilità</DialogTitle>
          <DialogDescription>
            Cerca tra le abilità del personaggio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label htmlFor="search-ability">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="search-ability" placeholder="Cerca abilità..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] w-full">
              {filteredAbilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nessuna abilità disponibile</div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredAbilities.map(ability => {
                    const aid = String(ability.id ?? ability.name)
                    const cdTurns = toNum((spellCooldowns as any)?.[aid] ?? 0)
                    const isBlocked = cdTurns > 0
                    const limit = getMaxUsesPerTurn(ability)
                    const usedKey = `${String((character as any)?.id ?? '')}:ability:${aid}`
                    const used = toNum((perTurnUses as any)?.[usedKey] ?? 0)
                    const isPerTurnBlocked = limit > 0 && used >= limit
                    return (
                      <Card key={aid} className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedAbility?.id === ability.id ? 'ring-2 ring-primary bg-primary/5 shadow-md' : 'hover:bg-muted/50'}`} onClick={() => { setSelectedAbility(ability) }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-base">{ability.name}</h3>
                                <Badge className="text-xs">{ability.type || '-'}</Badge>
                                <Badge variant="outline" className="text-xs">{ability.grade || '-'}</Badge>
                                {isBlocked && (<Badge variant="secondary" className="text-xs">in recupero: {cdTurns}</Badge>)}
                                {limit > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    usi turno: {Math.max(0, Math.floor(used))}/{limit}
                                  </Badge>
                                )}
                                {isPerTurnBlocked && (<Badge variant="secondary" className="text-xs">limite turno</Badge>)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{ability.category || '-'}{ability.subcategory ? ` • ${ability.subcategory}` : ''}</p>
                              <p className="text-sm line-clamp-2">{ability.description || ''}</p>
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

          {selectedAbility && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Livello</Label>
                  <div className="mt-1 text-sm">{toNum((selectedAbility as any)?.current_level || (selectedAbility as any)?.levels?.[0]?.level || 1)}</div>
                  <div className="mt-3">
                    <Label>Grado</Label>
                    <div className="mt-1 text-sm">{String((selectedAbility as any)?.grade || '-')}</div>
                  </div>
                </div>
                <div>
                  <Label>Dettagli livello {toNum((selectedAbility as any)?.current_level || (selectedAbility as any)?.levels?.[0]?.level || 1)}</Label>
                  {selectedLevelData ? (
                    <div className="text-sm space-y-1 mt-1">
                      {toNum((selectedLevelData as any)?.punti_azione || (selectedLevelData as any)?.action_cost || (selectedLevelData as any)?.punti_azione_indicativi) > 0 && (
                        <div>Punti azione: {toNum((selectedLevelData as any)?.punti_azione || (selectedLevelData as any)?.action_cost || (selectedLevelData as any)?.punti_azione_indicativi)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.punti_azione_indicativi || (selectedLevelData as any)?.indicative_action_cost) > 0 && (
                        <div>PA indicativi: {toNum((selectedLevelData as any)?.punti_azione_indicativi || (selectedLevelData as any)?.indicative_action_cost)}</div>
                      )}
                      {hasText((selectedLevelData as any)?.damage_shape) && (
                        <div>Forma del danno: {String((selectedLevelData as any)?.damage_shape)}</div>
                      )}
                      {toNum((selectedLevelData as any)?.max_projectiles || (selectedLevelData as any)?.max_multiple_attacks) > 0 && (
                        <div>Max proiettili: {toNum((selectedLevelData as any)?.max_projectiles || (selectedLevelData as any)?.max_multiple_attacks)}</div>
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
                        const gradesArr = Array.isArray(level?.grades) ? (level.grades as any[]) : []
                        if (gradesArr.length === 0) return null
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Gradi</div>
                            <div className="space-y-0.5">
                              {gradesArr.map((g: any, i: number) => {
                                const num = Number(g?.grade_number || 0) || (i + 2)
                                const title = hasText(g?.title) ? String(g.title) : `Grado ${num}`
                                const gd = toNum(g?.guaranteed_damage)
                                const ad = toNum(g?.additional_damage)
                                const dmg = (gd > 0 || ad > 0) ? `: ${gd}${ad > 0 ? ` + d${ad}` : ''}` : ''
                                const effects = Array.isArray(g?.effects) ? (g.effects as any[]) : []
                                const effectsText = effects.length > 0 ? ` — ${effects.map((e) => String(e)).join(', ')}` : ''
                                return (
                                  <div key={`${num}-${i}`}>
                                    • {title}{dmg}{effectsText}
                                  </div>
                                )
                              })}
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
                            effects: Array.isArray(p?.effects) ? (p.effects as any[]) : [],
                          }))
                          : legacyPhases.map((p) => ({
                            name: String(p.name || ''),
                            guaranteed: p.guaranteed,
                            additional: p.additional,
                            effects: [],
                          }))
                        return (
                          <div className="pt-1">
                            <div className="text-xs text-muted-foreground">Fasi</div>
                            <div className="space-y-0.5">
                              {list.map((p, i) => {
                                const gd = toNum(p.guaranteed)
                                const ad = toNum(p.additional)
                                const dmg = (gd > 0 || ad > 0) ? `: ${gd}${ad > 0 ? ` + d${ad}` : ''}` : ''
                                const effectsText = (p.effects || []).length > 0 ? ` — ${(p.effects || []).map((e) => String(e)).join(', ')}` : ''
                                return (
                                  <div key={i}>
                                    • {p.name}{dmg}{effectsText}
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
                      {((selectedLevelData as any)?.special_effect) && (
                        <div>Effetto: {(selectedLevelData as any)?.special_effect}</div>
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
            const aid = String((selectedAbility as any)?.id ?? (selectedAbility as any)?.name)
            const cdTurns = Number((spellCooldowns as any)?.[aid] ?? 0) || 0
            const limit = selectedAbility ? getMaxUsesPerTurn(selectedAbility) : 0
            const usedKey = `${String((character as any)?.id ?? '')}:ability:${aid}`
            const used = toNum((perTurnUses as any)?.[usedKey] ?? 0)
            const disabled = !selectedAbility || cdTurns > 0 || (limit > 0 && used >= limit)
            return (
              <Button onClick={() => { if (!selectedAbility || cdTurns > 0) return; if (limit > 0 && used >= limit) return; const lvl = toNum((selectedAbility as any)?.current_level || (selectedAbility as any)?.levels?.[0]?.level || 1); onConfirm?.({ ability: selectedAbility, level: lvl }); onOpenChange(false) }} disabled={disabled}>Seleziona</Button>
            )
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AbilitySelectModal
