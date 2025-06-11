import { GameState, NewGameConfig, Action, PokerError, Result, ShowdownResult, Card, Rank, Suit, Player, Table, PotManager, ActionType, Stage, BettingRound } from './types';
import { createDeck, shuffleDeck, startHand, validateHandStart } from './game-flow';
import { getActivePlayers, getNextActivePlayerIndex, findPlayerById, getSeatedPlayers } from './player-manager';
import { evaluateHand, compareHands } from './hand-evaluator';

// --- Utility Functions ---

function maxBet(bets: number[]): number {
  return Math.max(...bets);
}

function minRaise(gs: GameState): number {
  // NLHE: min raise is previous raise amount or big blind
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

// --- Pot Management ---

function calculatePots(gs: GameState): PotManager {
  const bets = gs.bettingRound.betsThisRound;
  const totalBet = bets.reduce((sum, bet) => sum + bet, 0);
  
  // For now, simple implementation - all money goes to main pot
  // TODO: Implement side pot logic for all-in scenarios
  return {
    mainPot: gs.potManager.mainPot + totalBet,
    sidePots: [],
    totalPot: gs.potManager.mainPot + totalBet
  };
}

// --- Betting Round Logic ---

export function legalActions(gs: GameState): Action[] {
  const player = getCurrentPlayer(gs);
  if (!player || player.status !== 'active') return [];
  
  // Only return actions if the game is actually active and it's a betting stage
  if (!gs.isHandActive || gs.stage === 'init' || gs.stage === 'finished' || gs.stage === 'showdown') {
    return [];
  }
  
  const bets = gs.bettingRound.betsThisRound;
  const maxB = maxBet(bets);
  const playerBet = bets[gs.bettingRound.actionIndex];
  const toCall = maxB - playerBet;
  const { stack } = player;
  const actions: Action[] = [];
  
  const baseAction = {
    playerId: player.id,
    seatIndex: player.seatIndex!,
    timestamp: Date.now()
  };
  
  // Always allow fold (except when checking is possible)
  if (toCall > 0) {
    actions.push({ ...baseAction, type: 'fold' });
  }
  
  if (toCall === 0) {
    // Can check when no bet to call
    actions.push({ ...baseAction, type: 'check' });
    // Can bet if has chips
    if (stack >= gs.table.bigBlind) {
      actions.push({ ...baseAction, type: 'bet', amount: gs.table.bigBlind });
    }
  } else {
    // Can call if has enough chips
    if (stack >= toCall) {
      actions.push({ ...baseAction, type: 'call', amount: toCall });
    }
    // All-in if exact amount
    if (stack === toCall) {
      actions.push({ ...baseAction, type: 'all-in', amount: toCall });
    }
    // Can raise if has more than call amount
    if (stack > toCall) {
      const minRaiseAmount = toCall + minRaise(gs);
      if (stack >= minRaiseAmount) {
        actions.push({ ...baseAction, type: 'raise', amount: minRaiseAmount });
      }
    }
  }
  
  // All-in is always possible if have chips
  if (stack > 0 && toCall < stack) {
    actions.push({ ...baseAction, type: 'all-in', amount: stack });
  }
  
  return actions;
}

function isBettingRoundComplete(gs: GameState): boolean {
  const bets = gs.bettingRound.betsThisRound;
  const maxB = maxBet(bets);
  const activePlayers = getActivePlayers(gs);
  
  // Need at least one active player
  if (activePlayers.length === 0) return true;
  
  // All active players must have acted and either:
  // 1. Matched the max bet, or
  // 2. Are all-in, or
  // 3. Have folded
  return activePlayers.every(player => {
    const seatIndex = player.seatIndex!;
    const hasActed = gs.bettingRound.playersActed[seatIndex];
    const hasMatchedBet = bets[seatIndex] === maxB;
    const isAllIn = player.stack === 0;
    const hasFolded = player.status === 'folded';
    
    return hasActed && (hasMatchedBet || isAllIn || hasFolded);
  });
}

function advanceBettingRound(gs: GameState): GameState {
  // Update pot with current round's bets
  const updatedPot = calculatePots(gs);
  
  // Reset betting round for next stage
  const activePlayers = getActivePlayers(gs);
  const firstActiveIndex = activePlayers.length > 0 ? activePlayers[0].seatIndex! : 0;
  
  return {
    ...gs,
    potManager: updatedPot,
    bettingRound: {
      ...gs.bettingRound,
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

function dealCommunityCards(gs: GameState): GameState {
  const deck = gs.deck.slice();
  let board = gs.board.slice();
  let cardsDealt = 0;
  
  switch (gs.stage) {
    case 'preflop':
      // Deal flop (burn 1, deal 3)
      board = deck.slice(1, 4);
      cardsDealt = 4;
      break;
    case 'flop':
      // Deal turn (burn 1, deal 1)
      board = [...board, deck[1]];
      cardsDealt = 2;
      break;
    case 'turn':
      // Deal river (burn 1, deal 1)
      board = [...board, deck[1]];
      cardsDealt = 2;
      break;
  }
  
  return {
    ...gs,
    board,
    deck: deck.slice(cardsDealt)
  };
}

function advanceGameStage(gs: GameState): GameState {
  const stageProgression: Record<Stage, Stage> = {
    'init': 'preflop',
    'preflop': 'flop',
    'flop': 'turn',
    'turn': 'river',
    'river': 'showdown',
    'showdown': 'finished',
    'finished': 'finished'
  };
  
  const nextStage = stageProgression[gs.stage];
  let newState = { ...gs, stage: nextStage };
  
  // Deal community cards if moving to flop, turn, or river
  if (nextStage === 'flop' || nextStage === 'turn' || nextStage === 'river') {
    newState = dealCommunityCards(newState);
  }
  
  // Reset betting round for new stage
  if (nextStage !== 'showdown' && nextStage !== 'finished') {
    newState = advanceBettingRound(newState);
  }
  
  return newState;
}

// --- Main Game Logic ---

export function newGame(cfg: NewGameConfig): GameState {
  throw new Error('Use GameManager.createEmptyGame() instead - newGame function is deprecated');
}

export function applyAction(gs: GameState, a: Action): Result<GameState, PokerError> {
  // Validate player and turn
  const playerInfo = findPlayerById(gs, a.playerId);
  if (!playerInfo || playerInfo.player.status !== 'active') {
    return { ok: false, error: PokerError.InvalidAction };
  }
  
  if (playerInfo.seatIndex !== gs.bettingRound.actionIndex) {
    return { ok: false, error: PokerError.NotPlayersTurn };
  }
  
  // Clone state for mutation
  const bets = gs.bettingRound.betsThisRound.slice();
  const seats = gs.table.seats.map(seat => ({ 
    ...seat, 
    player: seat.player ? { ...seat.player } : null 
  }));
  
  const seatIndex = playerInfo.seatIndex;
  const player = seats[seatIndex].player!;
  const toCall = maxBet(bets) - bets[seatIndex];
  
  // Apply action
  switch (a.type) {
    case 'fold':
      player.status = 'folded';
      break;
      
    case 'check':
      if (toCall > 0) {
        return { ok: false, error: PokerError.InvalidAction };
      }
      break;
      
    case 'call': {
      if (toCall === 0) {
        return { ok: false, error: PokerError.InvalidAction };
      }
      const callAmount = Math.min(toCall, player.stack);
      bets[seatIndex] += callAmount;
      player.stack -= callAmount;
      if (player.stack === 0) player.status = 'all-in';
      break;
    }
    
    case 'bet': {
      if (toCall > 0) {
        return { ok: false, error: PokerError.InvalidAction };
      }
      const betAmount = a.amount ?? 0;
      if (betAmount > player.stack || betAmount < gs.table.bigBlind) {
        return { ok: false, error: PokerError.InvalidAction };
      }
      bets[seatIndex] += betAmount;
      player.stack -= betAmount;
      if (player.stack === 0) player.status = 'all-in';
      break;
    }
    
    case 'raise': {
      if (toCall === 0) {
        return { ok: false, error: PokerError.InvalidAction };
      }
      const raiseAmount = a.amount ?? 0;
      const totalAmount = toCall + raiseAmount;
      if (totalAmount > player.stack || raiseAmount < minRaise(gs)) {
        return { ok: false, error: PokerError.InvalidAction };
      }
      bets[seatIndex] += totalAmount;
      player.stack -= totalAmount;
      if (player.stack === 0) player.status = 'all-in';
      break;
    }
    
    case 'all-in': {
      const allInAmount = player.stack;
      bets[seatIndex] += allInAmount;
      player.stack = 0;
      player.status = 'all-in';
      break;
    }
    
    default:
      return { ok: false, error: PokerError.InvalidAction };
  }
  
  // Mark player as having acted
  const playersActed = gs.bettingRound.playersActed.slice();
  playersActed[seatIndex] = true;
  
  // Update betting round state
  const newBettingRound: BettingRound = {
    ...gs.bettingRound,
    betsThisRound: bets,
    playersActed,
    currentBet: Math.max(...bets),
    lastRaiseAmount: (a.type === 'raise' || a.type === 'bet') ? (a.amount ?? 0) : gs.bettingRound.lastRaiseAmount,
    lastRaiserIndex: (a.type === 'raise' || a.type === 'bet') ? seatIndex : gs.bettingRound.lastRaiserIndex,
    actionIndex: getNextActivePlayerIndex(gs, seatIndex) ?? seatIndex
  };
  
  let newGameState: GameState = {
    ...gs,
    table: { ...gs.table, seats },
    bettingRound: newBettingRound,
    history: [...gs.history, a]
  };
  
  // Check if betting round is complete
  if (isBettingRoundComplete(newGameState)) {
    newGameState.bettingRound.isComplete = true;
    
    // Check if only one player remains (all others folded)
    const remainingPlayers = getActivePlayers(newGameState).filter(p => p.status === 'active' || p.status === 'all-in');
    
    if (remainingPlayers.length <= 1) {
      // Hand is over, go straight to showdown
      newGameState = { ...newGameState, stage: 'showdown' };
    } else if (newGameState.stage !== 'river') {
      // Advance to next stage
      newGameState = advanceGameStage(newGameState);
    } else {
      // River betting complete, go to showdown
      newGameState = { ...newGameState, stage: 'showdown' };
    }
  }
  
  return { ok: true, value: newGameState };
}

export function showdown(gs: GameState): Result<ShowdownResult[], PokerError> {
  const eligiblePlayers = getActivePlayers(gs).filter(p => 
    p.status === 'active' || p.status === 'all-in'
  );
  
  if (eligiblePlayers.length === 0) {
    return { ok: false, error: PokerError.Unknown };
  }
  
  // If only one player remains, they win automatically
  if (eligiblePlayers.length === 1) {
    const winner = eligiblePlayers[0];
    let hand;
    
    // Try to evaluate hand, fall back to basic evaluation if not enough cards
    try {
      hand = evaluateHand([...winner.hole, ...gs.board]);
    } catch (error) {
      // Not enough cards for full evaluation, use basic high card with hole cards
      hand = {
        rank: 'high-card' as const,
        value: 0,
        kickers: [winner.hole[0]?.rank || 'A', winner.hole[1]?.rank || 'A'],
        cards: winner.hole
      };
    }
    
    return {
      ok: true,
      value: [{
        playerId: winner.id,
        seatIndex: winner.seatIndex!,
        hand,
        amountWon: gs.potManager.totalPot,
        potType: 'main'
      }]
    };
  }
  
  // Evaluate all hands
  const handEvaluations = eligiblePlayers.map(player => {
    let hand;
    
    try {
      hand = evaluateHand([...player.hole, ...gs.board]);
    } catch (error) {
      // Not enough cards for full evaluation, use basic high card with hole cards
      hand = {
        rank: 'high-card' as const,
        value: 0,
        kickers: [player.hole[0]?.rank || 'A', player.hole[1]?.rank || 'A'],
        cards: player.hole
      };
    }
    
    return { player, hand };
  });
  
  // Sort by hand strength (best first)
  handEvaluations.sort((a, b) => compareHands(b.hand, a.hand));
  
  // Determine winners (handle ties)
  const bestHand = handEvaluations[0].hand;
  const winners = handEvaluations.filter(evaluation => 
    compareHands(evaluation.hand, bestHand) === 0
  );
  
  // Split pot among winners
  const winningsPerPlayer = Math.floor(gs.potManager.totalPot / winners.length);
  
  const results: ShowdownResult[] = winners.map(({ player, hand }) => ({
    playerId: player.id,
    seatIndex: player.seatIndex!,
    hand,
    amountWon: winningsPerPlayer,
    potType: 'main'
  }));
  
  return { ok: true, value: results };
}

// Export utility functions for use by other modules
export { maxBet, minRaise, getCurrentPlayer, isBettingRoundComplete }; 