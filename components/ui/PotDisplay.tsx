import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PotManager } from '../../engine/types';
import Chip from './Chip';

interface PotDisplayProps {
  potManager: PotManager;
  isAnimating?: boolean;
  className?: string;
}

const PotDisplay: React.FC<PotDisplayProps> = ({
  potManager,
  isAnimating = false,
  className = '',
}) => {
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const getChipStacks = (amount: number) => {
    const stacks = [];
    let remaining = amount;
    
    const denominations = [1000, 500, 100, 25, 5, 1];
    
    denominations.forEach(denom => {
      if (remaining >= denom && stacks.length < 4) {
        const count = Math.floor(remaining / denom);
        if (count > 0) {
          stacks.push({ value: denom, count: Math.min(count, 6) }); // Cap display at 6 chips per denomination
          remaining -= count * denom;
        }
      }
    });
    
    return stacks;
  };

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const potVariants = {
    initial: { scale: 1, opacity: 1 },
    animate: {
      scale: [1, 1.15, 1],
      opacity: [1, 0.9, 1],
      transition: {
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  };

  const chipStackVariants = {
    initial: { y: 0 },
    animate: {
      y: [-6, 0],
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`} style={{ zIndex: 15 }}>
      {/* Main Pot */}
      <motion.div
        className="flex flex-col items-center mb-3"
        variants={!reduceMotion ? potVariants : {}}
        initial={!reduceMotion ? "initial" : undefined}
        animate={!reduceMotion && isAnimating ? "animate" : "initial"}
      >
        {/* Pot pill display */}
        <div 
          className="px-6 py-3 rounded-full font-bold shadow-lg border-2 text-center"
          style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
            borderColor: '#FFD700',
            color: '#8B4513',
            boxShadow: '0 8px 20px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            minWidth: '120px'
          }}
        >
          <div className="text-xs font-medium opacity-90">Main Pot</div>
          <div className="text-lg font-bold">{formatAmount(potManager.mainPot)}</div>
        </div>
        
        {/* Chip visualization for main pot */}
        {potManager.mainPot > 0 && (
          <motion.div
            className="flex items-end gap-1 mt-3"
            variants={!reduceMotion ? chipStackVariants : {}}
            initial={!reduceMotion ? "initial" : undefined}
            animate={!reduceMotion && isAnimating ? "animate" : "initial"}
            style={{ zIndex: 20 }}
          >
            {getChipStacks(potManager.mainPot).map((stack, index) => (
              <Chip
                key={`main-${stack.value}-${index}`}
                value={stack.value}
                count={stack.count}
                size="small"
                isAnimating={isAnimating}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Side Pots */}
      <AnimatePresence>
        {potManager.sidePots.length > 0 && (
          <motion.div
            className="flex flex-col items-center space-y-2"
                      initial={!reduceMotion ? { y: 20 } : undefined}
          animate={!reduceMotion ? { opacity: 1, y: 0 } : undefined}
          exit={!reduceMotion ? { y: -20 } : undefined}
            transition={!reduceMotion ? { duration: 0.3 } : undefined}
          >
            <div className="text-xs text-white font-medium px-2 py-1 rounded"
                 style={{ 
                   backdropFilter: 'blur(4px)' 
                 }}>
              Side Pots
            </div>
            {potManager.sidePots.map((sidePot, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center"
                initial={!reduceMotion ? { scale: 0.8 } : undefined}
                animate={!reduceMotion ? { opacity: 1, scale: 1 } : undefined}
                transition={!reduceMotion ? { delay: index * 0.1 } : undefined}
              >
                <div 
                  className="px-4 py-2 rounded-full font-bold shadow-lg border-2 text-center"
                  style={{
                    background: 'linear-gradient(135deg, #FF8C00 0%, #FF6347 50%, #DC143C 100%)',
                    borderColor: '#FF8C00',
                    color: 'white',
                    boxShadow: '0 6px 15px rgba(255, 140, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    minWidth: '100px'
                  }}
                >
                  <div className="text-xs font-medium opacity-90">Side {index + 1}</div>
                  <div className="text-sm font-bold">{formatAmount(sidePot.amount)}</div>
                </div>
                
                {/* Chip visualization for side pot */}
                {sidePot.amount > 0 && (
                  <div className="flex items-end gap-1 mt-2" style={{ zIndex: 20 }}>
                    {getChipStacks(sidePot.amount).slice(0, 3).map((stack, chipIndex) => (
                      <Chip
                        key={`side-${index}-${stack.value}-${chipIndex}`}
                        value={stack.value}
                        count={Math.min(stack.count, 4)} // Smaller stacks for side pots
                        size="small"
                        isAnimating={isAnimating}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Total pot summary */}
      <motion.div
        className="mt-4 text-center px-3 py-2 rounded-lg"
        style={{
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
                  initial={!reduceMotion ? {} : undefined}
        animate={!reduceMotion ? { opacity: 1 } : undefined}
        transition={!reduceMotion ? { delay: 0.5 } : undefined}
      >
        <div className="text-xs text-gray-300">Total Pot</div>
        <div className="text-lg font-bold text-white">{formatAmount(potManager.totalPot)}</div>
      </motion.div>
    </div>
  );
};

export default PotDisplay; 