const BASE = `${import.meta.env.VITE_BASE_URL}/api`

export default async function apiFetch(path: string, method: string, options: RequestInit = {}): Promise<Response> {
    const isPost = method == 'POST';
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        method: method,
        credentials: 'include',
        headers: {
            ...(isPost && {'Content-Type': 'application/json'}),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        const refreshed = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        })
        if (!refreshed.ok) {
            return res
        }

        return fetch(`${BASE}${path}`, {
            ...options,
            credentials: 'include',
            headers: {
                ...(isPost && { 'Content-Type': 'application/json' }),
                ...options.headers,
            },
        });
    }

    return res;
}