import { test, expect } from '@playwright/test';

test('visual regression tests', async ({ page }) => {
  // Home Page
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-page.png');

  // Writing / Blog
  await page.goto('/writing');
  await expect(page).toHaveScreenshot('writing-page.png');

  // Chess Page
  await page.goto('/chess');
  // Wait for the chessboard or image to load if necessary
  await page.waitForSelector('#chess'); 
  await expect(page).toHaveScreenshot('chess-page.png');
});
