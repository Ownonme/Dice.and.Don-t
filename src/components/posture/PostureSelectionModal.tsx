import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useCharacters } from '@/hooks/useCharacters'

interface PostureSelectionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  character: any | null
  characterId?: string
  onCharacterUpdate: (updatedCharacter: any) => void
}

export const PostureSelectionModal: React.FC<PostureSelectionModalProps> = ({
  isOpen,
  onOpenChange,
  character,
  characterId,
  onCharacterUpdate,
}) => {
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()

  const postureAbilities = useMemo(() => {
    if (!character?.custom_abilities) return []
    return (character.custom_abilities || []).filter((ability: any) =>
      ability?.category === 'Posture' || ability?.category === 'Tecnico' || ability?.subcategory === 'Posture'
    )
  }, [character?.custom_abilities])

  const activePostureId = character?.selectedPostureId || postureAbilities.find((a: any) => a.is_active)?.id || null

  const handleSetPosture = async (postureId: string | null) => {
    if (!character || !characterId) return

    try {
      const updatedAbilities = (character.custom_abilities || []).map((ability: any) => {
        if (ability.category === 'Posture' || ability.category === 'Tecnico' || ability.subcategory === 'Posture') {
          return {
            ...ability,
            is_active: postureId ? ability.id === postureId : false,
          }
        }
        return ability
      })

      const updatedCharacter = {
        ...character,
        custom_abilities: updatedAbilities,
        selectedPostureId: postureId || null,
      }

      onCharacterUpdate(updatedCharacter)
      const success = await saveCharacter(characterId, updatedCharacter)
      if (success) {
        toast({
          title: postureId ? 'Postura attivata' : 'Postura rimossa',
          description: postureId
            ? `Postura impostata correttamente`
            : 'Nessuna postura attiva',
          duration: 2000,
        })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Errore nel salvataggio della postura:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la postura',
        variant: 'destructive',
      })
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seleziona Postura</DialogTitle>
          <DialogDescription>
            Scegli una postura tra quelle del personaggio, visualizza le spiegazioni e rimuovi quelle non desiderate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-2">
                {/* Nessuna postura */}
                <div className={`p-4 rounded-md border transition-colors ${!activePostureId ? 'border-amber-400 bg-background/60' : 'bg-muted'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">Nessuna postura</h4>
                      <p className="text-xs text-muted-foreground">Rimuovi la postura attiva</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleSetPosture(null)}>
                      Rimuovi attiva
                    </Button>
                  </div>
                </div>

                {postureAbilities.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nessuna postura assegnata al personaggio.</div>
                )}

                {postureAbilities.map((ability: any) => {
                  const isActive = activePostureId === ability.id || ability.is_active
                  const currentLevel = ability.levels?.find((l: any) => l.level === ability.current_level) || ability.levels?.[0]
                  return (
                    <div
                      key={ability.id}
                      className={`group cursor-pointer p-4 rounded-md border transition-colors ${isActive ? 'border-amber-400 bg-background/60' : 'bg-background hover:bg-muted'}`}
                      onClick={() => handleSetPosture(ability.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm">{ability.name}</h4>
                        {ability.type && <Badge variant="outline">{ability.type}</Badge>}
                        {ability.current_level && (
                          <Badge variant="outline" className="text-xs">Lv. {ability.current_level}</Badge>
                        )}
                      </div>
                      {ability.description && (
                        <p className="text-xs text-muted-foreground mb-1">{ability.description}</p>
                      )}
                      {currentLevel?.level_description && (
                        <p className="text-xs text-muted-foreground">{currentLevel.level_description}</p>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant={isActive ? 'secondary' : 'default'} onClick={(e) => { e.stopPropagation(); handleSetPosture(ability.id); }}>
                          {isActive ? 'Attiva (corrente)' : 'Imposta postura'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="p-3 rounded-lg border bg-background">
              <h4 className="font-semibold text-sm mb-2">Spiegazione</h4>
              {activePostureId ? (
                (() => {
                  const ability = postureAbilities.find((a: any) => a.id === activePostureId)
                  const currentLevel = ability?.levels?.find((l: any) => l.level === ability?.current_level) || ability?.levels?.[0]
                  return ability ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ability.name}</span>
                        {ability.type && <Badge variant="outline">{ability.type}</Badge>}
                        {ability.current_level && <Badge variant="outline" className="text-xs">Lv. {ability.current_level}</Badge>}
                      </div>
                      {ability.description && <p className="text-sm text-muted-foreground">{ability.description}</p>}
                      {currentLevel?.level_description && (
                        <p className="text-xs text-muted-foreground">{currentLevel.level_description}</p>
                      )}
                      <Separator />
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => handleSetPosture(null)}>Rimuovi postura attiva</Button>
                        <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Seleziona una postura dalla lista per vedere i dettagli.</p>
                  )
                })()
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna postura attiva. Seleziona una postura dalla lista per attivarla.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PostureSelectionModal