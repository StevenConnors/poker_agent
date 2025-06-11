import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { Action, ActionType } from '../../engine/types';

interface ControlPanelProps {
  legalActions: Action[];
  currentBet: number;
  playerStack: number;
  onAction: (action: Action) => void;
  disabled?: boolean;
  className?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  legalActions,
  currentBet,
  playerStack,
  onAction,
  disabled = false,
  className = '',
}) => {
  const [betAmount, setBetAmount] = useState(currentBet);

  // Update bet amount when current bet changes
  useEffect(() => {
    setBetAmount(Math.max(currentBet, currentBet * 2));
  }, [currentBet]);

  const hasAction = (actionType: ActionType) => (
    legalActions.some(action => action.type === actionType)
  );

  const getActionLabel = (actionType: ActionType) => {
    switch (actionType) {
      case 'fold':
        return 'Fold';
      case 'check':
        return 'Check';
      case 'call':
        return `Call $${currentBet}`;
      case 'bet':
        return `Bet $${betAmount}`;
      case 'raise':
        return `Raise to $${betAmount}`;
      case 'all-in':
        return `All-In $${playerStack}`;
      default:
        return actionType;
    }
  };

  const getActionColor = (actionType: ActionType) => {
    switch (actionType) {
      case 'fold':
        return {
          bg: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          border: '#F87171',
          shadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
          hover: 'brightness(1.1)'
        };
      case 'check':
        return {
          bg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          border: '#60A5FA',
          shadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
          hover: 'brightness(1.1)'
        };
      case 'call':
        return {
          bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          border: '#34D399',
          shadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
          hover: 'brightness(1.1)'
        };
      case 'bet':
      case 'raise':
        return {
          bg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
          border: '#FBBF24',
          shadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
          hover: 'brightness(1.1)'
        };
      case 'all-in':
        return {
          bg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
          border: '#A855F7',
          shadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
          hover: 'brightness(1.1)'
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
          border: '#6B7280',
          shadow: '0 4px 12px rgba(55, 65, 81, 0.4)',
          hover: 'brightness(1.1)'
        };
    }
  };

  const handleAction = (actionType: ActionType) => {
    const action: Action = {
      type: actionType,
      playerId: '', // Will be filled by parent
      seatIndex: -1, // Will be filled by parent
      timestamp: Date.now(),
    };

    if (actionType === 'bet' || actionType === 'raise') {
      action.amount = betAmount;
    } else if (actionType === 'call') {
      action.amount = currentBet;
    } else if (actionType === 'all-in') {
      action.amount = playerStack;
    }

    onAction(action);
  };

  const quickBetAmounts = [
    currentBet * 2,
    currentBet * 3,
    Math.floor(playerStack * 0.5),
    playerStack
  ].filter(amount => amount <= playerStack && amount > currentBet);

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const containerVariants = {
    hidden: { y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const buttonVariants = {
    hidden: { scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.95 }
  };

  if (disabled || legalActions.length === 0) {
    return (
      <div className={`text-center ${className}`}>
        <div 
          className="rounded-lg p-6 border-2"
          style={{
            backdropFilter: 'blur(8px)',
            borderColor: '#374151',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="text-gray-400 font-medium">Waiting for other players...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`rounded-lg p-6 border-2 ${className}`}
      style={{
        backdropFilter: 'blur(8px)',
        borderColor: '#222',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5)'
      }}
      variants={!reduceMotion ? containerVariants : {}}
      initial={!reduceMotion ? "hidden" : undefined}
      animate={!reduceMotion ? "visible" : undefined}
    >
      {/* Bet sizing controls */}
      {(hasAction('bet') || hasAction('raise')) && (
        <motion.div
          className="mb-6"
          variants={!reduceMotion ? buttonVariants : {}}
        >
          <div className="text-white text-sm font-medium mb-3">
            {hasAction('raise') ? 'Raise Amount' : 'Bet Amount'}
          </div>
          
          {/* Slider */}
          <div className="mb-4">
            <input
              type="range"
              min={currentBet || 1}
              max={playerStack}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${((betAmount - currentBet) / (playerStack - currentBet)) * 100}%, #374151 ${((betAmount - currentBet) / (playerStack - currentBet)) * 100}%, #374151 100%)`,
                outline: 'none'
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>${currentBet || 1}</span>
              <span>${playerStack}</span>
            </div>
          </div>

          {/* Bet amount input and controls */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setBetAmount(Math.max(currentBet || 1, betAmount - 10))}
              className="text-white p-2 rounded border-2 transition-all"
              style={{
                background: 'rgba(55, 65, 81, 0.8)',
                borderColor: '#6B7280'
              }}
              disabled={betAmount <= (currentBet || 1)}
            >
              <Minus size={16} />
            </button>
            
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(currentBet || 1, Math.min(playerStack, parseInt(e.target.value) || 0)))}
              className="flex-1 border-2 text-white px-3 py-2 rounded text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
              style={{
                borderColor: '#374151'
              }}
              min={currentBet || 1}
              max={playerStack}
            />
            
            <button
              onClick={() => setBetAmount(Math.min(playerStack, betAmount + 10))}
              className="text-white p-2 rounded border-2 transition-all"
              style={{
                background: 'rgba(55, 65, 81, 0.8)',
                borderColor: '#6B7280'
              }}
              disabled={betAmount >= playerStack}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick bet buttons */}
          <div className="flex gap-2 mb-4">
            {quickBetAmounts.slice(0, 4).map((amount, index) => (
              <button
                key={index}
                onClick={() => setBetAmount(amount)}
                className="flex-1 text-white py-2 px-3 rounded text-sm border-2 transition-all hover:brightness-110"
                style={{
                  background: 'rgba(55, 65, 81, 0.8)',
                  borderColor: '#6B7280'
                }}
              >
                {amount === playerStack ? 'All-In' : `$${amount}`}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {['fold', 'check', 'call', 'bet', 'raise', 'all-in'].map((actionType) => {
          if (!hasAction(actionType as ActionType)) return null;

          const colorConfig = getActionColor(actionType as ActionType);

          return (
            <motion.button
              key={actionType}
              onClick={() => handleAction(actionType as ActionType)}
              className="px-4 py-3 rounded-lg font-bold text-white border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: colorConfig.bg,
                borderColor: colorConfig.border,
                boxShadow: colorConfig.shadow,
              }}
              variants={!reduceMotion ? buttonVariants : {}}
              whileTap={!reduceMotion ? "tap" : undefined}
              disabled={disabled}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.filter = colorConfig.hover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
              }}
            >
              {getActionLabel(actionType as ActionType)}
            </motion.button>
          );
        })}
      </div>

      {/* Stack info */}
      <motion.div
        className="mt-4 text-center text-sm text-gray-300"
        variants={!reduceMotion ? buttonVariants : {}}
      >
        Your Stack: <span className="text-green-400 font-bold">${playerStack}</span>
        {currentBet > 0 && (
          <>
            {' • '}
            To Call: <span className="text-orange-400 font-bold">${currentBet}</span>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ControlPanel; 