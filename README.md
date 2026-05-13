# Na Ume Game

Мультиплеерная игра с тремя ролями:

- `admin` управляет сессией, раундами, таймерами и ответами.
- `display` показывает общий экран для зала.
- `player` подключается к игре, отправляет ответ и угадывает популярные ответы.

## Быстрый запуск

```powershell
docker compose up --build -d
```

После запуска:

- игра: http://localhost
- сервер: http://localhost:3001
- healthcheck сервера: http://localhost:3001/health
- Adminer: http://localhost:8081

Adminer внутри контейнера по-прежнему слушает `8080`, но наружу проброшен на `8081`, чтобы не конфликтовать с другими локальными сервисами:

```yml
ports:
  - "8081:8080"
```

## Нагрузочное тестирование

Нагрузочный тест находится в `load-test.js`. Он использует реальные Socket.IO события приложения, а не сырой WebSocket.

Тест phase-aware:

- `game:submit-answer` отправляется только когда сервер в фазе `answering`.
- `game:submit-guess` отправляется только когда сервер в фазе `guessing`.
- По умолчанию один игрок отправляет один ответ и одну догадку за раунд.
- Ошибки группируются по типам: `ack timeout`, `Answers are closed`, `Player has already answered` и другие.
- Для `join`, `answer`, `guess` считаются latency `min`, `p50`, `p95`, `p99`, `max`.

Перед тестом сервер должен быть запущен:

```powershell
docker compose up --build -d
```

Обычный тест:

```powershell
npm run load:test
```

Тест до 500 игроков:

```powershell
npm run load:test:500
```

Если тест падает на `join failed for LoadPlayer-101`, значит сервер запущен со старым лимитом `MAX_PLAYERS_PER_SESSION=100`. Сейчас в `docker-compose.yml` выставлено `500`, но уже созданный контейнер нужно пересоздать:

```powershell
docker compose up --build -d --force-recreate server
```

После этого снова:

```powershell
npm run load:test:500
```

Эта команда эквивалентна:

```powershell
node load-test.js --players=500 --ramp-ms=60000 --duration-ms=180000 --answering-sec=30 --guessing-sec=45
```

Параметры можно менять:

```powershell
node load-test.js --players=200 --ramp-ms=30000 --duration-ms=120000
```

Доступные параметры:

- `--server-url=http://localhost:3001`
- `--players=500`
- `--ramp-ms=60000`
- `--duration-ms=180000`
- `--answer-every-ms=1000`
- `--guess-every-ms=1000`
- `--answering-sec=30`
- `--guessing-sec=45`
- `--ack-timeout-ms=10000`
- `--repeat-in-phase=true`

`repeat-in-phase=true` специально включает повторные отправки в одной фазе. Это полезно, если нужно проверить валидаторы и ошибочные сценарии, но для честной оценки производительности сервера лучше оставлять значение `false`.

Пример итогового вывода:

```json
{
  "connected": 500,
  "answers": 500,
  "guesses": 500,
  "errors": {},
  "latencyMs": {
    "join": { "count": 500, "p50": 12, "p95": 48, "p99": 90 },
    "answer": { "count": 500, "p50": 8, "p95": 35, "p99": 70 },
    "guess": { "count": 500, "p50": 9, "p95": 40, "p99": 80 }
  }
}
```

Смотреть надо не только на количество успешных действий, но и на:

- `errors`: если много `ack timeout`, сервер или сеть не успевают отвечать.
- `p95` и `p99`: если они резко растут, значит часть игроков получает заметную задержку.
- `Player has already answered`: обычно появляется только при `repeat-in-phase=true`.
- `Answers are closed`: если появляется при обычном тесте, значит тест или сервер неправильно синхронизируют фазу.

## Как устроен сервер

Сервер лежит в `na-ume-server`.

Главные части:

