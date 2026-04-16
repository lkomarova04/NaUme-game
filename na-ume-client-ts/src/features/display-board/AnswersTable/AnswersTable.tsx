import type { TopAnswer } from "@/entities/answer";
import type { Question } from '@/entities/question';
import { useTimer } from "@/shared/lib";
import AnswerRow from "./AnswerRow";
import './AnswersTable.css';

type AnswersTableProps = {
  question: Question;
  currentRound: number;
  totalRounds: number;
  phaseEndsAt?: number;
  answers: TopAnswer[];
};

const AnswersTable = ({
  answers,
  question,
  currentRound,
  totalRounds,
  phaseEndsAt,
}: AnswersTableProps) => {
  const timeLeft = useTimer(phaseEndsAt);

  return (
    <div className="answers-table">
      <div className="guessing-header">

        <div className="question-round">
          Раунд {currentRound}/{totalRounds}
        </div>

        <h1 className="question-text">
          {question.text}
        </h1>

        <div className="question-timer">
          {timeLeft !== null ? timeLeft : ''}
        </div>

      </div>

      <div className="answers-list">
        {answers.map((answer, index) => (
          <AnswerRow
            key={answer.id}
            index={index + 1}
            answer={answer}
          />
        ))}
      </div>

    </div>
  );
};

export default AnswersTable;