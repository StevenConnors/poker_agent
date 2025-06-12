'use client';

import React, { useMemo } from 'react';
import type { Action, Seat } from '../lib/usePokerStore';

interface ActionLogProps {
  actions: Action[];
  seats: Seat[];
  maxActions?: number;
  className?: string;
}

export const ActionLog: React.FC<ActionLogProps> = ({
  actions,
  seats,
  maxActions = 8,
  className = ''
}) => {
  const recentActions = useMemo(() => {
    return actions.slice(-maxActions);
  }, [actions, maxActions]);

  const getPlayerName = (playerId: string): string => {
    const seat = seats.find(s => s.player?.id === playerId);
    return seat?.player?.name || 'Unknown Player';
  };

  const formatAction = (action: Action): string => {
    const playerName = getPlayerName(action.playerId);
    
    switch (action.type) {
      case 'fold':
        return `${playerName} folds`;
      case 'call':
        return `${playerName} calls ${action.amount ? `$${action.amount}` : ''}`;
      case 'check':
        return `${playerName} checks`;
      case 'bet':
        return `${playerName} bets $${action.amount || 0}`;
      case 'raise':
        return `${playerName} raises to $${action.amount || 0}`;
      case 'all-in':
        return `${playerName} goes all-in${action.amount ? ` for $${action.amount}` : ''}`;
      case 'post-sb':
        return `${playerName} posts small blind $${action.amount || 0}`;
      case 'post-bb':
        return `${playerName} posts big blind $${action.amount || 0}`;
      default:
        return `${playerName} ${action.type}${action.amount ? ` $${action.amount}` : ''}`;
    }
  };

  const getActionIcon = (actionType: string): string => {
    switch (actionType) {
      case 'fold':
        return '❌';
      case 'call':
        return '📞';
      case 'check':
        return '✅';
      case 'bet':
        return '💰';
      case 'raise':
        return '📈';
      case 'all-in':
        return '🎯';
      case 'post-sb':
      case 'post-bb':
        return '🏠';
      default:
        return '🎮';
    }
  };

  const getActionColor = (actionType: string): string => {
    switch (actionType) {
      case 'fold':
        return 'text-gray-500';
      case 'call':
        return 'text-blue-400';
      case 'check':
        return 'text-green-400';
      case 'bet':
        return 'text-yellow-400';
      case 'raise':
        return 'text-orange-400';
      case 'all-in':
        return 'text-red-400';
      case 'post-sb':
      case 'post-bb':
        return 'text-purple-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div 
      className={`bg-black/20 backdrop-blur-sm rounded-lg p-4 ${className}`}
      style={{ minWidth: '280px', maxHeight: '300px' }}
    >
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        📜 Recent Actions
      </h3>
      
      {/* Visible action log */}
      <div className="space-y-2 overflow-y-auto max-h-60">
        {recentActions.length === 0 ? (
          <div className="text-gray-400 text-sm italic text-center py-4">
            No actions yet
          </div>
        ) : (
          recentActions.map((action, index) => {
            const actionText = formatAction(action);
            const actionColor = getActionColor(action.type);
            const actionIcon = getActionIcon(action.type);
            
            return (
              <div 
                key={`${action.playerId}-${action.timestamp}-${index}`}
                className="flex items-center gap-3 text-sm p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-lg" role="img" aria-label={action.type}>
                  {actionIcon}
                </span>
                <span className={`flex-1 ${actionColor}`}>
                  {actionText}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(action.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>
      
      {/* Hidden accessibility live region */}
      <div 
        aria-live="polite" 
        aria-label="Poker game actions"
        className="sr-only"
      >
        {recentActions.slice(-3).map((action, index) => (
          <div key={`sr-${action.playerId}-${action.timestamp}-${index}`}>
            {formatAction(action)}
          </div>
        ))}
      </div>
    </div>
  );
}; 