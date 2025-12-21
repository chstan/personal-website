import { test, expect } from '@playwright/test';
import writing from '../src/json/writing.json' with { type: 'json' };

test.describe('Visual Regression', () => {
  test('home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('home-page.png');
  });

  test('writing list page', async ({ page }) => {
    await page.goto('/writing');
    await expect(page).toHaveScreenshot('writing-list-page.png');
  });

  test('chess page', async ({ page }) => {
    await page.goto('/chess');
    await page.waitForSelector('#chess'); 
    await expect(page).toHaveScreenshot('chess-page.png');
  });

  // Dynamically create tests for each blog post
  for (const post of writing) {
    if (post.released) {
      test(`blog post: ${post.label}`, async ({ page }) => {
        await page.goto(`/writing/${post.label}`);
        await page.waitForLoadState('networkidle');
        // Wait for the markdown content to be rendered
        await page.waitForSelector('article .markdown');
        await expect(page).toHaveScreenshot(`blog-post-${post.label}.png`);
      });
    }
  }
});