import { GameState, Action, NewGameConfig, Result, PokerError, JoinGameConfig } from '../../engine/types';
import { newGame, legalActions, applyAction, showdown, awardWinnings, completeHand } from '../../engine';
import { joinGame, leaveGame, initializeSeats, canStartHand, getActivePlayers, getSeatedPlayers } from '../../engine/player-manager';
import { startHand, validateHandStart } from '../../engine/game-flow';

// Simple in-memory storage for game states
// In production, this would be replaced with a database
const gameStates = new Map<string, GameState>();
let gameIdCounter = 0;

export class GameManager {
  static createEmptyGame(config: Partial<NewGameConfig> = {}): { gameId: string; gameState: GameState } {
    const gameId = config.gameId || `game_${++gameIdCounter}`;
    
    // Create an empty game state with proper table setup
    const gameState: GameState = {
      gameId,
      stage: 'init',
      board: [],
      deck: [],
      bettingRound: {
        stage: 'init',
        currentBet: 0,
        lastRaiseAmount: 0,
        lastRaiserIndex: -1,
        actionIndex: 0,
        betsThisRound: Array(config.maxPlayers || 6).fill(0),
        playersActed: Array(config.maxPlayers || 6).fill(false),
        isComplete: false
      },
      history: [],
      table: {
        buttonIndex: config.buttonIndex || 0,
        smallBlind: config.smallBlind || 1,
        bigBlind: config.bigBlind || 2,
        seats: initializeSeats(config.maxPlayers || 6),
        maxPlayers: config.maxPlayers || 6,
        minPlayers: config.minPlayers || 2
      },
      potManager: {
        mainPot: 0,
        sidePots: [],
        totalPot: 0
      },
      handsPlayed: 0,
      isHandActive: false
    };

    gameStates.set(gameId, gameState);
    return { gameId, gameState };
  }

  static createGame(config: NewGameConfig): { gameId: string; gameState: GameState } {
    const gameId = `game_${++gameIdCounter}`;
    const gameState = newGame(config);
    gameStates.set(gameId, gameState);
    return { gameId, gameState };
  }

  static getGame(gameId: string): GameState | null {
    return gameStates.get(gameId) || null;
  }

  static updateGame(gameId: string, newState: GameState): void {
    gameStates.set(gameId, newState);
  }

  static joinGame(config: JoinGameConfig): Result<GameState, PokerError> {
    const gameState = this.getGame(config.gameId);
    if (!gameState) {
      return { ok: false, error: PokerError.GameNotStarted };
    }

    const result = joinGame(gameState, config);
    if (result.ok) {
      this.updateGame(config.gameId, result.value);
    }
    return result;
  }

  static leaveGame(gameId: string, playerId: string): Result<GameState, PokerError> {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return { ok: false, error: PokerError.GameNotStarted };
    }

    const result = leaveGame(gameState, playerId);
    if (result.ok) {
      this.updateGame(gameId, result.value);
    }
    return result;
  }

  static canStartHand(gameId: string): { canStart: boolean; reason?: string } | null {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return null;
    }
    return canStartHand(gameState);
  }

  static getGameInfo(gameId: string): { 
    gameState: GameState; 
    activePlayers: any[]; 
    seatedPlayers: any[];
    canStart: boolean;
    reason?: string;
  } | null {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return null;
    }

    const activePlayers = getActivePlayers(gameState);
    const seatedPlayers = getSeatedPlayers(gameState);
    const startCheck = canStartHand(gameState);

    return {
      gameState,
      activePlayers,
      seatedPlayers,
      canStart: startCheck.canStart,
      reason: startCheck.reason
    };
  }

  static applyAction(gameId: string, action: Action): Result<GameState, PokerError> {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return { ok: false, error: PokerError.GameNotStarted };
    }

    const result = applyAction(gameState, action);
    if (result.ok) {
      this.updateGame(gameId, result.value);
    }
    return result;
  }

  static getLegalActions(gameId: string): Action[] | null {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return null;
    }
    return legalActions(gameState);
  }

  static showdown(gameId: string) {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return { ok: false, error: PokerError.GameNotStarted };
    }
    return showdown(gameState);
  }

  static deleteGame(gameId: string): boolean {
    return gameStates.delete(gameId);
  }

  static listGames(): string[] {
    return Array.from(gameStates.keys());
  }

  static getGamesList(): Array<{ gameId: string; playerCount: number; maxPlayers: number; canStart: boolean }> {
    return Array.from(gameStates.entries()).map(([gameId, gameState]) => {
      const seatedPlayers = getSeatedPlayers(gameState);
      const startCheck = canStartHand(gameState);
      return {
        gameId,
        playerCount: seatedPlayers.length,
        maxPlayers: gameState.table.maxPlayers,
        canStart: startCheck.canStart
      };
    });
  }

  static startHand(gameId: string, seed?: string): Result<GameState, string> {
    const gameState = gameStates.get(gameId);
    if (!gameState) {
      return { ok: false, error: 'Game not found' };
    }

    // Validate that hand can be started
    const validation = validateHandStart(gameState);
    if (!validation.canStart) {
      return { ok: false, error: validation.reason || 'Cannot start hand' };
    }

    try {
      const newGameState = startHand(gameState, seed);
      gameStates.set(gameId, newGameState);
      return { ok: true, value: newGameState };
    } catch (error) {
      return { ok: false, error: `Failed to start hand: ${error}` };
    }
  }

  static awardWinnings(gameId: string) {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return { ok: false, error: PokerError.GameNotStarted };
    }

    // Get showdown results first
    const showdownResult = showdown(gameState);
    if (!showdownResult.ok) {
      return showdownResult;
    }

    // Award winnings to players
    const updatedState = awardWinnings(gameState, showdownResult.value);
    this.updateGame(gameId, updatedState);
    
    return { ok: true, value: { gameState: updatedState, showdownResults: showdownResult.value } };
  }

  static completeHand(gameId: string): Result<GameState, PokerError> {
    const gameState = this.getGame(gameId);
    if (!gameState) {
      return { ok: false, error: PokerError.GameNotStarted };
    }

    const result = completeHand(gameState);
    if (result.ok) {
      this.updateGame(gameId, result.value);
    }
    return result;
  }
} 