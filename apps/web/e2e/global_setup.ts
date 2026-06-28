// e2e/global-setup.ts
const BACKEND_URL = 'https://study-buddies-q3rd.onrender.com';

export const TEST_USER = {
  username: 'e2e_test_user',
  password: 'TestPass123!',
};

async function globalSetup() {
  const res = await fetch(`${BACKEND_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });

  // Ignore "already exists" conflicts, but surface real failures
  if (!res.ok && res.status !== 409) {
    const body = await res.text();
    throw new Error(`Failed to seed test user: ${res.status} ${body}`);
  }
}

export default globalSetup;