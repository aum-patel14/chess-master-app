import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Multiplayer Lobby & Authentication Gate', () => {
  test.describe('Unauthenticated Access', () => {
    test('should present the login gate to unauthenticated users', async ({ page }) => {
      // Navigate to multiplayer page without setting any auth tokens
      await page.goto('/play/online')

      // Verify the page shows the login gate
      await expect(page).toHaveTitle('Login Required | Chessmaster Pro')
      await expect(page.getByText('Multiplayer Chess Gate')).toBeVisible()
      await expect(page.getByTestId('input-email')).toBeVisible()
      await expect(page.getByTestId('input-password')).toBeVisible()
      await expect(page.getByTestId('btn-auth-submit')).toBeVisible()
    })

    test('should show validation error message on auth failure', async ({ page }) => {
      // Intercept sign-in API call to return a failure status
      await page.route('**/auth/v1/token?grant_type=password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        })
      })

      await page.goto('/play/online')

      // Fill in invalid details
      await page.getByTestId('input-email').fill('wrong@example.com')
      await page.getByTestId('input-password').fill('wrongpassword')
      await page.getByTestId('btn-auth-submit').click()

      // Confirm error alert is displayed
      await expect(page.getByTestId('auth-error')).toBeVisible()
      await expect(page.getByTestId('auth-error')).toContainText('Invalid login credentials')
    })
  })

  test.describe('Authenticated Access & Lobby Actions', () => {
    test.beforeEach(async ({ page }) => {
      // Inject mock session token before loading page
      await page.addInitScript(() => {
        const rawSession = {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'authenticated-user-id',
            email: 'grandmaster@chess.com',
          },
          expires_at: 9999999999,
        }
        const wrappedSession = {
          currentSession: rawSession,
          expiresAt: 9999999999,
        }
        window.localStorage.setItem('sb-your-project-id-auth-token', JSON.stringify(rawSession))
        window.localStorage.setItem('supabase.auth.token', JSON.stringify(wrappedSession))
      })

      // Mock user request
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'authenticated-user-id',
            email: 'grandmaster@chess.com',
          }),
        })
      })

      // Mock ratings query
      await page.route('**/rest/v1/ratings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user_id: 'authenticated-user-id',
            rating: 1540,
            wins: 10,
            losses: 5,
            draws: 2,
            time_control: 'blitz',
          }),
        })
      })
    })

    test('should bypass the gate, load the lobby dashboard and display stats', async ({ page }) => {
      await page.goto('/play/online')

      // Confirm we bypassed login screen and loaded lobby
      await expect(page).toHaveTitle('Online Matchmaking | Chessmaster Pro')
      await expect(page.getByText('Multiplayer Matchmaking')).toBeVisible()
      await expect(page.getByText('Ratings Elo:')).toBeVisible()
      await expect(page.getByText('1540')).toBeVisible()

      // Confirm time controls, Create Lobby, and Join Lobby containers are visible
      await expect(page.getByTestId('btn-find-match')).toBeVisible()
      await expect(page.getByTestId('btn-create-lobby')).toBeVisible()
      await expect(page.getByTestId('btn-join-lobby')).toBeVisible()
    })

    test('should start matchmaking and allow canceling search', async ({ page }) => {
      // Mock join_matchmaking RPC endpoint
      await page.route('**/rest/v1/rpc/join_matchmaking', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            matched: false,
            game: null,
          }),
        })
      })

      // Mock deleting from matchmaking queue
      await page.route('**/rest/v1/matchmaking_queue*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      })

      await page.goto('/play/online')

      // Click "Find Match Now"
      await page.getByTestId('btn-find-match').click()

      // Verify searching screen is displayed
      await expect(page).toHaveTitle('SearchingOpponent | Chessmaster Pro')
      await expect(page.getByText('Searching for opponent...')).toBeVisible()

      // Cancel matchmaking and verify we return to the lobby
      await page.getByTestId('btn-cancel-match').click()
      await expect(page.getByText('Multiplayer Matchmaking')).toBeVisible()
    })

    test('should allow creating a custom private lobby and canceling it', async ({ page }) => {
      // Mock insert into online_games
      await page.route('**/rest/v1/online_games*', async (route) => {
        const method = route.request().method()
        if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'mocked-online-game-id',
              room_code: 'ABCD12',
              white_id: 'authenticated-user-id',
              black_id: null,
              white_username: 'grandmaster',
              black_username: null,
              white_elo: 1540,
              black_elo: null,
              time_control: 'blitz_3_2',
              is_rated: false,
              status: 'waiting',
            }),
          })
        } else if (method === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
          })
        }
      })

      await page.goto('/play/online')

      // Click "Create Room"
      await page.getByTestId('btn-create-lobby').click()

      // Verify room is created and waiting screen shows code
      await expect(page).toHaveTitle('Waiting for Player | Chessmaster Pro')
      await expect(page.getByText('Private Lobby Created')).toBeVisible()

      const codeDisplay = page.getByTestId('room-code-display')
      await expect(codeDisplay).toBeVisible()
      // Wait for it to have 6 alphanumeric characters
      await expect(codeDisplay).toHaveText(/^[A-Z0-9]{6}$/)

      // Cancel lobby and verify we return to the lobby page
      await page.getByTestId('btn-cancel-lobby').click()
      await expect(page.getByText('Multiplayer Matchmaking')).toBeVisible()
    })

    test('should show error alert on entering an invalid room code', async ({ page }) => {
      // Mock join_private_game RPC failure
      await page.route('**/rest/v1/rpc/join_private_game', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Room not found or already full.',
            game: null,
          }),
        })
      })

      await page.goto('/play/online')

      // Fill in a room code and click Join
      await page.getByTestId('input-room-code').fill('BAD123')
      await page.getByTestId('btn-join-lobby').click()

      // Check lobby error
      await expect(page.getByTestId('lobby-error')).toBeVisible()
      await expect(page.getByTestId('lobby-error')).toContainText('Room not found or already full.')
    })
  })
})
