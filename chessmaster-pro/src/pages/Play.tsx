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
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <DocumentTitle title="Select AI Opponent" description="Challenge adaptive Stockfish AI bots ranging from Beginner (1000 Elo) to Master (1800 Elo) on Chessmaster Pro." />

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Choose Your Engine Opponent
          </h1>
          <p className="text-[#bababa] text-sm max-w-xl mx-auto leading-relaxed">
            Challenge Stockfish, the world's strongest neural network chess engine. Select a level matching your playing strength.
          </p>
        </div>

        {/* Play Online Multiplayer Banner */}
        <div className="bg-chess-dark border border-[#3c3a37] p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow">
          <span className="text-[#bababa] font-bold text-sm">
            🌐 Want to play against real people? Play Online Multiplayer
          </span>
          <Link
            to="/play/online"
            data-testid="link-play-online-banner"
            className="chess-btn-green px-5 py-2.5 rounded-lg text-xs transition-all shadow"
          >
            Play Online
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-4">
          {(Object.keys(DIFFICULTY_PRESETS) as DifficultyLevel[]).map((level) => {
            const preset = DIFFICULTY_PRESETS[level]
            const icons: Record<DifficultyLevel, string> = {
              beginner: '👶',
              easy: '🤠',
              medium: '🧠',
              hard: '🔥',
              master: '👑',
            }

            return (
              <button
                key={level}
                data-testid={`bot-select-${level}`}
                onClick={() => handleStartGame(level)}
                className="bg-chess-dark border border-[#3c3a37] hover:border-chess-green p-6 rounded-xl flex flex-col items-center justify-between text-center transition-all duration-150 hover:scale-[1.02] shadow h-64 cursor-pointer"
              >
                <div className="space-y-2.5">
                  <span className="text-3xl block">
                    {icons[level]}
                  </span>
                  <h3 className="font-black text-white text-lg tracking-wide capitalize">
                    {level}
                  </h3>
                  <p className="text-[#bababa] text-xs leading-relaxed">
                    {level === 'beginner' &&
                      'Makes casual mistakes, ideal for learning basic rules.'}
                    {level === 'easy' && 'Standard tactical play. Ideal for casual club players.'}
                    {level === 'medium' && 'Advanced strategies. Thinks a few moves ahead.'}
                    {level === 'hard' &&
                      'Formidable tactical calculations. Depth of 14 half-moves.'}
                    {level === 'master' && 'Grandmaster level calculation. Near perfect play.'}
                  </p>
                </div>
                <div className="w-full mt-4 bg-chess-darker py-1.5 rounded-lg border border-[#3c3a37] text-[10px] font-mono font-bold text-[#bababa]">
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
        <div className="w-12 h-12 border-4 border-chess-green border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-black text-white">Engine loading...</h2>
        <p className="text-[#bababa] text-xs leading-relaxed">
          Downloading and initializing Stockfish WebAssembly engine. This only happens once.
        </p>
      </div>
    )
  }

  // 3. Render Game Screen
  return (
    <div className="space-y-6">
      <DocumentTitle
        title={`VS AI (${selectedDifficulty})`}
        description={`Play an active chess match against the ${selectedDifficulty} Stockfish engine bot on Chessmaster Pro.`}
      />
      <div className="flex justify-between items-center">
        <button
          data-testid="btn-exit-lobby"
          onClick={handleExitToLobby}
          className="text-xs font-bold text-[#bababa] hover:text-white flex items-center gap-1 transition-all"
        >
          ← Change Opponent Bot
        </button>
        <span className="text-xs font-mono font-bold text-[#bababa]">
          Opponent: Stockfish ({selectedDifficulty})
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* Chessboard Column */}
        <div className="flex flex-col items-center space-y-3 w-full max-w-[500px]">
          {/* Opponent Panel */}
          <div className="flex items-center justify-between w-full bg-chess-dark border border-[#3c3a37] p-3 rounded-lg shadow">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-md bg-chess-darker flex items-center justify-center text-white border border-[#3c3a37] font-bold text-lg">
                🤖
              </div>
              <div>
                <h4 className="font-bold text-white text-sm capitalize">
                  Stockfish {selectedDifficulty}
                </h4>
                <p className="text-[10px] font-bold text-[#bababa]">
                  Depth: {DIFFICULTY_PRESETS[selectedDifficulty].depth}
                </p>
              </div>
            </div>
            {isEngineThinking && (
              <div className="flex items-center space-x-1 bg-chess-green/10 border border-chess-green/20 px-2.5 py-0.5 rounded text-[10px] text-chess-green font-bold animate-pulse uppercase tracking-wider">
                Thinking...
              </div>
            )}
            <div className="flex items-center space-x-1.5 bg-chess-darker px-3 py-1.5 rounded border border-[#3c3a37] text-white font-mono font-bold text-sm shadow">
              <Clock className="w-3.5 h-3.5 text-[#bababa]" />
              <span>10:00</span>
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
          <div className="flex items-center justify-between w-full bg-chess-dark border border-[#3c3a37] p-3 rounded-lg shadow">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-md bg-chess-green flex items-center justify-center text-white border-b-2 border-chess-green-dark font-extrabold text-sm">
                GM
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">You</h4>
                <p className="text-[10px] font-bold text-[#bababa]">Rating: 1540</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-chess-darker px-3 py-1.5 rounded border border-[#3c3a37] text-white font-mono font-bold text-sm shadow">
              <Clock
                className={`w-3.5 h-3.5 ${game.turn() === 'w' ? 'text-chess-green animate-pulse' : 'text-[#bababa]'}`}
              />
              <span
                className={game.turn() === 'w' ? 'text-chess-green' : 'text-white'}
              >
                10:00
              </span>
            </div>
          </div>
        </div>

        {/* Info & Side Panel Column */}
        <div className="w-full lg:w-[320px] bg-chess-dark border border-[#3c3a37] rounded-xl p-5 space-y-5 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-[#3c3a37] pb-3">
              <span>⚔️</span> Match Status
            </h3>

            {/* Game Alerts */}
            <div className="space-y-2">
              {isCheckmate && (
                <div
                  data-testid="alert-checkmate"
                  className="p-3 bg-red-950/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold"
                >
                  🚨 Checkmate! Game Over.
                </div>
              )}
              {isDraw && (
                <div
                  data-testid="alert-draw"
                  className="p-3 bg-chess-darker text-[#bababa] border border-[#3c3a37] rounded-lg text-xs font-bold"
                >
                  🤝 Draw! Stalemate or Material Insufficiency.
                </div>
              )}
              {isCheck && !isCheckmate && (
                <div
                  data-testid="alert-check"
                  className="p-3 bg-amber-950/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold animate-pulse"
                >
                  ⚠️ Check! King is under attack.
                </div>
              )}
              {resignStatus && (
                <div
                  data-testid="alert-resigned"
                  className="p-3 bg-red-950/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold"
                >
                  🏳️ Game Over by Resignation.
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-[#bababa]">Opponent Bot:</span>
                <span className="font-bold text-white capitalize">{selectedDifficulty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#bababa]">Game State:</span>
                <span className="font-black text-chess-green tracking-wider text-[11px]">
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
              className="chess-btn-green w-full py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isHintLoading ? 'Calculating Suggestion...' : 'Get Engine Hint'}</span>
            </button>

            {/* Navigation history controls */}
            <div className="space-y-2">
              <div className="text-[#bababa] text-[10px] font-bold uppercase tracking-wider">
                History Navigator
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  data-testid="btn-history-first"
                  onClick={handleHistoryFirst}
                  disabled={history.length <= 1}
                  className="py-1.5 bg-[#3c3a37] hover:bg-[#4b4845] text-white rounded border border-[#2b2927] transition-all flex items-center justify-center disabled:opacity-45"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  data-testid="btn-history-prev"
                  onClick={handleHistoryPrev}
                  disabled={historyIndex === 0}
                  className="py-1.5 bg-[#3c3a37] hover:bg-[#4b4845] text-white rounded border border-[#2b2927] transition-all flex items-center justify-center disabled:opacity-45"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  data-testid="btn-history-next"
                  onClick={handleHistoryNext}
                  disabled={historyIndex === history.length - 1}
                  className="py-1.5 bg-[#3c3a37] hover:bg-[#4b4845] text-white rounded border border-[#2b2927] transition-all flex items-center justify-center disabled:opacity-45"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  data-testid="btn-history-last"
                  onClick={handleHistoryLast}
                  disabled={historyIndex === history.length - 1}
                  className="py-1.5 bg-[#3c3a37] hover:bg-[#4b4845] text-white rounded border border-[#2b2927] transition-all flex items-center justify-center disabled:opacity-45"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Move List */}
            <div
              data-testid="moves-history"
              className="bg-chess-darker border border-[#3c3a37] rounded-lg p-3 h-28 overflow-y-auto space-y-1 font-mono text-[11px]"
            >
              <div className="text-[#bababa] border-b border-[#3c3a37] pb-1 mb-2 font-bold uppercase tracking-wider text-[9px]">
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
                      className="flex justify-between text-slate-350 text-xs col-span-2"
                    >
                      <span className="text-[#bababa]/50 font-bold">{idx + 1}.&nbsp;</span>
                      <span
                        className={idx * 2 === historyIndex - 1 ? 'text-chess-green font-bold' : 'text-slate-300'}
                      >
                        {pair.white}
                      </span>
                      <span
                        className={
                          idx * 2 + 1 === historyIndex - 1 ? 'text-chess-green font-bold' : 'text-[#bababa]'
                        }
                      >
                        {pair.black || '...'}
                      </span>
                    </div>
                  ))}
              </div>
              {moveList.length === 0 && (
                <div className="text-[#bababa]/40 text-center py-4">No moves registered yet</div>
              )}
            </div>
          </div>

          {/* Game Action Controls */}
          <div className="space-y-3 pt-4 border-t border-[#3c3a37]">
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="btn-flip"
                onClick={() => setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
                className="py-2.5 bg-[#3c3a37] hover:bg-[#4b4845] text-white text-xs font-bold rounded-lg border border-[#2b2927] transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Flip Board
              </button>

              <button
                data-testid="btn-undo"
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="py-2.5 bg-[#3c3a37] hover:bg-[#4b4845] text-white text-xs font-bold rounded-lg border border-[#2b2927] transition-all flex items-center justify-center gap-1.5 disabled:opacity-45"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Move
              </button>
            </div>

            <button
              data-testid="btn-resign"
              onClick={handleResign}
              disabled={isCheckmate || isDraw || resignStatus || isEngineThinking}
              className="w-full py-2.5 border border-red-500/20 bg-red-950/10 hover:bg-red-950/20 text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Resign Match
            </button>

            <button
              data-testid="btn-new-game"
              onClick={handleReset}
              className="chess-btn-green w-full py-3 rounded-lg text-xs flex items-center justify-center gap-1.5"
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
