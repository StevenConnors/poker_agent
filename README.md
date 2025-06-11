# Poker App

A Texas Hold'em poker game with a Next.js server and CLI client.

## Architecture

The application is organized into separate components:

- **Engine** (`engine/`): Core game logic and types
- **Server** (`pages/api/`): Next.js API routes that manage game state server-side
- **CLI** (`cli/`): Command-line client that communicates with the server via HTTP

## Getting Started

### Running the Server

Start the Next.js development server:

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

### Running the CLI

In a separate terminal, start the CLI client:

```bash
npm run cli
```

## CLI Commands

- `n` - Start a new game
- `a <action> [amount]` - Apply an action (fold, call, check, bet, raise, all-in)
- `l` - List legal actions for current player
- `s` - Show current game state
- `g` - List all active games on the server
- `j <gameId>` - Join an existing game
- `h` or `help` - Show help
- `q` or `exit` - Quit

## API Endpoints

The server exposes the following operations via `POST /api/game`:

- `newGame` - Create a new game
- `getGame` - Get current game state
- `legalActions` - Get legal actions for current player
- `applyAction` - Apply a player action
- `listGames` - List all active games
- `deleteGame` - Delete a game
- `showdown` - Get showdown results

## Multiple CLI Sessions

You can run multiple CLI sessions simultaneously. Each can:
- Create new games
- Join existing games by ID
- Play in the same game from different terminals

Game state is maintained server-side, so all clients see the same state.

## Example Usage

1. Start the server: `npm run dev`
2. Start CLI session 1: `npm run cli`
   - Type `n` to create a new game (note the Game ID)
   - Type `a call` to make a call action
3. Start CLI session 2: `npm run cli`
   - Type `g` to list active games
   - Type `j game_1` to join the first game
   - Type `s` to see the current state 