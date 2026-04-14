import {useMemo} from 'react'
import qr from './QR-test.png'
import './QRScreen.css'

type QRScreenProps = {
    sessionId: string;
}

const QRScreen = ({ sessionId }:QRScreenProps) => {
    const joinURL = useMemo(() => {
        return `${window.location.origin}/player/${sessionId}`
    }, [sessionId])

    return (
        <div className='qr'>
            <div>
                <img src={qr} alt="QR-CODE" className='qr-img'/>
            </div>
            <div className='qr-link'>
                <h1>{joinURL}</h1>
            </div>
        </div>
    )
}

export default QRScreen;