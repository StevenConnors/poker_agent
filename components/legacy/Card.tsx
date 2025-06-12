import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../engine/types';

interface CardProps {
  card: CardType | null;
  isHidden?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  isDealing?: boolean;
  dealDelay?: number;
}

const SUIT_SYMBOLS = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠'
};

const RANK_DISPLAY = {
  'T': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9'
};

export default function Card({ 
  card, 
  isHidden = false, 
  size = 'medium', 
  className = '',
  isDealing = false,
  dealDelay = 0
}: CardProps) {
  const sizeClasses = {
    small: 'w-8 h-12',
    medium: 'w-12 h-16',
    large: 'w-16 h-24'
  };

  const fontSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-lg'
  };

  const dealVariants = {
    initial: { 
   
      x: -100, 
      y: -50, 
      scale: 0.8,
      rotateY: 180 
    },
    animate: { 
      opacity: 1, 
      x: 0, 
      y: 0, 
      scale: 1,
      rotateY: 0,
      transition: { 
        duration: 0.6, 
        delay: dealDelay,
        ease: "easeOut" 
      }
    }
  };

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isHidden || !card) {
    // Card back with red pattern design
    return (
      <motion.div
        className={`${sizeClasses[size]} ${className} relative transform-gpu`}
        variants={!reduceMotion && isDealing ? dealVariants : {}}
        initial={!reduceMotion && isDealing ? "initial" : undefined}
        animate={!reduceMotion && isDealing ? "animate" : undefined}
        aria-role="img"
        aria-label="Hidden card"
      >
        <svg
          className="w-full h-full drop-shadow-lg"
          viewBox="0 0 60 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Card background */}
          <rect
            width="60"
            height="80"
            rx="6"
            fill="#8B0000"
            stroke="#4B0000"
            strokeWidth="2"
          />
          
          {/* Pattern overlay */}
          <defs>
            <pattern id="cardPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="3" fill="#DC2626" opacity="0.6"/>
              <circle cx="5" cy="5" r="2" fill="#EF4444" opacity="0.4"/>
              <circle cx="15" cy="15" r="2" fill="#EF4444" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="60" height="80" fill="url(#cardPattern)" opacity="0.7"/>
          
          {/* Corner decorations */}
          <circle cx="10" cy="10" r="4" fill="#DC2626" opacity="0.8"/>
          <circle cx="50" cy="70" r="4" fill="#DC2626" opacity="0.8"/>
          
          {/* Center design */}
          <rect x="25" y="35" width="10" height="10" rx="2" fill="#DC2626" opacity="0.9"/>
        </svg>
      </motion.div>
    );
  }

  const isRed = card.suit === 'd' || card.suit === 'h';
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const rankDisplay = RANK_DISPLAY[card.rank];

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className} relative transform-gpu`}
      variants={!reduceMotion && isDealing ? dealVariants : {}}
      initial={!reduceMotion && isDealing ? "initial" : undefined}
      animate={!reduceMotion && isDealing ? "animate" : undefined}
      aria-role="img"
      aria-label={`${rankDisplay} of ${suitSymbol}`}
    >
      <svg
        className="w-full h-full drop-shadow-lg"
        viewBox="0 0 60 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Card background */}
        <rect
          width="60"
          height="80"
          rx="6"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        
        {/* Top left corner */}
        <g className={isRed ? 'fill-red-600' : 'fill-black'}>
          <text x="8" y="12" className={`${fontSize[size]} font-bold`} fontSize="8" textAnchor="middle">
            {rankDisplay}
          </text>
          <text x="8" y="22" className={fontSize[size]} fontSize="8" textAnchor="middle">
            {suitSymbol}
          </text>
        </g>
        
        {/* Center suit symbol */}
        <text 
          x="30" 
          y="45" 
          className={isRed ? 'fill-red-600' : 'fill-black'} 
          fontSize={size === 'small' ? '16' : size === 'medium' ? '20' : '24'} 
          textAnchor="middle"
        >
          {suitSymbol}
        </text>
        
        {/* Bottom right corner (rotated) */}
        <g transform="rotate(180 52 68)" className={isRed ? 'fill-red-600' : 'fill-black'}>
          <text x="52" y="75" className={`${fontSize[size]} font-bold`} fontSize="8" textAnchor="middle">
            {rankDisplay}
          </text>
          <text x="52" y="65" className={fontSize[size]} fontSize="8" textAnchor="middle">
            {suitSymbol}
          </text>
        </g>
      </svg>
    </motion.div>
  );
} 