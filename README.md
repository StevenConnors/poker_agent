# 🃏 GPU-Accelerated Texas Hold'em Poker

A production-ready, fully GPU-accelerated Texas Hold'em poker interface built with Next.js 14, TypeScript, and PixiJS. Features a modern, responsive design reminiscent of Poker Patio with extensive accessibility support.

## 🚀 Features

### Core Gameplay
- **Complete Texas Hold'em Engine**: Full poker game logic with betting rounds, pot management, and hand evaluation
- **Real-time Multiplayer**: Support for up to 9 players with live game state synchronization
- **Advanced Pot Management**: Main pot and side pot handling for all-in scenarios
- **Comprehensive Hand Evaluation**: All poker hands from high card to straight flush

### Visual & Performance
- **100% GPU-Accelerated**: Built with PixiJS for silky-smooth 60fps rendering
- **Responsive Design**: Maintains 16:9 aspect ratio while scaling to any screen size
- **Retina Display Support**: Crisp graphics on high-DPI displays
- **Smooth Animations**: Deal-in animations, pot bump effects, and seat glow filters
- **No Opacity Tricks**: Uses `visible=false` and conditional rendering for optimal performance

### Accessibility
- **WCAG Compliant**: Screen reader support with ARIA live regions
- **Keyboard Navigation**: Full keyboard support for all game actions
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **High Contrast**: Clear visual indicators for all game states

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Graphics**: PixiJS 8 with `@pixi/react`
- **Animation**: `@tweenjs/tween.js` for smooth transitions
- **State Management**: Zustand for game state
- **Styling**: Tailwind CSS for DOM components
- **Testing**: Vitest + React Testing Library
- **Icons**: Lucide React

## 🎨 Design System

### Color Palette
- **Felt Green**: `#198754` - Primary table color
- **Page Background**: `#f4f4f5` - Light neutral background  
- **Text Color**: `#ffffff` - High contrast white text
- **Seat Background**: `#2a2a2a` - Dark seat containers
- **Seat Border**: `#444444` - Subtle seat borders
- **Glow Color**: `#ffd740` - Active player highlight

### Typography
- **Primary Font**: Arial/System font stack
- **Player Names**: 10px, white
- **Stack Amounts**: 12px, gold, bold
- **Pot Display**: 16px, gold, bold with stroke

### Layout
- **Table**: Elliptical felt with edge gradient vignette
- **Seats**: Arranged in arc from 2 o'clock to 10 o'clock
- **Community Cards**: Centered above pot display
- **Avatar Size**: 40px diameter with simple icon design
- **Dealer Button**: 18px diameter with "D" indicator

## 📁 Project Structure

