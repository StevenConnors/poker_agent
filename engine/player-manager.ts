import { GameState, Player, Seat, Table, JoinGameConfig, PokerError, Result } from './types';

/**
 * Initialize empty seats for a table
 */
export function initializeSeats(maxPlayers: number): Seat[] {
  const seats: Seat[] = [];
  for (let i = 0; i < maxPlayers; i++) {
    seats.push({
      index: i,
      player: null,
      isEmpty: true
    });
  }
  return seats;
}

/**
 * Find the next available seat index
 */
export function findEmptySeat(table: Table): number | null {
  for (let i = 0; i < table.seats.length; i++) {
    if (table.seats[i].isEmpty) {
      return i;
    }
  }
  return null;
}

/**
 * Get all active (connected and not out) players
 */
export function getActivePlayers(gameState: GameState): Player[] {
  return gameState.table.seats
    .filter(seat => !seat.isEmpty && seat.player !== null)
    .map(seat => seat.player!)
    .filter(player => player.status !== 'out' && player.isConnected);
}

/**
 * Get all seated players (including disconnected)
 */
export function getSeatedPlayers(gameState: GameState): Player[] {
  return gameState.table.seats
    .filter(seat => !seat.isEmpty && seat.player !== null)
    .map(seat => seat.player!);
}

/**
 * Find a player by ID
 */
export function findPlayerById(gameState: GameState, playerId: string): { player: Player; seatIndex: number } | null {
  for (let i = 0; i < gameState.table.seats.length; i++) {
    const seat = gameState.table.seats[i];
    if (!seat.isEmpty && seat.player && seat.player.id === playerId) {
      return { player: seat.player, seatIndex: i };
    }
  }
  return null;
}

/**
 * Check if a game has minimum players to start
 */
export function hasMinimumPlayers(gameState: GameState): boolean {
  const activePlayers = getActivePlayers(gameState);
  return activePlayers.length >= gameState.table.minPlayers;
}

/**
 * Check if game is full
 */
export function isGameFull(gameState: GameState): boolean {
  const seatedPlayers = getSeatedPlayers(gameState);
  return seatedPlayers.length >= gameState.table.maxPlayers;
}

/**
 * Add a player to the game
 */
export function joinGame(gameState: GameState, config: JoinGameConfig): Result<GameState, PokerError> {
  // Check if game is full
  if (isGameFull(gameState)) {
    return { ok: false, error: PokerError.GameFull };
  }

  // Check if player already exists
  const existingPlayer = findPlayerById(gameState, config.playerId);
  if (existingPlayer) {
    // Player reconnecting - just mark as connected
    const newGameState = { ...gameState };
    const seat = newGameState.table.seats[existingPlayer.seatIndex];
    if (seat.player) {
      seat.player.isConnected = true;
    }
    return { ok: true, value: newGameState };
  }

  // Find available seat
  let seatIndex: number;
  if (config.seatIndex !== undefined) {
    // Specific seat requested
    if (config.seatIndex < 0 || config.seatIndex >= gameState.table.seats.length) {
      return { ok: false, error: PokerError.InvalidSeat };
    }
    if (!gameState.table.seats[config.seatIndex].isEmpty) {
      return { ok: false, error: PokerError.SeatTaken };
    }
    seatIndex = config.seatIndex;
  } else {
    // Auto-assign seat
    const emptySeat = findEmptySeat(gameState.table);
    if (emptySeat === null) {
      return { ok: false, error: PokerError.GameFull };
    }
    seatIndex = emptySeat;
  }

  // Create new player
  const newPlayer: Player = {
    id: config.playerId,
    name: config.playerName,
    stack: config.buyIn,
    status: 'waiting', // Will become 'active' when hand starts
    hole: [],
    seatIndex,
    isConnected: true
  };

  // Create new game state with player added
  const newGameState: GameState = {
    ...gameState,
    table: {
      ...gameState.table,
      seats: gameState.table.seats.map((seat, i) => {
        if (i === seatIndex) {
          return {
            index: i,
            player: newPlayer,
            isEmpty: false
          };
        }
        return seat;
      })
    }
  };

  return { ok: true, value: newGameState };
}

/**
 * Remove a player from the game
 */
export function leaveGame(gameState: GameState, playerId: string): Result<GameState, PokerError> {
  const playerInfo = findPlayerById(gameState, playerId);
  if (!playerInfo) {
    return { ok: false, error: PokerError.PlayerNotFound };
  }

  // If game is active and player is in the hand, mark as disconnected instead of removing
  if (gameState.isHandActive && playerInfo.player.status === 'active') {
    const newGameState = { ...gameState };
    const seat = newGameState.table.seats[playerInfo.seatIndex];
    if (seat.player) {
      seat.player.isConnected = false;
      seat.player.status = 'folded'; // Auto-fold if disconnected during hand
    }
    return { ok: true, value: newGameState };
  }

  // Remove player completely
  const newGameState: GameState = {
    ...gameState,
    table: {
      ...gameState.table,
      seats: gameState.table.seats.map((seat, i) => {
        if (i === playerInfo.seatIndex) {
          return {
            index: i,
            player: null,
            isEmpty: true
          };
        }
        return seat;
      })
    }
  };

  return { ok: true, value: newGameState };
}

