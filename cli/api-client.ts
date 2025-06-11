import fetch from 'node-fetch';
import { GameState, Action, NewGameConfig, JoinGameConfig, Player } from '../engine/types';

interface ApiResponse<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

interface GameInfo {
  gameState: GameState;
  activePlayers: Player[];
  seatedPlayers: Player[];
  canStart: boolean;
  reason?: string;
}

interface GameListItem {
  gameId: string;
  playerCount: number;
  maxPlayers: number;
  canStart: boolean;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(op: string, payload?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ op, payload }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  async createGame(config: NewGameConfig): Promise<{ gameId: string; gameState: GameState }> {
    const response = await this.request<{ gameId: string; gameState: GameState }>('newGame', config);
    if (!response.ok) {
      throw new Error(`Failed to create game: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async createEmptyGame(config: Partial<NewGameConfig> = {}): Promise<{ gameId: string; gameState: GameState }> {
    const response = await this.request<{ gameId: string; gameState: GameState }>('createEmptyGame', config);
    if (!response.ok) {
      throw new Error(`Failed to create empty game: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async joinGame(config: JoinGameConfig): Promise<GameState> {
    const response = await this.request<GameState>('joinGame', config);
    if (!response.ok) {
      throw new Error(`Failed to join game: ${response.error || 'Unknown error'}`);
    }
    return response.value!;
  }

  async leaveGame(gameId: string, playerId: string): Promise<GameState> {
    const response = await this.request<GameState>('leaveGame', { gameId, playerId });
    if (!response.ok) {
      throw new Error(`Failed to leave game: ${response.error || 'Unknown error'}`);
    }
    return response.value!;
  }

  async getGame(gameId: string): Promise<GameState> {
    const response = await this.request<GameState>('getGame', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to get game: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async getGameInfo(gameId: string): Promise<GameInfo> {
    const response = await this.request<GameInfo>('getGameInfo', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to get game info: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async canStartHand(gameId: string): Promise<{ canStart: boolean; reason?: string }> {
    const response = await this.request<{ canStart: boolean; reason?: string }>('canStartHand', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to check if hand can start: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async startHand(gameId: string, seed?: string): Promise<GameState> {
    const response = await this.request<GameState>('startHand', { gameId, seed });
    if (!response.ok) {
      throw new Error(`Failed to start hand: ${response.error || 'Unknown error'}`);
    }
    return response.value!;
  }

  async getLegalActions(gameId: string): Promise<Action[]> {
    const response = await this.request<Action[]>('legalActions', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to get legal actions: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async applyAction(gameId: string, action: Action): Promise<GameState> {
    const response = await this.request<GameState>('applyAction', { gameId, action });
    if (!response.ok) {
      throw new Error(`Failed to apply action: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async showdown(gameId: string) {
    const response = await this.request('showdown', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to get showdown: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async awardWinnings(gameId: string) {
    const response = await this.request('awardWinnings', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to award winnings: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async completeHand(gameId: string): Promise<GameState> {
    const response = await this.request<GameState>('completeHand', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to complete hand: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async listGames(): Promise<string[]> {
    const response = await this.request<string[]>('listGames');
    if (!response.ok) {
      throw new Error(`Failed to list games: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async listGamesDetailed(): Promise<GameListItem[]> {
    const response = await this.request<GameListItem[]>('listGamesDetailed');
    if (!response.ok) {
      throw new Error(`Failed to list games detailed: ${JSON.stringify(response)}`);
    }
    return response.value!;
  }

  async deleteGame(gameId: string): Promise<boolean> {
    const response = await this.request<{ deleted: boolean }>('deleteGame', { gameId });
    if (!response.ok) {
      throw new Error(`Failed to delete game: ${JSON.stringify(response)}`);
    }
    return response.value!.deleted;
  }
} 