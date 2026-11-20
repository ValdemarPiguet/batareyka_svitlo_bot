# Батарейка (@batareyka_svitlo_bot)

Telegram-бот «Батарейка» + Mini App, который отвечает на вопрос «хватит ли заряда батареи до включения света по графику» и советует, что выключить.
Полная спецификация: https://claude.ai/artifact/T8a5mpAZRLfpHpiPDmr3iE

## Стек
- Монорепо: `packages/calc` (чистый TS, логика расчёта + тесты), `apps/miniapp` (React + TypeScript + Vite + Tailwind, деплой на Vercel), `apps/server` (Node + Express + grammY: бот и API). Деплой: один проект Vercel из корня — Mini App статикой + бэкенд функцией `api/index.ts` (Render отказались 2026-11-20).
- БД: Firebase Firestore. Авторизация только по Telegram ID, initData проверяется на сервере (без Firebase Auth).
- Графики отключений: api.svitlomap.com.ua (данные alerts.org.ua, указывать источник).
- Язык интерфейса: украинский по умолчанию.

## Расчёт (packages/calc)
- E_avail = C_Wh × (SOC − SOC_min) × η   (по умолчанию η = 0.9, SOC_min 20% LiFePO4 / 50% свинец)
- Нагрузка = Σ P_avg включённых устройств + P_idle инвертора (по умолчанию 40 Вт)
- E_need = 1.1 × t_off × нагрузка + Σ разовых использований (Вт·ч за раз)
- Подбор: сначала priority 1 (обязательно), затем 2, затем 3 по order, пока E_need ≤ E_avail; остаток → «чайник ещё N раз».
- Проверка пиков: сумма peakW одновременно работающих ≤ inverterMaxW, иначе предупреждение.
- Тестовый пример: 5 кВт·ч, 58%, мин. 20% → ~1710 Вт·ч; нагрузка 205 Вт; до включения 4 ч 10 мин → нужно ~940 Вт·ч.

## Модель данных (Firestore)
- users/{tgId}: name, lang, plan, notifyBeforeMin
- users/{tgId}/homes/{homeId}: title, oblast, subqueue, batteryWh, socMinPct, idleW, efficiency, inverterMaxW, chemistry
- homes/{homeId}/devices/{id}: name, templateId, mode (constant|cyclic|perUse), avgW, peakW, whPerUse, priority (1|2|3), order, source (template|label|measured|history), enabled
- homes/{homeId}/readings, plans, calibrations; templates/{id}

## Этапы
1. MVP: профиль, устройства из шаблонов, ручной ввод %, план, `/battery <процент>`.
2. Мастер калибровки через экран инвертора, уведомления по графику, сверка прогноза с фактом.
3. Интеграция с инвертором (сначала домашний инвертор владельца), платные функции через Stars.

## Правила работы
- Логика расчёта только в packages/calc, покрыта тестами; Mini App и сервер её импортируют.
- Платежи не включать, пока не решён вопрос с ограничениями по должности владельца.
