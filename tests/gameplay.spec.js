import { test, expect } from '@playwright/test';

test.describe('VS AI Gameplay Audits', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to base URL and set onboarding state to true
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('chess_onboarded', 'true');
    });
  });

  test('Should allow selecting a bot and starting a game', async ({ page }) => {
    // Navigate to local game first
    await page.goto('/#/game');
    
    // Hover "Play" in the sidebar to open the primary flyout
    const playLink = page.locator('.cc-sidebar .cc-nav .cc-nav-item').nth(0);
    await playLink.hover();
    
    // Click "Play Bots" subsection button inside the primary flyout
    const playBotsBtn = page.locator('.cc-nav-flyout .cc-flyout-subsection-btn').filter({ hasText: 'Play Bots' });
    await expect(playBotsBtn).toBeVisible();
    await playBotsBtn.click();
    
    // Now the BotSelector overlay modal should be visible!
    const botModal = page.locator('.bot-selector-overlay');
    await expect(botModal).toBeVisible();
    
    // Select Pawn Pablo bot (ELO 700)
    const botItem = botModal.locator('.bot-list-item').filter({ hasText: 'Pawn Pablo' });
    await expect(botItem).toBeVisible();
    await botItem.click();
    
    // Click Play button inside the preview pane to start the game
    const playBtn = botModal.locator('.play-button');
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    
    // Verify that the chessboard container is rendered, meaning the game started successfully
    const chessboard = page.locator('[aria-label="Chess board"]');
    await expect(chessboard).toBeVisible();
  });
});
