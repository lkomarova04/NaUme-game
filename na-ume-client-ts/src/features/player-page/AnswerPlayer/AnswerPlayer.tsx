import { useTimer } from '@/shared/lib';

import '../PlayerMainPage/PlayerMainPage.css';
import '../RoundTwo/RoundTwo.css';

type AnswerPlayerProps = {
  question: string;
  currentRound: number;
  totalRounds: number;
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
  phaseStartsAt?: number;
  phaseEndsAt?: number;
  phasePaused?: boolean;
  disabled?: boolean;
  status?: string;
};

const AnswerPlayer = ({
  question,
  currentRound,
  totalRounds,
  value,
  onChange,
  onStart,
  phaseStartsAt = 0,
  phaseEndsAt,
  phasePaused = false,
  disabled = false,
  status,
}: AnswerPlayerProps) => {
  const timeLeft = useTimer(phaseEndsAt, phasePaused, phaseStartsAt);
  const isWaiting = phaseStartsAt > Date.now();
  const isDisabled = disabled || isWaiting;

  return (
    <div className="player-guessing-screen">
      <div className="player-guessing-shell player-answering-shell">
        <div className="player-guessing-header">
          <div className="player-question-round">
            Раунд {currentRound}/{totalRounds}
          </div>
          <h1 className="player-question-text">{question}</h1>
          {timeLeft !== null ? (
            <div className="player-question-timer">
              {isWaiting ? 'Старт через ' : ''}
              {timeLeft}
            </div>
          ) : null}
        </div>

        <label className="player-input-shell">
          <span className="player-input-label">Ваш ответ</span>
          <input
            className="player-guess-input"
            placeholder="Вариант ответа"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={isDisabled}
          />
        </label>

        <button
          className={`main-page__btn player-guess-submit${isDisabled ? ' main-page__btn--disabled' : ''}`}
          onClick={onStart}
          disabled={isDisabled}
        >
          Отправить
        </button>
        {status ? <p className="player-guess-status">{status}</p> : null}
      </div>
    </div>
  );
};

export default AnswerPlayer;
