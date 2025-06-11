import { GameState, NewGameConfig, Action, PokerError, Result, ShowdownResult, Card, Rank, Suit, Player, Table, PotManager, ActionType } from './types';
import { createDeck, shuffleDeck } from './game-flow';
import { getActivePlayers, getNextActivePlayerIndex, findPlayerById } from './player-manager';

// --- Remove duplicate functions, use imports instead ---

function maxBet(bets: number[]): number {
  return Math.max(...bets);
}

function minRaise(gs: GameState): number {
  // NLHE: min raise is previous raise or big blind
  const bb = gs.table.bigBlind;
  const bets = gs.bettingRound.betsThisRound;
  const raises = bets.filter(b => b > bb);
  if (raises.length < 2) return bb;
  const sorted = [...raises].sort((a, b) => b - a);
  return sorted[0] - sorted[1];
}

function getCurrentPlayer(gs: GameState): Player | null {
  const seat = gs.table.seats[gs.bettingRound.actionIndex];
  return seat?.player || null;
}

export function newGame(cfg: NewGameConfig): GameState {
  // This function creates an empty game - players join separately
  // Remove old implementation that doesn't match the types
  throw new Error('Use GameManager.createEmptyGame() instead - newGame function is deprecated');
}

export function legalActions(gs: GameState): Action[] {
  const player = getCurrentPlayer(gs);
  if (!player || player.status !== 'active') return [];
  
  const bets = gs.bettingRound.betsThisRound;
  const maxB = maxBet(bets);
  const playerBet = bets[gs.bettingRound.actionIndex];
  const toCall = maxB - playerBet;
  const { stack } = player;
  const actions: Action[] = [];
  
  const baseAction = {
    playerId: player.id,
    seatIndex: player.seatIndex || gs.bettingRound.actionIndex,
    timestamp: Date.now()
  };
  
  if (toCall === 0) {
    actions.push({ ...baseAction, type: 'check' });
    if (stack > 0) {
      actions.push({ ...baseAction, type: 'bet', amount: gs.table.bigBlind });
    }
  } else {
    if (stack > toCall) {
      actions.push({ ...baseAction, type: 'call', amount: toCall });
    }
    if (stack === toCall) {
      actions.push({ ...baseAction, type: 'all-in', amount: toCall });
    }
    actions.push({ ...baseAction, type: 'fold' });
    if (stack > toCall) {
      const minRaiseAmount = toCall + minRaise(gs);
      if (stack >= minRaiseAmount) {
        actions.push({ ...baseAction, type: 'raise', amount: minRaiseAmount });
      }
    }
  }
  return actions;
}

function isBettingRoundOver(gs: GameState): boolean {
  const bets = gs.bettingRound.betsThisRound;
  const maxB = maxBet(bets);
  const activePlayers = getActivePlayers(gs);
  
  // Betting round is over if all active players have matched max bet or are all-in
  return activePlayers.every(player => {
    const seatIndex = player.seatIndex || gs.table.seats.findIndex(s => s.player?.id === player.id);
    if (seatIndex === -1) return true; // Player not found, consider as done
    
    return player.status !== 'active' || 
           bets[seatIndex] === maxB || 
           player.stack === 0;
  });
}

function advanceStage(gs: GameState): GameState {
  const nextStage: Record<string, string> = {
    preflop: 'flop',
    flop: 'turn',
    turn: 'river',
    river: 'showdown',
  };
  
  let board = gs.board.slice();
  const deck = gs.deck.slice(); // Use remaining deck
  
  if (gs.stage === 'preflop') {
    // Deal flop (3 cards)
    board = deck.slice(0, 3);
  } else if (gs.stage === 'flop') {
    // Deal turn (1 card)
    board = [...board, deck[0]];
  } else if (gs.stage === 'turn') {
    // Deal river (1 card)  
    board = [...board, deck[0]];
  }
  
  // Find first active player after button for next betting round
  const activePlayers = getActivePlayers(gs);
  let firstActiveIndex = 0;
  if (activePlayers.length > 0) {
    // Get the seat index from the first active player
    const firstPlayer = activePlayers[0];
    firstActiveIndex = firstPlayer.seatIndex || gs.table.seats.findIndex(s => s.player?.id === firstPlayer.id);
    if (firstActiveIndex === -1) firstActiveIndex = 0;
  }
  
  return {
    ...gs,
    stage: nextStage[gs.stage] as any,
    board,
    deck: gs.stage === 'river' ? deck : deck.slice(1), // Remove dealt card(s)
    bettingRound: {
      ...gs.bettingRound,
      stage: nextStage[gs.stage] as any,
      currentBet: 0,
      lastRaiseAmount: 0,
      lastRaiserIndex: -1,
      actionIndex: firstActiveIndex,
      betsThisRound: Array(gs.table.seats.length).fill(0),
      playersActed: Array(gs.table.seats.length).fill(false),
      isComplete: false
    }
  };
}

