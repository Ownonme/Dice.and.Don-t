import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useParams } from 'react-router-dom'
import { useCharacters } from '@/hooks/useCharacters'
import { AbilitySection } from '@/components/abilities/AbilitySection'
import { AddAbilityModal } from '@/components/abilities/AddAbilityModal'
import { ImportAbilityModal } from '@/components/abilities/ImportAbilityModal'
import { AbilityDetailModal } from '@/components/abilities/AbilityDetailModal'

interface Ability {
  id: string
  name: string
  type: 'Attiva' | 'Passiva' | 'Suprema'
  category: string
  subcategory: string
  grade: 'Semplice' | 'Avanzata' | 'Suprema'
  description: string
  additional_description?: string
  story_1?: string
  story_2?: string
  levels: Array<{
    level: number
    danno_assicurato?: number
    danno_aggiuntivo?: number
    punti_azione?: number
    costo_punti_azione?: number
    level_description: string
  }>
}

interface AbilityPageProps {
  character: any
  updateCharacter: (updates: any) => void
}

export default function AbilityPage({ character, updateCharacter }: AbilityPageProps) {
  useEffect(() => {
    return () => {
      if ((window as any).saveTimeout) {
        clearTimeout((window as any).saveTimeout)
      }
    }
  }, [])

  const [skillSectionsOpen, setSkillSectionsOpen] = useState<Record<string, boolean>>({})
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAbilityDetailOpen, setIsAbilityDetailOpen] = useState(false)
  const [detailAbility, setDetailAbility] = useState<Ability | null>(null)
  const { characterId } = useParams<{ characterId: string }>()
  const { saveCharacter } = useCharacters()
  const [isSaving, setIsSaving] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const toggleSkillSection = (section: string) => {
    setSkillSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCompetenceChange = async (path: string[], value: number) => {
    const createNestedUpdate = (keys: string[], val: number): any => {
      if (keys.length === 1) {
        return { [keys[0]]: val }
      }
      return { [keys[0]]: createNestedUpdate(keys.slice(1), val) }
    }

    const nestedUpdate = createNestedUpdate(path, value)
    
    updateCharacter({
      abilities: {
        ...character.abilities,
        ...nestedUpdate
      }
    })
    
    if (characterId) {
      if ((window as any).saveTimeout) {
        clearTimeout((window as any).saveTimeout)
      }
      
      ;(window as any).saveTimeout = setTimeout(async () => {
        try {
          const updatedCharacter = {
            ...character,
            abilities: {
              ...character.abilities,
              ...nestedUpdate
            }
          }
          await saveCharacter(characterId, updatedCharacter)
        } catch (error) {
          console.error('Errore nel salvataggio automatico:', error)
          toast({
            title: "Errore",
            description: "Errore nel salvataggio automatico della competenza",
            variant: "destructive"
          })
        }
      }, 1500)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Abilità del Personaggio</CardTitle>
              {isSaving && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                  Salvataggio...
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full md:w-auto bg-green-500 text-white hover:bg-green-600"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Importa Abilità
                </Button>
              )}
              {isAdmin && (
                <AddAbilityModal 
                  isOpen={isAddModalOpen}
                  onClose={() => setIsAddModalOpen(false)}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AbilitySection
            character={character}
            updateCharacter={updateCharacter}
            characterId={characterId}
            skillSectionsOpen={skillSectionsOpen}
            toggleSkillSection={toggleSkillSection}
            handleCompetenceChange={handleCompetenceChange}
            isAdmin={isAdmin}
            setDetailAbility={setDetailAbility}
            setIsAbilityDetailOpen={setIsAbilityDetailOpen}
          />
        </CardContent>
      </Card>
      
      {/* Modale per i dettagli dell'abilità */}
      <AbilityDetailModal
        isOpen={isAbilityDetailOpen}
        onOpenChange={setIsAbilityDetailOpen}
        ability={detailAbility}
      />
      
      {isAdmin && (
        <ImportAbilityModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          character={character}
          updateCharacter={updateCharacter}
          characterId={characterId}
        />
      )}
    </div>
  )
}
