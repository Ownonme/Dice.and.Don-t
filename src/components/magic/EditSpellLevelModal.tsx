import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCharacters } from '@/hooks/useCharacters'
import { Save } from 'lucide-react'

interface EditSpellLevelModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  spell: any
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
}

export function EditSpellLevelModal({
  isOpen,
  onOpenChange,
  spell,
  character,
  updateCharacter,
  characterId
}: EditSpellLevelModalProps) {
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  const [selectedLevel, setSelectedLevel] = useState(spell?.current_level?.toString() || '1')
  const [saving, setSaving] = useState(false)

  // Reset quando si apre la modale
  useEffect(() => {
    if (isOpen && spell) {
      setSelectedLevel(spell.current_level?.toString() || '1')
    }
  }, [isOpen, spell])

  const handleSave = async () => {
    if (!characterId || !spell) return

    setSaving(true)
    try {
      const newLevel = parseInt(selectedLevel)
      const levelData = spell.levels?.find((l: any) => l.level === newLevel)
      
      // Aggiorna la magia con il nuovo livello
      const updatedSpell = {
        ...spell,
        current_level: newLevel,
        // Aggiorna i dati del livello corrente per accesso rapido - USA I NUOVI CAMPI
        guaranteed_damage: levelData?.guaranteed_damage || levelData?.damage || spell.guaranteed_damage || 0,
        additional_damage: levelData?.additional_damage || spell.additional_damage || 0,
        action_cost: levelData?.action_cost || levelData?.mana_cost || spell.action_cost || 0,
        indicative_action_cost: levelData?.indicative_action_cost || levelData?.mana_cost || spell.indicative_action_cost || 0,
        duration: levelData?.duration || spell.duration || '',
        range: levelData?.range || spell.range || '',
        special_effect: levelData?.special_effect || spell.special_effect || '',
        level_description: levelData?.level_description || spell.level_description || '',
        // Mantieni i campi di compatibilità
        damage: levelData?.damage || levelData?.guaranteed_damage || spell.damage || 0,
        mana_cost: levelData?.mana_cost || levelData?.action_cost || spell.mana_cost || 0
      }
      
      // Aggiorna l'array delle magie del personaggio
      const updatedSpells = character.custom_spells?.map((s: any) => 
        s.id === spell.id ? updatedSpell : s
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
        description: `Livello della magia "${spell.name}" aggiornato a ${newLevel}`,
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating spell level:', error)
      
      // In caso di errore, ripristina lo stato precedente
      updateCharacter({ custom_spells: character.custom_spells })
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del livello",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!spell) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Livello Magia</DialogTitle>
          <DialogDescription>
            Seleziona il livello desiderato per questa magia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">{spell.name}</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {spell.description}
            </p>
          </div>

          <div>
            <Label htmlFor="level">Seleziona Livello</Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spell.levels?.map((level: any) => (
                  <SelectItem key={level.level} value={level.level.toString()}>
                    Livello {level.level}
                    {(level.action_cost || level.mana_cost) && ` (${level.action_cost || level.mana_cost} PA)`}
                    {level.level_description && ` - ${level.level_description}`}
                  </SelectItem>
                )) || (
                  <SelectItem value="1">Livello 1</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Anteprima del livello selezionato */}
          <div className="border-t pt-4">
            <Label>Dettagli Livello {selectedLevel}</Label>
            {(() => {
              const levelData = spell.levels?.find((l: any) => l.level === parseInt(selectedLevel))
              return levelData ? (
                <div className="text-sm space-y-1 mt-2 p-3 bg-muted rounded-lg">
                  {(levelData.guaranteed_damage || levelData.damage) ? (
                    <div><strong>Danno Assicurato:</strong> {levelData.guaranteed_damage || levelData.damage}</div>
                  ) : null}
                  {levelData.additional_damage ? (
                    <div><strong>Danno Aggiuntivo:</strong> {levelData.additional_damage}</div>
                  ) : null}
                  {(levelData.action_cost || levelData.mana_cost) ? (
                    <div><strong>Costo PA:</strong> {levelData.action_cost || levelData.mana_cost}</div>
                  ) : null}
                  {levelData.indicative_action_cost ? (
                    <div><strong>PA Indicativi:</strong> {levelData.indicative_action_cost}</div>
                  ) : null}
                  {levelData.duration ? (
                    <div><strong>Durata:</strong> {levelData.duration}</div>
                  ) : null}
                  {levelData.range ? (
                    <div><strong>Raggio:</strong> {levelData.range}</div>
                  ) : null}
                  {levelData.special_effect && (
                    <div><strong>Effetto:</strong> {levelData.special_effect}</div>
                  )}
                  {levelData.level_description && (
                    <div><strong>Descrizione:</strong> {levelData.level_description}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-2">
                  Nessun dettaglio disponibile per questo livello
                </div>
              )
            })()
            }
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full mr-2"></div>
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva Modifiche
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}