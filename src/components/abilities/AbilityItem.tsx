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
  
  const handleItemClick = () => {
    if (onSelect) {
      onSelect(ability)
    }
  }
  
  // Trova il livello corrente dell'abilità
  const currentLevel = ability.levels?.find((l: any) => l.level === ability.current_level) || ability.levels?.[0]
  
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
            <h4 className="font-medium text-sm">{ability.name}</h4>
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
