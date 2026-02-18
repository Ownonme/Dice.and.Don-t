import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CreateGlossaryEntryModal from '@/components/glossary/CreateGlossaryEntryModal';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Search, Edit, Trash2, Expand } from 'lucide-react';
import { GlossarySection, GlossaryEntry } from '@/types/glossary';
import ImageViewModal from '@/components/glossary/ImageViewModal';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableGlossaryEntry from '@/components/glossary/SortableGlossaryEntry';

export default function GlossarySectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<GlossarySection | null>(null);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);
  const [viewingImage, setViewingImage] = useState<{url: string, alt: string} | null>(null);

  const normalizeEntry = useCallback((row: any): GlossaryEntry => {
    const term = String(row?.term ?? row?.title ?? row?.name ?? '').trim();
    const definition = String(row?.definition ?? row?.content ?? row?.description ?? '').trim();
    const sort_order = Number(row?.sort_order ?? row?.order ?? 0) || 0;
    const created_at = row?.created_at ?? new Date().toISOString();
    const updated_at = row?.updated_at ?? created_at;
    const created_by = row?.created_by ?? row?.createdBy ?? row?.user_id ?? '';
    const related_terms = Array.isArray(row?.related_terms) ? row.related_terms : Array.isArray(row?.tags) ? row.tags : undefined;
    const image_url = row?.image_url ?? row?.imageUrl;

    return {
      ...(row || {}),
      term,
      definition,
      sort_order,
      created_at,
      updated_at,
      created_by,
      ...(related_terms ? { related_terms } : {}),
      ...(image_url != null ? { image_url } : {}),
    };
  }, []);

  const loadEntries = useCallback(async () => {
    if (!sectionId) return;

    try {
      if (isLocalServer()) {
        const data = await Api.listGlossaryEntries(sectionId);
        setEntries((data || []).map(normalizeEntry).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      } else {
        const { data, error } = await supabase
          .from('glossary_entries')
          .select('*')
          .eq('section_id', sectionId)
          .order('sort_order');

        if (error) throw error;
        setEntries((data || []).map(normalizeEntry));
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le voci',
        variant: 'destructive'
      });
    }
  }, [sectionId, normalizeEntry]);

  // Aggiungo i sensori per il drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchSectionAndEntries = useCallback(async () => {
    try {
      setLoading(true);

      if (isLocalServer()) {
        const sections = await Api.listGlossarySections();
        const sectionData = (sections || []).find((s: any) => String(s?.id) === String(sectionId)) || null;
        setSection(sectionData);
      } else {
        const { data: sectionData, error: sectionError } = await supabase
          .from('glossary_sections')
          .select('*')
          .eq('id', sectionId)
          .single();

        if (sectionError) throw sectionError;
        setSection(sectionData);
      }

      // Fetch entries in this section
      await loadEntries();
    } catch (error) {
      console.error('Error fetching section and entries:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati della sezione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [loadEntries, sectionId]);

  useEffect(() => {
    if (sectionId) {
      void fetchSectionAndEntries();
    }
  }, [sectionId, fetchSectionAndEntries]);

  const handleEntryCreated = () => {
    fetchSectionAndEntries();
    setShowCreateModal(false);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: GlossaryEntry) => {
    setEditingEntry(entry);
    setShowCreateModal(true);
  };

  const handleDeleteEntry = async (entry: GlossaryEntry) => {
    if (!confirm(`Sei sicuro di voler eliminare la voce "${entry.term}"?`)) {
      return;
    }

    try {
      if (isLocalServer()) {
        await Api.deleteGlossaryEntry(entry.id);
      } else {
        const { error } = await supabase
          .from('glossary_entries')
          .delete()
          .eq('id', entry.id);

        if (error) throw error;
      }

      toast({
        title: "Successo",
        description: "Voce eliminata con successo"
      });

      fetchSectionAndEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la voce",
        variant: "destructive"
      });
    }
  };

  // Funzione per gestire il riordinamento
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = entries.findIndex((entry) => entry.id === active.id);
      const newIndex = entries.findIndex((entry) => entry.id === over?.id);

      const newEntries = arrayMove(entries, oldIndex, newIndex);
      setEntries(newEntries);

      // Aggiorna l'ordine nel database
      try {
        const updates = newEntries.map((entry, index) => ({
          id: entry.id,
          sort_order: index
        }));

        for (const update of updates) {
          if (isLocalServer()) {
            await Api.updateGlossaryEntry(update.id, { sort_order: update.sort_order });
          } else {
            await supabase
              .from('glossary_entries')
              .update({ sort_order: update.sort_order })
              .eq('id', update.id);
          }
        }

        toast({
          title: 'Successo',
          description: 'Ordine delle voci aggiornato',
        });
      } catch (error) {
        console.error('Error updating order:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile aggiornare l\'ordine',
          variant: 'destructive'
        });
        // Ripristina l'ordine originale in caso di errore
        loadEntries();
      }
    }
  };

  const q = String(searchTerm ?? '').toLowerCase();
  const filteredEntries = entries.filter((entry) => {
    const term = String((entry as any)?.term ?? '').toLowerCase();
    const definition = String((entry as any)?.definition ?? '').toLowerCase();
    return term.includes(q) || definition.includes(q);
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sezione non trovata</h2>
          <Button onClick={() => navigate('/glossary')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna al Glossario
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4" style={{ borderLeft: `4px solid ${section.color}` }}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/glossary')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Glossario
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{section.icon}</span>
              <h1 className="text-2xl font-bold">{section.name}</h1>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Voce
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4">
        {section.description && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">{section.description}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca nelle voci..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl font-semibold mb-2">Nessuna voce disponibile</div>
            <p className="text-muted-foreground mb-4">
              {isAdmin 
                ? 'Crea la prima voce per questa sezione'
                : 'Le voci saranno disponibili presto'}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Voce
              </Button>
            )}
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredEntries.map(entry => entry.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEntries.map((entry) => (
                  <SortableGlossaryEntry
                    key={entry.id}
                    entry={entry}
                    isAdmin={isAdmin}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                    onImageClick={(entry) => {
                      setViewingImage({ url: entry.image_url!, alt: entry.term });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <CreateGlossaryEntryModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingEntry(null);
        }}
        onEntryCreated={handleEntryCreated}
        sectionId={sectionId!}
        editingEntry={editingEntry}
        mode={editingEntry ? 'edit' : 'create'}
      />

      {viewingImage && (
        <ImageViewModal
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
          imageUrl={viewingImage.url}
          altText={viewingImage.alt}
        />
      )}
    </div>
  );
}
