// e2e/login.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USER } from './global_setup';

test('user can log in and is redirected to the lobby', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/username/i).fill(TEST_USER.username);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /log me in/i }).click();

  await expect(page).toHaveURL('/lobby');
});

test('shows an error on invalid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/username/i).fill(TEST_USER.username);
  await page.getByLabel(/password/i).fill('wrong-password');
  await page.getByRole('button', { name: /log me in/i }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  await expect(page).toHaveURL('/login');
});