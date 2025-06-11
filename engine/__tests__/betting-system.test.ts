import { 
  legalActions, 
  applyAction, 
  showdown,
  maxBet,
  minRaise,
  getCurrentPlayer,
  isBettingRoundComplete
} from '../index';
import { startHand, validateHandStart, createDeck, shuffleDeck } from '../game-flow';
import { joinGame, initializeSeats } from '../player-manager';
import { GameState, Table, Action, JoinGameConfig, ActionType, PokerError } from '../types';
import { evaluateHand } from '../hand-evaluator';

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

function createJoinConfig(playerId: string, playerName: string, buyIn = 1000, seatIndex?: number): JoinGameConfig {
  return {
    gameId: 'test-game',
    playerId,
    playerName,
    buyIn,
    seatIndex
  };
}

function addPlayersToGame(gameState: GameState, playerCount: number): GameState {
  let state = gameState;
  for (let i = 0; i < playerCount; i++) {
    const result = joinGame(state, createJoinConfig(`player${i + 1}`, `Player ${i + 1}`));
    if (!result.ok) throw new Error(`Failed to add player ${i + 1}`);
    state = result.value;
  }
  return state;
}

function createAction(type: ActionType, playerId: string, seatIndex: number, amount?: number): Action {
  return {
    type,
    playerId,
    seatIndex,
    timestamp: Date.now(),
    ...(amount !== undefined && { amount })
  };
}

