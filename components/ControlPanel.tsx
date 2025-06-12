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
      <div className={`bg-black/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6 text-center ${className}`}>
        <p className="text-gray-400 text-lg">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className={`bg-black/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6 space-y-4 ${className}`} 
         style={{ minWidth: '320px' }}>
      <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
        🎮 Your Turn
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      </h3>

      {/* Primary action buttons - larger and more prominent */}
      <div className="grid grid-cols-1 gap-3">
        {canFold && (
          <button
            onClick={() => handleAction('fold')}
            className="py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
                     bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
                     text-white border-2 border-red-500 shadow-lg
                     hover:scale-105 active:scale-95 hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">❌</span>
              <span>Fold</span>
            </div>
          </button>
        )}

        {canCheck && (
          <button
            onClick={() => handleAction('check')}
            className="py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
                     bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
                     text-white border-2 border-green-500 shadow-lg
                     hover:scale-105 active:scale-95 hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">✅</span>
              <span>Check</span>
            </div>
          </button>
        )}

        {canCall && (
          <button
            onClick={() => handleAction('call', callAmount)}
            className="py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
                     bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 
                     text-white border-2 border-blue-500 shadow-lg
                     hover:scale-105 active:scale-95 hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">📞</span>
              <span>Call ${callAmount}</span>
            </div>
          </button>
        )}

        {(canBet || canRaise) && (
          <div className="space-y-3">
            <button
              onClick={() => setIsCustomRaise(!isCustomRaise)}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
                       bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 
                       text-white border-2 border-orange-500 shadow-lg
                       hover:scale-105 active:scale-95 hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📈</span>
                <span>{canRaise ? 'Raise' : 'Bet'}</span>
              </div>
            </button>

            {isCustomRaise && (
              <div className="space-y-3 p-4 bg-black/20 rounded-lg border border-gray-600">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Math.max(minRaise, parseInt(e.target.value) || minRaise))}
                    min={minRaise}
                    max={playerStack}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-lg
                             focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleRaiseSubmit}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 
                             hover:from-orange-500 hover:to-orange-600 text-white rounded-lg
                             font-bold transition-all border-2 border-orange-500 text-lg
                             hover:scale-105 active:scale-95"
                  >
                    📈 Confirm
                  </button>
                </div>
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
              </div>
            )}
          </div>
        )}

        {canAllIn && (
          <button
            onClick={() => handleAction('all-in', playerStack)}
            className="py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
                     bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 
                     text-white border-2 border-purple-500 shadow-lg
                     hover:scale-105 active:scale-95 hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">🎯</span>
              <span>All-In (${playerStack})</span>
            </div>
          </button>
        )}
      </div>

      {/* Player info with better typography */}
      <div className="text-sm text-gray-300 text-center pt-3 border-t border-white/10 space-y-1">
        <div>Stack: <span className="text-green-400 font-bold">${playerStack.toLocaleString()}</span></div>
        <div>Current bet: <span className="text-yellow-400 font-bold">${currentBet.toLocaleString()}</span></div>
      </div>
    </div>
  );
}; 