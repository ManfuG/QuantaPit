# QuantaPit

QuantaPit is a **local-first quantitative and market interview training platform** built with React, TypeScript, Vite, IndexedDB, and Vitest.

It provides short practice sessions for quantitative reasoning, logic, memory, visual reasoning, market making, arbitrage, portfolio hedging, and open-ended interview questions. Completed sessions are stored locally in the browser and exposed through per-game performance statistics.

> **Early-stage notice:** This is the very first version and the first project phase. It is a working prototype, not a production-ready product. There are still many rough edges, incomplete areas, and known issues.

## Features

- Logic and quantitative games:
  - Quick Math
  - Sequences
  - Radix Rush
  - Tape Recall
  - FoldSight
  - Magnitude Forge
- Market games:
  - Hidden Spread
  - Basket Edge
  - Venue Gap
  - Delta Shield
- Open-ended interview question practice
- Local session persistence with IndexedDB
- Per-game statistics based on completed local sessions
- Last-five trend medians and ten-session comparisons
- Consecutive-day activity streak
- Responsive desktop and mobile UI
- No account, backend, cloud storage, telemetry, or external runtime service

## Technology

- React
- TypeScript
- Vite
- React Router
- IndexedDB
- Vitest
- jsdom
- fake-indexeddb for persistence tests

## Getting started

### Requirements

Use a recent version of Node.js and npm.

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### Run tests

```bash
npm test -- --run
```

### Create a production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Main routes

- `/` — Home
- `/logic-and-math-games` — Logic and quantitative games
- `/market-games` — Market games
- `/open-questions` — Interview question practice
- `/statistics` — Local performance overview and activity streak
- `/statistics/:gameId` — Per-game performance detail

## Local data and privacy

QuantaPit is designed to run locally. Completed sessions and session items are stored in the browser's IndexedDB database named `quantapit-performance`.

The application does not require an account or a remote API. Local browser data is not synchronized between devices. Clearing browser storage removes the locally stored sessions.

Do not commit credentials, `.env` files, browser exports, or private notes. Personal project notes are intentionally excluded from the repository through `.gitignore`.

## Development workflow

The project was developed through an iterative, agent-assisted **vibe coding** workflow. OpenAI Codex, running through the Oh My Pi/AgenticOS harness, was used for conversational prototyping, code exploration, refactoring, test creation, documentation, and UI iteration.

Vibe coding accelerated the feedback loop, but changes were kept under human direction and checked with:

- focused and full Vitest runs;
- TypeScript and Vite production builds;
- browser-based smoke tests of the real application surface;
- repository and secret audits before publication.

## Current limitations

- The project is still an early prototype.
- The game catalogue and scoring rules may change substantially.
- Browser-local data has no synchronization or backup mechanism.
- Some UI, accessibility, and responsive edge cases remain to be improved.
- Statistics are intentionally limited to locally completed sessions.
- There is no authentication, shared leaderboard, or server-side persistence.

## License

QuantaPit is released under the [MIT License](./LICENSE). You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, provided that the copyright notice and license text are included in substantial portions of the software.

The software is provided "as is", without warranty of any kind. See [`LICENSE`](./LICENSE) for the complete terms.
