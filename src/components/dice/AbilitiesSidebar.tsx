import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Character } from '@/types/character';

interface AbilitiesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onSpellClick?: (spell: any) => void;
  onAbilityClick?: (ability: any) => void;
}

const AbilitiesSidebar: React.FC<AbilitiesSidebarProps> = ({
  isOpen,
  onClose,
  character,
  onSpellClick,
  onAbilityClick
}) => {
  if (!isOpen) return null;

  // Raggruppa le magie per categoria
  const groupedSpells = character?.custom_spells?.reduce((acc, spell) => {
    const category = spell.primary_branch || 'Altro';
    const specificity = spell.primary_specificity || '';
    const key = specificity ? `${category} - ${specificity}` : category;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(spell);
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Raggruppa le abilità per categoria
  const groupedAbilities = character?.custom_abilities?.reduce((acc, ability) => {
    const category = ability.category || 'Altro';
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ability);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'attiva':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'passiva':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'suprema':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderSpellCard = (spell: any) => (
    <Card 
      key={spell.id} 
      className="mb-3 cursor-pointer hover:bg-accent transition-colors" 
      onClick={() => onSpellClick?.(spell)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <span>{spell.name}</span>
              {Number((spell as any)?.difficulty || 0) > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500 text-white border-yellow-600">
                  Diff {Number((spell as any).difficulty || 0)}
                </Badge>
              )}
              {(spell as any)?.sourceType === 'equipment' && String((spell as any)?.sourceName ?? '').trim() && (
                <Badge variant="secondary" className="text-xs">
                  {String((spell as any).sourceName)}
                </Badge>
              )}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Lv. {spell.current_level}
            </Badge>
            <Badge className={`text-xs border ${getTypeColor(spell.type)}`}>
              {spell.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {spell.description && (
          <p className="text-xs text-muted-foreground">{spell.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {spell.guaranteed_damage > 0 && (
            <div>
              <span className="font-medium">Danno Garantito:</span>
              <span className="ml-1 text-red-600">{spell.guaranteed_damage}</span>
            </div>
          )}
          {spell.additional_damage > 0 && (
            <div>
              <span className="font-medium">Danno Aggiuntivo:</span>
              <span className="ml-1 text-orange-600">{spell.additional_damage}</span>
            </div>
          )}
          {spell.action_cost > 0 && (
            <div>
              <span className="font-medium">Costo PA:</span>
              <span className="ml-1 text-blue-600">{spell.action_cost}</span>
            </div>
          )}
          {spell.indicative_action_cost > 0 && (
            <div>
              <span className="font-medium">PA Indicativo:</span>
              <span className="ml-1 text-blue-400">{spell.indicative_action_cost}</span>
            </div>
          )}
        </div>
        
        {spell.level_description && (
          <div className="mt-2 p-2 bg-muted rounded text-xs">
            <span className="font-medium">Livello {spell.current_level}:</span>
            <span className="ml-1">{spell.level_description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAbilityCard = (ability: any) => (
    <Card 
      key={ability.id} 
      className="mb-3 cursor-pointer hover:bg-accent transition-colors" 
      onClick={() => onAbilityClick?.(ability)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <span>{ability.name}</span>
              {(ability as any)?.sourceType === 'equipment' && String((ability as any)?.sourceName ?? '').trim() && (
                <Badge variant="secondary" className="text-xs">
                  {String((ability as any).sourceName)}
                </Badge>
              )}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Lv. {ability.current_level}
            </Badge>
            <Badge className={`text-xs border ${getTypeColor(ability.type)}`}>
              {ability.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {ability.description && (
          <p className="text-xs text-muted-foreground">{ability.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {ability.danno_assicurato > 0 && (
            <div>
              <span className="font-medium">Danno Garantito:</span>
              <span className="ml-1 text-red-600">{ability.danno_assicurato}</span>
            </div>
          )}
          {ability.danno_aggiuntivo > 0 && (
            <div>
              <span className="font-medium">Danno Aggiuntivo:</span>
              <span className="ml-1 text-orange-600">{ability.danno_aggiuntivo}</span>
            </div>
          )}
          {ability.punti_azione > 0 && (
            <div>
              <span className="font-medium">Costo PA:</span>
              <span className="ml-1 text-blue-600">{ability.punti_azione}</span>
            </div>
          )}
          {ability.punti_azione_indicativi > 0 && (
            <div>
              <span className="font-medium">PA Indicativo:</span>
              <span className="ml-1 text-blue-400">{ability.punti_azione_indicativi}</span>
            </div>
          )}
        </div>
        
        {ability.level_description && (
          <div className="mt-2 p-2 bg-muted rounded text-xs">
            <span className="font-medium">Livello {ability.current_level}:</span>
            <span className="ml-1">{ability.level_description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-96 bg-sidebar shadow-lg z-50 overflow-y-auto border-r border-sidebar-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-sidebar-foreground">
              <Sparkles className="h-5 w-5" />
              Magie & Abilità
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {!character ? (
            <p className="text-sidebar-muted text-center py-8">
              Nessun personaggio selezionato
            </p>
          ) : (
            <div className="space-y-6">
              {/* Sezione Magie */}
              {Object.keys(groupedSpells).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-sidebar-foreground">
                    ✨ Magie
                  </h3>
                  {Object.entries(groupedSpells).map(([category, spells]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-medium text-sidebar-muted mb-2 uppercase tracking-wide">
                        {category}
                      </h4>
                      {spells.map(renderSpellCard)}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Separatore se ci sono sia magie che abilità */}
              {Object.keys(groupedSpells).length > 0 && Object.keys(groupedAbilities).length > 0 && (
                <Separator className="bg-sidebar-border" />
              )}
              
              {/* Sezione Abilità */}
              {Object.keys(groupedAbilities).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-sidebar-foreground">
                    ⚔️ Abilità
                  </h3>
                  {Object.entries(groupedAbilities).map(([category, abilities]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-medium text-sidebar-muted mb-2 uppercase tracking-wide">
                        {category}
                      </h4>
                      {abilities.map(renderAbilityCard)}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Messaggio se non ci sono magie né abilità */}
              {Object.keys(groupedSpells).length === 0 && Object.keys(groupedAbilities).length === 0 && (
                <p className="text-sidebar-muted text-center py-8">
                  Nessuna magia o abilità disponibile
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AbilitiesSidebar;
