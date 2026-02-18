import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TargetEditDialog from './TargetEditDialog';

interface RollSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  onCriticalSuccess?: (extraPureValue?: number) => void;
  onPostureBreak?: (breaks: boolean) => void;
  spellOrAbilityName?: string;
  warningText?: string;
  showTerminateHere?: boolean;
  onTerminateHereChange?: (terminateHere: boolean) => void;
  usePercentRoll?: boolean;
  percentResult?: number;
  percentMinRequired?: number;
  actionRollRecap?: { result: number; maxValue: number; statValue: number; competenceTotal: number } | null;
  // Numero di attacchi scelti dall'utente (se la magia/abilità supporta max_multiple_attacks)
  selectedShots?: number;
  lotteryPreview?: { diceFaces: number; items: { roll: number; correct: boolean }[]; choices: number[] } | null;
  targets?: { type: 'characters' | 'enemies' | 'evocations'; id?: string; name?: string }[];
  availableCharacters?: { id: string; name: string }[];
  availableEnemies?: { id: string; name: string }[];
  availableEvocations?: { id: string; name: string }[];
  onTargetsUpdate?: (targets: { type: 'characters' | 'enemies' | 'evocations'; id?: string; name?: string }[]) => void;
  shotsTargets?: { type: 'characters' | 'enemies' | 'evocations'; id?: string; name?: string }[][];
  onShotsTargetsUpdate?: (shotsTargets: { type: 'characters' | 'enemies' | 'evocations'; id?: string; name?: string }[][]) => void;
}

