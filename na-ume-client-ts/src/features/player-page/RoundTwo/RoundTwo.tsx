import { useState } from 'react';
import type { FormEvent } from 'react';

import type { Question } from '@/entities/question';
import type { TopAnswer } from '@/entities/answer';
import { useTimer } from '@/shared/lib';

import './RoundTwo.css';

type RoundTwoProps = {
  question: Question;
  currentRound: number;
  totalRounds: number;
  phaseEndsAt?: number;
  answers: TopAnswer[];
  status?: string;
  onSubmit: (slot: TopAnswer, guess: string, exactMatch: boolean) => void;
};

const RoundTwo = ({
  question,
  currentRound,
  totalRounds,
  phaseEndsAt,
  answers,
  status,
  onSubmit,
}: RoundTwoProps) => {
  const timeLeft = useTimer(phaseEndsAt);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>(answers[0]?.id ?? '');
  const [guessValue, setGuessValue] = useState('');
  const [exactMatch, setExactMatch] = useState(false);

  const selectedAnswer = answers.find((answer) => answer.id === selectedAnswerId) ?? answers[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAnswer || !guessValue.trim()) {
      return;
    }

    onSubmit(selectedAnswer, guessValue, exactMatch);
    setGuessValue('');
    setExactMatch(false);
  };

  return (
    <div className="player-guessing-screen">
      <div className="player-guessing-header">
        <div className="player-question-round">
          Раунд {currentRound}/{totalRounds}
        </div>
        <h1 className="player-question-text">{question.text}</h1>
        <div className="player-question-timer">{timeLeft ?? ''}</div>
      </div>

      <div className="player-slots-grid">
        {answers.map((answer, index) => {
          const isActive = answer.id === selectedAnswerId;

          return (
            <button
              key={answer.id}
              type="button"
              className={`player-slot-card ${isActive ? 'player-slot-card--active' : ''}`}
              onClick={() => setSelectedAnswerId(answer.id)}
            >
              <span className="player-slot-index">{index + 1}</span>
              <span className="player-slot-value">Топ {index + 1}</span>
            </button>
          );
        })}
      </div>

      <form className="player-guess-form" onSubmit={handleSubmit}>
        <div className="player-input-row">
          <label className="player-input-shell">
            <span className="player-input-label">Ваш вариант</span>
            <input
              className="player-guess-input"
              value={guessValue}
              onChange={(event) => setGuessValue(event.target.value)}
              placeholder={'Ваш вариант'}
            />
          </label>

        </div>

        <button className="main-page__btn player-guess-submit" type="submit">
          Отправить вариант
        </button>
      </form>

      {status ? <p className="player-guess-status">{status}</p> : null}
    </div>
  );
};

export default RoundTwo;
