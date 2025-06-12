import React, { useState, useEffect } from 'react';
import { Action, ActionType } from '../engine/types';

interface ActionPanelProps {
  legalActions: Action[];
  currentBet: number;
  playerStack: number;
  onAction: (action: Action) => void;
  disabled?: boolean;
}

export default function ActionPanel({ 
  legalActions, 
  currentBet, 
  playerStack, 
  onAction, 
  disabled = false 
}: ActionPanelProps) {
  const [betAmount, setBetAmount] = useState(currentBet || 1);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);

  // Update bet amount when current bet changes
  useEffect(() => {
    if (currentBet > 0) {
      setBetAmount(Math.max(currentBet * 2, currentBet + 1));
    }
  }, [currentBet]);

  const handleAction = (actionType: ActionType, amount?: number) => {
    const action: Action = {
      type: actionType,
      amount: amount || 0,
      playerId: '', // Will be set by the parent component
      seatIndex: -1, // Will be set by the parent component
      timestamp: Date.now()
    };
    onAction(action);
    setSelectedAction(null);
  };

  const getActionDisplay = (actionType: ActionType): string => {
    switch (actionType) {
      case 'fold': return 'Fold';
      case 'check': return 'Check';
      case 'call': return `Call $${currentBet}`;
      case 'bet': return 'Bet';
      case 'raise': return 'Raise';
      case 'all-in': return 'All-In';
      default: return actionType;
    }
  };

  const getActionColor = (actionType: ActionType): string => {
    switch (actionType) {
      case 'fold': return 'bg-red-600 hover:bg-red-700';
      case 'check': return 'bg-blue-600 hover:bg-blue-700';
      case 'call': return 'bg-green-600 hover:bg-green-700';
      case 'bet': 
      case 'raise': return 'bg-orange-600 hover:bg-orange-700';
      case 'all-in': return 'bg-purple-600 hover:bg-purple-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const minBet = Math.max(currentBet + 1, 1);
  const maxBet = playerStack;

  if (disabled || legalActions.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
        <div className="text-white/60">Waiting for other players...</div>
      </div>
    );
  }

  const needsBetAmount = selectedAction === 'bet' || selectedAction === 'raise';

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
      <div className="space-y-4">
        {/* Bet amount slider (when betting/raising) */}
        {needsBetAmount && (
          <div className="space-y-2">
            <label className="block text-white text-sm font-medium">
              Bet Amount: ${betAmount}
            </label>
            <input
              type="range"
              min={minBet}
              max={maxBet}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/60">
              <span>Min: ${minBet}</span>
              <span>Max: ${maxBet}</span>
            </div>
            
            {/* Quick bet buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setBetAmount(Math.floor(maxBet * 0.5))}
                className="px-2 py-1 bg-white/20 text-white text-xs rounded hover:bg-white/30"
              >
                1/2 Pot
              </button>
              <button
                onClick={() => setBetAmount(Math.floor(maxBet * 0.75))}
                className="px-2 py-1 bg-white/20 text-white text-xs rounded hover:bg-white/30"
              >
                3/4 Pot
              </button>
              <button
                onClick={() => setBetAmount(maxBet)}
                className="px-2 py-1 bg-white/20 text-white text-xs rounded hover:bg-white/30"
              >
                All-In
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {legalActions.map((action) => (
            <button
              key={action.type}
              onClick={() => {
                if (action.type === 'bet' || action.type === 'raise') {
                  if (selectedAction === action.type) {
                    // Execute the bet/raise with current amount
                    handleAction(action.type, betAmount);
                  } else {
                    // Select this action to show bet controls
                    setSelectedAction(action.type);
                  }
                } else {
                  // Execute other actions immediately
                  handleAction(action.type, action.amount);
                }
              }}
              className={`
                ${getActionColor(action.type)} 
                text-white font-semibold py-3 px-4 rounded-lg transition-colors
                ${selectedAction === action.type ? 'ring-2 ring-white' : ''}
              `}
            >
              {action.type === 'bet' || action.type === 'raise' ? 
                (selectedAction === action.type ? `${getActionDisplay(action.type)} $${betAmount}` : getActionDisplay(action.type)) :
                getActionDisplay(action.type)
              }
            </button>
          ))}
        </div>

        {/* Confirm button for bet/raise */}
        {needsBetAmount && (
          <button
            onClick={() => handleAction(selectedAction!, betAmount)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            Confirm {selectedAction === 'bet' ? 'Bet' : 'Raise'} ${betAmount}
          </button>
        )}

        {/* Cancel button */}
        {selectedAction && (
          <button
            onClick={() => setSelectedAction(null)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
} 