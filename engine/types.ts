export type Suit = 'c' | 'd' | 'h' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface Deck {
  cards: Card[];
  shuffle(seed?: string): void;
  deal(n: number): Card[];
}

// Hand ranking system
export type HandRank = 
  | 'high-card'
  | 'pair' 
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush';

export interface HandEvaluation {
  rank: HandRank;
  value: number; // Numeric value for comparison
  kickers: Rank[]; // Tie-breaking cards
  cards: Card[]; // The 5 cards that make the hand
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out' | 'waiting';

export interface Player {
  id: string;
  name: string;
  stack: number;
  status: PlayerStatus;
  hole: Card[];
  seatIndex?: number; // Position at table (0-8 for max 9 players)
  isConnected: boolean; // Track if player is still connected
}

// Enhanced seat management
export interface Seat {
  index: number;
  player: Player | null;
  isEmpty: boolean;
}

export interface Table {
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
  seats: Seat[]; // Up to 9 seats
  maxPlayers: number;
  minPlayers: number;
}

// Enhanced pot management for side pots
export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
  maxContribution: number; // Max any player contributed to this pot
}

export interface PotManager {
  mainPot: number;
  sidePots: SidePot[];
  totalPot: number;
}

// Betting round management
export interface BettingRound {
  stage: Stage;
  currentBet: number;
  lastRaiseAmount: number;
  lastRaiserIndex: number;
  actionIndex: number; // Current player to act
  betsThisRound: number[]; // Indexed by seat
  playersActed: boolean[]; // Track who has acted this round
  isComplete: boolean;
}

export type Stage = 'init' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

export interface GameState {
  gameId: string;
  stage: Stage;
  board: Card[];
  deck: Card[]; // Remaining cards in deck
  bettingRound: BettingRound;
  history: Action[];
  table: Table;
  potManager: PotManager;
  handsPlayed: number;
  isHandActive: boolean;
  winners?: ShowdownResult[];
}

export type ActionType = 'fold' | 'call' | 'check' | 'bet' | 'raise' | 'all-in' | 'post-sb' | 'post-bb';

export interface Action {
  type: ActionType;
  amount?: number;
  playerId: string;
  seatIndex: number;
  timestamp: number;
}

export enum PokerError {
  InvalidAction = 'InvalidAction',
  InsufficientStack = 'InsufficientStack',
  NotPlayersTurn = 'NotPlayersTurn',
  GameNotStarted = 'GameNotStarted',
  GameFull = 'GameFull',
  PlayerNotFound = 'PlayerNotFound',
  SeatTaken = 'SeatTaken',
  InvalidSeat = 'InvalidSeat',
  MinPlayersNotMet = 'MinPlayersNotMet',
  Unknown = 'Unknown',
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface NewGameConfig {
  gameId: string;
  smallBlind?: number;
  bigBlind?: number;
  maxPlayers?: number;
  minPlayers?: number;
  buttonIndex?: number;
}

export interface JoinGameConfig {
  gameId: string;
  playerId: string;
  playerName: string;
  buyIn: number;
  seatIndex?: number; // If not provided, auto-assign
}

export interface ShowdownResult {
  playerId: string;
  seatIndex: number;
  hand: HandEvaluation;
  amountWon: number;
  potType: 'main' | 'side';
}

export interface Agent {
  decide(gs: Readonly<GameState>, legal: Readonly<Action[]>): Promise<Action>;
} 