import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import PageShell from '../components/PageShell'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from '../hooks/useToast'
import { Bookmark } from 'lucide-react'
import { readStats, writeStats } from '../utils/chessStats'
import { checkAndUnlockAchievements } from '../utils/achievements'

const FILES = 'abcdefgh'.split('')
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

const PUZZLES = [
  {
    id: 'p-m1',
    fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
    solution: ['Qg7'],
    difficulty: 'Easy',
    category: 'Checkmate',
  },
  {
    id: 'p-t1',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    solution: ['Bxf7+'],
    difficulty: 'Medium',
    category: 'Tactics',
  },
  {
    id: 'p-e1',
    fen: '8/8/8/8/8/3K4/4P3/5k2 w - - 0 1',
    solution: ['e4'],
    difficulty: 'Easy',
    category: 'Endgame',
  },
  {
    id: 'p-o1',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    solution: ['e5'],
    difficulty: 'Easy',
    category: 'Opening',
  },
]

function MiniBoard({ chess, selected, legal, onSquare, highlights }) {
  const board = chess.board()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: '100%',
        maxWidth: 400,
        margin: '0 auto',
        aspectRatio: '1',
        border: '2px solid rgba(212,175,55,0.35)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {RANKS.map((rank) =>
        FILES.map((file) => {
          const sq = `${file}${rank}`
          const cell = board[8 - parseInt(rank, 10)][file.charCodeAt(0) - 97]
          const dark = (file.charCodeAt(0) - 97 + parseInt(rank, 10)) % 2 === 0
          const isSel = selected === sq
          const isLeg = legal.includes(sq)
          const ring = highlights?.piece === sq
          const hFrom = highlights?.from === sq
          const hTo = highlights?.to === sq
          
          let pieceImg = null;
          if (cell) {
            const key = `${cell.color}${cell.type.toUpperCase()}`;
            pieceImg = <img src={`${import.meta.env.BASE_URL}pieces/cburnett/${key}.svg`} style={{ width: '85%', height: '85%', pointerEvents: 'none' }} alt={key} />
          }

          return (
            <button
              type="button"
              key={sq}
              onClick={() => onSquare(sq)}
              style={{
                aspectRatio: '1',
                border: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: dark ? '#b58863' : '#f0d9b5',
                boxShadow: isSel
                  ? 'inset 0 0 0 3px #d4af37'
                  : ring
                    ? 'inset 0 0 0 3px #d4af37'
                    : hFrom
                      ? 'inset 0 0 0 3px rgba(59,130,246,0.95)'
                      : hTo
                        ? 'inset 0 0 0 3px rgba(147,197,253,0.95)'
                        : 'none',
                outline: isLeg ? '2px dashed rgba(34,197,94,0.7)' : 'none',
              }}
            >
              {pieceImg}
            </button>
          )
        })
      )}
    </div>
  )
}

