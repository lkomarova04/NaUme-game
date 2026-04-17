import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import type { TopAnswer } from '@/entities/answer';
import { getCurrentQuestion, getCurrentRound, getTopAnswers, getPlayersSorted } from '@/entities/session';
import { LeaderBoard } from '@/features/display-board/LeaderBoard/LeaderBoard';
import { AnswerPlayer, PlayerMainPage, RoundTwo } from '@/features/player-page';
import { useGame } from '@/app/providers/game-context';

import '../../app/styles/global.css';
import '../../app/styles/reset.css';

const PlayerPage = () => {
  const { sessionId = 'test' } = useParams();
  const { session, player, joinSession, submitAnswer, submitGuess, __setPhase } = useGame();
  const [playerName, setPlayerName] = useState('Игрок');
  const [answerText, setAnswerText] = useState('');
  const [guessStatus, setGuessStatus] = useState<string>('');

  const currentRound = session ? getCurrentRound(session) : undefined;
  const currentQuestion = session ? getCurrentQuestion(session) : undefined;
  const topAnswers = session ? getTopAnswers(session) : [];
  const leaderboardPlayers = session ? getPlayersSorted(session) : [];

  const totalRounds = useMemo(() => session?.rounds.length ?? 1, [session]);

  const handleJoin = () => {
    joinSession(sessionId, playerName.trim() || 'Игрок');
    setGuessStatus('');
  };

  const handleAnswerSubmit = () => {
    submitAnswer(answerText.trim());
    setAnswerText('');
  };

  const handleGuessSubmit = (slot: TopAnswer, guess: string, exactMatch: boolean) => {
    const normalizedGuess = guess.trim();

    if (!normalizedGuess) {
      return;
    }

    submitGuess(`${slot.id}:${normalizedGuess}:${exactMatch ? 'exact' : 'variant'}`);
    setGuessStatus(`Слот ${slot.id} выбран. Ответ отправлен.`);
  };

  if (!session || !currentRound || !currentQuestion) {
    return null;
  }

  return (
    <>
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
        />
      )}

      {session.phase === 'guessing' && (
        <RoundTwo
          question={currentQuestion}
          currentRound={currentRound.index + 1}
          totalRounds={totalRounds}
          phaseEndsAt={session.phaseEndsAt || undefined}
          answers={topAnswers}
          onSubmit={handleGuessSubmit}
          status={guessStatus}
        />
      )}

      {session.phase === 'leaderboard' && <LeaderBoard players={leaderboardPlayers} />}

      <div className="dev-panel">
        <button onClick={() => __setPhase('lobby')}>Lobby</button>
        <button onClick={() => __setPhase('answering')}>Answer</button>
        <button onClick={() => __setPhase('guessing')}>Guess</button>
        <button onClick={() => __setPhase('leaderboard')}>Leaderboard</button>
      </div>
    </>
  );
};

export default PlayerPage;
