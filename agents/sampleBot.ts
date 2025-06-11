import { Agent, GameState, Action } from '../types';

export const sampleBot: Agent = {
  async decide(gs: Readonly<GameState>, legal: Readonly<Action[]>): Promise<Action> {
    // Always call or check if possible
    const callOrCheck = legal.find(a => a.type === 'call') || legal.find(a => a.type === 'check');
    return callOrCheck || legal[0];
  },
}; 