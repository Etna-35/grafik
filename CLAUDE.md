# CLAUDE.md — рабочая память проекта Etna «no-money-no-honey»

Этот файл авто-загружается. Здесь — всё, что нужно агенту, чтобы продолжать проект точно и ничего не сломать.
Глубже: `docs/HANDOFF.md` (передача), `AGENTS.md`, `DECISIONS.md`, `docs/STATE.md`, `docs/codex-brief-*.md`.
Обновлено: 2026-06-07. Ветка `main`, дерево чистое, посл. коммит `7c9b855`.

---

## 1. Что это
Внутренний корпоративный кабинет ресторана-бара **Etna** (Вологда). Пользователей ≤15, онлайн 2–5.
**НЕ высоконагруженный проект — не усложнять, не закладывать «на вырост» под нагрузку.**
Сначала уточняющие вопросы/план только если задача неоднозначна; обычные правки — делать и деплоить.

- **Прод:** https://lk.no-money-no-honey.ru/ (вход по PIN). `api.no-money-no-honey.ru/api/health`, `admin.no-money-no-honey.ru` (NocoDB).
- **Репо:** `github.com/Etna-35/grafik` (origin, `main`). Публичный (см. §9 риск).
- **Сервер:** Beget VPS, IP `212.67.14.25`, SSH-алиас **`etna-vps`** (root, ключ на машине пользователя).
  Код: `/opt/etna/app`. Compose+`.env`: `/opt/etna/deploy`. Контейнеры: postgres, redis, nocodb, caddy, api.

## 2. Стек и структура
- **Backend:** Node + Fastify + PostgreSQL, TypeScript (`apps/api/src/*.ts`). Вход `server.ts`. Сборка `tsc` → `apps/api/dist`.
- **Frontend:** ВАНИЛЬНЫЙ JS, без фреймворка/сборки. Один большой файл **`apps/web/app.js`** (рендер строками-шаблонами,
  единый объект `state`, функции `render*`/`bind*`), `apps/web/styles.css`, `apps/web/index.html`.
- **Статика** (`apps/web`, вкл. `assets/`) отдаётся backend'ом (@fastify/static) и **запекается в Docker-образ** при сборке.
- Корневой `index.html` — ЛЕГАСИ отдельный «График», НЕ трогать (боевое в `apps/web`).
- Структура:
  - `apps/api/src/`: admin, auth, schedule, shiftClosing, payroll, requisitions, tasks, training, quiz,
    handovers, praises, progress, salesGoals (роуты); db, env, security, migrate, seed, types (инфра);
    importTraining, importMenu, data/menuData.ts (контент).
  - `apps/web/`: app.js, styles.css, index.html, assets/ (logo.png, awards/level-1..20.png).
  - `migrations/` (001..021, `.sql`). `deploy/beget/` (docker-compose, Caddyfile, .env.example). `docs/`.

## 3. Визуальный стиль (бренд RestForm) — соблюдать строго
Тёмная тема, перенесена 1:1 из соседнего репо `Etna-35/RestForm` (источник правды по бренду).
- **Цвета — ТОЛЬКО через CSS-переменные в `:root`** (`apps/web/styles.css`). Захардкоженных hex в правилах не оставлять.
- Палитра: фон `--paper:#0e0e0e`; карточки `--card:#181818`/`--card-2:#222222`; текст `--ink:#f0ead8`,
  приглушённый `--ink-soft:#8a8070`; границы `--line:#2e2e2e`, `--line-strong:#3a3a3a`.
  Акцент — антик-золото `--brand:#c8a96e`, светлое `--brand-bright:#e2c98a`, тинты `--brand-tint`/`--brand-line`.
  **Текст НА золотой заливке — тёмный `--brand-ink:#0e0e0e`, НЕ белый.**
  Семантика: успех `--green:#5ab87a` (+`--ok-bg`/`--ok-line`, для заливок `--green-fill`); danger `--danger:#e05a4a`
  (+`--danger-bg`/`--danger-line`); warn/`--gold:#e0a84a`; роли `--cook`/`--bar`/`--waiter`/`--dish`.
