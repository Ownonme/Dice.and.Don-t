import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isLocalServer } from '@/integrations/localserver';
import * as Api from '@/integrations/localserver/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Upload, X, Edit, Trash2 } from 'lucide-react';
import ImageCropModal from './ImageCropModal';
import { GlossaryEntry } from '@/types/glossary';

interface CreateGlossaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryCreated: () => void;
  editingEntry?: GlossaryEntry | null;
  mode?: 'create' | 'edit';
  sectionId: string;
}

const CreateGlossaryEntryModal = ({ isOpen, onClose, onEntryCreated, editingEntry, mode = 'create', sectionId }: CreateGlossaryEntryModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    term: '',
    definition: '',
    category: '',
    description: '',
    examples: '',
    related_terms: '',
    image_url: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verifica dimensione file (max 10MB prima del processing)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Errore",
          description: "L'immagine deve essere inferiore a 10MB",
          variant: "destructive"
        });
        return;
      }

      // Verifica tipo file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Errore",
          description: "Seleziona un file immagine valido",
          variant: "destructive"
        });
        return;
      }

      setTempImageFile(file);
      setShowImageCrop(true);
    }
  };

  const handleImageProcessed = (processedFile: File) => {
    setSelectedImage(processedFile);
    
    // Crea preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(processedFile);
    
    setShowImageCrop(false);
    setTempImageFile(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      if (isLocalServer()) {
        const { url } = await Api.uploadFile(file);
        return url;
      }
      return null;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'upload dell'immagine",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  // Aggiungo useEffect per popolare il form in modalità edit
  useEffect(() => {
    if (editingEntry && mode === 'edit') {
      setFormData({
        term: editingEntry.term,
        definition: editingEntry.definition,
        category: editingEntry.category || '',
        description: editingEntry.description || '',
        examples: editingEntry.examples || '',
        related_terms: editingEntry.related_terms?.join(', ') || '',
        image_url: editingEntry.image_url || ''
      });
      if (editingEntry.image_url) {
        setImagePreview(editingEntry.image_url);
      }
    } else {
      // Reset form per modalità create
      setFormData({
        term: '',
        definition: '',
        category: '',
        description: '',
        examples: '',
        related_terms: '',
        image_url: ''
      });
      setImagePreview(null);
      setSelectedImage(null);
    }
  }, [editingEntry, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.term.trim() || !formData.definition.trim()) {
      toast({
        title: "Errore",
        description: "Termine e definizione sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per creare voci",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      let imageUrl = formData.image_url;
      
      // Upload immagine se selezionata
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const nextOrder = 0;

      const entryData = {
        term: formData.term.trim(),
        definition: formData.definition.trim(),
        category: formData.category.trim() || null,
        description: formData.description.trim() || null,
        examples: formData.examples.trim() || null,
        related_terms: formData.related_terms.trim() 
          ? formData.related_terms.split(',').map(term => term.trim()).filter(term => term)
          : null,
        image_url: imageUrl || null,
        section_id: sectionId,
        sort_order: nextOrder,
        created_by: user.id
      };

      if (mode === 'edit' && editingEntry) {
        await Api.updateGlossaryEntry(editingEntry.id, { ...entryData, sort_order: editingEntry.sort_order });
        toast({ title: 'Successo', description: 'Voce del glossario aggiornata (locale)' });
      } else {
        await Api.createGlossaryEntry(entryData);
        toast({ title: 'Successo', description: 'Voce del glossario creata (locale)' });
      }

      onEntryCreated();
    } catch (error: any) {
      console.error('Error saving glossary entry:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la voce del glossario",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'edit' ? 'Modifica Voce' : 'Aggiungi Voce'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifica i dettagli della voce del glossario' 
              : 'Crea una nuova voce per il glossario del gioco'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Layout a due colonne per i campi principali */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonna sinistra - Informazioni base */}
            <div className="space-y-4">
              {/* Termine */}
              <div>
                <Label htmlFor="term" className="text-sm font-medium">Termine *</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                  placeholder="Es. Resistenza"
                  required
                  className="mt-1"
                />
              </div>

              {/* Categoria */}
              <div>
                <Label htmlFor="category" className="text-sm font-medium">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Es. Statistiche, Combattimento, Magia"
                  className="mt-1"
                />
              </div>

              {/* Termini correlati */}
              <div>
                <Label htmlFor="related_terms" className="text-sm font-medium">Termini Correlati</Label>
                <Input
                  id="related_terms"
                  value={formData.related_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, related_terms: e.target.value }))}
                  placeholder="Termini separati da virgola: Forza, Agilità, Combattimento"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Colonna destra - Immagine */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Immagine</Label>
                <div className="space-y-3 mt-1">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={isUploadingImage}
                      className="flex-1"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Carica Immagine
                    </Button>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (selectedImage) {
                            setTempImageFile(selectedImage);
                            setShowImageCrop(true);
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifica
                      </Button>
                    )}
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {imagePreview && (
                    <div className="relative inline-block w-full">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-w-md h-48 object-contain rounded border bg-gray-50 mx-auto block"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Campi di testo a larghezza piena */}
          <div className="space-y-4">
            {/* Definizione */}
            <div>
              <Label htmlFor="definition" className="text-sm font-medium">Definizione *</Label>
              <Textarea
                id="definition"
                value={formData.definition}
                onChange={(e) => setFormData(prev => ({ ...prev, definition: e.target.value }))}
                placeholder="Definizione breve e chiara del termine"
                required
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Descrizione estesa */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Descrizione Estesa</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Spiegazione più dettagliata del termine"
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Esempi */}
            <div>
              <Label htmlFor="examples" className="text-sm font-medium">Esempi</Label>
              <Textarea
                id="examples"
                value={formData.examples}
                onChange={(e) => setFormData(prev => ({ ...prev, examples: e.target.value }))}
                placeholder="Esempi pratici di utilizzo del termine"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isUploadingImage}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading || isUploadingImage}>
              {(isLoading || isUploadingImage) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isUploadingImage ? 'Caricamento...' : (mode === 'edit' ? 'Aggiorna Voce' : 'Crea Voce')}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Image Crop Modal */}
      {showImageCrop && tempImageFile && (
        <ImageCropModal
          isOpen={showImageCrop}
          onClose={() => {
            setShowImageCrop(false);
            setTempImageFile(null);
          }}
          imageFile={tempImageFile}
          onImageProcessed={handleImageProcessed}
        />
      )}
    </Dialog>
  );
};

export default CreateGlossaryEntryModal;
