import { 
  initializeSeats, 
  findEmptySeat, 
  getActivePlayers, 
  getSeatedPlayers,
  findPlayerById,
  hasMinimumPlayers,
  isGameFull,
  joinGame,
  leaveGame,
  getNextActivePlayerIndex,
  moveButton,
  getBlindPositions,
  canStartHand
} from '../player-manager';
import { GameState, Table, NewGameConfig, JoinGameConfig, PokerError } from '../types';

// Helper function to create a basic game state
function createTestGameState(maxPlayers = 6, minPlayers = 2): GameState {
  const table: Table = {
    buttonIndex: 0,
    smallBlind: 1,
    bigBlind: 2,
    seats: initializeSeats(maxPlayers),
    maxPlayers,
    minPlayers
  };

  return {
    gameId: 'test-game',
    stage: 'init',
    board: [],
    deck: [],
    bettingRound: {
      stage: 'init',
      currentBet: 0,
      lastRaiseAmount: 0,
      lastRaiserIndex: -1,
      actionIndex: 0,
      betsThisRound: Array(maxPlayers).fill(0),
      playersActed: Array(maxPlayers).fill(false),
      isComplete: false
    },
    history: [],
    table,
    potManager: {
      mainPot: 0,
      sidePots: [],
      totalPot: 0
    },
    handsPlayed: 0,
    isHandActive: false
  };
}

// Helper function to create join config
function createJoinConfig(playerId: string, playerName: string, buyIn = 1000, seatIndex?: number): JoinGameConfig {
  return {
    gameId: 'test-game',
    playerId,
    playerName,
    buyIn,
    seatIndex
  };
}