- **Шрифты:** дисплейный **Unbounded** (`--font-display`: заголовки, золотые uppercase-метки `.section-title/.sec`,
  клавиши PIN, крупные суммы, золотые кнопки) + текстовый **Golos Text** (`--font`). Подключены в `index.html`.
- Mobile-first. Метки минималистичные монохромные, БЕЗ emoji в UI. Кнопки на тёмном задавать `color` явно
  (иначе iOS красит синим). Селекты — `appearance:none` + кастомная каретка (глобальный стиль уже есть).

## 4. ДЕПЛОЙ — повторять ровно так (фронт запечён в образ!)
1. Правки → проверка: `npm run check` (tsc, из корня) и `node --check apps/web/app.js`.
2. (опц.) Превью: Claude Preview `web-static` (launch.json, python http.server по `apps/web`).
   **ВАЖНО:** превью-браузер кэширует `styles.css` — после CSS-правок делать reload и/или cache-bust
   (`link.href='/styles.css?b='+Date.now()`), иначе видишь старые стили (частая ловушка при визуальной проверке).
3. Коммит в `main` + пуш: `GIT_TERMINAL_PROMPT=0 git push origin main`. Подпись коммита:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Большие бинарники: уже выставлен
   `git config http.postBuffer 524288000` (без него пуш падал HTTP 400).
4. Залить на сервер (примеры):
   - `scp apps/web/app.js apps/web/styles.css etna-vps:/opt/etna/app/apps/web/`
   - `scp apps/api/src/<файлы>.ts etna-vps:/opt/etna/app/apps/api/src/`
   - новые подпапки сначала: `ssh etna-vps "mkdir -p /opt/etna/app/apps/api/src/data"`
   - миграции: `scp migrations/NNN.sql etna-vps:/opt/etna/app/migrations/`
   - ассеты: `scp apps/web/assets/awards/*.png etna-vps:/opt/etna/app/apps/web/assets/awards/`
5. Пересборка+рестарт: `ssh etna-vps "cd /opt/etna/deploy && docker compose build api && docker compose up -d api"`.
6. **Миграции применяются АВТОМАТИЧЕСКИ** при старте (entrypoint → `node apps/api/dist/migrate.js`), затем `seed.js`.
   Проверить: `docker compose logs api | grep -i 'Applied migration'`.
7. **Импортёры запускать вручную** в контейнере после деплоя:
   `ssh etna-vps "cd /opt/etna/deploy && docker compose exec -T api node apps/api/dist/importMenu.js"`
   (аналогично `importTraining.js`).
8. Проверка: `curl -s -o /dev/null -w '%{http_code}' https://api.no-money-no-honey.ru/api/health` → 200.
   БД: `docker compose exec -T postgres psql -U etna_app -d etna_app -tAc "..."`.
- Коммитить/пушить/деплоить — когда просит пользователь (он это делает часто; на этом проекте автодеплой принят).
  Прод-деплой на этом проекте разрешён агенту (есть SSH), но не трогать чужие креды/платежи.

## 5. Архитектурные инварианты
- Рендер/расчёты не лезут в localStorage напрямую — только через слой данных/API.
- При правке схемы `state` фронта — обновлять рендер; при правке схемы БД — новая миграция (только вперёд,
  `NNN_name.sql`, идемпотентно: `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`),
  обновлять `docs/data-model.md`.
- Значение смены типизировано: часы vs рубли — разные сущности (`hours` / `payAmount`).
- Роль-скоуп проверяется в backend (сотрудник видит только своё). Postgres наружу не публикуется.
- Секреты — только в `/opt/etna/deploy/.env` (в git ничего чувствительного). Managed-БД не используем.

