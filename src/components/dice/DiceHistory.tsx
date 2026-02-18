import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DiceRoll } from '@/types/dice';
import { getDiceTypeLabel } from '@/utils/diceUtils';

interface DiceHistoryProps {
  rolls: DiceRoll[];
  showHidden?: boolean;
}

const DiceHistory: React.FC<DiceHistoryProps> = ({ rolls, showHidden = false }) => {
  const visibleRolls = showHidden ? rolls : rolls.filter(roll => !roll.isHidden);

  return (
    <Card className="h-96">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Storico Tiri</CardTitle>
        {visibleRolls.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {visibleRolls.length} tir{visibleRolls.length === 1 ? 'o' : 'i'} effettuat{visibleRolls.length === 1 ? 'o' : 'i'}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {visibleRolls.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-center text-muted-foreground">Nessun tiro effettuato</p>
          </div>
        ) : (
          <div className="h-72 overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              {visibleRolls.map((roll) => (
                <div 
                  key={roll.id} 
                  className={`p-3 rounded-lg border transition-colors ${
                    roll.isHidden 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{roll.characterName || 'Sconosciuto'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getDiceTypeLabel(roll.diceType)}
                      </Badge>
                      {roll.isHidden && (
                        <Badge variant="secondary" className="text-xs">Nascosto</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {roll.timestamp?.toLocaleTimeString?.('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) || 'Ora sconosciuta'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {roll.isSpecialMessage ? (
                      <div className="text-lg font-bold text-red-600">
                        ⚠️ {roll.specialMessage}
                      </div>
                    ) : (
                      <div className="text-xl font-bold text-primary">
                        {typeof roll.result === 'number' && !isNaN(roll.result) ? roll.result : '?'}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground flex-1">
                      {typeof roll.maxValue === 'number' && !isNaN(roll.maxValue) && roll.maxValue > 0 
                        ? `su D${roll.maxValue}` 
                        : 'Somma totale'
                      }
                      {roll.modifier && roll.modifierType && 
                       typeof roll.modifier === 'number' && !isNaN(roll.modifier) && (
                        <div className="mt-1 text-xs">
                          Modificatore: +{roll.modifier} ({roll.modifierType})
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Aggiungi i dettagli dei dadi con le notazioni [] e () */}
                  {roll.diceDetails && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm font-mono">
                      {roll.diceDetails}
                    </div>
                  )}
                  {/* Aggiungi la descrizione se presente */}
                  {roll.rollDetails?.description && (
                    <div className="mt-1 text-xs text-gray-600">
                      {roll.rollDetails.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiceHistory;