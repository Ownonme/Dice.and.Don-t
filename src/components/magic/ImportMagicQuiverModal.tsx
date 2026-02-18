import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { listMagicQuivers } from '@/integrations/supabase/magicQuivers'
import { listDamageEffects } from '@/integrations/supabase/damageEffects'
import { useCharacters } from '@/hooks/useCharacters'

interface ImportMagicQuiverModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  character?: any
  updateCharacter?: (updates: any) => void
  characterId?: string
}

interface MagicQuiverRow {
  id: string
  name: string
  description?: string | null
  warnings?: string | null
  action_points_cost?: number | null
  indicative_action_points_cost?: number | null
  damage_sets?: {
    // Alcuni record possono esporre solo l'id dell'effetto
    damageEffectId?: string
    // Nome dell'effetto, preferito per la UI
    effect_name?: string
    guaranteed_damage?: number | null
    additional_damage?: number | null
  }[]
  anomalies?: {
    anomalyId?: string
    percent?: number
    name?: string
  }[]
}

const n = (v: unknown) => Number(v ?? 0)
const gt0 = (v: unknown) => n(v) > 0
const hasText = (v?: string | null) => !!(v && v.trim().length)
const isDefined = (v: unknown) => v !== null && v !== undefined
const apCostOf = (it: any) => (it?.action_points_cost ?? it?.actionPointsCost ?? null)
const apIndicativeOf = (it: any) => (it?.indicative_action_points_cost ?? it?.indicativeActionPointsCost ?? null)

