'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ShowdownResult } from '../lib/usePokerStore';

interface RoundSummaryModalProps {
  isOpen: boolean;
  results: ShowdownResult[];
  onClose: () => void;
  onNewRound?: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  results,
  onClose,
  onNewRound
}) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatHandRank = (rank: string): string => {
    switch (rank) {
      case 'high-card':
        return 'High Card';
      case 'pair':
        return 'One Pair';
      case 'two-pair':
        return 'Two Pair';
      case 'three-of-a-kind':
        return 'Three of a Kind';
      case 'straight':
        return 'Straight';
      case 'flush':
        return 'Flush';
      case 'full-house':
        return 'Full House';
      case 'four-of-a-kind':
        return 'Four of a Kind';
      case 'straight-flush':
        return 'Straight Flush';
      default:
        return rank;
    }
  };

  const getHandEmoji = (rank: string): string => {
    switch (rank) {
      case 'high-card':
        return '🃏';
      case 'pair':
        return '👥';
      case 'two-pair':
        return '👥👥';
      case 'three-of-a-kind':
        return '🎯';
      case 'straight':
        return '📊';
      case 'flush':
        return '🌊';
      case 'full-house':
        return '🏠';
      case 'four-of-a-kind':
        return '💎';
      case 'straight-flush':
        return '⚡';
      default:
        return '🃏';
    }
  };

  const totalWinnings = results.reduce((sum, result) => sum + result.amountWon, 0);
  const winners = results.filter(result => result.amountWon > 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border-2 border-yellow-500/50 
                   shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="round-summary-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 
            id="round-summary-title" 
            className="text-2xl font-bold text-white flex items-center gap-3"
          >
            🏆 Round Summary
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Winners section */}
          {winners.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
                🎉 Winners
              </h3>
              <div className="space-y-3">
                {winners.map((result, index) => (
                  <div 
                    key={`${result.playerId}-${index}`}
                    className="bg-green-900/30 border border-green-500/50 rounded-lg p-4
                             flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {getHandEmoji(result.hand.rank)}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          Player {result.seatIndex + 1}
                        </div>
                        <div className="text-green-400 text-sm">
                          {formatHandRank(result.hand.rank)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          Cards: {result.hand.cards.map(card => 
                            `${card.rank}${card.suit}`
                          ).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        +${result.amountWon.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {result.potType} pot
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All players section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
              📊 All Players
            </h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={`${result.playerId}-all-${index}`}
                  className={`rounded-lg p-3 border flex items-center justify-between
                           ${result.amountWon > 0 
                             ? 'bg-green-900/20 border-green-500/30' 
                             : 'bg-gray-800/50 border-gray-600/30'
                           }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg">
                      {getHandEmoji(result.hand.rank)}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        Player {result.seatIndex + 1}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatHandRank(result.hand.rank)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      result.amountWon > 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {result.amountWon > 0 ? '+' : ''}${result.amountWon.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
            <h4 className="font-semibold text-white mb-3">Round Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Pot:</span>
                <span className="text-white font-medium ml-2">
                  ${totalWinnings.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Players:</span>
                <span className="text-white font-medium ml-2">
                  {results.length}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Winners:</span>
                <span className="text-white font-medium ml-2">
                  {winners.length}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Round Time:</span>
                <span className="text-white font-medium ml-2">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-500 text-white 
                     rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
          {onNewRound && (
            <button
              onClick={() => {
                onNewRound();
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 text-white 
                       rounded-lg font-semibold transition-colors"
            >
              🎮 New Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 