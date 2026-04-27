import { AnswersTable, QRScreen, QuestionScreen } from '@/features/display-board';
import { LeaderBoard } from '@/features/display-board/LeaderBoard/LeaderBoard';
import { getCurrentQuestion, getCurrentRound, getPlayersSorted } from '@/entities/session';
import { useGame } from '@/app/providers/game-context';

import '../../app/styles/global.css';
import '../../app/styles/reset.css';

const DisplayPage = () => {
  const { session, __setPhase } = useGame();

  const currentRound = session ? getCurrentRound(session) : undefined;
  const currentQuestion = session ? getCurrentQuestion(session) : undefined;
  const leaderboardPlayers = session ? getPlayersSorted(session) : [];
  const totalRounds = session?.rounds.length ?? 0;

  if (!session || !currentRound || !currentQuestion) {
    return null;
  }

  return (
    <>
      <div>
        {session.phase === 'lobby' && <QRScreen sessionId={session.sessionId} />}
        {session.phase === 'answering' && (
          <QuestionScreen
            question={currentQuestion}
            currentRound={currentRound.index + 1}
            totalRounds={totalRounds}
            phaseEndsAt={session.phaseEndsAt || undefined}
          />
        )}
        {(session.phase === 'guessing' || session.phase === 'reveal') && (
          <AnswersTable
            answers={currentRound.topAnswers}
            question={currentQuestion}
            currentRound={currentRound.index + 1}
            totalRounds={totalRounds}
            phaseEndsAt={session.phase === 'guessing' ? session.phaseEndsAt || undefined : undefined}
          />
        )}
        {session.phase === 'leaderboard' && <LeaderBoard players={leaderboardPlayers} />}
      </div>

      <div className="dev-panel">
        <button onClick={() => __setPhase('lobby')}>QR</button>
        <button onClick={() => __setPhase('answering')}>Question</button>
        <button onClick={() => __setPhase('guessing')}>Guess</button>
        <button onClick={() => __setPhase('reveal')}>Reveal</button>
        <button onClick={() => __setPhase('leaderboard')}>Leaderboard</button>
      </div>
    </>
  );
};

export default DisplayPage;
