import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ABILITY_GRADES } from '@/constants/abilityConfig'
import { AbilityGrade } from './AbilityGrade'

interface AbilityCategoryProps {
  categoryKey: string
  categoryConfig: { name: string; competence: string }
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  handleCompetenceChange: (path: string[], value: number) => void
  isAdmin: boolean
  setDetailAbility: (ability: any) => void
  setIsAbilityDetailOpen: (open: boolean) => void
}

export function AbilityCategory({
  categoryKey,
  categoryConfig,
  character,
  updateCharacter,
  characterId,
  handleCompetenceChange,
  isAdmin,
  setDetailAbility,
  setIsAbilityDetailOpen
}: AbilityCategoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Ottieni il valore corrente della competenza (0-100)
  const currentValue = character?.abilities?.[categoryConfig.competence] || 0
  
  const handleValueChange = (value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0))
    handleCompetenceChange([categoryConfig.competence], numValue)
  }
  
  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 p-0 h-auto justify-start"
          >
            <CardTitle className="text-base font-semibold">
              {categoryConfig.name}
            </CardTitle>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex items-center gap-2">
            <Label htmlFor={`${categoryKey}-input`} className="text-sm font-medium">
              Livello:
            </Label>
            <Input
              id={`${categoryKey}-input`}
              type="number"
              min="0"
              max="100"
              value={currentValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-16 h-8 text-center"
            />
          </div>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {ABILITY_GRADES.map((grade) => (
              <AbilityGrade
                key={grade}
                grade={grade}
                categoryKey={categoryKey}
                categoryConfig={categoryConfig}
                character={character}
                updateCharacter={updateCharacter}
                characterId={characterId}
                isAdmin={isAdmin}
                setDetailAbility={setDetailAbility}
                setIsAbilityDetailOpen={setIsAbilityDetailOpen}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
