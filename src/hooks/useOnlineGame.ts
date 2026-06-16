import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess, Square } from 'chess.js';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './useToast';
import { soundManager } from '../engine/soundManager';

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
  system?: boolean;
}

export function useOnlineGame(roomCode: string) {
  const { currentUser, userData } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Basic game state
  const [gameData, setGameData] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [history, setHistory] = useState<any[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Clocks
  const [whiteTime, setWhiteTime] = useState(180);
  const [blackTime, setBlackTime] = useState(180);

  // Connection & presence
  const [opponentOnline, setOpponentOnline] = useState(true);
  const [disconnectBanner, setDisconnectBanner] = useState(false);
  const [abandonModal, setAbandonModal] = useState(false);

  // Modals & offers
  const [drawOfferModal, setDrawOfferModal] = useState(false);
  const [takebackModal, setTakebackModal] = useState(false);
  const [pendingDrawOffer, setPendingDrawOffer] = useState(false);
  const [pendingTakebackRequest, setPendingTakebackRequest] = useState(false);
  const [rematchOffer, setRematchOffer] = useState<{ roomCode: string; challenger: string } | null>(null);

  // Game over state
  const [gameOver, setGameOver] = useState<{
    type: 'win' | 'draw' | 'resign' | 'timeout' | 'abandoned';
    message: string;
    winner: 'white' | 'black' | null;
    eloChange?: number;
  } | null>(null);

  // In-game chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Board interaction states
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [errorSquare, setErrorSquare] = useState<string | null>(null);

  // History review states (navigation)
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [reviewFen, setReviewFen] = useState<string | null>(null);

  // Pre-move state
  const [preMove, setPreMove] = useState<{ from: string; to: string; promotion?: string } | null>(null);

  // Refs
  const chessRef = useRef<Chess>(new Chess());
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const tickTimerRef = useRef<any>(null);
  const syncTimerRef = useRef<any>(null);
  const presenceTimerRef = useRef<any>(null);
  const turnRef = useRef<'w' | 'b'>('w');
  const drawTimeoutRef = useRef<any>(null);

  // Helper to check checks
  const checkSquare = useMemo(() => {
    const activeFen = reviewFen || fen;
    try {
      const activeChess = new Chess(activeFen);
      if (activeChess.inCheck()) {
        const turn = activeChess.turn();
        const board = activeChess.board();
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.type === 'k' && piece.color === turn) {
              const file = String.fromCharCode(97 + c);
              const rank = 8 - r;
              return `${file}${rank}`;
            }
          }
        }
      }
    } catch (e) {}
    return null;
  }, [fen, reviewFen]);

  // Decoupled status checker
  const checkGameOverStatus = (chessInstance: Chess) => {
    if (chessInstance.isCheckmate()) {
      const winnerColor = chessInstance.turn() === 'w' ? 'black' : 'white';
      return {
        type: 'win' as const,
        message: `${winnerColor === 'white' ? 'White' : 'Black'} wins by checkmate.`,
        winner: winnerColor
      };
    }
    if (chessInstance.isDraw()) {
      let reason = 'Draw';
      if (chessInstance.isStalemate()) reason = 'Draw by Stalemate';
      else if (chessInstance.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
      else if (chessInstance.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
      return {
        type: 'draw' as const,
        message: reason,
        winner: null
      };
    }
    return null;
  };

  // Sound triggers
  const playMoveSound = (moveObj: any) => {
    if (moveObj.captured) {
      soundManager.playCapture();
    } else {
      soundManager.playMove();
    }
    const chess = chessRef.current;
    if (chess.inCheck()) {
      soundManager.playCheck();
    }
  };

  // Reconstruct moves from FEN history
  const reconstructMoves = (fens: string[]) => {
    if (!fens || fens.length <= 1) return [];
    const tempChess = new Chess();
    const moves = [];
    for (let i = 1; i < fens.length; i++) {
      const targetFen = fens[i];
      const legalMoves = tempChess.moves({ verbose: true });
      let matchedMove = null;
      for (const m of legalMoves) {
        const testChess = new Chess(tempChess.fen());
        const testMove = testChess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
        if (testMove && testChess.fen() === targetFen) {
          matchedMove = {
            from: m.from,
            to: m.to,
            promotion: m.promotion,
            san: testMove.san,
            captured: !!testMove.captured,
            color: testMove.color,
            fen: targetFen
          };
          break;
        }
      }
      if (matchedMove) {
        tempChess.move({ from: matchedMove.from, to: matchedMove.to, promotion: matchedMove.promotion });
        moves.push(matchedMove);
      } else {
        break;
      }
    }
    return moves;
  };

  // Calculate ELO update client side
  const calculateLocalEloChange = (result: 'white_wins' | 'black_wins' | 'draw' | 'abandoned') => {
    if (!gameData || !gameData.is_rated) return 0;
    const isW = playerColor === 'w';
    const myRating = isW ? gameData.white_elo : gameData.black_elo;
    const oppRating = isW ? gameData.black_elo : gameData.white_elo;
    
    let outcomeScore = 0.5;
    if (result === 'white_wins') outcomeScore = isW ? 1.0 : 0.0;
    else if (result === 'black_wins') outcomeScore = isW ? 0.0 : 1.0;
    else if (result === 'abandoned') outcomeScore = 1.0; // claimed win

    const expected = 1.0 / (1.0 + Math.pow(10, (oppRating - myRating) / 400.0));
    return Math.round(32 * (outcomeScore - expected));
  };

  // Call Supabase RPC to complete online game atomically
  const completeGameInDB = async (result: 'white_wins' | 'black_wins' | 'draw' | 'abandoned') => {
    try {
      const pgnStr = chessRef.current.pgn();
      await supabase.rpc('complete_online_game', {
        game_id: gameData.id,
        game_result: result,
        final_pgn: pgnStr
      });

      // Submit tournament results if it's a tournament game
      try {
        const { data: pairing, error: pairingErr } = await supabase
          .from('tournament_pairings')
          .select('*, tournaments(format)')
          .eq('game_id', gameData.id)
          .maybeSingle();

        if (pairing && !pairingErr && pairing.tournaments) {
          const format = pairing.tournaments.format;
          if (format === 'arena') {
            const winner_id = result === 'white_wins' ? pairing.white_id : (result === 'black_wins' ? pairing.black_id : null);
            await supabase.rpc('arena_submit_result', {
              t_id: pairing.tournament_id,
              game_id: gameData.id,
              winner_id,
              is_draw: result === 'draw'
            });
          } else if (format === 'swiss') {
            const swissResult = result === 'white_wins' ? 'white' : (result === 'black_wins' ? 'black' : 'draw');
            await supabase.rpc('swiss_submit_result', {
              pairing_id: pairing.id,
              result: swissResult
            });
          }
        }
      } catch (tournamentErr) {
        console.error('Error submitting tournament result:', tournamentErr);
      }

      localStorage.removeItem('active_online_game');
    } catch (e) {
      console.error('Error completing game via RPC:', e);
    }
  };

  // 1. Fetch game details and mount subscriptions
  useEffect(() => {
    if (!roomCode || !currentUser || currentUser.uid === 'guest') return;

    const fetchGame = async () => {
      try {
        const { data: game, error } = await supabase
          .from('online_games')
          .select('*')
          .eq('room_code', roomCode)
          .maybeSingle();

        if (error) throw error;
        if (!game) {
          showToast('Game lobby not found.', 'error');
          navigate('/play/online');
          return;
        }

        // Check if both players are present but status is waiting (e.g. rematch or pre-created)
        if (game.status === 'waiting' && game.white_id && game.black_id) {
          const { error: activeError } = await supabase
            .from('online_games')
            .update({
              status: 'active',
              last_move_at: new Date().toISOString()
            })
            .eq('room_code', roomCode);
          
          if (!activeError) {
            game.status = 'active';
          }
        }

        if (game.status === 'completed' || game.status === 'abandoned') {
          showToast('This match has already completed.', 'info');
          navigate('/play/online');
          return;
        }

        const isWhite = game.white_id === currentUser.uid;
        const isBlack = game.black_id === currentUser.uid;

        if (!isWhite && !isBlack) {
          showToast('You are not a player in this game room.', 'warning');
          navigate('/play/online');
          return;
        }

        setGameData(game);
        const color = isWhite ? 'w' : 'b';
        setPlayerColor(color);

        localStorage.setItem('active_online_game', JSON.stringify({
          roomCode: game.room_code,
          color: isWhite ? 'white' : 'black',
          opponentName: isWhite ? game.black_username : game.white_username,
          opponentRating: isWhite ? game.black_elo : game.white_elo,
          timeControl: game.time_control
        }));

        const activeFen = game.current_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        chessRef.current = new Chess(activeFen);
        setFen(activeFen);
        turnRef.current = chessRef.current.turn();

        setWhiteTime((game.white_time_ms || 180000) / 1000);
        setBlackTime((game.black_time_ms || 180000) / 1000);

        const fens = game.fen_history || [activeFen];
        const moves = reconstructMoves(fens);
        setHistory(moves);
        setFenHistory(fens);

        if (moves.length > 0) {
          const last = moves[moves.length - 1];
          setLastMove({ from: last.from, to: last.to });
        }

        setupBroadcastChannel(color, isWhite ? game.black_id : game.white_id);
        setupPresenceChannel(isWhite ? game.black_id : game.white_id);

      } catch (err: any) {
        showToast('Error loading game details: ' + err.message, 'error');
        navigate('/play/online');
      }
    };

    fetchGame();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
      if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
    };
  }, [roomCode, currentUser]);

  const syncGameStateWithDB = useCallback(async () => {
    if (!roomCode) return;
    try {
      const { data: game, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (error) throw error;
      if (!game) return;

      // Update chess state
      const activeFen = game.current_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      chessRef.current = new Chess(activeFen);
      setFen(activeFen);
      turnRef.current = chessRef.current.turn();

      const activeTurn = turnRef.current;
      const elapsedMs = game.last_move_at 
        ? Date.now() - new Date(game.last_move_at).getTime()
        : 0;

      let whiteMs = game.white_time_ms || 180000;
      let blackMs = game.black_time_ms || 180000;

      if (activeTurn === 'w' && game.status === 'active') {
        whiteMs = Math.max(0, whiteMs - elapsedMs);
      } else if (activeTurn === 'b' && game.status === 'active') {
        blackMs = Math.max(0, blackMs - elapsedMs);
      }

      setWhiteTime(whiteMs / 1000);
      setBlackTime(blackMs / 1000);

      const fens = game.fen_history || [activeFen];
      const moves = reconstructMoves(fens);
      setHistory(moves);
      setFenHistory(fens);

      if (moves.length > 0) {
        const last = moves[moves.length - 1];
        setLastMove({ from: last.from, to: last.to });
      } else {
        setLastMove(null);
      }
      
      showToast('Game state synchronized.', 'success');
    } catch (err) {
      console.error('Error synchronizing game state with DB:', err);
    }
  }, [roomCode, showToast]);

  const [isTabActive, setIsTabActive] = useState(true);

  // Tab visibility change listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      const active = document.visibilityState === 'visible';
      setIsTabActive(active);
      if (active) {
        syncGameStateWithDB();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncGameStateWithDB]);

  // Listen to beforeunload to broadcast a disconnect event
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'disconnect',
          payload: { player: playerColor }
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [playerColor]);

  // Setup Broadcast Channel
  const setupBroadcastChannel = (color: 'w' | 'b', opponentId: string) => {
    const channel = supabase.channel(`game:${roomCode}`);

    channel
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        handleIncomingMove(payload);
      })
      .on('broadcast', { event: 'disconnect' }, () => {
        setOpponentOnline(false);
        setDisconnectBanner(true);
        if (!presenceTimerRef.current && !gameOver) {
          presenceTimerRef.current = setTimeout(() => {
            setAbandonModal(true);
          }, 60000);
        }
      })
      .on('broadcast', { event: 'draw_offer' }, () => {
        soundManager.playSelect();
        setDrawOfferModal(true);
        if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
        drawTimeoutRef.current = setTimeout(() => {
          setDrawOfferModal(false);
          showToast('Draw offer expired.', 'info');
        }, 30000);
      })
      .on('broadcast', { event: 'draw_accepted' }, () => {
        soundManager.playDraw();
        const eloChange = calculateLocalEloChange('draw');
        setGameOver({
          type: 'draw',
          message: 'Game drawn by mutual agreement.',
          winner: null,
          eloChange
        });
      })
      .on('broadcast', { event: 'draw_declined' }, () => {
        setPendingDrawOffer(false);
        showToast('Opponent declined the draw offer.', 'info');
      })
      .on('broadcast', { event: 'takeback_request' }, () => {
        soundManager.playSelect();
        setTakebackModal(true);
      })
      .on('broadcast', { event: 'takeback_accepted' }, () => {
        setPendingTakebackRequest(false);
        handleExecuteTakeback();
      })
      .on('broadcast', { event: 'takeback_declined' }, () => {
        setPendingTakebackRequest(false);
        showToast('Takeback request declined.', 'info');
      })
      .on('broadcast', { event: 'resign' }, ({ payload }) => {
        const winningColor = payload.resigner === 'w' ? 'black' : 'white';
        soundManager.playWin();
        const localResult = payload.reason === 'timeout'
          ? (payload.resigner === 'w' ? 'black_wins' : 'white_wins')
          : (payload.resigner === 'w' ? 'black_wins' : 'white_wins');
        const eloChange = calculateLocalEloChange(localResult as any);
        setGameOver({
          type: payload.reason === 'timeout' ? 'timeout' : 'resign',
          message: payload.reason === 'timeout' 
            ? `${payload.resigner === 'w' ? 'White' : 'Black'} ran out of time! ${winningColor === 'white' ? 'White' : 'Black'} wins.`
            : `${payload.resigner === 'w' ? 'White' : 'Black'} resigned. ${winningColor === 'white' ? 'White' : 'Black'} wins.`,
          winner: winningColor,
          eloChange
        });
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        const { result, reason } = payload;
        soundManager.playWin();
        const myResult = result === 'draw' ? 'draw' : (result === 'white_wins' && color === 'w' || result === 'black_wins' && color === 'b' ? 'win' : 'loss');
        const eloChange = calculateLocalEloChange(result);
        
        let message = '';
        if (result === 'draw') {
          message = `Game drawn (${reason}).`;
        } else if (result === 'abandoned') {
          message = `Opponent abandoned the game. You win by default!`;
        } else {
          const winnerColor = result === 'white_wins' ? 'white' : 'black';
          message = `${winnerColor === 'white' ? 'White' : 'Black'} wins by ${reason}!`;
        }

        setGameOver({
          type: result === 'draw' ? 'draw' : (result === 'abandoned' ? 'abandoned' : 'win'),
          message,
          winner: result === 'draw' ? null : (result === 'white_wins' ? 'white' : 'black'),
          eloChange
        });
      })
      .on('broadcast', { event: 'rematch_offer' }, ({ payload }) => {
        showToast(`${payload.challenger} offered a rematch!`, 'info');
        setRematchOffer({ roomCode: payload.roomCode, challenger: payload.challenger });
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload].slice(-50));
      })
      .on('broadcast', { event: 'time_sync' }, ({ payload }) => {
        handleIncomingTimeSync(payload);
      })
      .subscribe();

    channelRef.current = channel;
  };

  // Setup Presence Channel
  const setupPresenceChannel = (opponentId: string) => {
    const presenceChannel = supabase.channel(`presence:${roomCode}`, {
      config: {
        presence: {
          key: currentUser.uid
        }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presState = presenceChannel.presenceState();
        const isOpponentPresent = !!presState[opponentId];
        
        setOpponentOnline(isOpponentPresent);
        
        if (isOpponentPresent) {
          setDisconnectBanner(false);
          setAbandonModal(false);
          if (presenceTimerRef.current) {
            clearTimeout(presenceTimerRef.current);
            presenceTimerRef.current = null;
          }
        } else {
          if (!presenceTimerRef.current && !gameOver) {
            setDisconnectBanner(true);
            presenceTimerRef.current = setTimeout(() => {
              setAbandonModal(true);
            }, 60000);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString()
          });
        }
      });

    presenceChannelRef.current = presenceChannel;
  };

  // handle received move
  const handleIncomingMove = (payload: any) => {
    const { from, to, promotion, fen: newFen } = payload;
    const chess = chessRef.current;
    
    if (chess.turn() === playerColor) return;

    // Validate opponent's move with chess.js before applying it
    const testChess = new Chess(chess.fen());
    let isValid = false;
    try {
      const result = testChess.move({ from, to, promotion });
      if (result) {
        isValid = true;
      }
    } catch (e) {
      console.warn("Incoming move is invalid:", e);
    }

    if (!isValid) {
      console.error("Illegal move received from opponent:", { from, to, promotion });
      showToast("Illegal move detected from opponent. Synchronizing game...", "error");
      syncGameStateWithDB();
      return;
    }

    const moveObj = chess.move({ from, to, promotion });
    if (moveObj) {
      playMoveSound(moveObj);
      setFen(newFen);
      turnRef.current = chess.turn();
      setLastMove({ from, to });
      
      const verboseHistory = chess.history({ verbose: true }) as any[];
      const lastVerbose = verboseHistory[verboseHistory.length - 1];
      const formattedMove = {
        from: lastVerbose.from,
        to: lastVerbose.to,
        promotion: lastVerbose.promotion,
        san: lastVerbose.san,
        captured: !!lastVerbose.captured,
        color: lastVerbose.color,
        fen: newFen
      };
      setHistory(prev => [...prev, formattedMove]);
      setFenHistory(prev => [...prev, newFen]);

      const endingStatus = checkGameOverStatus(chess);
      if (endingStatus) {
        soundManager.playDraw();
        const dbResult = endingStatus.type === 'draw' 
          ? 'draw' 
          : (endingStatus.winner === 'white' ? 'white_wins' : 'black_wins');
        
        // Finalize in DB
        completeGameInDB(dbResult as any);

        const eloChange = calculateLocalEloChange(dbResult as any);
        setGameOver({
          type: endingStatus.type,
          message: endingStatus.message,
          winner: endingStatus.winner,
          eloChange
        });

        // Broadcast game over
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'game_over',
            payload: { result: dbResult, reason: endingStatus.type === 'draw' ? 'draw' : 'checkmate' }
          });
        }
      }

      if (preMove) {
        handleTriggerPreMove();
      }
    }
  };

  // Synchronize incoming times
  const handleIncomingTimeSync = (payload: any) => {
    const { white_ms, black_ms } = payload;
    
    if (turnRef.current !== playerColor) {
      if (Math.abs(whiteTime - white_ms) > 0.5) setWhiteTime(white_ms);
      if (Math.abs(blackTime - black_ms) > 0.5) setBlackTime(black_ms);
    }
  };

  // Client-side chess clock ticking countdown
  useEffect(() => {
    if (gameOver || !gameData || !isTabActive) return;

    tickTimerRef.current = setInterval(() => {
      const activeColor = turnRef.current;
      if (activeColor === 'w') {
        setWhiteTime(t => {
          if (t <= 0.1) {
            handleClockTimeout('w');
            return 0;
          }
          return Math.max(0, t - 0.1);
        });
      } else {
        setBlackTime(t => {
          if (t <= 0.1) {
            handleClockTimeout('b');
            return 0;
          }
          return Math.max(0, t - 0.1);
        });
      }
    }, 100);

    return () => clearInterval(tickTimerRef.current);
  }, [gameOver, gameData, fen, isTabActive]);

  // Every 5 seconds, active player broadcasts a time sync
  useEffect(() => {
    if (gameOver || !gameData || turnRef.current !== playerColor) return;

    syncTimerRef.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'time_sync',
          payload: {
            white_ms: whiteTime,
            black_ms: blackTime
          }
        });
      }
    }, 5000);

    return () => clearInterval(syncTimerRef.current);
  }, [gameOver, gameData, whiteTime, blackTime, playerColor, fen]);

  // Flag fall resignation
  const handleClockTimeout = (timedOutColor: 'w' | 'b') => {
    if (gameOver) return;

    const winningColor = timedOutColor === 'w' ? 'black' : 'white';
    const dbResult = timedOutColor === 'w' ? 'black_wins' : 'white_wins';
    
    if (playerColor === timedOutColor) {
      // Call RPC
      completeGameInDB(dbResult as any);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'game_over',
          payload: { result: dbResult, reason: 'timeout' }
        });
      }
    }

    soundManager.playWin();
    const eloChange = calculateLocalEloChange(dbResult as any);
    setGameOver({
      type: 'timeout',
      message: `${timedOutColor === 'w' ? 'White' : 'Black'} ran out of time! ${winningColor === 'white' ? 'White' : 'Black'} wins.`,
      winner: winningColor,
      eloChange
    });
  };

  // Perform legal chess moves locally (optimistic update)
  const makeMove = useCallback(async (from: string, to: string, promotionOption?: string) => {
    if (gameOver) return false;
    
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) {
      const preMoveChess = new Chess(fen);
      const isLegal = preMoveChess.moves({ square: from as Square }).includes(to);
      if (isLegal) {
        setPreMove({ from, to, promotion: promotionOption });
        showToast('Pre-move queued', 'info');
        return true;
      }
      return false;
    }

    const movePayload = {
      from,
      to,
      promotion: promotionOption
    };

    try {
      const moveResult = chess.move(movePayload);
      if (moveResult) {
        const newFen = chess.fen();
        playMoveSound(moveResult);
        setFen(newFen);
        turnRef.current = chess.turn();
        setLastMove({ from, to });
        
        const verboseHistory = chess.history({ verbose: true }) as any[];
        const lastVerbose = verboseHistory[verboseHistory.length - 1];
        const formattedMove = {
          from: lastVerbose.from,
          to: lastVerbose.to,
          promotion: lastVerbose.promotion,
          san: lastVerbose.san,
          captured: !!lastVerbose.captured,
          color: lastVerbose.color,
          fen: newFen
        };
        const updatedHistory = [...history, formattedMove];
        const updatedFens = [...fenHistory, newFen];
        setHistory(updatedHistory);
        setFenHistory(updatedFens);

        setPreMove(null);

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'move',
            payload: {
              from,
              to,
              promotion: promotionOption,
              fen: newFen,
              moveNumber: updatedHistory.length
            }
          });
        }

        const endingStatus = checkGameOverStatus(chess);
        if (endingStatus) {
          soundManager.playDraw();
          const dbResult = endingStatus.type === 'draw' 
            ? 'draw' 
            : (endingStatus.winner === 'white' ? 'white_wins' : 'black_wins');
          
          await completeGameInDB(dbResult as any);

          const eloChange = calculateLocalEloChange(dbResult as any);
          setGameOver({
            type: endingStatus.type,
            message: endingStatus.message,
            winner: endingStatus.winner,
            eloChange
          });

          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'game_over',
              payload: { result: dbResult, reason: endingStatus.type === 'draw' ? 'draw' : 'checkmate' }
            });
          }
        }

        return true;
      } else {
        setErrorSquare(to);
        setTimeout(() => setErrorSquare(null), 400);
        return false;
      }
    } catch (e) {
      setErrorSquare(to);
      setTimeout(() => setErrorSquare(null), 400);
      return false;
    }
  }, [gameOver, playerColor, fen, history, fenHistory, whiteTime, blackTime, preMove]);

  // Execute queued pre-move when turn starts
  const handleTriggerPreMove = () => {
    if (!preMove) return;
    const { from, to, promotion } = preMove;
    setPreMove(null);
    makeMove(from, to, promotion);
  };

  // Square interaction handlers passed directly to chessboard
  const handleSquareClick = useCallback((square: string) => {
    if (reviewIndex !== null) return;
    if (gameOver) return;

    const chess = chessRef.current;
    
    if (chess.turn() !== playerColor) {
      const piece = chess.get(square as Square);
      
      if (piece && piece.color === playerColor) {
        soundManager.playSelect();
        const moves = chess.moves({ square: square as Square, verbose: true });
        setSelectedSquare(square);
        setValidMoves(moves.map(m => m.to));
      } else if (selectedSquare) {
        const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
        const targetMove = moves.find(m => m.to === square);
        if (targetMove) {
          setPreMove({ from: selectedSquare, to: square, promotion: targetMove.promotion });
          showToast('Pre-move queued', 'info');
        }
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
      return;
    }

    const piece = chess.get(square as Square);

    if (piece && piece.color === playerColor) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
      soundManager.playSelect();
      const moves = chess.moves({ square: square as Square, verbose: true });
      setSelectedSquare(square);
      setValidMoves(moves.map(m => m.to));
      return;
    }

    if (selectedSquare) {
      const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
      const targetMove = moves.find(m => m.to === square);

      if (targetMove) {
        if (targetMove.flags.includes('p')) {
          setPromotionPending({ from: selectedSquare, to: square });
          return;
        }

        makeMove(selectedSquare, square);
      } else {
        setErrorSquare(square);
        setTimeout(() => setErrorSquare(null), 400);
      }
    }

    setSelectedSquare(null);
    setValidMoves([]);
  }, [selectedSquare, playerColor, makeMove, gameOver, reviewIndex]);

  // Handle promotion modal selection
  const handlePromotion = useCallback((pieceType: string) => {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    setPromotionPending(null);
    makeMove(from, to, pieceType.toLowerCase());
  }, [promotionPending, makeMove]);

  // Chat message broadcasting
  const sendChatMessage = (messageText: string) => {
    if (!messageText.trim() || !currentUser) return;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let safeText = messageText.replace(urlRegex, '[link removed]');
    if (safeText.length > 100) {
      safeText = safeText.substring(0, 100);
    }

    const username = userData?.username || currentUser.displayName || 'Player';
    const payload: ChatMessage = {
      username,
      message: safeText,
      timestamp: new Date().toISOString()
    };

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload
      });
      setChatMessages(prev => [...prev, payload].slice(-50));
    }
  };

  // Draw offer triggers
  const sendDrawOffer = () => {
    if (gameOver) return;
    setPendingDrawOffer(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw_offer'
      });
      showToast('Draw offer sent to opponent.', 'info');
    }
  };

  const acceptDraw = () => {
    setDrawOfferModal(false);
    if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
    
    completeGameInDB('draw');

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_over',
        payload: { result: 'draw', reason: 'agreement' }
      });
    }

    soundManager.playDraw();
    const eloChange = calculateLocalEloChange('draw');
    setGameOver({
      type: 'draw',
      message: 'Game drawn by mutual agreement.',
      winner: null,
      eloChange
    });
  };

  const declineDraw = () => {
    setDrawOfferModal(false);
    if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw_declined'
      });
    }
  };

  // Resignation triggers
  const resignGame = () => {
    if (gameOver) return;

    const opponentWins = playerColor === 'w' ? 'black_wins' : 'white_wins';
    
    completeGameInDB(opponentWins as any);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_over',
        payload: { result: opponentWins, reason: 'resignation' }
      });
    }

    soundManager.playDraw();
    const eloChange = calculateLocalEloChange(opponentWins as any);
    setGameOver({
      type: 'resign',
      message: 'You resigned. Opponent wins!',
      winner: playerColor === 'w' ? 'black' : 'white',
      eloChange
    });
  };

  // Takeback request triggers
  const sendTakebackRequest = () => {
    if (gameOver || history.length === 0) return;
    setPendingTakebackRequest(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'takeback_request'
      });
      showToast('Takeback request sent.', 'info');
    }
  };

  const acceptTakeback = () => {
    setTakebackModal(false);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'takeback_accepted'
      });
    }
    handleExecuteTakeback();
  };

  const declineTakeback = () => {
    setTakebackModal(false);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'takeback_declined'
      });
    }
  };

  const handleExecuteTakeback = async () => {
    const chess = chessRef.current;
    if (history.length === 0) return;

    chess.undo();
    const newFen = chess.fen();
    setFen(newFen);
    turnRef.current = chess.turn();

    const updatedHistory = history.slice(0, -1);
    const updatedFens = fenHistory.slice(0, -1);
    setHistory(updatedHistory);
    setFenHistory(updatedFens);

    if (updatedHistory.length > 0) {
      const last = updatedHistory[updatedHistory.length - 1];
      setLastMove({ from: last.from, to: last.to });
    } else {
      setLastMove(null);
    }

    if (playerColor === 'w') {
      try {
        await supabase
          .from('online_games')
          .update({
            current_fen: newFen,
            fen_history: updatedFens,
            last_move_at: new Date().toISOString()
          })
          .eq('room_code', roomCode);
      } catch (err) {
        console.error('Error updating takeback in DB:', err);
      }
    }

    showToast('Takeback applied.', 'success');
  };

  // Claim win by opponent abandonment
  const claimAbandonWin = async () => {
    setAbandonModal(false);
    setDisconnectBanner(false);

    if (presenceTimerRef.current) {
      clearTimeout(presenceTimerRef.current);
      presenceTimerRef.current = null;
    }

    const winningResult = playerColor === 'w' ? 'white_wins' : 'black_wins';
    
    await completeGameInDB(winningResult as any);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_over',
        payload: { result: winningResult, reason: 'abandonment' }
      });
    }

    soundManager.playWin();
    const eloChange = calculateLocalEloChange(winningResult as any);
    setGameOver({
      type: 'abandoned',
      message: 'Opponent abandoned the game. You win by default!',
      winner: playerColor === 'w' ? 'white' : 'black',
      eloChange
    });
  };

  const dismissAbandon = () => {
    setAbandonModal(false);
  };

  // Rematch offer trigger
  const sendRematchOffer = async () => {
    if (!gameData || !currentUser) return;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newRoomCode = '';
    for (let i = 0; i < 6; i++) {
      newRoomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const isW = playerColor === 'w';
    const myUsername = isW ? gameData.white_username : gameData.black_username;

    // Create swapped colors lobby
    const newWhiteId = isW ? gameData.black_id : gameData.white_id;
    const newWhiteUser = isW ? gameData.black_username : gameData.white_username;
    const newWhiteElo = isW ? gameData.black_elo : gameData.white_elo;

    const newBlackId = isW ? gameData.white_id : gameData.black_id;
    const newBlackUser = isW ? gameData.white_username : gameData.black_username;
    const newBlackElo = isW ? gameData.white_elo : gameData.black_elo;

    try {
      const { error } = await supabase
        .from('online_games')
        .insert({
          room_code: newRoomCode,
          white_id: newWhiteId,
          white_username: newWhiteUser,
          white_elo: newWhiteElo,
          black_id: newBlackId,
          black_username: newBlackUser,
          black_elo: newBlackElo,
          time_control: gameData.time_control,
          is_rated: gameData.is_rated,
          status: 'waiting',
          white_time_ms: gameData.white_time_ms || 180000,
          black_time_ms: gameData.black_time_ms || 180000,
          current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fen_history: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
        });

      if (error) throw error;

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'rematch_offer',
          payload: {
            roomCode: newRoomCode,
            challenger: myUsername
          }
        });
      }

      showToast('Rematch offer sent to opponent!', 'success');
      
      // Auto navigate challenger to the new waiting room
      navigate(`/play/online/${newRoomCode}`);

    } catch (err: any) {
      showToast('Failed to create rematch: ' + err.message, 'error');
    }
  };

  // History navigation callbacks
  const handleFirstMove = () => {
    if (history.length === 0) return;
    setReviewIndex(-1);
    setReviewFen(fenHistory[0]);
  };

  const handlePrevMove = () => {
    if (history.length === 0) return;
    let nextIdx = reviewIndex === null ? history.length - 2 : reviewIndex - 1;
    if (nextIdx < -1) nextIdx = -1;
    setReviewIndex(nextIdx);
    setReviewFen(fenHistory[nextIdx + 1]);
  };

  const handleNextMove = () => {
    if (reviewIndex === null) return;
    let nextIdx = reviewIndex + 1;
    if (nextIdx >= history.length) {
      setReviewIndex(null);
      setReviewFen(null);
    } else {
      setReviewIndex(nextIdx);
      setReviewFen(fenHistory[nextIdx + 1]);
    }
  };

  const handleLastMove = () => {
    setReviewIndex(null);
    setReviewFen(null);
  };

  const handleMoveClick = (idx: number) => {
    setReviewIndex(idx);
    setReviewFen(fenHistory[idx + 1]);
  };

  const boardState = useMemo(() => {
    return {
      fen: fen,
      selectedSquare: selectedSquare,
      validMoves: validMoves,
      lastMove: preMove ? { from: preMove.from, to: preMove.to } : lastMove,
      checkSquare: checkSquare,
      showCoords: true,
      playerColor: playerColor,
      promotionPending: promotionPending,
      gameMode: 'online',
      animationsEnabled: true,
      history: history,
      boardFlipped: false,
      reviewFen: reviewFen,
      isAIThinking: false,
      errorSquare: errorSquare
    };
  }, [fen, selectedSquare, validMoves, lastMove, checkSquare, playerColor, promotionPending, history, reviewFen, errorSquare, preMove]);

  return {
    gameData,
    playerColor,
    fen,
    boardState,
    opponentOnline,
    disconnectBanner,
    abandonModal,
    drawOfferModal,
    takebackModal,
    pendingDrawOffer,
    pendingTakebackRequest,
    rematchOffer,
    gameOver,
    chatMessages,
    whiteTime,
    blackTime,
    preMove,
    handleSquareClick,
    handlePromotion,
    sendChatMessage,
    sendDrawOffer,
    acceptDraw,
    declineDraw,
    sendTakebackRequest,
    acceptTakeback,
    declineTakeback,
    resignGame,
    claimAbandonWin,
    dismissAbandon,
    sendRematchOffer,

    // Reviews
    reviewIndex,
    handleFirstMove,
    handlePrevMove,
    handleNextMove,
    handleLastMove,
    handleMoveClick
  };
}
