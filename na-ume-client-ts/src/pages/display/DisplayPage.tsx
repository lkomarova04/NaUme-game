import QRScreen from '@/features/display-board'
import { useState } from 'react'
import '../../app/styles/global.css'
type Phase = 'lobby' | 'answering' | 'guessing' | 'reveal' | 'leaderboard'


const DisplayPage = () => {
    const [phase, setPhase] = useState<Phase>('lobby')

    return (
        <>
            <div>
                {phase === 'lobby' && <QRScreen sessionId='demo-session' />}
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