import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Tournaments & Brackets', () => {
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

    // Intercept Supabase DB queries for tournaments list
    await page.route('**/rest/v1/tournaments*', async (route) => {
      const method = route.request().method()
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')

      let responseBody = [
        {
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
          prize_badge_name: null,
          prize_badge_emoji: null,
          player_count: 3,
        },
        {
          id: 'd2222222-2222-2222-2222-222222222222',
          slug: 'grand-blitz-weekly',
          title: 'Grand Blitz Championship',
          description: 'Weekly Swiss tournament. 7 Rounds of 3+2 Blitz chess.',
          format: 'swiss',
          status: 'upcoming',
          time_control: '3+2',
          is_rated: true,
          created_by: 'admin-id',
          max_players: 64,
          min_players: 4,
          registration_opens_at: '2026-06-22T09:00:00Z',
          starts_at: '2026-06-22T11:00:00Z',
          ends_at: '2026-06-22T13:00:00Z',
          total_rounds: 7,
          current_round: 0,
          prize_type: 'badge',
          prize_badge_name: 'Grand Blitz Champion',
          prize_badge_emoji: '👑',
          player_count: 0,
        },
      ]

      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'd3333333-3333-3333-3333-333333333333',
            slug: 'autumn-blitz-cup',
            title: 'Autumn Blitz Cup',
            description: 'An E2E test created tournament',
            format: 'swiss',
            status: 'upcoming',
            time_control: '3+2',
            is_rated: true,
            created_by: 'test-user-id',
            max_players: 64,
            min_players: 4,
            registration_opens_at: '2026-06-22T09:00:00Z',
            starts_at: '2026-06-25T14:00:00Z',
            player_count: 0,
          }),
        })
      } else if (idParam && idParam.includes('eq.')) {
        const id = idParam.replace('eq.', '')
        const match = responseBody.find((t) => t.id === id)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match || null),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(responseBody),
        })
      }
    })

    // Intercept Supabase DB queries for tournament players
    await page.route('**/rest/v1/tournament_players*', async (route) => {
      const method = route.request().method()
      const url = new URL(route.request().url())
      const tourIdParam = url.searchParams.get('tournament_id')

      let players: any[] = []

      if (tourIdParam && tourIdParam.includes('eq.d1111111-1111-1111-1111-111111111111')) {
        players = [
          {
            id: 'p1',
            tournament_id: 'd1111111-1111-1111-1111-111111111111',
            user_id: 'u1',
            username: 'MagnusC',
            elo_at_entry: 2850,
            score: 12,
            wins: 6,
            draws: 0,
            losses: 0,
            rank: 1,
            withdrawn: false,
          },
          {
            id: 'p2',
            tournament_id: 'd1111111-1111-1111-1111-111111111111',
            user_id: 'u2',
            username: 'HikaruN',
            elo_at_entry: 2820,
            score: 10,
            wins: 5,
            draws: 0,
            losses: 1,
            rank: 2,
            withdrawn: false,
          },
        ]
      }

      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'p3-joined',
            tournament_id: body.tournament_id,
            user_id: body.user_id,
            username: body.username,
            elo_at_entry: body.elo_at_entry,
            score: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            rank: 1,
            withdrawn: false,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(players),
        })
      }
    })

    // Intercept Supabase DB queries for pairings
    await page.route('**/rest/v1/tournament_pairings*', async (route) => {
      const url = new URL(route.request().url())
      const tourIdParam = url.searchParams.get('tournament_id')

      let pairings: any[] = []

      if (tourIdParam && tourIdParam.includes('eq.d2222222-2222-2222-2222-222222222222')) {
        pairings = [
          {
            id: 'pairing-1',
            tournament_id: 'd2222222-2222-2222-2222-222222222222',
            round: 1,
            white_id: 'u1',
            black_id: 'u2',
            result: 'pending',
            white_username: 'MagnusC',
            black_username: 'HikaruN',
          },
        ]
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pairings),
      })
    })
  })

  test('should load the tournaments hub successfully', async ({ page }) => {
    await page.goto('/tournaments')

    // Verify page title and header
    await expect(page).toHaveTitle('Tournaments | Chessmaster Pro')
    await expect(page.getByTestId('tournaments-header-title')).toBeVisible()

    // Confirm live list displays active tournaments
    await expect(page.getByText('Summer Rapid Arena 2026')).toBeVisible()

    // Switch tabs to upcoming
    await page.getByTestId('tab-tournaments-upcoming').click()
    await expect(page.getByText('Grand Blitz Championship')).toBeVisible()
  })

  test('should create a new tournament successfully via the form modal', async ({ page }) => {
    let postTriggered = false
    await page.route('**/rest/v1/tournaments*', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        postTriggered = true
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'd3333333-3333-3333-3333-333333333333',
            slug: 'autumn-blitz-cup',
            title: 'Autumn Blitz Cup',
            description: 'An E2E test created tournament',
            format: 'swiss',
            status: 'upcoming',
            time_control: '3+2',
            is_rated: true,
            created_by: 'test-user-id',
            max_players: 64,
            min_players: 4,
            registration_opens_at: '2026-06-22T09:00:00Z',
            starts_at: '2026-06-25T14:00:00Z',
            player_count: 0,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    await page.goto('/tournaments')

    // Click "Create Tournament" button
    await page.getByTestId('btn-create-tournament').click()

    // Confirm modal form displays
    await expect(page.getByTestId('create-tournament-modal')).toBeVisible()

    // Fill in required form inputs
    await page.getByTestId('input-title').fill('Autumn Blitz Cup')
    await page.getByTestId('input-description').fill('An E2E test created tournament')
    await page.getByTestId('select-format').selectOption('swiss')
    await page.getByTestId('select-time-control').selectOption('3+2')
    await page.getByTestId('input-max-players').fill('64')
    await page.getByTestId('input-starts-at').fill('2026-06-25T14:00')

    // Submit form
    await page.getByTestId('btn-submit-tournament').click()

    // Verify modal closes and DB request was dispatched
    await expect(page.getByTestId('create-tournament-modal')).not.toBeVisible()
    expect(postTriggered).toBe(true)
  })

  test('should join a tournament successfully in the detail page', async ({ page }) => {
    let joinPostTriggered = false
    await page.route('**/rest/v1/tournament_players*', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        joinPostTriggered = true
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'p-joined-1',
            tournament_id: 'd2222222-2222-2222-2222-222222222222',
            user_id: 'test-user-id',
            username: 'grandmaster',
            elo_at_entry: 1540,
            score: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            rank: 1,
            withdrawn: false,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    // Navigate to details page directly
    await page.goto('/tournaments/d2222222-2222-2222-2222-222222222222')

    // Confirm detail content
    await expect(page.getByTestId('tournament-title')).toHaveText('Grand Blitz Championship')
    await expect(page.getByText('Join Tournament')).toBeVisible()

    // Register player
    await page.getByTestId('btn-register-tournament').click()

    // Verify register state changes (e.g. withdraw action becomes available)
    await expect(page.getByRole('heading', { name: 'Registered', exact: true })).toBeVisible()
    await expect(page.getByTestId('btn-register-tournament')).toHaveText('Withdraw')
    expect(joinPostTriggered).toBe(true)
  })

  test('should render standings leaderboard and Swiss bracket pairings without error', async ({ page }) => {
    // Navigate to detail page directly (Swiss type has pairings)
    await page.goto('/tournaments/d2222222-2222-2222-2222-222222222222')

    // --- LEADERBOARD ---
    await page.getByTestId('tab-tournament-standings').click()
    await expect(page.getByTestId('table-standings')).toBeVisible()

    // --- PAIRINGS BRACKET ---
    await page.getByTestId('tab-tournament-bracket').click()
    await expect(page.getByTestId('swiss-pairings-container')).toBeVisible()
    await expect(page.getByText('MagnusC')).toBeVisible()
    await expect(page.getByText('HikaruN')).toBeVisible()
  })
})
