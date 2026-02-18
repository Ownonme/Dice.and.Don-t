import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useParams } from 'react-router-dom'
import { useCharacters } from '@/hooks/useCharacters'
import { MagicSection } from '@/components/magic/MagicSection'
import { ImportSpellModal } from '@/components/magic/ImportSpellModal'
import { MagicDetailModal } from '@/components/magic/MagicDetailModal'

interface MagicPageProps {
  character: any
  updateCharacter: (updates: any) => void
}

export default function MagicPage({ character, updateCharacter }: MagicPageProps) {
  useEffect(() => {
    return () => {
      if ((window as any).saveTimeout) {
        clearTimeout((window as any).saveTimeout)
      }
    }
  }, [])

  const [skillSectionsOpen, setSkillSectionsOpen] = useState<Record<string, boolean>>({})
  const [isSpellDetailOpen, setIsSpellDetailOpen] = useState(false)
  const [detailSpell, setDetailSpell] = useState<any>(null)
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
      magic: {
        ...character.magic,
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
            magic: {
              ...character.magic,
              ...nestedUpdate
            }
          }
          await saveCharacter(characterId, updatedCharacter)
        } catch (error) {
          console.error('Errore nel salvataggio automatico:', error)
          toast({
            title: "Errore",
            description: "Errore nel salvataggio automatico della competenza magica",
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
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CardTitle>Magie del Personaggio</CardTitle>
              {isSaving && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                  Salvataggio...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-purple-500 text-white hover:bg-purple-600"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Importa Magia
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <MagicSection
            character={character}
            updateCharacter={updateCharacter}
            characterId={characterId}
            skillSectionsOpen={skillSectionsOpen}
            toggleSkillSection={toggleSkillSection}
            handleCompetenceChange={handleCompetenceChange}
            isAdmin={isAdmin}
            setDetailSpell={setDetailSpell}
            setIsSpellDetailOpen={setIsSpellDetailOpen}
          />
        </CardContent>
      </Card>
      
      {/* Modale per i dettagli della magia */}
      <MagicDetailModal
        isOpen={isSpellDetailOpen}
        onOpenChange={setIsSpellDetailOpen}
        spell={detailSpell}
      />
      
      {isAdmin && (
        <ImportSpellModal
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
