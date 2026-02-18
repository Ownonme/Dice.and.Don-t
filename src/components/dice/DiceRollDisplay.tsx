import React from 'react';
import { DiceRoll } from '@/types/dice';

interface DiceRollDisplayProps {
  roll: DiceRoll;
}

const DiceRollDisplay: React.FC<DiceRollDisplayProps> = ({ roll }) => {
  // Visualizzazione per danno normale
  if (roll.diceType === 'danni') {
    return (
      <div className="space-y-1">
        <span>
          Danno: {roll.result}
          {roll.rollDetails?.description && (
            <span className="text-muted-foreground ml-2">({roll.rollDetails.description})</span>
          )}
        </span>
        {/* Dettagli inline senza popup */}
        {roll.diceDetails && (
          <div className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border-l-2 border-blue-300">
            {roll.diceDetails} {/* ← Il danno freccia appare qui */}
          </div>
        )}
      </div>
    );
  }
  
  // Visualizzazione per danno critico
  if (roll.diceType === 'danno_critico') {
    return (
      <div className="space-y-1">
        <span>
          Danno Critico: {roll.result}
          {roll.rollDetails?.description && (
            <span className="text-muted-foreground ml-2">({roll.rollDetails.description})</span>
          )}
        </span>
        {/* Dettagli inline senza popup */}
        {roll.diceDetails && (
          <div className="text-xs font-mono text-red-700 bg-red-50 px-2 py-1 rounded border-l-2 border-red-300">
            {roll.diceDetails}
          </div>
        )}
      </div>
    );
  }
  
  // Visualizzazione per azioni
  if (roll.diceType === 'azioni') {
    return (
      <div className="space-y-1">
        <span>
          Azione: {roll.result}
          {roll.rollDetails?.description && (
            <span className="text-muted-foreground ml-2">({roll.rollDetails.description})</span>
          )}
        </span>
        {/* Dettagli inline senza popup */}
        {roll.diceDetails && (
          <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded border-l-2 border-green-300">
            {roll.diceDetails}
          </div>
        )}
      </div>
    );
  }
  
  // Visualizzazione standard per altri tipi di dado
  return (
    <div className="space-y-1">
      <span>{roll.result}</span>
      {/* Dettagli inline senza popup */}
      {roll.diceDetails && (
        <div className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border-l-2 border-gray-300">
          {roll.diceDetails}
        </div>
      )}
    </div>
  );
};

export default DiceRollDisplay;