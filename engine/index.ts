import { GameState, Action, PokerError, Result, ShowdownResult, Player, PotManager, Stage, BettingRound } from './types';
import { getActivePlayers, getNextActivePlayerIndex, findPlayerById, getSeatedPlayers, moveButton } from './player-manager';
import { evaluateHand, compareHands } from './hand-evaluator';

// --- Utility Functions ---

function maxBet(bets: number[]): number {
  return Math.max(...bets);
}

function minRaise(gs: GameState): number {
  // NLHE: min raise is previous raise amount or big blind
  return gs.bettingRound.lastRaiseAmount > 0 ? gs.bettingRound.lastRaiseAmount : gs.table.bigBlind;
}

function getCurrentPlayer(gs: GameState): Player | null {
  const seat = gs.table.seats[gs.bettingRound.actionIndex];
  return seat?.player || null;
}

// --- Pot Management ---

function getCurrentPotTotal(gs: GameState): number {
  // During betting, the visible pot includes what's already committed
  // plus what's been bet in the current round
  const bets = gs.bettingRound.betsThisRound;
  const currentRoundTotal = bets.reduce((sum, bet) => sum + bet, 0);
  return gs.potManager.totalPot + currentRoundTotal;
}

function calculatePots(gs: GameState): PotManager {
  const bets = gs.bettingRound.betsThisRound;
  const totalBet = bets.reduce((sum, bet) => sum + bet, 0);
  
  console.log(`🏦 calculatePots() called:`);
  console.log(`  Current bets this round: [${bets.join(', ')}]`);
  console.log(`  Total bet this round: ${totalBet}`);
  console.log(`  Existing pot: main=${gs.potManager.mainPot}, sides=${gs.potManager.sidePots.length}, total=${gs.potManager.totalPot}`);
  
  // Simple case: if no all-ins, add everything to existing pot
  const hasAllIns = getSeatedPlayers(gs).some(player => player.status === 'all-in');
  
  if (!hasAllIns) {
    const newPot = {
      mainPot: gs.potManager.mainPot + totalBet,
      sidePots: gs.potManager.sidePots,
      totalPot: gs.potManager.totalPot + totalBet
    };
    console.log(`  No all-ins, simple addition: new total=${newPot.totalPot}`);
    return newPot;
  }
  
  // Calculate side pots from current betting round
  console.log(`  All-ins detected, calculating side pots...`);
  const { calculateSidePotsFromGameState } = require('./pot-manager');
  const currentRoundPots = calculateSidePotsFromGameState(gs);
  
  console.log(`  Side pot calculation result: main=${currentRoundPots.mainPot}, sides=${currentRoundPots.sidePots.length}, total=${currentRoundPots.totalPot}`);
  
  // Combine with existing pot structure
  const newPot = {
    mainPot: gs.potManager.mainPot + currentRoundPots.mainPot,
    sidePots: [...gs.potManager.sidePots, ...currentRoundPots.sidePots],
    totalPot: gs.potManager.totalPot + currentRoundPots.totalPot
  };
  
  console.log(`  Final pot after combining: main=${newPot.mainPot}, sides=${newPot.sidePots.length}, total=${newPot.totalPot}`);
  
  return newPot;
}

// --- Betting Round Logic ---

export { getCurrentPotTotal };

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
  
  // Get only players who are actually in the current betting round
  // This includes players who are active, all-in, or folded (but excludes players who are 'out' or disconnected)
  const playersInRound = getSeatedPlayers(gs).filter(player => 
    player.status === 'active' || player.status === 'all-in' || player.status === 'folded'
  );
  
  // Need at least one player
  if (playersInRound.length === 0) {
    return true;
  }
  
  // All players in the round must have acted and either:
  // 1. Matched the max bet, or
  // 2. Are all-in, or
  // 3. Have folded (folded players are automatically "complete" regardless of acted status)
  return playersInRound.every(player => {
    const seatIndex = player.seatIndex!;
    const hasActed = gs.bettingRound.playersActed[seatIndex];
    const hasMatchedBet = bets[seatIndex] === maxB;
    const isAllIn = player.stack === 0;
    const hasFolded = player.status === 'folded';
    
    // Folded players are always considered complete (they don't need to act in future betting rounds)
    return hasFolded || (hasActed && (hasMatchedBet || isAllIn));
  });
}