describe('Player Manager', () => {
  describe('initializeSeats', () => {
    test('should create correct number of empty seats', () => {
      const seats = initializeSeats(6);
      expect(seats).toHaveLength(6);
      seats.forEach((seat, index) => {
        expect(seat.index).toBe(index);
        expect(seat.player).toBeNull();
        expect(seat.isEmpty).toBe(true);
      });
    });

    test('should handle different table sizes', () => {
      expect(initializeSeats(2)).toHaveLength(2);
      expect(initializeSeats(9)).toHaveLength(9);
    });
  });

  describe('findEmptySeat', () => {
    test('should find first empty seat', () => {
      const gameState = createTestGameState();
      const emptySeat = findEmptySeat(gameState.table);
      expect(emptySeat).toBe(0);
    });

    test('should return null when no empty seats', () => {
      const gameState = createTestGameState(2);
      // Fill all seats
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Player 1'));
      expect(result1.ok).toBe(true);
      if (!result1.ok) return; // Type guard
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Player 2'));
      expect(result2.ok).toBe(true);
      if (!result2.ok) return; // Type guard

      const emptySeat = findEmptySeat(result2.value.table);
      expect(emptySeat).toBeNull();
    });
  });

  describe('getActivePlayers', () => {
    test('should return empty array for empty game', () => {
      const gameState = createTestGameState();
      expect(getActivePlayers(gameState)).toHaveLength(0);
    });

    test('should return only connected and non-out players', () => {
      let gameState = createTestGameState();
      
      // Add players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Player 1'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Player 2'));
      if (!result2.ok) throw new Error('Failed to add player2');
      const result3 = joinGame(result2.value, createJoinConfig('player3', 'Player 3'));
      if (!result3.ok) throw new Error('Failed to add player3');
      gameState = result3.value;

      // Modify player statuses
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[0].player!.isConnected = true;
      
      gameState.table.seats[1].player!.status = 'out';
      gameState.table.seats[1].player!.isConnected = true;
      
      gameState.table.seats[2].player!.status = 'active';
      gameState.table.seats[2].player!.isConnected = false;

      const activePlayers = getActivePlayers(gameState);
      expect(activePlayers).toHaveLength(1);
      expect(activePlayers[0].id).toBe('player1');
    });
  });

  describe('joinGame', () => {
    test('should successfully add player to empty game', () => {
      const gameState = createTestGameState();
      const result = joinGame(gameState, createJoinConfig('player1', 'Alice', 1000));
      
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const newState = result.value;
      expect(newState.table.seats[0].isEmpty).toBe(false);
      expect(newState.table.seats[0].player!.id).toBe('player1');
      expect(newState.table.seats[0].player!.name).toBe('Alice');
      expect(newState.table.seats[0].player!.stack).toBe(1000);
      expect(newState.table.seats[0].player!.seatIndex).toBe(0);
      expect(newState.table.seats[0].player!.isConnected).toBe(true);
      expect(newState.table.seats[0].player!.status).toBe('waiting');
    });

    test('should assign specific seat when requested', () => {
      const gameState = createTestGameState();
      const result = joinGame(gameState, createJoinConfig('player1', 'Alice', 1000, 3));
      
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const newState = result.value;
      expect(newState.table.seats[3].isEmpty).toBe(false);
      expect(newState.table.seats[3].player!.id).toBe('player1');
      expect(newState.table.seats[3].player!.seatIndex).toBe(3);
    });

    test('should reject join when specific seat is taken', () => {
      let gameState = createTestGameState();
      
      // Add first player to seat 2
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice', 1000, 2));
      expect(result1.ok).toBe(true);
      if (!result1.ok) return;
      gameState = result1.value;

      // Try to add second player to same seat
      const result2 = joinGame(gameState, createJoinConfig('player2', 'Bob', 1000, 2));
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toBe(PokerError.SeatTaken);
      }
    });

    test('should reject join when game is full', () => {
      let gameState = createTestGameState(2); // Max 2 players
      
      // Fill the game
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      expect(result2.ok).toBe(true);
      if (!result2.ok) return;
      gameState = result2.value;

      // Try to add third player
      const result3 = joinGame(gameState, createJoinConfig('player3', 'Charlie'));
      expect(result3.ok).toBe(false);
      if (!result3.ok) {
        expect(result3.error).toBe(PokerError.GameFull);
      }
    });

    test('should handle player reconnection', () => {
      let gameState = createTestGameState();
      
      // Add player and then disconnect them
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      gameState = result1.value;
      gameState.table.seats[0].player!.isConnected = false;

      // Player rejoins
      const result2 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      expect(result2.ok).toBe(true);
      if (!result2.ok) return;
      expect(result2.value.table.seats[0].player!.isConnected).toBe(true);
    });

    test('should reject invalid seat index', () => {
      const gameState = createTestGameState(6);
      const result = joinGame(gameState, createJoinConfig('player1', 'Alice', 1000, 10));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(PokerError.InvalidSeat);
      }
    });
  });

  describe('leaveGame', () => {
    test('should successfully remove player from game', () => {
      let gameState = createTestGameState();
      
      // Add player
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player');
      gameState = result1.value;
      expect(gameState.table.seats[0].isEmpty).toBe(false);

      // Remove player
      const result2 = leaveGame(gameState, 'player1');
      expect(result2.ok).toBe(true);
      if (!result2.ok) return;
      expect(result2.value.table.seats[0].isEmpty).toBe(true);
      expect(result2.value.table.seats[0].player).toBeNull();
    });

    test('should disconnect player during active hand instead of removing', () => {
      let gameState = createTestGameState();
      
      // Add player and start hand
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player');
      gameState = result1.value;
      gameState.isHandActive = true;
      gameState.table.seats[0].player!.status = 'active';

      // Player leaves during hand
      const result2 = leaveGame(gameState, 'player1');
      expect(result2.ok).toBe(true);
      if (!result2.ok) return;
      const newState = result2.value;
      expect(newState.table.seats[0].isEmpty).toBe(false); // Still seated
      expect(newState.table.seats[0].player!.isConnected).toBe(false); // But disconnected
      expect(newState.table.seats[0].player!.status).toBe('folded'); // And folded
    });

    test('should return error for non-existent player', () => {
      const gameState = createTestGameState();
      const result = leaveGame(gameState, 'non-existent');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(PokerError.PlayerNotFound);
      }
    });
  });

  describe('getNextActivePlayerIndex', () => {
    test('should find next active player', () => {
      let gameState = createTestGameState();
      
      // Add three players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      if (!result2.ok) throw new Error('Failed to add player2');
      const result3 = joinGame(result2.value, createJoinConfig('player3', 'Charlie'));
      if (!result3.ok) throw new Error('Failed to add player3');
      gameState = result3.value;

      // Set all as active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';
      gameState.table.seats[2].player!.status = 'active';

      expect(getNextActivePlayerIndex(gameState, 0)).toBe(1);
      expect(getNextActivePlayerIndex(gameState, 1)).toBe(2);
      expect(getNextActivePlayerIndex(gameState, 2)).toBe(0); // Wraps around
    });

    test('should skip folded and disconnected players', () => {
      let gameState = createTestGameState();
      
      // Add three players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      if (!result2.ok) throw new Error('Failed to add player2');
      const result3 = joinGame(result2.value, createJoinConfig('player3', 'Charlie'));
      if (!result3.ok) throw new Error('Failed to add player3');
      gameState = result3.value;

      // Set statuses
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'folded'; // Skip this one
      gameState.table.seats[2].player!.status = 'active';

      expect(getNextActivePlayerIndex(gameState, 0)).toBe(2); // Skips seat 1
    });

    test('should return null when no active players', () => {
      const gameState = createTestGameState();
      expect(getNextActivePlayerIndex(gameState, 0)).toBeNull();
    });
  });

  describe('getBlindPositions', () => {
    test('should return correct positions for heads-up', () => {
      let gameState = createTestGameState();
      
      // Add two players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      if (!result2.ok) throw new Error('Failed to add player2');
      gameState = result2.value;
      
      // Set both as active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';
      gameState.table.buttonIndex = 0;

      const { smallBlind, bigBlind } = getBlindPositions(gameState);
      expect(smallBlind).toBe(0); // Button is small blind in heads-up
      expect(bigBlind).toBe(1);
    });

    test('should return correct positions for multi-way', () => {
      let gameState = createTestGameState();
      
      // Add three players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      if (!result2.ok) throw new Error('Failed to add player2');
      const result3 = joinGame(result2.value, createJoinConfig('player3', 'Charlie'));
      if (!result3.ok) throw new Error('Failed to add player3');
      gameState = result3.value;
      
      // Set all as active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';
      gameState.table.seats[2].player!.status = 'active';
      gameState.table.buttonIndex = 0;

      const { smallBlind, bigBlind } = getBlindPositions(gameState);
      expect(smallBlind).toBe(1); // Next to button
      expect(bigBlind).toBe(2); // After small blind
    });
  });

  describe('canStartHand', () => {
    test('should allow starting with minimum players', () => {
      let gameState = createTestGameState(6, 2);
      
      // Add two players with sufficient stacks
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice', 100));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob', 100));
      if (!result2.ok) throw new Error('Failed to add player2');
      gameState = result2.value;
      
      // Set both as active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';

      const result = canStartHand(gameState);
      expect(result.canStart).toBe(true);
    });

    test('should prevent starting with insufficient players', () => {
      const gameState = createTestGameState(6, 2);
      const result = canStartHand(gameState);
      expect(result.canStart).toBe(false);
      expect(result.reason).toContain('Need at least 2 players');
    });

    test('should prevent starting when blind players have insufficient chips', () => {
      let gameState = createTestGameState(6, 2);
      
      // Add players with insufficient stacks for blinds
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice', 1)); // Less than SB
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob', 1)); // Less than BB
      if (!result2.ok) throw new Error('Failed to add player2');
      gameState = result2.value;
      
      // Set both as active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';

      const result = canStartHand(gameState);
      expect(result.canStart).toBe(false);
      expect(result.reason).toContain('insufficient chips');
    });
  });

  describe('moveButton', () => {
    test('should move button to next active player', () => {
      let gameState = createTestGameState();
      
      // Add three players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      if (!result2.ok) throw new Error('Failed to add player2');
      const result3 = joinGame(result2.value, createJoinConfig('player3', 'Charlie'));
      if (!result3.ok) throw new Error('Failed to add player3');
      gameState = result3.value;
      
      // Set all as active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';
      gameState.table.seats[2].player!.status = 'active';
      gameState.table.buttonIndex = 0;

      const newState = moveButton(gameState);
      expect(newState.table.buttonIndex).toBe(1);
    });

    test('should skip inactive players when moving button', () => {
      let gameState = createTestGameState();
      
      // Add three players
      const result1 = joinGame(gameState, createJoinConfig('player1', 'Alice'));
      if (!result1.ok) throw new Error('Failed to add player1');
      const result2 = joinGame(result1.value, createJoinConfig('player2', 'Bob'));
      if (!result2.ok) throw new Error('Failed to add player2');
      const result3 = joinGame(result2.value, createJoinConfig('player3', 'Charlie'));
      if (!result3.ok) throw new Error('Failed to add player3');
      gameState = result3.value;
      
      // Set player statuses
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'out'; // Skip this one
      gameState.table.seats[2].player!.status = 'active';
      gameState.table.buttonIndex = 0;

      const newState = moveButton(gameState);
      expect(newState.table.buttonIndex).toBe(2); // Skips seat 1
    });
  });
}); 