/**
 * Get next player index for action (skips empty seats and folded players)
 */
export function getNextActivePlayerIndex(gameState: GameState, currentIndex: number): number | null {
  const {seats} = gameState.table;
  let nextIndex = (currentIndex + 1) % seats.length;
  let attempts = 0;

  while (attempts < seats.length) {
    const seat = seats[nextIndex];
    if (!seat.isEmpty && seat.player && 
        seat.player.status === 'active' && 
        seat.player.isConnected) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % seats.length;
    attempts++;
  }

  return null; // No active players found
}

/**
 * Get next available player index (includes waiting players - used for determining blind positions)
 */
export function getNextAvailablePlayerIndex(gameState: GameState, currentIndex: number): number | null {
  const {seats} = gameState.table;
  let nextIndex = (currentIndex + 1) % seats.length;
  let attempts = 0;

  while (attempts < seats.length) {
    const seat = seats[nextIndex];
    if (!seat.isEmpty && seat.player && 
        seat.player.status !== 'out' && 
        seat.player.isConnected) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % seats.length;
    attempts++;
  }

  return null; // No available players found
}

/**
 * Get the button (dealer) position
 */
export function getButtonPosition(gameState: GameState): number | null {
  if (gameState.table.buttonIndex < 0 || gameState.table.buttonIndex >= gameState.table.seats.length) {
    return null;
  }
  return gameState.table.buttonIndex;
}

/**
 * Move button to next active player
 */
export function moveButton(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);
  if (activePlayers.length < 2) {
    return gameState; // Can't move button with less than 2 players
  }

  let newButtonIndex = gameState.table.buttonIndex;
  let attempts = 0;

  do {
    newButtonIndex = (newButtonIndex + 1) % gameState.table.seats.length;
    attempts++;
  } while (
    attempts < gameState.table.seats.length &&
    (gameState.table.seats[newButtonIndex].isEmpty || 
     !gameState.table.seats[newButtonIndex].player ||
     gameState.table.seats[newButtonIndex].player!.status === 'out' ||
     !gameState.table.seats[newButtonIndex].player!.isConnected)
  );

  return {
    ...gameState,
    table: {
      ...gameState.table,
      buttonIndex: newButtonIndex
    }
  };
}

/**
 * Get small blind and big blind positions
 */
export function getBlindPositions(gameState: GameState): { smallBlind: number | null; bigBlind: number | null } {
  const activePlayers = getActivePlayers(gameState);
  if (activePlayers.length < 2) {
    return { smallBlind: null, bigBlind: null };
  }

  let {buttonIndex} = gameState.table;
  
  // Ensure button is on a valid player seat
  const buttonSeat = gameState.table.seats[buttonIndex];
  if (!buttonSeat || buttonSeat.isEmpty || !buttonSeat.player || 
      buttonSeat.player.status === 'out' || !buttonSeat.player.isConnected) {
    // Find first available player to position button
    buttonIndex = getNextAvailablePlayerIndex(gameState, buttonIndex - 1) || 0;
  }

  if (activePlayers.length === 2) {
    // Heads-up: button is small blind
    return {
      smallBlind: buttonIndex,
      bigBlind: getNextAvailablePlayerIndex(gameState, buttonIndex)
    };
  } 
    // Multi-way: small blind is next to button, big blind is after small blind
    const smallBlindIndex = getNextAvailablePlayerIndex(gameState, buttonIndex);
    const bigBlindIndex = smallBlindIndex !== null ? 
      getNextAvailablePlayerIndex(gameState, smallBlindIndex) : null;
    
    return {
      smallBlind: smallBlindIndex,
      bigBlind: bigBlindIndex
    };
  
}

/**
 * Validate game state for starting a hand
 */
export function canStartHand(gameState: GameState): { canStart: boolean; reason?: string } {
  const activePlayers = getActivePlayers(gameState);
  
  if (activePlayers.length < gameState.table.minPlayers) {
    return { 
      canStart: false, 
      reason: `Need at least ${gameState.table.minPlayers} players to start. Currently have ${activePlayers.length}.` 
    };
  }

  const { smallBlind, bigBlind } = getBlindPositions(gameState);
  if (smallBlind === null || bigBlind === null) {
    return { 
      canStart: false, 
      reason: 'Cannot determine blind positions.' 
    };
  }

  // Check if players have enough chips for blinds
  const sbPlayer = gameState.table.seats[smallBlind].player;
  const bbPlayer = gameState.table.seats[bigBlind].player;
  
  if (!sbPlayer || sbPlayer.stack < gameState.table.smallBlind) {
    return { 
      canStart: false, 
      reason: 'Small blind player has insufficient chips.' 
    };
  }

  if (!bbPlayer || bbPlayer.stack < gameState.table.bigBlind) {
    return { 
      canStart: false, 
      reason: 'Big blind player has insufficient chips.' 
    };
  }

  return { canStart: true };
} 