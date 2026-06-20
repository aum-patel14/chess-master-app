import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { useSearchParams, Link } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import { ChessBoard } from '../components/ChessBoard'
import { StockfishEngine, DIFFICULTY_PRESETS } from '../lib/stockfishEngine'
import type { DifficultyLevel } from '../lib/stockfishEngine'
import {
  Clock,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

export function Play() {
  const [searchParams] = useSearchParams()
  const queryFen = searchParams.get('fen')

  // Game state
  const [game, setGame] = useState(() => {
    if (queryFen) {
      try {
        return new Chess(queryFen)
      } catch (e) {
        console.error('Invalid FEN in URL query:', e)
      }
    }
    return new Chess()
  })
  const [position, setPosition] = useState(() => game.fen())
  const [history, setHistory] = useState<string[]>(() => [game.fen()])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [moveList, setMoveList] = useState<string[]>([])
  const [resignStatus, setResignStatus] = useState<boolean>(false)

  // vs-AI engine states
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null)
  const [engine, setEngine] = useState<StockfishEngine | null>(null)
  const [isEngineLoading, setIsEngineLoading] = useState(false)
  const [isEngineThinking, setIsEngineThinking] = useState(false)

  // Hint states
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)
  const [isHintLoading, setIsHintLoading] = useState(false)

  // Initialize and load the engine on-demand
  const handleStartGame = async (level: DifficultyLevel) => {
    setSelectedDifficulty(level)
    setIsEngineLoading(true)

    // Clean up any existing engine
    if (engine) {
      engine.destroy()
    }

    const sf = new StockfishEngine()
    sf.setDifficulty(level)

    try {
      await sf.init()
      setEngine(sf)
    } catch (e) {
      console.error('Failed to load Stockfish engine:', e)
    } finally {
      setIsEngineLoading(false)
    }
  }

  // Handle player moves
  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    try {
      const nextGame = new Chess(game.fen())
      const result = nextGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      })

      if (result) {
        setGame(nextGame)
        const nextFen = nextGame.fen()
        const nextHistory = [...history.slice(0, historyIndex + 1), nextFen]
        setHistory(nextHistory)
        setHistoryIndex(nextHistory.length - 1)
        setPosition(nextFen)
        setLastMove({ from: move.from, to: move.to })
        setMoveList((prev) => [...prev.slice(0, historyIndex), result.san])
        setResignStatus(false)
        setHintMove(null) // Reset hint on move
      }
    } catch (err) {
      console.warn('Move validation failed:', err)
    }
  }

  // Trigger engine moves when it is the bot's turn
  useEffect(() => {
    if (!engine || isEngineLoading || isEngineThinking) return
    if (game.isGameOver() || resignStatus) return

    const isEngineTurn =
      (orientation === 'white' && game.turn() === 'b') ||
      (orientation === 'black' && game.turn() === 'w')

    if (isEngineTurn) {
      let isSubscribed = true

      const timer = setTimeout(() => {
        if (isSubscribed) {
          setIsEngineThinking(true)
        }
      }, 0)

      engine
        .getBestMove(game.fen())
        .then((engineMove) => {
          if (!isSubscribed) return

          try {
            const nextGame = new Chess(game.fen())
            const moveResult = nextGame.move({
              from: engineMove.from,
              to: engineMove.to,
              promotion: engineMove.promotion || 'q',
            })

            if (moveResult) {
              setGame(nextGame)
              const nextFen = nextGame.fen()
              const nextHistory = [...history.slice(0, historyIndex + 1), nextFen]
              setHistory(nextHistory)
              setHistoryIndex(nextHistory.length - 1)
              setPosition(nextFen)
              setLastMove({ from: engineMove.from, to: engineMove.to })
              setMoveList((prev) => [...prev.slice(0, historyIndex), moveResult.san])
              setHintMove(null)
            }
          } catch (e) {
            console.error('Failed to apply engine move:', e)
          } finally {
            setIsEngineThinking(false)
          }
        })
        .catch((err) => {
          if (!isSubscribed) return
          console.error('Stockfish engine error:', err)
          setIsEngineThinking(false)
        })

      return () => {
        isSubscribed = false
        clearTimeout(timer)
      }
    }
  }, [
    game,
    engine,
    isEngineLoading,
    isEngineThinking,
    orientation,
    history,
    historyIndex,
    resignStatus,
  ])

  // Clean up engine worker on component unmount
  useEffect(() => {
    return () => {
      if (engine) {
        engine.destroy()
      }
    }
  }, [engine])

  // Hint action
  const handleRequestHint = async () => {
    if (!engine || isEngineThinking || isEngineLoading || isHintLoading) return

    const isPlayerTurn =
      (orientation === 'white' && game.turn() === 'w') ||
      (orientation === 'black' && game.turn() === 'b')

    if (!isPlayerTurn) return

    setIsHintLoading(true)
    try {
      const result = await engine.getBestMove(game.fen())
      setHintMove({ from: result.from, to: result.to })
    } catch (e) {
      console.error('Failed to get hint:', e)
    } finally {
      setIsHintLoading(false)
    }
  }

  // Navigation handlers
  const handleHistoryFirst = () => {
    setHistoryIndex(0)
    setPosition(history[0])
  }

  const handleHistoryPrev = () => {
    const nextIdx = Math.max(0, historyIndex - 1)
    setHistoryIndex(nextIdx)
    setPosition(history[nextIdx])
  }

  const handleHistoryNext = () => {
    const nextIdx = Math.min(history.length - 1, historyIndex + 1)
    setHistoryIndex(nextIdx)
    setPosition(history[nextIdx])
  }

  const handleHistoryLast = () => {
    const nextIdx = history.length - 1
    setHistoryIndex(nextIdx)
    setPosition(history[nextIdx])
  }

  // Undo move (undos 2 moves so that the turn reverts back to the player, not the bot)
  const handleUndo = () => {
    // We need at least 2 moves played to revert back to player's turn
    const isPlayerTurn =
      (orientation === 'white' && game.turn() === 'w') ||
      (orientation === 'black' && game.turn() === 'b')

    const stepsToUndo = isPlayerTurn ? 2 : 1
    if (history.length <= stepsToUndo) return

    const nextHistory = history.slice(0, -stepsToUndo)
    const targetFen = nextHistory[nextHistory.length - 1]
    const nextGame = new Chess()

    try {
      nextGame.load(targetFen)
      setGame(nextGame)
      setHistory(nextHistory)
      setHistoryIndex(nextHistory.length - 1)
      setPosition(targetFen)
      setMoveList((prev) => prev.slice(0, -stepsToUndo))
      setLastMove(null)
      setHintMove(null)
      setResignStatus(false)
    } catch (e) {
      console.error('Error undoing move:', e)
    }
  }

  // Reset/Restart match
  const handleReset = () => {
    const newGame = new Chess()
    setGame(newGame)
    setPosition(newGame.fen())
    setHistory([newGame.fen()])
    setHistoryIndex(0)
    setLastMove(null)
    setHintMove(null)
    setMoveList([])
    setResignStatus(false)
  }

  const handleResign = () => {
    setResignStatus(true)
  }

  // Return to bot selection
  const handleExitToLobby = () => {
    if (engine) {
      engine.destroy()
      setEngine(null)
    }
    setSelectedDifficulty(null)
    handleReset()
  }

  // Determine game state from chess.js
  const isCheck = game.inCheck()
  const isCheckmate = game.isCheckmate()
  const isStalemate = game.isStalemate()
  const isThreefold = game.isThreefoldRepetition()
  const isInsufficient = game.isInsufficientMaterial()
  const isDraw = game.isDraw() || isStalemate || isThreefold || isInsufficient

  const isBrowsingHistory = historyIndex !== history.length - 1

  let statusText = 'Your turn'
  if (isCheckmate) {
    statusText = `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`
  } else if (resignStatus) {
    statusText = `Game Over. ${orientation === 'white' ? 'Black' : 'White'} wins by resignation.`
  } else if (isStalemate) {
    statusText = 'Game Over. Draw by Stalemate.'
  } else if (isDraw) {
    statusText = 'Game Over. Draw.'
  } else if (isCheck) {
    statusText = 'Check!'
  } else if (isEngineThinking) {
    statusText = 'Engine is thinking...'
  } else if (game.turn() === 'b') {
    statusText = 'Black to move'
  }

  // 1. Render Bot Selection Screen
  if (selectedDifficulty === null) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto py-6">
        <DocumentTitle title="Select AI Opponent" />

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Choose Your Engine Opponent
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Challenge Stockfish, the world's strongest neural network chess engine. Select a level
            matching your playing strength.
          </p>
        </div>

        {/* Play Online Multiplayer Banner */}
        <div className="bg-purple-950/20 border border-purple-500/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-purple-300 font-semibold text-sm">
            🌐 Want to play against real people? Play Online Multiplayer
          </span>
          <Link
            to="/play/online"
            data-testid="link-play-online-banner"
            className="px-4 py-2 bg-purple-650 hover:bg-purple-550 text-white font-bold rounded-lg text-xs transition-all shadow-md"
          >
            Play Online
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-6">
          {(Object.keys(DIFFICULTY_PRESETS) as DifficultyLevel[]).map((level) => {
            const preset = DIFFICULTY_PRESETS[level]
            const colors: Record<DifficultyLevel, string> = {
              beginner:
                'from-blue-600/10 to-blue-600/5 hover:from-blue-600/20 border-blue-500/20 hover:border-blue-500/50 text-blue-400',
              easy: 'from-emerald-600/10 to-emerald-600/5 hover:from-emerald-600/20 border-emerald-500/20 hover:border-emerald-500/50 text-emerald-400',
              medium:
                'from-amber-600/10 to-amber-600/5 hover:from-amber-600/20 border-amber-500/20 hover:border-amber-500/50 text-amber-400',
              hard: 'from-orange-600/10 to-orange-600/5 hover:from-orange-600/20 border-orange-500/20 hover:border-orange-500/50 text-orange-400',
              master:
                'from-red-600/10 to-red-600/5 hover:from-red-600/20 border-red-500/20 hover:border-red-500/50 text-red-400',
            }

            return (
              <button
                key={level}
                data-testid={`bot-select-${level}`}
                onClick={() => handleStartGame(level)}
                className={`border bg-gradient-to-b ${colors[level]} p-6 rounded-xl flex flex-col items-center justify-between text-center transition-all duration-300 hover:scale-[1.03] shadow-lg h-60 cursor-pointer`}
              >
                <div className="space-y-3">
                  <span className="text-2xl">
                    {level === 'beginner' && '👶'}
                    {level === 'easy' && '🤠'}
                    {level === 'medium' && '🧠'}
                    {level === 'hard' && '🔥'}
                    {level === 'master' && '👑'}
                  </span>
                  <h3 className="font-extrabold text-white text-lg tracking-wide capitalize">
                    {level}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {level === 'beginner' &&
                      'Makes casual mistakes, ideal for learning basic rules.'}
                    {level === 'easy' && 'Standard tactical play. Ideal for casual club players.'}
                    {level === 'medium' && 'Advanced strategies. Thinks a few moves ahead.'}
                    {level === 'hard' &&
                      'Formidable tactical calculations. Depth of 14 half-moves.'}
                    {level === 'master' && 'Grandmaster level calculation. Near perfect play.'}
                  </p>
                </div>
                <div className="w-full mt-4 bg-slate-950/60 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
                  Depth: {preset.depth} | Skill: {preset.skillLevel}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 2. Render Engine Loading State
  if (isEngineLoading) {
    return (
      <div
        data-testid="engine-loading-alert"
        className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center"
      >
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-white">Engine loading...</h2>
        <p className="text-slate-405 text-sm">
          Downloading and initializing Stockfish WebAssembly engine. This only happens once.
        </p>
      </div>
    )
  }

  // 3. Render Game Screen
  return (
    <div className="space-y-6">
      <DocumentTitle title={`VS AI (${selectedDifficulty})`} />

      {/* Lobby button */}
      <div className="flex justify-between items-center">
        <button
          data-testid="btn-exit-lobby"
          onClick={handleExitToLobby}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-all"
        >
          ← Change Opponent Bot
        </button>
        <span className="text-xs font-mono text-slate-500">
          Opponent: Stockfish ({selectedDifficulty})
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Chessboard Column */}
        <div className="flex flex-col items-center space-y-4 w-full max-w-[500px]">
          {/* Opponent Panel */}
          <div className="flex items-center justify-between w-full bg-slate-900 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-350 border border-slate-700 font-bold">
                🤖
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm capitalize">
                  Stockfish {selectedDifficulty}
                </h4>
                <p className="text-xs text-slate-400">
                  Depth: {DIFFICULTY_PRESETS[selectedDifficulty].depth}
                </p>
              </div>
            </div>
            {isEngineThinking && (
              <div className="flex items-center space-x-1 bg-purple-950/30 border border-purple-800/35 px-2 py-0.5 rounded text-xs text-purple-400 font-bold animate-pulse">
                Thinking...
              </div>
            )}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-slate-350 font-mono text-sm">
              <Clock className="w-3.5 h-3.5 text-slate-550" />
              <span>09:30</span>
            </div>
          </div>

          {/* Core ChessBoard Component */}
          <ChessBoard
            position={position}
            orientation={orientation}
            onMove={handleMove}
            readOnly={
              isBrowsingHistory || isCheckmate || isDraw || resignStatus || isEngineThinking
            }
            highlightLastMove={lastMove}
            highlightHint={hintMove}
          />

          {/* User Panel */}
          <div className="flex items-center justify-between w-full bg-slate-900 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-purple-650 flex items-center justify-center text-white border border-purple-400 font-bold">
                GM
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">You</h4>
                <p className="text-xs text-slate-400">Rating: 1540</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-slate-300 font-mono text-sm">
              <Clock
                className={`w-3.5 h-3.5 ${game.turn() === 'w' ? 'text-purple-400 animate-pulse' : 'text-slate-550'}`}
              />
              <span
                className={game.turn() === 'w' ? 'text-purple-300 font-bold' : 'text-slate-350'}
              >
                10:00
              </span>
            </div>
          </div>
        </div>

        {/* Info & Side Panel Column */}
        <div className="w-full lg:w-[320px] bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>⚔️</span> Match Status
            </h3>

            {/* Game Alerts */}
            <div className="space-y-2">
              {isCheckmate && (
                <div
                  data-testid="alert-checkmate"
                  className="p-3 bg-red-950/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-semibold"
                >
                  🚨 Checkmate! Game Over.
                </div>
              )}
              {isDraw && (
                <div
                  data-testid="alert-draw"
                  className="p-3 bg-slate-800/50 text-slate-350 border border-slate-700/55 rounded-lg text-sm font-semibold"
                >
                  🤝 Draw! Stalemate or Material Insufficiency.
                </div>
              )}
              {isCheck && !isCheckmate && (
                <div
                  data-testid="alert-check"
                  className="p-3 bg-amber-950/20 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-semibold"
                >
                  ⚠️ Check! King is under attack.
                </div>
              )}
              {resignStatus && (
                <div
                  data-testid="alert-resigned"
                  className="p-3 bg-red-950/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-semibold"
                >
                  🏳️ Game Over by Resignation.
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Opponent Bot:</span>
                <span className="font-semibold text-white capitalize">{selectedDifficulty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Game State:</span>
                <span className="font-bold text-purple-400 uppercase tracking-wide text-xs">
                  {statusText}
                </span>
              </div>
            </div>

            {/* Hint Button */}
            <button
              data-testid="btn-hint"
              onClick={handleRequestHint}
              disabled={
                isBrowsingHistory ||
                isCheckmate ||
                isDraw ||
                resignStatus ||
                isEngineThinking ||
                isHintLoading ||
                (orientation === 'white' && game.turn() === 'b') ||
                (orientation === 'black' && game.turn() === 'w')
              }
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              {isHintLoading ? 'Calculating Suggestion...' : 'Get Engine Hint'}
            </button>

            {/* Navigation history controls */}
            <div className="space-y-2">
              <div className="text-slate-500 text-xs font-mono font-semibold">
                History Navigator
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  data-testid="btn-history-first"
                  onClick={handleHistoryFirst}
                  disabled={history.length <= 1}
                  className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded border border-slate-750 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  data-testid="btn-history-prev"
                  onClick={handleHistoryPrev}
                  disabled={historyIndex === 0}
                  className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded border border-slate-750 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  data-testid="btn-history-next"
                  onClick={handleHistoryNext}
                  disabled={historyIndex === history.length - 1}
                  className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded border border-slate-750 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  data-testid="btn-history-last"
                  onClick={handleHistoryLast}
                  disabled={historyIndex === history.length - 1}
                  className="py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded border border-slate-750 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Move List */}
            <div
              data-testid="moves-history"
              className="bg-slate-950/70 border border-slate-850 rounded-lg p-3 h-24 overflow-y-auto space-y-1 font-mono text-xs"
            >
              <div className="text-slate-500 border-b border-slate-850 pb-1 mb-2 font-bold uppercase tracking-wider text-[10px]">
                Notation Moves
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {moveList
                  .reduce((acc: { white: string; black: string }[], move: string, idx: number) => {
                    if (idx % 2 === 0) {
                      acc.push({ white: move, black: '' })
                    } else {
                      acc[acc.length - 1].black = move
                    }
                    return acc
                  }, [])
                  .map((pair, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-slate-300 text-xs col-span-2"
                    >
                      <span className="text-slate-500 font-bold">{idx + 1}.&nbsp;</span>
                      <span
                        className={idx * 2 === historyIndex - 1 ? 'text-purple-400 font-bold' : ''}
                      >
                        {pair.white}
                      </span>
                      <span
                        className={
                          idx * 2 + 1 === historyIndex - 1 ? 'text-purple-400 font-bold' : ''
                        }
                      >
                        {pair.black || '...'}
                      </span>
                    </div>
                  ))}
              </div>
              {moveList.length === 0 && (
                <div className="text-slate-650 text-center py-4">No moves registered yet</div>
              )}
            </div>
          </div>

          {/* Game Action Controls */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="btn-flip"
                onClick={() => setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
                className="py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-750 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Flip Board
              </button>

              <button
                data-testid="btn-undo"
                onClick={handleUndo}
                disabled={history.length <= 2}
                className="py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-750 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Move
              </button>
            </div>

            <button
              data-testid="btn-resign"
              onClick={handleResign}
              disabled={isCheckmate || isDraw || resignStatus || isEngineThinking}
              className="w-full py-2 border border-red-500/20 bg-red-950/5 hover:bg-red-950/25 text-red-400/80 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Resign Match
            </button>

            <button
              data-testid="btn-new-game"
              onClick={handleReset}
              className="w-full py-2 bg-purple-650 hover:bg-purple-550 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Match
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
