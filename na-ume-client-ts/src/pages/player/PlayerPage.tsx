import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useGame } from '@/app/providers/game-context';
import { getCurrentQuestion, getCurrentRound, getPlayersSorted } from '@/entities/session';
import { LeaderBoard } from '@/features/display-board/LeaderBoard/LeaderBoard';
import { AnswerPlayer, PlayerMainPage, RoundTwo } from '@/features/player-page';

import '../../app/styles/global.css';
import '../../app/styles/reset.css';

const PlayerPage = () => {
  const { sessionId = '' } = useParams();
  const { session, player, joinSession, submitAnswer, submitGuess, __setPhase, connectionError } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answerStatus, setAnswerStatus] = useState('');
  const [guessStatus, setGuessStatus] = useState('');

  const currentRound = session ? getCurrentRound(session) : undefined;
  const currentQuestion = session ? getCurrentQuestion(session) : undefined;
  const leaderboardPlayers = session ? getPlayersSorted(session) : [];
  const totalRounds = useMemo(() => session?.rounds.length ?? 1, [session]);

  const handleJoin = () => {
    const normalizedName = playerName.trim();
    if (!normalizedName) {
      return;
    }

    joinSession(sessionId, normalizedName);
    setGuessStatus('');
  };

  const handleAnswerSubmit = async () => {
    const normalizedAnswer = answerText.trim();

    if (!normalizedAnswer) {
      return;
    }

    const result = await submitAnswer(normalizedAnswer);

    if (!result.success) {
      setAnswerStatus(result.message ?? 'Ответ не отправлен.');
      return;
    }

    setAnswerStatus('Ответ отправлен.');
    setAnswerText('');
  };

  const handleGuessSubmit = async (guess: string) => {
    const normalizedGuess = guess.trim();

    if (!normalizedGuess) {
      return;
    }

    const result = await submitGuess(normalizedGuess);

    if (!result) {
      return;
    }

    if (result.error) {
      setGuessStatus(result.error);
      return;
    }

    setGuessStatus(
      result.matched
        ? `Отлично: "${result.answerText}" попал в топ.`
        : 'Пока мимо топа. Попробуйте другой вариант, если время еще есть.',
    );
  };

  if (!session || !currentRound || !currentQuestion) {
    return (
      <>
        <PlayerMainPage
          value={playerName}
          onChange={setPlayerName}
          onStart={handleJoin}
          joined={Boolean(player)}
        />
        {connectionError && <div>{connectionError}</div>}
      </>
    );
  }

  return (
    <>
      {session.phase !== 'lobby' && player ? (
        <div className="player-score-badge">
          <span>Счет</span>
          {player.score}
        </div>
      ) : null}

      {session.phase === 'lobby' && (
        <PlayerMainPage
          value={playerName}
          onChange={setPlayerName}
          onStart={handleJoin}
          joined={Boolean(player)}
        />
      )}

      {session.phase === 'answering' && (
        <AnswerPlayer
          value={answerText}
          onChange={setAnswerText}
          onStart={handleAnswerSubmit}
          phaseStartsAt={session.phaseStartsAt}
          phaseEndsAt={session.phaseEndsAt || undefined}
          phasePaused={session.phasePaused}
          disabled={Boolean(player?.hasAnswered)}
          status={answerStatus}
        />
      )}

      {session.phase === 'guessing' && (
        <RoundTwo
          question={currentQuestion}
          currentRound={currentRound.index + 1}
          totalRounds={totalRounds}
          phaseStartsAt={session.phaseStartsAt}
          phaseEndsAt={session.phaseEndsAt || undefined}
          phasePaused={session.phasePaused}
          answers={currentRound.topAnswers}
          onSubmit={handleGuessSubmit}
          status={guessStatus}
        />
      )}

      {session.phase === 'leaderboard' && <LeaderBoard players={leaderboardPlayers} />}

      {import.meta.env.DEV && (
        <div className="dev-panel">
          <button onClick={() => __setPhase('lobby')}>Lobby</button>
          <button onClick={() => __setPhase('answering')}>Answer</button>
          <button onClick={() => __setPhase('guessing')}>Guess</button>
          <button onClick={() => __setPhase('leaderboard')}>Leaderboard</button>
        </div>
      )}
    </>
  );
};

export default PlayerPage;
