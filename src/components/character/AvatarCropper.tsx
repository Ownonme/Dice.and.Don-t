import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { getCroppedImg } from '@/utils/cropUtils'
import { Crop, RotateCcw } from 'lucide-react'

interface AvatarCropperProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  onCropComplete: (croppedImageBlob: Blob) => void
}

const AvatarCropper = ({ isOpen, onClose, imageSrc, onCropComplete }: AvatarCropperProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation)
  }, [])

  const onCropCompleteHandler = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleCropConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return

    setIsProcessing(true)
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      )
      onCropComplete(croppedImage)
      onClose()
    } catch (e) {
      console.error('Errore durante il crop:', e)
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, rotation, onCropComplete, onClose])

  const resetCrop = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Ritaglia Avatar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Area di cropping */}
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1} // Aspect ratio quadrato per avatar
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
              showGrid={true}
              cropShape="round" // Crop circolare per avatar
            />
          </div>

          {/* Controlli */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Zoom</Label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Rotazione</Label>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={0}
                max={360}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={resetCrop}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button 
              onClick={handleCropConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Elaborazione...' : 'Conferma'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AvatarCropper