import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiBase } from '@/integrations/localserver';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AbilitySidebar } from '../components/abilities/AbilitySidebar';
import { AbilityGrid } from '../components/abilities/AbilityGrid';
import { AddAbilityModal } from '../components/abilities/AddAbilityModal';
import { AbilityDetails } from '../components/abilities/AbilityDetails';
// input spostato nella sidebar
import { useNavigate } from 'react-router-dom';
import { DiceLoader } from '@/components/ui/dice-loader';

interface Ability {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string;
  grade: string;
  description: string;
  additional_description: string;
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

export const AbilityLibrary = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [filteredAbilities, setFilteredAbilities] = useState<Ability[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editAbility, setEditAbility] = useState<Ability | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState(''); // barra di ricerca

  // Carica le abilità
  const loadAbilities = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/abilities?order=name:asc`);
      const data = await res.json();
      setAbilities(data || []);
    } catch (error) {
      console.error('Error loading abilities:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le abilità",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Handler: apre la modale in modalità aggiunta
  const handleAddAbility = () => {
    setEditAbility(null);
    setIsAddModalOpen(true);
  };

  // Handler: apre la modale in modalità modifica
  const handleEditAbility = (ability: Ability) => {
    setEditAbility(ability);
    setIsAddModalOpen(true);
  };

  // Handler: chiude la modale e aggiorna l’elenco
  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditAbility(null);
    setRefreshTrigger(prev => prev + 1); // per forzare refresh nella grid
    loadAbilities(); // ricarica la lista nel parent per i filtri
  };

  // Handler: elimina un’abilità
  const handleDeleteAbility = async (abilityId: string) => {
    try {
      await fetch(`${apiBase()}/api/abilities?eq_id=${abilityId}`, { method: 'DELETE' });

      toast({
        title: 'Abilità eliminata',
        description: 'L’abilità è stata rimossa con successo.',
      });
      setSelectedAbility(null);
      await loadAbilities();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting ability:', err);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare l’abilità',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadAbilities();
  }, [loadAbilities]);

  // Filtra le abilità
  useEffect(() => {
    let filtered = abilities;

    if (selectedCategory) {
      filtered = filtered.filter(ability => ability.category === selectedCategory);
    }

    if (selectedSubcategory) {
      filtered = filtered.filter(ability => ability.subcategory === selectedSubcategory);
    }

    if (selectedGrade) {
      filtered = filtered.filter(ability => ability.grade === selectedGrade);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((a) => {
        const fields = [
          a.name, a.type, a.category, a.subcategory,
          a.description, a.additional_description
        ];
        return fields.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
      });
    }

    setFilteredAbilities(filtered);
  }, [abilities, selectedCategory, selectedSubcategory, selectedGrade, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4">
        <div className="container mx-auto flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>← Home</Button>
            <h1 className="text-2xl font-bold">Libreria Abilità</h1>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-2">
            {isAdmin && (
              <Button onClick={handleAddAbility} className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Abilità
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar - Sezioni */}
          <div className="order-1 lg:order-none lg:col-span-3">
            <AbilitySidebar
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              selectedGrade={selectedGrade}
              onCategorySelect={setSelectedCategory}
              onSubcategorySelect={setSelectedSubcategory}
              onGradeSelect={setSelectedGrade}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Main Content */}
          <div className="order-2 lg:order-none lg:col-span-9 flex flex-col gap-4">
            {/* Ability Grid */}
            <div>
              <div className="relative">
                <AbilityGrid
                  abilities={filteredAbilities}
                  onAbilitySelect={setSelectedAbility}
                  selectedAbility={selectedAbility}
                  onAbilityEdit={isAdmin ? handleEditAbility : undefined}
                  refreshTrigger={refreshTrigger}
                  category={selectedCategory}
                  subcategory={selectedSubcategory}
                  grade={selectedGrade}
                />
                {loading && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <DiceLoader size="lg" text="Don't" label="Caricamento abilità..." />
                  </div>
                )}
              </div>
            </div>

            {/* Ability Details */}
            <div>
              <AbilityDetails
                ability={selectedAbility}
                onEdit={isAdmin ? handleEditAbility : undefined}
                onDelete={isAdmin ? handleDeleteAbility : undefined}
                scrollAreaClassName="h-[400px]"
              />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <AddAbilityModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          editAbility={editAbility}
          mode={editAbility ? 'edit' : 'add'}
        />
      )}
    </div>
  );
};