function advanceBettingRound(gs: GameState): GameState {
  // Update pot with current round's bets
  console.log(`🔄 CONTEXT: advanceBettingRound() calculating pots for stage transition`);
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
  // Pass the OLD state so dealCommunityCards can check the current stage
  if (nextStage === 'flop' || nextStage === 'turn' || nextStage === 'river') {
    newState = dealCommunityCards(gs);
    newState.stage = nextStage; // Update stage after dealing cards
  }
  
  // Reset betting round for new stage
  if (nextStage !== 'showdown' && nextStage !== 'finished') {
    newState = advanceBettingRound(newState);
  }
  
  return newState;
}

// --- Main Game Logic ---

export function newGame(): GameState {
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
    
    // Check if only one player remains who can still act (all others folded or all-in)
    const playersWhoCanAct = getActivePlayers(newGameState).filter(p => p.status === 'active');
    const playersStillInHand = getActivePlayers(newGameState).filter(p => p.status === 'active' || p.status === 'all-in');
    
    if (playersStillInHand.length <= 1) {
      // Hand is over, go straight to showdown (calculate pots first)
      console.log(`🔄 CONTEXT: Only ${playersStillInHand.length} player(s) remain, calculating pots before showdown`);
      newGameState.potManager = calculatePots(newGameState);
      newGameState = { ...newGameState, stage: 'showdown' };
    } else if (playersWhoCanAct.length <= 1) {
      // Only one player can act (others are all-in), skip to showdown (calculate pots first)
      console.log(`🔄 CONTEXT: Only ${playersWhoCanAct.length} player(s) can act (others all-in), calculating pots before showdown`);
      newGameState.potManager = calculatePots(newGameState);
      newGameState = { ...newGameState, stage: 'showdown' };
    } else if (newGameState.stage !== 'river') {
      // Advance to next stage (this will call calculatePots in advanceBettingRound)
      console.log(`🔄 CONTEXT: Advancing to next stage (${newGameState.stage} -> next), will calculate pots in advanceBettingRound`);
      newGameState = advanceGameStage(newGameState);
    } else {
      // River betting complete, go to showdown (calculate pots first)
      console.log(`🔄 CONTEXT: River betting complete, calculating pots before showdown`);
      newGameState.potManager = calculatePots(newGameState);
      newGameState = { ...newGameState, stage: 'showdown' };
    }
  }
  
  return { ok: true, value: newGameState };
}

