/**
 * chess-ai-integration.js
 * Wires StockfishEngine + chess.js into ChessMaster Pro.
 *
 * Dependencies (add these to your HTML):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
 *   <script src="/stockfish.js"></script>        ← download from github.com/nmrugg/stockfish.js
 *   <script src="/stockfish-engine.js"></script>
 *
 * Then include this file and call:
 *   const game = new ChessMasterAI({ boardElementId: 'board' });
 *   game.init();
 */

class ChessMasterAI {
  /**
   * @param {Object} options
   * @param {string}   options.boardElementId  - ID of the board container element
   * @param {string}   [options.playerColor]   - 'white' | 'black' (default: 'white')
   * @param {string}   [options.difficulty]    - 'beginner'|'easy'|'medium'|'hard'|'master'
   * @param {Function} [options.onMoveMade]    - callback(move, fen, gameStatus)
   * @param {Function} [options.onGameOver]    - callback(result) result: 'white'|'black'|'draw'
   * @param {Function} [options.onEngineThink] - callback(isThinking: boolean)
   */
  constructor(options = {}) {
    this.options = {
      boardElementId: 'board',
      playerColor:    'white',
      difficulty:     'medium',
      onMoveMade:     null,
      onGameOver:     null,
      onEngineThink:  null,
      ...options,
    };

    this.chess  = null; // chess.js instance
    this.engine = null; // StockfishEngine instance
    this.moveHistory = []; // UCI strings e.g. e2e4
    this.lastEval = null;
    this.isThinking  = false;
    this.gameOver    = false;

    this._selectedSquare = null;
    this._promoOverlay = null;
    this._boardEl        = null;
    this._squares        = {}; // { 'e4': HTMLElement, ... }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async init() {
    // 1. Set up chess.js
    this.chess = new Chess();

    // 2. Initialize Stockfish
    this.engine = new StockfishEngine();
    await this.engine.init();
    this.engine.setDifficulty(this.options.difficulty);
    console.log(`✓ Stockfish ready — difficulty: ${this.options.difficulty}`);

    // 3. Render the board
    this._buildBoard();

    // 4. If player is black, let engine make the first move
    if (this.options.playerColor === 'black') {
      await this._engineMove();
    }
  }

  /** Change difficulty mid-game */
  setDifficulty(level) {
    this.options.difficulty = level;
    this.engine.setDifficulty(level);
  }

