import React, { useEffect, useState, useRef } from 'react';
import { X, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Enemy {
  id: string;
  name: string;
  enemy_level: number;
  enemy_max_hp: number;
  enemy_current_hp?: number;
  enemy_max_armor: number;
  enemy_current_armor?: number;
  enemy_max_pa: number;
  enemy_current_pa?: number;
  enemy_weapons?: any[];
}

interface EnemiesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  enemies: Enemy[];
  selectedEnemyId: string;
  onEnemySelect: (enemyId: string) => void;
}

const EnemiesSidebar: React.FC<EnemiesSidebarProps> = ({
  isOpen,
  onClose,
  enemies,
  selectedEnemyId,
  onEnemySelect
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    lastScrollTopRef.current = el.scrollTop;
    try { localStorage.setItem('enemiesSidebarScrollTop', String(el.scrollTop)); } catch (_e) { void 0; }
  };
  
  // Aggiorna la sidebar ogni 2 secondi per mostrare i cambiamenti in tempo reale
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stored = Number(localStorage.getItem('enemiesSidebarScrollTop') || '0') || 0;
    const target = lastScrollTopRef.current || stored;
    if (target > 0) el.scrollTop = target;
  }, [refreshKey, enemies, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div ref={containerRef} onScroll={handleScroll} className="fixed right-0 top-0 h-full w-96 bg-sidebar shadow-lg z-50 overflow-y-auto border-l border-sidebar-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-sidebar-foreground">
              <Swords className="h-5 w-5" />
              Lista Nemici
              <Badge variant="outline" className="text-xs ml-2">
                Live
              </Badge>
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {enemies.length === 0 ? (
              <p className="text-sidebar-muted text-center py-8">
                Nessun nemico disponibile
              </p>
            ) : (
              enemies.map((enemy) => {
                const isSelected = enemy.id === selectedEnemyId;
                const currentHp = enemy.enemy_current_hp ?? enemy.enemy_max_hp;
                const currentArmor = enemy.enemy_current_armor ?? enemy.enemy_max_armor;
                const currentPa = enemy.enemy_current_pa ?? enemy.enemy_max_pa;
                
                const hpPercentage = (currentHp / enemy.enemy_max_hp) * 100;
                const armorPercentage = (currentArmor / enemy.enemy_max_armor) * 100;
                const paPercentage = (currentPa / enemy.enemy_max_pa) * 100;
                // Postura: prima abilità tecnica disponibile
                const postureAbility = Array.isArray(enemy.enemy_abilities)
                  ? enemy.enemy_abilities.find((ab: any) => (ab?.category === 'Tecnico' || ab?.category === 'Posture'))
                  : null;
                
                return (
                  <Card 
                    key={`${enemy.id}-${refreshKey}`}
                    className={`transition-all duration-200 ${
                      isSelected ? 'border-red-500 bg-red-50 shadow-md' : ''
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {enemy.name}
                          {isSelected && (
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          )}
                        </span>
                        <Badge variant={isSelected ? "destructive" : "secondary"} className="text-xs">
                          Lv. {enemy.enemy_level}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {/* Salute */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">Salute</span>
                          <span className="text-xs">{currentHp}/{enemy.enemy_max_hp}</span>
                        </div>
                        <Progress 
                          value={hpPercentage} 
                          className="h-2" 
                          style={{
                            '--progress-background': hpPercentage > 50 ? '#22c55e' : hpPercentage > 25 ? '#eab308' : '#ef4444'
                          } as React.CSSProperties}
                        />
                        
                        {/* Armatura */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">Armatura</span>
                          <span className="text-xs">{currentArmor}/{enemy.enemy_max_armor}</span>
                        </div>
                        <Progress 
                          value={armorPercentage} 
                          className="h-2" 
                          style={{
                            '--progress-background': '#3b82f6'
                          } as React.CSSProperties}
                        />
                        
                        {/* Punti Azione */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">Punti Azione</span>
                          <span className="text-xs">{currentPa}/{enemy.enemy_max_pa}</span>
                        </div>
                        <Progress 
                          value={paPercentage} 
                          className="h-2" 
                          style={{
                            '--progress-background': '#8b5cf6'
                          } as React.CSSProperties}
                        />

                        {/* Postura */}
                        <div className="flex justify-between items-center mt-2 pt-2 border-t">
                          <span className="text-xs font-medium">Postura</span>
                          <span className="text-xs">
                            {postureAbility ? (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {postureAbility.name}
                              </Badge>
                            ) : (
                              <span className="text-sidebar-muted">Nessuna</span>
                            )}
                          </span>
                        </div>
                        
                        {/* Nome armi */}
                        {enemy.enemy_weapons && enemy.enemy_weapons.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-xs font-medium mb-1">Armi:</div>
                            <div className="space-y-1">
                              {enemy.enemy_weapons.map((weapon, index) => (
                                <div key={index} className="text-xs text-muted-foreground">
                                  • {weapon.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EnemiesSidebar;