const RollSuccessDialog: React.FC<RollSuccessDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onFailure,
  onCriticalSuccess,
  onPostureBreak,
  spellOrAbilityName,
  warningText,
  showTerminateHere = false,
  onTerminateHereChange,
  usePercentRoll = false,
  percentResult,
  percentMinRequired,
  actionRollRecap,
  selectedShots,
  lotteryPreview,
  targets = [],
  availableCharacters = [],
  availableEnemies = [],
  availableEvocations = [],
  onTargetsUpdate,
  shotsTargets,
  onShotsTargetsUpdate
}) => {
  const [criticalExtra, setCriticalExtra] = React.useState<number>(0);
  const [criticalMode, setCriticalMode] = React.useState<boolean>(false);
  const [postureBreaks, setPostureBreaks] = React.useState<boolean>(false);
  const [targetEditOpen, setTargetEditOpen] = React.useState<boolean>(false);
  const [terminateHere, setTerminateHere] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setCriticalExtra(0);
    setCriticalMode(false);
    setPostureBreaks(false);
    setTargetEditOpen(false);
    setTerminateHere(false);
    onTerminateHereChange?.(false);
  }, [isOpen, onTerminateHereChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Risultato del Tiro</DialogTitle>
          <DialogDescription>
            {spellOrAbilityName && `Hai utilizzato: ${spellOrAbilityName}${typeof selectedShots === 'number' && selectedShots > 0 ? `, ${selectedShots} ${selectedShots === 1 ? 'colpo' : 'colpi'}.` : ''}`}
            <br />
            {usePercentRoll ? (
              <>
                Tiro percentuale (d100) eseguito.
                <br />
                Risultato: {typeof percentResult === 'number' ? percentResult : '-'} / 100
                <br />
                Minimo richiesto: {typeof percentMinRequired === 'number' ? percentMinRequired : 0}%
                <br />
                In questa sezione non contano statistiche o competenze.
                <br />
                Confermi il successo?
              </>
            ) : (
              <>Il tiro è riuscito?</>
            )}
            {warningText && (
              <>
                <br />
                <span className="text-destructive font-medium">Avviso:</span>
                <br />
                <span className="text-destructive whitespace-pre-line">{warningText}</span>
              </>
            )}
            {showTerminateHere && (
              <>
                <br />
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant={terminateHere ? 'default' : 'outline'}
                    className={terminateHere ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => {
                      const next = !terminateHere;
                      setTerminateHere(next);
                      onTerminateHereChange?.(next);
                    }}
                  >
                    Termina qui
                  </Button>
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {actionRollRecap && (
          <div className="mt-3 p-2 border rounded">
            <div className="text-sm font-medium">Tiro di azione</div>
            <div className="mt-1 text-sm">
              Risultato: <span className="font-semibold">{actionRollRecap.result}</span>
              {actionRollRecap.maxValue ? (
                <span className="text-muted-foreground"> / d{actionRollRecap.maxValue}</span>
              ) : null}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Stat: {actionRollRecap.statValue} • Competenze: {actionRollRecap.competenceTotal}
            </div>
          </div>
        )}
        <div className="mt-3 p-2 border rounded">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Bersagli selezionati</div>
            <Button size="sm" variant="outline" onClick={() => setTargetEditOpen(true)}>Modifica bersagli</Button>
          </div>
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
            {(targets || []).length > 0 ? (
              (targets || []).map((t, idx) => (
                <div key={`tgt-${idx}`} className="text-sm">
                  {t.name || 'Sconosciuto'}
                  <span className="text-muted-foreground ml-2">{t.type}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">Nessun bersaglio selezionato</div>
            )}
          </div>
        </div>
        {lotteryPreview && lotteryPreview.items && lotteryPreview.items.length > 0 && (
          <div className="mt-4 p-2 border rounded">
            <div className="text-sm font-medium">Tiro tombola (d{lotteryPreview.diceFaces})</div>
            {Array.isArray(lotteryPreview.choices) && lotteryPreview.choices.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">Scelte utente: {lotteryPreview.choices.join(', ')}</div>
            )}
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
              {lotteryPreview.items.map((it, idx) => (
                <div key={`lp-${idx}`} className="flex items-center justify-between text-sm">
                  <span>Tiro {idx + 1}: {it.roll}</span>
                  <span className={it.correct ? 'text-green-600' : 'text-red-600'}>{it.correct ? '✓' : '✕'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {criticalMode && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Valore critico puro (opzionale)</div>
            <Input
              type="number"
              value={criticalExtra}
              onChange={(e) => setCriticalExtra(Number(e.target.value) || 0)}
              placeholder="0"
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700"
                onClick={() => {
                  onCriticalSuccess?.(criticalExtra);
                  onPostureBreak?.(postureBreaks);
                  onClose();
                  setCriticalMode(false);
                  setCriticalExtra(0);
                }}
              >
                Conferma critico
              </Button>
            </div>
          </div>
        )}
        <div className="mt-4 p-3 border rounded">
          <div className="text-sm font-medium">La postura si rompe?</div>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={postureBreaks ? 'outline' : 'default'}
              onClick={() => setPostureBreaks(false)}
            >
              No
            </Button>
            <Button
              size="sm"
              variant={postureBreaks ? 'default' : 'outline'}
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setPostureBreaks(true)}
            >
              Sì
            </Button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
          <Button 
            variant="destructive" 
            onClick={() => {
              onFailure();
              onPostureBreak?.(postureBreaks);
              onClose();
            }}
            className="w-full"
          >
            No
          </Button>
          <Button 
            onClick={() => {
              onSuccess();
              onPostureBreak?.(postureBreaks);
              onClose();
            }}
            className="w-full"
          >
            Sì
          </Button>
          <Button 
            variant="default"
            onClick={() => {
              // Mostra input solo dopo aver premuto "Critico"
              setCriticalMode(true);
            }}
            className="w-full bg-yellow-600 hover:bg-yellow-700"
          >
            {criticalMode ? 'Inserisci valore' : 'Sì con critico'}
          </Button>
        </div>
        <TargetEditDialog
          isOpen={targetEditOpen}
          onOpenChange={setTargetEditOpen}
          selectedTargets={targets || []}
          selectedShots={selectedShots}
          availableCharacters={availableCharacters || []}
          availableEnemies={availableEnemies || []}
          availableEvocations={availableEvocations || []}
          onSave={(updated) => {
            onTargetsUpdate?.(updated);
          }}
          shotsTargets={shotsTargets}
          onSaveShotsTargets={(sts) => onShotsTargetsUpdate?.(sts)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RollSuccessDialog;
