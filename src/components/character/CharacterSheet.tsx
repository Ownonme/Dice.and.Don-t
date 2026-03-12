import React, { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { ScrollArea, ScrollBar } from "../ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"

import { AbilityDetailModal } from "@/components/abilities/AbilityDetailModal"
import { MagicDetailModal } from "@/components/magic/MagicDetailModal"
import { ABILITY_SECTIONS } from "@/constants/abilityConfig"

import type { Character, StatusAnomaly } from "../../types/character"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


interface CharacterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  character: Character | null
}

const sectionLabelMap: Record<string, string> = {
  fisiche: 'Fisiche',
  mentali: 'Mentali',
  sociali: 'Sociali',
  meleeOffensive: 'Mischia offensive',
  meleeDefensive: 'Mischia difensive',
  ranged: 'Armi a distanza',
  logic: 'Logica',
  stealth: 'Furtive'
}

const n = (v: unknown): number => Number(v ?? 0);
const gt0 = (v: unknown): boolean => n(v) > 0;
const hasText = (v?: string | null): boolean => !!(v && v.trim().length);
// Aggiunta: label leggibile per statistiche
const prettyStatLabel = (key: string): string => {
  const map: Record<string, string> = {
    'forza': 'Forza',
    'percezione': 'Percezione',
    'resistenza': 'Resistenza',
    'intelletto': 'Intelletto',
    'agilità': 'Agilità',
    'agilita': 'Agilità',
    'sapienza': 'Sapienza',
    'anima': 'Anima',
  };
  const normalized = (key || '').toString().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  const lowered = normalized.toLowerCase();
  if (map[lowered]) return map[lowered];
  return lowered.replace(/\b\w/g, (c) => c.toUpperCase());
};
const specLabel = (r: any): string => {
  const name = String(r?.name ?? '').trim();
  if (name) return name;
  const id = String(r?.id ?? r?.key ?? '').trim();
  return id || 'Specifica';
};
const getConsumeSpecifics = (item: any, levelData: any) => {
  const fromLevel = Array.isArray(levelData?.consume_custom_specifics) ? levelData.consume_custom_specifics : [];
  const fromItem = Array.isArray(item?.consume_custom_specifics) ? item.consume_custom_specifics : [];
  const raw = fromLevel.length > 0 ? fromLevel : fromItem;
  return raw.map((r: any) => ({
    id: String(r?.id ?? '').trim(),
    name: String(r?.name ?? '').trim(),
    value: n(r?.value ?? r?.amount ?? 0)
  })).filter((r: any) => r.value > 0 && (r.id || r.name));
};
const getGenerateSpecifics = (item: any, levelData: any) => {
  const fromLevel = Array.isArray(levelData?.generate_custom_specifics) ? levelData.generate_custom_specifics : [];
  const fromItem = Array.isArray(item?.generate_custom_specifics) ? item.generate_custom_specifics : [];
  const raw = fromLevel.length > 0 ? fromLevel : fromItem;
  return raw.map((r: any) => ({
    id: String(r?.id ?? '').trim(),
    name: String(r?.name ?? '').trim(),
    value: n(r?.value ?? r?.amount ?? 0)
  })).filter((r: any) => r.value > 0 && (r.id || r.name));
};
const getPassiveCustomSpecifics = (item: any, levelData: any) => {
  const fromLevel = Array.isArray(levelData?.passive_custom_specifics) ? levelData.passive_custom_specifics : [];
  const fromItem = Array.isArray(item?.passive_custom_specifics) ? item.passive_custom_specifics : [];
  const raw = fromLevel.length > 0 ? fromLevel : fromItem;
  return raw.map((r: any) => ({
    id: String(r?.id ?? '').trim(),
    name: String(r?.name ?? '').trim(),
    max: n(r?.max ?? r?.value ?? 0)
  })).filter((r: any) => r.max > 0 && (r.id || r.name));
};

