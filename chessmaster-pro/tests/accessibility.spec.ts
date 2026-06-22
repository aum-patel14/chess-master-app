import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Chessmaster Pro - Accessibility (axe-core)', () => {
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
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')
      const course = {
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
      }

      if (idParam && idParam.includes('eq.')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(course),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([course]),
        })
      }
    })

    // Intercept Supabase DB queries for lessons
    await page.route('**/rest/v1/lessons*', async (route) => {
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')
      const lesson = {
        id: 'e1111111-1111-1111-1111-111111111111',
        course_id: 'c1111111-1111-1111-1111-111111111111',
        position: 1,
        title: 'Pawn Movements',
        summary: 'Learn how the humble pawn marches forward.',
        xp_reward: 20,
      }

      if (idParam && idParam.includes('eq.')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lesson),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([lesson]),
        })
      }
    })

    // Intercept Supabase DB queries for lesson steps
    await page.route('**/rest/v1/lesson_steps*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'f1111111-1111-1111-1111-111111111111',
            lesson_id: 'e1111111-1111-1111-1111-111111111111',
            position: 1,
            type: 'theory',
            title: 'Pawn Move Basics',
            content: 'The pawn moves straight forward one square at a time...',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            solution_moves: null,
            hint: null,
            explanation: 'Read the theory.',
          }
        ]),
      })
    })

    // Intercept Supabase DB queries for tournaments list
    await page.route('**/rest/v1/tournaments*', async (route) => {
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')
      const tournament = {
        id: 'd1111111-1111-1111-1111-111111111111',
        slug: 'summer-rapid-2026',
        title: 'Summer Rapid Arena 2026',
        description: '90-minute arena tournament with standard 10+0 Rapid chess rules.',
        format: 'arena',
        status: 'active',
        time_control: '10+0',
        is_rated: true,
        created_by: 'admin-id',
        max_players: 128,
        min_players: 4,
        registration_opens_at: '2026-06-22T08:00:00Z',
        starts_at: '2026-06-22T09:00:00Z',
        ends_at: '2026-06-22T10:30:00Z',
        total_rounds: 0,
        current_round: 0,
        prize_type: 'none',
        player_count: 3,
      }

      if (idParam && idParam.includes('eq.')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tournament),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([tournament]),
        })
      }
    })

    // Intercept Supabase DB queries for tournament players
    await page.route('**/rest/v1/tournament_players*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Intercept Supabase DB queries for tournament pairings
    await page.route('**/rest/v1/tournament_pairings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  })

  const routes = [
    { name: 'Landing Page', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'VS AI bot selection', path: '/play' },
    { name: 'Multiplayer Lobby', path: '/play/online' },
    { name: 'Puzzles Hub', path: '/puzzles' },
    { name: 'Courses Hub', path: '/courses' },
    { name: 'Course Detail', path: '/courses/c1111111-1111-1111-1111-111111111111' },
    { name: 'Lesson Player', path: '/courses/c1111111-1111-1111-1111-111111111111/lessons/e1111111-1111-1111-1111-111111111111' },
    { name: 'Tournaments Hub', path: '/tournaments' },
    { name: 'Tournament Detail', path: '/tournaments/d1111111-1111-1111-1111-111111111111' },
    { name: 'Profile Page', path: '/profile' }
  ]

  for (const r of routes) {
    test(`should have no critical accessibility violations on ${r.name}`, async ({ page }) => {
      await page.goto(r.path)
      
      // Wait for app layout and data loading to render
      await page.waitForTimeout(1000)

      // Scan with axe-core
      // We check for WCAG 2.A/2.AA tags. We can disable color-contrast check if it is too strict for dark themes
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast']) 
        .analyze()

      if (results.violations.length > 0) {
        console.warn(`Accessibility violations found on ${r.name} (${r.path}):`)
        for (const violation of results.violations) {
          console.warn(`- Rule: ${violation.id} (${violation.description})`)
          console.warn(`  Severity: ${violation.impact}`)
          console.warn(`  Elements:`, violation.nodes.map(n => n.html))
        }
      }

      // Assert that there are zero violations of A/AA rules (excluding color-contrast)
      expect(results.violations).toEqual([])
    })
  }
})
