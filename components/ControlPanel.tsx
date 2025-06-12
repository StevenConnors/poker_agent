'use client';

import React, { useState, useMemo } from 'react';
import type { Action } from '../lib/usePokerStore';

interface ControlPanelProps {
  legalActions: Action[];
  currentBet: number;
  playerStack: number;
  onAction: (action: Omit<Action, 'playerId' | 'seatIndex' | 'timestamp'>) => void;
  className?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  legalActions,
  currentBet,
  playerStack,
  onAction,
  className = ''
}) => {
  const [raiseAmount, setRaiseAmount] = useState(currentBet * 2);
  const [isCustomRaise, setIsCustomRaise] = useState(false);

  const legalActionTypes = useMemo(() => 
    legalActions.map(action => action.type),
    [legalActions]
  );

  const canFold = legalActionTypes.includes('fold');
  const canCheck = legalActionTypes.includes('check');
  const canCall = legalActionTypes.includes('call');
  const canBet = legalActionTypes.includes('bet');
  const canRaise = legalActionTypes.includes('raise');
  const canAllIn = legalActionTypes.includes('all-in');

  const callAmount = useMemo(() => {
    const callAction = legalActions.find(a => a.type === 'call');
    return callAction?.amount || 0;
  }, [legalActions]);

  const minRaise = useMemo(() => {
    const raiseAction = legalActions.find(a => a.type === 'raise');
    return raiseAction?.amount || currentBet * 2;
  }, [legalActions, currentBet]);

  const handleAction = (type: Action['type'], amount?: number) => {
    onAction({
      type,
      amount,
    });
  };

  const handleRaiseSubmit = () => {
    if (raiseAmount < minRaise) {
      setRaiseAmount(minRaise);
      return;
    }
    if (raiseAmount >= playerStack) {
      handleAction('all-in', playerStack);
    } else {
      handleAction('raise', raiseAmount);
    }
    setIsCustomRaise(false);
  };

  const quickRaiseOptions = useMemo(() => {
    const pot = currentBet * 2; // Simplified pot calculation
    return [
      { label: '2x BB', amount: minRaise },
      { label: '1/2 Pot', amount: Math.max(minRaise, Math.floor(pot * 0.5)) },
      { label: 'Pot', amount: Math.max(minRaise, pot) },
      { label: '2x Pot', amount: Math.max(minRaise, pot * 2) },
    ].filter(option => option.amount <= playerStack);
  }, [minRaise, currentBet, playerStack]);

  if (legalActions.length === 0) {
    return (
      <div className={`bg-black/20 backdrop-blur-sm rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-400">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className={`bg-black/20 backdrop-blur-sm rounded-lg p-4 space-y-4 ${className}`}>
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        🎮 Your Turn
      </h3>

      {/* Primary action buttons */}
      <div className="flex gap-3 flex-wrap">
        {canFold && (
          <button
            onClick={() => handleAction('fold')}
            className="flex-1 min-w-24 py-3 px-4 rounded-lg font-semibold transition-all
                     bg-red-600/80 hover:bg-red-600 text-white border-2 border-red-500
                     hover:scale-105 active:scale-95"
          >
            ❌ Fold
          </button>
        )}

        {canCheck && (
          <button
            onClick={() => handleAction('check')}
            className="flex-1 min-w-24 py-3 px-4 rounded-lg font-semibold transition-all
                     bg-green-600/80 hover:bg-green-600 text-white border-2 border-green-500
                     hover:scale-105 active:scale-95"
          >
            ✅ Check
          </button>
        )}

        {canCall && (
          <button
            onClick={() => handleAction('call', callAmount)}
            className="flex-1 min-w-24 py-3 px-4 rounded-lg font-semibold transition-all
                     bg-blue-600/80 hover:bg-blue-600 text-white border-2 border-blue-500
                     hover:scale-105 active:scale-95"
          >
            📞 Call ${callAmount}
          </button>
        )}

        {canBet && (
          <button
            onClick={() => handleAction('bet', minRaise)}
            className="flex-1 min-w-24 py-3 px-4 rounded-lg font-semibold transition-all
                     bg-yellow-600/80 hover:bg-yellow-600 text-white border-2 border-yellow-500
                     hover:scale-105 active:scale-95"
          >
            💰 Bet ${minRaise}
          </button>
        )}
      </div>

      {/* Raise controls */}
      {(canRaise || canBet) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-white text-sm font-medium">
              {canRaise ? 'Raise to:' : 'Bet:'}
            </label>
            <button
              onClick={() => setIsCustomRaise(!isCustomRaise)}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              {isCustomRaise ? 'Quick amounts' : 'Custom amount'}
            </button>
          </div>

          {isCustomRaise ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Math.max(minRaise, parseInt(e.target.value) || minRaise))}
                min={minRaise}
                max={playerStack}
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRaiseSubmit}
                className="px-4 py-2 bg-orange-600/80 hover:bg-orange-600 text-white rounded-lg
                         font-semibold transition-all border-2 border-orange-500
                         hover:scale-105 active:scale-95"
              >
                📈 {canRaise ? 'Raise' : 'Bet'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {quickRaiseOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAction(canRaise ? 'raise' : 'bet', option.amount)}
                  className="py-2 px-3 bg-orange-600/80 hover:bg-orange-600 text-white rounded-lg
                           font-semibold transition-all border border-orange-500
                           hover:scale-105 active:scale-95 text-sm"
                >
                  {option.label}
                  <br />
                  <span className="text-xs opacity-80">${option.amount}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All-in button */}
      {canAllIn && (
        <button
          onClick={() => handleAction('all-in', playerStack)}
          className="w-full py-3 px-4 rounded-lg font-semibold transition-all
                   bg-red-700/80 hover:bg-red-700 text-white border-2 border-red-600
                   hover:scale-105 active:scale-95"
        >
          🎯 All-In (${playerStack})
        </button>
      )}

      {/* Player info */}
      <div className="text-xs text-gray-400 text-center pt-2 border-t border-white/10">
        Stack: ${playerStack.toLocaleString()} | Current bet: ${currentBet.toLocaleString()}
      </div>
    </div>
  );
}; 