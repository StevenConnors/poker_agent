import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../../engine/types';

interface CardProps {
  card: CardType | null;
  isHidden?: boolean;
  size?: 'small' | 'medium' | 'large';
  isDealing?: boolean;
  dealDelay?: number;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  card,
  isHidden = false,
  size = 'medium',
  isDealing = false,
  dealDelay = 0,
  className = '',
}) => {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'h': return '♥';
      case 'd': return '♦';
      case 'c': return '♣';
      case 's': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => (
    suit === 'h' || suit === 'd' ? 'text-red-500' : 'text-gray-900'
  );

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-10 h-14 text-xs';
      case 'large':
        return 'w-20 h-28 text-2xl';
      default:
        return 'w-16 h-22 text-lg';
    }
  };

  const cardVariants = {
    hidden: { 
      scale: 0.8, 
      rotateY: 180 
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      rotateY: 0,
      transition: {
        delay: dealDelay,
        duration: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      y: -8,
      rotateX: 5,
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const backPattern = (
    <svg className="w-full h-full" viewBox="0 0 60 84" fill="none">
      <defs>
        <pattern id="cardBack" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="2" fill="rgba(59, 130, 246, 0.3)" />
        </pattern>
      </defs>
      <rect width="60" height="84" fill="url(#cardBack)" />
      <rect x="4" y="4" width="52" height="76" rx="6" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="0.5" />
    </svg>
  );

  return (
    <motion.div
      className={`
        relative rounded-lg shadow-lg cursor-pointer select-none
        ${getSizeClasses()}
        ${className}
      `}
      variants={cardVariants}
      initial={isDealing ? "hidden" : "visible"}
      animate="visible"
      whileHover="hover"
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      <div
        className={`
          absolute inset-0 rounded-lg border-2 overflow-hidden
          ${isHidden || !card ? 'bg-blue-600 border-blue-500' : 'bg-white border-gray-300'}
          shadow-lg
        `}
        style={{
          backfaceVisibility: "hidden"
        }}
      >
        {isHidden || !card ? (
          <div className="w-full h-full flex items-center justify-center">
            {backPattern}
          </div>
        ) : (
          <div className="w-full h-full p-1 flex flex-col justify-between">
            {/* Top left */}
            <div className={`text-left ${getSuitColor(card.suit)} font-bold leading-none`}>
              <div>{card.rank}</div>
              <div className="text-sm leading-none">{getSuitSymbol(card.suit)}</div>
            </div>
            
            {/* Center suit */}
            <div className={`text-center ${getSuitColor(card.suit)} text-2xl leading-none`}>
              {getSuitSymbol(card.suit)}
            </div>
            
            {/* Bottom right (rotated) */}
            <div className={`text-right ${getSuitColor(card.suit)} font-bold leading-none transform rotate-180`}>
              <div>{card.rank}</div>
              <div className="text-sm leading-none">{getSuitSymbol(card.suit)}</div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Card; 