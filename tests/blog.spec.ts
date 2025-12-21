import { test, expect } from '@playwright/test';
import writing from '../src/json/writing.json' with { type: 'json' };

test.describe('Blog Content Loading', () => {
  test('should load the list of blog posts from JSON', async ({ page }) => {
    await page.goto('/writing');
    
    // Check if the page title or a header is present
    await expect(page.locator('h3#name-header')).toContainText('Conrad Stansbury');
    
    // Verify that blog posts from writing.json are rendered
    for (const post of writing) {
      const postTitle = page.locator(`h2:has-text("${post.title}")`);
      await expect(postTitle).toBeVisible();
      
      const postShort = page.locator(`p.blog-short:has-text("${post.short}")`);
      await expect(postShort).toBeVisible();
    }
  });

  test('should load individual blog post content', async ({ page }) => {
    // Pick a blog post that is "released" or just any post that has a corresponding .md file
    const releasedPost = writing.find(p => p.released) || writing[0];
    
    await page.goto(`/writing/${releasedPost.label}`);
    
    // The BlogItem component uses DynamicMarkdown which fetches the .md file
    // Wait for the content to load
    await page.waitForLoadState('networkidle');
    
    const article = page.locator('article .markdown');
    await expect(article).toBeVisible();
    
    // Check if the content is not empty
    const textContent = await article.innerText();
    expect(textContent.length).toBeGreaterThan(0);
    
    // Check for breadcrumb
    await expect(page.locator('header.breadcrumb')).toContainText('Writing');
  });
});