export default function PuzzlePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [bookmarked, setBookmarked] = useLocalStorage('chess_bookmarks', [])
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [puzzleIndex, setPuzzleIndex] = useState(0)

  const filtered = useMemo(() => {
    return PUZZLES.filter((p) => {
      const d = difficultyFilter === 'All' || p.difficulty === difficultyFilter
      const c = categoryFilter === 'All' || p.category === categoryFilter
      return d && c
    })
  }, [difficultyFilter, categoryFilter])

  const currentPuzzle = filtered[Math.min(puzzleIndex, Math.max(0, filtered.length - 1))] || PUZZLES[0]
  const [chess, setChess] = useState(() => new Chess(currentPuzzle.fen))
  const [moveIdx, setMoveIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [highlights, setHighlights] = useState(null)
  const [puzzleRatings, setPuzzleRatings] = useLocalStorage('chess_puzzle_ratings_by_id', {})
  const userRating = puzzleRatings[currentPuzzle.id] || 0
  const setUserRating = (v) => {
    setPuzzleRatings({ ...puzzleRatings, [currentPuzzle.id]: v })
  }

  useEffect(() => {
    const c = new Chess(currentPuzzle.fen)
    setChess(c)
    setMoveIdx(0)
    setSelected(null)
    setHintsUsed(0)
    setHighlights(null)
  }, [currentPuzzle])

  const solutionMoves = currentPuzzle.solution

  const legalFor = useCallback(
    (sq) => {
      const c = new Chess(chess.fen())
      const moves = c.moves({ square: sq, verbose: true })
      return moves.map((m) => m.to)
    },
    [chess]
  )

  const [legal, setLegal] = useState([])

  const onSquare = (sq) => {
    const piece = chess.get(sq)
    if (selected) {
      const moves = chess.moves({ square: selected, verbose: true })
      const hit = moves.find((m) => m.to === sq)
      if (hit) {
        const c = new Chess(chess.fen())
        const mv = c.move({ from: selected, to: sq, promotion: hit.promotion })
        if (mv) {
          setChess(new Chess(c.fen()))
          setSelected(null)
          setLegal([])
          const expected = solutionMoves[moveIdx]
          if (mv.san.replace(/\+|#/g, '') === expected.replace(/\+|#/g, '')) {
            const next = moveIdx + 1
            setMoveIdx(next)
            if (next >= solutionMoves.length) {
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
              showToast('Puzzle solved! ✓', 'success')
              const solved = JSON.parse(localStorage.getItem('chess_puzzles_solved') || '[]')
              if (!solved.includes(currentPuzzle.id)) {
                localStorage.setItem('chess_puzzles_solved', JSON.stringify([...solved, currentPuzzle.id]))
                const st = readStats()
                st.puzzlesSolved = (st.puzzlesSolved || 0) + 1
                writeStats(st)
                checkAndUnlockAchievements('puzzle_solved', { noHints: hintsUsed === 0 })
              }
              localStorage.setItem('chess_last_puzzle_date', new Date().toDateString())
              setTimeout(() => {
                setPuzzleIndex((i) => Math.min(i + 1, filtered.length - 1))
              }, 1500)
            }
          } else {
            showToast('Try again', 'warning')
            const c2 = new Chess(currentPuzzle.fen)
            setChess(c2)
            setMoveIdx(0)
          }
        }
      } else {
        setSelected(null)
        setLegal([])
      }
    } else if (piece && piece.color === chess.turn()) {
      setSelected(sq)
      setLegal(legalFor(sq))
    }
  }

  const showHint = () => {
    if (hintsUsed >= 3) return
    const next = hintsUsed + 1
    setHintsUsed(next)
    const c = new Chess(chess.fen())
    const mv = solutionMoves[moveIdx]
    const moves = c.moves({ verbose: true })
    const target = moves.find((m) => m.san.replace(/\+|#/g, '') === mv.replace(/\+|#/g, ''))
    if (next === 1 && target) {
      setHighlights({ piece: target.from })
      showToast('Hint: piece to move', 'info')
    } else if (next === 2 && target) {
      setHighlights({ from: target.from, to: target.to })
      showToast('Hint: from & to', 'info')
    } else if (next >= 3) {
      let line = new Chess(currentPuzzle.fen)
      solutionMoves.forEach((san) => {
        const m = line.moves({ verbose: true }).find((x) => x.san.replace(/\+|#/g, '') === san.replace(/\+|#/g, ''))
        if (m) line.move(m)
      })
      setChess(line)
      setMoveIdx(solutionMoves.length)
      showToast('Solution revealed', 'warning')
    }
  }

  const persistRating = (rating) => {
    const all = JSON.parse(localStorage.getItem('chess_all_ratings') || '{}')
    all[currentPuzzle.id] = rating
    localStorage.setItem('chess_all_ratings', JSON.stringify(all))
  }

  const avgRating = useMemo(() => {
    const all = JSON.parse(localStorage.getItem('chess_all_ratings') || '{}')
    const vals = Object.values(all).filter((n) => n > 0)
    if (!vals.length) return null
    const sum = vals.reduce((a, b) => a + b, 0)
    return (sum / vals.length).toFixed(1)
  }, [userRating, currentPuzzle.id])

  const isBookmarked = bookmarked.includes(currentPuzzle.id)

  const counts = (d) => (d === 'All' ? PUZZLES.length : PUZZLES.filter((p) => p.difficulty === d).length)

  return (
    <PageShell>
      <div style={{ background: '#0a0a14', color: '#e8e8e8', minHeight: '100vh', padding: '16px 14px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ minHeight: 44, marginBottom: 12, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(212,175,55,0.35)', background: 'transparent', color: '#d4af37', cursor: 'pointer', fontWeight: 600 }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {['All', 'Easy', 'Medium', 'Hard', 'Expert'].map((d) => (
            <button key={d} type="button" onClick={() => { setDifficultyFilter(d); setPuzzleIndex(0) }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: difficultyFilter === d ? '#d4af37' : 'rgba(255,255,255,0.06)', color: difficultyFilter === d ? '#0a0a14' : '#aaa' }}>
              {d} ({counts(d)})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, position: 'relative', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: 8 }}>
          {['All', 'Tactics', 'Endgame', 'Checkmate', 'Opening'].map((c) => (
            <button key={c} type="button" onClick={() => { setCategoryFilter(c); setPuzzleIndex(0) }} style={{ flex: 1, minHeight: 44, border: 'none', background: 'transparent', color: categoryFilter === c ? '#d4af37' : '#888', fontWeight: 700, cursor: 'pointer', borderBottom: categoryFilter === c ? '3px solid #d4af37' : '3px solid transparent' }}>
              {c}
            </button>
          ))}
        </div>

        <p style={{ marginBottom: 12, opacity: 0.9 }}>
          Puzzle {filtered.findIndex((p) => p.id === currentPuzzle.id) + 1} of {filtered.length}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <MiniBoard chess={chess} selected={selected} legal={legal} onSquare={onSquare} highlights={highlights} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  type="button"
                  key={i}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => {
                    setUserRating(i)
                    persistRating(i)
                    showToast('Thanks for rating! ⭐', 'success')
                  }}
                  style={{
                    fontSize: 22,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: i <= (hoverRating || userRating) ? '#d4af37' : '#444',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
              {avgRating ? `${avgRating} ★ (${Object.keys(JSON.parse(localStorage.getItem('chess_all_ratings') || '{}')).length} ratings)` : 'Be the first to rate!'}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button type="button" onClick={showHint} disabled={hintsUsed >= 3} style={{ flex: 1, minHeight: 44, borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {hintsUsed === 0 ? 'Show Hint' : hintsUsed === 1 ? 'Hint 1/3 — More' : hintsUsed === 2 ? 'Hint 2/3 — Solution' : 'Solution Shown'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const skipped = JSON.parse(localStorage.getItem('chess_puzzles_skipped') || '[]')
                  localStorage.setItem('chess_puzzles_skipped', JSON.stringify([...skipped, currentPuzzle.id]))
                  setPuzzleIndex((i) => Math.min(i + 1, filtered.length - 1))
                  showToast('Puzzle skipped', 'info')
                }}
                style={{ flex: 1, minHeight: 44, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e8e8e8', cursor: 'pointer' }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  setChess(new Chess(currentPuzzle.fen))
                  setMoveIdx(0)
                  setHintsUsed(0)
                  setHighlights(null)
                  showToast('Puzzle reset — try again!', 'info')
                }}
                style={{ flex: 1, minHeight: 44, borderRadius: 8, border: '1px solid rgba(212,175,55,0.35)', background: 'transparent', color: '#d4af37', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={puzzleIndex <= 0} onClick={() => setPuzzleIndex((i) => Math.max(0, i - 1))} style={{ flex: 1, minHeight: 44, borderRadius: 8, border: 'none', background: '#333', color: '#fff', cursor: 'pointer' }}>
                Previous
              </button>
              <button
                type="button"
                disabled={puzzleIndex >= filtered.length - 1}
                onClick={() => {
                  if (puzzleIndex >= filtered.length - 1) {
                    showToast('You completed all puzzles! 🎉', 'success')
                    return
                  }
                  setPuzzleIndex((i) => i + 1)
                }}
                style={{ flex: 1, minHeight: 44, borderRadius: 8, border: 'none', background: '#d4af37', color: '#0a0a14', fontWeight: 800, cursor: 'pointer' }}
              >
                {puzzleIndex >= filtered.length - 1 ? 'Last Puzzle' : 'Next'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isBookmarked) {
                  setBookmarked(bookmarked.filter((id) => id !== currentPuzzle.id))
                  showToast('Bookmark removed', 'info')
                } else {
                  setBookmarked([...bookmarked, currentPuzzle.id])
                  showToast('Puzzle bookmarked ✓', 'success')
                }
              }}
              style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, border: 'none', background: 'transparent', cursor: 'pointer', color: isBookmarked ? '#d4af37' : '#666', fontWeight: 700 }}
            >
              <Bookmark size={22} fill={isBookmarked ? '#d4af37' : 'none'} />
              Bookmark
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
