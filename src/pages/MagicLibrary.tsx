import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MagicSidebar } from '@/components/magic/MagicSidebar';
import { MagicGrid } from '@/components/magic/MagicGrid';
import { MagicDetails } from '@/components/magic/MagicDetails';
import { AddSpellModal } from '@/components/magic/AddSpellModal';
// rimosso input dalla header; spostato in sidebar
import { AnomalyAdminModal } from '@/components/magic/AnomalyAdminModal';
import { useToast } from '@/hooks/use-toast';
import { DamageEffectAdminModal } from '@/components/magic/DamageEffectAdminModal';
import { apiBase } from '@/integrations/localserver';
import { DiceLoader } from '@/components/ui/dice-loader';

const MagicLibrary = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [editingSpell, setEditingSpell] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Nuovo stato
  const [searchQuery, setSearchQuery] = useState(''); // Barra di ricerca
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isMagicGridLoading, setIsMagicGridLoading] = useState(false);

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingSpell(null);
    setModalMode('add');
    setRefreshTrigger(prev => prev + 1); // Forza il refresh quando si chiude la modale
  };

  const handleAddSpell = () => {
    setModalMode('add');
    setEditingSpell(null);
    setIsAddModalOpen(true);
  };

  const handleEditSpell = (spell: any) => {
    setModalMode('edit');
    setEditingSpell(spell);
    setIsAddModalOpen(true);
  };

  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4">
        <div className="container mx-auto flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>← Home</Button>
            <h1 className="text-2xl font-bold">Libreria Magie</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button onClick={handleAddSpell}>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Magia
                </Button>
                <Button variant="secondary" onClick={() => setIsAnomalyModalOpen(true)}>
                  Gestisci Anomalie
                </Button>
                <Button variant="secondary" onClick={() => setIsDamageModalOpen(true)}>
                  Crea Danni/Effetti
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar - Sezioni */}
          <div className="order-1 lg:order-none lg:col-span-3">
            <MagicSidebar
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
            {/* Magie Grid */}
            <div>
              <div className="relative">
                <MagicGrid
                  category={selectedCategory}
                  subcategory={selectedSubcategory}
                  grade={selectedGrade}
                  onSpellSelect={setSelectedSpell}
                  onSpellEdit={handleEditSpell}
                  refreshTrigger={refreshTrigger}
                  searchTerm={searchQuery}
                  onLoadingChange={setIsMagicGridLoading}
                />
                {isMagicGridLoading && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <DiceLoader size="lg" text="Don't" label="Caricamento magie..." />
                  </div>
                )}
              </div>
            </div>

            {/* Spell Details */}
            <div>
              <MagicDetails spell={selectedSpell} />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <AddSpellModal isOpen={isAddModalOpen} onClose={handleCloseModal} editSpell={editingSpell} mode={modalMode} />
      )}
      {isAdmin && (
        <AnomalyAdminModal
          isOpen={isAnomalyModalOpen}
          onClose={() => setIsAnomalyModalOpen(false)}
          onSave={async (def) => {
            try {
              await fetch(`${apiBase()}/api/anomalies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def)
              });
              toast({
                title: 'Successo',
                description: 'Anomalia salvata (locale)',
              });
            } catch (error: any) {
              console.error('Errore salvataggio anomalia:', error);
              toast({
                title: 'Errore',
                description: 'Impossibile salvare l’anomalia',
                variant: 'destructive',
              });
            } finally {
              setIsAnomalyModalOpen(false);
            }
          }}
        />
      )}
      {isAdmin && (
        <DamageEffectAdminModal
          isOpen={isDamageModalOpen}
          onClose={() => setIsDamageModalOpen(false)}
          onSave={async (def) => {
            try {
              await fetch(`${apiBase()}/api/damage_effects`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def)
              });
              toast({
                title: 'Successo',
                description: 'Tipo di danno/effetto salvato (locale)',
              });
            } catch (error: any) {
              console.error('Errore salvataggio danno/effetto:', error);
              toast({
                title: 'Errore',
                description: 'Impossibile salvare il tipo di danno/effetto',
                variant: 'destructive',
              });
            } finally {
              setIsDamageModalOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default MagicLibrary;
