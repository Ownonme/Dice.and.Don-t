import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MagicDetails } from './MagicDetails'

interface MagicDetailModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  spell: any
}

export function MagicDetailModal({ isOpen, onOpenChange, spell }: MagicDetailModalProps) {
  if (!spell) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dettagli Magia</DialogTitle>
          <DialogDescription>
            Visualizza i dettagli completi della magia selezionata
          </DialogDescription>
        </DialogHeader>
        <MagicDetails spell={spell} />
      </DialogContent>
    </Dialog>
  )
}