## 6. Миграции (001→021)
001 initial · 002 schedule import fields · 003 internal admin service · 004 shift closing · 005 payroll access ·
006 tasks access · 007 requisitions · 008 hookah payroll idx · 009 training (modules/chapters/attachments/routes/
read_marks/assignments) · 010 task description · 011 employee archived_at · 012 requisition_lines.urgent ·
013 tasks.reward_amount · 014 shift_handovers · 015 employees start_date/birth_date · 016 praises ·
017 DROP unique(display_name) — имена НЕ уникальны · 018 sales_goals · 019 progress_events · 020 tasks
employee_id nullable + audience_role · 021 quiz (quiz_questions/options/attempts) ·
022 shift_closing_hookah (несколько кальянщиков в смене; колонки shift_closings.hookah_* = денорм. итог).

## 7. Что построено (всё на проде)
- **Главная/ЛК:** приветствие + «цель дня» (план выручки = ФОТ_дня/0.23, ×0.8 будни / ×1.5 ПТ-СБ; наличный план =
  ФОТ дня), единая верхняя подложка (План выручки / Наличный план / План от коллег=handovers). Зона **«Заслуги»**:
  блок Уровня (клик → страница прогресса) + «Задачи на месяц N/N»; ниже узкие: похвалы (♥×N), оценки (★×N), «Спасибо».
- **График** (`schedule`): смены, роль-скоуп, оценки (зел/жёлт/красн точки), выплаты, ДР-метки, ФОТ. Управление
  (после разблокировки замком): **клик** — поставить/снять смену; **двойной клик** — редактор нестандартных часов
  (фикс-ставка → своя сумма); **правый клик** — тоже редактор (долгого тапа НЕТ). Календарь на всю высоту месяца
  (вертикаль скроллит страница, внутри блока — только горизонталь; шапка липкая). Клик по дате → окно: дедлайн/
  зарплатный день/оценка + **выплаты за день** (список всех с именами + строка «сотрудник+сумма+кнопка»).
