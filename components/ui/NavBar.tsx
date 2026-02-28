import React from 'react';
import { motion } from 'framer-motion';
import { Settings, LogOut, DollarSign, Users } from 'lucide-react';

interface NavBarProps {
  tableName: string;
  playerBalance: number;
  playerCount: number;
  maxPlayers: number;
  onSettings?: () => void;
  onLeaveGame?: () => void;
  className?: string;
}

const NavBar: React.FC<NavBarProps> = ({
  tableName,
  playerBalance,
  playerCount,
  maxPlayers,
  onSettings,
  onLeaveGame,
  className = '',
}) => {
  const formatBalance = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const navVariants = {
    hidden: { y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <motion.nav
      className={`border-b shadow-lg ${className}`}
      style={{
        backdropFilter: 'blur(12px)',
        borderColor: '#222'
      }}
      variants={!reduceMotion ? navVariants : {}}
      initial={!reduceMotion ? "hidden" : undefined}
      animate={!reduceMotion ? "visible" : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Table info */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">
                {tableName}
              </h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-300">
              {/* Player count */}
              <div className="flex items-center space-x-1">
                <Users size={16} className="text-blue-400" />
                <span>{playerCount}/{maxPlayers} players</span>
              </div>
            </div>
          </div>

          {/* Right side - Balance and actions */}
          <div className="flex items-center space-x-4">
            {/* Player balance */}
            <motion.div
              className="flex items-center space-x-2 rounded-lg px-3 py-2 border-2"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderColor: '#34D399',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}
              whileHover={!reduceMotion ? { scale: 1.02 } : undefined}
              transition={!reduceMotion ? { duration: 0.2 } : undefined}
            >
              <DollarSign size={16} className="text-green-100" />
              <span className="text-white font-bold">
                {formatBalance(playerBalance)}
              </span>
            </motion.div>

            {/* Settings button */}
            {onSettings && (
              <motion.button
                onClick={onSettings}
                className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
                style={{
                  background: 'rgba(55, 65, 81, 0.6)',
                  border: '1px solid #374151'
                }}
                variants={!reduceMotion ? buttonVariants : {}}
                whileHover={!reduceMotion ? "hover" : undefined}
                whileTap={!reduceMotion ? "tap" : undefined}
                aria-label="Settings"
              >
                <Settings size={20} />
              </motion.button>
            )}

            {/* Leave game button */}
            {onLeaveGame && (
              <motion.button
                onClick={onLeaveGame}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all border-2"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  borderColor: '#F87171',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
                variants={!reduceMotion ? buttonVariants : {}}
                whileHover={!reduceMotion ? "hover" : undefined}
                whileTap={!reduceMotion ? "tap" : undefined}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Leave</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile player count (shows on small screens) */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center justify-center space-x-1 text-sm text-gray-300">
          <Users size={16} className="text-blue-400" />
          <span>{playerCount}/{maxPlayers} players</span>
        </div>
      </div>
    </motion.nav>
  );
};

export default NavBar; 