import { test, expect } from '@playwright/test';
import writing from '../src/json/writing.json' with { type: 'json' };

test.describe('Visual Regression', () => {
  const staticRoutes = [
    { name: 'home', path: '/' },
    { name: 'writing-list', path: '/writing' },
    { name: 'chess', path: '/chess', selector: '#chess' },
    { name: 'dominion', path: '/dominion', selector: '.markdown' },
    { name: 'go', path: '/go', selector: '#go-game' },
    { name: 'slide-puzzles', path: '/slide-puzzles', selector: '.markdown' },
    { name: 'marriage', path: '/marriage', selector: '#tax-explorer' },
    { name: 'projects', path: '/projects', selector: '#project-description-list' },
    { name: 'talks', path: '/talks', selector: '.markdown' },
    { name: 'papers', path: '/papers', selector: '.talks-container' },
    { name: 'resume', path: '/resume', selector: '#resume' },
    { name: 'contact', path: '/contact', selector: '.contact-container' },
  ];

  for (const route of staticRoutes) {
    test(`route: ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('load');
      if (route.selector) {
        await page.waitForSelector(route.selector);
      }
      await expect(page).toHaveScreenshot(`${route.name}-page.png`);
    });
  }

  // Dynamically create tests for each blog post
  for (const post of writing) {
    if (post.released && !post.externalUrl) {
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