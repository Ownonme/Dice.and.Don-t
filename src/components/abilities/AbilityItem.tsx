import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCharacters } from '@/hooks/useCharacters'
import { EditAbilityLevelModal } from './EditAbilityLevelModal'

interface AbilityItemProps {
  ability: any
  isAdmin: boolean
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  setDetailAbility: (ability: any) => void
  setIsAbilityDetailOpen: (open: boolean) => void
  // Nuove props per la selezione
  isSelected?: boolean
  onSelect?: (ability: any) => void
}

export function AbilityItem({
  ability,
  isAdmin,
  character,
  updateCharacter,
  characterId,
  setDetailAbility,
  setIsAbilityDetailOpen,
  isSelected = false,
  onSelect
}: AbilityItemProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  const isFromEquipment = (ability as any)?.sourceType === 'equipment' || String((ability as any)?.id ?? '').startsWith('equip:')
  const equipmentSourceName = String((ability as any)?.sourceName ?? '').trim()
  
  const handleViewDetails = () => {
    setDetailAbility(ability)
    setIsAbilityDetailOpen(true)
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
    if (!confirm(`Sei sicuro di voler eliminare l'abilità "${ability.name}"?`)) {
      return
    }
    
    try {
      const updatedAbilities = character.custom_abilities?.filter(
        (a: any) => a.id !== ability.id
      ) || []
      
      const updatedCharacter = {
        ...character,
        custom_abilities: updatedAbilities
      }
      
      // Prima aggiorna lo stato locale
      updateCharacter({ custom_abilities: updatedAbilities })
      
      // Poi salva nel database
      await saveCharacter(characterId, updatedCharacter)
      
      toast({
        title: "Successo",
        description: "Abilità eliminata con successo"
      })
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'abilità:', error)
      
      // In caso di errore, ripristina lo stato precedente
      updateCharacter({ custom_abilities: character.custom_abilities })
      
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione dell'abilità",
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
  const specLabel = (r: any): string => {
    const name = String(r?.name ?? '').trim()
    if (name) return name
    const id = String(r?.id ?? r?.key ?? '').trim()
    return id || 'Specifica'
  }
  const getConsumeSpecifics = (item: any, levelData: any) => {
    const fromLevel = Array.isArray(levelData?.consume_custom_specifics) ? levelData.consume_custom_specifics : []
    const fromItem = Array.isArray(item?.consume_custom_specifics) ? item.consume_custom_specifics : []
    const raw = fromLevel.length > 0 ? fromLevel : fromItem
    return raw.map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      value: n(r?.value ?? r?.amount ?? 0)
    })).filter((r: any) => r.value > 0 && (r.id || r.name))
  }
  const getGenerateSpecifics = (item: any, levelData: any) => {
    const fromLevel = Array.isArray(levelData?.generate_custom_specifics) ? levelData.generate_custom_specifics : []
    const fromItem = Array.isArray(item?.generate_custom_specifics) ? item.generate_custom_specifics : []
    const raw = fromLevel.length > 0 ? fromLevel : fromItem
    return raw.map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      value: n(r?.value ?? r?.amount ?? 0)
    })).filter((r: any) => r.value > 0 && (r.id || r.name))
  }
  const getPassiveCustomSpecifics = (item: any, levelData: any) => {
    const fromLevel = Array.isArray(levelData?.passive_custom_specifics) ? levelData.passive_custom_specifics : []
    const fromItem = Array.isArray(item?.passive_custom_specifics) ? item.passive_custom_specifics : []
    const raw = fromLevel.length > 0 ? fromLevel : fromItem
    return raw.map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      max: n(r?.max ?? r?.value ?? 0)
    })).filter((r: any) => r.max > 0 && (r.id || r.name))
  }
  const getRequiredSpecifics = (item: any, levelData: any) => {
    const fromLevel = Array.isArray(levelData?.passive_specific_conditions) ? levelData.passive_specific_conditions : []
    const fromItem = Array.isArray(item?.passive_specific_conditions) ? item.passive_specific_conditions : []
    const raw = fromLevel.length > 0 ? fromLevel : fromItem
    return raw.map((r: any) => ({
      id: String(r?.id ?? '').trim(),
      key: String(r?.key ?? '').trim(),
      name: String(r?.name ?? '').trim(),
      minPercent: n(r?.min_percent ?? r?.minPercent ?? 0),
      maxPercent: n(r?.max_percent ?? r?.maxPercent ?? 0),
      minValue: n(r?.min_value ?? r?.minValue ?? 0),
      maxValue: n(r?.max_value ?? r?.maxValue ?? 0),
    })).filter((r: any) => (r.id || r.key || r.name) && (r.minPercent > 0 || r.maxPercent > 0 || r.minValue > 0 || r.maxValue > 0))
  }
  
  const handleItemClick = () => {
    if (onSelect) {
      onSelect(ability)
    }
  }
  
  // Trova il livello corrente dell'abilità
  const currentLevel = ability.levels?.find((l: any) => l.level === ability.current_level) || ability.levels?.[0]
  
  return (
    <div 
      className={`flex flex-col gap-2 md:flex-row md:items-start md:justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-accent/15 border-primary/60 shadow-lg shadow-primary/15 ring-2 ring-primary/30'
          : 'bg-muted/30 border-border hover:bg-muted/50'
      }`}
      onClick={handleItemClick}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-3 flex-1">
        <div className="flex-1">
          <div className="space-y-1 mb-1">
            <h4 className="font-medium text-sm">{ability.name}</h4>
            <div className="flex flex-wrap gap-1">
              <Badge className={getTypeColor(ability.type)}>
                {ability.type}
              </Badge>
              {ability.current_level && (
                <Badge variant="outline" className="text-xs">
                  Livello {ability.current_level}
                </Badge>
              )}
              {isFromEquipment && equipmentSourceName && (
                <Badge variant="secondary" className="text-xs">
                  {equipmentSourceName}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            {ability.description}
          </p>
          
          {/* Visualizzazione danni e PA in una riga separata con trattini */}
          <div className="text-xs text-muted-foreground mb-1">
            {(() => {
              const parts = []
              
              // Aggiungi danno assicurato
              if ((ability.danno_assicurato || currentLevel?.danno_assicurato)) {
                parts.push(`Danno assicurato: ${ability.danno_assicurato || currentLevel.danno_assicurato}`)
              }
              
              // Aggiungi danno aggiuntivo
              if ((ability.danno_aggiuntivo || currentLevel?.danno_aggiuntivo)) {
                parts.push(`Danno aggiuntivo: ${ability.danno_aggiuntivo || currentLevel.danno_aggiuntivo}`)
              }
              
              // Aggiungi punti azione
              if ((ability.punti_azione || currentLevel?.punti_azione)) {
                parts.push(`PA: ${ability.punti_azione || currentLevel.punti_azione}`)
              }
              
              return parts.length > 0 ? parts.join(' - ') : null
            })()
            }
          </div>

          {(() => {
            const lvl: any = currentLevel || {}
            const everyHp = Number(lvl?.less_health_more_damage_every_hp ?? lvl?.lessHealthMoreDamageEveryHp ?? 0) || 0
            const vals = Array.isArray(lvl?.damage_values) ? lvl.damage_values : []
            const inc = vals.filter((v: any) => gt0(v?.less_health_more_damage_guaranteed_increment) || gt0(v?.less_health_more_damage_additional_increment))
            if (!(everyHp > 0 && inc.length > 0)) return null
            return (
              <div className="text-xs text-muted-foreground mb-1">
                {inc.map((v: any, i: number) => (
                  <div key={`mh-${i}`}>
                    Salute mancante: {String(v?.typeName || v?.name || 'Tipo')} ogni {everyHp} HP{gt0(v?.less_health_more_damage_guaranteed_increment) ? ` +${v.less_health_more_damage_guaranteed_increment} garantiti` : ''}{gt0(v?.less_health_more_damage_additional_increment) ? `${gt0(v?.less_health_more_damage_guaranteed_increment) ? ',' : ''} +${v.less_health_more_damage_additional_increment} addizionali` : ''}
                  </div>
                ))}
              </div>
            )
          })()}

          {(() => {
            const parts: string[] = []
            const lvl: any = currentLevel || {}
            if (Number(lvl.usage_interval_turns || 0) > 0) parts.push(`Intervallo: ${Number(lvl.usage_interval_turns || 0)}t`)
            if (Number(lvl.max_targets || 0) > 0) parts.push(`Bersagli max: ${Number(lvl.max_targets || 0)}`)
            if (Number(lvl.turn_duration_rounds || 0) > 0) parts.push(`Durata: ${Number(lvl.turn_duration_rounds || 0)}t`)
            if (Number(lvl.min_success_percentage || 0) > 0) parts.push(`Tiro %: ${Number(lvl.min_success_percentage || 0)}%`)
            if (Number(lvl.extra_action_cost || 0) > 0) parts.push(`Costo extra: ${Number(lvl.extra_action_cost || 0)}`)
            if (lvl.self_effect_enabled) parts.push('Self attivo')
            if (lvl.failure_enabled) parts.push('Fallimento attivo')
            if (lvl.lottery_enabled) parts.push('Lotteria')
            return parts.length > 0 ? (
              <div className="text-xs text-muted-foreground mb-1">{parts.join(' • ')}</div>
            ) : null
          })()}

          {(() => {
            const lvl: any = currentLevel || {}
            const consume = getConsumeSpecifics(ability, lvl)
            const generate = getGenerateSpecifics(ability, lvl)
            const passiveCustom = getPassiveCustomSpecifics(ability, lvl)
            const required = getRequiredSpecifics(ability, lvl)
            if (consume.length === 0 && generate.length === 0 && passiveCustom.length === 0 && required.length === 0) return null
            return (
              <div className="text-xs text-muted-foreground mb-1 space-y-1">
                {consume.length > 0 && (
                  <div>
                    <span className="font-medium">Specifiche consumate:</span>
                    <div className="ml-2">
                      {consume.map((r: any, i: number) => (
                        <div key={`${r.id || r.name || i}`}>• {specLabel(r)}: {n(r.value)}</div>
                      ))}
                    </div>
                  </div>
                )}
                {generate.length > 0 && (
                  <div>
                    <span className="font-medium">Specifiche generate:</span>
                    <div className="ml-2">
                      {generate.map((r: any, i: number) => (
                        <div key={`${r.id || r.name || i}`}>• {specLabel(r)}: {n(r.value)}</div>
                      ))}
                    </div>
                  </div>
                )}
                {passiveCustom.length > 0 && (
                  <div>
                    <span className="font-medium">Specifiche sbloccate:</span>
                    <div className="ml-2">
                      {passiveCustom.map((r: any, i: number) => (
                        <div key={`${r.id || r.name || i}`}>• {specLabel(r)}: {n(r.max)}</div>
                      ))}
                    </div>
                  </div>
                )}
                {required.length > 0 && (
                  <div>
                    <span className="font-medium">Specifiche richieste:</span>
                    <div className="ml-2">
                      {required.map((r: any, i: number) => {
                        const parts: string[] = []
                        if (r.minPercent > 0) parts.push(`min % ${n(r.minPercent)}`)
                        if (r.maxPercent > 0) parts.push(`max % ${n(r.maxPercent)}`)
                        if (r.minValue > 0) parts.push(`min ${n(r.minValue)}`)
                        if (r.maxValue > 0) parts.push(`max ${n(r.maxValue)}`)
                        return (
                          <div key={`${r.id || r.key || r.name || i}`}>• {specLabel(r)}{parts.length > 0 ? `: ${parts.join(', ')}` : ''}</div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          
          {/* Effetti speciali se presenti */}
          {(ability.special_effect || currentLevel?.special_effect) && (
            <div className="text-xs text-muted-foreground">
              Effetto: {ability.special_effect || currentLevel.special_effect}
            </div>
          )}

          {((currentLevel as any)?.level_warning) && (
            <div className="text-xs text-red-600">
              {String(((currentLevel as any).level_warning || '')).trim()}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 md:ml-4 md:self-center">
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
        <EditAbilityLevelModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          ability={ability}
          character={character}
          updateCharacter={updateCharacter}
          characterId={characterId}
        />
      )}
    </div>
  )
}
