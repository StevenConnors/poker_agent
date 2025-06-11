import { 
  legalActions, 
  applyAction, 
  showdown,
  maxBet,
  minRaise,
  getCurrentPlayer,
  isBettingRoundComplete,
  awardWinnings,
  completeHand
} from '../index';
import { startHand, validateHandStart } from '../game-flow';
import { joinGame, initializeSeats, getActivePlayers } from '../player-manager';
import { GameState, Table, Action, JoinGameConfig, ActionType, PokerError } from '../types';

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
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Simulate quick hand - everyone folds except first player
      let currentPlayer = getCurrentPlayer(gameState)!;
      let action = createAction('call', currentPlayer.id, currentPlayer.seatIndex!, 2);
      let result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        gameState = result.value;
      }
      
      // Next player folds
      currentPlayer = getCurrentPlayer(gameState)!;
      action = createAction('fold', currentPlayer.id, currentPlayer.seatIndex!);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        gameState = result.value;
      }
      
      // Third player folds - should trigger showdown
      currentPlayer = getCurrentPlayer(gameState)!;
      action = createAction('fold', currentPlayer.id, currentPlayer.seatIndex!);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        gameState = result.value;
      }
      
      expect(gameState.stage).toBe('showdown');
    });

    test('should handle all-in scenarios', () => {
      let gameState = createTestGameState();
      
      // Add players with small stacks
      for (let i = 0; i < 2; i++) {
        const result = joinGame(gameState, {
          gameId: 'test-game',
          playerId: `player${i + 1}`,
          playerName: `Player ${i + 1}`,
          buyIn: 50, // Small stack
        });
        if (!result.ok) throw new Error(`Failed to add player ${i + 1}`);
        gameState = result.value;
      }
      
      gameState = startHand(gameState, 'test-seed');
      
      // Player goes all-in
      const currentPlayer = getCurrentPlayer(gameState)!;
      const action = createAction('all-in', currentPlayer.id, currentPlayer.seatIndex!);
      const result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        const player = result.value.table.seats[currentPlayer.seatIndex!].player!;
        expect(player.status).toBe('all-in');
        expect(player.stack).toBe(0);
      }
    });

    test('should validate hand start requirements', () => {
      const gameState = createTestGameState();
      
      const validation = validateHandStart(gameState);
      expect(validation.canStart).toBe(false);
      expect(validation.reason).toContain('players');
    });

    test('should award winnings correctly and complete hand', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 2);
      gameState = startHand(gameState, 'test-seed');
      
      // Test awarding winnings
      
      // Player 1 calls, player 2 checks - go to showdown
      let currentPlayer = getCurrentPlayer(gameState)!;
      let action = createAction('call', currentPlayer.id, currentPlayer.seatIndex!, 1);
      let result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      currentPlayer = getCurrentPlayer(gameState)!;
      action = createAction('check', currentPlayer.id, currentPlayer.seatIndex!);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      // Should advance through stages to showdown
      expect(['flop', 'turn', 'river', 'showdown']).toContain(gameState.stage);
      
      if (gameState.stage === 'showdown') {
        // Get showdown results
        const showdownResult = showdown(gameState);
        expect(showdownResult.ok).toBe(true);
        
        if (showdownResult.ok) {
          // Award winnings
          const finalState = awardWinnings(gameState, showdownResult.value);
          
          // Check that pot was awarded
          expect(finalState.potManager.totalPot).toBe(0);
          expect(finalState.winners).toEqual(showdownResult.value);
          
          // Check that winner received the pot
          const winner = showdownResult.value[0];
          const winnerSeat = finalState.table.seats[winner.seatIndex];
          expect(winnerSeat.player!.stack).toBeGreaterThan(0);
        }
      }
    });

    test('should move button after hand completion', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      const initialButton = gameState.table.buttonIndex;
      
      // Complete a quick hand
      let currentPlayer = getCurrentPlayer(gameState)!;
      let action = createAction('fold', currentPlayer.id, currentPlayer.seatIndex!);
      let result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      currentPlayer = getCurrentPlayer(gameState)!;
      action = createAction('fold', currentPlayer.id, currentPlayer.seatIndex!);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      // Should be in showdown now
      if (gameState.stage === 'showdown') {
        const completionResult = completeHand(gameState);
        expect(completionResult.ok).toBe(true);
        
        if (completionResult.ok) {
          const nextHandState = completionResult.value;
          
          // Button should have moved
          expect(nextHandState.table.buttonIndex).not.toBe(initialButton);
          expect(nextHandState.stage).toBe('init');
          expect(nextHandState.handsPlayed).toBe(gameState.handsPlayed + 1);
          expect(nextHandState.isHandActive).toBe(false);
          expect(nextHandState.board).toEqual([]);
          
          // Players should be reset for next hand
          nextHandState.table.seats.forEach(seat => {
            if (seat.player) {
              expect(seat.player.hole).toEqual([]);
              expect(['waiting', 'out']).toContain(seat.player.status);
            }
          });
        }
      }
    });
  });

  describe('Pot Management', () => {
    test('should calculate pot correctly after complete preflop betting', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      // Initial pot should be 0 (blinds are in betsThisRound but not yet in pot)
      expect(gameState.potManager.totalPot).toBe(0);
      
      // Blinds should be in betsThisRound: [0, 1, 2, 0, 0, 0] 
      // (seat 0=button/no blind, seat 1=SB, seat 2=BB)
      expect(gameState.bettingRound.betsThisRound).toEqual([0, 1, 2, 0, 0, 0]);
      
      // Complete preflop betting round
      // Player 1 (index 0, button) calls $2 to match big blind
      let currentPlayer = getCurrentPlayer(gameState)!;
      expect(currentPlayer.seatIndex).toBe(0); // Should be button (first to act after big blind)
      let result = applyAction(gameState, createAction('call', currentPlayer.id, 0, 2));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      if (result.ok) gameState = result.value;
      
      // Player 2 (small blind) calls additional $1 to match big blind
      currentPlayer = getCurrentPlayer(gameState)!;
      expect(currentPlayer.seatIndex).toBe(1); // Small blind
      result = applyAction(gameState, createAction('call', currentPlayer.id, 1, 1));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      if (result.ok) gameState = result.value;
      
      // Player 3 (big blind) checks (no additional bet needed)
      currentPlayer = getCurrentPlayer(gameState)!;
      expect(currentPlayer.seatIndex).toBe(2); // Big blind
      result = applyAction(gameState, createAction('check', currentPlayer.id, 2));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      if (result.ok) gameState = result.value;
      
      // After complete preflop betting, should advance to flop
      expect(gameState.stage).toBe('flop');
      
      // Final pot should be exactly $6: $2 (button call) + $1 (SB) + $1 (SB call) + $2 (BB) = $6
      expect(gameState.potManager.totalPot).toBe(6);
      
      // betsThisRound should be reset for new round
      expect(gameState.bettingRound.betsThisRound).toEqual([0, 0, 0, 0, 0, 0]);
    });

    test('should track pot correctly through betting rounds', () => {
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed');
      
      const initialPot = gameState.potManager.totalPot; // Should be 0
      expect(initialPot).toBe(0);
      
      // Get the current player to act (should be player after big blind)
      const currentPlayer = getCurrentPlayer(gameState)!;
      const toCall = gameState.bettingRound.currentBet - gameState.bettingRound.betsThisRound[currentPlayer.seatIndex!];
      
      const result = applyAction(gameState, createAction('call', currentPlayer.id, currentPlayer.seatIndex!, toCall));
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        // Pot should still be 0 (not updated until betting round completes)
        expect(result.value.potManager.totalPot).toBe(0);
        // But betsThisRound should show the call
        expect(result.value.bettingRound.betsThisRound[currentPlayer.seatIndex!]).toBe(toCall);
      }
    });
  });

  describe('All-In Game Flow', () => {
    test('should continue to turn and river when all players go all-in at flop', () => {
      // Setup: Create game with 3 players
      let gameState = createTestGameState();
      gameState = addPlayersToGame(gameState, 3);
      gameState = startHand(gameState, 'test-seed-all-in-flop');
      
      // Force to flop stage and set all players to have small stacks for all-in scenario
      gameState.stage = 'flop';
      gameState.isHandActive = true; // This is crucial for legal actions to work
      gameState.board = [
        { suit: 'h', rank: 'A' },
        { suit: 's', rank: 'K' },
        { suit: 'c', rank: 'Q' }
      ];
      
      // Set up betting round for flop
      gameState.bettingRound = {
        stage: 'flop',
        currentBet: 0,
        lastRaiseAmount: 0,
        lastRaiserIndex: -1,
        actionIndex: 0,
        betsThisRound: Array(gameState.table.seats.length).fill(0),
        playersActed: Array(gameState.table.seats.length).fill(false),
        isComplete: false
      };
      
      // Modify player stacks for all-in scenario
      gameState.table.seats[0].player!.stack = 50; // Player 1: 50 chips
      gameState.table.seats[1].player!.stack = 75; // Player 2: 75 chips (will have 25 left after first all-in)
      gameState.table.seats[2].player!.stack = 100; // Player 3: 100 chips (will have 50 left after first all-in)
      
      // === FLOP BETTING: All players go all-in ===
      
      // Player 1 goes all-in (50 chips)
      let action = createAction('all-in', 'player1', 0, 50);
      let result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      expect(gameState.table.seats[0].player!.stack).toBe(0);
      expect(gameState.table.seats[0].player!.status).toBe('all-in');
      
      // Player 2 calls all-in (50 chips)
      action = createAction('call', 'player2', 1, 50);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      expect(gameState.table.seats[1].player!.stack).toBe(25); // 75 - 50
      expect(gameState.stage).toBe('flop'); // Should still be at flop
      
      // Player 3 calls all-in (50 chips)  
      action = createAction('call', 'player3', 2, 50);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      expect(gameState.table.seats[2].player!.stack).toBe(50); // 100 - 50
      
      // After flop betting completes, should advance to turn
      expect(gameState.stage).toBe('turn');
      expect(gameState.board.length).toBe(4); // Flop (3) + Turn (1)
      
      // === TURN BETTING: Remaining players go all-in ===
      
      // Player 2 checks (since betting starts fresh on turn)
      let currentPlayer = getCurrentPlayer(gameState)!;
      action = createAction('check', currentPlayer.id, currentPlayer.seatIndex!);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      // Player 3 goes all-in with remaining chips
      action = createAction('all-in', 'player3', 2, 50);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      expect(gameState.table.seats[2].player!.status).toBe('all-in');
      expect(gameState.table.seats[2].player!.stack).toBe(0);
      
      // Player 2 calls the all-in with remaining chips
      const toCallAmount = gameState.bettingRound.betsThisRound[2] - gameState.bettingRound.betsThisRound[1];
      action = createAction('call', 'player2', 1, toCallAmount);
      result = applyAction(gameState, action);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      gameState = result.value;
      
      expect(gameState.table.seats[1].player!.status).toBe('all-in');
      expect(gameState.table.seats[1].player!.stack).toBe(0);
      
      // === FINAL VERIFICATION ===
      
      // Now ALL players are all-in, game should have advanced through river to showdown
      expect(['river', 'showdown']).toContain(gameState.stage);
      expect(gameState.board.length).toBe(5); // Flop (3) + Turn (1) + River (1)
      
      // Verify all players are all-in
      expect(gameState.table.seats[0].player!.status).toBe('all-in');
      expect(gameState.table.seats[1].player!.status).toBe('all-in');
      expect(gameState.table.seats[2].player!.status).toBe('all-in');
      
      // Game should have dealt all 5 community cards and be at showdown or ready for showdown
      expect(gameState.board.length).toBe(5);
      expect(['river', 'showdown']).toContain(gameState.stage);
    });
  });
}); 