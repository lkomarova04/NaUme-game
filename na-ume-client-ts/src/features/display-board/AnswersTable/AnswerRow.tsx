import type { TopAnswer } from '@/entities/answer';
import './AnswerRow.css'
import { GameRow } from '@/shared';

type Props = {
  index: number;
  answer: TopAnswer;
};

const AnswerRow = ({ index, answer }: Props) => {
  return (
     <GameRow
      left={<p>{index}</p>}
      center={<p>{answer.revealed ? answer.text : '???'}</p>}
      right={<p>{answer.revealed ? answer.count : ''}</p>}
      isRevealed={answer.revealed}
    />
  );
};

export default AnswerRow;