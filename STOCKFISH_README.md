# Stockfish.js Integration — ChessMaster Pro
## Setup Guide

---

## Files Included

| File | Purpose |
|------|---------|
| `stockfish-engine.js` | Clean Stockfish wrapper class (use this in your project) |
| `chess-ai-integration.js` | Full game controller (board + AI + move handling) |

---

## Step 1 — Download Stockfish.js

Stockfish.js is the real chess engine. Without it, the integration uses a random-move fallback.

**Download the file (pick one):**

```bash
# Option A — Direct download (recommended, ~2MB WASM build)
curl -o public/stockfish.js \
  https://raw.githubusercontent.com/nmrugg/stockfish.js/master/stockfish.js

# Option B — npm
npm install stockfish
cp node_modules/stockfish/src/stockfish.js public/
```

Place `stockfish.js` in your project's `/public` folder (or wherever your static files live).

---

## Step 2 — Add to your HTML

```html
<!-- In your <head> or before </body> -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
<script src="/stockfish.js"></script>
<script src="/stockfish-engine.js"></script>
```

---

## Step 3 — Replace your existing AI logic

### Option A — Use the full ChessMasterAI class (easiest)

```html
<div id="board"></div>
<script>
  const game = new ChessMasterAI({
    boardElementId: 'board',
    playerColor:    'white',   // 'white' | 'black'
    difficulty:     'medium',  // see difficulty levels below

    onMoveMade: (move, fen, status) => {
      console.log('Move played:', move.san); // e.g. "e4", "Nf3", "O-O"
      console.log('FEN:', fen);
      console.log('Status:', status); // { over, result, reason }
    },

    onGameOver: (status) => {
      alert(`Game over! ${status.result} wins by ${status.reason}`);
    },

    onEngineThink: (isThinking) => {
      // Show/hide your loading spinner
      document.getElementById('spinner').style.display = isThinking ? 'block' : 'none';
    },
  });

  game.init(); // async — resolves when engine is ready
</script>
```

### Option B — Use just the engine (integrate into your existing board)

```javascript
// Initialize
const engine = new StockfishEngine();
await engine.init();
engine.setDifficulty('hard');

// Get best move for any position
const result = await engine.getBestMove(chess.fen());
console.log(result);
// → { move: 'e2e4', from: 'e2', to: 'e4', promotion: undefined }

// Apply it with chess.js
chess.move({ from: result.from, to: result.to, promotion: result.promotion });

// Evaluate a position (for showing eval bar)
const eval = await engine.evaluate(chess.fen());
console.log(eval);
// → { score: 34, mate: null, depth: 12 }
// score in centipawns: positive = white advantage, negative = black
```

---

## Difficulty Levels

| Level     | Stockfish Depth | Skill Level (0–20) | Move Time | Description |
|-----------|-----------------|-------------------|-----------|-------------|
| beginner  | 1               | 0                 | 100ms     | Makes random/weak moves |
| easy      | 3               | 5                 | 200ms     | Basic tactics only |
| medium    | 8               | 10                | 500ms     | Club player strength |
| hard      | 14              | 17                | 1000ms    | Strong club player |
| master    | 20              | 20                | 2000ms    | Near-master strength |

```javascript
engine.setDifficulty('hard');   // anytime, even mid-game
game.setDifficulty('beginner'); // on ChessMasterAI instance
```

---

## API Reference

### StockfishEngine

```javascript
const engine = new StockfishEngine();

// Methods
await engine.init()                         // Initialize (call once)
engine.setDifficulty(level)                 // Set difficulty
await engine.getBestMove(fen, moves?)       // → { move, from, to, promotion }
await engine.evaluate(fen)                  // → { score, mate, depth }
engine.stop()                               // Stop current calculation
engine.newGame()                            // Reset for new game
engine.destroy()                            // Terminate worker
```

### ChessMasterAI

```javascript
const game = new ChessMasterAI(options);

// Methods
await game.init()                           // Initialize game + engine
game.setDifficulty(level)                   // Change difficulty
await game.newGame(options?)                // Start new game
game.undoMove()                             // Undo last 2 moves (player + engine)
await game.getEvaluation()                  // → { score, mate, depth }
game.getFEN()                               // → FEN string
game.getMoveHistory()                       // → ['e4', 'e5', 'Nf3', ...]
```

---

## Integrating the Eval Bar (Position Evaluation)

Show a white/black bar to display who's winning:

```javascript
async function updateEvalBar(fen) {
  const ev  = await engine.evaluate(fen);
  const bar = document.getElementById('eval-fill');

  if (ev.mate !== null) {
    // Forced mate
    bar.style.width = ev.mate > 0 ? '90%' : '10%';
    return;
  }

  // Centipawns → percentage (±500cp maps to 0–100%)
  const clamped = Math.max(-500, Math.min(500, ev.score));
  bar.style.width = (50 + clamped / 10) + '%';
}
```

---

## Troubleshooting

**"Failed to construct Worker" error**
- `stockfish.js` must be served from the same origin as your page (CORS restriction on Web Workers).
- Make sure it's in your `/public` folder, not `node_modules`.
- If using Vite/Create React App, add to `public/` folder (not `src/`).

**Engine moves are slow**
- Lower the `moveTime` in your difficulty preset or reduce `depth`.
- `depth: 5` + `moveTime: 300` is plenty for casual play.

**Stockfish.js file size (~2MB)**
- Use the NNUE-free build for a smaller file: `stockfish-nnue.js` (~1MB)
- Or use `stockfish-lite.js` for the smallest size

**Using with React/Vue/Svelte**
- Import as a module or use `useEffect` to call `engine.init()` once on mount.
- Store the engine instance in a `useRef` (React) to persist across renders.
- Call `engine.destroy()` in the cleanup function.

---

## What to build next

Once this is working, your next two features for monetization:

1. **Supabase auth** — Google login, save game history per user
2. **Puzzle mode** — Use the free Lichess API to fetch 3M+ puzzles:
   ```
   GET https://lichess.org/api/puzzle/next
   ```

Both of these + a Stripe paywall for premium themes = your first revenue.
