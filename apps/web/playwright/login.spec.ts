import { test, expect } from '@playwright/test';
import { TEST_USER } from './globalSetup';

test('redirects to lobby after login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(TEST_USER.username);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /log me in/i }).click();

  await expect(page).toHaveURL('/lobby');
});

test('shows error on wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(TEST_USER.username);
  await page.getByLabel(/password/i).fill('wrong');
  await page.getByRole('button', { name: /log me in/i }).click();

  await expect(page.getByText(/wrong username or password/i)).toBeVisible();
  await expect(page).toHaveURL('/login');
});