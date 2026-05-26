import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QRScreen.css';

type QRScreenProps = {
  sessionId: string;
};

const QRScreen = ({ sessionId }: QRScreenProps) => {
  const joinURL = useMemo(() => {
    return `${window.location.origin}/player/${sessionId}`;
  }, [sessionId]);
  const joinBaseURL = useMemo(() => {
    return `${window.location.origin}/player`;
  }, []);

  return (
    <div className="qr">
      <div className="qr-origin">
        <span>Адрес подключения</span>
        <strong>{joinBaseURL}</strong>
      </div>
      <div className="qr-code-card">
        <QRCodeSVG
          value={joinURL}
          size={320}
          bgColor="#ffffff"
          fgColor="#0b1020"
          includeMargin
          className="qr-img"
          title={`QR code for session ${sessionId}`}
        />
      </div>
      <div className="qr-link">
        <h1>{sessionId}</h1>
      </div>
    </div>
  );
};

export default QRScreen;
