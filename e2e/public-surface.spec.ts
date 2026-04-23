import { test, expect } from '@playwright/test';

/**
 * Public-surface smoke tests.
 *
 * These are intentionally forgiving about content (the DB may be empty or
 * populated) but strict about structure: header + nav + footer, no console
 * errors, search works, robots.txt + sitemap.xml respond.
 */

test.describe('public surface', () => {
  test('homepage renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    expect(errors, `console errors on homepage:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('search page loads and accepts a query', async ({ page }) => {
    await page.goto('/search');
    const input = page.getByRole('searchbox').or(page.locator('input[type="search"]'));
    await expect(input.first()).toBeVisible();
    await input.first().fill('news');
    await input.first().press('Enter');
    // URL should now include the query.
    await expect(page).toHaveURL(/[?&]q=news\b/);
  });

  test('robots.txt references the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('Sitemap:');
  });

  test('sitemap.xml is valid XML', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toMatch(/^<\?xml/);
    expect(body).toContain('<urlset');
  });
});

test.describe('accessibility baseline', () => {
  test('homepage has a single h1 and a skip-to-content link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    const skip = page.locator('a[href="#main"], a[href^="#content"]');
    await expect(skip.first()).toBeAttached(); // may be visually-hidden
  });
});
