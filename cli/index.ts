#!/usr/bin/env node
import readline from 'readline';
import chalk from 'chalk';
import figures from 'figures';
import { ApiClient } from './api-client.js';
import { GameState, JoinGameConfig } from '../engine/types.js';

const apiClient = new ApiClient();
let currentGameId: string | null = null;
let currentPlayerId: string | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.green('poker> '),
});

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function showGameInfo(gameId?: string): Promise<void> {
  const targetGameId = gameId || currentGameId;
  if (!targetGameId) {
    console.log(chalk.yellow('⚠️ No active game selected'));
    return;
  }
  
  try {
    const gameInfo = await apiClient.getGameInfo(targetGameId);
    const { gameState, seatedPlayers, canStart } = gameInfo;
    
    console.log(chalk.cyan(`🎮 Game ID: ${targetGameId}`));
    console.log(chalk.cyan(`🔄 State: ${gameState.stage}`));
    console.log(chalk.cyan(`👥 Players (${seatedPlayers.length}/${gameState.table.seats.length}):`));
    
    if (seatedPlayers.length === 0) {
      console.log(chalk.gray('  No players seated'));
    } else {
      seatedPlayers.forEach(player => {
        const seatNum = gameState.table.seats.findIndex(seat => seat.player?.id === player.id) + 1;
        const status = player.isConnected ? 'waiting' : 'disconnected';
        console.log(chalk.white(`  Seat ${seatNum}: ${player.name} ($${player.stack}) - ${status}`));
      });
    }
    
    if (canStart) {
      console.log(chalk.green('✅ Ready to start hand'));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error getting game info: ${error}`));
  }
}

async function listGames(): Promise<void> {
  try {
    const games = await apiClient.listGamesDetailed();
    
    if (games.length === 0) {
      console.log(chalk.yellow('No active games found.'));
      return;
    }
    
    console.log(chalk.blue('📋 Active Games:'));
    for (const game of games) {
      const status = game.canStart ? 'ready_to_start' : 'waiting_for_players';
      console.log(chalk.white(`🎮 ${game.gameId} - ${status} (${game.playerCount}/${game.maxPlayers} players) - Blinds: $1/$2`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error listing games: ${error}`));
  }
}

async function createGame(): Promise<void> {
  try {
    const { gameId, gameState } = await apiClient.createEmptyGame({
      smallBlind: 1,
      bigBlind: 2,
      maxPlayers: 9
    });
    
    console.log(chalk.green('✅ Game created successfully!'));
    console.log(chalk.cyan(`🎮 Game ID: ${gameId}`));
    console.log(chalk.cyan(`🔄 Current state: ${gameState.stage}`));
    console.log(chalk.cyan(`👥 Players: 0/${gameState.table.seats.length}`));
    console.log(chalk.cyan('💰 Blinds: $1/$2'));
  } catch (error) {
    console.log(chalk.red(`❌ Error creating game: ${error}`));
  }
}

