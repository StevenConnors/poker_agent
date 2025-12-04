# Poker Patio 🎰

A visually stunning, dark-themed Texas Hold'em poker application built with Next.js 14, TypeScript, and Framer Motion. Features an elliptical felt table design with casino-grade aesthetics and smooth animations.

## 🎨 Design Features

- **Dark Casino Theme**: Authentic poker room atmosphere with felt-green table and proper contrast
- **Elliptical Table Layout**: 6-seat arrangement with 30° increments around an elliptical felt surface
- **Glowing Effects**: Current player seat highlights with subtle glow animations
- **Chip Stacking**: Realistic vertical chip stacks with proper denominations
- **Card Animations**: Smooth deal-in effects with SVG-based card rendering
- **Responsive Design**: Scales perfectly across desktop and mobile devices

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/poker_app.git
   cd poker_app
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Development Commands

### Development Server
```bash
pnpm dev          # Start Next.js development server
npm run dev       # Alternative with npm
```

### Storybook
```bash
pnpm storybook    # Start Storybook development server
npm run storybook # Alternative with npm
```
Opens Storybook at [http://localhost:6006](http://localhost:6006) for component development and testing.

### Testing
```bash
pnpm test         # Run all tests with coverage
npm run test      # Alternative with npm

pnpm test:watch   # Run tests in watch mode
npm run test:watch

pnpm test:ui      # Run tests with Vitest UI
npm run test:ui
```

### Linting & Formatting
```bash
pnpm lint         # Run ESLint
npm run lint

pnpm lint:fix     # Fix ESLint issues automatically
npm run lint:fix

pnpm format       # Format code with Prettier
npm run format
```

### Build & Production
```bash
pnpm build        # Build for production
npm run build

pnpm start        # Start production server
npm run start
```

## 🎮 Game Features

### Core Gameplay
- **Texas Hold'em**: Full implementation with pre-flop, flop, turn, and river stages
- **Multi-player Support**: Up to 6 players per table
- **Betting Actions**: Fold, check, call, bet, raise, all-in
- **Pot Management**: Main pot and side pots with proper split logic
- **Hand Rankings**: Complete poker hand evaluation

### UI Components
- **EnhancedPokerTable**: Main game container with elliptical felt design
- **PlayerSeat**: Individual player displays with avatars and chip stacks
- **CommunityCardsRow**: 5-card display with stage progression indicators
- **PotDisplay**: Elegant pill-shaped pot with chip visualization
- **ControlPanel**: Action buttons with dark theme styling
- **ActionLog**: Live game history with smooth animations

### Accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Reduced Motion**: Respects `prefers-reduced-motion` settings
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Dark theme optimized for readability

## 🎯 Design Tokens

```css
/* Core Colors */
--felt-green: #15703e;
--bg-dark: #0b0b0b;
--seat-bg: rgba(0,0,0,0.85);
--text-light: #ffffff;
--highlight-glow: #ffd740;

/* Table Styling */
--table-clip-path: ellipse(85% 65% at 50% 50%);
--table-gradient: radial-gradient(circle at center, rgba(21,112,62,1) 0%, rgba(0,0,0,1) 85%);

/* Sizing */
--avatar-size: 40px;
--dealer-btn-size: 18px;
--border-radius: 8px;
```

## 🧪 Testing Strategy

### Unit Tests
- Component rendering and props
- Game logic and state management
- User interaction handlers

### Integration Tests
- Game flow scenarios
- Multi-player interactions
- UI state synchronization

### Visual Tests
- Component snapshots
- Responsive design validation
- Animation behavior

## 📁 Project Structure

```
poker_app/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Card.tsx       # SVG-based playing cards
│   │   ├── Chip.tsx       # Stacked poker chips
│   │   ├── PlayerSeat.tsx # Player information display
│   │   └── ...
│   ├── EnhancedPokerTable.tsx  # Main game table
│   └── ...
├── engine/                 # Game logic and types
├── stores/                 # Zustand state management
├── styles/                 # Global styles and themes
└── tests/                  # Test suites
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use semantic commit messages
- Add tests for new features
- Ensure accessibility compliance
- Maintain design token consistency

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎲 Acknowledgments

- Inspired by world-class poker rooms and casinos
- Built with modern web technologies for optimal performance
- Designed for both casual and serious poker players

---

**Ready to deal in?** Start your development server and experience the most immersive poker interface on the web! 🃏✨ 