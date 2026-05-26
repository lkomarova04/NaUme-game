import { useGame } from '@/app/providers/game-context';
import { getCurrentQuestion, getCurrentRound, getPlayersSorted } from '@/entities/session';
import { AnswersTable, QRScreen, QuestionScreen } from '@/features/display-board';
import { LeaderBoard } from '@/features/display-board/LeaderBoard/LeaderBoard';

import '../../app/styles/global.css';
import '../../app/styles/reset.css';
import { DisplayAudio } from './DisplayAudio';

const DisplayPage = () => {
  const { session, connectionError } = useGame();

  const currentRound = session ? getCurrentRound(session) : undefined;
  const currentQuestion = session ? getCurrentQuestion(session) : undefined;
  const leaderboardPlayers = session ? getPlayersSorted(session) : [];
  const totalRounds = session?.rounds.length ?? 0;

  if (!session || !currentRound || !currentQuestion) {
    return <div>{connectionError ?? 'Ожидание игровой сессии...'}</div>;
  }

  return (
    <>
      <DisplayAudio session={session} />

      <div>
        {session.phase === 'lobby' && <QRScreen sessionId={session.sessionId} />}
        {session.phase === 'answering' && (
          <QuestionScreen
            question={currentQuestion}
            currentRound={currentRound.index + 1}
            totalRounds={totalRounds}
            phaseStartsAt={session.phaseStartsAt}
            phaseEndsAt={session.phaseEndsAt || undefined}
            phasePaused={session.phasePaused}
          />
        )}
        {(session.phase === 'guessing' || session.phase === 'reveal') && (
          <AnswersTable
            answers={currentRound.topAnswers}
            question={currentQuestion}
            currentRound={currentRound.index + 1}
            totalRounds={totalRounds}
            phaseStartsAt={session.phaseStartsAt}
            phaseEndsAt={session.phase === 'guessing' ? session.phaseEndsAt || undefined : undefined}
            phasePaused={session.phasePaused}
          />
        )}
        {session.phase === 'leaderboard' && <LeaderBoard players={leaderboardPlayers} />}
      </div>

    </>
  );
};

export default DisplayPage;
