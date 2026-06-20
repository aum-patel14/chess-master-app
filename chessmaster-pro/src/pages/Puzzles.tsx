import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { DocumentTitle } from '../components/DocumentTitle'
import { ChessBoard } from '../components/ChessBoard'
import { supabase } from '../lib/supabaseClient'
import {
  Award,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Trophy,
  Activity,
  RotateCcw,
} from 'lucide-react'

interface Puzzle {
  id: string
  fen: string
  moves: string
  rating: number
  themes: string[]
  title?: string
  description?: string
}

const MOCK_PUZZLES: Puzzle[] = [
  {
    id: 'puzzle-1',
    fen: '5rk1/ppp2ppp/8/8/8/6PP/3RR1K1/8 b - - 0 1',
    moves: 'a7a5 d2d8 f8d8 e2e8',
    rating: 1000,
    themes: ['mate', 'backRank'],
    title: 'Back Rank Defeat',
    description: "Exploit the opponent's weak back rank. Force the checkmate.",
  },
  {
    id: 'puzzle-2',
    fen: 'r1bqkbnr/ppp2ppp/2n5/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 4',
    moves: 'd2d4 e5d4 f3d4',
    rating: 1300,
    themes: ['tactics', 'center'],
    title: 'Clash in the Center',
    description: 'Fight for control of the center squares. Find the best trade sequence.',
  },
  {
    id: 'puzzle-3',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 2',
    moves: 'd2d4 c7c6 c1f4',
    rating: 1600,
    themes: ['development', 'opening'],
    title: 'Piece Development',
    description: 'Establish your pawns and develop your minor pieces efficiently.',
  },
]

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function Puzzles() {
  // Mode selection: 'hub' | 'daily' | 'rated' | 'streak'
  const [activeMode, setActiveMode] = useState<'hub' | 'daily' | 'rated' | 'streak'>('hub')

  // Stats
  const [userRating, setUserRating] = useState<number>(1200)
  const [solvedCount, setSolvedCount] = useState<number>(0)
  const [failedCount, setFailedCount] = useState<number>(0)
  const [dailyStreak, setDailyStreak] = useState<number>(0)
  const [bestStreak, setBestStreak] = useState<number>(0)
  const [currentStreak, setCurrentStreak] = useState<number>(0)

  // Current active puzzle solve states
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null)
  const [chessInstance, setChessInstance] = useState<Chess | null>(null)
  const [position, setPosition] = useState<string>('')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)
  const [moveList, setMoveList] = useState<string[]>([])
  const [currentMoveIdx, setCurrentMoveIdx] = useState<number>(0)
  const [puzzleStatus, setPuzzleStatus] = useState<'solving' | 'success' | 'failed'>('solving')
  const [feedback, setFeedback] = useState<string>('Find the best move.')
  const [loading, setLoading] = useState<boolean>(false)

  const fetchUserStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Fallback to local storage for guests
        const localRating = localStorage.getItem('guest_puzzle_rating')
        const localBest = localStorage.getItem('guest_puzzle_streak_best')
        const localDaily = localStorage.getItem('guest_puzzle_streak_daily')
        const localSolved = localStorage.getItem('guest_puzzle_solved_count')
        const localFailed = localStorage.getItem('guest_puzzle_failed_count')

        if (localRating) setUserRating(parseInt(localRating, 10))
        if (localBest) setBestStreak(parseInt(localBest, 10))
        if (localDaily) setDailyStreak(parseInt(localDaily, 10))
        if (localSolved) setSolvedCount(parseInt(localSolved, 10))
        if (localFailed) setFailedCount(parseInt(localFailed, 10))
        return
      }

      const { data, error } = await supabase
        .from('puzzle_ratings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setUserRating(data.rating || 1200)
        setBestStreak(data.streak_best || 0)
        setDailyStreak(data.daily_streak_days || 0)
        setSolvedCount(data.games_played || 0)
      }
    } catch (err) {
      console.warn('Failed to load user stats:', err)
    }
  }

  // Load user data on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUserStats()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const updateStatsInDB = async (solved: boolean, ratingChange: number, isStreakMode = false) => {
    const nextSolved = solved ? solvedCount + 1 : solvedCount
    const nextFailed = !solved ? failedCount + 1 : failedCount
    setSolvedCount(nextSolved)
    setFailedCount(nextFailed)

    let nextRating = userRating
    if (activeMode === 'rated') {
      nextRating = Math.max(100, userRating + ratingChange)
      setUserRating(nextRating)
    }

    let nextStreak = currentStreak
    let nextBest = bestStreak
    if (isStreakMode) {
      if (solved) {
        nextStreak = currentStreak + 1
        setCurrentStreak(nextStreak)
        if (nextStreak > bestStreak) {
          nextBest = nextStreak
          setBestStreak(nextBest)
        }
      } else {
        nextStreak = 0
        setCurrentStreak(0)
      }
    }

    let nextDailyStreak = dailyStreak
    if (activeMode === 'daily' && solved) {
      nextDailyStreak = dailyStreak + 1
      setDailyStreak(nextDailyStreak)
    }

    // Persist
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        localStorage.setItem('guest_puzzle_rating', nextRating.toString())
        localStorage.setItem('guest_puzzle_streak_best', nextBest.toString())
        localStorage.setItem('guest_puzzle_streak_daily', nextDailyStreak.toString())
        localStorage.setItem('guest_puzzle_solved_count', nextSolved.toString())
        localStorage.setItem('guest_puzzle_failed_count', nextFailed.toString())
        return
      }

      await supabase.from('puzzle_ratings').upsert({
        user_id: user.id,
        rating: nextRating,
        streak_best: nextBest,
        daily_streak_days: nextDailyStreak,
        games_played: nextSolved,
        updated_at: new Date().toISOString(),
      })

      if (currentPuzzle) {
        await supabase.from('puzzle_activity').insert({
          user_id: user.id,
          puzzle_id: currentPuzzle.id,
          solved,
          mode: activeMode,
          rating_before: userRating,
          rating_after: nextRating,
        })
      }
    } catch (err) {
      console.warn('Failed to save stats in database:', err)
    }
  }

  // Fetch puzzle based on current mode
  const loadPuzzle = async (mode: 'daily' | 'rated' | 'streak') => {
    setLoading(true)
    setHintMove(null)
    setLastMove(null)

    try {
      let selectedPuzzle: Puzzle | null = null

      if (mode === 'daily') {
        const { data, error } = await supabase.from('puzzles').select('*').limit(1)
        if (data && data.length > 0 && !error) {
          selectedPuzzle = data[0]
        } else {
          selectedPuzzle = MOCK_PUZZLES[0]
        }
      } else if (mode === 'rated') {
        const { data, error } = await supabase
          .from('puzzles')
          .select('*')
          .gte('rating', userRating - 150)
          .lte('rating', userRating + 150)
          .limit(10)

        if (data && data.length > 0 && !error) {
          selectedPuzzle = getRandomElement(data)
        } else {
          selectedPuzzle = getRandomElement(MOCK_PUZZLES)
        }
      } else {
        // Streak Mode (gradually increasing rating)
        const targetRating = 800 + currentStreak * 100
        const { data, error } = await supabase
          .from('puzzles')
          .select('*')
          .gte('rating', targetRating - 100)
          .lte('rating', targetRating + 100)
          .limit(10)

        if (data && data.length > 0 && !error) {
          selectedPuzzle = getRandomElement(data)
        } else {
          selectedPuzzle = MOCK_PUZZLES[currentStreak % MOCK_PUZZLES.length]
        }
      }

      if (selectedPuzzle) {
        startPuzzleInstance(selectedPuzzle)
      }
    } catch (err) {
      console.error('Failed to load puzzle, falling back to mocks:', err)
      const fallback = getRandomElement(MOCK_PUZZLES)
      startPuzzleInstance(fallback)
    } finally {
      setLoading(false)
    }
  }

  const startPuzzleInstance = (puz: Puzzle) => {
    setCurrentPuzzle(puz)

    const chess = new Chess(puz.fen)
    const movesArray = puz.moves.split(' ')

    // First move is played by opponent
    const oppMove = movesArray[0]
    const parsedOpp = {
      from: oppMove.slice(0, 2),
      to: oppMove.slice(2, 4),
      promotion: oppMove.length === 5 ? oppMove[4] : undefined,
    }

    chess.move(parsedOpp)

    setChessInstance(chess)
    setPosition(chess.fen())
    setMoveList(movesArray)
    setCurrentMoveIdx(1) // Index of the player's first correct move
    setLastMove(parsedOpp)
    setPuzzleStatus('solving')

    const playerColor = chess.turn() === 'w' ? 'white' : 'black'
    setBoardOrientation(playerColor)
    setFeedback(`Find the best move for ${playerColor === 'white' ? 'White' : 'Black'}.`)
  }

  // Handle user moves
  const handlePlayerMove = (move: { from: string; to: string; promotion?: string }) => {
    if (!chessInstance || puzzleStatus !== 'solving') return

    const playerUci = move.from + move.to + (move.promotion || '')
    const correctUci = moveList[currentMoveIdx]

    if (playerUci === correctUci) {
      // Apply correct player move
      const parsedMove = {
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      }
      chessInstance.move(parsedMove)
      setPosition(chessInstance.fen())
      setLastMove(parsedMove)
      setHintMove(null)

      const nextMoveIdx = currentMoveIdx + 2
      if (nextMoveIdx >= moveList.length) {
        // Solved!
        setPuzzleStatus('success')
        setFeedback('🎉 Correct! Puzzle solved successfully!')
        updateStatsInDB(true, 15, activeMode === 'streak')
      } else {
        // Opponent reply
        setFeedback('Correct! Opponent is replying...')
        setCurrentMoveIdx(nextMoveIdx)

        setTimeout(() => {
          const oppReply = moveList[nextMoveIdx - 1]
          const parsedOpp = {
            from: oppReply.slice(0, 2),
            to: oppReply.slice(2, 4),
            promotion: oppReply.length === 5 ? oppReply[4] : undefined,
          }
          chessInstance.move(parsedOpp)
          setPosition(chessInstance.fen())
          setLastMove(parsedOpp)
          setFeedback('Your turn. Keep going!')
        }, 600)
      }
    } else {
      // Failed move
      setPuzzleStatus('failed')
      setFeedback('❌ Incorrect move. That is not the best continuation. Try again!')
      updateStatsInDB(false, -10, activeMode === 'streak')
    }
  }

  const handleRetry = () => {
    if (!currentPuzzle) return
    // Reset to the position before the player's incorrect move
    const chess = new Chess(currentPuzzle.fen)
    // Replay moves up to the last opponent move
    for (let i = 0; i < currentMoveIdx; i++) {
      const uci = moveList[i]
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length === 5 ? uci[4] : undefined,
      })
    }
    setChessInstance(chess)
    setPosition(chess.fen())
    setHintMove(null)
    setPuzzleStatus('solving')
    setFeedback('Your turn. Find the best move.')
  }

  const handleGetHint = () => {
    if (!chessInstance || puzzleStatus !== 'solving') return
    const correctUci = moveList[currentMoveIdx]
    setHintMove({
      from: correctUci.slice(0, 2),
      to: correctUci.slice(2, 4),
    })
    setFeedback('Hint: The best square has been outlined.')
  }

  const handleStartMode = (mode: 'daily' | 'rated' | 'streak') => {
    setActiveMode(mode)
    if (mode === 'streak') {
      setCurrentStreak(0)
    }
    loadPuzzle(mode)
  }

  const handleExitToHub = () => {
    setActiveMode('hub')
    setCurrentPuzzle(null)
    setChessInstance(null)
    fetchUserStats()
  }

  const puzzleStats = [
    { label: 'Puzzle Rating', value: userRating.toString(), icon: Award },
    { label: 'Solved', value: solvedCount.toString(), icon: CheckCircle },
    { label: 'Failed', value: failedCount.toString(), icon: HelpCircle },
    { label: 'Best Streak', value: bestStreak.toString(), icon: Trophy },
  ]

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-white">Loading puzzle...</h2>
        <p className="text-slate-400 text-sm">Fetching position data from Supabase.</p>
      </div>
    )
  }

  // 2. Solving state interface
  if (activeMode !== 'hub' && currentPuzzle) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <DocumentTitle title={`Solving Puzzle | Chessmaster Pro`} />

        {/* Back and Status Bar */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <button
            data-testid="btn-exit-puzzles"
            onClick={handleExitToHub}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Puzzles Hub
          </button>
          <div className="flex items-center gap-4">
            {activeMode === 'streak' && (
              <span
                data-testid="streak-counter"
                className="text-xs font-mono font-bold bg-amber-950/40 text-amber-400 px-3 py-1 rounded border border-amber-900/30 flex items-center gap-1"
              >
                🔥 Streak: {currentStreak}
              </span>
            )}
            {activeMode === 'rated' && (
              <span
                data-testid="user-puzzle-rating"
                className="text-xs font-mono font-bold bg-purple-950/40 text-purple-400 px-3 py-1 rounded border border-purple-900/30 flex items-center gap-1"
              >
                ⚡ Rating: {userRating}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 uppercase">
              Difficulty: {currentPuzzle.rating}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          {/* Chessboard Column */}
          <div className="w-full max-w-[480px] mx-auto flex flex-col items-center space-y-4">
            <ChessBoard
              position={position}
              orientation={boardOrientation}
              onMove={handlePlayerMove}
              readOnly={puzzleStatus !== 'solving'}
              highlightLastMove={lastMove}
              highlightHint={hintMove}
            />
          </div>

          {/* Panel Column */}
          <div className="w-full lg:w-[320px] bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 flex flex-col justify-between self-stretch">
            <div className="space-y-4">
              <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Solve Challenge
              </h3>

              {/* Theme tags */}
              <div className="flex flex-wrap gap-1.5">
                {currentPuzzle.themes?.map((theme) => (
                  <span
                    key={theme}
                    className="text-[10px] font-semibold font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-850"
                  >
                    #{theme}
                  </span>
                ))}
              </div>

              {/* Feedback Alert Panel */}
              <div
                data-testid="puzzle-feedback"
                className={`p-4 rounded-xl border text-sm font-semibold leading-relaxed transition-all ${
                  puzzleStatus === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400 animate-pulse'
                    : puzzleStatus === 'failed'
                      ? 'bg-red-950/30 border-red-500/20 text-red-400'
                      : 'bg-slate-950/40 border-slate-850 text-slate-300'
                }`}
              >
                {feedback}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              {puzzleStatus === 'solving' && (
                <button
                  data-testid="btn-hint"
                  onClick={handleGetHint}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Reveal Suggested Move
                </button>
              )}

              {puzzleStatus === 'failed' && (
                <button
                  data-testid="btn-retry-puzzle"
                  onClick={handleRetry}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-fade-in"
                >
                  <RotateCcw className="w-4 h-4" /> Try Position Again
                </button>
              )}

              {puzzleStatus !== 'solving' && activeMode !== 'daily' && (
                <button
                  data-testid="btn-next-puzzle"
                  onClick={() => loadPuzzle(activeMode)}
                  className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-fade-in"
                >
                  Load Next Puzzle <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {puzzleStatus === 'success' && activeMode === 'daily' && (
                <button
                  data-testid="btn-next-puzzle"
                  onClick={handleExitToHub}
                  className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-fade-in"
                >
                  Return to Puzzles Hub <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3. Render Hub Screen
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6">
      <DocumentTitle title="Chess Puzzles" />

      {/* Header section */}
      <section className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Tactical Puzzles Hub</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
          Improve your tactical chess calculations with database puzzles. Choose a training mode
          that matches your goals.
        </p>
      </section>

      {/* Stats Dashboard */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {puzzleStats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="border border-slate-850 bg-slate-900/40 p-4 sm:p-5 rounded-xl flex items-center space-x-3.5"
              data-testid={`puzzle-stat-${stat.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className="p-2 bg-slate-800 text-purple-400 rounded-lg">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">{stat.label}</p>
                <h4 className="text-lg sm:text-xl font-bold text-white mt-0.5">{stat.value}</h4>
              </div>
            </div>
          )
        })}
      </section>

      {/* Puzzles Mode selection */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Daily Puzzle Card */}
        <div
          data-testid="puzzle-card-daily"
          className="border border-slate-800 bg-gradient-to-b from-blue-955/10 to-slate-900 p-6 rounded-2xl flex flex-col justify-between shadow-xl space-y-4 hover:scale-[1.02] transition-transform duration-300"
        >
          <div className="space-y-3">
            <span className="text-3xl">🗓️</span>
            <h3 className="text-xl font-extrabold text-white">Daily Tactical Challenge</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Solve the curated puzzle of the day. Consistent daily solving builds strong tactical
              memory and consecutive day streaks.
            </p>
          </div>
          <button
            data-testid="btn-play-daily"
            onClick={() => handleStartMode('daily')}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            Start Daily Challenge <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rated Training Card */}
        <div
          data-testid="puzzle-card-rated"
          className="border border-slate-800 bg-gradient-to-b from-purple-955/10 to-slate-900 p-6 rounded-2xl flex flex-col justify-between shadow-xl space-y-4 hover:scale-[1.02] transition-transform duration-300"
        >
          <div className="space-y-3">
            <span className="text-3xl">⚡</span>
            <h3 className="text-xl font-extrabold text-white">Rated Training</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Solve puzzles matching your current rating. Correct answers raise your rating, while
              incorrect answers drop it.
            </p>
          </div>
          <button
            data-testid="btn-play-rated"
            onClick={() => handleStartMode('rated')}
            className="w-full py-2 bg-purple-650 hover:bg-purple-550 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            Start Rated Training <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Streak Challenge Card */}
        <div
          data-testid="puzzle-card-streak"
          className="border border-slate-800 bg-gradient-to-b from-amber-955/10 to-slate-900 p-6 rounded-2xl flex flex-col justify-between shadow-xl space-y-4 hover:scale-[1.02] transition-transform duration-300"
        >
          <div className="space-y-3">
            <span className="text-3xl">🔥</span>
            <h3 className="text-xl font-extrabold text-white">Streak Challenge</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              How many puzzles can you solve in a row without making a single mistake? The
              difficulty increases with every success!
            </p>
          </div>
          <button
            data-testid="btn-play-streak"
            onClick={() => handleStartMode('streak')}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            Start Streak Challenge <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  )
}
