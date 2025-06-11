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
      opacity: 1,
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
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  const overlayVariants = {
    hidden: {},
    visible: { opacity: 1 },
    exit: {}
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(8px)'
          }}
          variants={!reduceMotion ? overlayVariants : {}}
          initial={!reduceMotion ? "hidden" : undefined}
          animate={!reduceMotion ? "visible" : undefined}
          exit={!reduceMotion ? "exit" : undefined}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className={`relative rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${className}`}
          style={{
            backdropFilter: 'blur(16px)',
            border: '2px solid #374151',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          variants={!reduceMotion ? modalVariants : {}}
          initial={!reduceMotion ? "hidden" : undefined}
          animate={!reduceMotion ? "visible" : undefined}
          exit={!reduceMotion ? "exit" : undefined}
        >
          {/* Header */}
          <div 
            className="sticky top-0 p-6 rounded-t-xl border-b"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              borderColor: '#374151'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy size={24} className="text-yellow-900" />
                <h2 className="text-2xl font-bold text-yellow-900">Hand Results</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-yellow-800 hover:text-yellow-900 rounded-lg transition-colors"
                style={{
                  background: 'rgba(139, 69, 19, 0.2)',
                  border: '1px solid rgba(139, 69, 19, 0.3)'
                }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Summary */}
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

          {/* Results */}
          <div className="p-6 space-y-4">
            {sortedResults.map((result, index) => (
              <motion.div
                key={`${result.playerId}-${index}`}
                className="relative p-4 rounded-lg border-2"
                style={{
                  background: index === 0 
                    ? 'linear-gradient(135deg, rgba(255, 215, 64, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%)'
                    : 'rgba(55, 65, 81, 0.4)',
                  borderColor: index === 0 ? '#FFD700' : '#6B7280',
                  backdropFilter: 'blur(8px)',
                  boxShadow: index === 0 
                    ? '0 8px 25px rgba(255, 215, 64, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
                variants={!reduceMotion ? resultItemVariants : {}}
              >
                {/* Winner crown */}
                {index === 0 && (
                  <div 
                    className="absolute -top-3 -right-3 rounded-full p-2 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      color: '#8B4513'
                    }}
                  >
                    <Trophy size={16} />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                      style={{
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        borderColor: '#60A5FA'
                      }}
                    >
                      <span className="text-white font-bold text-sm">
                        {result.seatIndex + 1}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        Player {result.seatIndex + 1}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Seat {result.seatIndex + 1}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div 
                      className={`text-lg font-bold ${
                        result.amountWon > 0 ? 'text-green-400' : 'text-gray-400'
                      }`}
                    >
                      {result.amountWon > 0 ? '+' : ''}{formatAmount(result.amountWon)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {result.amountWon > 0 ? 'Won' : 'Lost'}
                    </div>
                  </div>
                </div>

                {/* Hand information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {/* Hand rank */}
                   <div className="space-y-2">
                     <div className="flex items-center space-x-2">
                       <span className="text-lg">{getHandRankIcon(result.hand.rank)}</span>
                       <span className="text-white font-medium">
                         {getHandRankDisplay(result.hand.rank)}
                       </span>
                     </div>
                     
                     {/* Best hand cards */}
                     {result.hand.cards && (
                       <div className="flex gap-1">
                         {result.hand.cards.slice(0, 5).map((card, cardIndex) => (
                           <Card
                             key={cardIndex}
                             card={card}
                             size="small"
                             className="opacity-90"
                           />
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Player info */}
                   <div className="space-y-2">
                     <div className="text-gray-400 text-sm">Hand Value</div>
                     <div className="text-white text-sm font-mono">
                       {result.hand.value}
                     </div>
                     {result.hand.kickers.length > 0 && (
                       <div className="text-gray-500 text-xs">
                         Kickers: {result.hand.kickers.join(', ')}
                       </div>
                     )}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div 
            className="p-4 border-t text-center"
            style={{ borderColor: '#374151' }}
          >
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-medium transition-all border-2"
              style={{
                background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                borderColor: '#6B7280',
                color: 'white',
                boxShadow: '0 4px 12px rgba(55, 65, 81, 0.4)'
              }}
            >
              Continue Playing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoundSummaryModal; 