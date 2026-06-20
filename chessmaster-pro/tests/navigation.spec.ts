import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Core Navigation & Interactive Elements', () => {
  test('should navigate to all core routes and verify document titles', async ({ page }) => {
    // 1. Start at Dashboard
    await page.goto('/')
    await expect(page).toHaveTitle('Dashboard | Chessmaster Pro')
    await expect(page.getByTestId('logo-link')).toBeVisible()

    // Verify stats cards exist
    await expect(page.getByTestId('stat-card-rapid-rating')).toBeVisible()
    await expect(page.getByTestId('stat-card-puzzles-solved')).toBeVisible()

    // 2. Navigate to Play Chess
    await page.getByTestId('nav-play').click()
    await page.waitForURL('**/play')
    await expect(page).toHaveTitle('Select AI Opponent | Chessmaster Pro')
    await page.getByTestId('bot-select-easy').click()
    await expect(page).toHaveTitle('VS AI (easy) | Chessmaster Pro')

    // Verify some board squares are present
    await expect(page.getByTestId('board-square-e2')).toBeVisible()
    await expect(page.getByTestId('board-square-e4')).toBeVisible()
    await expect(page.getByTestId('btn-resign')).toBeVisible()

    // 3. Navigate to Puzzles
    await page.getByTestId('nav-puzzles').click()
    await page.waitForURL('**/puzzles')
    await expect(page).toHaveTitle('Chess Puzzles | Chessmaster Pro')

    // Verify puzzle cards and play buttons are present
    await expect(page.getByTestId('puzzle-card-daily')).toBeVisible()
    await expect(page.getByTestId('btn-play-daily')).toBeVisible()

    // 4. Navigate to Courses
    await page.getByTestId('nav-courses').click()
    await page.waitForURL('**/courses')
    await expect(page).toHaveTitle('Interactive Courses | Chessmaster Pro')

    // Verify course card and start button are present
    await expect(page.getByTestId('course-card-course-1')).toBeVisible()
    await expect(page.getByTestId('btn-view-course-course-1')).toBeVisible()

    // 5. Navigate to Tournaments
    await page.getByTestId('nav-tournaments').click()
    await page.waitForURL('**/tournaments')
    await expect(page).toHaveTitle('Tournaments | Chessmaster Pro')

    // Verify tournament tabs and join buttons
    await expect(page.getByTestId('tab-tournaments-active')).toBeVisible()
    await expect(page.getByTestId('btn-create-tournament')).toBeVisible()

    // 6. Navigate to Profile
    await page.getByTestId('nav-profile').click()
    await page.waitForURL('**/profile')
    await expect(page).toHaveTitle('Profile | Chessmaster Pro')

    // Verify profile page widgets
    await expect(page.getByTestId('btn-edit-profile')).toBeVisible()
    await expect(page.getByTestId('rating-card-rapid')).toBeVisible()
    await expect(page.getByTestId('rating-rapid-val')).toHaveText('1540')
  })

  test('should allow playing a chess move and update game state', async ({ page }) => {
    await page.goto('/play')
    await page.getByTestId('bot-select-easy').click()

    // Verify initial state
    await expect(page.getByTestId('board-square-e2')).toBeVisible()
    await expect(page.getByTestId('board-square-e4')).toBeVisible()

    // Click on e2, then e4 to simulate moving a pawn
    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e4').click()

    // Verify pieces has moved by checking pieces on board (e4 should have pawn, e2 should be empty)
    // We can verify that the move history updates
    const movesHistory = page.getByTestId('moves-history')
    await expect(movesHistory).toContainText('e4')
  })
})
