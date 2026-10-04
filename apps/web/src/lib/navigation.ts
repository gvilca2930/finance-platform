export function safeRedirectPath(value?: string) {
  if (!value || !value.startsWith('/')) return '/dashboard';
  try {
    const base = new URL('http://finance.local');
    const target = new URL(value, base);
    if (target.origin !== base.origin) return '/dashboard';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/dashboard';
  }
}
