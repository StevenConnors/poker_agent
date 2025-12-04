import React from 'react';
import { motion } from 'framer-motion';
import { User, Crown } from 'lucide-react';
import { Player } from '../../engine/types';
import Card from './Card';
import Chip from './Chip';

interface PlayerSeatProps {
  player: Player | null;
  isCurrentPlayer?: boolean;
  isDealer?: boolean;
  currentBet?: number;
  seatIndex: number;
  showCards?: boolean;
  className?: string;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentPlayer = false,
  isDealer = false,
  currentBet = 0,
  seatIndex,
  showCards = false,
  className = '',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-green-400';
      case 'folded':
        return 'border-gray-600';
      case 'all-in':
        return 'border-yellow-400';
      case 'out':
        return 'border-red-400';
      default:
        return 'border-gray-600';
    }
  };

  const seatVariants = {
    initial: { scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    current: {
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    inactive: {
      opacity: 0.6,
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  const cardContainerVariants = {
    initial: { y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const formatStack = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;



  if (!player) {
    return (
      <motion.div
        className={`
          relative w-28 h-36 rounded-lg border-2 border-dashed border-gray-600/50 
          bg-gray-900/30 flex flex-col items-center justify-center ${className}
        `}
        variants={!reduceMotion ? seatVariants : {}}
        initial={!reduceMotion ? "initial" : undefined}
        animate={!reduceMotion ? "visible" : undefined}
        style={{ 
          backdropFilter: 'blur(4px)',
          zIndex: 10
        }}
      >
        <div className="text-gray-500 text-xs text-center">
          <div className="w-10 h-10 border-2 border-dashed border-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center">
            <User size={16} className="text-gray-500" />
          </div>
          <div className="text-gray-400">Seat {seatIndex + 1}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative ${className}`}
      variants={!reduceMotion ? seatVariants : {}}
      initial={!reduceMotion ? "initial" : undefined}
      animate={
        !reduceMotion ? (
          isCurrentPlayer ? "current" : 
          player.status === 'folded' || player.status === 'out' ? "inactive" : 
          "visible"
        ) : undefined
      }
      style={{ zIndex: 15 }}
    >
      {/* Glow effect for active player */}
      {isCurrentPlayer && (
        <div 
          className="absolute inset-0 rounded-lg opacity-75"
          style={{
            background: 'radial-gradient(circle, rgba(255, 215, 64, 0.3) 0%, transparent 70%)',
            filter: 'blur(8px)',
            zIndex: 30
          }}
        />
      )}

      {/* Player info card */}
      <div
        className={`
          relative w-28 rounded-lg border-2 p-3 
          ${getStatusColor(player.status)}
          ${isCurrentPlayer ? 'shadow-lg' : ''}
        `}
        style={{
          backdropFilter: 'blur(4px)',
          boxShadow: isCurrentPlayer 
            ? '0 0 20px rgba(255, 215, 64, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Dealer button */}
        {isDealer && (
          <motion.div
            className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 rounded-full p-1 shadow-lg"
            style={{ 
              width: '18px', 
              height: '18px',
              zIndex: 25
            }}
            initial={!reduceMotion ? { rotate: 0 } : undefined}
            animate={!reduceMotion ? { rotate: 360 } : undefined}
            transition={!reduceMotion ? { duration: 2, ease: "easeInOut" } : undefined}
          >
            <Crown size={10} />
          </motion.div>
        )}

        {/* Player avatar */}
        <div className="flex flex-col items-center space-y-2">
          <div 
            className="rounded-full flex items-center justify-center border-2 border-gray-600"
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            }}
          >
            <User size={20} className="text-white" />
          </div>
          
          {/* Player name */}
          <div className="text-white text-xs font-medium text-center leading-tight">
            {player.name.length > 12 ? `${player.name.slice(0, 12)}...` : player.name}
          </div>
          
          {/* Stack amount */}
          <div className="text-center">
            <div className="text-green-300 text-xs font-bold">
              {formatStack(player.stack)}
            </div>
            <div className="text-gray-400 text-xs">
              {player.status}
            </div>
          </div>
        </div>

        {/* Current bet chips */}
        {currentBet > 0 && (
          <motion.div
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2"
            style={{ zIndex: 20 }}
          >
            <div className="flex flex-col items-center space-y-1">
              <Chip value={currentBet} size="small" />
              <div className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">
                ${currentBet}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Hole cards */}
      <motion.div
        className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
        style={{ zIndex: 10 }}
      >
        <div className="flex gap-1">
          {player.hole && player.hole.length > 0 ? (
            player.hole.map((card, index) => (
              <Card
                key={index}
                card={showCards ? card : null}
                isHidden={!showCards}
                size="small"
                isDealing={true}
                dealDelay={index * 0.1}
              />
            ))
          ) : (
            // Show placeholder cards if no hole cards
            Array.from({ length: 2 }).map((_, index) => (
              <Card
                key={index}
                card={null}
                isHidden={true}
                size="small"
              />
            ))
          )}
        </div>
      </motion.div>

      {/* Connection status indicator */}
      {!player.isConnected && (
        <motion.div
          className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
          style={{ zIndex: 25 }}
        />
      )}
    </motion.div>
  );
};

export default PlayerSeat; 