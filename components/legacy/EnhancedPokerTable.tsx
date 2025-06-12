import React from 'react';
import { motion } from 'framer-motion';
import { GameState, Action } from '../engine/types';
import { useGameStore } from '../stores/gameStore';
import NavBar from './ui/NavBar';
import CommunityCardsRow from './ui/CommunityCardsRow';
import PlayerSeat from './ui/PlayerSeat';
import PotDisplay from './ui/PotDisplay';
import ControlPanel from './ui/ControlPanel';
import ActionLog from './ui/ActionLog';
import RoundSummaryModal from './ui/RoundSummaryModal';

interface EnhancedPokerTableProps {
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

const EnhancedPokerTable: React.FC<EnhancedPokerTableProps> = ({
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
  const { showRoundSummary, roundResults, setShowRoundSummary } = useGameStore();
  
  const { table, stage, board, potManager, bettingRound, isHandActive, history } = gameState;
  
  // Get current player info
  const currentPlayer = table.seats.find(seat => seat.player?.id === currentPlayerId)?.player;
  const currentPlayerSeatIndex = table.seats.findIndex(seat => seat.player?.id === currentPlayerId);
  const isCurrentPlayerTurn = bettingRound.actionIndex === currentPlayerSeatIndex;

  // Arrange seats from 2 o'clock to 10 o'clock (leaving top area clear)
  const getSeatPosition = (index: number, total: number = 6) => {
    // Define the arc from 2 o'clock to 10 o'clock
    // 2 o'clock = 60° clockwise from top = -30° in math coordinates
    // 10 o'clock = 300° clockwise from top = -210° in math coordinates
    const startAngle = -Math.PI / 6; // 2 o'clock (-30° from top)
    const endAngle = -7 * Math.PI / 6; // 10 o'clock (-210° from top)
    
    // Distribute seats evenly across the arc
    const arcLength = endAngle - startAngle; // This will be negative, so we go clockwise
    const angle = startAngle + (index / (total - 1)) * arcLength;
    
    const radiusX = 220; // Horizontal radius 
    const radiusY = 140; // Vertical radius
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;
    
    // Debug log for seat positions
    if (index === 0) {
      console.log('Seat position calculation:', {
        index,
        startAngle: startAngle * 180 / Math.PI,
        endAngle: endAngle * 180 / Math.PI,
        angle: angle * 180 / Math.PI,
        x,
        y,
        finalLeft: `calc(50% + ${x}px)`,
        finalTop: `calc(50% + ${y}px)`
      });
    }
    
    return { x, y };
  };

  const seatedPlayers = table.seats.filter(seat => seat.player).length;
  const activePlayers = table.seats.filter(seat => seat.player?.status === 'active').length;
  const canStartHand = seatedPlayers >= 2 && !isHandActive;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tableVariants = {
    initial: { scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const feltVariants = {
    initial: {},
    animate: { 
      opacity: 1,
      transition: { delay: 0.2, duration: 0.8 }
    }
  };

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${className}`}
    >
      {/* Background pattern overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 215, 64, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(21, 112, 62, 0.1) 0%, transparent 50%)`,
        }}
      />

      {/* Navigation */}
      <NavBar
        tableName={`Poker Patio ${gameState.gameId.replace('game_', '')}`}
        playerBalance={currentPlayer?.stack || 0}
        playerCount={seatedPlayers}
        maxPlayers={table.maxPlayers}
        onLeaveGame={onLeaveGame}
      />

      {/* Main game area */}
      <div className="relative flex-1 p-4 lg:p-8" style={{ overflow: 'visible' }}>
        <div className="max-w-7xl mx-auto" style={{ overflow: 'visible' }}>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
            
            {/* Left sidebar - Game controls & Action Log */}
            <div className="hidden xl:block space-y-4">
              {/* Start hand controls */}
              {canStartHand && (
                <motion.div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backdropFilter: 'blur(8px)',
                    borderColor: '#222',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                  initial={!reduceMotion ? { x: -20 } : undefined}
                  animate={!reduceMotion ? { opacity: 1, x: 0 } : undefined}
                  transition={!reduceMotion ? { delay: 0.3 } : undefined}
                >
                  <h3 className="text-white font-semibold mb-3">Game Controls</h3>
                  <button
                    onClick={onStartHand}
                    className="w-full font-bold py-3 px-4 rounded-lg transition-all border-2"
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      borderColor: '#34D399',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)'
                    }}
                  >
                    Start New Hand
                  </button>
                  <div className="text-gray-400 text-sm mt-2">
                    {seatedPlayers} players ready
                  </div>
                </motion.div>
              )}

              {/* Hand completion controls - shown when hand is complete or at showdown */}
              {(stage === 'showdown' || stage === 'finished') && (
                <motion.div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backdropFilter: 'blur(8px)',
                    borderColor: '#222',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                  initial={!reduceMotion ? { x: -20 } : undefined}
                  animate={!reduceMotion ? { opacity: 1, x: 0 } : undefined}
                  transition={!reduceMotion ? { delay: 0.3 } : undefined}
                >
                  <h3 className="text-white font-semibold mb-3">Hand Complete</h3>
                  <div className="space-y-2">
                    {stage === 'showdown' && onShowdown && (
                      <button
                        onClick={onShowdown}
                        className="w-full font-bold py-2 px-4 rounded-lg transition-all border-2 text-sm"
                        style={{
                          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                          borderColor: '#A855F7',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
                        }}
                      >
                        Run Showdown
                      </button>
                    )}
                    {stage === 'finished' && gameState.winners && onAwardWinnings && (
                      <button
                        onClick={onAwardWinnings}
                        className="w-full font-bold py-2 px-4 rounded-lg transition-all border-2 text-sm"
                        style={{
                          background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                          borderColor: '#FBBF24',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
                        }}
                      >
                        Award Winnings
                      </button>
                    )}
                    {stage === 'finished' && onCompleteHand && (
                      <button
                        onClick={onCompleteHand}
                        className="w-full font-bold py-2 px-4 rounded-lg transition-all border-2 text-sm"
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          borderColor: '#34D399',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)'
                        }}
                      >
                        Complete Hand & Next
                      </button>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs mt-2">
                    {stage === 'showdown' && 'Determine winners'}
                    {stage === 'finished' && gameState.winners && 'Award chips and start next hand'}
                  </div>
                </motion.div>
              )}

              {/* Game stats */}
              <motion.div
                className="rounded-lg p-4 border-2"
                style={{
                  backdropFilter: 'blur(8px)',
                  borderColor: '#222',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}
                initial={!reduceMotion ? { x: -20 } : undefined}
                animate={!reduceMotion ? { opacity: 1, x: 0 } : undefined}
                transition={!reduceMotion ? { delay: 0.4 } : undefined}
              >
                <h3 className="text-white font-semibold mb-3">Game Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Hands Played:</span>
                    <span className="text-white font-medium">{gameState.handsPlayed}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Blinds:</span>
                    <span className="text-white font-medium">${table.smallBlind}/${table.bigBlind}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Seated Players:</span>
                    <span className="text-white font-medium">{seatedPlayers}</span>
                  </div>
                </div>
              </motion.div>

              {/* Action Log */}
              <ActionLog
                actions={history}
                seats={table.seats}
                maxActions={8}
              />
            </div>

            {/* Main table area */}
            <div className="xl:col-span-2">
              <motion.div
                className="relative mx-auto"
                style={{ 
                  width: '100%', 
                  maxWidth: '800px',
                  aspectRatio: '16/9',
                  overflow: 'visible', // Ensure seats aren't clipped
                  minHeight: '600px' // Give more vertical space
                }}
                variants={!reduceMotion ? tableVariants : {}}
                initial={!reduceMotion ? "initial" : undefined}
                animate={!reduceMotion ? "animate" : undefined}
              >
                {/* Poker table felt with elliptical clip-path */}
                <motion.div
                  className="absolute inset-0 relative"
                  style={{
                    background: '#15703e', // felt-green from design tokens
                    clipPath: 'ellipse(85% 65% at 50% 50%)',
                    boxShadow: '0 0 60px rgba(0, 0, 0, 0.8), inset 0 0 100px rgba(0, 0, 0, 0.3)'
                  }}
                  variants={!reduceMotion ? feltVariants : {}}
                  initial={!reduceMotion ? "initial" : undefined}
                  animate={!reduceMotion ? "animate" : undefined}
                >
                  {/* Gradient edge overlay */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(21,112,62,1) 0%, rgba(0,0,0,1) 85%)',
                      clipPath: 'ellipse(85% 65% at 50% 50%)',
                      opacity: 0.7
                    }}
                  />
                </motion.div>

                {/* Community cards area - positioned at top center */}
                <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <CommunityCardsRow
                    cards={board}
                    stage={stage}
                  />
                </div>

                {/* Pot display - exact center */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <PotDisplay
                    potManager={potManager}
                    isAnimating={stage === 'showdown'}
                  />
                </div>

                {/* Player seats arranged in ellipse with 30° increments */}
                {table.seats.slice(0, 6).map((seat, index) => {
                  const position = getSeatPosition(index);
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
                        top: `calc(50% + ${position.y}px)`,
                        zIndex: 15
                      }}
                    >
                      <PlayerSeat
                        player={seat.player}
                        isCurrentPlayer={isCurrentTurn}
                        isDealer={isDealer}
                        currentBet={currentBet}
                        seatIndex={index}
                        showCards={showAllCards || (isCurrentPlayerSeat && stage === 'showdown')}
                      />
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Right sidebar - Mobile action log (hidden on desktop) */}
            <div className="xl:hidden">
              <ActionLog
                actions={history}
                seats={table.seats}
                maxActions={6}
              />
            </div>
          </div>

          {/* Control Panel - positioned outside oval at bottom */}
          <motion.div
            className="mt-8 max-w-4xl mx-auto"
            initial={!reduceMotion ? { y: 20 } : undefined}
            animate={!reduceMotion ? { opacity: 1, y: 0 } : undefined}
            transition={!reduceMotion ? { delay: 0.6 } : undefined}
          >
            <ControlPanel
              legalActions={legalActions}
              currentBet={bettingRound.currentBet}
              playerStack={currentPlayer?.stack || 0}
              onAction={onAction}
              disabled={!isCurrentPlayerTurn || !currentPlayer}
            />
          </motion.div>

          {/* Mobile start hand button */}
          {canStartHand && (
            <motion.div
              className="xl:hidden mt-4 text-center"
              initial={!reduceMotion ? { y: 20 } : undefined}
              animate={!reduceMotion ? { opacity: 1, y: 0 } : undefined}
              transition={!reduceMotion ? { delay: 0.7 } : undefined}
            >
              <button
                onClick={onStartHand}
                className="font-bold py-3 px-6 rounded-lg transition-all border-2"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  borderColor: '#34D399',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)'
                }}
              >
                Start New Hand ({seatedPlayers} players)
              </button>
            </motion.div>
          )}

          {/* Mobile hand completion controls */}
          {(stage === 'showdown' || stage === 'finished') && (
            <motion.div
              className="xl:hidden mt-4 text-center space-y-2"
              initial={!reduceMotion ? { y: 20 } : undefined}
              animate={!reduceMotion ? { opacity: 1, y: 0 } : undefined}
              transition={!reduceMotion ? { delay: 0.7 } : undefined}
            >
              {stage === 'showdown' && onShowdown && (
                <button
                  onClick={onShowdown}
                  className="w-full font-bold py-3 px-6 rounded-lg transition-all border-2"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                    borderColor: '#A855F7',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
                  }}
                >
                  Run Showdown
                </button>
              )}
              {stage === 'finished' && gameState.winners && onAwardWinnings && (
                <button
                  onClick={onAwardWinnings}
                  className="w-full font-bold py-3 px-6 rounded-lg transition-all border-2"
                  style={{
                    background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                    borderColor: '#FBBF24',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
                  }}
                >
                  Award Winnings
                </button>
              )}
              {stage === 'finished' && onCompleteHand && (
                <button
                  onClick={onCompleteHand}
                  className="w-full font-bold py-3 px-6 rounded-lg transition-all border-2"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    borderColor: '#34D399',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)'
                  }}
                >
                  Complete Hand & Next
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Round Summary Modal */}
      <RoundSummaryModal
        isOpen={showRoundSummary}
        results={roundResults}
        onClose={() => setShowRoundSummary(false)}
      />
    </div>
  );
};

export default EnhancedPokerTable; 