  /** Wire difficulty buttons using data-diff attributes */
  bindDifficultyButtons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-diff]');
      if (!btn) return;
      const level = btn.dataset.diff;
      this.setDifficulty(level);
      container.querySelectorAll('[data-diff]').forEach((b) => {
        b.classList.toggle('active', b.dataset.diff === level);
      });
    });
  }

  /** Start a new game */
  async newGame(options = {}) {
    Object.assign(this.options, options);
    this.chess.reset();
    this.moveHistory = [];
    this.gameOver    = false;
    this.engine.newGame();
    this._clearSelection();
    this._renderBoard();

    if (this.options.playerColor === 'black') {
      await this._engineMove();
    }
  }

  /** Get the current FEN string */
  getFEN() {
    return this.chess.fen();
  }

  /** Get move history in SAN notation (e.g. ['e4', 'e5', 'Nf3']) */
  getMoveHistory() {
    return this.chess.history();
  }

  /** Get evaluation of current position */
  async getEvaluation() {
    return await this.engine.evaluate(this.chess.fen());
  }

  /** Undo the last full move (player + engine) */
  undoMove() {
    if (this.moveHistory.length < 2) return;
    this.chess.undo(); // undo engine move
    this.chess.undo(); // undo player move
    this.moveHistory.splice(-2);
    this._renderBoard();
  }

  // ─── Board Rendering ───────────────────────────────────────────────────────

  _buildBoard() {
    this._boardEl = document.getElementById(this.options.boardElementId);
    if (!this._boardEl) throw new Error(`Board element #${this.options.boardElementId} not found`);

    this._boardEl.innerHTML = '';
    this._boardEl.style.cssText = `
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid #8B6914;
      border-radius: 4px;
      overflow: hidden;
      user-select: none;
    `;

    const files = ['a','b','c','d','e','f','g','h'];
    const ranks  = ['8','7','6','5','4','3','2','1'];

    // If player is black, flip the board
    const displayFiles = this.options.playerColor === 'black' ? [...files].reverse() : files;
    const displayRanks = this.options.playerColor === 'black' ? [...ranks].reverse() : ranks;

    for (const rank of displayRanks) {
      for (const file of displayFiles) {
        const square = file + rank;
        const el     = document.createElement('div');
        const isLight = (files.indexOf(file) + parseInt(rank)) % 2 === 1;

        el.dataset.square = square;
        el.style.cssText = `
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: clamp(20px, 5vw, 48px);
          background: ${isLight ? '#eeeed2' : '#769656'};
          transition: background 0.15s;
        `;

        const fileIdx = files.indexOf(file);
        const rankNum = parseInt(rank, 10);
        const showRank = fileIdx === 0;
        const showFile = rankNum === 1;
        if (showRank) {
          const rankLabel = document.createElement('span');
          rankLabel.textContent = rank;
          rankLabel.style.cssText = `
            position: absolute; top: 2px; left: 4px; font-size: 10px; font-weight: 700;
            color: ${isLight ? '#769656' : '#eeeed2'}; opacity: 0.55; pointer-events: none;
          `;
          el.appendChild(rankLabel);
        }
        if (showFile) {
          const fileLabel = document.createElement('span');
          fileLabel.textContent = file;
          fileLabel.style.cssText = `
            position: absolute; bottom: 2px; right: 4px; font-size: 10px; font-weight: 700;
            color: ${isLight ? '#769656' : '#eeeed2'}; opacity: 0.55; pointer-events: none;
          `;
          el.appendChild(fileLabel);
        }

        el.addEventListener('click', () => this._handleSquareClick(square));
        this._squares[square] = el;
        this._boardEl.appendChild(el);
      }
    }

    this._renderBoard();
  }

  _renderBoard() {
    const PIECES = {
      wP:'♙', wR:'♖', wN:'♘', wB:'♗', wQ:'♕', wK:'♔',
      bP:'♟', bR:'♜', bN:'♞', bB:'♝', bQ:'♛', bK:'♚',
    };

    // Clear all pieces
    Object.values(this._squares).forEach(el => {
      el.textContent = '';
      el.style.color = '';
    });

    // Place pieces from chess.js board state
    const board = this.chess.board();
    board.forEach(row => {
      row.forEach(piece => {
        if (!piece) return;
        const el    = this._squares[piece.square];
        const key   = piece.color + piece.type.toUpperCase();
        el.textContent = PIECES[key] || '';
        // White pieces white, black pieces near-black for contrast on both square colors
        el.style.color = piece.color === 'w' ? '#fff' : '#1a1a1a';
        el.style.textShadow = piece.color === 'w'
          ? '0 1px 3px rgba(0,0,0,0.7)'
          : '0 1px 2px rgba(255,255,255,0.2)';
      });
    });

    this._highlightLastMove();
    this._highlightCheck();
  }

  _highlightLastMove() {
    // Reset all square backgrounds
    const files = ['a','b','c','d','e','f','g','h'];
    Object.entries(this._squares).forEach(([sq, el]) => {
      const file  = sq[0];
      const rank  = parseInt(sq[1]);
      const isLight = (files.indexOf(file) + rank) % 2 === 1;
      el.style.background = isLight ? '#F0D9B5' : '#B58863';
    });

    // Highlight last move in yellow
    const history = this.chess.history({ verbose: true });
    if (history.length > 0) {
      const last = history[history.length - 1];
      const tintLight = '#F6F669';
      const tintDark  = '#BACA2B';
      const files2 = ['a','b','c','d','e','f','g','h'];
      [last.from, last.to].forEach(sq => {
        if (this._squares[sq]) {
          const file  = sq[0];
          const rank  = parseInt(sq[1]);
          const isLight = (files2.indexOf(file) + rank) % 2 === 1;
          this._squares[sq].style.background = isLight ? tintLight : tintDark;
        }
      });
    }
  }

  _highlightCheck() {
    if (!this.chess.in_check()) return;
    // Find the king in check
    const turn   = this.chess.turn(); // 'w' or 'b'
    const board  = this.chess.board();
    board.forEach(row => {
      row.forEach(piece => {
        if (piece && piece.type === 'k' && piece.color === turn) {
          if (this._squares[piece.square]) {
            this._squares[piece.square].style.background = '#FF6B6B';
          }
        }
      });
    });
  }

  // ─── Move Handling ─────────────────────────────────────────────────────────

  _handleSquareClick(square) {
    if (this.gameOver || this.isThinking) return;

    const isPlayerTurn = (
      (this.options.playerColor === 'white' && this.chess.turn() === 'w') ||
      (this.options.playerColor === 'black' && this.chess.turn() === 'b')
    );
    if (!isPlayerTurn) return;

    const piece = this.chess.get(square);

    // If a square is already selected
    if (this._selectedSquare) {
      if (square === this._selectedSquare) {
        // Clicked same square → deselect
        this._clearSelection();
        return;
      }

      this._tryMove(this._selectedSquare, square).then((moved) => {
      if (!moved && piece && piece.color === this.chess.turn()[0]) {
        // Clicked another own piece → reselect
        this._selectSquare(square);
      } else if (!moved) {
        this._clearSelection();
      }
      });
      return;
    }

    // Select a piece
    if (piece && piece.color === (this.options.playerColor === 'white' ? 'w' : 'b')) {
      this._selectSquare(square);
    }
  }

  async _tryMove(from, to) {
    const piece     = this.chess.get(from);
    const isPromo   = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    const promotion = isPromo ? await this._askPromotion() : undefined;

    const move = this.chess.move({ from, to, promotion });
    if (!move) return false;

    this.moveHistory.push(move.from + move.to + (move.promotion || ''));
    this._clearSelection();
    this._renderBoard();

    this.options.onMoveMade?.(move, this.chess.fen(), this._getGameStatus());

    this.engine.evaluate(this.chess.fen())
      .then((ev) => {
        this.lastEval = ev;
        this.options.onEvalUpdate?.(ev, this.chess.fen());
      })
      .catch(() => {});

    if (this._checkGameOver()) return true;

    setTimeout(() => this._engineMove(), 100);
    return true;
  }

  async _engineMove() {
    if (this.gameOver) return;

    this.isThinking = true;
    this.options.onEngineThink?.(true);

    try {
      const result = await this.engine.getBestMove(this.chess.fen(), []);

      // Apply the engine's move
      const move = this.chess.move({
        from:      result.from,
        to:        result.to,
        promotion: result.promotion || 'q',
      });

      if (move) {
        this.moveHistory.push(move.from + move.to + (move.promotion || ''));
        this._renderBoard();
        this.options.onMoveMade?.(move, this.chess.fen(), this._getGameStatus());
        this.engine.evaluate(this.chess.fen())
          .then((ev) => {
            this.lastEval = ev;
            this.options.onEvalUpdate?.(ev, this.chess.fen());
          })
          .catch(() => {});
        this._checkGameOver();
      }
    } catch (err) {
      console.error('Engine error:', err);
    } finally {
      this.isThinking = false;
      this.options.onEngineThink?.(false);
    }
  }

  _selectSquare(square) {
    this._clearSelection();
    this._selectedSquare = square;

    // Highlight selected square
    if (this._squares[square]) {
      this._squares[square].style.background = '#7FC97F';
    }

    // Highlight legal moves
    const moves = this.chess.moves({ square, verbose: true });
    moves.forEach(move => {
      const el = this._squares[move.to];
      if (el) {
        const dot = document.createElement('div');
        dot.className = 'legal-move-dot';
        dot.style.cssText = `
          position: absolute;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background: rgba(0,0,0,0.2);
          pointer-events: none;
        `;
        el.appendChild(dot);
      }
    });
  }

  _clearSelection() {
    this._selectedSquare = null;
    // Remove all dots
    document.querySelectorAll('.legal-move-dot').forEach(d => d.remove());
    this._renderBoard();
  }

  _checkGameOver() {
    const status = this._getGameStatus();
    if (status.over) {
      this.gameOver = true;
      this.options.onGameOver?.(status);
      return true;
    }
    return false;
  }

  _getGameStatus() {
    if (this.chess.in_checkmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white';
      return { over: true, result: winner, reason: 'checkmate' };
    }
    if (this.chess.in_stalemate())   return { over: true,  result: 'draw',  reason: 'stalemate'   };
    if (this.chess.in_threefold_repetition()) return { over: true, result: 'draw', reason: 'repetition' };
    if (this.chess.insufficient_material()) return { over: true, result: 'draw', reason: 'insufficient_material' };
    if (this.chess.in_draw())        return { over: true,  result: 'draw',  reason: 'draw'        };
    if (this.chess.in_check())       return { over: false, result: null,    reason: 'check'       };
    return { over: false, result: null, reason: null };
  }

  _askPromotion() {
    return new Promise((resolve) => {
      if (this._promoOverlay) this._promoOverlay.remove();

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.55);
        display: flex; align-items: center; justify-content: center; z-index: 9999;
      `;
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #2b2b2b; border-radius: 10px; padding: 16px;
        display: flex; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      `;
      const title = document.createElement('p');
      title.textContent = 'Promote pawn to:';
      title.style.cssText = 'color: #fff; margin: 0 0 8px; width: 100%; text-align: center; font-weight: 600;';
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 10px; width: 100%; justify-content: center;';

      const pieces = [
        { p: 'q', label: '♕' },
        { p: 'r', label: '♖' },
        { p: 'b', label: '♗' },
        { p: 'n', label: '♘' },
      ];

      pieces.forEach(({ p, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.style.cssText = `
          width: 52px; height: 52px; font-size: 28px; border-radius: 8px;
          border: 2px solid #81b64c; background: #1a1a1a; color: #fff; cursor: pointer;
        `;
        btn.onclick = () => {
          overlay.remove();
          this._promoOverlay = null;
          resolve(p);
        };
        row.appendChild(btn);
      });

      const wrap = document.createElement('div');
      wrap.appendChild(title);
      wrap.appendChild(row);
      dialog.appendChild(wrap);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      this._promoOverlay = overlay;
    });
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessMasterAI;
} else {
  window.ChessMasterAI = ChessMasterAI;
}
