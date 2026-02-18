import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AbilityDetails } from './AbilityDetails'

interface AbilityDetailModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  ability: any
}

export function AbilityDetailModal({ isOpen, onOpenChange, ability }: AbilityDetailModalProps) {
  if (!ability) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{ability.name}</DialogTitle>
          <DialogDescription>
            Visualizza i dettagli completi dell'abilità selezionata
          </DialogDescription>
        </DialogHeader>
        <AbilityDetails ability={ability} hideHeader scrollAreaClassName="h-[55vh]" />
      </DialogContent>
    </Dialog>
  )
}
