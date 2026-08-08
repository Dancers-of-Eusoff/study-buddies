const BASE = `${import.meta.env.VITE_BASE_URL}/api`

let refreshPromise: Promise<boolean> | null = null;

function refreshToken(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

export default async function apiFetch(path: string, method: string, options: RequestInit = {}): Promise<Response> {
    const isPost = method == 'POST';
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        method: method,
        credentials: 'include',
        headers: {
            ...(isPost && { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
            return res;
        }

        return fetch(`${BASE}${path}`, {
            ...options,
            method: method,
            credentials: 'include',
            method: method,
            headers: {
                ...(isPost && { 'Content-Type': 'application/json' }),
                ...options.headers,
            },
        });
    }

    return res;
}