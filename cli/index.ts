#!/usr/bin/env node
import readline from 'readline';
import chalk from 'chalk';
import figures from 'figures';
import { ApiClient } from './api-client.js';
import { GameState, JoinGameConfig, Card, Player } from '../engine/types.js';

const apiClient = new ApiClient();
let currentGameId: string | null = null;
let currentPlayerId: string | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.green('poker> '),
});

// --- Card and Game State Formatting ---

function formatCard(card: Card): string {
  const suitColors = {
    'h': '♥️', // hearts - red
    'd': '♦️', // diamonds - red  
    'c': '♣️', // clubs - black
    's': '♠️'  // spades - black
  };
  
  const suitSymbol = suitColors[card.suit];
  const isRed = card.suit === 'h' || card.suit === 'd';
  
  return isRed 
    ? chalk.red(`${card.rank}${suitSymbol}`)
    : chalk.white(`${card.rank}${suitSymbol}`);
}

function formatCards(cards: Card[]): string {
  if (!cards || cards.length === 0) return chalk.gray('--');
  return cards.map(formatCard).join(' ');
}

function formatPot(pot: number): string {
  return chalk.yellow(`💰 $${pot}`);
}

function formatStack(stack: number): string {
  return chalk.green(`($${stack})`);
}

function formatActionHistory(history: any[], recentCount: number = 3): string {
  if (!history || history.length === 0) return chalk.gray('No actions yet');
  
  const recent = history.slice(-recentCount);
  return recent.map(action => {
    const amount = action.amount ? ` $${action.amount}` : '';
    return chalk.cyan(`${action.type}${amount}`);
  }).join(', ');
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function showDetailedGameState(gameId?: string): Promise<void> {
  const targetGameId = gameId || currentGameId;
  if (!targetGameId) {
    console.log(chalk.yellow('⚠️ No active game selected'));
    return;
  }
  
  try {
    const gameInfo = await apiClient.getGameInfo(targetGameId);
    const { gameState, seatedPlayers, canStart } = gameInfo;
    
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold(`🎮 GAME: ${targetGameId} | Stage: ${gameState.stage.toUpperCase()}`));
    console.log(chalk.cyan('═'.repeat(60)));
    
    // Pot information
    if (gameState.potManager.totalPot > 0) {
      console.log(formatPot(gameState.potManager.totalPot));
    }
    
    // Board cards
    if (gameState.board.length > 0) {
      console.log(`🃏 Board: ${formatCards(gameState.board)}`);
    }
    
    // Current player's hand (if they're in the game)
    const currentPlayer = seatedPlayers.find(p => p.id === currentPlayerId);
    if (currentPlayer && currentPlayer.hole && currentPlayer.hole.length > 0) {
      console.log(`🎯 Your Cards: ${formatCards(currentPlayer.hole)} ${formatStack(currentPlayer.stack)}`);
    }
    
    // Action to act indicator
    if (gameState.stage !== 'init' && gameState.stage !== 'finished' && gameState.isHandActive) {
      const currentActionSeat = gameState.table.seats[gameState.bettingRound.actionIndex];
      if (currentActionSeat?.player) {
        const isYourTurn = currentActionSeat.player.id === currentPlayerId;
        const turnIndicator = isYourTurn ? chalk.green.bold('>>> YOUR TURN <<<') : chalk.blue(`${currentActionSeat.player.name}'s turn`);
        console.log(`⏰ ${turnIndicator}`);
        
        // Show legal actions if it's player's turn
        if (isYourTurn) {
          try {
            const actions = await apiClient.getLegalActions(targetGameId);
            if (actions.length > 0) {
              const actionList = actions.map(a => {
                const amount = a.amount ? ` $${a.amount}` : '';
                return chalk.white(`${a.type}${amount}`);
              }).join(', ');
              console.log(chalk.blue(`Legal actions: ${actionList}`));
            }
          } catch (error) {
            // Ignore errors for legal actions
          }
        }
      }
    }
    
    // Player seating chart
    console.log(chalk.cyan('\n👥 SEATING CHART:'));
    
    if (seatedPlayers.length === 0) {
      console.log(chalk.gray('  No players seated'));
    } else {
      gameState.table.seats.forEach((seat, index) => {
        if (seat.player) {
          const player = seat.player;
          const seatNum = index + 1;
          const isButton = index === gameState.table.buttonIndex;
          const isCurrentPlayer = player.id === currentPlayerId;
          const isActive = player.status === 'active';
          const isActing = gameState.bettingRound.actionIndex === index && gameState.isHandActive;
          
          // Status indicators
          let statusIcons = '';
          if (isButton) statusIcons += '🔘 '; // Button
          if (isActing) statusIcons += '⏰ '; // Acting
          if (isCurrentPlayer) statusIcons += '🎯 '; // Current player
          
          // Status color
          let nameColor = chalk.white;
          if (!player.isConnected) nameColor = chalk.gray;
          else if (!isActive) nameColor = chalk.red;
          else if (isActing) nameColor = chalk.yellow;
          else if (isCurrentPlayer) nameColor = chalk.green;
          
          // Betting info this round
          const currentBet = gameState.bettingRound.betsThisRound[index];
          const betInfo = currentBet > 0 ? chalk.yellow(` bet: $${currentBet}`) : '';
          
          console.log(`  Seat ${seatNum}: ${statusIcons}${nameColor(player.name)} ${formatStack(player.stack)} ${chalk.gray(`[${player.status}]`)}${betInfo}`);
        } else {
          console.log(chalk.gray(`  Seat ${index + 1}: empty`));
        }
      });
    }
    
    // Recent action history
    if (gameState.history && gameState.history.length > 0) {
      console.log(chalk.cyan('\n📝 Recent Actions:'));
      console.log(`  ${formatActionHistory(gameState.history, 5)}`);
    }
    
    // Game status
    console.log(chalk.cyan('\n📊 GAME STATUS:'));
    console.log(`  Hand #${gameState.handsPlayed} | Active: ${gameState.isHandActive ? 'Yes' : 'No'}`);
    console.log(`  Blinds: $${gameState.table.smallBlind}/$${gameState.table.bigBlind}`);
    
    if (canStart && !gameState.isHandActive) {
      console.log(chalk.green('  ✅ Ready to start next hand'));
    } else if (!gameState.isHandActive) {
      console.log(chalk.yellow('  ⚠️ Waiting for more players'));
    }
    
    console.log(chalk.cyan('═'.repeat(60)) + '\n');
    
  } catch (error) {
    console.log(chalk.red(`❌ Error getting game info: ${error}`));
  }
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
    
    // Show detailed game state after starting hand
    await showDetailedGameState();
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
    
    // Show updated detailed game state
    await showDetailedGameState();
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
• info - Show basic game information
• state - Show detailed game state (cards, board, turn)
• start - Start a new hand (when ready)
• a <action> [amount] - Apply poker action (check, call, fold, bet, raise)
• g - List all active games
• l - Show legal actions
• h - Show this help menu
• exit - Quit the CLI

🎯 Action Examples:
• a check - Check (when no bet to call)
• a call - Call current bet
• a fold - Fold hand
• a bet 10 - Bet $10
• a raise 20 - Raise $20
• a all-in - Go all-in
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
        
      case 'state':
        await showDetailedGameState();
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