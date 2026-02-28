import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User } from 'lucide-react';
import { Action, Seat } from '../../engine/types';

interface ActionLogProps {
  actions: Action[];
  seats: Seat[];
  maxActions?: number;
  className?: string;
}

const ActionLog: React.FC<ActionLogProps> = ({
  actions,
  seats,
  maxActions = 10,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new actions are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions]);

  const getPlayerName = (playerId: string) => {
    const playerSeat = seats.find(seat => seat.player?.id === playerId);
    return playerSeat?.player?.name || 'Unknown Player';
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'fold':
        return 'text-red-400';
      case 'call':
        return 'text-green-400';
      case 'check':
        return 'text-blue-400';
      case 'bet':
      case 'raise':
        return 'text-yellow-400';
      case 'all-in':
        return 'text-purple-400';
      case 'post-sb':
      case 'post-bb':
        return 'text-gray-400';
      default:
        return 'text-white';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'fold':
        return '❌';
      case 'call':
        return '📞';
      case 'check':
        return '✅';
      case 'bet':
      case 'raise':
        return '💰';
      case 'all-in':
        return '🚀';
      case 'post-sb':
      case 'post-bb':
        return '🎯';
      default:
        return '🎰';
    }
  };

  const getActionText = (action: Action) => {
    const playerName = getPlayerName(action.playerId);
    const actionType = action.type;
    const amount = action.amount || 0;

    switch (actionType) {
      case 'fold':
        return `${playerName} folded`;
      case 'check':
        return `${playerName} checked`;
      case 'call':
        return `${playerName} called ${amount ? `$${amount}` : ''}`;
      case 'bet':
        return `${playerName} bet $${amount}`;
      case 'raise':
        return `${playerName} raised to $${amount}`;
      case 'all-in':
        return `${playerName} went all-in for $${amount}`;
      case 'post-sb':
        return `${playerName} posted small blind $${amount}`;
      case 'post-bb':
        return `${playerName} posted big blind $${amount}`;
      default:
        return `${playerName} ${actionType}${amount ? ` $${amount}` : ''}`;
    }
  };

  const formatTime = (timestamp: number) => 
    new Date(timestamp).toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });

  const recentActions = actions.slice(-maxActions).reverse();
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const containerVariants = {
    hidden: {},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    },
    exit: {
  
      x: 20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div 
      className={`rounded-lg border-2 shadow-lg ${className}`}
      style={{
        backdropFilter: 'blur(8px)',
        borderColor: '#222',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b"
        style={{ borderColor: '#374151' }}
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <h3 className="text-white font-medium">Action Log</h3>
          <div className="ml-auto text-xs text-gray-400">
            {actions.length} action{actions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Actions list */}
      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 space-y-2"
        aria-live="polite"
        aria-label="Game action log"
      >
        {recentActions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <User size={24} className="mx-auto mb-2 opacity-50" />
            <div className="text-sm">No actions yet</div>
            <div className="text-xs text-gray-500">Game actions will appear here</div>
          </div>
        ) : (
          <motion.div
            className="space-y-2"
            variants={!reduceMotion ? containerVariants : {}}
            initial={!reduceMotion ? "hidden" : undefined}
            animate={!reduceMotion ? "visible" : undefined}
          >
            <AnimatePresence>
              {recentActions.map((action, actionIndex) => (
                <motion.div
                  key={`${action.timestamp}-${actionIndex}`}
                  className="flex items-center gap-3 p-2 rounded-lg transition-colors border"
                  style={{
                    background: 'rgba(55, 65, 81, 0.4)',
                    borderColor: '#374151',
                    backdropFilter: 'blur(4px)'
                  }}
                  variants={!reduceMotion ? itemVariants : {}}
                  initial={!reduceMotion ? "hidden" : undefined}
                  animate={!reduceMotion ? "visible" : undefined}
                  exit={!reduceMotion ? "exit" : undefined}
                  layout={!reduceMotion ? true : undefined}
                  whileHover={!reduceMotion ? { 
                    backgroundColor: 'rgba(75, 85, 99, 0.5)' 
                  } : undefined}
                >
                  {/* Action icon */}
                  <div className="text-lg leading-none">
                    {getActionIcon(action.type)}
                  </div>

                  {/* Action text */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${getActionColor(action.type)}`}>
                      {getActionText(action)}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(action.timestamp)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Footer with scroll indicator */}
      {recentActions.length > 0 && (
        <div 
          className="p-2 border-t text-center"
          style={{ borderColor: '#374151' }}
        >
          <div className="text-xs text-gray-500">
            {recentActions.length < actions.length && 
              `Showing ${recentActions.length} of ${actions.length} actions`
            }
            {recentActions.length >= actions.length && 
              `All ${actions.length} actions shown`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionLog; 