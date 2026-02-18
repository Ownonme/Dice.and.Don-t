import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, Plus } from 'lucide-react'
import { useCharacters } from '@/hooks/useCharacters'
import { MAGIC_SECTIONS } from '@/constants/magicConfig'

interface ImportSpellModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  character?: any
  updateCharacter?: (updates: any) => void
  characterId?: string
  preselectedSection?: string
  preselectedCategory?: string
  preselectedGrade?: string
  // Nuovo: modalità inline per usare la modale come selettore generico
  mode?: 'character' | 'inline'
  onConfirm?: (payload: { spell: DatabaseSpell; level: number }) => void
}

interface LevelRow {
  level: number
  // legacy
  damage?: number | string | null
  mana_cost?: number | string | null
  // nuovi campi
  guaranteed_damage?: number | string | null
  additional_damage?: number | string | null
  action_cost?: number | string | null
  indicative_action_cost?: number | string | null
  duration?: string | null
  range?: string | null
  special_effect?: string | null
  level_description?: string | null
  anomalies?: string | null

  damage_values?: { typeName?: string; name?: string; guaranteed_damage?: number | string | null; additional_damage?: number | string | null }[]
  percentage_damage_values?: { typeName?: string; name?: string; guaranteed_percentage_damage?: number | string | null; additional_percentage_damage?: number | string | null }[]
  damage_shape?: 'area' | 'cone' | 'single' | 'chain'
  area_or_cone_value?: number | string | null
  chain_targets?: number | string | null
  max_seconds?: number | string | null
  pa_cost_per_second?: number | string | null
  increasing_damage_per_second?: number | string | null
  max_projectiles?: number | string | null
  increasing_damage_per_projectile?: number | string | null
  conditional_additional_damage?: boolean
  turn_duration_rounds?: number | string | null
}

interface DatabaseSpell {
  id: string
  name: string
  type: string
  category: string
  section: string
  subcategory: string
  grade: string
  difficulty?: number | string | null
  description: string
  additional_description?: string | null
  story_1?: string | null
  story_2?: string | null
  primary_branch?: string | null
  secondary_branch?: string | null
  primary_specificity?: string | null
  secondary_specificity?: string | null
  levels: LevelRow[]
}

// helpers
const n = (v: unknown) => Number(v ?? 0)
const gt0 = (v: unknown) => n(v) > 0
const hasText = (v?: string | null) => !!(v && v.trim().length)

