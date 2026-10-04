import { beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

describe('API client refresh', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test/api/v1');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { sessionStorage: new MemoryStorage(), dispatchEvent: vi.fn() },
    });
  });

  it('rotates tokens and retries an unauthorized request once', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { api, tokens } = await import('./client');
    tokens.set('old-access', 'old-refresh');
    await expect(api<{ ok: boolean }>('/protected')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokens.access()).toBe('new-access');
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-access');
  });
});
