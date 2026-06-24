import { useState } from 'react'
import type { DragEvent } from 'react'
import { Chess } from 'chess.js'
import type { Square, Move } from 'chess.js'

export interface ChessBoardProps {
  position: string // FEN string
  orientation: 'white' | 'black'
  onMove?: (move: { from: string; to: string; promotion?: string }) => void
  readOnly?: boolean
  legalMoves?: string[] // Optional pre-filtered legal moves
  highlightLastMove?: { from: string; to: string } | null
  highlightHint?: { from: string; to: string } | null
}


export function ChessBoard({
  position,
  orientation,
  onMove,
  readOnly = false,
  legalMoves,
  highlightLastMove,
  highlightHint,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(
    null
  )

  // Initialize a chess.js instance to compute legal moves locally
  let chess: Chess
  try {
    chess = new Chess(position)
  } catch (e) {
    // Fallback if FEN is temporarily invalid during history transitions
    console.error('Invalid FEN passed to ChessBoard:', e)
    chess = new Chess()
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

  // Adjust board files and ranks based on orientation
  const boardFiles = orientation === 'white' ? files : [...files].reverse()
  const boardRanks = orientation === 'white' ? ranks : [...ranks].reverse()

  // Parse piece positions from FEN
  const boardMatrix: (string | null)[][] = []
  const rows = position.split(' ')[0].split('/')
  for (const row of rows) {
    const boardRow: (string | null)[] = []
    for (const char of row) {
      if (isNaN(Number(char))) {
        boardRow.push(char)
      } else {
        const emptySquares = Number(char)
        for (let i = 0; i < emptySquares; i++) {
          boardRow.push(null)
        }
      }
    }
    boardMatrix.push(boardRow)
  }

  // Helper to find a piece at algebraic coordinate (e.g. 'e4')
  const getPieceAt = (square: string): string | null => {
    const fileIdx = files.indexOf(square[0])
    const rankIdx = 8 - Number(square[1])
    if (fileIdx === -1 || rankIdx === -1 || rankIdx >= 8 || fileIdx >= 8) return null
    return boardMatrix[rankIdx][fileIdx]
  }

  // Get all legal target squares for the currently selected square
  const getLegalTargets = (square: string): string[] => {
    if (readOnly) return []
    if (legalMoves) {
      // If external legalMoves are provided, filter them
      return legalMoves
        .filter((m) => m.startsWith(square))
        .map((m) =>
          m
            .replace(square, '')
            .replace(/[+#=]?/g, '')
            .slice(-2)
        )
    }

    try {
      const moves = chess.moves({ square: square as Square, verbose: true }) as Move[]
      return moves.map((m) => m.to)
    } catch {
      return []
    }
  }

  const activeLegalTargets = selectedSquare ? getLegalTargets(selectedSquare) : []

  // Check if a move represents a pawn promotion
  const checkIsPromotion = (from: string, to: string): boolean => {
    try {
      const moves = chess.moves({ square: from as Square, verbose: true }) as Move[]
      const move = moves.find((m) => m.to === to)
      return !!(move && move.flags && move.flags.includes('p'))
    } catch {
      return false
    }
  }

  // Execute a chess move
  const executeMove = (from: string, to: string, promotion?: string) => {
    if (readOnly || !onMove) return
    onMove({ from, to, promotion })
    setSelectedSquare(null)
  }

  const handleSquareClick = (square: string) => {
    if (readOnly) return
    if (promotionPending) return

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
      } else if (activeLegalTargets.includes(square)) {
        if (checkIsPromotion(selectedSquare, square)) {
          setPromotionPending({ from: selectedSquare, to: square })
        } else {
          executeMove(selectedSquare, square)
        }
      } else {
        // Switch selection if user clicked another of their own pieces
        const piece = getPieceAt(square)
        const isWhitePiece = piece && piece === piece.toUpperCase()
        const isBlackPiece = piece && piece === piece.toLowerCase()
        const isTurnWhite = chess.turn() === 'w'

        if ((isTurnWhite && isWhitePiece) || (!isTurnWhite && isBlackPiece)) {
          setSelectedSquare(square)
        } else {
          setSelectedSquare(null)
        }
      }
    } else {
      const piece = getPieceAt(square)
      if (!piece) return

      // Validate turn
      const isWhitePiece = piece === piece.toUpperCase()
      const isBlackPiece = piece === piece.toLowerCase()
      const isTurnWhite = chess.turn() === 'w'

      if ((isTurnWhite && isWhitePiece) || (!isTurnWhite && isBlackPiece)) {
        setSelectedSquare(square)
      }
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, square: string) => {
    if (readOnly) {
      e.preventDefault()
      return
    }
    if (promotionPending) {
      e.preventDefault()
      return
    }

    const piece = getPieceAt(square)
    if (!piece) {
      e.preventDefault()
      return
    }

    // Validate turn
    const isWhitePiece = piece === piece.toUpperCase()
    const isBlackPiece = piece === piece.toLowerCase()
    const isTurnWhite = chess.turn() === 'w'

    if ((isTurnWhite && isWhitePiece) || (!isTurnWhite && isBlackPiece)) {
      setSelectedSquare(square)
      e.dataTransfer.setData('text/plain', square)
      e.dataTransfer.effectAllowed = 'move'
    } else {
      e.preventDefault()
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetSquare: string) => {
    e.preventDefault()
    const fromSquare = e.dataTransfer.getData('text/plain')

    if (fromSquare && fromSquare !== targetSquare) {
      const legalTargets = getLegalTargets(fromSquare)
      if (legalTargets.includes(targetSquare)) {
        if (checkIsPromotion(fromSquare, targetSquare)) {
          setPromotionPending({ from: fromSquare, to: targetSquare })
        } else {
          executeMove(fromSquare, targetSquare)
        }
      }
    }
    // Clear selection if we dropped somewhere else
    if (!promotionPending) {
      setSelectedSquare(null)
    }
  }

  const handleSelectPromotion = (pieceCode: string) => {
    if (promotionPending) {
      executeMove(promotionPending.from, promotionPending.to, pieceCode)
      setPromotionPending(null)
    }
  }

  const handleCancelPromotion = () => {
    setPromotionPending(null)
    setSelectedSquare(null)
  }

  return (
    <div className="relative w-full aspect-square bg-[#211f1d] rounded-lg overflow-hidden border-2 border-[#2b2927] shadow-2xl select-none">
      {/* Chess Grid */}
      <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
        {boardRanks.map((rank, rIdx) =>
          boardFiles.map((file, fIdx) => {
            const square = `${file}${rank}`
            const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1
            const piece = getPieceAt(square)
            const isSelected = selectedSquare === square
            const isHighlightedTarget = activeLegalTargets.includes(square)
            const isLastSrc = highlightLastMove?.from === square
            const isLastDst = highlightLastMove?.to === square
            const isHintSrc = highlightHint?.from === square
            const isHintDst = highlightHint?.to === square

            return (
              <div
                key={square}
                data-square={square}
                data-testid={`board-square-${square}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                onClick={() => handleSquareClick(square)}
                className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  isDark ? 'bg-board-dark' : 'bg-board-light'
                } ${isSelected ? 'ring-4 ring-purple-500 ring-inset bg-purple-500/20' : ''} ${
                  isLastSrc || isLastDst ? 'bg-[#f7f785]/35' : ''
                } ${
                  isHintSrc || isHintDst
                    ? 'ring-4 ring-emerald-500 ring-inset bg-emerald-500/10'
                    : ''
                }`}
              >
                {/* Board Rank Coordinates (only on file 'a' or reversed 'h') */}
                {fIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] font-bold ${
                      isDark ? 'text-[#eeeed2]/50' : 'text-[#769656]/60'
                    }`}
                  >
                    {rank}
                  </span>
                )}

                {/* Board File Coordinates (only on rank '1' or reversed '8') */}
                {rIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${
                      isDark ? 'text-[#eeeed2]/50' : 'text-[#769656]/60'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Move Indicator Overlays */}
                {isHighlightedTarget && (
                  <div
                    data-testid={`legal-indicator-${square}`}
                    className={`absolute rounded-full pointer-events-none z-10 ${
                      piece
                        ? 'w-10 h-10 border-4 border-black/15 bg-transparent'
                        : 'w-4 h-4 bg-black/15'
                    }`}
                  />
                )}

                {/* Render Chess Piece SVG */}
                {piece && (
                  <img
                    src={`${import.meta.env.BASE_URL}pieces/cburnett/${piece === piece.toUpperCase() ? 'w' : 'b'}${piece.toUpperCase()}.svg`}
                    alt={piece}
                    draggable={!readOnly}
                    onDragStart={(e) => handleDragStart(e, square)}
                    data-testid={`piece-${square}-${piece}`}
                    className="w-[85%] h-[85%] object-contain select-none transform hover:scale-105 active:scale-95 transition-transform z-20"
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pawn Promotion Selection Modal Overlay */}
      {promotionPending && (
        <div
          data-testid="promotion-modal"
          className="absolute inset-0 bg-[#211f1d]/85 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
        >
          <div className="bg-[#262421] border border-[#3c3a37] rounded-xl p-6 shadow-2xl max-w-xs w-full text-center space-y-4">
            <h4 className="text-white font-bold text-lg">Pawn Promotion</h4>
            <p className="text-[#bababa] text-xs">Choose the piece to promote your pawn into:</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { code: 'q', label: 'Queen', symWhite: 'wQ.svg', symBlack: 'bQ.svg' },
                { code: 'r', label: 'Rook', symWhite: 'wR.svg', symBlack: 'bR.svg' },
                { code: 'b', label: 'Bishop', symWhite: 'wB.svg', symBlack: 'bB.svg' },
                { code: 'n', label: 'Knight', symWhite: 'wN.svg', symBlack: 'bN.svg' },
              ].map((opt) => {
                const turn = chess.turn()
                const imgName = turn === 'w' ? opt.symWhite : opt.symBlack
                return (
                  <button
                    key={opt.code}
                    data-testid={`promotion-choice-${opt.code}`}
                    onClick={() => handleSelectPromotion(opt.code)}
                    className="p-2 bg-[#3c3a37] hover:bg-[#81b64c] rounded-lg border border-[#2b2927] hover:border-[#81b64c] flex items-center justify-center transition-all shadow"
                    title={opt.label}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}pieces/cburnett/${imgName}`}
                      alt={opt.label}
                      className="w-12 h-12 object-contain"
                    />
                  </button>
                )
              })}
            </div>
            <button
              data-testid="btn-promotion-cancel"
              onClick={handleCancelPromotion}
              className="w-full py-2 bg-[#3c3a37] hover:bg-[#4b4845] text-[#bababa] hover:text-white text-xs font-semibold rounded-lg transition-all"
            >
              Cancel Move
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
