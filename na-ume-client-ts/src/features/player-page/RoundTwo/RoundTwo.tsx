import { useState } from 'react';
import type { FormEvent } from 'react';

import type { TopAnswer } from '@/entities/answer';
import type { Question } from '@/entities/question';
import { useTimer } from '@/shared/lib';

import './RoundTwo.css';

type RoundTwoProps = {
  question: Question;
  currentRound: number;
  totalRounds: number;
  phaseEndsAt?: number;
  answers: TopAnswer[];
  status?: string;
  onSubmit: (guess: string) => void;
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
  const [guessValue, setGuessValue] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!guessValue.trim()) {
      return;
    }

    onSubmit(guessValue);
    setGuessValue('');
  };

  return (
    <div className="player-guessing-screen">
      <div className="player-guessing-shell">
        <div className="player-guessing-header">
          <div className="player-question-round">Раунд {currentRound}/{totalRounds}</div>
          <h1 className="player-question-text">{question.text}</h1>
          <div className="player-question-timer">{timeLeft ?? ''}</div>
        </div>

        <div className="player-roundtwo-board">
          {answers.map((answer, index) => (
            <div key={answer.id} className="player-roundtwo-row">
              <span className="player-roundtwo-index">{index + 1}</span>
              <span className="player-roundtwo-label">
                {answer.revealed ? answer.text : `Строка топа ${index + 1}`}
              </span>
            </div>
          ))}
        </div>

        <form className="player-guess-form" onSubmit={handleSubmit}>
          <label className="player-input-shell">
            <span className="player-input-label">Ваш вариант</span>
            <input
              className="player-guess-input"
              value={guessValue}
              onChange={(event) => setGuessValue(event.target.value)}
              placeholder="Введите ответ как в Сто к одному"
            />
          </label>

          <button className="main-page__btn player-guess-submit" type="submit">
            Отправить вариант
          </button>
        </form>

        {status ? <p className="player-guess-status">{status}</p> : null}
      </div>
    </div>
  );
};

export default RoundTwo;