export function ImportSpellModal({
  isOpen,
  onOpenChange,
  character,
  updateCharacter,
  characterId,
  preselectedSection,
  preselectedCategory,
  preselectedGrade,
  mode = 'character',
  onConfirm
}: ImportSpellModalProps) {
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState(preselectedSection || 'all')
  const [selectedSubcategory, setSelectedSubcategory] = useState(preselectedCategory || 'all')
  const [selectedGrade, setSelectedGrade] = useState(preselectedGrade || 'all')
  const [spells, setSpells] = useState<DatabaseSpell[]>([])
  const [filteredSpells, setFilteredSpells] = useState<DatabaseSpell[]>([])
  const [selectedSpell, setSelectedSpell] = useState<DatabaseSpell | null>(null)
  const [selectedLevel, setSelectedLevel] = useState('1')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  // Dedup sottocategorie in base alla sezione selezionata
  const availableSubcategories = useMemo(() => {
    const raw = selectedSection === 'all'
      ? Object.values(MAGIC_SECTIONS).flatMap(s => Object.keys(s.categories))
      : Object.keys(MAGIC_SECTIONS[selectedSection as keyof typeof MAGIC_SECTIONS]?.categories || {})

    const seen = new Set<string>()
    const uniq: string[] = []
    for (const s of raw) {
      const key = s.trim().toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        uniq.push(s.trim())
      }
    }
    return uniq
  }, [selectedSection])

  // Carica le magie dal database (con i 3 filtri concatenati)
  const loadSpells = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('spells').select('*').order('name')

      if (selectedSection && selectedSection !== 'all') {
        query = query.like('category', `${selectedSection}_%`)
      }
      if (selectedSubcategory && selectedSubcategory !== 'all') {
        query = query.like('category', `%_${selectedSubcategory}_%`)
      }
      if (selectedGrade && selectedGrade !== 'all') {
        query = query.like('category', `%_${selectedGrade}`)
      }

      const { data, error } = await query
      if (error) throw error
      setSpells(data || [])
    } catch (error) {
      console.error('Error loading spells:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le magie',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedSection, selectedSubcategory, selectedGrade, toast])

  // Filtra localmente per testo
  useEffect(() => {
    let filtered = spells
    if (hasText(searchTerm)) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(spell =>
        spell.name.toLowerCase().includes(q) ||
        (spell.description || '').toLowerCase().includes(q)
      )
    }
    setFilteredSpells(filtered)
  }, [spells, searchTerm])

  // Carica su apertura o quando cambiano i filtri
  useEffect(() => {
    if (isOpen) void loadSpells()
  }, [isOpen, loadSpells])

  // Reset quando si chiude la modale
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedSpell(null)
      setSelectedLevel('1')
      setSelectedSection(preselectedSection || 'all')
      setSelectedSubcategory(preselectedCategory || 'all')
      setSelectedGrade(preselectedGrade || 'all')
    }
  }, [isOpen, preselectedSection, preselectedCategory, preselectedGrade])

  const handleImportSpell = async () => {
    if (!selectedSpell) return

    // Modalità inline: restituisce la selezione al chiamante senza toccare il personaggio
    if (mode === 'inline' && onConfirm) {
      const lvl = parseInt(selectedLevel)
      onConfirm({ spell: selectedSpell, level: lvl })
      onOpenChange(false)
      return
    }

    if (!characterId || !character || !updateCharacter) return

    // evita doppioni nel personaggio
    const exists = character.custom_spells?.some(
      (s: any) => s.spell_id === selectedSpell.id
    )
    if (exists) {
      toast({
        title: 'Magia già presente',
        description: 'Questa magia è già stata aggiunta al personaggio',
        variant: 'destructive',
      })
      return
    }

    setImporting(true)
    try {
      const levelData = selectedSpell.levels.find(l => l.level === parseInt(selectedLevel))

      const primaryBranch = selectedSpell.primary_branch || ''
      const primarySpecificity = selectedSpell.primary_specificity || ''
      const grade = selectedSpell.grade || ''
      const correctCategory = `${primaryBranch}_${primarySpecificity}_${grade}`

      const newSpell = {
        id: `${selectedSpell.id}_${Date.now()}`,
        spell_id: selectedSpell.id,
        name: selectedSpell.name,
        difficulty: (selectedSpell as any)?.difficulty ?? null,
        type: selectedSpell.type,
        category: correctCategory,
        grade: selectedSpell.grade,
        description: selectedSpell.description,
        additional_description: selectedSpell.additional_description,
        story_1: selectedSpell.story_1,
        story_2: selectedSpell.story_2,
        primary_branch: selectedSpell.primary_branch,
        secondary_branch: selectedSpell.secondary_branch,
        primary_specificity: selectedSpell.primary_specificity,
        secondary_specificity: selectedSpell.secondary_specificity,
        current_level: parseInt(selectedLevel),
        levels: selectedSpell.levels,

        // nuovi campi livello
        guaranteed_damage: n(levelData?.guaranteed_damage),
        additional_damage: n(levelData?.additional_damage),
        action_cost: n(levelData?.action_cost),
        indicative_action_cost: n(levelData?.indicative_action_cost),
        duration: levelData?.duration || '',
        range: levelData?.range || '',
        special_effect: levelData?.special_effect || '',
        level_description: levelData?.level_description || '',

        // retrocompatibilità
        damage: gt0(levelData?.damage) ? n(levelData?.damage) : n(levelData?.guaranteed_damage),
        mana_cost: gt0(levelData?.mana_cost) ? n(levelData?.mana_cost) : n(levelData?.action_cost),
      }

      const updatedSpells = [...(character.custom_spells || []), newSpell]
      const updatedCharacter = { ...character, custom_spells: updatedSpells }

      updateCharacter({ custom_spells: updatedSpells })
      await saveCharacter(characterId, updatedCharacter)

      toast({
        title: 'Successo',
        description: `Magia "${selectedSpell.name}" (Livello ${selectedLevel}) aggiunta al personaggio!`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error importing spell:', error)
      toast({
        title: 'Errore',
        description: "Si è verificato un errore durante l'importazione della magia",
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Attiva': return 'bg-purple-500'
      case 'Passiva': return 'bg-blue-500'
      case 'Rituale': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importa Magia dal Database</DialogTitle>
          <DialogDescription>
            Cerca e importa magie esistenti dal database per aggiungerle al tuo personaggio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtri */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Cerca per nome</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cerca magie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="section">Sezione</Label>
              <Select value={selectedSection} onValueChange={(value) => {
                setSelectedSection(value)
                setSelectedSubcategory('all') // reset sottocategoria
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le sezioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="sec:all" value="all">Tutte le sezioni</SelectItem>
                  {Object.entries(MAGIC_SECTIONS).map(([key, section]) => (
                    <SelectItem key={`sec:${key}`} value={key}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subcategory">Sottocategoria</Label>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le sottocategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="sub:all" value="all">Tutte le sottocategorie</SelectItem>
                  {availableSubcategories.map((subcategory) => {
                    const key = `sub:${subcategory.toLowerCase()}`
                    return (
                      <SelectItem key={key} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grade">Grado</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti i gradi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="grade:all" value="all">Tutti i gradi</SelectItem>
                  <SelectItem key="grade:semplice" value="Semplice">Semplice</SelectItem>
                  <SelectItem key="grade:avanzata" value="Avanzata">Avanzata</SelectItem>
                  <SelectItem key="grade:suprema" value="Suprema">Suprema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista magie */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] w-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border border-current border-t-transparent rounded-full"></div>
                  <span className="ml-2">Caricamento magie...</span>
                </div>
              ) : filteredSpells.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna magia trovata con i filtri selezionati
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredSpells.map((spell) => (
                    <Card
                      key={`spell:${spell.id}`}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedSpell?.id === spell.id
                          ? 'ring-2 ring-primary bg-primary/5 shadow-md'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedSpell(spell)
                        const cardElement = document.querySelector(`[data-spell-id="${spell.id}"]`)
                        if (cardElement) {
                          cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                        }
                      }}
                      data-spell-id={spell.id}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base">{spell.name}</h3>
                              {gt0((spell as any)?.difficulty) && (
                                <Badge variant="outline" className="text-xs bg-yellow-500 text-white border-yellow-600">
                                  Diff {n((spell as any).difficulty)}
                                </Badge>
                              )}
                              <Badge className={`${getBadgeColor(spell.type)} text-white text-xs`}>{spell.type}</Badge>
                              <Badge variant="outline" className="text-xs">{spell.grade}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {spell.category} • {spell.subcategory}
                            </p>
                            <p className="text-sm line-clamp-2">{spell.description}</p>
                            {selectedSpell?.id === spell.id && (
                              <div className="mt-3 pt-3 border-t border-muted">
                                <p className="text-xs text-muted-foreground mb-2">Anteprima livelli disponibili:</p>
                                <div className="flex flex-wrap gap-1">
                                  {spell.levels.slice(0, 5).map((level) => (
                                    <Badge key={`lvpill:${spell.id}:${level.level}`} variant="secondary" className="text-xs">
                                      Lv.{level.level}
                                    </Badge>
                                  ))}
                                  {spell.levels.length > 5 && (
                                    <Badge key={`lvpill:more:${spell.id}`} variant="secondary" className="text-xs">
                                      +{spell.levels.length - 5}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedSpell?.id === spell.id && (
                            <div className="ml-4 flex-shrink-0">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selezione livello */}
          {selectedSpell && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level">Seleziona Livello</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSpell.levels.map((level) => (
                        <SelectItem
                          key={`lvl:${selectedSpell.id}:${level.level}`}
                          value={level.level.toString()}
                        >
                          {`Livello ${level.level}`}
                          {gt0(level.mana_cost) ? ` (${n(level.mana_cost)} Mana)` : ''}
                          {hasText(level.level_description) ? ` - ${level.level_description}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Anteprima livello */}
                <div>
                  <Label>Dettagli Livello {selectedLevel}</Label>
                  {(() => {
                    const levelData = selectedSpell.levels.find(l => l.level === parseInt(selectedLevel))
                    return levelData ? (
                      <div className="text-sm space-y-1 mt-1">
                        {gt0(levelData.action_cost) && (
                          <div>Costo PA: {n(levelData.action_cost)}</div>
                        )}
                        {gt0(levelData.indicative_action_cost) && (
                          <div>PA Massimale: {n(levelData.indicative_action_cost)}</div>
                        )}
                        {gt0(levelData.mana_cost) && (
                          <div>Costo Mana: {n(levelData.mana_cost)}</div>
                        )}
                        {hasText(levelData.duration) && <div>Durata: {levelData.duration}</div>}
                        {hasText(levelData.range) && <div>Raggio: {levelData.range}</div>}
                        {hasText((levelData as any).damage_shape) && <div>Forma del danno: {String((levelData as any).damage_shape)}</div>}
                        {gt0((levelData as any).area_or_cone_value) && <div>Valore area/cono: {n((levelData as any).area_or_cone_value)}</div>}
                        {gt0((levelData as any).chain_targets) && <div>Bersagli catena: {n((levelData as any).chain_targets)}</div>}
                        {gt0((levelData as any).max_projectiles) && <div>Max proiettili: {n((levelData as any).max_projectiles)}</div>}
                        {gt0((levelData as any).increasing_damage_per_projectile) && <div>Danno crescente/proiettile: {n((levelData as any).increasing_damage_per_projectile)}</div>}
                        {gt0((levelData as any).max_seconds) && <div>Max secondi: {n((levelData as any).max_seconds)}</div>}
                        {gt0((levelData as any).pa_cost_per_second) && <div>Costo PA/secondo: {n((levelData as any).pa_cost_per_second)}</div>}
                        {gt0((levelData as any).increasing_damage_per_second) && <div>Danno crescente/secondo: {n((levelData as any).increasing_damage_per_second)}</div>}
                        {(() => {
                          const vals = Array.isArray((levelData as any).damage_values) ? ((levelData as any).damage_values as any[]) : []
                          const shown = vals.filter(v => gt0(v?.guaranteed_damage) || gt0(v?.additional_damage))
                          if (shown.length === 0) return null
                          return (
                            <div className="pt-1">
                              <div className="text-xs text-muted-foreground">Danni per tipo</div>
                              <div className="space-y-0.5">
                                {shown.map((v, i) => (
                                  <div key={i}>
                                    • {String(v?.typeName || v?.name || 'Tipo')}: {gt0(v?.guaranteed_damage) ? `assicurato ${n(v.guaranteed_damage)}` : ''}{gt0(v?.additional_damage) ? `${gt0(v?.guaranteed_damage) ? ', ' : ''}aggiuntivo ${n(v.additional_damage)}` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                        {(() => {
                          const vals = Array.isArray((levelData as any).percentage_damage_values) ? ((levelData as any).percentage_damage_values as any[]) : []
                          const shown = vals.filter(v => gt0(v?.guaranteed_percentage_damage) || gt0(v?.additional_percentage_damage))
                          if (shown.length === 0) return null
                          return (
                            <div className="pt-1">
                              <div className="text-xs text-muted-foreground">Danni percentuali</div>
                              <div className="space-y-0.5">
                                {shown.map((v, i) => (
                                  <div key={i}>
                                    • {String(v?.typeName || v?.name || 'Tipo')}: {gt0(v?.guaranteed_percentage_damage) ? `assicurato ${n(v.guaranteed_percentage_damage)}%` : ''}{gt0(v?.additional_percentage_damage) ? `${gt0(v?.guaranteed_percentage_damage) ? ', ' : ''}aggiuntivo ${n(v.additional_percentage_damage)}%` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                        {hasText(levelData.anomalies) && <div>Anomalie: {levelData.anomalies}</div>}
                        {hasText(levelData.special_effect) && <div>Effetto: {levelData.special_effect}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-1">Nessun dettaglio disponibile</div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleImportSpell}
            disabled={!selectedSpell || importing}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {importing ? (
              <>
                <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full mr-2"></div>
                Importazione...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Importa Magia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
