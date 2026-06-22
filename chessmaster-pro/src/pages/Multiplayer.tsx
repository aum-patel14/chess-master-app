import { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { DocumentTitle } from '../components/DocumentTitle'
import { ChessBoard } from '../components/ChessBoard'
import { supabase } from '../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import {
  Trophy,
  PlayCircle,
  Compass,
  Link as LinkIcon,
  AlertTriangle,
  Clock,
  LogOut,
  Info,
} from 'lucide-react'

interface OnlineGame {
  id: string
  room_code: string
  white_id: string
  black_id: string | null
  white_username: string
  black_username: string | null
  white_elo: number
  black_elo: number | null
  time_control: string
  is_rated: boolean
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  result: 'white_wins' | 'black_wins' | 'draw' | 'abandoned' | null
  pgn: string | null
  current_fen: string
  fen_history: string[]
  white_time_ms: number
  black_time_ms: number
  last_move_at: string
  draw_offered_by: string | null
  created_at: string
}

export function Multiplayer() {
  // Authentication states
  const [session, setSession] = useState<Session | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // Lobby States
  const [userRating, setUserRating] = useState<number>(1200)
  const [userStats, setUserStats] = useState({ wins: 0, losses: 0, draws: 0 })
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('blitz_3_2')
  const [isSearching, setIsSearching] = useState(false)
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [lobbyError, setLobbyError] = useState<string | null>(null)
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)

  // Active Game States
  const [currentGame, setCurrentGame] = useState<OnlineGame | null>(null)
  const [chessInstance, setChessInstance] = useState<Chess | null>(null)
  const [position, setPosition] = useState<string>('')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const lastMove = null
  const [whiteTime, setWhiteTime] = useState<number>(180000)
  const [blackTime, setBlackTime] = useState<number>(180000)
  const [isOpponentOnline, setIsOpponentOnline] = useState<boolean>(true)
  const [disconnectTimeout, setDisconnectTimeout] = useState<number | null>(null)

  // Subscription channels refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameChannelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presenceChannelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchmakingChannelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clockIntervalRef = useRef<any>(null)

  function cleanupSubscriptions() {
    if (gameChannelRef.current) supabase.removeChannel(gameChannelRef.current)
    if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
    if (matchmakingChannelRef.current) supabase.removeChannel(matchmakingChannelRef.current)
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
  }

  async function handleTimeLoss(gameId: string, type: 'white_loss' | 'black_loss') {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
    const result = type === 'white_loss' ? 'black_wins' : 'white_wins'
    try {
      await supabase.rpc('complete_online_game', {
        game_id: gameId,
        game_result: result,
        final_pgn: chessInstance?.pgn() || '',
      })
    } catch (err) {
      console.warn('Failed to complete match by time:', err)
    }
  }

  async function handleAbandonGame(gameId: string, isWhitePlayer: boolean) {
    const result = isWhitePlayer ? 'white_wins' : 'black_wins'
    try {
      await supabase.rpc('complete_online_game', {
        game_id: gameId,
        game_result: result,
        final_pgn: chessInstance?.pgn() || '',
      })
      localStorage.removeItem('active_online_game_id')
      setCurrentGame((prev) => (prev ? { ...prev, status: 'abandoned', result } : null))
    } catch (err) {
      console.warn('Failed to claim win by abandonment:', err)
    }
  }

  function startClockTick() {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)

    clockIntervalRef.current = setInterval(() => {
      setCurrentGame((prev) => {
        if (!prev || prev.status !== 'active') {
          if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
          return prev
        }

        const isWhiteTurn = prev.current_fen.split(' ')[1] === 'w'
        const elapsed = Date.now() - new Date(prev.last_move_at).getTime()

        if (isWhiteTurn) {
          const rem = Math.max(0, prev.white_time_ms - elapsed)
          setWhiteTime(rem)
          if (rem <= 0) {
            clearInterval(clockIntervalRef.current)
            handleTimeLoss(prev.id, 'white_loss')
          }
        } else {
          const rem = Math.max(0, prev.black_time_ms - elapsed)
          setBlackTime(rem)
          if (rem <= 0) {
            clearInterval(clockIntervalRef.current)
            handleTimeLoss(prev.id, 'black_loss')
          }
        }

        return prev
      })
    }, 200)
  }

  function handleRoomUpdate(updated: OnlineGame) {
    setCurrentGame(updated)
    setWhiteTime(updated.white_time_ms)
    setBlackTime(updated.black_time_ms)

    const chess = new Chess(updated.current_fen)
    setChessInstance(chess)
    setPosition(updated.current_fen)

    // Calculate last move highlight
    if (updated.fen_history.length > 1) {
      // Draw details from history if needed, otherwise parse or leave blank
    }

    if (updated.status === 'completed' || updated.status === 'abandoned') {
      cleanupSubscriptions()
      localStorage.removeItem('active_online_game_id')
    }
  }

  function setupGameRoom(game: OnlineGame, userId: string) {
    cleanupSubscriptions()

    setCurrentGame(game)
    localStorage.setItem('active_online_game_id', game.id)

    const isWhite = game.white_id === userId
    setBoardOrientation(isWhite ? 'white' : 'black')

    const chess = new Chess(game.current_fen)
    setChessInstance(chess)
    setPosition(game.current_fen)

    setWhiteTime(game.white_time_ms)
    setBlackTime(game.black_time_ms)

    // Setup channels
    // A. Game updates
    const gameChan = supabase
      .channel(`game:${game.room_code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_games',
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          const nextGame = payload.new as OnlineGame
          handleRoomUpdate(nextGame)
        }
      )
      .subscribe()

    gameChannelRef.current = gameChan

    // B. Presence monitoring
    const presenceChan = supabase.channel(`presence:${game.room_code}`, {
      config: { presence: { key: userId } },
    })

    presenceChan
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChan.presenceState()
        const activeUserIds = Object.keys(state)
        const opponentId = isWhite ? game.black_id : game.white_id

        if (opponentId) {
          const isOnline = activeUserIds.includes(opponentId)
          setIsOpponentOnline(isOnline)

          if (!isOnline) {
            // Trigger 30-sec abandonment timer
            if (disconnectTimeout === null) {
              const timer = window.setTimeout(() => {
                handleAbandonGame(game.id, isWhite)
              }, 30000)
              setDisconnectTimeout(timer)
            }
          } else {
            if (disconnectTimeout !== null) {
              clearTimeout(disconnectTimeout)
              setDisconnectTimeout(null)
            }
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChan.track({
            user_id: userId,
            online: true,
          })
        }
      })

    presenceChannelRef.current = presenceChan

    // C. Start clock interval
    startClockTick()
  }

  async function checkForActiveGame(userId: string) {
    try {
      const activeId = localStorage.getItem('active_online_game_id')
      if (!activeId) return

      const { data, error } = await supabase
        .from('online_games')
        .select('*')
        .eq('id', activeId)
        .single()

      if (data && !error && (data.status === 'active' || data.status === 'waiting')) {
        setupGameRoom(data, userId)
      } else {
        localStorage.removeItem('active_online_game_id')
      }
    } catch (e) {
      console.warn('Error checking for active game reconnect:', e)
    }
  }

  async function fetchUserRatings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('user_id', userId)
        .eq('time_control', 'blitz')
        .single()

      if (data && !error) {
        setUserRating(data.rating || 1200)
        setUserStats({
          wins: data.wins || 0,
          losses: data.losses || 0,
          draws: data.draws || 0,
        })
      }
    } catch (e) {
      console.warn('Error fetching user Elo:', e)
    }
  }

  // 1. Handle Auth check on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          fetchUserRatings(session.user.id)
          checkForActiveGame(session.user.id)
        }
      })
    }, 50)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserRatings(session.user.id)
        checkForActiveGame(session.user.id)
      } else {
        // Reset states on logout
        setCurrentGame(null)
        setIsSearching(false)
      }
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
      cleanupSubscriptions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Auth handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })
        if (error) throw error
        setAuthError('Registration successful! Please check your email for verification.')
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Authentication failed.'
      setAuthError(errMsg)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    cleanupSubscriptions()
    localStorage.removeItem('active_online_game_id')
    await supabase.auth.signOut()
  }

  // 3. Matchmaking & Lobby flows
  const handleStartMatchmaking = async () => {
    if (!session) return
    setIsSearching(true)
    setLobbyError(null)

    const username = session.user.email?.split('@')[0] || 'Player'

    try {
      // Join Matchmaking via PL/pgSQL RPC
      const { data, error } = await supabase.rpc('join_matchmaking', {
        p_user_id: session.user.id,
        p_username: username,
        p_elo: userRating,
        p_time_control: selectedTimeControl,
        p_is_rated: true,
      })

      if (error) throw error

      if (data.matched && data.game) {
        setupGameRoom(data.game, session.user.id)
      } else {
        // Listen to active/waiting games for matchmaking updates
        const channel = supabase
          .channel('matchmaking-wait')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'online_games',
            },
            (payload) => {
              const game = payload.new as OnlineGame
              if (game.white_id === session.user.id || game.black_id === session.user.id) {
                setupGameRoom(game, session.user.id)
                supabase.removeChannel(channel)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'online_games',
            },
            (payload) => {
              const game = payload.new as OnlineGame
              if (
                (game.white_id === session.user.id || game.black_id === session.user.id) &&
                game.status === 'active'
              ) {
                setupGameRoom(game, session.user.id)
                supabase.removeChannel(channel)
              }
            }
          )
          .subscribe()

        matchmakingChannelRef.current = channel
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start matchmaking.'
      setLobbyError(errMsg)
      setIsSearching(false)
    }
  }

  const handleCancelMatchmaking = async () => {
    if (!session) return
    setIsSearching(false)
    if (matchmakingChannelRef.current) {
      supabase.removeChannel(matchmakingChannelRef.current)
    }

    try {
      await supabase.from('matchmaking_queue').delete().eq('user_id', session.user.id)
    } catch (e) {
      console.warn('Error canceling matchmaking queue:', e)
    }
  }

  const handleCreatePrivateLobby = async () => {
    if (!session) return
    setLobbyError(null)

    const username = session.user.email?.split('@')[0] || 'Player'
    const code = upperRandomRoomCode()

    try {
      const { error } = await supabase
        .from('online_games')
        .insert({
          room_code: code,
          white_id: session.user.id,
          white_username: username,
          white_elo: userRating,
          time_control: selectedTimeControl,
          is_rated: false,
          status: 'waiting',
        })
        .select()
        .single()

      if (error) throw error

      setCreatedRoomCode(code)

      // Listen for updates until player joins
      const channel = supabase
        .channel(`lobby:${code}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'online_games',
            filter: `room_code=eq.${code}`,
          },
          (payload) => {
            const game = payload.new as OnlineGame
            if (game.status === 'active' && game.black_id) {
              setupGameRoom(game, session.user.id)
              supabase.removeChannel(channel)
            }
          }
        )
        .subscribe()

      gameChannelRef.current = channel
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create room.'
      setLobbyError(errMsg)
    }
  }

  const handleCancelPrivateLobby = async () => {
    setCreatedRoomCode(null)
    cleanupSubscriptions()
    try {
      if (session) {
        await supabase
          .from('online_games')
          .delete()
          .eq('white_id', session.user.id)
          .eq('status', 'waiting')
      }
    } catch (e) {
      console.warn('Failed to delete lobby room:', e)
    }
  }

  const handleJoinPrivateLobby = async () => {
    if (!session || !roomCodeInput) return
    setLobbyError(null)

    const code = roomCodeInput.toUpperCase().trim()
    const username = session.user.email?.split('@')[0] || 'Player'

    try {
      const { data, error } = await supabase.rpc('join_private_game', {
        p_room_code: code,
        p_user_id: session.user.id,
        p_username: username,
        p_elo: userRating,
      })

      if (error) throw error

      if (data.success && data.game) {
        setupGameRoom(data.game, session.user.id)
      } else {
        setLobbyError(data.message || 'Lobby not found.')
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to join lobby.'
      setLobbyError(errMsg)
    }
  }

  const upperRandomRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let res = ''
    for (let i = 0; i < 6; i++) {
      res += chars[Math.floor(Math.random() * chars.length)]
    }
    return res
  }

  // 5. Game Actions
  const handlePlayerMove = async (move: { from: string; to: string; promotion?: string }) => {
    if (!currentGame || !chessInstance || currentGame.status !== 'active') return

    const activeColor = chessInstance.turn() === 'w' ? 'white' : 'black'
    const myColor = boardOrientation

    if (activeColor !== myColor) return

    try {
      const nextChess = new Chess(chessInstance.fen())
      const moveRes = nextChess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      })

      if (moveRes) {
        // Calculate remaining clock time with elapsed subtraction
        const elapsed = Date.now() - new Date(currentGame.last_move_at).getTime()
        let nextWhiteTime = currentGame.white_time_ms
        let nextBlackTime = currentGame.black_time_ms

        if (myColor === 'white') {
          nextWhiteTime = Math.max(0, currentGame.white_time_ms - elapsed)
        } else {
          nextBlackTime = Math.max(0, currentGame.black_time_ms - elapsed)
        }

        const nextFen = nextChess.fen()
        const nextHistory = [...currentGame.fen_history, nextFen]

        const isCheckmate = nextChess.isCheckmate()
        const isDraw = nextChess.isDraw()

        let nextStatus: OnlineGame['status'] = currentGame.status
        let nextResult = currentGame.result

        if (isCheckmate) {
          nextStatus = 'completed'
          nextResult = myColor === 'white' ? 'white_wins' : 'black_wins'
        } else if (isDraw) {
          nextStatus = 'completed'
          nextResult = 'draw'
        }

        // Apply local changes immediately
        setChessInstance(nextChess)
        setPosition(nextFen)
        setWhiteTime(nextWhiteTime)
        setBlackTime(nextBlackTime)

        // Write changes to database
        const updatePayload = {
          current_fen: nextFen,
          fen_history: nextHistory,
          white_time_ms: nextWhiteTime,
          black_time_ms: nextBlackTime,
          last_move_at: new Date().toISOString(),
          status: nextStatus,
          result: nextResult,
          pgn: nextChess.pgn(),
          draw_offered_by: null, // Clear draw offers on move
        }

        await supabase.from('online_games').update(updatePayload).eq('id', currentGame.id)
      }
    } catch (e) {
      console.warn('Move validation failed locally:', e)
    }
  }

  const handleResign = async () => {
    if (!currentGame || !session) return
    const result = boardOrientation === 'white' ? 'black_wins' : 'white_wins'

    try {
      await supabase.rpc('complete_online_game', {
        game_id: currentGame.id,
        game_result: result,
        final_pgn: chessInstance?.pgn() || '',
      })
    } catch (e) {
      console.warn('Failed to resign game:', e)
    }
  }

  const handleOfferDraw = async () => {
    if (!currentGame || !session) return
    try {
      await supabase
        .from('online_games')
        .update({ draw_offered_by: session.user.id })
        .eq('id', currentGame.id)
    } catch (e) {
      console.warn('Failed to offer draw:', e)
    }
  }

  const handleAcceptDraw = async () => {
    if (!currentGame || !session) return
    try {
      await supabase.rpc('complete_online_game', {
        game_id: currentGame.id,
        game_result: 'draw',
        final_pgn: chessInstance?.pgn() || '',
      })
    } catch (e) {
      console.warn('Failed to accept draw:', e)
    }
  }

  const handleDeclineDraw = async () => {
    if (!currentGame || !session) return
    try {
      await supabase.from('online_games').update({ draw_offered_by: null }).eq('id', currentGame.id)
    } catch (e) {
      console.warn('Failed to decline draw:', e)
    }
  }

  const handleExitToHub = () => {
    setCurrentGame(null)
    cleanupSubscriptions()
    localStorage.removeItem('active_online_game_id')
  }

  // Formatting clock time
  const formatTime = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 6. Gated Auth Screen
  if (!session) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <DocumentTitle title="Login Required" description="Sign in to Chessmaster Pro to access multiplayer matchmaking, custom lobbies, and competitive tournaments." />

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-purple-600/10 text-purple-400 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
            ♚
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Multiplayer Chess Gate</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Login or register an account to access matchmaking, private game lobbies, and rating
              ELO sync.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 font-bold uppercase">
                Email Address
              </label>
              <input
                type="email"
                required
                data-testid="input-email"
                placeholder="grandmaster@chess.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-200 px-3 py-2 rounded-lg text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 font-bold uppercase">
                Password
              </label>
              <input
                type="password"
                required
                data-testid="input-password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-200 px-3 py-2 rounded-lg text-sm outline-none transition-all"
              />
            </div>

            {authError && (
              <div
                data-testid="auth-error"
                className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg font-semibold"
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              data-testid="btn-auth-submit"
              className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 text-white font-bold rounded-lg text-sm shadow cursor-pointer transition-all disabled:opacity-40"
            >
              {authLoading
                ? 'Authenticating...'
                : authMode === 'signin'
                  ? 'Sign In to Account'
                  : 'Register Account'}
            </button>
          </form>

          <div className="border-t border-slate-850 pt-4 flex justify-between items-center text-xs">
            <span className="text-slate-500">
              {authMode === 'signin' ? "Don't have an account?" : 'Already registered?'}
            </span>
            <button
              onClick={() => {
                setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'))
                setAuthError(null)
              }}
              className="text-purple-400 font-bold hover:text-purple-300 transition-colors cursor-pointer"
            >
              {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 7. Loading Match state
  if (isSearching) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center animate-pulse">
        <DocumentTitle title="SearchingOpponent" description="Searching for a matchmaking opponent on Chessmaster Pro..." />
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Searching for opponent...</h2>
          <p className="text-slate-400 text-xs font-mono">
            Mode: {selectedTimeControl} | Elo: {userRating}
          </p>
        </div>
        <button
          data-testid="btn-cancel-match"
          onClick={handleCancelMatchmaking}
          className="px-6 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
        >
          Cancel Search
        </button>
      </div>
    )
  }

  // 8. Custom room waiting screen
  if (createdRoomCode && !currentGame) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center animate-pulse">
        <DocumentTitle title="Waiting for Player" description="Waiting for player to join the multiplayer room on Chessmaster Pro..." />
        <div className="w-16 h-16 bg-blue-600/10 text-blue-400 border border-blue-500/25 rounded-full flex items-center justify-center mx-auto text-3xl font-extrabold animate-bounce">
          🌐
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">Private Lobby Created</h2>
          <p className="text-slate-400 text-xs">Share this code with your friend to connect:</p>
          <div
            data-testid="room-code-display"
            className="px-6 py-3 bg-slate-900 border border-slate-850 rounded-xl font-mono text-3xl font-extrabold tracking-widest text-purple-400 border-dashed"
          >
            {createdRoomCode}
          </div>
        </div>
        <button
          data-testid="btn-cancel-lobby"
          onClick={handleCancelPrivateLobby}
          className="px-6 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
        >
          Cancel Lobby
        </button>
      </div>
    )
  }

  // 9. Active Chess Arena Screen
  if (currentGame) {
    const isWhite = boardOrientation === 'white'
    const oppName = isWhite ? currentGame.black_username || 'Opponent' : currentGame.white_username
    const oppRating = isWhite ? currentGame.black_elo || 1200 : currentGame.white_elo
    const myName = isWhite ? currentGame.white_username : currentGame.black_username || 'You'
    const myRating = isWhite ? currentGame.white_elo : currentGame.black_elo || 1200

    const isGameOver = currentGame.status === 'completed' || currentGame.status === 'abandoned'
    const isWhiteTurn = position.split(' ')[1] === 'w'
    const activeColor = isWhiteTurn ? 'white' : 'black'
    const myTurn = activeColor === boardOrientation

    let matchStatusText = myTurn ? 'Your Turn' : "Opponent's Turn"
    if (isGameOver) {
      if (currentGame.result === 'draw') {
        matchStatusText = 'Game Over. Draw.'
      } else {
        const whiteWins = currentGame.result === 'white_wins'
        const winner = whiteWins ? 'White' : 'Black'
        matchStatusText = `Game Over. ${winner} wins!`
      }
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto py-2">
        <DocumentTitle title={`Match Vs ${oppName}`} description={`Playing an active real-time multiplayer chess match against ${oppName} on Chessmaster Pro.`} />

        {/* Status header bar */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs">
          <span className="font-mono text-slate-500">Room Code: {currentGame.room_code}</span>
          <span className="font-bold text-purple-400 uppercase tracking-wider">
            {matchStatusText}
          </span>
        </div>

        {/* Opponent disconnect warning banner */}
        {!isOpponentOnline && !isGameOver && (
          <div
            data-testid="disconnect-warning"
            className="p-3 bg-amber-950/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center gap-2 animate-pulse"
          >
            <Info className="w-4 h-4" /> Opponent disconnected! Game will be claimed in 30s.
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Board column */}
          <div className="flex flex-col items-center space-y-4 w-full max-w-[480px]">
            {/* Opponent Panel */}
            <div className="flex items-center justify-between w-full bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${!isOpponentOnline ? 'bg-slate-800 text-slate-600 border border-slate-700' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
                >
                  {isWhite ? '♟' : '♙'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs capitalize">{oppName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Rating: {oppRating}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-slate-350 font-mono text-sm">
                <Clock className="w-3.5 h-3.5 text-slate-550" />
                <span>{isWhite ? formatTime(blackTime) : formatTime(whiteTime)}</span>
              </div>
            </div>

            {/* Board */}
            <ChessBoard
              position={position}
              orientation={boardOrientation}
              onMove={handlePlayerMove}
              readOnly={isGameOver || !myTurn}
              highlightLastMove={lastMove}
            />

            {/* User Panel */}
            <div className="flex items-center justify-between w-full bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-650 flex items-center justify-center text-white border border-purple-400 font-bold text-xs">
                  {isWhite ? '♙' : '♟'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs capitalize">{myName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Rating: {myRating}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-slate-300 font-mono text-sm">
                <Clock
                  className={`w-3.5 h-3.5 ${myTurn ? 'text-purple-400 animate-pulse' : 'text-slate-550'}`}
                />
                <span className={myTurn ? 'text-purple-300 font-bold' : 'text-slate-350'}>
                  {isWhite ? formatTime(whiteTime) : formatTime(blackTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-[320px] bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 flex flex-col justify-between self-stretch">
            <div className="space-y-4">
              <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                ⚔️ Game Actions
              </h3>

              {/* Draw offer check */}
              {currentGame.draw_offered_by && currentGame.draw_offered_by !== session.user.id && (
                <div
                  data-testid="draw-offer-alert"
                  className="p-3 bg-purple-950/20 border border-purple-800/35 rounded-lg space-y-2"
                >
                  <p className="text-purple-300 text-xs font-semibold">
                    Opponent offered a draw. Accept?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      data-testid="btn-accept-draw"
                      onClick={handleAcceptDraw}
                      className="py-1 bg-purple-600 hover:bg-purple-550 text-white text-xs font-bold rounded cursor-pointer transition-all"
                    >
                      Accept
                    </button>
                    <button
                      data-testid="btn-decline-draw"
                      onClick={handleDeclineDraw}
                      className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded cursor-pointer transition-all border border-slate-700"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {currentGame.draw_offered_by === session.user.id && (
                <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg text-slate-400 text-xs font-semibold">
                  ⏳ Draw offer pending...
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-850">
              {!isGameOver ? (
                <>
                  <button
                    data-testid="btn-offer-draw"
                    onClick={handleOfferDraw}
                    disabled={!!currentGame.draw_offered_by}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-750 transition-all cursor-pointer disabled:opacity-40"
                  >
                    Offer Draw
                  </button>
                  <button
                    data-testid="btn-resign"
                    onClick={handleResign}
                    className="w-full py-2 border border-red-500/20 bg-red-950/5 hover:bg-red-950/25 text-red-400/80 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Resign Match
                  </button>
                </>
              ) : (
                <button
                  data-testid="btn-return-to-lobby"
                  onClick={handleExitToHub}
                  className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Return to Lobby
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 10. Default Lobby Page
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6">
      <DocumentTitle title="Online Matchmaking" description="Enter the real-time multiplayer lobby, start matchmaking, or create a private custom lobby on Chessmaster Pro." />

      {/* Header */}
      <section className="flex justify-between items-center border-b border-slate-850 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Multiplayer Matchmaking
          </h1>
          <p className="text-slate-400 text-sm">
            Play real-time chess matches against other users globally.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </section>

      {/* Stats and lobby choices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Profile Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Player Profile
          </h3>
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 uppercase font-mono">Ratings Elo:</span>
              <span className="text-lg font-bold text-purple-400 font-mono">{userRating}</span>
            </div>
            <div className="border-t border-slate-850 pt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-mono">Wins</p>
                <p className="text-sm font-bold text-emerald-450">{userStats.wins}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-mono">Losses</p>
                <p className="text-sm font-bold text-red-450">{userStats.losses}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-mono">Draws</p>
                <p className="text-sm font-bold text-slate-400">{userStats.draws}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2 text-xs">
            <h4 className="font-bold text-white flex items-center gap-1">
              <PlayCircle className="w-3.5 h-3.5 text-purple-400" /> Active Presences
            </h4>
            <p className="text-slate-450 leading-relaxed text-[11px]">
              The multiplayer system uses Supabase Realtime replication and Presence channels to
              sync moves, draw negotiations, and clock times.
            </p>
          </div>
        </div>

        {/* Center/Right Columns: Matchmaking and Code join */}
        <div className="md:col-span-2 space-y-6">
          {lobbyError && (
            <div
              data-testid="lobby-error"
              className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg font-semibold"
            >
              {lobbyError}
            </div>
          )}

          {/* Time control choice */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-purple-400" /> Matchmaking Queue
              </h3>
              <p className="text-slate-450 text-xs">
                Select a time control to search for a compatible opponent in the ratings pool.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { code: 'bullet_1_0', label: '1+0 Bullet', icon: '⚡' },
                { code: 'blitz_3_2', label: '3+2 Blitz', icon: '🔥' },
                { code: 'blitz_5_0', label: '5+0 Blitz', icon: '⏱️' },
                { code: 'rapid_10_0', label: '10+0 Rapid', icon: '🧠' },
              ].map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setSelectedTimeControl(opt.code)}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all duration-200 ${
                    selectedTimeControl === opt.code
                      ? 'bg-purple-600/10 border-purple-500 text-purple-300 font-bold'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>

            <button
              data-testid="btn-find-match"
              onClick={handleStartMatchmaking}
              className="w-full py-3 bg-purple-650 hover:bg-purple-550 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg hover:shadow-purple-500/10 flex items-center justify-center gap-2"
            >
              🚀 Find Match Now
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Create Custom Room Card */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col justify-between shadow-xl space-y-4">
              <div className="space-y-2">
                <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-blue-400" /> Create Custom Lobby
                </h3>
                <p className="text-slate-450 text-xs leading-relaxed">
                  Generate a private room code. Friends can use this code to connect directly.
                </p>
              </div>
              <button
                data-testid="btn-create-lobby"
                onClick={handleCreatePrivateLobby}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow"
              >
                Create Room
              </button>
            </div>

            {/* Join by Code Card */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col justify-between shadow-xl space-y-4">
              <div className="space-y-2">
                <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-emerald-400" /> Join Room Code
                </h3>
                <p className="text-slate-450 text-xs leading-relaxed">
                  Enter a 6-character room code received from a friend to start the match.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  data-testid="input-room-code"
                  placeholder="CODE12"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-widest outline-none uppercase w-full"
                />
                <button
                  data-testid="btn-join-lobby"
                  onClick={handleJoinPrivateLobby}
                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 shadow"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
