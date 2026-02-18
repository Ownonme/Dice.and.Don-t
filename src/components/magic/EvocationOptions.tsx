import React, { useState, useEffect } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CHARACTER_STAT_KEYS = ['forza','percezione','resistenza','intelletto','agilita','sapienza','anima'] as const;
const STAT_LABELS: Record<(typeof CHARACTER_STAT_KEYS)[number], string> = {
  forza: 'Forza',
  percezione: 'Percezione',
  resistenza: 'Resistenza',
  intelletto: 'Intelletto',
  agilita: 'Agilità',
  sapienza: 'Sapienza',
  anima: 'Anima',
};

export function EvocationGeneralFields({ control, enabled }: { control: any; enabled: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Scheda evocazione?</Label>
          <Controller
            name="evocationEnabled"
            control={control}
            render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona se è una evocazione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Sì</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {enabled ? (
          <div>
            <Label>Tipo evocazione</Label>
            <Controller
              name="evocationType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo evocazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weapon">Un'arma</SelectItem>
                    <SelectItem value="replica">Una replica</SelectItem>
                    <SelectItem value="energy">Una forma di energia</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EvocationLevelFields({
  control,
  index,
  enabled,
  type,
  imported,
  importedType,
}: {
  control: any;
  index: number;
  enabled: boolean;
  type: 'weapon' | 'replica' | 'energy';
  imported?: any;
  importedType?: 'weapon' | 'entity' | 'replica';
}) {
  const { setValue, watch } = useFormContext();
  const { toast } = useToast();
  const [searchType, setSearchType] = useState<'ability' | 'spell'>('ability');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, any>>({});

  // FieldArrays per forma di energia
  const energyStats = useFieldArray({
    control,
    name: `levels.${index}.energy_stats`,
  });

  const embeddedRefs = useFieldArray({
    control,
    name: `levels.${index}.energy_embedded_refs`,
  });

  useEffect(() => {
    try {
      if (!enabled || type !== 'weapon') return;
      const importedWeapon = importedType === 'weapon' ? (imported?.weapon ?? imported) : imported;
      if (!importedWeapon || !setValue) return;
      const curLight = watch?.(`levels.${index}.weapon_light_damage`);
      const curHeavy = watch?.(`levels.${index}.weapon_heavy_damage`);
      const curThrust = watch?.(`levels.${index}.weapon_thrust_damage`);

      const sets = Array.isArray(importedWeapon?.data?.damage_sets) ? importedWeapon.data.damage_sets : [];
      const pick = sets[0] || null;
      const light = typeof pick?.damage_veloce === 'number' ? pick.damage_veloce : (Number(importedWeapon?.damageVeloce) || 0);
      const heavy = typeof pick?.damage_pesante === 'number' ? pick.damage_pesante : (Number(importedWeapon?.damagePesante) || 0);
      const thrust = typeof pick?.damage_affondo === 'number' ? pick.damage_affondo : (Number(importedWeapon?.damageAffondo) || 0);

      if ((Number(curLight) || 0) === 0 && light) setValue(`levels.${index}.weapon_light_damage`, light, { shouldDirty: true });
      if ((Number(curHeavy) || 0) === 0 && heavy) setValue(`levels.${index}.weapon_heavy_damage`, heavy, { shouldDirty: true });
      if ((Number(curThrust) || 0) === 0 && thrust) setValue(`levels.${index}.weapon_thrust_damage`, thrust, { shouldDirty: true });
    } catch {}
  }, [enabled, imported, importedType, index, setValue, type, watch]);

  // Pre-popolazione delle 7 statistiche con chiavi fisse e valore vuoto (null)
  useEffect(() => {
    if (!enabled || type !== 'energy') return;
    const existingKeys = (energyStats.fields || []).map((f: any) => f.statKey).filter(Boolean);
    CHARACTER_STAT_KEYS.forEach((k) => {
      if (!existingKeys.includes(k)) {
        energyStats.append({ statKey: k, amount: null });
      }
    });
  }, [enabled, type, energyStats]);

  const fetchDetails = async (typeSel: 'ability' | 'spell', id: string) => {
    try {
      if (typeSel === 'ability') {
        const { data, error } = await supabase
          .from('abilities')
          .select('id,name,levels')
          .eq('id', id)
          .single();
        if (!error && data) setSelectedDetails((prev) => ({ ...prev, [id]: data }));
      } else {
        const { data, error } = await supabase
          .from('spells')
          .select('id,name,levels')
          .eq('id', id)
          .single();
        if (!error && data) setSelectedDetails((prev) => ({ ...prev, [id]: data }));
      }
    } catch {}
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      if (searchType === 'ability') {
        const { data, error } = await supabase
          .from('abilities')
          .select('id,name')
          .ilike('name', `%${searchQuery}%`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } else {
        const { data, error } = await supabase
          .from('spells')
          .select('id,name')
          .ilike('name', `%${searchQuery}%`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const isDuplicate = (id: string, typeSel: 'ability' | 'spell', level: number | undefined) => {
    const lvl = level ?? 1;
    return embeddedRefs.fields.some((f: any) => f.refId === id && f.refType === typeSel && (f.refLevel ?? 1) === lvl);
  };

  useEffect(() => {
    if (!enabled || type !== 'energy') return;
    embeddedRefs.fields.forEach((f: any) => {
      if (!selectedDetails[f.refId]) fetchDetails(f.refType, f.refId);
    });
  }, [embeddedRefs.fields, enabled, selectedDetails, type]);

  if (!enabled) return null;

  if (type === 'weapon') {
    return (
      <div className="space-y-4">
        <Label className="font-medium">Evocazione: Arma</Label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Danno leggero</Label>
            <Controller
              name={`levels.${index}.weapon_light_damage`}
              control={control}
              render={({ field }) => (
                <Input {...field} type="number" min="0" placeholder="0" onChange={(e) => field.onChange(Number(e.target.value) || 0)} />
              )}
            />
          </div>
          <div>
            <Label>Danno pesante</Label>
            <Controller
              name={`levels.${index}.weapon_heavy_damage`}
              control={control}
              render={({ field }) => (
                <Input {...field} type="number" min="0" placeholder="0" onChange={(e) => field.onChange(Number(e.target.value) || 0)} />
              )}
            />
          </div>
          <div>
            <Label>Danno affondo</Label>
            <Controller
              name={`levels.${index}.weapon_thrust_damage`}
              control={control}
              render={({ field }) => (
                <Input {...field} type="number" min="0" placeholder="0" onChange={(e) => field.onChange(Number(e.target.value) || 0)} />
              )}
            />
          </div>
        </div>
        {importedType === 'weapon' && imported?.weapon ? (
          (() => {
            const wp = imported.weapon;
            const stats = wp?.stats || {};
            const data = wp?.data || {};
            const damageSets = Array.isArray(data?.damage_sets) ? data.damage_sets : [];
            const hasStats = Object.values(stats || {}).some((v: any) => (Number(v) || 0) !== 0);
            return (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm font-medium">Dettagli arma importata</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>Tipo arma: {data?.weapon_type_name ?? '—'}</div>
                  <div>Categoria: {data?.weapon_type_category ?? '—'}</div>
                  <div>Materiale: {data?.material_name ?? '—'}</div>
                  <div>Sottotipo: {wp?.subtype ? String(wp.subtype).replace('_',' ') : '—'}</div>
                  <div>Peso: {typeof wp?.weight === 'number' ? wp.weight : '—'}</div>
                </div>
                {hasStats ? (
                  <div className="mt-2 text-xs">
                    <div className="font-medium">Statistiche</div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(stats).map(([k, v]) => (
                        (Number(v) || 0) !== 0 ? <div key={k}>{k}: {v as any}</div> : null
                      ))}
                    </div>
                  </div>
                ) : null}
                {damageSets.length > 0 ? (
                  <div className="mt-2">
                    <div className="text-sm font-medium">Forme di danno dell'arma</div>
                    <div className="space-y-1 text-xs">
                      {damageSets.map((set: any, i: number) => (
                        <div key={`wp-dmg-${i}`} className="flex flex-wrap gap-3 items-center">
                          <span className="font-medium">{set?.effect_name ?? '—'}</span>
                          {typeof set?.damage_veloce === 'number' ? (
                            <span>
                              Veloce: {set.damage_veloce}
                              {typeof set?.calculated_damage_veloce === 'number' ? ` (calc: ${set.calculated_damage_veloce})` : ''}
                            </span>
                          ) : null}
                          {typeof set?.damage_pesante === 'number' ? (
                            <span>
                              Pesante: {set.damage_pesante}
                              {typeof set?.calculated_damage_pesante === 'number' ? ` (calc: ${set.calculated_damage_pesante})` : ''}
                            </span>
                          ) : null}
                          {typeof set?.damage_affondo === 'number' ? (
                            <span>
                              Affondo: {set.damage_affondo}
                              {typeof set?.calculated_damage_affondo === 'number' ? ` (calc: ${set.calculated_damage_affondo})` : ''}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 text-xs text-muted-foreground">
                  Costo PA livello: <Controller name={`levels.${index}.action_cost`} control={control} render={({ field }) => (<span>{field.value ?? '—'}</span>)} />
                </div>
              </div>
            );
          })()
        ) : null}
        <p className="text-xs text-muted-foreground">È comunque necessario selezionare un tipo di danno nella sezione generale.</p>
      </div>
    );
  }

  if (type === 'replica') {
    const importedReplica = importedType === 'replica' ? (imported?.replica ?? imported) : imported;
    return (
      <div className="space-y-4">
        <Label className="font-medium">Evocazione: Replica</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Quantità repliche massime</Label>
            <Controller
              name={`levels.${index}.max_replicas`}
              control={control}
              render={({ field }) => (
                <Input {...field} type="number" min="1" placeholder="1" onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)} />
              )}
            />
          </div>
          <div>
            <Label>ID personaggio (opzionale)</Label>
            <Controller
              name={`levels.${index}.replica_source_character_id`}
              control={control}
              render={({ field }) => <Input {...field} type="text" placeholder="uuid del personaggio" />}
            />
          </div>
        </div>
        {importedType === 'replica' && importedReplica ? (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="font-medium">Dettagli replica importata</div>
            <div>Origine: {importedReplica.origin}</div>
            {importedReplica.source_character_id ? (
              <div>Personaggio specifico: {importedReplica.source_character_id}</div>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">La replica può leggere dati dal personaggio collegato in futuro.</p>
      </div>
    );
  }

  // energy
  return (
    <div className="space-y-4">
      <Label className="font-medium">Evocazione: Forma di energia</Label>
      {importedType === 'entity' && imported ? (
        // Supporta sia struttura annidata (admin) sia flat
        (() => {
          const importedEntity = importedType === 'entity' ? (imported?.entity ?? imported) : imported;
          return (
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Dettagli entità importata</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>Armatura: {importedEntity?.specifics?.armor ?? '-'}</div>
            <div>Salute: {importedEntity?.specifics?.health ?? '-'}</div>
            <div>Punti Azione: {importedEntity?.specifics?.action_points ?? '-'}</div>
          </div>
          {Array.isArray(importedEntity?.damage?.by_type) && importedEntity.damage.by_type.length > 0 ? (
            <div className="mt-2">
              <div className="text-sm font-medium">Set di danno importati</div>
              <div className="space-y-1 text-xs">
                {importedEntity.damage.by_type.map((d: any, i: number) => (
                  <div key={`imp-dmg-${i}`} className="flex items-center justify-between">
                    <span>{String(d?.name || '').trim() || 'Senza nome'}</span>
                    <span>
                      Assicurato: {typeof d?.assured_damage === 'number' ? d.assured_damage : 0}
                      {typeof d?.additional_damage === 'number' ? ` • Aggiuntivo: ${d.additional_damage}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {Array.isArray(importedEntity?.spells) && importedEntity.spells.length > 0 ? (
            <div className="mt-2">
              <div className="text-sm font-medium">Magie incluse</div>
              <ul className="text-xs list-disc ml-5">
                {importedEntity.spells.map((s: any, i: number) => (
                  <li key={`imp-sp-${i}`}>{s.name ?? s.id} (Lv.{s.level ?? 1})</li>
                ))}
              </ul>
            </div>
          ) : null}
          {Array.isArray(importedEntity?.abilities) && importedEntity.abilities.length > 0 ? (
            <div className="mt-2">
              <div className="text-sm font-medium">Abilità incluse</div>
              <ul className="text-xs list-disc ml-5">
                {importedEntity.abilities.map((a: any, i: number) => (
                  <li key={`imp-ab-${i}`}>{a.name ?? a.id} (Lv.{a.level ?? 1})</li>
                ))}
              </ul>
            </div>
          ) : null}
          {importedEntity?.equipment ? (
            <div className="mt-2">
              <div className="text-sm font-medium">Equipaggiamento</div>
              <pre className="text-xs overflow-x-auto">{JSON.stringify(importedEntity.equipment, null, 2)}</pre>
            </div>
          ) : null}
        </div>
          );
        })()
      ) : null}
      {/* Salute / PA / Armatura */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Salute</Label>
          <Controller
            name={`levels.${index}.energy_health`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="0"
                placeholder="0"
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value) || 0)}
              />
            )}
          />
        </div>
        <div>
          <Label>Punti azione</Label>
          <Controller
            name={`levels.${index}.energy_action_points`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="0"
                placeholder="0"
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value) || 0)}
              />
            )}
          />
        </div>
        <div>
          <Label>Armatura</Label>
          <Controller
            name={`levels.${index}.energy_armour`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="0"
                placeholder="0"
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value) || 0)}
              />
            )}
          />
        </div>
      </div>

      {/* Statistiche come nel personaggio (fisse, già presenti) */}
      <div className="space-y-2">
        <Label>Statistiche (come nel personaggio)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {energyStats.fields.map((f: any, sIdx: number) => (
            <div key={f.id} className="grid grid-cols-2 gap-2 items-end">
              <div>
                <Label>{STAT_LABELS[(f.statKey as typeof CHARACTER_STAT_KEYS[number]) || 'forza'] || f.statKey}</Label>
                {/* StatKey bloccato: solo display, non modificabile */}
                <Input value={STAT_LABELS[(f.statKey as any)] || f.statKey || ''} disabled />
              </div>
              <Controller
                name={`levels.${index}.energy_stats.${sIdx}.amount`}
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    placeholder="(vuoto)"
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value) || 0)
                    }
                  />
                )}
              />
            </div>
          ))}
        </div>
        {/* Rimozione dei pulsanti Aggiungi/Rimuovi: statistiche sempre presenti, valori editabili */}
      </div>

      {/* Abilità/Magie incluse con ricerca e display dettagli */}
      <div className="space-y-3">
        <Label>Abilità/Magie incluse</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Select onValueChange={(v) => setSearchType(v as 'ability' | 'spell')} value={searchType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ability">Abilità</SelectItem>
                <SelectItem value="spell">Magia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome"
            />
            <Button type="button" onClick={handleSearch} disabled={searching}>
              {searching ? 'Ricerca...' : 'Cerca'}
            </Button>
          </div>
        </div>

        {/* Risultati ricerca */}
        {searchResults.length > 0 ? (
          <div className="space-y-1">
            {searchResults.map((r) => {
              const already = embeddedRefs.fields.some(
                (f: any) => f.refName === r.name && f.refType === searchType && ((f.refLevel ?? 1) === 1)
              );
              return (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{r.name}</span>
                  <Button
                    type="button"
                    disabled={already}
                    onClick={() => {
                      embeddedRefs.append({ refId: r.id, refName: r.name, refType: searchType, refLevel: 1 });
                      fetchDetails(searchType, r.id);
                    }}
                  >
                    {already ? 'Già aggiunto' : 'Aggiungi'}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nessun risultato</p>
        )}

        {/* Selezionati: mostra nome, livello, danni e costo PA; tipo bloccato */}
        <div className="space-y-2">
          <Label>Selezionati</Label>
          {embeddedRefs.fields.length > 0 ? (
            embeddedRefs.fields.map((f: any, rIdx: number) => {
              const details = selectedDetails[f.refId] || null;
              const levels = details?.levels || [];
              // Trova i dati del livello selezionato
              const levelNum = f.refLevel || 1;
              const levelData = levels.find((l: any) => l.level === levelNum) || null;

              // Normalizzazione campi di danno e PA fra ability/spell
              const baseDamage =
                (levelData?.danno_assicurato ?? null) ??
                (levelData?.guaranteed_damage ?? levelData?.damage ?? null);
              const addDamage =
                (levelData?.danno_aggiuntivo ?? null) ??
                (levelData?.additional_damage ?? null);
              const actionCost =
                (levelData?.punti_azione ?? null) ??
                (levelData?.action_cost ?? levelData?.mana_cost ?? null);

              return (
                <div key={f.id} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">
                        {details?.name || f.refName || f.refId} • {f.refType === 'ability' ? 'Abilità' : 'Magia'}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span>Livello:</span>
                        <Controller
                          name={`levels.${index}.energy_embedded_refs.${rIdx}.refLevel`}
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={(v) => field.onChange(parseInt(v, 10))}
                              value={(field.value ?? 1).toString()}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Livello" />
                              </SelectTrigger>
                              <SelectContent>
                                {(levels.length > 0 ? levels : [{ level: 1 }]).map((lv: any) => (
                                  <SelectItem key={lv.level} value={lv.level.toString()}>
                                    {lv.level}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <div>
                          <span className="font-medium">Danno:</span>{' '}
                          {baseDamage != null ? baseDamage : '—'}
                          {addDamage != null ? ` + ${addDamage}` : ''}
                        </div>
                        <div>
                          <span className="font-medium">Costo PA:</span>{' '}
                          {actionCost != null ? actionCost : '—'}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => embeddedRefs.remove(rIdx)}
                    >
                      Rimuovi
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">Nessun riferimento selezionato</p>
          )}
        </div>
      </div>

      {/* Creare equipaggiamento? */}
      <div className="space-y-2">
        <Label>Creare equipaggiamento?</Label>
        <Controller
          name={`levels.${index}.energy_can_create_equipment`}
          control={control}
          render={({ field }) => (
            <Select onValueChange={(v) => field.onChange(v === 'yes')} value={field.value ? 'yes' : 'no'}>
              <SelectTrigger>
                <SelectValue placeholder="Può creare equipaggiamento?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Sì</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Può anche includere danno (non obbligatorio). Durata in turni appare se impostata nelle informazioni generali.
      </p>
    </div>
  );
}