async function joinGame(gameId: string, playerName: string, preferredSeat?: number): Promise<void> {
  try {
    if (!currentPlayerId) {
      currentPlayerId = generatePlayerId();
    }
    
    const config: JoinGameConfig = {
      gameId,
      playerId: currentPlayerId,
      playerName,
      buyIn: 1000
    };
    
    if (preferredSeat !== undefined) {
      config.seatIndex = preferredSeat - 1; // Convert to 0-based index
    }
    
    await apiClient.joinGame(config);
    currentGameId = gameId;
    
    console.log(chalk.green(`✅ Successfully joined ${gameId} as ${playerName}`));
    
    // Show seat assignment
    const gameInfo = await apiClient.getGameInfo(gameId);
    const player = gameInfo.seatedPlayers.find(p => p.id === currentPlayerId);
    if (player) {
      const seatNum = gameInfo.gameState.table.seats.findIndex(seat => seat.player?.id === player.id) + 1;
      console.log(chalk.cyan(`🪑 Seat: ${seatNum}`));
      console.log(chalk.cyan(`💰 Stack: $${player.stack}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error joining game: ${error}`));
  }
}

async function leaveGame(): Promise<void> {
  if (!currentGameId || !currentPlayerId) {
    console.log(chalk.red('❌ Error: Not currently in a game'));
    return;
  }
  
  try {
    await apiClient.leaveGame(currentGameId, currentPlayerId);
    console.log(chalk.green('✅ Successfully left the game'));
    currentGameId = null;
  } catch (error) {
    console.log(chalk.red(`❌ Error leaving game: ${error}`));
  }
}

async function selectGame(gameId: string): Promise<void> {
  try {
    // Verify game exists
    await apiClient.getGame(gameId);
    currentGameId = gameId;
    console.log(chalk.green(`✅ Selected ${gameId}`));
  } catch (error) {
    console.log(chalk.red(`❌ Error: Game not found`));
  }
}

async function showLegalActions(): Promise<void> {
  if (!currentGameId) {
    console.log(chalk.yellow('⚠️ No active game selected'));
    return;
  }
  
  try {
    const actions = await apiClient.getLegalActions(currentGameId);
    
    if (actions.length === 0) {
      console.log(chalk.yellow('⚠️ No legal actions available (waiting for more players)'));
      return;
    }
    
    console.log(chalk.blue('Legal actions:'), actions);
  } catch (error) {
    console.log(chalk.red(`❌ Error getting legal actions: ${error}`));
  }
}

async function startNewHand(): Promise<void> {
  if (!currentGameId) {
    console.log(chalk.yellow('⚠️ No active game selected'));
    return;
  }
  
  try {
    const gameState = await apiClient.startHand(currentGameId);
    console.log(chalk.green('✅ New hand started!'));
    console.log(chalk.cyan(`🃏 Stage: ${gameState.stage}`));
    console.log(chalk.cyan(`🎲 Hand #${gameState.handsPlayed}`));
    
    // Show basic game info after starting hand
    await showGameInfo();
  } catch (error) {
    console.log(chalk.red(`❌ Error starting hand: ${error}`));
  }
}

async function applyAction(actionType: string, amount?: number): Promise<void> {
  if (!currentGameId || !currentPlayerId) {
    console.log(chalk.yellow('⚠️ No active game selected or not joined'));
    return;
  }
  
  try {
    const action = {
      type: actionType as any, // Type assertion for ActionType
      playerId: currentPlayerId,
      seatIndex: 0, // Will be corrected by server
      timestamp: Date.now(),
      ...(amount !== undefined && { amount })
    };
    
    const gameState = await apiClient.applyAction(currentGameId, action);
    console.log(chalk.green(`✅ ${actionType} applied successfully`));
    console.log(chalk.cyan(`🃏 Stage: ${gameState.stage}`));
    
    // Show updated game info
    await showGameInfo();
  } catch (error) {
    console.log(chalk.red(`❌ Error applying ${actionType}: ${error}`));
  }
}

function showHelp(): void {
  console.log(chalk.blue(`
📖 Available Commands:
• create - Create a new game
• join <gameId> <name> [seat] - Join a game
• leave - Leave current game
• select <gameId> - Select a game to view
• info - Show current game information
• start - Start a new hand (when ready)
• a <action> [amount] - Apply poker action (check, call, fold, bet, raise)
• g - List all active games
• l - Show legal actions
• h - Show this help menu
• exit - Quit the CLI
  `));
}

async function handleCommand(line: string): Promise<void> {
  const [cmd, ...args] = line.trim().split(/\s+/);
  
  if (!cmd) {
    return;
  }
  
  try {
    switch (cmd) {
      case 'create':
        await createGame();
        break;
        
      case 'join': {
        const [gameId, playerName, seatStr] = args;
        if (!gameId || !playerName) {
          console.log(chalk.red('❌ Usage: join <gameId> <playerName> [seat]'));
          break;
        }
        
        const preferredSeat = seatStr ? parseInt(seatStr, 10) : undefined;
        if (preferredSeat !== undefined && (preferredSeat < 1 || preferredSeat > 9)) {
          console.log(chalk.red('❌ Error: Invalid seat number (must be 1-9)'));
          break;
        }
        
        await joinGame(gameId, playerName, preferredSeat);
        break;
      }
      
      case 'leave':
        await leaveGame();
        break;
        
      case 'select': {
        const [gameId] = args;
        if (!gameId) {
          console.log(chalk.red('❌ Usage: select <gameId>'));
          break;
        }
        await selectGame(gameId);
        break;
      }
      
      case 'info':
        await showGameInfo();
        break;
        
      case 'g':
        await listGames();
        break;
        
      case 'l':
        await showLegalActions();
        break;
        
      case 'h':
      case 'help':
        showHelp();
        break;
        
      case 'q':
      case 'exit':
        rl.close();
        break;
        
      case 'start':
        await startNewHand();
        break;
        
      case 'a': {
        const [actionType, amountStr] = args;
        if (!actionType) {
          console.log(chalk.red('❌ Usage: a <action> [amount]'));
          console.log(chalk.gray('  Examples: a check, a call, a fold, a bet 10, a raise 20'));
          break;
        }
        
        const amount = amountStr ? parseInt(amountStr, 10) : undefined;
        await applyAction(actionType, amount);
        break;
      }
        
      default:
        console.log(chalk.yellow(`❌ Unknown command: ${cmd}. Type "h" for help.`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error}`));
  }
}

console.log(chalk.blue('🎮 Welcome to Poker CLI! Type "h" for help.'));
rl.prompt();

rl.on('line', async (line) => {
  await handleCommand(line);
  rl.prompt();
});

rl.on('close', () => {
  console.log(chalk.blue('👋 Goodbye!'));
  process.exit(0);
}); 