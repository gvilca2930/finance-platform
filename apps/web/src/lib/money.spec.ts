import { describe, expect, it } from 'vitest';
import { formatMoney, normalizeMoneyInput, signedMoney } from './money';
import {
  canAccessWorkspaceRoute,
  canManageMembers,
  canManageWorkspace,
  canWriteFinance,
} from './permissions';
import { safeRedirectPath } from './navigation';

describe('money helpers', () => {
  it('formats decimal strings without using arithmetic', () => {
    expect(formatMoney('1250.50', 'PEN')).toBe('S/ 1,250.50');
    expect(formatMoney('-20.5', 'USD')).toBe('-US$ 20.50');
  });
  it('normalizes input while preserving decimal text', () => {
    expect(normalizeMoneyInput('1 250,678')).toBe('1250.67');
    expect(signedMoney('85.40', 'EXPENSE')).toBe('− S/ 85.40');
  });
});

describe('role presentation', () => {
  it('hides mutations from VIEWER and management from STAFF', () => {
    expect(canWriteFinance('VIEWER')).toBe(false);
    expect(canWriteFinance('STAFF')).toBe(true);
    expect(canManageMembers('STAFF')).toBe(false);
    expect(canManageMembers('ADMIN')).toBe(true);
    expect(canManageWorkspace('ADMIN')).toBe(false);
    expect(canManageWorkspace('OWNER')).toBe(true);
  });
  it('guards administrative routes using workspace type and role', () => {
    const personalOwner = { role: 'OWNER' as const, workspace: { type: 'PERSONAL' as const } };
    const businessAdmin = { role: 'ADMIN' as const, workspace: { type: 'BUSINESS' as const } };
    expect(canAccessWorkspaceRoute('/members', personalOwner)).toBe(false);
    expect(canAccessWorkspaceRoute('/members', businessAdmin)).toBe(true);
    expect(canAccessWorkspaceRoute('/settings/workspace', businessAdmin)).toBe(false);
    expect(canAccessWorkspaceRoute('/settings/workspace', personalOwner)).toBe(true);
  });
});

describe('navigation helpers', () => {
  it('only permits local redirect paths', () => {
    expect(safeRedirectPath('/accept-invitation?token=abc')).toBe('/accept-invitation?token=abc');
    expect(safeRedirectPath('https://example.com')).toBe('/dashboard');
    expect(safeRedirectPath('//example.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\example.com')).toBe('/dashboard');
  });
});
