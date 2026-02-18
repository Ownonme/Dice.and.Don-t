import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { apiBase } from '@/integrations/localserver';
import { Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DiceLoader } from '@/components/ui/dice-loader';

interface Spell {
  id: string;
  name: string;
  type: string;
  primary_branch: string;
  secondary_branch?: string;
  primary_specificity: string;
  secondary_specificity?: string;
  grade: string;
  description: string;
  additional_description?: string;
  story_1?: string;
  story_2?: string;
  category: string;
  subcategory: string;
  grade: string;
  description: string;
  components: string;
  casting_time: string;
  range: string;
  duration: string;
  damage?: string;
  effect?: string;
}

interface MagicGridProps {
  category: string | null;
  subcategory: string | null;
  grade: string | null;
  onSpellSelect: (spell: Spell) => void;
  onSpellEdit?: (spell: Spell) => void;
  refreshTrigger?: number; // Nuova prop per forzare il refresh
  searchTerm?: string; // nuova prop
  onLoadingChange?: (loading: boolean) => void;
}

export const MagicGrid = ({
  category,
  subcategory,
  grade,
  onSpellSelect,
  onSpellEdit,
  refreshTrigger,
  searchTerm,
  onLoadingChange
}: MagicGridProps) => {
  const { isAdmin } = useAuth();
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSpells = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/spells`);
      let list = await res.json();

      if (category) {
        list = list.filter((s: any) =>
          s.primary_branch === category || s.secondary_branch === category
        );
      }

      if (subcategory) {
        list = list.filter((s: any) => {
          const matchesPrimary = s.primary_branch === category && s.primary_specificity === subcategory;
          const matchesSecondary = s.secondary_branch === category && s.secondary_specificity === subcategory;
          return matchesPrimary || matchesSecondary;
        });
      }

      if (grade) {
        list = list.filter((s: any) => s.grade === grade);
      }

      // Filtro ricerca testuale
      const q = (searchTerm || '').trim().toLowerCase();
      if (q) {
        list = list.filter((s: any) => {
          const fields = [
            s.name, s.type, s.primary_branch, s.secondary_branch,
            s.primary_specificity, s.secondary_specificity,
            s.description, s.additional_description
          ];
          return fields.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
        });
      }

      const sortedSpells = list.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setSpells(sortedSpells);
    } catch (e) {
      console.error('Errore nel caricamento delle magie:', e);
      setSpells([]);
    } finally {
      setLoading(false);
    }
  }, [category, grade, searchTerm, subcategory]);

  useEffect(() => {
    void fetchSpells();
  }, [fetchSpells, refreshTrigger]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

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
      case 'attiva': return 'bg-red-500';
      case 'suprema': return 'bg-green-800';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Magie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <DiceLoader size="md" text="Don't" label="Caricamento magie..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          Magie
          {category && ` - ${category}`}
          {subcategory && ` - ${subcategory}`}
          {grade && ` - ${grade}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {spells.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {category || subcategory || grade 
                ? 'Nessuna magia trovata per i filtri selezionati'
                : 'Seleziona una categoria per visualizzare le magie'
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spells.map((spell) => (
                <Card 
                  key={spell.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow relative group"
                  onClick={() => onSpellSelect(spell)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{spell.name}</h4>
                        <div className="flex gap-1 items-center">
                          {isAdmin && onSpellEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSpellEdit(spell);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          <Badge className={`text-white text-xs ${getGradeColor(spell.grade)}`}>
                            {spell.grade}
                          </Badge>
                          <Badge className={`text-white text-xs ${getTypeColor(spell.type)}`}>
                            {spell.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {spell.primary_branch} - {spell.primary_specificity}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {spell.subcategory}
                      </div>
                      <div className="text-xs line-clamp-2">
                        {spell.description}
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

interface MagicSidebarProps {
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  selectedGrade: string | null;
  onCategorySelect: (category: string) => void;
  onSubcategorySelect: (subcategory: string) => void;
  onGradeSelect: (grade: string) => void;
}

const MAGIC_CATEGORIES = {
  'Distruzione': ['Fuoco', 'Ghiaccio', 'Elettrico', 'Esplosivo', 'Lavico', 'Vento', 'Oro', 'Terra', 'Neo-Arcano'],
  'Illusione': ['Illusione', 'Ombra', 'Telecinesi'],
  'Evocazione': ['Evocazione energetica', 'Evocazione Necromantica'],
  'Supporto': ['Supporto', 'Sangue', 'Divino', 'Neo-Arcano', 'Elementale'],
  'Alterazione': ['Veleno', 'Sangue', 'Terra', 'Acqua', 'Ossa', 'Vento', 'Gravità', 'Spazio', 'Tempo'],
  'Alchimia': ['Pratica', 'Utilitaria'],
  'Divinazione': ['Runica', 'Divinazione'],
  'Trasmutazione': ['Trasmutazione', 'Alterazione', 'Elementale'],
  'Occulto': ['Sangue', 'Ombra', 'Ossa'],
  'Arcano': ['Caotico', 'Compresso'],
  'Speciale': ['Draconico', 'Critico', 'Altro']
};

const GRADES = ['Semplice', 'Avanzata', 'Suprema'];

export const MagicSidebar = ({
  selectedCategory,
  selectedSubcategory,
  selectedGrade,
  onCategorySelect,
  onSubcategorySelect,
  onGradeSelect
}: MagicSidebarProps) => {
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openSubcategories, setOpenSubcategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleSubcategory = (subcategory: string) => {
    setOpenSubcategories(prev => 
      prev.includes(subcategory) 
        ? prev.filter(c => c !== subcategory)
        : [...prev, subcategory]
    );
  };

  const handleCategorySelect = (category: string) => {
    onCategorySelect(category);
    onSubcategorySelect('');
    onGradeSelect('');
  };

  const handleSubcategorySelect = (subcategory: string) => {
    onSubcategorySelect(subcategory);
    onGradeSelect('');
  };

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Sezioni</h3>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2">
          {Object.entries(MAGIC_CATEGORIES).map(([category, subcategories]) => (
            <Collapsible
              key={category}
              open={openCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-between text-left p-2 h-auto ${
                    selectedCategory === category ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <span className="font-medium">{category}</span>
                  {openCategories.includes(category) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-4">
                {subcategories.map((subcategory) => (
                  <Collapsible
                    key={subcategory}
                    open={openSubcategories.includes(subcategory)}
                    onOpenChange={() => toggleSubcategory(subcategory)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`w-full justify-between text-left p-2 h-auto text-sm ${
                          selectedSubcategory === subcategory ? 'bg-muted' : ''
                        }`}
                        onClick={() => handleSubcategorySelect(subcategory)}
                      >
                        <span>{subcategory}</span>
                        {openSubcategories.includes(subcategory) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4">
                      {GRADES.map((grade) => (
                        <Button
                          key={grade}
                          variant="ghost"
                          className={`w-full text-left p-2 h-auto text-xs ${
                            selectedGrade === grade ? 'bg-muted' : ''
                          }`}
                          onClick={() => onGradeSelect(grade)}
                        >
                          {subcategory} {grade.toLowerCase()}
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
