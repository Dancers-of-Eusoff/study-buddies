// LoginPage.test.tsx
import { render } from 'vitest-browser-react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { page } from '@vitest/browser/context';
import LoginPage from './LoginPage';
import { loginUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

vi.mock('../api/authApi');
vi.mock('../context/AuthContext');

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ login: mockLogin });
  });

  function renderPage() {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  }

  it('shows validation errors when fields are empty', async () => {
    renderPage();
    await page.getByRole('button', { name: /log me in/i }).click();

    await expect.element(page.getByText('Username is required')).toBeInTheDocument();
    await expect.element(page.getByText('Password is required')).toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  });

  it('clears a field error once the user starts typing', async () => {
    renderPage();
    await page.getByRole('button', { name: /log me in/i }).click();
    await page.getByLabelText(/username/i).fill('fei');

    await expect.element(page.getByText('Username is required')).not.toBeInTheDocument();
  });

  it('calls loginUser and login() on successful submit', async () => {
    (loginUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 'abc123',
      userId: '1',
      username: 'fei',
    });

    renderPage();
    await page.getByLabelText(/username/i).fill('fei');
    await page.getByLabelText(/password/i).fill('secret');
    await page.getByRole('button', { name: /log me in/i }).click();

    await expect.poll(() => loginUser).toHaveBeenCalledWith('fei', 'secret');
    expect(mockLogin).toHaveBeenCalledWith('abc123', { userId: '1', username: 'fei' });
  });

  it('shows an error message when login fails', async () => {
    (loginUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

    renderPage();
    await page.getByLabelText(/username/i).fill('fei');
    await page.getByLabelText(/password/i).fill('wrong');
    await page.getByRole('button', { name: /log me in/i }).click();

    await expect.element(page.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('disables the submit button while loading', async () => {
    (loginUser as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {})); // never resolves

    renderPage();
    await page.getByLabelText(/username/i).fill('fei');
    await page.getByLabelText(/password/i).fill('secret');
    await page.getByRole('button', { name: /log me in/i }).click();

    await expect.element(page.getByRole('button', { name: /logging in/i })).toBeDisabled();
  });
});