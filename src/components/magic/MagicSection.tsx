import { CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { MAGIC_SECTIONS } from '@/constants/magicConfig'
import { MagicCategory } from './MagicCategory'

interface MagicSectionProps {
  character: any
  updateCharacter: (updates: any) => void
  characterId?: string
  skillSectionsOpen: Record<string, boolean>
  toggleSkillSection: (section: string) => void
  handleCompetenceChange: (path: string[], value: number) => void
  isAdmin: boolean
  setDetailSpell: (spell: any) => void
  setIsSpellDetailOpen: (open: boolean) => void
}

export function MagicSection({
  character,
  updateCharacter,
  characterId,
  skillSectionsOpen,
  toggleSkillSection,
  handleCompetenceChange,
  isAdmin,
  setDetailSpell,
  setIsSpellDetailOpen
}: MagicSectionProps) {
  const openSections = Object.entries(skillSectionsOpen)
    .filter(([, isOpen]) => isOpen)
    .map(([key]) => key)

  return (
    <Accordion type="multiple" value={openSections} className="space-y-3">
      {Object.entries(MAGIC_SECTIONS).map(([sectionKey, sectionConfig]) => (
        <AccordionItem key={sectionKey} value={sectionKey} className="rounded-lg border">
          <AccordionTrigger onClick={() => toggleSkillSection(sectionKey)} className="px-4">
            <CardTitle className="text-lg font-bold">
              {sectionConfig.name}
            </CardTitle>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <div className="grid gap-4">
              {Object.entries(sectionConfig.categories).map(([categoryKey, categoryConfig]) => (
                <MagicCategory
                  key={categoryKey}
                  categoryKey={categoryKey}
                  categoryConfig={categoryConfig}
                  sectionKey={sectionKey}
                  character={character}
                  updateCharacter={updateCharacter}
                  characterId={characterId}
                  handleCompetenceChange={handleCompetenceChange}
                  isAdmin={isAdmin}
                  setDetailSpell={setDetailSpell}
                  setIsSpellDetailOpen={setIsSpellDetailOpen}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
