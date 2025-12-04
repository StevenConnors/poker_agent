import { create } from 'zustand';
import { GameState, Action, ShowdownResult } from '../engine/types';

interface GameStore {
  // State
  gameState: GameState | null;
  legalActions: Action[];
  loading: boolean;
  error: string | null;
  connecting: boolean;
  showRoundSummary: boolean;
  roundResults: ShowdownResult[];
  
  // Actions
  setGameState: (gameState: GameState | null) => void;
  setLegalActions: (actions: Action[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnecting: (connecting: boolean) => void;
  setShowRoundSummary: (show: boolean, results?: ShowdownResult[]) => void;
  clearError: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  gameState: null,
  legalActions: [],
  loading: true,
  error: null,
  connecting: false,
  showRoundSummary: false,
  roundResults: [],

  // Actions
  setGameState: (gameState) => set({ gameState }),
  setLegalActions: (legalActions) => set({ legalActions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setConnecting: (connecting) => set({ connecting }),
  setShowRoundSummary: (showRoundSummary, roundResults = []) => 
    set({ showRoundSummary, roundResults }),
  clearError: () => set({ error: null }),
  reset: () => set({
    gameState: null,
    legalActions: [],
    loading: true,
    error: null,
    connecting: false,
    showRoundSummary: false,
    roundResults: [],
  }),
})); 