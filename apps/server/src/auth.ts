import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Проверка Telegram.WebApp.initData:
 * secret = HMAC_SHA256(key="WebAppData", botToken), hash = HMAC_SHA256(secret, data_check_string).
 * Возвращает пользователя или null, если подпись неверна или данные старше maxAgeSec.
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 24 * 3600,
  nowSec = Math.floor(Date.now() / 1000),
): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheck).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get('auth_date'));
  if (!authDate || nowSec - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get('user') ?? '') as TelegramUser;
    return typeof user.id === 'number' ? user : null;
  } catch {
    return null;
  }
}

/** Для тестов и локальной разработки: подписать initData токеном бота. */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  const dataCheck = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update(dataCheck).digest('hex'));
  return params.toString();
}
