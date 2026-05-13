import type { Question } from '@/entities/question';
import { useTimer } from '@/shared/lib/hooks/useTimer';

import './QuestionScreen.css';

type QuestionScreenProps = {
  question: Question;
  currentRound: number;
  totalRounds: number;
  phaseStartsAt?: number;
  phaseEndsAt?: number;
  phasePaused?: boolean;
};

const QuestionScreen = ({
  question,
  currentRound,
  totalRounds,
  phaseStartsAt = 0,
  phaseEndsAt,
  phasePaused = false,
}: QuestionScreenProps) => {
  const timeLeft = useTimer(phaseEndsAt, phasePaused, phaseStartsAt);

  return (
    <div className="question-screen">
      {currentRound && totalRounds && (
        <div className="question-round">
          Раунд {currentRound}/{totalRounds}
        </div>
      )}

      <div className="question-content">
        <h1 className="question-text">{question.text}</h1>
        {timeLeft !== null && <div className="question-timer">{timeLeft}</div>}
      </div>
    </div>
  );
};

export default QuestionScreen;
