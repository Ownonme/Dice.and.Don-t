import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crop, RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  onImageProcessed: (processedFile: File) => void;
}

const ImageCropModal = ({ isOpen, onClose, imageFile, onImageProcessed }: ImageCropModalProps) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [quality, setQuality] = useState([80]);
  const [maxWidth, setMaxWidth] = useState('800');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useState(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const processImage = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const maxWidthNum = parseInt(maxWidth);
    
    // Calcola dimensioni mantenendo aspect ratio
    let { width, height } = img;
    if (width > maxWidthNum) {
      height = (height * maxWidthNum) / width;
      width = maxWidthNum;
    }

    // Imposta dimensioni canvas
    canvas.width = width;
    canvas.height = height;

    // Applica trasformazioni
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    // Converti in blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const processedFile = new File([blob], imageFile.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          onImageProcessed(processedFile);
          onClose();
        }
      },
      'image/jpeg',
      quality[0] / 100
    );
  }, [imageFile, quality, maxWidth, rotation, flipH, flipV, onImageProcessed, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ridimensiona Immagine</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Preview"
              className="max-w-full max-h-64 object-contain"
              style={{
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
              }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Controlli */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Larghezza massima */}
            <div>
              <Label>Larghezza massima (px)</Label>
              <Select value={maxWidth} onValueChange={setMaxWidth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400px</SelectItem>
                  <SelectItem value="600">600px</SelectItem>
                  <SelectItem value="800">800px</SelectItem>
                  <SelectItem value="1024">1024px</SelectItem>
                  <SelectItem value="1200">1200px</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Qualità */}
            <div>
              <Label>Qualità: {quality[0]}%</Label>
              <Slider
                value={quality}
                onValueChange={setQuality}
                max={100}
                min={10}
                step={10}
                className="mt-2"
              />
            </div>
          </div>

          {/* Trasformazioni */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation(prev => (prev + 90) % 360)}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Ruota
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlipH(!flipH)}
            >
              <FlipHorizontal className="h-4 w-4 mr-2" />
              Ribalta H
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlipV(!flipV)}
            >
              <FlipVertical className="h-4 w-4 mr-2" />
              Ribalta V
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={processImage}>
            <Crop className="h-4 w-4 mr-2" />
            Applica
          </Button>
        </DialogFooter>

        {/* Canvas nascosto per processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;