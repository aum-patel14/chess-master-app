import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { DocumentTitle } from '../components/DocumentTitle'
import { ChessBoard } from '../components/ChessBoard'
import { supabase } from '../lib/supabaseClient'
import {
  Award,
  CheckCircle,
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
  const [feedback, setFeedback] = useState<string>('Your turn. Find the best move.')
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
        setCurrentStreak(0)
        nextStreak = 0
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        localStorage.setItem('guest_puzzle_rating', nextRating.toString())
        localStorage.setItem('guest_puzzle_solved_count', nextSolved.toString())
        localStorage.setItem('guest_puzzle_failed_count', nextFailed.toString())
        if (isStreakMode) {
          localStorage.setItem('guest_puzzle_streak_best', nextBest.toString())
        }
        return
      }

      await supabase.from('puzzle_ratings').upsert({
        user_id: user.id,
        rating: nextRating,
        games_played: nextSolved + nextFailed,
        streak_best: nextBest,
        daily_streak_days: dailyStreak,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Failed to save stats in Supabase:', err)
    }
  }

  const loadPuzzle = async (mode: 'daily' | 'rated' | 'streak') => {
    setLoading(true)
    setPuzzleStatus('solving')
    setFeedback('Your turn. Find the best move.')
    setLastMove(null)
    setHintMove(null)

    try {
      // Supabase puzzle query
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .limit(10)

      let selectedPuzzle: Puzzle

      if (data && data.length > 0 && !error) {
        // Find suitable rated puzzle or random
        if (mode === 'rated') {
          const ratedPuzzles = data.filter(
            (p) => Math.abs(p.rating - userRating) <= 250
          )
          selectedPuzzle =
            ratedPuzzles.length > 0
              ? getRandomElement(ratedPuzzles)
              : getRandomElement(data)
        } else {
          selectedPuzzle = getRandomElement(data)
        }
      } else {
        // Fallback to local mocks
        selectedPuzzle = getRandomElement(MOCK_PUZZLES)
      }

      setCurrentPuzzle(selectedPuzzle)

      const instance = new Chess(selectedPuzzle.fen)
      const moves = selectedPuzzle.moves.split(' ')

      // Auto-play the opponent's first move
      if (moves.length > 0) {
        try {
          const move = moves[0]
          const from = move.slice(0, 2)
          const to = move.slice(2, 4)
          const promotion = move.slice(4, 5) || undefined
          instance.move({ from, to, promotion })
        } catch (e) {
          console.error('Failed to autoplay opponent first move:', e)
        }
      }

      setChessInstance(instance)
      setPosition(instance.fen())
      setMoveList(moves)
      setCurrentMoveIdx(1) // player starts at index 1
      setBoardOrientation(instance.turn() === 'w' ? 'white' : 'black')
    } catch (err) {
      console.error('Failed to load puzzle:', err)
      const fallback = getRandomElement(MOCK_PUZZLES)
      setCurrentPuzzle(fallback)
      const instance = new Chess(fallback.fen)
      setChessInstance(instance)
      setPosition(fallback.fen)
      setMoveList(fallback.moves.split(' '))
      setCurrentMoveIdx(0)
      setBoardOrientation(instance.turn() === 'w' ? 'white' : 'black')
    } finally {
      setLoading(false)
    }
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
    setPosition('')
    setLastMove(null)
    setHintMove(null)
  }

  const handleRetry = () => {
    if (!currentPuzzle) return
    setPuzzleStatus('solving')
    setFeedback('Your turn. Find the best move.')
    setLastMove(null)
    setHintMove(null)

    const instance = new Chess(currentPuzzle.fen)
    const moves = currentPuzzle.moves.split(' ')

    // Auto-play the opponent's first move on retry
    if (moves.length > 0) {
      try {
        const move = moves[0]
        const from = move.slice(0, 2)
        const to = move.slice(2, 4)
        const promotion = move.slice(4, 5) || undefined
        instance.move({ from, to, promotion })
      } catch (e) {
        console.error('Failed to autoplay opponent first move on retry:', e)
      }
    }

    setChessInstance(instance)
    setPosition(instance.fen())
    setCurrentMoveIdx(1)
  }

  const handleGetHint = () => {
    if (puzzleStatus !== 'solving' || !moveList || moveList.length <= currentMoveIdx) return
    const nextMoveStr = moveList[currentMoveIdx]
    const nextMoveFrom = nextMoveStr.slice(0, 2)
    const nextMoveTo = nextMoveStr.slice(2, 4)
    setHintMove({ from: nextMoveFrom, to: nextMoveTo })
    setFeedback('Hint: Review the highlighted suggestion on the board.')
  }

  const handlePlayerMove = (move: { from: string; to: string; promotion?: string }) => {
    if (puzzleStatus !== 'solving' || !chessInstance || !currentPuzzle) return

    const expectedMove = moveList[currentMoveIdx]
    const playerMoveStr = `${move.from}${move.to}`

    if (playerMoveStr.toLowerCase() === expectedMove.toLowerCase().slice(0, 4)) {
      // Correct Move!
      try {
        const nextInstance = new Chess(chessInstance.fen())
        const result = nextInstance.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
        })

        if (result) {
          setChessInstance(nextInstance)
          setPosition(nextInstance.fen())
          setLastMove({ from: move.from, to: move.to })
          setHintMove(null)

          const nextIdx = currentMoveIdx + 1
          if (nextIdx >= moveList.length) {
            // Puzzle fully solved!
            setPuzzleStatus('success')
            setFeedback('🎉 Correct! Puzzle solved successfully.')
            updateStatsInDB(true, 15, activeMode === 'streak')
          } else {
            // Opponent response (next move in the list)
            const opponentMoveStr = moveList[nextIdx]
            const oppFrom = opponentMoveStr.slice(0, 2)
            const oppTo = opponentMoveStr.slice(2, 4)
            const oppPromo = opponentMoveStr.slice(4, 5) || undefined

            setTimeout(() => {
              try {
                const oppMoveResult = nextInstance.move({
                  from: oppFrom,
                  to: oppTo,
                  promotion: oppPromo,
                })

                if (oppMoveResult) {
                  setChessInstance(nextInstance)
                  setPosition(nextInstance.fen())
                  setLastMove({ from: oppFrom, to: oppTo })
                  setCurrentMoveIdx(nextIdx + 1)
                  if (nextIdx + 1 >= moveList.length) {
                    setPuzzleStatus('success')
                    setFeedback('🎉 Correct! Puzzle solved successfully.')
                    updateStatsInDB(true, 15, activeMode === 'streak')
                  } else {
                    setFeedback('Your turn. Keep going!')
                  }
                }
              } catch (err) {
                console.error('Failed opponent move response:', err)
              }
            }, 800)
          }
        }
      } catch (err) {
        console.warn('Move execution error:', err)
      }
    } else {
      // Incorrect Move!
      setPuzzleStatus('failed')
      setFeedback('❌ Incorrect move. Study the board and try again.')
      updateStatsInDB(false, -10, activeMode === 'streak')
    }
  }

  const puzzleStats = [
    { label: 'Puzzle Rating', value: `${userRating} Elo`, icon: Trophy, testId: 'puzzle-rating' },
    { label: 'Puzzles Solved', value: solvedCount, icon: CheckCircle, testId: 'solved' },
    { label: 'Best Streak', value: bestStreak, icon: Award, testId: 'best-streak' },
    { label: 'Active Streak', value: `${dailyStreak} days`, icon: Award, testId: 'active-streak' },
  ]

  // 1. Rendering Loading State
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center">
        <div className="w-12 h-12 border-4 border-chess-green border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-black text-white">Loading puzzle...</h2>
        <p className="text-[#bababa] text-xs leading-relaxed">Fetching position data from Supabase.</p>
      </div>
    )
  }

  // 2. Solving state interface
  if (activeMode !== 'hub' && currentPuzzle) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-2">
        <DocumentTitle
          title="Solving Puzzle"
          description="Improve your chess tactics by solving this interactive chess puzzle on Chessmaster Pro."
        />

        {/* Back and Status Bar */}
        <div className="flex justify-between items-center bg-chess-dark border border-[#3c3a37] p-4 rounded-xl shadow">
          <button
            data-testid="btn-exit-puzzles"
            onClick={handleExitToHub}
            className="text-xs font-bold text-[#bababa] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Puzzles Hub
          </button>
          <div className="flex items-center gap-3">
            {activeMode === 'streak' && (
              <span
                data-testid="streak-counter"
                className="text-xs font-mono font-bold bg-chess-darker text-amber-500 px-3 py-1 rounded border border-[#3c3a37] flex items-center gap-1 shadow"
              >
                🔥 Streak: {currentStreak}
              </span>
            )}
            {activeMode === 'rated' && (
              <span
                data-testid="user-puzzle-rating"
                className="text-xs font-mono font-bold bg-chess-darker text-chess-green px-3 py-1 rounded border border-[#3c3a37] flex items-center gap-1 shadow"
              >
                ⚡ Rating: {userRating}
              </span>
            )}
            <span className="text-xs font-bold text-[#bababa] bg-chess-darker px-3 py-1 rounded border border-[#3c3a37] uppercase tracking-wider">
              Difficulty: {currentPuzzle.rating}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 justify-center items-start">
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
          <div className="w-full lg:w-[320px] bg-chess-dark border border-[#3c3a37] rounded-xl p-5 space-y-5 flex flex-col justify-between self-stretch shadow-lg">
            <div className="space-y-4">
              <h3 className="text-md font-black text-white border-b border-[#3c3a37] pb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-chess-green" /> Solve Challenge
              </h3>

              {/* Theme tags */}
              <div className="flex flex-wrap gap-1.5">
                {currentPuzzle.themes?.map((theme) => (
                  <span
                    key={theme}
                    className="text-[9px] font-bold font-mono bg-chess-darker text-[#bababa] px-2 py-0.5 rounded border border-[#3c3a37]"
                  >
                    #{theme}
                  </span>
                ))}
              </div>

              {/* Feedback Alert Panel */}
              <div
                data-testid="puzzle-feedback"
                className={`p-4 rounded-xl border text-xs font-bold leading-relaxed transition-all ${
                  puzzleStatus === 'success'
                    ? 'bg-chess-green/10 border-chess-green/20 text-chess-green animate-pulse'
                    : puzzleStatus === 'failed'
                      ? 'bg-red-955/15 border-red-500/20 text-red-400'
                      : 'bg-chess-darker border-[#3c3a37] text-white'
                }`}
              >
                {feedback}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2.5 pt-4 border-t border-[#3c3a37]">
              {puzzleStatus === 'solving' && (
                <button
                  data-testid="btn-hint"
                  onClick={handleGetHint}
                  className="chess-btn-green w-full py-3 rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Reveal Suggested Move
                </button>
              )}

              {puzzleStatus === 'failed' && (
                <button
                  data-testid="btn-retry-puzzle"
                  onClick={handleRetry}
                  className="chess-btn-grey w-full py-3 rounded-lg text-xs text-white flex items-center justify-center gap-1.5 cursor-pointer animate-fade-in"
                >
                  <RotateCcw className="w-4 h-4 text-chess-green" /> Try Position Again
                </button>
              )}

              {puzzleStatus !== 'solving' && activeMode !== 'daily' && (
                <button
                  data-testid="btn-next-puzzle"
                  onClick={() => loadPuzzle(activeMode)}
                  className="chess-btn-green w-full py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 animate-fade-in shadow"
                >
                  Load Next Puzzle <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {puzzleStatus === 'success' && activeMode === 'daily' && (
                <button
                  data-testid="btn-next-puzzle"
                  onClick={handleExitToHub}
                  className="chess-btn-green w-full py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 animate-fade-in shadow"
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
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <DocumentTitle
        title="Chess Puzzles"
        description="Train your tactical calculation skills with daily puzzles, rated chess training, and high-difficulty puzzle streak challenges on Chessmaster Pro."
      />

      {/* Header section */}
      <section className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white">Tactical Puzzles Hub</h1>
        <p className="text-[#bababa] max-w-xl mx-auto text-xs leading-relaxed">
          Improve your tactical chess calculations with database puzzles. Choose a training mode that matches your goals.
        </p>
      </section>

      {/* Stats Dashboard */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {puzzleStats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="border border-[#3c3a37] bg-chess-dark p-4 rounded-xl flex items-center space-x-3.5 shadow"
              data-testid={`puzzle-stat-${stat.testId}`}
            >
              <div className="p-2.5 bg-chess-darker text-chess-green rounded-lg">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[#bababa] text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
                <h4 className="text-lg font-black text-white mt-0.5">{stat.value}</h4>
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
          className="border border-[#3c3a37] bg-chess-dark p-6 rounded-xl flex flex-col justify-between shadow space-y-4 hover:scale-[1.01] transition-transform duration-150"
        >
          <div className="space-y-2.5">
            <span className="text-3xl block">🗓️</span>
            <h3 className="text-lg font-black text-white">Daily Tactical Challenge</h3>
            <p className="text-[#bababa] text-xs leading-relaxed">
              Solve the curated puzzle of the day. Consistent daily solving builds strong tactical memory and consecutive day streaks.
            </p>
          </div>
          <button
            data-testid="btn-play-daily"
            onClick={() => handleStartMode('daily')}
            className="chess-btn-green w-full py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
          >
            Start Daily Challenge <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rated Training Card */}
        <div
          data-testid="puzzle-card-rated"
          className="border border-[#3c3a37] bg-chess-dark p-6 rounded-xl flex flex-col justify-between shadow space-y-4 hover:scale-[1.01] transition-transform duration-150"
        >
          <div className="space-y-2.5">
            <span className="text-3xl block">⚡</span>
            <h3 className="text-lg font-black text-white">Rated Training</h3>
            <p className="text-[#bababa] text-xs leading-relaxed">
              Solve puzzles matching your current rating. Correct answers raise your rating, while incorrect answers drop it.
            </p>
          </div>
          <button
            data-testid="btn-play-rated"
            onClick={() => handleStartMode('rated')}
            className="chess-btn-green w-full py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
          >
            Start Rated Training <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Streak Challenge Card */}
        <div
          data-testid="puzzle-card-streak"
          className="border border-[#3c3a37] bg-chess-dark p-6 rounded-xl flex flex-col justify-between shadow space-y-4 hover:scale-[1.01] transition-transform duration-150"
        >
          <div className="space-y-2.5">
            <span className="text-3xl block">🔥</span>
            <h3 className="text-lg font-black text-white">Streak Challenge</h3>
            <p className="text-[#bababa] text-xs leading-relaxed">
              How many puzzles can you solve in a row without making a single mistake? The difficulty increases with every success!
            </p>
          </div>
          <button
            data-testid="btn-play-streak"
            onClick={() => handleStartMode('streak')}
            className="chess-btn-green w-full py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
          >
            Start Streak Challenge <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  )
}
