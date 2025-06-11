# Texas Hold’em Logic Engine – v0.1

## 1. Purpose

Deliver a **turn‑based, CLI‑driven poker engine** in TypeScript that cleanly separates pure game logic from I/O, ready to embed inside a Next.js backend and to host human players or AI agents.

---

## 2. Scope

| ✅ In scope (MVP)                            | ❌ Out of scope (later)               |
| ------------------------------------------- | ------------------------------------ |
| Full NLHE rules (1–2 blinds, 300 BB stacks) | Web UI / React components            |
| Button rotation, posting blinds             | Real‑money buy‑in / cashier          |
| Pot & side‑pot management                   | Straddles, run‑it‑twice, mixed games |
| Showdown hand ranking & split pots          | Persistent DB or auth                |
| CLI renderer via `readline`                 | Live WebSocket play                  |
| AI agent interface (stub + sample bot)      | Production deployment                |

---

## 3. Success Metrics

* **All unit tests pass** (≥ 95 % branch coverage)
* Simulated **1 000 hands** with two rule‑based bots completes in **< 5 s** on Node 22
* No uncaught exceptions; all invalid actions return a typed **`Result<T, PokerError>`** object

---

## 4. Functional Requirements

### 4.1 Entities

| Entity         | Key Fields                                                     |
| -------------- | -------------------------------------------------------------- |
| **Card**       | `rank`, `suit`                                                 |
| **Deck**       | `cards: Card[]`, `shuffle(seed?)`, `deal(n)`                   |
| **Player**     | `id`, `name`, `stack`, `status`, `hole`                        |
| **Table**      | `buttonIndex`, `smallBlind=1`, `bigBlind=2`, `seats: Player[]` |
| **PotManager** | `pots: { amount, eligibleIds[] }[]`                            |
| **GameState**  | `stage`, `board`, `currentIndex`, `betsThisRound`, `history`   |
| **Action**     | `type`, `amount`                                               |

### 4.2 State Machine

1. **Init** → post blinds → `stage = preflop`
2. **Betting rounds** advance when every *active* player has matched the highest contribution or all but one have folded
3. **Showdown** → PotManager distributes pots by hand strength (ties split)

### 4.3 Error Handling

```ts
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

* All public APIs return `Result`
* `PokerError` enum covers `InvalidAction`, `InsufficientStack`, etc.

---

## 5. Non‑Functional Requirements

| Requirement         | Target                                  |
| ------------------- | --------------------------------------- |
| **Language**        | TypeScript ^5.5                         |
| **Runtime**         | Node **22 LTS**                         |
| **Package manager** | **pnpm** latest                         |
| **Testing**         | Jest + ts‑jest                          |
| **Lint / Format**   | ESLint (airbnb‑base) + Prettier         |
| **RNG**             | `crypto.getRandomValues` (browser‑safe) |
| **Serialization**   | `GameState` is pure JSON                |

---

## 6. API Surface

### 6.1 Core Engine

```ts
export function newGame(cfg: NewGameConfig): GameState;
export function legalActions(gs: GameState): Action[];
export function applyAction(gs: GameState, a: Action): Result<GameState, PokerError>;
export function showdown(gs: GameState): Result<ShowdownResult, PokerError>;
```

### 6.2 Agent Plug‑in

```ts
export interface Agent {
  decide(gs: Readonly<GameState>, legal: Readonly<Action[]>): Promise<Action>;
}
```

---

## 7. CLI Wrapper

* Located in `/cli`
* Minimal commands:

  * `n` – new hand
  * `a <action> [amount]` – act
  * `s` – state dump
* Uses **chalk** for color output and **figures** for suit symbols

---

## 8. Acceptance Criteria

* [ ] Running `pnpm test` shows all tests green
* [ ] `pnpm start` launches a CLI table with at least two bots and one human seat
* [ ] `state.json` round‑trips via `JSON.stringify/parse` with no data loss
* [ ] ESLint passes with no errors

---

## 9. Risks & Mitigations

| Risk                      | Mitigation                                          |
| ------------------------- | --------------------------------------------------- |
| Edge‑case pot splits      | Extensive Jest fixtures covering ≥ 30 scenarios     |
| LLM latency stalling game | Async agent calls with 3‑s timeout + default action |

---

## 10. Future Extensions

* Replace CLI with Next.js API route + React UI
* Add WebSocket transport for real‑time play
* Pluggable variants (Omaha, Short‑deck)

