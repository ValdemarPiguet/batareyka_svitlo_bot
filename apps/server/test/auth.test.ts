import { describe, expect, it } from 'vitest';
import { signInitData, verifyInitData } from '../src/auth';

const TOKEN = '123:abc';
const now = 1_800_000_000;
const fields = { auth_date: String(now - 60), query_id: 'q', user: JSON.stringify({ id: 42, first_name: 'Віталій' }) };

describe('verifyInitData', () => {
  it('accepts a correctly signed payload', () => {
    expect(verifyInitData(signInitData(fields, TOKEN), TOKEN, 86400, now)?.id).toBe(42);
  });
  it('rejects a wrong token, tampering and stale data', () => {
    const s = signInitData(fields, TOKEN);
    expect(verifyInitData(s, '999:zzz', 86400, now)).toBeNull();
    expect(verifyInitData(s.replace('42', '43'), TOKEN, 86400, now)).toBeNull();
    expect(verifyInitData(s, TOKEN, 86400, now + 2 * 86400)).toBeNull();
    expect(verifyInitData('', TOKEN)).toBeNull();
  });
});
