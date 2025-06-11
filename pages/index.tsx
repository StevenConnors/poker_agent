import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PlusIcon, PlayIcon, UsersIcon } from '@heroicons/react/24/outline';

interface GameSummary {
  gameId: string;
  playerCount: number;
  maxPlayers: number;
  canStart: boolean;
}

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player info for joining games
  const [playerName, setPlayerName] = useState('');
  const [buyIn, setBuyIn] = useState(100);

  const loadGames = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'listGamesDetailed' }),
      });
      const result = await response.json();
      
      if (result.ok) {
        setGames(result.value);
      } else {
        setError('Failed to load games');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const createNewGame = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          op: 'createEmptyGame',
          payload: {
            maxPlayers: 6,
            minPlayers: 2,
            smallBlind: 1,
            bigBlind: 2
          }
        }),
      });
      const result = await response.json();
      
      if (result.ok) {
        await loadGames(); // Refresh the list
      } else {
        setError('Failed to create game');
      }
    } catch {
      setError('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'joinGame',
          payload: {
            gameId,
            playerId,
            playerName: playerName.trim(),
            buyIn
          }
        }),
      });
      const result = await response.json();
      
      if (result.ok) {
        // Navigate to the game page with player info
        router.push(`/game/${gameId}?playerId=${playerId}&playerName=${encodeURIComponent(playerName)}&buyIn=${buyIn}`);
      } else {
        setError(result.error || 'Failed to join game');
      }
    } catch {
      setError('Failed to join game');
    }
  };

  useEffect(() => {
    loadGames();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadGames, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading poker rooms...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
                      <h1 className="text-6xl font-bold text-white mb-4">🃏 Poker Rooms</h1>
            <p className="text-green-100 text-xl">Choose a table and start playing Texas Hold&apos;em</p>
        </div>

        {/* Player Info Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Player Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-white mb-2">Buy-in Amount</label>
              <input
                type="number"
                value={buyIn}
                onChange={(e) => setBuyIn(parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                min="50"
                max="1000"
              />
            </div>
          </div>
        </div>

        {/* Create Game Button */}
        <div className="text-center mb-8">
          <button
            onClick={createNewGame}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-3 mx-auto transition-colors"
          >
            <PlusIcon className="h-6 w-6" />
            Create New Game
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Games List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.length === 0 ? (
            <div className="col-span-full text-center py-12">
                                <div className="text-white/60 text-xl mb-4">No poker rooms available</div>
                  <div className="text-white/40">Create a new game to get started!</div>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.gameId}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Room {game.gameId.replace('game_', '')}
                    </h3>
                    <div className="flex items-center gap-2 text-green-200">
                      <UsersIcon className="h-5 w-5" />
                      <span>{game.playerCount}/{game.maxPlayers} players</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    game.canStart 
                      ? 'bg-green-500/20 text-green-200 border border-green-500/30' 
                      : 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                  }`}>
                    {game.canStart ? 'Ready to Start' : 'Waiting for Players'}
                  </div>
                </div>

                <div className="text-white/80 text-sm mb-4">
                  Blinds: $1/$2 • Buy-in: $50-$1000
                </div>

                <button
                  onClick={() => joinGame(game.gameId)}
                  disabled={!playerName.trim() || game.playerCount >= game.maxPlayers}
                  className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                    playerName.trim() && game.playerCount < game.maxPlayers
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <PlayIcon className="h-5 w-5" />
                  {game.playerCount >= game.maxPlayers ? 'Room Full' : 'Join Game'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/60">
          <p>Texas Hold&apos;em • No Limit • Created with ♠️ ♥️ ♣️ ♦️</p>
        </div>
      </div>
    </div>
  );
} 