- `src/server.ts` - точка входа. Создает Express-приложение, HTTP-сервер, Socket.IO, подключает Postgres, Redis и игровой сервис.
- `src/app.ts` - Express-приложение. Сейчас там CORS, JSON middleware и `/health`.
- `src/socket/createSocketServer.ts` - настройка Socket.IO.
- `src/socket/registerGameHandlers.ts` - все Socket.IO обработчики: создание сессии, подключение игрока, старт игры, отправка ответов, догадки, таймеры.
- `src/services/GameService.ts` - ядро игровой логики. Здесь фазы, раунды, таймеры, начисление очков, ответы, топ ответов.
- `src/domain/types.ts` - общие типы домена: `SessionState`, `Player`, `Round`, `TopAnswer`, события.
- `src/repositories/*` - слой хранения.
- `src/database/createPool.ts` - подключение к Postgres.
- `src/config/*` - настройки, банк вопросов, фильтр слов.

Поток работы примерно такой:

1. Админ создает сессию через `organizer:create-session`.
2. Игроки заходят через `session:join`.
3. Админ стартует игру через `organizer:start-game`.
4. `GameService` переводит сессию в фазу `answering`.
5. Игроки отправляют `game:submit-answer`.
6. После фазы сбора сервер строит `topAnswers` и переводит игру в `guessing`.
7. Игроки отправляют `game:submit-guess`.
8. Сервер начисляет очки, раскрывает угаданные ответы и рассылает маленькие события.
9. После последнего раунда сервер показывает leaderboard.

## Звуки на display

На display-экране есть отдельный аудио-слой `DisplayAudio`. Он монтируется один раз над всеми фазами display, поэтому фоновая музыка не стартует заново при смене раунда или перерисовке React.

Файлы нужно положить сюда:

```text
na-ume-client-ts/public/audio/background.mp3
na-ume-client-ts/public/audio/timer-warning.mp3
na-ume-client-ts/public/audio/answer-reveal.mp3
```

Что играет:

- `background.mp3` - фоновая музыка, loop, играет постоянно на display.
- `timer-warning.mp3` - звук один раз, когда до конца таймера остается 5 секунд.
- `answer-reveal.mp3` - звук при появлении/раскрытии ответа из топа во второй фазе.

Важно: браузеры часто блокируют autoplay со звуком до первого клика. Если display не сможет сам запустить музыку, появится кнопка `Включить звук`. Ее нужно нажать один раз на экране display.

## Зачем Redis

Redis используется как хранилище игровых сессий, если задан `REDIS_URL`.

В `docker-compose.yml` он включен так:

```yml
REDIS_URL: redis://redis:6379
```

Если `REDIS_URL` нет, сервер использует `InMemorySessionRepository`. Это удобно для разработки, но при перезапуске сервера все сессии пропадут.

Redis дает более живучее хранение сессий, но текущие таймеры все равно живут в памяти процесса Node.js. После полного рестарта сервера состояние сессии восстановится, но активные timeout-таймеры надо будет запускать заново отдельной логикой, если это понадобится.

## Почему есть одинаковые TS и JS файлы

`src/*.ts` - это исходный TypeScript-код, который мы пишем руками.

`dist/*.js` - это скомпилированный JavaScript, который получается после команды:

```powershell
cd na-ume-server
npm run build
```

Node.js в production запускает именно JavaScript из `dist`, потому что TypeScript напрямую браузер/Node не исполняют без дополнительного рантайма. Dockerfile сервера тоже собирает TypeScript и запускает `dist/server.js`.

То есть:

- `src` - редактировать здесь.
- `dist` - результат сборки.
- если `src/services/GameService.ts` изменился, то после `npm run build` появится обновленный `dist/services/GameService.js`.

Одинаковые файлы в разных папках не являются двумя разными версиями логики. Это исходник и собранный результат. В нормальном процессе разработки руками правится только `src`.

## Команды разработки

Сервер:

```powershell
cd na-ume-server
npm run dev
npm test
npm run build
```

Клиент:

```powershell
cd na-ume-client-ts
npm run dev
npm run build
```

Корень проекта:

```powershell
npm run load:test
npm run load:test:500
```
