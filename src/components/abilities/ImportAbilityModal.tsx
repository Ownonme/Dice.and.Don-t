import { useState, useEffect, useCallback } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, Plus } from 'lucide-react'
import { useCharacters } from '@/hooks/useCharacters'
import { ABILITY_SECTIONS } from '@/constants/abilityConfig'

interface ImportAbilityModalProps {
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
  onConfirm?: (payload: { ability: DatabaseAbility; level: number }) => void
}

interface DatabaseAbility {
  id: string
  name: string
  type: string
  category: string
  subcategory: string
  grade: string
  description: string
  additional_description?: string
  levels: Array<{
    level: number
    danno_assicurato?: number
    danno_aggiuntivo?: number
    punti_azione?: number
    punti_azione_indicativi?: number
    action_cost?: number | string | null
    indicative_action_cost?: number | string | null
    special_effect?: string
    level_description?: string
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
  }>
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  const s = String(v ?? '').trim().replace(',', '.')
  const m = s.match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : 0
}

const hasText = (v: unknown): boolean => String(v ?? '').trim().length > 0

export function ImportAbilityModal({
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
}: ImportAbilityModalProps) {
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState(preselectedSection || 'all')
  const [selectedSubcategory, setSelectedSubcategory] = useState(preselectedCategory || 'all')
  const [selectedGrade, setSelectedGrade] = useState(preselectedGrade || 'all')
  const [abilities, setAbilities] = useState<DatabaseAbility[]>([])
  const [filteredAbilities, setFilteredAbilities] = useState<DatabaseAbility[]>([])
  const [selectedAbility, setSelectedAbility] = useState<DatabaseAbility | null>(null)
  const [selectedLevel, setSelectedLevel] = useState('1')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  // Carica le abilità dal database
  const loadAbilities = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('abilities')
        .select('*')
        .order('name')

      // Applica filtri se presenti
      if (selectedSection && selectedSection !== 'all') {
        query = query.eq('category', selectedSection)
      }
      if (selectedSubcategory && selectedSubcategory !== 'all') {
        query = query.eq('subcategory', selectedSubcategory)
      }
      if (selectedGrade && selectedGrade !== 'all') {
        query = query.eq('grade', selectedGrade)
      }

      const { data, error } = await query
      if (error) throw error

      setAbilities(data || [])
    } catch (error) {
      console.error('Error loading abilities:', error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le abilità",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedSection, selectedSubcategory, selectedGrade, toast])

  // Filtra le abilità in base al termine di ricerca
  useEffect(() => {
    let filtered = abilities

    if (searchTerm) {
      filtered = filtered.filter(ability =>
        ability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ability.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAbilities(filtered)
  }, [abilities, searchTerm])

  // Carica le abilità quando si apre la modale o cambiano i filtri
  useEffect(() => {
    if (isOpen) {
      void loadAbilities()
    }
  }, [isOpen, loadAbilities])

  // Reset quando si chiude la modale
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedAbility(null)
      setSelectedLevel('1')
      setSelectedSection(preselectedSection || 'all')
      setSelectedSubcategory(preselectedCategory || 'all')
      setSelectedGrade(preselectedGrade || 'all')
    }
  }, [isOpen, preselectedSection, preselectedCategory, preselectedGrade])

  // Ottieni le sottocategorie disponibili per la sezione selezionata
  const getAvailableSubcategories = () => {
    if (selectedSection === 'all') {
      return Object.values(ABILITY_SECTIONS).flatMap(section => 
        Object.keys(section.categories)
      )
    }
    return Object.keys(ABILITY_SECTIONS[selectedSection as keyof typeof ABILITY_SECTIONS]?.categories || {})
  }

  const handleImportAbility = async () => {
    if (!selectedAbility || !characterId) return

    // Verifica se l'abilità è già presente
    const existingAbility = character.custom_abilities?.find(
      (a: any) => a.ability_id === selectedAbility.id
    )

    if (existingAbility) {
      toast({
        title: "Abilità già presente",
        description: "Questa abilità è già stata aggiunta al personaggio",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      // Ottieni i dettagli del livello selezionato
      const levelData = selectedAbility.levels.find(l => l.level === parseInt(selectedLevel))
      
      // Crea l'oggetto abilità da aggiungere al personaggio
      const newAbility = {
        id: `${selectedAbility.id}_${Date.now()}`, // ID unico per il personaggio
        ability_id: selectedAbility.id, // Riferimento all'abilità originale
        name: selectedAbility.name,
        type: selectedAbility.type,
        category: selectedAbility.subcategory,
        grade: selectedAbility.grade,
        description: selectedAbility.description,
        current_level: parseInt(selectedLevel),
        levels: selectedAbility.levels, // Mantieni tutti i livelli per la modifica
        // Dati del livello corrente per accesso rapido
        danno_assicurato: levelData?.danno_assicurato || 0,
        danno_aggiuntivo: levelData?.danno_aggiuntivo || 0,
        punti_azione: levelData?.punti_azione || 0,
        punti_azione_indicativi: levelData?.punti_azione_indicativi || 0,
        special_effect: levelData?.special_effect || '',
        level_description: levelData?.level_description || ''
      }

      // Aggiorna le abilità del personaggio
      const updatedAbilities = [...(character.custom_abilities || []), newAbility]
      const updatedCharacter = {
        ...character,
        custom_abilities: updatedAbilities
      }

      updateCharacter({ custom_abilities: updatedAbilities })
      await saveCharacter(characterId, updatedCharacter)

      toast({
        title: "Successo",
        description: `Abilità "${selectedAbility.name}" (Livello ${selectedLevel}) aggiunta al personaggio!`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error importing ability:', error)
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione dell'abilità",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Attiva': return 'bg-red-500'
      case 'Passiva': return 'bg-blue-500'
      case 'Suprema': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importa Abilità dal Database</DialogTitle>
          <DialogDescription>
            Cerca e importa abilità esistenti dal database per aggiungerle al tuo personaggio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtri di ricerca */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Cerca per nome</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cerca abilità..."
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
                setSelectedSubcategory('all') // Reset sottocategoria quando cambia sezione
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le sezioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le sezioni</SelectItem>
                  {Object.entries(ABILITY_SECTIONS).map(([key, section]) => (
                    <SelectItem key={key} value={key}>{section.name}</SelectItem>
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
                  <SelectItem value="all">Tutte le sottocategorie</SelectItem>
                  {getAvailableSubcategories().map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                  ))}
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
                  <SelectItem value="all">Tutti i gradi</SelectItem>
                  <SelectItem value="Semplice">Semplice</SelectItem>
                  <SelectItem value="Avanzata">Avanzata</SelectItem>
                  <SelectItem value="Suprema">Suprema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista delle abilità */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] w-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border border-current border-t-transparent rounded-full"></div>
                  <span className="ml-2">Caricamento abilità...</span>
                </div>
              ) : filteredAbilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna abilità trovata con i filtri selezionati
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredAbilities.map((ability, index) => (
                    <Card 
                      key={ability.id} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedAbility?.id === ability.id 
                          ? 'ring-2 ring-primary bg-primary/5 shadow-md' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedAbility(ability)
                        // Scroll automatico all'abilità selezionata se necessario
                        const cardElement = document.querySelector(`[data-ability-id="${ability.id}"]`)
                        if (cardElement) {
                          cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                        }
                      }}
                      data-ability-id={ability.id}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base">{ability.name}</h3>
                              <Badge className={`${getBadgeColor(ability.type)} text-white text-xs`}>
                                {ability.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{ability.grade}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {ability.category} • {ability.subcategory}
                            </p>
                            <p className="text-sm line-clamp-2">{ability.description}</p>
                            {selectedAbility?.id === ability.id && (
                              <div className="mt-3 pt-3 border-t border-muted">
                                <p className="text-xs text-muted-foreground mb-2">Anteprima livelli disponibili:</p>
                                <div className="flex flex-wrap gap-1">
                                  {ability.levels.slice(0, 5).map((level) => (
                                    <Badge key={level.level} variant="secondary" className="text-xs">
                                      Lv.{level.level}
                                    </Badge>
                                  ))}
                                  {ability.levels.length > 5 && (
                                    <Badge variant="secondary" className="text-xs">+{ability.levels.length - 5}</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedAbility?.id === ability.id && (
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
          {selectedAbility && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level">Seleziona Livello</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedAbility.levels.map((level) => (
                        <SelectItem key={level.level} value={level.level.toString()}>
                          Livello {level.level}
                          {level.punti_azione && ` (${level.punti_azione} PA)`}
                          {level.level_description && ` - ${level.level_description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Anteprima del livello selezionato */}
                <div>
                  <Label>Dettagli Livello {selectedLevel}</Label>
                  {(() => {
                    const levelData = selectedAbility.levels.find(l => l.level === parseInt(selectedLevel))
                    return levelData ? (
                      <div className="text-sm space-y-1 mt-1">
                        {toNum(levelData.punti_azione ?? levelData.action_cost) > 0 ? (
                          <div>Costo PA: {toNum(levelData.punti_azione ?? levelData.action_cost)}</div>
                        ) : null}
                        {toNum(levelData.punti_azione_indicativi ?? levelData.indicative_action_cost) > 0 ? (
                          <div>PA Indicativi: {toNum(levelData.punti_azione_indicativi ?? levelData.indicative_action_cost)}</div>
                        ) : null}
                        {hasText((levelData as any).damage_shape) && (
                          <div>Forma del danno: {String((levelData as any).damage_shape)}</div>
                        )}
                        {toNum((levelData as any).area_or_cone_value) > 0 && (
                          <div>Valore area/cono: {toNum((levelData as any).area_or_cone_value)}</div>
                        )}
                        {toNum((levelData as any).chain_targets) > 0 && (
                          <div>Bersagli catena: {toNum((levelData as any).chain_targets)}</div>
                        )}
                        {toNum((levelData as any).max_projectiles) > 0 && (
                          <div>Max proiettili: {toNum((levelData as any).max_projectiles)}</div>
                        )}
                        {toNum((levelData as any).increasing_damage_per_projectile) > 0 && (
                          <div>Danno crescente/proiettile: {toNum((levelData as any).increasing_damage_per_projectile)}</div>
                        )}
                        {toNum((levelData as any).max_seconds) > 0 && (
                          <div>Max secondi: {toNum((levelData as any).max_seconds)}</div>
                        )}
                        {toNum((levelData as any).pa_cost_per_second) > 0 && (
                          <div>Costo PA/secondo: {toNum((levelData as any).pa_cost_per_second)}</div>
                        )}
                        {toNum((levelData as any).increasing_damage_per_second) > 0 && (
                          <div>Danno crescente/secondo: {toNum((levelData as any).increasing_damage_per_second)}</div>
                        )}
                        {(() => {
                          const vals = Array.isArray((levelData as any).damage_values) ? ((levelData as any).damage_values as any[]) : []
                          const shown = vals.filter(v => toNum(v?.guaranteed_damage) > 0 || toNum(v?.additional_damage) > 0)
                          if (shown.length === 0) return null
                          return (
                            <div className="pt-1">
                              <div className="text-xs text-muted-foreground">Danni per tipo</div>
                              <div className="space-y-0.5">
                                {shown.map((v, i) => (
                                  <div key={i}>
                                    • {String(v?.typeName || v?.name || 'Tipo')}: {toNum(v?.guaranteed_damage)}{toNum(v?.additional_damage) > 0 ? ` + d${toNum(v?.additional_damage)}` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                        {(() => {
                          const vals = Array.isArray((levelData as any).percentage_damage_values) ? ((levelData as any).percentage_damage_values as any[]) : []
                          const shown = vals.filter(v => toNum(v?.guaranteed_percentage_damage) > 0 || toNum(v?.additional_percentage_damage) > 0)
                          if (shown.length === 0) return null
                          return (
                            <div className="pt-1">
                              <div className="text-xs text-muted-foreground">Danni percentuali</div>
                              <div className="space-y-0.5">
                                {shown.map((v, i) => (
                                  <div key={i}>
                                    • {String(v?.typeName || v?.name || 'Tipo')}: {toNum(v?.guaranteed_percentage_damage)}%{toNum(v?.additional_percentage_damage) > 0 ? ` + ${toNum(v?.additional_percentage_damage)}%` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                        {levelData.special_effect && (
                          <div>Effetto: {levelData.special_effect}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-1">
                        Nessun dettaglio disponibile
                      </div>
                    )
                  })()
                  }
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
            onClick={async () => {
              if (!selectedAbility) return

              // Modalità inline: restituisce la selezione al chiamante senza toccare il personaggio
              if (mode === 'inline' && onConfirm) {
                const lvl = parseInt(selectedLevel)
                onConfirm({ ability: selectedAbility, level: lvl })
                onOpenChange(false)
                return
              }

              // Altrimenti usa il flusso originale di import nel personaggio
              await handleImportAbility()
            }} 
            disabled={!selectedAbility || importing}
            className="bg-green-500 hover:bg-green-600"
          >
            {importing ? (
              <>
                <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full mr-2"></div>
                Importazione...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Importa Abilità
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