function sumAnomalyStat(anomalies: StatusAnomaly[] | undefined, key: string) {
  if (!anomalies || anomalies.length === 0) return 0
  return anomalies.reduce((acc, a) => acc + (a.statsModifier?.[key] ?? 0), 0)
}

export default function CharacterSheet({ open, onOpenChange, character }: CharacterSheetProps) {
  const [isAbilityDetailOpen, setIsAbilityDetailOpen] = useState(false)
  const [detailAbility, setDetailAbility] = useState<any>(null)

  const [isSpellDetailOpen, setIsSpellDetailOpen] = useState(false)
  const [detailSpell, setDetailSpell] = useState<any>(null)

  const nameInitial = useMemo(() => character?.name?.[0]?.toUpperCase() ?? '?', [character?.name])

  const baseStats = character?.baseStats ?? {
    forza: 0, resistenza: 0, destrezza: 0, carisma: 0, intelligenza: 0, percezione: 0
  }
  const anomalies = character?.anomalies ?? []

  const statKeys = Object.keys(baseStats)

const groupedSpells = useMemo(() => {
  const spells = character?.custom_spells ?? []
  const groups: Record<string, any[]> = {}
  spells.forEach((sp: any) => {
    const branch = sp.primary_branch || 'Altro'
    const spec = sp.primary_specificity || ''
    const key = spec ? `${branch} - ${spec}` : branch
    if (!groups[key]) groups[key] = []
    groups[key].push(sp)
  })
  return groups
}, [character])

const groupedAbilities = useMemo(() => {
  const abilities = character?.custom_abilities ?? []
  const groups: Record<string, any[]> = {}
  abilities.forEach((ab: any) => {
    const category = ab.category || 'Altro'
    if (!groups[category]) groups[category] = []
    groups[category].push(ab)
  })
  return groups
}, [character])

const getTypeColor = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'fisica':
    case 'melee':
      return 'text-red-600 border-red-600/30'
    case 'mentale':
    case 'logic':
      return 'text-blue-600 border-blue-600/30'
    case 'magica':
    case 'magic':
      return 'text-purple-600 border-purple-600/30'
    case 'sociale':
      return 'text-amber-600 border-amber-600/30'
    case 'stealth':
      return 'text-emerald-600 border-emerald-600/30'
    case 'ranged':
      return 'text-sky-600 border-sky-600/30'
    default:
      return 'text-gray-600 border-gray-600/30'
  }
}

const handleSpellClick = (sp: any) => {
  setDetailSpell(sp)
  setIsSpellDetailOpen(true)
}

