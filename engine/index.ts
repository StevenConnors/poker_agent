import { GameState, NewGameConfig, Action, PokerError, Result, ShowdownResult, Card, Rank, Suit, Player, Table, PotManager, ActionType } from './types';

// --- Deck implementation ---
const SUITS: Suit[] = ['c', 'd', 'h', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle<T>(array: T[], seed?: string): T[] {
  // Fisher-Yates shuffle, optionally seeded
  const arr = array.slice();
  let m = arr.length; let i;
  const random = seed ? seededRandom(seed) : Math.random;
  while (m) {
    i = Math.floor(random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

function seededRandom(seed: string): () => number {
  // Simple LCG for deterministic shuffling
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return function() {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getActivePlayers(gs: GameState): number[] {
  return gs.table.seats.map((p, i) => (p.status === 'active' || p.status === 'all-in' ? i : -1)).filter(i => i !== -1);
}

function currentPlayer(gs: GameState): Player {
  return gs.table.seats[gs.currentIndex];
}

function maxBet(bets: number[]): number {
  return Math.max(...bets);
}

function minRaise(gs: GameState): number {
  // NLHE: min raise is previous raise or big blind
  const bb = gs.table.bigBlind;
  const bets = gs.betsThisRound;
  const raises = bets.filter(b => b > bb);
  if (raises.length < 2) return bb;
  const sorted = [...raises].sort((a, b) => b - a);
  return sorted[0] - sorted[1];
} 

export function newGame(cfg: NewGameConfig): GameState {
  const deck = shuffle(createDeck(), cfg.buttonIndex?.toString() || undefined);
  const players: Player[] = cfg.players.map((p, i) => ({
    ...p,
    status: 'active',
    hole: [deck[i * 2], deck[i * 2 + 1]],
  }));
  const table: Table = {
    buttonIndex: cfg.buttonIndex ?? 0,
    smallBlind: cfg.smallBlind ?? 1,
    bigBlind: cfg.bigBlind ?? 2,
    seats: players,
  };
  const potManager: PotManager = { pots: [{ amount: 0, eligibleIds: players.map(p => p.id) }] };
  return {
    stage: 'preflop',
    board: [],
    currentIndex: (cfg.buttonIndex ?? 0 + 1) % players.length, // SB acts first
    betsThisRound: Array(players.length).fill(0),
    history: [],
    table,
    potManager,
  };
}

export function legalActions(gs: GameState): Action[] {
  const player = currentPlayer(gs);
  if (player.status !== 'active') return [];
  const bets = gs.betsThisRound;
  const maxB = maxBet(bets);
  const playerBet = bets[gs.currentIndex];
  const toCall = maxB - playerBet;
  const {stack} = player;
  const actions: Action[] = [];
  if (toCall === 0) {
    actions.push({ type: 'check' });
    if (stack > 0) actions.push({ type: 'bet', amount: 1 });
  } else {
    if (stack > toCall) actions.push({ type: 'call', amount: toCall });
    if (stack === toCall) actions.push({ type: 'all-in', amount: toCall });
    actions.push({ type: 'fold' });
    if (stack > toCall) actions.push({ type: 'raise', amount: toCall + minRaise(gs) });
  }
  return actions;
}

function nextPlayerIndex(gs: GameState): number {
  const n = gs.table.seats.length;
  const idx = gs.currentIndex;
  for (let i = 1; i < n; i++) {
    const ni = (idx + i) % n;
    const p = gs.table.seats[ni];
    if (p.status === 'active') return ni;
  }
  return -1;
}

function isBettingRoundOver(gs: GameState): boolean {
  const bets = gs.betsThisRound;
  const maxB = maxBet(bets);
  const active = getActivePlayers(gs);
  // Betting round is over if all active players have matched max bet or are all-in
  return active.every(i => {
    const p = gs.table.seats[i];
    return p.status !== 'active' || bets[i] === maxB || p.stack === 0;
  });
}

function advanceStage(gs: GameState, deck: Card[]): GameState {
  const nextStage: Record<string, string> = {
    preflop: 'flop',
    flop: 'turn',
    turn: 'river',
    river: 'showdown',
  };
  let board = gs.board.slice();
  if (gs.stage === 'preflop') board = deck.slice(-5, -2); // flop (3)
  if (gs.stage === 'flop') board = [...board, deck[deck.length - 2]]; // turn (1)
  if (gs.stage === 'turn') board = [...board, deck[deck.length - 1]]; // river (1)
  return {
    ...gs,
    stage: nextStage[gs.stage] as any,
    board,
    betsThisRound: Array(gs.table.seats.length).fill(0),
    currentIndex: nextPlayerIndex(gs),
  };
}

export function applyAction(gs: GameState, a: Action): Result<GameState, PokerError> {
  const player = currentPlayer(gs);
  if (player.status !== 'active') return { ok: false, error: PokerError.InvalidAction };
  const bets = gs.betsThisRound.slice();
  const seats = gs.table.seats.map(p => ({ ...p }));
  const nextIdx = nextPlayerIndex(gs);
  switch (a.type) {
    case 'fold':
      seats[gs.currentIndex].status = 'folded';
      break;
    case 'call':
    case 'all-in': {
      const toCall = maxBet(bets) - bets[gs.currentIndex];
      const callAmt = Math.min(toCall, seats[gs.currentIndex].stack);
      bets[gs.currentIndex] += callAmt;
      seats[gs.currentIndex].stack -= callAmt;
      if (seats[gs.currentIndex].stack === 0) seats[gs.currentIndex].status = 'all-in';
      break;
    }
    case 'check':
      // No stack/bet change
      break;
    case 'bet':
    case 'raise': {
      const amt = a.amount ?? 0;
      if (amt > seats[gs.currentIndex].stack) return { ok: false, error: PokerError.InsufficientStack };
      bets[gs.currentIndex] += amt;
      seats[gs.currentIndex].stack -= amt;
      break;
    }
    default:
      return { ok: false, error: PokerError.InvalidAction };
  }
  const newHistory = [...gs.history, { ...a, playerId: player.id }];
  let newGs: GameState = {
    ...gs,
    table: { ...gs.table, seats },
    betsThisRound: bets,
    history: newHistory,
    currentIndex: nextIdx,
  };
  // Check for round advance
  if (isBettingRoundOver(newGs)) {
    // For simplicity, use a new deck for board cards (not tracking burn)
    const deck = createDeck().filter(card => !seats.flatMap(p => p.hole).some(h => h.rank === card.rank && h.suit === card.suit));
    newGs = advanceStage(newGs, deck);
  }
  return { ok: true, value: newGs };
}

export function showdown(gs: GameState): Result<ShowdownResult, PokerError> {
  // Stub: just split pot among active players
  const active = getActivePlayers(gs);
  const pot = gs.potManager.pots[0].amount;
  const winners = active.map(i => ({ playerId: gs.table.seats[i].id, amount: pot / active.length }));
  const hands = active.map(i => ({ playerId: gs.table.seats[i].id, hand: gs.table.seats[i].hole }));
  return { ok: true, value: { winners, hands } };
}

// Note: Player manager functions are imported directly in API files 