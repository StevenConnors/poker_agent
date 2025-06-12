import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, DollarSign } from 'lucide-react';
import { ShowdownResult } from '../../engine/types';
import Card from './Card';

interface RoundSummaryModalProps {
  isOpen: boolean;
  results: ShowdownResult[];
  onClose: () => void;
  className?: string;
}

const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  results,
  onClose,
  className = '',
}) => {
  const getHandRankDisplay = (rank: string) => {
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

  const getHandRankIcon = (rank: string) => {
    switch (rank) {
      case 'straight-flush':
      case 'four-of-a-kind':
      case 'full-house':
        return '🏆';
      case 'flush':
      case 'straight':
        return '⭐';
      case 'three-of-a-kind':
      case 'two-pair':
        return '🎯';
      default:
        return '🃏';
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const sortedResults = [...results].sort((a, b) => b.amountWon - a.amountWon);
  const totalWinnings = results.reduce((sum, result) => sum + result.amountWon, 0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const modalVariants = {
    hidden: {
      scale: 0.8,
      y: 50
    },
    visible: {
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: {
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const resultItemVariants = {
    hidden: { x: -20 },
    visible: { 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  const overlayVariants = {
    hidden: { backgroundColor: 'rgba(0, 0, 0, 0)' },
    visible: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    exit: { backgroundColor: 'rgba(0, 0, 0, 0)' }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with explicit color animation */}
        <motion.div
          className="absolute inset-0"
          variants={!reduceMotion ? overlayVariants : {}}
          initial={!reduceMotion ? "hidden" : { backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          animate={!reduceMotion ? "visible" : undefined}
          exit={!reduceMotion ? "exit" : undefined}
          onClick={onClose}
        />

        {/* Modal with consistent white background */}
        <motion.div
          className={`relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-300 ${className}`}
          variants={!reduceMotion ? modalVariants : {}}
          initial={!reduceMotion ? "hidden" : undefined}
          animate={!reduceMotion ? "visible" : undefined}
          exit={!reduceMotion ? "exit" : undefined}
        >
          {/* Header with enhanced contrast */}
          <div className="sticky top-0 p-6 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-xl border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy size={24} className="text-yellow-900" />
                <h2 className="text-2xl font-bold text-yellow-900">Hand Results</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-yellow-800 hover:text-yellow-900 rounded-lg transition-colors bg-yellow-200 hover:bg-yellow-300 border border-yellow-700"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Summary with better contrast */}
            <div className="mt-4 flex items-center justify-between text-yellow-900">
              <div className="text-sm font-medium">
                {results.length} player{results.length !== 1 ? 's' : ''} in showdown
              </div>
              <div className="flex items-center space-x-2 text-lg font-bold">
                <DollarSign size={18} />
                <span>{formatAmount(totalWinnings)} total</span>
              </div>
            </div>
          </div>

          {/* Results with light background for readability */}
          <div className="p-6 space-y-4 bg-white">
            {sortedResults.map((result, index) => (
              <motion.div
                key={`${result.playerId}-${index}`}
                className={`relative p-4 rounded-lg border-2 ${
                  index === 0 
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400 shadow-lg' 
                    : 'bg-slate-100 border-gray-300 shadow-md'
                }`}
                variants={!reduceMotion ? resultItemVariants : {}}
              >
                {/* Winner crown - always visible */}
                {index === 0 && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 rounded-full p-2 shadow-lg border border-yellow-600">
                    <Trophy size={16} />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-400 shadow-md">
                      <span className="text-white font-bold text-sm">
                        {result.seatIndex + 1}
                      </span>
                    </div>
                    <div>
                      <div className="text-gray-900 font-medium">
                        Player {result.seatIndex + 1}
                      </div>
                      <div className="text-gray-600 text-sm">
                        Seat {result.seatIndex + 1}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div 
                      className={`text-lg font-bold ${
                        result.amountWon > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}
                    >
                      {result.amountWon > 0 ? '+' : ''}{formatAmount(result.amountWon)}
                    </div>
                    <div className="text-gray-600 text-sm font-medium">
                      {result.amountWon > 0 ? 'Won' : 'Lost'}
                    </div>
                  </div>
                </div>

                {/* Hand information with improved contrast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hand rank */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getHandRankIcon(result.hand.rank)}</span>
                      <span className="text-gray-900 font-medium">
                        {getHandRankDisplay(result.hand.rank)}
                      </span>
                    </div>
                    
                    {/* Best hand cards - always visible */}
                    {result.hand.cards && (
                      <div className="flex gap-2">
                        {result.hand.cards.slice(0, 5).map((card, cardIndex) => (
                          <Card
                            key={cardIndex}
                            card={card}
                            size="small"
                            className=""
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Player info with enhanced readability */}
                  <div className="space-y-2">
                    <div className="text-gray-700 text-sm font-medium">Hand Value</div>
                    <div className="text-gray-900 text-sm font-mono bg-gray-200 px-3 py-2 rounded border">
                      {result.hand.value}
                    </div>
                    {result.hand.kickers.length > 0 && (
                      <div className="text-gray-600 text-xs font-medium">
                        Kickers: {result.hand.kickers.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden accessibility text for screen readers */}
                <span className="sr-only">
                  Player {result.seatIndex + 1} has {getHandRankDisplay(result.hand.rank)} 
                  {result.amountWon > 0 ? ` and won ${formatAmount(result.amountWon)}` : ' and lost'}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Footer with consistent light background */}
          <div className="p-4 border-t border-gray-300 text-center bg-white rounded-b-xl">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-medium transition-all border border-gray-500 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Continue Playing
            </button>
          </div>

          {/* Hidden aria-live region for accessibility */}
          <div aria-live="polite" className="sr-only">
            {isOpen && `Hand results: ${results.length} players, total winnings ${formatAmount(totalWinnings)}`}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoundSummaryModal; 