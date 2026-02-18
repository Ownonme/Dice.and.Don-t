import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ABILITY_SECTIONS } from '@/constants/abilityConfig'
import { AbilityCategory } from './AbilityCategory'

interface AbilitySectionProps {
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  skillSectionsOpen: Record<string, boolean>
  toggleSkillSection: (section: string) => void
  handleCompetenceChange: (path: string[], value: number) => void
  isAdmin: boolean
  setDetailAbility: (ability: any) => void
  setIsAbilityDetailOpen: (open: boolean) => void
}

export function AbilitySection({
  character,
  updateCharacter,
  characterId,
  skillSectionsOpen,
  toggleSkillSection,
  handleCompetenceChange,
  isAdmin,
  setDetailAbility,
  setIsAbilityDetailOpen
}: AbilitySectionProps) {
  return (
    <div className="space-y-4">
      {Object.entries(ABILITY_SECTIONS).map(([sectionKey, sectionConfig]) => {
        const isOpen = skillSectionsOpen[sectionKey] || false
        
        return (
          <Card key={sectionKey} className="border-2">
            <CardHeader className="pb-3">
              <Button
                variant="ghost"
                onClick={() => toggleSkillSection(sectionKey)}
                className="flex items-center justify-between w-full p-0 h-auto"
              >
                <CardTitle className="text-lg font-bold">
                  {sectionConfig.name}
                </CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </CardHeader>
            
            {isOpen && (
              <CardContent className="pt-0">
                <div className="grid gap-4">
                  {Object.entries(sectionConfig.categories).map(([categoryKey, categoryConfig]) => (
                    <AbilityCategory
                      key={categoryKey}
                      categoryKey={categoryKey}
                      categoryConfig={categoryConfig}
                      character={character}
                      updateCharacter={updateCharacter}
                      characterId={characterId}
                      handleCompetenceChange={handleCompetenceChange}
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
      })}
    </div>
  )
}
