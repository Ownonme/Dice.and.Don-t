import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit } from 'lucide-react';
import { GlossaryEntry } from '@/types/glossary';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import CreateGlossaryEntryModal from '@/components/glossary/CreateGlossaryEntryModal';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';

export default function GlossaryEntryDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<GlossaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const fetchEntry = useCallback(async () => {
    try {
      setLoading(true);
      if (isLocalServer()) {
        const entries = await Api.listGlossaryEntries();
        const found = (entries || []).find((e: any) => String(e?.id) === String(entryId)) || null;
        setEntry(found ? normalizeEntry(found) : null);
      } else {
        const { data, error } = await supabase
          .from('glossary_entries')
          .select('*')
          .eq('id', entryId)
          .single();

        if (error) throw error;
        setEntry(data ? normalizeEntry(data) : null);
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare la voce del glossario',
        variant: 'destructive'
      });
      navigate('/glossary');
    } finally {
      setLoading(false);
    }
  }, [entryId, navigate, normalizeEntry]);

  useEffect(() => {
    if (entryId) {
      void fetchEntry();
    }
  }, [entryId, fetchEntry]);

  const handleBack = () => {
    if (entry?.section_id) {
      navigate(`/glossary/section/${entry.section_id}`);
    } else {
      navigate('/glossary');
    }
  };

  const handleEntryUpdated = () => {
    setShowEditModal(false);
    void fetchEntry();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Voce non trovata</h2>
          <Button onClick={() => navigate('/glossary')}>Torna al Glossario</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowEditModal(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Modifica
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 max-w-4xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {entry.term}
          </h1>
          {entry.category && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {entry.category}
            </Badge>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Text Content */}
          <div className="space-y-6">
            {/* Definition */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Definizione</h2>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {entry.definition}
                </p>
              </CardContent>
            </Card>

            {/* Extended Description */}
            {entry.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-foreground">Descrizione Estesa</h2>
                  <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
                    {entry.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Examples */}
            {entry.examples && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-foreground">Esempi</h2>
                  <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
                    {entry.examples}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Related Terms */}
            {entry.related_terms && entry.related_terms.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-foreground">Termini Correlati</h2>
                  <div className="flex flex-wrap gap-2">
                    {entry.related_terms.map((term, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {term}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Image */}
          {entry.image_url && (
            <div className="lg:sticky lg:top-6">
              <Card>
                <CardContent className="p-0">
                  <img
                    src={entry.image_url}
                    alt={entry.term}
                    className="w-full h-auto rounded-lg object-cover"
                    style={{ maxHeight: '600px' }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <CreateGlossaryEntryModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onEntryCreated={handleEntryUpdated}
          editingEntry={entry}
          mode="edit"
          sectionId={entry.section_id}
        />
      )}
    </div>
  );
}
