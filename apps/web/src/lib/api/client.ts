function apiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) throw new Error('NEXT_PUBLIC_API_URL is required');
  return value.replace(/\/$/, '');
}

const ACCESS_KEY = 'finance.access';
const REFRESH_KEY = 'finance.refresh';
let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
const storage = () => (typeof window === 'undefined' ? null : window.sessionStorage);
export const tokens = {
  access: () => storage()?.getItem(ACCESS_KEY) ?? null,
  refresh: () => storage()?.getItem(REFRESH_KEY) ?? null,
  set: (access: string, refresh: string) => {
    storage()?.setItem(ACCESS_KEY, access);
    storage()?.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    storage()?.removeItem(ACCESS_KEY);
    storage()?.removeItem(REFRESH_KEY);
  },
};

async function refreshSession(): Promise<boolean> {
  const refreshToken = tokens.refresh();
  if (!refreshToken) return false;
  const response = await fetch(`${apiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    tokens.clear();
    return false;
  }
  const data = (await response.json()) as { accessToken: string; refreshToken: string };
  tokens.set(data.accessToken, data.refreshToken);
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const access = tokens.access();
  if (access) headers.set('Authorization', `Bearer ${access}`);
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con la API.');
  }
  if (response.status === 401 && retry && !path.includes('/auth/refresh')) {
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });
    if (await refreshPromise) return api<T>(path, init, false);
    window.dispatchEvent(new Event('finance:unauthorized'));
  }
  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = undefined;
    }
    const message =
      typeof details === 'object' && details && 'message' in details
        ? Array.isArray(details.message)
          ? details.message.join('. ')
          : String(details.message)
        : response.status >= 500
          ? 'No pudimos completar la operación.'
          : 'La solicitud no pudo completarse.';
    throw new ApiError(response.status, message, details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const queryString = (
  values: Record<string, string | number | boolean | undefined | null>,
) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : '';
};
