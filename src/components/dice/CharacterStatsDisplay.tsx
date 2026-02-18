import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Edit3 } from 'lucide-react';
import { Character } from '@/types/character';

interface CharacterStatsDisplayProps {
  character: Character | null;
  calculations: any;
  currentHealth: number;
  currentActionPoints: number;
  currentArmor: number;
  onHealthChange: (value: string) => void;
  onActionPointsChange: (value: string) => void;
  onArmorChange: (value: string) => void;
  onSaveStats?: () => void;
  onOpenModificationModal?: () => void; // Aggiungi questa prop
}

const CharacterStatsDisplay: React.FC<CharacterStatsDisplayProps> = ({ 
  character, 
  calculations, 
  currentHealth, 
  currentActionPoints, 
  currentArmor,
  onHealthChange,
  onActionPointsChange,
  onArmorChange,
  onSaveStats,
  onOpenModificationModal // Aggiungi questa prop
}) => {
  if (!character || !calculations) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Specifiche Personaggio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Seleziona un personaggio per vedere le specifiche</p>
        </CardContent>
      </Card>
    );
  }

  // Calcola gli effetti delle anomalie
  const n = (v: any) => Number(v ?? 0) || 0;
  const anomaliesHealthEffect = (character.anomalies || []).reduce(
    (sum, anomaly: any) => sum + n(anomaly?.healthModifier ?? anomaly?.health_modifier ?? anomaly?.temp_health ?? anomaly?.tempHealth),
    0,
  );
  const anomaliesActionPointsEffect = (character.anomalies || []).reduce(
    (sum, anomaly: any) => sum + n(anomaly?.actionPointsModifier ?? anomaly?.action_points_modifier ?? anomaly?.temp_action_points ?? anomaly?.tempActionPoints),
    0,
  );
  const anomaliesArmorEffect = (character.anomalies || []).reduce(
    (sum, anomaly: any) => sum + n(anomaly?.armorModifier ?? anomaly?.armor_modifier ?? anomaly?.temp_armour ?? anomaly?.tempArmour),
    0,
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Specifiche Personaggio</span>
          <div className="flex items-center gap-2">
            {onOpenModificationModal && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onOpenModificationModal}
                className="h-8 px-2"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Modifica
              </Button>
            )}
            {onSaveStats && (
              <Button size="sm" onClick={onSaveStats} className="h-8 px-2">
                <Save className="h-3 w-3 mr-1" />
                Salva
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout orizzontale per le specifiche */}
        <div className="grid grid-cols-3 gap-4">
          {/* Salute */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Salute</label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={currentHealth}
                onChange={(e) => onHealthChange(e.target.value)}
                className="w-16 text-center"
                min={0}
                max={calculations.maxHealth}
              />
              <span className="text-sm text-muted-foreground">/ {calculations.maxHealth}</span>
            </div>
            {anomaliesHealthEffect !== 0 && (
              <div className={`text-xs ${anomaliesHealthEffect > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Anomalie: {anomaliesHealthEffect > 0 ? '+' : ''}{anomaliesHealthEffect}
              </div>
            )}
          </div>

          {/* Punti Azione */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Punti Azione</label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={currentActionPoints}
                onChange={(e) => onActionPointsChange(e.target.value)}
                className="w-16 text-center"
                min={0}
                max={calculations.maxActionPoints}
              />
              <span className="text-sm text-muted-foreground">/ {calculations.maxActionPoints}</span>
            </div>
            {anomaliesActionPointsEffect !== 0 && (
              <div className={`text-xs ${anomaliesActionPointsEffect > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Anomalie: {anomaliesActionPointsEffect > 0 ? '+' : ''}{anomaliesActionPointsEffect}
              </div>
            )}
          </div>

          {/* Armatura */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Armatura</label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={currentArmor}
                onChange={(e) => onArmorChange(e.target.value)}
                className="w-16 text-center"
                min={0}
                max={calculations.totalArmor}
              />
              <span className="text-sm text-muted-foreground">/ {calculations.totalArmor}</span>
            </div>
            {anomaliesArmorEffect !== 0 && (
              <div className={`text-xs ${anomaliesArmorEffect > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Anomalie: {anomaliesArmorEffect > 0 ? '+' : ''}{anomaliesArmorEffect}
              </div>
            )}
          </div>
        </div>
        
        {/* Mostra statistiche base con effetti anomalie */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Statistiche (Base + Anomalie)</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {Object.entries(character.baseStats || {}).map(([stat, baseValue]) => {
              const anomaliesEffect = (character.anomalies || []).reduce((sum, anomaly) => 
                sum + ((anomaly.statsModifier && anomaly.statsModifier[stat]) || 0), 0
              );
              const totalValue = baseValue + anomaliesEffect;
              
              return (
                <div key={stat} className="text-center">
                  <div className="font-medium capitalize">{stat}</div>
                  <div className={anomaliesEffect !== 0 ? (anomaliesEffect > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                    {totalValue}
                    {anomaliesEffect !== 0 && (
                      <span className="text-xs ml-1">({baseValue}{anomaliesEffect > 0 ? '+' : ''}{anomaliesEffect})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Mostra statistiche totali (base + equipaggiamento + anomalie) */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Statistiche (Totali)</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {Object.entries(character.baseStats || {}).map(([stat, baseValue]) => {
              const totalValue = calculations?.totalStats?.[stat] || baseValue;
              const bonus = totalValue - baseValue;
              
              return (
                <div key={stat} className="text-center">
                  <div className="font-medium capitalize">{stat}</div>
                  <div className={bonus !== 0 ? (bonus > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                    {totalValue}
                    {bonus !== 0 && (
                      <span className="text-xs ml-1">({baseValue}{bonus > 0 ? '+' : ''}{bonus})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CharacterStatsDisplay;