- **Закрытие смены** (`shiftClosing`): полная форма; переключатель даты ←/→, время МСК + ночное предупреждение 00:00–06:00.
- **Задачи** (`tasks`): название/описание/дедлайн/**премия**(→Выплаты); статус-бейдж у названия; **ролевые задания**
  («вся смена» — видно только роли, отметка о выполнении даёт +10% всем роли). «План на завтра» (`handovers`,
  по ролям, «от руководителя», resolve). Кнопка рук-ля «Общий план выполнен +50% всем».
- **Заявка** (`requisitions`): каталог, срочность по позиции, золотые кнопки.
- **Выплаты** (`payroll`): начисления по сменам, кальяны, премии за задачи и за цели продаж.
- **Админка** (`admin`): сотрудники (PIN/роль/ставки/доступы по разделам), дата начала+ДР, **удаление=архивация** с подтверждением.
- **Похвала** (`praises`) + лента. **Цели по продажам** (`salesGoals`): рук-ль ставит цель официанту (позиция/кол-во/
  премия), сотрудник «Продал +1», достижение → подтверждение рук-ля → премия в доход. Блок на главной.
- **Прогресс/геймификация** (`progress`): уровень = 100 очков; стаж +30%/мес, задание рук-ля +30, ролевое +10,
  похвала коллеги +10 / рук-ля +20, «план выполнен» +50. Страница прогресса (история «как в MK», следующий уровень
  скрыт). Иконки уровней — **20 кукол-вуду** `apps/web/assets/awards/level-1..20.png`, `MAX_MASK_LEVEL=20` в app.js.
- **Обучение+Тесты** (`training`,`quiz`): **3 НЕЗАВИСИМЫХ блока** (база официанта, меню кухни, меню бара) — каждый
  с первого дня, гейтинг строго внутри модуля. Глава → тест: таймер = вопросов×90с, без подсказок, порог **80%**,
  провал → блок на **2 часа**, успех → следующая глава; **аттестация** по модулю. Меню кухни (6 глав) и бара (5 глав)
  импортированы из ТТК с автогеном вопросов «Что входит в состав…» (на бою 87 вопросов глав + 26 аттестаций).

## 8. Подводные камни (НЕ сломать)
- **seed при каждом рестарте: обновляет PIN владельца на `OWNER_PIN` из `.env`** и находит владельца ПО РОЛИ
  (не по имени — имена не уникальны). Если владелец сменил PIN в приложении — деплой сбросит. TODO: однократная инициализация.
- **Имена сотрудников НЕ уникальны** (миграция 017). Не возвращать уникальность. `seed.ts` НЕ должен апсертить по display_name.
- **Текст на золоте — тёмный `--brand-ink`**, не белый.
- **Превью кэширует CSS** (см. §4.2).
- **Статика запечена в образ** → после правок `apps/web`/assets нужен `scp` + `docker compose build api`.
- **Импортёры — вручную** (`importMenu`/`importTraining`), не на старте.
- **Доступ к «Обучению»** у owner/manager/waiter. Повара/бармены не видят меню-модули/аттестации — выдать доступ
  к разделу через Админку, если нужно (решение продукта, не баг).
- **Квиз-таймер клиентский** (авто-сабмит по нулю), серверной валидации таймаута нет.
- График: шапка дат/имён липкая (sticky) после снятия `max-height` у `.gridwrap`. Изменения графика от 2026-06-07
  проверены по логике, вживую с данными не глянуты — при правках смотреть `.gridwrap`, `.schedule-grid thead/.colDate`, `bindScheduleCells`.

## 9. Бэклог (приоритет) и отменённое
**Бэклог:** вопросы для модуля официанта; доступ меню-модулей поварам/бару; редактор вопросов в админке; глава
«Интерьер» из PDF-гайда; вынос порога 80%/90с/2ч в настройки; серверная валидация таймера квиза; Telegram-уведомления
(план выполнен/аттестация/цель — места в коде заложены); сделать репозиторий приватным + перевыпустить токен бота;
однократная инициализация PIN владельца; (опц.) пиксель-перфект иконки наград и порядок «уровень→кукла».
**ОТМЕНЕНО пользователем (НЕ реализовывать без явного запроса):** такси «за наличные» в закрытии смены.
(«Несколько кальянщиков в смену» — РЕАЛИЗОВАНО, миграция 022; ранее было отменено, возвращено по запросу 2026-06-07.)

## 10. Контент и инструменты
- **ТТК меню:** Google Sheet `1iu8_-NKfkJqec4-pzZzupTvVt45Omyh8Scumoowb4-o` (CSV-экспорт по gid РАБОТАЕТ);
  xlsx на Drive `1KID9UbtMGyUBGhvPPhspnTnsar0mfjRh` (11 листов). Выгружено в `apps/api/src/data/menuData.ts` (88 позиций).
- **Гайд по интерьеру (PDF):** Google Drive `1r4DkdsVePR2ChRRjjbMfGe7vM-f7Lx3B` — под будущую главу «Интерьер».
- Логотип `apps/web/assets/logo.png`. Награды `apps/web/assets/awards/`.
- **Инструменты на машине пользователя:** Python venv с Pillow+openpyxl `/tmp/maskvenv/bin/python` (может быть удалён →
  пересоздать: `python3 -m venv /tmp/maskvenv && /tmp/maskvenv/bin/pip install Pillow openpyxl`). Скачивание Drive:
  `curl -sL "https://drive.google.com/uc?export=download&id=<FILEID>" -o out`. Нарезка спрайтов (логотип/куклы) —
  Pillow-скриптами (проекции по альфе/белому, заливка фона от углов в прозрачность).

## 11. Стартовое сообщение для нового диалога
> Продолжаем проект Etna (кабинет ресторана). Прочитай `CLAUDE.md` и `docs/HANDOFF.md`, затем при необходимости
> `AGENTS.md`/`DECISIONS.md`/`docs/STATE.md`/`docs/codex-brief-*.md`. Деплой строго по §4 CLAUDE.md. Не ломать:
> PIN-seed, неуникальные имена, тёмный текст на золоте, статику в образе. Моя задача: <впиши>.
