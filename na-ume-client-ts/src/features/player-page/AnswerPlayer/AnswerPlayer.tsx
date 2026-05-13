import { useTimer } from '@/shared/lib';

import '../PlayerMainPage/PlayerMainPage.css';
import check from './check-square.png';

type AnswerPlayerProps = {
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
    <div className="main-page">
      <div className="main-page__body">
        {timeLeft !== null ? (
          <div className="main-page__timer">
            {isWaiting ? 'Старт через ' : ''}
            {timeLeft}
          </div>
        ) : null}
        <div className="input-wrapper">
          <img src={check} className="input-icon" alt="answer" />
          <input
            className="main-page__input"
            placeholder="Вариант ответа"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={isDisabled}
          />
        </div>
        <button
          className={`main-page__btn${isDisabled ? ' main-page__btn--disabled' : ''}`}
          onClick={onStart}
          disabled={isDisabled}
        >
          Отправить
        </button>
        {status ? <p className="main-page__status">{status}</p> : null}
      </div>
    </div>
  );
};

export default AnswerPlayer;