export function applyAction(gs: GameState, a: Action): Result<GameState, PokerError> {
  const playerInfo = findPlayerById(gs, a.playerId);
  if (!playerInfo || playerInfo.player.status !== 'active') {
    return { ok: false, error: PokerError.InvalidAction };
  }
  
  if (playerInfo.seatIndex !== gs.bettingRound.actionIndex) {
    return { ok: false, error: PokerError.NotPlayersTurn };
  }
  
  const bets = gs.bettingRound.betsThisRound.slice();
  const seats = gs.table.seats.map(seat => ({ 
    ...seat, 
    player: seat.player ? { ...seat.player } : null 
  }));
  
  const seatIndex = playerInfo.seatIndex;
  const player = seats[seatIndex].player!;
  
  switch (a.type) {
    case 'fold':
      player.status = 'folded';
      break;
      
    case 'call':
    case 'all-in': {
      const toCall = maxBet(bets) - bets[seatIndex];
      const callAmt = Math.min(toCall, player.stack);
      bets[seatIndex] += callAmt;
      player.stack -= callAmt;
      if (player.stack === 0) player.status = 'all-in';
      break;
    }
    
    case 'check':
      // No stack/bet change
      break;
      
    case 'bet':
    case 'raise': {
      const amt = a.amount ?? 0;
      if (amt > player.stack) {
        return { ok: false, error: PokerError.InsufficientStack };
      }
      bets[seatIndex] += amt;
      player.stack -= amt;
      if (player.stack === 0) player.status = 'all-in';
      break;
    }
    
    default:
      return { ok: false, error: PokerError.InvalidAction };
  }
  
  // Mark player as having acted
  const playersActed = gs.bettingRound.playersActed.slice();
  playersActed[seatIndex] = true;
  
  const newHistory = [...gs.history, a];
  
  // Find next active player
  const nextPlayerIndex = getNextActivePlayerIndex(gs, seatIndex);
  
  let newGs: GameState = {
    ...gs,
    table: { ...gs.table, seats },
    bettingRound: {
      ...gs.bettingRound,
      betsThisRound: bets,
      playersActed,
      actionIndex: nextPlayerIndex ?? seatIndex,
      currentBet: Math.max(...bets),
      lastRaiseAmount: a.type === 'raise' || a.type === 'bet' ? (a.amount ?? 0) : gs.bettingRound.lastRaiseAmount,
      lastRaiserIndex: a.type === 'raise' || a.type === 'bet' ? seatIndex : gs.bettingRound.lastRaiserIndex
    },
    history: newHistory
  };
  
  // Check for betting round completion
  if (isBettingRoundOver(newGs)) {
    newGs.bettingRound.isComplete = true;
    
    // Advance stage if not showdown
    if (newGs.stage !== 'river') {
      newGs = advanceStage(newGs);
    } else {
      newGs = { ...newGs, stage: 'showdown' };
    }
  }
  
  return { ok: true, value: newGs };
}

export function showdown(gs: GameState): Result<ShowdownResult[], PokerError> {
  // Stub: just split main pot among active players
  const activePlayers = getActivePlayers(gs).filter(p => p.status === 'active' || p.status === 'all-in');
  const mainPot = gs.potManager.mainPot;
  
  const results: ShowdownResult[] = activePlayers.map(player => ({
    playerId: player.id,
    seatIndex: player.seatIndex || 0,
    hand: {
      rank: 'high-card' as const,
      value: 0,
      kickers: [],
      cards: player.hole
    },
    amountWon: mainPot / activePlayers.length,
    potType: 'main' as const
  }));
  
  return { ok: true, value: results };
}

// Note: Player manager functions are imported directly in API files 