import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { PixiPokerTable } from '../../components/PixiPokerTable';

export default function GamePage() {
  const router = useRouter();
  const { gameId, playerId, playerName, buyIn } = router.query;
  
  const {
    gameState,
    legalActions,
    loading,
    error,
    connecting,
    setGameState,
    setLegalActions,
    setLoading,
    setError,
    setConnecting,
    setShowRoundSummary,
    clearError,
    reset
  } = useGameStore();

  // Game API helper functions
  const callGameAPI = async (op: string, payload: any = {}) => {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, payload }),
    });
    return response.json();
  };

  // Load game state and legal actions
  const loadGameState = async () => {
    console.log('loadGameState', gameId);
    if (!gameId) return;
    
    try {
      const [gameResult, actionsResult] = await Promise.all([
        callGameAPI('getGameInfo', { gameId }),
        callGameAPI('legalActions', { gameId })
      ]);

      console.log('loadGameState - gameResult:', gameResult);
      console.log('loadGameState - gameResult.value:', gameResult.value);
      console.log('loadGameState - gameResult.value.gameState:', gameResult.value?.gameState);

      if (gameResult.ok) {
        const newGameState = gameResult.value.gameState;
        console.log('loadGameState - Setting gameState:', newGameState);
        console.log('loadGameState - Table seats:', newGameState?.table?.seats);
        console.log('loadGameState - Players in seats:', newGameState?.table?.seats?.filter(s => s.player));
        console.log('loadGameState - Current player seat:', newGameState?.table?.seats?.find(s => s.player?.id === playerId));
        
        // Check if we should show round summary
        if (gameState && newGameState.stage === 'finished' && gameState.stage !== 'finished') {
          if (newGameState.winners && newGameState.winners.length > 0) {
            setShowRoundSummary(true, newGameState.winners);
          }
        }
        
        setGameState(newGameState);
        clearError();
      } else {
        console.log('loadGameState - Error:', gameResult.error);
        setError(gameResult.error || 'Failed to load game');
      }

      if (actionsResult.ok) {
        setLegalActions(actionsResult.value);
      } else {
        setLegalActions([]);
      }
    } catch (error) {
      console.log('loadGameState - Exception:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Join the game when component mounts
  const joinGame = async () => {
    if (!gameId || !playerId || !playerName || connecting) return;
    
    console.log('joinGame - Starting with:', { gameId, playerId, playerName, buyIn });
    setConnecting(true);
    try {
      const result = await callGameAPI('joinGame', {
        gameId,
        playerId,
        playerName,
        buyIn: parseInt(buyIn as string) || 100
      });

      console.log('joinGame - Result:', result);
      if (!result.ok) {
        // Player might already be in the game, try to load anyway
        console.warn('Join game warning:', result.error);
        // Don't set error here as player might already be in game
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      setError('Failed to join game');
    } finally {
      setConnecting(false);
    }
  };

  // Handle player actions
  const handleAction = async (action: any) => {
    console.log('🎯 handleAction called with:', action);
    console.log('🎯 gameId:', gameId, 'playerId:', playerId);
    
    if (!gameId || !playerId) {
      console.log('❌ Missing gameId or playerId');
      return;
    }
    
    // Find current player's seat index
    const currentPlayerSeat = gameState?.table.seats.find(seat => seat.player?.id === playerId);
    console.log('🎯 Found current player seat:', currentPlayerSeat);
    
    if (!currentPlayerSeat || currentPlayerSeat.player?.seatIndex === undefined) {
      console.log('❌ Player not found in game or missing seatIndex');
      setError('Player not found in game');
      return;
    }
    
    // Populate playerId and seatIndex if they're missing
    const completeAction = {
      ...action,
      playerId: playerId,
      seatIndex: currentPlayerSeat.player.seatIndex,
      timestamp: action.timestamp || Date.now()
    };
    
    console.log('🚀 About to call API with completeAction:', completeAction);
    
    try {
      const result = await callGameAPI('applyAction', { gameId, action: completeAction });
      console.log('📡 API result:', result);
      
      if (result.ok) {
        console.log('✅ Action successful, reloading game state');
        // Reload game state after action
        await loadGameState();
      } else {
        console.log('❌ Action failed:', result.error);
        setError(result.error || 'Action failed');
      }
    } catch (error) {
      console.log('💥 Exception during action:', error);
      setError('Failed to perform action');
    }
  };

  // Start a new hand
  const handleStartHand = async () => {
    if (!gameId) return;
    
    try {
      const result = await callGameAPI('startHand', { gameId });
      
      if (result.ok) {
        await loadGameState();
      } else {
        setError(result.error || 'Failed to start hand');
      }
    } catch {
      setError('Failed to start hand');
    }
  };

  // Leave the game
  const handleLeaveGame = async () => {
    if (!gameId || !playerId) return;
    
    try {
      await callGameAPI('leaveGame', { gameId, playerId });
    } catch {
      // Even if leave fails, continue to leave
      console.error('Failed to leave game cleanly');
    }
    
    // Reset store and navigate home
    reset();
    router.push('/');
  };

  // Handle showdown
  const handleShowdown = async () => {
    if (!gameId) return;
    
    try {
      const result = await callGameAPI('showdown', { gameId });
      
      if (result.ok) {
        await loadGameState();
      } else {
        setError(result.error || 'Failed to run showdown');
      }
    } catch {
      setError('Failed to run showdown');
    }
  };

  // Handle award winnings
  const handleAwardWinnings = async () => {
    if (!gameId) return;
    
    try {
      const result = await callGameAPI('awardWinnings', { gameId });
      
      if (result.ok) {
        await loadGameState();
      } else {
        setError(result.error || 'Failed to award winnings');
      }
    } catch {
      setError('Failed to award winnings');
    }
  };

  // Handle complete hand
  const handleCompleteHand = async () => {
    if (!gameId) return;
    
    try {
      const result = await callGameAPI('completeHand', { gameId });
      
      if (result.ok) {
        await loadGameState();
      } else {
        setError(result.error || 'Failed to complete hand');
      }
    } catch {
      setError('Failed to complete hand');
    }
  };

  // Set up auto-refresh and join game
  useEffect(() => {
    if (!router.isReady) {
      console.log('useEffect - Router not ready yet');
      return;
    }
    
    console.log('useEffect - Starting game initialization:', { gameId, playerId, playerName, buyIn });
    
    // Reset store when entering new game
    reset();
    setLoading(true);
    
    // Join the game first, then load state
    console.log('useEffect - Calling joinGame then loadGameState');
    joinGame().then(() => {
      console.log('useEffect - joinGame completed, now calling loadGameState');
      loadGameState();
    });

    // Set up auto-refresh every 15 seconds (changed from 2 seconds)
    const interval = setInterval(loadGameState, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, gameId, playerId, playerName]);

  // Cleanup on unmount
  useEffect(() => reset
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , []);

  // Loading state - dark theme
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
      >
        <motion.div
          className="text-center"
          initial={{ scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-medium">
            {connecting ? 'Joining game...' : 'Loading poker table...'}
          </div>
          <div className="text-gray-300 text-sm mt-2">
            Please wait while we set up your game
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state - dark theme
  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
      >
        <motion.div
          className="p-8 rounded-xl max-w-md w-full shadow-lg border-2"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            borderColor: '#DC2626',
            backdropFilter: 'blur(8px)'
          }}
          initial={{ y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(220, 38, 38, 0.2)' }}
            >
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-3 text-white">Game Error</h2>
            <p className="mb-6 text-red-300">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  clearError();
                  setLoading(true);
                  loadGameState();
                }}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  borderColor: '#F87171',
                  color: 'white'
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2"
                style={{
                  background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                  borderColor: '#6B7280',
                  color: 'white'
                }}
              >
                Return Home
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Game not found - dark theme
  if (!gameState) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
      >
        <motion.div
          className="p-8 rounded-xl max-w-md w-full text-center shadow-lg border-2"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            borderColor: '#374151',
            backdropFilter: 'blur(8px)'
          }}
          initial={{ y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(107, 114, 128, 0.2)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-3 text-white">Game Not Found</h2>
          <p className="mb-6 text-white">
            The game you&apos;re looking for doesn&apos;t exist or has ended.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-3 rounded-lg font-medium transition-all border-2"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              borderColor: '#60A5FA',
              color: 'white'
            }}
          >
            Return to Lobby
          </button>
        </motion.div>
      </div>
    );
  }

  // Main game view
  return (
    <div>
      {/* Error banner */}
      {error && (
        <motion.div
          className="text-white p-3 text-center relative z-50"
          style={{ background: 'rgba(220, 38, 38, 0.9)' }}
                      initial={{ y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ y: -50 }}
        >
          <div className="flex items-center justify-center gap-4">
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="underline hover:no-underline font-medium"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div
          className="text-white p-3 text-xs fixed top-0 left-0 z-50 max-w-sm rounded-br-lg backdrop-blur-sm border-r border-b border-gray-600"
          style={{ background: 'rgba(255, 255, 255, 0.8)' }}
                      initial={{ x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="space-y-1">
            <div><strong className="text-green-400">Player ID:</strong> <span className="text-gray-300">{playerId}</span></div>
            <div><strong className="text-green-400">Player Name:</strong> <span className="text-gray-300">{playerName}</span></div>
            <div><strong className="text-green-400">Buy-in:</strong> <span className="text-gray-300">{buyIn}</span></div>
            <div><strong className="text-green-400">Seated Players:</strong> <span className="text-gray-300">{gameState?.table.seats.filter(s => s.player).length}</span></div>
            <div><strong className="text-green-400">My Seat:</strong> <span className="text-gray-300">{gameState?.table.seats.find(s => s.player?.id === playerId)?.index ?? 'Not seated'}</span></div>
            <div><strong className="text-green-400">Stage:</strong> <span className="text-gray-300">{gameState?.stage}</span></div>
            <div><strong className="text-green-400">Hand Active:</strong> <span className="text-gray-300">{gameState?.isHandActive ? 'Yes' : 'No'}</span></div>
            <div><strong className="text-green-400">Seats:</strong> <span className="text-gray-300">{gameState?.table.seats.map((s, i) => `${i}:${s.player ? s.player.name.slice(0,3) : 'empty'}`).join(' ')}</span></div>
          </div>
        </motion.div>
      )}

      {/* PixiJS poker table */}
      <PixiPokerTable
        gameState={gameState}
        currentPlayerId={playerId as string}
        legalActions={legalActions}
        onAction={handleAction}
        onStartHand={handleStartHand}
        onLeaveGame={handleLeaveGame}
        onShowdown={handleShowdown}
        onAwardWinnings={handleAwardWinnings}
        onCompleteHand={handleCompleteHand}
        showAllCards={false} // Set to true for debugging
      />
    </div>
  );
} 