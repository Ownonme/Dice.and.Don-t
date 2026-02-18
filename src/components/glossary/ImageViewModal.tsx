import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImageViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImageViewModal = ({ isOpen, onClose, imageUrl, altText }: ImageViewModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setImageError(false);
    }
  }, [isOpen]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogTitle className="sr-only">{altText}</DialogTitle>
        <DialogDescription className="sr-only">
          Visualizzazione ingrandita dell'immagine. Usa i controlli per zoomare, ruotare o resettare la vista.
        </DialogDescription>
        <div className="relative bg-black">
          {/* Controlli */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              aria-label="Riduci zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              aria-label="Aumenta zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRotate}
              aria-label="Ruota immagine"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              aria-label="Resetta vista"
            >
              Reset
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Immagine */}
          <div className="flex items-center justify-center min-h-[60vh] p-8 overflow-auto">
            {imageError ? (
              <div className="text-white text-center">
                <p>Errore nel caricamento dell'immagine</p>
                <p className="text-sm text-gray-400 mt-2">{imageUrl}</p>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={altText}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  cursor: zoom > 1 ? 'grab' : 'default'
                }}
                draggable={false}
                onError={() => {
                  setImageError(true);
                }}
              />
            )}
          </div>

          {/* Info zoom */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewModal;
