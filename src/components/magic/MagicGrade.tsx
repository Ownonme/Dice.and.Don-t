import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MagicItem } from './MagicItem'
import type { MagicGrade as MagicGradeType } from '@/constants/magicConfig'

interface MagicGradeProps {
  grade: MagicGradeType
  categoryKey: string
  categoryConfig: { name: string; competence: string }
  sectionKey: string
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  isAdmin: boolean
  setDetailSpell: (spell: any) => void
  setIsSpellDetailOpen: (open: boolean) => void
}

export function MagicGrade({
  grade,
  categoryKey,
  categoryConfig,
  sectionKey,
  character,
  updateCharacter,
  characterId,
  isAdmin,
  setDetailSpell,
  setIsSpellDetailOpen
}: MagicGradeProps) {
  // Usa direttamente il sectionKey passato invece di cercarlo
  const expectedCategory = `${sectionKey}_${categoryKey}_${grade}`

  const spells = character?.custom_spells?.filter((spell: any) => {
    // Prova sia il formato esatto che variazioni possibili
    const matches = spell.category === expectedCategory ||
                   spell.category === `${sectionKey}_${categoryConfig.name}_${grade}` ||
                   (spell.primary_branch === sectionKey && 
                    spell.primary_specificity === categoryKey && 
                    spell.grade === grade)

    return matches
  }) || []
  
  return (
    <Card className="border-l-4" style={{ borderLeftColor: '#9333EA' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {categoryConfig.name} {grade}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {spells.length > 0 ? (
          <div className="space-y-2">
            {spells.map((spell: any) => (
              <MagicItem
                key={spell.id}
                spell={spell}
                isAdmin={isAdmin}
                character={character}
                updateCharacter={updateCharacter}
                characterId={characterId}
                setDetailSpell={setDetailSpell}
                setIsSpellDetailOpen={setIsSpellDetailOpen}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Nessuna magia {grade.toLowerCase()} per {categoryConfig.name}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
