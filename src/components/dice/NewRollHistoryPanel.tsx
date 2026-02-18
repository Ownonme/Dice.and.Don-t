import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { NewRollEntry } from '@/hooks/useNewRollHistory';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  entries: NewRollEntry[];
  onClear?: () => void;
}

export function NewRollHistoryPanel({ entries, onClear }: Props) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [effectDetailsByEntry, setEffectDetailsByEntry] = React.useState<Record<string, Record<string, any>>>({});
  const [effectValuesByEntry, setEffectValuesByEntry] = React.useState<Record<string, Record<string, number>>>({});
  const [classicAttrByEntry, setClassicAttrByEntry] = React.useState<Record<string, 'armor' | 'health'>>({});
  const effectDetailsByEntryRef = React.useRef(effectDetailsByEntry);

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  React.useEffect(() => {
    effectDetailsByEntryRef.current = effectDetailsByEntry;
  }, [effectDetailsByEntry]);

  React.useEffect(() => {
    try {
      const vp = scrollRef.current?.querySelector('[data-scroll-viewport="true"]') as HTMLElement | null;
      if (vp) vp.scrollTop = 0;
    } catch {}
  }, [entries]);

  React.useEffect(() => {
    const ids = Object.keys(expanded).filter(id => expanded[id]);
    ids.forEach(async (id) => {
      const entry = entries.find(e => e.id === id);
      if (!entry || entry.entryType !== 'damage') return;
      const sources = Array.isArray(entry.damageSources) ? entry.damageSources : [];
      const accum: Record<string, number> = {};
      const parseBulletEffectName = (label: string): string | null => {
        const parts = label.split('•').map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) return null;
        return parts[1].replace(/\([^)]*\)\s*$/i, '').trim() || null;
      };
      sources.forEach((src: any) => {
        const label = String(src?.label || '').trim();
        let name: string | null = null;
        if (label.startsWith('Danno arma')) {
          const parts = label.split('•').map(s => s.trim());
          if (parts.length >= 2) name = parts[1];
        } else if (label.startsWith('Assicurato')) {
          const parts = label.split('•').map(s => s.trim());
          if (parts.length >= 2) name = parts[1];
        } else if (label.startsWith('Aggiuntivo')) {
          const parts = label.split('•').map(s => s.trim());
          if (parts.length >= 2) name = parts[1];
        } else if (label.includes('Tombola')) {
          const parts = label.split('•').map(s => s.trim());
          if (parts.length >= 3) name = parts[parts.length - 1];
        } else if (label.toLowerCase() === 'anima') {
          name = 'Anima';
        } else if (label.startsWith('Competenze')) {
          name = 'Competenze';
        } else if (label.startsWith('Bonus Contrattacco')) {
          name = 'Bonus Contrattacco';
        } else if (label.startsWith('Bonus Assassinio')) {
          name = 'Bonus Assassinio';
        } else if (label.startsWith('Danno crescente')) {
          const parts = label.split('•').map(s => s.trim());
          if (parts.length >= 2) name = parts[1];
          else name = 'Danno crescente';
        } else if (label.startsWith('Bonus')) {
          name = parseBulletEffectName(label);
        }
        if (name) {
          const v = Number(src?.value || 0) || 0;
          accum[name] = (accum[name] || 0) + v;
        }
      });
      setEffectValuesByEntry(prev => ({ ...prev, [id]: accum }));
      const names = Object.keys(accum);
      const already = effectDetailsByEntryRef.current[id];
      const need = names.filter(n => !(already && already[n]));
      if (need.length > 0) {
        const { data } = await supabase
          .from('damage_effects')
          .select('name, affects_action_points, affects_health, affects_armor, affects_classic_damage, bonus_effects')
          .in('name', names);
        const dict: Record<string, any> = { ...(already || {}) };
        (data || []).forEach((d: any) => { dict[d.name] = d; });
        if (names.includes('Anima')) {
          dict['Anima'] = { ...(dict['Anima'] || { name: 'Anima' }), affects_classic_damage: true };
        }
        if (names.includes('Competenze')) {
          dict['Competenze'] = { ...(dict['Competenze'] || { name: 'Competenze' }), affects_classic_damage: true };
        }
        if (names.includes('Bonus Contrattacco')) {
          dict['Bonus Contrattacco'] = { ...(dict['Bonus Contrattacco'] || { name: 'Bonus Contrattacco' }), affects_classic_damage: true };
        }
        if (names.includes('Bonus Assassinio')) {
          dict['Bonus Assassinio'] = { ...(dict['Bonus Assassinio'] || { name: 'Bonus Assassinio' }), affects_classic_damage: true };
        }
        if (names.includes('Danno crescente')) {
          dict['Danno crescente'] = { ...(dict['Danno crescente'] || { name: 'Danno crescente' }), affects_classic_damage: true };
        }
        setEffectDetailsByEntry(prev => ({ ...prev, [id]: dict }));
      }

      try {
        let attr: 'armor' | 'health' = 'armor';
        const targetName = String(entry.targetName || '').trim();
        if (targetName) {
          const { data: enemies } = await supabase
            .from('enemies')
            .select('id, name, enemy_current_armor, enemy_max_armor, enemy_current_hp')
            .eq('name', targetName)
            .limit(1);
          const enemy = enemies && enemies[0] ? enemies[0] : null;
          if (enemy) {
            const currentArmor = Number(enemy.enemy_current_armor ?? enemy.enemy_max_armor ?? 0) || 0;
            attr = currentArmor > 0 ? 'armor' : 'health';
          } else {
            const { data: chars } = await supabase
              .from('characters')
              .select('id, name, data')
              .eq('name', targetName)
              .limit(1);
            const ch = chars && chars[0] ? chars[0] : null;
            if (ch) {
              const d = (ch as any).data || {};
              const currArmor = Number(d.currentArmor ?? d.baseArmor ?? 0) || 0;
              attr = currArmor > 0 ? 'armor' : 'health';
            } else {
              const { data: evos } = await supabase
                .from('evocation_instances')
                .select('id, name, details')
                .eq('name', targetName)
                .limit(1);
              const evo = evos && evos[0] ? evos[0] : null;
              if (evo) {
                const det = (evo as any).details || {};
                const lvl = det.level_data || det || {};
                const armourVal = Number(lvl.energy_armour ?? lvl.armour ?? 0) || 0;
                attr = armourVal > 0 ? 'armor' : 'health';
              }
            }
          }
        }
        setClassicAttrByEntry(prev => ({ ...prev, [id]: attr }));
      } catch {}
    });
  }, [expanded, entries]);

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <CardTitle>Storico tiri</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        <ScrollArea ref={scrollRef} className="h-full p-3">
          <div className={cn("rounded-md border px-6 py-5 md:px-8 md:py-6", theme === 'gold-black' ? 'border-yellow-500/50' : 'border-blue-500/50')}>
          {entries.length === 0 && (
            <div className="text-sm text-muted-foreground">Nessun tiro registrato</div>
          )}
          {entries.map((e, idx) => {
            const compTotal =
              (e.competenceDetails || []).reduce((sum, c) => sum + (c.roll || 0), 0);
            const displayMessage = (() => {
              const baseMsg = String(e.message || '').trim();
              if (baseMsg) return baseMsg;
              if (e.entryType === 'damage') {
                const who = String(e.characterName || '').trim();
                const dmg = Math.round(Number(e.result || 0));
                const desc = e.damageDescription ? ` usando ${e.damageDescription}` : '';
                return `${who ? who + ' ' : ''}infligge ${dmg}${desc}`.trim();
              }
              const who = String(e.characterName || '').trim();
              const total = e.isPercent ? `${Math.round(Number(e.result || 0))}% su d100` : `${Math.round(Number(e.result || 0))} su d${Math.max(1, Number(e.diceMax || 0))}`;
              const stat = (e.statLabel || e.statKey || '').trim();
              const statTxt = stat ? ` con ${stat}` : '';
              return `${who ? who + ' ' : ''}ha effettuato ${total}${statTxt}`.trim();
            })();

            return (
              <div
                key={e.id}
                className="py-3 cursor-pointer"
                onClick={() => toggle(e.id)}
                role="button"
                aria-expanded={!!expanded[e.id]}
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') toggle(e.id);
                }}
              >
                <div className="text-[11px] text-muted-foreground">
                  {new Date(e.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    {displayMessage}
                    {e.badge && (
                      <Badge className="ml-2" variant={e.badge === 'Critico!' ? 'default' : e.badge === 'riuscito' ? 'secondary' : 'destructive'}>
                        {e.badge}
                      </Badge>
                    )}
                    {e.isPercent && typeof e.percentMinRequired === 'number' && e.percentMinRequired > 0 && (
                      <Badge className="ml-2" variant="outline">minimo {e.percentMinRequired}%</Badge>
                    )}
                  </div>
                  {(() => {
                    if (e.lottery) {
                      const choices = Array.isArray(e.lottery.choices) ? e.lottery.choices.filter((v) => typeof v === 'number' && v > 0) : [];
                      const rolls = Array.isArray(e.lottery.rolls) ? e.lottery.rolls : [];
                      const choiceSet = new Set(choices);
                      const rollSet = new Set(rolls);
                      const correctCount = (typeof e.lottery.correctCount === 'number')
                        ? Math.max(0, Number(e.lottery.correctCount || 0))
                        : rolls.filter(r => choiceSet.has(r)).length;
                      const wrongCount = (typeof e.lottery.wrongCount === 'number')
                        ? Math.max(0, Number(e.lottery.wrongCount || 0))
                        : choices.filter(v => v > 0 && !rollSet.has(v)).length;
                      return (
                        <div className="text-xl md:text-2xl font-bold tabular-nums text-yellow-500 shrink-0 min-w-[64px] text-right">
                          {`${correctCount} ✓, ${wrongCount} ✕`}
                        </div>
                      );
                    }
                    return (
                      <div className="text-xl md:text-2xl font-bold tabular-nums text-primary shrink-0 min-w-[64px] text-right">
                        {e.isPercent ? `${e.result}%` : e.result}
                      </div>
                    );
                  })()}
                </div>

                {expanded[e.id] && (
                  <div className="mt-2 rounded bg-muted/20 p-2 text-xs">
                    {e.entryType === 'damage' ? (
                      <>
                        <div className="font-medium mb-1">Dettagli danno</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                          <div className="md:col-span-2">
                            Fonti:
                            {(() => {
                              const sorted = [...(e.damageSources || [])].sort((a, b) => (a.pure === b.pure ? 0 : (a.pure ? -1 : 1)));
                              const isBonusLabel = (label: any) => /^bonus\b/i.test(String(label || '').trim());
                              const mainSources = sorted.filter(s => !isBonusLabel(s?.label));
                              const bonusSources = sorted.filter(s => isBonusLabel(s?.label));
                              const isResWeakLabel = (label: any) => /^[\s•-]*(resistenza:|debolezza:)/i.test(String(label || '').trim());
                              const resWeakSources = mainSources.filter(s => isResWeakLabel(s?.label));
                              const pureDamageSources = mainSources.filter(s => !isResWeakLabel(s?.label));
                              return (
                                <>
                                  {pureDamageSources.length > 0 ? (
                              <ul className="list-disc ml-4 mt-1">
                                    {pureDamageSources.map((src, i) => (
                                    <li key={i}>
                                      {(() => {
                                        const rawLabel = String(src?.label || '').trim();
                                        const roundedVal = Math.round(Number(src?.value || 0));
                                        const isMultiplier = rawLabel.toLowerCase().includes('moltiplicatore');
                                        const displayVal = isMultiplier ? roundedVal : roundedVal;
                                        return (
                                          <>
                                            {rawLabel}:{' '}
                                            {src.pure ? `*${displayVal}` : displayVal}
                                            {src.detail ? ` (${src.detail})` : ''}
                                          </>
                                        );
                                      })()}
                                    </li>
                                  ))}
                              </ul>
                                  ) : (
                              <span className="text-muted-foreground ml-1">Nessuna</span>
                                  )}

                                  {bonusSources.length > 0 && (
                                    <div className="mt-2">
                                      Bonus:
                                      <ul className="list-disc ml-4 mt-1">
                                        {bonusSources.map((src, i) => {
                                          const rawLabel = String(src?.label || '').trim();
                                          const roundedVal = Math.round(Number(src?.value || 0));
                                          const nameRaw = rawLabel.replace(/^bonus\b/i, '').trim();
                                          const name = nameRaw ? nameRaw.charAt(0).toUpperCase() + nameRaw.slice(1) : '—';
                                          const sign = roundedVal >= 0 ? '+' : '-';
                                          const abs = Math.abs(roundedVal);
                                          const isGuaranteed = /\(assicurato\)\s*$/i.test(nameRaw);
                                          const isAdditional = /\(aggiuntivo\)\s*$/i.test(nameRaw);
                                          const prefix = isGuaranteed ? 'Bonus assicurato' : isAdditional ? 'Bonus aggiuntivo' : 'Bonus';
                                          return (
                                            <li key={i}>
                                              {prefix}: {sign} '{name}' ({abs})
                                              {src.detail ? ` (${src.detail})` : ''}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {(() => {
                            const sorted = [...(e.damageSources || [])].sort((a, b) => (a.pure === b.pure ? 0 : (a.pure ? -1 : 1)));
                            const isBonusLabel = (label: any) => /^bonus\b/i.test(String(label || '').trim());
                            const mainSources = sorted.filter(s => !isBonusLabel(s?.label));
                            const isResWeakLabel = (label: any) => /^[\s•-]*(resistenza:|debolezza:)/i.test(String(label || '').trim());
                            const resWeakSources = mainSources.filter(s => isResWeakLabel(s?.label));
                            if (resWeakSources.length === 0) return null;
                            return (
                              <div className="md:col-span-2 mt-2">
                                <div>Debolezza/Resistenza:</div>
                                <ul className="list-disc ml-4 mt-1">
                                  {resWeakSources.map((src, i) => {
                                    const rawLabel = String(src?.label || '').trim();
                                    return (
                                      <li key={i}>
                                        {rawLabel}
                                        {src.detail ? ` (${src.detail})` : ''}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })()}
                          <div className="md:col-span-2 font-semibold">
                            Totale danno: {e.result}
                          </div>
                          {(() => {
                            const vals = effectValuesByEntry[e.id] || {};
                            const dets = effectDetailsByEntry[e.id] || {};
                            const keys = Object.keys(dets);
                            let pArmor = 0;
                            let pHealth = 0;
                            let pAss = 0;
                            keys.forEach((k) => {
                              const arr = Array.isArray(dets[k]?.bonus_effects) ? dets[k].bonus_effects : [];
                              arr.forEach((b: any) => {
                                const s = String(b || '').toLowerCase();
                                const m = s.match(/([+-]\s*\d+)\s*%/);
                                if (!m) return;
                                const p = parseInt(m[1].replace(/\s+/g, ''), 10);
                                if (s.includes('armatura')) pArmor += p;
                                else if (s.includes('salute')) pHealth += p;
                                else if (s.includes('assassinio')) pAss += p;
                              });
                            });
                            const attr = classicAttrByEntry[e.id] || 'armor';
                            let percent = attr === 'armor' ? pArmor : pHealth;
                            const hasAss = (e.damageSources || []).some(ds => String(ds?.label || '').toLowerCase().includes('assassinio'));
                            if (hasAss) percent += pAss;
                            const bonusTotal = Math.round(Number(e.result || 0) + (Number(e.result || 0) * (percent || 0) / 100));
                            return (
                              <>
                                <div className="md:col-span-2">Danno complessivo (Valore totale): {e.result}</div>
                                <div className="md:col-span-2">Danno bonus (Valore totale): {bonusTotal}</div>
                              </>
                            );
                          })()}
                          {(() => {
                            const vals = effectValuesByEntry[e.id] || {};
                            const dets = effectDetailsByEntry[e.id] || {};
                            const keys = Object.keys(vals);
                            if (keys.length === 0) return null;
                            return (
                              <div className="md:col-span-2 mt-2">
                                <div className="font-medium">Effetti del danno</div>
                                <div className="mt-1 space-y-1">
                                  {keys.map((k) => {
                                    const v = Math.round(Number(vals[k] || 0));
                                    const d = dets[k];
                                    const lines: string[] = [];
                                    if (d?.affects_classic_damage || k === 'Anima') {
                                      const attr = classicAttrByEntry[e.id] || 'armor';
                                      if (attr === 'armor') lines.push(`Modifica armatura: ${v}`);
                                      else lines.push(`Modifica salute: ${v}`);
                                    }
                                    if (d?.affects_health) lines.push(`Modifica salute: ${v}`);
                                    if (d?.affects_armor) lines.push(`Modifica armatura: ${v}`);
                                    if (d?.affects_action_points) lines.push(`Modifica punti azione: ${v}`);
                                    return (
                                      <div key={k} className="text-xs">
                                        <div className="font-semibold">{k}</div>
                                        {lines.length > 0 ? (
                                          <div>{lines.join(' — ')}</div>
                                        ) : (
                                          <div className="text-muted-foreground">—</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium mb-1">Dettagli tiro</div>
                        {e.isPercent ? (
                          <div className="grid grid-cols-1 gap-y-1">
                            <div>Tiro percentuale: {e.baseResult}% su d100</div>
                            <div>Minimo richiesto: {typeof e.percentMinRequired === 'number' ? e.percentMinRequired : 0}%</div>
                            {Number(e.actionCostTotal || 0) > 0 && (
                              <div>
                                Costo PA: {Math.round(Number(e.actionCostBase || 0))}
                                {Number(e.actionCostIndicative || 0) > 0 ? ` + ${Math.round(Number(e.actionCostIndicative || 0))}` : ''}
                                {' = '}
                                <span className="font-semibold">{Math.round(Number(e.actionCostTotal || 0))}</span>
                              </div>
                            )}
                            <div className="font-semibold">Totale finale: {e.result}%</div>
                          </div>
                        ) : (
                          (() => {
                            if (e.lottery) {
                              const choices = Array.isArray(e.lottery.choices) ? e.lottery.choices.filter((v) => typeof v === 'number' && v > 0) : [];
                              const rolls = Array.isArray(e.lottery.rolls) ? e.lottery.rolls : [];
                              const diceFaces = Number(e.lottery.diceFaces || 0) || 0;
                              const choiceSet = new Set(choices);
                              const correctRolls = rolls.filter(r => choiceSet.has(r));
                              return (
                                <div className="grid grid-cols-1 gap-y-1">
                                  <div>Numeri scelti: {choices.length ? choices.join(', ') : '-'}</div>
                                  <div>Numeri corretti: {correctRolls.length ? correctRolls.join(', ') : '0'}</div>
                                  <div>Facce del dado: {diceFaces > 0 ? `d${diceFaces}` : '-'}</div>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                <div>Base livello: {e.baseResult} su d{e.diceMax}</div>
                                <div>
                                  Statistica: {e.statLabel || e.statKey || '—'} = {Math.round(Number(e.statValue ?? 0))}
                                </div>
                                {Number(e.actionCostTotal || 0) > 0 && (
                                  <div className="md:col-span-2">
                                    Costo PA: {Math.round(Number(e.actionCostBase || 0))}
                                    {Number(e.actionCostIndicative || 0) > 0 ? ` + ${Math.round(Number(e.actionCostIndicative || 0))}` : ''}
                                    {' = '}
                                    <span className="font-semibold">{Math.round(Number(e.actionCostTotal || 0))}</span>
                                  </div>
                                )}
                                <div className="md:col-span-2">
                                  Competenze:
                                  {(e.competenceDetails && e.competenceDetails.length > 0) ? (
                                    <ul className="list-disc ml-4 mt-1">
                                      {e.competenceDetails.map(c => (
                                        <li key={c.id}>
                                          {c.name} (d{c.sides}): {c.roll}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-muted-foreground ml-1">Nessuna</span>
                                  )}
                                </div>
                                <div>Totale competenze: {compTotal}</div>
                                <div className="md:col-span-2 font-semibold">
                                  Totale finale: {e.result}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </>
                    )}
                  </div>
                )}

                {idx < entries.length - 1 && <Separator className="my-2 opacity-30" />}
              </div>
            );
          })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default NewRollHistoryPanel;
