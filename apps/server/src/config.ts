import { z } from 'zod';

const schema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  BATAREYKA_API_KEY: z.string().optional().default(''),
  MINIAPP_URL: z.string().optional().default(''),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional().default(''),
  FIREBASE_SERVICE_ACCOUNT_FILE: z.string().optional().default(''),
  WEBHOOK_URL: z.string().optional().default(''),
  WEBHOOK_SECRET: z.string().optional().default(''),
  SVITLOMAP_BASE: z.string().default('https://api.svitlomap.com.ua'),
  PORT: z.coerce.number().default(3000),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return schema.parse(env);
}
