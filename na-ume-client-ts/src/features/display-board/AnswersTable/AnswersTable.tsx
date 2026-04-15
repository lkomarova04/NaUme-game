import type { TopAnswer } from "@/entities/answer";
import type { Question } from '@/entities/question';
import { useTimer } from "@/shared/lib";

type AnswersTableProps = {
    question: Question;
      currentRound: number;
      totalRounds: number;
      phaseEndsAt?: number;
    answers: TopAnswer[]
}

const AnswersTable = ({answers, question, currentRound, totalRounds,phaseEndsAt} : AnswersTableProps) => {
    const timeLeft = useTimer(phaseEndsAt);
    return (
        <>

        <div className="question-screen">
    
      {currentRound && totalRounds && (
        <div className="question-round">
          Раунд {currentRound}/{totalRounds}
        </div>
      )}

      <div className="question-content">
        <h1 className="question-text">{question.text}</h1>
        {timeLeft !== null && (
        <div className="question-timer">
          {timeLeft}
        </div>
      )}
      </div>

    </div>
        </>
        
    )
}

export default AnswersTable;