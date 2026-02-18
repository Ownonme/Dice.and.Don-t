import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AbilityItem } from './AbilityItem'
import type { AbilityGrade as AbilityGradeType } from '@/constants/abilityConfig'

interface AbilityGradeProps {
  grade: AbilityGradeType
  categoryKey: string
  categoryConfig: { name: string; competence: string }
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  isAdmin: boolean
  setDetailAbility: (ability: any) => void
  setIsAbilityDetailOpen: (open: boolean) => void
}

export function AbilityGrade({
  grade,
  categoryKey,
  categoryConfig,
  character,
  updateCharacter,
  characterId,
  isAdmin,
  setDetailAbility,
  setIsAbilityDetailOpen
}: AbilityGradeProps) {
  // Filtra le abilità per questa categoria e grado e ordinale alfabeticamente
  const keyNorm = String(categoryKey || '').trim().toLowerCase()
  const abilities =
    (Array.isArray(character?.custom_abilities) ? character.custom_abilities : [])
      .filter((ability: any) => {
        const categoryNorm = String(ability?.category ?? '').trim().toLowerCase()
        const subcategoryNorm = String(ability?.subcategory ?? '').trim().toLowerCase()
        const gradeNorm = String(ability?.grade ?? '').trim().toLowerCase()
        return (categoryNorm === keyNorm || subcategoryNorm === keyNorm) && gradeNorm === String(grade).toLowerCase()
      })
      .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'it', { sensitivity: 'base' }))
  
  return (
    <Card className="border-l-4" style={{ borderLeftColor: '#FFD700' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {categoryConfig.name} {grade}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {abilities.length > 0 ? (
          <div className="space-y-2">
            {abilities.map((ability: any) => (
              <AbilityItem
                key={ability.id}
                ability={ability}
                isAdmin={isAdmin}
                character={character}
                updateCharacter={updateCharacter}
                characterId={characterId}
                setDetailAbility={setDetailAbility}
                setIsAbilityDetailOpen={setIsAbilityDetailOpen}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Nessuna abilità {grade.toLowerCase()} per {categoryConfig.name}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
