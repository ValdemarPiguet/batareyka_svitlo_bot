# API svitlomap · версія 1

Базова адреса: `https://api.svitlomap.com.ua`
Формат: JSON, UTF-8. Час графіків — **за Києвом** (`Europe/Kyiv`). Усі методи — `GET`.
CORS відкритий (`Access-Control-Allow-Origin: *`), тож методи можна викликати і з бекенду, і з Mini App у браузері.

| Метод | Ключ | Що повертає |
|---|---|---|
| `/v1/regions` | не потрібен | список областей і їхніх підчерг |
| `/v1/schedule` | не потрібен | графік області або однієї підчерги на сьогодні й завтра + екстрені відключення |
| `/v1/fav` | потрібен (див. нижче) | обране користувача з @svitlomap_bot |

Дані графіків оновлюються кілька разів на добу (робот + «розумне» оновлення раз на 30 хв). Кешуйте відповіді на своєму боці щонайменше на 2–5 хвилин і не звертайтеся на кожен запит користувача.

---

## GET /v1/regions

```json
{ "ok": true, "v": 1, "fetchedAt": "2026-11-20T09:17:00Z",
  "regions": [
    { "oblast": "kyivska-oblast", "name": "Київська область", "status": "ok",
      "updatedAt": "2026-11-20T06:16:00Z", "queues": ["1.1","1.2", "…", "6.2"] }
  ] }
```
- `oblast` — код області, його передаєте в інші методи. 25 кодів, м. Київ — `kyiv`.
- `status`: `ok` — графік є; `nodata`/`stale` — даних немає або вони застарілі.
- `queues` — список підчерг. Порожній, якщо область не публікує графіків (напр. окуповані).

## GET /v1/schedule?oblast=…&queue=…

| Параметр | Обов'язковий | Приклад |
|---|---|---|
| `oblast` | так | `kyivska-oblast` |
| `queue` | ні (без нього — усі підчерги) | `6.1` |

```json
{ "ok": true, "v": 1,
  "oblast": "kyivska-oblast", "name": "Київська область", "status": "ok", "warn": null,
  "sourceUpdatedAt": "2026-11-20T06:16:00Z", "fetchedAt": "2026-11-20T09:17:00Z",
  "timezone": "Europe/Kyiv", "slotMinutes": 30, "today": "2026-11-20",
  "emergency": false, "alerts": [],
  "queues": [
    { "queue": "6.1", "days": [
      { "date": "2026-11-20",
        "slots": "111111111111000000001111111111110000000011111111",
        "outages": [ {"from":"06:00","to":"10:00"}, {"from":"16:00","to":"20:00"} ],
        "unknown": [], "outageHours": 8 },
      { "date": "2026-11-21", "slots": null, "outages": [], "unknown": [], "outageHours": null }
    ] }
  ] }
```
- `slots` — 48 символів, по одному на кожні 30 хв доби з 00:00 за Києвом: `1` світло є, `0` відключення, `?` невідомо. Символ `i` — проміжок від `i×30 хв`.
- `slots: null` — графіка на цей день ще немає (завтрашній зазвичай з'являється ввечері).
- `outages` / `unknown` — те саме, але готовими проміжками `HH:MM`; кінець доби — `24:00`.
- `warn` — текст, якщо частину графіка в джерелі не вдалося прочитати.
- `emergency: true` — по області діють екстрені відключення: графіки можуть не діяти. Деталі в `alerts`: `title`, `text`, `since`, `expires`.
- `sourceUpdatedAt` — час «Оновлено» в джерелі, `fetchedAt` — коли дані забрав робот.

**Помилки** (`ok: false`, поле `error`):

| HTTP | `error` | Причина |
|---|---|---|
| 400 | `oblast_required`, `bad_queue` | не вказано область / підчерга не у форматі `6.1` |
| 404 | `unknown_oblast`, `unknown_queue`, `not_found` | невідомий код / підчерга / метод |
| 503 | `data_unavailable` | дані сайту тимчасово недоступні — повторіть пізніше |

## GET /v1/fav — обране користувача

Повертає підчерги, які людина обрала в @svitlomap_bot. Два способи авторизації:

**1. З Mini App «Світлого запасу»** — передайте рядок `Telegram.WebApp.initData` як є:
```
GET /v1/fav
X-Telegram-Init-Data: query_id=…&user=…&auth_date=…&hash=…
```
Підпис перевіряється токеном бота «Світлий запас» (`ZAPAS_BOT_TOKEN` у Worker). `initData` дійсний 24 години.

**2. З бекенду «Світлого запасу»** (напр., на команду `/battery` в боті, де `initData` немає):
```
GET /v1/fav?tg_id=123456789
Authorization: Bearer <ZAPAS_API_KEY>
```
Ключ зберігайте лише на сервері, ніколи не передавайте в Mini App.

Відповідь:
```json
{ "ok": true, "v": 1, "tgId": 123456789,
  "favorites": [ { "oblast": "kyivska-oblast", "name": "Київська", "queue": "6.1" } ] }
```
Якщо людина не користувалася @svitlomap_bot — `favorites: []`.
Помилки: `401 auth_required`, `401 bad_init_data`, `401 bad_key`, `400 tg_id_required`, `503 not_configured`.

---

## Налаштування Worker (один раз)
Cloudflare → Worker → Settings → Variables and Secrets:
- `ZAPAS_BOT_TOKEN` (**Secret**) — токен бота «Світлий запас» від @BotFather.
- `ZAPAS_API_KEY` (**Secret**) — довгий випадковий рядок (`openssl rand -hex 32`); той самий рядок покладіть у змінні бекенду «Світлого запасу».
Перевірка: `https://api.svitlomap.com.ua/version` → `ZAPAS_BOT_TOKEN: true`, `ZAPAS_API_KEY: true`.

## Стабільність
Формат v1 не змінюється. Нові поля можуть додаватися — ігноруйте невідомі. Несумісні зміни підуть у `/v2/`.
Старі адреси (`/alerts`, `svitlomap.com.ua/data/ua.json`) працюють, але для нових сервісів використовуйте `/v1/`.
