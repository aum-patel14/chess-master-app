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

  test('Inner pages should render sidebar with exactly seven main links', async ({ page }) => {
    await page.goto('/#/game');
    
    // Sidebar should be visible
    await expect(page.locator('.cc-sidebar')).toBeVisible();
    
    // Nav links under .cc-nav should be exactly seven
    const navLinks = page.locator('.cc-sidebar .cc-nav .cc-nav-item');
    await expect(navLinks).toHaveCount(7);
    
    // Labels should match the new top-level layout
    await expect(navLinks.nth(0)).toContainText('Play');
    await expect(navLinks.nth(1)).toContainText('Puzzles');
    await expect(navLinks.nth(2)).toContainText('Learn');
    await expect(navLinks.nth(3)).toContainText('Train');
    await expect(navLinks.nth(4)).toContainText('Watch');
    await expect(navLinks.nth(5)).toContainText('Community');
    await expect(navLinks.nth(6)).toContainText('Other');
  });

  test('Hovering Play should reveal sub-sections and hovering a sub-section should reveal its sub-items', async ({ page }) => {
    await page.goto('/#/game');
    
    // Hover over the first link "Play"
    const playLink = page.locator('.cc-sidebar .cc-nav .cc-nav-item').nth(0);
    await playLink.hover();
    
    // Primary flyout menu should be visible
    const primaryFlyout = page.locator('.cc-nav-flyout');
    await expect(primaryFlyout).toBeVisible();
    
    // Hover over "Play Online" sub-section button inside primary flyout
    const playOnlineBtn = primaryFlyout.locator('.cc-flyout-subsection-btn').filter({ hasText: 'Play Online' });
    await playOnlineBtn.hover();
    
    // Sub-flyout menu should open and be visible
    const subFlyout = page.locator('.cc-sub-flyout');
    await expect(subFlyout).toBeVisible();
    
    // Verify it contains play online sub-options (e.g. "Play Live")
    await expect(subFlyout).toContainText('Play Live');
  });

  test('Clicking a sub-section button directly should navigate to its hub', async ({ page }) => {
    await page.goto('/#/game');
    
    // Hover Play
    const playLink = page.locator('.cc-sidebar .cc-nav .cc-nav-item').nth(0);
    await playLink.hover();
    
    // Find Play Online button and click it
    const playOnlineBtn = page.locator('.cc-nav-flyout .cc-flyout-subsection-btn').filter({ hasText: 'Play Online' });
    await playOnlineBtn.click();
    
    // Verify we navigated to the play page
    await expect(page).toHaveURL(/.*\/play/);
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
    
    // Verify "Play Online" sub-accordion header is visible
    const playOnlineSubparent = page.locator('.cc-mobile-nav-subparent:has-text("Play Online")');
    await expect(playOnlineSubparent).toBeVisible();
    
    // Click "Play Online" sub-accordion header
    await playOnlineSubparent.click();
    
    // Verify "Play Live" nested link is visible
    const playLiveLink = page.locator('.cc-mobile-sidebar button:has-text("Play Live")');
    await expect(playLiveLink).toBeVisible();
    
    // Click it and verify navigation
    await playLiveLink.click();
    await expect(page).toHaveURL(/.*\/play/);
  });
});