```
components/
├── TableStage.tsx          # Main PixiJS stage wrapper with responsive scaling
├── Felt.tsx               # Elliptical table with edge gradient
├── PlayerSeat.tsx         # Player avatar, name, stack, glow effects
├── CommunityCards.tsx     # 5 card sprites with deal-in animations
├── ChipStack.tsx          # Animated chip stacks with proper denominations
├── PotDisplay.tsx         # Centered pot amount with bump animations
├── ActionLog.tsx          # DOM-based action history with accessibility
├── ControlPanel.tsx       # DOM-based betting controls
└── RoundSummaryModal.tsx  # DOM-based game summary modal

lib/
└── usePokerStore.ts       # Zustand store (re-exports gameStore)

engine/
├── types.ts               # Core game types and interfaces
├── index.ts               # Game logic and action processing
├── pot-manager.ts         # Pot and side pot calculations
├── game-flow.ts           # Betting round management
├── player-manager.ts      # Seat management and player actions
└── hand-evaluator.ts      # Poker hand ranking and comparison
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd poker_app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run test suite with coverage
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors

## 🎮 How to Play

1. **Create or Join Game**: Start a new game or join an existing room
2. **Take a Seat**: Click on an empty seat to join the table
3. **Wait for Players**: Need at least 2 players to start a hand
4. **Start Hand**: Click "Start New Hand" when ready
5. **Make Decisions**: Use the control panel to fold, check, call, bet, or raise
6. **View Results**: See hand results and winnings in the summary modal

### Game Flow
1. **Pre-flop**: Each player receives 2 hole cards
2. **Flop**: 3 community cards are dealt
3. **Turn**: 4th community card is dealt  
4. **River**: 5th and final community card is dealt
5. **Showdown**: Remaining players reveal hands, best hand wins

## 🧪 Testing

The project includes comprehensive testing for game logic:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

### Test Coverage
- **Game Engine**: Core poker logic, hand evaluation, pot management
- **Player Actions**: Betting, folding, all-in scenarios
- **Edge Cases**: Side pots, disconnections, invalid actions
- **Accessibility**: Screen reader compatibility, keyboard navigation

## 🎯 Performance Optimizations

### PixiJS Optimizations
- **Object Pooling**: Reuse graphics objects to minimize garbage collection
- **Texture Atlasing**: Combine small textures for reduced draw calls
- **Culling**: Hide off-screen objects with `visible=false`
- **Batch Rendering**: Group similar objects for efficient GPU usage

### React Optimizations
- **useMemo**: Expensive calculations cached appropriately
- **useCallback**: Event handlers memoized to prevent re-renders
- **Conditional Rendering**: Components only render when needed
- **State Optimization**: Minimal state updates with Zustand

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:

```env
# Optional configurations
NEXT_PUBLIC_GAME_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_MAX_PLAYERS=9
NEXT_PUBLIC_DEFAULT_BLINDS=1,2
```

### Game Settings
Customize game parameters in `engine/types.ts`:

```typescript
export interface NewGameConfig {
  smallBlind?: number;      // Default: 1
  bigBlind?: number;        // Default: 2  
  maxPlayers?: number;      // Default: 6
  minPlayers?: number;      // Default: 2
}
```

## 🚧 Development

### Adding New Features

1. **Game Logic**: Extend types in `engine/types.ts`
2. **Visual Components**: Create new PixiJS components in `components/`
3. **UI Controls**: Add DOM components for non-canvas interactions
4. **State Management**: Update store in `stores/gameStore.ts`

### Code Style
- **TypeScript**: Strict mode enabled with comprehensive types
- **ESLint**: Airbnb config with React and accessibility rules
- **Prettier**: Consistent code formatting
- **Comments**: JSDoc for public APIs, inline for complex logic

## 🎨 Customization

### Visual Themes
Modify design tokens in component files:

```typescript
// Color scheme
const feltGreen = 0x198754;
const glowColor = 0xffd740;
const seatBgColor = 0x2a2a2a;

// Dimensions  
const avatarSizePx = 40;
const dealerBtnPx = 18;
```

### Animations
Adjust animation parameters:

```typescript
// Card deal-in timing
const dealDelay = 100; // ms between cards
const dealDuration = 300; // ms per card

// Pot bump animation
const bumpScale = 1.3;
const bumpDuration = 400; // ms
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Guidelines
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure accessibility compliance
- Test on multiple devices and browsers

## 📱 Browser Support

- **Chrome**: 90+ (recommended)
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### WebGL Requirements
- WebGL 1.0 or 2.0 support required for PixiJS
- Hardware acceleration recommended
- Minimum 512MB graphics memory

## 🐛 Troubleshooting

### Common Issues

**PixiJS not rendering**
- Check WebGL support: `chrome://gpu/`
- Disable browser extensions that block canvas
- Clear browser cache and cookies

**Performance issues**
- Reduce particle effects in browser settings
- Close other GPU-intensive applications
- Enable hardware acceleration in browser

**Connection problems**
- Check network connectivity
- Verify server is running on correct port
- Review browser console for error messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PixiJS Team**: For the excellent 2D graphics library
- **Next.js Team**: For the outstanding React framework
- **Poker Community**: For game rules and best practices
- **Accessibility Experts**: For WCAG guidelines and testing

---

**Ready to play?** Run `pnpm dev` and visit [localhost:3000](http://localhost:3000) to start your poker adventure! 🎲♠️♥️♦️♣️ 