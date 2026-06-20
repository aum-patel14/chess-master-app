import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Interactive Chess Puzzles', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock session token to localStorage before page scripts initialize
    await page.addInitScript(() => {
      // Set guest stats fallbacks in localStorage
      window.localStorage.setItem('guest_puzzle_rating', '1500')
      window.localStorage.setItem('guest_puzzle_solved_count', '24')
      window.localStorage.setItem('guest_puzzle_streak_best', '5')

      const session = {
        currentSession: {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          expires_at: 9999999999,
        },
        expiresAt: 9999999999,
      }
      window.localStorage.setItem('sb-your-project-id-auth-token', JSON.stringify(session))
      window.localStorage.setItem('supabase.auth.token', JSON.stringify(session))
    })

    // Intercept Supabase Auth user check
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
        }),
      })
    })

    // Intercept Supabase DB queries for puzzle ratings
    await page.route('**/rest/v1/puzzle_ratings*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              user_id: 'test-user-id',
              rating: 1500,
              streak_best: 5,
              daily_streak_days: 2,
              games_played: 24,
            },
          ]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      }
    })

    // Intercept Supabase DB queries for puzzles list
    await page.route('**/rest/v1/puzzles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'puzzle-1',
            fen: '5rk1/ppp2ppp/8/8/8/6PP/3RR1K1/8 b - - 0 1',
            moves: 'a7a5 d2d8 f8d8 e2e8',
            rating: 1000,
            themes: ['mate', 'backRank'],
          },
        ]),
      })
    })

    // Intercept Supabase DB inserts for puzzle activity
    await page.route('**/rest/v1/puzzle_activity*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('should load the puzzles hub dashboard and display user stats', async ({ page }) => {
    await page.goto('/puzzles')

    // Confirm hub loads successfully
    await expect(page).toHaveTitle('Chess Puzzles | Chessmaster Pro')
    await expect(page.getByText('Tactical Puzzles Hub')).toBeVisible()

    // Confirm stats cards are populated from our mocked Supabase responses
    await expect(page.getByTestId('puzzle-stat-puzzle-rating')).toContainText('1500')
    await expect(page.getByTestId('puzzle-stat-solved')).toContainText('24')
    await expect(page.getByTestId('puzzle-stat-best-streak')).toContainText('5')

    // Confirm mode buttons are visible
    await expect(page.getByTestId('btn-play-daily')).toBeVisible()
    await expect(page.getByTestId('btn-play-rated')).toBeVisible()
    await expect(page.getByTestId('btn-play-streak')).toBeVisible()
  })

  test('should allow solving the daily puzzle correctly', async ({ page }) => {
    await page.goto('/puzzles')
    await page.getByTestId('btn-play-daily').click()

    // Verify solver loads
    await expect(page.getByTestId('btn-exit-puzzles')).toBeVisible()
    await expect(page.getByText('Difficulty: 1000')).toBeVisible()

    // Verify starting feedback
    const feedback = page.getByTestId('puzzle-feedback')
    await expect(feedback).toContainText('Find the best move')

    // First correct move: d2 -> d8 (White Rook check)
    // Board is oriented as White (Rook on d2, click d2 then d8)
    await page.getByTestId('board-square-d2').click()
    await page.getByTestId('board-square-d8').click()

    // The opponent automatically responds with f8 -> d8
    // Wait for the opponent's reply and feedback updates
    await expect(feedback).toContainText('Your turn. Keep going!')

    // Second correct move: e2 -> e8 (White Rook moves to e8, checkmate!)
    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e8').click()

    // Verify success feedback
    await expect(feedback).toContainText('solved successfully')
    await expect(page.getByTestId('btn-next-puzzle')).toBeVisible()
  })

  test('should show failure state and retry option on an incorrect move', async ({ page }) => {
    await page.goto('/puzzles')
    await page.getByTestId('btn-play-daily').click()

    const feedback = page.getByTestId('puzzle-feedback')
    await expect(feedback).toContainText('Find the best move')

    // Make a wrong move: d2 -> d1
    await page.getByTestId('board-square-d2').click()
    await page.getByTestId('board-square-d1').click()

    // Verify failure state displays reason and retry option
    await expect(feedback).toContainText('Incorrect move')
    const retryBtn = page.getByTestId('btn-retry-puzzle')
    await expect(retryBtn).toBeVisible()

    // Click retry and verify position resets to solving state
    await retryBtn.click()
    await expect(feedback).toContainText('Your turn')
    await expect(retryBtn).not.toBeVisible()
  })

  test('should increment streak counter on solving in streak mode', async ({ page }) => {
    await page.goto('/puzzles')
    await page.getByTestId('btn-play-streak').click()

    // Check starting streak state
    const streakCounter = page.getByTestId('streak-counter')
    await expect(streakCounter).toContainText('Streak: 0')

    // Solve the puzzle: d2 -> d8, then e1 -> d8
    await page.getByTestId('board-square-d2').click()
    await page.getByTestId('board-square-d8').click()

    await expect(page.getByTestId('puzzle-feedback')).toContainText('Your turn. Keep going!')

    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e8').click()

    // Check that the streak counter increments
    await expect(streakCounter).toContainText('Streak: 1')
  })

  test('should show correct move hint when requested', async ({ page }) => {
    await page.goto('/puzzles')
    await page.getByTestId('btn-play-daily').click()

    // Request hint
    const hintBtn = page.getByTestId('btn-hint')
    await expect(hintBtn).toBeVisible()
    await hintBtn.click()

    // Confirm feedback updates and hint squares are highlighted on the board (ring-emerald-500)
    await expect(page.getByTestId('puzzle-feedback')).toContainText('Hint:')
    const highlightedSquare = page.locator('.ring-emerald-500')
    await expect(highlightedSquare.first()).toBeVisible()
  })
})
