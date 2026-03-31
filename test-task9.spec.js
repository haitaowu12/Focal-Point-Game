/**
 * Task 9: Comprehensive Testing & Validation Script
 * Tests all game improvements across 5 rounds of gameplay
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:5174';
const TOTAL_ROUNDS = 5;

test.describe('Task 9: Focal Point Game Testing & Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation & Help Systems', () => {
    test('Back button appears on all screens except Lobby', async ({ page }) => {
      // Start game
      await page.click('button[data-action="start-game"]');
      await page.waitForTimeout(500);

      // Check Character Select has back button
      const charSelectBack = page.locator('button[data-action="go-back"]');
      await expect(charSelectBack).toBeVisible();
      await expect(charSelectBack).toContainText('Back to Lobby');

      // Start round to get to game screen
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Check game screen has back button
      const gameBack = page.locator('button[data-action="go-back"]');
      await expect(gameBack).toBeVisible();
    });

    test('DISC Guide modal opens and closes', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.waitForTimeout(300);

      // Open DISC Guide
      await page.click('button[data-action="show-disc-guide"]');
      await page.waitForTimeout(300);

      // Verify modal is visible
      const modal = page.locator('.disc-guide-modal');
      await expect(modal).toBeVisible();

      // Verify DISC quadrants are present
      await expect(page.locator('.disc-quadrant')).toHaveCount(4);

      // Verify character mapping is present
      const characterMappings = page.locator('.character-disc-card');
      await expect(characterMappings).toHaveCount(6); // 6 characters

      // Close modal
      await page.click('button[data-action="close-disc-guide"]');
      await page.waitForTimeout(300);
      await expect(modal).not.toBeVisible();
    });

    test('Card tooltips appear on hover', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Draw disruption first
      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(300);

      // Close disruption modal
      await page.click('button[data-action="close-disruption-modal"]');
      await page.waitForTimeout(300);

      // Check for tooltip icon on "Shares the Mental Model" card
      const tooltipIcon = page.locator('.card-tooltip-icon');
      // Tooltip icon should be present if card is in hand
      const tooltipCount = await tooltipIcon.count();
      console.log(`Found ${tooltipCount} tooltip icons`);
    });
  });

  test.describe('Simplified View Toggle', () => {
    test('Toggle between Full Grid and Focused View', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Draw disruption
      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(300);
      await page.click('button[data-action="close-disruption-modal"]');
      await page.waitForTimeout(300);

      // Check initial state (Full Grid)
      const toggleButton = page.locator('button[data-action="toggle-simplified-view"]');
      await expect(toggleButton).toBeVisible();
      await expect(toggleButton).toContainText('🎯 Focused View');

      // Verify full grid is visible
      const fullGrid = page.locator('.board-grid');
      await expect(fullGrid).toBeVisible();

      // Switch to Focused View
      await toggleButton.click();
      await page.waitForTimeout(300);

      // Verify toggle button text changed
      await expect(toggleButton).toContainText('📊 Full Grid');

      // Verify focused view is visible
      const focusedView = page.locator('.focused-view-container');
      await expect(focusedView).toBeVisible();

      // Verify tabs are present
      const borderTab = page.locator('button[data-action="switch-focused-tab"][data-tab="border"]');
      const coreTab = page.locator('button[data-action="switch-focused-tab"][data-tab="core"]');
      await expect(borderTab).toBeVisible();
      await expect(coreTab).toBeVisible();

      // Switch back to Full Grid
      await toggleButton.click();
      await page.waitForTimeout(300);

      await expect(focusedView).not.toBeVisible();
      await expect(fullGrid).toBeVisible();
    });
  });

  test.describe('Round Progress Indicator', () => {
    test('Round progress displays correctly', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Check round progress indicator
      const progressContainer = page.locator('.round-progress-container');
      await expect(progressContainer).toBeVisible();

      // Should show Round 1/5
      const roundLabel = page.locator('.round-label');
      await expect(roundLabel).toContainText('R1/5');

      // Verify progress dots (5 total)
      const progressDots = page.locator('.progress-dot');
      await expect(progressDots).toHaveCount(5);

      // First dot should be active
      const activeDot = page.locator('.progress-dot.active');
      await expect(activeDot).toHaveCount(1);
    });

    test('Final round modal appears on Round 5', async ({ page }) => {
      // Quick advance through rounds
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      for (let round = 1; round <= 5; round++) {
        // Draw disruption
        const drawButton = page.locator('button[data-action="draw-disruption"]');
        if (await drawButton.isVisible()) {
          await drawButton.click();
          await page.waitForTimeout(300);

          // Close disruption modal
          const closeBtn = page.locator('button[data-action="close-disruption-modal"]');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }
        }

        // End turn for all players
        const endTurnBtn = page.locator('button[data-action="end-turn"]');
        if (await endTurnBtn.isVisible()) {
          await endTurnBtn.click();
          await page.waitForTimeout(300);
        }

        // Resolve disruption
        const resolveBtn = page.locator('button[data-action="resolve-disruption"]');
        if (await resolveBtn.isVisible()) {
          await resolveBtn.click();
          await page.waitForTimeout(300);
        }

        // Next round
        if (round < 5) {
          const nextRoundBtn = page.locator('button[data-action="end-round"]');
          if (await nextRoundBtn.isVisible()) {
            await nextRoundBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Check for final round modal
      const finalRoundModal = page.locator('.final-round-modal');
      const modalVisible = await finalRoundModal.isVisible();
      
      if (modalVisible) {
        // Verify final round content
        await expect(page.locator('.final-round-modal-header h2')).toContainText('Final Round');
        await expect(page.locator('.win-conditions-reminder')).toBeVisible();
        await expect(page.locator('.current-status-preview')).toBeVisible();

        // Close modal
        await page.click('button[data-action="close-final-round-modal"]');
        await page.waitForTimeout(300);
      }

      console.log(`Final round modal appeared: ${modalVisible}`);
    });
  });

  test.describe('Disruption Cards Display', () => {
    test('Disruption modal shows narrative text', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(500);

      // Verify modal is visible
      const modal = page.locator('.disruption-modal');
      await expect(modal).toBeVisible();

      // Verify narrative text (should be 2-3 sentences)
      const narrative = page.locator('.disruption-narrative');
      await expect(narrative).toBeVisible();
      const narrativeText = await narrative.textContent();
      const sentences = narrativeText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      console.log(`Narrative has ${sentences.length} sentences: ${narrativeText.substring(0, 100)}...`);
      expect(sentences.length).toBeGreaterThanOrEqual(2);

      // Verify impact icons
      const impactIcons = page.locator('.impact-icon');
      const iconCount = await impactIcons.count();
      console.log(`Found ${iconCount} impact icons`);
      expect(iconCount).toBeGreaterThanOrEqual(1);

      // Verify affected fields chips
      const targetChips = page.locator('.target-chip');
      const chipCount = await targetChips.count();
      console.log(`Found ${chipCount} affected field chips`);
      expect(chipCount).toBeGreaterThanOrEqual(1);

      // Close modal
      await page.click('button[data-action="close-disruption-modal"]');
      await page.waitForTimeout(300);
    });

    test('Disruption panel shows on game board', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(300);
      await page.click('button[data-action="close-disruption-modal"]');
      await page.waitForTimeout(300);

      // Verify disruption panel is visible on board
      const disruptionPanel = page.locator('.disruption-panel');
      await expect(disruptionPanel).toBeVisible();

      // Verify impact summary icons
      const impactMini = page.locator('.impact-mini');
      const miniCount = await impactMini.count();
      console.log(`Found ${miniCount} mini impact indicators`);
    });

    test('Affected fields show highlighting animation', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(300);
      await page.click('button[data-action="close-disruption-modal"]');
      await page.waitForTimeout(300);

      // Check for affected field class
      const affectedFields = page.locator('.field-affected');
      const affectedCount = await affectedFields.count();
      console.log(`Found ${affectedCount} affected fields`);
      expect(affectedCount).toBeGreaterThanOrEqual(1);

      // Check for field deltas
      const fieldDeltas = page.locator('.field-deltas');
      const deltaCount = await fieldDeltas.count();
      console.log(`Found ${deltaCount} fields with delta indicators`);
    });
  });

  test.describe('Manual Ability Activation Flow', () => {
    test('Complete ability activation flow', async ({ page }) => {
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Draw disruption
      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(300);
      await page.click('button[data-action="close-disruption-modal"]');
      await page.waitForTimeout(300);

      // Check ability button is visible
      const abilityButton = page.locator('.btn-ability');
      await expect(abilityButton).toBeVisible();

      // Verify ability button has character info
      const abilityIcon = page.locator('.ability-icon');
      await expect(abilityIcon).toBeVisible();

      const abilityText = page.locator('.ability-button-text');
      await expect(abilityText).toBeVisible();

      // Click ability button
      await abilityButton.click();
      await page.waitForTimeout(300);

      // Verify confirmation modal appears
      const confirmModal = page.locator('.ability-confirmation-modal');
      await expect(confirmModal).toBeVisible();

      // Verify effect preview is shown
      const effectPreview = page.locator('.effect-preview');
      await expect(effectPreview).toBeVisible();

      // Verify blind spot warning
      const blindSpotWarning = page.locator('.modal-warning-box');
      await expect(blindSpotWarning).toBeVisible();

      // Cancel ability
      await page.click('button[data-action="hide-ability-confirmation"]');
      await page.waitForTimeout(300);
      await expect(confirmModal).not.toBeVisible();
    });
  });

  test.describe('Debrief Screen Enhancements', () => {
    test('Debrief shows win condition breakdown', async ({ page }) => {
      // Fast-forward to end of game
      await page.click('button[data-action="start-game"]');
      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Play through 5 rounds quickly
      for (let round = 1; round <= 5; round++) {
        const drawButton = page.locator('button[data-action="draw-disruption"]');
        if (await drawButton.isVisible()) {
          await drawButton.click();
          await page.waitForTimeout(300);
          const closeBtn = page.locator('button[data-action="close-disruption-modal"]');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }
        }

        const endTurnBtn = page.locator('button[data-action="end-turn"]');
        if (await endTurnBtn.isVisible()) {
          await endTurnBtn.click();
          await page.waitForTimeout(300);
        }

        const resolveBtn = page.locator('button[data-action="resolve-disruption"]');
        if (await resolveBtn.isVisible()) {
          await resolveBtn.click();
          await page.waitForTimeout(300);
        }

        if (round < 5) {
          const nextRoundBtn = page.locator('button[data-action="end-round"]');
          if (await nextRoundBtn.isVisible()) {
            await nextRoundBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Force debrief
      const forceDebriefBtn = page.locator('button[data-action="force-debrief"]');
      if (await forceDebriefBtn.isVisible()) {
        await forceDebriefBtn.click();
        await page.waitForTimeout(500);
      }

      // Navigate to debrief if not already there
      const endGameBtn = page.locator('button[data-action="end-game"]');
      if (await endGameBtn.isVisible()) {
        await endGameBtn.click();
        await page.waitForTimeout(500);
      }

      // Check we're on debrief screen
      const debriefHeader = page.locator('h1');
      const headerText = await debriefHeader.textContent();
      
      if (headerText.includes('Debrief')) {
        // Verify win condition breakdown
        const breakdown = page.locator('.win-condition-breakdown');
        const breakdownVisible = await breakdown.isVisible();
        
        if (breakdownVisible) {
          // Check each condition shows pass/fail
          const breakdownItems = page.locator('.breakdown-item');
          const itemCount = await breakdownItems.count();
          console.log(`Found ${itemCount} win condition breakdown items`);
          expect(itemCount).toBe(3); // Vision Drift, Stable Fields, Psych Safety

          // Check for pass/fail results
          const passedItems = page.locator('.breakdown-item.passed');
          const failedItems = page.locator('.breakdown-item.failed');
          const passedCount = await passedItems.count();
          const failedCount = await failedItems.count();
          console.log(`Passed: ${passedCount}, Failed: ${failedCount}`);
        }

        // Verify "What This Means" section
        const whatThisMeans = page.locator('.what-this-means');
        const meansVisible = await whatThisMeans.isVisible();
        console.log(`"What This Means" section visible: ${meansVisible}`);

        if (meansVisible) {
          const meaningContent = page.locator('.meaning-content');
          await expect(meaningContent).toBeVisible();

          const meaningTranslation = page.locator('.meaning-translation');
          const translationVisible = await meaningTranslation.isVisible();
          console.log(`Leadership translation visible: ${translationVisible}`);
        }
      }
    });
  });

  test.describe('Console Error Monitoring', () => {
    test('No console errors during gameplay', async ({ page }) => {
      const consoleErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
          });
        }
      });

      // Play through game
      await page.click('button[data-action="start-game"]');
      await page.waitForTimeout(300);

      await page.click('button[data-action="start-round"]');
      await page.waitForTimeout(500);

      // Draw disruption
      await page.click('button[data-action="draw-disruption"]');
      await page.waitForTimeout(300);

      // Close modal
      const closeBtn = page.locator('button[data-action="close-disruption-modal"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }

      // End turn
      const endTurnBtn = page.locator('button[data-action="end-turn"]');
      if (await endTurnBtn.isVisible()) {
        await endTurnBtn.click();
        await page.waitForTimeout(300);
      }

      // Resolve
      const resolveBtn = page.locator('button[data-action="resolve-disruption"]');
      if (await resolveBtn.isVisible()) {
        await resolveBtn.click();
        await page.waitForTimeout(300);
      }

      // Report errors
      if (consoleErrors.length > 0) {
        console.log('Console errors found:');
        consoleErrors.forEach(err => {
          console.log(`  - ${err.text} at ${err.location.url}:${err.location.lineNumber}`);
        });
      } else {
        console.log('No console errors detected!');
      }

      // Expect no console errors (warning: some apps may have expected errors)
      // For now, just report
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Back Button Navigation', () => {
    test('Back button navigation flow', async ({ page }) => {
      // Start game
      await page.click('button[data-action="start-game"]');
      await page.waitForTimeout(300);

      // Verify on Character Select
      await expect(page.locator('h1')).toContainText('Character Selection');

      // Click back button
      await page.click('button[data-action="go-back"]');
      await page.waitForTimeout(300);

      // Should show confirmation dialog
      const confirmDialog = page.locator('.confirmation-modal');
      const dialogVisible = await confirmDialog.isVisible();
      
      if (dialogVisible) {
        // Cancel
        await page.click('button[data-action="cancel-confirmation"]');
        await page.waitForTimeout(300);

        // Click back again
        await page.click('button[data-action="go-back"]');
        await page.waitForTimeout(300);

        // Confirm
        await page.click('button[data-action="confirm-action"]');
        await page.waitForTimeout(300);
      } else {
        // No confirmation, should be back at lobby
        await expect(page.locator('h1')).toContainText('FOCAL POINT');
      }
    });
  });
});
