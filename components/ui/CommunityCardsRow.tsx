import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Stage } from '../../engine/types';
import Card from './Card';

interface CommunityCardsRowProps {
  cards: CardType[];
  stage: Stage;
  className?: string;
}

const CommunityCardsRow: React.FC<CommunityCardsRowProps> = ({
  cards,
  stage,
  className = '',
}) => {
  const getVisibleCardCount = () => {
    switch (stage) {
      case 'flop':
        return 3;
      case 'turn':
        return 4;
      case 'river':
      case 'showdown':
      case 'finished':
        return 5;
      default:
        return 0;
    }
  };

  const visibleCount = getVisibleCardCount();
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const containerVariants = {
    hidden: {},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  };

  const cardSlots = Array.from({ length: 5 }, (_, index) => {
    const card = cards[index] || null;
    const isVisible = index < visibleCount;
    const shouldShowCard = isVisible && card;
    const dealDelay = index * 0.2;

    return (
      <div key={index} className="relative">
        <Card
          card={shouldShowCard ? card : null}
          isHidden={!shouldShowCard}
          size="medium"
          isDealing={isVisible && stage !== 'init' && stage !== 'preflop'}
          dealDelay={dealDelay}
          className="mx-1"
        />
      </div>
    );
  });

  const getStageLabel = (currentStage: Stage) => {
    switch (currentStage) {
      case 'preflop':
        return 'Pre-Flop';
      case 'flop':
        return 'Flop';
      case 'turn':
        return 'Turn';
      case 'river':
        return 'River';
      case 'showdown':
        return 'Showdown';
      case 'finished':
        return 'Hand Complete';
      default:
        return '';
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`} style={{ zIndex: 10 }}>
      {/* Stage label */}
      <motion.div
        className="mb-3"
                  initial={!reduceMotion ? { y: -10 } : undefined}
        animate={!reduceMotion ? { opacity: 1, y: 0 } : undefined}
        transition={!reduceMotion ? { duration: 0.5 } : undefined}
      >
        <h3 className="text-white text-sm font-medium text-center px-3 py-1 rounded-full"
            style={{ 
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
          {getStageLabel(stage) || 'Community Cards'}
        </h3>
      </motion.div>
      
      {/* Cards container */}
      <motion.div
        className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4)'
        }}
        variants={!reduceMotion ? containerVariants : {}}
        initial={!reduceMotion ? "hidden" : undefined}
        animate={!reduceMotion ? "visible" : undefined}
      >
        {cardSlots}
      </motion.div>

      {/* Stage progression indicator */}
      {stage !== 'init' && stage !== 'finished' && (
        <motion.div
          className="mt-3 flex items-center space-x-2"
          initial={!reduceMotion ? {} : undefined}
          animate={!reduceMotion ? { opacity: 1 } : undefined}
          transition={!reduceMotion ? { delay: 0.5 } : undefined}
        >
          {['preflop', 'flop', 'turn', 'river'].map((stageLabel, index) => {
            const isActive = ['preflop', 'flop', 'turn', 'river'].indexOf(stage) >= index;
            const isCurrent = stage === stageLabel;
            
            return (
              <div
                key={stageLabel}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-yellow-400 shadow-lg' 
                    : isActive 
                    ? 'bg-green-400' 
                    : 'bg-gray-600'
                }`}
                style={{
                  boxShadow: isCurrent ? '0 0 8px rgba(255, 215, 64, 0.8)' : undefined
                }}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default CommunityCardsRow; 