export function ImportMagicQuiverModal({ isOpen, onOpenChange, character, updateCharacter, characterId }: ImportMagicQuiverModalProps) {
  const { toast } = useToast()
  const { saveCharacter } = useCharacters()
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState<MagicQuiverRow[]>([])
  const [filteredItems, setFilteredItems] = useState<MagicQuiverRow[]>([])
  const [selectedItem, setSelectedItem] = useState<MagicQuiverRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [damageEffectMap, setDamageEffectMap] = useState<Record<string, string>>({})

  const loadQuivers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMagicQuivers()
      setItems(data || [])
    } catch (error) {
      console.error('Error loading magic quivers:', error)
      toast({ title: 'Errore', description: 'Impossibile caricare le frecce magiche', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadEffects = useCallback(async () => {
    try {
      const effects = await listDamageEffects()
      const map: Record<string, string> = {}
      ;(effects || []).forEach((e: any) => {
        if (e?.id) map[e.id] = e.name || e.effect_name || String(e.id)
      })
      setDamageEffectMap(map)
    } catch (error) {
      console.warn('Impossibile caricare effetti danno:', error)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadQuivers()
      void loadEffects()
    }
  }, [isOpen, loadEffects, loadQuivers])

  useEffect(() => {
    let filtered = items
    if (hasText(searchTerm)) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(it =>
        it.name.toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q)
      )
    }
    setFilteredItems(filtered)
  }, [items, searchTerm])

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedItem(null)
    }
  }, [isOpen])

  const handleImport = async () => {
    if (!selectedItem) return
    if (!characterId || !character || !updateCharacter) return

    // evita doppioni (per id della tabella supabase)
    const exists = (character.magic_quivers || []).some((q: any) => q.id === selectedItem.id)
    if (exists) {
      toast({ title: 'Già presente', description: 'Questa freccia magica è già nella tua faretra', variant: 'destructive' })
      return
    }

    setImporting(true)
    try {
      const newItem = {
        id: selectedItem.id,
        name: selectedItem.name,
        description: selectedItem.description || '',
        warnings: selectedItem.warnings || null,
        action_points_cost: selectedItem.action_points_cost ?? (selectedItem as any).actionPointsCost ?? null,
        indicative_action_points_cost: selectedItem.indicative_action_points_cost ?? (selectedItem as any).indicativeActionPointsCost ?? null,
        damage_sets: (selectedItem.damage_sets || []).map((ds: any) => ({
          damageEffectId: ds.damageEffectId,
          effect_name: ds.effect_name || (ds.damageEffectId ? damageEffectMap[ds.damageEffectId] : undefined),
          guaranteed_damage: ds.guaranteed_damage ?? ds.guaranteedDamage ?? 0,
          additional_damage: ds.additional_damage ?? ds.additionalDamage ?? 0,
        })),
        anomalies: (selectedItem.anomalies || []).map((a: any) => ({
          anomalyId: a.anomalyId ?? a.id,
          percent: (typeof a.percent === 'number' ? a.percent : (typeof a.percentage === 'number' ? a.percentage : 0)),
          name: a.name,
        }))
      }

      const updated = [...(character.magic_quivers || []), newItem]
      const updatedCharacter = { ...character, magic_quivers: updated }
      updateCharacter({ magic_quivers: updated })
      await saveCharacter(characterId, updatedCharacter)

      toast({ title: 'Successo', description: `"${selectedItem.name}" aggiunta alla Faretra Magica` })
      onOpenChange(false)
    } catch (error) {
      console.error('Error importing magic quiver:', error)
      toast({ title: 'Errore', description: 'Problema durante l\'import della freccia magica', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importa Frecce Magiche</DialogTitle>
          <DialogDescription>
            Cerca e importa frecce magiche definite nel database nella tua faretra.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div>
            <Label htmlFor="search">Cerca per nome</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="search" placeholder="Cerca frecce magiche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[360px] w-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border border-current border-t-transparent rounded-full"></div>
                  <span className="ml-2">Caricamento...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nessun risultato</div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredItems.map((it) => (
                    <Card
                      key={`mq:${it.id}`}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedItem?.id === it.id ? 'ring-2 ring-primary bg-primary/5 shadow-md' : 'hover:bg-muted/50'}`}
                      onClick={() => setSelectedItem(it)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base">{it.name}</h3>
                              {isDefined(apCostOf(it)) && (
                                <Badge variant="outline" className="text-xs">PA: {n(apCostOf(it))}</Badge>
                              )}
                              {isDefined(apIndicativeOf(it)) && (
                                <Badge variant="outline" className="text-xs">PA Max: {n(apIndicativeOf(it))}</Badge>
                              )}
                            </div>
                          {hasText(it.description) && (
                            <p className="text-sm line-clamp-2">{it.description}</p>
                          )}
                          {hasText(it.warnings) && (
                            <p className="text-xs text-yellow-700 mt-1">Avvertenze: {it.warnings}</p>
                          )}
                          {Array.isArray(it.damage_sets) && it.damage_sets.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {it.damage_sets.slice(0, 3).map((ds: any, idx: number) => {
                                const effLabel = ds.effect_name || (ds.damageEffectId ? damageEffectMap[ds.damageEffectId] : undefined) || 'Effetto'
                                const gVal = ds.guaranteed_damage ?? ds.guaranteedDamage
                                const aVal = ds.additional_damage ?? ds.additionalDamage
                                return (
                                  <div key={`ds:${it.id}:${idx}`}>
                                    <span className="font-medium">{effLabel}:</span>
                                    {gVal !== undefined && (
                                      <span className="ml-1">Assicurato {n(gVal)}</span>
                                    )}
                                    {aVal !== undefined && (
                                      <span className="ml-2">Aggiuntivo {n(aVal)}</span>
                                    )}
                                  </div>
                                )
                              })}
                              {it.damage_sets.length > 3 && (
                                <div className="mt-1">+{it.damage_sets.length - 3} effetti</div>
                              )}
                            </div>
                          )}
                          {Array.isArray(it.anomalies) && it.anomalies.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">Anomalie:</span>
                              <span className="ml-1">
                                {it.anomalies.slice(0,3).map((a, i) => `${a.name || a.anomalyId || 'Anomalia'} ${typeof a.percent === 'number' ? `(${a.percent}%)` : ''}`).join(', ')}
                              </span>
                              {it.anomalies.length > 3 && (
                                <span className="ml-1">+{it.anomalies.length - 3}</span>
                              )}
                            </div>
                          )}
                          </div>
                          {selectedItem?.id === it.id && (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleImport} disabled={!selectedItem || importing} className="bg-purple-500 hover:bg-purple-600">
            {importing ? (
              <>
                <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full mr-2"></div>
                Importazione...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Importa Freccia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportMagicQuiverModal
