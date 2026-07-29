# Turon Tour API (Cloudflare Worker)

Маленький бэкенд, который читает туры/экскурсии/страховки из Google Sheet
и отдаёт их фронту в JSON, а заявки на бронирование дописывает обратно в
таблицу. Пока `js/config.js` содержит пустой `apiBaseUrl`, сайт работает
на встроенных моках и этот воркер не нужен. Разворачивайте его, когда
будете готовы подключить реальную таблицу.

## 1. Создать Google Sheet

Создайте таблицу с шестью листами (регистр названий важен, воркер читает
их по имени):

### Лист `Tours`
| id | slug | title | country | cities | duration_days | duration_nights | cover_image | short_description | is_constructor | included | excluded | visa_documents | excursion_ids |
|----|------|-------|---------|--------|----------------|------------------|-------------|--------------------|----------------|----------|----------|-----------------|----------------|

- `cities` — через запятую: `Токио,Киото,Осака`
- `is_constructor` — `TRUE` или `FALSE`
- `included` / `excluded` / `visa_documents` — пункты через `|`
- `excursion_ids` — id экскурсий через запятую

### Лист `TourDepartures`
| tour_id | date_start | date_end | season_code |
|---------|------------|----------|-------------|

Даты в формате `YYYY-MM-DD`. `season_code` — произвольный код сезона,
должен совпадать с колонками в `TourPriceMatrix`.

### Лист `TourProgram`
| tour_id | day | title | description |
|---------|-----|-------|--------------|

По одной строке на день программы.

### Лист `TourHotels`
| tour_id | category | name |
|---------|----------|------|

`category` — один из `standard` / `comfort` / `premium`.

### Лист `TourPriceMatrix`
| tour_id | hotel_category | room_type | season_code | price_per_person |
|---------|-----------------|-----------|--------------|-------------------|

`room_type` — один из `DBL` / `SGL` / `TRPL`. Цена — число, за человека, в USD.

### Лист `TourModules` (только для тур-конструкторов)
| tour_id | module_id | title | price_per_person | min_group |
|---------|-----------|-------|--------------------|-----------|

### Лист `Excursions`
| id | title | description | price_per_person | min_group | duration_hours |
|----|-------|--------------|--------------------|-----------|------------------|

### Лист `InsurancePlans`
| id | title | price_per_person_per_day | coverage |
|----|-------|---------------------------|----------|

### Лист `Заявки` (заполняется воркером автоматически)
Создайте пустой лист с этим названием — воркер сам допишет туда строку
при каждой заявке: `booking_id, created_at, tour_id, tour_title,
departure_date_start, departure_date_end, hotel_category, room_type,
travelers_json, selected_excursion_ids, selected_module_ids,
insurance_plan_id, total_price, warnings, contact_name, contact_phone,
contact_email`.

Колонка `warnings` — то, что нужно уточнить перед подтверждением: недобор
до минимальной группы экскурсии или неполная загрузка номера. Если она
не пустая, сумма в заявке предварительная.

## 2. Создать сервис-аккаунт Google

1. Google Cloud Console → создайте проект (или используйте существующий).
2. Включите **Google Sheets API**.
3. Создайте Service Account → создайте для него ключ в формате JSON.
4. Из JSON-ключа возьмите `client_email` и `private_key`.
5. Откройте вашу Google Sheet → «Настройки доступа» → дайте доступ
   **Редактор** на email сервис-аккаунта (`...@...iam.gserviceaccount.com`).
6. Скопируйте `SHEET_ID` из URL таблицы:
   `https://docs.google.com/spreadsheets/d/ЭТОТ_ID/edit`.

## 3. Задеплоить воркер

```bash
cd worker
npm install -g wrangler   # если ещё не установлен
wrangler login
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY   # вставьте весь PEM, включая BEGIN/END строки
wrangler secret put SHEET_ID
wrangler deploy
```

После деплоя wrangler покажет адрес вида
`https://turon-tour-api.<субдомен>.workers.dev`.

## 4. Подключить к сайту

В `js/config.js`:

```js
window.TURON_CONFIG = {
  apiBaseUrl: "https://turon-tour-api.<субдомен>.workers.dev",
};
```

Закоммитьте и запушьте — сайт начнёт читать данные из Google Sheet вместо
моков, кэшируя ответ на 5 минут на стороне воркера.
