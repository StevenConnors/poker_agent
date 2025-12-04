import React from 'react';
import { motion } from 'framer-motion';

interface ChipProps {
  value: number;
  count?: number;
  size?: 'small' | 'medium' | 'large';
  isAnimating?: boolean;
  onClick?: () => void;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({
  value,
  count = 1,
  size = 'medium',
  isAnimating = false,
  onClick,
  className = '',
}) => {
  const getChipColor = (chipValue: number) => {
    if (chipValue >= 1000) return {
      bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
      border: '#A855F7',
      shadow: '0 0 15px rgba(139, 92, 246, 0.5)'
    };
    if (chipValue >= 500) return {
      bg: 'linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)',
      border: '#F472B6',
      shadow: '0 0 15px rgba(236, 72, 153, 0.5)'
    };
    if (chipValue >= 100) return {
      bg: 'linear-gradient(135deg, #374151 0%, #1F2937 50%, #111827 100%)',
      border: '#6B7280',
      shadow: '0 0 15px rgba(55, 65, 81, 0.5)'
    };
    if (chipValue >= 25) return {
      bg: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
      border: '#34D399',
      shadow: '0 0 15px rgba(16, 185, 129, 0.5)'
    };
    if (chipValue >= 5) return {
      bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
      border: '#F87171',
      shadow: '0 0 15px rgba(239, 68, 68, 0.5)'
    };
    return {
      bg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
      border: '#60A5FA',
      shadow: '0 0 15px rgba(59, 130, 246, 0.5)'
    };
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return { width: '24px', height: '24px', fontSize: '8px' };
      case 'large':
        return { width: '48px', height: '48px', fontSize: '14px' };
      default:
        return { width: '32px', height: '32px', fontSize: '10px' };
    }
  };

  const chipVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.1,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    },
    animate: {
      y: [0, -8, 0],
      rotate: [0, 3, -3, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  };

  const formatValue = (chipValue: number) => {
    if (chipValue >= 1000) return `${chipValue / 1000}K`;
    return chipValue.toString();
  };

  const chipColor = getChipColor(value);
  const sizeConfig = getSizeClasses();
  const stackHeight = Math.min(count, 8); // Cap visual stack at 8 chips
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className={`relative ${className}`} style={{ zIndex: 20 }}>
      {/* Render stacked chips */}
      {Array.from({ length: stackHeight }, (_, index) => {
        const isTopChip = index === stackHeight - 1;
        const offsetY = index * -2; // Stack offset
        
        return (
          <motion.div
            key={index}
            className="absolute rounded-full border-2 cursor-pointer flex items-center justify-center font-bold text-white"
            style={{
              width: sizeConfig.width,
              height: sizeConfig.height,
              background: chipColor.bg,
              borderColor: chipColor.border,
              boxShadow: isTopChip ? chipColor.shadow : '0 2px 4px rgba(0,0,0,0.3)',
              top: `${offsetY}px`,
              fontSize: sizeConfig.fontSize,
              transform: onClick ? 'translateZ(0)' : undefined,
            }}
            variants={!reduceMotion ? chipVariants : {}}
            initial="initial"
            whileHover={onClick && !reduceMotion ? "hover" : undefined}
            whileTap={onClick && !reduceMotion ? "tap" : undefined}
            animate={isAnimating && !reduceMotion ? "animate" : "initial"}
            onClick={onClick}
          >
            {/* Chip pattern - inner circles for texture */}
            <div 
              className="absolute inset-1 rounded-full border border-white/30"
              style={{ opacity: 0.6 }}
            />
            <div 
              className="absolute inset-0.5 rounded-full border border-white/20"
              style={{ opacity: 0.4 }}
            />
            
            {/* Value display - only on top chip */}
            {isTopChip && (
              <div className="relative z-10 font-bold drop-shadow-sm">
                {formatValue(value)}
              </div>
            )}
          </motion.div>
        );
      })}
      
      {/* Stack count indicator for large stacks */}
      {count > 8 && (
        <div 
          className="absolute bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full flex items-center justify-center"
          style={{ 
            width: '18px', 
            height: '18px',
            top: '-6px',
            right: '-6px',
            zIndex: 30,
            fontSize: '8px'
          }}
        >
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  );
};

export default Chip; 