# Manual Testing Commands for Poker CLI

## Prerequisites
1. Start the server: `npm run dev`
2. Open CLI in separate terminal: `npm run cli`

## Test Scenario 1: Basic Game Creation and Listing

### Commands:
```bash
# List all games (should be empty initially)
g

# Create a new game
create

# List games again (should show the new game)
g
```

### Expected Results:
```
> g
No active games found.

> create
✅ Game created successfully!
🎮 Game ID: game_1
🔄 Current state: waiting_for_players
👥 Players: 0/9
💰 Blinds: $1/$2

> g
📋 Active Games:
🎮 game_1 - waiting_for_players (0/9 players) - Blinds: $1/$2
```

## Test Scenario 2: Single Player Joining

### Commands:
```bash
# Join the game as first player
join game_1 Alice

# Check game info
info

# Try to get legal actions (should be none - waiting for more players)
l
```

### Expected Results:
```
> join game_1 Alice
✅ Successfully joined game_1 as Alice
🪑 Seat: 1
💰 Stack: $1000

> info
🎮 Game ID: game_1
🔄 State: waiting_for_players
👥 Players (1/9):
  Seat 1: Alice ($1000) - waiting

> l
⚠️ No legal actions available (waiting for more players)
```

## Test Scenario 3: Multi-Player Testing (Requires Multiple Terminals)

### Terminal 1 (Alice):
```bash
join game_1 Alice
info
```

### Terminal 2 (Bob):
```bash
# Start second CLI instance
npm run cli

# Join same game
join game_1 Bob
info
```

### Expected Results in Both Terminals:
```
Terminal 1 (Alice):
> info
🎮 Game ID: game_1
🔄 State: ready_to_start (or in_progress if hand started)
👥 Players (2/9):
  Seat 1: Alice ($1000) - waiting
  Seat 2: Bob ($1000) - waiting

Terminal 2 (Bob):
> join game_1 Bob
✅ Successfully joined game_1 as Bob
🪑 Seat: 2
💰 Stack: $1000

> info
🎮 Game ID: game_1
🔄 State: ready_to_start
👥 Players (2/9):
  Seat 1: Alice ($1000) - waiting
  Seat 2: Bob ($1000) - waiting
```

## Test Scenario 4: Starting a Hand

### Commands:
```bash
# After having 2+ players in game_1
info

# Start the first hand
start

# Check the new game state
info

# Check available actions for current player
l
```

### Expected Results:
```
> info
🎮 Game ID: game_1
🔄 State: init
👥 Players (2/9):
  Seat 1: Alice ($1000) - waiting
  Seat 2: Bob ($1000) - waiting
✅ Ready to start hand

> start
✅ New hand started!
🃏 Stage: preflop
🎲 Hand #1
🎮 Game ID: game_1
🔄 State: preflop
👥 Players (2/9):
  Seat 1: Alice ($999) - active  [posted small blind]
  Seat 2: Bob ($998) - active    [posted big blind]

> l
Legal actions: [{"type":"call","amount":1},{"type":"fold"},{"type":"raise","amount":4}]
```

## Test Scenario 5: Player Leaving

### Commands:
```bash
# Bob leaves the game
leave

# Check game state
info

# List games to see updated player count
g
```

### Expected Results:
```
> leave
✅ Successfully left the game

> info
⚠️ No active game selected

> g
📋 Active Games:
🎮 game_1 - waiting_for_players (1/9 players) - Blinds: $1/$2
```

## Test Scenario 6: Specific Seat Selection

### Commands:
```bash
# Create new game for clean test
create

# Join with specific seat selection
join game_2 Charlie 5

# Try to join same seat (should fail)
join game_2 David 5

# Join different seat
join game_2 David 3

# Check seating arrangement
info
```

### Expected Results:
```
> create
✅ Game created successfully!
🎮 Game ID: game_2

> join game_2 Charlie 5
✅ Successfully joined game_2 as Charlie
🪑 Seat: 5
💰 Stack: $1000

> join game_2 David 5
❌ Error: Seat 5 is already taken

> join game_2 David 3
✅ Successfully joined game_2 as David
🪑 Seat: 3
💰 Stack: $1000

> info
🎮 Game ID: game_2
🔄 State: ready_to_start
👥 Players (2/9):
  Seat 3: David ($1000) - waiting
  Seat 5: Charlie ($1000) - waiting
```

