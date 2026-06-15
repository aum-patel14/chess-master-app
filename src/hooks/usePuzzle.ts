import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { soundManager } from '../engine/soundManager';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string; // Space-separated UCI moves
  rating: number;
  rating_deviation?: number;
  themes: string[];
  game_url?: string;
  opening_tags?: string;
}

function parseUciMove(uci: string) {
  const from = uci.substring(0, 2);
  const to = uci.substring(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return { from, to, promotion };
}

function findKingSquare(chess: Chess, color: 'w' | 'b'): string | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'k' && piece.color === color) {
        const file = String.fromCharCode(97 + c);
        const rank = 8 - r;
        return `${file}${rank}`;
      }
    }
  }
  return null;
}

export function usePuzzle(puzzle: Puzzle | null, options?: { maxAttempts?: number }) {
  const maxAttempts = options?.maxAttempts ?? 2;
  const [state, setState] = useState<{
    fen: string;
    selectedSquare: string | null;
    validMoves: string[];
    lastMove: { from: string; to: string } | null;
    checkSquare: string | null;
    promotionPending: { from: string; to: string } | null;
    history: any[];
    status: 'playing' | 'solved' | 'failed' | 'viewing_solution';
    attempts: number;
    solutionIndex: number;
    flash: 'correct' | 'wrong' | null;
    hintSquares: { from: string; to: string } | null;
  }>(() => ({
    fen: puzzle?.fen || '',
    selectedSquare: null,
    validMoves: [],
    lastMove: null,
    checkSquare: null,
    promotionPending: null,
    history: [],
    status: 'playing',
    attempts: maxAttempts,
    solutionIndex: 0,
    flash: null,
    hintSquares: null,
  }));

  const chessRef = useRef<Chess>(new Chess());
  const opponentTimerRef = useRef<any>(null);
  const solutionTimerRef = useRef<any>(null);

  // Compute player color: if the starting FEN turn is 'w', opponent plays index 0 (white), so player is 'b'.
  const playerColor = useMemo(() => {
    if (!puzzle) return 'w';
    try {
      const c = new Chess(puzzle.fen);
      return c.turn() === 'w' ? 'b' : 'w';
    } catch {
      return 'w';
    }
  }, [puzzle]);

  // Reset/Initialize puzzle
  const resetPuzzle = useCallback(() => {
    if (!puzzle) return;

    const movesArray = puzzle.moves.split(' ');
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;

    setState({
      fen: puzzle.fen,
      selectedSquare: null,
      validMoves: [],
      lastMove: null,
      checkSquare: null,
      promotionPending: null,
      history: [],
      status: 'playing',
      attempts: maxAttempts,
      solutionIndex: 0,
      flash: null,
      hintSquares: null,
    });

    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    if (solutionTimerRef.current) clearTimeout(solutionTimerRef.current);

    // Play opponent's first move after 600ms
    opponentTimerRef.current = setTimeout(() => {
      try {
        const firstMoveUci = movesArray[0];
        const { from, to, promotion } = parseUciMove(firstMoveUci);
        const move = chess.move({ from, to, promotion });

        if (move) {
          if (chess.inCheck()) soundManager.playCheck();
          else if (move.captured) soundManager.playCapture();
          else soundManager.playMove();

          setState(s => ({
            ...s,
            fen: chess.fen(),
            lastMove: { from, to },
            checkSquare: chess.inCheck() ? findKingSquare(chess, chess.turn()) : null,
            history: [{ from, to, color: move.color, captured: !!move.captured }],
            solutionIndex: 1,
          }));
        }
      } catch (err) {
        console.error('Error playing first opponent move:', err);
      }
    }, 600);
  }, [puzzle]);

  useEffect(() => {
    resetPuzzle();
    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
      if (solutionTimerRef.current) clearTimeout(solutionTimerRef.current);
    };
  }, [puzzle, resetPuzzle]);

  // Execute a verified player move
  const executePlayerMove = useCallback((from: string, to: string, promotion?: string) => {
    if (!puzzle) return;
    const movesArray = puzzle.moves.split(' ');
    const expectedMoveUci = movesArray[state.solutionIndex];

    const chess = chessRef.current;
    const tempChess = new Chess(chess.fen());

    try {
      const move = tempChess.move({ from, to, promotion });
      if (!move) return;

      let playedMoveUci = `${from}${to}`;
      if (move.promotion) {
        playedMoveUci += move.promotion.toLowerCase();
      }

      if (playedMoveUci === expectedMoveUci) {
        // Correct move! Play on real board
        chess.move({ from, to, promotion });

        if (chess.inCheck()) soundManager.playCheck();
        else if (move.captured) soundManager.playCapture();
        else soundManager.playMove();

        const nextSolIdx = state.solutionIndex + 1;
        const solved = nextSolIdx >= movesArray.length;

        setState(s => ({
          ...s,
          fen: chess.fen(),
          selectedSquare: null,
          validMoves: [],
          lastMove: { from, to },
          checkSquare: chess.inCheck() ? findKingSquare(chess, chess.turn()) : null,
          history: [...s.history, { from, to, color: move.color, captured: !!move.captured }],
          solutionIndex: nextSolIdx,
          flash: 'correct',
          status: solved ? 'solved' : 'playing',
        }));

        setTimeout(() => {
          setState(s => ({ ...s, flash: null }));
        }, 500);

        if (solved) {
          soundManager.playWin();
          import('canvas-confetti').then(m => m.default());
          return;
        }

        // Play opponent response after 400ms
        opponentTimerRef.current = setTimeout(() => {
          try {
            const oppMoveUci = movesArray[nextSolIdx];
            const { from: oppFrom, to: oppTo, promotion: oppProm } = parseUciMove(oppMoveUci);
            const oppMove = chess.move({ from: oppFrom, to: oppTo, promotion: oppProm });

            if (oppMove) {
              if (chess.inCheck()) soundManager.playCheck();
              else if (oppMove.captured) soundManager.playCapture();
              else soundManager.playMove();

              const postOppSolIdx = nextSolIdx + 1;
              const postOppSolved = postOppSolIdx >= movesArray.length;

              setState(s => ({
                ...s,
                fen: chess.fen(),
                lastMove: { from: oppFrom, to: oppTo },
                checkSquare: chess.inCheck() ? findKingSquare(chess, chess.turn()) : null,
                history: [...s.history, { from: oppFrom, to: oppTo, color: oppMove.color, captured: !!oppMove.captured }],
                solutionIndex: postOppSolIdx,
                status: postOppSolved ? 'solved' : 'playing',
              }));

              if (postOppSolved) {
                soundManager.playWin();
                import('canvas-confetti').then(m => m.default());
              }
            }
          } catch (err) {
            console.error('Error in opponent response:', err);
          }
        }, 400);

      } else {
        // Wrong move
        soundManager.playDraw(); // Buzzer sound
        setState(s => {
          const nextAttempts = s.attempts - 1;
          const isFailed = nextAttempts <= 0;
          return {
            ...s,
            selectedSquare: null,
            validMoves: [],
            attempts: nextAttempts,
            status: isFailed ? 'failed' : 'playing',
            flash: 'wrong',
          };
        });

        setTimeout(() => {
          setState(s => ({ ...s, flash: null }));
        }, 500);
      }
    } catch (err) {
      // Illegal move in chess.js
      soundManager.playDraw();
      setState(s => {
        const nextAttempts = s.attempts - 1;
        const isFailed = nextAttempts <= 0;
        return {
          ...s,
          selectedSquare: null,
          validMoves: [],
          attempts: nextAttempts,
          status: isFailed ? 'failed' : 'playing',
          flash: 'wrong',
        };
      });

      setTimeout(() => {
        setState(s => ({ ...s, flash: null }));
      }, 500);
    }
  }, [puzzle, state.solutionIndex]);

  // Click handler to be passed to board
  const handleSquareClick = useCallback((square: string) => {
    const { status, selectedSquare, validMoves, promotionPending } = state;
    if (status !== 'playing' || promotionPending) return;

    const chess = chessRef.current;
    const turn = chess.turn();

    if (!selectedSquare) {
      const piece = chess.get(square as any);
      if (piece && piece.color === turn) {
        const moves = chess.moves({ square: square as any, verbose: true }) as any[];
        setState(s => ({
          ...s,
          selectedSquare: square,
          validMoves: moves.map(m => m.to),
        }));
      }
    } else {
      if (selectedSquare === square) {
        setState(s => ({ ...s, selectedSquare: null, validMoves: [] }));
        return;
      }

      const piece = chess.get(square as any);
      if (piece && piece.color === turn) {
        const moves = chess.moves({ square: square as any, verbose: true }) as any[];
        setState(s => ({
          ...s,
          selectedSquare: square,
          validMoves: moves.map(m => m.to),
        }));
        return;
      }

      if (validMoves.includes(square)) {
        const moves = chess.moves({ square: selectedSquare as any, verbose: true }) as any[];
        const isPromo = moves.some(m => m.to === square && m.flags.includes('p'));

        if (isPromo) {
          setState(s => ({
            ...s,
            promotionPending: { from: selectedSquare, to: square },
          }));
        } else {
          executePlayerMove(selectedSquare, square);
        }
      } else {
        setState(s => ({ ...s, selectedSquare: null, validMoves: [] }));
      }
    }
  }, [state, executePlayerMove]);

  // Handle promotion selection
  const handlePromotion = useCallback((pieceType: string) => {
    const { promotionPending } = state;
    if (!promotionPending) return;

    const { from, to } = promotionPending;
    setState(s => ({ ...s, promotionPending: null }));
    executePlayerMove(from, to, pieceType);
  }, [state, executePlayerMove]);

  // Expose showSolution to auto-play all remaining moves
  const showSolution = useCallback(() => {
    if (!puzzle) return;
    setState(s => ({ ...s, status: 'viewing_solution', selectedSquare: null, validMoves: [] }));

    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    if (solutionTimerRef.current) clearTimeout(solutionTimerRef.current);

    const movesArray = puzzle.moves.split(' ');
    const chess = chessRef.current;
    let currentIndex = state.solutionIndex;

    const playNextSolutionStep = () => {
      if (currentIndex >= movesArray.length) return;

      try {
        const nextMoveUci = movesArray[currentIndex];
        const { from, to, promotion } = parseUciMove(nextMoveUci);
        const move = chess.move({ from, to, promotion });

        if (move) {
          if (chess.inCheck()) soundManager.playCheck();
          else if (move.captured) soundManager.playCapture();
          else soundManager.playMove();

          setState(s => ({
            ...s,
            fen: chess.fen(),
            lastMove: { from, to },
            checkSquare: chess.inCheck() ? findKingSquare(chess, chess.turn()) : null,
            history: [...s.history, { from, to, color: move.color, captured: !!move.captured }],
            solutionIndex: currentIndex + 1,
          }));

          currentIndex++;
          solutionTimerRef.current = setTimeout(playNextSolutionStep, 800);
        }
      } catch (err) {
        console.error('Error showing solution move:', err);
      }
    };

    playNextSolutionStep();
  }, [puzzle, state.solutionIndex]);

  // Expose getHint to reveal correct next move
  const getHint = useCallback(() => {
    if (!puzzle) return null;
    const movesArray = puzzle.moves.split(' ');
    if (state.solutionIndex < movesArray.length) {
      const nextMove = movesArray[state.solutionIndex];
      const from = nextMove.substring(0, 2);
      const to = nextMove.substring(2, 4);
      return { from, to };
    }
    return null;
  }, [puzzle, state.solutionIndex]);

  // Map state to what ChessBoard customState expects
  const boardState = useMemo(() => {
    return {
      fen: state.fen,
      selectedSquare: state.selectedSquare,
      validMoves: state.validMoves,
      lastMove: state.lastMove,
      checkSquare: state.checkSquare,
      showCoords: true,
      playerColor: playerColor,
      promotionPending: state.promotionPending,
      animationsEnabled: true,
      history: state.history,
      hintSquares: null,
      boardFlipped: false,
    };
  }, [state, playerColor]);

  return {
    board: chessRef.current.board(),
    turn: chessRef.current.turn(),
    status: state.status,
    attempts: state.attempts,
    flash: state.flash,
    makeMove: executePlayerMove,
    showSolution,
    getHint,
    puzzle,
    boardState,
    handleSquareClick,
    handlePromotion,
    resetPuzzle,
  };
}
