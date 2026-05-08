const BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface RequestOptions extends RequestInit {
  token?: string;
  _retry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, _retry, ...init } = options;

  const headers: Record<string, string> = {
    ...(init.body !== undefined && init.body !== null ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  // Auto-refresh expired access token once then retry the original request
  if (res.status === 401 && token && !_retry) {
    try {
      const { accessToken: newToken } = await request<{ accessToken: string }>(
        '/api/auth/refresh',
        { method: 'POST', _retry: true },
      );
      // Notify the store so future calls use the fresh token
      const { useUserStore } = await import('../stores/userStore');
      useUserStore.getState().setAccessToken(newToken);
      return request<T>(path, { ...options, token: newToken, _retry: true });
    } catch {
      // refresh failed — fall through to throw the original 401
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
};
