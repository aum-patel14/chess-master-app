import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - VS AI Mode & Stockfish calculations', () => {
  test.describe.configure({ mode: 'serial' })
  const difficulties = ['beginner', 'easy', 'medium', 'hard', 'master']

  for (const level of difficulties) {
    test(`should select ${level} bot, lazy-load engine, receive AI response in bounded time, and check console errors`, async ({
      page,
    }) => {
      test.setTimeout(60000)
      const consoleErrors: string[] = []

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          // Ignore external connection warnings if any, focus on runtime errors
          if (!msg.text().includes('favicon') && !msg.text().includes('chrome-extension')) {
            consoleErrors.push(msg.text())
          }
        }
      })

      page.on('pageerror', (exception) => {
        consoleErrors.push(exception.message)
      })

      await page.goto('/play')

      // Bot selection screen: click difficulty button
      const botBtn = page.getByTestId(`bot-select-${level}`)
      await expect(botBtn).toBeVisible()
      await botBtn.click()

      // Confirm visible engine loading state (or transition to board when completed)
      // Since it loads fast locally, the loading state might be brief, so we wait for the board
      await expect(page.getByTestId('board-square-e2')).toBeVisible({ timeout: 15000 })

      // Initial state: pawn is on e2
      await expect(page.getByTestId('piece-e2-P')).toBeVisible()

      // Play e2 -> e4
      await page.getByTestId('board-square-e2').click()
      await page.getByTestId('board-square-e4').click()
      await expect(page.getByTestId('piece-e4-P')).toBeVisible()

      // Confirm AI responds with a move (the moves history should get updated within 35 seconds)
      const movesHistory = page.getByTestId('moves-history')
      await expect(movesHistory).toContainText('1. e4', { timeout: 35000 })

      // After AI moves, there should be at least two moves in the log (White's e4 and Black's response)
      // Or we can verify the state returns to "Your turn" or "White" turn, and there is a black piece moved
      await expect(page.locator('span:has-text("Your turn")')).toBeVisible({ timeout: 35000 })

      // Verify no console errors occurred during the game start and play
      expect(consoleErrors).toEqual([])
    })
  }

  test('should compute and highlight a suggested move when clicking the hint button', async ({
    page,
  }) => {
    await page.goto('/play')

    // Choose easy bot to start
    await page.getByTestId('bot-select-easy').click()
    await expect(page.getByTestId('board-square-e2')).toBeVisible()

    // Request hint
    const hintBtn = page.getByTestId('btn-hint')
    await expect(hintBtn).toBeEnabled()
    await hintBtn.click()

    // Verify hint highlights are displayed on the board (squares styled with ring-emerald-500)
    // We expect at least one square (from or to) to be highlighted
    const highlightedSquare = page.locator('.ring-emerald-500')
    await expect(highlightedSquare.first()).toBeVisible({ timeout: 8000 })
  })
})
