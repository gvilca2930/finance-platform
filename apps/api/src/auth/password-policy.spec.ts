import { PASSWORD_PATTERN } from './password-policy';

describe('password policy', () => {
  it.each(['Secure123', 'Finance2026'])('accepts a reasonable password: %s', (password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(true);
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoNumbersHere'])(
    'rejects a weak password: %s',
    (password) => {
      expect(PASSWORD_PATTERN.test(password)).toBe(false);
    },
  );
});
