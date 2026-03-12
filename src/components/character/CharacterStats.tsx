import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Character, CharacterStats as Stats } from '@/types/character';
import type { CharacterCalculations } from '@/hooks/useCharacterCalculations';
import { useAuth } from '@/hooks/useAuth';
import { readSpecificCatalog, type CharacterSpecificCatalogItem } from '@/lib/utils';

interface CharacterStatsProps {
  character: Character;
  calculations: CharacterCalculations;
  onUpdateCharacter: (updates: Partial<Character>) => void;
  onUpdateBaseStats: (stats: Partial<Stats>) => void;
}

const CharacterStats = ({ character, calculations, onUpdateCharacter, onUpdateBaseStats }: CharacterStatsProps) => {
  const { user, isAdmin } = useAuth();
  const isOwner = Boolean(user?.id && (!character.user_id || user.id === character.user_id));
  const canEditSpecifics = isAdmin || isOwner;
  const canEditCoreStats = isAdmin;
  const [specificCatalog, setSpecificCatalog] = useState<CharacterSpecificCatalogItem[]>(() => readSpecificCatalog());
  const [selectedSpecificId, setSelectedSpecificId] = useState('');
  const [specificCurrent, setSpecificCurrent] = useState('');
  const [specificMax, setSpecificMax] = useState('');

  useEffect(() => {
    setSpecificCatalog(readSpecificCatalog());
  }, []);

  const specifics = useMemo(
    () => (Array.isArray(character.specifics) ? character.specifics : []),
    [character.specifics],
  );
  const availableSpecifics = useMemo(() => {
    const used = new Set(specifics.map((item) => item.id));
    return specificCatalog.filter((item) => !used.has(item.id));
  }, [specificCatalog, specifics]);

  const statNames = {
    forza: 'Forza',
    percezione: 'Percezione', 
    resistenza: 'Resistenza',
    intelletto: 'Intelletto',
    agilita: 'Agilità',
    sapienza: 'Sapienza',
    anima: 'Anima'
  };

  const parseDecimal = (value: string) => {
    const normalized = String(value ?? '').trim().replace(',', '.');
    const num = Number.parseFloat(normalized);
    return Number.isFinite(num) ? num : 0;
  };

  const handleStatChange = (stat: keyof Stats, value: string) => {
    const numValue = parseInt(value) || 0;
    onUpdateBaseStats({ [stat]: numValue });
  };

  const handleAddSpecific = () => {
    if (!canEditSpecifics) return;
    const picked = specificCatalog.find((item) => item.id === selectedSpecificId);
    if (!picked) return;
    const maxValue = Math.max(0, parseDecimal(specificMax));
    const currentValue = Math.min(Math.max(0, parseDecimal(specificCurrent)), maxValue || 0);
    const next = [
      ...specifics,
      {
        id: picked.id,
        name: picked.name,
        color: picked.color,
        base_max: maxValue,
        max: maxValue,
        current: currentValue,
      },
    ];
    onUpdateCharacter({ specifics: next });
    setSelectedSpecificId('');
    setSpecificCurrent('');
    setSpecificMax('');
  };

  const handleSpecificCurrentChange = (id: string, value: string) => {
    const next = specifics.map((item) => {
      if (item.id !== id) return item;
      const maxValue = Number(item.max ?? 0) || 0;
      const currentValue = Math.min(Math.max(0, parseDecimal(value)), maxValue || 0);
      return { ...item, current: currentValue };
    });
    onUpdateCharacter({ specifics: next });
  };

  const handleSpecificMaxChange = (id: string, value: string) => {
    const next = specifics.map((item) => {
      if (item.id !== id) return item;
      const maxValue = Math.max(0, parseDecimal(value));
      const currentValue = Math.min(Number(item.current ?? 0) || 0, maxValue);
      return { ...item, base_max: maxValue, max: maxValue, current: currentValue };
    });
    onUpdateCharacter({ specifics: next });
  };

  const handleRemoveSpecific = (id: string) => {
    if (!canEditSpecifics) return;
    onUpdateCharacter({ specifics: specifics.filter((item) => item.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Informazioni Base */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Base</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="character-name">Nome Personaggio</Label>
              <Input
                id="character-name"
                value={character.name}
                onChange={(e) => onUpdateCharacter({ name: e.target.value })}
                placeholder="Inserisci nome personaggio"
              />
            </div>
            <div>
              <Label htmlFor="character-level">Livello</Label>
              <Input
                id="character-level"
                type="number"
                min="1"
                max="20"
                value={character.level}
                onChange={(e) => onUpdateCharacter({ level: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salute e Punti Azione */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Salute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={character.currentHealth || character.health}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const maxHealth = calculations.maxHealth;
                    const newHealth = Math.min(Math.max(0, value), maxHealth);
                    onUpdateCharacter({ currentHealth: newHealth });
                  }}
                  disabled={!canEditCoreStats}
                  className="w-24 h-12 text-center text-lg font-bold"
                  min="0"
                  max={calculations.maxHealth}
                />
                <span className="text-lg font-medium">/</span>
                <span className="font-mono text-lg font-bold">{calculations.maxHealth}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Salute Corrente (Base: 12 + (Resistenza × 2) + Anomalie)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Punti Azione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={character.currentActionPoints || character.actionPoints}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const maxActionPoints = calculations.maxActionPoints;
                    const newActionPoints = Math.min(Math.max(0, value), maxActionPoints);
                    onUpdateCharacter({ currentActionPoints: newActionPoints });
                  }}
                  disabled={!canEditCoreStats}
                  className="w-24 h-12 text-center text-lg font-bold"
                  min="0"
                  max={calculations.maxActionPoints}
                />
                <span className="text-lg font-medium">/</span>
                <span className="font-mono text-lg font-bold">{calculations.maxActionPoints}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Punti Azione Correnti (Base: 12 + (Sapienza ÷ 2) + Anima + Anomalie)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Armatura e Carico Equipaggiato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Armatura */}
        <Card>
          <CardHeader>
            <CardTitle>Armatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={character.currentArmor || character.baseArmor}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const maxArmor = calculations.totalArmor;
                    const newArmor = Math.min(Math.max(0, value), maxArmor);
                    onUpdateCharacter({ currentArmor: newArmor });
                  }}
                  disabled={!canEditCoreStats}
                  className="w-24 h-12 text-center text-lg font-bold"
                  min="0"
                  max={calculations.totalArmor}
                />
                <span className="text-lg font-medium">/</span>
                <span className="font-mono text-lg font-bold">{calculations.totalArmor}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Armatura Corrente (Base: {character.baseArmor} + Equipaggiamento)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Carico Equipaggiato */}
        <Card>
          <CardHeader>
            <CardTitle>Carico Equipaggiato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-lg font-bold">{calculations.totalWeight.toFixed(1)}kg</span>
                <span className="text-lg font-medium">/</span>
                <span className="font-mono text-lg font-bold">{calculations.carryCapacity}kg</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  calculations.isOverloaded 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {calculations.carryStatus}
                </span>
                {calculations.isOverloaded && calculations.overloadAmount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    (+{calculations.overloadAmount.toFixed(1)}kg)
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Capacità basata su Resistenza base ({character.baseStats?.resistenza || 0})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiche */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(statNames).map(([key, label]) => {
              const statKey = key as keyof Stats;
              const baseValue = character.baseStats[statKey];
              const totalValue = calculations.totalStats[statKey];
              const modifier = calculations.statModifiers[statKey];
              const bonus = totalValue - baseValue;
              
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`stat-${key}`} className="font-semibold">
                    {label}
                  </Label>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`stat-${key}`}
                        type="number"
                        value={baseValue}
                        onChange={(e) => handleStatChange(statKey, e.target.value)}
                        disabled={!canEditCoreStats}
                        className="w-20 h-10 text-center text-lg font-bold"
                      />
                      <span className="text-sm text-muted-foreground">Base</span>
                    </div>
                    
                    {bonus !== 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          + {bonus} (equipaggiamento/anomalie)
                        </span>
                      </div>
                    )}
                    
                    <div className="text-base font-mono">
                      <span className="font-bold">Totale: {totalValue}</span>
                    </div>
                    
                    <div className="text-base font-mono">
                      <span className="text-primary font-bold">Modificatore: +{modifier}</span>
                    </div>
                  </div>
                  
                  {/* Effetti speciali delle statistiche */}
                  {statKey === 'resistenza' && (
                    <p className="text-xs text-muted-foreground">
                      +{totalValue * 2} Salute, {character.baseStats?.resistenza || 0} Capacità di carico
                    </p>
                  )}
                  
                  {statKey === 'sapienza' && (
                    <p className="text-xs text-muted-foreground">
                      +{Math.floor(totalValue / 2)} Punti Azione
                    </p>
                  )}
                  
                  {statKey === 'anima' && (
                    <p className="text-xs text-muted-foreground">
                      +{totalValue} Punti Azione
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specifiche Personalizzate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEditSpecifics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Select value={selectedSpecificId} onValueChange={setSelectedSpecificId}>
                <SelectTrigger>
                  <SelectValue placeholder={availableSpecifics.length > 0 ? 'Seleziona specifica' : 'Nessuna specifica disponibile'} />
                </SelectTrigger>
                <SelectContent>
                  {availableSpecifics.map((spec) => (
                    <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={specificCurrent}
                onChange={(e) => setSpecificCurrent(e.target.value)}
                placeholder="Corrente"
                min="0"
                step="0.1"
              />
              <Input
                type="number"
                value={specificMax}
                onChange={(e) => setSpecificMax(e.target.value)}
                placeholder="Massimo"
                min="0"
                step="0.1"
              />
              <Button onClick={handleAddSpecific} disabled={!selectedSpecificId}>Aggiungi</Button>
            </div>
          )}

          {specifics.length === 0 && (
            <div className="text-sm text-muted-foreground">Nessuna specifica impostata.</div>
          )}

          {specifics.length > 0 && (
            <div className="space-y-3">
              {specifics.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 border rounded-md px-3 py-2">
                  <div className="min-w-[140px] font-medium">{item.name}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={Number(item.current ?? 0)}
                      onChange={(e) => handleSpecificCurrentChange(item.id, e.target.value)}
                      className="w-20"
                      min="0"
                      max={Number(item.max ?? 0) || 0}
                      step="0.1"
                      disabled={!canEditSpecifics}
                    />
                    <span className="text-sm text-muted-foreground">/</span>
                    <Input
                      type="number"
                      value={Number(item.max ?? 0)}
                      onChange={(e) => handleSpecificMaxChange(item.id, e.target.value)}
                      className="w-20"
                      min="0"
                      step="0.1"
                      disabled={!canEditSpecifics}
                    />
                  </div>
                  {canEditSpecifics && (
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveSpecific(item.id)}>Rimuovi</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Armi Equipaggiate */}
      <Card>
        <CardHeader>
          <CardTitle>Armi Equipaggiate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const equipmentList = Array.isArray(character.equipment)
                ? (character.equipment as any[])
                : Object.values(character.equipment || {}).filter(Boolean) as any[];

              const weapons = equipmentList.filter((item) => item && item.type === 'arma');

              if (weapons.length === 0) {
                return <p className="text-sm text-muted-foreground">Nessuna arma equipaggiata</p>;
              }

              return weapons.map((weapon) => {
                const damageSets = Array.isArray(weapon?.data?.damage_sets) ? weapon.data.damage_sets : [];
                const totals = damageSets.length > 0
                  ? damageSets.reduce(
                      (acc: any, s: any) => ({
                        veloce: acc.veloce + (Number(s?.damage_veloce) || 0),
                        pesante: acc.pesante + (Number(s?.damage_pesante) || 0),
                        affondo: acc.affondo + (Number(s?.damage_affondo) || 0),
                      }),
                      { veloce: 0, pesante: 0, affondo: 0 },
                    )
                  : {
                      veloce: Number(weapon?.damageVeloce ?? 0) || 0,
                      pesante: Number(weapon?.damagePesante ?? 0) || 0,
                      affondo: Number(weapon?.damageAffondo ?? 0) || 0,
                    };
                return (
                  <div key={weapon.id ?? weapon.name} className="border rounded-lg p-3 space-y-3">
                    <h4 className="font-semibold">{weapon.name}</h4>
                    <div className="text-sm font-medium">Totale</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-600">Leggero:</span>
                        <div className="font-mono">
                          {totals.veloce} → {Math.floor(totals.veloce * 0.33)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-orange-600">Pesante:</span>
                        <div className="font-mono">
                          {totals.pesante} → {Math.floor(totals.pesante * 0.33)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-red-600">Affondo:</span>
                        <div className="font-mono">
                          {totals.affondo} → {Math.floor(totals.affondo * 0.33)}
                        </div>
                      </div>
                    </div>
                    {damageSets.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Scomposto</div>
                        {damageSets.map((set: any, idx: number) => (
                          <div key={`${weapon.id ?? weapon.name}-ds-${idx}`} className="rounded-md border px-3 py-2 text-sm space-y-1">
                            <div className="font-medium">{String(set?.effect_name || 'Tipo')}</div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <span className="text-green-600">Leggero:</span>
                                <div className="font-mono">
                                  {Number(set?.damage_veloce ?? 0) || 0} → {Math.floor((Number(set?.damage_veloce ?? 0) || 0) * 0.33)}
                                </div>
                              </div>
                              <div>
                                <span className="text-orange-600">Pesante:</span>
                                <div className="font-mono">
                                  {Number(set?.damage_pesante ?? 0) || 0} → {Math.floor((Number(set?.damage_pesante ?? 0) || 0) * 0.33)}
                                </div>
                              </div>
                              <div>
                                <span className="text-red-600">Affondo:</span>
                                <div className="font-mono">
                                  {Number(set?.damage_affondo ?? 0) || 0} → {Math.floor((Number(set?.damage_affondo ?? 0) || 0) * 0.33)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              });
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CharacterStats;
