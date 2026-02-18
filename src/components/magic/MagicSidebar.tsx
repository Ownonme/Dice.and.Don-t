import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MagicSidebarProps {
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  selectedGrade: string | null;
  onCategorySelect: (category: string) => void;
  onSubcategorySelect: (subcategory: string) => void;
  onGradeSelect: (grade: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const MAGIC_CATEGORIES = {
  'Distruzione': ['Fuoco', 'Ghiaccio', 'Elettrico', 'Esplosivo', 'Lavico', 'Vento', 'Oro', 'Terra', 'Neo-Arcano'],
  'Illusione': ['Illusione', 'Ombra', 'Telecinesi'],
  'Evocazione': ['Evocazione energetica', 'Evocazione Necromantica'],
  'Supporto': ['Supporto', 'Sangue', 'Divino', 'Neo-Arcano'],
  'Alterazione': ['Veleno', 'Sangue', 'Terra', 'Acqua', 'Ossa', 'Vento', 'Gravità', 'Spazio', 'Tempo', 'Elementale'],
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
  onGradeSelect,
  searchQuery,
  onSearchChange
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
      <div className="p-4 border-b space-y-2">
        <Input
          placeholder="Cerca magie..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <h3 className="font-semibold">Sezioni</h3>
      </div>
      <ScrollArea className="h-auto lg:h-[calc(100vh-200px)]">
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
                    key={`${category}-${subcategory}`}
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
                          key={`${subcategory}-${grade}`}
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
