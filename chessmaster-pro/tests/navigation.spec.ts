import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Core Navigation & Interactive Elements', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock session token to localStorage before page scripts initialize
    await page.addInitScript(() => {
      const rawSession = {
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'test-user-id',
          email: 'grandmaster@chess.com',
        },
        expires_at: 9999999999,
      }
      const wrappedSession = {
        currentSession: rawSession,
        expiresAt: 9999999999,
      }
      window.localStorage.setItem('sb-your-project-id-auth-token', JSON.stringify(rawSession))
      window.localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(rawSession))
      window.localStorage.setItem('supabase.auth.token', JSON.stringify(wrappedSession))
    })

    // Intercept Supabase Auth user check
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'grandmaster@chess.com',
        }),
      })
    })

    // Intercept Supabase DB queries for courses list
    await page.route('**/rest/v1/courses*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'c1111111-1111-1111-1111-111111111111',
            slug: 'chess-basics',
            title: 'Chess Basics & Movements',
            description: 'Master the fundamental rules of chess, including how the pieces move.',
            level: 'beginner',
            category: 'fundamentals',
            thumbnail_emoji: '♟',
            xp_reward: 100,
            lesson_count: 2,
            estimated_minutes: 15,
            is_published: true,
            is_premium: false,
          },
        ]),
      })
    })

    // Intercept Supabase DB queries for lessons
    await page.route('**/rest/v1/lessons*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Intercept Supabase DB queries for tournaments list
    await page.route('**/rest/v1/tournaments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  })

  test('should load the public landing page with hero and CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Chessmaster Pro — Play Chess Online | Chessmaster Pro')
    await expect(page.getByTestId('landing-logo')).toBeVisible()
    await expect(page.getByTestId('landing-cta-hero')).toBeVisible()
    await expect(page.getByTestId('landing-cta-bottom')).toBeVisible()
  })

  test('should navigate to all core routes and verify document titles', async ({ page }) => {
    // 1. Start at Dashboard
    await page.goto('/dashboard')
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
    await expect(page).toHaveTitle('Interactive Courses | Chess Academy | Chessmaster Pro')

    // Verify course card and start button are present
    await expect(page.getByTestId('course-card-c1111111-1111-1111-1111-111111111111')).toBeVisible()
    await expect(page.getByTestId('btn-view-course-c1111111-1111-1111-1111-111111111111')).toBeVisible()

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
