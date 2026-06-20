import { test, expect } from '@playwright/test';

test.describe('Navigation and Layout Audits', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL and set onboarding state to true to prevent overlay blocking clicks
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('chess_onboarded', 'true');
    });
  });

  test('Landing page should load full-screen without sidebar', async ({ page }) => {
    await page.goto('/');
    
    // The main landing page title or body should be visible
    await expect(page.locator('.lp-page')).toBeVisible();
    
    // The ChesscomLayout sidebar should NOT be rendered
    await expect(page.locator('.cc-sidebar')).not.toBeVisible();
  });

  test('Inner pages should render sidebar with exactly two main links (Play, Other)', async ({ page }) => {
    await page.goto('/#/game');
    
    // Sidebar should be visible
    await expect(page.locator('.cc-sidebar')).toBeVisible();
    
    // Nav links under .cc-nav should be exactly two
    const navLinks = page.locator('.cc-sidebar .cc-nav .cc-nav-item');
    await expect(navLinks).toHaveCount(2);
    
    // Labels should be "Play" and "Other"
    await expect(navLinks.nth(0)).toContainText('Play');
    await expect(navLinks.nth(1)).toContainText('Other');
  });

  test('Hovering Play should reveal sub-sections and hovering a sub-section should reveal its sub-items', async ({ page }) => {
    await page.goto('/#/game');
    
    // Hover over the first link "Play"
    const playLink = page.locator('.cc-sidebar .cc-nav .cc-nav-item').nth(0);
    await playLink.hover();
    
    // Primary flyout menu should be visible
    const primaryFlyout = page.locator('.cc-nav-flyout');
    await expect(primaryFlyout).toBeVisible();
    
    // Hover over "Puzzles" sub-section button inside primary flyout
    const puzzlesBtn = primaryFlyout.locator('.cc-flyout-subsection-btn').filter({ hasText: 'Puzzles' });
    await puzzlesBtn.hover();
    
    // Sub-flyout menu should open and be visible
    const subFlyout = page.locator('.cc-sub-flyout');
    await expect(subFlyout).toBeVisible();
    
    // Verify it contains puzzle sub-options (e.g. "Puzzles Hub")
    await expect(subFlyout).toContainText('Puzzles Hub');
  });

  test('Clicking a sub-section button directly should navigate to its hub', async ({ page }) => {
    await page.goto('/#/game');
    
    // Hover Play
    const playLink = page.locator('.cc-sidebar .cc-nav .cc-nav-item').nth(0);
    await playLink.hover();
    
    // Find Puzzles button and click it
    const puzzlesBtn = page.locator('.cc-nav-flyout .cc-flyout-subsection-btn').filter({ hasText: 'Puzzles' });
    await puzzlesBtn.click();
    
    // Verify we navigated to the puzzles hub page
    await expect(page).toHaveURL(/.*\/puzzles/);
  });

  test('Mobile viewport should support 3-level accordion expansion', async ({ page }) => {
    // Set to mobile viewport size
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/#/game');
    
    // Confirm sidebar is hidden and mobile header is visible
    await expect(page.locator('.cc-sidebar')).not.toBeVisible();
    await expect(page.locator('.cc-mobile-header')).toBeVisible();
    
    // Open mobile sidebar drawer
    await page.click('.cc-mobile-menu-btn');
    const mobileSidebar = page.locator('.cc-mobile-sidebar');
    await expect(mobileSidebar).toBeVisible();
    
    // Click "Play" accordion header
    await page.click('.cc-mobile-nav-parent:has-text("Play")');
    
    // Verify "Puzzles" sub-accordion header is visible
    const puzzlesSubparent = page.locator('.cc-mobile-nav-subparent:has-text("Puzzles")');
    await expect(puzzlesSubparent).toBeVisible();
    
    // Click "Puzzles" sub-accordion header
    await puzzlesSubparent.click();
    
    // Verify "Puzzles Hub" nested link is visible
    const puzzlesHubLink = page.locator('.cc-mobile-sidebar button:has-text("Puzzles Hub")');
    await expect(puzzlesHubLink).toBeVisible();
    
    // Click it and verify navigation
    await puzzlesHubLink.click();
    await expect(page).toHaveURL(/.*\/puzzles/);
  });
});
