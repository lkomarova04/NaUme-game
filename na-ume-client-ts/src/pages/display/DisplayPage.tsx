import { useMemo, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { QRScreen, QuestionScreen, AnswersTable } from '@/features/display-board'
import { LeaderBoard } from '@/features/display-board/LeaderBoard/LeaderBoard'
import type { TopAnswer } from '@/entities/answer'
import { useNow } from '@/shared/lib/hooks/useNow'
import { mockPlayers, mockQuestions, mockTopAnswers } from '@/shared'

import '../../app/styles/global.css'
import '../../app/styles/reset.css'

type Phase = 'lobby' | 'answering' | 'guessing' | 'leaderboard'

const DisplayPage = () => {
  const { sessionId = 'demo-session' } = useParams()
  const [phase, setPhase] = useState<Phase>('lobby')
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null)
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | undefined>(undefined)
  const [isGuessingTimerVisible, setIsGuessingTimerVisible] = useState(false);
  const now = useNow(phase === 'answering')

  const question = mockQuestions[0]
  const round = {
    current: 1,
    total: 5,
  }

  const leaderboardPlayers = useMemo(
    () => [...mockPlayers].sort((a, b) => b.score - a.score),
    [],
  )
  const answers = useMemo<TopAnswer[]>(
    () => mockTopAnswers.map((answer) => ({ ...answer })),
    [],
  )

  const isAnswerTimerVisible =
    phase === 'answering' && phaseStartedAt !== null && now - phaseStartedAt >= 3000

  const handlePhaseChange = (nextPhase: Phase) => {
    const startedAt = Date.now()

    setPhase(nextPhase)
    setPhaseStartedAt(startedAt)

    if (nextPhase === 'answering') {
      setPhaseEndsAt(startedAt + 43000)
      return
    }

    if (nextPhase === 'guessing') {
      setPhaseEndsAt(startedAt + 200000);
      setIsGuessingTimerVisible(false);
      setTimeout(() => {
        setIsGuessingTimerVisible(true);
      }, 3000);
      return;
    }

    setPhaseEndsAt(undefined)
  }

  useEffect(() => {
  if (!phaseEndsAt) return; 

  if (now >= phaseEndsAt) {
    if (phase === 'answering') {
      handlePhaseChange('guessing');
    } else if (phase === 'guessing') {
      handlePhaseChange('leaderboard');
    }
  }
}, [now, phaseEndsAt, phase, handlePhaseChange]);

  return (
    <>
      <div>
        {phase === 'lobby' && <QRScreen sessionId={sessionId} />}
        {phase === 'answering' && (
          <QuestionScreen
            question={question}
            currentRound={round.current}
            totalRounds={round.total}
            phaseEndsAt={isAnswerTimerVisible ? phaseEndsAt : undefined}
          />
        )}
        {phase === 'guessing' && (
          <div className="guessing-layout">
            <div className="right">
              <AnswersTable
                answers={answers}
                question={question}
                currentRound={round.current}
                totalRounds={round.total}
                phaseEndsAt={isGuessingTimerVisible ? phaseEndsAt : undefined}
              />
            </div>
          </div>
        )}
        {phase === 'leaderboard' && <LeaderBoard players={leaderboardPlayers} />}
      </div>

      <div className="dev-panel">
        <button onClick={() => handlePhaseChange('lobby')}>QR</button>
        <button onClick={() => handlePhaseChange('answering')}>Question</button>
        <button onClick={() => handlePhaseChange('guessing')}>Guess</button>
        <button onClick={() => handlePhaseChange('leaderboard')}>Leaderboard</button>
      </div>
    </>
  )
}

export default DisplayPage
