import { QRScreen, QuestionScreen, AnswersTable } from '@/features/display-board'
import { useState, useEffect } from 'react'
import '../../app/styles/global.css'
import '../../app/styles/reset.css'


type Phase = 'lobby' | 'answering' | 'guessing' | 'reveal' | 'leaderboard'

type TopAnswer = {
    text: string;
    count: number;
    percentage: number;
    revealed: boolean;
};


const DisplayPage = () => {
    const [phase, setPhase] = useState<Phase>('lobby')
    const [showTimer, setShowTimer] = useState(false)
    const [question] = useState({
    id: 'q1',
    text: 'Что чаще всего берут на необитаемый остров?',
  });

   const [round] = useState({
    current: 1,
    total: 5,
  });

    const [answers, setAnswers] = useState<TopAnswer[]>([
        { text: 'Вода', count: 50, percentage: 50, revealed: false },
        { text: 'Нож', count: 30, percentage: 30, revealed: false },
        { text: 'Спички', count: 20, percentage: 20, revealed: false },
        { text: 'Верёвка', count: 10, percentage: 10, revealed: false },
    ]);

    useEffect(() => {
        if (phase === 'answering') {
            setShowTimer(false)
            const timer = setTimeout(() => {
                console.log("Запуск таймера")
                setShowTimer(true)
            }, 3000)

            return () => {
                clearTimeout(timer)
            }
        }
    }, [phase])
    return (
        <>
            <div>
                {phase === 'lobby' && <QRScreen sessionId='demo-session' />}
                {phase === 'answering' && <QuestionScreen
                    question={question}
                    currentRound={round.current}
                    totalRounds={round.total}
                    phaseEndsAt={
                        showTimer ? Date.now() + 40000 : undefined
                    }
                />}
                {phase === 'guessing' && (
                    <div className="guessing-layout">
                        {/* <div className="left">
                            <QuestionScreen
                                question={question}
                                currentRound={round.current}
                                totalRounds={round.total}
                                phaseEndsAt={Date.now() + 20000}
                            />
                        </div> */}
                        <div className="right">
                            <AnswersTable answers={answers} question={question} currentRound={round.current}
                                totalRounds={round.total} phaseEndsAt={Date.now() + 20000}/>
                        </div>

                    </div>
                )}
            </div>

            {/* ===============РАЗРАБОТКА ============*/}
            <div className='dev-panel'>
                <button onClick={() => setPhase('lobby')}>QR</button>
                <button onClick={() => setPhase('answering')}>Question</button>
                <button onClick={() => setPhase('guessing')}>Guess</button>
                <button onClick={() => setPhase('reveal')}>Reveal</button>
                <button onClick={() => setPhase('leaderboard')}>Leaderboard</button>
            </div>
        </>
    )
}

export default DisplayPage;