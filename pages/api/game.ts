import type { NextApiRequest, NextApiResponse } from 'next';
import { GameManager } from './game-manager';
import { Action, NewGameConfig, JoinGameConfig } from '../../engine/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const { op, payload } = req.body;
  
  try {
    switch (op) {
      case 'newGame': {
        const config = payload as NewGameConfig;
        const { gameId, gameState } = GameManager.createGame(config);
        res.status(200).json({ ok: true, value: { gameId, gameState } });
        break;
      }

      case 'createEmptyGame': {
        const config = payload as Partial<NewGameConfig> || {};
        const { gameId, gameState } = GameManager.createEmptyGame(config);
        res.status(200).json({ ok: true, value: { gameId, gameState } });
        break;
      }

      case 'joinGame': {
        const config = payload as JoinGameConfig;
        const result = GameManager.joinGame(config);
        res.status(200).json(result);
        break;
      }

      case 'leaveGame': {
        const { gameId, playerId } = payload as { gameId: string; playerId: string };
        const result = GameManager.leaveGame(gameId, playerId);
        res.status(200).json(result);
        break;
      }
      
      case 'getGame': {
        const { gameId } = payload as { gameId: string };
        const gameState = GameManager.getGame(gameId);
        if (!gameState) {
          res.status(404).json({ ok: false, error: 'Game not found' });
          return;
        }
        res.status(200).json({ ok: true, value: gameState });
        break;
      }

      case 'getGameInfo': {
        const { gameId } = payload as { gameId: string };
        const gameInfo = GameManager.getGameInfo(gameId);
        if (!gameInfo) {
          res.status(404).json({ ok: false, error: 'Game not found' });
          return;
        }
        res.status(200).json({ ok: true, value: gameInfo });
        break;
      }

      case 'canStartHand': {
        const { gameId } = payload as { gameId: string };
        const result = GameManager.canStartHand(gameId);
        if (!result) {
          res.status(404).json({ ok: false, error: 'Game not found' });
          return;
        }
        res.status(200).json({ ok: true, value: result });
        break;
      }

      case 'startHand': {
        const { gameId, seed } = payload as { gameId: string; seed?: string };
        const result = GameManager.startHand(gameId, seed);
        res.status(200).json(result);
        break;
      }
      
      case 'legalActions': {
        const { gameId } = payload as { gameId: string };
        const actions = GameManager.getLegalActions(gameId);
        if (actions === null) {
          res.status(404).json({ ok: false, error: 'Game not found' });
          return;
        }
        res.status(200).json({ ok: true, value: actions });
        break;
      }
      
      case 'applyAction': {
        const { gameId, action } = payload as { gameId: string; action: Action };
        const result = GameManager.applyAction(gameId, action);
        res.status(200).json(result);
        break;
      }
      
      case 'showdown': {
        const { gameId } = payload as { gameId: string };
        const result = GameManager.showdown(gameId);
        res.status(200).json(result);
        break;
      }
      
      case 'listGames': {
        const gameIds = GameManager.listGames();
        res.status(200).json({ ok: true, value: gameIds });
        break;
      }

      case 'listGamesDetailed': {
        const games = GameManager.getGamesList();
        res.status(200).json({ ok: true, value: games });
        break;
      }
      
      case 'deleteGame': {
        const { gameId } = payload as { gameId: string };
        const deleted = GameManager.deleteGame(gameId);
        res.status(200).json({ ok: true, value: { deleted } });
        break;
      }
      
      default:
        res.status(400).json({ error: 'Unknown operation' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Internal error', details: String(e) });
  }
} 