const handleAbilityClick = (ab: any) => {
  setDetailAbility(ab)
  setIsAbilityDetailOpen(true)
}

  // Mostra un invito alla selezione se nessun personaggio è selezionato
  if (!character) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Seleziona un personaggio</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            Per visualizzare la scheda, seleziona un personaggio dalla lista.
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={character?.avatar_url ?? ''} alt={character?.name ?? 'Avatar'} />
              <AvatarFallback>{nameInitial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-lg font-semibold">{character?.name ?? 'Personaggio'}</span>
              {typeof character?.level === 'number' && (
                <span className="text-sm text-muted-foreground">Livello {character?.level}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[80vh]">
          <div className="space-y-6 p-6">
            {/* Statistiche base + anomalie */}
            <Card>
              <CardHeader>
                <CardTitle>Statistiche (Base + Anomalie)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {statKeys.map((key) => {
                    const base = (baseStats as any)[key] ?? 0
                    const mod = sumAnomalyStat(anomalies, key)
                    const total = base + mod
                    return (
                      <div key={key} className="flex flex-col rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{key}</span>
                          <Badge variant="secondary">Totale {total}</Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Base: {base} {mod !== 0 && (
                            <span className={mod > 0 ? 'text-green-600' : 'text-red-600'}>
                              {mod > 0 ? `(+${mod})` : `(${mod})`} da anomalie
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Skill con livelli */}
            {/* Sezione Skill rimossa */}

            {/* Abilità (UTILE.txt) */}
            <Card>
              <CardHeader>
                <CardTitle>Abilità</CardTitle>
              </CardHeader>
              <CardContent>
                {character?.abilities ? (
                  <div className="space-y-6">
                    {Object.entries(ABILITY_SECTIONS).map(([sectionKey, section]) => (
                      <div key={sectionKey} className="border rounded-md">
                        <div className="px-3 py-2 border-b bg-muted/30 font-semibold">
                          {section.name}
                        </div>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(section.categories).map(([catKey, cat]: any) => {
                            const value = (character.abilities as any)?.[cat.competence] ?? 0
                            return (
                              <div key={catKey} className="flex items-center justify-between rounded-md border p-2">
                                <div className="text-sm font-medium">{cat.name}</div>
                                <Badge variant="outline">d{value}</Badge>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nessuna abilità disponibile.</div>
                )}
              </CardContent>
            </Card>

            {/* Magie raggruppate come nel CharacterSidebar di Dice */}
            <Card>
              <CardHeader>
                <CardTitle>Magie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.keys(groupedSpells).length > 0 ? (
                    Object.entries(groupedSpells).map(([group, spells]) => (
                      <div key={group} className="border rounded-md">
                        <div className="px-3 py-2 border-b bg-muted/30 font-semibold">
                          {group}
                        </div>
                        <div className="p-3 space-y-3">
                          {spells.map((sp: any) => {
                            const currentLevel = sp.levels?.find((l: any) => Number(l?.level ?? 0) === Number(sp.current_level ?? sp.level ?? 1)) || sp.levels?.[0];
                            const consumeSpecifics = getConsumeSpecifics(sp, currentLevel || {});
                            const generateSpecifics = getGenerateSpecifics(sp, currentLevel || {});
                            const passiveCustomSpecifics = getPassiveCustomSpecifics(sp, currentLevel || {});
                            return (
                            <Card
                              key={`${sp.id}-${sp.name}-${sp.level}`}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleSpellClick(sp)}
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium">{sp.name}</CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">Lv. {sp.current_level ?? sp.level}</Badge>
                                    {sp.type && (
                                      <Badge className={`text-xs border ${getTypeColor(sp.type)}`}>{sp.type}</Badge>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 space-y-2">
                              {sp.description && (
                                <p className="text-xs text-muted-foreground">{sp.description}</p>
                              )}
                              {(consumeSpecifics.length > 0 || generateSpecifics.length > 0 || passiveCustomSpecifics.length > 0) && (
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {consumeSpecifics.length > 0 && (
                                    <div>
                                      <span className="font-medium">Specifiche consumate:</span>
                                      <div className="ml-2">
                                        {consumeSpecifics.map((r: any, i: number) => (
                                          <div key={`${r.id || r.name || i}`}>• {specLabel(r)}: {n(r.value)}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {generateSpecifics.length > 0 && (
                                    <div>
                                      <span className="font-medium">Specifiche generate:</span>
                                      <div className="ml-2">
                                        {generateSpecifics.map((r: any, i: number) => (
                                          <div key={`${r.id || r.name || i}`}>• {specLabel(r)}: {n(r.value)}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {passiveCustomSpecifics.length > 0 && (
                                    <div>
                                      <span className="font-medium">Specifiche sbloccate:</span>
                                      <div className="ml-2">
                                        {passiveCustomSpecifics.map((r: any, i: number) => (
                                          <div key={`${r.id || r.name || i}`}>• {specLabel(r)}: {n(r.max)}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                  <AccordionTrigger>visualizza livelli</AccordionTrigger>
                                  <AccordionContent>
                                    {sp.levels?.map((level: any) => (
                                      <div key={level.level} className="mt-2 p-2 bg-muted rounded text-xs">
                                        <span className="font-medium">Livello {level.level}:</span>
                                        {hasText(level.level_description) && <span className="ml-1">{level.level_description}</span>}

                                        {/* Danni */}
                                        {Array.isArray(level.damage_values) && level.damage_values.length > 0 && (
                                          <div className="mt-1 ml-2 text-xs text-muted-foreground">
                                            <span className="font-medium">Danni:</span>
                                            <div className="ml-2">
                                              {level.damage_values.map((d: any, i: number) => (
                                                <div key={i}>
                                                  • {d.typeName}: {n(d.guaranteed_damage)} (garantiti), {n(d.additional_damage)} (addizionali)
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Evocazione */}
                                        {level.evocation_enabled && (
                                          <div className="mt-1 ml-2 text-xs text-muted-foreground">
                                            <span className="font-medium">Evocazione:</span>
                                            <div className="ml-2">
                                              <div>• Tipo: {level.evocation_type === 'weapon' ? 'Arma' : level.evocation_type === 'replica' ? 'Replica' : level.evocation_type === 'energy' ? 'Energia' : '—'}</div>
                                              {level.evocation_type === 'weapon' && (
                                                <div className="ml-2">
                                                  {gt0(level.weapon_light_damage) && (<div>• Leggero: {n(level.weapon_light_damage)}</div>)}
                                                  {gt0(level.weapon_heavy_damage) && (<div>• Pesante: {n(level.weapon_heavy_damage)}</div>)}
                                                  {gt0(level.weapon_thrust_damage) && (<div>• Affondo: {n(level.weapon_thrust_damage)}</div>)}
                                                </div>
                                              )}
                                              {level.evocation_type === 'replica' && (
                                                <div className="ml-2">
                                                  {gt0(level.max_replicas) && (<div>• Massimo repliche: {n(level.max_replicas)}</div>)}
                                                  {hasText(level.replica_source_character_id) && (<div>• Sorgente: {level.replica_source_character_id}</div>)}
                                                </div>
                                              )}
                                              {level.evocation_type === 'energy' && (
                                                <div className="ml-2">
                                                  {gt0(level.energy_health) && (<div>• Salute: {n(level.energy_health)}</div>)}
                                                  {gt0(level.energy_action_points) && (<div>• PA: {n(level.energy_action_points)}</div>)}
                                                  {gt0(level.energy_armour) && (<div>• Armatura: {n(level.energy_armour)}</div>)}
                                                  {Array.isArray(level.energy_stats) && level.energy_stats.length > 0 && (
                                                    <div>
                                                      <span>• Statistiche:</span>
                                                      <div className="ml-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {level.energy_stats.map((s: any, i: number) => (
                                                          <div key={i} className="flex justify-between">
                                                            <span className="font-medium">{prettyStatLabel(s.statKey)}</span>
                                                            <span>{n(s.amount)}</span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {Array.isArray(level.energy_embedded_refs) && level.energy_embedded_refs.length > 0 && (
                                                    <div>
                                                      <span>• Magie:</span>
                                                      <div className="ml-2">
                                                        {level.energy_embedded_refs.map((r: any, i: number) => {
                                                          const name = r.refName || r.name || null
                                                          const levelVal = (r.refLevel ?? r.level ?? null)
                                                          if (!name && !levelVal) return null
                                                          return (
                                                            <div key={i}>
                                                              {name ?? 'Magia'}{levelVal ? ` (Livello ${levelVal})` : ''}
                                                            </div>
                                                          )
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {level.energy_can_create_equipment && <div>• Può creare equipaggiamento</div>}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </CardContent>
                            </Card>
                          )})}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Nessuna magia disponibile.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* Modali dettaglio */}
        <AbilityDetailModal
        isOpen={isAbilityDetailOpen}
        onOpenChange={setIsAbilityDetailOpen}
        ability={detailAbility}
      />
      <MagicDetailModal
        isOpen={isSpellDetailOpen}
        onOpenChange={setIsSpellDetailOpen}
        spell={detailSpell}
      />
      </DialogContent>
    </Dialog>
  )
}
