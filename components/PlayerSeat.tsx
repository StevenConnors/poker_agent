import React from 'react';
import { Player } from '../engine/types';
import Card from './Card';

interface PlayerSeatProps {
  player: Player | null;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  currentBet: number;
  seatIndex: number;
  showCards?: boolean;
  className?: string;
}

export default function PlayerSeat({ 
  player, 
  isCurrentPlayer, 
  isDealer,
  currentBet,
  seatIndex: _seatIndex,
  showCards = false,
  className = '' 
}: PlayerSeatProps) {
  if (!player) {
    // Empty seat
    return (
      <div className={`${className} w-36 h-28 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center bg-green-800/20 hover:bg-green-800/30 transition-colors`}>
        <div className="text-gray-400 text-sm text-center">
          <div>Empty Seat</div>
          <div className="text-xs mt-1">Available</div>
        </div>
      </div>
    );
  }

  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';

  return (
    <div className={`${className} relative`}>
      {/* Player info container */}
      <div className={`
        bg-white/90 rounded-lg shadow-lg p-3 min-w-36
        ${isCurrentPlayer ? 'ring-4 ring-yellow-400 bg-yellow-50' : ''}
        ${isFolded ? 'opacity-50 grayscale' : ''}
        ${isAllIn ? 'ring-2 ring-red-400' : ''}
      `}>
        {/* Player name and status */}
        <div className="text-center mb-2">
          <div className="font-semibold text-gray-800 text-sm truncate">
            {player.name}
            {isDealer && <span className="ml-1 text-xs bg-yellow-500 text-white px-1 rounded">D</span>}
          </div>
          <div className="text-xs text-gray-600">
            ${player.stack}
            {isAllIn && <span className="ml-1 text-red-600 font-bold">ALL-IN</span>}
          </div>
        </div>

        {/* Player cards */}
        <div className="flex justify-center gap-2 mb-2">
          {player.hole && player.hole.length > 0 ? (
            player.hole.map((card, index) => (
              <Card
                key={index}
                card={card}
                isHidden={!showCards && !isCurrentPlayer}
                size="small"
              />
            ))
          ) : (
            <div className="text-xs text-gray-500">No cards</div>
          )}
        </div>

        {/* Current bet */}
        {currentBet > 0 && (
          <div className="text-center">
            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              Bet: ${currentBet}
            </div>
          </div>
        )}

        {/* Status indicators */}
        <div className="absolute top-1 right-1">
          {isCurrentPlayer && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
        </div>

        {/* Connection status */}
        <div className="absolute top-1 left-1">
          <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
      </div>

      {/* Action indicator */}
      {isCurrentPlayer && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold">
            Your Turn
          </div>
        </div>
      )}
    </div>
  );
} 