export function showdown(gs: GameState): Result<ShowdownResult[], PokerError> {
  console.log(`🎰 showdown() called:`);
  console.log(`  Current pot: main=${gs.potManager.mainPot}, sides=${gs.potManager.sidePots.length}, total=${gs.potManager.totalPot}`);
  
  const eligiblePlayers = getActivePlayers(gs).filter(p => 
    p.status === 'active' || p.status === 'all-in'
  );
  
  console.log(`  Eligible players: ${eligiblePlayers.length}`);
  eligiblePlayers.forEach(p => {
    console.log(`    ${p.name} (${p.id}) - status: ${p.status}, stack: ${p.stack}`);
  });
  
  if (eligiblePlayers.length === 0) {
    console.log(`❌ No eligible players for showdown!`);
    return { ok: false, error: PokerError.Unknown };
  }
  
  // If only one player remains, they win automatically
  if (eligiblePlayers.length === 1) {
    const winner = eligiblePlayers[0];
    console.log(`🏆 Single winner: ${winner.name} wins entire pot of ${gs.potManager.totalPot}`);
    
    let hand;
    
    // Try to evaluate hand, fall back to basic evaluation if not enough cards
    try {
      hand = evaluateHand([...winner.hole, ...gs.board]);
    } catch {
      // Not enough cards for full evaluation, use basic high card with hole cards
      hand = {
        rank: 'high-card' as const,
        value: 0,
        kickers: [winner.hole[0]?.rank || 'A', winner.hole[1]?.rank || 'A'],
        cards: winner.hole
      };
    }
    
    const result = {
      ok: true as const,
      value: [{
        playerId: winner.id,
        seatIndex: winner.seatIndex!,
        hand,
        amountWon: gs.potManager.totalPot,
        potType: 'main' as const
      }]
    };
    
    console.log(`🎯 Returning single winner result: ${winner.id} gets ${gs.potManager.totalPot} chips`);
    return result;
  }
  
  // Evaluate all hands
  const handEvaluations = eligiblePlayers.map(player => {
    let hand;
    
    try {
      hand = evaluateHand([...player.hole, ...gs.board]);
    } catch {
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
  
  // If there are side pots, use the new distribution logic
  if (gs.potManager.sidePots.length > 0) {
    const { distributePots } = require('./pot-manager');
    
    // Convert hand evaluations to the format expected by distributePots
    const handEvaluationsForPots = handEvaluations.map(({ player, hand }) => ({
      playerId: player.id,
      rank: hand.rank,
      value: hand.value
    }));
    
    const potDistribution = distributePots(gs.potManager, handEvaluationsForPots);
    
    // Convert back to ShowdownResult format
    const results: ShowdownResult[] = potDistribution.map(distribution => {
      const evaluation = handEvaluations.find(e => e.player.id === distribution.playerId)!;
      return {
        playerId: distribution.playerId,
        seatIndex: evaluation.player.seatIndex!,
        hand: evaluation.hand,
        amountWon: distribution.amountWon,
        potType: distribution.potType
      };
    });
    
    return { ok: true, value: results };
  }
  
  // Original logic for simple main pot only
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

/**
 * Award winnings to players and update their stacks
 */
export function awardWinnings(gs: GameState, showdownResults: ShowdownResult[]): GameState {
  console.log(`  🎯 awardWinnings() called with ${showdownResults.length} results`);
  
  const totalWinningsToAward = showdownResults.reduce((sum, result) => sum + result.amountWon, 0);
  console.log(`  💵 Total winnings to award: ${totalWinningsToAward}`);
  console.log(`  🏦 Current pot total: ${gs.potManager.totalPot}`);
  
  const updatedSeats = gs.table.seats.map(seat => {
    if (!seat.player) return seat;
    
    // Find this player's winnings
    const winnings = showdownResults.find(result => result.playerId === seat.player!.id);
    
    if (winnings) {
      console.log(`  💰 Awarding ${winnings.amountWon} chips to ${seat.player.name} (was ${seat.player.stack}, now ${seat.player.stack + winnings.amountWon})`);
      return {
        ...seat,
        player: {
          ...seat.player,
          stack: seat.player.stack + winnings.amountWon
        }
      };
    }
    
    return seat;
  });
  
  return {
    ...gs,
    table: {
      ...gs.table,
      seats: updatedSeats
    },
    // Reset pot after awarding winnings
    potManager: {
      mainPot: 0,
      sidePots: [],
      totalPot: 0
    },
    winners: showdownResults,
    stage: 'finished'
  };
}

/**
 * Complete the current hand and prepare for the next hand
 */
export function completeHand(gs: GameState): Result<GameState, PokerError> {
  console.log('\n🏁 === COMPLETE HAND DEBUG START ===');
  
  // Track initial chip totals
  const initialChips = gs.table.seats.reduce((total, seat) => 
    total + (seat.player?.stack || 0), 0);
  const initialPot = gs.potManager.totalPot;
  
  console.log(`💰 BEFORE HAND COMPLETION:`);
  console.log(`  Total chips in stacks: ${initialChips}`);
  console.log(`  Total pot: ${initialPot}`);
  console.log(`  Total chips in game: ${initialChips + initialPot}`);
  
  gs.table.seats.forEach((seat, index) => {
    if (seat.player) {
      console.log(`  ${seat.player.name} (seat ${index}): ${seat.player.stack} chips`);
    }
  });
  
  // First run showdown to determine winners
  console.log('\n🎰 Running showdown...');
  const showdownResult = showdown(gs);
  if (!showdownResult.ok) {
    console.log('❌ Showdown failed!');
    return { ok: false, error: PokerError.Unknown };
  }
  
  console.log(`🏆 Showdown results:`);
  showdownResult.value.forEach(result => {
    console.log(`  ${result.playerId} wins ${result.amountWon} chips (${result.potType} pot)`);
  });
  
  const totalWinnings = showdownResult.value.reduce((sum, result) => sum + result.amountWon, 0);
  console.log(`💵 Total winnings distributed: ${totalWinnings}`);
  
  // Award winnings to players
  console.log('\n💰 Awarding winnings...');
  let gameState = awardWinnings(gs, showdownResult.value);
  
  // Track chips after awarding winnings
  const afterAwardingChips = gameState.table.seats.reduce((total, seat) => 
    total + (seat.player?.stack || 0), 0);
  const afterAwardingPot = gameState.potManager.totalPot;
  
  console.log(`💰 AFTER AWARDING WINNINGS:`);
  console.log(`  Total chips in stacks: ${afterAwardingChips}`);
  console.log(`  Total pot: ${afterAwardingPot}`);
  console.log(`  Total chips in game: ${afterAwardingChips + afterAwardingPot}`);
  
  gameState.table.seats.forEach((seat, index) => {
    if (seat.player) {
      console.log(`  ${seat.player.name} (seat ${index}): ${seat.player.stack} chips`);
    }
  });
  
  // Move button to next player (as per poker rules)
  console.log('\n🔄 Moving button...');
  gameState = moveButton(gameState);
  
  // Reset all player statuses and hole cards for next hand
  const resetSeats = gameState.table.seats.map(seat => {
    if (!seat.player) return seat;
    
    return {
      ...seat,
      player: {
        ...seat.player,
        status: seat.player.stack > 0 ? 'waiting' as const : 'out' as const,
        hole: []
      }
    };
  });
  
  // Prepare game state for next hand
  const nextHandState: GameState = {
    ...gameState,
    stage: 'init',
    board: [],
    deck: [],
    bettingRound: {
      stage: 'init',
      currentBet: 0,
      lastRaiseAmount: 0,
      lastRaiserIndex: -1,
      actionIndex: 0,
      betsThisRound: Array(gameState.table.seats.length).fill(0),
      playersActed: Array(gameState.table.seats.length).fill(false),
      isComplete: false
    },
    table: {
      ...gameState.table,
      seats: resetSeats
    },
    handsPlayed: gameState.handsPlayed + 1,
    isHandActive: false,
    winners: undefined
  };
  
  // Final chip verification
  const finalChips = nextHandState.table.seats.reduce((total, seat) => 
    total + (seat.player?.stack || 0), 0);
  const finalPot = nextHandState.potManager.totalPot;
  
  console.log(`💰 FINAL STATE (after hand completion):`);
  console.log(`  Total chips in stacks: ${finalChips}`);
  console.log(`  Total pot: ${finalPot}`);
  console.log(`  Total chips in game: ${finalChips + finalPot}`);
  
  const chipDifference = (finalChips + finalPot) - (initialChips + initialPot);
  if (chipDifference !== 0) {
    console.log(`🚨 CHIP DISCREPANCY: ${chipDifference > 0 ? '+' : ''}${chipDifference} chips created/destroyed!`);
  } else {
    console.log(`✅ Chip conservation verified!`);
  }
  
  console.log('🏁 === COMPLETE HAND DEBUG END ===\n');
  
  return { ok: true, value: nextHandState };
}

// Export utility functions for use by other modules
export { maxBet, minRaise, getCurrentPlayer, isBettingRoundComplete }; 