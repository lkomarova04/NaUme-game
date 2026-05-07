# На уме

Real-time игра для мероприятий: организатор запускает сессию, игроки отвечают на вопрос, затем угадывают самые популярные ответы, а экран показывает вопрос, таймер и лидерборд.

## Что в проекте

- `na-ume-client-ts` — фронтенд на React + Vite + Socket.IO client
- `na-ume-server` — сервер на Node.js + TypeScript + Express + Socket.IO

## Требования

- Node.js 20+
- npm 10+

## Установка

1. Откройте два терминала.
2. В первом установите и запустите сервер:

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия\na-ume-server"
npm install
```

3. Во втором установите и запустите клиент:

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия\na-ume-client-ts"
npm install
```

## Настройка окружения

### Сервер

По желанию создайте файл `na-ume-server/.env`:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/na_ume
BASE_POINTS=100
MAX_PLAYERS_PER_SESSION=100
ANSWERING_DURATION_MS=30000
GUESSING_DURATION_MS=200000
```

### Клиент

Создайте файл `na-ume-client-ts/.env.local`:

```env
VITE_SERVER_URL=http://localhost:3001
```

## Запуск

### Полный запуск через Docker

Теперь можно поднять весь стек одной командой: PostgreSQL, backend, frontend через `nginx` и Adminer.

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия"
docker compose up --build -d
```

Что поднимется:

- frontend + nginx: `http://localhost`
- backend: `http://localhost:3001`
- PostgreSQL: `localhost:5432`
- Adminer: `http://localhost:8080`

Параметры по умолчанию:

- database: `na_ume`
- user: `postgres`
- password: `postgres`

Внутри Docker для сервера уже проброшен:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/na_ume
```

Важно:

- в браузере открывайте `http://localhost`
- `nginx` проксирует `/socket.io` и `/health` на backend
- поэтому `socket.io` больше не должен падать с `ERR_CONNECTION_REFUSED`, если стек поднят через `docker compose`

### Сервер

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия\na-ume-server"
npm run dev
```

Проверка:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

### Клиент

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия\na-ume-client-ts"
npm run dev
```

После запуска клиент обычно будет доступен по адресу `http://localhost:5173`.

## Сборка и тесты

### Сервер

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия\na-ume-server"
npm run build
npm test
```

### Клиент

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия\na-ume-client-ts"
npx tsc -b
```

Если `vite build` в вашей среде падает с `spawn EPERM`, это ограничение текущей среды Windows/песочницы, а не ошибка TypeScript-кода. Для локальной машины обычно достаточно `npm run build`.

## Как работать с игрой

### 1. Создание сессии организатором

1. Откройте в браузере `http://localhost:5173/admin`
2. Введите название события
3. Нажмите `Создать сессию`
4. Вас перекинет на страницу вида `/admin/ABC123`

### 2. Подключение экрана

Откройте:

```text
http://localhost:5173/display/ABC123
```

Где `ABC123` — ваш реальный `sessionId`.

### 3. Подключение игроков

Отправьте игрокам ссылку:

```text
http://localhost:5173/player/ABC123
```

Игрок вводит имя и нажимает кнопку входа.

### 4. Игровой цикл

1. Организатор нажимает `Старт игры`
2. Начинается фаза `answering`
3. Игроки отправляют свои ассоциации
4. После таймера или по кнопке `Следующая фаза` сервер переводит игру в `guessing`
5. Игроки пытаются угадать самые популярные ответы
6. Затем идёт `reveal`, где организатор открывает ответы
7. После раскрытия ответов показывается `leaderboard`

## Маршруты

- `/admin` — создание новой сессии
- `/admin/:sessionId` — панель организатора для конкретной игры
- `/display/:sessionId` — экран для проектора/монитора
- `/player/:sessionId` — страница игрока

## Dev-кнопки

Дополнительные `Dev` кнопки оставлены, но показываются только в режиме разработки (`npm run dev`).

## Что уже реализовано

- соединение фронта с сервером через Socket.IO
- подключение по ролям `organizer`, `display`, `player`
- создание сессии
- join игроков
- фазы игры и серверные таймеры
- сбор ответов и построение топа
- угадывание ответов и начисление очков
- reveal и leaderboard
- генерация реального QR-кода по ссылке игрока
- сброс игры в начало из админки
- загрузка и сидирование вопросов из PostgreSQL
- вторая фаза guessing по умолчанию длится 200 секунд
- health-check и тесты сервера

## Примечание по старой картинке QR

В проекте могла остаться старая тестовая картинка QR (`QR-test.png`). Она больше не используется для экрана подключения и оставлена только как legacy-asset/референс. Актуальный QR теперь генерируется динамически на клиенте из реального `sessionId`.

## Важное замечание

Если порт `3001` уже занят, сервер не запустится. Тогда либо остановите старый процесс, либо временно задайте другой порт в `na-ume-server/.env`, а в `na-ume-client-ts/.env.local` укажите тот же адрес.

Ответы игроков не сохраняются в PostgreSQL и живут только в runtime-памяти сервера на время игры и переходов между фазами/раундами.

### Остановка Docker-инфраструктуры

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия"
docker compose down
```

Если захотите удалить и данные базы:

```powershell
cd "C:\Users\lyubs\Desktop\NaUme-game — копия"
docker compose down -v
```