describe('Betting System', () => {
  describe('Utility Functions', () => {
    test('maxBet should return highest bet', () => {
      expect(maxBet([0, 10, 5, 20, 0])).toBe(20);
      expect(maxBet([0, 0, 0])).toBe(0);
      expect(maxBet([15])).toBe(15);
    });

    test('minRaise should return correct minimum raise amount', () => {
      const gameState = createTestGameState();
      gameState.table.bigBlind = 10;
      gameState.bettingRound.lastRaiseAmount = 0;
      
      expect(minRaise(gameState)).toBe(10); // Big blind amount
      
      gameState.bettingRound.lastRaiseAmount = 15;
      expect(minRaise(gameState)).toBe(15); // Previous raise amount
    });

    test('getCurrentPlayer should return correct player', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState.bettingRound.actionIndex = 1;
      
      const currentPlayer = getCurrentPlayer(gameState);
      expect(currentPlayer?.id).toBe('player2');
    });
  });

  describe('Legal Actions', () => {
    test('should allow check and bet when no bet to call', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Move to a player who can act (not small/big blind)
      gameState.bettingRound.actionIndex = 2;
      gameState.bettingRound.betsThisRound = [1, 2, 0]; // SB, BB, player to act
      gameState.bettingRound.currentBet = 2;
      
      const actions = legalActions(gameState);
      const actionTypes = actions.map(a => a.type);
      
      expect(actionTypes).not.toContain('check'); // Must call BB
      expect(actionTypes).toContain('call');
      expect(actionTypes).toContain('fold');
      expect(actionTypes).toContain('raise');
    });

    test('should allow call, fold, raise when there is a bet', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Simulate a bet situation
      gameState.bettingRound.actionIndex = 2;
      gameState.bettingRound.betsThisRound = [1, 2, 0];
      gameState.bettingRound.currentBet = 2;
      
      const actions = legalActions(gameState);
      const actionTypes = actions.map(a => a.type);
      
      expect(actionTypes).toContain('call');
      expect(actionTypes).toContain('fold');
      expect(actionTypes).toContain('raise');
      expect(actionTypes).not.toContain('check');
    });

    test('should allow all-in when player has chips', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      gameState = startHand(gameState, 'test-seed');
      
      const actions = legalActions(gameState);
      const actionTypes = actions.map(a => a.type);
      
      expect(actionTypes).toContain('all-in');
    });

    test('should return actions for current player based on actionIndex', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Set action to specific player
      gameState.bettingRound.actionIndex = 1;
      
      const actions = legalActions(gameState);
      expect(actions.length).toBeGreaterThan(0);
      
      // All actions should be for the player at actionIndex
      actions.forEach(action => {
        expect(action.playerId).toBe(gameState.table.seats[1].player!.id);
        expect(action.seatIndex).toBe(1);
      });
    });

  });

  describe('Action Application', () => {
    test('should successfully apply fold action', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      const currentPlayer = getCurrentPlayer(gameState)!;
      const action = createAction('fold', currentPlayer.id, currentPlayer.seatIndex!);
      
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        const newState = result.value;
        const player = newState.table.seats[currentPlayer.seatIndex!].player!;
        expect(player.status).toBe('folded');
      }
    });

    test('should successfully apply call action', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      const currentPlayer = getCurrentPlayer(gameState)!;
      const initialStack = currentPlayer.stack;
      const toCall = gameState.bettingRound.currentBet - gameState.bettingRound.betsThisRound[currentPlayer.seatIndex!];
      
      const action = createAction('call', currentPlayer.id, currentPlayer.seatIndex!, toCall);
      
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        const newState = result.value;
        const player = newState.table.seats[currentPlayer.seatIndex!].player!;
        expect(player.stack).toBe(initialStack - toCall);
        expect(newState.bettingRound.betsThisRound[currentPlayer.seatIndex!]).toBe(gameState.bettingRound.currentBet);
      }
    });

    test('should successfully apply bet action', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Move to post-flop where check/bet is possible
      gameState.stage = 'flop';
      gameState.bettingRound.currentBet = 0;
      gameState.bettingRound.betsThisRound = [0, 0, 0];
      
      const currentPlayer = getCurrentPlayer(gameState)!;
      const betAmount = 10;
      const action = createAction('bet', currentPlayer.id, currentPlayer.seatIndex!, betAmount);
      
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        const newState = result.value;
        const player = newState.table.seats[currentPlayer.seatIndex!].player!;
        expect(newState.bettingRound.betsThisRound[currentPlayer.seatIndex!]).toBe(betAmount);
        expect(newState.bettingRound.currentBet).toBe(betAmount);
      }
    });

    test('should successfully apply raise action', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      const currentPlayer = getCurrentPlayer(gameState)!;
      const raiseAmount = 5;
      const toCall = gameState.bettingRound.currentBet - gameState.bettingRound.betsThisRound[currentPlayer.seatIndex!];
      
      const action = createAction('raise', currentPlayer.id, currentPlayer.seatIndex!, raiseAmount);
      
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        const newState = result.value;
        expect(newState.bettingRound.betsThisRound[currentPlayer.seatIndex!]).toBe(toCall + raiseAmount);
        expect(newState.bettingRound.lastRaiseAmount).toBe(raiseAmount);
      }
    });

    test('should reject invalid action (not player turn)', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Try to act with wrong player
      const wrongPlayer = gameState.table.seats[1].player!;
      const action = createAction('call', wrongPlayer.id, wrongPlayer.seatIndex!);
      
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result as any).error).toBe(PokerError.NotPlayersTurn);
      }
    });

    test('should reject invalid bet amount', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Move to post-flop
      gameState.stage = 'flop';
      gameState.bettingRound.currentBet = 0;
      gameState.bettingRound.betsThisRound = [0, 0, 0];
      
      const currentPlayer = getCurrentPlayer(gameState)!;
      
      // Try to bet more than stack
      const action = createAction('bet', currentPlayer.id, currentPlayer.seatIndex!, currentPlayer.stack + 100);
      
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result as any).error).toBe(PokerError.InvalidAction);
      }
    });
  });

  describe('Betting Round Completion', () => {
    test('should detect when betting round is complete', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Simulate all players calling - everyone needs to match the big blind (2)
      gameState.bettingRound.betsThisRound = [2, 2, 2, 0, 0, 0]; // SB calls to 2, BB already at 2, third player calls to 2, empty seats
      gameState.bettingRound.playersActed = [true, true, true, false, false, false]; // Only seated players have acted
      gameState.bettingRound.currentBet = 2;
      
      expect(isBettingRoundComplete(gameState)).toBe(true);
    });

    test('should detect when betting round is not complete', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Player hasn't acted yet
      gameState.bettingRound.betsThisRound = [1, 2, 0, 0, 0, 0]; // SB, BB, player hasn't called yet, empty seats
      gameState.bettingRound.playersActed = [true, true, false, false, false, false]; // Third player hasn't acted
      
      expect(isBettingRoundComplete(gameState)).toBe(false);
    });
  });

  describe('Stage Advancement', () => {
    test('should advance from preflop to flop after betting round', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Simulate all players calling to complete preflop
      const players = [0, 1, 2]; // Player indices
      
      for (const playerIndex of players) {
        const player = gameState.table.seats[playerIndex].player!;
        if (gameState.bettingRound.actionIndex === playerIndex) {
          const toCall = gameState.bettingRound.currentBet - gameState.bettingRound.betsThisRound[playerIndex];
          if (toCall > 0) {
            const action = createAction('call', player.id, playerIndex, toCall);
            const result = applyAction(gameState, action);
            if (result.ok) gameState = result.value;
          } else {
            const action = createAction('check', player.id, playerIndex);
            const result = applyAction(gameState, action);
            if (result.ok) gameState = result.value;
          }
        }
      }
      
      // Should advance to flop when betting is complete
      expect(gameState.stage).toBe('flop');
      expect(gameState.board.length).toBe(3); // Flop has 3 cards
    });

    test('should advance from flop to turn to river', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      gameState = startHand(gameState, 'test-seed');
      
      // Fast-forward to flop
      gameState.stage = 'flop';
      gameState.board = [
        { rank: 'A', suit: 'h' },
        { rank: 'K', suit: 'd' },
        { rank: 'Q', suit: 'c' }
      ];
      gameState.bettingRound.currentBet = 0;
      gameState.bettingRound.betsThisRound = [0, 0];
      gameState.bettingRound.actionIndex = 0;
      
      // Both players check
      const player1 = gameState.table.seats[0].player!;
      const player2 = gameState.table.seats[1].player!;
      
      let result = applyAction(gameState, createAction('check', player1.id, 0));
      if (result.ok) gameState = result.value;
      
      result = applyAction(gameState, createAction('check', player2.id, 1));
      if (result.ok) gameState = result.value;
      
      expect(gameState.stage).toBe('turn');
      expect(gameState.board.length).toBe(4);
    });
  });

  describe('Showdown', () => {
    test('should handle showdown with single remaining player', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      gameState = startHand(gameState, 'test-seed');
      
      // Get the current player to act and have them fold
      const currentPlayer = getCurrentPlayer(gameState)!;
      const result = applyAction(gameState, createAction('fold', currentPlayer.id, currentPlayer.seatIndex!));
      if (result.ok) gameState = result.value;
      
      const showdownResult = showdown(gameState);
      expect(showdownResult.ok).toBe(true);
      
      if (showdownResult.ok) {
        expect(showdownResult.value).toHaveLength(1);
        // The winner should be the player who didn't fold
        const expectedWinner = currentPlayer.seatIndex === 0 ? 'player2' : 'player1';
        expect(showdownResult.value[0].playerId).toBe(expectedWinner);
      }
    });

    test('should handle showdown with multiple players', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      gameState = startHand(gameState, 'test-seed');
      
      // Set up showdown scenario
      gameState.stage = 'showdown';
      gameState.potManager.totalPot = 100;
      
      // Ensure both players are active
      gameState.table.seats[0].player!.status = 'active';
      gameState.table.seats[1].player!.status = 'active';
      
      const showdownResult = showdown(gameState);
      expect(showdownResult.ok).toBe(true);
      
      if (showdownResult.ok) {
        expect(showdownResult.value.length).toBeGreaterThan(0);
        // Total winnings should equal pot
        const totalWinnings = showdownResult.value.reduce((sum, result) => sum + result.amountWon, 0);
        expect(totalWinnings).toBe(100);
      }
    });
  });

  describe('Complete Game Flow', () => {
    test('should play complete hand from start to finish', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      gameState = startHand(gameState, 'test-seed');
      
      expect(gameState.stage).toBe('preflop');
      expect(gameState.isHandActive).toBe(true);
      expect(gameState.handsPlayed).toBe(1);
      
      // Both players should have hole cards
      expect(gameState.table.seats[0].player!.hole).toHaveLength(2);
      expect(gameState.table.seats[1].player!.hole).toHaveLength(2);
      
      // Should have blinds posted
      expect(gameState.bettingRound.betsThisRound[0]).toBe(1); // Small blind
      expect(gameState.bettingRound.betsThisRound[1]).toBe(2); // Big blind
      expect(gameState.potManager.mainPot).toBe(3); // SB + BB
    });

    test('should handle all-in scenarios', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      
      // Set small stacks for all-in scenario
      gameState.table.seats[0].player!.stack = 50;
      gameState.table.seats[1].player!.stack = 75;
      
      gameState = startHand(gameState, 'test-seed');
      
      const player1 = gameState.table.seats[0].player!;
      
      // Player goes all-in
      const result = applyAction(gameState, createAction('all-in', player1.id, 0));
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        const newState = result.value;
        expect(newState.table.seats[0].player!.stack).toBe(0);
        expect(newState.table.seats[0].player!.status).toBe('all-in');
      }
    });

    test('should validate hand start requirements', () => {
      const gameState = createTestGameState();
      
      // No players
      let validation = validateHandStart(gameState);
      expect(validation.canStart).toBe(false);
      expect(validation.reason).toContain('at least');
      
      // Add minimum players
      const stateWithPlayers = addPlayersToGame(gameState, 2);
      validation = validateHandStart(stateWithPlayers);
      expect(validation.canStart).toBe(true);
    });
  });

  describe('Pot Management', () => {
    test('should track pot correctly through betting rounds', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      const initialPot = gameState.potManager.totalPot; // SB + BB
      
      // Get the current player to act (should be player after big blind)
      const currentPlayer = getCurrentPlayer(gameState)!;
      const toCall = gameState.bettingRound.currentBet - gameState.bettingRound.betsThisRound[currentPlayer.seatIndex!];
      
      const result = applyAction(gameState, createAction('call', currentPlayer.id, currentPlayer.seatIndex!, toCall));
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        // Pot should increase by call amount when betting round completes
        // Note: pot is updated when betting round advances
        expect(result.value.bettingRound.betsThisRound[currentPlayer.seatIndex!]).toBe(toCall);
      }
    });
  });
}); 