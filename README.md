# Poker App

A comprehensive Texas Hold'em poker engine with Next.js server and CLI client. Features complete game logic, advanced betting systems, side pot calculations, and multi-player support.

## ✅ **Current Status**

This is a **fully functional poker application** with:

- **Complete Texas Hold'em Implementation**: All game stages (preflop, flop, turn, river, showdown)
- **Advanced Features**: Side pots, all-in scenarios, proper button movement, tie-breaking
- **Multi-player Support**: Up to 9 players with real-time gameplay
- **Comprehensive Testing**: 102 tests passing with 90.52% code coverage
- **Production-ready Engine**: Mathematically verified chip conservation

### **What Works Right Now**

✅ Full poker games from start to finish  
✅ Complex all-in scenarios with side pots  
✅ Multiple CLI sessions playing simultaneously  
✅ Complete hand evaluation (high card → royal flush)  
✅ Proper betting rounds with blinds  
✅ Real-time game state synchronization  

## 🎮 **Quick Start**

### 1. Start the Server
```bash
npm run dev
```
Server runs at `http://localhost:3000`

### 2. Start CLI Client(s)
```bash
npm run cli
```

### 3. Create & Join a Game
```bash
# In CLI session 1:
create                           # Creates new game, returns gameId
join game_12345 Alice           # Join as Alice

# In CLI session 2:
join game_12345 Bob             # Join same game as Bob
```

### 4. Play Poker!
```bash
start                           # Start first hand (need 2+ players)
check                          # Check
call                           # Call current bet
bet 100                        # Bet 100 chips
raise 200                      # Raise to 200 total
fold                           # Fold hand
all-in                         # Go all-in
```

## 🃏 **Game Features**

### **Core Gameplay**
- **Texas Hold'em Rules**: Standard poker with community cards
- **Hand Rankings**: Complete evaluation from high card to royal flush
- **Betting Actions**: Check, call, bet, raise, fold, all-in
- **Blinds System**: Configurable small/big blinds with proper posting
- **Button Movement**: Correct dealer button advancement

### **Advanced Features**
- **Side Pots**: Automatic calculation for multiple all-in players
- **Tie Breaking**: Proper winner determination with kickers
- **Multi-way All-ins**: Complex scenarios handled correctly
- **Chip Conservation**: Mathematically verified - no chips lost or created
- **Reconnection**: Players can disconnect and rejoin

### **Multi-player Support**
- **Up to 9 Players**: Full table support
- **Real-time Sync**: All players see consistent game state
- **Seat Management**: Automatic or manual seat selection
- **Spectator Ready**: Foundation for observer mode

## 🏗️ **Architecture**

```
┌─────────────────┐    HTTP     ┌──────────────────┐
│   CLI Client    │ ◄─────────► │   Next.js API    │
│   (Multiple)    │             │   (/api/game)    │
└─────────────────┘             └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │   Game Engine    │
                                │   (/engine)      │
                                └──────────────────┘
```

### **Components**
- **`/engine/`**: Pure game logic, no I/O dependencies
- **`/pages/api/`**: Server-side state management and HTTP endpoints  
- **`/cli/`**: Interactive command-line client

### **Design Benefits**
- **Clean Separation**: Game logic isolated from presentation
- **Multiple Clients**: Easy to add web/mobile interfaces
- **Testable**: Engine logic fully unit tested
- **Scalable**: Server manages multiple concurrent games

## 🎯 **CLI Commands**

### **Game Management**
- `create` - Create new game
- `join <gameId> <name>` - Join existing game
- `leave` - Leave current game
- `select <gameId>` - Switch between games
- `games` - List all active games

### **Gameplay**
- `start` - Start new hand
- `info` - Show detailed game state
- `actions` - Show legal actions
- `check` / `call` / `fold` - Betting actions
- `bet <amount>` / `raise <amount>` - Betting with amounts
- `all-in` - Go all-in

### **Utility**
- `help` - Show all commands
- `quit` - Exit CLI

## 🧪 **Testing**

Comprehensive test suite with 102 passing tests:

```bash
npm test                        # Run all tests
npm test -- --coverage         # With coverage report
```

### **Test Coverage**
- **Integration Tests**: Full game scenarios
- **Unit Tests**: Hand evaluation, betting, pot management
- **Edge Cases**: All-in scenarios, side pots, ties
- **90.52% Code Coverage**: High confidence in reliability

## 🔧 **Technical Details**

### **Tech Stack**
- **TypeScript**: Full type safety
- **Next.js**: Server framework
- **Jest**: Testing framework  
- **ESLint**: Code quality
- **Node.js**: Runtime environment

### **Performance**
- **Efficient**: Handles 9-player games smoothly
- **Memory Safe**: Proper cleanup and state management
- **Deterministic**: Reproducible game outcomes for testing

### **Code Quality**
- **90%+ Test Coverage**: Comprehensive test suite
- **TypeScript**: Full type safety throughout
- **ESLint**: Consistent code style
- **Modular**: Clean separation of concerns

## 🚀 **What's Next**

See `changes.md` for detailed development roadmap. Key next steps:

1. **Database Integration**: Persistent game storage
2. **Web Frontend**: Browser-based gameplay
3. **Real-time Updates**: WebSocket connections
4. **Tournament Mode**: Multi-table tournaments

## 🤝 **Contributing**

The codebase is well-structured and tested. Key areas for contribution:

- **Web Frontend**: React components for browser play
- **Database Layer**: PostgreSQL/SQLite integration  
- **Tournament Features**: Multi-table tournament support
- **AI Players**: Computer opponents

## 📝 **License**

[Add your license here]

---

**Status**: ✅ **Core Game Complete** - Fully playable with all standard poker features! 