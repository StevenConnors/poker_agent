'use client';

import React, { useMemo } from 'react';
import { TableStage } from './TableStage';
import { Felt } from './Felt';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { ChipStack } from './ChipStack';
import { PotDisplay } from './PotDisplay';
import { ActionLog } from './ActionLog';
import { ControlPanel } from './ControlPanel';

import { RoundSummaryModal } from './RoundSummaryModal';
import { usePokerStore, type GameState, type Action } from '../lib/usePokerStore';
import { Container, Graphics, Text } from '@pixi/react';
import { PixiButtonComponent, getActionButtonColor } from './PixiButtonComponent';

interface PixiPokerTableProps {
  gameState: GameState;
  currentPlayerId: string;
  legalActions: Action[];
  onAction: (action: Action) => void;
  onStartHand: () => void;
  onLeaveGame: () => void;
  onShowdown?: () => void;
  onAwardWinnings?: () => void;
  onCompleteHand?: () => void;
  showAllCards?: boolean;
  className?: string;
}

export const PixiPokerTable: React.FC<PixiPokerTableProps> = ({
  gameState,
  currentPlayerId,
  legalActions,
  onAction,
  onStartHand,
  onLeaveGame,
  onShowdown,
  onAwardWinnings,
  onCompleteHand,
  showAllCards = false,
  className = '',
}) => {
  const { showRoundSummary, roundResults, setShowRoundSummary } = usePokerStore();
  
  const { table, stage, board, potManager, bettingRound, isHandActive, history } = gameState;
  
  // Get current player info
  const currentPlayer = table.seats.find(seat => seat.player?.id === currentPlayerId)?.player;
  const currentPlayerSeatIndex = table.seats.findIndex(seat => seat.player?.id === currentPlayerId);
  const isCurrentPlayerTurn = bettingRound.actionIndex === currentPlayerSeatIndex;

  // Debug logging
  console.log('🔍 PixiPokerTable Debug Info:', {
    currentPlayerId,
    currentPlayer: currentPlayer?.name,
    currentPlayerSeatIndex,
    actionIndex: bettingRound.actionIndex,
    isCurrentPlayerTurn,
    legalActionsCount: legalActions.length,
    legalActionTypes: legalActions.map(a => a.type),
    stage,
    isHandActive,
    showCondition: currentPlayer && isCurrentPlayerTurn,
    bettingRoundComplete: bettingRound.isComplete
  });

  // Calculate seat positions in an arc from 2 o'clock to 10 o'clock
  const getSeatPosition = (index: number, total: number = 6, stageWidth: number = 1200, stageHeight: number = 675) => {
    // Define the arc from 2 o'clock to 10 o'clock
    const startAngle = -Math.PI / 6; // 2 o'clock (-30° from top)
    const endAngle = -7 * Math.PI / 6; // 10 o'clock (-210° from top)
    
    // Distribute seats evenly across the arc
    const arcLength = endAngle - startAngle;
    const angle = startAngle + (index / (total - 1)) * arcLength;
    
    const radiusX = 280; // Horizontal radius 
    const radiusY = 180; // Vertical radius
    const x = stageWidth / 2 + Math.cos(angle) * radiusX;
    const y = stageHeight / 2 + Math.sin(angle) * radiusY;
    
    return { x, y };
  };

  const seatedPlayers = table.seats.filter(seat => seat.player).length;
  const activePlayers = table.seats.filter(seat => seat.player?.status === 'active').length;
  const canStartHand = seatedPlayers >= 2 && !isHandActive;

  // Stage dimensions (16:9 aspect ratio, but taller to accommodate action buttons)
  const stageWidth = 1200;
  const stageHeight = 750; // Increased from 675 to 750

  return (
    <div className={`min-h-screen relative overflow-hidden ${className}`}>
      {/* Background pattern overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 215, 64, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(21, 112, 62, 0.1) 0%, transparent 50%)`,
        }}
      />

      {/* PixiJS Stage */}
      <TableStage className="w-full h-full">
        {/* Poker table felt */}
        <Felt 
          x={stageWidth / 2} 
          y={stageHeight / 2} 
          width={800} 
          height={400} 
        />
        
        {/* Community cards */}
        <CommunityCards
          cards={board}
          stage={stage}
          x={stageWidth / 2}
          y={stageHeight / 2 - 100}
        />
        
        {/* Pot display */}
        <PotDisplay
          potManager={potManager}
          isAnimating={stage === 'showdown'}
          x={stageWidth / 2}
          y={stageHeight / 2}
        />
        
        {/* Player seats */}
        {table.seats.slice(0, 6).map((seat, index) => {
          const position = getSeatPosition(index, 6, stageWidth, stageHeight);
          const isDealer = index === table.buttonIndex;
          const isCurrentPlayerSeat = seat.player?.id === currentPlayerId;
          const isCurrentTurn = bettingRound.actionIndex === index;
          const currentBet = bettingRound.betsThisRound[index] || 0;

          return (
            <PlayerSeat
              key={index}
              player={seat.player}
              isCurrentPlayer={isCurrentTurn}
              isDealer={isDealer}
              currentBet={currentBet}
              seatIndex={index}
              showCards={showAllCards || isCurrentPlayerSeat}
              x={position.x}
              y={position.y}
            />
          );
        })}
        
        {/* Chip stacks for bets */}
        {table.seats.slice(0, 6).map((seat, index) => {
          const currentBet = bettingRound.betsThisRound[index] || 0;
          if (currentBet === 0) return null;
          
          const position = getSeatPosition(index, 6, stageWidth, stageHeight);
          // Position bet chips slightly toward center from player seat
          const betX = position.x + (stageWidth / 2 - position.x) * 0.3;
          const betY = position.y + (stageHeight / 2 - position.y) * 0.3;
          
          return (
            <ChipStack
              key={`bet-${index}`}
              amount={currentBet}
              x={betX}
              y={betY}
              maxVisible={5}
            />
          );
        })}

        {/* Action Panel - PixiJS version with new Button component */}
        {currentPlayer && isCurrentPlayerTurn && legalActions.length > 0 && (
          <Container x={stageWidth / 2} y={stageHeight - 120}>
            {legalActions.map((action, index) => {
              const buttonWidth = 120;
              const buttonHeight = 50;
              const buttonSpacing = 10;
              const totalWidth = legalActions.length * buttonWidth + (legalActions.length - 1) * buttonSpacing;
              const buttonX = (index * (buttonWidth + buttonSpacing)) - totalWidth / 2;
              
              // Get button color based on action type
              const buttonColor = getActionButtonColor(action.type);
              
              // Create button text
              const buttonText = `${action.type.toUpperCase()}${action.amount ? `\n$${action.amount}` : ''}`;
              
              return (
                <PixiButtonComponent
                  key={index}
                  x={buttonX}
                  y={0}
                  width={buttonWidth}
                  height={buttonHeight}
                  backgroundColor={buttonColor}
                  cornerRadius={8}
                  borderColor={0xffffff}
                  borderWidth={2}
                  borderAlpha={0.3}
                  text={buttonText}
                  textStyle={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: action.amount ? 12 : 14,
                    fontWeight: 'bold',
                    fill: 0xffffff,
                    align: 'center',
                  }}
                  onClick={() => {
                    console.log('🎯 PixiJS Action button clicked!', {
                      actionType: action.type,
                      actionAmount: action.amount,
                      currentPlayerId,
                      currentPlayerSeatIndex,
                      onActionFunction: typeof onAction
                    });
                    
                    const completeAction = {
                      ...action,
                      playerId: currentPlayerId,
                      seatIndex: currentPlayerSeatIndex,
                      timestamp: Date.now(),
                    };
                    
                    console.log('🚀 Calling onAction with:', completeAction);
                    onAction(completeAction);
                    console.log('✅ onAction call completed');
                  }}
                />
              );
            })}
          </Container>
        )}

      </TableStage>

      {/* DOM overlay elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left sidebar - Action Log */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-auto">
          <ActionLog
            actions={history}
            seats={table.seats}
            maxActions={8}
          />
        </div>

        {/* Right sidebar - Game Controls */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto space-y-4">
          {/* Start hand button */}
          {canStartHand && (
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Game Controls</h3>
              <button
                onClick={onStartHand}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Start New Hand
              </button>
              <div className="text-white/60 text-sm mt-2">
                {activePlayers} players ready
              </div>
            </div>
          )}

          {/* Showdown controls */}
          {stage === 'showdown' && (
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Showdown</h3>
              <button
                onClick={onShowdown}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg mb-2 transition-colors"
              >
                Reveal Cards
              </button>
              <button
                onClick={onAwardWinnings}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg mb-2 transition-colors"
              >
                Award Winnings
              </button>
              <button
                onClick={onCompleteHand}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Complete Hand
              </button>
            </div>
          )}

          {/* Leave game button */}
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
            <button
              onClick={onLeaveGame}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Leave Game
            </button>
          </div>
        </div>

        {/* Top bar - Game info */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <h1 className="text-white text-lg font-bold">
              Poker Table {gameState.gameId.replace('game_', '')}
            </h1>
            <div className="text-green-200 text-sm">
              Blinds: ${table.smallBlind}/${table.bigBlind} • Stage: {stage} • Hands: {gameState.handsPlayed}
            </div>
          </div>
        </div>
      </div>

      {/* Round Summary Modal */}
      <RoundSummaryModal
        isOpen={showRoundSummary}
        results={roundResults}
        onClose={() => setShowRoundSummary(false)}
        onNewRound={onCompleteHand}
      />
    </div>
  );
}; 