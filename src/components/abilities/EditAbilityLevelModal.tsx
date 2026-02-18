import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useCharacters } from '@/hooks/useCharacters'

interface EditAbilityLevelModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  ability: any
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
}

export function EditAbilityLevelModal({
  isOpen,
  onOpenChange,
  ability,
  character,
  updateCharacter,
  characterId
}: EditAbilityLevelModalProps) {
  const [selectedLevel, setSelectedLevel] = useState(ability.current_level?.toString() || '1')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  
  const handleSave = async () => {
    if (!characterId) return
    
    setIsSaving(true)
    try {
      // Trova i dati del nuovo livello
      const newLevelData = ability.levels?.find((l: any) => l.level === parseInt(selectedLevel))
      
      const updatedAbilities = character.custom_abilities?.map((a: any) => 
        a.id === ability.id 
          ? { 
              ...a, 
              current_level: parseInt(selectedLevel),
              // Aggiorna anche i dati del livello corrente
              danno_assicurato: newLevelData?.danno_assicurato || 0,
              danno_aggiuntivo: newLevelData?.danno_aggiuntivo || 0,
              punti_azione: newLevelData?.punti_azione || 0,
              punti_azione_indicativi: newLevelData?.punti_azione_indicativi || 0,
              special_effect: newLevelData?.special_effect || '',
              level_description: newLevelData?.level_description || ''
            }
          : a
      ) || []
      
      const updatedCharacter = {
        ...character,
        custom_abilities: updatedAbilities
      }
      
      updateCharacter({ custom_abilities: updatedAbilities })
      await saveCharacter(characterId, updatedCharacter)
      
      toast({
        title: "Successo",
        description: "Livello abilità aggiornato con successo"
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error('Errore nell\'aggiornamento del livello:', error)
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento del livello",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Livello Abilità</DialogTitle>
          <DialogDescription>
            Seleziona un nuovo livello per l'abilità del personaggio.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Abilità</Label>
            <p className="text-sm text-gray-600">{ability.name}</p>
          </div>
          
          <div>
            <Label htmlFor="level-select" className="text-sm font-medium">
              Livello
            </Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona livello" />
              </SelectTrigger>
              <SelectContent>
                {ability.levels?.map((level: any) => (
                  <SelectItem key={level.level} value={level.level.toString()}>
                    Livello {level.level}
                    {level.punti_azione && ` (${level.punti_azione} PA)`}
                    {level.level_description && ` - ${level.level_description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sezione anteprima del livello selezionato */}
          <div>
            <Label>Dettagli Livello {selectedLevel}</Label>
            {(() => {
              const levelData = ability.levels?.find((l: any) => l.level === parseInt(selectedLevel))
              return levelData ? (
                <div className="text-sm space-y-1 mt-2 p-3 bg-muted rounded-lg">
                  {levelData.danno_assicurato ? (
                    <div><strong>Danno Assicurato:</strong> {levelData.danno_assicurato}</div>
                  ) : null}
                  {levelData.danno_aggiuntivo ? (
                    <div><strong>Danno Aggiuntivo:</strong> {levelData.danno_aggiuntivo}</div>
                  ) : null}
                  {levelData.punti_azione ? (
                    <div><strong>Costo PA:</strong> {levelData.punti_azione}</div>
                  ) : null}
                  {levelData.punti_azione_indicativi ? (
                    <div><strong>Costo PA Indicativo:</strong> {levelData.punti_azione_indicativi}</div>
                  ) : null}
                  {levelData.special_effect ? (
                    <div><strong>Effetto Speciale:</strong> {levelData.special_effect}</div>
                  ) : null}
                  {levelData.level_description ? (
                    <div><strong>Descrizione:</strong> {levelData.level_description}</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-lg">
                  Nessun dettaglio disponibile per questo livello
                </div>
              )
            })()
            }
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}