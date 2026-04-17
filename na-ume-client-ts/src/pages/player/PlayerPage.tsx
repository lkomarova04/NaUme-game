import { useMemo, useState } from 'react'
import '../../app/styles/global.css'
import '../../app/styles/reset.css'
import PlayerMainPage from '@/features/player-page/PlayerMainPage/PlayerMainPage'
import AnswerPlayer from '@/features/player-page/AnswerPlayer/AnswerPlayer'
import { RoundTwo } from '@/features/player-page'
import { LeaderBoard } from '@/features/display-board/LeaderBoard/LeaderBoard'
import { mockPlayers } from '@/shared/lib/mockData'

type Phase = 'lobby' | 'answering' | 'guessing' | 'leaderboard'

const PlayerPage = () => {
      const [phase, setPhase] = useState<Phase>('lobby')
      const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null)
      const [phaseEndsAt, setPhaseEndsAt] = useState<number | undefined>(undefined)
    const [isGuessingTimerVisible, setIsGuessingTimerVisible] = useState(false);
    const leaderboardPlayers = useMemo(
        () => [...mockPlayers].sort((a, b) => b.score - a.score),
        [],
      )

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
    return (
        <>
        {phase === 'lobby' && <PlayerMainPage onStart={() => setPhase("answering")}/>}
        {phase === 'answering' && <AnswerPlayer onStart={() => setPhase("guessing")}/>}
        {phase === 'guessing' && <RoundTwo
            phaseEndsAt={isGuessingTimerVisible ? phaseEndsAt : undefined}
        />}
        {phase === 'leaderboard' && <LeaderBoard players={leaderboardPlayers} />}
        
        <div className="dev-panel">
            <button onClick={() => handlePhaseChange('lobby')}>QR</button>
            <button onClick={() => handlePhaseChange('answering')}>Question</button>
            <button onClick={() => handlePhaseChange('guessing')}>Guess</button>
            <button onClick={() => handlePhaseChange('leaderboard')}>Leaderboard</button>
      </div>
        </>
    )
}

export default PlayerPage