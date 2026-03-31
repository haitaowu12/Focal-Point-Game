/**
 * Task 9: Quick Smoke Test
 * Validates core game functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Focal Point Game - Smoke Tests', () => {
  test('Game loads and basic flow works', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    // Verify lobby loads
    await expect(page.locator('h1')).toContainText('FOCAL POINT');
    
    // Start game
    await page.click('button[data-action="start-game"]');
    await page.waitForTimeout(500);
    
    // Verify character selection loads
    await expect(page.locator('h1')).toContainText('Character Selection');
    
    // Verify DISC Guide button exists
    await expect(page.locator('button[data-action="show-disc-guide"]')).toBeVisible();
    
    // Start round
    await page.click('button[data-action="start-round"]');
    await page.waitForTimeout(500);
    
    // Verify game board loads
    await expect(page.locator('.phase-stepper')).toBeVisible();
    
    // Draw disruption
    await page.click('button[data-action="draw-disruption"]');
    await page.waitForTimeout(500);
    
    // Verify disruption modal appears
    await expect(page.locator('.disruption-modal')).toBeVisible();
    
    // Close modal
    await page.click('button[data-action="close-disruption-modal"]');
    await page.waitForTimeout(300);
    
    // Verify disruption panel shows on board
    await expect(page.locator('.disruption-panel')).toBeVisible();
    
    console.log('✅ Smoke test passed!');
  });
  
  test('Simplified view toggle works', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.click('button[data-action="start-game"]');
    await page.waitForTimeout(300);
    await page.click('button[data-action="start-round"]');
    await page.waitForTimeout(500);
    
    // Draw disruption
    await page.click('button[data-action="draw-disruption"]');
    await page.waitForTimeout(300);
    await page.click('button[data-action="close-disruption-modal"]');
    await page.waitForTimeout(300);
    
    // Toggle view
    const toggleBtn = page.locator('button[data-action="toggle-simplified-view"]');
    await expect(toggleBtn).toBeVisible();
    
    // Switch to focused view
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.focused-view-container')).toBeVisible();
    
    // Switch back
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-grid')).toBeVisible();
    
    console.log('✅ Simplified view test passed!');
  });
  
  test('Back button navigation works', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.click('button[data-action="start-game"]');
    await page.waitForTimeout(300);
    
    // Check back button exists
    const backBtn = page.locator('button[data-action="go-back"]');
    await expect(backBtn).toBeVisible();
    await expect(backBtn).toContainText('Back to Lobby');
    
    console.log('✅ Back button test passed!');
  });
  
  test('Round progress indicator displays', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.click('button[data-action="start-game"]');
    await page.waitForTimeout(300);
    await page.click('button[data-action="start-round"]');
    await page.waitForTimeout(500);
    
    // Check round progress
    const progressContainer = page.locator('.round-progress-container');
    await expect(progressContainer).toBeVisible();
    
    const roundLabel = page.locator('.round-label');
    await expect(roundLabel).toContainText('R1/5');
    
    const progressDots = page.locator('.progress-dot');
    await expect(progressDots).toHaveCount(5);
    
    console.log('✅ Round progress test passed!');
  });
});
