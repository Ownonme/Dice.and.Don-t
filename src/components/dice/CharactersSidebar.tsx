import React, { useEffect, useMemo, useRef } from 'react';
import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Character } from '@/types/character';

interface CharactersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  selectedCharacterId: string;
  onCharacterSelect: (characterId: string) => void;
}

const CharactersSidebar: React.FC<CharactersSidebarProps> = ({
  isOpen,
  onClose,
  characters,
  selectedCharacterId,
  onCharacterSelect
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const publicOnly = useMemo(() => {
    return characters.filter((c: any) => c?.is_public === true);
  }, [characters]);

  // Calcola le statistiche per tutti i personaggi una volta sola
  const charactersWithCalculations = useMemo(() => {
    return publicOnly.map(character => {
      // Calcola le statistiche totali includendo equipaggiamento e anomalie
      const totalStats = {
        forza: character.baseStats?.forza || 0,
        percezione: character.baseStats?.percezione || 0,
        resistenza: character.baseStats?.resistenza || 0,
        intelletto: character.baseStats?.intelletto || 0,
        agilita: character.baseStats?.agilita || 0,
        sapienza: character.baseStats?.sapienza || 0,
        anima: character.baseStats?.anima || 0
      };
      
      // Aggiungi bonus da equipaggiamento
      if (character.equipment) {
        character.equipment.forEach(item => {
          if (item.stats) {
            Object.entries(item.stats).forEach(([stat, value]) => {
              if (value) {
                totalStats[stat as keyof typeof totalStats] += value;
              }
            });
          }
        });
      }
      
      // Aggiungi modificatori da anomalie
      if (character.anomalies) {
        character.anomalies.forEach(anomaly => {
          if (anomaly.statsModifier) {
            Object.entries(anomaly.statsModifier).forEach(([stat, value]) => {
              if (value) {
                totalStats[stat as keyof typeof totalStats] += value;
              }
            });
          }
        });
      }
      
      // Calcola modificatori anomalie per salute e PA
      const healthAnomalyModifier = character.anomalies ? 
        character.anomalies.reduce((sum, anomaly) => sum + (anomaly.healthModifier || 0), 0) : 0;
      const apAnomalyModifier = character.anomalies ?
        character.anomalies.reduce((sum, anomaly) => sum + (anomaly.actionPointsModifier || 0), 0) : 0;
      
      return {
        character,
        calculations: {
          maxHealth: 12 + (totalStats.resistenza * 2) + healthAnomalyModifier,
          maxActionPoints: 12 + Math.floor(totalStats.sapienza / 2) + totalStats.anima + apAnomalyModifier,
          totalArmor: (character.baseArmor || 0) + (character.equipment ? 
            character.equipment.filter(item => item.armor).reduce((total, item) => total + (item.armor || 0), 0) : 0)
        }
      };
    });
  }, [publicOnly]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div ref={containerRef} className="fixed right-0 top-0 h-full w-96 bg-sidebar shadow-lg z-50 overflow-y-auto border-l border-sidebar-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-sidebar-foreground">
              <Users className="h-5 w-5" />
              Lista Personaggi
              <Badge variant="outline" className="text-xs ml-2">
                Live
              </Badge>
              <Badge variant="outline" className="text-xs ml-2">
                Pubblico
              </Badge>
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {charactersWithCalculations.length === 0 ? (
              <p className="text-sidebar-muted text-center py-8">
                Nessun personaggio disponibile
              </p>
            ) : (
              charactersWithCalculations.map(({ character, calculations }) => {
                const isSelected = character.id === selectedCharacterId;
                
                // Trova la postura attiva
                const activePosture = character.custom_abilities?.find(ability => 
                  (ability.category === 'Posture' || ability.category === 'Tecnico') && 
                  ability.is_active
                );
                
                return (
                  <Card 
                    key={character.id}
                    className={`cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:shadow-md ${
                      isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : ''
                    }`}
                    onClick={() => {
                      onCharacterSelect(character.id);
                      onClose();
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={character.avatar_url || ''} alt={character.name} />
                            <AvatarFallback className="text-xs">
                              {character.name?.slice(0,1).toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          {character.name}
                          {isSelected && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </span>
                        <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                          Lv. {character.level}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {/* Salute con barra di progresso */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-sidebar-foreground">Salute:</span>
                            <span className="text-sm font-mono">
                              <span className={`${
                                (character.currentHealth ?? calculations.maxHealth) < calculations.maxHealth * 0.3 
                                  ? 'text-red-600' 
                                  : (character.currentHealth ?? calculations.maxHealth) < calculations.maxHealth * 0.7 
                                    ? 'text-yellow-600' 
                                    : 'text-green-600'
                              }`}>
                                {character.currentHealth ?? calculations.maxHealth}
                              </span>
                              <span className="text-muted-foreground"> / {calculations.maxHealth}</span>
                            </span>
                          </div>
                          <Progress 
                            value={((character.currentHealth ?? calculations.maxHealth) / calculations.maxHealth) * 100}
                            className="h-2"
                            style={{
                              '--progress-background': (character.currentHealth ?? calculations.maxHealth) < calculations.maxHealth * 0.3 
                                ? '#dc2626' 
                                : (character.currentHealth ?? calculations.maxHealth) < calculations.maxHealth * 0.7 
                                  ? '#ca8a04' 
                                  : '#16a34a'
                            } as React.CSSProperties}
                          />
                        </div>
                        
                        {/* Punti Azione con barra di progresso */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-sidebar-foreground">PA:</span>
                            <span className="text-sm font-mono">
                              <span className={`${
                                (character.currentActionPoints ?? calculations.maxActionPoints) < calculations.maxActionPoints * 0.5 
                                  ? 'text-red-600' 
                                  : 'text-blue-600'
                              }`}>
                                {character.currentActionPoints ?? calculations.maxActionPoints}
                              </span>
                              <span className="text-muted-foreground"> / {calculations.maxActionPoints}</span>
                            </span>
                          </div>
                          <Progress 
                            value={((character.currentActionPoints ?? calculations.maxActionPoints) / calculations.maxActionPoints) * 100}
                            className="h-2"
                            style={{
                              '--progress-background': '#2563eb'
                            } as React.CSSProperties}
                          />
                        </div>
                        
                        {/* Armatura con barra di progresso (solo se armatura totale > 0) */}
                        {calculations.totalArmor > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-sidebar-foreground">Armatura:</span>
                              <span className="text-sm font-mono">
                                <span className="text-gray-600">
                                  {character.currentArmor ?? calculations.totalArmor}
                                </span>
                                <span className="text-muted-foreground"> / {calculations.totalArmor}</span>
                              </span>
                            </div>
                            <Progress 
                              value={((character.currentArmor ?? calculations.totalArmor) / calculations.totalArmor) * 100}
                              className="h-2"
                              style={{
                                '--progress-background': '#6b7280'
                              } as React.CSSProperties}
                            />
                          </div>
                        )}
                        
                        {/* Postura */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-sidebar-foreground">Postura:</span>
                          <span className="text-sm">
                            {activePosture ? (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {activePosture.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nessuna</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-muted text-center">
              Aggiornamento automatico ogni 2 secondi
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CharactersSidebar;
