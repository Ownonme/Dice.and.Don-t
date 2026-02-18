import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { Plus, BookOpen, Edit, Trash2 } from 'lucide-react';
import CreateGlossarySectionModal from '@/components/glossary/CreateGlossarySectionModal';
import DeleteSectionConfirmDialog from '@/components/glossary/DeleteSectionConfirmDialog';
import { GlossarySection } from '@/types/glossary';

const GlossaryPage = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sections, setSections] = useState<GlossarySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<GlossarySection | null>(null);
  const [deletingSection, setDeletingSection] = useState<GlossarySection | null>(null);

  const loadSections = useCallback(async () => {
    try {
      const data = await Api.listGlossarySections();
      const entries = await Api.listGlossaryEntries();
      const counts = entries.reduce((acc: Record<string, number>, e: any) => {
        acc[e.section_id] = (acc[e.section_id] || 0) + 1;
        return acc;
      }, {});
      const ordered = (data || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      setSections(ordered.map((s: any) => ({ ...s, entries_count: [{ count: counts[s.id] || 0 }] })));
    } catch (error) {
      toast({ title: 'Errore', description: 'Impossibile caricare le sezioni', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const handleSectionCreated = () => {
    setIsCreateModalOpen(false);
    setEditingSection(null);
    loadSections();
  };

  const handleEditSection = (e: React.MouseEvent, section: GlossarySection) => {
    e.stopPropagation();
    setEditingSection(section);
    setIsCreateModalOpen(true);
  };

  const handleDeleteSection = (e: React.MouseEvent, section: GlossarySection) => {
    e.stopPropagation();
    setDeletingSection(section);
  };

  const handleSectionDeleted = () => {
    setDeletingSection(null);
    loadSections();
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Caricamento glossario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              ← Home
            </Button>
            <h1 className="text-2xl font-bold">Glossario</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crea Sezione
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold mb-4">Benvenuto nel Glossario</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Esplora le sezioni e scopri le voci del mondo di gioco
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nessuna sezione disponibile</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin 
                ? 'Crea la prima sezione per iniziare il glossario'
                : 'Le sezioni saranno disponibili presto'}
            </p>
            {isAdmin && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Sezione
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <Card 
                key={section.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors relative group"
                onClick={() => navigate(`/glossary/section/${section.id}`)}
                style={{ borderLeft: `4px solid ${section.color}` }}
              >
                {isAdmin && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditSection(e, section)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteSection(e, section)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{section.icon}</span>
                    {section.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">
                    {section.description || 'Esplora questa sezione del glossario'}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    {section.entries_count?.[0]?.count || 0} voci
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {isCreateModalOpen && (
        <CreateGlossarySectionModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingSection(null);
          }}
          onSectionCreated={handleSectionCreated}
          editingSection={editingSection}
          mode={editingSection ? 'edit' : 'create'}
        />
      )}

      {deletingSection && (
        <DeleteSectionConfirmDialog
          isOpen={!!deletingSection}
          section={deletingSection}
          onClose={() => setDeletingSection(null)}
          onSectionDeleted={handleSectionDeleted}
        />
      )}
    </div>
  );
};

export default GlossaryPage;
