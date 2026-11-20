import { Bot, InlineKeyboard, type Context } from 'grammy';
import { formatNext, formatPlan, parseBatteryArgs } from '../format';
import type { BatteryService } from '../service';

const HELP =
  '🔋 Я Батарейка. Підкажу, чи вистачить заряду батареї до включення світла за графіком.\n\n' +
  'Надішліть заряд у відсотках, наприклад 58, або /battery 58.\n' +
  'Якщо світло дадуть не за графіком: /battery 58 3:30 (ще 3 год 30 хв).\n' +
  '/plan — найближче відключення і скільки потрібно заряду.';

export function createBot(token: string, service: BatteryService, miniAppUrl: string): Bot {
  const bot = new Bot(token);
  const appKeyboard = () =>
    miniAppUrl ? new InlineKeyboard().webApp('Відкрити застосунок', miniAppUrl) : undefined;

  const answerPlan = async (ctx: Context, text: string) => {
    const args = parseBatteryArgs(text);
    if (!args) return void (await ctx.reply('Вкажіть заряд від 0 до 100, наприклад: /battery 58'));
    const outcome = await service.plan(ctx.from!.id, args.soc, args.minutes);
    const kb = outcome.kind === 'ok' ? (miniAppUrl ? new InlineKeyboard().webApp('Детальніше', miniAppUrl) : undefined) : appKeyboard();
    await ctx.reply(formatPlan(outcome), { reply_markup: kb });
  };

  bot.command('start', async (ctx) => {
    await service.ensureUser(ctx.from!.id, ctx.from!.first_name);
    const home = await service.ensureHome(ctx.from!.id);
    const queue = home.oblast && home.subqueue ? `\n\nВашу підчергу ${home.subqueue} взято з «Обраного» svitlomap.` : '';
    await ctx.reply(HELP + queue, { reply_markup: appKeyboard() });
  });
  bot.command('help', (ctx) => ctx.reply(HELP, { reply_markup: appKeyboard() }));
  bot.command('battery', (ctx) => answerPlan(ctx, ctx.match));
  bot.command('plan', async (ctx) => {
    await ctx.reply(formatNext(await service.next(ctx.from!.id)), { reply_markup: appKeyboard() });
  });
  bot.hears(/^\s*\d{1,3}\s*%?(\s+\d{1,2}(:\d{1,2})?)?\s*$/, (ctx) => answerPlan(ctx, ctx.message!.text!));

  bot.catch((err) => console.error('bot error', err.error));
  return bot;
}
