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
import { supabase } from '@/integrations/supabase/client'

interface EnemyPostureSelectionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  enemy: any | null
  onEnemyUpdate: (updatedEnemy: any) => void
}

const EnemyPostureSelectionModal: React.FC<EnemyPostureSelectionModalProps> = ({
  isOpen,
  onOpenChange,
  enemy,
  onEnemyUpdate,
}) => {
  const { toast } = useToast()

  const postureAbilities = useMemo(() => {
    if (!enemy?.enemy_abilities) return []
    return (enemy.enemy_abilities || []).filter((ability: any) =>
      ability?.category === 'Posture' || ability?.category === 'Tecnico' || ability?.subcategory === 'Posture'
    )
  }, [enemy?.enemy_abilities])

  const activePostureId = useMemo(() => {
    if (!enemy) return null
    const foundActive = postureAbilities.find((a: any) => a.is_active)
    // Se esiste un campo selectedPostureId sul nemico lo privilegiamo, altrimenti is_active
    return enemy.selectedPostureId || foundActive?.id || null
  }, [enemy, postureAbilities])

  const handleSetPosture = async (postureId: string | null) => {
    if (!enemy?.id) return

    try {
      const updatedAbilities = (enemy.enemy_abilities || []).map((ability: any) => {
        if (ability.category === 'Posture' || ability.category === 'Tecnico' || ability.subcategory === 'Posture') {
          return {
            ...ability,
            is_active: postureId ? ability.id === postureId : false,
          }
        }
        return ability
      })

      const updatedEnemy = {
        ...enemy,
        enemy_abilities: updatedAbilities,
      }

      const { error } = await supabase
        .from('enemies')
        .update({ enemy_abilities: updatedAbilities })
        .eq('id', enemy.id)

      if (error) throw error

      onEnemyUpdate(updatedEnemy)

      toast({
        title: postureId ? 'Postura attivata' : 'Postura rimossa',
        description: postureId ? 'Postura impostata correttamente' : 'Nessuna postura attiva',
        duration: 2000,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Errore nel salvataggio della postura nemico:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la postura del nemico',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seleziona Postura Nemico</DialogTitle>
          <DialogDescription>
            Scegli una postura tra quelle conosciute dal nemico selezionato.
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
                  <div className="text-sm text-muted-foreground">Nessuna postura assegnata al nemico.</div>
                )}

                {postureAbilities.map((ability: any) => {
                  const isActive = activePostureId ? ability.id === activePostureId : !!ability.is_active
                  return (
                    <div key={ability.id} className={`p-4 rounded-md border transition-colors ${isActive ? 'border-amber-400 bg-background/60' : 'bg-muted'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            {ability.name}
                            {isActive && <Badge variant="outline">Attiva</Badge>}
                          </h4>
                          {ability.description && (
                            <p className="text-xs text-muted-foreground">{ability.description}</p>
                          )}
                        </div>
                        <Button size="sm" variant={isActive ? 'default' : 'secondary'} onClick={() => handleSetPosture(ability.id)}>
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
            <div className="p-4 rounded-md border h-[360px]">
              <h4 className="font-medium text-sm mb-2">Dettagli postura</h4>
              <Separator className="mb-3" />
              {(() => {
                if (!activePostureId) {
                  return (
                    <p className="text-sm text-muted-foreground">Nessuna postura attiva. Seleziona una postura dalla lista per attivarla.</p>
                  )
                }
                const ability = postureAbilities.find((a: any) => a.id === activePostureId)
                if (!ability) {
                  return (
                    <p className="text-sm text-muted-foreground">Seleziona una postura dalla lista per vedere i dettagli.</p>
                  )
                }
                return (
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{ability.name}</div>
                    {ability.description && <div className="text-muted-foreground">{ability.description}</div>}
                    {Array.isArray(ability.effects) && ability.effects.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-1">Effetti:</div>
                        <ul className="list-disc pl-5 text-xs">
                          {ability.effects.map((e: any, idx: number) => <li key={idx}>{typeof e === 'string' ? e : e?.name || 'Effetto'}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleSetPosture(null)}>Rimuovi postura attiva</Button>
                    </div>
                  </div>
                )
              })()}
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

export default EnemyPostureSelectionModal