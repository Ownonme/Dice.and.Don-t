import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Character, CharacterStats as Stats } from '@/types/character';
import type { CharacterCalculations } from '@/hooks/useCharacterCalculations';

interface CharacterStatsProps {
  character: Character;
  calculations: CharacterCalculations;
  onUpdateCharacter: (updates: Partial<Character>) => void;
  onUpdateBaseStats: (stats: Partial<Stats>) => void;
}

const CharacterStats = ({ character, calculations, onUpdateCharacter, onUpdateBaseStats }: CharacterStatsProps) => {
  const statNames = {
    forza: 'Forza',
    percezione: 'Percezione', 
    resistenza: 'Resistenza',
    intelletto: 'Intelletto',
    agilita: 'Agilità',
    sapienza: 'Sapienza',
    anima: 'Anima'
  };

  const handleStatChange = (stat: keyof Stats, value: string) => {
    const numValue = parseInt(value) || 0;
    onUpdateBaseStats({ [stat]: numValue });
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

              return weapons.map((weapon) => (
                <div key={weapon.id ?? weapon.name} className="border rounded-lg p-3 space-y-2">
                  <h4 className="font-semibold">{weapon.name}</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-600">Leggero:</span>
                      <div className="font-mono">
                        {(weapon.damageVeloce ?? 0)} → {Math.floor((weapon.damageVeloce ?? 0) * 0.33)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-orange-600">Pesante:</span>
                      <div className="font-mono">
                        {(weapon.damagePesante ?? 0)} → {Math.floor((weapon.damagePesante ?? 0) * 0.33)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-red-600">Affondo:</span>
                      <div className="font-mono">
                        {(weapon.damageAffondo ?? 0)} → {Math.floor((weapon.damageAffondo ?? 0) * 0.33)}
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CharacterStats;