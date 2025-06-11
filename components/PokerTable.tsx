import React from 'react';
import { GameState, Action } from '../engine/types';
import Card from './Card';
import PlayerSeat from './PlayerSeat';
import ActionPanel from './ActionPanel';

interface PokerTableProps {
  gameState: GameState;
  currentPlayerId: string;
  legalActions: Action[];
  onAction: (action: Action) => void;
  onStartHand: () => void;
  onLeaveGame: () => void;
  showAllCards?: boolean;
}

export default function PokerTable({
  gameState,
  currentPlayerId,
  legalActions,
  onAction,
  onStartHand,
  onLeaveGame,
  showAllCards = false
}: PokerTableProps) {
  const { table, stage, board, potManager, bettingRound, isHandActive } = gameState;
  
  // Get current player info
  const currentPlayer = table.seats.find(seat => seat.player?.id === currentPlayerId)?.player;
  const currentPlayerSeatIndex = table.seats.findIndex(seat => seat.player?.id === currentPlayerId);
  const isCurrentPlayerTurn = bettingRound.actionIndex === currentPlayerSeatIndex;

  // Arrange seats in a visually pleasing circle
  const getSeatPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = 200; // Increased radius for better spacing
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const activePlayers = table.seats.filter(seat => seat.player?.status === 'active').length;
  const canStartHand = activePlayers >= 2 && !isHandActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <h1 className="text-2xl font-bold">
              Poker Room {gameState.gameId.replace('game_', '')}
            </h1>
            <div className="text-green-200">
              Blinds: ${table.smallBlind}/${table.bigBlind} • Stage: {stage}
            </div>
          </div>
          <button
            onClick={onLeaveGame}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Leave Game
          </button>
        </div>

        {/* Main table area */}
        <div className="relative bg-green-800 rounded-full mx-auto mb-8" style={{ width: '700px', height: '500px' }}>
          {/* Poker table felt */}
          <div className="absolute inset-6 bg-green-700 rounded-full border-8 border-yellow-600 shadow-inner">
            
            {/* Community cards area */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-center mb-4">
                <div className="text-white text-sm font-medium mb-2">Community Cards</div>
                <div className="flex gap-2 justify-center">
                  {stage === 'init' || stage === 'preflop' ? (
                    // Show placeholders
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={i} card={null} isHidden={true} size="medium" />
                    ))
                  ) : (
                    // Show actual community cards
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card 
                        key={i} 
                        card={board[i] || null} 
                        isHidden={!board[i]} 
                        size="medium" 
                      />
                    ))
                  )}
                </div>
              </div>
              
              {/* Pot information */}
              <div className="text-center">
                <div className="bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-bold">
                  Pot: ${potManager.totalPot}
                </div>
                {potManager.sidePots.length > 0 && (
                  <div className="text-yellow-200 text-xs mt-1">
                    + {potManager.sidePots.length} side pot{potManager.sidePots.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Player seats arranged in circle */}
            {table.seats.map((seat, index) => {
              const position = getSeatPosition(index, table.maxPlayers);
              const isDealer = index === table.buttonIndex;
              const isCurrentPlayerSeat = seat.player?.id === currentPlayerId;
              const isCurrentTurn = bettingRound.actionIndex === index;
              const currentBet = bettingRound.betsThisRound[index] || 0;

              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${position.x}px)`,
                    top: `calc(50% + ${position.y}px)`
                  }}
                >
                  <PlayerSeat
                    player={seat.player}
                    isCurrentPlayer={isCurrentTurn}
                    isDealer={isDealer}
                    currentBet={currentBet}
                    seatIndex={index}
                    showCards={showAllCards || isCurrentPlayerSeat}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Game controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Start hand button */}
          <div className="lg:col-span-1">
            {canStartHand && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Game Controls</h3>
                <button
                  onClick={onStartHand}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
                >
                  Start New Hand
                </button>
                <div className="text-white/60 text-sm mt-2">
                  {activePlayers} players ready
                </div>
              </div>
            )}
          </div>

          {/* Action panel */}
          <div className="lg:col-span-2">
            {currentPlayer && isCurrentPlayerTurn ? (
              <ActionPanel
                legalActions={legalActions}
                currentBet={bettingRound.currentBet}
                playerStack={currentPlayer.stack}
                onAction={(action) => {
                  // Fill in player info
                  action.playerId = currentPlayerId;
                  action.seatIndex = currentPlayerSeatIndex;
                  onAction(action);
                }}
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-white/60">
                  {!currentPlayer 
                    ? 'You are not seated at this table' 
                    : !isHandActive 
                    ? 'Waiting for hand to start...'
                    : 'Waiting for other players...'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game status */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-white/60 text-sm">Hands Played</div>
              <div className="text-white text-xl font-bold">{gameState.handsPlayed}</div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Active Players</div>
              <div className="text-white text-xl font-bold">{activePlayers}</div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Current Stage</div>
              <div className="text-white text-xl font-bold capitalize">{stage}</div>
            </div>
          </div>
        </div>

        {/* Recent actions log */}
        {gameState.history.length > 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-white font-semibold mb-3">Recent Actions</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {gameState.history.slice(-5).map((action, index) => {
                const player = table.seats.find(seat => seat.player?.id === action.playerId)?.player;
                return (
                  <div key={index} className="text-white/80 text-sm">
                    <span className="font-medium">{player?.name || 'Unknown'}</span>{' '}
                    <span className="text-white/60">{action.type}</span>
                    {action.amount && action.amount > 0 && (
                      <span className="text-yellow-300"> ${action.amount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 