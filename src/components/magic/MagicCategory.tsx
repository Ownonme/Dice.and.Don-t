import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MAGIC_GRADES } from '@/constants/magicConfig'
import { MagicGrade } from './MagicGrade'

interface MagicCategoryProps {
  categoryKey: string
  categoryConfig: { name: string; competence: string }
  sectionKey: string
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  handleCompetenceChange: (path: string[], value: number) => void
  isAdmin: boolean
  setDetailSpell: (spell: any) => void
  setIsSpellDetailOpen: (open: boolean) => void
}

export function MagicCategory({
  categoryKey,
  categoryConfig,
  sectionKey,
  character,
  updateCharacter,
  characterId,
  handleCompetenceChange,
  isAdmin,
  setDetailSpell,
  setIsSpellDetailOpen
}: MagicCategoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Ottieni il valore corrente della competenza (0-100)
  const currentValue = character?.magic?.[categoryConfig.competence] || 0
  
  const handleValueChange = (value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0))
    handleCompetenceChange([categoryConfig.competence], numValue)
  }
  
  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-1">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 p-0 h-auto flex-1 min-w-0 justify-start"
          >
            <CardTitle className="text-base font-semibold truncate">
              {categoryConfig.name}
            </CardTitle>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex items-center gap-1 shrink-0">
            <Label htmlFor={`${categoryKey}-input`} className="text-xs font-medium whitespace-nowrap">
              Livello:
            </Label>
            <Input
              id={`${categoryKey}-input`}
              type="number"
              min="0"
              max="100"
              value={currentValue}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-12 h-7 text-center text-xs px-1"
            />
          </div>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {MAGIC_GRADES.map((grade) => (
              <MagicGrade
                key={grade}
                grade={grade}
                categoryKey={categoryKey}
                categoryConfig={categoryConfig}
                sectionKey={sectionKey}
                character={character}
                updateCharacter={updateCharacter}
                characterId={characterId}
                isAdmin={isAdmin}
                setDetailSpell={setDetailSpell}
                setIsSpellDetailOpen={setIsSpellDetailOpen}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
