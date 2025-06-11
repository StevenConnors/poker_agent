import { GameState, Card, Rank, Suit } from './types';
import { getBlindPositions } from './player-manager';

// Card deck creation and management
const SUITS: Suit[] = ['c', 'd', 'h', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Shuffle deck using Fisher-Yates algorithm with optional seed for deterministic results
 */
export function shuffleDeck(deck: Card[], seed?: string): Card[] {
  const shuffled = [...deck];
  let random = seed ? seededRandom(seed) : Math.random;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Simple seeded random number generator for deterministic testing
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

/**
 * Get active player seat indices
 */
function getActivePlayerIndices(gameState: GameState): number[] {
  return gameState.table.seats
    .map((seat, index) => ({ seat, index }))
    .filter(({ seat }) => 
      seat.player && 
      (seat.player.status === 'active' || seat.player.status === 'waiting') && 
      seat.player.isConnected
    )
    .map(({ index }) => index);
}

/**
 * Deal hole cards to all active players
 */
function dealHoleCards(gameState: GameState, deck: Card[]): { updatedGameState: GameState; cardsDealt: number } {
  const activeIndices = getActivePlayerIndices(gameState);
  let cardsDealt = 0;
  
  const updatedSeats = gameState.table.seats.map(seat => {
    if (seat.player && activeIndices.includes(seat.index)) {
      // Deal 2 hole cards
      const holeCards = [deck[cardsDealt], deck[cardsDealt + 1]];
      cardsDealt += 2;
      
      return {
        ...seat,
        player: {
          ...seat.player,
          hole: holeCards,
          status: 'active' as const
        }
      };
    }
    return seat;
  });
  
  return {
    updatedGameState: {
      ...gameState,
      table: {
        ...gameState.table,
        seats: updatedSeats
      }
    },
    cardsDealt
  };
}

/**
 * Post blinds for the current hand
 */
function postBlinds(gameState: GameState): GameState {
  const { smallBlind, bigBlind } = getBlindPositions(gameState);
  
  if (smallBlind === null || bigBlind === null) {
    throw new Error('Cannot determine blind positions');
  }
  
  // Calculate blind amounts before modifying stacks
  const sbPlayer = gameState.table.seats[smallBlind].player!;
  const bbPlayer = gameState.table.seats[bigBlind].player!;
  const sbAmount = Math.min(gameState.table.smallBlind, sbPlayer.stack);
  const bbAmount = Math.min(gameState.table.bigBlind, bbPlayer.stack);
  
  const updatedSeats = gameState.table.seats.map((seat, index) => {
    if (!seat.player) return seat;
    
    let blindAmount = 0;
    if (index === smallBlind) {
      blindAmount = sbAmount;
    } else if (index === bigBlind) {
      blindAmount = bbAmount;
    }
    
    if (blindAmount > 0) {
      return {
        ...seat,
        player: {
          ...seat.player,
          stack: seat.player.stack - blindAmount
        }
      };
    }
    
    return seat;
  });
  
  // Update betting round with blind amounts
  const betsThisRound = Array(gameState.table.seats.length).fill(0);
  betsThisRound[smallBlind] = sbAmount;
  betsThisRound[bigBlind] = bbAmount;
  
  return {
    ...gameState,
    table: {
      ...gameState.table,
      seats: updatedSeats
    },
    bettingRound: {
      ...gameState.bettingRound,
      betsThisRound,
      currentBet: bbAmount,
      actionIndex: getNextActivePlayerAfterBlinds(gameState, bigBlind)
    },
    potManager: {
      ...gameState.potManager,
      mainPot: 0,
      totalPot: 0
    }
  };
}

/**
 * Get the next active player to act after blinds are posted
 */
function getNextActivePlayerAfterBlinds(gameState: GameState, bigBlindIndex: number): number {
  const activeIndices = getActivePlayerIndices(gameState);
  const currentIndex = activeIndices.findIndex(index => index === bigBlindIndex);
  
  if (currentIndex === -1) {
    throw new Error('Big blind player not found in active players');
  }
  
  // Next player after big blind
  return activeIndices[(currentIndex + 1) % activeIndices.length];
}

/**
 * Start a new hand - main function to call
 */
export function startHand(gameState: GameState, seed?: string): GameState {
  // Create and shuffle new deck
  const deck = shuffleDeck(createDeck(), seed);
  
  // Deal hole cards to active players
  const { updatedGameState: stateWithCards, cardsDealt } = dealHoleCards(gameState, deck);
  
  // Post blinds
  const stateWithBlinds = postBlinds(stateWithCards);
  
  // Update game state for new hand
  const newGameState: GameState = {
    ...stateWithBlinds,
    stage: 'preflop',
    board: [],
    deck: deck.slice(cardsDealt), // Remaining cards after dealing hole cards
    history: [],
    handsPlayed: gameState.handsPlayed, // Don't increment here - increment in completeHand instead
    isHandActive: true,
    bettingRound: {
      ...stateWithBlinds.bettingRound,
      stage: 'preflop',
      isComplete: false
    }
  };
  
  return newGameState;
}

/**
 * Check if a hand can be started
 */
export function validateHandStart(gameState: GameState): { canStart: boolean; reason?: string } {
  const activeIndices = getActivePlayerIndices(gameState);
  
  if (activeIndices.length < gameState.table.minPlayers) {
    return { 
      canStart: false, 
      reason: `Need at least ${gameState.table.minPlayers} players to start. Currently have ${activeIndices.length}.` 
    };
  }
  
  if (gameState.isHandActive) {
    return {
      canStart: false,
      reason: 'A hand is already in progress.'
    };
  }
  
  const { smallBlind, bigBlind } = getBlindPositions(gameState);
  if (smallBlind === null || bigBlind === null) {
    return { 
      canStart: false, 
      reason: 'Cannot determine blind positions.' 
    };
  }
  
  // Check if blind players have enough chips
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