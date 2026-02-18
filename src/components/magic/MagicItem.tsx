import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCharacters } from '@/hooks/useCharacters'
import { EditSpellLevelModal } from './EditSpellLevelModal'

interface MagicItemProps {
  spell: any
  isAdmin: boolean
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  setDetailSpell: (spell: any) => void
  setIsSpellDetailOpen: (open: boolean) => void
  // Nuove props per la selezione
  isSelected?: boolean
  onSelect?: (spell: any) => void
}

export const MagicItem = ({ spell, character, isSelected, onSelect, isAdmin, updateCharacter, characterId, setDetailSpell, setIsSpellDetailOpen }: MagicItemProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  const isFromEquipment = (spell as any)?.sourceType === 'equipment' || String((spell as any)?.id ?? '').startsWith('equip:')
  const equipmentSourceName = String((spell as any)?.sourceName ?? '').trim()
  
  const handleViewDetails = () => {
    setDetailSpell(spell)
    setIsSpellDetailOpen(true)
  }
  
  const handleDelete = async () => {
    if (!characterId) {
      toast({
        title: "Errore",
        description: "ID personaggio mancante",
        variant: "destructive"
      })
      return
    }
    
    // Aggiungi conferma prima dell'eliminazione
    if (!confirm(`Sei sicuro di voler eliminare la magia "${spell.name}"?`)) {
      return
    }
    
    try {
      const updatedSpells = character.custom_spells?.filter(
        (s: any) => s.id !== spell.id
      ) || []
      
      const updatedCharacter = {
        ...character,
        custom_spells: updatedSpells
      }
      
      // Prima aggiorna lo stato locale
      updateCharacter({ custom_spells: updatedSpells })
      
      // Poi salva nel database
      await saveCharacter(characterId, updatedCharacter)
      
      toast({
        title: "Successo",
        description: "Magia eliminata con successo"
      })
    } catch (error) {
      console.error('Errore nell\'eliminazione della magia:', error)
      
      // In caso di errore, ripristina lo stato precedente
      updateCharacter({ custom_spells: character.custom_spells })
      
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione della magia",
        variant: "destructive"
      })
    }
  }
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Attiva': return 'bg-red-100 text-red-800 border-red-200'
      case 'Passiva': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Suprema': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const n = (v: unknown): number => {
    if (typeof v === 'number') return v
    const s = String(v ?? '').trim().replace(',', '.')
    const m = s.match(/-?\d+(?:\.\d+)?/)
    return m ? parseFloat(m[0]) : 0
  }
  const gt0 = (v: unknown): boolean => n(v) > 0
  const hasText = (v?: string | null): boolean => !!(v && v.trim().length)
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
    }
    const normalized = (key || '').toString().trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
    const lowered = normalized.toLowerCase()
    if (map[lowered]) return map[lowered]
    return lowered.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  
  const handleItemClick = () => {
    if (onSelect) {
      onSelect(spell)
    }
  }
  
  // Trova il livello corrente della magia
  const currentLevel = spell.levels?.find((l: any) => l.level === spell.current_level) || spell.levels?.[0]
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-accent/15 border-primary/60 shadow-lg shadow-primary/15 ring-2 ring-primary/30'
          : 'bg-muted/30 border-border hover:bg-muted/50'
      }`}
      onClick={handleItemClick}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{spell.name}</h4>
            {Number((spell as any)?.difficulty || 0) > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-500 text-white border-yellow-600">
                Diff {Number((spell as any).difficulty || 0)}
              </Badge>
            )}
            <Badge className={getTypeColor(spell.type)}>
              {spell.type}
            </Badge>
            {spell.current_level && (
              <Badge variant="outline" className="text-xs">
                Livello {spell.current_level}
              </Badge>
            )}
            {isFromEquipment && equipmentSourceName && (
              <Badge variant="secondary" className="text-xs">
                {equipmentSourceName}
              </Badge>
            )}
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
          <p className="text-xs text-muted-foreground mb-1">
            {spell.description}
          </p>

          {/* Danni: SOLO livello attuale, sopra i PA */}
          {(() => {
            if (Array.isArray(currentLevel?.damage_values) && currentLevel.damage_values.length > 0) {
              const dmgRows = currentLevel.damage_values.filter((d: any) => gt0(d?.guaranteed_damage) || gt0(d?.additional_damage))
              if (dmgRows.length === 0) return null
              return (
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Danni:</span>
                  <div className="ml-2">
                    {dmgRows.map((d: any, i: number) => (
                      <div key={i}>
                        • {d.typeName}: {n(d.guaranteed_damage)} (garantiti){gt0(d.additional_damage) ? `, ${n(d.additional_damage)} (addizionali)` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })()}

          {(() => {
            const sets: any[] = Array.isArray(currentLevel?.self?.damage_sets)
              ? (currentLevel.self!.damage_sets as any[])
              : (Array.isArray((currentLevel as any)?.self_damage_sets) ? (currentLevel as any).self_damage_sets as any[] : [])
            const legacyEnabled = !!(currentLevel?.self?.enabled || (currentLevel as any)?.self_damage_enabled || (currentLevel as any)?.self_effect_enabled || spell?.self_damage_enabled)
            const legacyVal = n((currentLevel as any)?.self_damage ?? spell?.self_damage ?? 0)
            const hasEffectText = hasText((currentLevel as any)?.self_damage_effect)
            if (!(sets.length > 0 || legacyEnabled || legacyVal > 0 || hasEffectText)) return null
            return (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Danni su utilizzatore (self):</span>
                <div className="ml-2">
                  {sets.length > 0 ? (
                    sets.map((s: any, i: number) => (
                      <div key={i}>
                        • {hasText(s?.effect_name) ? s.effect_name : 'Effetto'}
                        {((s?.mode ?? 'classic') === 'percentage') ? (
                          <>
                            {gt0(s?.guaranteed_percentage_damage) ? `: assicurato ${n(s.guaranteed_percentage_damage)}%` : ''}
                            {gt0(s?.max_percentage_damage) ? `${gt0(s?.guaranteed_percentage_damage) ? ',' : ''} aggiuntivo ${n(s.max_percentage_damage)}%` : ''}
                          </>
                        ) : (
                          <>
                            {gt0(s?.guaranteed_damage) ? `: assicurato ${n(s.guaranteed_damage)}` : ''}
                            {gt0(s?.max_damage) ? `${gt0(s?.guaranteed_damage) ? ',' : ''} aggiuntivo ${n(s.max_damage)}` : ''}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>
                      • {hasEffectText ? (currentLevel as any)?.self_damage_effect : 'Effetto'}{legacyVal > 0 ? `: assicurato ${legacyVal}` : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
          
          {/* Evocazione: SOLO livello attuale quando attiva */}
          {currentLevel?.evocation_enabled && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Evocazione:</span>
              <div className="ml-2">
                {/* Tipo mostrato ora nel header come badge; qui manteniamo solo i dettagli */}
                {currentLevel.evocation_type === 'weapon' && (
                  <div className="ml-2">
                    {hasText(currentLevel.weapon_description) && (<div>• Descrizione: {currentLevel.weapon_description}</div>)}
                    {hasText(currentLevel.weapon_subtype) && (<div>• Sottotipo: {currentLevel.weapon_subtype}</div>)}
                    {gt0(currentLevel.weapon_weight) && (<div>• Peso: {n(currentLevel.weapon_weight)}</div>)}
                    {Array.isArray(currentLevel.weapon_stats) && currentLevel.weapon_stats.length > 0 && (
                      <div>
                        <span>• Statistiche:</span>
                        <div className="ml-2 grid grid-cols-2 gap-x-3 gap-y-1">
                          {currentLevel.weapon_stats.map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="font-medium">{prettyStatLabel(String(s?.statKey ?? ''))}</span>
                              <span>{n(s?.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(currentLevel.weapon_damage_sets) && currentLevel.weapon_damage_sets.length > 0 && (
                      <div>
                        <span>• Set di danno:</span>
                        <div className="ml-2">
                          {currentLevel.weapon_damage_sets.map((ds: any, i: number) => (
                            (() => {
                              const name = ds?.effect_name?.trim?.() || null
                              const dv = (v: unknown) => Number(v ?? 0)
                              const lv = dv(ds?.damage_veloce)
                              const hv = dv(ds?.damage_pesante)
                              const tv = dv(ds?.damage_affondo)
                              const clv = dv(ds?.calculated_damage_veloce) || (lv > 0 ? Math.floor(lv * 0.33) : 0)
                              const chv = dv(ds?.calculated_damage_pesante) || (hv > 0 ? Math.floor(hv * 0.33) : 0)
                              const ctv = dv(ds?.calculated_damage_affondo) || (tv > 0 ? Math.floor(tv * 0.33) : 0)
                              if (!name && lv <= 0 && hv <= 0 && tv <= 0) return null
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
                              )
                            })()
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {currentLevel.evocation_type === 'replica' && (
                  <div className="ml-2">
                    {gt0(currentLevel.max_replicas) && (<div>• Massimo repliche: {n(currentLevel.max_replicas)}</div>)}
                    {hasText(currentLevel.replica_source_character_id) && (<div>• Sorgente: {currentLevel.replica_source_character_id}</div>)}
                  </div>
                )}
                {currentLevel.evocation_type === 'energy' && (
                  <div className="ml-2">
                    {gt0(currentLevel.energy_health) && (<div>• Salute: {n(currentLevel.energy_health)}</div>)}
                    {gt0(currentLevel.energy_action_points) && (<div>• PA: {n(currentLevel.energy_action_points)}</div>)}
                    {gt0(currentLevel.energy_armour) && (<div>• Armatura: {n(currentLevel.energy_armour)}</div>)}
                    {Array.isArray(currentLevel.energy_stats) && currentLevel.energy_stats.length > 0 && (
                      <div>
                        <span>• Statistiche:</span>
                        <div className="ml-2 grid grid-cols-2 gap-x-3 gap-y-1">
                          {currentLevel.energy_stats.map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="font-medium">{prettyStatLabel(String(s?.statKey ?? ''))}</span>
                              <span>{n(s?.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(currentLevel.energy_embedded_refs) && currentLevel.energy_embedded_refs.length > 0 && (
                      <div>
                        <span>• Magie:</span>
                        <div className="ml-2">
                          {currentLevel.energy_embedded_refs.map((r: any, i: number) => {
                            const name = r.refName || r.name || null
                            const level = (r.refLevel ?? r.level ?? null)
                            if (!name && !level) return null
                            return (
                              <div key={i}>
                                {name ?? 'Magia'}{level ? ` (Livello ${level})` : ''}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {currentLevel.energy_can_create_equipment && <div>• Può creare equipaggiamento</div>}
                  </div>
                )}
                {gt0(currentLevel.turn_duration_rounds) && (
                  <div>• Durata in turni: {n(currentLevel.turn_duration_rounds)}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Effetti speciali se presenti */}
          {(spell.special_effect || currentLevel?.special_effect) && (
            <div className="text-xs text-muted-foreground mb-2">
              Effetto: {spell.special_effect || currentLevel?.special_effect}
            </div>
          )}
          
          {/* Punti Azione: SOLO livello attuale, sotto i danni */}
          {((spell.action_cost || currentLevel?.action_cost) || gt0(spell.indicative_action_cost || currentLevel?.indicative_action_cost)) && (
            <div className="text-xs text-muted-foreground mb-1">
              {(spell.action_cost || currentLevel?.action_cost) && (
                <div>PA: {n(spell.action_cost || currentLevel?.action_cost)}</div>
              )}
              {gt0(spell.indicative_action_cost || currentLevel?.indicative_action_cost) && (
                <div>PA indicativi: {n(spell.indicative_action_cost || currentLevel?.indicative_action_cost)}</div>
              )}
            </div>
          )}

          {Array.isArray((currentLevel as any)?.percentage_damage_values) && (currentLevel as any).percentage_damage_values.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Danni %:</span>
              <div className="ml-2">
                {(currentLevel as any).percentage_damage_values.map((d: any, i: number) => (
                  <div key={i}>• {d.typeName}: {gt0(d.guaranteed_percentage_damage) ? `${n(d.guaranteed_percentage_damage)}%` : '0%'}{gt0(d.additional_percentage_damage) ? `, +${n(d.additional_percentage_damage)}%` : ''}</div>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const parts: string[] = []
            if (gt0((currentLevel as any)?.usage_interval_turns)) parts.push(`Intervallo: ${n((currentLevel as any).usage_interval_turns)}t`)
            if (gt0((currentLevel as any)?.max_targets)) parts.push(`Bersagli max: ${n((currentLevel as any).max_targets)}`)
            if (gt0((currentLevel as any)?.max_multiple_attacks)) parts.push(`Attacchi multipli: ${n((currentLevel as any).max_multiple_attacks)}`)
            if (gt0((currentLevel as any)?.max_projectiles)) parts.push(`Proiettili: ${n((currentLevel as any).max_projectiles)}`)
            if (gt0((currentLevel as any)?.min_success_percentage)) parts.push(`Tiro %: ${n((currentLevel as any).min_success_percentage)}%`)
            if (gt0((currentLevel as any)?.extra_action_cost)) parts.push(`Costo extra: ${n((currentLevel as any).extra_action_cost)}${hasText((currentLevel as any)?.extra_cost_effect_name) ? ` (${(currentLevel as any).extra_cost_effect_name})` : ''}`)
            if ((currentLevel as any)?.lottery_enabled) parts.push(`Lotteria`)
            return parts.length > 0 ? (
              <div className="text-xs text-muted-foreground mb-1">{parts.join(' • ')}</div>
            ) : null
          })()}

          {/* Descrizione livello corrente se presente */}
          {hasText(currentLevel?.level_description) && (
            <div className="text-xs text-muted-foreground">
              Livello {currentLevel?.level}: {currentLevel?.level_description}
            </div>
          )}

          {hasText((currentLevel as any)?.level_warning) && (
            <div className="text-xs text-red-600">
              Avvertimento: {(currentLevel as any).level_warning}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {isAdmin && !isFromEquipment && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      
      {isAdmin && !isFromEquipment && (
        <EditSpellLevelModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          spell={spell}
          character={character}
          updateCharacter={updateCharacter}
          characterId={characterId}
        />
      )}
    </div>
  )
}
