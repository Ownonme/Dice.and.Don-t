import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DiceLoader } from '@/components/ui/dice-loader';

interface Ability {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string;
  grade: string;
  description: string;
  additional_description?: string;
  story1?: string;
  story2?: string;
  levels: AbilityLevel[];
  created_by: string;
  created_at: string;
}

interface AbilityLevel {
  level: number;
  base_value: number;
  bonus_value: number;
  special_effect: string;
  level_description: string;
}

interface AbilityGridProps {
  abilities: Ability[];
  onAbilitySelect: (ability: Ability) => void;
  selectedAbility: Ability | null;
  onAbilityEdit?: (ability: Ability) => void;
  refreshTrigger?: number; // Nuova prop per forzare il refresh
  category?: string | null;
  subcategory?: string | null;
  grade?: string | null;
}

export const AbilityGrid = ({
  abilities,
  onAbilitySelect,
  selectedAbility,
  onAbilityEdit,
  refreshTrigger,
  category,
  subcategory,
  grade
}: AbilityGridProps) => {
  const { isAdmin } = useAuth();
  const [localAbilities, setLocalAbilities] = useState<Ability[]>(abilities);
  const [loading, setLoading] = useState(false);

  // Aggiorna le abilità quando cambia refreshTrigger
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchAbilities();
    }
  }, [refreshTrigger]);

  // Sincronizza con le abilità passate come prop
  useEffect(() => {
    setLocalAbilities(abilities);
  }, [abilities]);

  const fetchAbilities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setLocalAbilities(data || []);
    } catch (error) {
      console.error('Error fetching abilities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade.toLowerCase()) {
      case 'semplice': return 'bg-green-500';
      case 'avanzata': return 'bg-yellow-500';
      case 'suprema': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'passiva': return 'bg-blue-500';
      case 'attiva': return 'bg-orange-500';
      case 'suprema': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          Abilità
          {category && ` - ${category}`}
          {subcategory && ` - ${subcategory}`}
          {grade && ` - ${grade}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <DiceLoader size="md" text="Don't" label="Caricamento abilità..." />
            </div>
          ) : localAbilities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {category || subcategory || grade
                ? 'Nessuna abilità trovata per i filtri selezionati'
                : 'Seleziona una categoria per visualizzare le abilità'
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localAbilities.map((ability) => (
                <Card 
                  key={ability.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow relative group"
                  onClick={() => onAbilitySelect(ability)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{ability.name}</h4>
                        <div className="flex gap-1 items-center">
                          {isAdmin && onAbilityEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAbilityEdit(ability);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          <Badge className={`text-white text-xs ${getGradeColor(ability.grade)}`}>
                            {ability.grade}
                          </Badge>
                          <Badge className={`text-white text-xs ${getTypeColor(ability.type)}`}>
                            {ability.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ability.category} - {ability.subcategory}
                      </div>
                      <div className="text-xs line-clamp-2">
                        {ability.description}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