## Test Scenario 6: Game Selection and Switching

### Commands:
```bash
# List available games
g

# Select different game
select game_1

# Check current game info
info

# Switch back to game_2
select game_2

# Verify switch worked
info
```

### Expected Results:
```
> g
📋 Active Games:
🎮 game_1 - waiting_for_players (1/9 players) - Blinds: $1/$2
🎮 game_2 - ready_to_start (2/9 players) - Blinds: $1/$2

> select game_1
✅ Selected game_1

> info
🎮 Game ID: game_1
🔄 State: waiting_for_players
👥 Players (1/9):
  Seat 1: Alice ($1000) - waiting

> select game_2
✅ Selected game_2

> info
🎮 Game ID: game_2
🔄 State: ready_to_start
👥 Players (2/9):
  Seat 3: David ($1000) - waiting
  Seat 5: Charlie ($1000) - waiting
```

## Test Scenario 7: Error Handling

### Commands:
```bash
# Try to join non-existent game
join game_999 TestPlayer

# Try to join with invalid seat
join game_1 TestPlayer 15

# Try to leave when not in a game
leave

# Try to get info for non-existent game
select game_999
```

### Expected Results:
```
> join game_999 TestPlayer
❌ Error: Game not found

> join game_1 TestPlayer 15
❌ Error: Invalid seat number (must be 1-9)

> leave
❌ Error: Not currently in a game

> select game_999
❌ Error: Game not found
```

## Test Scenario 8: Help and Commands

### Commands:
```bash
# Show help menu
h

# Show available commands
help
```

### Expected Results:
```
> h
📖 Available Commands:
• create - Create a new game
• join <gameId> <name> [seat] - Join a game
• leave - Leave current game
• select <gameId> - Select a game to view
• info - Show current game information
• g - List all active games
• l - Show legal actions
• h - Show this help menu
• exit - Quit the CLI

> help
📖 Available Commands:
[Same as above]
```

## Test Scenario 9: Multiple Games Management

### Commands:
```bash
# Create multiple games
create
create
create

# List all games
g

# Join different games from different terminals
# (This requires multiple CLI instances)
```

### Expected Results:
```
> create
✅ Game created successfully!
🎮 Game ID: game_3

> create
✅ Game created successfully!
🎮 Game ID: game_4

> create
✅ Game created successfully!
🎮 Game ID: game_5

> g
📋 Active Games:
🎮 game_1 - waiting_for_players (1/9 players) - Blinds: $1/$2
🎮 game_2 - ready_to_start (2/9 players) - Blinds: $1/$2
🎮 game_3 - waiting_for_players (0/9 players) - Blinds: $1/$2
🎮 game_4 - waiting_for_players (0/9 players) - Blinds: $1/$2
🎮 game_5 - waiting_for_players (0/9 players) - Blinds: $1/$2
```

## Test Scenario 10: Full Table Test (9 Players)

### Setup:
Open 9 terminal windows and run the following commands to fill a table:

### Commands (distributed across terminals):
```bash
# Terminal 1
join game_3 Player1

# Terminal 2  
join game_3 Player2

# Terminal 3
join game_3 Player3

# ... continue for all 9 players

# Terminal 10 (should fail)
join game_3 Player10
```

### Expected Results:
```
# Terminals 1-9 should all succeed:
✅ Successfully joined game_3 as Player[N]
🪑 Seat: [auto-assigned]
💰 Stack: $1000

# Terminal 10 should fail:
❌ Error: Game is full (maximum 9 players)
```

## Notes for Manual Testing

1. **Server Must Be Running**: Always ensure `npm run dev` is running before starting CLI tests
2. **Multiple Terminals**: Many tests require multiple CLI instances to simulate multiplayer functionality
3. **Game IDs**: Game IDs increment automatically (game_1, game_2, etc.)
4. **Auto-seat Assignment**: If no seat is specified, players are assigned to the first available seat
5. **Game States**: Watch for state transitions from `waiting_for_players` → `ready_to_start` as players join
6. **Player IDs**: The system auto-generates unique player IDs for each session

## Troubleshooting

If you encounter issues:

1. **"Connection refused"**: Make sure the server is running on port 3000
2. **"Game not found"**: Use `g` command to list available games
3. **"Already in game"**: Use `leave` command first before joining another game
4. **TypeScript errors**: Restart both server and CLI if you see compilation errors 