import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useGame } from '@/app/providers/game-context';
import { getCurrentRound } from '@/entities/session';

import '../../app/styles/global.css';
import '../../app/styles/reset.css';
import './admin.css';

const roundOptions = [3, 5, 7];

const AdminPage = () => {
  const { sessionId } = useParams();
  const {
    session,
    createSession,
    adminAccessCode,
    setAdminAccessCode,
    connectionError,
    __setPhase,
    startGame,
    nextPhase,
    resetGame,
    setTimerPaused,
    setCurrentTimer,
    revealTopAnswer,
    deleteRawAnswer,
    updateSettings,
    goToRound,
  } = useGame();
  const [eventName, setEventName] = useState('На уме');
  const [adminCodeDraft, setAdminCodeDraft] = useState(adminAccessCode);

  const [manualTimerDraft, setManualTimerDraft] = useState('60');
  const [manualDelayDraft, setManualDelayDraft] = useState('0');
  const currentRound = session ? getCurrentRound(session) : undefined;

  const playersMap = useMemo(() => {
    return new Map(session?.players.map((player) => [player.id, player.name]) ?? []);
  }, [session?.players]);

  const currentTimerSec =
    session?.phasePaused && session.phaseEndsAt > 0
      ? Math.ceil(session.phaseEndsAt / 1000)
      : session?.phaseEndsAt && session.phaseEndsAt > 0
        ? Math.max(0, Math.ceil((session.phaseEndsAt - Date.now()) / 1000))
        : 0;

  useEffect(() => {
    setAdminCodeDraft(adminAccessCode);
  }, [adminAccessCode]);

  const applyManualTimer = () => {
    const durationSec = Number(manualTimerDraft);
    const delaySec = Number(manualDelayDraft);

    if (Number.isFinite(durationSec) && Number.isFinite(delaySec)) {
      setCurrentTimer(durationSec, delaySec);
    }
  };

  const applyAdminCode = () => {
    setAdminAccessCode(adminCodeDraft);
  };

  const adminAccessError =
    connectionError === 'Неверный код админки.' || connectionError === 'Organizer privileges required';
  const hasAdminAccess = adminAccessCode.length > 0 && !adminAccessError;

  if (!hasAdminAccess) {
    return (
      <div className="admin-page admin-page--center">
        <section className="admin-card admin-auth-card">
          <p className="admin-kicker">Доступ организатора</p>
          <h1>Админ-панель</h1>
          <p className="admin-muted">
            Введите код доступа, чтобы управлять сессиями и настройками игры.
          </p>

          <label className="admin-field">
            <span>Код админки</span>
            <input
              type="password"
              value={adminCodeDraft}
              onChange={(event) => setAdminCodeDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applyAdminCode();
                }
              }}
            />
          </label>

          {adminAccessCode && connectionError && <p className="admin-error">{connectionError}</p>}

          <button className="admin-primary-button" onClick={applyAdminCode}>
            Войти
          </button>
        </section>
      </div>
    );
  }

  if (!sessionId && !session) {
    return (
      <div className="admin-page admin-page--center">
        <section className="admin-card admin-create-card">
          <p className="admin-kicker">Новая игра</p>
          <h1>Создание сессии</h1>
          <p className="admin-muted">
            Задайте название события, затем откройте экран дисплея и приглашайте игроков.
          </p>

          <label className="admin-field">
            <span>Название события</span>
            <input value={eventName} onChange={(event) => setEventName(event.target.value)} />
          </label>

          {connectionError && <p className="admin-error">{connectionError}</p>}

          <button
            className="admin-primary-button"
            onClick={() => void createSession(eventName.trim() || 'На уме')}
          >
            Создать сессию
          </button>
        </section>
      </div>
    );
  }

  if (!session || !currentRound) {
    return null;
  }

  const { settings } = session;
  const answeredPlayersCount = new Set(currentRound.answers.map((answer) => answer.playerId)).size;
  const guessedPlayersCount = session.players.filter((player) => player.hasGuessed).length;
  const revealedAnswersCount = currentRound.topAnswers.filter((answer) => answer.revealed).length;

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <p className="admin-kicker">Панель организатора</p>
          <h1>{session.eventName}</h1>
          <p className="admin-muted">Сессия {session.sessionId} · Раунд {session.roundIndex + 1} из {session.rounds.length}</p>
        </div>
        <div className="admin-hero-actions">
          <button className="admin-primary-button" onClick={() => startGame()}>Запустить</button>
          <button onClick={() => nextPhase()}>Следующая фаза</button>
        </div>
      </section>

      <section className="admin-stats">
        <div className="admin-stat">
          <span>Подключено</span>
          <strong>{session.players.length}</strong>
        </div>
        <div className="admin-stat">
          <span>Ответили в 1 фазе</span>
          <strong>{answeredPlayersCount}</strong>
        </div>
        <div className="admin-stat">
          <span>Ответили во 2 фазе</span>
          <strong>{guessedPlayersCount}</strong>
        </div>
        <div className="admin-stat">
          <span>Открыто ответов</span>
          <strong>{revealedAnswersCount}</strong>
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-card">
          <h2>Настройка игры</h2>

          <label className="admin-field">
            <span>Количество раундов</span>
            <select
              value={settings.roundsCount}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  roundsCount: Number(event.target.value),
                })
              }
            >
              {roundOptions.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Режим категорий</span>
            <select
              value={settings.categoryMode}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  categoryMode: event.target.value as 'shared' | 'perRound',
                })
              }
            >
              <option value="shared">Одна категория на всю игру</option>
              <option value="perRound">Отдельная категория по раундам</option>
            </select>
          </label>

          {settings.categoryMode === 'shared' ? (
            <label className="admin-field">
              <span>Общая категория</span>
              <select
                value={settings.sharedCategory}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    sharedCategory: event.target.value,
                    roundCategories: Array.from(
                      { length: settings.roundsCount },
                      () => event.target.value,
                    ),
                  })
                }
              >
                <option value="all">Все категории</option>
                {session.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="admin-field">
              <span>Категория каждого раунда</span>
              <div className="admin-round-settings">
                {Array.from({ length: settings.roundsCount }, (_, index) => (
                  <label key={index} className="admin-field admin-round-field">
                    <span>Раунд {index + 1}</span>
                    <select
                      value={settings.roundCategories[index] ?? 'all'}
                      onChange={(event) => {
                        const nextRoundCategories = [...settings.roundCategories];
                        nextRoundCategories[index] = event.target.value;

                        updateSettings({
                          ...settings,
                          roundCategories: nextRoundCategories,
                        });
                      }}
                    >
                      <option value="all">Любая категория</option>
                      {session.categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="admin-field">
            <span>Текущий раунд</span>
            <select
              value={session.roundIndex}
              onChange={(event) => goToRound(Number(event.target.value))}
            >
              {session.rounds.map((round) => (
                <option key={round.question.id} value={round.index}>
                  Раунд {round.index + 1}: {round.question.category}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-timer-settings">
            <label className="admin-field">
              <span>Сбор ответов, сек.</span>
              <input
                type="number"
                min={5}
                max={3600}
                value={settings.answeringDurationSec}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    answeringDurationSec: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Угадывание, сек.</span>
              <input
                type="number"
                min={5}
                max={3600}
                value={settings.guessingDurationSec}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    guessingDurationSec: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="admin-field">
              <span>Встроенная задержка фаз, сек.</span>
              <input
                type="number"
                min={0}
                max={600}
                value={settings.startDelaySec}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    startDelaySec: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
        </div>

        <div className="admin-card">
          <h2>Управление игрой</h2>
          <div className="admin-actions">
            <button onClick={() => __setPhase('lobby')}>Lobby</button>
            <button onClick={() => __setPhase('answering')}>Сбор ответов</button>
            <button onClick={() => __setPhase('guessing')}>Угадывание и топ</button>
            <button onClick={() => __setPhase('leaderboard')}>Лидеры</button>
            <button onClick={() => setTimerPaused(!session.phasePaused)}>
              {session.phasePaused ? 'Продолжить таймер' : 'Пауза таймера'}
            </button>
            <button onClick={() => resetGame()}>Сброс игры</button>
          </div>

          <div className="admin-timer-panel">
            <div>
              <span>Таймер сейчас</span>
              <strong>{currentTimerSec} сек.</strong>
            </div>
          </div>

          <div className="admin-manual-timer">
            <label className="admin-field">
              <span>Ручной таймер, сек.</span>
              <input
                type="number"
                min={5}
                max={3600}
                value={manualTimerDraft}
                onChange={(event) => setManualTimerDraft(event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>Задержка перед стартом, сек.</span>
              <input
                type="number"
                min={0}
                max={600}
                value={manualDelayDraft}
                onChange={(event) => setManualDelayDraft(event.target.value)}
              />
            </label>
            <button onClick={applyManualTimer}>Запустить ручной таймер</button>
          </div>

          <div className="admin-status">
            <strong>Текущий вопрос:</strong> {currentRound.question.text}
          </div>
          <div className="admin-status">
            <strong>Таймер:</strong> {session.phasePaused ? 'на паузе' : 'идет'}
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-card">
          <h2>Топ ответов</h2>
          <div className="admin-list">
            {currentRound.topAnswers.map((answer, index) => (
              <div key={answer.id} className="admin-list-row">
                <div>
                  <strong>
                    {index + 1}. {answer.text}
                  </strong>
                  <p>
                    {answer.count} ответов, {answer.percentage}%
                  </p>
                </div>
                <button onClick={() => revealTopAnswer(answer.id)}>
                  {answer.revealed ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <h2>Валидация ответов</h2>
          <div className="admin-list">
            {currentRound.answers.length === 0 && (
              <p className="admin-empty">Пока нет ответов для модерации.</p>
            )}

            {currentRound.answers.map((answer) => (
              <div key={answer.id} className="admin-list-row">
                <div>
                  <strong>{answer.text}</strong>
                  <p>{playersMap.get(answer.playerId) ?? 'Игрок'}</p>
                </div>
                <button onClick={() => deleteRawAnswer(answer.id)}>Удалить</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
