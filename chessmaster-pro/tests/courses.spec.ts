import { test, expect } from '@playwright/test'

test.describe('Chessmaster Pro - Interactive Courses & Lessons', () => {
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
          email: 'student@example.com',
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
          email: 'student@example.com',
        }),
      })
    })

    // Intercept Supabase DB queries for courses list
    await page.route('**/rest/v1/courses*', async (route) => {
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')

      let responseBody = [
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
        {
          id: 'c2222222-2222-2222-2222-222222222222',
          slug: 'advanced-tactics',
          title: 'Advanced Attacking Tactics',
          description: 'Learn tactical themes like double check and complex combinations.',
          level: 'advanced',
          category: 'tactics',
          thumbnail_emoji: '🔥',
          xp_reward: 200,
          lesson_count: 1,
          estimated_minutes: 20,
          is_published: true,
          is_premium: true,
        },
      ]

      if (idParam && idParam.includes('eq.')) {
        const id = idParam.replace('eq.', '')
        responseBody = responseBody.filter((c) => c.id === id)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(responseBody[0] || null),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(responseBody),
        })
      }
    })

    // Intercept Supabase DB queries for lessons
    await page.route('**/rest/v1/lessons*', async (route) => {
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')

      let responseBody = [
        {
          id: 'e1111111-1111-1111-1111-111111111111',
          course_id: 'c1111111-1111-1111-1111-111111111111',
          position: 1,
          title: 'Pawn Movements',
          summary: 'Learn how the humble pawn marches forward and captures diagonally.',
          xp_reward: 20,
        },
        {
          id: 'e2222222-2222-2222-2222-222222222222',
          course_id: 'c1111111-1111-1111-1111-111111111111',
          position: 2,
          title: 'Rook Movements',
          summary: 'Learn how the rook controls files and ranks with straight line power.',
          xp_reward: 20,
        },
        {
          id: 'e3333333-3333-3333-3333-333333333333',
          course_id: 'c2222222-2222-2222-2222-222222222222',
          position: 1,
          title: 'The Double Check',
          summary: 'Discover the devastating power of double checks.',
          xp_reward: 30,
        },
      ]

      if (idParam && idParam.includes('eq.')) {
        const id = idParam.replace('eq.', '')
        const filtered = responseBody.find((l) => l.id === id)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(filtered || null),
        })
      } else {
        // Filter by course_id if present
        const courseIdParam = url.searchParams.get('course_id')
        if (courseIdParam && courseIdParam.includes('eq.')) {
          const courseId = courseIdParam.replace('eq.', '')
          responseBody = responseBody.filter((l) => l.course_id === courseId)
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(responseBody),
        })
      }
    })

    // Intercept Supabase DB queries for lesson steps
    await page.route('**/rest/v1/lesson_steps*', async (route) => {
      const url = new URL(route.request().url())
      const lessonIdParam = url.searchParams.get('lesson_id')

      let responseBody: any[] = []

      if (lessonIdParam && lessonIdParam.includes('eq.e1111111-1111-1111-1111-111111111111')) {
        responseBody = [
          {
            id: 'f1111111-1111-1111-1111-111111111111',
            lesson_id: 'e1111111-1111-1111-1111-111111111111',
            position: 1,
            type: 'theory',
            title: 'Pawn Move Basics',
            content: 'The pawn is the basic unit of chess. It moves straight forward one square at a time...',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            solution_moves: null,
            hint: null,
            explanation: 'Read the theory. When ready, click Next Step.',
          },
          {
            id: 'f1222222-2222-2222-2222-222222222222',
            lesson_id: 'e1111111-1111-1111-1111-111111111111',
            position: 2,
            type: 'challenge',
            title: 'Pawn First Move',
            content: 'Move your pawn from e2 to e4.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            solution_moves: ['e2e4'],
            hint: 'Drag the e2 pawn to e4.',
            explanation: 'Excellent pawn push!',
          },
          {
            id: 'f1333333-3333-3333-3333-333333333333',
            lesson_id: 'e1111111-1111-1111-1111-111111111111',
            position: 3,
            type: 'challenge',
            title: 'Pawn Diagonal Capture',
            content: 'Now, capture the black pawn on d5 using your e4 pawn!',
            fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            solution_moves: ['e4d5'],
            hint: 'Capture the d5 pawn with e4.',
            explanation: 'Perfect diagonal capture!',
          },
        ]
      } else if (lessonIdParam && lessonIdParam.includes('eq.e2222222-2222-2222-2222-222222222222')) {
        responseBody = [
          {
            id: 'f2111111-1111-1111-1111-111111111111',
            lesson_id: 'e2222222-2222-2222-2222-222222222222',
            position: 1,
            type: 'theory',
            title: 'Rook Basics',
            content: 'The rook moves in straight lines vertically and horizontally...',
            fen: '8/8/8/8/4R3/8/8/8 w - - 0 1',
            solution_moves: null,
            hint: null,
            explanation: 'Read the theory. When ready, click Next Step.',
          },
        ]
      } else if (lessonIdParam && lessonIdParam.includes('eq.e3333333-3333-3333-3333-333333333333')) {
        responseBody = [
          {
            id: 'f3111111-1111-1111-1111-111111111111',
            lesson_id: 'e3333333-3333-3333-3333-333333333333',
            position: 1,
            type: 'challenge',
            title: 'Deliver Double Check',
            content: 'Move your knight to h6 to deliver a double check!',
            fen: 'r1bqk2r/ppp2ppp/2n5/1B1p4/6Q1/2N5/PPPP1PPP/R1B1K2R w KQkq - 0 8',
            solution_moves: ['c3h6'],
            hint: 'Move knight to h6.',
            explanation: 'Spectacular double check!',
          },
        ]
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    })

    // Intercept Supabase DB queries/inserts for lesson progress
    await page.route('**/rest/v1/lesson_progress*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]), // Initially no lessons completed
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      }
    })
  })

  test('should load the courses hub dashboard successfully', async ({ page }) => {
    await page.goto('/courses')

    // Confirm academy loads
    await expect(page).toHaveTitle('Interactive Courses | Chess Academy | Chessmaster Pro')
    await expect(page.getByTestId('academy-header-title')).toBeVisible()
    await expect(page.getByText('Chess Basics & Movements')).toBeVisible()
    await expect(page.getByText('Advanced Attacking Tactics')).toBeVisible()

    // Confirm View Syllabus and Unlock buttons are visible
    await expect(page.getByTestId('btn-view-course-c1111111-1111-1111-1111-111111111111')).toBeVisible()
    await expect(page.getByTestId('btn-view-course-c2222222-2222-2222-2222-222222222222')).toBeVisible()
  })

  test('should navigate to course syllabus details', async ({ page }) => {
    await page.goto('/courses')

    // Click "View Syllabus" on the free course
    await page.getByTestId('btn-view-course-c1111111-1111-1111-1111-111111111111').click()

    // Verify navigation and page content
    await expect(page).toHaveURL(/\/courses\/c1111111-1111-1111-1111-111111111111/)
    await expect(page.getByTestId('course-detail-title')).toHaveText('Chess Basics & Movements')
    await expect(page.getByTestId('lesson-item-e1111111-1111-1111-1111-111111111111')).toBeVisible()
    await expect(page.getByTestId('lesson-item-e2222222-2222-2222-2222-222222222222')).toBeVisible()
  })

  test('should enforce premium lock on advanced courses and allow sandbox unlocking', async ({ page }) => {
    await page.goto('/courses')

    // Click on the premium course card
    await page.getByTestId('course-card-c2222222-2222-2222-2222-222222222222').click()

    // Verify lock details modal appears
    await expect(page.getByTestId('premium-lock-modal')).toBeVisible()
    await expect(page.getByText('Diamond Exclusive Course')).toBeVisible()

    // Click to unlock/toggle premium simulation
    await page.getByTestId('btn-enable-premium-mock').click()

    // Verify modal is closed and we are on the details page
    await expect(page.getByTestId('premium-lock-modal')).not.toBeVisible()
    await expect(page.getByTestId('course-detail-title')).toHaveText('Advanced Attacking Tactics')

    // Now clicking the lesson should successfully navigate
    await page.getByTestId('lesson-item-e3333333-3333-3333-3333-333333333333').click()
    await expect(page).toHaveURL(/\/courses\/c2222222-2222-2222-2222-222222222222\/lessons\/e3333333-3333-3333-3333-333333333333/)
  })

  test('should play lesson steps, validate interactive board inputs, and persist completion', async ({ page }) => {
    // Track DB updates to verify progress persistence
    let progressPostTriggered = false
    await page.route('**/rest/v1/lesson_progress*', async (route) => {
      const method = route.request().method()
      if (method === 'POST' || method === 'PUT') {
        progressPostTriggered = true
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    // Start directly at the first lesson player
    await page.goto('/courses/c1111111-1111-1111-1111-111111111111/lessons/e1111111-1111-1111-1111-111111111111')

    // --- STEP 1: THEORY ---
    await expect(page.getByTestId('step-title')).toHaveText('Pawn Move Basics')
    // Next step button should be immediately clickable on theory step
    await page.getByTestId('btn-next-step').click()

    // --- STEP 2: INTERACTIVE CHALLENGE ---
    await expect(page.getByTestId('step-title')).toHaveText('Pawn First Move')
    
    // Attempt incorrect move: e2 -> e3 (Pawn single push instead of expected double push e4)
    await page.getByTestId('board-square-e2').click()
    await page.getByTestId('board-square-e3').click()
    await expect(page.getByTestId('step-status-message')).toHaveText('Incorrect move. Try again!')

    // Check hint trigger
    await expect(page.getByTestId('step-hint-text')).not.toBeVisible()
    await page.getByTestId('btn-show-hint').click()
    await expect(page.getByTestId('step-hint-text')).toBeVisible()

    // Perform correct move: e2 -> e4
    await page.getByTestId('board-square-e2').click()
    await expect(page.getByTestId('board-square-e2')).toHaveClass(/ring-purple-500/)
    await page.getByTestId('board-square-e4').click()
    await expect(page.getByTestId('step-status-message')).toHaveText('Correct! Well done.')

    // Click Next Step
    await page.getByTestId('btn-next-step').click()

    // --- STEP 3: INTERACTIVE CHALLENGE (Diagonal Capture) ---
    await expect(page.getByTestId('step-title')).toHaveText('Pawn Diagonal Capture')
    await expect(page.getByTestId('piece-d5-p')).toBeVisible()

    // Perform correct move: e4 -> d5 (diagonally capture pawn)
    await page.getByTestId('board-square-e4').click()
    await expect(page.getByTestId('board-square-e4')).toHaveClass(/ring-purple-500/)
    await page.getByTestId('board-square-d5').click()
    await expect(page.getByTestId('step-status-message')).toHaveText('Correct! Well done.')

    // Complete Lesson
    await page.getByTestId('btn-next-step').click()

    // Verify Lesson Finished Screen
    await expect(page.getByText('Lesson Completed!')).toBeVisible()
    await expect(page.getByText('+20 XP Earned')).toBeVisible()

    // Verify DB progress update request was sent
    expect(progressPostTriggered).toBe(true)

    // Complete / Continue syllabus
    await page.getByTestId('btn-lesson-finished-continue').click()
    await expect(page).toHaveURL(/\/courses\/c1111111-1111-1111-1111-111111111111/)
  })
})
