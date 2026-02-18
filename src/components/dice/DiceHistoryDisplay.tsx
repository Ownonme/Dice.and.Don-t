import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDiceHistory } from '../../hooks/useDiceHistory';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DiceRoll } from '../../types/dice';

interface DiceHistoryDisplayProps {
  localRolls?: DiceRoll[];
}

const DiceHistoryDisplay: React.FC<DiceHistoryDisplayProps> = ({ localRolls = [] }) => {
  const { rolls: dbRolls, loading, clearHistory, refreshHistory, isClearing } = useDiceHistory();
  const { user, isAdmin } = useAuth();
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  // Combina tiri locali e del database, ordinati per timestamp
  const allRolls = React.useMemo(() => {
    const combinedRolls = [
      // Converti tiri locali nel formato del database, filtrando le modifiche dirette nemici
      ...localRolls
        .filter(roll => roll.diceType !== 'modifica_diretta_nemico')
        .map(roll => ({
        id: roll.id,
        character_name: roll.characterName,
        dice_type: roll.diceType,
        dice_count: roll.rollDetails?.diceRolls?.length || 1,
        result: roll.rollDetails?.totalResult || roll.result,
        modifier: 0,
        total_result: roll.rollDetails?.totalResult || roll.result,
        roll_type: roll.diceType,
        created_at: roll.timestamp.toISOString(),
        details: roll.rollDetails,
        isLocal: true // Flag per distinguere i tiri locali
      })),
      // Aggiungi tiri dal database
      ...dbRolls.map(roll => ({ ...roll, isLocal: false }))
    ];
    
    // Ordina per timestamp (più recenti prima)
    return combinedRolls.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [localRolls, dbRolls]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRollColor = (result: number, diceType: string) => {
    if (!diceType) return 'text-foreground';
    const maxValue = parseInt(diceType.replace('d', ''));
    if (result === 1) return 'text-red-500';
    if (result === maxValue) return 'text-green-500';
    return 'text-foreground';
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setShowClearDialog(false);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Storico Tiri</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshHistory}
              disabled={loading || isClearing}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {isAdmin && (
              <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isClearing || allRolls.length === 0}
                  >
                    <Trash2 className={`h-4 w-4 ${isClearing ? 'animate-pulse' : ''}`} />
                    {isClearing && <span className="ml-1">Pulizia...</span>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Conferma pulizia storico
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Stai per eliminare tutti i {dbRolls.length} tiri salvati nel database. Questa azione è irreversibile e cancellerà lo storico per tutti gli utenti.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      Stai per eliminare <strong>tutti i {dbRolls.length} tiri</strong> salvati nel database.
                    </div>
                    <div className="text-destructive font-medium">
                      ⚠️ Questa azione è irreversibile e cancellerà lo storico per tutti gli utenti.
                    </div>
                    <div className="text-muted-foreground">
                      I tiri "Locali" non verranno eliminati in quanto esistono solo sul dispositivo dell'utente.
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isClearing}
                    >
                      {isClearing ? 'Eliminazione...' : 'Elimina tutto'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>Aggiornamenti in tempo reale • {allRolls.length} tiri</span>
          {isAdmin && (
            <Badge variant="outline" className="text-xs">
              Admin
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : allRolls.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nessun tiro ancora effettuato
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {allRolls.map((roll) => (
                <div
                  key={roll.id}
                  className={`p-3 rounded-lg ${
                    roll.isLocal ? 'bg-blue-50 border border-blue-200' : 'bg-muted/50'
                  }`}
                >
                  {/* Header del tiro */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {roll.character_name}
                        {roll.isLocal && (
                          <Badge variant="outline" className="ml-2 text-xs text-blue-600">
                            Locale
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {roll.dice_count}x{roll.dice_type}
                      </Badge>
                      {roll.dice_type === 'percentuale' && typeof roll.details?.percentMinRequired === 'number' && roll.details.percentMinRequired > 0 && (
                        <Badge variant="outline" className="text-xs">minimo {roll.details.percentMinRequired}%</Badge>
                      )}
                      {roll.roll_type && (
                        <Badge variant="secondary" className="text-xs">
                          {roll.roll_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`font-bold ${getRollColor(roll.result, roll.dice_type)}`}>
                          {roll.dice_type === 'percentuale' ? `${roll.result}%` : (roll.result || 'N/A')}
                        </div>
                        {roll.modifier !== 0 && (
                          <div className="text-xs text-muted-foreground">
                            {roll.result} {roll.modifier >= 0 ? '+' : ''}{roll.modifier}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground min-w-[60px] text-right">
                        {formatTime(roll.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Dettagli dei calcoli sotto ogni tiro */}
                  {(roll.details?.diceDetails || (roll.isLocal && localRolls.find(lr => lr.id === roll.id)?.diceDetails)) && (
                    <div className="mt-2 p-2 bg-white/50 rounded border-l-4 border-blue-400">
                      <div className="text-xs font-mono text-gray-700">
                        {roll.details?.diceDetails || localRolls.find(lr => lr.id === roll.id)?.diceDetails}
                      </div>
                    </div>
                  )}
                  
                  {/* Descrizione aggiuntiva se presente */}
                  {(roll.details?.description || (roll.isLocal && localRolls.find(lr => lr.id === roll.id)?.rollDetails?.description)) && (
                    <div className="mt-1 text-xs text-gray-600">
                      {roll.details?.description || localRolls.find(lr => lr.id === roll.id)?.rollDetails?.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DiceHistoryDisplay;