import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Core Chess Board & Logic Rules', () => {
  test('should accept a legal move and update board state', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('bot-select-easy').click()

    // Initial state: e2 contains a pawn (P) and e4 is empty
    await expect(page.getByTestId('piece-e2-P')).toBeVisible()
    await expect(page.getByTestId('piece-e4-P')).not.toBeVisible()

    // Move e2 -> e4
    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e4').click()

    // Verify state updates: e4 now has the pawn, e2 is empty
    await expect(page.getByTestId('piece-e4-P')).toBeVisible()
    await expect(page.getByTestId('piece-e2-P')).not.toBeVisible()

    // Verify move is listed in move history
    await expect(page.getByTestId('moves-history')).toContainText('e4')
  })

  test('should reject an illegal move', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('bot-select-easy').click()

    // Initial state: e2 contains a pawn (P) and e5 is empty
    await expect(page.getByTestId('piece-e2-P')).toBeVisible()
    await expect(page.getByTestId('piece-e5-P')).not.toBeVisible()

    // Attempt illegal move: e2 -> e5
    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e5').click()

    // Verify move was rejected: pawn is still on e2, e5 is empty
    await expect(page.getByTestId('piece-e2-P')).toBeVisible()
    await expect(page.getByTestId('piece-e5-P')).not.toBeVisible()
  })

  test('should allow undoing a move', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('bot-select-easy').click()

    // Move e2 -> e4
    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e4').click()
    await expect(page.getByTestId('piece-e4-P')).toBeVisible()

    // Click Undo
    await page.getByTestId('btn-undo').click()

    // Verify board reverted: e2 contains pawn, e4 is empty
    await expect(page.getByTestId('piece-e2-P')).toBeVisible()
    await expect(page.getByTestId('piece-e4-P')).not.toBeVisible()
  })

  test('should flip the board orientation', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('bot-select-easy').click()

    // Standard white orientation: top-left square is a8
    await expect(page.locator('[data-square]').first()).toHaveAttribute('data-square', 'a8')

    // Click Flip Board
    await page.getByTestId('btn-flip').click()

    // Flipped black orientation: top-left square is h1
    await expect(page.locator('[data-square]').first()).toHaveAttribute('data-square', 'h1')
  })

  test('should support pawn promotion flow', async ({ page }) => {
    // FEN: White pawn on h7, black king on a8. Moving h7 -> h8 triggers promotion.
    const promotionFen = 'k7/7P/8/8/8/8/8/K7 w - - 0 1'
    await page.goto(`/play?fen=${encodeURIComponent(promotionFen)}`)
    await page.getByTestId('bot-select-easy').click()

    // Verify white pawn is on h7
    await expect(page.getByTestId('piece-h7-P')).toBeVisible()

    // Move h7 -> h8
    await page.getByTestId('board-square-h7').click()
    await page.getByTestId('board-square-h8').click()

    // Verify promotion modal appears
    await expect(page.getByTestId('promotion-modal')).toBeVisible()

    // Select Queen promotion
    await page.getByTestId('promotion-choice-q').click()

    // Verify promotion completes: h8 contains a White Queen (Q)
    await expect(page.getByTestId('piece-h8-Q')).toBeVisible()
    await expect(page.getByTestId('promotion-modal')).not.toBeVisible()
  })

  test('should detect checkmate and disable further moves', async ({ page }) => {
    // FEN: Scholar's mate setup. White queen on f3, ready to mate on f7.
    const scholarsMateFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
    await page.goto(`/play?fen=${encodeURIComponent(scholarsMateFen)}`)
    await page.getByTestId('bot-select-easy').click()

    // Verify Queen is on f3
    await expect(page.getByTestId('piece-f3-Q')).toBeVisible()

    // Move Queen f3 -> f7 (Checkmate!)
    await page.getByTestId('board-square-f3').click()
    await page.getByTestId('board-square-f7').click()

    // Verify checkmate alert is displayed
    await expect(page.getByTestId('alert-checkmate')).toBeVisible()
    await expect(page.getByTestId('alert-checkmate')).toContainText('Checkmate')

    // Verify game is locked: clicking on f7 (Queen) does not select it
    await page.getByTestId('board-square-f7').click()
    await expect(page.getByTestId('board-square-f7')).not.toHaveClass(/ring-/)
  })
})
