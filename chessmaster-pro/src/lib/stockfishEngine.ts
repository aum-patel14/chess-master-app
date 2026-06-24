export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'master'

export interface DifficultyPreset {
  depth: number
  skillLevel: number
  moveTime: number
  label: string
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyPreset> = {
  beginner: { depth: 1, skillLevel: 0, moveTime: 100, label: 'Beginner' },
  easy: { depth: 2, skillLevel: 5, moveTime: 150, label: 'Easy' },
  medium: { depth: 3, skillLevel: 10, moveTime: 200, label: 'Medium' },
  hard: { depth: 4, skillLevel: 15, moveTime: 300, label: 'Hard' },
  master: { depth: 5, skillLevel: 20, moveTime: 400, label: 'Master' },
}

export interface BestMoveResult {
  move: string
  from: string
  to: string
  promotion?: string
}

export interface EvalResult {
  score: number
  mate: number | null
  depth: number
}

export class StockfishEngine {
  private worker: Worker | null = null
  private isReady = false
  private currentDifficulty: DifficultyPreset = DIFFICULTY_PRESETS.medium
  private pendingMove: {
    resolve: (res: BestMoveResult) => void
    reject: (err: Error) => void
  } | null = null
  private pendingEval: {
    resolve: (res: EvalResult) => void
    reject: (err: Error) => void
    bestScore: number
    bestDepth: number
    mate: number | null
  } | null = null
  private readyResolver: (() => void) | null = null

  constructor() {}

  async init(): Promise<StockfishEngine> {
    return new Promise((resolve, reject) => {
      try {
        // Construct the web worker pointing to public/stockfish.js
        this.worker = new Worker('/stockfish.js')
      } catch (err) {
        reject(
          new Error(
            'Failed to load Stockfish worker: ' + (err instanceof Error ? err.message : String(err))
          )
        )
        return
      }

      this.worker.onmessage = (event) => this.handleMessage(event.data)
      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err)
        reject(err)
      }

      this.waitForReady().then(() => {
        this.isReady = true
        this.send('uci')
        this.send('setoption name Threads value 1')
        this.send('setoption name Hash value 32')
        this.applyDifficultyOptions()
        resolve(this)
      })

      this.send('isready')
    })
  }

  setDifficulty(level: DifficultyLevel) {
    const preset = DIFFICULTY_PRESETS[level]
    if (!preset) throw new Error(`Unknown difficulty: ${level}`)
    this.currentDifficulty = preset
    if (this.isReady) this.applyDifficultyOptions()
  }

  getDifficultyLabel(): string {
    return this.currentDifficulty.label
  }

  async getBestMove(fen: string, moves: string[] = []): Promise<BestMoveResult> {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.')

    return new Promise((resolve, reject) => {
      this.pendingMove = { resolve, reject }

      const posCmd =
        moves.length > 0 ? `position fen ${fen} moves ${moves.join(' ')}` : `position fen ${fen}`
      this.send(posCmd)

      const { depth, moveTime } = this.currentDifficulty
      this.send(`go depth ${depth} movetime ${moveTime}`)

      // Add a fallback timeout handler
      setTimeout(
        () => {
          if (this.pendingMove) {
            this.pendingMove.reject(new Error('Engine timeout waiting for bestmove'))
            this.pendingMove = null
          }
        },
        moveTime * 5 + 20000
      )
    })
  }

  async evaluate(fen: string): Promise<EvalResult> {
    if (!this.isReady) throw new Error('Engine not initialized. Call init() first.')

    return new Promise((resolve, reject) => {
      this.pendingEval = { resolve, reject, bestScore: 0, bestDepth: 0, mate: null }

      this.send(`position fen ${fen}`)
      this.send('go depth 12 movetime 300')
    })
  }

  stop() {
    this.send('stop')
  }

  newGame() {
    this.send('ucinewgame')
  }

  destroy() {
    if (this.worker) {
      this.send('quit')
      this.worker.terminate()
      this.worker = null
      this.isReady = false
    }
  }

  private send(cmd: string) {
    if (this.worker) {
      this.worker.postMessage(cmd)
    }
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      this.readyResolver = resolve
    })
  }

  private applyDifficultyOptions() {
    const { skillLevel } = this.currentDifficulty
    this.send(`setoption name Skill Level value ${skillLevel}`)
    if (skillLevel < 10) {
      const errorProb = Math.round((10 - skillLevel) * 50)
      this.send(`setoption name Move Overhead value ${errorProb}`)
    }
  }

  private handleMessage(message: string) {
    if (message === 'readyok') {
      if (this.readyResolver) {
        this.readyResolver()
        this.readyResolver = null
      }
      return
    }

    if (message.startsWith('bestmove')) {
      const parts = message.split(' ')
      const uciMove = parts[1]

      if (uciMove && uciMove !== '(none)' && this.pendingMove) {
        const parsed = this.parseUCIMove(uciMove)
        this.pendingMove.resolve(parsed)
        this.pendingMove = null
      }

      if (this.pendingEval) {
        this.pendingEval.resolve({
          score: this.pendingEval.bestScore,
          mate: this.pendingEval.mate,
          depth: this.pendingEval.bestDepth,
        })
        this.pendingEval = null
      }
      return
    }

    if (message.startsWith('info') && message.includes('score') && this.pendingEval) {
      const depthMatch = message.match(/depth (\d+)/)
      const cpMatch = message.match(/score cp (-?\d+)/)
      const mateMatch = message.match(/score mate (-?\d+)/)

      if (depthMatch) this.pendingEval.bestDepth = parseInt(depthMatch[1])
      if (cpMatch) this.pendingEval.bestScore = parseInt(cpMatch[1])
      if (mateMatch) this.pendingEval.mate = parseInt(mateMatch[1])
    }
  }

  private parseUCIMove(uciMove: string): BestMoveResult {
    return {
      move: uciMove,
      from: uciMove.slice(0, 2),
      to: uciMove.slice(2, 4),
      promotion: uciMove.length === 5 ? uciMove[4] : undefined,
    }
  }
}
