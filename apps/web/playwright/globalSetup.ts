const BASE = 'http://localhost:8080';

export const TEST_USER = { username: 'playwright_user', password: 'playwright_password' };

export default async function globalSetup() {
    const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
    });
    if (!res.ok && res.status !== 409) {
        throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
    }
}